import type { BatteryStatus, TransportKind } from "eboard-connect-js";
import type { BoardGuide } from "../lib/boardGuide";
import { formatSanWithSymbols } from "../lib/sanSymbols";
import type { ChessnutConnectionStatus } from "../hooks/useChessnutBoard";

type Props = {
  status: ChessnutConnectionStatus;
  transport: TransportKind | null;
  battery: BatteryStatus | null;
  error: string | null;
  supported: { ble: boolean; hid: boolean };
  onConnect: (kind: TransportKind) => void;
  onDisconnect: () => void;
  /** Physical-board instruction shown inline (does not affect board layout). */
  guide?: BoardGuide | null;
  guidePly?: number;
  /** Optional status line under the main row (e.g. settings). */
  hint?: string | null;
};

function guideInlineLabel(guide: BoardGuide, ply: number): string {
  switch (guide.kind) {
    case "waiting_signal":
      return "Waiting for board signal";
    case "lesson_complete":
      return "End of game — board idle";
    case "setup":
      return ply === 0
        ? guide.mismatchCount > 0
          ? `Reset start · ${guide.mismatchCount} sq`
          : "Reset to starting position"
        : guide.mismatchCount > 0
          ? `Match screen · ${guide.mismatchCount} sq`
          : "Match the screen position";
    case "play_move":
      return `Play ${formatSanWithSymbols(guide.san)} · ${guide.from}→${guide.to}`;
    default: {
      const _exhaustive: never = guide;
      return _exhaustive;
    }
  }
}

export function ChessnutConnectBar({
  status,
  transport,
  battery,
  error,
  supported,
  onConnect,
  onDisconnect,
  guide = null,
  guidePly = -1,
  hint = null,
}: Props) {
  const unavailable = !supported.ble && !supported.hid;
  const connecting = status === "connecting";
  const connected = status === "connected";
  const guideLabel = guide ? guideInlineLabel(guide, guidePly) : null;

  return (
    <div className={`chessnut-bar${guideLabel ? " has-guide" : ""}`}>
      <div className="chessnut-bar-main">
        <span className="chessnut-label">Chessnut</span>
        {unavailable ? (
          <span className="chessnut-status muted">
            Use Chrome/Edge on HTTPS or localhost
          </span>
        ) : connected ? (
          <>
            {guideLabel ? (
              <span className="chessnut-guide" role="status">
                {guideLabel}
              </span>
            ) : null}
            <span className="chessnut-status is-connected">
              {transport === "ble" ? "BT" : "USB"}
              {battery ? ` · ${battery.percent}%` : ""}
            </span>
            <button type="button" className="secondary" onClick={onDisconnect}>
              Disconnect
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="secondary"
              disabled={!supported.ble || connecting}
              onClick={() => onConnect("ble")}
            >
              {connecting ? "Connecting…" : "Bluetooth"}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={!supported.hid || connecting}
              onClick={() => onConnect("hid")}
            >
              USB
            </button>
          </>
        )}
      </div>
      {error ? <p className="chessnut-error">{error}</p> : null}
      {connected && hint && !guideLabel ? <p className="chessnut-hint muted">{hint}</p> : null}
    </div>
  );
}
