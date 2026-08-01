import type { BatteryStatus, TransportKind } from "eboard-connect-js";
import type { ChessnutConnectionStatus } from "../hooks/useChessnutBoard";

type Props = {
  status: ChessnutConnectionStatus;
  transport: TransportKind | null;
  battery: BatteryStatus | null;
  error: string | null;
  supported: { ble: boolean; hid: boolean };
  onConnect: (kind: TransportKind) => void;
  onDisconnect: () => void;
  /** Override connected hint; pass `null` to hide. */
  hint?: string | null;
};

export function ChessnutConnectBar({
  status,
  transport,
  battery,
  error,
  supported,
  onConnect,
  onDisconnect,
  hint = "Play the next lesson move on the board to advance.",
}: Props) {
  const unavailable = !supported.ble && !supported.hid;
  const connecting = status === "connecting";
  const connected = status === "connected";

  return (
    <div className="chessnut-bar">
      <div className="chessnut-bar-main">
        <span className="chessnut-label">Chessnut</span>
        {unavailable ? (
          <span className="chessnut-status muted">
            Use Chrome/Edge on HTTPS or localhost
          </span>
        ) : connected ? (
          <>
            <span className="chessnut-status is-connected">
              Connected ({transport === "ble" ? "Bluetooth" : "USB"}
              {battery ? ` · ${battery.percent}%${battery.charging ? "⚡" : ""}` : ""})
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
      {connected && hint ? <p className="chessnut-hint muted">{hint}</p> : null}
    </div>
  );
}
