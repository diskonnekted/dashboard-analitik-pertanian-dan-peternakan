// discover2.cjs
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
  // Search specifically "Luas Lahan Bukan Sawah ... di Kec"
  const r = await fetch("https://opendata.banjarnegarakab.go.id/api/3/action/package_search?q=Luas+Lahan+Bukan+Sawah&rows=50");
  const json = JSON.parse(r.body);
  const datasets = json.result.results;
  console.log(`Total: ${datasets.length}`);
  // Print name + id + CSV resources
  datasets.forEach(d => {
    const csv = d.resources.filter(r => r.format === "CSV");
    csv.forEach(c => {
      console.log(`  [${c.id}] ${d.name}`);
    });
  });
})();