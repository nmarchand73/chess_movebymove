#!/usr/bin/env python3
"""Fetch all 33 Chernev Logical Chess PGNs from chessgames.com."""

from __future__ import annotations

import json
import time
from pathlib import Path

GAMES = [
    {"num": 1, "gid": 1141572, "white": "von Scheve", "black": "Teichmann", "year": 1907},
    {"num": 2, "gid": 1242925, "white": "E Liubarski", "black": "V Soultanbeieff", "year": 1928},
    {"num": 3, "gid": 1242927, "white": "Colle", "black": "J Delvaux", "year": 1929},
    {"num": 4, "gid": 1080052, "white": "Blackburne", "black": "C T Blanshard", "year": 1891},
    {"num": 5, "gid": 1242910, "white": "Ruger", "black": "H Gebhard", "year": 1915},
    {"num": 6, "gid": 1242897, "white": "G Zeissl", "black": "W Walthoffen", "year": 1898},
    {"num": 7, "gid": 1130888, "white": "Spielmann", "black": "R Wahle", "year": 1926},
    {"num": 8, "gid": 1242926, "white": "D Przepiorka", "black": "L Prokes", "year": 1929},
    {"num": 9, "gid": 1151959, "white": "Znosko-Borovsky", "black": "A J Mackenzie", "year": 1924},
    {"num": 10, "gid": 1242891, "white": "Tarrasch", "black": "K Eckart", "year": 1889},
    {"num": 11, "gid": 1242930, "white": "Flohr", "black": "R Pitschak", "year": 1930},
    {"num": 12, "gid": 1293403, "white": "R Pitschak", "black": "Flohr", "year": 1934},
    {"num": 13, "gid": 1242964, "white": "J Dobias", "black": "J Podgorny", "year": 1952},
    {"num": 14, "gid": 1096564, "white": "Tarrasch", "black": "J Mieses", "year": 1916},
    {"num": 15, "gid": 1013233, "white": "Alekhine", "black": "Poindle", "year": 1936},
    {"num": 16, "gid": 1293404, "white": "Tarrasch", "black": "M Kuerschner", "year": 1889},
    {"num": 17, "gid": 1109085, "white": "Pillsbury", "black": "Mason", "year": 1895},
    {"num": 18, "gid": 1293405, "white": "Noteboom", "black": "G van Doesburgh", "year": 1931},
    {"num": 19, "gid": 1293406, "white": "Gruenfeld", "black": "J Schenkein", "year": 1915},
    {"num": 20, "gid": 1119705, "white": "Rubinstein", "black": "Salwe", "year": 1908},
    {"num": 21, "gid": 1293407, "white": "Chernev", "black": "H Hahlbohm", "year": 1942},
    {"num": 22, "gid": 1000091, "white": "Pillsbury", "black": "G Marco", "year": 1900},
    {"num": 23, "gid": 1151917, "white": "L van Vliet", "black": "Znosko-Borovsky", "year": 1907},
    {"num": 24, "gid": 1066823, "white": "Capablanca", "black": "H Mattison", "year": 1929},
    {"num": 25, "gid": 1003047, "white": "Janowski", "black": "Alapin", "year": 1905},
    {"num": 26, "gid": 1262408, "white": "O Bernstein", "black": "J Mieses", "year": 1904},
    {"num": 27, "gid": 1262410, "white": "V Chekhover", "black": "I Rudakovsky", "year": 1945},
    {"num": 28, "gid": 1006563, "white": "Tarrasch", "black": "J Mieses", "year": 1920},
    {"num": 29, "gid": 1094623, "white": "Marshall", "black": "Tarrasch", "year": 1905},
    {"num": 30, "gid": 1293408, "white": "Capablanca", "black": "B H Villegas", "year": 1914},
    {"num": 31, "gid": 1280484, "white": "K Havasi", "black": "Capablanca", "year": 1929},
    {"num": 32, "gid": 1266711, "white": "E Canal", "black": "Capablanca", "year": 1929},
    {"num": 33, "gid": 1006604, "white": "Rubinstein", "black": "Maroczy", "year": 1920},
]

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "pgn" / "chernov"


def main() -> None:
    from playwright.sync_api import sync_playwright

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    index: list[dict] = []
    failed: list[dict] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
        )
        page = context.new_page()
        page.goto("https://www.chessgames.com/perl/chesscollection?cid=1004861", wait_until="networkidle")

        for game in GAMES:
            gid = game["gid"]
            url = f"https://www.chessgames.com/njs/api/game/downloadPGN/{gid}"
            pgn = page.evaluate(
                """async (u) => {
                    const r = await fetch(u);
                    if (!r.ok) throw new Error('HTTP ' + r.status);
                    return await r.text();
                }""",
                url,
            )
            if not pgn or not pgn.strip().startswith("["):
                failed.append({"gid": gid, "num": game["num"], "reason": "invalid pgn"})
                continue

            filename = f"{game['num']:02d}-{gid}.pgn"
            (OUT_DIR / filename).write_text(pgn.strip() + "\n", encoding="utf-8")
            index.append({**game, "filename": filename, "sourceUrl": url})
            print(f"OK  Game {game['num']:2d}  {game['white']} vs {game['black']}  -> {filename}")
            time.sleep(0.8)

        browser.close()

    (OUT_DIR / "index.json").write_text(json.dumps(index, indent=2), encoding="utf-8")
    print(f"\nSaved {len(index)}/{len(GAMES)} PGNs to {OUT_DIR}")
    if failed:
        print("Failed:", failed)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
