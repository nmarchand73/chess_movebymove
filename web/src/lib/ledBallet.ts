const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

export type BalletFrame = {
  squares: string[];
  holdMs: number;
};

export function allChessSquares(): string[] {
  const squares: string[] = [];
  for (let rank = 1; rank <= 8; rank++) {
    for (const file of FILES) {
      squares.push(`${file}${rank}`);
    }
  }
  return squares;
}

function squareAt(fileIndex: number, rank: number): string {
  return `${FILES[fileIndex]!}${rank}`;
}

function chebyshev(sq: string): number {
  const file = FILES.indexOf(sq[0] as (typeof FILES)[number]);
  const rank = Number(sq[1]);
  return Math.max(Math.abs(file - 3.5), Math.abs(rank - 3.5));
}

function unique(squares: readonly string[]): string[] {
  return [...new Set(squares)];
}

/** Outer-to-inner clockwise spiral covering every square once (starts at a1). */
export function spiralOrder(): string[] {
  const order: string[] = [];
  let top = 8;
  let bottom = 1;
  let left = 0;
  let right = 7;

  while (left <= right && bottom <= top) {
    for (let f = left; f <= right; f++) order.push(squareAt(f, bottom));
    bottom += 1;
    for (let r = bottom; r <= top; r++) order.push(squareAt(right, r));
    right -= 1;
    if (bottom <= top) {
      for (let f = right; f >= left; f--) order.push(squareAt(f, top));
      top -= 1;
    }
    if (left <= right) {
      for (let r = top; r >= bottom; r--) order.push(squareAt(left, r));
      left += 1;
    }
  }
  return order;
}

/**
 * Graceful LED ballet: breath from the center, diagonal sweep,
 * then a spiral that lights every square before bowing out.
 */
export function buildLedBallet(): BalletFrame[] {
  const frames: BalletFrame[] = [];
  const push = (squares: readonly string[], holdMs: number) => {
    frames.push({ squares: unique(squares), holdMs });
  };

  const all = allChessSquares();
  const center = ["d4", "d5", "e4", "e5"];

  // Act I — breath: expand then contract
  push([], 200);
  push(center, 280);
  for (const maxDist of [1.5, 2.5, 3.5]) {
    push(
      all.filter((sq) => chebyshev(sq) <= maxDist),
      220,
    );
  }
  push(all, 420);
  for (const maxDist of [2.5, 1.5, 0.5]) {
    push(
      all.filter((sq) => chebyshev(sq) <= maxDist),
      200,
    );
  }
  push([], 180);

  // Act II — soft diagonal wave with a short wake
  for (let sum = 0; sum <= 14; sum++) {
    const wake: string[] = [];
    for (const band of [sum, sum - 1]) {
      if (band < 0) continue;
      for (let file = 0; file < 8; file++) {
        const rank = band - file + 1;
        if (rank >= 1 && rank <= 8) wake.push(squareAt(file, rank));
      }
    }
    push(wake, 110);
  }
  push([], 160);

  // Act III — spiral lights all 64, holds, then unwinds
  const spiral = spiralOrder();
  const growing: string[] = [];
  for (const sq of spiral) {
    growing.push(sq);
    push([...growing], growing.length === 64 ? 520 : 55);
  }
  for (let i = spiral.length - 1; i >= 0; i--) {
    push(spiral.slice(0, i), i === 0 ? 320 : 45);
  }

  return frames;
}

/** Every square appears in at least one non-empty frame. */
export function balletCoversAllSquares(frames: BalletFrame[]): boolean {
  const seen = new Set<string>();
  for (const frame of frames) {
    for (const sq of frame.squares) seen.add(sq);
  }
  return allChessSquares().every((sq) => seen.has(sq));
}
