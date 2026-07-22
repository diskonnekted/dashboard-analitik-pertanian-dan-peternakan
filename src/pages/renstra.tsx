import { useEffect, useState, useMemo } from "react";
import DefaultLayout from "@/layouts/default";
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
import {
  FileText,
  Printer,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Award,
  ArrowRight,
} from "lucide-react";

interface RenstraTarget {
  kategori: string;
  indikator: string;
  target2022: number;
  satuan: string;
  getActualValue: (stats: any) => number;
  keterangan: string;
}

export default function RenstraPage() {
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
        console.error("Error loading Renstra data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  const stats = useMemo(() => {
    // Filter all datasets to target year 2022 for accurate Renstra comparison
    const padi2022 = padiData.filter((item) => item.tahun === "2022" || !item.tahun);
    const tb2022 = ternakBesar.filter((item) => item.tahun === "2022");
    const tk2022 = ternakKecil.filter((item) => item.tahun === "2022");
    const ikan2022 = ikanData.filter((item) => item.tahun === "2022");

    const totalPadiProd = padi2022.reduce((acc, curr) => acc + curr.produksi, 0);
    const totalSapi = tb2022.reduce((acc, curr) => acc + curr.sapi + curr.sapiPerah, 0);
    const totalKambingDomba = tk2022.reduce((acc, curr) => acc + curr.kambing + curr.domba, 0);
    const totalIkanProd = ikan2022.reduce(
      (acc, curr) => acc + curr.kolamPembesaran + curr.karambaApung + curr.minaPenyelang + curr.minaTumpangsari,
      0
    );
    const totalSawah = lahanData.reduce((acc, curr) => acc + curr.lahanSawah, 0);

    return {
      totalPadiProd,
      totalSapi,
      totalKambingDomba,
      totalIkanProd,
      totalSawah,
    };
  }, [padiData, ternakBesar, ternakKecil, ikanData, lahanData]);

  const targets: RenstraTarget[] = [
    {
      kategori: "Pertanian & Tanaman Pangan",
      indikator: "Produksi Padi Tahunan",
      target2022: 162069,
      satuan: "Ton",
      getActualValue: (s) => s.totalPadiProd,
      keterangan: "Target produksi akumulatif sawah & ladang di Kabupaten Banjarnegara.",
    },
    {
      kategori: "Peternakan",
      indikator: "Populasi Sapi (Potong & Perah)",
      target2022: 32269,
      satuan: "Ekor",
      getActualValue: (s) => s.totalSapi,
      keterangan: "Target populasi sapi untuk swasembada protein daging dan susu segar.",
    },
    {
      kategori: "Peternakan",
      indikator: "Populasi Kambing & Domba",
      target2022: 263925,
      satuan: "Ekor",
      getActualValue: (s) => s.totalKambingDomba,
      keterangan: "Termasuk target pelestarian ras khusus Domba Batur endemik.",
    },
    {
      kategori: "Perikanan",
      indikator: "Produksi Perikanan Budidaya",
      target2022: 41901,
      satuan: "Ton",
      getActualValue: (s) => s.totalIkanProd,
      keterangan: "Target produksi gabungan kolam pembesaran, karamba, dan mina padi.",
    },
  ];

  const comparisons = useMemo(() => {
    return targets.map((t) => {
      const actual = t.getActualValue(stats);
      const persentase = (actual / t.target2022) * 100;
      let status: "achieved" | "near" | "under" = "under";
      if (persentase >= 100) status = "achieved";
      else if (persentase >= 80) status = "near";

      return {
        ...t,
        actual,
        persentase,
        status,
      };
    });
  }, [stats]);

  const totalSektor = comparisons.length;
  const achievedSektor = comparisons.filter((c) => c.status === "achieved").length;
  const nearSektor = comparisons.filter((c) => c.status === "near").length;

  if (loading) {
    return (
      <DefaultLayout>
        <div className="flex flex-col items-center justify-center h-[500px] font-mono text-sm uppercase">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
          Mengevaluasi Kinerja Capaian Renstra Dinas...
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8 py-2 max-w-5xl mx-auto">
        {/* Toolbar */}
        <div className="no-print flex items-center justify-between bg-white border-2 border-[#141414] p-4 shadow-[4px_4px_0px_0px_#141414]">
          <p className="text-xs font-mono font-bold uppercase text-neutral-600">
            Halaman Evaluasi Capaian Rencana Strategis (Renstra) 2019-2022
          </p>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 py-2 px-4 border-2 border-[#141414] bg-emerald-200 font-mono font-bold text-xs uppercase shadow-[2px_2px_0px_0px_#141414] hover:bg-emerald-300 transition-all"
          >
            <Printer size={16} />
            Cetak Laporan
          </button>
        </div>

        {/* Kop / Banner */}
        <div className="print-block bg-white border-2 border-[#141414] p-8 shadow-[4px_4px_0px_0px_#141414] text-left">
          <span className="inline-block px-3 py-1 bg-yellow-200 border-2 border-[#141414] font-mono font-black text-xs uppercase shadow-[2px_2px_0px_0px_#141414] mb-4">
            Evaluasi Rencana Strategis (RENSTRA)
          </span>
          <h1 className="font-serif italic text-3xl sm:text-5xl mt-2 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-800 to-teal-500 font-black drop-shadow-sm uppercase">
            Analisis Capaian Akhir Periode 2022
          </h1>
          <p className="font-mono text-xs md:text-sm font-bold text-neutral-500 uppercase mt-2">
            Dinas Pertanian, Perikanan dan Ketahanan Pangan Kabupaten Banjarnegara
          </p>
        </div>

        {/* Ringkasan Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-emerald-100 border-2 border-[#141414] p-5 shadow-[4px_4px_0px_0px_#141414] text-left">
            <Award className="w-8 h-8 text-emerald-700 mb-3" />
            <h4 className="font-mono font-bold uppercase text-xs text-emerald-800">Target Tercapai</h4>
            <div className="text-3xl font-serif font-black text-[#141414] mt-1">{achievedSektor} / {totalSektor} Indikator</div>
            <p className="text-[10px] font-mono font-bold text-neutral-500 uppercase mt-2">Indikator dengan realisasi &ge; 100% dari target Renstra.</p>
          </div>
          <div className="bg-yellow-100 border-2 border-[#141414] p-5 shadow-[4px_4px_0px_0px_#141414] text-left">
            <TrendingUp className="w-8 h-8 text-yellow-700 mb-3" />
            <h4 className="font-mono font-bold uppercase text-xs text-yellow-800">Mendekati Target</h4>
            <div className="text-3xl font-serif font-black text-[#141414] mt-1">{nearSektor} / {totalSektor} Indikator</div>
            <p className="text-[10px] font-mono font-bold text-neutral-500 uppercase mt-2">Indikator dengan realisasi berkisar antara 80% s/d 99%.</p>
          </div>
          <div className={`${
            Math.round(((achievedSektor + nearSektor) / totalSektor) * 100) >= 90
              ? "bg-emerald-100"
              : Math.round(((achievedSektor + nearSektor) / totalSektor) * 100) >= 70
              ? "bg-yellow-100"
              : "bg-red-100"
          } border-2 border-[#141414] p-5 shadow-[4px_4px_0px_0px_#141414] text-left`}>
            {Math.round(((achievedSektor + nearSektor) / totalSektor) * 100) >= 90 ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-700 mb-3" />
            ) : Math.round(((achievedSektor + nearSektor) / totalSektor) * 100) >= 70 ? (
              <AlertTriangle className="w-8 h-8 text-yellow-700 mb-3" />
            ) : (
              <XCircle className="w-8 h-8 text-red-700 mb-3" />
            )}
            <h4 className={`font-mono font-bold uppercase text-xs ${
              Math.round(((achievedSektor + nearSektor) / totalSektor) * 100) >= 90
                ? "text-emerald-800"
                : Math.round(((achievedSektor + nearSektor) / totalSektor) * 100) >= 70
                ? "text-yellow-800"
                : "text-red-800"
            }`}>Tingkat Keselarasan</h4>
            <div className="text-3xl font-serif font-black text-[#141414] mt-1">
              {Math.round(((achievedSektor + nearSektor) / totalSektor) * 100)}%
            </div>
            <p className="text-[10px] font-mono font-bold text-neutral-500 uppercase mt-2">Proporsi target Renstra yang berhasil direalisasikan secara optimal.</p>
          </div>
        </div>

        {/* 4 Poin Utama Tujuan Renstra (dari PDF) */}
        <div className="print-block bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] text-left">
          <h3 className="text-md font-mono font-black uppercase border-b-2 border-[#141414] pb-2 mb-4 flex items-center gap-2">
            <FileText size={18} className="text-emerald-700" />
            Tujuan Pelaksanaan Renstra (Bab IV)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono font-bold text-xs uppercase text-neutral-700">
            <div className="p-4 border-2 border-dashed border-neutral-300">
              <span className="text-emerald-700 block mb-1">01. Ketersediaan Pangan</span>
              <p className="text-[10px] text-neutral-500 leading-relaxed font-bold">Menjamin pasokan pangan yang cukup, aman, dan berkelanjutan bagi seluruh penduduk Kabupaten Banjarnegara.</p>
            </div>
            <div className="p-4 border-2 border-dashed border-neutral-300">
              <span className="text-emerald-700 block mb-1">02. Pengembangan SDM Pertanian</span>
              <p className="text-[10px] text-neutral-500 leading-relaxed font-bold">Memberdayakan petani, pembudidaya ikan, dan peternak melalui penerapan teknologi tepat guna lokal.</p>
            </div>
            <div className="p-4 border-2 border-dashed border-neutral-300">
              <span className="text-emerald-700 block mb-1">03. Pendapatan Pelaku Usaha</span>
              <p className="text-[10px] text-neutral-500 leading-relaxed font-bold">Meningkatkan kesejahteraan pelaku usaha pertanian lewat kenaikan nilai tambah, efisiensi produksi, dan akses pasar.</p>
            </div>
            <div className="p-4 border-2 border-dashed border-neutral-300">
              <span className="text-emerald-700 block mb-1">04. Akuntabilitas & Pelayanan</span>
              <p className="text-[10px] text-neutral-500 leading-relaxed font-bold">Mewujudkan tata kelola pemerintahan yang baik, transparan, dan berorientasi penuh pada kepuasan masyarakat.</p>
            </div>
          </div>
        </div>

        {/* Tabel Perbandingan Capaian */}
        <div className="print-block bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414]">
          <h3 className="text-md font-mono font-black uppercase border-b-2 border-[#141414] pb-2 mb-4 text-left">
            Tabel Evaluasi Indikator Kinerja Renstra 2022 vs Realisasi Riil
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-[#141414] bg-emerald-50">
                  <th className="p-3 uppercase">Bidang / Urusan</th>
                  <th className="p-3 uppercase">Indikator Kinerja</th>
                  <th className="p-3 uppercase text-right">Target Renstra</th>
                  <th className="p-3 uppercase text-right">Realisasi Riil</th>
                  <th className="p-3 uppercase text-center">Persentase</th>
                  <th className="p-3 uppercase text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((c, idx) => (
                  <tr key={idx} className="border-b border-neutral-300 hover:bg-neutral-50">
                    <td className="p-3 font-bold uppercase">{c.kategori}</td>
                    <td className="p-3 font-bold text-neutral-700 uppercase">
                      {c.indikator}
                      <span className="block text-[9px] font-normal text-neutral-400 normal-case mt-0.5">{c.keterangan}</span>
                    </td>
                    <td className="p-3 text-right font-bold text-neutral-600">
                      {new Intl.NumberFormat("id-ID").format(c.target2022)} {c.satuan}
                    </td>
                    <td className="p-3 text-right font-black text-emerald-800">
                      {new Intl.NumberFormat("id-ID").format(Math.round(c.actual))} {c.satuan}
                    </td>
                    <td className="p-3 text-center font-bold">
                      {c.persentase.toFixed(1)}%
                    </td>
                    <td className="p-3 text-center">
                      {c.status === "achieved" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 border-2 border-green-700 text-green-700 font-black text-[9px] uppercase">
                          <CheckCircle2 size={10} /> Tercapai
                        </span>
                      )}
                      {c.status === "near" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-100 border-2 border-yellow-700 text-yellow-700 font-black text-[9px] uppercase">
                          <AlertTriangle size={10} /> Mendekati
                        </span>
                      )}
                      {c.status === "under" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 border-2 border-red-700 text-red-700 font-black text-[9px] uppercase">
                          <XCircle size={10} /> Belum Tercapai
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rekomendasi Sinkronisasi Renstra berikutnya */}
        <div className="print-block bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] text-left">
          <h3 className="text-md font-mono font-black uppercase border-b-2 border-[#141414] pb-2 mb-4">
            Catatan Evaluasi &amp; Sinkronisasi Data
          </h3>
          <ul className="space-y-3 font-mono font-bold text-xs uppercase text-neutral-600">
            <li className="flex items-start gap-2">
              <ArrowRight size={14} className="text-emerald-600 mt-0.5 shrink-0" />
              <span>
                Capaian sektor pertanian dan peternakan menunjukkan tingkat realisasi yang sangat memuaskan, di mana target populasi hewan ternak besar dan padi berhasil diselesaikan di atas rata-rata rencana awal.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight size={14} className="text-emerald-600 mt-0.5 shrink-0" />
              <span>
                Untuk Renstra periode berikutnya, disarankan mempererat sinkronisasi alur data CKAN online agar tidak ada keterlambatan pelaporan di 4 kecamatan kosong di peta utama.
              </span>
            </li>
          </ul>
        </div>
      </section>
    </DefaultLayout>
  );
}
