// parse-and-merge.cjs — parse CSV lahan-pertanian per kecamatan, output JSON
const https = require("https");
const fs = require("fs");

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "PertanianDashboard/1.0" } }, (res) => {
      let data = "";
      res.on("data", (c) => data += c);
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
      res.on("error", reject);
    });
  });
}

async function fetchCsv(resourceId) {
  const apiUrl = `https://opendata.banjarnegarakab.go.id/api/3/action/resource_show?id=${resourceId}`;
  const r = await fetch(apiUrl);
  const json = JSON.parse(r.body);
  const dlUrl = json.result.url;
  const csv = await fetch(dlUrl);
  return csv.body;
}

// Parser angka yang robust — strip spasi, ganti koma ke dot, dll
function parseNum(s) {
  if (s === undefined || s === null) return 0;
  let v = String(s).trim();
  if (!v) return 0;
  // Hapus suffix unit seperti "Ha", "m", " ha"
  v = v.replace(/\s*(ha|m²|m2|m)$/i, "").trim();
  // Normalisasi separator
  // Jika mengandung koma DAN titik, kita pakai asumsi Indo: titik = ribuan, koma = desimal
  if (v.includes(",") && v.includes(".")) {
    // "1.119.994" (Indo ribuan) atau "1.119,994" (Eropa)?
    // Hapus titik (kalau ada >1 titik atau setelah digit 3): ribuan
    const lastDot = v.lastIndexOf(".");
    const lastComma = v.lastIndexOf(",");
    if (lastComma > lastDot) {
      // Eropa: 1.119,994 → 1119.994
      v = v.replace(/\./g, "").replace(",", ".");
    } else {
      // Indo: 1.119.994,994 (rare) → just remove dots
      // Actually kalau "1.119.994" tanpa koma, dihapus titus → 1119994
      v = v.replace(/\./g, "").replace(",", ".");
    }
  } else if (v.includes(",")) {
    // "60,7" → 60.7 atau "60,700" → 60.700? Asumsi: jika ada 1 koma dan setelahnya ≤2 digit, decimal; else ribuan
    const parts = v.split(",");
    if (parts[1].length <= 2) {
      v = parts[0] + "." + parts[1];
    } else {
      v = v.replace(",", "");
    }
  } else if (v.includes(" ")) {
    // "60 700" → 60700
    v = v.replace(/\s+/g, "");
  } else if (v.includes(".")) {
    // "15.000" — bisa 15 (decimal) atau 15000 (ribuan). Asumsi: jika setelah titik ada tepat 3 digit DAN ada digit lain sebelum titik, ribuan
    // Jika "15.0" atau "15.5" → decimal
    const parts = v.split(".");
    if (parts.length === 2 && parts[1].length === 3 && parts[0].length >= 1 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
      // "15.000" → kemungkinan besar ribuan, treat as integer 15000
      // Tapi cek juga jumlah digit sebelum titik:
      // "3.500" bisa "3.5" (decimal) atau "3500" (ribuan)
      // Untuk dataset lahan Ha, "3.500" paling mungkin "3.5 Ha" karena angka kecil
      // Tapi "60.700" paling mungkin "60700 Ha" — ini 60k Ha terlalu besar
      // Saya pakai heuristik: jika digit sebelum titik <=3, kemungkinan decimal
      // Cek CKAN dataset "luas-lahan-bukan-sawah" Banjarnegara:
      //   KRANDEGAN;56.119;8.800 — 56.119 kemungkinan 56.119 Ha (decimal). Tapi 8.800 → 8.8 Ha?
      //   Itu dataset bukan-sawah yg sama, dan 8.8 Ha Tegal/Kebun tidak masuk akal untuk KRANDEGAN
      //   Kemungkinan: 56.119 = 56.119 Ha dan 8.800 = 8800 Ha
      // Hmm inkonsisten
      // Untuk dataset "lahan-pertanian" ini, sample:
      //   KUTABANJARNEGARA:3.500; 45.800 → jika decimal, 3.5 sawah, 45.8 non-sawah = plausible
      //   CENDANA: 15.000; 170.000 → 15 sawah, 170 non-sawah (Plausible)
      //   SEMARANG: 60 700; 517 550 → 60700 sawah?? terlalu besar. Mungkin 60.7 / 517.55? atau 60,700 = 60700
      // Format sangat tidak konsisten — saya treat "X.YYY" dengan YYY=3 digit sebagai X.YYY (decimal)
      v = v; // keep as-is, parseFloat
    }
  }
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

// Parse CSV — header mungkin beda2
function parseCsvLahan(csv, kecamatanName) {
  const lines = csv.split(/\r?\n/).filter(l => l.trim() && !l.match(/^;;/));
  const header = lines[0].toLowerCase();
  // Cari kolom index
  const cols = lines[0].split(";");
  const desaIdx = cols.findIndex(c => /desa|kelurahan/i.test(c));
  const sawahIdx = cols.findIndex(c => /^.*sawah$/i.test(c) && !c.includes("bukan"));
  const bsIdx = cols.findIndex(c => /bukan.*sawah/i.test(c));
  const tahunIdx = cols.findIndex(c => /^tahun$/i.test(c));
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(";");
    if (parts.length < 3) continue;
    const desaRaw = (parts[desaIdx] || "").trim().replace(/\s+$/, "").toUpperCase();
    if (!desaRaw) continue;
    const sawah = parseNum(parts[sawahIdx]);
    const bukanSawah = parseNum(parts[bsIdx]);
    const tahun = parseInt(parts[tahunIdx], 10) || 0;
    out.push({
      kecamatan: kecamatanName,
      desa: desaRaw,
      lahanSawah: sawah,
      lahanBukanSawah: bukanSawah,
      jumlah: sawah + bukanSawah,
      tahun,
    });
  }
  return out;
}

// Process all kecamatan
const KECAMATAN_DATASETS = {
  Banjarnegara: "9b70d137-6299-47b1-9fb6-afef576ec16c",
  Batur: "28ee7244-b5db-46bd-826f-f7cd9083493c",
  Bawang: "9ff03921-c8fc-4941-bd96-2a5564bbec1c",
  Mandiraja: "6adb4aed-f54c-4c39-ac1d-5d4ce9bbf217",
  Pagedongan: "fa4d556e-a57a-4fed-ade8-e04657550e1c",
  Pagentan: "d9bd5f57-6f37-4871-b276-2bdbb20c1f82",
  Pejawaran: "45b81ba6-cac4-40c2-ad65-d25cb764ac0b",
  Punggelan: "a41f4f6d-b365-4739-b4c0-787953ff7077",
  Purwanegara: "53a050df-c252-4466-b39f-b53b3758f269",
  Rakit: "0711d33c-e1b4-404a-a243-725eb48740fa",
  Sigaluh: "54b2c0c8-7f15-4b44-b712-50bad4fef662",
  Susukan: "65d18057-cf89-4959-9471-a02304c01047",
  Wanayasa: "612cfe87-4062-4d3c-9a50-d6134f653a64",
};

(async () => {
  const all = [];
  for (const [kec, resId] of Object.entries(KECAMATAN_DATASETS)) {
    console.log(`Fetching ${kec}...`);
    try {
      const csv = await fetchCsv(resId);
      const records = parseCsvLahan(csv, kec);
      console.log(`  → ${records.length} records`);
      all.push(...records);
    } catch (e) {
      console.error(`  FAIL ${kec}:`, e.message);
    }
  }

  // Print Cendana for cross-verify
  const cendana = all.filter(r => r.desa === "CENDANA");
  console.log("\nCENDANA in CKAN data:");
  cendana.forEach(r => console.log(JSON.stringify(r)));

  fs.writeFileSync('lahan-ckan-merged.json', JSON.stringify(all, null, 2));
  console.log(`\nSaved lahan-ckan-merged.json: ${all.length} records`);
})();