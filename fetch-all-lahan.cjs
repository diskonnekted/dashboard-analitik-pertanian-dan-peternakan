// fetch-all-lahan.cjs
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

// Mapping kecamatan → resource ID dataset "luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-X"
const KECAMATAN_DATASETS = {
  Banjarnegara: "9b70d137-6299-47b1-9fb6-afef576ec16c",
  Banjarmangu: null, // belum ada
  Batur: "28ee7244-b5db-46bd-826f-f7cd9083493c",
  Bawang: "9ff03921-c8fc-4941-bd96-2a5564bbec1c",
  Kalibening: null,
  Karangkobar: null,
  Madukara: null,
  Mandiraja: "6adb4aed-f54c-4c39-ac1d-5d4ce9bbf217",
  Pagedongan: "fa4d556e-a57a-4fed-ade8-e04657550e1c",
  Pagentan: "d9bd5f57-6f37-4871-b276-2bdbb20c1f82",
  Pandanarum: null,
  Pejawaran: "45b81ba6-cac4-40c2-ad65-d25cb764ac0b", // 2023-2025
  Punggelan: "a41f4f6d-b365-4739-b4c0-787953ff7077",
  Purwanegara: "53a050df-c252-4466-b39f-b53b3758f269",
  PurwarejaKlampok: null,
  Rakit: "0711d33c-e1b4-404a-a243-725eb48740fa",
  Sigaluh: "54b2c0c8-7f15-4b44-b712-50bad4fef662",
  Susukan: "65d18057-cf89-4959-9471-a02304c01047",
  Wanadadi: null,
  Wanayasa: "612cfe87-4062-4d3c-9a50-d6134f653a64",
};

// Mapping kecamatan → resource ID dataset "luas-lahan-bukan-sawah-menurut-jenis-penggunaan-dan-desa-di-X"
const KECAMATAN_NON_SAWAH = {
  Banjarnegara: "cfc76208-bf8e-4669-b994-48048970f43a",
  Banjarmangu: null,
  Batur: "48d94640-e8c6-4849-8359-29d15556df85",
  Bawang: "48af6d59-725a-4fda-a4d3-3b8b11b33abb",
  Kalibening: null,
  Karangkobar: "a5d67699-e61c-4560-9bca-f4793e5119a0",
  Madukara: null,
  Mandiraja: "3459762b-ec94-4a8b-909d-72d72c26b605",
  Pagedongan: "0da6912e-e48b-46ef-8aa1-0b7e1dbff481",
  Pagentan: "08e5c19e-16ca-4bef-b456-50c1892114d8",
  Pandanarum: "70166c62-c95b-4a1b-a253-54643fa7d5d7",
  Pejawaran: "ac473caa-5505-428a-8643-17d8e94af097",
  Punggelan: "6505b896-c994-44e8-9324-e076f20eefb3",
  Purwanegara: "acb24843-6e29-4efb-a7c4-26578814a357",
  PurwarejaKlampok: null,
  Rakit: "4016f7e1-4698-4ccb-aed4-1fe49cc68f3d",
  Sigaluh: "af6d8601-f2b2-4789-a88b-a572e2ff1565",
  Susukan: "9e76c57f-6cce-4ab6-ae11-3909d1374fc2",
  Wanadadi: "3b0e06f6-9801-4691-80ac-6b9a06d47887",
  Wanayasa: "5c444f26-12e4-4c0d-bcda-1ac36c8f327e",
};

async function fetchCsv(resourceId) {
  const url = `https://opendata.banjarnegarakab.go.id/dataset/${resourceId.split("-")[0]}/${resourceId}/download/${resourceId}.csv`;
  // Get the resource URL via API instead
  const apiUrl = `https://opendata.banjarnegarakab.go.id/api/3/action/resource_show?id=${resourceId}`;
  const r = await fetch(apiUrl);
  const json = JSON.parse(r.body);
  const dlUrl = json.result.url;
  const csv = await fetch(dlUrl);
  return csv.body;
}

(async () => {
  const out = [];
  // First load all existing data as baseline
  const existing = require('./public/data/lahan-fallback.json');
  console.log(`Existing: ${existing.length} records`);

  const kecList = Object.keys(KECAMATAN_DATASETS);

  for (const [kec, resId] of Object.entries(KECAMATAN_DATASETS)) {
    if (!resId) continue;
    console.log(`Fetching ${kec} (${resId})...`);
    try {
      const csv = await fetchCsv(resId);
      const lines = csv.split('\n').filter(l => l.trim());
      console.log(`  → ${lines.length - 1} rows`);
      // Save raw CSV for inspection
      fs.writeFileSync(`raw-${kec.toLowerCase()}.csv`, csv);
    } catch (e) {
      console.error(`  FAIL ${kec}:`, e.message);
    }
  }
})();