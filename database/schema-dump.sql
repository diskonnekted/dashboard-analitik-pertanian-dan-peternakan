/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dataset_sumber` (
  `id` tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  `folder` varchar(200) NOT NULL,
  `mode` varchar(10) DEFAULT NULL COMMENT 'Tipe A/B/C/E/F hasil normalisasi',
  `tahun_min` smallint(6) DEFAULT NULL,
  `tahun_max` smallint(6) DEFAULT NULL,
  `row_count` int(11) DEFAULT NULL,
  `file_csv` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dataset_folder` (`folder`)
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Indeks 39 dataset Distankan (dari distankan-index.json)';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `desa` (
  `id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `kecamatan_id` tinyint(3) unsigned NOT NULL,
  `nama` varchar(80) NOT NULL COMMENT 'Nama asli dari GeoJSON, tanpa prefix Desa/Kelurahan',
  `nama_norm` varchar(80) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_desa` (`kecamatan_id`,`nama_norm`),
  CONSTRAINT `fk_desa_kec` FOREIGN KEY (`kecamatan_id`) REFERENCES `kecamatan` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=279 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='278 desa/kelurahan dari peta_desa_v3.geojson (geometri tetap di file)';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `horti_luas` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kecamatan_id` tinyint(3) unsigned NOT NULL,
  `kelompok` enum('sayuran','tanaman_hias','biofarmaka') NOT NULL,
  `komoditas` varchar(60) NOT NULL,
  `tahun` smallint(5) unsigned NOT NULL,
  `nilai` decimal(14,3) DEFAULT NULL,
  `satuan` enum('ha','m2') NOT NULL,
  `sumber` enum('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_horti_luas` (`kecamatan_id`,`kelompok`,`komoditas`,`tahun`),
  KEY `ix_horti_luas_komoditas` (`komoditas`,`tahun`),
  CONSTRAINT `fk_horti_luas_kec` FOREIGN KEY (`kecamatan_id`) REFERENCES `kecamatan` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2148 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Luas panen hortikultura per kecamatan (format wide CSV di-melt)';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `horti_luas_kabupaten` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kelompok` enum('sayuran_buah_semusim','tanaman_hias','biofarmaka') NOT NULL,
  `komoditas` varchar(60) NOT NULL,
  `tahun` smallint(5) unsigned NOT NULL,
  `nilai` decimal(14,3) DEFAULT NULL,
  `satuan` enum('ha','m2') NOT NULL,
  `sumber` enum('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_horti_luas_kab` (`kelompok`,`komoditas`,`tahun`)
) ENGINE=InnoDB AUTO_INCREMENT=390 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Luas panen hortikultura tingkat kabupaten (file "Menurut Jenis Tanaman")';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `horti_produksi` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kecamatan_id` tinyint(3) unsigned NOT NULL,
  `kelompok` enum('sayuran','buah_tahunan','tanaman_hias','biofarmaka') NOT NULL,
  `komoditas` varchar(60) NOT NULL,
  `tahun` smallint(5) unsigned NOT NULL,
  `nilai` decimal(14,3) DEFAULT NULL,
  `satuan` enum('ton','tangkai') NOT NULL,
  `sumber` enum('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_horti_prod` (`kecamatan_id`,`kelompok`,`komoditas`,`tahun`),
  KEY `ix_horti_prod_komoditas` (`komoditas`,`tahun`),
  CONSTRAINT `fk_horti_prod_kec` FOREIGN KEY (`kecamatan_id`) REFERENCES `kecamatan` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3298 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Produksi hortikultura per kecamatan';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `horti_produksi_kabupaten` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kelompok` enum('sayuran_buah_semusim','buah_sayuran_tahunan','tanaman_hias','biofarmaka') NOT NULL,
  `komoditas` varchar(60) NOT NULL,
  `tahun` smallint(5) unsigned NOT NULL,
  `nilai` decimal(14,3) DEFAULT NULL,
  `satuan` enum('ton','tangkai') NOT NULL,
  `sumber` enum('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_horti_prod_kab` (`kelompok`,`komoditas`,`tahun`)
) ENGINE=InnoDB AUTO_INCREMENT=553 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Produksi hortikultura tingkat kabupaten (file "Menurut Jenis Tanaman")';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ikan_benih` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kecamatan_id` tinyint(3) unsigned NOT NULL,
  `arah` enum('sendiri','lain_daerah') NOT NULL,
  `tahun` smallint(5) unsigned NOT NULL,
  `jumlah_ekor` decimal(16,2) DEFAULT NULL COMMENT 'DECIMAL: sumber memuat desimal (912317.75)',
  `sumber` enum('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ikan_benih` (`kecamatan_id`,`arah`,`tahun`),
  CONSTRAINT `fk_ikan_benih_kec` FOREIGN KEY (`kecamatan_id`) REFERENCES `kecamatan` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=279 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Distribusi benih ikan';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ikan_budidaya` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kecamatan_id` tinyint(3) unsigned NOT NULL,
  `jenis_budidaya` varchar(60) NOT NULL COMMENT 'Pembesaran / Karamba Jaring Apung / Minapadi Tumpang Sari',
  `tahun` smallint(5) unsigned NOT NULL,
  `produksi_kg` decimal(14,3) DEFAULT NULL,
  `nilai_ribu_rp` decimal(16,2) DEFAULT NULL COMMENT 'MENTAH sesuai sumber: RIBU rupiah (163145 = Rp 163,145 jt)',
  `sumber` enum('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ikan_budidaya` (`kecamatan_id`,`jenis_budidaya`,`tahun`),
  CONSTRAINT `fk_ikan_budidaya_kec` FOREIGN KEY (`kecamatan_id`) REFERENCES `kecamatan` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=325 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ikan_kolam` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kecamatan_id` tinyint(3) unsigned NOT NULL,
  `tahun` smallint(5) unsigned NOT NULL,
  `luas_ha` decimal(12,3) DEFAULT NULL,
  `produksi_kg` decimal(14,3) DEFAULT NULL,
  `luas_tambahan` decimal(12,3) DEFAULT NULL COMMENT 'Kolom "Luas" kedua di sumber (ambigu) — disimpan apa adanya',
  `sumber` enum('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ikan_kolam` (`kecamatan_id`,`tahun`),
  CONSTRAINT `fk_ikan_kolam_kec` FOREIGN KEY (`kecamatan_id`) REFERENCES `kecamatan` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=139 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Header sumber ambigu ("Jenis Kolam Luas"/"Produksi"/"Luas") — lihat README';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ikan_minapadi` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kecamatan_id` tinyint(3) unsigned NOT NULL,
  `tahun` smallint(5) unsigned NOT NULL,
  `produksi_kg` decimal(14,3) DEFAULT NULL,
  `dipelihara_sendiri_kg` decimal(14,3) DEFAULT NULL,
  `dijual_lain_daerah_kg` decimal(14,3) DEFAULT NULL,
  `produksi_tambahan_kg` decimal(14,3) DEFAULT NULL COMMENT 'Kolom "Produksi" kedua di sumber (ambigu) — disimpan apa adanya',
  `bbi_produksi_kg` decimal(14,3) DEFAULT NULL COMMENT 'Hasil Obyek Balai Benih Ikan (BBI)',
  `bbi_dipelihara_sendiri` decimal(14,3) DEFAULT NULL,
  `sumber` enum('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ikan_minapadi` (`kecamatan_id`,`tahun`),
  CONSTRAINT `fk_ikan_minapadi_kec` FOREIGN KEY (`kecamatan_id`) REFERENCES `kecamatan` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=130 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Header sumber hasil flatten BPS; dipetakan posisional — lihat README';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ikan_obyek_penangkapan` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kecamatan_id` tinyint(3) unsigned NOT NULL,
  `obyek` varchar(40) NOT NULL COMMENT 'Perairan Umum Sungai / Perairan Umum Waduk',
  `arah` enum('total','sendiri','lain_daerah') NOT NULL DEFAULT 'total',
  `tahun` smallint(5) unsigned NOT NULL,
  `produksi_kg` decimal(14,3) DEFAULT NULL,
  `sumber` enum('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ikan_obyek` (`kecamatan_id`,`obyek`,`arah`,`tahun`),
  CONSTRAINT `fk_ikan_obyek_kec` FOREIGN KEY (`kecamatan_id`) REFERENCES `kecamatan` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=553 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Header sumber hasil flatten BPS; kolom dipetakan posisional — lihat README';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ikan_pemeliharaan` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kecamatan_id` tinyint(3) unsigned NOT NULL,
  `tempat` varchar(60) NOT NULL COMMENT 'Kolam Pembesaran Ikan/Jaring Karamba Apung/Mina Padi Penyelang/Mina Padi Tumpang sari',
  `tahun` smallint(5) unsigned NOT NULL,
  `luas_ha` decimal(12,3) DEFAULT NULL,
  `produksi_kg` decimal(14,3) DEFAULT NULL,
  `sumber` enum('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ikan_peliharaan` (`kecamatan_id`,`tempat`,`tahun`),
  CONSTRAINT `fk_ikan_peliharaan_kec` FOREIGN KEY (`kecamatan_id`) REFERENCES `kecamatan` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=186 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Dari file "...Jenis Tempat Pemeliharaan" (versi header bersih)';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ikan_tangkap` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kecamatan_id` tinyint(3) unsigned NOT NULL,
  `jenis_alat` varchar(60) NOT NULL COMMENT 'Jala Tebar/Pancing/Jaring Ingsang/Lainnya',
  `tahun` smallint(5) unsigned NOT NULL,
  `produksi_kg` decimal(14,3) DEFAULT NULL,
  `nilai_ribu_rp` decimal(16,2) DEFAULT NULL,
  `sumber` enum('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ikan_tangkap` (`kecamatan_id`,`jenis_alat`,`tahun`),
  CONSTRAINT `fk_ikan_tangkap_kec` FOREIGN KEY (`kecamatan_id`) REFERENCES `kecamatan` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=463 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Perikanan tangkap menurut jenis penangkapan (48 sel terverifikasi vs xlsx)';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ikan_tangkap_perairan_umum` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kecamatan_id` tinyint(3) unsigned NOT NULL,
  `tahun` smallint(5) unsigned NOT NULL,
  `produksi_kg` decimal(14,3) DEFAULT NULL,
  `nilai_ribu_rp` decimal(16,2) DEFAULT NULL,
  `sumber` enum('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ikan_pu` (`kecamatan_id`,`tahun`),
  CONSTRAINT `fk_ikan_pu_kec` FOREIGN KEY (`kecamatan_id`) REFERENCES `kecamatan` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=121 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ikan_waduk` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kecamatan_id` tinyint(3) unsigned NOT NULL,
  `tahun` smallint(5) unsigned NOT NULL,
  `luas_ha` decimal(12,3) DEFAULT NULL,
  `produksi_kg` decimal(14,3) DEFAULT NULL,
  `sumber` enum('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ikan_waduk` (`kecamatan_id`,`tahun`),
  CONSTRAINT `fk_ikan_waduk_kec` FOREIGN KEY (`kecamatan_id`) REFERENCES `kecamatan` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=141 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inflasi` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `wilayah` varchar(40) NOT NULL COMMENT 'Kolom "Pembanding" sumber: Banjarnegara/Cilacap/Purbalingga/Jawa Tengah/Nasional/...',
  `tahun` smallint(5) unsigned NOT NULL,
  `inflasi_pct` decimal(6,2) DEFAULT NULL,
  `sumber` enum('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_inflasi` (`wilayah`,`tahun`)
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Inflasi tahunan BPS (2018-2024), delimiter sumber titik-koma';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `kecamatan` (
  `id` tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  `nama` varchar(50) NOT NULL COMMENT 'Nama baku, mis. Purwanegara',
  `nama_norm` varchar(50) NOT NULL COMMENT 'UPPERCASE untuk join',
  `varian` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Daftar alias di sumber: ["Purwonegoro",...]' CHECK (json_valid(`varian`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_kecamatan_nama` (`nama`),
  UNIQUE KEY `uq_kecamatan_norm` (`nama_norm`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='20 kecamatan Kab. Banjarnegara (dari peta_desa_v3.geojson)';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `kelompok_tani` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kecamatan_id` tinyint(3) unsigned NOT NULL,
  `desa` varchar(80) NOT NULL,
  `desa_norm` varchar(80) NOT NULL,
  `tahun` smallint(5) unsigned NOT NULL,
  `kelompok_tani` int(11) DEFAULT NULL,
  `anggota_tani` int(11) DEFAULT NULL,
  `kelompok_perikanan` int(11) DEFAULT NULL,
  `anggota_perikanan` int(11) DEFAULT NULL,
  `gapoktan` int(11) DEFAULT NULL,
  `anggota_gapoktan` int(11) DEFAULT NULL,
  `sumber` enum('json_fallback','ckan','manual') NOT NULL DEFAULT 'json_fallback',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_poktan` (`kecamatan_id`,`desa_norm`,`tahun`),
  KEY `ix_poktan_norm` (`desa_norm`),
  CONSTRAINT `fk_poktan_kec` FOREIGN KEY (`kecamatan_id`) REFERENCES `kecamatan` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=835 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Sudah termasuk 4 koreksi manual (Penarusan Wetan, Bandingan, Balun, Parakan)';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `kelompok_tani_hutan` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kecamatan_id` tinyint(3) unsigned NOT NULL,
  `desa` varchar(80) NOT NULL,
  `desa_norm` varchar(80) NOT NULL,
  `tahun` smallint(5) unsigned NOT NULL COMMENT 'Snapshot SIMLUH (2026) — jangan dicampur ke seri tahunan',
  `kth` int(11) DEFAULT NULL,
  `kth_pemula` int(11) DEFAULT NULL,
  `kth_madya` int(11) DEFAULT NULL,
  `kth_utama` int(11) DEFAULT NULL,
  `sumber` enum('json_fallback','manual') NOT NULL DEFAULT 'json_fallback',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_kth` (`kecamatan_id`,`desa_norm`,`tahun`),
  CONSTRAINT `fk_kth_kec` FOREIGN KEY (`kecamatan_id`) REFERENCES `kecamatan` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=189 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `kth_detail` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kelompok_tani_hutan_id` int(10) unsigned NOT NULL,
  `nama_kelompok` varchar(120) NOT NULL,
  `no_register` varchar(80) DEFAULT NULL,
  `tanggal_berdiri` varchar(20) DEFAULT NULL COMMENT 'Format sumber dd-mm-yyyy, disimpan mentah',
  `kelas` varchar(20) DEFAULT NULL COMMENT 'Pemula/Madya/Utama',
  `alamat` varchar(255) DEFAULT NULL,
  `ketua` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_kth_detail_induk` (`kelompok_tani_hutan_id`),
  CONSTRAINT `fk_kth_detail_induk` FOREIGN KEY (`kelompok_tani_hutan_id`) REFERENCES `kelompok_tani_hutan` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=358 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Rincian kelompok tani hutan (SIMLUH)';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lahan_desa` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kecamatan_id` tinyint(3) unsigned NOT NULL,
  `desa` varchar(80) NOT NULL,
  `desa_norm` varchar(80) NOT NULL,
  `tahun` smallint(5) unsigned NOT NULL,
  `sawah_ha` decimal(10,3) DEFAULT NULL,
  `bukan_sawah_ha` decimal(10,3) DEFAULT NULL,
  `total_ha` decimal(10,3) DEFAULT NULL,
  `sumber_json` varchar(60) DEFAULT NULL COMMENT 'Field "sumber" dari JSON fallback (mis. fallback-manual)',
  `confidence` varchar(20) DEFAULT NULL,
  `sumber` enum('json_fallback','ckan','manual') NOT NULL DEFAULT 'json_fallback',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_lahan_desa` (`kecamatan_id`,`desa_norm`,`tahun`),
  KEY `ix_lahan_desa_norm` (`desa_norm`),
  CONSTRAINT `fk_lahan_desa_kec` FOREIGN KEY (`kecamatan_id`) REFERENCES `kecamatan` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=557 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lahan sawah/bukan sawah per desa (CKAN LahanDesa + fallback lokal)';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lahan_penggunaan` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kategori` varchar(120) NOT NULL COMMENT 'Mis. "I. Lahan sawah", "a. Tegal/kebun" — string asli sumber',
  `tahun` smallint(5) unsigned NOT NULL,
  `luas_ha` decimal(12,3) DEFAULT NULL,
  `sumber` enum('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_lahan_guna` (`kategori`,`tahun`)
) ENGINE=InnoDB AUTO_INCREMENT=122 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Penggunaan lahan tingkat kabupaten (2014+)';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lumbung_pangan` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kecamatan_id` tinyint(3) unsigned NOT NULL,
  `tahun` smallint(5) unsigned NOT NULL,
  `lumbung_unit` int(11) DEFAULT NULL,
  `lumbung_kapasitas_ton` decimal(10,3) DEFAULT NULL,
  `gudang_luas_m2` decimal(10,3) DEFAULT NULL,
  `gudang_kapasitas_ton_bulan` decimal(10,3) DEFAULT NULL,
  `sumber` enum('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_lumbung` (`kecamatan_id`,`tahun`),
  CONSTRAINT `fk_lumbung_kec` FOREIGN KEY (`kecamatan_id`) REFERENCES `kecamatan` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=141 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Sudah dikoreksi 9 sel vs xlsx asli (Kalibening 9.176 dst) — jangan timpa CKAN';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `padi_produksi` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kecamatan_id` tinyint(3) unsigned NOT NULL,
  `tahun` smallint(5) unsigned NOT NULL,
  `jenis` enum('sawah','ladang') NOT NULL,
  `luas_panen_ha` decimal(10,3) DEFAULT NULL,
  `produksi_ton` decimal(12,3) DEFAULT NULL,
  `rata_ku_ha` decimal(8,3) DEFAULT NULL,
  `sumber` enum('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_padi` (`kecamatan_id`,`tahun`,`jenis`),
  KEY `ix_padi_tahun` (`tahun`),
  CONSTRAINT `fk_padi_kec` FOREIGN KEY (`kecamatan_id`) REFERENCES `kecamatan` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=165 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Padi sawah & ladang per kecamatan per tahun (2018-2025)';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `palawija_produksi` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kecamatan_id` tinyint(3) unsigned NOT NULL,
  `tahun` smallint(5) unsigned NOT NULL,
  `komoditas` varchar(30) NOT NULL COMMENT 'Jagung/Ubi Kayu/Kacang Tanah/Kedelai/Ubi Jalar/Kacang Hijau',
  `luas_panen_ha` decimal(10,3) DEFAULT NULL,
  `produksi_ton` decimal(12,3) DEFAULT NULL,
  `rata_ku_ha` decimal(8,3) DEFAULT NULL,
  `sumber` enum('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_palawija` (`kecamatan_id`,`tahun`,`komoditas`),
  KEY `ix_palawija_tahun` (`tahun`),
  CONSTRAINT `fk_palawija_kec` FOREIGN KEY (`kecamatan_id`) REFERENCES `kecamatan` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=443 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Palawija dari 3 file gabungan (2 komoditas per file)';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pasar` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `jenis` varchar(40) NOT NULL COMMENT 'Sesuai sumber: Umum/Hewan/Buah/Ikan',
  `tahun` smallint(5) unsigned NOT NULL,
  `jumlah` smallint(6) DEFAULT NULL,
  `sumber` enum('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pasar` (`jenis`,`tahun`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Jumlah pasar menurut jenis (Disperindag via CKAN, 2016-2025)';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `perkebunan_areal` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kecamatan_id` tinyint(3) unsigned NOT NULL,
  `tanaman` varchar(40) NOT NULL COMMENT 'Kelapa Sawit/Kelapa Dalam/Karet/Kopi Robusta/Kopi Arabica/Kakao/Tebu/Teh/Tembakau',
  `tahun` smallint(5) unsigned NOT NULL,
  `luas_ha` decimal(12,3) DEFAULT NULL,
  `sumber` enum('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_kebun_areal` (`kecamatan_id`,`tanaman`,`tahun`),
  KEY `ix_kebun_areal_tahun` (`tahun`),
  CONSTRAINT `fk_kebun_areal_kec` FOREIGN KEY (`kecamatan_id`) REFERENCES `kecamatan` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1301 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Luas areal perkebunan 2017-2024 (format wide di-melt)';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `perkebunan_produksi` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kecamatan_id` tinyint(3) unsigned NOT NULL,
  `tanaman` varchar(40) NOT NULL,
  `tahun` smallint(5) unsigned NOT NULL,
  `produksi_ton` decimal(12,3) DEFAULT NULL,
  `sumber` enum('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_kebun_prod` (`kecamatan_id`,`tanaman`,`tahun`),
  KEY `ix_kebun_prod_tahun` (`tahun`),
  CONSTRAINT `fk_kebun_prod_kec` FOREIGN KEY (`kecamatan_id`) REFERENCES `kecamatan` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1219 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Produksi perkebunan 2017-2024 (tanpa Kopi Arabica — tidak ada di sumber)';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `perkebunan_produksi_kabupaten` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `tanaman` varchar(40) NOT NULL,
  `tahun` smallint(5) unsigned NOT NULL,
  `produksi_ton` decimal(12,3) DEFAULT NULL,
  `sumber` enum('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_kebun_prod_kab` (`tanaman`,`tahun`)
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Total resmi BPS dari blok JENIS di file sumber — BUKAN hasil SUM kecamatan';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `renstra_target` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `indikator` varchar(120) NOT NULL,
  `satuan` varchar(30) NOT NULL,
  `target` decimal(16,2) NOT NULL,
  `tahun_target` smallint(5) unsigned NOT NULL DEFAULT 2029,
  `sumber_dokumen` varchar(120) DEFAULT NULL COMMENT 'mis. renstra.pdf Tabel 4.1',
  `sumber` enum('manual') NOT NULL DEFAULT 'manual',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_renstra` (`indikator`,`tahun_target`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Target Renstra Distankan — kosong sampai Fase 2';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `st2023_desa` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kecamatan_id` tinyint(3) unsigned NOT NULL,
  `desa` varchar(80) NOT NULL,
  `desa_norm` varchar(80) NOT NULL,
  `rumah_tangga_petani` int(11) DEFAULT NULL,
  `petani` int(11) DEFAULT NULL,
  `rt_anggota_kelompok` int(11) DEFAULT NULL,
  `rt_bukan_anggota_kelompok` int(11) DEFAULT NULL,
  `rtup` int(11) DEFAULT NULL COMMENT 'Rumah Tangga Usaha Pertanian',
  `rt_perikanan` int(11) DEFAULT NULL,
  `rt_perikanan_budidaya` int(11) DEFAULT NULL,
  `rt_perikanan_tangkap` int(11) DEFAULT NULL,
  `ternak` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Record jenis->jumlah, key fleksibel (sapiPotong, merpati, ...)' CHECK (json_valid(`ternak`)),
  `sumber_teks` varchar(200) DEFAULT NULL,
  `sumber` enum('json_fallback','manual') NOT NULL DEFAULT 'json_fallback',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_st2023_desa` (`kecamatan_id`,`desa_norm`),
  CONSTRAINT `fk_st2023_kec` FOREIGN KEY (`kecamatan_id`) REFERENCES `kecamatan` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=279 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Sensus Pertanian 2023 per desa (hasil re-ekstraksi PDF, 0 selisih)';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sync_log` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `dataset` varchar(80) NOT NULL COMMENT 'Nama logis dataset, mis. padi_produksi',
  `sumber` varchar(40) NOT NULL COMMENT 'csv/json_fallback/ckan/manual',
  `aksi` varchar(20) NOT NULL DEFAULT 'import' COMMENT 'import/sync/koreksi',
  `baris` int(11) NOT NULL DEFAULT 0,
  `status` varchar(10) NOT NULL DEFAULT 'ok' COMMENT 'ok/warn/error',
  `pesan` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ix_sync_dataset` (`dataset`,`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=56 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Jejak audit setiap import/sinkronisasi';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ternak_daging` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kecamatan_id` tinyint(3) unsigned NOT NULL,
  `kelompok` enum('ternak','unggas') NOT NULL,
  `jenis` varchar(40) NOT NULL,
  `tahun` smallint(5) unsigned NOT NULL,
  `produksi_kg` decimal(14,3) DEFAULT NULL,
  `sumber` enum('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ternak_daging` (`kecamatan_id`,`kelompok`,`jenis`,`tahun`),
  CONSTRAINT `fk_ternak_daging_kec` FOREIGN KEY (`kecamatan_id`) REFERENCES `kecamatan` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=860 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Produksi daging ternak & unggas. Unggas hanya 2 jenis (Ayam Ras Layer, Ayam Kampung) — label Itik di sumber tidak valid';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ternak_flow` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kecamatan_id` tinyint(3) unsigned NOT NULL,
  `arah` enum('pemasukan','pengeluaran') NOT NULL,
  `jenis` varchar(40) NOT NULL,
  `tahun` smallint(5) unsigned NOT NULL,
  `jumlah_ekor` decimal(14,3) DEFAULT NULL,
  `sumber` enum('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ternak_flow` (`kecamatan_id`,`arah`,`jenis`,`tahun`),
  CONSTRAINT `fk_ternak_flow_kec` FOREIGN KEY (`kecamatan_id`) REFERENCES `kecamatan` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1059 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Pemasukan/pengeluaran ternak potong antar kabupaten';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ternak_pemotongan` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kecamatan_id` tinyint(3) unsigned NOT NULL,
  `lokasi` enum('rph_pemerintah','luar_rph') NOT NULL,
  `jenis` varchar(40) NOT NULL,
  `tahun` smallint(5) unsigned NOT NULL,
  `jumlah_ekor` decimal(14,3) DEFAULT NULL,
  `sumber` enum('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ternak_potong` (`kecamatan_id`,`lokasi`,`jenis`,`tahun`),
  CONSTRAINT `fk_ternak_potong_kec` FOREIGN KEY (`kecamatan_id`) REFERENCES `kecamatan` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=573 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Pemotongan di RPH pemerintah & perkiraan di luar RPH';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ternak_populasi` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kecamatan_id` tinyint(3) unsigned NOT NULL,
  `kelompok` enum('besar','kecil','unggas') NOT NULL,
  `jenis` varchar(40) NOT NULL COMMENT 'Sapi/Kerbau/Kuda/Kambing/Domba/Babi/Kelinci/Ayam Kampung/...',
  `tahun` smallint(5) unsigned NOT NULL,
  `jumlah_ekor` decimal(14,3) DEFAULT NULL COMMENT 'DECIMAL: sumber BPS pernah memuat desimal (kasus Domba 2021)',
  `sumber` enum('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ternak_pop` (`kecamatan_id`,`kelompok`,`jenis`,`tahun`),
  KEY `ix_ternak_pop_tahun` (`tahun`),
  CONSTRAINT `fk_ternak_pop_kec` FOREIGN KEY (`kecamatan_id`) REFERENCES `kecamatan` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1717 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Populasi ternak besar/kecil/unggas per kecamatan';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ternak_susu_kulit` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kecamatan_id` tinyint(3) unsigned NOT NULL,
  `jenis` varchar(60) NOT NULL COMMENT 'Sapi/Kerbau atau Kambing/Domba (grup sesuai sumber)',
  `tahun` smallint(5) unsigned NOT NULL,
  `nilai` decimal(14,3) DEFAULT NULL,
  `catatan` varchar(120) DEFAULT NULL COMMENT 'Sumber BPS tidak memisahkan kulit (lembar) vs susu (liter) di file ini',
  `sumber` enum('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ternak_susukulit` (`kecamatan_id`,`jenis`,`tahun`),
  CONSTRAINT `fk_ternak_susukulit_kec` FOREIGN KEY (`kecamatan_id`) REFERENCES `kecamatan` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=241 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='File sumber ambigu (1 kolom per grup ternak) — lihat README';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ternak_telur` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `kecamatan_id` tinyint(3) unsigned NOT NULL,
  `jenis` varchar(40) NOT NULL COMMENT 'Ayam Ras Layer / Ayam Kampung (dinormalisasi dari Ras Layer/Kampung)',
  `tahun` smallint(5) unsigned NOT NULL,
  `produksi_kg` decimal(14,3) DEFAULT NULL,
  `sumber` enum('csv','ckan','manual') NOT NULL DEFAULT 'csv',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ternak_telur` (`kecamatan_id`,`jenis`,`tahun`),
  CONSTRAINT `fk_ternak_telur_kec` FOREIGN KEY (`kecamatan_id`) REFERENCES `kecamatan` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=241 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
