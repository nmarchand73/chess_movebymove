import { useCallback, useEffect, useRef, useState } from "react";
import { ChessnutConnectBar } from "../components/ChessnutConnectBar";
import { useChessnutBoard } from "../hooks/useChessnutBoard";
import { buildLedBallet } from "../lib/ledBallet";

type Props = {
  onBack: () => void;
};

export function SettingsPage({ onBack }: Props) {
  const chessnut = useChessnutBoard();
  const [balletRunning, setBalletRunning] = useState(false);
  const [balletProgress, setBalletProgress] = useState<string | null>(null);
  const cancelRef = useRef(false);
  const sleepTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    for (const timer of sleepTimers.current) clearTimeout(timer);
    sleepTimers.current = [];
  }, []);

  useEffect(() => {
    return () => {
      cancelRef.current = true;
      clearTimers();
    };
  }, [clearTimers]);

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

  return (
    <div className="settings-page">
      <header className="settings-header">
        <button type="button" className="back-btn" onClick={onBack}>
          ← Library
        </button>
        <h1>Settings</h1>
        <p className="settings-lead muted">
          Board connection and LED diagnostics for Chessnut Air.
        </p>
      </header>

      <section className="settings-section">
        <h2>Chessnut board</h2>
        <p className="settings-copy muted">
          Connect over Bluetooth or USB, then run the LED ballet to verify every
          square lights in a smooth sequence.
        </p>
        <ChessnutConnectBar
          status={chessnut.status}
          transport={chessnut.transport}
          battery={chessnut.battery}
          error={chessnut.error}
          supported={chessnut.supported}
          onConnect={(kind) => void chessnut.connect(kind)}
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
      </section>

      <section className="settings-section">
        <h2>LED ballet</h2>
        <p className="settings-copy muted">
          A three-act light dance: breath from the center, a diagonal wave, then
          a spiral that visits all 64 squares before fading out.
        </p>
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
      </section>
    </div>
  );
}
