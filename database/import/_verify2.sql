SELECT k.nama, t.jenis, t.jumlah_ekor FROM ternak_flow t JOIN kecamatan k ON k.id=t.kecamatan_id WHERE t.arah='pengeluaran' AND t.tahun=2024 ORDER BY k.nama;
SELECT k.nama FROM kecamatan k LEFT JOIN padi_produksi p ON p.kecamatan_id=k.id WHERE p.id IS NULL;
SELECT k.nama, t.tahun FROM padi_produksi t JOIN kecamatan k ON k.id=t.kecamatan_id GROUP BY k.id, t.tahun HAVING COUNT(*)=1 ORDER BY k.nama LIMIT 10;
