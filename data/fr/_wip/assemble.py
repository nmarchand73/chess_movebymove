#!/usr/bin/env python3
"""Assemble FR lesson from EN + node overlays; derive fullText by substitution."""
from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BASE = Path("/Users/nicolasmarchand/Documents/Dev/Projects/chess/move_by_move")
sys.path.insert(0, str(ROOT))
from write_fr import write_lesson  # noqa: E402


def load_nodes_module(lesson_id: str):
    path = ROOT / f"{lesson_id}_nodes.py"
    spec = importlib.util.spec_from_file_location(f"{lesson_id}_nodes", path)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


def build_node_texts(en: dict, overlays: dict) -> list[str]:
    texts: list[str] = []
    for i, node in enumerate(en["nodes"]):
        if i in overlays:
            texts.append(overlays[i])
        else:
            # preserve empty; fail if EN had text we forgot
            src = node.get("text", "")
            if src:
                raise KeyError(f"missing FR overlay for node index {i} ply={node.get('ply')} san={node.get('san')}")
            texts.append("")
    return texts


def _strip_to_play(text: str) -> str:
    for prompt in (
        "White to play\n\n",
        "Black to play\n\n",
        "Trait aux Blancs\n\n",
        "Trait aux Noirs\n\n",
    ):
        text = text.replace(prompt, "")
    # also standalone lines
    for prompt in ("White to play", "Black to play", "Trait aux Blancs", "Trait aux Noirs"):
        if text == prompt:
            return ""
        text = text.replace(f"\n\n{prompt}\n\n", "\n\n")
        text = text.replace(f"\n\n{prompt}", "")
        text = text.replace(f"{prompt}\n\n", "")
    return text


def derive_full_text(en_full: str, en_nodes: list, fr_nodes: list) -> str:
    """Replace EN node texts in fullText with FR, longest first to avoid partial overlaps.

    Node texts often include 'White/Black to play' UI prompts absent from fullText.
    """
    by_en: dict[str, str] = {}
    for en_n, fr_n in zip(en_nodes, fr_nodes):
        en_t = en_n.get("text", "")
        fr_t = fr_n if isinstance(fr_n, str) else fr_n.get("text", "")
        if not en_t or not fr_t:
            continue
        en_body = _strip_to_play(en_t)
        fr_body = _strip_to_play(fr_t)
        if en_body and fr_body:
            by_en[en_body] = fr_body
        # also try full strings if they appear
        by_en[en_t] = fr_t
    result = en_full
    missing = 0
    for en_t, fr_t in sorted(by_en.items(), key=lambda x: len(x[0]), reverse=True):
        if en_t and en_t in result:
            result = result.replace(en_t, fr_t)
        elif en_t and len(en_t) > 40:
            missing += 1
    if missing:
        print(f"WARN: {missing} EN snippets not found in fullText (may be UI-only prompts)")
    return result

META = {
    "nunn-023": {
        "title": "Partie 23 : M. Stean vs G. Sax",
        "section": "Jeu positionnel",
        "opening": "Défense sicilienne, variante Sveshnikov",
    },
    "nunn-024": {
        "title": "Partie 24 : P. San Segundo vs V. Topalov",
        "section": "Jeu positionnel",
        "opening": "Défense est-indienne, variante classique",
    },
    "nunn-022": {
        "title": "Partie 22 : M. Gurevich vs N. Miezis",
        "section": "Jeu positionnel",
        "opening": "Gambit Budapest",
    },
}


def assemble(lesson_id: str) -> None:
    en = json.loads((BASE / f"data/en/lessons/{lesson_id}.json").read_text())
    mod = load_nodes_module(lesson_id)
    overlays = mod.NODES
    # also allow FULL_TEXT override
    node_texts = build_node_texts(en, overlays)
    if hasattr(mod, "FULL_TEXT") and mod.FULL_TEXT:
        full_text = mod.FULL_TEXT
    else:
        full_text = derive_full_text(en["fullText"], en["nodes"], node_texts)
        # leftover headers / prompts that live only in fullText
        replacements = [
            ("Sicilian Defence, Sveshnikov Variation", "Défense sicilienne, variante Sveshnikov"),
            ("King’s Indian Defence, Classical Variation", "Défense est-indienne, variante classique"),
            ("King's Indian Defence, Classical Variation", "Défense est-indienne, variante classique"),
            ("Budapest Gambit", "Gambit Budapest"),
            ("White to play", "Trait aux Blancs"),
            ("Black to play", "Trait aux Noirs"),
            ("Game 13", "Partie 13"),
            ("Game 12", "Partie 12"),
            ("Game 9", "Partie 9"),
            ("Game 20", "Partie 20"),
            ("Game 18", "Partie 18"),
            ("Game 23", "Partie 23"),
            ("The lessons here are:", "Les leçons ici sont :"),
            ("text-move", "coup du texte"),
            ("text move", "coup du texte"),
        ]
        for a, b in replacements:
            full_text = full_text.replace(a, b)

    # sanity: leftover common English phrases
    leftovers = []
    for phrase in ("White to play", "Black to play", "the two bishops", "kingside", "queenside", "The lessons here"):
        if phrase in full_text:
            leftovers.append(phrase)
    if leftovers:
        print(f"NOTE {lesson_id}: possible EN leftovers in fullText: {leftovers}")
    write_lesson(lesson_id, META[lesson_id], node_texts, full_text)


if __name__ == "__main__":
    for lid in sys.argv[1:] or ["nunn-023"]:
        assemble(lid)
