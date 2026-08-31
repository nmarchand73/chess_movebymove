import { useCallback, useEffect, useRef, useState } from "react";
import { ChessnutConnectBar } from "../components/ChessnutConnectBar";
import { ChessUpConnectBar } from "../components/ChessUpConnectBar";
import { useChessnutBoard } from "../hooks/useChessnutBoard";
import { useChessUpBoard } from "../hooks/useChessUpBoard";
import { speakCommentary, speechSupported, stopCommentarySpeech } from "../lib/commentarySpeech";
import { buildLedBallet } from "../lib/ledBallet";
import { APP_COMMIT, APP_VERSION } from "../lib/appVersion";
import type { Lang } from "../lib/lang";
import { fill, ui } from "../lib/uiCopy";
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
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  onBack: () => void;
};

const PREVIEW_LINE =
  "White anchors a pawn in the centre. His next move will be knight to f three.";

export function SettingsPage({ lang, onLangChange, onBack }: Props) {
  const t = ui(lang);
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
        setBalletProgress(fill(t.frameProgress, { x: i + 1, y: frames.length }));
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
  }, [balletRunning, chessnut.setLeds, chessnut.status, sleep, t.frameProgress]);

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
          {t.backLibrary}
        </button>
        <h1>{t.settings}</h1>
        <p className="settings-lead muted">{t.settingsLead}</p>
      </header>

      <section className="settings-panel settings-panel-lang">
        <div className="settings-panel-head">
          <div>
            <p className="settings-eyebrow">{t.language}</p>
            <h2>{t.language}</h2>
          </div>
        </div>
        <div className="settings-lang-toggle" role="group" aria-label={t.language}>
          <button
            type="button"
            className={`settings-lang-btn${lang === "en" ? " is-active" : ""}`}
            aria-pressed={lang === "en"}
            onClick={() => onLangChange("en")}
          >
            {t.languageEn}
          </button>
          <button
            type="button"
            className={`settings-lang-btn${lang === "fr" ? " is-active" : ""}`}
            aria-pressed={lang === "fr"}
            onClick={() => onLangChange("fr")}
          >
            {t.languageFr}
          </button>
        </div>
        <p className="settings-copy muted">{t.languageHint}</p>
      </section>

      <section className="settings-panel settings-panel-listen">
        <div className="settings-panel-head">
          <div>
            <p className="settings-eyebrow">{t.commentary}</p>
            <h2>{t.listen}</h2>
          </div>
          {canListen && selectedVoice ? (
            <p className="settings-voice-chip" title={formatVoiceLabel(selectedVoice)}>
              {selectedVoice.name.replace(/^Google\s+/i, "")}
            </p>
          ) : null}
        </div>

        {!canListen ? (
          <p className="settings-copy muted">{t.speechUnavailable}</p>
        ) : (
          <div className="settings-fields">
            {platformTip ? <p className="settings-tip">{platformTip}</p> : null}

            <label className="settings-field">
              <span className="settings-field-label">{t.voice}</span>
              <div className="settings-select-wrap">
                <select
                  className="settings-select"
                  value={listen.voiceURI}
                  onChange={(event) => updateListen({ voiceURI: event.target.value })}
                >
                  {voices.length === 0 ? <option value="">{t.loadingVoices}</option> : null}
                  {voices.map((voice) => (
                    <option key={voice.voiceURI} value={voice.voiceURI}>
                      {formatVoiceLabel(voice)}
                      {isPreferredDefaultVoice(voice) ? ` ${t.recommended}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="settings-field">
              <span className="settings-field-label">
                {t.speed} <span className="settings-field-value">{ratePercent}%</span>
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
                  <span>{t.slower}</span>
                  <span>{t.normal}</span>
                  <span>{t.faster}</span>
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
                  {t.stopPreview}
                </>
              ) : (
                <>
                  <SpeakerGlyph />
                  {t.previewVoice}
                </>
              )}
            </button>
          </div>
        )}
      </section>

      <section className="settings-panel settings-panel-board">
        <div className="settings-panel-head">
          <div>
            <p className="settings-eyebrow">{t.hardware}</p>
            <h2>{t.chessnutBoard}</h2>
          </div>
        </div>
        <p className="settings-copy muted">{t.chessnutCopy}</p>
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
          hint={chessnut.status === "connected" ? t.boardReadyBallet : null}
          lang={lang}
        />

        <div className="settings-ballet">
          <div className="settings-ballet-copy">
            <h3>{t.ledBallet}</h3>
            <p className="muted">{t.ledBalletCopy}</p>
          </div>
          <div className="settings-actions">
            <button
              type="button"
              disabled={chessnut.status !== "connected" || balletRunning}
              onClick={() => void runBallet()}
            >
              {balletRunning ? t.dancing : t.runLedBallet}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={!balletRunning}
              onClick={() => void stopBallet()}
            >
              {t.stop}
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
            <p className="settings-eyebrow">{t.hardware}</p>
            <h2>{t.chessUpBoard}</h2>
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
          hint={chessup.status === "connected" ? t.listenOnlyBoard : null}
          lang={lang}
        />
      </section>

      <p className="settings-version muted" title={`commit ${APP_COMMIT}`}>
        {fill(t.versionLabel, { version: APP_VERSION })}
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
