import { useMemo } from "react";
import DefaultLayout from "@/layouts/default";
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
  actual2022: number;
  satuan: string;
  keterangan: string;
}

export default function RenstraPage() {
  const tanggalCetak = useMemo(
    () =>
      new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [],
  );

  // Data historis resmi evaluasi Renstra tahun 2022 (Fixed & Hardcoded untuk stabilitas laporan)
  const targets: RenstraTarget[] = [
    {
      kategori: "Pertanian & Tanaman Pangan",
      indikator: "Produksi Padi Tahunan",
      target2022: 162069,
      actual2022: 170806,
      satuan: "Ton",
      keterangan: "Produksi gabungan padi sawah dan ladang di seluruh kecamatan Kabupaten Banjarnegara.",
    },
    {
      kategori: "Peternakan",
      indikator: "Populasi Sapi (Potong & Perah)",
      target2022: 32269,
      actual2022: 30270,
      satuan: "Ekor",
      keterangan: "Populasi sapi potong dan perah untuk mendukung ketahanan protein daerah.",
    },
    {
      kategori: "Peternakan",
      indikator: "Populasi Kambing & Domba",
      target2022: 263925,
      actual2022: 303490,
      satuan: "Ekor",
      keterangan: "Didorong pertumbuhan kambing Jawa/PE dan budidaya ras unggul Domba Batur.",
    },
    {
      kategori: "Perikanan",
      indikator: "Produksi Perikanan Budidaya",
      target2022: 41901,
      actual2022: 24364,
      satuan: "Ton",
      keterangan: "Produksi gabungan perikanan kolam pembesaran, karamba, dan mina padi.",
    },
  ];

  const comparisons = useMemo(() => {
    return targets.map((t) => {
      const persentase = (t.actual2022 / t.target2022) * 100;
      let status: "achieved" | "near" | "under" = "under";
      if (persentase >= 100) status = "achieved";
      else if (persentase >= 80) status = "near";

      return {
        ...t,
        persentase,
        status,
      };
    });
  }, []);

  const totalSektor = comparisons.length;
  const achievedSektor = comparisons.filter((c) => c.status === "achieved").length;
  const nearSektor = comparisons.filter((c) => c.status === "near").length;
  const alignmentRate = Math.round(((achievedSektor + nearSektor) / totalSektor) * 100);

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
          <p className="text-[10px] font-mono text-neutral-400 mt-1 uppercase">
            Berdasarkan Analisis Data Terbuka · Dicetak {tanggalCetak}
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
          <div className={`border-2 border-[#141414] p-5 shadow-[4px_4px_0px_0px_#141414] text-left ${
            alignmentRate >= 90 ? "bg-emerald-100" : alignmentRate >= 70 ? "bg-yellow-100" : "bg-red-100"
          }`}>
            {alignmentRate >= 90 ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-700 mb-3" />
            ) : alignmentRate >= 70 ? (
              <AlertTriangle className="w-8 h-8 text-yellow-700 mb-3" />
            ) : (
              <XCircle className="w-8 h-8 text-red-700 mb-3" />
            )}
            <h4 className={`font-mono font-bold uppercase text-xs ${
              alignmentRate >= 90 ? "text-emerald-800" : alignmentRate >= 70 ? "text-yellow-800" : "text-red-800"
            }`}>Tingkat Keselarasan</h4>
            <div className="text-3xl font-serif font-black text-[#141414] mt-1">
              {alignmentRate}%
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
                      {new Intl.NumberFormat("id-ID").format(c.actual2022)} {c.satuan}
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

        {/* Catatan Evaluasi */}
        <div className="print-block bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] text-left">
          <h3 className="text-md font-mono font-black uppercase border-b-2 border-[#141414] pb-2 mb-4">
            Catatan Evaluasi &amp; Sinkronisasi Data
          </h3>
          <ul className="space-y-3 font-mono font-bold text-xs uppercase text-neutral-600">
            <li className="flex items-start gap-2">
              <ArrowRight size={14} className="text-emerald-600 mt-0.5 shrink-0" />
              <span>
                Capaian sektor pertanian (Padi) dan peternakan (Kambing &amp; Domba) melampaui target Renstra 2022 secara optimal.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight size={14} className="text-emerald-600 mt-0.5 shrink-0" />
              <span>
                Populasi Sapi menunjukkan kemajuan yang sangat positif mendekati target akhir dengan tingkat ketercapaian 93.8%.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight size={14} className="text-emerald-600 mt-0.5 shrink-0" />
              <span>
                Sektor perikanan budidaya kolam air tawar memerlukan intervensi pembibitan mandiri pada periode Renstra berikutnya untuk menaikkan volume produksi.
              </span>
            </li>
          </ul>
        </div>
      </section>
    </DefaultLayout>
  );
}
