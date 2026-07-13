# Move-by-Move Coach

Interactive study app for Irving Chernev's *Logical Chess: Move By Move*.

**Live demo:** https://nmarchand73.github.io/chess_movebymove/

- **Moves** from `docs/logical chess.pgn` (all 33 games)
- **Commentary** from `docs/Logical Chess- Move By Move.epub`
- **Web reader** with synced board, Chernev commentary, guess-the-move, and Stockfish analysis

## Prerequisites

- Python 3.11+
- Node.js 20+
- Local copies of:
  - `docs/logical chess.pgn` (included in repo)
  - `docs/Logical Chess- Move By Move.epub` (not in repo — add your own copy)

## Setup

```bash
# Python ingestion
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Split PGN + ingest EPUB → lesson JSON
python scripts/split_chernov_pgn.py
python scripts/ingest_chernov.py

# Copy lesson data into the web app
cp data/index.json web/public/data/
cp data/lessons/*.json web/public/data/lessons/

# Web app
cd web && npm install && npm run dev
```

Open http://localhost:5173

## Web scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm test` | Unit tests |
| `npm run compute-elos` | Batch Lucas Elo for all games (~15 min) |

## Data pipeline

1. `docs/logical chess.pgn` → `data/pgn/chernov/{01..33}.pgn`
2. EPUB commentary + PGN moves → `data/lessons/chernov-*.json`
3. Copy to `web/public/data/` for the app
4. Optional: `npm run compute-elos` → `web/public/data/performance-elos.json`

## Python scripts

| Script | Purpose |
|---|---|
| `scripts/split_chernov_pgn.py` | Split multi-game PGN into 33 files |
| `scripts/ingest_chernov.py` | Align EPUB commentary to PGN moves |
| `scripts/fetch_chernov_pgns.py` | Fallback: fetch PGNs from chessgames.com |

## Git

```bash
git init
git add .
git status   # verify no node_modules, .venv, dist, or epub
```

Tracked: source code, `data/`, `web/public/data/`, `docs/logical chess.pgn`  
Ignored: `.venv/`, `web/node_modules/`, `web/dist/`, `docs/*.epub`, `data/ingest_report.json`
