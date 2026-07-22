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
  type PadiProduction,
  type TernakBesar,
  type TernakKecil,
  type PerikananBudidaya,
  type LahanDesa
} from "@/services/api";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [padi, tb, tk, ikan, lahan] = await Promise.all([
          fetchPadiProduction(),
          fetchTernakBesar(),
          fetchTernakKecil(),
          fetchPerikananBudidaya(),
          fetchLahanBanjarnegara(),
        ]);
        setPadiData(padi);
        setTernakBesar(tb);
        setTernakKecil(tk);
        setIkanData(ikan);
        setLahanData(lahan);
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
    };
  }, [padiData, ternakBesar, ternakKecil, ikanData, lahanData]);

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
    "Integrasikan database SIMPERTAN dengan sistem perizinan dan bantuan dinas agar penyaluran pupuk, benih, dan alsintan 100% tepat sasaran berbasis spasial.",
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
        <div className="no-print flex items-center justify-between bg-white border-2 border-[#141414] p-4 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
          <p className="text-xs font-mono font-bold uppercase text-neutral-600">
            Dokumen ini dapat dicetak atau disimpan sebagai PDF
          </p>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 py-2 px-4 border-2 border-[#141414] bg-emerald-200 font-mono font-bold text-xs uppercase shadow-[2px_2px_0px_0px_#141414] hover:bg-emerald-300 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            <Printer size={16} />
            Cetak / Simpan PDF
          </button>
        </div>

        {/* Kop Dokumen */}
        <div className="print-block bg-white border-2 border-[#141414] p-8 shadow-[4px_4px_0px_0px_#141414] text-center transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
          <p className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-500">
            Pemerintah Kabupaten Banjarnegara
          </p>
          <h1 className="font-serif italic text-3xl sm:text-5xl mt-2 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-800 to-teal-500 font-black drop-shadow-sm uppercase">
            Rekomendasi Strategis Pembangunan
          </h1>
          <h2 className="text-lg md:text-xl font-serif font-bold text-emerald-700 mt-1">
            Sektor Pertanian, Peternakan &amp; Perikanan
          </h2>
          <p className="text-xs font-mono font-bold text-neutral-600 mt-4 uppercase">
            Ditujukan kepada Dinas Terkait &amp; Bupati Banjarnegara
          </p>
          <p className="text-[10px] font-mono text-neutral-500 mt-1 uppercase">
            Berdasarkan Analisis Data Terbuka · Dicetak {tanggalCetak}
          </p>
        </div>

        {/* Capaian Pembangunan Sektor */}
        <div className="print-block grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-emerald-100 border-2 border-[#141414] p-5 shadow-[4px_4px_0px_0px_#141414] text-left transition-all duration-300 hover:shadow-[6px_6px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
            <span className="text-[9px] font-mono font-black uppercase text-emerald-800 tracking-wider block mb-1">Capaian Pertanian</span>
            <h3 className="text-xl font-serif font-black text-[#141414] leading-tight">
              {new Intl.NumberFormat("id-ID").format(Math.round(stats.totalPadiProd))} Ton
            </h3>
            <p className="text-[10px] font-mono font-bold text-neutral-600 mt-2 uppercase leading-normal">
              Produksi padi dari luas panen {new Intl.NumberFormat("id-ID").format(Math.round(stats.totalPadiLuas))} Ha, dipimpin oleh Kecamatan {stats.topPadiKec}.
            </p>
          </div>

          <div className="bg-orange-100 border-2 border-[#141414] p-5 shadow-[4px_4px_0px_0px_#141414] text-left transition-all duration-300 hover:shadow-[6px_6px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
            <span className="text-[9px] font-mono font-black uppercase text-orange-800 tracking-wider block mb-1">Capaian Peternakan</span>
            <h3 className="text-xl font-serif font-black text-[#141414] leading-tight">
              {new Intl.NumberFormat("id-ID").format(Math.round(stats.totalTernakPop))} Ekor
            </h3>
            <p className="text-[10px] font-mono font-bold text-neutral-600 mt-2 uppercase leading-normal">
              Total populasi sapi &amp; kambing aktif, dengan kepadatan tertinggi di Kecamatan {stats.topTernakKec}.
            </p>
          </div>

          <div className="bg-sky-100 border-2 border-[#141414] p-5 shadow-[4px_4px_0px_0px_#141414] text-left transition-all duration-300 hover:shadow-[6px_6px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
            <span className="text-[9px] font-mono font-black uppercase text-sky-800 tracking-wider block mb-1">Capaian Perikanan</span>
            <h3 className="text-xl font-serif font-black text-[#141414] leading-tight">
              {new Intl.NumberFormat("id-ID").format(Math.round(stats.totalIkanProd))} Ton/Unit
            </h3>
            <p className="text-[10px] font-mono font-bold text-neutral-600 mt-2 uppercase leading-normal">
              Hasil perikanan budidaya kolam pembesaran dengan sentra utama di Kecamatan {stats.topIkanKec}.
            </p>
          </div>

          <div className="bg-purple-100 border-2 border-[#141414] p-5 shadow-[4px_4px_0px_0px_#141414] text-left transition-all duration-300 hover:shadow-[6px_6px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
            <span className="text-[9px] font-mono font-black uppercase text-purple-800 tracking-wider block mb-1">Total Lahan Sawah</span>
            <h3 className="text-xl font-serif font-black text-[#141414] leading-tight">
              {new Intl.NumberFormat("id-ID").format(Math.round(stats.totalSawah))} Ha
            </h3>
            <p className="text-[10px] font-mono font-bold text-neutral-600 mt-2 uppercase leading-normal">
              Lahan sawah produktif basah beririgasi yang terpetakan untuk ketahanan pangan.
            </p>
          </div>
        </div>

        {/* Ringkasan Eksekutif */}
        <div className="print-block bg-neutral-50 border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] text-left transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
          <div className="flex items-center gap-2 mb-3 border-b border-neutral-300 pb-2">
            <Target size={18} className="text-emerald-700" />
            <h3 className="text-md font-mono font-bold uppercase tracking-wide">
              Ringkasan Eksekutif
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-neutral-800">
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
              className={`print-block ${s.warna} border-2 border-[#141414] p-5 shadow-[4px_4px_0px_0px_#141414] text-left`}
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 border-2 border-[#141414] bg-white flex items-center justify-center shadow-[2px_2px_0px_0px_#141414]">
                  {s.icon}
                </span>
                <h3 className="text-lg font-mono font-bold uppercase text-[#141414] tracking-wide">
                  Rekomendasi Sektor {s.nama}
                </h3>
              </div>
              <p className="text-sm text-neutral-700 mt-3 leading-relaxed">
                {s.ringkasan}
              </p>
            </div>

            {s.items.map((item, idx) => (
              <div
                key={idx}
                className="print-block bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] text-left transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h4 className="text-md font-mono font-bold uppercase text-[#141414] tracking-wide">
                    {idx + 1}. {item.judul}
                  </h4>
                  <span
                    className={`shrink-0 text-[10px] font-mono font-bold uppercase px-2 py-1 border-2 ${PRIORITY_STYLE[item.prioritas]}`}
                  >
                    {item.prioritas}
                  </span>
                </div>

                <div className="flex items-start gap-2 mb-3">
                  <AlertCircle
                    size={16}
                    className="text-red-600 mt-0.5 shrink-0"
                  />
                  <p className="text-sm text-neutral-700">
                    <span className="font-bold">Permasalahan: </span>
                    {item.masalah}
                  </p>
                </div>

                <div className="mb-3">
                  <p className="text-xs font-mono font-bold uppercase text-neutral-500 mb-2">
                    Langkah Rekomendasi
                  </p>
                  <ul className="space-y-1.5">
                    {item.aksi.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-emerald-700 font-black mt-0.5">
                          ▸
                        </span>
                        <span className="text-neutral-800">{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-emerald-50 border-l-4 border-emerald-600 px-3 py-2">
                  <p className="text-sm text-neutral-800">
                    <span className="font-bold">Dampak yang diharapkan: </span>
                    {item.dampak}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Rekomendasi Strategis untuk Dinas */}
        <div className="print-block bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] text-left transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
          <div className="flex items-center gap-2 mb-4 border-b border-neutral-300 pb-2">
            <Building2 size={18} className="text-emerald-700" />
            <h3 className="text-md font-mono font-bold uppercase tracking-wide">
              Rekomendasi Strategis untuk Dinas Terkait
            </h3>
          </div>
          <ol className="space-y-3">
            {strategisDinas.map((r, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="shrink-0 w-6 h-6 border-2 border-[#141414] bg-emerald-100 flex items-center justify-center font-mono font-black text-xs">
                  {i + 1}
                </span>
                <span className="text-neutral-800 leading-relaxed">{r}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Rekomendasi Strategis untuk Bupati */}
        <div className="print-block bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] text-left transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
          <div className="flex items-center gap-2 mb-4 border-b border-neutral-300 pb-2">
            <Target size={18} className="text-emerald-700" />
            <h3 className="text-md font-mono font-bold uppercase tracking-wide">
              Rekomendasi Strategis untuk Bupati
            </h3>
          </div>
          <ol className="space-y-3">
            {strategisBupati.map((r, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="shrink-0 w-6 h-6 border-2 border-[#141414] bg-yellow-200 flex items-center justify-center font-mono font-black text-xs">
                  {i + 1}
                </span>
                <span className="text-neutral-800 leading-relaxed">{r}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Blok Tanda Tangan */}
        <div className="print-block bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
          <div className="text-center text-sm">
            <p className="text-neutral-600 mb-2">
              Disusun oleh,
            </p>
            <p className="font-serif font-black text-lg uppercase text-emerald-700">
              Dinas Pertanian, Perikanan dan Ketahanan Pangan Kab. Banjarnegara
            </p>
            <p className="text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest mt-1">
              Analitika Pertanian, Peternakan &amp; Perikanan
            </p>
            <p className="text-xs font-mono text-neutral-500 mt-3">
              Banjarnegara, {tanggalCetak}
            </p>
          </div>
        </div>

        <p className="text-[10px] font-mono text-neutral-500 uppercase text-center">
          Dokumen dihasilkan oleh SIMPERTAN Distankan Kab. Banjarnegara
        </p>
      </section>
    </DefaultLayout>
  );
}
