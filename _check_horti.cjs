// Sanity check parser hortikultura (replika fetchVegetableArea / fetchFruitProduction /
// fetchAnnualHorticultureProduction hasil rewrite) terhadap CSV asli.
const fs = require("fs");
const Papa = require("papaparse");

const norm = (h) => h.trim().replace(/\s+/g, " ");
const cleanFloat = (v) => {
  const n = parseFloat(String(v ?? "").replace(/,/g, "").trim());
  return isNaN(n) ? 0 : n;
};
const isSummaryRow = (v) => {
  const s = String(v ?? "").toLowerCase();
  return s.includes("jumlah") || s.includes("total") || s.includes("kabupaten");
};

function parseWideYearCsv(path, unit, crops) {
  const text = fs.readFileSync(path, "utf8");
  const res = Papa.parse(text, { header: true, skipEmptyLines: true, transformHeader: norm });
  const out = [];
  for (const row of res.data) {
    let kecRaw = (row["Kecamatan"] || "").toString().replace(/^\d+\.\s*/, "").trim();
    if (kecRaw === "Purwonegoro") kecRaw = "Purwanegara";
    if (kecRaw === "Purworejo Klampok") kecRaw = "Purwareja Klampok";
    if (!kecRaw || isSummaryRow(kecRaw)) continue;
    const tahun = (row["Tahun"] || "").toString().trim();
    if (!/^\d{4}$/.test(tahun)) continue;
    const findVal = (tanaman, yr) => {
      for (const k of Object.keys(row)) {
        const m = k.match(new RegExp(`^([^\\(]+?)\\s*\\(${unit}\\)\\s*(\\d{4})$`));
        if (m && m[1].trim() === tanaman && m[2] === yr) return row[k];
      }
      return row[tanaman] !== undefined ? row[tanaman] : undefined;
    };
    const entry = { kecamatan: kecRaw, tahun };
    for (const t of crops) entry[t] = cleanFloat(findVal(t, tahun));
    out.push(entry);
  }
  return out;
}

// --- Luas sayuran (ha) ---
const luas = parseWideYearCsv(
  "public/14. Distankan KP/Luas Panen Tanaman Sayuran Menurut Kecamatan dan Jenis Tanaman (ha)/Luas Panen Tanaman Sayuran Menurut Kecamatan dan Jenis Tanaman (ha) CSV.csv",
  "ha",
  ["Bawang Merah", "Cabai Besar", "Kentang", "Kubis", "Petsai", "Tomat", "Bawang Putih", "Cabai Rawit"]
);
console.log("LUAS: baris =", luas.length, "| kec =", new Set(luas.map((r) => r.kecamatan)).size, "| tahun =", [...new Set(luas.map((r) => r.tahun))].sort().join(","));
const luasB2017 = luas.find((r) => r.kecamatan === "Banjarmangu" && r.tahun === "2017");
const luasB2024 = luas.find((r) => r.kecamatan === "Banjarmangu" && r.tahun === "2024");
console.log("  Banjarmangu 2017 (tomat harus 5):", JSON.stringify(luasB2017));
console.log("  Banjarmangu 2024 (cabaiRawit harus 5.7):", JSON.stringify(luasB2024));
const luasSum2024 = luas.filter((r) => r.tahun === "2024").reduce((s, r) => s + r["Bawang Merah"], 0);
console.log("  Σ bawangMerah 2024 (semua kec):", luasSum2024.toFixed(1), "ha");

// --- Produksi buah (ton) ---
const buah = parseWideYearCsv(
  "public/14. Distankan KP/Produksi Buah-buahan Menurut Kecamatan dan Jenis Tanaman (ton)/Produksi Buah-buahan Menurut Kecamatan dan Jenis Tanaman (ton) CSV.csv",
  "ton",
  ["Mangga", "Durian", "Jeruk Besar", "Pisang", "Pepaya", "Salak", "Jeruk Siam"]
);
console.log("\nBUAH: baris =", buah.length, "| kec =", new Set(buah.map((r) => r.kecamatan)).size, "| tahun =", [...new Set(buah.map((r) => r.tahun))].sort().join(","));
const buahB2017 = buah.find((r) => r.kecamatan === "Banjarmangu" && r.tahun === "2017");
const buahB2024 = buah.find((r) => r.kecamatan === "Banjarmangu" && r.tahun === "2024");
console.log("  Banjarmangu 2017 (salak 123192.2, mangga 189.2):", JSON.stringify(buahB2017));
console.log("  Banjarmangu 2024 (salak 9230, mangga 174.95):", JSON.stringify(buahB2024));
const salakByYear = {};
buah.forEach((r) => { salakByYear[r.tahun] = (salakByYear[r.tahun] || 0) + r["Salak"]; });
console.log("  Σ salak per tahun:", JSON.stringify(salakByYear));

// --- Tahunan (long format) ---
const tahPath =
  "public/14. Distankan KP/Produksi Buah-buahan dan Sayuran Tahunan Menurut Jenis Tanaman (ton)/Produksi Buah-buahan dan Sayuran Tahunan Menurut Jenis Tanaman (ton) CSV.csv";
const tahRes = Papa.parse(fs.readFileSync(tahPath, "utf8"), {
  header: true,
  skipEmptyLines: true,
  transformHeader: norm,
});
const rows = tahRes.data;
const sample = rows[0] || {};
const jenisKey = Object.keys(sample).find((k) => /^jenis\s*tanaman$/i.test(k.trim()));
const prodKey = Object.keys(sample).find((k) => /^produksi\s*\(ton\)$/i.test(k.trim()));
const tahunKey = Object.keys(sample).find((k) => /^tahun$/i.test(k.trim()));
console.log("\nTAHUNAN: keys =", { jenisKey, prodKey, tahunKey });
const localRows = rows
  .map((r) => ({
    jenisTanaman: (r[jenisKey] || "").toString().trim(),
    produksiTon: cleanFloat(r[prodKey]),
    tahun: (r[tahunKey] || "").toString().trim(),
  }))
  .filter((r) => r.jenisTanaman && !isSummaryRow(r.jenisTanaman) && /^\d{4}$/.test(r.tahun));
console.log("  baris =", localRows.length, "| tahun =", [...new Set(localRows.map((r) => r.tahun))].sort().join(","));
const petai2024 = localRows.find((r) => r.tahun === "2024" && /petai/i.test(r.jenisTanaman));
const salakT2024 = localRows.find((r) => r.tahun === "2024" && /salak/i.test(r.jenisTanaman));
console.log("  Petai 2024 (344558.91):", JSON.stringify(petai2024));
console.log("  Salak 2024 (199677.28):", JSON.stringify(salakT2024));
console.log("  dash '-' = 0 check (Jeruk Tangerine 2024):", JSON.stringify(localRows.find((r) => r.tahun === "2024" && /tangerine/i.test(r.jenisTanaman))));
