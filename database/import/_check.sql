SELECT kelompok, GROUP_CONCAT(DISTINCT komoditas ORDER BY komoditas SEPARATOR ' | ') AS komoditas FROM horti_produksi GROUP BY kelompok;
SELECT kelompok, COUNT(DISTINCT komoditas) n FROM horti_produksi_kabupaten GROUP BY kelompok;
SELECT komoditas FROM horti_produksi_kabupaten WHERE kelompok='buah_sayuran_tahunan' GROUP BY komoditas ORDER BY komoditas;
SELECT DISTINCT komoditas FROM palawija_produksi ORDER BY komoditas;
SELECT DISTINCT tanaman FROM perkebunan_areal ORDER BY tanaman;
SELECT DISTINCT tanaman FROM perkebunan_produksi ORDER BY tanaman;
SELECT kelompok, GROUP_CONCAT(DISTINCT komoditas ORDER BY komoditas SEPARATOR ' | ') AS komoditas FROM horti_luas GROUP BY kelompok;
