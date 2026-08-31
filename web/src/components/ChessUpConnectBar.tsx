import type { BatteryStatus } from "eboard-connect-js";
import type { ChessUpConnectionStatus } from "../hooks/useChessUpBoard";
import type { Lang } from "../lib/lang";
import { ui } from "../lib/uiCopy";

type Props = {
  status: ChessUpConnectionStatus;
  battery: BatteryStatus | null;
  error: string | null;
  supported: { ble: boolean };
  onConnect: () => void;
  onDisconnect: () => void;
  /** Optional status line under the main row. */
  hint?: string | null;
  lang: Lang;
};

export function ChessUpConnectBar({
  status,
  battery,
  error,
  supported,
  onConnect,
  onDisconnect,
  hint = null,
  lang,
}: Props) {
  const t = ui(lang);
  const unavailable = !supported.ble;
  const connecting = status === "connecting";
  const connected = status === "connected";

  return (
    <div className="chessnut-bar">
      <div className="chessnut-bar-main">
        <span className="chessnut-label">ChessUp</span>
        {unavailable ? (
          <span className="chessnut-status muted">{t.useChromeHttps}</span>
        ) : connected ? (
          <>
            <span className="chessnut-status is-connected">
              BT
              {battery ? ` · ${battery.percent}%` : ""}
            </span>
            <button type="button" className="secondary" onClick={onDisconnect}>
              {t.disconnect}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="secondary"
            disabled={connecting}
            onClick={onConnect}
          >
            {connecting ? t.connecting : t.bluetooth}
          </button>
        )}
      </div>
      {error ? <p className="chessnut-error">{error}</p> : null}
      {connected && hint ? <p className="chessnut-hint muted">{hint}</p> : null}
    </div>
  );
}
