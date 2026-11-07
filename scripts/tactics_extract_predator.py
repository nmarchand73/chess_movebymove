#!/usr/bin/env python3
"""Render Predator PDF pages and run chess-diagram-ocr with progress + quality.

Writes (gitignored):
  docs/tactics/extract/predator/pages/
  docs/tactics/extract/predator/crops/
  docs/tactics/extract/predator/queue.json
  docs/tactics/extract/predator/quality.json

Usage:
  PYTHONPATH=../chess-diagram-ocr/src \\
    ../Avoidable_mistakes/tools/.venv_ocr/bin/python scripts/tactics_extract_predator.py --pages 1 2 3
  ... --pages-from 1 --pages-to 40
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PKG = ROOT.parent / "chess-diagram-ocr" / "src"
sys.path.insert(0, str(PKG))

from chess_diagram_ocr.pipeline import run_pipeline
from chess_diagram_ocr.render_pdf import render_pdf
from chess_diagram_ocr.validate import validate_fen

TACTICS = ROOT / "docs" / "tactics"
OUT = TACTICS / "extract" / "predator"
PDF_GLOB = "Predator*.pdf"


def find_pdf() -> Path:
    matches = sorted(TACTICS.glob(PDF_GLOB))
    if not matches:
        raise SystemExit(f"No PDF matching {PDF_GLOB} under {TACTICS}")
    return matches[0]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pages", type=int, nargs="*", help="1-based PDF pages")
    ap.add_argument("--pages-from", type=int, default=None)
    ap.add_argument("--pages-to", type=int, default=None)
    ap.add_argument("--dpi", type=int, default=200)
    ap.add_argument("--mode", choices=["crop", "fill"], default="crop")
    ap.add_argument("--side", choices=["w", "b"], default="w")
    args = ap.parse_args()

    pages = list(args.pages or [])
    if args.pages_from is not None and args.pages_to is not None:
        pages = list(range(args.pages_from, args.pages_to + 1))
    if not pages:
        raise SystemExit("Provide --pages or --pages-from/--pages-to")

    pdf = find_pdf()
    pages_dir = OUT / "pages"
    crops_dir = OUT / "crops"
    queue_path = OUT / "queue.json"
    pages_dir.mkdir(parents=True, exist_ok=True)

    print(f"Rendering {len(pages)} pages from {pdf.name} @ {args.dpi}dpi …", flush=True)
    written = render_pdf(pdf, pages_dir, pages, args.dpi)
    print(f"Rendered {len(written)} PNGs", flush=True)

    print("Running OCR pipeline …", flush=True)
    queue = run_pipeline(
        written,
        crops_dir,
        queue_path,
        mode=args.mode,
        side_to_move=args.side,
        title="Predator OCR queue",
    )

    ok = 0
    fail = 0
    samples = []
    for item in queue.items:
        fen_ok, err = validate_fen(item.fen)
        item.extra["fen_ok"] = fen_ok
        if not fen_ok:
            item.extra["fen_error"] = err
            fail += 1
        else:
            ok += 1
        if len(samples) < 12:
            samples.append(
                {
                    "id": item.id,
                    "fen": item.fen,
                    "fen_ok": fen_ok,
                    "page": item.page,
                    "crop_rel": item.crop_rel,
                }
            )

    from chess_diagram_ocr.queue import write_queue

    write_queue(queue, queue_path)
    quality = {
        "pages": len(pages),
        "boards": len(queue.items),
        "ok": ok,
        "fail": fail,
        "ok_rate": round(ok / len(queue.items), 3) if queue.items else 0,
        "samples": samples,
    }
    (OUT / "quality.json").write_text(
        json.dumps(quality, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"Wrote {queue_path} · boards={len(queue.items)} ok={ok} fail={fail} rate={quality['ok_rate']}",
        flush=True,
    )


if __name__ == "__main__":
    main()
