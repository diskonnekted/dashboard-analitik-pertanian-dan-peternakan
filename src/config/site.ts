export type SiteConfig = typeof siteConfig;

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
    {
      title: "Bidang Tanaman Pangan",
      items: [
        {
          label: "Prediksi Panen",
          href: "/prediction",
        },
        {
          label: "Ketahanan Pangan",
          href: "/food-security",
        },
      ],
    },
    {
      title: "Bidang Hortikultura & Perkebunan",
      items: [
        {
          label: "Hortikultura",
          href: "/horticulture",
        },
        {
          label: "Perkebunan",
          href: "/plantation",
        },
        {
          label: "Kesesuaian Lahan",
          href: "/suitability",
        },
      ],
    },
    {
      title: "Bidang Peternakan",
      items: [
        {
          label: "Peternakan",
          href: "/livestock",
        },
      ],
    },
    {
      title: "Bidang Perikanan",
      items: [
        {
          label: "Perikanan",
          href: "/fisheries",
        },
        {
          label: "Nilai Ekonomi",
          href: "/economic-value",
        },
      ],
    },
    {
      title: "Sekretariat & Ketahanan Pangan",
      items: [
        {
          label: "Rantai Pasok",
          href: "/supply-chain",
        },
        {
          label: "Fluktuasi Harga",
          href: "/price-volatility",
        },
        {
          label: "Kelembagaan Tani",
          href: "/farmers",
        },
        {
          label: "Rekomendasi",
          href: "/recommendations",
        },
        {
          label: "Analisis Bantuan",
          href: "/government-assistance",
        },
        {
          label: "Analisis Renstra",
          href: "/renstra",
        },
        {
          label: "Manual",
          href: "/manual",
        },
        {
          label: "Info SISPERTANI",
          href: "/info",
        },
      ],
    },
  ],
  // Flat list for backward compatibility (page title lookup)
  navItems: [] as { label: string; href: string }[],
};

// Populate flat navItems from navGroups
for (const group of siteConfig.navGroups) {
  for (const item of group.items) {
    siteConfig.navItems.push(item);
  }
}
