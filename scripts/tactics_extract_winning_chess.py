#!/usr/bin/env python3
"""Extract Winning Chess EPUB diagrams + captions + chapter text, then OCR.

Writes (gitignored):
  docs/tactics/extract/winning-chess/images/
  docs/tactics/extract/winning-chess/manifest.json
  docs/tactics/extract/winning-chess/quality.json
  docs/tactics/extract/winning-chess/chapters.json

Usage:
  PYTHONPATH=../chess-diagram-ocr/src \\
    ../Avoidable_mistakes/tools/.venv_ocr/bin/python scripts/tactics_extract_winning_chess.py
  ... --ocr
  ... --ocr --limit 20
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
import zipfile
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PKG = ROOT.parent / "chess-diagram-ocr" / "src"
sys.path.insert(0, str(PKG))

TACTICS = ROOT / "docs" / "tactics"
OUT = TACTICS / "extract" / "winning-chess"
EPUB_GLOB = "Winning Chess*.epub"
MIN_BOARD_BYTES = 12_000

CHAPTER_RE = re.compile(
    r"^\s*(\d+)\.\s+(The pin|The knight fork|Double attack|Discovered attack|"
    r"Discovered check|Double check|The overworked piece|Removing the guard|"
    r".*No retreat.*|The skewer|Queening|The vulnerable first rank|"
    r"Breaking communication|The surprise move|Combined operations|"
    r"Design for checkmate|The manly art|Illustrative games|"
    r"From googols|Winning ways|A spade).*$",
    re.I,
)


class CaptionParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.events: list[tuple[str, str]] = []
        self._capture = False
        self._buf: list[str] = []
        self._tag = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        ad = dict(attrs)
        if tag == "img":
            src = (ad.get("src") or "").replace("\\", "/")
            name = Path(src).name
            if re.match(r"\d+\.jpe?g$", name, re.I):
                self.events.append(("img", name))
            return
        cls = ad.get("class") or ""
        if tag == "p" and (
            "body-text" in cls or "body-textb" in cls or cls in {"h", "h1", "calibre8"} or "h" == cls
        ):
            self._capture = True
            self._buf = []
            self._tag = "h" if cls in {"h", "h1"} or "calibre8" in cls and "body" not in cls else "p"

    def handle_endtag(self, tag: str) -> None:
        if tag == "p" and self._capture:
            text = re.sub(r"\s+", " ", "".join(self._buf)).strip()
            if text:
                kind = "heading" if self._looks_heading(text) else "text"
                self.events.append((kind, text))
            self._capture = False
            self._buf = []

    def handle_data(self, data: str) -> None:
        if self._capture:
            self._buf.append(data)

    @staticmethod
    def _looks_heading(text: str) -> bool:
        if CHAPTER_RE.match(text):
            return True
        if text.isupper() and len(text) < 80:
            return True
        if text.startswith(("BASIC PATTERN", "THE PIN", "QUIZ")):
            return True
        return False


def find_epub() -> Path:
    matches = sorted(TACTICS.glob(EPUB_GLOB))
    if not matches:
        raise SystemExit(f"No EPUB matching {EPUB_GLOB} under {TACTICS}")
    return matches[0]


def side_from_caption(text: str) -> str | None:
    low = text.lower()
    if "white moves" in low or "white to move" in low or "white to play" in low:
        return "w"
    if "black moves" in low or "black to move" in low or "black to play" in low:
        return "b"
    return None


def diagram_label(text: str) -> str | None:
    m = re.match(r"^(\d+[A-Z]?)\.\s", text.strip())
    return m.group(1) if m else None


def extract_all(epub: Path) -> tuple[list[dict], list[dict]]:
    images_dir = OUT / "images"
    if images_dir.exists():
        shutil.rmtree(images_dir)
    images_dir.mkdir(parents=True, exist_ok=True)

    board_images: set[str] = set()
    with zipfile.ZipFile(epub) as zf:
        for name in zf.namelist():
            if not name.startswith("images/") or not name.lower().endswith((".jpeg", ".jpg")):
                continue
            raw = zf.read(name)
            if len(raw) < MIN_BOARD_BYTES:
                continue
            dest = images_dir / Path(name).name
            dest.write_bytes(raw)
            board_images.add(Path(name).name)

        items: list[dict] = []
        chapters: list[dict] = []
        current_chapter = {"id": "intro", "title": "Introduction", "texts": []}
        seen_imgs: set[str] = set()
        pending_img: str | None = None
        last_text: str | None = None

        html_names = sorted(n for n in zf.namelist() if n.startswith("text/") and n.endswith(".html"))
        for html_name in html_names:
            html = zf.read(html_name).decode("utf-8", errors="replace")
            parser = CaptionParser()
            parser.feed(html)
            for kind, value in parser.events:
                if kind == "heading":
                    m = CHAPTER_RE.match(value)
                    if m or value.isupper():
                        if current_chapter["texts"] or current_chapter["id"] != "intro":
                            chapters.append(current_chapter)
                        cid = m.group(1) if m else re.sub(r"[^a-z0-9]+", "-", value.lower())[:40]
                        current_chapter = {"id": str(cid), "title": value, "texts": []}
                    else:
                        current_chapter["texts"].append(value)
                    last_text = value
                elif kind == "text":
                    current_chapter["texts"].append(value)
                    last_text = value
                    if pending_img and pending_img in board_images:
                        items.append(
                            _item(
                                pending_img,
                                html_name,
                                value,
                                current_chapter,
                                images_dir,
                            )
                        )
                        seen_imgs.add(pending_img)
                        pending_img = None
                elif kind == "img":
                    if value not in board_images:
                        continue
                    # Prefer attaching previous caption if it looks like a diagram label
                    if last_text and (diagram_label(last_text) or side_from_caption(last_text)):
                        if value not in seen_imgs:
                            items.append(
                                _item(
                                    value,
                                    html_name,
                                    last_text,
                                    current_chapter,
                                    images_dir,
                                )
                            )
                            seen_imgs.add(value)
                            pending_img = None
                            continue
                    pending_img = value

        if current_chapter["texts"]:
            chapters.append(current_chapter)

        # Orphan boards without caption pairing
        for name in sorted(board_images):
            if name in seen_imgs:
                continue
            items.append(
                {
                    "id": f"wc-{Path(name).stem}",
                    "image": str((images_dir / name).relative_to(OUT)),
                    "html": None,
                    "caption": None,
                    "label": None,
                    "side_to_move": None,
                    "chapter_id": None,
                    "chapter_title": None,
                    "orphan": True,
                }
            )

    # Prefer captioned items first in OCR order
    items.sort(key=lambda x: (1 if x.get("orphan") else 0, x["id"]))
    return items, chapters


def _item(img_name: str, html_name: str, caption: str, chapter: dict, images_dir: Path) -> dict:
    return {
        "id": f"wc-{Path(img_name).stem}",
        "image": str((images_dir / img_name).relative_to(OUT)),
        "html": html_name,
        "caption": caption,
        "label": diagram_label(caption),
        "side_to_move": side_from_caption(caption),
        "chapter_id": chapter.get("id"),
        "chapter_title": chapter.get("title"),
        "orphan": False,
    }


def run_ocr(items: list[dict], limit: int | None) -> dict:
    from chess_diagram_ocr.infer import Inferencer, infer_image
    from chess_diagram_ocr.validate import validate_fen

    targets = items if limit is None else items[:limit]
    # Resume: keep already-OCR'd rows, only process missing ones
    pending = [it for it in targets if not it.get("fen") and not it.get("ocr_error")]
    already_ok = sum(1 for it in targets if it.get("fen_ok") is True)
    already_fail = sum(1 for it in targets if it.get("fen") and it.get("fen_ok") is False) + sum(
        1 for it in targets if it.get("ocr_error")
    )
    print(
        f"Resume: {len(pending)} pending / {len(targets)} selected "
        f"(already ok={already_ok} fail={already_fail})",
        flush=True,
    )
    eng = Inferencer()
    ok_n = already_ok
    fail_n = already_fail
    no_board = sum(1 for it in targets if it.get("ocr_error") == "no board")
    quality_samples: list[dict] = []

    total = len(targets)
    for j, item in enumerate(pending, 1):
        i = already_ok + already_fail + j
        img = OUT / item["image"]
        side = item.get("side_to_move") or "w"
        print(f"[{i}/{total}] OCR {item['id']} side={side} …", flush=True)
        try:
            boards = infer_image(img, engine=eng, mode="crop", side_to_move=side)
        except Exception as exc:  # noqa: BLE001
            item["ocr_error"] = str(exc)
            fail_n += 1
            print(f"  FAIL {exc}", flush=True)
            continue
        if not boards:
            item["ocr_error"] = "no board"
            no_board += 1
            fail_n += 1
            print("  FAIL no board", flush=True)
            continue
        fen = boards[0].fen
        ok, err = validate_fen(fen)
        item["fen"] = fen
        item["fen_board"] = boards[0].fen_board
        item["fen_ok"] = ok
        item["n_boards_detected"] = len(boards)
        if not ok:
            item["fen_error"] = err
            fail_n += 1
            print(f"  INVALID FEN {fen} ({err})", flush=True)
        else:
            ok_n += 1
            print(f"  OK {fen}", flush=True)
        if len(quality_samples) < 12:
            quality_samples.append(
                {
                    "id": item["id"],
                    "fen": fen,
                    "fen_ok": ok,
                    "side_to_move": side,
                    "caption": (item.get("caption") or "")[:160],
                    "chapter_title": item.get("chapter_title"),
                    "image": item["image"],
                }
            )

        # Incremental quality + manifest so a kill does not lose progress
        quality = {
            "done": min(i, total),
            "total": total,
            "ok": ok_n,
            "fail": fail_n,
            "no_board": no_board,
            "ok_rate": round(ok_n / max(ok_n + fail_n, 1), 3),
            "samples": quality_samples,
        }
        _write_quality(quality)
        if j % 5 == 0 or j == len(pending):
            _write_manifest_snapshot(items, quality)

    return {
        "done": total,
        "total": total,
        "ok": ok_n,
        "fail": fail_n,
        "no_board": no_board,
        "ok_rate": round(ok_n / max(ok_n + fail_n, 1), 3),
        "samples": quality_samples,
    }


def _write_manifest_snapshot(items: list[dict], quality: dict | None) -> None:
    epub_name = next(iter(TACTICS.glob(EPUB_GLOB)), Path("Winning Chess.epub")).name
    manifest = {
        "source": epub_name,
        "book": "winning-chess",
        "count": len(items),
        "captioned": sum(1 for i in items if not i.get("orphan")),
        "ocr": quality,
        "items": items,
    }
    (OUT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def _write_quality(payload: dict) -> None:
    path = OUT / "quality.json"
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ocr", action="store_true")
    ap.add_argument("--limit", type=int, default=None, help="OCR only first N items")
    ap.add_argument("--skip-extract", action="store_true", help="Reuse existing images/manifest")
    args = ap.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    epub = find_epub()

    if args.skip_extract and (OUT / "manifest.json").exists():
        manifest = json.loads((OUT / "manifest.json").read_text(encoding="utf-8"))
        items = manifest["items"]
        chapters = json.loads((OUT / "chapters.json").read_text(encoding="utf-8")) if (OUT / "chapters.json").exists() else []
        print(f"Reusing {len(items)} items from manifest", flush=True)
    else:
        items, chapters = extract_all(epub)
        (OUT / "chapters.json").write_text(
            json.dumps(chapters, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        captioned = sum(1 for i in items if not i.get("orphan"))
        print(
            f"Extracted {len(items)} boards ({captioned} captioned, {len(items) - captioned} orphan) · {len(chapters)} chapters",
            flush=True,
        )

    quality = None
    if args.ocr:
        quality = run_ocr(items, args.limit)
        print(
            f"OCR done: ok={quality['ok']} fail={quality['fail']} rate={quality['ok_rate']}",
            flush=True,
        )

    manifest = {
        "source": epub.name,
        "book": "winning-chess",
        "count": len(items),
        "captioned": sum(1 for i in items if not i.get("orphan")),
        "ocr": quality,
        "items": items,
    }
    path = OUT / "manifest.json"
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {path}", flush=True)


if __name__ == "__main__":
    main()
