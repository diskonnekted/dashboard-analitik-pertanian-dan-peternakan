/**
 * lib/domains.js — konfigurasi domain data untuk dasbor admin
 * (template/export/import Excel) + loader kolom dinamis dari information_schema.
 *
 * Prinsip:
 *  - Kolom Excel dibaca dinamis dari DB (selalu sinkron dengan skema).
 *  - Kolom teknis di-skip: id, kecamatan_id (diganti kolom "Kecamatan"),
 *    desa_norm (auto-generate), created_at/updated_at, sumber (auto 'manual').
 *  - Tipe json/longtext di-skip (data kompleks — mis. st2023_desa.ternak).
 *  - key = natural key upsert; baris dengan kombinasi kunci sama → UPDATE.
 *  - Normalisasi nama kecamatan/desa = cermin database/import/lib.mjs (normKey,
 *    alias Purwareja Klampok/Purwanegara/Wanadadi; desa_norm = UPPERCASE).
 *
 * Tabel infrastruktur yang TIDAK dikelola via dasbor (by design):
 *   kecamatan, desa, dataset_sumber, sync_log (referensi/metadata),
 *   kth_detail (FK kompleks — TODO), lahan_desa (kolom json/longtext).
 */
import { q } from "../db.js";

// Kolom teknis yang tidak pernah muncul di Excel
const SKIP_COLS = new Set(["id", "kecamatan_id", "desa_norm", "created_at", "updated_at", "sumber"]);
// Tipe data yang tidak diedit via Excel
const SKIP_TYPES = new Set(["json", "longtext"]);

// Label ramah admin untuk kolom yang sering muncul (sisanya derivasi otomatis)
const LABELS = {
  kecamatan: "Kecamatan", desa: "Desa", tahun: "Tahun", jenis: "Jenis",
  komoditas: "Komoditas", kelompok: "Kelompok", tanaman: "Tanaman", kategori: "Kategori",
  wilayah: "Wilayah", arah: "Arah (Masuk/Keluar)", lokasi: "Lokasi (RPH)",
  obyek: "Obyek", tempat: "Tempat", jenis_alat: "Jenis Alat", jenis_budidaya: "Jenis Budidaya",
  nama: "Nama Program", sumber_dana: "Sumber Dana (APBD/APBN)", nilai_rupiah: "Nilai (Rupiah)",
  sektor: "Sektor", penerima_jumlah: "Jumlah Penerima", penerima_jenis: "Jenis Penerima",
  dampak_level: "Tingkat Dampak", dampak_catatan: "Catatan Dampak",
  apbd_miliar: "APBD (Miliar Rp)", apbn_miliar: "APBN (Miliar Rp)",
  bantuan_miliar: "Bantuan (Miliar Rp)", kenaikan_produksi_pct: "Kenaikan Produksi (%)",
  produksi_ton: "Produksi (Ton)", produksi_kg: "Produksi (Kg)", nilai_ribu_rp: "Nilai (Ribu Rp)",
  luas_ha: "Luas (Ha)", luas_panen_ha: "Luas Panen (Ha)", rata_ku_ha: "Rata-rata (Ku/Ha)",
  jumlah: "Jumlah Unit", jumlah_ekor: "Jumlah (Ekor)", luas_m2: "Luas (M²)",
  luas_tambahan: "Luas Tambahan (Ha)", volume_kg: "Volume (Kg)",
  lumbung_unit: "Lumbung (Unit)", lumbung_kapasitas_ton: "Kapasitas Lumbung (Ton)",
  gudang_luas_m2: "Luas Gudang (M²)", gudang_kapasitas_ton_bulan: "Kapasitas Gudang (Ton/Bulan)",
  inflasi_pct: "Inflasi (%)", indikator: "Indikator", target: "Target",
  tahun_target: "Tahun Target", sumber_dokumen: "Sumber Dokumen",
  kelompok_tani: "Kelompok Tani", anggota_tani: "Anggota Tani",
  kelompok_perikanan: "Kelompok Perikanan", anggota_perikanan: "Anggota Perikanan",
  gapoktan: "Gapoktan", anggota_gapoktan: "Anggota Gapoktan",
  kth: "KTH", kth_pemula: "KTH Pemula", kth_madya: "KTH Madya", kth_utama: "KTH Utama",
  rumah_tangga_petani: "Rumah Tangga Petani", petani: "Petani",
  rt_anggota_kelompok: "RT Anggota Kelompok", rt_bukan_anggota_kelompok: "RT Bukan Anggota Kelompok",
  rtup: "RTUP", rt_perikanan: "RT Perikanan",
  rt_perikanan_budidaya: "RT Perikanan Budidaya", rt_perikanan_tangkap: "RT Perikanan Tangkap",
  nilai: "Nilai", satuan: "Satuan",
  bidang: "Bidang", volume: "Volume", harga_produsen: "Harga Produsen (Rp)",
  triwulan: "Triwulan (1-4; kosong = tahunan)",
};

// Suffix kolom → satuan pada label
const SUFFIX_LABELS = { _pct: " (%)", _ton: " (Ton)", _kg: " (Kg)", _ha: " (Ha)", _m2: " (M²)", _ribu_rp: " (Ribu Rp)", _ekor: " (Ekor)" };

export const DOMAINS = {
  "bantuan-program": {
    label: "Bantuan — Program",
    desc: "Program bantuan pemerintah: nama, sumber dana, nominal, penerima, dan dampak.",
    sheets: [{ table: "bantuan_program", name: "Program", kecamatan: false, key: ["nama", "sumber_dana", "tahun_anggaran"], enums: { sumber_dana: ["APBD", "APBN"], dampak_level: ["Tinggi", "Sedang", "Rendah"] } }],
  },
  "bantuan-alokasi": {
    label: "Bantuan — Alokasi Tahunan",
    desc: "Alokasi anggaran bantuan APBD & APBN per tahun (miliar rupiah).",
    sheets: [{ table: "bantuan_alokasi", name: "Alokasi", kecamatan: false, key: ["tahun"] }],
  },
  "bantuan-korelasi": {
    label: "Bantuan — Korelasi Sektor",
    desc: "Korelasi nilai bantuan vs kenaikan produksi per sektor.",
    sheets: [{ table: "bantuan_korelasi", name: "Korelasi", kecamatan: false, key: ["sektor"] }],
  },
  padi: {
    label: "Padi",
    desc: "Produksi padi (sawah & ladang) per kecamatan per tahun.",
    sheets: [{ table: "padi_produksi", name: "Padi", kecamatan: true, key: ["kecamatan", "tahun", "jenis"] }],
  },
  palawija: {
    label: "Palawija",
    desc: "Produksi palawija per kecamatan, komoditas, dan tahun.",
    sheets: [{ table: "palawija_produksi", name: "Palawija", kecamatan: true, key: ["kecamatan", "tahun", "komoditas"] }],
  },
  hortikultura: {
    label: "Hortikultura",
    desc: "Luas & produksi hortikultura (sayuran/buah) per kecamatan dan agregat kabupaten.",
    sheets: [
      { table: "horti_luas", name: "Luas per Kecamatan", kecamatan: true, key: ["kecamatan", "kelompok", "komoditas", "tahun"] },
      { table: "horti_produksi", name: "Produksi per Kecamatan", kecamatan: true, key: ["kecamatan", "kelompok", "komoditas", "tahun"] },
      { table: "horti_luas_kabupaten", name: "Luas Kabupaten", kecamatan: false, key: ["kelompok", "komoditas", "tahun"] },
      { table: "horti_produksi_kabupaten", name: "Produksi Kabupaten", kecamatan: false, key: ["kelompok", "komoditas", "tahun"] },
    ],
  },
  perkebunan: {
    label: "Perkebunan",
    desc: "Areal & produksi perkebunan per kecamatan dan agregat kabupaten.",
    sheets: [
      { table: "perkebunan_areal", name: "Areal per Kecamatan", kecamatan: true, key: ["kecamatan", "tanaman", "tahun"] },
      { table: "perkebunan_produksi", name: "Produksi per Kecamatan", kecamatan: true, key: ["kecamatan", "tanaman", "tahun"] },
      { table: "perkebunan_produksi_kabupaten", name: "Produksi Kabupaten", kecamatan: false, key: ["tanaman", "tahun"] },
    ],
  },
  peternakan: {
    label: "Peternakan",
    desc: "Populasi ternak, produksi daging/telur/susu-kulit, aliran ternak, dan pemotongan RPH.",
    sheets: [
      { table: "ternak_populasi", name: "Populasi", kecamatan: true, key: ["kecamatan", "kelompok", "jenis", "tahun"] },
      { table: "ternak_daging", name: "Daging", kecamatan: true, key: ["kecamatan", "kelompok", "jenis", "tahun"] },
      { table: "ternak_telur", name: "Telur", kecamatan: true, key: ["kecamatan", "jenis", "tahun"] },
      { table: "ternak_susu_kulit", name: "Susu & Kulit", kecamatan: true, key: ["kecamatan", "jenis", "tahun"] },
      { table: "ternak_flow", name: "Aliran Ternak", kecamatan: true, key: ["kecamatan", "arah", "jenis", "tahun"] },
      { table: "ternak_pemotongan", name: "Pemotongan RPH", kecamatan: true, key: ["kecamatan", "lokasi", "jenis", "tahun"] },
    ],
  },
  perikanan: {
    label: "Perikanan",
    desc: "Produksi tangkap/budidaya/benih, luas kolam-waduk-minapadi, tempat pemeliharaan, dan obyek penangkapan.",
    sheets: [
      { table: "ikan_tangkap", name: "Tangkap per Alat", kecamatan: true, key: ["kecamatan", "jenis_alat", "tahun"] },
      { table: "ikan_tangkap_perairan_umum", name: "Tangkap Perairan Umum", kecamatan: true, key: ["kecamatan", "tahun"] },
      { table: "ikan_budidaya", name: "Budidaya", kecamatan: true, key: ["kecamatan", "jenis_budidaya", "tahun"] },
      { table: "ikan_benih", name: "Benih", kecamatan: true, key: ["kecamatan", "arah", "tahun"] },
      { table: "ikan_kolam", name: "Kolam", kecamatan: true, key: ["kecamatan", "tahun"] },
      { table: "ikan_waduk", name: "Waduk", kecamatan: true, key: ["kecamatan", "tahun"] },
      { table: "ikan_minapadi", name: "Mina Padi", kecamatan: true, key: ["kecamatan", "tahun"] },
      { table: "ikan_pemeliharaan", name: "Tempat Pemeliharaan", kecamatan: true, key: ["kecamatan", "tempat", "tahun"] },
      { table: "ikan_obyek_penangkapan", name: "Obyek Penangkapan", kecamatan: true, key: ["kecamatan", "obyek", "arah", "tahun"] },
    ],
  },
  lahan: {
    label: "Lahan",
    desc: "Penggunaan lahan kabupaten per kategori dan tahun (hektare).",
    sheets: [{ table: "lahan_penggunaan", name: "Penggunaan Lahan", kecamatan: false, key: ["kategori", "tahun"] }],
  },
  lumbung: {
    label: "Lumbung Pangan",
    desc: "Jumlah & kapasitas lumbung pangan dan gudang per kecamatan per tahun.",
    sheets: [{ table: "lumbung_pangan", name: "Lumbung Pangan", kecamatan: true, key: ["kecamatan", "tahun"] }],
  },
  ekonomi: {
    label: "Ekonomi",
    desc: "Inflasi tahunan, jumlah pasar, dan nilai ekonomi bidang (input Dinas — tahunan/triwulan; semester = gabungan triwulan).",
    sheets: [
      { table: "inflasi", name: "Inflasi", kecamatan: false, key: ["wilayah", "tahun"] },
      { table: "pasar", name: "Pasar", kecamatan: false, key: ["jenis", "tahun"] },
      {
        table: "nilai_ekonomi_tahunan",
        name: "Nilai Ekonomi",
        kecamatan: false,
        key: ["bidang", "komoditas", "tahun", "triwulan"],
        enums: { triwulan: ["1", "2", "3", "4"] },
      },
    ],
  },
  kelembagaan: {
    label: "Kelembagaan",
    desc: "Kelompok tani & kelompok tani hutan per desa per tahun (ST2023 basis).",
    sheets: [
      { table: "kelompok_tani", name: "Kelompok Tani", kecamatan: true, key: ["kecamatan", "desa", "tahun"] },
      { table: "kelompok_tani_hutan", name: "Kelompok Tani Hutan", kecamatan: true, key: ["kecamatan", "desa", "tahun"] },
    ],
  },
  st2023: {
    label: "ST2023 — Desa",
    desc: "Rumah tangga petani/ikan per desa (Sensus Pertanian 2023). Kolom ternak (JSON) tidak diedit via Excel.",
    sheets: [{ table: "st2023_desa", name: "ST2023 Desa", kecamatan: true, key: ["kecamatan", "desa"] }],
  },
  renstra: {
    label: "Renstra — Target",
    desc: "Target indikator Renstra Distankan (mis. Tabel 4.1 renstra.pdf).",
    sheets: [{ table: "renstra_target", name: "Target Renstra", kecamatan: false, key: ["indikator", "tahun_target"] }],
  },
};

// ---------------------------------------------------------------------------
// Normalisasi nama — cermin database/import/lib.mjs (WAJIB identik!)
// ---------------------------------------------------------------------------

export const normStr = (v) => (v === null || v === undefined ? "" : String(v).replace(/\s+/g, " ").trim());
export const normKey = (v) => normStr(v).toLowerCase().replace(/[^a-z0-9]/g, "");
export const normDesa = (v) => normStr(v).toUpperCase();

const KEC_ALIASES = [
  ["Purwareja Klampok", ["purwarejaklampok", "purworejoklampok", "purworejoklp", "klampok"]],
  ["Purwanegara", ["purwanegara", "purwonegoro", "purwonegara", "purwongoro", "purwonegero"]],
  ["Wanadadi", ["wanadadi", "wonodadi", "wanodadi"]],
];

let kecCache = null; // { byKey: Map<normKey, {id, nama}>, names: string[] }

/** Muat daftar kecamatan resmi dari DB + siapkan resolver alias. */
export async function loadKecamatan() {
  if (kecCache) return kecCache;
  const rows = await q("SELECT id, nama FROM kecamatan ORDER BY nama");
  if (!rows.length) throw new Error("Tabel kecamatan kosong");
  const byKey = new Map();
  const names = [];
  for (const r of rows) {
    names.push(r.nama);
    byKey.set(normKey(r.nama), { id: r.id, nama: r.nama });
  }
  for (const [baku, aliases] of KEC_ALIASES) {
    const target = [...byKey.entries()].find(([k]) => k === normKey(baku))?.[1];
    if (!target) continue;
    for (const a of aliases) if (!byKey.has(a)) byKey.set(a, target);
  }
  kecCache = { byKey, names };
  return kecCache;
}

/** Resolve nama kecamatan bebas → { id, nama } baku, atau null. */
export function resolveKecamatan(kec, cache) {
  const key = normKey(kec);
  if (!key) return null;
  return cache.byKey.get(key) ?? null;
}

// ---------------------------------------------------------------------------
// Loader kolom dinamis
// ---------------------------------------------------------------------------

const colCache = new Map(); // table -> column meta (dari information_schema)

async function loadColumns(table) {
  if (colCache.has(table)) return colCache.get(table);
  const rows = await q(
    `SELECT column_name, data_type, column_type, is_nullable, column_default,
            generation_expression
     FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ?
     ORDER BY ordinal_position`,
    [table]
  );
  if (!rows.length) throw new Error(`Tabel tidak ditemukan: ${table}`);
  colCache.set(table, rows);
  return rows;
}

function labelFor(field) {
  if (LABELS[field]) return LABELS[field];
  for (const [suf, lab] of Object.entries(SUFFIX_LABELS)) {
    if (field.endsWith(suf)) {
      const base = LABELS[field.slice(0, -suf.length)] ?? titleCase(field.slice(0, -suf.length));
      return base + lab;
    }
  }
  return titleCase(field);
}
const titleCase = (s) => s.replace(/_/g, " ").replace(/\b\p{L}/gu, (c) => c.toUpperCase());

function parseEnum(columnType) {
  const m = /^enum\((.*)\)$/i.exec(columnType || "");
  if (!m) return null;
  const vals = m[1].split(",").map((v) => v.trim().replace(/^'|'$/g, ""));
  return vals.length ? vals : null;
}

/** Muat spesifikasi lengkap satu domain (kolom Excel + tipe + kunci upsert). */
export async function loadDomain(domainKey) {
  const domain = DOMAINS[domainKey];
  if (!domain) return null;
  const sheets = await Promise.all(
    domain.sheets.map(async (s) => {
      const colsRaw = (await loadColumns(s.table)).filter(
        (c) => !SKIP_COLS.has(c.column_name) && !SKIP_TYPES.has(c.data_type) && !c.generation_expression
      );
      const hasSumber = (await loadColumns(s.table)).some((c) => c.column_name === "sumber");
      const hasDesaNorm = (await loadColumns(s.table)).some((c) => c.column_name === "desa_norm");
      const cols = colsRaw.map((c) => {
        const enumDb = parseEnum(c.column_type);
        const enumCfg = s.enums?.[c.column_name] ?? null;
        const isYear = /(^|_)tahun($|_)/.test(c.column_name);
        const numeric = ["int", "bigint", "smallint", "tinyint", "mediumint", "decimal", "double", "float"].includes(c.data_type);
        return {
          field: c.column_name,
          header: labelFor(c.column_name),
          type: isYear ? "year" : enumCfg || enumDb ? "enum" : numeric ? "number" : "text",
          required: c.is_nullable === "NO" && c.column_default === null,
          enumValues: enumCfg ?? enumDb,
        };
      });
      const out = {
        table: s.table,
        name: s.name,
        key: s.key,
        kecamatan: !!s.kecamatan,
        hasSumber,
        hasDesaNorm,
        cols: s.kecamatan
          ? [{ field: "kecamatan", header: "Kecamatan", type: "kecamatan", required: true, enumValues: null }, ...cols]
          : cols,
      };
      return out;
    })
  );
  return { key: domainKey, label: domain.label, desc: domain.desc, sheets };
}

/** Ringkasan domain untuk UI dasbor (tanpa detail kolom). */
export async function listDomains() {
  const out = [];
  for (const [key, d] of Object.entries(DOMAINS)) {
    const sheets = d.sheets.map((s) => ({ name: s.name, table: s.table, key: s.key }));
    out.push({ domain: key, label: d.label, desc: d.desc, sheets });
  }
  return out;
}
