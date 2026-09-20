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
  // Look for Wanadadi sawah dataset
  const j = JSON.parse(await fetch("https://opendata.banjarnegarakab.go.id/api/3/action/package_search?q=sawah+wanadadi&rows=10"));
  console.log("Sawah Wanadadi:");
  j.result.results.forEach(d => {
    const csv = d.resources.filter(x => x.format === "CSV");
    csv.forEach(c => console.log("  [" + c.id + "] " + d.name + " [" + d.organization.name + "]"));
  });
})();