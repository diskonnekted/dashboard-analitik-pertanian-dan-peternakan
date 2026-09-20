// discover-bps.cjs — search BPS ST2023 dataset
const https = require("https");
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

(async () => {
  const queries = [
    "ST2023",
    "Sensus Pertanian 2023",
    "pertanian 2023",
    "banyaknya rumah tangga",
  ];
  for (const q of queries) {
    const url = `https://opendata.banjarnegarakab.go.id/api/3/action/package_search?q=${encodeURIComponent(q)}&rows=15`;
    const r = await fetch(url);
    const j = JSON.parse(r.body);
    console.log(`\n=== "${q}" → ${j.result.count} matches ===`);
    j.result.results.slice(0, 8).forEach(d => {
      const csv = d.resources.filter(x => x.format === "CSV");
      csv.forEach(c => console.log(`  [${c.id.slice(0,8)}] ${d.name} [${d.organization.name}]`));
    });
  }
})();