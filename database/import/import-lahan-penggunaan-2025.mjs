// ============================================================================
// import-lahan-penggunaan-2025.mjs
//
// Impor seri "Luas Penggunaan Lahan menurut Jenis Penggunaan (Ha)" tahun
// tertentu (default 2025) dari CKAN opendata.banjarnegarakab.go.id ke tabel
// `lahan_penggunaan` (kolom sumber='ckan').
//
// Dataset: "Luas Penggunaan Lahan Menurut Jenis Penggunaan (Ha) 2025"
//   package id 1497085a-352e-4210-be1d-d9ffadc817a9
//   resource   c79b7e5e-dca9-49ff-a075-1a674c297d93 (CSV, datastore aktif)
//
// Label kategori dinormalisasi (buang penomoran "I./a." & penanda footnote
// BPS "…lainnya1/…pertanian2") lalu dipetakan ke label tidy yang dipakai
// tabel — konsisten dengan impor CSV lama (2014-2024, sumber='csv').
//
// Pemakaian:
//   node --env-file=../../backend/.env import-lahan-penggunaan-2025.mjs
//        → impor langsung ke DB lokal (butuh env DB_HOST/DB_USER/DB_PASS/DB_NAME)
//   node import-lahan-penggunaan-2025.mjs --sql
//        → hanya cetak SQL idempoten (untuk dijalankan di server prod)
//   node import-lahan-penggunaan-2025.mjs --tahun=2026
//        → tahun lain (default 2025)
//
// Idempoten: sebelum INSERT, baris (tahun, sumber='ckan') di-DELETE —
// baris sumber 'csv'/'manual' tidak tersentuh.
// ============================================================================
const RESOURCE_ID = "c79b7e5e-dca9-49ff-a075-1a674c297d93";
const CKAN_URL = `https://opendata.banjarnegarakab.go.id/api/3/action/datastore_search?resource_id=${RESOURCE_ID}&limit=100`;

const args = process.argv.slice(2);
const modeSql = args.includes("--sql");
const tahunArg = Number((args.find((a) => a.startsWith("--tahun=")) || "--tahun=2025").split("=")[1]);

// Kategori kanonik (hasil normalisasi) → label tidy di tabel lahan_penggunaan
const CANON_KE_TIDY = {
  sawah: "I. Lahan sawah",
  "sawah-irigasi": "a. Lahan irigasi",
  "sawah-tadah-hujan": "b. Lahan tadah hujan",
  "sawah-pasang-surut": "c. Lahan pasang surut",
  "bukan-sawah": "II. Bukan lahan sawah",
  "tegal-kebun": "a. Tegal/kebun",
  perkebunan: "b. Perkebunan",
  "hutan-rakyat": "c. Hutan rakyat",
  lainnya: "d. lainnya",
  "tidak-diusahakan": "e. Lahan yang tidak diusahakan",
  "bukan-pertanian": "III. Lahan bukan pertanian lainnya",
};

const KATEGORI_META = {
  "lahan sawah": "sawah",
  "lahan irigasi": "sawah-irigasi",
  "lahan tadah hujan": "sawah-tadah-hujan",
  "lahan pasang surut": "sawah-pasang-surut",
  "bukan lahan sawah": "bukan-sawah",
  "tegal/kebun": "tegal-kebun",
  perkebunan: "perkebunan",
  "hutan rakyat": "hutan-rakyat",
  lainnya: "lainnya",
  "lahan yang tidak diusahakan": "tidak-diusahakan",
  "lahan bukan pertanian": "bukan-pertanian",
};
const KATEGORI_ALT = { "lahan bukan pertanian lainnya": "lahan bukan pertanian" };

const normalizeKategori = (raw) => {
  const kunci = String(raw ?? "")
    .replace(/\d+$/, "")
    .replace(/^(?:[IVX]+|[a-e])\.\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return KATEGORI_META[KATEGORI_ALT[kunci] ?? kunci] ?? null;
};

const cleanFloat = (raw) => {
  const s = String(raw ?? "").replace(/["']/g, "").replace(/,/g, "").trim();
  if (!s || s === "-") return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
};

async function ambilDariCkan() {
  const res = await fetch(CKAN_URL, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`CKAN HTTP ${res.status}`);
  const body = await res.json();
  const records = body?.result?.records;
  if (!body?.success || !Array.isArray(records) || records.length === 0) {
    throw new Error("datastore kosong / respons tidak sah");
  }
  const baris = [];
  records.forEach((rec) => {
    const canon = normalizeKategori(rec["Jenis Penggunaan"]);
    if (!canon) return;
    const sel = rec[String(tahunArg)];
    const luas = cleanFloat(sel);
    if (luas === null) return; // tahun tidak ada di dataset
    baris.push({ kategori: CANON_KE_TIDY[canon], tahun: tahunArg, luas_ha: luas });
  });
  if (baris.length < 11) {
    throw new Error(`hanya ${baris.length}/11 kategori memiliki nilai tahun ${tahunArg} di CKAN`);
  }
  return baris;
}

function sqlEscape(v) {
  return typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
}

function buatSql(baris) {
  const del = `DELETE FROM lahan_penggunaan WHERE tahun = ${tahunArg} AND sumber = 'ckan';`;
  const values = baris.map((b) => `(${sqlEscape(b.kategori)}, ${b.tahun}, ${b.luas_ha.toFixed(2)}, 'ckan')`).join(",\n  ");
  const ins = `INSERT INTO lahan_penggunaan (kategori, tahun, luas_ha, sumber) VALUES\n  ${values};`;
  return `${del}\n${ins}\n`;
}

async function main() {
  console.log(`Ambil tahun ${tahunArg} dari CKAN opendata...`);
  const baris = await ambilDariCkan();
  console.log(`  OK: ${baris.length} kategori, Σ = ${baris.reduce((a, b) => a + b.luas_ha, 0).toFixed(2)} Ha`);

  if (modeSql) {
    console.log("\n-- SQL (jalankan di MySQL target) --");
    console.log(buatSql(baris));
    return;
  }

  const mysql = await import("mysql2/promise");
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
    database: process.env.DB_NAME || "sispertani",
    multipleStatements: true,
  });
  try {
    const sebelum = await pool.query("SELECT COUNT(*) AS n FROM lahan_penggunaan WHERE tahun = ?", [tahunArg]);
    console.log(`  baris tahun ${tahunArg} sebelum impor: ${sebelum[0][0].n}`);
    await pool.query(buatSql(baris));
    const sesudah = await pool.query(
      "SELECT kategori, luas_ha, sumber FROM lahan_penggunaan WHERE tahun = ? ORDER BY id",
      [tahunArg],
    );
    console.log(`  baris tahun ${tahunArg} sesudah impor: ${sesudah[0].length}`);
    sesudah[0].forEach((r) => console.log(`    [${r.sumber}] ${r.kategori} = ${Number(r.luas_ha).toFixed(2)} Ha`));
    const sum = await pool.query(
      "SELECT SUM(luas_ha) AS s FROM lahan_penggunaan WHERE tahun = ? AND kategori IN ('I. Lahan sawah','II. Bukan lahan sawah','III. Lahan bukan pertanian lainnya')",
      [tahunArg],
    );
    console.log(`  Σ 3 kategori utama = ${Number(sum[0][0].s).toFixed(2)} Ha (harus ≈ 106.973)`);
    console.log("IMPORT OK");
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("GAGAL:", e.message);
  process.exit(1);
});
