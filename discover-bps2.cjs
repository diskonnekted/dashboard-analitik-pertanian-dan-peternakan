const https = require("https");
function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "P/1.0" } }, (res) => {
      let data = "";
      res.on("data", (c) => data += c);
      res.on("end", () => resolve(data));
      res.on("error", reject);
    });
  });
}
(async () => {
  const j = JSON.parse(await fetch("https://opendata.banjarnegarakab.go.id/api/3/action/package_search?q=Sensus+Pertanian&rows=20"));
  console.log("ST2023 search:");
  j.result.results.forEach(d => {
    const csv = d.resources.filter(x => x.format === "CSV");
    csv.forEach(c => console.log(`  [${c.id.slice(0,8)}] ${d.name}`));
  });
})();