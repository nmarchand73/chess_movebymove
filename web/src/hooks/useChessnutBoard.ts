import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChessnutBoard,
  isBleSupported,
  isHidSupported,
  type BatteryStatus,
  type TransportKind,
} from "eboard-connect-js";

export type ChessnutConnectionStatus = "disconnected" | "connecting" | "connected";

export function useChessnutBoard() {
  const boardRef = useRef<ChessnutBoard | null>(null);
  const [status, setStatus] = useState<ChessnutConnectionStatus>("disconnected");
  const [transport, setTransport] = useState<TransportKind | null>(null);
  const [placement, setPlacement] = useState<string | null>(null);
  const [battery, setBattery] = useState<BatteryStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported] = useState(() => ({
    ble: isBleSupported(),
    hid: isHidSupported(),
  }));

  useEffect(() => {
    const board = new ChessnutBoard();
    boardRef.current = board;
    const offPosition = board.on("position", (event) => {
      setPlacement(event.placement);
    });
    const offDisconnect = board.on("disconnect", () => {
      setStatus("disconnected");
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
  }, []);

  const connect = useCallback(async (kind: TransportKind) => {
    const board = boardRef.current;
    if (!board) return;
    setError(null);
    setStatus("connecting");
    try {
      await board.connect({ transport: kind });
      setTransport(kind);
      setStatus("connected");
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
      setStatus("disconnected");
      setTransport(null);
      const message = err instanceof Error ? err.message : String(err);
      if (!/cancel|chooser|user/i.test(message)) {
        setError(message);
      }
    }
  }, []);

  const disconnect = useCallback(async () => {
    const board = boardRef.current;
    if (!board) return;
    await board.disconnect();
    setStatus("disconnected");
    setTransport(null);
    setBattery(null);
    setPlacement(null);
  }, []);

  const setLeds = useCallback(async (squares: readonly string[]) => {
    const board = boardRef.current;
    if (!board?.connected) return;
    try {
      await board.setLeds(squares);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

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
