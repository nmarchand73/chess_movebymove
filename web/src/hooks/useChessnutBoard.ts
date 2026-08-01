import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChessnutBoard,
  isBleSupported,
  isHidSupported,
  type BatteryStatus,
  type TransportKind,
} from "eboard-connect-js";

export type ChessnutConnectionStatus = "disconnected" | "connecting" | "connected";

const STORAGE_WANT_CONNECTED = "chessnutWantConnected";
const STORAGE_TRANSPORT = "chessnutLastTransport";

function loadWantConnected(): boolean {
  try {
    return localStorage.getItem(STORAGE_WANT_CONNECTED) === "1";
  } catch {
    return false;
  }
}

function persistWantConnected(want: boolean): void {
  try {
    if (want) localStorage.setItem(STORAGE_WANT_CONNECTED, "1");
    else localStorage.removeItem(STORAGE_WANT_CONNECTED);
  } catch {
    /* ignore */
  }
}

function loadLastTransport(): TransportKind | null {
  try {
    const value = localStorage.getItem(STORAGE_TRANSPORT);
    return value === "ble" || value === "hid" ? value : null;
  } catch {
    return null;
  }
}

function persistLastTransport(kind: TransportKind): void {
  try {
    localStorage.setItem(STORAGE_TRANSPORT, kind);
  } catch {
    /* ignore */
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useChessnutBoard() {
  const boardRef = useRef<ChessnutBoard | null>(null);
  const statusRef = useRef<ChessnutConnectionStatus>("disconnected");
  const [status, setStatus] = useState<ChessnutConnectionStatus>("disconnected");
  const [transport, setTransport] = useState<TransportKind | null>(null);
  const [placement, setPlacement] = useState<string | null>(null);
  const [battery, setBattery] = useState<BatteryStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported] = useState(() => ({
    ble: isBleSupported(),
    hid: isHidSupported(),
  }));

  const setStatusBoth = useCallback((next: ChessnutConnectionStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  useEffect(() => {
    const board = new ChessnutBoard();
    boardRef.current = board;
    const offPosition = board.on("position", (event) => {
      setPlacement(event.placement);
    });
    const offDisconnect = board.on("disconnect", () => {
      setStatusBoth("disconnected");
      setTransport(null);
      setBattery(null);
    });
    const offError = board.on("error", (err) => {
      setError(err.message);
    });

    return () => {
      offPosition();
      offDisconnect();
      offError();
      void board.disconnect();
      boardRef.current = null;
    };
  }, [setStatusBoth]);

  const connect = useCallback(async (kind: TransportKind, options?: { reconnect?: boolean }) => {
    const board = boardRef.current;
    if (!board) return;
    const reconnect = options?.reconnect === true;
    setError(null);
    setStatusBoth("connecting");
    try {
      await board.connect({ transport: kind, reconnect });
      setTransport(kind);
      setStatusBoth("connected");
      persistLastTransport(kind);
      persistWantConnected(true);
      if (kind === "ble") {
        try {
          setBattery(await board.getBattery());
        } catch {
          setBattery(null);
        }
      } else {
        setBattery(null);
      }
    } catch (err) {
      setStatusBoth("disconnected");
      setTransport(null);
      const message = err instanceof Error ? err.message : String(err);
      if (reconnect) {
        console.info("[Chessnut] auto-reconnect skipped:", message);
        return;
      }
      if (!/cancel|chooser|user/i.test(message)) {
        setError(message);
      }
    }
  }, [setStatusBoth]);

  const disconnect = useCallback(async () => {
    const board = boardRef.current;
    if (!board) return;
    persistWantConnected(false);
    await board.disconnect();
    setStatusBoth("disconnected");
    setTransport(null);
    setBattery(null);
    setPlacement(null);
  }, [setStatusBoth]);

  const setLeds = useCallback(async (squares: readonly string[]) => {
    const board = boardRef.current;
    if (!board?.connected) return;
    try {
      await board.setLeds(squares);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function tryAutoReconnect() {
      if (!loadWantConnected()) return;
      if (statusRef.current === "connected" || statusRef.current === "connecting") return;

      const kind = loadLastTransport();
      if (!kind) return;
      if (kind === "ble" && !isBleSupported()) return;
      if (kind === "hid" && !isHidSupported()) return;

      const attempts = kind === "ble" ? 3 : 1;
      for (let i = 0; i < attempts; i++) {
        if (cancelled || statusRef.current === "connected") return;
        console.info("[Chessnut] auto-reconnect attempt", i + 1, "/", attempts, kind);
        await connect(kind, { reconnect: true });
        if (cancelled || statusRef.current === "connected") return;
        if (i < attempts - 1) await sleep(900 * (i + 1));
      }
    }

    void tryAutoReconnect();
    return () => {
      cancelled = true;
    };
  }, [connect]);

  return {
    status,
    transport,
    placement,
    battery,
    error,
    supported,
    connect,
    disconnect,
    setLeds,
  };
}
