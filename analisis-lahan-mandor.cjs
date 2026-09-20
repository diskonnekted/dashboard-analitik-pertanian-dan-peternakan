// Skrip Analisis Data Lahan Desa - Bandingkan CKAN vs BPS ST2023
const fs = require('fs');
const path = require('path');

// Baca data fallback
const fallbackRaw = fs.readFileSync('I:/pertanian/pertanian-2/public/data/lahan-fallback.json', 'utf-8');
const fallbackData = JSON.parse(fallbackRaw);

// Baca data ST2023 untuk Banjarmangu
const st2023Banjarmangu = JSON.parse(
  fs.readFileSync('I:/pertanian/pertanian-2/data-source/lahan-st2023-banjarmangu.json', 'utf-8')
);

// Baca CKAN merged
const ckanMerged = JSON.parse(
  fs.readFileSync('I:/pertanian/pertanian-2/lahan-ckan-merged.json', 'utf-8')
);

console.log('=== ANALISIS DATA LAHHAN DESA ===\n');
console.log('Sumber data:');
console.log('1. CKAN Distankan KP: lahan-ckan-merged.json');
console.log('2. Fallback lokal: public/data/lahan-fallback.json');
console.log('3. BPS ST2023: data-source/lahan-st2023-banjarmangu.json');

// Ekstrak data Banjarmangu dari CKAN
const ckanBanjarmangu = ckanMerged.find(d => d.kecamatan === 'BANJARMANGU');

console.log('\n=== DATA BANJARMANGU - CKAN Distankan KP ===');
if (ckanBanjarmangu) {
  console.log(JSON.stringify(ckanBanjarmangu, null, 2));
} else {
  console.log('Data tidak ditemukan di CKAN merged');
}

// Ekstrak data Banjarmangu dari fallback
const fallbackBanjarmangu = fallbackData.find(d => d.kecamatan === 'BANJARMANGU');

console.log('\n=== DATA BANJARMANGU - Fallback Lokal ===');
if (fallbackBanjarmangu) {
  console.log(JSON.stringify(fallbackBanjarmangu, null, 2));
} else {
  console.log('Data tidak ditemukan di fallback');
}

console.log('\n=== DATA BANJARMANGU - BPS ST2023 (Rujukan) ===');
console.log(JSON.stringify(st2023Banjarmangu, null, 2));

console.log('\n=== ANALISIS PERBANDINGAN ===\n');

// Bandingkan per desa
const desas = ['BANJARKULON', 'BANJARMANGU', 'BEJI', 'KENDAGA', 'PASEH'];

desas.forEach(desa => {
  const ckan = ckanBanjarmangu?.desa_detail?.find(d => d.desa === desa);
  const fallback = fallbackBanjarmangu?.desa_detail?.find(d => d.desa === desa);
  const st = st2023Banjarmangu.find(b => b.desa === desa || b.desa === desa.replace(/_/g, ' '));

  console.log(`--- ${desa} ---`);
  
  if (st) {
    console.log(`  BPS ST2023: Sawah=${st.lahanSawah} ha, Bukan Sawah=${st.lahanBukanSawah} ha, Total=${st.jumlah} ha`);
  } else {
    console.log(`  BPS ST2023: Data tidak ditemukan`);
  }

  if (fallback) {
    const fbSawah = fallback.lahan_sawah || fallback['lahan Sawah'] || 0;
    const fbBukan = fallback.lahan_bukan_sawah || fallback['lahan Bukan Sawah'] || 0;
    const fbTotal = fallback.lahan_total || fallback.jumlah_lahan || 0;
    console.log(`  Fallback: Sawah=${fbSawah} ha, Bukan Sawah=${fbBukan} ha, Total=${fbTotal} ha`);
  }

  if (ckan) {
    console.log(`  CKAN: Sawah=${ckan.lahan_sawah || 0} ha, Bukan Sawah=${ckan.lahan_bukan_sawah || 0} ha, Total=${ckan.lahan_total || 0} ha`);
  }

  // Hitung selisih
  if (fallback && st) {
    const selisihSawah = Math.abs(parseFloat(fallback.lahan_sawah || 0) - st.lahanSawah);
    const persenSelisih = (selisihSawah / st.lahanSawah * 100).toFixed(1);
    console.log(`  Selisih Sawah (Fallback vs BPS): ${selisihSawah} ha (${persenSelisih}%)`);
  }
  console.log();
});

// Cek masalah specific
console.log('=== MASALAH YANG DITEMUKAN ===\n');

// 1. Cek desa dengan lahan = 0
const zeroLahan = ckanBanjarmangu?.desa_detail?.filter(d => d.lahan_total === 0 || d.lahan_total === undefined);
if (zeroLahan && zeroLahan.length > 0) {
  console.log('1. Desa dengan lahan = 0 di CKAN:');
  zeroLahan.forEach(d => console.log(`   - ${d.desa}: ${d.lahan_total || 0} ha`));
}

// 2. Cek descrepansi besar
console.log('\n2. Descrepansi > 10% antara CKAN dan BPS ST2023:');

// 3. Rekomendasi perbaikan
console.log('\n=== REKOMENDASI PERBAIKAN DATA ===');
console.log('\n1. Update file: public/data/lahan-fallback.json');
console.log('   - Ganti data for Banjarmangu kecamatan dengan nilai BPS ST2023');
console.log('   - Tambahkan rincian: lahan sawah, lahan bukan sawah, lahan tidak ditanami');
console.log('\n2. Prioritas perbaikan (tinggi -> rendah):');

const allSt2023 = [
  ...st2023Banjarmangu.map(d => ({ ...d, kecamatan: 'BANJARMANGU' }))
].sort((a, b) => Math.abs(a.lahanSawah - (fallbackData.find(f => f.kecamatan === a.kecamatan)?.desa_detail?.find(d => d.desa === a.desa)?.lahan_sawah || 0)) - 
          Math.abs(b.lahanSawah - (fallbackData.find(f => f.kecamatan === b.kecamatan)?.desa_detail?.find(d => d.desa === b.desa)?.lahan_sawah || 0)));

allSt2023.forEach(d => {
  console.log(`   - ${d.kecamatan}/${d.desa}: ${d.jumlah} ha (Sawah: ${d.lahanSawah}, Bukan Sawah: ${d.lahanBukanSawah})`);
});
