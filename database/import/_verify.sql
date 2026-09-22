-- Padi: kec mana yang tahun terbarunya bukan 2024
SELECT k.nama, MAX(t.tahun) AS th_max, COUNT(*) AS baris
FROM padi_produksi t JOIN kecamatan k ON k.id = t.kecamatan_id
GROUP BY k.id HAVING th_max <> 2024;
SELECT COUNT(*) total, COUNT(DISTINCT kecamatan_id, tahun) grup FROM padi_produksi;
SELECT SUM(luas_panen_ha) luas2024, SUM(produksi_ton) prod2024 FROM padi_produksi WHERE tahun = 2024;

-- Lumbung: nilai asli
SELECT lumbung_kapasitas_ton FROM lumbung_pangan l JOIN kecamatan k ON k.id=l.kecamatan_id WHERE k.nama='Kalibening' ORDER BY tahun;

-- Lahan: contoh baris jumlah != sawah+bukan
SELECT l.desa, k.nama, l.tahun, l.sawah_ha, l.bukan_sawah_ha, l.total_ha
FROM lahan_desa l JOIN kecamatan k ON k.id=l.kecamatan_id
WHERE ABS(l.total_ha - (l.sawah_ha + l.bukan_sawah_ha)) > 0.001 LIMIT 5;
SELECT COUNT(*) FROM lahan_desa WHERE ABS(total_ha - (sawah_ha + bukan_sawah_ha)) > 0.001;

-- Pengeluaran ternak: tahun tersedia
SELECT arah, GROUP_CONCAT(DISTINCT tahun ORDER BY tahun) th FROM ternak_flow GROUP BY arah;

-- ternak_populasi kolom
SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='sispertani' AND TABLE_NAME='ternak_populasi';

-- Sawah-ladang: grup per kec-tahun dan jenis
SELECT COUNT(*) baris FROM padi_produksi;
SELECT jenis, COUNT(*) FROM padi_produksi GROUP BY jenis;
