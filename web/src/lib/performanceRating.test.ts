import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyUci,
  buildEloSparklines,
  centipawnsAbs,
  cpLossFromBestComparison,
  cpLossFromEvalDrop,
  cpValueWhitePerspective,
  evaluateDif,
  isPlayedBestMove,
  LUCAS_EVAL,
  lucasMoveElo,
  moveEvalLoss,
  moveLucasPerformance,
  moveScoreFromAfter,
  performanceFromMoveResults,
  pickBestMoveUci,
  sideForPly,
  weightedLucasElo,
} from "./performanceRating.ts";

const emptyMeta = { depth: 14, bestMoveUci: "e2e4", pvUci: ["e2e4"], lines: [] };

describe("cpValueWhitePerspective", () => {
  it("uses cp and mate scores from white's perspective", () => {
    assert.equal(cpValueWhitePerspective({ cp: 40, mate: null, ...emptyMeta }), 40);
    assert.equal(cpValueWhitePerspective({ cp: null, mate: 2, ...emptyMeta }), 9600);
    assert.equal(cpValueWhitePerspective({ cp: null, mate: -3, ...emptyMeta }), -9400);
  });
});

describe("cpLossFromEvalDrop", () => {
  it("scores white mistakes from eval drop", () => {
    const before = { cp: 120, mate: null, ...emptyMeta };
    const after = { cp: 30, mate: null, ...emptyMeta };
    assert.equal(cpLossFromEvalDrop(before, after, "white"), 90);
    assert.equal(cpLossFromEvalDrop(before, after, "black"), 0);
  });

  it("scores black mistakes from eval rise", () => {
    const before = { cp: 0, mate: null, ...emptyMeta };
    const after = { cp: 150, mate: null, ...emptyMeta };
    assert.equal(cpLossFromEvalDrop(before, after, "black"), 150);
  });
});

describe("cpLossFromBestComparison", () => {
  it("avoids false loss from side-to-move tempo shift", () => {
    const bestAfter = { cp: 45, mate: null, ...emptyMeta };
    const playedAfter = { cp: 45, mate: null, ...emptyMeta };
    assert.equal(cpLossFromBestComparison(playedAfter, bestAfter, "white"), 0);
  });

  it("measures gap between played and best continuations", () => {
    const bestAfter = { cp: 50, mate: null, ...emptyMeta };
    const playedAfter = { cp: 20, mate: null, ...emptyMeta };
    assert.equal(cpLossFromBestComparison(playedAfter, bestAfter, "white"), 30);
    assert.equal(cpLossFromBestComparison(playedAfter, bestAfter, "black"), 0);
  });

  it("scores black blunders against best defense", () => {
    const bestAfter = { cp: 10, mate: null, ...emptyMeta };
    const playedAfter = { cp: 90, mate: null, ...emptyMeta };
    assert.equal(cpLossFromBestComparison(playedAfter, bestAfter, "black"), 80);
  });
});

describe("moveEvalLoss", () => {
  it("returns zero when the played move matches the engine best move", () => {
    const before = {
      cp: 30,
      mate: null,
      depth: 14,
      bestMoveUci: "e2e4",
      pvUci: ["e2e4"],
      lines: [{ cp: 30, mate: null, pvUci: ["e2e4", "e7e5"] }],
    };
    const playedAfter = { cp: 25, mate: null, ...emptyMeta };
    const bestAfter = { cp: 25, mate: null, ...emptyMeta };

    assert.equal(moveEvalLoss(before, playedAfter, bestAfter, 1, "e2e4"), 0);
  });

  it("uses best-after comparison when the played move is not best", () => {
    const before = { cp: 30, mate: null, ...emptyMeta };
    const playedAfter = { cp: 10, mate: null, ...emptyMeta };
    const bestAfter = { cp: 40, mate: null, ...emptyMeta };

    assert.equal(moveEvalLoss(before, playedAfter, bestAfter, 1, "d2d4"), 30);
  });
});

describe("pickBestMoveUci", () => {
  it("prefers bestMoveUci then pvUci", () => {
    assert.equal(pickBestMoveUci(emptyMeta), "e2e4");
    assert.equal(
      pickBestMoveUci({ ...emptyMeta, bestMoveUci: null, pvUci: ["d2d4"] }),
      "d2d4",
    );
  });
});

describe("isPlayedBestMove", () => {
  it("matches any top PV first move", () => {
    const engine = {
      ...emptyMeta,
      lines: [
        { cp: 30, mate: null, pvUci: ["e2e4"] },
        { cp: 20, mate: null, pvUci: ["d2d4"] },
      ],
    };
    assert.equal(isPlayedBestMove(engine, "d2d4"), true);
    assert.equal(isPlayedBestMove(engine, "g1f3"), false);
  });
});

describe("applyUci", () => {
  it("applies a legal uci move to a fen", () => {
    const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const after = applyUci(start, "e2e4");
    assert.match(after ?? "", /4P3/);
  });
});

describe("sideForPly", () => {
  it("alternates sides from ply 1", () => {
    assert.equal(sideForPly(1), "white");
    assert.equal(sideForPly(2), "black");
  });
});

describe("Lucas Chess Elo", () => {
  it("returns max elo for a perfect move", () => {
    assert.equal(lucasMoveElo(0), LUCAS_EVAL.maxElo);
    assert.equal(evaluateDif({ cp: 40, mate: 0 }, { cp: 40, mate: 0 }), 0);
  });

  it("returns min elo for catastrophic mistakes", () => {
    assert.equal(lucasMoveElo(LUCAS_EVAL.blunder * 1.5 + 1), LUCAS_EVAL.minElo);
  });

  it("weights blunders more heavily in the game average", () => {
    const perfect = { cpLoss: 0, elo: LUCAS_EVAL.maxElo, weight: 1 };
    const blunder = moveLucasPerformance({ cp: 200, mate: 0 }, { cp: -300, mate: 0 });
    const moves = [{ cpLoss: 500, ...blunder }];
    const weighted = weightedLucasElo([perfect, ...moves]);
    const simple = weightedLucasElo([
      { cpLoss: 0, elo: LUCAS_EVAL.maxElo, weight: 1 },
      { cpLoss: 500, elo: blunder.elo, weight: 1 },
    ]);
    assert.ok(weighted !== null && simple !== null);
    assert.ok(weighted < simple);
  });

  it("maps mover scores from post-move evals", () => {
    const after = { cp: 35, mate: null, ...emptyMeta };
    assert.deepEqual(moveScoreFromAfter(after, "white"), { cp: 35, mate: 0 });
    assert.deepEqual(moveScoreFromAfter(after, "black"), { cp: -35, mate: 0 });
  });

  it("converts mate scores like Lucas centipawns_abs", () => {
    assert.equal(centipawnsAbs({ cp: 0, mate: 3 }), 30_000 - 20);
    assert.equal(centipawnsAbs({ cp: 0, mate: -2 }), -29_990);
  });
});

describe("buildEloSparklines", () => {
  it("tracks running weighted elo after each side move", () => {
    const results = new Map([
      [1, { cpLoss: 0, elo: 3300, weight: 1 }],
      [2, { cpLoss: 10, elo: 3200, weight: 1 }],
      [3, { cpLoss: 100, elo: 1000, weight: 6 }],
    ]);
    const lines = buildEloSparklines([1, 2, 3], results);
    assert.equal(lines.white.length, 2);
    assert.equal(lines.black.length, 1);
    assert.equal(lines.white[0]?.elo, 3300);
    assert.equal(lines.white[1]?.elo, 1329);
    assert.equal(lines.black[0]?.elo, 3200);
  });
});

describe("performanceFromMoveResults", () => {
  it("aggregates ACPL and weighted Lucas Elo per side", () => {
    const perf = performanceFromMoveResults(
      [
        { cpLoss: 0, elo: LUCAS_EVAL.maxElo, weight: 1 },
        { cpLoss: 10, elo: 2800, weight: 1 },
      ],
      [{ cpLoss: 150, elo: 1200, weight: 12 }],
    );
    assert.equal(perf.white.acpl, 5);
    assert.equal(perf.black.acpl, 150);
    assert.equal(perf.white.elo, Math.round((LUCAS_EVAL.maxElo + 2800) / 2));
    assert.equal(perf.black.elo, 1200);
    assert.equal(perf.white.moves, 2);
    assert.equal(perf.black.moves, 1);
  });
});
