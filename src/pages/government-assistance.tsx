import { useMemo } from "react";
import DefaultLayout from "@/layouts/default";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  Coins,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  FileSpreadsheet,
  HelpCircle,
} from "lucide-react";

// Mock data alokasi dana bantuan pemerintah (APBD vs APBN) dalam Miliar Rp
const allocationData = [
  { tahun: "2020", APBD: 2.1, APBN: 4.5, total: 6.6 },
  { tahun: "2021", APBD: 2.8, APBN: 5.2, total: 8.0 },
  { tahun: "2022", APBD: 3.5, APBN: 6.8, total: 10.3 },
  { tahun: "2023", APBD: 4.2, APBN: 7.5, total: 11.7 },
  { tahun: "2024", APBD: 4.8, APBN: 8.7, total: 13.5 },
];

// Mock data korelasi besaran bantuan (Miliar Rp) terhadap pertumbuhan produksi (%)
const correlationData = [
  { sektor: "Tanaman Pangan", bantuan: 5.2, kenaikanProduksi: 14.2 },
  { sektor: "Hortikultura", bantuan: 2.8, kenaikanProduksi: 10.5 },
  { sektor: "Peternakan", bantuan: 3.1, kenaikanProduksi: 8.7 },
  { sektor: "Perikanan Budidaya", bantuan: 1.8, kenaikanProduksi: 6.4 },
  { sektor: "Perkebunan", bantuan: 0.6, kenaikanProduksi: 2.1 },
];

// Mock daftar program bantuan
const programList = [
  {
    nama: "Bantuan Alat Mesin Pertanian (Combine Harvester & Traktor)",
    sumber: "APBN 2024",
    nilai: "Rp 3,2 Miliar",
    sektor: "Tanaman Pangan",
    penerima: "54 Kelompok Tani",
    dampak: "Tinggi (+15% efisiensi waktu panen)",
  },
  {
    nama: "Penyaluran Pupuk Organik Cair & NPK Non-Subsidi",
    sumber: "APBD 2024",
    nilai: "Rp 1,8 Miliar",
    sektor: "Hortikultura",
    penerima: "42 Kelompok Tani",
    dampak: "Sedang (+8% volume panen)",
  },
  {
    nama: "Revitalisasi Sarana Prasana Kolam Budidaya Nila",
    sumber: "APBD 2023",
    nilai: "Rp 980 Juta",
    sektor: "Perikanan",
    penerima: "18 Pembudidaya",
    dampak: "Tinggi (+12% produksi ikan)",
  },
  {
    nama: "Pengadaan Inseminasi Buatan & Vaksin Penyakit Mulut Kuku",
    sumber: "APBN 2023",
    nilai: "Rp 1,5 Miliar",
    sektor: "Peternakan",
    penerima: "85 Kelompok Ternak",
    dampak: "Tinggi (0% penularan PMK baru)",
  },
  {
    nama: "Bantuan Bibit Kopi Arabika Batur Unggul",
    sumber: "APBD 2023",
    nilai: "Rp 450 Juta",
    sektor: "Perkebunan",
    penerima: "12 Kelompok Tani",
    dampak: "Sedang (+5% luas area tanam)",
  },
];

export default function GovernmentAssistancePage() {
  const totalBantuan = useMemo(() => {
    return allocationData.reduce((acc, curr) => acc + curr.total, 0);
  }, []);

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8 py-2">
        {/* Hero / Intro */}
        <section className="relative text-left animate-fade-in py-4 md:py-8 flex flex-col md:flex-row items-center justify-between gap-8 border-b-2 border-dashed border-neutral-300 pb-8">
          <div className="relative z-10 flex-1">
            <h2 className="font-serif italic text-3xl sm:text-5xl mt-2 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-800 to-teal-500 font-black drop-shadow-sm">
              Analisis Bantuan Pemerintah
            </h2>
            <p className="font-mono text-sm md:text-base font-medium text-[#4a4a4a] mt-4 max-w-2xl border-l-4 border-emerald-500 pl-4 bg-white/80 py-1">
              Korelasi penyaluran anggaran bantuan APBD/APBN terhadap laju pertumbuhan produktivitas sektor pertanian Banjarnegara.
            </p>
          </div>
          <div className="w-full md:w-48 lg:w-64 shrink-0 flex items-center justify-center">
            <img
              src="/img/economic-value.png"
              alt="Analisis Bantuan Pemerintah"
              className="w-full max-h-32 md:max-h-36 object-contain"
            />
          </div>
        </section>

        {/* Disclaimer Banner - Mengingatkan ini adalah Data Demo */}
        <div className="bg-yellow-50 border-2 border-yellow-400 p-4 flex items-start gap-3 shadow-[4px_4px_0px_0px_#facc15]">
          <AlertTriangle className="text-yellow-600 shrink-0 mt-0.5" size={20} />
          <div className="text-left font-mono text-xs text-yellow-800">
            <span className="font-black uppercase block mb-1">PEMBERITAHUAN (DEMO MODE)</span>
            Saat ini basis data riil alokasi anggaran bantuan pemerintah per kelompok tani belum tersedia/diintegrasikan secara spasial dari Dinas Pertanian Banjarnegara. Grafik dan angka di bawah disajikan menggunakan data simulasi/dummy untuk kebutuhan demonstrasi prototipe SIMPERTAN.
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-emerald-50 border-2 border-[#141414] p-5 shadow-[4px_4px_0px_0px_#141414] text-left">
            <span className="text-[10px] font-mono font-bold uppercase text-emerald-800 tracking-wider block mb-1">Akumulasi Bantuan</span>
            <h3 className="text-2xl font-serif font-black text-[#141414] leading-tight">Rp {totalBantuan.toFixed(1).replace(".", ",")} M</h3>
            <p className="text-[10px] font-mono text-neutral-500 mt-2 uppercase">Total Alokasi APBD & APBN (2020-2024)</p>
          </div>
          <div className="bg-blue-50 border-2 border-[#141414] p-5 shadow-[4px_4px_0px_0px_#141414] text-left">
            <span className="text-[10px] font-mono font-bold uppercase text-blue-800 tracking-wider block mb-1">Sumber Dana APBN</span>
            <h3 className="text-2xl font-serif font-black text-[#141414] leading-tight">Rp 34,6 M</h3>
            <p className="text-[10px] font-mono text-neutral-500 mt-2 uppercase">Kontribusi Subsidi & Alat Mesin Pusat</p>
          </div>
          <div className="bg-purple-50 border-2 border-[#141414] p-5 shadow-[4px_4px_0px_0px_#141414] text-left">
            <span className="text-[10px] font-mono font-bold uppercase text-purple-800 tracking-wider block mb-1">Kelompok Penerima</span>
            <h3 className="text-2xl font-serif font-black text-[#141414] leading-tight">211 Poktan</h3>
            <p className="text-[10px] font-mono text-neutral-500 mt-2 uppercase">Tersebar di 20 Kecamatan</p>
          </div>
          <div className="bg-amber-50 border-2 border-[#141414] p-5 shadow-[4px_4px_0px_0px_#141414] text-left">
            <span className="text-[10px] font-mono font-bold uppercase text-amber-800 tracking-wider block mb-1">Rata-rata Dampak</span>
            <h3 className="text-2xl font-serif font-black text-[#141414] leading-tight">+8.3% / Th</h3>
            <p className="text-[10px] font-mono text-neutral-500 mt-2 uppercase">Laju Peningkatan Produksi Sektoral</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
          {/* Trend Bantuan */}
          <div className="bg-white border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] p-6">
            <h3 className="text-md font-mono font-bold uppercase mb-4 flex items-center gap-2">
              <Coins size={18} className="text-emerald-700" />
              Trend Perkembangan Alokasi Bantuan (Miliar Rp)
            </h3>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={allocationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="tahun" stroke="#141414" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <YAxis stroke="#141414" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <Tooltip contentStyle={{ fontFamily: 'monospace', fontSize: '11px', border: '2px solid #141414' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                  <Bar dataKey="APBD" stackId="a" fill="#10b981" name="APBD Kabupaten" />
                  <Bar dataKey="APBN" stackId="a" fill="#3b82f6" name="APBN Pusat" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Korelasi Dampak Bantuan */}
          <div className="bg-white border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] p-6">
            <h3 className="text-md font-mono font-bold uppercase mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-700" />
              Efektivitas Bantuan terhadap Laju Produksi (%)
            </h3>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={correlationData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="sektor" stroke="#141414" tick={{ fontSize: 9, fontFamily: 'monospace' }} />
                  <YAxis stroke="#141414" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <Tooltip contentStyle={{ fontFamily: 'monospace', fontSize: '11px', border: '2px solid #141414' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                  <Line type="monotone" dataKey="bantuan" stroke="#3b82f6" name="Bantuan (Miliar Rp)" strokeWidth={2} activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="kenaikanProduksi" stroke="#10b981" name="Kenaikan Produksi (%)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Tabel Alokasi Program Bantuan */}
        <div className="bg-white border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] p-6 text-left">
          <h3 className="text-md font-mono font-bold uppercase mb-4 flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-purple-700" />
            Daftar Alokasi Program Kerja Bantuan Utama (APBD & APBN)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-[#141414] bg-neutral-50">
                  <th className="p-3 uppercase">Nama Program Kerja</th>
                  <th className="p-3 uppercase">Sumber Dana</th>
                  <th className="p-3 uppercase text-right">Nilai Anggaran</th>
                  <th className="p-3 uppercase">Sektor Target</th>
                  <th className="p-3 uppercase text-center">Indikator Dampak</th>
                </tr>
              </thead>
              <tbody>
                {programList.map((p, idx) => (
                  <tr key={idx} className="border-b border-neutral-200 hover:bg-neutral-50">
                    <td className="p-3 font-bold text-neutral-800">{p.nama}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 border text-[10px] font-bold ${
                        p.sumber.includes("APBN") ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}>
                        {p.sumber}
                      </span>
                    </td>
                    <td className="p-3 text-right font-black text-[#141414]">{p.nilai}</td>
                    <td className="p-3 uppercase font-medium">{p.sektor}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 border text-[10px] font-black uppercase ${
                        p.dampak.includes("Tinggi") ? "bg-green-100 text-green-700 border-green-300" : "bg-yellow-100 text-yellow-700 border-yellow-300"
                      }`}>
                        <ArrowUpRight size={10} /> {p.dampak}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Insight / Rekomendasi Alokasi */}
        <div className="bg-white border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] p-6 text-left">
          <h3 className="text-md font-mono font-bold uppercase mb-4 flex items-center gap-2">
            <HelpCircle size={18} className="text-amber-700" />
            Catatan Rekomendasi Alokasi Bantuan
          </h3>
          <ul className="space-y-3 font-mono text-xs text-neutral-600">
            <li className="flex items-start gap-2">
              <span className="text-emerald-700 font-bold">▸</span>
              <span>
                <strong>Efisiensi Mekanisasi:</strong> Berdasarkan data simulasi korelasi, sektor tanaman pangan (Padi) mencatat ROI tertinggi terhadap bantuan mekanisasi (Alsintan) karena langsung menekan waktu kehilangan panen (*losses*).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-700 font-bold">▸</span>
              <span>
                <strong>Hilirisasi Sektor Peternakan:</strong> Disarankan untuk memperbesar anggaran APBD pada bantuan pascapanen peternakan (alat pasteurisasi dan boks pendingin daging) untuk meningkatkan pendapatan peternak lokal.
              </span>
            </li>
          </ul>
        </div>
      </section>
    </DefaultLayout>
  );
}
