# Move-by-Move Coach

Interactive study app for classic move-by-move chess books.

**Live demo:** https://nmarchand73.github.io/chess_movebymove/

**Books:**
- Irving Chernev — *Logical Chess: Move By Move* (33 games)
- John Nunn — *Understanding Chess Move by Move* (30 games)

Each book pairs PGN moves with EPUB commentary in a synced board reader with guess-the-move and optional Stockfish analysis.

## Prerequisites

- Python 3.11+
- Node.js 20+
- Local EPUB copies (not in repo — add your own):
  - `docs/Logical Chess- Move By Move.epub`
  - `docs/Understanding chess move by move - [a top-class grandmaster -- John Nunn -- 2013.epub`

## Setup

```bash
# Python ingestion
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Chernev: split PGN + ingest EPUB
python scripts/split_chernov_pgn.py
python scripts/ingest_chernov.py

# Nunn: fetch PGNs from Lichess study + ingest EPUB
python scripts/fetch_nunn_pgns.py
python scripts/ingest_nunn.py

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
| `npm run compute-elos` | Batch Lucas Elo for all games |
| `npm run compute-elos -- --book nunn` | Elo for Nunn games only |
| `npm run compute-elos -- --book chernov --game 1` | Single game |

## Data pipeline

### Chernev

1. `docs/logical chess.pgn` → `data/pgn/chernov/{01..33}.pgn`
2. EPUB commentary + PGN moves → `data/lessons/chernov-*.json`

### Nunn

1. [Lichess study](https://lichess.org/study/moJOC4Se/yT9h58Hg) → `data/pgn/nunn/{01..30}.pgn` via `fetch_nunn_pgns.py`
2. EPUB commentary + PGN moves → `data/lessons/nunn-*.json` via `ingest_nunn.py`

### Deploy to web

3. Copy `data/index.json` and `data/lessons/*.json` to `web/public/data/`
4. Optional: `npm run compute-elos` → `web/public/data/performance-elos.json`

`data/index.json` includes a `books` metadata array plus `chernov` and `nunn` lesson lists. Re-running `ingest_chernov.py` or `ingest_nunn.py` merges into the existing index instead of wiping the other book. The web app also accepts legacy indexes that only contain `chernov`.

## Python scripts

| Script | Purpose |
|---|---|
| `scripts/split_chernov_pgn.py` | Split Chernev multi-game PGN into 33 files |
| `scripts/ingest_chernov.py` | Align Chernev EPUB commentary to PGN moves |
| `scripts/fetch_chernov_pgns.py` | Fallback: fetch Chernev PGNs from chessgames.com |
| `scripts/fetch_nunn_pgns.py` | Download Nunn PGNs from Lichess study |
| `scripts/ingest_nunn.py` | Align Nunn EPUB commentary to PGN moves |
| `scripts/lib/ingest_core.py` | Shared PGN ↔ commentary alignment helpers |

## GitHub Pages

Pushes to `main` trigger `.github/workflows/deploy.yml`, which builds the Vite app and publishes to https://nmarchand73.github.io/chess_movebymove/

## Git

Tracked: source code, `data/`, `web/public/data/`, `docs/logical chess.pgn`  
Ignored: `.venv/`, `web/node_modules/`, `web/dist/`, `docs/*.epub`, `docs/nunn.pgn`, `data/ingest_report.json`
