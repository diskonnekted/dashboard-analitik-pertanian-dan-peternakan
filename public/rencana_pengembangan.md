# Rencana Pengembangan SISPERTANI ke Depan

Dokumen ini merupakan tindak lanjut dari [`analisa.md`](./analisa.md) yang merangkum 6 analisis kunci untuk Dashboard Analitik Pertanian tingkat kabupaten. Tujuannya adalah memetakan kondisi aplikasi saat ini, celah fitur, serta rencana implementasi bertahap agar aplikasi benar-benar menjadi **actionable insight** bagi Dinas Pertanian, Bappeda, hingga Bupati Banjarnegara.

> Catatan: stack saat ini adalah **React 19 + TypeScript + Vite + React Leaflet + Tailwind 4 + Recharts + Supabase**. Dokumen analisa.md menyebut Laravel sebagai referensi arsitektural — secara fungsional semua kebutuhan dapat dipenuhi dari stack React yang sudah ada dengan Supabase sebagai lapisan data, sehingga migrasi besar tidak diperlukan.

---

## 1. Ringkasan Eksekutif

| Dimensi | Kondisi Saat Ini (v2.0.0) | Target v3.0.0 |
|---|---|---|
| WebGIS | ✅ Peta kecamatan + layer tematik | + Citra satelit NDWI, deteksi alih fungsi lahan, zonasi multi-komoditas |
| Forecasting | ✅ Regresi linier sederhana di `/prediction` & `/farmers` | + Model musiman (ARIMA/Prophet), monitoring LTT, kalender tanam otomatis |
| Rantai Pasok & Harga | ❌ Belum ada | ✅ Dashboard harga harian (produsen vs konsumen), peta distribusi, alert disparitas |
| Risiko Iklim / EWS | ❌ Belum ada | ✅ Integrasi BMKG (curah hujan, El Niño), peringatan dini otomatis ke Poktan |
| Subsidi & Kesejahteraan | ⚠️ Hanya data kelembagaan Poktan | ✅ Modul P3T, validasi penerima subsidi, integrasi SIMLUHTAN, QRIS pupuk |
| Hama & Kesehatan Tanah | ❌ Belum ada | ✅ Pelaporan crowdsourcing, rekomendasi pemupukan berpresisi dari data uji tanah |
| Notifikasi & Alert | ❌ Tidak ada | ✅ Pusat notifikasi (in-app + WhatsApp/SMTP) |
| Audit & Keamanan Data | ⚠️ Supabase RLS dasar | ✅ Log audit, enkripsi data pribadi petani |

---

## 2. Pemetaan Modul: Eksisting → Pengembangan

### 2.1 WebGIS & Tata Guna Lahan

**Sudah ada (v2.0.0):**
- Peta dasar kecamatan Banjarnegara dengan GeoJSON
- Layer tematik: produksi, kelompok tani, curah hujan, dll.
- Marker interaktif per desa/kecamatan
- Lock zoom + Ctrl-scroll untuk akurasi analisis

**Rencana pengembangan:**

- [ ] **Citra satelit multispektral** — integrasi Sentinel-2 / Planet Labs (NDVI, NDWI) untuk analisis vegetasi & lahan kritis
- [ ] **Time-series perubahan lahan** — bandingkan citra historis (misal tiap 6 bulan) dengan sekarang → alert konversi ilegal
- [ ] **Zonasi multi-komoditas** — overlay jenis tanah (peta tanah BBSDLP) + curah hujan → rekomendasi otomatis padi/kopi/sayuran di setiap zone
- [ ] **Polygon drawing tools** — penyuluh bisa menggambar area investigasi langsung di peta
- [ ] **Export GeoJSON/PNG** area hasil analisis untuk laporan ke Bupati

### 2.2 Forecasting Produksi & Kalender Tanam

**Sudah ada:**
- Regresi linier sederhana di `/prediction` (per kecamatan, multi-komoditas)
- Prediksi 2026 di `/farmers` dengan threshold ≥3 tahun data
- Visualisasi tren keanggotaan Poktan/Pokkan/Gapoktan

**Rencana pengembangan:**

- [ ] **Model time-series yang lebih kuat** — migrasi dari regresi linier ke ARIMA / Prophet (via API Python atau Supabase Edge Functions)
- [ ] **Kalender Tanam (Katam) otomatis** — integrasi data BMKG → rekomendasi tanggal tanam ideal per kecamatan per komoditas
- [ ] **Monitoring LTT** — input dari penyuluh via mobile-first form, dashboard progres target tanam nasional
- [ ] **Estimasi panen (jumlah & tanggal)** — output prediksi volume panen bulanan untuk cegah oversupply
- [ ] **Confidence interval** — setiap prediksi tampilkan rentang key/penetapan hasil aktual (band rendah / tengah / atas) dan bukan angka tunggal

### 2.3 Rantai Pasok & Stabilitas Harga

**Belum ada.**

**Rencana pengembangan:**

- [ ] **Harga harian/nasional** — integrasi API PIHPS (Badan Pangan Nasional) → harga produsen & konsumen per komoditas strategis
- [ ] **Disparitas harga** — bandingkan harga di tingkat petani vs pasar induk/eceran → tandai kecamatan dengan margin tidak wajar (indikasi permainan tengkulak)
- [ ] **Peta distribusi** — tampilkan lokasi gudang Bulog, pasar induk, koperasi tani, sentra produksi → hitung jarak & waktu tempuh rata-rata
- [ ] **Alert harga** — jika harga jatuh di bawah ambang batas (misal HPP padi), kirim notifikasi ke petani yang terdampak
- [ ] **Saran distribusi** — rekomendasi alokasi panen ke gudang terdekat untuk efisiensi biaya angkut

### 2.4 Risiko Iklim & Bencana (Early Warning System)

**Belum ada.**

**Rencana pengembangan:**

- [ ] **Integrasi BMKG** — fetch harian: curah hujan aktual + forecast 7 hari, informasi ENSO (El Niño/La Niña), peringatan dini kekeringan/banjir
- [ ] **Overlay iklim di peta** — choropleth curah hujan per kecamatan + heatmap suhu/kekeringan
- [ ] **Aturan peringatan otomatis** — misal: jika prediksi curah hujan <50 mm/bulan dalam 30 hari ke depan di area lahan padi → kirim peringatan
- [ ] **Notifikasi multi-channel** — in-app (pusong bell) + WhatsApp gateway (Twilio/WAHA) + email SMTP ke Poktan
- [ ] **Riwayat kejadian** — log kejadian banjir/kekeringan/serangan OPT untuk analisis risiko historis per kecamatan

### 2.5 Subsidi & Kesejahteraan Petani

**Sudah ada:**
- Data Poktan, Pokkan, Gapoktan, KTH (Lembaga Petani)

**Belum ada:** data penerima subsidi, verifikasi P3T, pembayaran.

**Rencana pengembangan:**

- [ ] **Modul P3T** — petani, pekebun, peternak dengan NIK, luas lahan, jenis usaha, status verifikasi
- [ ] **Integrasi SIMLUHTAN** — sync berkala dengan API SIMLUHTAN Kementan (jika tersedia) atau import data fallback dari CSV/Excel resmi
- [ ] **Validasi penerima subsidi** — cek duplikasi NIK, validasi keaktifan Poktan, validasi luas lahan ≤ NIK yang sama
- [ ] **Modul pembayaran non-tunai** — integrasi QRIS (Midtrans/Xendit) atau kanal resmi perbankan untuk penebatan pupuk bersubsidi → otomatis tercatat di `audit_log`
- [ ] **Dashboard distribusi subsidi** — siapa dapat berapa, jenis apa, tepat sasaran atau tidak
- [ ] **Transparansi publik** — halaman read-only untuk masyarakat umum menampilkan rekap subsidi per kecamatan (untuk hindari kebocoran)

### 2.6 Hama, Penyakit & Kesehatan Tanah

**Belum ada.**

**Rencana pengembangan:**

- [ ] **Pelaporan OPT terpadu** — form input dari penyuluh/petani (jenis OPT, lokasi, luas serangan, foto) → tampil di peta sebagai layer terpisah
- [ ] **Klasifikasi otomatis OPT** — dari foto yang diupload → gunakan model image classification (TensorFlow.js atau API server) untuk identifikasi wereng/blas/tikus
- [ ] **Rekomendasi pemupukan** — berdasarkan data uji tanah (pH, N, P, K, C-organik) → rekomendasi jenis & dosis pupuk spesifik per petak
- [ ] **Peta sebaran OPT historis** — heatmap musiman serangan OPT → bantu prediksi outbreak tahun berikutnya
- [ ] **Notifikasi outbreak** — jika ditemukan OPT baru di suatu kecamatan, kirim peringatan ke Poktan tetangga

---

## 3. Fitur Lintas Modul (Cross-cutting)

### 3.1 Notifikasi & Alert Terpusat
- [ ] Pusat notifikasi in-app dengan icon bell + counter
- [ ] Preferensi user (Poktan/Dinas/Bappeda) untuk milih topik alert
- [ ] Multi-channel: in-app, email, WhatsApp, Telegram (opsional)

### 3.2 Autentikasi & Otorisasi Berlapis
- [ ] Multi-role: Admin, Penyuluh, Poktan, Bappeda, Publik
- [ ] Supabase RLS yang ketat per tabel
- [ ] Log audit setiap akses data petani (sesuai UU PDP)

### 3.3 Audit & Compliance
- [ ] Log semua operasi tulis (INSERT/UPDATE/DELETE) ke tabel `audit_log`
- [ ] Penandatangan digital (TTE) untuk laporan resmi ke Bupati
- [ ] Enkripsi kolom data pribadi (NIK, alamat) di level kolom (Supabase Vault/pgcrypto)

### 3.4 Mobile-First & Aksesibilitas
- [ ] Aplikasi ini sudah responsive; pastikan semua form & peta enak dipakai di HP
- [ ] PWA — bisa diakses offline untuk penyuluh di lapangan
- [ ] Bahasa daerah opsional (Basa Jawa Banyumasan)

### 3.5 API Publik
- [ ] Endpoint REST publik (read-only) untuk data agregat agar bisa diakses media/opendata.kementan
- [ ] Dokumentasi OpenAPI/Swagger

---

## 4. Roadmap Bertahap (Quarterly Plan)

### Q3 2026 (immediate, Agustus–September) — sudah selesai di v2.0.0
- [x] Peta WebGIS dasar + Lock zoom + Ctrl-scroll
- [x] Forecasting sederhana regresi linier di `/prediction` & `/farmers`
- [x] Color consistency di `/suitability` & `/prediction`
- [x] Switch AI ke Qwen3.8-27B + scientific recommendations
- [x] Bug fixes: race condition, label chart, error state UI, SSR-safe localStorage

### Q4 2026 (target v2.1.0) — *Prioritas Tinggi*
- [ ] **Modul P3T & Subsidi** (tanpa integrasi SIMLUHTAN dulu; fokus CRUD + validasi internal)
- [ ] **Integrasi BMKG** (curah hujan, ENSO) — sebagai layer di dashboard
- [ ] **Pusat Notifikasi** in-app bell icon
- [ ] **Confidence interval** untuk semua prediksi
- [ ] **Time-series lahan** (alert konversi ilegal) — preview manual dengan data fallback 2 titik waktu

### Q1 2027 (target v2.2.0) — *Stabilitas & Pelaporan*
- [ ] **Modul Harga** + Peta Disparitas
- [ ] **Pelaporan OPT** form + layer peta
- [ ] **PWA mode offline** untuk penyuluh lapangan
- [ ] **Export laporan resmi** PDF/Excel dengan TTE

### Q2 2027 (target v2.3.0) — *Integrasi & Skala*
- [ ] **Integrasi SIMLUHTAN** (jika API tersedia) atau import CSV massal
- [ ] **Modul QRIS Pupuk** dengan audit_log lengkap
- [ ] **Klasifikasi OPT otomatis** dari foto (image classification)
- [ ] **API publik** read-only + Swagger docs

### Q3 2027 (target v3.0.0) — *Actionable Insights Lengkap*
- [ ] **Model ARIMA/Prophet** untuk forecasting produksi
- [ ] **Katam otomatis** per kecamatan
- [ ] **Rekomendasi pemupukan berpresisi** berdasarkan data uji tanah
- [ ] **Zonasi multi-komoditas** di peta
- [ ] **Notifikasi WhatsApp** untuk Poktan + penyuluh
- [ ] **Compliance penuh UU PDP** + audit penuh

---

## 5. Indikator Keberhasilan (KPI)

| KPI | Target |
|---|---|
| Petani/Poktan yang aktif menerima notifikasi | ≥ 80% Poktan terdata |
| Jumlah alert dini yang dikirim sebelum kejadian | ≥ 90% alert terkirim H-7 |
| Akurasi prediksi panen (MAPE) | ≤ 15% |
| Coverage subsidi tersalur tepat sasaran | ≥ 95% |
| Pengaduan OPT yang ditindaklanjuti dalam 14 hari | ≥ 90% |
| Akses dashboard oleh Penyuluh di lapangan (PWA) | ≥ 60% |
| Kepatuhan audit UU PDP | 100% |

---

## 6. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Kualitas data opendata bervariasi | Validasi di sisi klien + flagging anomali di server |
| Keterbatasan API SIMLUHTAN | Siapkan path alternatif: import CSV resmi dari BPN/Dinas |
| Biaya cloud membengkak | Arsitektur tiered: hot data (Supabase) + cold (export mingguan ke object storage) |
| Privasi data petani (UU PDP) | RLS ketat, enkripsi kolom sensitif, consent banner, kebijakan retensi |
| Resistensi pengguna | Pelatihan rutin untuk penyuluh + tampilan default yang sederhana untuk Poktan |

---

## 7. Penutup

Saat ini SISPERTANI v2.0.0 sudah menjadi fondasi yang kuat untuk analisis spasial & forecasting sederhana. **Langkah paling berdampak untuk v2.1 adalah Modul Subsidi P3T + Integrasi BMKG**, karena langsung menjawab pertanyaan Bappeda & Bupati: "Siapa dapat apa, dan apakah produksi tahun ini aman?".

Dokumen ini akan diperbarui setiap release untuk menjaga konsistensi antara visi di `analisa.md` dengan implementasi aktual.