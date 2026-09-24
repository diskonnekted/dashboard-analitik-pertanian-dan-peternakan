import { useEffect, useState, useMemo } from "react";
import DefaultLayout from "@/layouts/default";
import { LoadingSpinner } from "@/components/ui";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fetchSt2023DesaExtra, St2023DesaExtra } from "@/services/api";
import { MapPin, Users, Home, TrendingUp, Fish, Wheat, FileSpreadsheet } from "lucide-react";

type Aspect = "kelembagaan" | "ternak" | "perikanan";

const ASPECT_META: Record<Aspect, { label: string; sub: string }> = {
  "kelembagaan": {
    label: "Kelembagaan Petani",
    sub: "Rumah tangga petani, jumlah petani, dan keanggotaan kelompok (Tabel 2.9 & 5.1)",
  },
  "ternak": {
    label: "Populasi Ternak",
    sub: "Populasi ternak per 1 Mei 2023 menurut jenis (Tabel 9.9)",
  },
  "perikanan": {
    label: "Perikanan",
    sub: "Rumah tangga usaha perikanan budidaya dan tangkap (Tabel 10.1)",
  },
};

const TERNAK_LABEL: Record<string, string> = {
  sapiPotong: "Sapi Potong",
  sapiPerah: "Sapi Perah",
  kerbau: "Kerbau",
  kuda: "Kuda",
  babi: "Babi",
  kambing: "Kambing",
  domba: "Domba",
  kelinci: "Kelinci",
  ayamRasPedaging: "Ayam Ras Pedaging",
  ayamRasPetelur: "Ayam Ras Petelur",
  ayamKampung: "Ayam Kampung",
  itik: "Itik",
  puyuh: "Puyuh",
  angsa: "Angsa",
  kalkun: "Kalkun",
  merpati: "Merpati",
  walet: "Walet",
  unggasLainnya: "Unggas Lainnya",
};

const TERNAK_BESAR = ["sapiPotong", "sapiPerah", "kerbau", "kuda"];
const TERNAK_KECIL = ["babi", "kambing", "domba", "kelinci"];
const TERNAK_UNGGAS = [
  "ayamRasPedaging", "ayamRasPetelur", "ayamKampung", "itik", "puyuh",
  "angsa", "kalkun", "merpati", "walet", "unggasLainnya",
];

const JENIS_OPTIONS: { value: string; label: string }[] = [
  { value: "total", label: "Total Semua Ternak" },
  { value: "grp:besar", label: "Kelompok: Ternak Besar" },
  { value: "grp:kecil", label: "Kelompok: Ternak Kecil" },
  { value: "grp:unggas", label: "Kelompok: Unggas" },
  ...Object.entries(TERNAK_LABEL).map(([value, label]) => ({ value, label })),
];

type Agg = {
  name: string;
  unitLabel: string;
  rumahTanggaPetani: number;
  petani: number;
  rtAnggotaKelompok: number;
  rtBukanAnggotaKelompok: number;
  rtup: number;
  rtPerikanan: number;
  rtPerikananBudidaya: number;
  rtPerikananTangkap: number;
  ternak: Record<string, number>;
};

export default function SensusPage() {
  const [rows, setRows] = useState<St2023DesaExtra[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [aspect, setAspect] = useState<Aspect>("kelembagaan");
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>("Semua");
  const [jenisTernak, setJenisTernak] = useState<string>("total");

  useEffect(() => {
    const load = async () => {
      try {
        setRows(await fetchSt2023DesaExtra());
      } catch (err) {
        console.error("Gagal memuat data ST2023:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const uniqueKecamatan = useMemo(() => {
    return ["Semua", ...Array.from(new Set(rows.map((r) => r.kecamatan))).sort()];
  }, [rows]);

  // Agregasi: per kecamatan (Semua) atau per desa (kecamatan tertentu)
  const agg = useMemo<Agg[]>(() => {
    const base = selectedKecamatan === "Semua"
      ? rows
      : rows.filter((r) => r.kecamatan === selectedKecamatan);

    const map = new Map<string, Agg>();
    base.forEach((r) => {
      const key = selectedKecamatan === "Semua" ? r.kecamatan : r.desa;
      if (!map.has(key)) {
        map.set(key, {
          name: key,
          unitLabel: selectedKecamatan === "Semua" ? "Kecamatan" : "Desa",
          rumahTanggaPetani: 0,
          petani: 0,
          rtAnggotaKelompok: 0,
          rtBukanAnggotaKelompok: 0,
          rtup: 0,
          rtPerikanan: 0,
          rtPerikananBudidaya: 0,
          rtPerikananTangkap: 0,
          ternak: {},
        });
      }
      const a = map.get(key)!;
      a.rumahTanggaPetani += r.rumahTanggaPetani || 0;
      a.petani += r.petani || 0;
      a.rtAnggotaKelompok += r.rtAnggotaKelompok || 0;
      a.rtBukanAnggotaKelompok += r.rtBukanAnggotaKelompok || 0;
      a.rtup += r.rtup || 0;
      a.rtPerikanan += r.rtPerikanan || 0;
      a.rtPerikananBudidaya += r.rtPerikananBudidaya || 0;
      a.rtPerikananTangkap += r.rtPerikananTangkap || 0;
      if (r.ternak) {
        Object.entries(r.ternak).forEach(([k, v]) => {
          a.ternak[k] = (a.ternak[k] || 0) + (v || 0);
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows, selectedKecamatan]);

  const sum = (pick: (a: Agg) => number) => agg.reduce((acc, a) => acc + pick(a), 0);

  const ternakValue = (a: Agg, jenis: string): number => {
    if (jenis === "total") {
      return Object.values(a.ternak).reduce((x, y) => x + y, 0);
    }
    if (jenis.startsWith("grp:")) {
      const grp = jenis.slice(4);
      const list = grp === "besar" ? TERNAK_BESAR : grp === "kecil" ? TERNAK_KECIL : TERNAK_UNGGAS;
      return list.reduce((x, k) => x + (a.ternak[k] || 0), 0);
    }
    return a.ternak[jenis] || 0;
  };

  const jenisLabel = (jenis: string): string => {
    if (jenis === "total") return "Total Semua Ternak";
    if (jenis.startsWith("grp:")) {
      const grp = jenis.slice(4);
      return `Kelompok ${grp === "besar" ? "Ternak Besar" : grp === "kecil" ? "Ternak Kecil" : "Unggas"}`;
    }
    return TERNAK_LABEL[jenis] || jenis;
  };

  const formatNum = (num: number) =>
    new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(num);
  const formatCell = (v: number) => (v > 0 ? formatNum(v) : "–");

  const unitWord = selectedKecamatan === "Semua" ? "kecamatan" : "desa";

  // ===== Perhitungan ringkasan per aspek =====
  const totals = useMemo(() => {
    const rtPetani = sum((a) => a.rumahTanggaPetani);
    const petani = sum((a) => a.petani);
    const rtup = sum((a) => a.rtup);
    const anggota = sum((a) => a.rtAnggotaKelompok);
    const bukan = sum((a) => a.rtBukanAnggotaKelompok);
    const rtPerikanan = sum((a) => a.rtPerikanan);
    const budidaya = sum((a) => a.rtPerikananBudidaya);
    const tangkap = sum((a) => a.rtPerikananTangkap);
    const ternakTotal = agg.reduce((x, a) => x + ternakValue(a, "total"), 0);
    return {
      rtPetani, petani, rtup, anggota, bukan, rtPerikanan, budidaya, tangkap, ternakTotal,
      jenisCount: Object.keys(TERNAK_LABEL).filter((k) => agg.some((a) => (a.ternak[k] || 0) > 0)).length,
      pctAnggota: anggota + bukan > 0 ? (anggota / (anggota + bukan)) * 100 : null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agg]);

  const topTernakKec = useMemo(() => {
    let best = { name: "—", value: 0 };
    agg.forEach((a) => {
      const v = ternakValue(a, jenisTernak);
      if (v > best.value) best = { name: a.name, value: v };
    });
    return best;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agg, jenisTernak]);

  // Populasi per jenis (tabel jenis ternak) — hanya saat tampilan ternak
  const jenisPopulation = useMemo(() => {
    return Object.keys(TERNAK_LABEL)
      .map((k) => ({
        key: k,
        label: TERNAK_LABEL[k],
        value: agg.reduce((x, a) => x + (a.ternak[k] || 0), 0),
      }))
      .filter((j) => j.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [agg]);

  const chartDataTernak = useMemo(() => {
    return agg
      .map((a) => ({ name: a.name, nilai: ternakValue(a, jenisTernak) }))
      .sort((a, b) => b.nilai - a.nilai);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agg, jenisTernak]);

  return (
    <DefaultLayout>
      <div className="flex flex-col gap-6">
        {/* ===== Kepala Halaman ===== */}
        <header className="border-b border-slate-200 pb-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-800">
            Badan Pusat Statistik · Sensus Pertanian 2023
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 mt-1.5">
            Sensus Pertanian 2023 (BPS)
          </h1>
          <p className="text-sm text-slate-700 mt-1 max-w-3xl">
            Potret menyeluruh hasil Sensus Pertanian 2023 untuk {rows.length} desa di seluruh
            Kabupaten Banjarnegara: rumah tangga petani, populasi ternak (posisi 1 Mei 2023),
            dan rumah tangga usaha perikanan. Data sensus lengkap — seluruh wilayah tercacat.
          </p>
        </header>

        {/* ===== Panel Filter ===== */}
        <section className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                Aspek Data
              </label>
              <div className="flex rounded-md border border-slate-300 overflow-hidden bg-white">
                {(Object.keys(ASPECT_META) as Aspect[]).map((a) => (
                  <button
                    key={a}
                    onClick={() => setAspect(a)}
                    className={`flex-1 py-2 px-2 text-xs font-medium transition-colors ${
                      aspect === a
                        ? "bg-blue-800 text-white"
                        : "text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    {ASPECT_META[a].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="ss-kec" className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                Wilayah
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                <select
                  id="ss-kec"
                  value={selectedKecamatan}
                  onChange={(e) => setSelectedKecamatan(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 appearance-none cursor-pointer"
                >
                  {uniqueKecamatan.map((kec) => (
                    <option key={kec} value={kec}>
                      {kec === "Semua" ? "Semua Kecamatan (per kecamatan)" : `Kec. ${kec} (per desa)`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {aspect === "ternak" && (
              <div>
                <label htmlFor="ss-jenis" className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                  Jenis / Kelompok Ternak
                </label>
                <div className="relative">
                  <Wheat className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                  <select
                    id="ss-jenis"
                    value={jenisTernak}
                    onChange={(e) => setJenisTernak(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 appearance-none cursor-pointer"
                  >
                    {JENIS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-3 border-t border-slate-100 pt-3">
            Menampilkan: <span className="text-slate-800 font-medium">{ASPECT_META[aspect].label}</span>
            {" · "}<span className="text-slate-800 font-medium">{ASPECT_META[aspect].sub}</span>
            {" · "}<span className="text-slate-800 font-medium">
              {selectedKecamatan === "Semua" ? "20 kecamatan" : `Kecamatan ${selectedKecamatan}, per desa`}
            </span>
          </p>
        </section>

        {loading ? (
          <LoadingSpinner label="Memuat data sensus…" />
        ) : rows.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
            Data ST2023 per-desa belum tersedia. Jalankan skrip ekstraksi
            (scripts/scraping/extract-st2023-extra.py) atau periksa berkas
            public/data/st2023-desa-fallback.json.
          </div>
        ) : (
          <>
            {/* ================= ASPEK: KELEMBAGAAN ================= */}
            {aspect === "kelembagaan" && (
              <>
                <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 border-l-4 border-l-blue-800 rounded-lg p-5">
                    <div className="flex items-center gap-2.5 text-blue-800">
                      <Home size={16} />
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Rumah Tangga Petani</p>
                    </div>
                    <p className="text-3xl font-semibold text-slate-900 mt-2 tabular-nums">{formatNum(totals.rtPetani)}</p>
                    <p className="text-xs text-slate-700 mt-1.5">RT · seluruh {unitWord} terpilih</p>
                  </div>
                  <div className="bg-white border border-slate-200 border-l-4 border-l-teal-700 rounded-lg p-5">
                    <div className="flex items-center gap-2.5 text-teal-700">
                      <Users size={16} />
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Jumlah Petani</p>
                    </div>
                    <p className="text-3xl font-semibold text-slate-900 mt-2 tabular-nums">{formatNum(totals.petani)}</p>
                    <p className="text-xs text-slate-700 mt-1.5">orang · Tabel 2.9</p>
                  </div>
                  <div className="bg-white border border-slate-200 border-l-4 border-l-amber-600 rounded-lg p-5">
                    <div className="flex items-center gap-2.5 text-amber-600">
                      <FileSpreadsheet size={16} />
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">RT Usaha Pertanian (RTUP)</p>
                    </div>
                    <p className="text-3xl font-semibold text-slate-900 mt-2 tabular-nums">{formatNum(totals.rtup)}</p>
                    <p className="text-xs text-slate-700 mt-1.5">
                      Keanggotaan kelompok:{" "}
                      <span className="font-semibold text-slate-900">
                        {totals.pctAnggota === null ? "—" : `${totals.pctAnggota.toFixed(1)}%`}
                      </span>
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 border-l-4 border-l-blue-700 rounded-lg p-5">
                    <div className="flex items-center gap-2.5 text-blue-700">
                      <Fish size={16} />
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">RT Perikanan</p>
                    </div>
                    <p className="text-3xl font-semibold text-slate-900 mt-2 tabular-nums">{formatNum(totals.rtPerikanan)}</p>
                    <p className="text-xs text-slate-700 mt-1.5 tabular-nums">
                      {formatCell(totals.budidaya)} budidaya · {formatCell(totals.tangkap)} tangkap
                    </p>
                  </div>
                </section>

                <section className="bg-white border border-slate-200 rounded-lg">
                  <div className="px-5 pt-4 pb-3 border-b border-slate-200">
                    <h2 className="text-base font-semibold text-slate-900">
                      Rumah Tangga Petani per {unitWord === "kecamatan" ? "Kecamatan" : "Desa"}
                    </h2>
                    <p className="text-xs text-slate-700 mt-0.5">
                      Jumlah rumah tangga petani · Sensus Pertanian 2023 (Tabel 2.9)
                    </p>
                  </div>
                  <div className="p-5">
                    <div className="h-[420px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={agg.map((a) => ({ name: a.name, rt: a.rumahTanggaPetani }))} margin={{ top: 10, right: 10, left: 0, bottom: 80 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="name" tick={{ fill: "#1e293b", fontSize: 11 }} interval={0} angle={-45} textAnchor="end" height={70} />
                          <YAxis width={70} tick={{ fill: "#1e293b", fontSize: 11 }} tickFormatter={(v) => formatNum(v)} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
                            formatter={(value: any) => [formatNum(Number(value)), "RT Petani"]}
                          />
                          <Bar dataKey="rt" name="RT Petani" fill="#1d4ed8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </section>

                <section className="bg-white border border-slate-200 rounded-lg">
                  <div className="px-5 pt-4 pb-3 border-b border-slate-200">
                    <h2 className="text-base font-semibold text-slate-900">
                      Tabel Kelembagaan Petani per {unitWord === "kecamatan" ? "Kecamatan" : "Desa"}
                    </h2>
                    <p className="text-xs text-slate-700 mt-0.5">
                      "–" = tidak ada catatan · angka dalam RT kecuali kolom petani (orang)
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-slate-800">
                          <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-slate-200 w-12">No</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-slate-200">
                            {unitWord === "kecamatan" ? "Kecamatan" : "Desa"}
                          </th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide border-b border-slate-200">RT Petani</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide border-b border-slate-200">Petani (orang)</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide border-b border-slate-200">RTUP</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide border-b border-slate-200">RT Anggota Kelompok</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide border-b border-slate-200">RT Bukan Anggota</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide border-b border-slate-200 bg-slate-100">% Anggota</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {agg.map((a, idx) => {
                          const tot = a.rtAnggotaKelompok + a.rtBukanAnggotaKelompok;
                          const pct = tot > 0 ? (a.rtAnggotaKelompok / tot) * 100 : null;
                          return (
                            <tr key={a.name} className="hover:bg-slate-50">
                              <td className="px-4 py-2.5 text-slate-600 tabular-nums">{idx + 1}</td>
                              <td className="px-4 py-2.5 text-slate-900 font-medium">{a.name}</td>
                              <td className="px-4 py-2.5 text-right text-slate-800 tabular-nums">{formatCell(a.rumahTanggaPetani)}</td>
                              <td className="px-4 py-2.5 text-right text-slate-800 tabular-nums">{formatCell(a.petani)}</td>
                              <td className="px-4 py-2.5 text-right text-slate-800 tabular-nums">{formatCell(a.rtup)}</td>
                              <td className="px-4 py-2.5 text-right text-slate-800 tabular-nums">{formatCell(a.rtAnggotaKelompok)}</td>
                              <td className="px-4 py-2.5 text-right text-slate-800 tabular-nums">{formatCell(a.rtBukanAnggotaKelompok)}</td>
                              <td className="px-4 py-2.5 text-right text-slate-900 font-semibold tabular-nums bg-slate-50">
                                {pct === null ? "–" : `${pct.toFixed(1)}%`}
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                          <td className="px-4 py-3" />
                          <td className="px-4 py-3 text-slate-900">
                            {selectedKecamatan === "Semua" ? "Kabupaten Banjarnegara" : `Total Kec. ${selectedKecamatan}`}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-900 tabular-nums">{formatCell(totals.rtPetani)}</td>
                          <td className="px-4 py-3 text-right text-slate-900 tabular-nums">{formatCell(totals.petani)}</td>
                          <td className="px-4 py-3 text-right text-slate-900 tabular-nums">{formatCell(totals.rtup)}</td>
                          <td className="px-4 py-3 text-right text-slate-900 tabular-nums">{formatCell(totals.anggota)}</td>
                          <td className="px-4 py-3 text-right text-slate-900 tabular-nums">{formatCell(totals.bukan)}</td>
                          <td className="px-4 py-3 text-right text-slate-900 tabular-nums bg-slate-100">
                            {totals.pctAnggota === null ? "–" : `${totals.pctAnggota.toFixed(1)}%`}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}

            {/* ================= ASPEK: TERNAK ================= */}
            {aspect === "ternak" && (
              <>
                <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 border-l-4 border-l-blue-800 rounded-lg p-5">
                    <div className="flex items-center gap-2.5 text-blue-800">
                      <Wheat size={16} />
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                        Total {jenisLabel(jenisTernak)}
                      </p>
                    </div>
                    <p className="text-3xl font-semibold text-slate-900 mt-2 tabular-nums">
                      {formatNum(agg.reduce((x, a) => x + ternakValue(a, jenisTernak), 0))}
                    </p>
                    <p className="text-xs text-slate-700 mt-1.5">ekor · posisi 1 Mei 2023</p>
                  </div>
                  <div className="bg-white border border-slate-200 border-l-4 border-l-teal-700 rounded-lg p-5">
                    <div className="flex items-center gap-2.5 text-teal-700">
                      <TrendingUp size={16} />
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                        {unitWord === "kecamatan" ? "Kecamatan" : "Desa"} Tertinggi
                      </p>
                    </div>
                    <p className="text-2xl font-semibold text-slate-900 mt-2">{topTernakKec.name}</p>
                    <p className="text-xs text-slate-700 mt-1.5 tabular-nums">
                      {formatCell(topTernakKec.value)} ekor · {jenisLabel(jenisTernak)}
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 border-l-4 border-l-amber-600 rounded-lg p-5">
                    <div className="flex items-center gap-2.5 text-amber-600">
                      <FileSpreadsheet size={16} />
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Jenis Ternak Tercatat</p>
                    </div>
                    <p className="text-3xl font-semibold text-slate-900 mt-2 tabular-nums">
                      {totals.jenisCount} <span className="text-base font-medium text-slate-700">dari 18</span>
                    </p>
                    <p className="text-xs text-slate-700 mt-1.5">jenis · total {formatNum(totals.ternakTotal)} ekor seluruh ternak</p>
                  </div>
                </section>

                <section className="bg-white border border-slate-200 rounded-lg">
                  <div className="px-5 pt-4 pb-3 border-b border-slate-200">
                    <h2 className="text-base font-semibold text-slate-900">
                      Sebaran {jenisLabel(jenisTernak)} per {unitWord === "kecamatan" ? "Kecamatan" : "Desa"}
                    </h2>
                    <p className="text-xs text-slate-700 mt-0.5">
                      Jumlah ekor · posisi 1 Mei 2023 · Sensus Pertanian 2023 (Tabel 9.9)
                    </p>
                  </div>
                  <div className="p-5">
                    <div className="h-[420px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartDataTernak} margin={{ top: 10, right: 10, left: 0, bottom: 80 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="name" tick={{ fill: "#1e293b", fontSize: 11 }} interval={0} angle={-45} textAnchor="end" height={70} />
                          <YAxis width={80} tick={{ fill: "#1e293b", fontSize: 11 }} tickFormatter={(v) => formatNum(v)} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
                            formatter={(value: any) => [formatNum(Number(value)), "Ekor"]}
                          />
                          <Bar dataKey="nilai" name={jenisLabel(jenisTernak)} fill="#1d4ed8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </section>

                <section className="bg-white border border-slate-200 rounded-lg">
                  <div className="px-5 pt-4 pb-3 border-b border-slate-200">
                    <h2 className="text-base font-semibold text-slate-900">
                      Populasi per Jenis Ternak
                    </h2>
                    <p className="text-xs text-slate-700 mt-0.5">
                      Seluruh jenis yang tercatat pada wilayah terpilih · diurutkan dari terbesar
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-slate-800">
                          <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-slate-200 w-16">Urut</th>
                          <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-slate-200">Jenis Ternak</th>
                          <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide border-b border-slate-200">Populasi (ekor)</th>
                          <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide border-b border-slate-200 bg-slate-100">% dari Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {jenisPopulation.map((j, idx) => (
                          <tr key={j.key} className={`hover:bg-slate-50 ${idx < 3 ? "bg-blue-50/30" : ""}`}>
                            <td className="px-5 py-2.5 tabular-nums">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-sm text-xs font-semibold ${idx < 3 ? "bg-blue-800 text-white" : "bg-slate-100 text-slate-800"}`}>
                                {idx + 1}
                              </span>
                            </td>
                            <td className="px-5 py-2.5 text-slate-900 font-medium">{j.label}</td>
                            <td className="px-5 py-2.5 text-right text-slate-800 tabular-nums">{formatNum(j.value)}</td>
                            <td className="px-5 py-2.5 text-right text-slate-900 font-semibold tabular-nums bg-slate-50">
                              {totals.ternakTotal > 0 ? `${((j.value / totals.ternakTotal) * 100).toFixed(1)}%` : "–"}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                          <td className="px-5 py-3" />
                          <td className="px-5 py-3 text-slate-900">Total Seluruh Ternak</td>
                          <td className="px-5 py-3 text-right text-slate-900 tabular-nums">{formatNum(totals.ternakTotal)}</td>
                          <td className="px-5 py-3 text-right text-slate-900 tabular-nums bg-slate-100">100,0%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="bg-white border border-slate-200 rounded-lg">
                  <div className="px-5 pt-4 pb-3 border-b border-slate-200">
                    <h2 className="text-base font-semibold text-slate-900">
                      Tabel Rincian Populasi per {unitWord === "kecamatan" ? "Kecamatan" : "Desa"}
                    </h2>
                    <p className="text-xs text-slate-700 mt-0.5">
                      "–" = tidak ada catatan · angka dalam ekor
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-slate-800">
                          <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-slate-200 w-12">No</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-slate-200">
                            {unitWord === "kecamatan" ? "Kecamatan" : "Desa"}
                          </th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide border-b border-slate-200">Ternak Besar</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide border-b border-slate-200">Ternak Kecil</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide border-b border-slate-200">Unggas</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide border-b border-slate-200 bg-slate-100">Total (ekor)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {agg.map((a, idx) => {
                          const besar = TERNAK_BESAR.reduce((x, k) => x + (a.ternak[k] || 0), 0);
                          const kecil = TERNAK_KECIL.reduce((x, k) => x + (a.ternak[k] || 0), 0);
                          const unggas = TERNAK_UNGGAS.reduce((x, k) => x + (a.ternak[k] || 0), 0);
                          const total = besar + kecil + unggas;
                          return (
                            <tr key={a.name} className="hover:bg-slate-50">
                              <td className="px-4 py-2.5 text-slate-600 tabular-nums">{idx + 1}</td>
                              <td className="px-4 py-2.5 text-slate-900 font-medium">{a.name}</td>
                              <td className="px-4 py-2.5 text-right text-slate-800 tabular-nums">{formatCell(besar)}</td>
                              <td className="px-4 py-2.5 text-right text-slate-800 tabular-nums">{formatCell(kecil)}</td>
                              <td className="px-4 py-2.5 text-right text-slate-800 tabular-nums">{formatCell(unggas)}</td>
                              <td className="px-4 py-2.5 text-right font-semibold text-slate-900 tabular-nums bg-slate-50">{formatCell(total)}</td>
                            </tr>
                          );
                        })}
                        <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                          <td className="px-4 py-3" />
                          <td className="px-4 py-3 text-slate-900">
                            {selectedKecamatan === "Semua" ? "Kabupaten Banjarnegara" : `Total Kec. ${selectedKecamatan}`}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-900 tabular-nums">
                            {formatCell(agg.reduce((x, a) => x + TERNAK_BESAR.reduce((y, k) => y + (a.ternak[k] || 0), 0), 0))}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-900 tabular-nums">
                            {formatCell(agg.reduce((x, a) => x + TERNAK_KECIL.reduce((y, k) => y + (a.ternak[k] || 0), 0), 0))}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-900 tabular-nums">
                            {formatCell(agg.reduce((x, a) => x + TERNAK_UNGGAS.reduce((y, k) => y + (a.ternak[k] || 0), 0), 0))}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-900 tabular-nums bg-slate-100">
                            {formatCell(totals.ternakTotal)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}

            {/* ================= ASPEK: PERIKANAN ================= */}
            {aspect === "perikanan" && (
              <>
                <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 border-l-4 border-l-blue-800 rounded-lg p-5">
                    <div className="flex items-center gap-2.5 text-blue-800">
                      <Fish size={16} />
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">RT Usaha Perikanan</p>
                    </div>
                    <p className="text-3xl font-semibold text-slate-900 mt-2 tabular-nums">{formatNum(totals.rtPerikanan)}</p>
                    <p className="text-xs text-slate-700 mt-1.5">rumah tangga · Tabel 10.1</p>
                  </div>
                  <div className="bg-white border border-slate-200 border-l-4 border-l-teal-700 rounded-lg p-5">
                    <div className="flex items-center gap-2.5 text-teal-700">
                      <TrendingUp size={16} />
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Perikanan Budidaya</p>
                    </div>
                    <p className="text-3xl font-semibold text-slate-900 mt-2 tabular-nums">{formatNum(totals.budidaya)}</p>
                    <p className="text-xs text-slate-700 mt-1.5">
                      {totals.rtPerikanan > 0 ? `${((totals.budidaya / totals.rtPerikanan) * 100).toFixed(1)}% dari total RT perikanan` : "—"}
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 border-l-4 border-l-amber-600 rounded-lg p-5">
                    <div className="flex items-center gap-2.5 text-amber-600">
                      <Users size={16} />
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Perikanan Tangkap</p>
                    </div>
                    <p className="text-3xl font-semibold text-slate-900 mt-2 tabular-nums">{formatNum(totals.tangkap)}</p>
                    <p className="text-xs text-slate-700 mt-1.5">
                      {totals.rtPerikanan > 0 ? `${((totals.tangkap / totals.rtPerikanan) * 100).toFixed(1)}% dari total RT perikanan` : "—"}
                    </p>
                  </div>
                </section>

                <section className="bg-white border border-slate-200 rounded-lg">
                  <div className="px-5 pt-4 pb-3 border-b border-slate-200">
                    <h2 className="text-base font-semibold text-slate-900">
                      RT Perikanan per {unitWord === "kecamatan" ? "Kecamatan" : "Desa"}
                    </h2>
                    <p className="text-xs text-slate-700 mt-0.5">
                      Budidaya dan tangkap · hanya wilayah dengan catatan ditampilkan
                    </p>
                  </div>
                  <div className="p-5">
                    <div className="h-[420px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={agg.map((a) => ({ name: a.name, budidaya: a.rtPerikananBudidaya, tangkap: a.rtPerikananTangkap })).filter((d) => d.budidaya > 0 || d.tangkap > 0)}
                          margin={{ top: 10, right: 10, left: 0, bottom: 80 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="name" tick={{ fill: "#1e293b", fontSize: 11 }} interval={0} angle={-45} textAnchor="end" height={70} />
                          <YAxis width={70} tick={{ fill: "#1e293b", fontSize: 11 }} tickFormatter={(v) => formatNum(v)} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
                            formatter={(value: any, name: any) => [formatNum(Number(value)), name === "budidaya" ? "Budidaya (RT)" : "Tangkap (RT)"]}
                          />
                          <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12 }} formatter={(v) => (v === "budidaya" ? "Budidaya" : "Tangkap")} />
                          <Bar dataKey="budidaya" stackId="a" name="budidaya" fill="#1d4ed8" />
                          <Bar dataKey="tangkap" stackId="a" name="tangkap" fill="#0d9488" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </section>

                <section className="bg-white border border-slate-200 rounded-lg">
                  <div className="px-5 pt-4 pb-3 border-b border-slate-200">
                    <h2 className="text-base font-semibold text-slate-900">
                      Tabel RT Perikanan per {unitWord === "kecamatan" ? "Kecamatan" : "Desa"}
                    </h2>
                    <p className="text-xs text-slate-700 mt-0.5">"–" = tidak ada catatan · angka dalam RT</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-slate-800">
                          <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-slate-200 w-12">No</th>
                          <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-slate-200">
                            {unitWord === "kecamatan" ? "Kecamatan" : "Desa"}
                          </th>
                          <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide border-b border-slate-200">Budidaya</th>
                          <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide border-b border-slate-200">Tangkap</th>
                          <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide border-b border-slate-200 bg-slate-100">Total RT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {agg.map((a, idx) => (
                          <tr key={a.name} className={`hover:bg-slate-50 ${a.rtPerikanan === 0 ? "text-slate-600" : ""}`}>
                            <td className="px-5 py-2.5 text-slate-600 tabular-nums">{idx + 1}</td>
                            <td className="px-5 py-2.5 text-slate-900 font-medium">{a.name}</td>
                            <td className="px-5 py-2.5 text-right text-slate-800 tabular-nums">{formatCell(a.rtPerikananBudidaya)}</td>
                            <td className="px-5 py-2.5 text-right text-slate-800 tabular-nums">{formatCell(a.rtPerikananTangkap)}</td>
                            <td className="px-5 py-2.5 text-right font-semibold text-slate-900 tabular-nums bg-slate-50">{formatCell(a.rtPerikanan)}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                          <td className="px-5 py-3" />
                          <td className="px-5 py-3 text-slate-900">
                            {selectedKecamatan === "Semua" ? "Kabupaten Banjarnegara" : `Total Kec. ${selectedKecamatan}`}
                          </td>
                          <td className="px-5 py-3 text-right text-slate-900 tabular-nums">{formatCell(totals.budidaya)}</td>
                          <td className="px-5 py-3 text-right text-slate-900 tabular-nums">{formatCell(totals.tangkap)}</td>
                          <td className="px-5 py-3 text-right text-slate-900 tabular-nums bg-slate-100">{formatCell(totals.rtPerikanan)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}

            {/* ===== Catatan Sumber ===== */}
            <p className="text-xs text-slate-600 text-center pb-2">
              Sumber: Badan Pusat Statistik, <span className="italic">Hasil Sensus Pertanian 2023 (ST2023)</span> —
              tabel 2.9 (rumah tangga petani), 5.1 (RTUP &amp; keanggotaan kelompok),
              9.9 (populasi ternak per 1 Mei 2023), dan 10.1 (RT usaha perikanan) per desa,
              diolah ke tingkat kecamatan Kabupaten Banjarnegara.
            </p>
          </>
        )}
      </div>
    </DefaultLayout>
  );
}
