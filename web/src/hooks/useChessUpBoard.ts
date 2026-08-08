import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChessUpBoard,
  isBleSupported,
  type BatteryStatus,
  type ChessUpAssistanceColour,
  type ChessUpMove,
} from "eboard-connect-js";

export type ChessUpConnectionStatus = "disconnected" | "connecting" | "connected";

const STORAGE_WANT_CONNECTED = "chessupWantConnected";

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useChessUpBoard() {
  const boardRef = useRef<ChessUpBoard | null>(null);
  const statusRef = useRef<ChessUpConnectionStatus>("disconnected");
  const [status, setStatus] = useState<ChessUpConnectionStatus>("disconnected");
  const [placement, setPlacement] = useState<string | null>(null);
  const [fen, setFen] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<ChessUpMove | null>(null);
  const [battery, setBattery] = useState<BatteryStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported] = useState(() => ({ ble: isBleSupported() }));
  const moveListenersRef = useRef(new Set<(move: ChessUpMove) => void>());
  const stateRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setStatusBoth = useCallback((next: ChessUpConnectionStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const clearStateRefresh = useCallback(() => {
    if (stateRefreshTimer.current !== null) {
      clearTimeout(stateRefreshTimer.current);
      stateRefreshTimer.current = null;
    }
  }, []);

  useEffect(() => {
    const board = new ChessUpBoard();
    boardRef.current = board;
    const offPosition = board.on("position", (event) => {
      setPlacement(event.placement);
    });
    const offBoardState = board.on("boardState", (state) => {
      setFen(state.fen);
      setPlacement(state.placement);
    });
    const offMove = board.on("move", (move) => {
      setLastMove(move);
      for (const listener of moveListenersRef.current) listener(move);
      // Debounced read-only refresh — never push state onto the ChessUp.
      clearStateRefresh();
      stateRefreshTimer.current = setTimeout(() => {
        stateRefreshTimer.current = null;
        void board.requestBoardState().catch(() => {
          /* ignore refresh failures */
        });
      }, 350);
    });
    const offDisconnect = board.on("disconnect", () => {
      clearStateRefresh();
      setStatusBoth("disconnected");
      setBattery(null);
      setPlacement(null);
      setFen(null);
      setLastMove(null);
    });
    const offError = board.on("error", (err) => {
      setError(err.message);
    });

    return () => {
      clearStateRefresh();
      offPosition();
      offBoardState();
      offMove();
      offDisconnect();
      offError();
      void board.disconnect();
      boardRef.current = null;
    };
  }, [clearStateRefresh, setStatusBoth]);

  const connect = useCallback(
    async (options?: { reconnect?: boolean }) => {
      const board = boardRef.current;
      if (!board) return;
      const reconnect = options?.reconnect === true;
      setError(null);
      setStatusBoth("connecting");
      try {
        // Assistance lights only — never opt into FEN/move push from the lesson UI.
        await board.connect({
          reconnect,
          allowMutatingCommands: false,
          allowAssistanceLights: true,
        });
        setStatusBoth("connected");
        persistWantConnected(true);
        try {
          setBattery(await board.getBattery());
        } catch {
          setBattery(null);
        }
      } catch (err) {
        setStatusBoth("disconnected");
        const message = err instanceof Error ? err.message : String(err);
        if (reconnect) {
          console.info("[ChessUp] auto-reconnect skipped:", message);
          return;
        }
        if (!/cancel|chooser|user/i.test(message)) {
          setError(message);
        }
      }
    },
    [setStatusBoth],
  );

  const disconnect = useCallback(async () => {
    const board = boardRef.current;
    if (!board) return;
    persistWantConnected(false);
    clearStateRefresh();
    await board.disconnect();
    setStatusBoth("disconnected");
    setBattery(null);
    setPlacement(null);
    setFen(null);
    setLastMove(null);
  }, [clearStateRefresh, setStatusBoth]);

  const onMove = useCallback((listener: (move: ChessUpMove) => void) => {
    moveListenersRef.current.add(listener);
    return () => {
      moveListenersRef.current.delete(listener);
    };
  }, []);

  const sendAssistance = useCallback(async (colours: readonly ChessUpAssistanceColour[]) => {
    const board = boardRef.current;
    if (!board?.connected) return;
    try {
      await board.sendAssistance(colours);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const currentStatus = (): ChessUpConnectionStatus => statusRef.current;

    async function tryAutoReconnect() {
      if (!loadWantConnected()) return;
      if (currentStatus() === "connected" || currentStatus() === "connecting") return;
      if (!isBleSupported()) return;

      for (let i = 0; i < 3; i++) {
        if (cancelled || currentStatus() === "connected") return;
        console.info("[ChessUp] auto-reconnect attempt", i + 1, "/ 3");
        await connect({ reconnect: true });
        if (cancelled || currentStatus() === "connected") return;
        if (i < 2) await sleep(900 * (i + 1));
      }
    }

    void tryAutoReconnect();
    return () => {
      cancelled = true;
    };
  }, [connect]);

  return {
    status,
    placement,
    fen,
    lastMove,
    battery,
    error,
    supported,
    connect,
    disconnect,
    onMove,
    sendAssistance,
  };
}
