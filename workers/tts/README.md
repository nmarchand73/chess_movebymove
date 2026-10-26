# Real-time neural TTS Worker

Cloudflare Worker that powers **premium · real-time** Listen voices on iPhone (and Safari) for Move by Move.

## Why

WebKit cannot expose Apple Premium or Chrome Google voices to `speechSynthesis`. This Worker synthesizes each commentary **sentence on demand** (Deepgram Aura EN / MeloTTS FR) so Listen starts as soon as the first audio returns; the app prefetches the next sentence while the current one plays.

## Deploy

```bash
cd workers/tts
npm install
npx wrangler login
npx wrangler deploy
# optional shared secret:
npx wrangler secret put TTS_SHARED_KEY
```

Note the Worker URL (e.g. `https://chess-movebymove-tts.<account>.workers.dev`).

## Wire the Pages app

In the GitHub repo:

| Name | Type | Value |
|------|------|--------|
| `VITE_TTS_URL` | Variable | Worker origin, no trailing slash |
| `VITE_TTS_KEY` | Secret | Same value as `TTS_SHARED_KEY` (optional) |

Redeploy Pages (push to `main`). Settings then offers Orion / Henri neural voices; Listen/Follow stream sentence-by-sentence.

## Local

```bash
cd workers/tts && npm run dev
# in web/.env.local:
# VITE_TTS_URL=http://127.0.0.1:8787
```
