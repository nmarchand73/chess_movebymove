# Move-by-Move Coach

Study classic chess books the way they were written: **every move explained**, with a live board in sync.

**Live:** https://nmarchand73.github.io/chess_movebymove/

| Book | Author | Games |
|------|--------|-------|
| *Logical Chess: Move By Move* | Irving Chernev | 33 |
| *Understanding Chess Move by Move* | John Nunn | 30 |

**63 annotated games** from Capablanca and Tarrasch through Kasparov and Polgar.

---

## What the app delivers

### Library & progress
- Browse both books by section, with search and opening filters
- Resume where you left off (local progress per game)
- Estimated Elo / progress cues on game lists

### Lesson reader (board + commentary)
- Synced chessboard for every ply, with last-move highlights and knight-path arrows
- Author commentary stepped move-by-move (Chernev / Nunn voice)
- **Listen** icon reads the current annotation aloud (voice & speed in Settings)
  - Chess-aware speech: SAN, checks/mates, NAG marks (`!` `!!` `?` … and Unicode), Informator symbols (`±` `△` `□` …)
  - Sentence pauses; move-header eval glyphs skipped so they don’t glue into the prose
  - Deduped takeaway so the highlighted line isn’t repeated in the body
- Clickable SAN and alternative lines that jump or preview on the board
- Transport controls: first / prev / next / last, jump to next annotated note
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

### Experience
- Chernev-inspired visual design (cream / violet / magenta)
- Landing page with product preview carousel (cover, board, commentary) and Listen called out in the lead
- Responsive layout: desktop 50/50 board+notes; mobile sticky board and single-viewport landing

---

## Architecture

Offline **Python ingest** (EPUB ↔ PGN) produces lesson JSON. The **React/Vite** app is a static reader of that JSON.

```
SOURCES (local EPUBs + PGN)
        │
        ▼  Python ingest (align commentary ↔ moves)
data/index.json + data/lessons/*.json
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
│       └── lib/          # Chess, commentary, progress, physical guess
└── .github/workflows/deploy.yml
```

Shared e-board connector (sibling folder): `../eboard-connect-js/`

### Data model

**`data/index.json`** — books, sections, and `LessonSummary` rows.

**`data/lessons/{id}.json`** — full game: `nodes[]` (`ply`, `san?`, `text`, flags), headers, move counts.

Positions are rebuilt from `nodes` with `chess.js` (no PGN at runtime).

**`web/public/data/performance-elos.json`** — optional precomputed Lucas Elo per game.

### Ingestion

1. Acquire PGN (split Chernev file or fetch Nunn Lichess study).
2. Parse EPUB with book-specific rules.
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
cp data/lessons/*.json web/public/data/lessons/
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

---

## Git

**Tracked:** source, `data/`, `web/public/data/`, landing images, `docs/logical chess.pgn`  
**Ignored:** `.venv/`, `web/node_modules/`, `web/dist/`, `docs/*.epub`
