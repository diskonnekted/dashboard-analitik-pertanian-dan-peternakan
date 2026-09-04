const fs = require('fs');
const { PDFParse } = require('pdf-parse');
const data = new Uint8Array(fs.readFileSync('public/rekomendasi.pdf'));
const parser = new PDFParse({ data });
parser.getText().then(d => {
  console.log(d.text);
}).catch(e => console.error(e));
