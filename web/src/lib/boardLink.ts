import type { BoardLinkState } from "../components/BoardFrame";

type Linkable = { status: "disconnected" | "connecting" | "connected" };

/** Green / amber / red light for Chessnut or ChessUp. */
export function physicalBoardLink(a: Linkable, b: Linkable): BoardLinkState {
  if (a.status === "connected" || b.status === "connected") return "on";
  if (a.status === "connecting" || b.status === "connecting") return "connecting";
  return "off";
}
