-- ============================================================================
-- SISPERTANI — Skema Database Utama (MySQL 8.0+)
-- Kabupaten Banjarnegara — Dashboard Pertanian
--
-- Sumber data: 42 CSV BPS/Distankan (public/14. Distankan KP),
--              5 JSON fallback (public/data), GeoJSON desa, snapshot CKAN.
--
-- Konvensi:
--   - Semua tabel InnoDB utf8mb4.
--   - Kolom `sumber` menandai asal baris:
--       'csv'           = import dari CSV lokal (sudah dikoreksi manual)
--       'json_fallback' = import dari JSON fallback CKAN (public/data/*.json)
--       'ckan'          = hasil sinkronisasi CKAN (fase berikutnya)
--       'manual'        = koreksi/entri manual
--     ATURAN SINKRON CKAN (fase sync): baris 'csv'/'manual' TIDAK boleh
--     ditimpa otomatis — banyak CSV sudah dikoreksi manual terhadap xlsx asli.
--   - Baris agregat "Jumlah" dari CSV TIDAK diimpor (dihitung via SUM/GROUP BY).
--   - Nilai "-" / kosong di CSV => NULL (bukan 0).
--   - Angka ribuan di CSV memakai koma (" 2,165 ") => dibersihkan saat import.
--   - Kolom nilai_ribu_rp menyimpan angka MENTAH sesuai sumber BPS, yaitu
--     dalam RIBU RUPIAH (mis. 163145 = Rp 163.145.000).
-- ============================================================================

CREATE DATABASE IF NOT EXISTS sispertani
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sispertani;

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- A. TABEL REFERENSI
-- ============================================================================

DROP TABLE IF EXISTS kecamatan;
CREATE TABLE kecamatan (
  id         TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nama       VARCHAR(50)  NOT NULL COMMENT 'Nama baku, mis. Purwanegara',
  nama_norm  VARCHAR(50)  NOT NULL COMMENT 'UPPERCASE untuk join',
  varian     JSON         NULL     COMMENT 'Daftar alias di sumber: ["Purwonegoro",...]',
  PRIMARY KEY (id),
  UNIQUE KEY uq_kecamatan_nama (nama),
  UNIQUE KEY uq_kecamatan_norm (nama_norm)
) ENGINE=InnoDB COMMENT='20 kecamatan Kab. Banjarnegara (dari peta_desa_v3.geojson)';

DROP TABLE IF EXISTS desa;
CREATE TABLE desa (
  id            SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  kecamatan_id  TINYINT UNSIGNED NOT NULL,
  nama          VARCHAR(80) NOT NULL COMMENT 'Nama asli dari GeoJSON, tanpa prefix Desa/Kelurahan',
  nama_norm     VARCHAR(80) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_desa (kecamatan_id, nama_norm),
  CONSTRAINT fk_desa_kec FOREIGN KEY (kecamatan_id) REFERENCES kecamatan (id)
) ENGINE=InnoDB COMMENT='278 desa/kelurahan dari peta_desa_v3.geojson (geometri tetap di file)';

-- ============================================================================
-- B. TABEL META (provenance & sinkronisasi)
-- ============================================================================

DROP TABLE IF EXISTS dataset_sumber;
CREATE TABLE dataset_sumber (
  id         TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  folder     VARCHAR(200) NOT NULL,
  mode       VARCHAR(10)  NULL COMMENT 'Tipe A/B/C/E/F hasil normalisasi',
  tahun_min  SMALLINT     NULL,
  tahun_max  SMALLINT     NULL,
  row_count  INT          NULL,
  file_csv   VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dataset_folder (folder)
) ENGINE=InnoDB COMMENT='Indeks 39 dataset Distankan (dari distankan-index.json)';

DROP TABLE IF EXISTS sync_log;
CREATE TABLE sync_log (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  dataset    VARCHAR(80)  NOT NULL COMMENT 'Nama logis dataset, mis. padi_produksi',
  sumber     VARCHAR(40)  NOT NULL COMMENT 'csv/json_fallback/ckan/manual',
  aksi       VARCHAR(20)  NOT NULL DEFAULT 'import' COMMENT 'import/sync/koreksi',
  baris      INT          NOT NULL DEFAULT 0,
  status     VARCHAR(10)  NOT NULL DEFAULT 'ok' COMMENT 'ok/warn/error',
  pesan      TEXT         NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_sync_dataset (dataset, created_at)
) ENGINE=InnoDB COMMENT='Jejak audit setiap import/sinkronisasi';

-- ============================================================================
-- C. TANAMAN PANGAN
-- ============================================================================

DROP TABLE IF EXISTS padi_produksi;
CREATE TABLE padi_produksi (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kecamatan_id  TINYINT UNSIGNED NOT NULL,
  tahun         SMALLINT UNSIGNED NOT NULL,
  jenis         ENUM('sawah','ladang') NOT NULL,
  luas_panen_ha DECIMAL(10,3) NULL,
  produksi_ton  DECIMAL(12,3) NULL,
  rata_ku_ha    DECIMAL(8,3)  NULL,
  sumber        ENUM('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (id),
  UNIQUE KEY uq_padi (kecamatan_id, tahun, jenis),
  KEY ix_padi_tahun (tahun),
  CONSTRAINT fk_padi_kec FOREIGN KEY (kecamatan_id) REFERENCES kecamatan (id)
) ENGINE=InnoDB COMMENT='Padi sawah & ladang per kecamatan per tahun (2018-2025)';

DROP TABLE IF EXISTS palawija_produksi;
CREATE TABLE palawija_produksi (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kecamatan_id  TINYINT UNSIGNED NOT NULL,
  tahun         SMALLINT UNSIGNED NOT NULL,
  komoditas     VARCHAR(30) NOT NULL COMMENT 'Jagung/Ubi Kayu/Kacang Tanah/Kedelai/Ubi Jalar/Kacang Hijau',
  luas_panen_ha DECIMAL(10,3) NULL,
  produksi_ton  DECIMAL(12,3) NULL,
  rata_ku_ha    DECIMAL(8,3)  NULL,
  sumber        ENUM('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (id),
  UNIQUE KEY uq_palawija (kecamatan_id, tahun, komoditas),
  KEY ix_palawija_tahun (tahun),
  CONSTRAINT fk_palawija_kec FOREIGN KEY (kecamatan_id) REFERENCES kecamatan (id)
) ENGINE=InnoDB COMMENT='Palawija dari 3 file gabungan (2 komoditas per file)';

-- ============================================================================
-- D. HORTIKULTURA
--    kelompok mengikuti file sumber BPS 1:1 (jujur terhadap sumber):
--      sayuran               = file sayuran per kecamatan
--      buah_tahunan          = file buah-buahan tahunan per kecamatan
--      sayuran_buah_semusim  = file gabungan kabupaten (sayur + buah semusim)
--      buah_sayuran_tahunan  = file gabungan kabupaten (buah + sayuran tahunan)
--      tanaman_hias          = file tanaman hias
--      biofarmaka            = file biofarmaka
-- ============================================================================

DROP TABLE IF EXISTS horti_luas;
CREATE TABLE horti_luas (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kecamatan_id  TINYINT UNSIGNED NOT NULL,
  kelompok      ENUM('sayuran','tanaman_hias','biofarmaka') NOT NULL,
  komoditas     VARCHAR(60) NOT NULL,
  tahun         SMALLINT UNSIGNED NOT NULL,
  nilai         DECIMAL(14,3) NULL,
  satuan        ENUM('ha','m2') NOT NULL,
  sumber        ENUM('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (id),
  UNIQUE KEY uq_horti_luas (kecamatan_id, kelompok, komoditas, tahun),
  KEY ix_horti_luas_komoditas (komoditas, tahun),
  CONSTRAINT fk_horti_luas_kec FOREIGN KEY (kecamatan_id) REFERENCES kecamatan (id)
) ENGINE=InnoDB COMMENT='Luas panen hortikultura per kecamatan (format wide CSV di-melt)';

DROP TABLE IF EXISTS horti_produksi;
CREATE TABLE horti_produksi (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kecamatan_id  TINYINT UNSIGNED NOT NULL,
  kelompok      ENUM('sayuran','buah_tahunan','tanaman_hias','biofarmaka') NOT NULL,
  komoditas     VARCHAR(60) NOT NULL,
  tahun         SMALLINT UNSIGNED NOT NULL,
  nilai         DECIMAL(14,3) NULL,
  satuan        ENUM('ton','tangkai') NOT NULL,
  sumber        ENUM('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (id),
  UNIQUE KEY uq_horti_prod (kecamatan_id, kelompok, komoditas, tahun),
  KEY ix_horti_prod_komoditas (komoditas, tahun),
  CONSTRAINT fk_horti_prod_kec FOREIGN KEY (kecamatan_id) REFERENCES kecamatan (id)
) ENGINE=InnoDB COMMENT='Produksi hortikultura per kecamatan';

DROP TABLE IF EXISTS horti_luas_kabupaten;
CREATE TABLE horti_luas_kabupaten (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kelompok   ENUM('sayuran_buah_semusim','tanaman_hias','biofarmaka') NOT NULL,
  komoditas  VARCHAR(60) NOT NULL,
  tahun      SMALLINT UNSIGNED NOT NULL,
  nilai      DECIMAL(14,3) NULL,
  satuan     ENUM('ha','m2') NOT NULL,
  sumber     ENUM('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (id),
  UNIQUE KEY uq_horti_luas_kab (kelompok, komoditas, tahun)
) ENGINE=InnoDB COMMENT='Luas panen hortikultura tingkat kabupaten (file "Menurut Jenis Tanaman")';

DROP TABLE IF EXISTS horti_produksi_kabupaten;
CREATE TABLE horti_produksi_kabupaten (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kelompok   ENUM('sayuran_buah_semusim','buah_sayuran_tahunan','tanaman_hias','biofarmaka') NOT NULL,
  komoditas  VARCHAR(60) NOT NULL,
  tahun      SMALLINT UNSIGNED NOT NULL,
  nilai      DECIMAL(14,3) NULL,
  satuan     ENUM('ton','tangkai') NOT NULL,
  sumber     ENUM('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (id),
  UNIQUE KEY uq_horti_prod_kab (kelompok, komoditas, tahun)
) ENGINE=InnoDB COMMENT='Produksi hortikultura tingkat kabupaten (file "Menurut Jenis Tanaman")';

-- ============================================================================
-- E. PERKEBUNAN
-- ============================================================================

DROP TABLE IF EXISTS perkebunan_areal;
CREATE TABLE perkebunan_areal (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kecamatan_id  TINYINT UNSIGNED NOT NULL,
  tanaman       VARCHAR(40) NOT NULL COMMENT 'Kelapa Sawit/Kelapa Dalam/Karet/Kopi Robusta/Kopi Arabica/Kakao/Tebu/Teh/Tembakau',
  tahun         SMALLINT UNSIGNED NOT NULL,
  luas_ha       DECIMAL(12,3) NULL,
  sumber        ENUM('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (id),
  UNIQUE KEY uq_kebun_areal (kecamatan_id, tanaman, tahun),
  KEY ix_kebun_areal_tahun (tahun),
  CONSTRAINT fk_kebun_areal_kec FOREIGN KEY (kecamatan_id) REFERENCES kecamatan (id)
) ENGINE=InnoDB COMMENT='Luas areal perkebunan 2017-2024 (format wide di-melt)';

DROP TABLE IF EXISTS perkebunan_produksi;
CREATE TABLE perkebunan_produksi (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kecamatan_id  TINYINT UNSIGNED NOT NULL,
  tanaman       VARCHAR(40) NOT NULL,
  tahun         SMALLINT UNSIGNED NOT NULL,
  produksi_ton  DECIMAL(12,3) NULL,
  sumber        ENUM('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (id),
  UNIQUE KEY uq_kebun_prod (kecamatan_id, tanaman, tahun),
  KEY ix_kebun_prod_tahun (tahun),
  CONSTRAINT fk_kebun_prod_kec FOREIGN KEY (kecamatan_id) REFERENCES kecamatan (id)
) ENGINE=InnoDB COMMENT='Produksi perkebunan 2017-2024 (tanpa Kopi Arabica — tidak ada di sumber)';

-- CATATAN: file areal TIDAK memuat blok ringkasan kabupaten (160 baris kecamatan
-- murni) — total kabupaten areal dihitung via SUM. Hanya file produksi yang
-- memuat blok JENIS (total resmi BPS), maka hanya produksi yang punya tabel
-- kabupaten terpisah.

DROP TABLE IF EXISTS perkebunan_produksi_kabupaten;
CREATE TABLE perkebunan_produksi_kabupaten (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  tanaman      VARCHAR(40) NOT NULL,
  tahun        SMALLINT UNSIGNED NOT NULL,
  produksi_ton DECIMAL(12,3) NULL,
  sumber       ENUM('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (id),
  UNIQUE KEY uq_kebun_prod_kab (tanaman, tahun)
) ENGINE=InnoDB COMMENT='Total resmi BPS dari blok JENIS di file sumber — BUKAN hasil SUM kecamatan';

-- ============================================================================
-- F. PETERNAKAN
-- ============================================================================

DROP TABLE IF EXISTS ternak_populasi;
CREATE TABLE ternak_populasi (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kecamatan_id  TINYINT UNSIGNED NOT NULL,
  kelompok      ENUM('besar','kecil','unggas') NOT NULL,
  jenis         VARCHAR(40) NOT NULL COMMENT 'Sapi/Kerbau/Kuda/Kambing/Domba/Babi/Kelinci/Ayam Kampung/...',
  tahun         SMALLINT UNSIGNED NOT NULL,
  jumlah_ekor   DECIMAL(14,3) NULL COMMENT 'DECIMAL: sumber BPS pernah memuat desimal (kasus Domba 2021)',
  sumber        ENUM('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (id),
  UNIQUE KEY uq_ternak_pop (kecamatan_id, kelompok, jenis, tahun),
  KEY ix_ternak_pop_tahun (tahun),
  CONSTRAINT fk_ternak_pop_kec FOREIGN KEY (kecamatan_id) REFERENCES kecamatan (id)
) ENGINE=InnoDB COMMENT='Populasi ternak besar/kecil/unggas per kecamatan';

DROP TABLE IF EXISTS ternak_daging;
CREATE TABLE ternak_daging (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kecamatan_id  TINYINT UNSIGNED NOT NULL,
  kelompok      ENUM('ternak','unggas') NOT NULL,
  jenis         VARCHAR(40) NOT NULL,
  tahun         SMALLINT UNSIGNED NOT NULL,
  produksi_kg   DECIMAL(14,3) NULL,
  sumber        ENUM('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (id),
  UNIQUE KEY uq_ternak_daging (kecamatan_id, kelompok, jenis, tahun),
  CONSTRAINT fk_ternak_daging_kec FOREIGN KEY (kecamatan_id) REFERENCES kecamatan (id)
) ENGINE=InnoDB COMMENT='Produksi daging ternak & unggas. Unggas hanya 2 jenis (Ayam Ras Layer, Ayam Kampung) — label Itik di sumber tidak valid';

DROP TABLE IF EXISTS ternak_telur;
CREATE TABLE ternak_telur (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kecamatan_id  TINYINT UNSIGNED NOT NULL,
  jenis         VARCHAR(40) NOT NULL COMMENT 'Ayam Ras Layer / Ayam Kampung (dinormalisasi dari Ras Layer/Kampung)',
  tahun         SMALLINT UNSIGNED NOT NULL,
  produksi_kg   DECIMAL(14,3) NULL,
  sumber        ENUM('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (id),
  UNIQUE KEY uq_ternak_telur (kecamatan_id, jenis, tahun),
  CONSTRAINT fk_ternak_telur_kec FOREIGN KEY (kecamatan_id) REFERENCES kecamatan (id)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS ternak_susu_kulit;
CREATE TABLE ternak_susu_kulit (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kecamatan_id  TINYINT UNSIGNED NOT NULL,
  jenis         VARCHAR(60) NOT NULL COMMENT 'Sapi/Kerbau atau Kambing/Domba (grup sesuai sumber)',
  tahun         SMALLINT UNSIGNED NOT NULL,
  nilai         DECIMAL(14,3) NULL,
  catatan       VARCHAR(120) NULL COMMENT 'Sumber BPS tidak memisahkan kulit (lembar) vs susu (liter) di file ini',
  sumber        ENUM('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (id),
  UNIQUE KEY uq_ternak_susukulit (kecamatan_id, jenis, tahun),
  CONSTRAINT fk_ternak_susukulit_kec FOREIGN KEY (kecamatan_id) REFERENCES kecamatan (id)
) ENGINE=InnoDB COMMENT='File sumber ambigu (1 kolom per grup ternak) — lihat README';

DROP TABLE IF EXISTS ternak_pemotongan;
CREATE TABLE ternak_pemotongan (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kecamatan_id  TINYINT UNSIGNED NOT NULL,
  lokasi        ENUM('rph_pemerintah','luar_rph') NOT NULL,
  jenis         VARCHAR(40) NOT NULL,
  tahun         SMALLINT UNSIGNED NOT NULL,
  jumlah_ekor   DECIMAL(14,3) NULL,
  sumber        ENUM('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (id),
  UNIQUE KEY uq_ternak_potong (kecamatan_id, lokasi, jenis, tahun),
  CONSTRAINT fk_ternak_potong_kec FOREIGN KEY (kecamatan_id) REFERENCES kecamatan (id)
) ENGINE=InnoDB COMMENT='Pemotongan di RPH pemerintah & perkiraan di luar RPH';

DROP TABLE IF EXISTS ternak_flow;
CREATE TABLE ternak_flow (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kecamatan_id  TINYINT UNSIGNED NOT NULL,
  arah          ENUM('pemasukan','pengeluaran') NOT NULL,
  jenis         VARCHAR(40) NOT NULL,
  tahun         SMALLINT UNSIGNED NOT NULL,
  jumlah_ekor   DECIMAL(14,3) NULL,
  sumber        ENUM('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (id),
  UNIQUE KEY uq_ternak_flow (kecamatan_id, arah, jenis, tahun),
  CONSTRAINT fk_ternak_flow_kec FOREIGN KEY (kecamatan_id) REFERENCES kecamatan (id)
) ENGINE=InnoDB COMMENT='Pemasukan/pengeluaran ternak potong antar kabupaten';

-- ============================================================================
-- G. PERIKANAN
-- ============================================================================

DROP TABLE IF EXISTS ikan_budidaya;
CREATE TABLE ikan_budidaya (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kecamatan_id   TINYINT UNSIGNED NOT NULL,
  jenis_budidaya VARCHAR(60) NOT NULL COMMENT 'Pembesaran / Karamba Jaring Apung / Minapadi Tumpang Sari',
  tahun          SMALLINT UNSIGNED NOT NULL,
  produksi_kg    DECIMAL(14,3) NULL,
  nilai_ribu_rp  DECIMAL(16,2) NULL COMMENT 'MENTAH sesuai sumber: RIBU rupiah (163145 = Rp 163,145 jt)',
  sumber         ENUM('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (id),
  UNIQUE KEY uq_ikan_budidaya (kecamatan_id, jenis_budidaya, tahun),
  CONSTRAINT fk_ikan_budidaya_kec FOREIGN KEY (kecamatan_id) REFERENCES kecamatan (id)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS ikan_tangkap;
CREATE TABLE ikan_tangkap (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kecamatan_id   TINYINT UNSIGNED NOT NULL,
  jenis_alat     VARCHAR(60) NOT NULL COMMENT 'Jala Tebar/Pancing/Jaring Ingsang/Lainnya',
  tahun          SMALLINT UNSIGNED NOT NULL,
  produksi_kg    DECIMAL(14,3) NULL,
  nilai_ribu_rp  DECIMAL(16,2) NULL,
  sumber         ENUM('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (id),
  UNIQUE KEY uq_ikan_tangkap (kecamatan_id, jenis_alat, tahun),
  CONSTRAINT fk_ikan_tangkap_kec FOREIGN KEY (kecamatan_id) REFERENCES kecamatan (id)
) ENGINE=InnoDB COMMENT='Perikanan tangkap menurut jenis penangkapan (48 sel terverifikasi vs xlsx)';

DROP TABLE IF EXISTS ikan_tangkap_perairan_umum;
CREATE TABLE ikan_tangkap_perairan_umum (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kecamatan_id   TINYINT UNSIGNED NOT NULL,
  tahun          SMALLINT UNSIGNED NOT NULL,
  produksi_kg    DECIMAL(14,3) NULL,
  nilai_ribu_rp  DECIMAL(16,2) NULL,
  sumber         ENUM('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (id),
  UNIQUE KEY uq_ikan_pu (kecamatan_id, tahun),
  CONSTRAINT fk_ikan_pu_kec FOREIGN KEY (kecamatan_id) REFERENCES kecamatan (id)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS ikan_obyek_penangkapan;
CREATE TABLE ikan_obyek_penangkapan (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kecamatan_id  TINYINT UNSIGNED NOT NULL,
  obyek         VARCHAR(40) NOT NULL COMMENT 'Perairan Umum Sungai / Perairan Umum Waduk',
  arah          ENUM('total','sendiri','lain_daerah') NOT NULL DEFAULT 'total',
  tahun         SMALLINT UNSIGNED NOT NULL,
  produksi_kg   DECIMAL(14,3) NULL,
  sumber        ENUM('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (id),
  UNIQUE KEY uq_ikan_obyek (kecamatan_id, obyek, arah, tahun),
  CONSTRAINT fk_ikan_obyek_kec FOREIGN KEY (kecamatan_id) REFERENCES kecamatan (id)
) ENGINE=InnoDB COMMENT='Header sumber hasil flatten BPS; kolom dipetakan posisional — lihat README';

DROP TABLE IF EXISTS ikan_benih;
CREATE TABLE ikan_benih (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kecamatan_id  TINYINT UNSIGNED NOT NULL,
  arah          ENUM('sendiri','lain_daerah') NOT NULL,
  tahun         SMALLINT UNSIGNED NOT NULL,
  jumlah_ekor   DECIMAL(16,2) NULL COMMENT 'DECIMAL: sumber memuat desimal (912317.75)',
  sumber        ENUM('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (id),
  UNIQUE KEY uq_ikan_benih (kecamatan_id, arah, tahun),
  CONSTRAINT fk_ikan_benih_kec FOREIGN KEY (kecamatan_id) REFERENCES kecamatan (id)
) ENGINE=InnoDB COMMENT='Distribusi benih ikan';

DROP TABLE IF EXISTS ikan_minapadi;
CREATE TABLE ikan_minapadi (
  id                       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kecamatan_id             TINYINT UNSIGNED NOT NULL,
  tahun                    SMALLINT UNSIGNED NOT NULL,
  produksi_kg              DECIMAL(14,3) NULL,
  dipelihara_sendiri_kg    DECIMAL(14,3) NULL,
  dijual_lain_daerah_kg    DECIMAL(14,3) NULL,
  produksi_tambahan_kg     DECIMAL(14,3) NULL COMMENT 'Kolom "Produksi" kedua di sumber (ambigu) — disimpan apa adanya',
  bbi_produksi_kg          DECIMAL(14,3) NULL COMMENT 'Hasil Obyek Balai Benih Ikan (BBI)',
  bbi_dipelihara_sendiri   DECIMAL(14,3) NULL,
  sumber         ENUM('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (id),
  UNIQUE KEY uq_ikan_minapadi (kecamatan_id, tahun),
  CONSTRAINT fk_ikan_minapadi_kec FOREIGN KEY (kecamatan_id) REFERENCES kecamatan (id)
) ENGINE=InnoDB COMMENT='Header sumber hasil flatten BPS; dipetakan posisional — lihat README';

DROP TABLE IF EXISTS ikan_waduk;
CREATE TABLE ikan_waduk (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kecamatan_id  TINYINT UNSIGNED NOT NULL,
  tahun         SMALLINT UNSIGNED NOT NULL,
  luas_ha       DECIMAL(12,3) NULL,
  produksi_kg   DECIMAL(14,3) NULL,
  sumber        ENUM('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (id),
  UNIQUE KEY uq_ikan_waduk (kecamatan_id, tahun),
  CONSTRAINT fk_ikan_waduk_kec FOREIGN KEY (kecamatan_id) REFERENCES kecamatan (id)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS ikan_kolam;
CREATE TABLE ikan_kolam (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kecamatan_id  TINYINT UNSIGNED NOT NULL,
  tahun         SMALLINT UNSIGNED NOT NULL,
  luas_ha       DECIMAL(12,3) NULL,
  produksi_kg   DECIMAL(14,3) NULL,
  luas_tambahan DECIMAL(12,3) NULL COMMENT 'Kolom "Luas" kedua di sumber (ambigu) — disimpan apa adanya',
  sumber        ENUM('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (id),
  UNIQUE KEY uq_ikan_kolam (kecamatan_id, tahun),
  CONSTRAINT fk_ikan_kolam_kec FOREIGN KEY (kecamatan_id) REFERENCES kecamatan (id)
) ENGINE=InnoDB COMMENT='Header sumber ambigu ("Jenis Kolam Luas"/"Produksi"/"Luas") — lihat README';

DROP TABLE IF EXISTS ikan_pemeliharaan;
CREATE TABLE ikan_pemeliharaan (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kecamatan_id  TINYINT UNSIGNED NOT NULL,
  tempat        VARCHAR(60) NOT NULL COMMENT 'Kolam Pembesaran Ikan/Jaring Karamba Apung/Mina Padi Penyelang/Mina Padi Tumpang sari',
  tahun         SMALLINT UNSIGNED NOT NULL,
  luas_ha       DECIMAL(12,3) NULL,
  produksi_kg   DECIMAL(14,3) NULL,
  sumber        ENUM('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (id),
  UNIQUE KEY uq_ikan_peliharaan (kecamatan_id, tempat, tahun),
  CONSTRAINT fk_ikan_peliharaan_kec FOREIGN KEY (kecamatan_id) REFERENCES kecamatan (id)
) ENGINE=InnoDB COMMENT='Dari file "...Jenis Tempat Pemeliharaan" (versi header bersih)';

-- ============================================================================
-- H. LAHAN & LUMBUNG PANGAN
-- ============================================================================

DROP TABLE IF EXISTS lahan_penggunaan;
CREATE TABLE lahan_penggunaan (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kategori   VARCHAR(120) NOT NULL COMMENT 'Mis. "I. Lahan sawah", "a. Tegal/kebun" — string asli sumber',
  tahun      SMALLINT UNSIGNED NOT NULL,
  luas_ha    DECIMAL(12,3) NULL,
  sumber     ENUM('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (id),
  UNIQUE KEY uq_lahan_guna (kategori, tahun)
) ENGINE=InnoDB COMMENT='Penggunaan lahan tingkat kabupaten (2014+)';

DROP TABLE IF EXISTS lahan_desa;
CREATE TABLE lahan_desa (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kecamatan_id     TINYINT UNSIGNED NOT NULL,
  desa             VARCHAR(80) NOT NULL,
  desa_norm        VARCHAR(80) NOT NULL,
  tahun            SMALLINT UNSIGNED NOT NULL,
  sawah_ha         DECIMAL(10,3) NULL,
  bukan_sawah_ha   DECIMAL(10,3) NULL,
  total_ha         DECIMAL(10,3) NULL,
  sumber_json      VARCHAR(60)  NULL COMMENT 'Field "sumber" dari JSON fallback (mis. fallback-manual)',
  confidence       VARCHAR(20)  NULL,
  sumber           ENUM('json_fallback','ckan','manual') NOT NULL DEFAULT 'json_fallback',
  PRIMARY KEY (id),
  UNIQUE KEY uq_lahan_desa (kecamatan_id, desa_norm, tahun),
  KEY ix_lahan_desa_norm (desa_norm),
  CONSTRAINT fk_lahan_desa_kec FOREIGN KEY (kecamatan_id) REFERENCES kecamatan (id)
) ENGINE=InnoDB COMMENT='Lahan sawah/bukan sawah per desa (CKAN LahanDesa + fallback lokal)';

DROP TABLE IF EXISTS lumbung_pangan;
CREATE TABLE lumbung_pangan (
  id                         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kecamatan_id               TINYINT UNSIGNED NOT NULL,
  tahun                      SMALLINT UNSIGNED NOT NULL,
  lumbung_unit               INT          NULL,
  lumbung_kapasitas_ton      DECIMAL(10,3) NULL,
  gudang_luas_m2             DECIMAL(10,3) NULL,
  gudang_kapasitas_ton_bulan DECIMAL(10,3) NULL,
  sumber        ENUM('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (id),
  UNIQUE KEY uq_lumbung (kecamatan_id, tahun),
  CONSTRAINT fk_lumbung_kec FOREIGN KEY (kecamatan_id) REFERENCES kecamatan (id)
) ENGINE=InnoDB COMMENT='Sudah dikoreksi 9 sel vs xlsx asli (Kalibening 9.176 dst) — jangan timpa CKAN';

-- ============================================================================
-- I. EKONOMI (snapshot CKAN/BPS — sumber bukan Distankan)
-- ============================================================================

DROP TABLE IF EXISTS pasar;
CREATE TABLE pasar (
  id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  jenis   VARCHAR(40) NOT NULL COMMENT 'Sesuai sumber: Umum/Hewan/Buah/Ikan',
  tahun   SMALLINT UNSIGNED NOT NULL,
  jumlah  SMALLINT NULL,
  sumber  ENUM('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (id),
  UNIQUE KEY uq_pasar (jenis, tahun)
) ENGINE=InnoDB COMMENT='Jumlah pasar menurut jenis (Disperindag via CKAN, 2016-2025)';

DROP TABLE IF EXISTS inflasi;
CREATE TABLE inflasi (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  wilayah     VARCHAR(40) NOT NULL COMMENT 'Kolom "Pembanding" sumber: Banjarnegara/Cilacap/Purbalingga/Jawa Tengah/Nasional/...',
  tahun       SMALLINT UNSIGNED NOT NULL,
  inflasi_pct DECIMAL(6,2) NULL,
  sumber      ENUM('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (id),
  UNIQUE KEY uq_inflasi (wilayah, tahun)
) ENGINE=InnoDB COMMENT='Inflasi tahunan BPS (2018-2024), delimiter sumber titik-koma';

-- ============================================================================
-- J. KELEMBAGAAN & SENSUS (JSON fallback)
-- ============================================================================

DROP TABLE IF EXISTS kelompok_tani;
CREATE TABLE kelompok_tani (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kecamatan_id        TINYINT UNSIGNED NOT NULL,
  desa                VARCHAR(80) NOT NULL,
  desa_norm           VARCHAR(80) NOT NULL,
  tahun               SMALLINT UNSIGNED NOT NULL,
  kelompok_tani       INT NULL,
  anggota_tani        INT NULL,
  kelompok_perikanan  INT NULL,
  anggota_perikanan   INT NULL,
  gapoktan            INT NULL,
  anggota_gapoktan    INT NULL,
  sumber              ENUM('json_fallback','ckan','manual') NOT NULL DEFAULT 'json_fallback',
  PRIMARY KEY (id),
  UNIQUE KEY uq_poktan (kecamatan_id, desa_norm, tahun),
  KEY ix_poktan_norm (desa_norm),
  CONSTRAINT fk_poktan_kec FOREIGN KEY (kecamatan_id) REFERENCES kecamatan (id)
) ENGINE=InnoDB COMMENT='Sudah termasuk 4 koreksi manual (Penarusan Wetan, Bandingan, Balun, Parakan)';

DROP TABLE IF EXISTS kelompok_tani_hutan;
CREATE TABLE kelompok_tani_hutan (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kecamatan_id  TINYINT UNSIGNED NOT NULL,
  desa          VARCHAR(80) NOT NULL,
  desa_norm     VARCHAR(80) NOT NULL,
  tahun         SMALLINT UNSIGNED NOT NULL COMMENT 'Snapshot SIMLUH (2026) — jangan dicampur ke seri tahunan',
  kth           INT NULL,
  kth_pemula    INT NULL,
  kth_madya     INT NULL,
  kth_utama     INT NULL,
  sumber        ENUM('json_fallback','manual') NOT NULL DEFAULT 'json_fallback',
  PRIMARY KEY (id),
  UNIQUE KEY uq_kth (kecamatan_id, desa_norm, tahun),
  CONSTRAINT fk_kth_kec FOREIGN KEY (kecamatan_id) REFERENCES kecamatan (id)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS kth_detail;
CREATE TABLE kth_detail (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kelompok_tani_hutan_id INT UNSIGNED NOT NULL,
  nama_kelompok         VARCHAR(120) NOT NULL,
  no_register           VARCHAR(80)  NULL,
  tanggal_berdiri       VARCHAR(20)  NULL COMMENT 'Format sumber dd-mm-yyyy, disimpan mentah',
  kelas                 VARCHAR(20)  NULL COMMENT 'Pemula/Madya/Utama',
  alamat                VARCHAR(255) NULL,
  ketua                 VARCHAR(100) NULL,
  PRIMARY KEY (id),
  KEY ix_kth_detail_induk (kelompok_tani_hutan_id),
  CONSTRAINT fk_kth_detail_induk FOREIGN KEY (kelompok_tani_hutan_id)
    REFERENCES kelompok_tani_hutan (id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Rincian kelompok tani hutan (SIMLUH)';

DROP TABLE IF EXISTS st2023_desa;
CREATE TABLE st2023_desa (
  id                       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  kecamatan_id             TINYINT UNSIGNED NOT NULL,
  desa                     VARCHAR(80) NOT NULL,
  desa_norm                VARCHAR(80) NOT NULL,
  rumah_tangga_petani      INT NULL,
  petani                   INT NULL,
  rt_anggota_kelompok      INT NULL,
  rt_bukan_anggota_kelompok INT NULL,
  rtup                     INT NULL COMMENT 'Rumah Tangga Usaha Pertanian',
  rt_perikanan             INT NULL,
  rt_perikanan_budidaya    INT NULL,
  rt_perikanan_tangkap     INT NULL,
  ternak                   JSON NULL COMMENT 'Record jenis->jumlah, key fleksibel (sapiPotong, merpati, ...)',
  sumber_teks              VARCHAR(200) NULL,
  sumber                   ENUM('json_fallback','manual') NOT NULL DEFAULT 'json_fallback',
  PRIMARY KEY (id),
  UNIQUE KEY uq_st2023_desa (kecamatan_id, desa_norm),
  CONSTRAINT fk_st2023_kec FOREIGN KEY (kecamatan_id) REFERENCES kecamatan (id)
) ENGINE=InnoDB COMMENT='Sensus Pertanian 2023 per desa (hasil re-ekstraksi PDF, 0 selisih)';

-- ============================================================================
-- K. RENSTRA (diisi Fase 2 — saat ini target masih hardcoded di renstra.tsx)
-- ============================================================================

DROP TABLE IF EXISTS renstra_target;
CREATE TABLE renstra_target (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  indikator      VARCHAR(120) NOT NULL,
  satuan         VARCHAR(30)  NOT NULL,
  target         DECIMAL(16,2) NOT NULL,
  tahun_target   SMALLINT UNSIGNED NOT NULL DEFAULT 2029,
  sumber_dokumen VARCHAR(120) NULL COMMENT 'mis. renstra.pdf Tabel 4.1',
  sumber         ENUM('manual') NOT NULL DEFAULT 'manual',
  PRIMARY KEY (id),
  UNIQUE KEY uq_renstra (indikator, tahun_target)
) ENGINE=InnoDB COMMENT='Target Renstra Distankan — kosong sampai Fase 2';

-- ============================================================================
-- L. BANTUAN PEMERINTAH (input manual admin — pengganti Sanity Content Lake)
-- Data diinput via dasbor admin (/admin) — import/export Excel.
-- ============================================================================

DROP TABLE IF EXISTS bantuan_program;
CREATE TABLE bantuan_program (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nama             VARCHAR(255) NOT NULL,
  sumber_dana      VARCHAR(10)  NOT NULL COMMENT 'APBD | APBN',
  tahun_anggaran   SMALLINT UNSIGNED NOT NULL,
  nilai_rupiah     DECIMAL(18,2) NOT NULL DEFAULT 0,
  sektor           VARCHAR(100) NOT NULL,
  penerima_jumlah  INT UNSIGNED NOT NULL DEFAULT 0,
  penerima_jenis   VARCHAR(100) NOT NULL DEFAULT '',
  dampak_level     VARCHAR(10)  NOT NULL DEFAULT 'Sedang' COMMENT 'Tinggi | Sedang | Rendah',
  dampak_catatan   TEXT NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_bprogram (nama, sumber_dana, tahun_anggaran)
) ENGINE=InnoDB COMMENT='Program bantuan pemerintah (input manual admin Distan)';

DROP TABLE IF EXISTS bantuan_alokasi;
CREATE TABLE bantuan_alokasi (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  tahun        SMALLINT UNSIGNED NOT NULL,
  apbd_miliar  DECIMAL(14,2) NOT NULL DEFAULT 0,
  apbn_miliar  DECIMAL(14,2) NOT NULL DEFAULT 0,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_balokasi (tahun)
) ENGINE=InnoDB COMMENT='Alokasi anggaran bantuan per tahun (miliar Rp)';

DROP TABLE IF EXISTS bantuan_korelasi;
CREATE TABLE bantuan_korelasi (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  sektor                VARCHAR(100) NOT NULL,
  bantuan_miliar        DECIMAL(14,2) NOT NULL DEFAULT 0,
  kenaikan_produksi_pct DECIMAL(8,2)  NOT NULL DEFAULT 0,
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_bkorelasi (sektor)
) ENGINE=InnoDB COMMENT='Korelasi bantuan vs kenaikan produksi per sektor';

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- SEED: varian nama kecamatan (untuk dokumentasi; resolver ada di lib.mjs)
-- 20 kecamatan diisi oleh import/ref.mjs dari GeoJSON (urut alfabetis agar id stabil)
-- ============================================================================
