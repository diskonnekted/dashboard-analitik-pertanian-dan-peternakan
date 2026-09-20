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
  // Cek dataset per-kecamatan untuk kecamatan yang sebelumnya null
  const kecNames = ["pandanarum", "karangkobar", "banjarmangu", "kalibening", "madukara", "purwarejaklampok", "wanadadi"];
  for (const kec of kecNames) {
    console.log(`\n=== ${kec} ===`);
    const j = JSON.parse(await fetch("https://opendata.banjarnegarakab.go.id/api/3/action/package_search?q=" + kec + "&rows=30"));
    j.result.results.forEach(d => {
      const csv = d.resources.filter(x => x.format === "CSV");
      if (csv.length === 0) return;
      csv.forEach(c => {
        if (/luas.*lahan|penggunaan.*lahan/i.test(d.name + " " + c.name)) {
          console.log("  [" + c.id + "] " + d.name);
        }
      });
    });
  }
})();