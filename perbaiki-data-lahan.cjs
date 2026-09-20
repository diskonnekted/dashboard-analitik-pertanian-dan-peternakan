// Skrip Perbaikan Data Lahan Desa
// Memperbaiki data CKAN (angka 1000x) dan menambahkan rincian ST2023 ke fallback

const fs = require('fs');
const path = require('path');

// 1. Baca semua file data
console.log('=== SKRIP PERBAIKAN DATA LAHAN DESA ===\n');

const fallbackPath = 'I:/pertanian/pertanian-2/public/data/lahan-fallback.json';
const ckanPath = 'I:/pertanian/pertanian-2/lahan-ckan-merged.json';

const lahanFallback = JSON.parse(fs.readFileSync(fallbackPath, 'utf-8'));
const lahanCkan = JSON.parse(fs.readFileSync(ckanPath, 'utf-8'));

// 2. Buat fungsi untuk memperbaiki angka CKAN yang salah (1000x)
function isAngkaSalahCKAN(entry) {
  // Jika lahan > 1000 ha dan tidak ada desa yang bisa memiliki lahan > 1000 ha
  // (desa di Banjarnegara tidak mungkin punya 170.000 ha lahan)
  if (entry.lahan_sawah > 1000 || entry.lahan_bukan_sawah > 1000 || entry.jumlah > 1000) {
    // Bandingkan dengan data fallback yang sama
    const fallback = lahanFallback.find(
      f => f.desa === entry.desa && f.kecamatan === entry.kecamatan
    );
    
    if (fallback) {
      // Jika nilai CKAN > 100x nilai fallback, kemungkinan salah
      if (entry.jumlah > fallback.jumlah * 100) {
        return true;
      }
    } else {
      // Untuk data yang tidak ada di fallback, cek apakah realistis
      // untuk kecamatan Banjarnegara (desa biasanya < 300 ha)
      if (entry.jumlah > 5000) {
        return true;
      }
    }
  }
  return false;
}

function perbaikiAngkaCKAN(val) {
  // Jika nilai > 1000, kemungkinan besar salah karena angka dikalikan 1000
  // atau menggunakan format yang salah
  if (val > 1000) {
    return val / 1000;
  }
  // Jika nilai > 100, cek apakah harus dibagi 10 (misal 6.0700 -> 6.07)
  if (val > 100 && val < 1000) {
    return val;
  }
  return val;
}

// 3. Perbaiki data CKAN
let perbaikanCount = 0;
const ckanDiperbaiki = lahanCkan.map(entry => {
  if (isAngkaSalahCKAN(entry)) {
    perbaikanCount++;
    console.log(`  [CKAN] Memperbaiki: ${entry.kecamatan}/${entry.desa}`);
    console.log(`    Sebelum: Sawah=${entry.lahan_sawah}, Bukan Sawah=${entry.lahan_bukan_sawah}, Jumlah=${entry.jumlah}`);
    
    // Perbaiki angka
    const fixedEntry = {
      ...entry,
      lahanSawah: perbaikiAngkaCKAN(entry.lahan_sawah),
      lahanBukanSawah: perbaikiAngkaCKAN(entry.lahan_bukan_sawah),
      jumlah: perbaikiAngkaCKAN(entry.jumlah)
    };
    
    console.log(`    Sesudah: Sawah=${fixedEntry.lahanSawah}, Bukan Sawah=${fixedEntry.lahanBukanSawah}, Jumlah=${fixedEntry.jumlah}`);
    
    // Gunakan data fallback jika tersedia dan lebih akurat
    const fallback = lahanFallback.find(
      f => f.desa === entry.desa && f.kecamatan === entry.kecamatan
    );
    
    if (fallback && fallback.tahun === 2025) {
      return {
        ...fallback,
        sumber: 'fallback',
        ckan_reference: {
          sawah: entry.lahan_sawah,
          bukan_sawah: entry.lahan_bukan_sawah,
          jumlah: entry.jumlah,
          tahun: entry.tahun
        }
      };
    }
    
    return fixedEntry;
  }
  return entry;
});

console.log(`\nTotal data CKAN yang diperbaiki: ${perbaikanCount}`);

// 4. Simpan data CKAN yang sudah diperbaiki
const outputPath = 'I:/pertanian/pertanian-2/lahan-ckan-fixed.json';
fs.writeFileSync(outputPath, JSON.stringify(ckanDiperbaiki, null, 2));
console.log(`\nFile CKAN yang diperbaiki disimpan: ${outputPath}`);

// 5. Baca data ST2023 untuk menambahkan rincian ke fallback
console.log('\n=== PENAMBAHAN RINCIAN ST2023 ===');

// Data ST2023 dari file
const st2023Files = [
  'I:/pertanian/pertanian-2/data-source/lahan-st2023-banjarmangu.json',
  'I:/pertanian/pertanian-2/data-source/lahan-st2023-sigaluh.json'
];

let st2023All = [];
st2023Files.forEach(file => {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    st2023All = st2023All.concat(data);
  } catch (e) {
    console.log(`  Warning: ${file} tidak ditemukan`);
  }
});

console.log(`  Data ST2023 yang ditemukan: ${st2023All.length} desa`);

// 6. Perbarui fallback dengan rincian ST2023
const fallbackUpdated = lahanFallback.map(entry => {
  const st = st2023All.find(
    s => s.desa === entry.desa && s.kecamatan.toLowerCase() === entry.kecamatan.toLowerCase()
  );
  
  if (st) {
    return {
      ...entry,
      rincian: st.rincian,
      sumber: 'BPS ST2023',
      confidence: 'tinggi'
    };
  }
  
  // Jika tidak ada ST2023, tandai sebagai perlu verifikasi
  return {
    ...entry,
    rincian: null,
    sumber: 'fallback-manual',
    confidence: 'rendah'
  };
});

// 7. Simpan fallback yang sudah diperbarui
const fallbackUpdatedPath = 'I:/pertanian/pertanian-2/public/data/lahan-fallback-updated.json';
fs.writeFileSync(fallbackUpdatedPath, JSON.stringify(fallbackUpdated, null, 2));
console.log(`\nFile fallback yang diperbarui disimpan: ${fallbackUpdatedPath}`);

console.log('\n=== RINGKASAN PERBAIKAN ===');
console.log(`1. CKAN: ${perbaikanCount} data diperbaiki dari angka 1000x`);
console.log(`2. Fallback: ${st2023All.length} desa ditambahkan rincian ST2023`);
console.log(`3. File output:`);
console.log(`   - ${outputPath}`);
console.log(`   - ${fallbackUpdatedPath}`);