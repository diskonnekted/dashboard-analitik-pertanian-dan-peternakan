const https = require("https");
function fetch(url) {
  return new Promise((r, j) => {
    https.get(url, { headers: { "User-Agent": "P/1.0" } }, (res) => {
      let d = "";
      res.on("data", (c) => d += c);
      res.on("end", () => r(d));
      res.on("error", j);
    });
  });
}
(async () => {
  // Datasets from distankan-kp
  const j = JSON.parse(await fetch("https://opendata.banjarnegarakab.go.id/api/3/action/package_search?q=luas+lahan+pertanian&fq=organization:distankan-kp&rows=50"));
  console.log("distankan-kp luas-lahan:");
  j.result.results.forEach(d => {
    const csv = d.resources.filter(x => x.format === "CSV");
    csv.forEach(c => console.log("  [" + c.id.slice(0, 8) + "] " + d.name));
  });
  // Data kecamatan (curated by kecamatan orgs)
  const j2 = JSON.parse(await fetch("https://opendata.banjarnegarakab.go.id/api/3/action/package_search?q=luas+lahan+pertanian&rows=50"));
  console.log("\nALL luas-lahan:");
  j2.result.results.forEach(d => {
    const csv = d.resources.filter(x => x.format === "CSV");
    csv.forEach(c => console.log("  [" + c.id.slice(0, 8) + "] " + d.name + " [" + d.organization.name + "]"));
  });
})();