import { useEffect, useMemo, useState } from "react";
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
import {
  fetchBantuanPemerintah,
  formatRupiahShort,
  formatTanggal,
  type BantuanData,
} from "@/services/bantuan";

// Semua data halaman ini bersumber dari backend MySQL SISPERTANI (input manual
// admin Distan via Dasbor Admin /admin — import Excel) — lihat src/services/bantuan.ts.

export default function GovernmentAssistancePage() {
  // null = sedang memuat; setelah itu selalu ada nilai (bisa kosong).
  const [bantuan, setBantuan] = useState<BantuanData | null>(null);

  useEffect(() => {
    let alive = true;
    fetchBantuanPemerintah().then((d) => {
      if (alive) setBantuan(d);
    });
    return () => {
      alive = false;
    };
  }, []);

  const program = bantuan?.program ?? [];
  const alokasi = bantuan?.alokasi ?? [];
  const korelasi = bantuan?.korelasi ?? [];
  const adaData =
    program.length > 0 || alokasi.length > 0 || korelasi.length > 0;

  const totalBantuan = useMemo(
    () => program.reduce((acc, p) => acc + (p.nilaiRupiah || 0), 0),
    [program],
  );
  const totalApbn = useMemo(
    () =>
      program
        .filter((p) => p.sumber === "APBN")
        .reduce((acc, p) => acc + (p.nilaiRupiah || 0), 0),
    [program],
  );
  const totalPenerima = useMemo(
    () => program.reduce((acc, p) => acc + (p.penerimaJumlah || 0), 0),
    [program],
  );
  const rataDampak = useMemo(() => {
    if (korelasi.length === 0) return null;
    return (
      korelasi.reduce((acc, k) => acc + (k.kenaikanProduksiPct || 0), 0) /
      korelasi.length
    );
  }, [korelasi]);

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8 py-2">
        {/* Hero / Intro */}
        <section className="relative text-left animate-fade-in py-4 md:py-8 flex flex-col md:flex-row items-center justify-between gap-8 border-b border-slate-200 pb-8">
          <div className="relative z-10 flex-1">
            <h2 className="text-2xl sm:text-4xl leading-tight font-bold tracking-tight text-slate-800">
              Analisis Bantuan
            </h2>
            <p className="text-xs md:text-sm font-medium text-slate-500 mt-2 max-w-2xl border-l-2 border-blue-500 pl-3">
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

        {/* Banner status data */}
        {bantuan === null ? (
          <div className="bg-slate-50 border border-slate-200 p-4 flex items-start gap-3 shadow-sm">
            <Coins className="text-slate-400 shrink-0 mt-0.5" size={20} />
            <div className="text-left text-xs text-slate-500">
              <span className="font-semibold uppercase block mb-1">MEMUAT DATA</span>
              Mengambil data bantuan pemerintah terbaru…
            </div>
          </div>
        ) : !adaData ? (
          <div className="bg-sky-50 border border-sky-400 p-4 flex items-start gap-3 shadow-sm">
            <AlertTriangle className="text-sky-600 shrink-0 mt-0.5" size={20} />
            <div className="text-left text-xs text-sky-800">
              <span className="font-semibold uppercase block mb-1">BELUM ADA DATA</span>
              Data alokasi bantuan pemerintah belum diinput. Grafik dan tabel di bawah akan terisi otomatis setelah admin Dinas Pertanian mengisi data melalui dasbor admin SISPERTANI.
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-400 p-4 flex items-start gap-3 shadow-sm">
            <Coins className="text-emerald-600 shrink-0 mt-0.5" size={20} />
            <div className="text-left text-xs text-emerald-800">
              <span className="font-semibold uppercase block mb-1">DATA BANTUAN PEMERINTAH</span>
              Data diperbarui per {bantuan.updatedAt ? formatTanggal(bantuan.updatedAt) : "-"} — diinput manual oleh admin Dinas Pertanian Banjarnegara.
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-emerald-50 border border-slate-200 p-5 shadow-sm text-left">
            <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider block mb-1">Akumulasi Bantuan</span>
            <h3 className="text-2xl font-semibold text-slate-800 leading-tight">{formatRupiahShort(totalBantuan)}</h3>
            <p className="text-[10px] text-slate-500 mt-2 uppercase">Total Nilai {program.length} Program Bantuan</p>
          </div>
          <div className="bg-blue-50 border border-slate-200 p-5 shadow-sm text-left">
            <span className="text-[10px] font-bold uppercase text-blue-800 tracking-wider block mb-1">Sumber Dana APBN</span>
            <h3 className="text-2xl font-semibold text-slate-800 leading-tight">{formatRupiahShort(totalApbn)}</h3>
            <p className="text-[10px] text-slate-500 mt-2 uppercase">Kontribusi Subsidi & Alat Mesin Pusat</p>
          </div>
          <div className="bg-blue-50 border border-slate-200 p-5 shadow-sm text-left">
            <span className="text-[10px] font-bold uppercase text-blue-800 tracking-wider block mb-1">Penerima Bantuan</span>
            <h3 className="text-2xl font-semibold text-slate-800 leading-tight">{totalPenerima.toLocaleString("id-ID")}</h3>
            <p className="text-[10px] text-slate-500 mt-2 uppercase">Akumulasi Kelompok & Petani Penerima</p>
          </div>
          <div className="bg-amber-50 border border-slate-200 p-5 shadow-sm text-left">
            <span className="text-[10px] font-bold uppercase text-amber-800 tracking-wider block mb-1">Rata-rata Dampak</span>
            <h3 className="text-2xl font-semibold text-slate-800 leading-tight">
              {rataDampak === null ? "—" : `+${rataDampak.toFixed(1).replace(".", ",")}%`}
            </h3>
            <p className="text-[10px] text-slate-500 mt-2 uppercase">Laju Peningkatan Produksi Sektoral</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
          {/* Trend Bantuan */}
          <div className="bg-white border border-slate-200 shadow-sm p-6">
            <h3 className="text-md font-bold uppercase mb-4 flex items-center gap-2">
              <Coins size={18} className="text-emerald-700" />
              Trend Perkembangan Alokasi Bantuan (Miliar Rp)
            </h3>
            {alokasi.length === 0 ? (
              <div className="w-full h-80 flex items-center justify-center text-xs uppercase text-slate-400 border border-dashed border-slate-200">
                Belum ada data alokasi tahunan
              </div>
            ) : (
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={alokasi.map((a) => ({ tahun: String(a.tahun), APBD: a.apbdMiliar, APBN: a.apbnMiliar }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="tahun" stroke="#64748b" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <Tooltip contentStyle={{ fontFamily: 'monospace', fontSize: '11px', border: '1px solid #e2e8f0' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                  <Bar dataKey="APBD" stackId="a" fill="#10b981" name="APBD Kabupaten" />
                  <Bar dataKey="APBN" stackId="a" fill="#3b82f6" name="APBN Pusat" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            )}
          </div>

          {/* Korelasi Dampak Bantuan */}
          <div className="bg-white border border-slate-200 shadow-sm p-6">
            <h3 className="text-md font-bold uppercase mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-700" />
              Efektivitas Bantuan terhadap Laju Produksi (%)
            </h3>
            {korelasi.length === 0 ? (
              <div className="w-full h-80 flex items-center justify-center text-xs uppercase text-slate-400 border border-dashed border-slate-200">
                Belum ada data korelasi sektor
              </div>
            ) : (
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={korelasi.map((k) => ({ sektor: k.sektor, bantuan: k.bantuanMiliar, kenaikanProduksi: k.kenaikanProduksiPct }))} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="sektor" stroke="#64748b" tick={{ fontSize: 9, fontFamily: 'monospace' }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <Tooltip contentStyle={{ fontFamily: 'monospace', fontSize: '11px', border: '1px solid #e2e8f0' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                  <Line type="monotone" dataKey="bantuan" stroke="#3b82f6" name="Bantuan (Miliar Rp)" strokeWidth={2} activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="kenaikanProduksi" stroke="#10b981" name="Kenaikan Produksi (%)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            )}
          </div>
        </div>

        {/* Tabel Alokasi Program Bantuan */}
        <div className="bg-white border border-slate-200 shadow-sm p-6 text-left">
          <h3 className="text-md font-bold uppercase mb-4 flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-blue-700" />
            Daftar Alokasi Program Kerja Bantuan Utama (APBD & APBN)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="p-3 uppercase">Nama Program Kerja</th>
                  <th className="p-3 uppercase">Sumber Dana</th>
                  <th className="p-3 uppercase text-right">Nilai Anggaran</th>
                  <th className="p-3 uppercase">Sektor Target</th>
                  <th className="p-3 uppercase">Penerima</th>
                  <th className="p-3 uppercase text-center">Indikator Dampak</th>
                </tr>
              </thead>
              <tbody>
                {program.length === 0 ? (
                  <tr className="border-b border-slate-200">
                    <td colSpan={6} className="p-8 text-center text-xs uppercase text-slate-400">
                      Belum ada program bantuan yang diinput
                    </td>
                  </tr>
                ) : (
                  program.map((p, idx) => (
                    <tr key={p._id || `prog-${idx}`} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-800">{p.nama || "-"}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 border text-[10px] font-bold ${
                          p.sumber === "APBN" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}>
                          {p.sumber} {p.tahunAnggaran || ""}
                        </span>
                      </td>
                      <td className="p-3 text-right font-semibold text-slate-800">{formatRupiahShort(p.nilaiRupiah)}</td>
                      <td className="p-3 uppercase font-medium">{p.sektor || "-"}</td>
                      <td className="p-3">{p.penerimaJumlah > 0 ? `${p.penerimaJumlah.toLocaleString("id-ID")} ${p.penerimaJenis}` : "-"}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 border text-[10px] font-semibold uppercase ${
                          p.dampakLevel === "Tinggi" ? "bg-green-100 text-green-700 border-green-300" : "bg-yellow-100 text-yellow-700 border-yellow-300"
                        }`} title={p.dampakCatatan || undefined}>
                          <ArrowUpRight size={10} /> {p.dampakLevel}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Insight / Rekomendasi Alokasi */}
        <div className="bg-white border border-slate-200 shadow-sm p-6 text-left">
          <h3 className="text-md font-bold uppercase mb-4 flex items-center gap-2">
            <HelpCircle size={18} className="text-amber-700" />
            Catatan Rekomendasi Alokasi Bantuan
          </h3>
          <ul className="space-y-3 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <span className="text-emerald-700 font-bold">▸</span>
              <span>
                <strong>Efisiensi Mekanisasi:</strong> Berdasarkan data korelasi bantuan terhadap laju produksi, sektor dengan dampak tertinggi terhadap bantuan mekanisasi (Alsintan) umumnya adalah yang paling menekan waktu kehilangan panen (*losses*).
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
