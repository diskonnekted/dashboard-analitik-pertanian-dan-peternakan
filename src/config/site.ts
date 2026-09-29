export type SiteConfig = typeof siteConfig;

export type NavItem = {
  label: string;
  href: string;
  disabled?: boolean;
  /**
   * true = item TIDAK dirender di navigasi (fitur belum aktif / menunggu data).
   * Hanya menyembunyikan — route & halaman tetap ada, aktifkan lagi dengan
   * menghapus flag ini. Berbeda dari `disabled` (tampil abu-abu "SOON").
   */
  hidden?: boolean;
};

export type NavGroup = {
  /** Judul grup (ikan kosong untuk grup yang itemnya tampil langsung). */
  title: string;
  /** Deskripsi tipis di bawah judul grup (opsional). */
  subtitle?: string;
  /** Kunci ikon grup — dipetakan di getGroupIcon pada layouts/default.tsx. */
  icon?: string;
  /** Label seksi ALL-CAPS di atas grup (opsional, sebagai pemisah kategori). */
  category?: string;
  items: NavItem[];
};

export const siteConfig = {
  name: "SISPERTANI",
  // Versi aplikasi — SATU sumber kebenaran (dipakai footer layout & harus sinkron
  // dgn package.json dan Manual Pengguna; manual terbit pertama menyebut "Versi 1.0").
  version: "1.0.0",
  releaseDate: "19 September 2026",
  description: "Sistem Informasi Pertanian Kabupaten Banjarnegara.",
  navGroups: [
    // EKSEKUTIF & SPASIAL
    {
      category: "EKSEKUTIF & SPASIAL",
      title: "",
      items: [
        { label: "Dashboard Eksekutif", href: "/" },
        { label: "Peta Geospasial GIS", href: "/sebaran/pangan" },
      ],
    },
    // SEKTOR KOMODITAS
    {
      category: "SEKTOR KOMODITAS",
      title: "Tanaman Pangan",
      subtitle: "Padi, Jagung & Palawija",
      icon: "pangan",
      items: [
        { label: "Produksi Padi & Palawija", href: "/food-crops" },
        { label: "Komoditas Unggulan Pangan", href: "/komoditas-unggulan/pangan" },
        { label: "Nilai Ekonomi Pangan", href: "/nilai-ekonomi/pangan" },
        { label: "Prediksi Panen", href: "/prediction" },
      ],
    },
    {
      title: "Hortikultura & Perkebunan",
      subtitle: "Kentang Dieng, Buah & Kebun",
      icon: "horti",
      items: [
        { label: "Produksi Sayuran & Buah", href: "/horticulture" },
        { label: "Komoditas Unggulan Hortikultura", href: "/komoditas-unggulan/hortikultura" },
        { label: "Nilai Ekonomi Hortikultura", href: "/nilai-ekonomi/hortikultura" },
        { label: "Analitik Perkebunan Khas", href: "/plantation" },
        { label: "Komoditas Unggulan Perkebunan", href: "/komoditas-unggulan/perkebunan" },
        { label: "Nilai Ekonomi Perkebunan", href: "/nilai-ekonomi/perkebunan" },
        { label: "LTT & Kalender Tanam", href: "/ltt-katam" },
      ],
    },
    {
      title: "Peternakan & Keswan",
      subtitle: "Domba Batur, Populasi & RPH",
      icon: "ternak",
      items: [
        { label: "Populasi & Produksi Ternak", href: "/livestock" },
        { label: "Komoditas Unggulan Peternakan", href: "/komoditas-unggulan/peternakan" },
        { label: "Nilai Ekonomi Peternakan", href: "/nilai-ekonomi/peternakan" },
        { label: "Susu & Kulit Ternak", href: "/peternakan/susu-kulit" },
        { label: "Lalu Lintas & Pemotongan RPH", href: "/livestock-flow" },
      ],
    },
    {
      title: "Perikanan Air Tawar",
      subtitle: "Budidaya Kolam, Waduk & Benih",
      icon: "ikan",
      items: [
        { label: "Produksi & Budidaya Ikan", href: "/fisheries" },
        { label: "Komoditas Unggulan Perikanan", href: "/komoditas-unggulan/perikanan" },
        { label: "Nilai Ekonomi Perikanan", href: "/economic-value" },
      ],
    },
    // KEBIJAKAN & ANALITIK
    {
      category: "KEBIJAKAN & ANALITIK",
      title: "Ketahanan Pangan (Bapanas)",
      subtitle: "Neraca Beras & Peta FSVA",
      icon: "ketapang",
      items: [
        { label: "Ketersediaan Beras & Lumbung", href: "/food-security" },
        { label: "Peta Kerawanan Pangan (FSVA)", href: "/fsva" },
        { label: "Rantai Pasok & Distribusi", href: "/supply-chain" },
        { label: "Fluktuasi Harga & Inflasi", href: "/price-volatility" },
      ],
    },
    {
      title: "Perencanaan & Renstra",
      subtitle: "Target Kinerja & Sensus ST2023",
      icon: "renstra",
      items: [
        { label: "Analisis Renstra & RKPD", href: "/renstra" },
        { label: "Rekomendasi Kebijakan Dinas", href: "/recommendations" },
        { label: "Sensus Pertanian 2023 (BPS)", href: "/sensus-2023" },
      ],
    },
    // KELEMBAGAAN & DATA
    {
      category: "KELEMBAGAAN & DATA",
      title: "Kelembagaan Tani",
      subtitle: "Poktan, Gapoktan & KWT",
      icon: "lembaga",
      items: [
        { label: "Kelembagaan Poktan / Gapoktan", href: "/farmers" },
        { label: "Kewirausahaan KWT", href: "/kewirausahaan/kwt" },
      ],
    },
    {
      title: "Bantuan & Sarana Prasarana",
      subtitle: "Alsintan & Benih Pemerintah",
      icon: "bantuan",
      items: [
        { label: "Analisis & Sebaran Bantuan", href: "/government-assistance" },
      ],
    },
    {
      title: "Data Lahan & Geografi",
      subtitle: "Tutupan Lahan & Kecamatan",
      icon: "lahan",
      items: [
        { label: "Luas & Penggunaan Lahan", href: "/lahan" },
        { label: "Kesesuaian Lahan", href: "/suitability" },
        { label: "Profil 20 Kecamatan", href: "/kecamatan" },
      ],
    },
    // Pengembangan (belum tersedia — disembunyikan, route tetap hidup)
    {
      title: "Pengembangan",
      items: [
        { label: "Peta Sebaran & Alert", href: "/early-warning", disabled: true, hidden: true },
        { label: "Data Petani & NPP", href: "/master-petani", disabled: true, hidden: true },
        { label: "Data Lahan & Peta Digital", href: "/master-lahan", disabled: true, hidden: true },
        { label: "Data Alsintan", href: "/master-alsintan", disabled: true, hidden: true },
        { label: "Luas Tambah Tanam & Luas Panen", href: "/ltt", disabled: true, hidden: true },
        { label: "OPT / Hama & Penyakit", href: "/opt", disabled: true, hidden: true },
        { label: "Irigasi & Tata Air", href: "/irigasi", disabled: true, hidden: true },
        { label: "Kawasan Hortikultura", href: "/kawasan-hortikultura", disabled: true, hidden: true },
        { label: "Sertifikasi & Mutu Hasil", href: "/sertifikasi-mutu", disabled: true, hidden: true },
        { label: "Kemitraan & Hilirisasi", href: "/kemitraan", disabled: true, hidden: true },
        { label: "Kesehatan Hewan & Zoonosis", href: "/kesehatan-hewan", disabled: true, hidden: true },
        { label: "Pakan Ternak & Hijauan", href: "/pakan-ternak", disabled: true, hidden: true },
        { label: "Kesehatan Ikan & Lingkungan Perairan", href: "/kesehatan-ikan", disabled: true, hidden: true },
        { label: "Cadangan Pangan Daerah", href: "/cpd", disabled: true, hidden: true },
        { label: "Jadwal & Materi Penyuluhan", href: "/penyuluhan", disabled: true, hidden: true },
        { label: "Penilaian Kinerja Penyuluh", href: "/kinerja-penyuluh", disabled: true, hidden: true },
        { label: "Monitoring & Evaluasi", href: "/monev", disabled: true, hidden: true },
        { label: "Manajemen User & Hak Akses", href: "/user-management", disabled: true, hidden: true },
        { label: "Pengaturan Sistem", href: "/settings", disabled: true, hidden: true },
      ],
    },
  ] as NavGroup[],
  // Flat list for backward compatibility (page title lookup)
  navItems: [] as NavItem[],
};

// Populate flat navItems from navGroups
for (const group of siteConfig.navGroups) {
  for (const item of group.items) {
    siteConfig.navItems.push(item);
  }
}