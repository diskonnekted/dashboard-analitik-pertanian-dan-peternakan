# Laporan Analisis Kesenjangan Faktual & Matriks Kebutuhan Lengkap
**SISPERTANI Kabupaten Banjarnegara**  
**Berdasarkan:** Notulensi Paparan Klien Dinas Pertanian, Perikanan dan Ketahanan Pangan (Distankan KP)  
**Tanggal Paparan:** 21 September 2026  
**Dokumen:** `.docs/gap-analysis.md` (Update v3.2 — Matriks Komparasi Lengkap & Rincian Komoditas)  

---

## 1. Prinsip Utama: Arsitektur Simetris & Sesuai Feedback

Sesuai arahan klien Distankan KP, pengembangan sistem dibagi menjadi dua pilar:
1. **Pilar 1 — Standarisasi 5 Bidang Komoditas Simetris:** Bidang Tanaman Pangan, Hortikultura, Perkebunan, Peternakan, dan Perikanan wajib memiliki 4 submenu baku yang seragam:
   - *Submenu 1: Data Produksi & Luas Tanam / Populasi*
   - *Submenu 2: Komoditas Unggulan Bidang*
   - *Submenu 3: Nilai Ekonomi (Rp = Volume × Harga Produsen, Triwulan & Semester)*
   - *Submenu 4: Sebaran Wilayah Spasial (Per Kecamatan & Per Desa)*
2. **Pilar 2 — Penataan Bidang Fungsional & Kebijakan:** Ketahanan Pangan (3 Pilar Bapanas & 2.100 kkal), Penyuluhan & Kelembagaan (Poktan, KWT, Pokdakan, Poklasan), Bantuan Barang & Rules, serta Multi-Admin RBAC + Template Upload.

---

## 2. MATRIKS KOMPARASI: FITUR EKSISTING (SUDAH ADA) VS WAJIB DITAMBAHKAN (BELUM ADA)

Berikut adalah matriks komparasi faktual per bidang kerja Distankan KP:

| No | Bidang / Sektor | Fitur & Data Eksisting [SUDAH ADA ✅] | Fitur & Data Wajib Ditambahkan Sesuai Feedback [BELUM ADA 🔴 / PERUBAHAN 🔄] |
|---|---|---|---|
| **1** | **Bidang Tanaman Pangan** | • Data Luas Panen, Produksi, Rata-rata Produksi BPS 2018–2024 (Padi, Jagung, Kedelai, Palawija).<br>• Prediksi panen regresi linier tahunan hingga 2026.<br>• Layer spasial tutupan lahan sawah (`sawah.geojson`). | 🔴 **Submenu Komoditas Unggulan Tanaman:** Padi Varietas Unggul, Jagung Hibrida, Kedelai Lokal.<br>🔴 **Submenu Nilai Ekonomi Tanaman (Rp):** Agregasi omzet rupiah per **Triwulan (Q1–Q4)** dan **Semester (S1–S2)**.<br>🔴 **Data Tanam & Rencana Tanam (LTT):** Pemantauan target dan realisasi tanam bulanan per kecamatan & per desa.<br>🔴 **Kalender Tanam (Katam):** Rekomendasi masa tanam dan estimasi waktu panen per wilayah. |
| **2** | **Bidang Hortikultura** | • Data agregat luas panen & produksi sayuran dan buah semusim/tahunan (BPS agregat).<br>• Visualisasi grafik umum per tahun. | 🔴 **Breakdown Komoditas Sayuran Unggulan Populer:**<br>  - **Kentang Dieng** (komoditas no. 1 Banjarnegara, >100.000 ton/th)<br>  - **Kubis / Kol** (>70.000 ton/th)<br>  - **Wortel** (>50.000 ton/th)<br>  - **Tomat** (>9.000 ton/th)<br>  - **Cabai Rawit & Cabai Merah Besar**<br>  - **Bawang Daun, Buncis, Sawi/Petsai, Labu Siam**.<br>🔴 **Submenu Komoditas Unggulan Sayuran Dieng**.<br>🔴 **Submenu Nilai Ekonomi Hortikultura (Rp):** Omzet panen sayuran per Triwulan & Semester.<br>🔴 **Sebaran Sentra Hortikultura Spasial:** Pemetaan sentra agropolitan dataran tinggi (Batur, Pejawaran, Wanayasa, Karangkobar) hingga tingkat desa. |
| **3** | **Bidang Perkebunan** | • Data luas areal & produksi tanaman perkebunan BPS (kopi, cengkeh, teh, kapulaga, kelapa umum).<br>• Submenu tunggal *Komoditas Unggulan* umum. | 🔄 **Restrukturisasi:** Mengalihkan konten komoditas umum ke tanaman pangan.<br>🔴 **Submenu Komoditas Unggulan Khas:** Fokus pada **Kelapa Deres (Gula Kelapa Kristal / Semut)** dan **Talas Porang**.<br>🔴 **Submenu Nilai Ekonomi Perkebunan (Rp):** Valuasi omzet industri gula semut (ekspor & lokal), porang, kopi per Triwulan & Semester.<br>🔴 **Sebaran Sentra Perkebunan:** Pemetaan wilayah sentra penderes kelapa & budidaya porang per kecamatan dan per desa. |
| **4** | **Bidang Peternakan & Keswan** | • Populasi ternak besar, kecil, unggas agregat BPS.<br>• Data arus lalu lintas ternak (pemasukan/pengeluaran).<br>• Estimasi pemotongan luar RPH umum. | 🔴 **Pemisahan Spesifik Plasma Nutfah:** **Domba Lokal vs Domba Batur** (plasma nutfah khas Dieng berbulu wol tebal).<br>🔴 **Pencatatan Mandiri Komoditas:** **Kambing, Burung Puyuh, Ayam Kampung, Ayam Ras**.<br>🔴 **Kategori Produksi Telur 3 Jenis:** **Telur Ayam Ras, Telur Ayam Kampung, Telur Puyuh**.<br>🔴 **Submenu Hilirisasi Hasil Ternak:** Produksi **Susu Sapi/Kambing** (liter) dan **Pengolahan/Penyamakan Kulit** (lembar/ton).<br>🔴 **Direktori Spasial Poultry Shop:** Sebaran toko pakan, obat, dan sarana ternak per kecamatan & per desa.<br>🔴 **Pemisahan Pemotongan Hewan:** Data pemotongan resmi di **RPH Pemerintah vs Pemotongan Non-RPH**.<br>🔴 **Submenu Nilai Ekonomi Peternakan (Rp):** Omzet daging, telur, susu, dan kulit per Triwulan & Semester. |
| **5** | **Bidang Perikanan** | • Produksi dan nilai produksi perikanan budidaya kolam, waduk Mrica, dan tangkap perairan umum BPS tahunan. | 🔴 **Breakdown Produksi Populasi per Jenis Ikan Air Tawar Populer:** **Lele, Nila, Mujair, Gurame, Ikan Mas, Tawes, Patin**.<br>🔴 **Submenu Budidaya Mina Padi:** Integrasi budidaya ikan di lahan persawahan beririgasi teknis (Singomerto, Bawang).<br>🔴 **Submenu Pembenihan Ikan:**<br>  - Inventarisasi wadah pembenihan (aquarium, fiber, bak semen, kolam terpal).<br>  - Rasio penambahan **Jumlah Induk per Jenis** (jantan dan betina Lele, Nila, Gurame, Mas).<br>  - Produksi **Benih Ikan per Ekor** (bukan kg/ton).<br>🔴 **Modul Ikan Hias Dinamis:** Form entry dinamis jenis ikan hias (Koi, Koki, Komet, Cupang, Guppy) beserta volume/ekor.<br>🔴 **Submenu Nilai Ekonomi Perikanan (Rp):** Omzet ikan konsumsi, benih, dan ikan hias per Triwulan & Semester.<br>🔴 **Sebaran Kolam & Pokdakan:** Pemetaan lokasi budidaya dan pembenihan per kecamatan & per desa. |
| **6** | **Bidang Ketahanan Pangan** | • Neraca ketersediaan pangan beras makro tahunan.<br>• Disparitas fluktuasi harga pasar umum.<br>• Data lumbung & gudang pangan statis BPS. | 🔄 **Restrukturisasi 3 Pilar Ketahanan Pangan (Standar Bapanas):**<br>  1. **Pilar Ketersediaan:** Produksi komoditas pangan bulanan & stok lumbung pangan.<br>  2. **Pilar Pemanfaatan (Konsumsi):** Neraca kalori baku `Penduduk × 2.100 kkal/hari` $\rightarrow$ Status **Swasembada / Surplus / Kurang per Kecamatan**.<br>  3. **Pilar Distribusi:** Pemetaan sebaran **RMU (Rice Milling Unit / Penggilingan Padi)** dan rantai pasok beras.<br>🔴 **Indikator Baku Bapanas:**<br>  - **Peta Kerawanan Pangan (FSVA / Food Security and Vulnerability Atlas)** per kecamatan/desa.<br>  - **Skor Pola Pangan Harapan (PPH)** (skor 0–100 mutu gizi konsumsi).<br>  - **PoU (Prevalence of Undernourishment)** persentase penduduk kurang gizi tahunan.<br>🔴 **Data Tanam & Rencana Tanam Bulanan:** Sinkronisasi neraca pangan dengan kalender tanam. |
| **7** | **Bidang Penyuluhan & Kelembagaan** | • Direktori kelompok tani (Poktan, Gapoktan, KTH) statis BPS / file htm.<br>• Filter wilayah kecamatan umum. | 🔴 **Klasifikasi 5 Entitas Kelembagaan Lengkap:**<br>  1. **Poktan** (Kelompok Tani)<br>  2. **KWT** (Kelompok Wanita Tani)<br>  3. **Pokdakan** (Kelompok Pembudidaya Ikan)<br>  4. **Poklahsar / Poklasan** (Kelompok Pengolah & Pemasar Hasil Perikanan)<br>  5. **Pokmamas** (Kelompok Masyarakat Pengawas Perikanan).<br>🔴 **Statistik & Tren Kelembagaan Kabupaten:** Visualisasi grafik pertumbuhan jumlah kelompok dan anggota per tahun & per kecamatan.<br>🔴 **Detail Profil Kelompok:** Nomor SK pengukuhan, ketua, kontak, jumlah anggota, kelas kemampuan kelompok (Pemula, Lanjut, Madya, Utama), luas lahan/kolam. |
| **8** | **Bidang Bantuan & Sarpras** | • Visualisasi sebaran unit alsintan (traktor roda dua/empat, pompa air) secara umum. | 🔴 **Detail Bantuan Berupa Barang:** Katalog spesifikasi barang bantuan (merk, tipe alsintan, sarpras, benih, pupuk, harga satuan, sumber dana APBD/APBN/DAK).<br>🔴 **Rules Bantuan (Aturan & Kriteria Kelayakan):** Syarat legalitas kelompok, batas minimal usia berdiri, kelas kelompok poktan, riwayat penerimaan sebelumnya (mencegah duplikasi bantuan).<br>🔴 **List Kelompok Penerima:** Terhubung langsung (relasional) ke basis data kelembagaan (`/farmers`). |
| **9** | **Bidang Administrasi & Upload Data** | • 1 akun demo admin tunggal (`admin@banjarnegarakab.go.id`).<br>• Tidak ada form upload file interaktif. | 🔴 **Multi-Role RBAC:** 1 Super Admin Dinas (Kepala/Perencana) + 6 Admin per Bidang teknis (Pangan, Horti, Perkebunan, Peternakan, Perikanan, Ketapang, Sarpras).<br>🔴 **Katalog List Data & Format Upload:** Penyediaan template unduh baku (.xlsx Excel dan .csv) per bidang.<br>🔴 **Form Upload Data Berkala:** Formulir unggah data bulanan, triwulanan, semesteran dengan parser validasi otomatis dan audit log. |

---

## 3. TABEL RINCIAN MATRIKS WAJIB DITAMBAHKAN PER BIDANG

Berikut adalah penjabaran detail teknis dari setiap butir wajib yang belum ada:

### 3.1. Rincian Komoditas Sayuran Hortikultura Populer Banjarnegara (`/horticulture`)

| No | Komoditas Sayuran | Nama Ilmiah | Kawasan Sentra Utama Kecamatan | Estimasi Volume (BPS) | Satuan | Periode Wajib | Nilai Ekonomi |
|---|---|---|---|---|---|---|---|
| 1 | **Kentang** | *Solanum tuberosum* | Batur, Pejawaran, Wanayasa | 97.000 – 120.000+ | Ton | Triwulan & Semester | Wajib (Rp/Kg × Ton) |
| 2 | **Kubis / Kol** | *Brassica oleracea* | Batur, Wanayasa, Pejawaran | 70.000 – 80.000+ | Ton | Triwulan & Semester | Wajib (Rp/Kg × Ton) |
| 3 | **Wortel** | *Daucus carota* | Batur, Pejawaran, Karangkobar | 48.000 – 78.000+ | Ton | Triwulan & Semester | Wajib (Rp/Kg × Ton) |
| 4 | **Tomat** | *Solanum lycopersicum* | Batur, Wanayasa, Karangkobar | 3.300 – 9.600+ | Ton | Triwulan & Semester | Wajib (Rp/Kg × Ton) |
| 5 | **Cabai Rawit** | *Capsicum frutescens* | Punggelan, Karangkobar, Batur | 9.000 – 12.000+ | Ton | Triwulan & Semester | Wajib (Rp/Kg × Ton) |
| 6 | **Cabai Besar** | *Capsicum annuum* | Wanayasa, Kalibening, Pejawaran | 12.000 – 15.000+ | Ton | Triwulan & Semester | Wajib (Rp/Kg × Ton) |
| 7 | **Bawang Daun** | *Allium fistulosum* | Batur, Pejawaran | 5.000 – 9.500+ | Ton | Triwulan & Semester | Wajib (Rp/Kg × Ton) |
| 8 | **Buncis** | *Phaseolus vulgaris* | Batur, Karangkobar, Wanayasa | 3.200 – 7.000+ | Ton | Triwulan & Semester | Wajib (Rp/Kg × Ton) |
| 9 | **Sawi / Petsai** | *Brassica rapa* | Batur, Pejawaran | 2.700 – 4.000+ | Ton | Triwulan & Semester | Wajib (Rp/Kg × Ton) |
| 10 | **Labu Siam** | *Sechium edule* | Pejawaran, Wanayasa | 2.500+ | Ton | Triwulan & Semester | Wajib (Rp/Kg × Ton) |

---

### 3.2. Rincian Komoditas Perikanan Air Tawar & Pembenihan (`/fisheries`)

| No | Jenis Ikan / Submodul | Kategori Budidaya | Tipe Wadah & Pemeliharaan | Wilayah Sentra Kecamatan | Satuan Output | Periode Wajib |
|---|---|---|---|---|---|---|
| 1 | **Lele** (*Clarias*) | Ikan Konsumsi | Kolam Terpal, Kolam Tanah | Purwareja Klampok, Susukan, Mandiraja | Ton | Triwulan & Semester |
| 2 | **Nila** (*Oreochromis*) | Ikan Konsumsi | Kolam Air Deras, Mina Padi, Waduk Mrica | Bawang, Madukara, Wanadadi, Batur | Ton | Triwulan & Semester |
| 3 | **Mujair** (*O. mossambicus*) | Ikan Konsumsi | Kolam Tanah, Rawa, Waduk | Wanadadi, Banjarmangu, Rakit | Ton | Triwulan & Semester |
| 4 | **Gurame** (*Osphronemus*) | Ikan Konsumsi Unggulan | Kolam Air Tenang | Bawang, Rakit, Madukara, Purwanegara | Ton | Triwulan & Semester |
| 5 | **Ikan Mas** (*Cyprinus*) | Ikan Konsumsi & Benih | Kolam Air Deras, Mina Padi | Bawang, Banjarmangu, Karangkobar | Ton | Triwulan & Semester |
| 6 | **Tawes** (*Barbonymus*) | Ikan Konsumsi Lokal | Kolam Tanah, Sungai Serayu | Purwareja Klampok, Susukan | Ton | Triwulan & Semester |
| 7 | **Patin** (*Pangasius*) | Ikan Konsumsi | Kolam Tanah Dalam | Mandiraja, Purwanegara | Ton | Triwulan & Semester |
| 8 | **Budidaya Mina Padi** | Integrasi Sawah | Sawah Beririgasi Teknis | Singomerto, Bawang, Madukara | Ha & Ton | Triwulan & Semester |
| 9 | **Pembenihan: Induk Ikan** | Pemuliaan Benih | Kolam Induk, Bak Semen | BBI & Unit Pembenihan Rakyat (UPR) | Ekor (Jantan/Betina) | Triwulan & Semester |
| 10 | **Pembenihan: Benih Ikan** | Produksi Benih | Kolam Pendederan, Wadah Terpal | Balai Benih Ikan & Pokdakan | Ekor (Bukan Ton) | Triwulan & Semester |
| 11 | **Ikan Hias Dinamis** | Ikan Hias (Entry Dinamis) | Akuarium, Bak Semen, Fiber | Bawang, Banjarnegara Kota | Ekor & Jenis (Koi, Cupang, dll) | Triwulan & Semester |

> **Refinemen penyajian katalog produk (22 Sep 2026, konfirmasi klien):** halaman `/fisheries` (kategori "Jenis Ikan") menyajikan katalog produk sebagai **5 grup air tawar** — Lele, Gurame, Patin, **Nila / Mujair** (gabungan No. 2–3), **Ikan Gabus & Belut** (tangkap perairan umum, Pasar Ikan Purwanegara) — serta **4 grup ikan laut beredar pasar** (Selar Kuning/Ciu, Kurisi & Ikan Kembung, Bandeng, Cumi-cumi & Udang Putih Besar). Kebutuhan pengumpulan data statistik per jenis (tabel di atas, No. 1–7) **tidak berubah**; katalog grup akan dipecah ulang per jenis begitu data resmi per jenis tersedia (endpoint/admin).

---

### 3.3. Rincian Komoditas Peternakan & Hilirisasi (`/livestock`)

| No | Entitas Ternak / Produk | Kategori | Spesifikasi Lokal | Wilayah Sentra Utama | Satuan Data | Periode Wajib |
|---|---|---|---|---|---|---|
| 1 | **Domba Batur** | Ternak Kecil Unggulan | Plasma Nutfah Dieng, wol tebal | Batur, Pejawaran, Wanayasa | Ekor & Bobot (Kg) | Triwulan & Semester |
| 2 | **Domba Lokal & Kambing** | Ternak Kecil | Kambing Kejobong, PE, Jawa Randu | Pagentan, Punggelan, Banjarmangu | Ekor & Daging (Kg) | Triwulan & Semester |
| 3 | **Burung Puyuh** | Unggas Alternatif | Petelur & Pedaging | Purwanegara, Bawang, Rakit | Ekor & Butir Telur | Triwulan & Semester |
| 4 | **Ayam Ras Pedaging & Petelur** | Unggas Komersial | Broiler & Layer | Susukan, Purwareja Klampok, Mandiraja | Ekor, Daging (Kg), Telur (Kg) | Triwulan & Semester |
| 5 | **Ayam Kampung** | Unggas Lokal | Free-range / Buras | Tersebar 20 Kecamatan | Ekor & Butir Telur | Triwulan & Semester |
| 6 | **Produksi Telur 3 Jenis** | Hasil Ternak | Telur Ayam Ras, Ayam Kampung, Puyuh | Klampok, Purwanegara, Bawang | Kg & Butir | Triwulan & Semester |
| 7 | **Hilirisasi: Susu Segar** | Olahan Ternak | Susu Sapi Perah & Susu Kambing | Batur, Pejawaran, Bawang | Liter / Hari / Bulan | Triwulan & Semester |
| 8 | **Hilirisasi: Kulit Ternak** | Olahan Ternak | Kulit Sapi, Kambing, Domba Batur | RPH & Sentra Penyamakan | Lembar & Kg | Triwulan & Semester |
| 9 | **Poultry Shop** | Sarana Prasarana | Toko pakan, konsentrat, obat unggas | Tersebar di 20 Kecamatan | Titik Lokasi & Kecamatan | Direktori Spasial |
| 10 | **Pemotongan Hewan RPH** | Tata Niaga Daging | RPH Pemerintah vs Luar RPH | Banjarnegara Kota & Luar RPH | Ekor & Ton Daging | Triwulan & Semester |

---

### 3.4. Rincian Komoditas Perkebunan Khas Banjarnegara (`/plantation`)

| No | Komoditas Perkebunan | Spesifikasi / Olahan Hilir | Sentra Kecamatan Utama | Volume Produksi | Satuan | Periode Wajib |
|---|---|---|---|---|---|---|
| 1 | **Kelapa Deres** | Nira Kelapa, Gula Semut / Kristal Ekspor, Gula Cetak | Punggelan, Banjarmangu, Sigaluh, Madukara | >15.000 Ton Nira/Gula | Ton & Nilai Rp | Triwulan & Semester |
| 2 | **Talas Porang** | Umbi Porang & Chip Kering / Tepung Glukomanan | Pagentan, Pejawaran, Banjarmangu | >2.000 Ton Umbi | Ton & Nilai Rp | Triwulan & Semester |
| 3 | **Kopi Robusta & Arabika** | Biji Kopi Sangrai & Green Beans Dieng/Kalibening | Kalibening, Batur, Pagentan | >1.200 Ton Biji Kopi | Ton & Nilai Rp | Triwulan & Semester |
| 4 | **Kapulaga & Rempah** | Kapulaga Sabrang / Jawa, Jahe, Cengkeh | Wanadadi, Banjarmangu, Sigaluh | >800 Ton | Ton & Nilai Rp | Triwulan & Semester |

---

### 3.5. Rincian 3 Pilar Ketahanan Pangan Bapanas (`/food-security` & `/supply-chain`)

| No | Pilar Ketahanan Pangan | Komponen Indikator | Formula / Metode Perhitungan | Output Sistem | Periode Data |
|---|---|---|---|---|---|
| 1 | **Pilar 1: Ketersediaan** | Produksi Pangan Bulanan & Stok Lumbung | Realisasi panen beras/jagung + stok gudang | Ton Ketersediaan Beras | Bulanan & Tahunan |
| 2 | **Pilar 2: Pemanfaatan (Kalori)** | Standarisasi 2.100 kkal/kapita/hari | $\text{Penduduk} \times 2.100\text{ kkal/hari} \times 30\text{ hari}$ | Status: **Swasembada / Surplus / Defisit per Kecamatan** | Bulanan & Tahunan |
| 3 | **Pilar 3: Distribusi & Logistik** | Sebaran RMU & Rantai Pasok Beras | Pemetaan titik koordinat RMU (Penggilingan) & Pasar | Peta Spasial RMU & Jalur Pasok | Pemetaan Spasial |
| 4 | **Indikator Baku: FSVA** | Peta Kerawanan Pangan (FSVA) | 6 indikator komposit kerawanan pangan kronis | Peta Zonasi Rawan Pangan (Desa/Kec) | Tahunan Bapanas |
| 5 | **Indikator Baku: PPH** | Skor Pola Pangan Harapan (PPH) | Konsumsi seimbang 9 kelompok pangan (target ideal 100) | Skor Angka PPH Kabupaten | Tahunan Bapanas |
| 6 | **Indikator Baku: PoU** | Prevalence of Undernourishment | Proporsi penduduk konsumsi energi di bawah batas | Persentase PoU (%) | Tahunan BPS |
| 7 | **Data Tanam & Rencana Tanam** | Luas Tambah Tanam (LTT) Padi | Target luas tanam vs realisasi lapangan bulanan | Hektar Tanam & Proyeksi Panen | Bulanan |

---

### 3.6. Rincian Kelembagaan Petani & Nelayan (`/farmers`)

| No | Jenis Kelembagaan | Akronim | Definisi & Sektor Kerja | Data Atribut yang Wajib Dicatat |
|---|---|---|---|---|
| 1 | **Kelompok Tani** | **Poktan** | Kelompok petani tanaman pangan, hortikultura, perkebunan | Nama, SK Pengukuhan, Desa, Kecamatan, Ketua, Jumlah Anggota, Kelas Poktan, Luas Lahan (Ha) |
| 2 | **Kelompok Wanita Tani** | **KWT** | Kelompok tani perempuan / pemanfaatan pekarangan & P2L | Nama KWT, Desa, Kecamatan, Ketua, Jumlah Anggota, Komoditas Olahan/Pekarangan, Tahun Berdiri |
| 3 | **Kelompok Pembudidaya Ikan** | **Pokdakan** | Kelompok usaha budidaya ikan air tawar (kolam/mina padi) | Nama Pokdakan, Desa, Kecamatan, Ketua, Anggota, Luas Kolam/Wadah, Jenis Ikan Budidaya |
| 4 | **Kelompok Pengolah & Pemasar**| **Poklahsar / Poklasan** | Kelompok pengolahan abon ikan, keripik, salai, pasar ikan | Nama Poklahsar, Desa, Kecamatan, Ketua, Produk Olahan Utama, Izin P-IRT/Halal, Kapasitas Produksi |
| 5 | **Kelompok Masyarakat Pengawas**| **Pokmamas** | Pengawas perairan umum waduk Mrica & sungai Serayu | Nama Pokmamas, Wilayah Pengawasan (Waduk/Sungai), Jumlah Personel, Peralatan Patroli |
| 6 | **Statistik Tren Kabupaten** | **Tren Kelembagaan** | Grafik pertumbuhan jumlah kelompok & anggota per tahun | Grafik Tren Pertumbuhan 2018–2026 per Kecamatan |

---

### 3.7. Rincian Bantuan Barang & Business Rules (`/government-assistance`)

| No | Modul Bantuan | Komponen Data Wajib | Business Rules & Kriteria Validasi |
|---|---|---|---|
| 1 | **Katalog Bantuan Barang** | Nama barang, merk, tipe, spesifikasi teknis, harga satuan (Rp), jumlah unit, tahun anggaran, sumber dana (APBD Kab, DAK, APBN). | Barang bantuan harus terdaftar pada e-Katalog LKPP / DPA Dinas resmi. |
| 2 | **Rules Kriteria Kelayakan** | • Legalitas: Terdaftar resmi di Simluhtan / Kusuka.<br>• Usia Kelompok: Minimal telah berdiri 2 tahun.<br>• Kelas Kemampuan: Minimal kelas Pemula (terverifikasi PPL).<br>• Interval Bantuan: Tidak menerima bantuan sejenis dalam kurun 2 tahun terakhir. | Sistem otomatis menolak/memberi peringatan (*flag alert*) jika kelompok terdeteksi menerima bantuan ganda. |
| 3 | **Penautan Kelompok Penerima**| Relasi langsung dengan ID Kelompok di modul `/farmers`. Riwayat alokasi bantuan tercatat pada profil kelompok. | Setiap unit barang tertaut ke 1 kelompok penerima dengan Berita Acara Serah Terima (BAST). |

---

### 3.8. Rincian Multi-Admin RBAC & Format Template Upload (`/admin`)

| No | Peran Admin (Role) | Hak Akses & Cakupan Kerja | Format Template Unduh & Upload Wajib |
|---|---|---|---|
| 1 | **Super Admin Dinas** | Akses penuh seluruh modul, approval data lintas bidang, manajemen user, ekspor telaah Bupati. | Semua template (.xlsx & .csv) |
| 2 | **Admin Tanaman Pangan** | Input/upload luas tanam, panen, LTT bulanan, prediksi panen, komoditas unggulan pangan. | Template_Tanaman_Pangan_Triwulan.xlsx |
| 3 | **Admin Hortikultura** | Input/upload luas panen & produksi sayuran Dieng (Kentang, Kubis, Wortel, dll), buah, biofarmaka. | Template_Hortikultura_Triwulan.xlsx |
| 4 | **Admin Perkebunan** | Input/upload luas areal & produksi kelapa deres, porang, kopi, kapulaga per triwulan/semester. | Template_Perkebunan_Semester.xlsx |
| 5 | **Admin Peternakan** | Input/upload populasi domba batur, unggas, puyuh, telur 3 jenis, susu, kulit, RPH, poultry shop. | Template_Peternakan_Triwulan.xlsx |
| 6 | **Admin Perikanan** | Input/upload produksi lele, nila, mujair, gurame, mas, mina padi, induk & benih ekor, ikan hias. | Template_Perikanan_Triwulan.xlsx |
| 7 | **Admin Ketahanan Pangan**| Input/upload stok beras, lumbung pangan, data konsumsi kalori, skor PPH, PoU, sebaran RMU. | Template_Ketapang_Bulanan.xlsx |
| 8 | **Admin Kelembagaan & Sarpras**| Input/upload direktori Poktan, KWT, Pokdakan, Poklasan, Pokmamas, alokasi bantuan barang. | Template_Kelembagaan_Bantuan.xlsx |

---

## 4. Matriks Simetris 5 Bidang Komoditas × 4 Submenu Baku

| Bidang Teknis | 1. Data Produksi & Populasi | 2. Komoditas Unggulan Bidang | 3. Nilai Ekonomi (Rp) | 4. Sebaran Wilayah (Kecamatan & Desa) |
|---|---|---|---|---|
| **Bidang Tanaman Pangan** | Data Produksi & LTT Padi/Palawija | **Padi Varietas Unggul & Jagung** | Nilai Ekonomi Tanaman Pangan (Triwulan/Semester) | Sebaran Wilayah & Prediksi Panen Katam |
| **Bidang Hortikultura** | Data Produksi Sayuran & Buah | **Kentang Dieng, Kubis, Wortel, Tomat** | Nilai Ekonomi Hortikultura Sayuran (Triwulan/Semester) | Sebaran Sentra Dataran Tinggi Dieng per Desa |
| **Bidang Perkebunan** | Data Produksi Perkebunan Rakyat | **Kelapa Deres (Gula Semut) & Talas Porang** | Nilai Ekonomi Perkebunan & Ekspor (Triwulan/Semester) | Sebaran Sentra Penderes & Porang per Desa |
| **Bidang Peternakan & Keswan** | Data Populasi Ternak, Daging & Telur | **Domba Batur, Puyuh, Susu & Kulit** | Nilai Ekonomi Peternakan (Triwulan/Semester) | Sebaran Populasi, RPH & Poultry Shop per Desa |
| **Bidang Perikanan** | Data Produksi Perikanan Budidaya & Tangkap | **Lele, Nila, Mujair, Gurame & Mina Padi** | Nilai Ekonomi Perikanan & Pasar (Triwulan/Semester) | Sebaran Kolam, Pembenihan & Pokdakan per Desa |

---

## 5. Rencana Tahapan Eksekusi Teknis

1. **Fase 1 — Fondasi Multi-Admin RBAC & Template Upload:** Pembuatan peran admin berjenjang dan template Excel/CSV baku untuk data triwulan/semesteran per bidang.
2. **Fase 2 — Implementasi 5 Bidang Komoditas Simetris:** Penyesuaian antarmuka 4 submenu baku pada Tanaman Pangan, Hortikultura Sayuran Dieng, Perkebunan Kelapa Deres/Porang, Peternakan Domba Batur/Susu/Kulit, dan Perikanan Mina Padi/Pembenihan.
3. **Fase 3 — Ketahanan Pangan 3 Pilar Bapanas:** Kalkulator kalori 2.100 kkal per kecamatan, peta FSVA, Skor PPH, PoU, dan pemetaan RMU.
4. **Fase 4 — Kelembagaan Lengkap & Rules Bantuan:** Penambahan direktori KWT, Pokdakan, Poklahsar, Pokmamas, dan aturan kriteria bantuan barang.
