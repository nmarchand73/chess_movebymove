#!/usr/bin/env python3
"""Ingest Nunn EPUB + local PGN into lesson JSON with full commentary."""

from __future__ import annotations

import json
import re
import sys
import zipfile
from pathlib import Path

_SCRIPTS = Path(__file__).resolve().parent
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

from lib.ingest_core import (
    build_lesson_nodes,
    extract_move_markers,
    html_to_lines,
    load_pgn,
    split_players,
    clean_san,
)

ROOT = Path(__file__).resolve().parents[1]
EPUB = ROOT / "docs" / "Understanding chess move by move - [a top-class grandmaster -- John Nunn -- 2013.epub"
PGN_DIR = ROOT / "data" / "pgn" / "nunn"
OUT_DIR = ROOT / "data" / "lessons"

TOC_FILES = ["index_split_004.html", "index_split_005.html", "index_split_006.html"]

GAME_FILES: dict[int, str] = {
    1: "index_split_010.html",
    2: "index_split_011.html",
    3: "index_split_012.html",
    4: "index_split_013.html",
    5: "index_split_014.html",
    6: "index_split_017.html",
    7: "index_split_018.html",
    8: "index_split_019.html",
    9: "index_split_020.html",
    10: "index_split_021.html",
    11: "index_split_022.html",
    12: "index_split_024.html",
    13: "index_split_025.html",
    14: "index_split_026.html",
    15: "index_split_027.html",
    16: "index_split_029.html",
    17: "index_split_030.html",
    18: "index_split_031.html",
    19: "index_split_032.html",
    20: "index_split_033.html",
    21: "index_split_034.html",
    22: "index_split_035.html",
    23: "index_split_036.html",
    24: "index_split_037.html",
    25: "index_split_038.html",
    26: "index_split_039.html",
    27: "index_split_040.html",
    28: "index_split_042.html",
    29: "index_split_043.html",
    30: "index_split_044.html",
}

SECTION_BY_GAME: dict[int, str] = {}
for n in range(1, 6):
    SECTION_BY_GAME[n] = "Opening Themes"
for n in range(6, 12):
    SECTION_BY_GAME[n] = "Attacking Play"
for n in range(12, 16):
    SECTION_BY_GAME[n] = "Defensive Play"
for n in range(16, 28):
    SECTION_BY_GAME[n] = "Positional Play"
for n in range(28, 31):
    SECTION_BY_GAME[n] = "Endgame Themes"

BOOK_SECTIONS = [
    {"title": "Opening Themes", "range": "1–5", "blurb": "Development, king safety, and centre control"},
    {"title": "Attacking Play", "range": "6–11", "blurb": "Sacrifices, reserves, and opposite-side castling"},
    {"title": "Defensive Play", "range": "12–15", "blurb": "Defensive sacrifices and counter-attack"},
    {"title": "Positional Play", "range": "16–27", "blurb": "Structure, space, outposts, and piece play"},
    {"title": "Endgame Themes", "range": "28–30", "blurb": "Active king, passed pawns, rook on the seventh"},
]

SKIP_LINES = {
    "Understanding Chess Move by Move",
    "Black to play",
    "White to play",
}

DIAGRAM_CAPTION = re.compile(r"^(Black|White) to play$", re.I)
NUMBERED_PROSE = re.compile(r"^\d+\)\s")
MOVE_TOKEN = re.compile(r"^[NBRQK]?[a-hxXO=0-9+#-]+$", re.I)


def parse_epub_contents(z: zipfile.ZipFile) -> dict[int, dict[str, str]]:
    """Parse Nunn TOC pages for game metadata."""
    index: dict[int, dict[str, str]] = {}
    for toc_file in TOC_FILES:
        if toc_file not in z.namelist():
            continue
        lines = html_to_lines(z.read(toc_file).decode("utf-8", errors="replace"))
        for line in lines:
            match = re.match(r"^Game\s+(\d+)\s+(.+?)\s*\(([^)]+)\)\s*$", line)
            if not match:
                continue
            num = int(match.group(1))
            players = match.group(3).strip()
            white, black = split_players(players.replace("–", "-"))
            index[num] = {
                "section": SECTION_BY_GAME.get(num, ""),
                "theme": match.group(2).strip(),
                "white": white,
                "black": black,
            }
    return index


def parse_game_header(lines: list[str]) -> dict[str, str]:
    """Extract players, event, and opening from Nunn game chapter."""
    game_i = next((i for i, line in enumerate(lines) if re.match(r"^Game\s+\d+$", line)), None)
    if game_i is None or game_i + 3 >= len(lines):
        return {}

    players_line = lines[game_i + 1]
    event_line = lines[game_i + 2]
    opening_line = lines[game_i + 3]
    white, black = split_players(players_line)
    opening = opening_line.strip()
    if re.match(r"^\d+", opening) or parse_marker(opening, None):
        opening = ""

    return {
        "white": white,
        "black": black,
        "event": event_line.strip(),
        "opening": opening,
    }


def is_prose_move_line(line: str) -> bool:
    if NUMBERED_PROSE.match(line):
        return True
    if DIAGRAM_CAPTION.match(line):
        return True
    return bool(re.search(r'["\':]', line))


def try_parse_single_move(move_num: int, is_black: bool, raw: str) -> tuple[int, bool, str, int] | None:
    token = clean_san(raw)
    if not token or not MOVE_TOKEN.match(token):
        return None
    return move_num, is_black, token, 0


def expand_combined_moves(lines: list[str]) -> list[str]:
    """Split '1 Nf3 Nf6' style lines into separate white/black move lines."""
    expanded: list[str] = []
    for line in lines:
        m = re.match(r"^(\d+)\s+(\S+)\s+(\S+)$", line)
        if m and not is_prose_move_line(line) and not re.match(r"^\d+\.{2,3}$", m.group(3)):
            move_num, white_raw, black_raw = m.group(1), m.group(2), m.group(3)
            if MOVE_TOKEN.match(clean_san(white_raw)) and MOVE_TOKEN.match(clean_san(black_raw)):
                expanded.append(f"{move_num} {white_raw}")
                expanded.append(f"{move_num}...{black_raw}")
                continue
        expanded.append(line)
    return expanded


def parse_marker(line: str, nxt: str | None) -> tuple[int, bool, str, int] | None:
    if (
        line.startswith("Understanding Chess")
        or line.startswith("Game ")
        or line in SKIP_LINES
        or DIAGRAM_CAPTION.match(line)
        or NUMBERED_PROSE.match(line)
    ):
        return None

    # Black: "1...d6" or "2...g6"
    m = re.match(r"^(\d+)\s*\.{2,3}\s*(.+)$", line)
    if m and not is_prose_move_line(line):
        result = try_parse_single_move(int(m.group(1)), True, m.group(2))
        if result:
            return result

    # White: "1 Nf3" / "5 d4"
    m = re.match(r"^(\d+)\s+([^\d\s\.].+)$", line)
    if m and not is_prose_move_line(line):
        result = try_parse_single_move(int(m.group(1)), False, m.group(2))
        if result:
            return result

    return None


def intro_skip(line: str) -> bool:
    return (
        line.startswith("Understanding Chess")
        or line.startswith("Game ")
        or line in SKIP_LINES
    )


def game_full_text(lines: list[str]) -> str:
    body = [ln for ln in lines if not intro_skip(ln)]
    return "\n\n".join(body).strip()


def ingest_game(
    game_num: int,
    html_path: str,
    pgn_path: Path,
    contents_index: dict[int, dict[str, str]],
    z: zipfile.ZipFile,
) -> dict:
    pgn_moves, headers = load_pgn(pgn_path)
    lines = expand_combined_moves(
        html_to_lines(z.read(html_path).decode("utf-8", errors="replace"))
    )

    epub_header = parse_game_header(lines)
    contents = contents_index.get(game_num, {})
    white = epub_header.get("white") or contents.get("white") or headers.get("White", "")
    black = epub_header.get("black") or contents.get("black") or headers.get("Black", "")
    event = epub_header.get("event") or headers.get("Site", headers.get("Event", ""))
    opening = epub_header.get("opening") or headers.get("Opening", "")
    section = SECTION_BY_GAME.get(game_num, contents.get("section", ""))

    full_text = game_full_text(lines)
    markers = extract_move_markers(lines, pgn_moves, parse_marker)
    nodes = build_lesson_nodes(lines, pgn_moves, markers, intro_skip)

    return {
        "id": f"nunn-{game_num:03d}",
        "book": "nunn",
        "gameNum": game_num,
        "title": f"Game {game_num}: {white} vs {black}",
        "section": section,
        "players": {"white": white, "black": black},
        "event": event,
        "opening": opening,
        "eco": headers.get("ECO", ""),
        "pgnPath": str(pgn_path.relative_to(ROOT)),
        "result": headers.get("Result", "*"),
        "moveCount": len(pgn_moves),
        "annotatedMoves": len(markers),
        "fullText": full_text,
        "nodes": nodes,
    }


def load_existing_index() -> dict:
    index_path = ROOT / "data" / "index.json"
    if index_path.exists():
        return json.loads(index_path.read_text(encoding="utf-8"))
    return {}


def main() -> None:
    pgn_index = {g["num"]: g for g in json.loads((PGN_DIR / "index.json").read_text(encoding="utf-8"))}
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    lessons, report = [], []

    with zipfile.ZipFile(EPUB) as z:
        contents_index = parse_epub_contents(z)
        for game_num, html_path in sorted(GAME_FILES.items()):
            pgn_path = PGN_DIR / pgn_index[game_num]["filename"]
            lesson = ingest_game(game_num, html_path, pgn_path, contents_index, z)
            out_file = OUT_DIR / f"nunn-{game_num:03d}.json"
            out_file.write_text(json.dumps(lesson, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            non_empty = sum(1 for n in lesson["nodes"] if n.get("text"))
            report.append({
                "book": "nunn",
                "game": game_num,
                "annotatedMoves": lesson["annotatedMoves"],
                "moveCount": lesson["moveCount"],
                "nodesWithText": non_empty,
            })
            print(
                f"Game {game_num:2d}: markers {lesson['annotatedMoves']:3d}/{lesson['moveCount']} "
                f"| nodes w/text {non_empty:3d}"
            )
            lessons.append({
                "id": lesson["id"],
                "book": "nunn",
                "gameNum": game_num,
                "title": lesson["title"],
                "section": lesson["section"],
                "players": lesson["players"],
                "event": lesson["event"],
                "opening": lesson["opening"],
                "eco": lesson["eco"],
                "result": lesson.get("result"),
                "moveCount": lesson["moveCount"],
                "annotatedMoves": lesson["annotatedMoves"],
                "file": out_file.name,
            })

    existing = load_existing_index()
    chernov_lessons = existing.get("chernov", [])
    chernov_book = next((b for b in existing.get("books", []) if b.get("id") == "chernov"), None)

    books = []
    if chernov_book:
        books.append(chernov_book)
    elif chernov_lessons:
        books.append({
            "id": "chernov",
            "title": "Logical Chess: Move By Move",
            "author": "Irving Chernev",
            "publisher": "Batsford",
            "gameCount": len(chernov_lessons),
            "sections": [
                {"title": "The Kingside Attack", "range": "1–16", "blurb": "e4 openings and kingside attacks"},
                {"title": "The Queen\u2019s Pawn Opening", "range": "17–23", "blurb": "d4 structures and queenside play"},
                {"title": "The Chess Master Explains his Ideas", "range": "24–33", "blurb": "masterclass commentary"},
            ],
        })
    else:
        books.append({
            "id": "chernov",
            "title": "Logical Chess: Move By Move",
            "author": "Irving Chernev",
            "publisher": "Batsford",
            "gameCount": 33,
            "sections": [
                {"title": "The Kingside Attack", "range": "1–16", "blurb": "e4 openings and kingside attacks"},
                {"title": "The Queen\u2019s Pawn Opening", "range": "17–23", "blurb": "d4 structures and queenside play"},
                {"title": "The Chess Master Explains his Ideas", "range": "24–33", "blurb": "masterclass commentary"},
            ],
        })

    books.append({
        "id": "nunn",
        "title": "Understanding Chess Move by Move",
        "author": "John Nunn",
        "publisher": "Gambit",
        "gameCount": 30,
        "sections": BOOK_SECTIONS,
    })

    merged_index = {
        "books": books,
        "chernov": chernov_lessons,
        "nunn": lessons,
    }
    (ROOT / "data" / "index.json").write_text(
        json.dumps(merged_index, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    existing_report = []
    report_path = ROOT / "data" / "ingest_report.json"
    if report_path.exists():
        existing_report = json.loads(report_path.read_text(encoding="utf-8"))
    nunn_report = [r for r in existing_report if r.get("book") != "nunn"] + report
    report_path.write_text(json.dumps(nunn_report, indent=2) + "\n", encoding="utf-8")

    avg = sum(r["annotatedMoves"] for r in report) / sum(r["moveCount"] for r in report)
    print(f"\nMove marker coverage: {avg:.0%}")


if __name__ == "__main__":
    main()
