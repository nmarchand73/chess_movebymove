import { useCallback, useEffect, useRef, useState } from "react";
import { ChessnutConnectBar } from "../components/ChessnutConnectBar";
import { ChessUpConnectBar } from "../components/ChessUpConnectBar";
import { useChessnutBoard } from "../hooks/useChessnutBoard";
import { useChessUpBoard } from "../hooks/useChessUpBoard";
import { speakCommentary, speechSupported, stopCommentarySpeech } from "../lib/commentarySpeech";
import { buildLedBallet } from "../lib/ledBallet";
import { APP_COMMIT, APP_VERSION } from "../lib/appVersion";
import {
  englishSpeechVoices,
  ensureDefaultVoiceSelected,
  formatVoiceLabel,
  isPreferredDefaultVoice,
  LISTEN_RATE_DEFAULT,
  LISTEN_RATE_MAX,
  LISTEN_RATE_MIN,
  listenVoicePlatformTip,
  loadListenSettings,
  saveListenSettings,
  type ListenSettings,
} from "../lib/listenSettings";

type Props = {
  onBack: () => void;
};

const PREVIEW_LINE =
  "White anchors a pawn in the centre. His next move will be knight to f three.";

export function SettingsPage({ onBack }: Props) {
  const chessnut = useChessnutBoard();
  const chessup = useChessUpBoard();
  const [balletRunning, setBalletRunning] = useState(false);
  const [balletProgress, setBalletProgress] = useState<string | null>(null);
  const cancelRef = useRef(false);
  const sleepTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [listen, setListen] = useState<ListenSettings>(() =>
    typeof window !== "undefined" ? loadListenSettings() : { voiceURI: "", rate: LISTEN_RATE_DEFAULT },
  );
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const canListen = speechSupported();

  const clearTimers = useCallback(() => {
    for (const timer of sleepTimers.current) clearTimeout(timer);
    sleepTimers.current = [];
  }, []);

  useEffect(() => {
    return () => {
      cancelRef.current = true;
      clearTimers();
      stopCommentarySpeech();
    };
  }, [clearTimers]);

  useEffect(() => {
    if (!canListen) return;

    const refresh = () => {
      const nextVoices = englishSpeechVoices();
      setVoices(nextVoices);
      setListen((prev) => ensureDefaultVoiceSelected(prev, nextVoices));
    };
    refresh();
    window.speechSynthesis.addEventListener("voiceschanged", refresh);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", refresh);
  }, [canListen]);

  const updateListen = useCallback((patch: Partial<ListenSettings>) => {
    setListen((prev) => {
      const next = { ...prev, ...patch };
      saveListenSettings(next);
      return next;
    });
  }, []);

  const sleep = useCallback((ms: number) => {
    return new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, ms);
      sleepTimers.current.push(timer);
    });
  }, []);

  const stopBallet = useCallback(async () => {
    cancelRef.current = true;
    clearTimers();
    setBalletRunning(false);
    setBalletProgress(null);
    await chessnut.setLeds([]);
  }, [chessnut.setLeds, clearTimers]);

  const runBallet = useCallback(async () => {
    if (chessnut.status !== "connected" || balletRunning) return;
    cancelRef.current = false;
    setBalletRunning(true);
    const frames = buildLedBallet();
    try {
      for (let i = 0; i < frames.length; i++) {
        if (cancelRef.current) break;
        const frame = frames[i]!;
        setBalletProgress(`Frame ${i + 1} / ${frames.length}`);
        await chessnut.setLeds(frame.squares);
        await sleep(frame.holdMs);
      }
    } finally {
      if (!cancelRef.current) {
        await chessnut.setLeds([]);
      }
      setBalletRunning(false);
      setBalletProgress(null);
    }
  }, [balletRunning, chessnut.setLeds, chessnut.status, sleep]);

  useEffect(() => {
    if (chessnut.status !== "connected" && balletRunning) {
      void stopBallet();
    }
  }, [chessnut.status, balletRunning, stopBallet]);

  function previewListen() {
    if (previewing) {
      stopCommentarySpeech();
      setPreviewing(false);
      return;
    }
    const started = speakCommentary(PREVIEW_LINE, {
      onEnd: () => setPreviewing(false),
      onError: () => setPreviewing(false),
    });
    setPreviewing(started);
  }

  const ratePercent = Math.round(listen.rate * 100);
  const selectedVoice = voices.find((voice) => voice.voiceURI === listen.voiceURI);
  const platformTip = listenVoicePlatformTip(voices);

  return (
    <div className="settings-page">
      <header className="settings-header">
        <button type="button" className="back-btn" onClick={onBack}>
          ← Library
        </button>
        <h1>Settings</h1>
        <p className="settings-lead muted">Tune how commentary is read aloud, and connect a Chessnut board.</p>
      </header>

      <section className="settings-panel settings-panel-listen">
        <div className="settings-panel-head">
          <div>
            <p className="settings-eyebrow">Commentary</p>
            <h2>Listen</h2>
          </div>
          {canListen && selectedVoice ? (
            <p className="settings-voice-chip" title={formatVoiceLabel(selectedVoice)}>
              {selectedVoice.name.replace(/^Google\s+/i, "")}
            </p>
          ) : null}
        </div>

        {!canListen ? (
          <p className="settings-copy muted">Speech is not available in this browser.</p>
        ) : (
          <div className="settings-fields">
            {platformTip ? <p className="settings-tip">{platformTip}</p> : null}

            <label className="settings-field">
              <span className="settings-field-label">Voice</span>
              <div className="settings-select-wrap">
                <select
                  className="settings-select"
                  value={listen.voiceURI}
                  onChange={(event) => updateListen({ voiceURI: event.target.value })}
                >
                  {voices.length === 0 ? <option value="">Loading voices…</option> : null}
                  {voices.map((voice) => (
                    <option key={voice.voiceURI} value={voice.voiceURI}>
                      {formatVoiceLabel(voice)}
                      {isPreferredDefaultVoice(voice) ? " · recommended" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="settings-field">
              <span className="settings-field-label">
                Speed <span className="settings-field-value">{ratePercent}%</span>
              </span>
              <div className="settings-range-wrap">
                <input
                  className="settings-range"
                  type="range"
                  min={LISTEN_RATE_MIN}
                  max={LISTEN_RATE_MAX}
                  step={0.05}
                  value={listen.rate}
                  onChange={(event) => updateListen({ rate: Number(event.target.value) })}
                />
                <span className="settings-range-hints muted">
                  <span>Slower</span>
                  <span>Normal</span>
                  <span>Faster</span>
                </span>
              </div>
            </label>

            <button
              type="button"
              className={`settings-preview-btn${previewing ? " is-playing" : ""}`}
              onClick={previewListen}
            >
              {previewing ? (
                <>
                  <StopGlyph />
                  Stop preview
                </>
              ) : (
                <>
                  <SpeakerGlyph />
                  Preview voice
                </>
              )}
            </button>
          </div>
        )}
      </section>

      <section className="settings-panel settings-panel-board">
        <div className="settings-panel-head">
          <div>
            <p className="settings-eyebrow">Hardware</p>
            <h2>Chessnut board</h2>
          </div>
        </div>
        <p className="settings-copy muted">
          Connect over Bluetooth or USB. Run the LED ballet to verify every square lights cleanly.
        </p>
        <ChessnutConnectBar
          status={chessnut.status}
          transport={chessnut.transport}
          battery={chessnut.battery}
          error={chessnut.error}
          supported={chessnut.supported}
          onConnect={(kind) => {
            void chessup.disconnect();
            void chessnut.connect(kind);
          }}
          onDisconnect={() => {
            void stopBallet();
            void chessnut.disconnect();
          }}
          hint={
            chessnut.status === "connected"
              ? "Board ready — try the LED ballet below."
              : null
          }
        />

        <div className="settings-ballet">
          <div className="settings-ballet-copy">
            <h3>LED ballet</h3>
            <p className="muted">Breath, diagonal wave, then a spiral across all 64 squares.</p>
          </div>
          <div className="settings-actions">
            <button
              type="button"
              disabled={chessnut.status !== "connected" || balletRunning}
              onClick={() => void runBallet()}
            >
              {balletRunning ? "Dancing…" : "Run LED ballet"}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={!balletRunning}
              onClick={() => void stopBallet()}
            >
              Stop
            </button>
          </div>
          {balletProgress ? (
            <p className="settings-progress muted" aria-live="polite">
              {balletProgress}
            </p>
          ) : null}
        </div>
      </section>

      <section className="settings-panel settings-panel-board">
        <div className="settings-panel-head">
          <div>
            <p className="settings-eyebrow">Hardware</p>
            <h2>ChessUp board</h2>
          </div>
        </div>
        <p className="settings-copy muted">
          Connect over Bluetooth (Nordic UART). The board resolves moves itself — no LED API.
          Close the official ChessUp app before connecting.
        </p>
        <ChessUpConnectBar
          status={chessup.status}
          battery={chessup.battery}
          error={chessup.error}
          supported={chessup.supported}
          onConnect={() => {
            void stopBallet();
            void chessnut.disconnect();
            void chessup.connect();
          }}
          onDisconnect={() => void chessup.disconnect()}
          hint={
            chessup.status === "connected"
              ? "Listen-only connection — open a lesson and play moves on the ChessUp."
              : null
          }
        />
      </section>

      <p className="settings-version muted" title={`commit ${APP_COMMIT}`}>
        Move by Move · v{APP_VERSION}
      </p>
    </div>
  );
}

function SpeakerGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
      />
    </svg>
  );
}

function StopGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect fill="currentColor" x="6" y="6" width="12" height="12" rx="1.5" />
    </svg>
  );
}
