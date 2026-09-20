const fs = require("fs");
const data = JSON.parse(fs.readFileSync("./public/data/lahan-fallback.json", "utf8"));
// Cross-check against CKAN sample (dari raw CSV Banjarnegara) — sample yang diketahui:
const ckanSample = {
  "KUTABANJARNEGARA": { sawah: 3.5, bs: 45.8 },
  "KRANDEGAN": { sawah: 61, bs: 80.8 },
  "PARAKANCANGGAH": { sawah: 68, bs: 580.2 },
  "SEMARANG": { sawah: 60.7, bs: 517.55 },
  "CENDANA": { sawah: 15, bs: 170 },
  "SOKANANDI": { sawah: 98.285, bs: 117.45 },
  "SEMAMPIR": { sawah: 72.082, bs: 32.412 },
  "AMPELSARI": { sawah: 60, bs: 181 },
};
console.log("=== Cross-verify Banjarnegara ===");
for (const [desa, ck] of Object.entries(ckanSample)) {
  const row = data.find(r => r.desa === desa);
  if (!row) {
    console.log(`  ${desa.padEnd(20)} NOT IN DATA`);
    continue;
  }
  const ds = row.lahanSawah, db = row.lahanBukanSawah;
  const diffS = Math.abs(ds - ck.sawah).toFixed(3);
  const diffB = Math.abs(db - ck.bs).toFixed(3);
  const ok = diffS === "0.000" && diffB === "0.000" ? "✓" : (parseFloat(diffS) < 1 && parseFloat(diffB) < 1 ? "~" : "✗");
  console.log(`  ${ok} ${desa.padEnd(20)} sawah data=${ds.toString().padEnd(10)} CK=${ck.sawah.toString().padEnd(10)} | bs data=${db.toString().padEnd(10)} CK=${ck.bs.toString().padEnd(10)}`);
}