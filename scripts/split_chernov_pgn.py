#!/usr/bin/env python3
"""Split docs/logical chess.pgn into per-game PGN files."""

from __future__ import annotations

import io
import json
import re
from pathlib import Path

import chess.pgn

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "logical chess.pgn"
OUT_DIR = ROOT / "data" / "pgn" / "chernov"


def game_num_from_headers(headers: dict[str, str]) -> int | None:
    event = headers.get("Event", "")
    round_tag = headers.get("Round", "")
    for value in (event, round_tag):
        m = re.search(r"#?\s*0*(\d+)\b", value)
        if m:
            return int(m.group(1))
    return None


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    text = SOURCE.read_text(encoding="utf-8")
    index: list[dict] = []

    stream = io.StringIO(text)
    while True:
        game = chess.pgn.read_game(stream)
        if game is None:
            break
        headers = dict(game.headers)
        num = game_num_from_headers(headers)
        if num is None:
            raise ValueError(f"Could not determine game number for event: {headers.get('Event')}")

        filename = f"{num:02d}.pgn"
        out_path = OUT_DIR / filename
        exporter = chess.pgn.FileExporter(out_path.open("w", encoding="utf-8"))
        game.accept(exporter)

        board = game.board()
        move_count = sum(1 for _ in game.mainline_moves())
        index.append({
            "num": num,
            "filename": filename,
            "white": headers.get("White", ""),
            "black": headers.get("Black", ""),
            "event": headers.get("Site", headers.get("Event", "")),
            "date": headers.get("Date", ""),
            "eco": headers.get("ECO", ""),
            "result": headers.get("Result", "*"),
            "moveCount": move_count,
            "source": "docs/logical chess.pgn",
        })
        print(f"OK  Game {num:2d}: {headers.get('White')} vs {headers.get('Black')} ({move_count} moves)")

    index.sort(key=lambda g: g["num"])
    (OUT_DIR / "index.json").write_text(json.dumps(index, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\nSplit {len(index)} games into {OUT_DIR}")


if __name__ == "__main__":
    main()
