import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatGameResult,
  gameWinner,
  resultWinnerClass,
} from "./gameResult.ts";

test("gameWinner parses standard results", () => {
  assert.equal(gameWinner("1-0"), "white");
  assert.equal(gameWinner("0-1"), "black");
  assert.equal(gameWinner("1/2-1/2"), "draw");
  assert.equal(gameWinner("*"), null);
  assert.equal(gameWinner(undefined), null);
});

test("formatGameResult and resultWinnerClass", () => {
  assert.equal(formatGameResult("0-1"), "0-1");
  assert.equal(formatGameResult("*"), "—");
  assert.equal(resultWinnerClass("white", "white"), " is-winner");
  assert.equal(resultWinnerClass("black", "white"), " is-loser");
  assert.equal(resultWinnerClass("white", "draw"), "");
});
