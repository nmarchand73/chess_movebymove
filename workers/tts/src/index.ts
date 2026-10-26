/**
 * Real-time neural TTS proxy for Move by Move (iPhone / Safari).
 *
 * POST /tts  { text, voice, rate? }  →  audio/mpeg|wav
 *
 * EN: Deepgram Aura-1 (Workers AI real-time) · FR: MeloTTS
 * The Pages app pipelines one sentence at a time so Listen starts ASAP.
 */

export interface Env {
  AI: Ai;
  ALLOWED_ORIGINS?: string;
  TTS_SHARED_KEY?: string;
}

type VoiceId = "en-orion" | "fr-melotts";

type TtsRequest = {
  text?: unknown;
  voice?: unknown;
  rate?: unknown;
};

const MAX_CHARS = 400;
const DEFAULT_ORIGINS = [
  "https://nmarchand73.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

function allowedOrigins(env: Env): string[] {
  if (!env.ALLOWED_ORIGINS?.trim()) return DEFAULT_ORIGINS;
  return env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean);
}

function corsHeaders(origin: string | null, env: Env): HeadersInit {
  const allowed = allowedOrigins(env);
  const match = origin && allowed.includes(origin) ? origin : allowed[0]!;
  return {
    "Access-Control-Allow-Origin": match,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-TTS-Key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function jsonError(
  status: number,
  message: string,
  origin: string | null,
  env: Env,
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin, env),
    },
  });
}

function clampRate(rate: unknown): number {
  if (typeof rate !== "number" || !Number.isFinite(rate)) return 1;
  return Math.min(1.4, Math.max(0.6, rate));
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** Sniff WAV vs MP3 from magic bytes. */
function audioContentType(bytes: Uint8Array): string {
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46
  ) {
    return "audio/wav";
  }
  return "audio/mpeg";
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
    }

    if (request.method !== "POST") {
      return jsonError(405, "POST only", origin, env);
    }

    const url = new URL(request.url);
    if (url.pathname !== "/tts" && url.pathname !== "/") {
      return jsonError(404, "Not found", origin, env);
    }

    if (env.TTS_SHARED_KEY) {
      const key = request.headers.get("X-TTS-Key") ?? "";
      if (key !== env.TTS_SHARED_KEY) {
        return jsonError(401, "Unauthorized", origin, env);
      }
    }

    let body: TtsRequest;
    try {
      body = (await request.json()) as TtsRequest;
    } catch {
      return jsonError(400, "Invalid JSON", origin, env);
    }

    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) return jsonError(400, "Missing text", origin, env);
    if (text.length > MAX_CHARS) {
      return jsonError(400, `Text exceeds ${MAX_CHARS} characters`, origin, env);
    }

    const voiceId = (typeof body.voice === "string" ? body.voice : "") as VoiceId;
    if (voiceId !== "en-orion" && voiceId !== "fr-melotts") {
      return jsonError(400, "Unknown voice", origin, env);
    }

    const rate = clampRate(body.rate);

    try {
      if (voiceId === "en-orion") {
        // Deepgram Aura — documented as real-time on Workers AI.
        const upstream = (await env.AI.run(
          "@cf/deepgram/aura-1",
          {
            text,
            speaker: "orion",
            encoding: "mp3",
            container: "none",
          },
          { returnRawResponse: true },
        )) as unknown as Response;

        if (!upstream.ok) {
          const detail = await upstream.text().catch(() => "");
          return jsonError(502, detail || `Aura error (${upstream.status})`, origin, env);
        }

        const headers = new Headers(corsHeaders(origin, env));
        headers.set("Content-Type", "audio/mpeg");
        headers.set("Cache-Control", "no-store");
        headers.set("X-TTS-Voice", voiceId);
        headers.set("X-TTS-Rate", String(rate));
        return new Response(upstream.body, { status: 200, headers });
      }

      // MeloTTS — FR neural; binding returns { audio: base64 }.
      const result = (await env.AI.run("@cf/myshell-ai/melotts", {
        prompt: text,
        lang: "fr",
      })) as { audio?: string };

      if (!result?.audio) {
        return jsonError(502, "MeloTTS returned no audio", origin, env);
      }

      const bytes = base64ToBytes(result.audio);
      const headers = new Headers(corsHeaders(origin, env));
      headers.set("Content-Type", audioContentType(bytes));
      headers.set("Cache-Control", "no-store");
      headers.set("X-TTS-Voice", voiceId);
      headers.set("X-TTS-Rate", String(rate));
      return new Response(bytes, { status: 200, headers });
    } catch (error) {
      const message = error instanceof Error ? error.message : "TTS failed";
      return jsonError(502, message, origin, env);
    }
  },
} satisfies ExportedHandler<Env>;
