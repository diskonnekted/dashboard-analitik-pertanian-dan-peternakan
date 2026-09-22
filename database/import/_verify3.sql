SELECT sumber, confidence, tahun, COUNT(*) FROM lahan_desa GROUP BY sumber, confidence, tahun ORDER BY tahun, sumber;
SELECT l.desa, l.tahun, l.confidence, l.sawah_ha, l.total_ha
FROM lahan_desa l JOIN kecamatan k ON k.id=l.kecamatan_id
WHERE k.nama='Karangkobar' AND l.desa='AMBAL';
