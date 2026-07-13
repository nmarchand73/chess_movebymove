"""Shared helpers for EPUB + PGN lesson ingest."""

from __future__ import annotations

import html
import io
import re
from pathlib import Path
from typing import Callable

import chess.pgn

JUNK_LINE = re.compile(r"^\(D\)$|^D$")
ORPHAN_MOVE = re.compile(r"^[NBRQK]?[a-h]?x?[a-h][1-8](?:=[NBRQK])?[+#?!]*$", re.I)


def html_to_lines(raw: str) -> list[str]:
    text = re.sub(r"<br\s*/?>", "\n", raw, flags=re.I)
    text = re.sub(r"</p>", "\n\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    return [line.strip() for line in text.split("\n") if line.strip()]


def split_players(players: str) -> tuple[str, str]:
    players = players.strip()
    if "–" in players:
        white, black = players.split("–", 1)
    elif " - " in players:
        white, black = players.split(" - ", 1)
    else:
        white, black = players.rsplit("-", 1)
    return white.strip(), black.strip()


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


def extract_move_markers(
    lines: list[str],
    pgn_moves: list[str],
    parse_marker: Callable[[str, str | None], tuple[int, bool, str, int] | None],
) -> list[tuple[int, int, str]]:
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


def build_lesson_nodes(
    lines: list[str],
    pgn_moves: list[str],
    markers: list[tuple[int, int, str]],
    intro_skip: Callable[[str], bool],
) -> list[dict]:
    intro_end = markers[0][0] if markers else len(lines)
    intro = "\n\n".join(ln for ln in lines[:intro_end] if not intro_skip(ln)).strip()

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
    return nodes
