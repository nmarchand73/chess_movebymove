# Extraction quality notes

## Winning Chess
- Diagrams OCR: 614 detected · 561 fen_ok (~91.4%)
- Chapters: 62 · ~208k chars of text
- Visual QA wc-00041 (8A PIN): OCR **missed White Bishop on g2**
  - OCR: `…/P3R2P/R4NK1` (empty g2)
  - Vision: `…/P3R1BP/R4NK1` (Bg2)
- Visual QA earlier: wc-00024/00021 OK; wc-00009 missing pieces

## Predator
- Full PDF 539 pages · boards **1142** · fen_ok **1065** (~93.3%) · pages with boards 509 (p007–p538)
- Batch fen_ok: 1–360 ≈97–100%; **441–539 drops to ~75%** (more schematic/end-matter diagrams)
- See queue_merged.json
- Visual QA p022: perfect match
- Visual QA p204-b1: perfect match `6k1/2p2r2/1n4p1/6Pp/3Q4/3RNq1P/1P3P2/6K1 w`
- Failures concentrated on early schematic / illustrative boards (fen_ok false)

## Curriculum rebuild
- `node scripts/build_tactics_from_extract.mjs`
- Practice drills require caption→legal SAN resolve (OCR often strips piece letters)
