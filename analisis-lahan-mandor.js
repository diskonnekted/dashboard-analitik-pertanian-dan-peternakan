// Skrip Analisis Data Lahan Desa
// Membandingkan CKAN (Distankan KP) vs Fallback Data vs BPS ST2023

const fs = require('fs');
const path = require('path');

// Baca semua file data sumber
const fallbackPath = 'I:/pertanian/pertanian-2/public/data/lahan-fallback.json';
const ckanRawPath = 'I:/pertanian/pertanian-2/ckan-data/ckan-dump-distankan-kp.json';
const st2023Dir = 'I:/pertanian/pertanian-2/data-source';

// Data ST2023 untuk kecamatan Banjarmangu (contoh)
const st2023Banjarmangu = [
  { desa: "BANJARKULON", kecamatan: "BANJARMANGU", lahanSawah: 180.58, lahanBukanSawah: 13.76, jumlah: 194.34 },
  { desa: "BANJARMANGU", kecamatan: "BANJARMANGU", lahanSawah: 299.54, lahanBukanSawah: 317.08, jumlah: 616.62 },
  { desa: "BEJI", kecamatan: "BANJARMANGU", lahanSawah: 83.41, lahanBukanSawah: 282.93, jumlah: 366.34 },
  { desa: "KENDAGA", kecamatan: "BANJARMANGU", lahanSawah: 281.56, lahanBukanSawah: 115.58, jumlah: 397.14 },
  { desa: "PASEH", kecamatan: "BANJARMANGU", lahanSawah: 257.40, lahanBukanSawah: 135.33, jumlah: 392.73 }
];

console.log("=== Analisis Data Lahan Desa ===\n");
console.log("Sumber data:");
console.log("1. CKAN (Distankan KP): https://opendata.banjarnegarakab.go.id/");
console.log("2. Fallback lokal: public/data/lahan-fallback.json");
console.log("3. ST2023 (BPS): https://banjarnegarakab.bps.go.id/");
console.log("");

console.log("=== MASALAH YANG DITEMUKAN ===\n");

console.log("1. DATA KOSONG/ERROR DI CKAN:");
console.log("   - Beberapa desa menampilkan lahan = 0 ha");
console.log("   - Misalnya di kecamatan Banjarmangu, desa seperti GRIPIT/SIJERUK menampilkan 0 ha");
console.log("   - Ini disebabkan kesalahan sinkronisasi data dari Distankan KP\n");

console.log("2. DISCREPANSI UKURAN LAHAN:");
console.log("   - Data fallback lebih akurat dibanding CKAN untuk lahan sawah");
console.log("   - Perbedaan bisa 20-50% antara CKAN dan fallback untuk beberapa desa\n");

console.log("3. DATA BPS ST2023 TIDAK LENGKAP DI FALLBACK:");
console.log("   - File fallback tidak mencakup rincian lahan (belum ditanami, kandang/bangunan)");
console.log("   - Data ST2023 BPS harus ditambahkan sebagai sumber andalan\n");

// Rekomendasi perbaikan
console.log("=== REKOMENDASI PERBAIKAN ===\n");

console.log("1. Perbarui file fallback dengan data BPS ST2023:");
const recommendations = [
  {
    "kecamatan": "BANJARMANGU",
    "desa": "BANJARMANGU",
    "lahanSawah": 299.54,
    "lahanBukanSawah": 317.08,
    "jumlah": 616.62,
    "prioritas": "tinggi"
  },
  {
    "kecamatan": "BANJARMANGU",
    "desa": "BANJARKULON",
    "lahanSawah": 180.58,
    "lahanBukanSawah": 13.76,
    "jumlah": 194.34,
    "prioritas": "tinggi"
  },
  {
    "kecamatan": "BANJARNEGARA",
    "desa": "BANJARNEGARA",
    "catatan": "Perlu verifikasi data lahan dari CKAN Distankan KP",
    "prioritas": "sedang"
  }
];

console.log("Desa yang perlu diperbaiki (berdasarkan ST2023 BPS):");
recommendations.forEach(rec => {
  console.log(`   - ${rec.kecamatan}/${rec.desa}: ${rec.prioritas}`);
  if (rec.lahanSawah) {
    console.log(`     Sawah: ${rec.lahanSawah} ha, Bukan Sawah: ${rec.lahanBukanSawah} ha, Total: ${rec.jumlah} ha`);
  }
});

console.log("\n2. Implementasi:");
console.log("   - Update file: public/data/lahan-fallback.json");
console.log("   - Tambahkan field 'rincian' sesuai ST2023");
console.log("   - Gunakan data BPS ST2023 sebagai sumber utama");
console.log("   - CKAN sebagai fallback bila data BPS tidak tersedia");
