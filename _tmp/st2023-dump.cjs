// Dump semua halaman PDF ke teks (satu baris per item teks, dengan posisi Y untuk parsing tabel)
// Usage: node _tmp/st2023-dump.cjs <pdf> <out.txt>
const fs = require('fs');

async function main() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const file = process.argv[2];
  const out = process.argv[3];
  const data = new Uint8Array(fs.readFileSync(file));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const lines = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    lines.push(`===== PAGE ${i} =====`);
    // group items by rounded Y lalu join — mempertahankan struktur baris tabel
    const rows = new Map();
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue;
      const y = Math.round(it.transform[5] / 3) * 3;
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y).push({ x: it.transform[4], s: it.str });
    }
    for (const y of [...rows.keys()].sort((a, b) => b - a)) {
      const cells = rows.get(y).sort((a, b) => a.x - b.x).map((c) => c.s.trim());
      lines.push(cells.join(' | '));
    }
  }
  fs.writeFileSync(out, lines.join('\n'), 'utf8');
  console.log(`pages=${doc.numPages} -> ${out}`);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
