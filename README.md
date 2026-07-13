# Move-by-Move Coach

Interactive study app for classic move-by-move chess books — synced board, author commentary, guess-the-move, and optional Stockfish analysis.

**Live:** https://nmarchand73.github.io/chess_movebymove/

| Book | Author | Games |
|------|--------|-------|
| *Logical Chess: Move By Move* | Irving Chernev | 33 |
| *Understanding Chess Move by Move* | John Nunn | 30 |

---

## Architecture

The project splits cleanly into an **offline ingestion pipeline** (Python) and a **static web reader** (React/Vite). Lesson JSON is the contract between them.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SOURCES (local, not in repo)                                           │
│  docs/*.epub          Book commentary                                   │
│  docs/logical chess.pgn   Chernev multi-game PGN                        │
│  Lichess study moJOC4Se   Nunn PGNs (fetched by script)                 │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                    Python ingest scripts
                    (align EPUB text ↔ PGN moves)
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  data/                                                                  │
│  ├── index.json              Library catalog + per-book lesson lists    │
│  ├── lessons/{book}-{nnn}.json   One file per game (nodes + metadata)   │
│  └── pgn/{book}/{nn}.pgn     Canonical move sequences                   │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │  cp → web/public/data/
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  web/  (React 19 + Vite 8 + TypeScript)                                 │
│  ├── public/data/            Static assets served at deploy             │
│  └── src/                    UI, chess logic, Stockfish worker           │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │  npm run build → web/dist/
                                ▼
                    GitHub Pages  (/chess_movebymove/)
```

### Repository layout

```
move_by_move/
├── data/                    # Generated lessons (committed; source of truth)
│   ├── index.json
│   ├── lessons/
│   └── pgn/
├── docs/                    # Source PGN + local EPUBs (EPUBs gitignored)
├── scripts/
│   ├── lib/ingest_core.py   # Shared EPUB↔PGN alignment
│   ├── split_chernov_pgn.py
│   ├── ingest_chernov.py
│   ├── fetch_nunn_pgns.py
│   └── ingest_nunn.py
├── web/
│   ├── public/data/         # Copy of data/ for dev + deploy
│   ├── scripts/             # Node batch jobs (Elo computation)
│   └── src/
│       ├── pages/           # Home (library + game list), Lesson (reader)
│       ├── components/      # Board, commentary, transport, guess-move
│       ├── hooks/           # Stockfish eval, performance rating
│       └── lib/             # Chess, commentary parsing, progress, index
└── .github/workflows/deploy.yml
```

### Data model

**`data/index.json`** — library manifest consumed at startup:

- `books[]` — metadata per title (`id`, `title`, `author`, `sections[]`)
- `chernov[]`, `nunn[]` — lightweight `LessonSummary` rows pointing at lesson files

**`data/lessons/{id}.json`** — full game payload:

| Field | Purpose |
|-------|---------|
| `nodes[]` | Commentary aligned to ply: `{ ply, san?, text, isCritical? }` |
| `fullText` | Raw concatenated commentary (search / fallback) |
| `players`, `opening`, `eco`, `result` | Game header |
| `moveCount`, `annotatedMoves` | Navigation bounds |

The web app never reads PGN at runtime; positions are rebuilt from `nodes` via `chess.js`.

**`web/public/data/performance-elos.json`** — optional precomputed Lucas Elo per game (batch script).

### Ingestion pipeline

Each book follows the same pattern:

1. **Acquire PGN** — split local file (Chernev) or fetch Lichess study (Nunn).
2. **Parse EPUB** — book-specific HTML/structure rules in `ingest_*.py`.
3. **Align moves** — `ingest_core.py` walks PGN plies and matches inline move tokens in commentary text (fuzzy SAN matching, OCR fixes).
4. **Emit JSON** — one lesson file per game; merge into `data/index.json` without overwriting the other book.

Re-running `ingest_chernov.py` or `ingest_nunn.py` **merges** into the existing index. Legacy indexes with only `chernov` are normalized at load time (`normalizeIndex.ts`).

### Web app

**Routing** is state-based in `App.tsx`: library → book game list → lesson reader. No client-side router.

| Layer | Key modules |
|-------|-------------|
| **Pages** | `Home.tsx` (library cards, search, progress), `Lesson.tsx` (reader shell) |
| **Board** | `BoardPanel`, `react-chessboard`, `chess.ts` (FEN from ply) |
| **Commentary** | `commentary.ts` (SAN links, alternatives), `commentaryBeats.ts` (step-through paragraphs) |
| **Study aids** | `GuessMove.tsx`, `progress.ts` (localStorage resume), `openingTooltips.ts` |
| **Engine** | `stockfishEngine.ts` + `usePositionEval` (WASM worker, ply > 0) |
| **Ratings** | `performanceRating.ts` (live Lucas Elo), `computeGameElos.ts` (batch) |

**Lesson reader flow:** load lesson JSON → set ply → rebuild position → show commentary beat → optional guess-the-move → Stockfish eval + performance sparklines when past move 0.

### Deploy

Pushes to `main` run `.github/workflows/deploy.yml`: `npm ci && npm run build` in `web/`, upload `web/dist/` to GitHub Pages. Vite `base` is `/chess_movebymove/`.

---

## Quick start

### Prerequisites

- Python 3.11+
- Node.js 20+
- Local EPUB copies (not in repo):
  - `docs/Logical Chess- Move By Move.epub`
  - `docs/Understanding chess move by move - [a top-class grandmaster -- John Nunn -- 2013.epub`

### Regenerate lessons (optional)

Lesson JSON is already committed. Only re-run ingest after EPUB/PGN changes.

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Chernev
python scripts/split_chernov_pgn.py
python scripts/ingest_chernov.py

# Nunn
python scripts/fetch_nunn_pgns.py   # needs network; Playwright
python scripts/ingest_nunn.py

# Sync into web app
cp data/index.json web/public/data/
cp data/lessons/*.json web/public/data/lessons/
```

### Run locally

```bash
cd web && npm install && npm run dev
```

Open http://localhost:5173

---

## Scripts

### Python

| Script | Purpose |
|--------|---------|
| `scripts/split_chernov_pgn.py` | Split `docs/logical chess.pgn` → `data/pgn/chernov/{01..33}.pgn` |
| `scripts/ingest_chernov.py` | Chernev EPUB + PGN → `data/lessons/chernov-*.json` |
| `scripts/fetch_chernov_pgns.py` | Fallback: fetch Chernev PGNs from chessgames.com |
| `scripts/fetch_nunn_pgns.py` | Download Nunn PGNs from [Lichess study](https://lichess.org/study/moJOC4Se) |
| `scripts/ingest_nunn.py` | Nunn EPUB + PGN → `data/lessons/nunn-*.json` |
| `scripts/lib/ingest_core.py` | Shared PGN ↔ commentary alignment helpers |

### npm (`web/`)

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Production build (`tsc` + Vite) |
| `npm test` | Unit tests (commentary, navigation, index, Elo, etc.) |
| `npm run compute-elos` | Batch Lucas Elo → `web/public/data/performance-elos.json` |
| `npm run compute-elos -- --book nunn` | Single book |
| `npm run compute-elos -- --book chernov --game 1` | Single game |

---

## Adding another book

1. Add a `BookId` in `web/src/types.ts` and book metadata in `data/index.json`.
2. Write `scripts/ingest_<book>.py` (reuse `ingest_core.py`; EPUB structure is book-specific).
3. Add PGN source script if needed.
4. Extend `bookDetails.ts`, `bookMeta.ts`, and `normalizeIndex.ts`.
5. Copy JSON to `web/public/data/`, run tests, deploy.

---

## Git

**Tracked:** source, `data/`, `web/public/data/`, `docs/logical chess.pgn`

**Ignored:** `.venv/`, `web/node_modules/`, `web/dist/`, `docs/*.epub`, `docs/nunn.pgn`, `data/ingest_report.json`
