-- ============================================================================
-- Migrasi: 4 tabel baru (jalur deploy P0)
-- Tanggal: 2026-09-29
--
-- Tujuan: menambah 4 tabel yang dibutuhkan fitur publik + dasbor admin Excel
--         namun belum ada di DB produksi, TANPA menghapus data yang sudah ada.
--         Idempotent: semua statement memakai CREATE TABLE IF NOT EXISTS, jadi
--         aman dijalankan berulang kali (re-run = no-op untuk tabel yang sudah
--         ada).
--
-- Tabel yang dibuat:
--   1. kwt_kelompok_wanita_tani  Kewirausahaan: KWT/Pokdakan/Poklahsar/Pokmamas
--   2. komoditas_unggulan        Komoditas unggulan + varietas per kecamatan
--   3. nilai_ekonomi_tahunan     Nilai ekonomi per bidang/komoditas/tahun/triwulan
--                                (mungkin SUDAH ada di prod via
--                                 _tmp/create-ne-prod.sql 23 Sep -> no-op)
--   4. ltt_katam                 LTT + Kalender tanam
--
-- Prasyarat: tabel induk `kecamatan` HARUS sudah ada, karena tiga tabel memakai
--            FK kecamatan_id -> kecamatan(id). Di prod tabel ini sudah ada
--            (bagian dari 41 tabel inti), jadi FK langsung valid.
--
-- Database TIDAK di-hardcode (sengaja tanpa statement USE), mengikuti gaya
-- _tmp/create-ne-prod.sql. Pilih DB saat invokasi:
--   DEV  (DB sispertani, user root):
--     mysql -u root -p sispertani < database/migrations/2026-09-29_4-tabel-baru.sql
--   PROD (DB pertasis, user pertalit) - jalankan di server via plink/ssh:
--     mysql -u pertalit -p pertasis < 2026-09-29_4-tabel-baru.sql
--
-- DDL disalin dari database/schema.sql (sumber kebenaran) dan diubah dari
-- DROP TABLE + CREATE TABLE menjadi CREATE TABLE IF NOT EXISTS agar
-- non-destruktif terhadap data produksi.
-- ============================================================================

-- 1. Kewirausahaan: KWT, Pokdakan, Poklahsar, Pokmamas (bidang 7)
CREATE TABLE IF NOT EXISTS kwt_kelompok_wanita_tani (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nama_kelompok VARCHAR(150) NOT NULL,
  kecamatan_id TINYINT UNSIGNED NOT NULL,
  desa         VARCHAR(50)  NOT NULL,
  jenis        ENUM('KWT','Pokdakan','Poklahsar','Pokmamas') NOT NULL,
  jumlah_anggota SMALLINT UNSIGNED,
  produk_andalan VARCHAR(100),
  tahun_registrasi SMALLINT UNSIGNED,
  latitude     DECIMAL(10,8),
  longitude    DECIMAL(11,8),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_kwt (nama_kelompok, kecamatan_id, desa),
  KEY idx_kwt_jenis (jenis),
  KEY idx_kwt_kec (kecamatan_id),
  CONSTRAINT fk_kwt_kec FOREIGN KEY (kecamatan_id) REFERENCES kecamatan (id)
) ENGINE=InnoDB COMMENT='Kelompok Wanita Tani (KWT/Pokdakan/Poklahsar/Pokmamas)';

-- 2. Komoditas unggulan (bidang 1.1)
CREATE TABLE IF NOT EXISTS komoditas_unggulan (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  bidang        ENUM('Tanaman Pangan','Hortikultura','Perkebunan','Peternakan','Perikanan') NOT NULL,
  komoditas     VARCHAR(100) NOT NULL,
  varietas      VARCHAR(150) NOT NULL,
  kecamatan_id  TINYINT UNSIGNED NOT NULL,
  luas_lahan    DECIMAL(8,2),
  produktivitas DECIMAL(9,2),
  produksi      DECIMAL(10,2),
  ketersediaan_benih ENUM('Tersedia','Terbatas','Kurang','Tidak ada'),
  tahun         SMALLINT UNSIGNED,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_komoditas_bidang (bidang, komoditas),
  KEY idx_komoditas_kec (kecamatan_id),
  CONSTRAINT fk_komoditas_unggulan_kec FOREIGN KEY (kecamatan_id) REFERENCES kecamatan (id)
) ENGINE=InnoDB COMMENT='Komoditas unggulan dan varietas per kecamatan';

-- 3. Nilai ekonomi (bidang 2.2) - input dinas via dasbor admin (domain "ekonomi",
--    sheet "Nilai Ekonomi"); estimasi frontend (harga referensi) hanya fallback
--    saat tabel kosong. nilai_rp = volume x harga_produsen (generated - menegakkan
--    spesifikasi master S3 "Rp = Vol x Harga Produsen"). triwulan NULL = tahunan;
--    semester diturunkan dari gabungan triwulan (S1 = T1+T2, S2 = T3+T4).
CREATE TABLE IF NOT EXISTS nilai_ekonomi_tahunan (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  bidang         ENUM('pangan','hortikultura','perkebunan','peternakan','perikanan') NOT NULL,
  komoditas      VARCHAR(100) NOT NULL,
  satuan         VARCHAR(20) NOT NULL,
  tahun          SMALLINT UNSIGNED NOT NULL,
  triwulan       TINYINT UNSIGNED NULL,
  volume         DECIMAL(14,2) NOT NULL,
  harga_produsen DECIMAL(14,2) NOT NULL,
  nilai_rp       DECIMAL(16,2) GENERATED ALWAYS AS (volume * harga_produsen) STORED,
  sumber         VARCHAR(100) NOT NULL DEFAULT 'manual',
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_ekonomi_bidang (bidang, tahun),
  KEY idx_ekonomi_tahun (tahun)
) ENGINE=InnoDB COMMENT='Nilai ekonomi per bidang/komoditas/tahun/triwulan (input dinas; Rp = volume x harga_produsen)';

-- 4. LTT + Kalender tanam (bidang 1.3/6.4)
CREATE TABLE IF NOT EXISTS ltt_katam (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  komoditas   VARCHAR(100) NOT NULL,
  kecamatan_id TINYINT UNSIGNED NOT NULL,
  jenis       ENUM('LTT','Katam') NOT NULL,
  luas_rencana DECIMAL(8,2),
  luas_tanam   DECIMAL(8,2),
  luas_panen   DECIMAL(8,2),
  produksi_rencana DECIMAL(10,2),
  produksi_aktual DECIMAL(10,2),
  bulan_mulai  TINYINT UNSIGNED,
  bulan_panen  TINYINT UNSIGNED,
  tahun        SMALLINT UNSIGNED,
  sumber       VARCHAR(30),
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ltt_komoditas (komoditas, tahun),
  KEY idx_ltt_kec (kecamatan_id),
  CONSTRAINT fk_ltt_katam_kec FOREIGN KEY (kecamatan_id) REFERENCES kecamatan (id)
) ENGINE=InnoDB COMMENT='LTT dan Kalender tanam';

-- ============================================================================
-- Verifikasi (opsional) - jalankan manual setelah migrasi untuk memastikan
-- keempat tabel terbentuk:
--   SHOW TABLES LIKE 'kwt_kelompok_wanita_tani';
--   SHOW TABLES LIKE 'komoditas_unggulan';
--   SHOW TABLES LIKE 'nilai_ekonomi_tahunan';
--   SHOW TABLES LIKE 'ltt_katam';
-- ============================================================================
