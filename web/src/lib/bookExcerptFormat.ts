export type FormattedBookExcerpt = {
  paragraphs: string[];
  notes: string[];
};

/** Light display-time polish for residual OCR noise. */
function polishForDisplay(text: string): string {
  return text
    .replace(/@x([a-h]\d)/gi, "Nx$1")
    .replace(/@([a-h]\d)/g, "N$1")
    .replace(/@bd(\d)/g, "Nbd$1")
    .replace(/&\.?£(\d)/g, "Bf$1")
    .replace(/&\.?([a-h])(\d)/g, "B$1$2")
    .replace(/(\d)\.&\.?([a-h])(\d)/g, "$1.B$2$3")
    .replace(/“x([a-h]\d)/g, "Nx$1")
    .replace(/“xc(\d)/g, "Nxc$1")
    .replace(/“([a-h])(\d)/g, "N$1$2")
    .replace(/£\.c(\d)/g, "Bc$1")
    .replace(/£g(\d)/g, "Bg$1")
    .replace(/\.\.\.\s*£(\d)/g, "...f$1")
    .replace(/(\d)\.£(\d)\b/g, "$1.f$2")
    .replace(/\s£6\b/g, " Nf6")
    .replace(/\s£(\d)\b/g, " f$1")
    .replace(/\b4xe([a-h]\d)/g, "Nxe$1")
    .replace(/\\+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Split a local book excerpt into prose paragraphs and diagram notes. */
export function formatBookExcerpt(excerptFr: string): FormattedBookExcerpt {
  const blocks = polishForDisplay(excerptFr)
    .split(/\n\s*\n/)
    .map((block) => polishForDisplay(block.replace(/\s+/g, " ")))
    .filter(Boolean);

  const paragraphs: string[] = [];
  const notes: string[] = [];

  for (const block of blocks) {
    const noteMatch = block.match(/^\((\d+[a-z]?)\)\s*(.+)$/i);
    if (noteMatch?.[2]) {
      notes.push(noteMatch[2].trim());
      continue;
    }
    paragraphs.push(...splitLongProse(block));
  }

  return { paragraphs, notes };
}

function splitLongProse(text: string): string[] {
  if (text.length < 520) return [text];
  // Mask chess move numbers / castling so "1.e4" and "5...a6" are not sentence breaks.
  const masked = text
    .replace(/(\d)\.\.\.([A-Za-z*])/g, "$1‹ell›$2")
    .replace(/(\d+)\.([a-hRNBQKO])/g, "$1‹dot›$2")
    .replace(/0-0-0/g, "‹ooo›")
    .replace(/0-0/g, "‹oo›");
  const sentences = masked.match(/[^.!?…]+[.!?…]+(?:\s|$)|[^.!?…]+$/g) ?? [masked];
  const restore = (s: string) =>
    s
      .replace(/‹ell›/g, "...")
      .replace(/‹dot›/g, ".")
      .replace(/‹ooo›/g, "0-0-0")
      .replace(/‹oo›/g, "0-0");
  const out: string[] = [];
  let buf = "";
  for (const sentence of sentences) {
    const piece = restore(sentence.trim());
    if (!piece) continue;
    const next = `${buf} ${piece}`.trim();
    if (buf && next.length > 320) {
      out.push(buf.trim());
      buf = piece;
    } else {
      buf = next;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out.length ? out : [text];
}
