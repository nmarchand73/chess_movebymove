import type { TacticsExample } from "../types";

export type DiagramSide = "A" | "B";

export type DiagramPairLabel = {
  num: string;
  side: DiagramSide;
};

/** Winning Chess figure labels like `12A` / `12B`. */
export function parseDiagramPairLabel(
  label: string | null | undefined,
): DiagramPairLabel | null {
  const match = String(label ?? "")
    .trim()
    .match(/^(\d+)([ABab])$/);
  if (!match?.[1] || !match[2]) return null;
  const side = match[2].toUpperCase();
  if (side !== "A" && side !== "B") return null;
  return { num: match[1], side };
}

export function findPairedExample(
  examples: TacticsExample[],
  example: TacticsExample,
): TacticsExample | null {
  const pair = parseDiagramPairLabel(example.label);
  if (!pair) return null;
  const want: DiagramSide = pair.side === "A" ? "B" : "A";
  return (
    examples.find((other) => {
      if (other.id === example.id) return false;
      const otherPair = parseDiagramPairLabel(other.label);
      return Boolean(otherPair && otherPair.num === pair.num && otherPair.side === want);
    }) ?? null
  );
}

export type ExampleNavItem = {
  ex: TacticsExample;
  i: number;
};

export type ExampleNavGroup =
  | { kind: "pair"; num: string; a: ExampleNavItem; b: ExampleNavItem }
  | { kind: "solo"; item: ExampleNavItem };

/** Group consecutive A/B figures for the teach navigator. */
export function groupExampleNav(items: ExampleNavItem[]): ExampleNavGroup[] {
  const byNum = new Map<string, { a?: ExampleNavItem; b?: ExampleNavItem }>();
  const order: string[] = [];
  const solos: ExampleNavItem[] = [];

  for (const item of items) {
    const pair = parseDiagramPairLabel(item.ex.label);
    if (!pair) {
      solos.push(item);
      continue;
    }
    if (!byNum.has(pair.num)) {
      byNum.set(pair.num, {});
      order.push(`pair:${pair.num}`);
    }
    const slot = byNum.get(pair.num)!;
    if (pair.side === "A") slot.a = item;
    else slot.b = item;
  }

  const groups: ExampleNavGroup[] = [];
  const usedSolos = new Set<number>();

  for (const key of order) {
    const num = key.slice("pair:".length);
    const slot = byNum.get(num);
    if (slot?.a && slot.b) {
      groups.push({ kind: "pair", num, a: slot.a, b: slot.b });
      continue;
    }
    if (slot?.a) {
      groups.push({ kind: "solo", item: slot.a });
      usedSolos.add(slot.a.i);
    }
    if (slot?.b) {
      groups.push({ kind: "solo", item: slot.b });
      usedSolos.add(slot.b.i);
    }
  }

  for (const item of solos) {
    if (!usedSolos.has(item.i)) groups.push({ kind: "solo", item });
  }

  // Keep original phase order: sort by first diagram index in each group.
  groups.sort((left, right) => {
    const li = left.kind === "pair" ? Math.min(left.a.i, left.b.i) : left.item.i;
    const ri = right.kind === "pair" ? Math.min(right.a.i, right.b.i) : right.item.i;
    return li - ri;
  });
  return groups;
}

export type TeachLineSource = {
  fen: string;
  sans: string[];
  /** Open already on the last ply so the move arrow is visible. */
  arrowOnOpen: boolean;
};

/**
 * For A/B Winning Chess pairs, the key move is usually resolved on A while B is
 * the follow-up diagram — show that move’s arrow on B, not on A.
 */
export function teachLineSource(
  examples: TacticsExample[],
  example: TacticsExample,
): TeachLineSource {
  const pair = parseDiagramPairLabel(example.label);
  const sibling = findPairedExample(examples, example);

  if (pair?.side === "B" && sibling && sibling.sans.length > 0) {
    return {
      fen: sibling.fen,
      sans: sibling.sans,
      arrowOnOpen: true,
    };
  }

  if (pair?.side === "A" && sibling) {
    return {
      fen: example.fen,
      sans: [],
      arrowOnOpen: false,
    };
  }

  return {
    fen: example.fen,
    sans: example.sans,
    arrowOnOpen: pair?.side === "B" && example.sans.length > 0,
  };
}
