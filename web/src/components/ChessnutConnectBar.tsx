import type { BatteryStatus, TransportKind } from "eboard-connect-js";
import type { BoardGuide } from "../lib/boardGuide";
import type { Lang } from "../lib/lang";
import { formatSanWithSymbols } from "../lib/sanSymbols";
import { fill, ui, type UiCopy } from "../lib/uiCopy";
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
  lang: Lang;
};

function guideInlineLabel(guide: BoardGuide, ply: number, t: UiCopy): string {
  switch (guide.kind) {
    case "waiting_signal":
      return t.waitingBoard;
    case "lesson_complete":
      return t.endOfGame;
    case "setup":
      return ply === 0
        ? guide.mismatchCount > 0
          ? fill(t.resetStart, { n: guide.mismatchCount })
          : t.resetToStart
        : guide.mismatchCount > 0
          ? fill(t.matchScreen, { n: guide.mismatchCount })
          : t.matchScreenPos;
    case "play_move":
      return fill(t.playSan, {
        san: formatSanWithSymbols(guide.san),
        from: guide.from,
        to: guide.to,
      });
    case "guess_waiting":
      return fill(t.yourMoveQuiz, {
        side: guide.side === "white" ? t.white : t.black,
      });
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
  lang,
}: Props) {
  const t = ui(lang);
  const unavailable = !supported.ble && !supported.hid;
  const connecting = status === "connecting";
  const connected = status === "connected";
  const guideLabel = guide ? guideInlineLabel(guide, guidePly, t) : null;

  return (
    <div className={`chessnut-bar${guideLabel ? " has-guide" : ""}`}>
      <div className="chessnut-bar-main">
        <span className="chessnut-label">Chessnut</span>
        {unavailable ? (
          <span className="chessnut-status muted">{t.useChromeHttps}</span>
        ) : connected ? (
          <>
            {guideLabel ? (
              <span className="chessnut-guide" role="status">
                {guideLabel}
              </span>
            ) : null}
            <span className="chessnut-status is-connected">
              {transport === "ble" ? "BT" : t.usb}
              {battery ? ` · ${battery.percent}%` : ""}
            </span>
            <button type="button" className="secondary" onClick={onDisconnect}>
              {t.disconnect}
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
              {connecting ? t.connecting : t.bluetooth}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={!supported.hid || connecting}
              onClick={() => onConnect("hid")}
            >
              {t.usb}
            </button>
          </>
        )}
      </div>
      {error ? <p className="chessnut-error">{error}</p> : null}
      {connected && hint && !guideLabel ? <p className="chessnut-hint muted">{hint}</p> : null}
    </div>
  );
}
