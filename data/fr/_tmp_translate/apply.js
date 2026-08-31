#!/usr/bin/env node
/**
 * Apply FR translations onto EN lesson JSON.
 * Usage: node apply.js <id> <translations.json>
 * translations.json: { title, section, opening, nodes: string[] }  (nodes[i] = FR text for EN nodes[i])
 * fullText is rebuilt from EN fullText structure by replacing node texts where possible;
 * if translations.fullText is provided, it is used as-is.
 */
const fs = require('fs');
const path = require('path');

const id = process.argv[2];
const trPath = process.argv[3];
if (!id || !trPath) {
  console.error('Usage: node apply.js <id> <translations.json>');
  process.exit(1);
}

const root = path.resolve(__dirname, '../..');
const enPath = path.join(root, 'en/lessons', `${id}.json`);
const frPath = path.join(root, 'fr/lessons', `${id}.json`);
const pubPath = path.join(root, '../web/public/data/fr/lessons', `${id}.json`);

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const tr = JSON.parse(fs.readFileSync(trPath, 'utf8'));

if (!Array.isArray(tr.nodes) || tr.nodes.length !== en.nodes.length) {
  console.error(`Node count mismatch: EN=${en.nodes.length} TR=${tr.nodes && tr.nodes.length}`);
  process.exit(1);
}

const out = { ...en };
out.title = tr.title;
out.section = tr.section;
out.opening = tr.opening;
out.nodes = en.nodes.map((n, i) => {
  const copy = { ...n };
  copy.text = tr.nodes[i];
  return copy;
});

if (typeof tr.fullText === 'string') {
  out.fullText = tr.fullText;
} else {
  // Fallback: keep EN fullText (should not happen for production)
  console.warn('No fullText in translations; keeping EN fullText');
}

// Validate ply/san/isCritical unchanged
for (let i = 0; i < en.nodes.length; i++) {
  const a = en.nodes[i], b = out.nodes[i];
  if (a.ply !== b.ply || a.san !== b.san || a.isCritical !== b.isCritical) {
    console.error(`Metadata drift at index ${i}`);
    process.exit(1);
  }
}

fs.writeFileSync(frPath, JSON.stringify(out, null, 2) + '\n');
fs.mkdirSync(path.dirname(pubPath), { recursive: true });
fs.copyFileSync(frPath, pubPath);

console.log(`Wrote ${frPath}`);
console.log(`Copied ${pubPath}`);
console.log(`nodes=${out.nodes.length} fullText=${out.fullText.length}`);
