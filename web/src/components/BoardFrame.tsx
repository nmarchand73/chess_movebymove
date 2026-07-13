import type { ReactNode } from "react";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"] as const;

type Props = {
  orientation?: "white" | "black";
  children: ReactNode;
};

export function BoardFrame({ orientation = "white", children }: Props) {
  const files = orientation === "white" ? FILES : [...FILES].reverse();
  const ranks = orientation === "white" ? RANKS : [...RANKS].reverse();

  return (
    <div className="board-frame">
      <div className="board-grid">
        <div className="board-ranks" aria-hidden="true">
          {ranks.map((rank) => (
            <span key={rank} className="board-coord board-coord-rank">
              {rank}
            </span>
          ))}
        </div>
        <div className="board-wrap">{children}</div>
        <div className="board-corner" aria-hidden="true" />
        <div className="board-files" aria-hidden="true">
          {files.map((file) => (
            <span key={file} className="board-coord board-coord-file">
              {file}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
