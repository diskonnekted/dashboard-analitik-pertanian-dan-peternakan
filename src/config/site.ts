export type SiteConfig = typeof siteConfig;

export type NavItem = { label: string; href: string; disabled?: boolean };
export type NavGroup = { title: string; items: NavItem[] };

export const siteConfig = {
  name: "SISPERTANI",
  description: "Sistem Informasi Pertanian Kabupaten Banjarnegara.",
  navGroups: [
    {
      title: "",
      items: [
        {
          label: "Dashboard",
          href: "/",
        },
      ],
    },
    // 2. Data Master & Spasial
    {
      title: "Data Master & Spasial",
      items: [
        {
          label: "Kesesuaian Lahan",
          href: "/suitability",
        },
      ],
    },
    // 3. Bidang Tanaman Pangan
    {
      title: "Bidang Tanaman Pangan",
      items: [
        {
          label: "Prediksi Panen",
          href: "/prediction",
        },
      ],
    },
    // 4. Bidang Hortikultura
    {
      title: "Bidang Hortikultura",
      items: [
        {
          label: "Produksi Sayuran, Buah & Flora Hias",
          href: "/horticulture",
        },
      ],
    },
    // 5. Bidang Perkebunan
    {
      title: "Bidang Perkebunan",
      items: [
        {
          label: "Komoditas Unggulan",
          href: "/plantation",
        },
      ],
    },
    // 6. Bidang Peternakan
    {
      title: "Bidang Peternakan",
      items: [
        {
          label: "Populasi & Produksi Ternak",
          href: "/livestock",
        },
      ],
    },
    // 7. Bidang Perikanan
    {
      title: "Bidang Perikanan",
      items: [
        {
          label: "Produksi Perikanan",
          href: "/fisheries",
        },
        {
          label: "Nilai Ekonomi & Pasar",
          href: "/economic-value",
        },
      ],
    },
    // 8. Ketahanan Pangan & Distribusi
    {
      title: "Ketahanan Pangan & Distribusi",
      items: [
        {
          label: "Neraca Komoditas Pangan",
          href: "/food-security",
        },
        {
          label: "Rantai Pasok & Distribusi",
          href: "/supply-chain",
        },
        {
          label: "Fluktuasi Harga & Inflasi",
          href: "/price-volatility",
        },
      ],
    },
    // 9. Penyuluhan & Kelembagaan
    {
      title: "Penyuluhan & Kelembagaan",
      items: [
        {
          label: "Kelembagaan Tani",
          href: "/farmers",
        },
      ],
    },
    // 10. Analisis & Perencanaan Strategis
    {
      title: "Analisis & Perencanaan Strategis",
      items: [
        {
          label: "Analisis Bantuan",
          href: "/government-assistance",
        },
        {
          label: "Analisis Renstra & RKPD",
          href: "/renstra",
        },
        {
          label: "Rekomendasi Kebijakan",
          href: "/recommendations",
        },
      ],
    },
    // 11. Pengaturan & Bantuan
    {
      title: "Pengaturan & Bantuan",
      items: [
        {
          label: "Info SISPERTANI",
          href: "/info",
        },
        {
          label: "Manual Book / Panduan",
          href: "/manual",
        },
      ],
    },
    // 12. Pengembangan (semua modul yang belum tersedia)
    {
      title: "Pengembangan",
      items: [
        {
          label: "Peta Sebaran & Alert",
          href: "/early-warning",
          disabled: true,
        },
        {
          label: "Data Petani & NPP",
          href: "/master-petani",
          disabled: true,
        },
        {
          label: "Data Lahan & Peta Digital",
          href: "/master-lahan",
          disabled: true,
        },
        {
          label: "Data Alsintan",
          href: "/master-alsintan",
          disabled: true,
        },
        {
          label: "Luas Tambah Tanam & Luas Panen",
          href: "/ltt",
          disabled: true,
        },
        {
          label: "OPT / Hama & Penyakit",
          href: "/opt",
          disabled: true,
        },
        {
          label: "Irigasi & Tata Air",
          href: "/irigasi",
          disabled: true,
        },
        {
          label: "Kawasan Hortikultura",
          href: "/kawasan-hortikultura",
          disabled: true,
        },
        {
          label: "Sertifikasi & Mutu Hasil",
          href: "/sertifikasi-mutu",
          disabled: true,
        },
        {
          label: "Kemitraan & Hilirisasi",
          href: "/kemitraan",
          disabled: true,
        },
        {
          label: "Kesehatan Hewan & Zoonosis",
          href: "/kesehatan-hewan",
          disabled: true,
        },
        {
          label: "Pakan Ternak & Hijauan",
          href: "/pakan-ternak",
          disabled: true,
        },
        {
          label: "Kesehatan Ikan & Lingkungan Perairan",
          href: "/kesehatan-ikan",
          disabled: true,
        },
        {
          label: "Cadangan Pangan Daerah",
          href: "/cpd",
          disabled: true,
        },
        {
          label: "Jadwal & Materi Penyuluhan",
          href: "/penyuluhan",
          disabled: true,
        },
        {
          label: "Penilaian Kinerja Penyuluh",
          href: "/kinerja-penyuluh",
          disabled: true,
        },
        {
          label: "Monitoring & Evaluasi",
          href: "/monev",
          disabled: true,
        },
        {
          label: "Manajemen User & Hak Akses",
          href: "/user-management",
          disabled: true,
        },
        {
          label: "Pengaturan Sistem",
          href: "/settings",
          disabled: true,
        },
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
