#!/usr/bin/env python3
"""Fetch all 30 Nunn Understanding Chess Move by Move PGNs from a Lichess study."""

from __future__ import annotations

import io
import json
import urllib.request
from pathlib import Path

import chess.pgn

STUDY_URL = "https://lichess.org/study/moJOC4Se/yT9h58Hg"
STUDY_PGN_URL = "https://lichess.org/api/study/moJOC4Se.pgn"

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "pgn" / "nunn"
BUNDLE_PATH = ROOT / "docs" / "nunn.pgn"


def strip_comments(game: chess.pgn.Game) -> chess.pgn.Game:
    """Return a copy with mainline comments removed (e.g. '{ 1-0 Black resigns. }')."""
    board = game.board()
    node = game
    while node.variations:
        child = node.variation(0)
        board.push(child.move)
        child.comment = ""
        node = child
    return game


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Downloading {STUDY_PGN_URL}")
    with urllib.request.urlopen(STUDY_PGN_URL) as response:
        pgn_text = response.read().decode("utf-8")

    BUNDLE_PATH.write_text(pgn_text, encoding="utf-8")
    print(f"Saved bundle to {BUNDLE_PATH}")

    index: list[dict] = []
    stream = io.StringIO(pgn_text)
    game_num = 0

    while True:
        game = chess.pgn.read_game(stream)
        if game is None:
            break
        game_num += 1
        strip_comments(game)
        headers = dict(game.headers)

        filename = f"{game_num:02d}.pgn"
        out_path = OUT_DIR / filename
        exporter = chess.pgn.FileExporter(out_path.open("w", encoding="utf-8"))
        game.accept(exporter)

        board = game.board()
        move_count = sum(1 for _ in game.mainline_moves())
        index.append({
            "num": game_num,
            "filename": filename,
            "white": headers.get("White", ""),
            "black": headers.get("Black", ""),
            "event": headers.get("Site", headers.get("Event", "")),
            "date": headers.get("Date", ""),
            "eco": headers.get("ECO", ""),
            "result": headers.get("Result", "*"),
            "moveCount": move_count,
            "source": STUDY_URL,
            "chapterName": headers.get("ChapterName", ""),
        })
        print(
            f"OK  Game {game_num:2d}: {headers.get('White')} vs {headers.get('Black')} "
            f"({move_count} moves) -> {filename}"
        )

    if game_num != 30:
        raise SystemExit(f"Expected 30 games, got {game_num}")

    (OUT_DIR / "index.json").write_text(
        json.dumps(index, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"\nSaved {len(index)} PGNs to {OUT_DIR}")


if __name__ == "__main__":
    main()
