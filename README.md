# Move-by-Move Coach

Study classic chess books the way they were written: **every move explained**, with a live board in sync.

**Live:** https://nmarchand73.github.io/chess_movebymove/

| Book | Author | Games |
|------|--------|-------|
| *Logical Chess: Move By Move* | Irving Chernev | 33 |
| *Understanding Chess Move by Move* | John Nunn | 30 |

**63 annotated games** from Capablanca and Tarrasch through Kasparov and Polgar.

---

## Copyright disclaimer

This is a **personal / educational** study tool. It is **not** affiliated with, endorsed by, or published by Irving Chernev, John Nunn, Batsford, Gambit Publications, or their rights holders.

- **Book PDFs / EPUB / full commercial text are copyrighted.** They are **not** included in this repository and are **not** deployed to GitHub Pages. Keep any legally obtained EPUB sources under local `docs/` (gitignored) for ingest only.
- Lesson JSON, FENs, and board positions in the app are a **study aid** for interactive practice. If you own the books, prefer them as the primary source.
- **Do not redistribute** scanned books, OCR dumps, EPUB files, or other copyrighted book content via this project or forks of it.
- Historical game scores in common PGN form may appear; author commentary should be treated with the same care as the book text.

If you are a rights holder and want content removed or adjusted, open an issue on the repo.

---

## What the app delivers

### Library & progress
- Browse both books by section, with search and opening filters
- Resume where you left off (local progress per game)
- Estimated Elo / progress cues on game lists

### Lesson reader (board + commentary)
- Synced chessboard for every ply, with last-move highlights and knight-path arrows
- Author commentary stepped move-by-move (Chernev / Nunn voice)
- **Listen** — two controls, Stop only (no pause menu):
  - **This move** — speak the current annotation
  - **Follow** — keep narrating as you press Next
  - Chess-aware speech: SAN, checks/mates, NAG marks (`!` `!!` `?` … and Unicode), Informator symbols (`±` `△` `□` …)
  - Voice & speed in Settings (Chrome / Safari defaults; Enhanced voices via system settings on Apple)
- Clickable SAN and alternative lines that jump or preview on the board
- Transport controls: first / prev / next / last (SVG icons for consistent Safari rendering), jump to next annotated note
- Horizontal move strip for quick navigation
- Copy an AI analysis prompt for the current position

### Guess-the-move
- Optional quiz mode: hide the next move and try it before advancing
- On screen: typed guess or board interaction cues
- On a **Chessnut** board: physical guess without LED spoilers — play the move on the board to advance

### Engine & ratings
- Stockfish evaluation bar and best line (optional)
- Live Lucas-style performance Elo as you play through a game
- Optional precomputed full-game Elo batch for the library

### Physical board (Chessnut)
- Connect via Bluetooth or USB (`eboard-connect-js`)
- Sync lesson positions to the e-board
- Guided quiz mode: hide the next move, verify placement, no LED spoilers
- LED ballet in Settings to verify every square

### Experience
- Chernev-inspired visual design (cream / violet / magenta)
- Landing page: product preview carousel + rotating Chernev / Nunn quotations
- Responsive layout: desktop 50/50 board+notes; mobile brand-first landing and scrollable lesson chrome
- Settings footer shows a **semantic version** from GitHub Pages deploys (`major.minor` from `package.json`, patch = Actions run number)

---

## Architecture

Offline **Python ingest** (EPUB ↔ PGN) produces lesson JSON. The **React/Vite** app is a static reader of that JSON.

```
SOURCES (local EPUBs + PGN)
        │
        ▼  Python ingest (align commentary ↔ moves)
data/index.json + data/en/lessons/*.json (+ data/fr/lessons/*.json)
        │
        ▼  cp → web/public/data/
web/ (React 19 + Vite 8 + TypeScript + chess.js + Stockfish)
        │
        ▼  npm run build → GitHub Pages (/chess_movebymove/)
```

### Repository layout

```
move_by_move/
├── data/                 # Generated lessons (committed)
├── docs/                 # Source PGN; EPUBs gitignored
├── scripts/              # Python ingest + PGN fetch/split
├── web/
│   ├── public/data/      # Served lesson JSON + Elo cache
│   ├── public/images/    # Landing assets
│   └── src/
│       ├── pages/        # Landing, library, lesson, settings
│       ├── components/   # Board, commentary, transport, guess, Chessnut
│       ├── hooks/        # Eval, performance, Chessnut connect
│       └── lib/          # Chess, commentary, speech, progress, physical guess
└── .github/workflows/deploy.yml
```

Shared e-board connector (sibling folder): `../eboard-connect-js/`

### Data model

**`data/index.json`** — books, sections, and `LessonSummary` rows.

**`data/en/lessons/{id}.json`** — English commentary: `nodes[]` (`ply`, `san?`, `text`, flags), headers, move counts.

**`data/fr/lessons/{id}.json`** — French commentary (same schema). Loader falls back to `en` when a FR file is missing.

Positions are rebuilt from `nodes` with `chess.js` (no PGN at runtime).

**`web/public/data/performance-elos.json`** — optional precomputed Lucas Elo per game.

### Ingestion

1. Acquire PGN (split Chernev file or fetch Nunn Lichess study).
2. Parse EPUB with book-specific rules (local copyrighted sources only — see disclaimer).
3. Align plies to commentary (`ingest_core.py`).
4. Emit lesson JSON and merge into `index.json`.

---

## Quick start

```bash
cd web && npm install && npm run dev
```

Open http://localhost:5173/chess_movebymove/

### Regenerate lessons (optional)

Lesson JSON is already committed. Re-run only after EPUB/PGN changes.

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python scripts/split_chernov_pgn.py && python scripts/ingest_chernov.py
python scripts/fetch_nunn_pgns.py && python scripts/ingest_nunn.py   # network
cp data/index.json web/public/data/
mkdir -p web/public/data/en/lessons web/public/data/fr/lessons
cp data/en/lessons/*.json web/public/data/en/lessons/
cp data/fr/lessons/*.json web/public/data/fr/lessons/ 2>/dev/null || true
```

Prerequisites: Python 3.11+, Node.js 22+, local EPUBs under `docs/` (see filenames in repo docs / `.gitignore`).

---

## Scripts

| Script / command | Purpose |
|------------------|---------|
| `scripts/split_chernov_pgn.py` | Split Chernev multi-game PGN |
| `scripts/ingest_chernov.py` | Chernev EPUB + PGN → lessons |
| `scripts/fetch_nunn_pgns.py` | Nunn PGNs from Lichess study |
| `scripts/ingest_nunn.py` | Nunn EPUB + PGN → lessons |
| `cd web && npm run dev` | Dev server |
| `cd web && npm run build` | Production build |
| `cd web && npm test` | Unit tests |
| `cd web && npm run compute-elos` | Batch Lucas Elo JSON |

---

## Deploy

Pushes to `main` run GitHub Actions: build `web/` and publish `web/dist/` to GitHub Pages (`base`: `/chess_movebymove/`).

Each deploy injects a semver into Settings: `v{major}.{minor}.{github.run_number}` (major/minor from `web/package.json`).

---

## Git

**Tracked:** source, `data/`, `web/public/data/`, landing images, `docs/logical chess.pgn`  
**Ignored:** `.venv/`, `web/node_modules/`, `web/dist/`, `docs/*.epub`
