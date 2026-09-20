const fs = require("fs");
const a = JSON.parse(fs.readFileSync("./public/data/lahan-fallback.json.bak", "utf8"));
const b = JSON.parse(fs.readFileSync("./public/data/lahan-fallback.json", "utf8"));
console.log("bak length:", a.length);
console.log("json length:", b.length);

const cendanaBak = a.filter(r => r.desa === "CENDANA");
const cendanaNow = b.filter(r => r.desa === "CENDANA");
console.log("CENDANA in bak:", JSON.stringify(cendanaBak, null, 2));
console.log("CENDANA now:  ", JSON.stringify(cendanaNow, null, 2));

const mapJson = new Map(b.map(r => [r.desa + "|" + r.kecamatan + "|" + r.tahun, r]));
const diffs = [];
for (const r of a) {
  const k = r.desa + "|" + r.kecamatan + "|" + r.tahun;
  const cur = mapJson.get(k);
  if (!cur) {
    diffs.push({ type: "MISSING_IN_JSON", record: r });
  } else if (Math.abs(cur.lahanSawah - r.lahanSawah) > 0.001 || Math.abs(cur.lahanBukanSawah - r.lahanBukanSawah) > 0.001) {
    diffs.push({ type: "VALUE_DIFF", bak: r, now: cur });
  }
}
console.log("\nTotal diffs:", diffs.length);
diffs.slice(0, 15).forEach(d => {
  const r = d.bak || d.record;
  console.log("  ", d.type, "bak:", r.desa, r.kecamatan, "sawah=" + r.lahanSawah, "bs=" + r.lahanBukanSawah,
    "now:", d.now ? "sawah=" + d.now.lahanSawah + " bs=" + d.now.lahanBukanSawah : "MISSING");
});
console.log("\nUnique desa|thn in bak not in json:",
  [...new Set(diffs.filter(d => d.type === "MISSING_IN_JSON").map(d => d.record.desa + "|" + d.record.kecamatan + "|" + d.record.tahun))].length);