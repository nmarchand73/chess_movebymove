#!/usr/bin/env python3
"""Ingest Chernev EPUB + local PGN into lesson JSON with full commentary."""

from __future__ import annotations

import html
import io
import json
import re
import zipfile
from pathlib import Path

import chess
import chess.pgn

ROOT = Path(__file__).resolve().parents[1]
EPUB = ROOT / "docs" / "Logical Chess- Move By Move.epub"
PGN_DIR = ROOT / "data" / "pgn" / "chernov"
OUT_DIR = ROOT / "data" / "lessons"

CONTENTS_FILE = "OEBPS/text00001.html"
GAME_FILES = [f"OEBPS/text{num:05d}.html" for num in list(range(5, 21)) + list(range(22, 29)) + list(range(30, 40))]
SECTION_MARKERS = ("Kingside Attack", "Queen", "Chess Master")
OPENING_OCR_FIXES = {"lndian": "Indian", "Defence": "Defense"}


def split_players(players: str) -> tuple[str, str]:
    players = players.strip()
    if "–" in players:
        white, black = players.split("–", 1)
    elif " - " in players:
        white, black = players.split(" - ", 1)
    else:
        white, black = players.rsplit("-", 1)
    return white.strip(), black.strip()


def normalize_opening(name: str) -> str:
    cleaned = name.strip()
    for bad, good in OPENING_OCR_FIXES.items():
        cleaned = cleaned.replace(bad, good)
    return cleaned


def parse_epub_contents(z: zipfile.ZipFile) -> dict[int, dict[str, str]]:
    """Parse the EPUB Contents page (game index with players and venues)."""
    lines = html_to_lines(z.read(CONTENTS_FILE).decode("utf-8", errors="replace"))
    section = "The Kingside Attack"
    index: dict[int, dict[str, str]] = {}

    for line in lines:
        if line in {"Contents"} or line.startswith("Introduction") or line.startswith("Chess Notation"):
            continue
        if not re.match(r"^\d+\s", line) and any(marker in line for marker in SECTION_MARKERS):
            section = line.strip()
            continue
        match = re.match(r"^(\d+)\s+(.+),\s*(.+)$", line)
        if not match:
            continue
        num = int(match.group(1))
        white, black = split_players(match.group(2))
        index[num] = {
            "section": section,
            "white": white,
            "black": black,
            "event": match.group(3).strip(),
        }
    return index


def parse_game_header(lines: list[str]) -> dict[str, str]:
    """Extract players, event, and opening name from the EPUB game intro."""
    body = [
        line
        for line in lines
        if line not in {"Logical Chess: Move by Move"} and not line.startswith("Game ")
    ]
    if len(body) < 3:
        return {}

    white, black = split_players(body[0])
    opening = body[2].strip()
    if re.match(r"^\d+\s", opening) or parse_marker(opening, None):
        opening = ""

    return {
        "white": white,
        "black": black,
        "event": body[1].strip(),
        "opening": normalize_opening(opening) if opening else "",
    }


def html_to_lines(raw: str) -> list[str]:
    text = re.sub(r"<br\s*/?>", "\n", raw, flags=re.I)
    text = re.sub(r"</p>", "\n\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    return [line.strip() for line in text.split("\n") if line.strip()]


def clean_san(token: str) -> str:
    token = token.strip()
    token = re.sub(r"^\.+\s*", "", token)
    token = re.sub(r"[!?+#=]+$", "", token)
    token = token.replace("0-0-0", "O-O-O").replace("0-0", "O-O")
    token = re.sub(r"^[lI1]\s*\.\.\.", "", token)
    token = re.sub(r"^\.\.\.\s*", "", token)
    token = re.sub(r"\s+", "", token)
    token = token.replace("hl", "h1").replace("gl", "g1").replace("fl", "f1").replace("kl", "k1")
    return token


def matches_expected(token: str, expected: str) -> bool:
    if not token:
        return False
    if token == expected:
        return True
    if expected.endswith(token) and len(token) >= 2:
        return True
    if token.endswith("+") and expected == token:
        return True
    if expected.endswith("+") and token == expected.rstrip("+"):
        return True
    if token + "+" == expected or token == expected.rstrip("+"):
        return True
    return False


def is_prose_move_line(line: str) -> bool:
    return bool(re.search(r'["\':]', line))


def parse_marker(line: str, nxt: str | None) -> tuple[int, bool, str, int] | None:
    """Return (move_num, is_black, token, lines_consumed_after_current)."""
    if line.startswith("Logical Chess:") or line.startswith("Game ") or line in {"(D)", "D"}:
        return None

    # Black: "1  ... e5" on one line
    m = re.match(r"^(\d+)\s*\.{2,3}\s*(.+)$", line)
    if m and not is_prose_move_line(line):
        token = clean_san(m.group(2))
        if token:
            return int(m.group(1)), True, token, 0

    # Black: "2   ..." then "c6!" on next line
    if re.match(r"^(\d+)\s*\.{2,3}\s*$", line) and nxt and nxt not in {"(D)", "D"} and not is_prose_move_line(nxt):
        move_num = int(re.match(r"^(\d+)", line).group(1))
        token = clean_san(nxt)
        if token:
            return move_num, True, token, 1

    # White: "1 e4" / "4   c3" on one line
    m = re.match(r"^(\d+)\s+([^\d\s\.].+)$", line)
    if m and not is_prose_move_line(line):
        token = clean_san(m.group(2))
        if token:
            return int(m.group(1)), False, token, 0

    # White: "2" then "f3!" / "11" then "xe5" on next line
    if re.match(r"^(\d+)$", line) and nxt and nxt not in {"(D)", "D"} and not is_prose_move_line(nxt):
        move_num = int(line)
        if re.match(r"^\.{2,3}", nxt):
            token = clean_san(nxt)
            if token:
                return move_num, True, token, 1
        token = clean_san(nxt)
        if token and re.match(r"^[NBRQK]?[a-hxXO=]", token, re.I):
            return move_num, False, token, 1

    return None


def load_pgn(pgn_path: Path) -> tuple[list[str], dict[str, str]]:
    game = chess.pgn.read_game(io.StringIO(pgn_path.read_text(encoding="utf-8")))
    if game is None:
        raise ValueError(f"No game in {pgn_path}")
    board = game.board()
    moves: list[str] = []
    for move in game.mainline_moves():
        san = board.san(move)
        board.push(move)
        moves.append(san)
    return moves, dict(game.headers)


def extract_move_markers(lines: list[str], pgn_moves: list[str]) -> list[tuple[int, int, str]]:
    markers: list[tuple[int, int, str]] = []
    seen_plies: set[int] = set()
    i = 0
    while i < len(lines):
        nxt = lines[i + 1] if i + 1 < len(lines) else None
        parsed = parse_marker(lines[i], nxt)
        if parsed:
            move_num, is_black, token, consumed = parsed
            ply = move_num * 2 if is_black else move_num * 2 - 1
            if 1 <= ply <= len(pgn_moves) and ply not in seen_plies:
                expected = pgn_moves[ply - 1]
                if matches_expected(token, expected):
                    markers.append((i, ply, expected))
                    seen_plies.add(ply)
                    i += 1 + consumed
                    continue
        i += 1
    markers.sort(key=lambda x: x[0])
    return markers


def game_full_text(lines: list[str]) -> str:
    body = [ln for ln in lines if not ln.startswith("Logical Chess:") and not ln.startswith("Game ")]
    return "\n\n".join(body).strip()



JUNK_LINE = re.compile(r"^\(D\)$|^D$")
ORPHAN_MOVE = re.compile(r"^[NBRQK]?[a-h]?x?[a-h][1-8](?:=[NBRQK])?[+#?!]*$", re.I)


def clean_chunk_lines(lines: list[str], san: str | None = None) -> list[str]:
    cleaned: list[str] = []
    suffix = re.sub(r"^[NBRQK]?", "", san or "").rstrip("!?+#") if san else ""
    for line in lines:
        s = line.strip()
        if not s or JUNK_LINE.match(s):
            continue
        if ORPHAN_MOVE.match(s):
            token = re.sub(r"[!?+#]+$", "", s)
            if suffix and (suffix.endswith(token) or token == suffix) and len(token) <= 4:
                continue
        cleaned.append(s)
    return cleaned


def ingest_game(
    game_num: int,
    html_path: str,
    pgn_path: Path,
    contents_index: dict[int, dict[str, str]],
) -> dict:
    pgn_moves, headers = load_pgn(pgn_path)
    with zipfile.ZipFile(EPUB) as z:
        lines = html_to_lines(z.read(html_path).decode("utf-8", errors="replace"))

    epub_header = parse_game_header(lines)
    contents = contents_index.get(game_num, {})
    white = epub_header.get("white") or contents.get("white") or headers.get("White", "")
    black = epub_header.get("black") or contents.get("black") or headers.get("Black", "")
    event = epub_header.get("event") or contents.get("event") or headers.get("Site", headers.get("Event", ""))
    opening = epub_header.get("opening") or ""
    section = contents.get("section", "The Kingside Attack")

    full_text = game_full_text(lines)
    markers = extract_move_markers(lines, pgn_moves)

    intro_end = markers[0][0] if markers else len(lines)
    intro = "\n\n".join(
        ln for ln in lines[:intro_end]
        if not ln.startswith("Logical Chess:") and not ln.startswith("Game ")
    ).strip()

    by_ply: dict[int, dict] = {0: {"ply": 0, "text": intro}}
    for idx, (line_i, ply, san) in enumerate(markers):
        end = markers[idx + 1][0] if idx + 1 < len(markers) else len(lines)
        chunk = clean_chunk_lines(lines[line_i + 1 : end], san)
        text = "\n\n".join(chunk).strip()
        by_ply[ply] = {"ply": ply, "san": san, "text": text, "isCritical": True}

    nodes: list[dict] = [by_ply.get(0, {"ply": 0, "text": intro})]
    for ply in range(1, len(pgn_moves) + 1):
        if ply in by_ply:
            nodes.append(by_ply[ply])
        else:
            nodes.append({"ply": ply, "san": pgn_moves[ply - 1], "text": "", "isCritical": True})

    return {
        "id": f"chernov-{game_num:03d}",
        "book": "chernov",
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


def main() -> None:
    pgn_index = {g["num"]: g for g in json.loads((PGN_DIR / "index.json").read_text(encoding="utf-8"))}
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    lessons, report = [], []

    with zipfile.ZipFile(EPUB) as z:
        contents_index = parse_epub_contents(z)

    for game_num, html_path in enumerate(GAME_FILES, start=1):
        pgn_path = PGN_DIR / pgn_index[game_num]["filename"]
        lesson = ingest_game(game_num, html_path, pgn_path, contents_index)
        out_file = OUT_DIR / f"chernov-{game_num:03d}.json"
        out_file.write_text(json.dumps(lesson, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        non_empty = sum(1 for n in lesson["nodes"] if n.get("text"))
        report.append({
            "game": game_num,
            "annotatedMoves": lesson["annotatedMoves"],
            "moveCount": lesson["moveCount"],
            "nodesWithText": non_empty,
        })
        print(f"Game {game_num:2d}: markers {lesson['annotatedMoves']:3d}/{lesson['moveCount']} | nodes w/text {non_empty:3d}")
        lessons.append({
            "id": lesson["id"], "book": "chernov", "gameNum": game_num,
            "title": lesson["title"], "section": lesson["section"],
            "players": lesson["players"], "event": lesson["event"],
            "opening": lesson["opening"], "eco": lesson["eco"],
            "result": lesson.get("result"),
            "moveCount": lesson["moveCount"],
            "annotatedMoves": lesson["annotatedMoves"], "file": out_file.name,
        })

    (ROOT / "data" / "index.json").write_text(json.dumps({"chernov": lessons}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (ROOT / "data" / "ingest_report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    avg = sum(r["annotatedMoves"] for r in report) / sum(r["moveCount"] for r in report)
    print(f"\nMove marker coverage: {avg:.0%}")


if __name__ == "__main__":
    main()
