import { createContext, useContext, type ReactNode } from "react";
import {
  useChessnutBoardController,
  type ChessnutConnectionStatus,
} from "./useChessnutBoardController";
import {
  useChessUpBoardController,
  type ChessUpConnectionStatus,
} from "./useChessUpBoardController";

type ChessnutApi = ReturnType<typeof useChessnutBoardController>;
type ChessUpApi = ReturnType<typeof useChessUpBoardController>;

const ChessnutContext = createContext<ChessnutApi | null>(null);
const ChessUpContext = createContext<ChessUpApi | null>(null);

/**
 * Single Chessnut + ChessUp connection for the whole app.
 * Without this, each page disconnects the board on unmount (red light everywhere).
 */
export function PhysicalBoardsProvider({ children }: { children: ReactNode }) {
  const chessnut = useChessnutBoardController();
  const chessup = useChessUpBoardController();
  return (
    <ChessnutContext.Provider value={chessnut}>
      <ChessUpContext.Provider value={chessup}>{children}</ChessUpContext.Provider>
    </ChessnutContext.Provider>
  );
}

export function useChessnutBoard(): ChessnutApi {
  const value = useContext(ChessnutContext);
  if (!value) {
    throw new Error("useChessnutBoard requires PhysicalBoardsProvider");
  }
  return value;
}

export function useChessUpBoard(): ChessUpApi {
  const value = useContext(ChessUpContext);
  if (!value) {
    throw new Error("useChessUpBoard requires PhysicalBoardsProvider");
  }
  return value;
}

export type { ChessnutConnectionStatus, ChessUpConnectionStatus };
