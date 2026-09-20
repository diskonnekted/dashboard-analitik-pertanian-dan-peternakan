const fs = require("fs");
const { PDFParse } = require("pdf-parse");
(async () => {
  const buf = fs.readFileSync("./public/hasil-sensus-pertanian-2023-kecamatan-banjarnegara.pdf");
  console.log("Reading PDF,", Math.round(buf.length / 1024), "KB...");
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  const data = await parser.getText();
  console.log("Pages:", data.total);
  console.log("Text length:", data.text.length);
  fs.writeFileSync("st2023-pdf-text.txt", data.text);
  console.log("Saved st2023-pdf-text.txt");
  await parser.destroy();
})();