import DefaultLayout from "@/layouts/default";
import { useMemo, useState, useEffect, type ReactNode } from "react";
import {
  Printer,
  Sprout,
  Beef,
  Fish,
  Building2,
  Target,
  AlertCircle,
} from "lucide-react";
import {
  fetchPadiProduction,
  fetchTernakBesar,
  fetchTernakKecil,
  fetchPerikananBudidaya,
  fetchLahanBanjarnegara,
  fetchOpenDataCatalog,
  type PadiProduction,
  type TernakBesar,
  type TernakKecil,
  type PerikananBudidaya,
  type LahanDesa,
  type CkanCatalog,
} from "@/services/api";
import ChatBot from "@/components/ChatBot";
import {
  describe,
  computeConcentration,
  computeProductivity,
  projectTrend,
  estimateEconomicValue,
  formatRupiah,
  formatPct,
  type SectorStats,
  type ConcentrationMetrics,
  type TrendProjection,
} from "@/utils/analysis";

interface Rekomendasi {
  judul: string;
  masalah: string;
  aksi: string[];
  dampak: string;
  prioritas: "Tinggi" | "Sedang" | "Jangka Panjang";
}

interface Sektor {
  id: string;
  nama: string;
  icon: ReactNode;
  warna: string;
  ringkasan: string;
  items: Rekomendasi[];
}

const PRIORITY_STYLE: Record<string, string> = {
  Tinggi: "bg-red-100 text-red-700 border-red-700",
  Sedang: "bg-amber-100 text-amber-700 border-amber-700",
  "Jangka Panjang": "bg-sky-100 text-sky-700 border-sky-700",
};

export default function RecommendationsPage() {
  const [padiData, setPadiData] = useState<PadiProduction[]>([]);
  const [ternakBesar, setTernakBesar] = useState<TernakBesar[]>([]);
  const [ternakKecil, setTernakKecil] = useState<TernakKecil[]>([]);
  const [ikanData, setIkanData] = useState<PerikananBudidaya[]>([]);
  const [lahanData, setLahanData] = useState<LahanDesa[]>([]);
  const [openDataCatalog, setOpenDataCatalog] = useState<CkanCatalog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [padi, tb, tk, ikan, lahan, catalog] = await Promise.all([
          fetchPadiProduction(),
          fetchTernakBesar(),
          fetchTernakKecil(),
          fetchPerikananBudidaya(),
          fetchLahanBanjarnegara(),
          fetchOpenDataCatalog(),
        ]);
        setPadiData(padi);
        setTernakBesar(tb);
        setTernakKecil(tk);
        setIkanData(ikan);
        setLahanData(lahan);
        setOpenDataCatalog(catalog);
      } catch (err) {
        console.error("Error loading recommendations data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  const tanggalCetak = useMemo(
    () =>
      new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [],
  );

  const stats = useMemo(() => {
    // 1. Pertanian (Padi)
    const totalPadiProd = padiData.reduce((acc, curr) => acc + curr.produksi, 0);
    const totalPadiLuas = padiData.reduce((acc, curr) => acc + curr.luasPanen, 0);
    let topPadiKec = "N/A";
    let maxPadiProd = 0;
    padiData.forEach((item) => {
      if (item.produksi > maxPadiProd) {
        maxPadiProd = item.produksi;
        topPadiKec = item.kecamatan;
      }
    });

    // 2. Peternakan
    const totalSapi = ternakBesar.reduce((acc, curr) => acc + curr.sapi, 0);
    const totalKambing = ternakKecil.reduce((acc, curr) => acc + curr.kambing, 0);
    const totalTernakPop = totalSapi + totalKambing;

    const kecTernakMap: Record<string, number> = {};
    ternakBesar.forEach((item) => {
      kecTernakMap[item.kecamatan] = (kecTernakMap[item.kecamatan] || 0) + item.sapi;
    });
    ternakKecil.forEach((item) => {
      kecTernakMap[item.kecamatan] = (kecTernakMap[item.kecamatan] || 0) + item.kambing;
    });
    let topTernakKec = "N/A";
    let maxTernakPop = 0;
    Object.entries(kecTernakMap).forEach(([kec, pop]) => {
      if (pop > maxTernakPop) {
        maxTernakPop = pop;
        topTernakKec = kec;
      }
    });

    // 3. Perikanan
    const totalIkanProd = ikanData.reduce((acc, curr) => acc + curr.kolamPembesaran, 0);
    let topIkanKec = "N/A";
    let maxIkanProd = 0;
    ikanData.forEach((item) => {
      if (item.kolamPembesaran > maxIkanProd) {
        maxIkanProd = item.kolamPembesaran;
        topIkanKec = item.kecamatan;
      }
    });

    // 4. Lahan
    const totalSawah = lahanData.reduce((acc, curr) => acc + curr.lahanSawah, 0);

    /* ── Analisis Statistik ── */
    const padiSeries: SectorStats = describe(padiData.map((d) => d.produksi));
    const ternakSeries: SectorStats = describe(
      Object.values(kecTernakMap),
    );
    const ikanSeries: SectorStats = describe(
      ikanData.map((d) => d.kolamPembesaran),
    );

    const padiConcentration: ConcentrationMetrics = computeConcentration(
      padiData.map((d) => d.produksi),
    );
    const ternakConcentration: ConcentrationMetrics = computeConcentration(
      Object.values(kecTernakMap),
    );
    const ikanConcentration: ConcentrationMetrics = computeConcentration(
      ikanData.map((d) => d.kolamPembesaran),
    );

    const padiProductivity = computeProductivity(totalPadiProd, totalPadiLuas);

    // Estimasi nilai ekonomi
    const econ = estimateEconomicValue({
      padiTon: totalPadiProd,
      sapiEkor: totalSapi,
      kambingEkor: totalKambing,
      ikanTon: totalIkanProd,
    });

    return {
      totalPadiProd,
      totalPadiLuas,
      topPadiKec,
      maxPadiProd,
      totalTernakPop,
      topTernakKec,
      maxTernakPop,
      totalIkanProd,
      topIkanKec,
      maxIkanProd,
      totalSawah,
      // Statistik ilmiah
      padiSeries,
      ternakSeries,
      ikanSeries,
      padiConcentration,
      ternakConcentration,
      ikanConcentration,
      padiProductivity,
      econ,
    };
  }, [padiData, ternakBesar, ternakKecil, ikanData, lahanData]);

  /* Proyeksi Tren Padi (jika ada data time-series ≥ 2 tahun) */
  const padiTrend: TrendProjection | null = useMemo(() => {
    const series: Record<number, number> = {};
    padiData.forEach((d) => {
      if (d.tahun) {
        const y = parseInt(d.tahun);
        if (Number.isFinite(y)) {
          series[y] = (series[y] || 0) + d.produksi;
        }
      }
    });
    const years = Object.keys(series)
      .map(Number)
      .sort((a, b) => a - b);
    if (years.length < 2) return null;
    return projectTrend(years, years.map((y) => series[y]));
  }, [padiData]);

  const sektor: Sektor[] = useMemo(() => [
    {
      id: "pertanian",
      nama: "Pertanian",
      icon: <Sprout size={20} />,
      warna: "bg-emerald-100",
      ringkasan: `Produksi padi di Kabupaten Banjarnegara mencapai total ${new Intl.NumberFormat("id-ID").format(Math.round(stats.totalPadiProd))} Ton dari total luas panen ${new Intl.NumberFormat("id-ID").format(Math.round(stats.totalPadiLuas))} Ha. Produksi padi ini sangat terkonsentrasi di wilayah sentra utama yaitu Kecamatan ${stats.topPadiKec} (${new Intl.NumberFormat("id-ID").format(Math.round(stats.maxPadiProd))} Ton), sementara alih fungsi lahan sawah dan ketergantungan pangan menjadi isu kritis.`,
      items: [
        {
          judul: "Diversifikasi Tanaman Pangan Selain Padi",
          masalah:
            "Ketergantungan tinggi pada padi membuat daerah rentan terhadap gagal panen dan fluktuasi harga tunggal.",
          aksi: [
            "Dorong penanaman jagung, kedelai, dan ubi pada lahan tegalan/bukan sawah melalui program bantuan benih terarah.",
            "Fasilitasi kemitraan pasar (offtaker) untuk komoditas non-padi agar petani mendapatkan kepastian harga jual.",
            "Integrasikan data produksi palawija dan hortikultura ke dalam sistem monitoring dinas pertanian.",
          ],
          dampak:
            "Menurunkan risiko krisis pangan daerah dan mendiversifikasi pendapatan sektor riil rumah tangga tani.",
          prioritas: "Tinggi",
        },
        {
          judul: "Pengendalian Alih Fungsi Lahan Sawah",
          masalah:
            "Penyusutan luas lahan sawah produktif akibat alih fungsi lahan di wilayah strategis perkotaan dan industri.",
          aksi: [
            "Kawal ketat implementasi Lahan Pertanian Pangan Berkelanjutan (LP2B) khususnya di kecamatan sentra produksi.",
            "Berikan insentif berupa bantuan saprotan gratis atau keringanan pajak bagi petani yang mempertahankan sawahnya.",
            "Lakukan audit luas sawah berkala menggunakan data pemetaan geospasial terbaru.",
          ],
          dampak: "Menjaga daya dukung kapasitas produksi pangan daerah untuk jangka panjang.",
          prioritas: "Jangka Panjang",
        },
        {
          judul: "Peningkatan Produktivitas di Kecamatan Non-Sentra",
          masalah:
            "Kesenjangan produktivitas dan mekanisasi antara kecamatan sentra dan non-sentra yang masih lebar.",
          aksi: [
            "Gencarkan penyuluhan intensif mengenai pola tanam jajar legowo di kecamatan non-sentra.",
            "Salurkan bantuan alat mesin pertanian (traktor, transplanter) yang dikelola kelompok tani secara transparan.",
          ],
          dampak: "Pemerataan hasil panen daerah dan peningkatan total surplus beras kabupaten.",
          prioritas: "Sedang",
        },
      ],
    },
    {
      id: "peternakan",
      nama: "Peternakan",
      icon: <Beef size={20} />,
      warna: "bg-orange-100",
      ringkasan: `Populasi komoditas ternak utama sapi dan kambing tercatat sebanyak ${new Intl.NumberFormat("id-ID").format(Math.round(stats.totalTernakPop))} ekor, dengan populasi terpadat berada di wilayah Kecamatan ${stats.topTernakKec}. Rantai distribusi pasokan daging dan optimalisasi kesehatan hewan diperlukan untuk swasembada protein.`,
      items: [
        {
          judul: "Penguatan Sentra Ternak Berbasis Kepadatan Populasi",
          masalah:
            "Konsentrasi populasi ternak yang sangat padat di wilayah tertentu rawan terhadap penularan penyakit hewan menular.",
          aksi: [
            `Prioritaskan penempatan pusat kesehatan hewan (Puskeswan) dan petugas medik di wilayah Kecamatan ${stats.topTernakKec}.`,
            "Lakukan desinfeksi berkala dan percepat program vaksinasi ternak di daerah padat ternak.",
            "Kembangkan sentra pembibitan (breeding center) di kecamatan sekunder untuk menyebarkan kepadatan populasi.",
          ],
          dampak: "Memitigasi kerugian ekonomi peternak akibat wabah penyakit dan menstabilkan laju pertumbuhan populasi.",
          prioritas: "Tinggi",
        },
        {
          judul: "Pencatatan Neraca & Pemotongan Ternak",
          masalah:
            "Jumlah pemotongan hewan di luar RPH (Rumah Pemotongan Hewan) masih tinggi dan belum terdokumentasi dengan baik.",
          aksi: [
            "Wajibkan sertifikasi dan edukasi bagi jagal serta optimalkan penggunaan RPH pemerintah yang berstandar ASUH.",
            "Bangun basis data neraca ternak (lalu lintas keluar-masuk hewan) secara terkomputerisasi.",
          ],
          dampak: "Mutu daging yang beredar terjamin aman, sehat, utuh, halal, serta data pasokan pasar menjadi valid.",
          prioritas: "Sedang",
        },
        {
          judul: "Hilirisasi Produk Turunan (Susu & Kulit)",
          masalah:
            "Sebagian besar peternak hanya menjual ternak hidup tanpa pemanfaatan produk sampingan seperti susu segar dan industri kulit.",
          aksi: [
            "Bina kelompok wanita tani (KWT) untuk pengolahan susu pasteurisasi rasa dan pembuatan yogurt.",
            "Gagas kemitraan dengan industri pengolahan kulit lokal guna menyerap kulit hasil RPH.",
          ],
          dampak: "Meningkatkan nilai tambah ekonomi sektor peternakan Banjarnegara secara signifikan.",
          prioritas: "Jangka Panjang",
        },
      ],
    },
    {
      id: "perikanan",
      nama: "Perikanan",
      icon: <Fish size={20} />,
      warna: "bg-sky-100",
      ringkasan: `Perikanan budidaya mencatat produksi kolam pembesaran sebesar ${new Intl.NumberFormat("id-ID").format(Math.round(stats.totalIkanProd))} Ton/Unit, didominasi oleh Kecamatan ${stats.topIkanKec}. Pemanfaatan mina padi dan karamba jaring apung masih memerlukan dorongan investasi.`,
      items: [
        {
          judul: "Ekspansi Budidaya Kolam ke Wilayah Potensial",
          masalah:
            "Produksi ikan terpusat di wilayah tertentu, sementara kecamatan lain yang memiliki ketersediaan air melimpah belum tergarap.",
          aksi: [
            "Petakan kecamatan dengan irigasi teknis lancar untuk dijadikan rintisan kampung perikanan budidaya baru.",
            "Salurkan paket bantuan benih ikan nila/mas beserta pakan mandiri berkualitas tinggi.",
          ],
          dampak: "Peningkatan produksi perikanan air tawar serta meningkatkan kedaulatan gizi masyarakat pedesaan.",
          prioritas: "Tinggi",
        },
        {
          judul: "Revitalisasi Mina Padi & Karamba Jaring Apung",
          masalah:
            "Volume produksi dari sistem mina padi dan karamba waduk menyusut tajam akibat minimnya peremajaan fasilitas.",
          aksi: [
            "Sosialisasikan kembali sistem mina padi terpadu (padi + udang/ikan) yang ramah lingkungan.",
            "Berikan bantuan jaring dan sarana karamba ramah lingkungan di area waduk/perairan umum darat.",
          ],
          dampak: "Optimalisasi produktivitas lahan sawah basah dan peningkatan pendapatan alternatif petani.",
          prioritas: "Sedang",
        },
        {
          judul: "Penyediaan Fasilitas Rantai Dingin (Cold Chain)",
          masalah:
            "Kualitas kesegaran produk perikanan menurun drastis saat proses distribusi karena ketiadaan pendingin.",
          aksi: [
            "Fasilitasi pengadaan mesin pembuat es (ice flake machine) di pasar-pasar ikan utama.",
            "Dorong pengolahan (fillet, ikan asap) untuk menaikkan nilai jual per kg.",
          ],
          dampak: "Menekan angka kehilangan hasil (post-harvest losses) dan mempertahankan nilai jual produk.",
          prioritas: "Jangka Panjang",
        },
      ],
    },
  ], [stats]);

  const strategisDinas = [
    "Integrasikan database SISPERTANI dengan sistem perizinan dan bantuan dinas agar penyaluran pupuk, benih, dan alsintan 100% tepat sasaran berbasis spasial.",
    "Terapkan standardisasi pengumpulan data berkala (bulanan) di tingkat BPP (Balai Penyuluhan Pertanian) kecamatan menggunakan form input digital seragam.",
    "Gunakan hasil prediksi panen padi berbasis data time-series ini untuk menyusun rekomendasi alokasi kuota pupuk subsidi tahunan.",
    "Alokasikan anggaran operasional dan penyuluhan lapangan secara proporsional terhadap luas lahan sawah dan jumlah kelompok tani aktif di tiap kecamatan.",
  ];

  const strategisBupati = [
    "Jadikan ketahanan pangan dan kesejahteraan petani sebagai indikator kinerja utama (IKU) daerah dalam dokumen RPJMD.",
    "Percepat penetapan Peraturan Daerah tentang Rencana Tata Ruang Wilayah (RTRW) yang melindungi zona LP2B (Lahan Pertanian Pangan Berkelanjutan).",
    "Dorong alokasi Dana Desa minimal 20% untuk penguatan ketahanan pangan desa, berfokus pada infrastruktur irigasi desa dan jalan usaha tani.",
    "Bangun kemitraan strategis dengan BUMN Pangan atau korporasi swasta sebagai penyerap (offtaker) hasil panen raya untuk menstabilkan harga komoditas.",
  ];

  /* Konteks data untuk ChatBot Si Pertani */
  const chatBotContext = useMemo(() => {
    const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(Math.round(n));
    const padiTop5 = [...padiData]
      .sort((a, b) => b.produksi - a.produksi)
      .slice(0, 5)
      .map((d) => `  - ${d.kecamatan}: ${fmt(d.produksi)} Ton (luas ${fmt(d.luasPanen)} Ha)`)
      .join("\n");

    const ternakTop5 = Object.entries(
      ternakBesar.reduce((acc, curr) => {
        acc[curr.kecamatan] = (acc[curr.kecamatan] || 0) + curr.sapi;
        return acc;
      }, {} as Record<string, number>),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([kec, pop]) => `  - ${kec}: ${fmt(pop)} ekor`)
      .join("\n");

    const ikanTop5 = [...ikanData]
      .sort((a, b) => b.kolamPembesaran - a.kolamPembesaran)
      .slice(0, 5)
      .map((d) => `  - ${d.kecamatan}: ${fmt(d.kolamPembesaran)} Ton/Unit`)
      .join("\n");

    // Katalog dataset OpenData Banjarnegara (ringkasan untuk AI)
    const catalogSection =
      openDataCatalog && openDataCatalog.entries.length > 0
        ? `== KATALOG DATA TERBUKA OPENDATA BANJARNEGARA (${openDataCatalog.totalDatasets} dataset) ==
Sumber: opendata.banjarnegarakab.go.id (CKAN)
Update terakhir katalog: ${new Date(openDataCatalog.fetchedAt).toLocaleString("id-ID")}

Dataset Unggulan (40 entri teratas):
${openDataCatalog.entries
  .slice(0, 40)
  .map((e, i) => {
    const csvInfo = e.csvUrls.length > 0 ? `[CSV:${e.csvUrls.length}]` : "";
    const xlsxInfo = e.xlsxUrls.length > 0 ? `[XLSX:${e.xlsxUrls.length}]` : "";
    return `${i + 1}. ${e.title} | ${e.org} | ${e.tags.join(", ") || "-"} ${csvInfo}${xlsxInfo}`;
  })
  .join("\n")}

Anda dapat merujuk pada dataset di atas ketika pengguna bertanya tentang data spesifik.
`
        : "== KATALOG DATA TERBUKA ==\nKatalog opendata belum berhasil dimuat saat ini.\n";

    return `DATA RINGKAS SISPERTANI KABUPATEN BANJARNEGARA:

== SEKTOR TANAMAN PANGAN (PADI) ==
Total Produksi: ${fmt(stats.totalPadiProd)} Ton
Total Luas Panen: ${fmt(stats.totalPadiLuas)} Ha
Kecamatan Sentra: ${stats.topPadiKec} (${fmt(stats.maxPadiProd)} Ton)
Top 5 Kecamatan berdasarkan produksi padi:
${padiTop5}

== SEKTOR HORTIKULTURA ==
Data sayuran meliputi: Bawang Merah, Bawang Putih, Cabai Besar, Cabai Rawit, Kentang, Kubis, Petsai (Sawi), Tomat.
Banjarnegara dikenal sebagai sentra bawang merah nasional.

== SEKTOR PERKEBUNAN ==
Komoditas: Kopi, Teh, Karet, Kakao, Tebu, Kelapa, Cengkeh, Kapulaga, Panili.

== SEKTOR PETERNAKAN ==
Total Populasi Sapi & Kambing: ${fmt(stats.totalTernakPop)} ekor
Kecamatan Sentra Peternakan: ${stats.topTernakKec} (${fmt(stats.maxTernakPop)} ekor)
Top 5 Kecamatan berdasarkan populasi ternak:
${ternakTop5}
Komoditas ternak lain: Domba, Kuda, Ayam Buras, Ayam Pedaging, Itik.

== SEKTOR PERIKANAN ==
Total Produksi Kolam Pembesaran: ${fmt(stats.totalIkanProd)} Ton/Unit
Kecamatan Sentra Perikanan: ${stats.topIkanKec} (${fmt(stats.maxIkanProd)} Ton/Unit)
Top 5 Kecamatan berdasarkan produksi perikanan:
${ikanTop5}
Jenis budidaya: Kolam Pembesaran, Kolam Pembenihan, Karamba Jaring Apung, Mina Padi, Sawah/Tambak.

== LAHAN PERTANIAN ==
Total Lahan Sawah: ${fmt(stats.totalSawah)} Ha
Lahan sawah beririgasi teknis dan non-teknis tersebar di 20 kecamatan.

== KELEMBAGAAN TANI ==
Data Poktan (Kelompok Tani), Gapoktan, KTH tersedia per kecamatan dari SIMLUH Kementan.

== KETAHANAN PANGAN ==
Data lumbung pangan dan kapasitas simpanan per kecamatan tersedia untuk analisis rasio simpanan.

== RANTAI PASOK ==
Simpul pasar dan koridor logistik antar-kecamatan menjadi tulang punggung distribusi hasil pertanian.

== FLUKTUASI HARGA ==
Data inflasi pangan multi-region (Banjarnegara, Jateng, Nasional) digunakan untuk analisis volatilitas harga.

GEOGRAFI: Banjarnegara memiliki topografi bervariasi dari dataran rendah hingga dataran tinggi (Dieng, ~2000 mdpl). Iklim dipengaruhi pola muson dengan dua musim: kemarau (Apr-Okt) dan penghujan (Nov-Mar). Kawasan Dieng produktif untuk hortikultura dataran tinggi (kentang, kubis, wortel).

== ANALISIS STATISTIK ILMIAH ==
Estimasi nilai ekonomi sektoral (harga acuan: gabah Rp 6.000/kg, sapi Rp 18 jt/ekor, kambing Rp 3 jt/ekor, ikan Rp 35.000/kg):
  - Gabah kering total: ${new Intl.NumberFormat("id-ID").format(stats.econ.gabah)} IDR
  - Total sapi: ${new Intl.NumberFormat("id-ID").format(stats.econ.sapi)} IDR
  - Total kambing: ${new Intl.NumberFormat("id-ID").format(stats.econ.kambing)} IDR
  - Total ikan: ${new Intl.NumberFormat("id-ID").format(stats.econ.ikan)} IDR
  - Estimasi total agregat: ${new Intl.NumberFormat("id-ID").format(stats.econ.totalEst)} IDR

Konsentrasi geografis (Indeks Herfindahl-Hirschman / HHI; 0-10000):
  - Padi: HHI ${stats.padiConcentration.hhi} → ${stats.padiConcentration.interpretation} (Top 1 share ${stats.padiConcentration.top1Share}%)
  - Peternakan: HHI ${stats.ternakConcentration.hhi} → ${stats.ternakConcentration.interpretation} (Top 1 share ${stats.ternakConcentration.top1Share}%)
  - Perikanan: HHI ${stats.ikanConcentration.hhi} → ${stats.ikanConcentration.interpretation} (Top 1 share ${stats.ikanConcentration.top1Share}%)

Dispersi sektoral (Koefisien Variasi, %):
  - Padi: CV ${formatPct(stats.padiSeries.cv)} (Std Dev ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(stats.padiSeries.stdDev)})
  - Peternakan: CV ${formatPct(stats.ternakSeries.cv)}
  - Perikanan: CV ${formatPct(stats.ikanSeries.cv)}

${stats.padiProductivity !== undefined ? `Produktivitas padi kabupaten: ${stats.padiProductivity.toFixed(2)} Ton/Ha (rata-rata nasional ~5,4 Ton/Ha; >6 sangat baik).\n` : ""}${padiTrend ? `Proyeksi tren padi: ${padiTrend.direction} (slope ${padiTrend.slope.toFixed(0)} ton/tahun, R²=${padiTrend.r2}, estimasi tahun depan ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(padiTrend.projectionNext)} Ton, perubahan ${padiTrend.pctChange > 0 ? "+" : ""}${padiTrend.pctChange}%).\n` : ""}Interpretasi praktis:
  - HHI > 2500 = Sangat Terkonsentrasi (risiko tinggi); 1500-2500 = Terkonsentrasi; <1500 = Cukup Merata.
  - CV > 50% = Ketimpangan produksi antarkecamatan tinggi; <30% = Merata.
  - Gunakan metrik ini untuk memprioritaskan intervensi: wilayah dengan share tinggi butuh infrastruktur pascapanen; wilayah dengan CV tinggi butuh pemerataan teknologi.

${catalogSection}`;
  }, [stats, padiData, ternakBesar, ikanData, openDataCatalog, padiTrend]);

  if (loading) {
    return (
      <DefaultLayout>
        <div className="flex flex-col items-center justify-center h-[500px] font-mono text-sm uppercase">
          <AlertCircle className="w-8 h-8 text-emerald-600 animate-spin mb-4" />
          Menganalisis data riil sektor pertanian Banjarnegara...
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8 py-2 max-w-5xl mx-auto">
        {/* Toolbar (tidak ikut tercetak) */}
        <div className="no-print flex items-center justify-between bg-white border border-slate-200 p-4 shadow-sm transition-all duration-300 hover:shadow-md">
          <p className="text-xs font-mono font-bold uppercase text-slate-600">
            Dokumen ini dapat dicetak atau disimpan sebagai PDF
          </p>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 py-2 px-4 border border-slate-200 bg-emerald-200 font-mono font-bold text-xs uppercase shadow-sm hover:bg-emerald-300 transition-all"
          >
            <Printer size={16} />
            Cetak / Simpan PDF
          </button>
        </div>

        {/* Kop Dokumen */}
        <div className="print-block bg-white border border-slate-200 p-8 shadow-sm text-center transition-all duration-300 hover:shadow-md">
          <p className="text-xs font-mono font-bold uppercase tracking-widest text-slate-500">
            Pemerintah Kabupaten Banjarnegara
          </p>
          <h1 className="text-2xl sm:text-4xl leading-tight font-bold tracking-tight text-slate-800">
            Rekomendasi Strategis Pembangunan
          </h1>
          <h2 className="text-lg md:text-xl font-serif font-bold text-emerald-700 mt-1">
            Sektor Pertanian, Peternakan &amp; Perikanan
          </h2>
          <p className="text-xs font-mono font-bold text-slate-600 mt-4 uppercase">
            Ditujukan kepada Dinas Terkait &amp; Bupati Banjarnegara
          </p>
          <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase">
            Berdasarkan Analisis Data Terbuka · Dicetak {tanggalCetak}
          </p>
        </div>

        {/* Capaian Pembangunan Sektor */}
        <div className="print-block grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-emerald-100 border border-slate-200 p-5 shadow-sm text-left transition-all duration-300 hover:shadow-md">
            <span className="text-[9px] font-mono font-black uppercase text-emerald-800 tracking-wider block mb-1">Capaian Pertanian</span>
            <h3 className="text-xl font-serif font-black text-slate-800 leading-tight">
              {new Intl.NumberFormat("id-ID").format(Math.round(stats.totalPadiProd))} Ton
            </h3>
            <p className="text-[10px] font-mono font-bold text-slate-600 mt-2 uppercase leading-normal">
              Produksi padi dari luas panen {new Intl.NumberFormat("id-ID").format(Math.round(stats.totalPadiLuas))} Ha, dipimpin oleh Kecamatan {stats.topPadiKec}.
            </p>
          </div>

          <div className="bg-orange-100 border border-slate-200 p-5 shadow-sm text-left transition-all duration-300 hover:shadow-md">
            <span className="text-[9px] font-mono font-black uppercase text-orange-800 tracking-wider block mb-1">Capaian Peternakan</span>
            <h3 className="text-xl font-serif font-black text-slate-800 leading-tight">
              {new Intl.NumberFormat("id-ID").format(Math.round(stats.totalTernakPop))} Ekor
            </h3>
            <p className="text-[10px] font-mono font-bold text-slate-600 mt-2 uppercase leading-normal">
              Total populasi sapi &amp; kambing aktif, dengan kepadatan tertinggi di Kecamatan {stats.topTernakKec}.
            </p>
          </div>

          <div className="bg-sky-100 border border-slate-200 p-5 shadow-sm text-left transition-all duration-300 hover:shadow-md">
            <span className="text-[9px] font-mono font-black uppercase text-sky-800 tracking-wider block mb-1">Capaian Perikanan</span>
            <h3 className="text-xl font-serif font-black text-slate-800 leading-tight">
              {new Intl.NumberFormat("id-ID").format(Math.round(stats.totalIkanProd))} Ton/Unit
            </h3>
            <p className="text-[10px] font-mono font-bold text-slate-600 mt-2 uppercase leading-normal">
              Hasil perikanan budidaya kolam pembesaran dengan sentra utama di Kecamatan {stats.topIkanKec}.
            </p>
          </div>

          <div className="bg-purple-100 border border-slate-200 p-5 shadow-sm text-left transition-all duration-300 hover:shadow-md">
            <span className="text-[9px] font-mono font-black uppercase text-purple-800 tracking-wider block mb-1">Total Lahan Sawah</span>
            <h3 className="text-xl font-serif font-black text-slate-800 leading-tight">
              {new Intl.NumberFormat("id-ID").format(Math.round(stats.totalSawah))} Ha
            </h3>
            <p className="text-[10px] font-mono font-bold text-slate-600 mt-2 uppercase leading-normal">
              Lahan sawah produktif basah beririgasi yang terpetakan untuk ketahanan pangan.
            </p>
          </div>
        </div>

        {/* Panel Analisis Ilmiah (Statistik Deskriptif, Konsentrasi, Proyeksi, Nilai Ekonomi) */}
        <div className="print-block bg-white border border-slate-200 p-6 shadow-sm text-left transition-all duration-300 hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-mono font-black uppercase text-slate-500 tracking-widest">
                Panel Ilmiah
              </p>
              <h2 className="text-lg font-serif font-bold text-slate-800">
                Analisis Statistik Pertanian
              </h2>
            </div>
            <span className="text-[9px] font-mono font-bold uppercase text-slate-500 bg-slate-100 px-2 py-1 rounded">
              Scientific Insight
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Padi */}
            <div className="border border-emerald-200 bg-emerald-50/50 p-4 rounded">
              <p className="text-[10px] font-mono font-black uppercase text-emerald-800 tracking-wider mb-2">
                Padi
              </p>
              <ul className="text-[11px] font-sans text-slate-700 space-y-1.5 leading-snug">
                <li><span className="font-bold">Mean:</span> {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(stats.padiSeries.mean)} Ton</li>
                <li><span className="font-bold">Std Dev:</span> {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(stats.padiSeries.stdDev)}</li>
                <li><span className="font-bold">CV:</span> {formatPct(stats.padiSeries.cv)}</li>
                {stats.padiProductivity !== undefined && (
                  <li><span className="font-bold">Produktivitas:</span> {stats.padiProductivity.toFixed(2)} Ton/Ha</li>
                )}
                <li>
                  <span className="font-bold">HHI:</span> {stats.padiConcentration.hhi}{" "}
                  <span className="text-slate-500">({stats.padiConcentration.interpretation})</span>
                </li>
                <li>
                  <span className="font-bold">Top 1 Share:</span> {formatPct(stats.padiConcentration.top1Share)}
                </li>
                {padiTrend && (
                  <li>
                    <span className="font-bold">Tren:</span>{" "}
                    <span className={padiTrend.direction === "Naik" ? "text-emerald-700 font-bold" : padiTrend.direction === "Turun" ? "text-rose-700 font-bold" : "text-slate-700 font-bold"}>
                      {padiTrend.direction} ({padiTrend.pctChange > 0 ? "+" : ""}{padiTrend.pctChange}%, R²={padiTrend.r2})
                    </span>
                  </li>
                )}
              </ul>
            </div>

            {/* Peternakan */}
            <div className="border border-orange-200 bg-orange-50/50 p-4 rounded">
              <p className="text-[10px] font-mono font-black uppercase text-orange-800 tracking-wider mb-2">
                Peternakan
              </p>
              <ul className="text-[11px] font-sans text-slate-700 space-y-1.5 leading-snug">
                <li><span className="font-bold">Mean:</span> {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(stats.ternakSeries.mean)} Ekor</li>
                <li><span className="font-bold">Std Dev:</span> {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(stats.ternakSeries.stdDev)}</li>
                <li><span className="font-bold">CV:</span> {formatPct(stats.ternakSeries.cv)}</li>
                <li>
                  <span className="font-bold">HHI:</span> {stats.ternakConcentration.hhi}{" "}
                  <span className="text-slate-500">({stats.ternakConcentration.interpretation})</span>
                </li>
                <li>
                  <span className="font-bold">Top 1 Share:</span> {formatPct(stats.ternakConcentration.top1Share)}
                </li>
                <li>
                  <span className="font-bold">Top 3 Share:</span> {formatPct(stats.ternakConcentration.top3Share)}
                </li>
              </ul>
            </div>

            {/* Perikanan */}
            <div className="border border-sky-200 bg-sky-50/50 p-4 rounded">
              <p className="text-[10px] font-mono font-black uppercase text-sky-800 tracking-wider mb-2">
                Perikanan
              </p>
              <ul className="text-[11px] font-sans text-slate-700 space-y-1.5 leading-snug">
                <li><span className="font-bold">Mean:</span> {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(stats.ikanSeries.mean)} Ton</li>
                <li><span className="font-bold">Std Dev:</span> {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(stats.ikanSeries.stdDev)}</li>
                <li><span className="font-bold">CV:</span> {formatPct(stats.ikanSeries.cv)}</li>
                <li>
                  <span className="font-bold">HHI:</span> {stats.ikanConcentration.hhi}{" "}
                  <span className="text-slate-500">({stats.ikanConcentration.interpretation})</span>
                </li>
                <li>
                  <span className="font-bold">Top 1 Share:</span> {formatPct(stats.ikanConcentration.top1Share)}
                </li>
                <li>
                  <span className="font-bold">Top 3 Share:</span> {formatPct(stats.ikanConcentration.top3Share)}
                </li>
              </ul>
            </div>
          </div>

          {/* Estimasi Nilai Ekonomi */}
          <div className="mt-5 border-t border-slate-200 pt-4">
            <p className="text-[10px] font-mono font-black uppercase text-slate-600 tracking-wider mb-3">
              Estimasi Nilai Ekonomi (harga acuan pasar Banjarnegara 2024-2025)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="text-center border border-slate-200 p-3 rounded bg-slate-50">
                <p className="text-[9px] font-mono uppercase text-slate-500">Gabah Kering</p>
                <p className="text-sm font-serif font-bold text-slate-800 mt-1">{formatRupiah(stats.econ.gabah)}</p>
              </div>
              <div className="text-center border border-slate-200 p-3 rounded bg-slate-50">
                <p className="text-[9px] font-mono uppercase text-slate-500">Ternak Sapi</p>
                <p className="text-sm font-serif font-bold text-slate-800 mt-1">{formatRupiah(stats.econ.sapi)}</p>
              </div>
              <div className="text-center border border-slate-200 p-3 rounded bg-slate-50">
                <p className="text-[9px] font-mono uppercase text-slate-500">Kambing</p>
                <p className="text-sm font-serif font-bold text-slate-800 mt-1">{formatRupiah(stats.econ.kambing)}</p>
              </div>
              <div className="text-center border border-slate-200 p-3 rounded bg-slate-50">
                <p className="text-[9px] font-mono uppercase text-slate-500">Ikan Budidaya</p>
                <p className="text-sm font-serif font-bold text-slate-800 mt-1">{formatRupiah(stats.econ.ikan)}</p>
              </div>
              <div className="text-center border-2 border-emerald-600 p-3 rounded bg-emerald-100">
                <p className="text-[9px] font-mono uppercase text-emerald-800">Total Estimasi</p>
                <p className="text-sm font-serif font-bold text-emerald-900 mt-1">{formatRupiah(stats.econ.totalEst)}</p>
              </div>
            </div>
            <p className="text-[9px] font-mono text-slate-500 mt-2 italic">
              * Asumsi: Gabah Kering Panen Rp 6.000/kg, Sapi Rp 18 jt/ekor, Kambing Rp 3 jt/ekor, Ikan Nila Rp 35.000/kg. Nilai indikatif untuk analisis kebijakan, bukan nilai transaksi riil.
            </p>
          </div>
        </div>

        {/* Ringkasan Eksekutif */}
        <div className="print-block bg-slate-50 border border-slate-200 p-6 shadow-sm text-left transition-all duration-300 hover:shadow-md">
          <div className="flex items-center gap-2 mb-3 border-b border-slate-300 pb-2">
            <Target size={18} className="text-emerald-700" />
            <h3 className="text-md font-mono font-bold uppercase tracking-wide">
              Ringkasan Eksekutif
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-slate-800">
            Berdasarkan analisis data riil Kabupaten Banjarnegara terbaru, total lahan sawah tercatat sebesar{" "}
            <span className="font-bold">{new Intl.NumberFormat("id-ID").format(Math.round(stats.totalSawah))} Ha</span> dengan total produksi padi tahunan mencapai{" "}
            <span className="font-bold">{new Intl.NumberFormat("id-ID").format(Math.round(stats.totalPadiProd))} Ton</span>. Sektor peternakan memiliki populasi ternak utama (sapi &amp; kambing) sebanyak{" "}
            <span className="font-bold">{new Intl.NumberFormat("id-ID").format(Math.round(stats.totalTernakPop))} ekor</span>, sedangkan perikanan kolam pembesaran mencatat produksi{" "}
            <span className="font-bold">{new Intl.NumberFormat("id-ID").format(Math.round(stats.totalIkanProd))} Ton/Unit</span>. 
            Teridentifikasi isu kritis berupa tingginya konsentrasi produksi di wilayah sentra utama seperti Kecamatan {stats.topPadiKec} (Padi), Kecamatan {stats.topTernakKec} (Ternak), dan Kecamatan {stats.topIkanKec} (Perikanan). 
            Dokumen ini merumuskan rekomendasi teknis per sektor dan langkah kebijakan strategis untuk dinas serta pimpinan daerah.
          </p>
        </div>

        {/* Rekomendasi per Sektor */}
        {sektor.map((s) => (
          <div key={s.id} className="flex flex-col gap-4">
            <div
              className={`print-block ${s.warna} border border-slate-200 p-5 shadow-sm text-left`}
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 border border-slate-200 bg-white flex items-center justify-center shadow-sm">
                  {s.icon}
                </span>
                <h3 className="text-lg font-mono font-bold uppercase text-slate-800 tracking-wide">
                  Rekomendasi Sektor {s.nama}
                </h3>
              </div>
              <p className="text-sm text-slate-700 mt-3 leading-relaxed">
                {s.ringkasan}
              </p>
            </div>

            {s.items.map((item, idx) => (
              <div
                key={idx}
                className="print-block bg-white border border-slate-200 p-6 shadow-sm text-left transition-all duration-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h4 className="text-md font-mono font-bold uppercase text-slate-800 tracking-wide">
                    {idx + 1}. {item.judul}
                  </h4>
                  <span
                    className={`shrink-0 text-[10px] font-mono font-bold uppercase px-2 py-1 border ${PRIORITY_STYLE[item.prioritas]}`}
                  >
                    {item.prioritas}
                  </span>
                </div>

                <div className="flex items-start gap-2 mb-3">
                  <AlertCircle
                    size={16}
                    className="text-red-600 mt-0.5 shrink-0"
                  />
                  <p className="text-sm text-slate-700">
                    <span className="font-bold">Permasalahan: </span>
                    {item.masalah}
                  </p>
                </div>

                <div className="mb-3">
                  <p className="text-xs font-mono font-bold uppercase text-slate-500 mb-2">
                    Langkah Rekomendasi
                  </p>
                  <ul className="space-y-1.5">
                    {item.aksi.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-emerald-700 font-black mt-0.5">
                          ▸
                        </span>
                        <span className="text-slate-800">{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-emerald-50 border-l-4 border-emerald-600 px-3 py-2">
                  <p className="text-sm text-slate-800">
                    <span className="font-bold">Dampak yang diharapkan: </span>
                    {item.dampak}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Rekomendasi Strategis untuk Dinas */}
        <div className="print-block bg-white border border-slate-200 p-6 shadow-sm text-left transition-all duration-300 hover:shadow-md">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-300 pb-2">
            <Building2 size={18} className="text-emerald-700" />
            <h3 className="text-md font-mono font-bold uppercase tracking-wide">
              Rekomendasi Strategis untuk Dinas Terkait
            </h3>
          </div>
          <ol className="space-y-3">
            {strategisDinas.map((r, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="shrink-0 w-6 h-6 border border-slate-200 bg-emerald-100 flex items-center justify-center font-mono font-black text-xs">
                  {i + 1}
                </span>
                <span className="text-slate-800 leading-relaxed">{r}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Rekomendasi Strategis untuk Bupati */}
        <div className="print-block bg-white border border-slate-200 p-6 shadow-sm text-left transition-all duration-300 hover:shadow-md">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-300 pb-2">
            <Target size={18} className="text-emerald-700" />
            <h3 className="text-md font-mono font-bold uppercase tracking-wide">
              Rekomendasi Strategis untuk Bupati
            </h3>
          </div>
          <ol className="space-y-3">
            {strategisBupati.map((r, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="shrink-0 w-6 h-6 border border-slate-200 bg-yellow-200 flex items-center justify-center font-mono font-black text-xs">
                  {i + 1}
                </span>
                <span className="text-slate-800 leading-relaxed">{r}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Blok Tanda Tangan */}
        <div className="print-block bg-white border border-slate-200 p-6 shadow-sm transition-all duration-300 hover:shadow-md">
          <div className="text-center text-sm">
            <p className="text-slate-600 mb-2">
              Disusun oleh,
            </p>
            <p className="font-serif font-black text-lg uppercase text-emerald-700">
              Dinas Pertanian, Perikanan dan Ketahanan Pangan Kab. Banjarnegara
            </p>
            <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mt-1">
              Analitika Pertanian, Peternakan &amp; Perikanan
            </p>
            <p className="text-xs font-mono text-slate-500 mt-3">
              Banjarnegara, {tanggalCetak}
            </p>
          </div>
        </div>

        <p className="text-[10px] font-mono text-slate-500 uppercase text-center">
          Dokumen dihasilkan oleh SISPERTANI Distankan Kab. Banjarnegara
        </p>
      </section>

      {/* ChatBot Si Pertani */}
      <ChatBot dataContext={chatBotContext} />
    </DefaultLayout>
  );
}
