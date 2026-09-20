const https = require("https");
const fs = require("fs");
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
  const j = JSON.parse(await fetch("https://opendata.banjarnegarakab.go.id/api/3/action/resource_show?id=bca5ab5f-de6f-48f4-a466-7ae7258c3587"));
  console.log("URL:", j.result.url);
  const csv = await fetch(j.result.url);
  fs.writeFileSync("raw-pandanarum.csv", csv);
  console.log("Saved, size:", csv.length);
  console.log(csv.slice(0, 200));
})();