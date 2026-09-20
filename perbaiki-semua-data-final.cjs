// Skrip Final Perbaikan Data Lahan - Semua Kecamatan
const fs = require('fs');
const path = require('path');

console.log('=== PERBAIKAN DATA LAHAN FINAL - SEMUA KECAMATAN ===\n');

// 1. Baca semua file ST2023
const st2023Dir = 'I:/pertanian/pertanian-2/data-source';
const st2023Files = fs.readdirSync(st2023Dir)
  .filter(f => f.startsWith('lahan-st2023-') && f.endsWith('.json'));

// Baca semua data ST2023
let st2023All = {};
st2023Files.forEach(file => {
  const kecamatan = file.replace('lahan-st2023-', '').replace('.json', '');
  const data = JSON.parse(fs.readFileSync(path.join(st2023Dir, file), 'utf-8'));
  st2023All[kecamatan] = data;
  console.log(`ST2023 - ${kecamatan}: ${data.length} desa`);
});

// 2. Baca file fallback
const fallbackRaw = fs.readFileSync('I:/pertanian/pertanian-2/public/data/lahan-fallback.json', 'utf-8');
let fallback = JSON.parse(fallbackRaw);

// Mapping nama kecamatan untuk konsistensi
const kecamatanMapping = {
  'kalibening': 'Kalibening',
  'karangkobar': 'Karangkobar',
  'madukara': 'Madukara',
  'purwarejaklampok': 'Purwarejaklampok',
  'sigaluh': 'Sigaluh'
};

// 3. Validasi data ST2023 formatnya
console.log('\n=== VALIDASI FORMAT DATA ST2023 ===');

for (const [kec, desaList] of Object.entries(st2023All)) {
  console.log(`\nKecamatan: ${kec}`);
  desaList.forEach(desa => {
    const keys = Object.keys(desa);
    console.log(`  ${desa.desa || desa.Desa}: keys=${keys.join(', ')}`);
  });
}

// 4. Update fallback dengan data ST2023 untuk semua kecamatan
console.log('\n=== UPDATE FALLBACK DENGAN DATA ST2023 ===');

let updateCount = 0;
let addCount = 0;

for (const [stKec, stDesas] of Object.entries(st2023All)) {
  const targetKec = kecamatanMapping[stKec] || stKec.charAt(0).toUpperCase() + stKec.slice(1);
  
  stDesas.forEach(st => {
    const desaName = st.desa || st.Desa;
    const sawah = st.lahanSawah !== undefined ? st.lahanSawah : st.lahan_sawah;
    const bukanSawah = st.lahanBukanSawah !== undefined ? st.lahanBukanSawah : st.lahan_bukan_sawah;
    const jumlah = st.jumlah !== undefined ? st.jumlah : st.jumlah_lahan;
    
    // Cari entry yang sesuai di fallback
    const existingIndex = fallback.findIndex(d => {
      const kecMatch = (d.kecamatan || '').toLowerCase() === targetKec.toLowerCase();
      const desaMatch = (d.desa || '').toUpperCase() === desaName.toUpperCase();
      return kecMatch && desaMatch;
    });
    
    if (existingIndex >= 0) {
      // Update dengan data ST2023
      const oldTotal = parseFloat(fallback[existingIndex].jumlah || 0);
      fallback[existingIndex] = {
        desa: desaName.toUpperCase(),
        kecamatan: targetKec,
        lahanSawah: sawah,
        lahanBukanSawah: bukanSawah,
        jumlah: jumlah,
        tahun: 2023,
        rincian: st.rincian || {
          bukanSawah: 0,
          padangRumputSementara: 0,
          padangRumputPermanen: 0,
          belumDitanami: 0,
          tanamanTahunan: bukanSawah,
          kandangBangunan: 0
        },
        sumber: 'BPS ST2023',
        confidence: 'tinggi'
      };
      updateCount++;
      
      if (Math.abs(oldTotal - jumlah) > 10) {
        console.log(`  [UPDATE] ${targetKec}/${desaName}: ${oldTotal} -> ${jumlah} ha`);
      }
    } else {
      // Buat entry baru
      const newEntry = {
        desa: desaName.toUpperCase(),
        kecamatan: targetKec,
        lahanSawah: sawah,
        lahanBukanSawah: bukanSawah,
        jumlah: jumlah,
        tahun: 2023,
        rincian: st.rincian || {
          bukanSawah: 0,
          padangRumputSementara: 0,
          padangRumputPermanen: 0,
          belumDitanami: 0,
          tanamanTahunan: bukanSawah,
          kandangBangunan: 0
        },
        sumber: 'BPS ST2023',
        confidence: 'tinggi'
      };
      fallback.push(newEntry);
      addCount++;
      console.log(`  [ADD] ${targetKec}/${desaName}: ${jumlah} ha`);
    }
  });
}

console.log(`\nTotal diupdate: ${updateCount} desa`);
console.log(`Total ditambahkan: ${addCount} desa`);

// 5. Hapus entry duplikat (jaga yang pertama kali muncul)
const seen = new Set();
fallback = fallback.filter(entry => {
  const key = `${(entry.kecamatan || '').toLowerCase()}_${(entry.desa || '').toUpperCase()}`;
  if (seen.has(key)) {
    return false;
  }
  seen.add(key);
  return true;
});

console.log(`Total setelah hapus duplikat: ${fallback.length} desa`);

// 6. Simpan hasil
fs.writeFileSync(
  'I:/pertanian/pertanian-2/public/data/lahan-fallback.json',
  JSON.stringify(fallback, null, 2)
);
console.log('\n✅ File fallback sudah diperbarhi: public/data/lahan-fallback.json');

// 7. Perbaiki CKAN
console.log('\n=== PERBAIKAN CKAN ===');

const ckanRaw = fs.readFileSync('I:/pertanian/pertanian-2/lahan-ckan-merged.json', 'utf-8');
const ckan = JSON.parse(ckanRaw);

// Buat lookup untuk fallback
const fallbackMap = {};
fallback.forEach(d => {
  const key = `${(d.kecamatan || '').toLowerCase()}_${(d.desa || '').toUpperCase()}`;
  fallbackMap[key] = d;
});

let ckanFixedCount = 0;
const ckanFixed = ckan.map(entry => {
  const key = `${(entry.kecamatan || '').toLowerCase()}_${(entry.desa || '').toUpperCase()}`;
  const fbEntry = fallbackMap[key];
  
  let fixedEntry = { ...entry };
  let needsFix = false;
  
  // Cek apakah nilainya perlu diperbaiki (1000x)
  const currentValue = entry.jumlah || entry.jumlah_lahan || 0;
  const fallbackValue = fbEntry?.jumlah || 0;
  
  if (fallbackValue > 0 && currentValue > fallbackValue * 100) {
    needsFix = true;
    fixedEntry.lahanSawah = entry.lahanSawah / 1000;
    fixedEntry.lahanBukanSawah = entry.lahan_bukan_sawah / 1000;
    fixedEntry.jumlah = entry.jumlah / 1000;
    ckanFixedCount++;
  } else if (fallbackValue > 0) {
    // Gunakan data fallback jika lebih akurat
    fixedEntry.lahanSawah = fbEntry.lahanSawah;
    fixedEntry.lahanBukanSawah = fbEntry.lahanBukanSawah;
    fixedEntry.jumlah = fbEntry.jumlah;
    if (entry.jumlah !== fbEntry.jumlah) {
      ckanFixedCount++;
    }
  }
  
  fixedEntry.source = needsFix ? 'ckan-fixed-1000x' : 'ckan-bps-aligned';
  fixedEntry.confidence = fbEntry ? 'tinggi' : 'sedang';
  
  if (needsFix) {
    console.log(`  [FIX CKAN] ${entry.kecamatan}/${entry.desa}: ${currentValue} -> ${fixedEntry.jumlah}`);
  }
  
  return fixedEntry;
});

fs.writeFileSync(
  'I:/pertanian/pertanian-2/lahan-ckan-merged.json',
  JSON.stringify(ckanFixed, null, 2)
);
console.log(`\n✅ File CKAN sudah diperbaiki: lahan-ckan-merged.json`);
console.log(`Total CKAN yang diperbaiki: ${ckanFixedCount} entri`);

// 8. Summary akhir
console.log('\n=== RINGKASAN FINAL ===');
console.log(`Total desa di fallback: ${fallback.length}`);
console.log(`Kecamatan dalam fallback:`);
const kecSet = new Set(fallback.map(d => d.kecamatan));
kecSet.forEach(k => {
  const count = fallback.filter(d => d.kecamatan === k).length;
  const stCount = Object.entries(st2023All).filter(([k2]) => k2 === k.toLowerCase() || kecamatanMapping[k2] === k).length;
  console.log(`  ${k}: ${count} desa`);
});
