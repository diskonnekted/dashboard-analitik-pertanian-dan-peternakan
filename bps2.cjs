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
  const queries = ["Rumah Tangga Pertanian", "Luas Lahan", "Lahan Sawah"];
  for (const q of queries) {
    console.log("\n=== " + q + " ===");
    const j = JSON.parse(await fetch("https://opendata.banjarnegarakab.go.id/api/3/action/package_search?q=" + encodeURIComponent(q) + "&rows=10"));
    console.log("Total:", j.result.count);
    j.result.results.slice(0, 8).forEach(d => {
      const csv = d.resources.filter(x => x.format === "CSV");
      csv.forEach(c => console.log("  [" + c.id.slice(0, 8) + "] " + d.name + " [" + d.organization.name + "]"));
    });
  }
})();