const fs = require("fs");
const csv = fs.readFileSync("raw-banjarnegara.csv", "utf8");
const lines = csv.split("\n").filter(l => l.trim());
console.log("Header:", lines[0]);
console.log("Total rows:", lines.length - 1);

// Cek beberapa desa dan lihat sawah/bukan-sawah mereka
for (let i = 1; i <= 10 && i < lines.length; i++) {
  const parts = lines[i].split(";");
  console.log(`  ${parts[0].padEnd(20)} sawah=${parts[1].padStart(10)} bs=${(parts[2]||"").padStart(10)} jumlah=${(parts[3]||"").padStart(10)} tahun=${parts[4]}`);
}