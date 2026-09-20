const fs = require("fs");
const pdfText = fs.readFileSync("./st2023-pdf-text.txt", "utf8");
const lines = pdfText.split(/\r?\n/);

// Cari semua baris dengan pola angka Indo seperti "38.066,00" atau "76.480,00"
const pattern = /^([A-Za-z\s]+?)\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})/;
const BANJAR_DESA = ["Argasoka", "Ampelsari", "Tlagawera", "Cendana", "Sokayasa", "Sokanandi", "Parakancanggah", "Semarang", "Krandegan", "Kutabanjarnegara", "Karangtengah", "Wangon", "Semampir"];

function parseIndo(s) {
  if (!s) return 0;
  return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
}

const data = {};
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  // Match baris yang punya 4 angka indo
  const matches = [...line.matchAll(/(\d{1,3}(?:\.\d{3})*,\d{2})/g)];
  if (matches.length < 4) continue;
  // Cek nama desa di awal
  const firstWord = line.split(/\s+/)[0];
  if (!BANJAR_DESA.includes(firstWord)) continue;

  const sawah = parseIndo(matches[0][1]);
  const bs1 = parseIndo(matches[1][1]);
  const bs2 = parseIndo(matches[2][1]);
  const bs3 = parseIndo(matches[3][1]);

  if (!data[firstWord]) {
    data[firstWord] = { sawah, bs1, bs2, bs3 };
  }
}

console.log("=== BPS ST2023 data parsed ===");
console.log(JSON.stringify(data, null, 2));

console.log("\n=== Compare with fallback ===");
const fallback = JSON.parse(fs.readFileSync("./public/data/lahan-fallback.json", "utf8"));
for (const [desa, bps] of Object.entries(data)) {
  const fb = fallback.find(r => r.desa.toUpperCase() === desa.toUpperCase() && r.kecamatan.toUpperCase() === "BANJARNEGARA");
  const sawahHa = bps.sawah / 10000;
  const bsHa = (bps.bs1 + bps.bs2 + bps.bs3) / 10000;
  console.log(`  ${desa.padEnd(18)} | fb: sawah=${(fb?.lahanSawah||0).toString().padStart(7)} bs=${(fb?.lahanBukanSawah||0).toString().padStart(7)} | bps: sawah=${sawahHa.toFixed(2).padStart(6)}Ha bs=${bsHa.toFixed(2).padStart(7)}Ha`);
}