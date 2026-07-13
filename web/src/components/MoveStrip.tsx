import { useEffect, useRef } from "react";
import type { AnnotationNode } from "../types";

type Props = {
  nodes: AnnotationNode[];
  ply: number;
  onSelect: (ply: number) => void;
  hideFuture?: boolean;
};

export function MoveStrip({ nodes, ply, onSelect, hideFuture = false }: Props) {
  const stripRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const moves = nodes.filter((n) => n.san && n.ply > 0);
  const visible = hideFuture ? moves.filter((n) => n.ply <= ply) : moves;

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [ply]);

  return (
    <div className="move-strip-wrap">
      <span className="move-strip-label">Moves</span>
      <div className="move-strip" ref={stripRef} role="listbox" aria-label="Move list">
        <button
          type="button"
          ref={ply === 0 ? activeRef : undefined}
          className={`move-chip ${ply === 0 ? "active" : ""}`}
          onClick={() => onSelect(0)}
        >
          Start
        </button>
        {visible.map((node) => (
          <button
            key={node.ply}
            type="button"
            ref={node.ply === ply ? activeRef : undefined}
            className={`move-chip ${node.ply === ply ? "active" : ""}${node.text ? " annotated" : ""}${node.isCritical ? " critical" : ""}`}
            onClick={() => onSelect(node.ply)}
          >
            {formatMoveLabel(node.ply, node.san!)}
          </button>
        ))}
        {hideFuture && ply < moves[moves.length - 1]?.ply && (
          <span className="move-chip move-chip-hidden" aria-label="Next move hidden">?</span>
        )}
      </div>
    </div>
  );
}

function formatMoveLabel(ply: number, san: string): string {
  const moveNum = Math.ceil(ply / 2);
  const prefix = ply % 2 === 1 ? `${moveNum}.` : `${moveNum}...`;
  return `${prefix}${san}`;
}
