// discover-datasets.js — fetch semua dataset ID per-kecamatan dari CKAN
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
  const url = "https://opendata.banjarnegarakab.go.id/api/3/action/package_search?fq=organization:distankan-kp&q=lahan+pertanian+desa&rows=50";
  const r = await fetch(url);
  const json = JSON.parse(r.body);
  const datasets = json.result.results.filter(d => d.organization.name === "distankan-kp");
  console.log("Datasets from distankan-kp:");
  datasets.forEach(d => {
    const csv = d.resources.filter(r => r.format === "CSV");
    console.log(`  ${d.name} → CSV resource id: ${csv[0]?.id || "none"}`);
  });
})();