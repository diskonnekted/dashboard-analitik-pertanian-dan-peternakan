// fetch-resource.cjs
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
  const r = await fetch("https://opendata.banjarnegarakab.go.id/api/3/action/resource_show?id=cfc76208-bf8e-4669-b994-48048970f43a");
  const j = JSON.parse(r.body);
  console.log("URL:", j.result.url);
  const csv = await fetch(j.result.url);
  console.log("CSV body (first 500):");
  console.log(csv.body.slice(0, 500));
})();