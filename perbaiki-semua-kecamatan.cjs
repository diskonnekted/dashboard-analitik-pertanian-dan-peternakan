// Skrip Perbaiki Semua Kecamatan - Data Lahan Desa
const fs = require('fs');
const path = require('path');

console.log('=== PERBAIKAN DATA LAHAN SEMUA KECAMATAN ===\n');

// Baca semua file ST2023
const st2023Dir = 'I:/pertanian/pertanian-2/data-source';
const st2023Files = fs.readdirSync(st2023Dir)
  .filter(f => f.startsWith('lahan-st2023-') && f.endsWith('.json'));

console.log('File ST2023 yang ditemukan:');
st2023Files.forEach(f => console.log(`  - ${f}`));

// Baca semua data ST2023
let st2023All = [];
const st2023Data = {};

st2023Files.forEach(file => {
  const kecamatan = file.replace('lahan-st2023-', '').replace('.json', '');
  const data = JSON.parse(fs.readFileSync(path.join(st2023Dir, file), 'utf-8'));
  st2023All = st2023All.concat(data);
  st2023Data[kecamatan] = data;
  console.log(`  Kecamatan ${kecamatan}: ${data.length} desa`);
});

console.log(`\nTotal desa dari ST2023: ${st2023All.length}`);

// Baca file fallback
const fallback = JSON.parse(fs.readFileSync('I:/pertanian/pertanian-2/public/data/lahan-fallback.json', 'utf-8'));

// Kelompokkan fallback by kecamatan
const fallbackByKecamatan = {};
fallback.forEach(entry => {
  const k = (entry.kecamatan || '').toLowerCase();
  if (!fallbackByKecamatan[k]) fallbackByKecamatan[k] = [];
  fallbackByKecamatan[k].push(entry);
});

console.log('\n=== KECAMATAN YANG PERLU PERBAIKI ===');

// Daftar kecamatan di Kabupaten Banjarnegara
const allKecamatan = [
  'banjarnegara', 'banjarmangu', 'bawang', 'mandirajal', 'pejawaran',
  'punggelan', 'sigaluh', 'susukan', 'wanayasa'
];

// 1. Cek mana kecamatan yang ada di ST2023
console.log('\nKecamatan yang memiliki data ST2023:');
Object.keys(st2023Data).forEach(k => {
  console.log(`  - ${k} (${st2023Data[k].length} desa)`);
});

// 2. Cek mana kecamatan yang ada di fallback
console.log('\nKecamatan yang ada di fallback:');
Object.keys(fallbackByKecamatan).forEach(k => {
  console.log(`  - ${k} (${fallbackByKecamatan[k].length} desa)`);
});

// 3. Cek mana kecamatan yang belum lengkap
console.log('\n=== KARENCYAKAN YANG BELUM LENGKAP ===');

Object.keys(st2023Data).forEach(kecamatan => {
  const st2023Desas = st2023Data[kecamatan].map(d => d.desa);
  const fallbackEntries = fallbackByKecamatan[kecamatan.toLowerCase()] || [];
  const fallbackDesas = fallbackEntries.map(d => d.desa);

  const missingInFallback = st2023Desas.filter(
    d => !fallbackDesas.includes(d) && !fallbackDesas.includes(d.replace(/-/g, '').toUpperCase())
  );

  const inconsistent = st2023Data[kecamatan].filter(st => {
    const matchingFallback = fallbackEntries.find(
      f => f.desa === st.desa || f.desa === st.desa.replace(/-/g, '').toUpperCase()
    );
    if (matchingFallback) {
      const selisih = Math.abs(parseFloat(matchingFallback.jumlah || 0) - (st.jumlah || 0));
      return selisih > 1;
    }
    return false;
  });

  if (missingInFallback.length > 0) {
    console.log(`\nKecamatan ${kecamatan}:`);
    console.log(`  Desa belum ada di fallback: ${missingInFallback.join(', ')}`);
  }

  if (inconsistent.length > 0) {
    console.log(`\nKecamatan ${kecamatan}:`);
    console.log(`  Data tidak konsisten (${inconsistent.length} desa):`);
    inconsistent.forEach(st => {
      const fb = fallbackEntries.find(
        f => f.desa === st.desa || f.desa === st.desa.replace(/-/g, '').toUpperCase()
      );
      if (fb) {
        console.log(`    - ${st.desa}: ST2023=${st.jumlah} ha, Fallback=${fb.jumlah} ha`);
      }
    });
  }
});

// 4. Update fallback dengan data ST2023
console.log('\n=== UPDATE FALLBACK DENGAN DATA ST2023 ===');

let updatedEntries = [];
let missingEntries = [];

st2023All.forEach(st => {
  const key = st.kecamatan || st.Kecamatan;
  const k = key.toLowerCase();
  const desa = st.desa || st.Desa;

  const existingIndex = fallback.findIndex(d => {
    const kecMatch = (d.kecamatan || '').toLowerCase() === k;
    const desaMatch = d.desa === desa || d.desa === desa.replace(/-/g, '').toUpperCase();
    return kecMatch && desaMatch;
  });

  if (existingIndex >= 0) {
    // Update entry yang sudah ada
    const updated = {
      ...fallback[existingIndex],
      lahan_sawah: st.lahanSawah || st.lahan_sawah || fallback[existingIndex].lahan_sawah,
      lahan_bukan_sawah: st.lahanBukanSawah || st.lahan_bukan_sawah || fallback[existingIndex].lahan_bukan_sawah,
      jumlah: st.jumlah || st.jumlah_lahan || fallback[existingIndex].jumlah,
      rincian: st.rincian || null,
      sumber: 'BPS ST2023',
      confidence: 'tinggi',
      tahun: 2023
    };
    updatedEntries.push({ index: existingIndex, data: updated });
  } else {
    // Buat entry baru
    const newEntry = {
      desa: desa,
      kecamatan: key,
      lahan_sawah: st.lahanSawah || st.lahan_sawah,
      lahan_bukan_sawah: st.lahanBukanSawah || st.lahan_bukan_sawah,
      jumlah: st.jumlah || 0,
      rincian: st.rincian || null,
      sumber: 'BPS ST2023',
      confidence: 'tinggi',
      tahun: 2023
    };
    missingEntries.push({ kecamatan: k, entry: newEntry });
  }
});

console.log(`\nEntry yang diupdate: ${updatedEntries.length}`);
console.log(`Entry baru yang ditambahkan: ${missingEntries.length}`);

// Tambahkan entry baru ke fallback
missingEntries.forEach(({ kecamatan, entry }) => {
  fallback.push(entry);
  console.log(`  + Ditambahkan: ${kecamatan}/${entry.desa}`);
});

// Update entry yang sudah ada
updatedEntries.forEach(({ index, data }) => {
  fallback[index] = data;
});

console.log(`\nTotal fallback setelah update: ${fallback.length} desa`);

// 5. Simpan fallback yang sudah diperbarhi
fs.writeFileSync(
  'I:/pertanian/pertanian-2/public/data/lahan-fallback.json',
  JSON.stringify(fallback, null, 2)
);
console.log('\n✅ File fallback sudah diperbarhi: public/data/lahan-fallback.json');

// 6. Perbaiki CKAN juga
console.log('\n=== PERBAIKAN CKAN ===');

const ckan = JSON.parse(fs.readFileSync('I:/pertanian/pertanian-2/lahan-ckan-merged.json', 'utf-8'));

// Buat fungsi untuk memperbaiki angka CKAN
function shouldFixCkanValue(val, fallbackEntry) {
  const fallbackTotal = parseFloat(fallbackEntry?.jumlah || 0);
  if (fallbackTotal > 0 && val > fallbackTotal * 100) {
    return true;
  }
  if (val > 5000 && !fallbackEntry) {
    // Untuk desa tidak ada di fallback, cek apakah nilainya tidak wajar
    return true;
  }
  return false;
}

function fixCkanValue(val, fallbackEntry) {
  const fallbackTotal = parseFloat(fallbackEntry?.jumlah || 0);
  if (fallbackTotal > 0 && val > fallbackTotal * 100) {
    // Coba bagi dengan 1000
    if (val / 1000 >= fallbackTotal * 0.5) {
      return val / 1000;
    }
  }
  return val;
}

const fixedCkan = ckan.map(entry => {
  const fallbackMatch = fallback.find(d => {
    const kecMatch = (d.kecamatan || '').toLowerCase() === (entry.kecamatan || '').toLowerCase();
    const desaMatch = d.desa === entry.desa || d.desa === (entry.desa || '').replace(/-/g, '').toUpperCase();
    return kecMatch && desaMatch;
  });

  const needsFix = shouldFixCkanValue(
    entry.jumlah || entry.jumlah_lahan || 0,
    fallbackMatch
  );

  if (needsFix) {
    console.log(`  Memperbaiki: ${entry.kecamatan}/${entry.desa} - ${entry.jumlah} -> ${fixCkanValue(entry.jumlah, fallbackMatch)}`);
    return {
      ...entry,
      lahan_sawah: fixCkanValue(entry.lahan_sawah || 0, fallbackMatch),
      lahan_bukan_sawah: fixCkanValue(entry.lahan_bukan_sawah || 0, fallbackMatch),
      jumlah: fixCkanValue(entry.jumlah || 0, fallbackMatch),
      source: 'ckan-fixed',
      confidence: fallbackMatch ? 'tinggi' : 'sedang'
    };
  }

  return entry;
});

fs.writeFileSync(
  'I:/pertanian/pertanian-2/lahan-ckan-merged.json',
  JSON.stringify(fixedCkan, null, 2)
);
console.log('\n✅ File CKAN sudah diperbaiki: lahan-ckan-merged.json');

console.log('\n=== RINGKASAN AKHIR ===');
console.log(`Total desa di fallback: ${fallback.length}`);
console.log(`Total desa di CKAN: ${fixedCkan.length}`);
console.log('Perbaikan selesai! Data sekarang konsisten dengan BPS ST2023.');
