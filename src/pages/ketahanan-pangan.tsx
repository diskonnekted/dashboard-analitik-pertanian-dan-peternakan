import { useEffect, useMemo, useState } from "react";
import DefaultLayout from "@/layouts/default";
import { LoadingSpinner } from "@/components/ui";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  ArrowRight,
  Boxes,
  Coins,
  Flame,
  Info,
  Layers,
  Scale,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import {
  CELAH_DATA_PILAR,
  DIKECUALIKAN_DARI_NERACA,
  FAKTOR_KALORI,
  FSVA_INDIKATOR_PER_PILAR,
  FSVA_TAHUN_TERBARU,
  HARI_PER_TAHUN,
  KEBUTUHAN_KKAL_PER_KAPITA_HARI,
  KEBUTUHAN_KKAL_PER_KAPITA_TAHUN,
  PILAR,
  STATUS_KALORI_WARNA,
  agregatPilarFSVA,
  fetchCadanganPangan,
  fetchNeracaKalori,
  labelPrioritas,
  statusKalori,
  type CadanganPangan,
  type NeracaKaloriBaris,
  type PilarKey,
  type StatusKalori,
} from "@/services/ketahananPangan";

/*
 * Ketahanan Pangan — Tiga Pilar (FAO / Badan Pangan Nasional).
 *
 * Halaman ini menyatukan data ketahanan pangan yang sebelumnya tersebar di empat
 * halaman (/food-security, /fsva, /price-volatility, /supply-chain) ke dalam
 * kerangka tiga pilar, dan menambahkan Neraca Kalori berbasis produksi lokal
 * (permintaan gap-analysis-master.md: "Penduduk x 2.100 kkal/hari").
 *
 * Batas yang dinyatakan terbuka (bukan diisi perkiraan):
 *   - Pilar Ketersediaan: produksi bulanan, RMU, arus impor antar wilayah.
 *   - Pilar Keterjangkauan: pendapatan per kapita, kondisi jalan.
 *   - Pilar Pemanfaatan: Skor PPH, PoU, stunting, keamanan pangan.
 * Lihat CELAH_DATA_PILAR di services/ketahananPangan.ts.
 */

const formatNum = (n: number, dec = 0) =>
  Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: dec });

const formatPct = (n: number, dec = 1) => `${formatNum(n * 100, dec)}%`;

const WARNA_STATUS_HEX: Record<StatusKalori, string> = {
  Swasembada: "#047857",
  Surplus: "#0d9488",
  Defisit: "#f59e0b",
  Kurang: "#e11d48",
};

const WARNA_KELOMPOK: Record<string, string> = {
  "Padi & Beras": "#047857",
  Palawija: "#65a30d",
  Peternakan: "#b45309",
  Perikanan: "#0369a1",
};

/**
 * Kelas komposit FSVA yang perlu ditindaklanjuti. Memakai istilah resmi
 * kompositLabel(): <=2 "Sangat Rawan", 3 "Rawan". Pada FSVA 2024 tidak ada desa
 * berkelas <=2, jadi rentang 1-3 dipakai agar kolom tetap informatif.
 */
const KOMPOSIT_RAWAN = [1, 2, 3];

interface RingkasanKabupaten {
  penduduk: number;
  totalKkal: number;
  kkalPerKapitaHari: number;
  rasio: number;
  status: StatusKalori;
  jumlahKecamatan: number;
  perStatus: Record<StatusKalori, number>;
}

/** Link ke halaman yang menyajikan bagian tertentu dari sebuah pilar. */
const TAUTAN_PILAR: Record<PilarKey, { label: string; href: string; keterangan: string }[]> = {
  Ketersediaan: [
    { label: "Ketersediaan Beras", href: "/food-security", keterangan: "Neraca beras per kecamatan" },
    { label: "Produksi Tanaman Pangan", href: "/food-crops", keterangan: "Padi & palawija per kecamatan" },
    { label: "Hortikultura", href: "/horticulture", keterangan: "20 komoditas sayuran & buah" },
    { label: "Peternakan", href: "/livestock", keterangan: "Populasi, daging, telur" },
    { label: "Perikanan", href: "/fisheries", keterangan: "Budidaya & tangkapan" },
    { label: "Lahan Pertanian", href: "/lahan", keterangan: "Tutupan lahan & lahan kritis" },
  ],
  Keterjangkauan: [
    { label: "Volatilitas Harga", href: "/price-volatility", keterangan: "Inflasi, harga produsen & konsumen" },
    { label: "Rekomendasi & Pasar", href: "/recommendations", keterangan: "Margin harga petani vs konsumen" },
    { label: "Rantai Pasok", href: "/supply-chain", keterangan: "Simpul distribusi & jumlah pasar" },
    { label: "FSVA Desa", href: "/fsva", keterangan: "Indikator kerawanan 278 desa" },
  ],
  Pemanfaatan: [
    { label: "FSVA Desa", href: "/fsva", keterangan: "Air bersih, tenaga kesehatan, IKP desa" },
    {
      label: "Sertifikasi Mutu (belum tersedia)",
      href: "/sertifikasi-mutu",
      keterangan: "Keamanan pangan — modul masih dalam pengembangan",
    },
  ],
};

export default function KetahananPangan() {
  const [loading, setLoading] = useState(true);
  const [baris, setBaris] = useState<NeracaKaloriBaris[]>([]);
  const [tahunTersedia, setTahunTersedia] = useState<string[]>([]);
  const [tahunDipilih, setTahunDipilih] = useState("");
  const [tanpaPenduduk, setTanpaPenduduk] = useState(0);
  const [kecamatanSemua, setKecamatanSemua] = useState<string[]>([]);
  const [cadangan, setCadangan] = useState<CadanganPangan[]>([]);
  const [kecamatanTerpilih, setKecamatanTerpilih] = useState("");

  useEffect(() => {
    let aktif = true;
    (async () => {
      try {
        const [nk, cd] = await Promise.all([fetchNeracaKalori(), fetchCadanganPangan()]);
        if (!aktif) return;
        setBaris(nk.baris);
        setTahunTersedia(nk.tahunTersedia);
        setTahunDipilih(nk.tahunReferensi);
        setTanpaPenduduk(nk.tanpaPenduduk);
        setKecamatanSemua(nk.kecamatanSemua);
        setCadangan(cd);
      } catch (e) {
        console.error("Gagal memuat data ketahanan pangan:", e);
      } finally {
        if (aktif) setLoading(false);
      }
    })();
    return () => {
      aktif = false;
    };
  }, []);

  // FSVA data statis — cukup dihitung sekali.
  const fsvaPerKecamatan = useMemo(
    () => agregatPilarFSVA(FSVA_TAHUN_TERBARU),
    [],
  );

  const barisTahun = useMemo(
    () => baris.filter((b) => b.tahun === tahunDipilih),
    [baris, tahunDipilih],
  );

  /**
   * Kecamatan yang punya data penduduk tetapi tidak masuk neraca pada tahun ini
   * (karena tanpa data produksi padi). Ditampilkan eksplisit supaya tidak
   * terbaca sebagai kecamatan yang datanya hilang.
   */
  const kecamatanTanpaNeraca = useMemo(() => {
    const ada = new Set(barisTahun.map((b) => b.kecamatan));
    return kecamatanSemua.filter((k) => !ada.has(k));
  }, [barisTahun, kecamatanSemua]);

  const ringkasan: RingkasanKabupaten = useMemo(() => {
    const penduduk = barisTahun.reduce((s, b) => s + b.penduduk, 0);
    const totalKkal = barisTahun.reduce((s, b) => s + b.totalKkal, 0);
    const kkalPerKapitaHari = penduduk ? totalKkal / penduduk / HARI_PER_TAHUN : 0;
    const perStatus: Record<StatusKalori, number> = {
      Swasembada: 0,
      Surplus: 0,
      Defisit: 0,
      Kurang: 0,
    };
    for (const b of barisTahun) perStatus[b.status]++;
    return {
      penduduk,
      totalKkal,
      kkalPerKapitaHari,
      rasio: kkalPerKapitaHari / KEBUTUHAN_KKAL_PER_KAPITA_HARI,
      status: statusKalori(kkalPerKapitaHari / KEBUTUHAN_KKAL_PER_KAPITA_HARI),
      jumlahKecamatan: barisTahun.length,
      perStatus,
    };
  }, [barisTahun]);

  const chartRasio = useMemo(
    () =>
      [...barisTahun]
        .sort((a, b) => b.rasio - a.rasio)
        .map((b) => ({
          name: b.kecamatan.charAt(0).toUpperCase() + b.kecamatan.slice(1),
          rasio: Number((b.rasio * 100).toFixed(1)),
          kkal: Math.round(b.tersediaKkalPerKapitaHari),
          status: b.status,
          cakupan: b.cakupan,
        })),
    [barisTahun],
  );

  // Kontribusi energi per kelompok pangan pada tahun terpilih (tingkat kabupaten).
  const kontribusiKelompok = useMemo(() => {
    const total: Record<string, number> = {};
    for (const b of barisTahun) {
      for (const r of b.rincian) total[r.kelompok] = (total[r.kelompok] ?? 0) + r.kkal;
    }
    const jumlah = Object.values(total).reduce((s, v) => s + v, 0);
    return Object.entries(total)
      .map(([kelompok, kkal]) => ({
        name: kelompok,
        value: Math.round(kkal),
        persen: jumlah ? Number(((kkal / jumlah) * 100).toFixed(1)) : 0,
        fill: WARNA_KELOMPOK[kelompok] ?? "#64748b",
      }))
      .sort((a, b) => b.value - a.value);
  }, [barisTahun]);

  // Rincian komoditas untuk kecamatan terpilih.
  const barisTerpilih = useMemo(
    () => barisTahun.find((b) => b.kecamatan === kecamatanTerpilih) ?? barisTahun[0],
    [barisTahun, kecamatanTerpilih],
  );

  const cadanganMap = useMemo(() => {
    const m: Record<string, CadanganPangan> = {};
    for (const c of cadangan) m[c.kecamatan] = c;
    return m;
  }, [cadangan]);

  const totalCadangan = useMemo(
    () => ({
      lumbungUnit: cadangan.reduce((s, c) => s + c.lumbungUnit, 0),
      lumbungKapasitas: cadangan.reduce((s, c) => s + c.lumbungKapasitas, 0),
      gudangLuas: cadangan.reduce((s, c) => s + c.gudangLuas, 0),
      gudangKapasitas: cadangan.reduce((s, c) => s + c.gudangKapasitas, 0),
    }),
    [cadangan],
  );

  // Ringkasan indikator FSVA tingkat kabupaten per pilar.
  const fsvaKabupaten = useMemo(() => {
    const daftar = Object.values(fsvaPerKecamatan);
    const totalDesa = daftar.reduce((s, k) => s + k.jumlahDesa, 0);
    const ikpRata = totalDesa
      ? daftar.reduce((s, k) => s + k.ikpRataRata * k.jumlahDesa, 0) / totalDesa
      : 0;
    const perKunci: Record<string, { jumlah: number; n: number }> = {};
    const prioritas: Record<number, number> = {};
    for (const k of daftar) {
      for (const [p, n] of Object.entries(k.prioritas)) {
        prioritas[Number(p)] = (prioritas[Number(p)] ?? 0) + n;
      }
      for (const ind of k.indikator) {
        perKunci[ind.kunci] ??= { jumlah: 0, n: 0 };
        perKunci[ind.kunci].jumlah += ind.nilai * ind.jumlahDesa;
        perKunci[ind.kunci].n += ind.jumlahDesa;
      }
    }
    const rata: Record<string, number> = {};
    for (const [k, v] of Object.entries(perKunci)) rata[k] = v.n ? v.jumlah / v.n : 0;
    return { totalDesa, ikpRata, rata, prioritas };
  }, [fsvaPerKecamatan]);

  const desaPrioritasRawan = KOMPOSIT_RAWAN.reduce(
    (s, p) => s + (fsvaKabupaten.prioritas[p] ?? 0),
    0,
  );

  /**
   * Distribusi kelas prioritas FSVA. Komposit 1 dan 2 sama-sama berlabel
   * "Sangat Rawan", jadi dikelompokkan per label agar tidak tertulis dua kali.
   */
  const distribusiPrioritas = useMemo(() => {
    const perLabel = new Map<string, number>();
    for (let p = 1; p <= 6; p++) {
      const label = labelPrioritas(p);
      perLabel.set(label, (perLabel.get(label) ?? 0) + (fsvaKabupaten.prioritas[p] ?? 0));
    }
    return Array.from(perLabel.entries())
      .map(([label, n]) => `${label}: ${formatNum(n)} desa`)
      .join(" · ");
  }, [fsvaKabupaten.prioritas]);

  /** Ambil satu indikator FSVA tingkat kabupaten. */
  const indikatorKab = (pilar: PilarKey, kunci: string) => {
    const def = FSVA_INDIKATOR_PER_PILAR[pilar].find((d) => d.key === kunci);
    if (!def) return null;
    const nilai = fsvaKabupaten.rata[kunci] ?? 0;
    return {
      def,
      nilai,
      tampil: def.categorical ? `${Math.round(nilai)} desa` : def.format(nilai),
    };
  };

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8 py-2">
        {/* Hero */}
        <section className="relative text-left animate-fade-in py-4 md:py-8 flex flex-col md:flex-row items-center justify-between gap-8 border-b border-slate-200 pb-8">
          <div className="relative z-10 flex-1">
            <h2 className="text-2xl sm:text-4xl leading-tight font-bold tracking-tight text-slate-800">
              Ketahanan Pangan — Tiga Pilar
            </h2>
            <p className="text-xs md:text-sm font-medium text-slate-500 mt-2 max-w-3xl border-l-2 border-emerald-600 pl-3">
              Kerangka ketahanan pangan FAO &amp; Badan Pangan Nasional: ketersediaan, keterjangkauan,
              dan pemanfaatan pangan — dilengkapi neraca kalori berbasis produksi lokal
              ({formatNum(KEBUTUHAN_KKAL_PER_KAPITA_HARI)} kkal/kapita/hari).
            </p>
          </div>
          <div className="w-full md:w-48 lg:w-64 shrink-0 flex items-center justify-center">
            <img
              src="/img/food-security.png"
              alt="Ketahanan Pangan Tiga Pilar"
              className="w-full max-h-32 md:max-h-36 object-contain"
            />
          </div>
        </section>

        {loading ? (
          <LoadingSpinner label="Memuat data ketahanan pangan..." />
        ) : (
          <>
            {/* ============ RINGKASAN KABUPATEN ============ */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow transition-all duration-200 p-5 flex items-center gap-3">
                <div className="p-3 border border-slate-200 bg-blue-100 text-slate-800 shadow-sm">
                  <Users size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Penduduk</p>
                  <p className="text-xl font-semibold mt-0.5">{formatNum(ringkasan.penduduk)} Jiwa</p>
                  <p className="text-[10px] text-slate-400 font-medium">KEMENAG 2023</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow transition-all duration-200 p-5 flex items-center gap-3">
                <div className="p-3 border border-slate-200 bg-amber-100 text-slate-800 shadow-sm">
                  <Flame size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Kalori Tersedia</p>
                  <p className="text-xl font-semibold mt-0.5">
                    {formatNum(ringkasan.kkalPerKapitaHari)} kkal
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">per kapita per hari, dari produksi lokal</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow transition-all duration-200 p-5 flex items-center gap-3">
                <div className="p-3 border border-slate-200 bg-slate-100 text-slate-800 shadow-sm">
                  <Scale size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Rasio Kecukupan</p>
                  <p className="text-xl font-semibold mt-0.5">{formatPct(ringkasan.rasio)}</p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    terhadap {formatNum(KEBUTUHAN_KKAL_PER_KAPITA_HARI)} kkal
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow transition-all duration-200 p-5 flex items-center gap-3">
                <div className="p-3 border border-slate-200 bg-emerald-100 text-slate-800 shadow-sm">
                  <Layers size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Status Kabupaten</p>
                  <p className="text-xl font-semibold mt-0.5">{ringkasan.status}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    {ringkasan.jumlahKecamatan} kecamatan · {formatNum(ringkasan.perStatus.Kurang)} kurang
                  </p>
                </div>
              </div>
            </div>

            {/* ============ PANEL TIGA PILAR ============ */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow transition-all duration-200 p-6">
              <div className="flex flex-col mb-6 border-b border-slate-200 pb-3">
                <h4 className="text-lg font-bold uppercase flex items-center gap-2 tracking-wide">
                  <Boxes size={22} className="text-slate-700" />
                  Kerangka Tiga Pilar
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Definisi &amp; cakupan menurut FAO dan Badan Pangan Nasional, dipetakan ke data yang
                  benar-benar tersedia di SISPERTANI.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {PILAR.map((p, idx) => {
                  const celah = CELAH_DATA_PILAR.filter((c) => c.pilar === p.key);
                  return (
                    <div
                      key={p.key}
                      className={`border border-slate-200 border-l-4 ${p.aksen} rounded-lg bg-slate-50/60 p-5 flex flex-col gap-3`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Pilar {idx + 1}
                          </span>
                        </div>
                        <h5 className={`text-base font-bold ${p.aksenTeks} mt-0.5`}>{p.judul}</h5>
                        <p className="text-[11px] text-slate-500 italic">{p.istilahInggris}</p>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">{p.definisi}</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        <span className="font-semibold text-slate-600">Cakupan: </span>
                        {p.cakupan}
                      </p>

                      <div className="border-t border-slate-200 pt-3 flex flex-col gap-2">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Indikator yang tersedia
                        </p>

                        {p.key === "Ketersediaan" && (
                          <>
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-slate-600">Neraca kalori produksi lokal</span>
                              <span className="font-semibold text-slate-800">
                                {formatPct(ringkasan.rasio)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-slate-600">Lumbung pangan</span>
                              <span className="font-semibold text-slate-800">
                                {formatNum(totalCadangan.lumbungUnit)} unit
                              </span>
                            </div>
                            {indikatorKab("Ketersediaan", "rasioLahan") && (
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="text-slate-600">
                                  {indikatorKab("Ketersediaan", "rasioLahan")!.def.short}
                                </span>
                                <span className="font-semibold text-slate-800">
                                  {indikatorKab("Ketersediaan", "rasioLahan")!.tampil}
                                </span>
                              </div>
                            )}
                          </>
                        )}

                        {p.key === "Keterjangkauan" && (
                          <>
                            {indikatorKab("Keterjangkauan", "rasioMiskin") && (
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="text-slate-600">Miskin desil 1 (rata-rata desa)</span>
                                <span className="font-semibold text-slate-800">
                                  {indikatorKab("Keterjangkauan", "rasioMiskin")!.tampil}
                                </span>
                              </div>
                            )}
                            {indikatorKab("Keterjangkauan", "tanpaAkses") && (
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="text-slate-600">Desa tanpa akses penghubung</span>
                                <span className="font-semibold text-slate-800">
                                  {indikatorKab("Keterjangkauan", "tanpaAkses")!.tampil}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-slate-600">Harga produsen &amp; konsumen</span>
                              <span className="font-semibold text-emerald-700">tersedia</span>
                            </div>
                          </>
                        )}

                        {p.key === "Pemanfaatan" && (
                          <>
                            {indikatorKab("Pemanfaatan", "tanpaAirBersih") && (
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="text-slate-600">RT tanpa air bersih</span>
                                <span className="font-semibold text-slate-800">
                                  {indikatorKab("Pemanfaatan", "tanpaAirBersih")!.tampil}
                                </span>
                              </div>
                            )}
                            {indikatorKab("Pemanfaatan", "rasioNakes") && (
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="text-slate-600">Tenaga kesehatan per kapita</span>
                                <span className="font-semibold text-slate-800">
                                  {indikatorKab("Pemanfaatan", "rasioNakes")!.tampil}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-slate-600">Skor PPH · PoU · stunting</span>
                              <span className="font-semibold text-rose-700">belum ada data</span>
                            </div>
                          </>
                        )}
                      </div>

                      {celah.length > 0 && (
                        <div className="border-t border-slate-200 pt-3">
                          <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider mb-1">
                            Celah data ({celah.length})
                          </p>
                          <ul className="text-[11px] text-slate-500 leading-relaxed flex flex-col gap-0.5">
                            {celah.map((c) => (
                              <li key={c.indikator}>• {c.indikator}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="border-t border-slate-200 pt-3 flex flex-col gap-1.5">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Halaman terkait
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {TAUTAN_PILAR[p.key].map((t) => (
                            <a
                              key={t.href}
                              href={t.href}
                              title={t.keterangan}
                              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 border border-slate-300 rounded bg-white text-slate-700 hover:border-emerald-500 hover:text-emerald-700 transition-colors"
                            >
                              {t.label}
                              <ArrowRight size={11} />
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ============ PILAR 1 — NERACA KALORI ============ */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow transition-all duration-200 p-6">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 border-b border-slate-200 pb-3">
                <div>
                  <h4 className="text-lg font-bold uppercase flex items-center gap-2 tracking-wide">
                    <Flame size={22} className="text-emerald-700" />
                    Pilar 1 — Neraca Kalori Ketersediaan
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                    Energi yang dapat disediakan dari produksi pangan lokal dibanding kebutuhan
                    {formatNum(KEBUTUHAN_KKAL_PER_KAPITA_HARI)} kkal/kapita/hari
                    ({formatNum(KEBUTUHAN_KKAL_PER_KAPITA_TAHUN)} kkal/tahun).
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <label htmlFor="tahun-kalori" className="text-xs font-semibold text-slate-600">
                    Tahun
                  </label>
                  <select
                    id="tahun-kalori"
                    value={tahunDipilih}
                    onChange={(e) => setTahunDipilih(e.target.value)}
                    className="text-sm border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {tahunTersedia.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Peringatan cakupan */}
              <div className="mb-5 flex gap-3 items-start text-xs border border-amber-300 bg-amber-50 rounded p-3 text-amber-900">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Angka ini adalah potensi ketersediaan dari produksi lokal</strong>, bukan
                  konsumsi nyata. Perhitungan belum memperhitungkan pangan yang dijual keluar daerah,
                  pasokan yang masuk dari luar, susut pascapanen, pemakaian untuk pakan/benih, dan
                  pengolahan industri. Status <strong>Defisit/Kurang</strong> berarti kecamatan
                  bergantung pada pasokan dari luar — hal yang wajar untuk banyak wilayah.
                  {barisTahun.some((b) => b.cakupan === "Parsial") && (
                    <>
                      {" "}
                      Tahun {tahunDipilih} memiliki kecamatan dengan cakupan data{" "}
                      <strong>parsial</strong> (ada kelompok pangan tanpa data pada tahun tersebut).
                    </>
                  )}
                  {kecamatanTanpaNeraca.length > 0 && (
                    <>
                      {" "}
                      <strong>
                        {kecamatanTanpaNeraca.length} kecamatan tidak ikut dihitung pada{" "}
                        {tahunDipilih}
                      </strong>{" "}
                      karena tidak memiliki data produksi padi pada tahun tersebut:{" "}
                      {kecamatanTanpaNeraca
                        .map((k) => k.charAt(0).toUpperCase() + k.slice(1))
                        .join(", ")}
                      . Padi menyumbang sebagian besar energi, sehingga tanpa data padi neraca
                      tidak berarti. Angka kabupaten di halaman ini karenanya hanya mencakup{" "}
                      {barisTahun.length} dari {kecamatanSemua.length} kecamatan.
                    </>
                  )}
                </div>
              </div>

              {/* Chart rasio per kecamatan */}
              <div className="mb-6">
                <h5 className="text-sm font-bold text-slate-700 mb-3">
                  Rasio Kecukupan Kalori per Kecamatan ({tahunDipilih})
                </h5>
                <div className="h-[560px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartRasio}
                      layout="vertical"
                      margin={{ top: 4, right: 48, bottom: 4, left: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis
                        type="number"
                        unit="%"
                        tick={{ fontSize: 11 }}
                        domain={[0, (max: number) => Math.max(100, Math.ceil(max / 25) * 25)]}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={118}
                        tick={{ fontSize: 11 }}
                        interval={0}
                      />
                      <Tooltip
                        formatter={(v: unknown, _n: unknown, item: unknown) => [
                          `${formatNum(Number(v), 1)}% (${formatNum((item as { payload?: { kkal?: number } })?.payload?.kkal ?? 0)} kkal/kapita/hari)`,
                          "Rasio kecukupan",
                        ]}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <ReferenceLine
                        x={100}
                        stroke="#047857"
                        strokeDasharray="4 4"
                        label={{ value: "Cukup (100%)", position: "insideTopRight", fontSize: 10, fill: "#047857" }}
                      />
                      <Bar dataKey="rasio" radius={[0, 3, 3, 0]} barSize={16}>
                        {chartRasio.map((c) => (
                          <Cell key={c.name} fill={WARNA_STATUS_HEX[c.status as StatusKalori]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-slate-600">
                  {(Object.keys(WARNA_STATUS_HEX) as StatusKalori[]).map((s) => (
                    <span key={s} className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm" style={{ background: WARNA_STATUS_HEX[s] }} />
                      {s} ({formatNum(ringkasan.perStatus[s])} kecamatan)
                    </span>
                  ))}
                </div>
              </div>

              {/* Kontribusi kelompok pangan + rincian kecamatan */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h5 className="text-sm font-bold text-slate-700 mb-3">
                    Kontribusi Energi per Kelompok Pangan
                  </h5>
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={kontribusiKelompok}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={52}
                          outerRadius={88}
                          paddingAngle={2}
                          label={(e: { name?: string; persen?: number }) =>
                            `${e.name ?? ""} ${e.persen ?? 0}%`
                          }
                          labelLine={false}
                        >
                          {kontribusiKelompok.map((c) => (
                            <Cell key={c.name} fill={c.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: unknown) => [
                            `${formatNum(Number(v) / 1e9, 1)} miliar kkal`,
                            "Energi",
                          ]}
                          contentStyle={{ fontSize: 12 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h5 className="text-sm font-bold text-slate-700">Rincian Komoditas</h5>
                    <select
                      aria-label="Pilih kecamatan untuk rincian komoditas"
                      value={barisTerpilih?.kecamatan ?? ""}
                      onChange={(e) => setKecamatanTerpilih(e.target.value)}
                      className="text-xs border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 max-w-[190px]"
                    >
                      {barisTahun.map((b) => (
                        <option key={b.kecamatan} value={b.kecamatan}>
                          {b.kecamatan.charAt(0).toUpperCase() + b.kecamatan.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {barisTerpilih ? (
                    <div className="border border-slate-200 rounded overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-100 text-slate-600">
                          <tr>
                            <th className="text-left px-3 py-2 font-semibold">Komoditas</th>
                            <th className="text-right px-3 py-2 font-semibold">Produksi</th>
                            <th className="text-right px-3 py-2 font-semibold">Energi</th>
                            <th className="text-right px-3 py-2 font-semibold">Porsi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {barisTerpilih.rincian.map((r) => (
                            <tr key={r.kunci} className="border-t border-slate-100">
                              <td className="px-3 py-1.5">
                                <span className="text-slate-700">{r.label}</span>
                                <span className="block text-[10px] text-slate-400">{r.kelompok}</span>
                              </td>
                              <td className="px-3 py-1.5 text-right text-slate-600 whitespace-nowrap">
                                {formatNum(r.produksi, r.satuanData === "butir" ? 0 : 1)}{" "}
                                <span className="text-[10px] text-slate-400">{r.satuanData}</span>
                              </td>
                              <td className="px-3 py-1.5 text-right text-slate-600 whitespace-nowrap">
                                {formatNum(r.kkal / 1e6, 1)} jt kkal
                              </td>
                              <td className="px-3 py-1.5 text-right text-slate-600">
                                {formatPct(barisTerpilih.totalKkal ? r.kkal / barisTerpilih.totalKkal : 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50 font-semibold">
                          <tr className="border-t border-slate-200">
                            <td className="px-3 py-2 text-slate-700">Total tersedia</td>
                            <td className="px-3 py-2 text-right text-slate-500">
                              {formatNum(barisTerpilih.penduduk)} jiwa
                            </td>
                            <td className="px-3 py-2 text-right text-slate-700">
                              {formatNum(barisTerpilih.totalKkal / 1e9, 2)} M kkal
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span
                                className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${STATUS_KALORI_WARNA[barisTerpilih.status]}`}
                              >
                                {barisTerpilih.status}
                              </span>
                            </td>
                          </tr>
                          <tr className="border-t border-slate-100 text-[11px] text-slate-500">
                            <td className="px-3 py-1.5" colSpan={4}>
                              {formatNum(barisTerpilih.tersediaKkalPerKapitaHari)} kkal/kapita/hari ·
                              rasio {formatPct(barisTerpilih.rasio)} · cakupan {barisTerpilih.cakupan}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Tidak ada data pada tahun ini.</p>
                  )}
                </div>
              </div>

              {/* Cadangan pangan */}
              <div className="mt-6 border-t border-slate-200 pt-4">
                <h5 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <Warehouse size={16} className="text-slate-600" />
                  Cadangan Pangan (Lumbung &amp; Gudang)
                </h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div className="border border-slate-200 rounded p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Lumbung Pangan</p>
                    <p className="text-lg font-semibold text-slate-800">
                      {formatNum(totalCadangan.lumbungUnit)} unit
                    </p>
                  </div>
                  <div className="border border-slate-200 rounded p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Kapasitas Lumbung</p>
                    <p className="text-lg font-semibold text-slate-800">
                      {formatNum(totalCadangan.lumbungKapasitas, 1)} ton
                    </p>
                  </div>
                  <div className="border border-slate-200 rounded p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Luas Gudang</p>
                    <p className="text-lg font-semibold text-slate-800">
                      {formatNum(totalCadangan.gudangLuas, 1)} m²
                    </p>
                  </div>
                  <div className="border border-slate-200 rounded p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Kapasitas Gudang</p>
                    <p className="text-lg font-semibold text-slate-800">
                      {formatNum(totalCadangan.gudangKapasitas, 1)} ton
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ============ PILAR 2 & 3 — FSVA ============ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pilar 2 */}
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow transition-all duration-200 p-6">
                <div className="flex flex-col mb-4 border-b border-slate-200 pb-3">
                  <h4 className="text-base font-bold uppercase flex items-center gap-2 tracking-wide">
                    <Coins size={20} className="text-sky-700" />
                    Pilar 2 — Keterjangkauan
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Akses ekonomi &amp; fisik. Indikator desa dari FSVA Bapanas {FSVA_TAHUN_TERBARU};
                    indikator harga bersifat tingkat kabupaten.
                  </p>
                </div>

                <div className="flex flex-col gap-2 mb-4">
                  {FSVA_INDIKATOR_PER_PILAR.Keterjangkauan.map((def) => {
                    const nilai = fsvaKabupaten.rata[def.key] ?? 0;
                    return (
                      <div
                        key={def.key}
                        className="flex items-center justify-between gap-3 border border-slate-200 rounded px-3 py-2"
                      >
                        <div>
                          <p className="text-xs font-semibold text-slate-700">{def.label}</p>
                          <p className="text-[11px] text-slate-500">{def.unit}</p>
                        </div>
                        <p className="text-sm font-bold text-slate-800 whitespace-nowrap">
                          {def.categorical ? `${Math.round(nilai)} desa` : def.format(nilai)}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between gap-3 border border-emerald-200 bg-emerald-50 rounded px-3 py-2 mb-4">
                  <div>
                    <p className="text-xs font-semibold text-emerald-900">
                      Harga pangan (produsen &amp; konsumen)
                    </p>
                    <p className="text-[11px] text-emerald-700">
                      Bapanas &amp; Harga Pangan Jateng — disajikan di halaman tersendiri
                    </p>
                  </div>
                  <a
                    href="/price-volatility"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 hover:underline whitespace-nowrap"
                  >
                    Buka <ArrowRight size={12} />
                  </a>
                </div>

                <div className="flex items-center justify-between gap-3 border border-emerald-200 bg-emerald-50 rounded px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold text-emerald-900">Infrastruktur distribusi</p>
                    <p className="text-[11px] text-emerald-700">
                      Simpul pasar &amp; rantai pasok — disajikan di halaman tersendiri
                    </p>
                  </div>
                  <a
                    href="/supply-chain"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 hover:underline whitespace-nowrap"
                  >
                    Buka <ArrowRight size={12} />
                  </a>
                </div>
              </div>

              {/* Pilar 3 */}
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow transition-all duration-200 p-6">
                <div className="flex flex-col mb-4 border-b border-slate-200 pb-3">
                  <h4 className="text-base font-bold uppercase flex items-center gap-2 tracking-wide">
                    <Truck size={20} className="text-violet-700" />
                    Pilar 3 — Pemanfaatan
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Mutu gizi, keamanan pangan, dan kebersihan air. Saat ini baru tersedia indikator
                    proksi dari FSVA {FSVA_TAHUN_TERBARU}.
                  </p>
                </div>

                <div className="flex flex-col gap-2 mb-4">
                  {FSVA_INDIKATOR_PER_PILAR.Pemanfaatan.map((def) => {
                    const nilai = fsvaKabupaten.rata[def.key] ?? 0;
                    return (
                      <div
                        key={def.key}
                        className="flex items-center justify-between gap-3 border border-slate-200 rounded px-3 py-2"
                      >
                        <div>
                          <p className="text-xs font-semibold text-slate-700">{def.label}</p>
                          <p className="text-[11px] text-slate-500">{def.unit}</p>
                        </div>
                        <p className="text-sm font-bold text-slate-800 whitespace-nowrap">
                          {def.categorical ? `${Math.round(nilai)} desa` : def.format(nilai)}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="border border-rose-200 bg-rose-50 rounded p-3">
                  <p className="text-[11px] font-bold text-rose-800 uppercase tracking-wider mb-1.5">
                    Indikator baku Bapanas yang belum tersedia
                  </p>
                  <ul className="text-[11px] text-rose-900 leading-relaxed flex flex-col gap-1">
                    {CELAH_DATA_PILAR.filter((c) => c.pilar === "Pemanfaatan").map((c) => (
                      <li key={c.indikator}>
                        <strong>{c.indikator}</strong>
                        <span className="text-rose-700"> — butuh: {c.sumberDibutuhkan}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-rose-700 mt-2 leading-relaxed">
                    Data ini tidak disajikan sebagai perkiraan. Setelah sumber data tersedia, dapat
                    diisi melalui dasbor entri admin.
                  </p>
                </div>
              </div>
            </div>

            {/* ============ TABEL TERPADU PER KECAMATAN ============ */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow transition-all duration-200 p-6">
              <div className="flex flex-col mb-4 border-b border-slate-200 pb-3">
                <h4 className="text-lg font-bold uppercase flex items-center gap-2 tracking-wide">
                  <Layers size={22} className="text-slate-700" />
                  Rekap Tiga Pilar per Kecamatan
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Ketersediaan = neraca kalori {tahunDipilih}; keterjangkauan &amp; pemanfaatan =
                  indikator FSVA {FSVA_TAHUN_TERBARU} ({formatNum(fsvaKabupaten.totalDesa)} desa).
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">Kecamatan</th>
                      <th className="text-right px-3 py-2 font-semibold">Penduduk</th>
                      <th className="text-right px-3 py-2 font-semibold">kkal/kap/hari</th>
                      <th className="text-right px-3 py-2 font-semibold">Rasio</th>
                      <th className="text-center px-3 py-2 font-semibold">Status</th>
                      <th className="text-right px-3 py-2 font-semibold">IKP Desa</th>
                      <th className="text-center px-3 py-2 font-semibold">
                        Desa Sangat Rawan/Rawan
                      </th>
                      <th className="text-right px-3 py-2 font-semibold">Lumbung</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...barisTahun]
                      .sort((a, b) => b.rasio - a.rasio)
                      .map((b) => {
                        const fsva = fsvaPerKecamatan[b.kecamatan];
                        const rawan = KOMPOSIT_RAWAN.reduce(
                          (s, p) => s + (fsva?.prioritas[p] ?? 0),
                          0,
                        );
                        const cad = cadanganMap[b.kecamatan];
                        return (
                          <tr key={b.kecamatan} className="border-t border-slate-100 hover:bg-slate-50">
                            <td className="px-3 py-1.5 font-medium text-slate-700 capitalize">
                              {b.kecamatan}
                              {b.cakupan === "Parsial" && (
                                <span className="ml-1.5 text-[10px] text-amber-700 font-semibold">
                                  (parsial)
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-1.5 text-right text-slate-600">
                              {formatNum(b.penduduk)}
                            </td>
                            <td className="px-3 py-1.5 text-right text-slate-600">
                              {formatNum(b.tersediaKkalPerKapitaHari)}
                            </td>
                            <td className="px-3 py-1.5 text-right text-slate-600">
                              {formatPct(b.rasio)}
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              <span
                                className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${STATUS_KALORI_WARNA[b.status]}`}
                              >
                                {b.status}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-right text-slate-600">
                              {fsva ? formatNum(fsva.ikpRataRata, 1) : "—"}
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              {fsva ? (
                                <span
                                  className={`font-semibold ${rawan > 0 ? "text-rose-700" : "text-slate-500"}`}
                                >
                                  {rawan} / {fsva.jumlahDesa}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-3 py-1.5 text-right text-slate-600">
                              {cad ? `${formatNum(cad.lumbungUnit)} unit` : "—"}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot className="bg-slate-50 font-semibold">
                    <tr className="border-t border-slate-200">
                      <td className="px-3 py-2 text-slate-700">Kabupaten</td>
                      <td className="px-3 py-2 text-right text-slate-700">
                        {formatNum(ringkasan.penduduk)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">
                        {formatNum(ringkasan.kkalPerKapitaHari)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">
                        {formatPct(ringkasan.rasio)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${STATUS_KALORI_WARNA[ringkasan.status]}`}
                        >
                          {ringkasan.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">
                        {formatNum(fsvaKabupaten.ikpRata, 1)}
                      </td>
                      <td className="px-3 py-2 text-center text-rose-700">
                        {formatNum(desaPrioritasRawan)} / {formatNum(fsvaKabupaten.totalDesa)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">
                        {formatNum(totalCadangan.lumbungUnit)} unit
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* ============ METODOLOGI ============ */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow transition-all duration-200 p-6">
              <div className="flex flex-col mb-4 border-b border-slate-200 pb-3">
                <h4 className="text-lg font-bold uppercase flex items-center gap-2 tracking-wide">
                  <Info size={22} className="text-slate-700" />
                  Metodologi &amp; Batas Perhitungan
                </h4>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h5 className="text-sm font-bold text-slate-700 mb-2">Rumus</h5>
                  <div className="text-xs text-slate-600 leading-relaxed border border-slate-200 rounded p-3 bg-slate-50/60 flex flex-col gap-1.5">
                    <p>
                      <strong>Energi komoditas</strong> = produksi × faktor ke kg BDD × kkal/kg BDD
                    </p>
                    <p>
                      <strong>Kebutuhan</strong> = penduduk ×{" "}
                      {formatNum(KEBUTUHAN_KKAL_PER_KAPITA_HARI)} kkal ×{" "}
                      {formatNum(HARI_PER_TAHUN)} hari ={" "}
                      {formatNum(KEBUTUHAN_KKAL_PER_KAPITA_TAHUN)} kkal/kapita/tahun
                    </p>
                    <p>
                      <strong>Tersedia/kapita/hari</strong> = total energi ÷ penduduk ÷{" "}
                      {formatNum(HARI_PER_TAHUN)}
                    </p>
                    <p>
                      <strong>Rasio</strong> = tersedia ÷{" "}
                      {formatNum(KEBUTUHAN_KKAL_PER_KAPITA_HARI)} kkal
                    </p>
                    <p className="pt-1.5 border-t border-slate-200 mt-1">
                      <strong>Status</strong>: ≥125% Swasembada · 100–125% Surplus · 75–100% Defisit ·
                      &lt;75% Kurang
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Penduduk memakai data KEMENAG 2023 (tahun 2024 tidak dipakai karena distribusi
                      per-kecamatannya rusak pada sumber).
                      {tanpaPenduduk > 0 && (
                        <> {formatNum(tanpaPenduduk)} baris tanpa data penduduk dibuang.</>
                      )}
                    </p>
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-bold text-slate-700 mb-2">
                    Tidak dimasukkan ke neraca kalori
                  </h5>
                  <ul className="text-xs text-slate-600 leading-relaxed flex flex-col gap-2">
                    {DIKECUALIKAN_DARI_NERACA.map((d) => (
                      <li key={d.label} className="border border-slate-200 rounded p-2.5">
                        <span className="font-semibold text-slate-700">{d.label}</span>
                        <span className="block text-[11px] text-slate-500 mt-0.5">{d.alasan}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-6">
                <h5 className="text-sm font-bold text-slate-700 mb-2">
                  Tabel Faktor Konversi ({FAKTOR_KALORI.length} komoditas)
                </h5>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold">Komoditas</th>
                        <th className="text-left px-3 py-2 font-semibold">Kelompok</th>
                        <th className="text-right px-3 py-2 font-semibold">Satuan data</th>
                        <th className="text-right px-3 py-2 font-semibold">Faktor → kg BDD</th>
                        <th className="text-right px-3 py-2 font-semibold">kkal/kg BDD</th>
                        <th className="text-left px-3 py-2 font-semibold">Dasar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {FAKTOR_KALORI.map((f) => (
                        <tr key={f.kunci} className="border-t border-slate-100">
                          <td className="px-3 py-1.5 text-slate-700">{f.label}</td>
                          <td className="px-3 py-1.5">
                            <span
                              className="inline-block w-2 h-2 rounded-sm mr-1.5 align-middle"
                              style={{ background: WARNA_KELOMPOK[f.kelompok] }}
                            />
                            <span className="text-slate-600">{f.kelompok}</span>
                          </td>
                          <td className="px-3 py-1.5 text-right text-slate-600">{f.satuanData}</td>
                          <td className="px-3 py-1.5 text-right text-slate-600">
                            {formatNum(f.faktorKeKg, f.faktorKeKg < 1 ? 2 : 0)}
                          </td>
                          <td className="px-3 py-1.5 text-right text-slate-600">
                            {formatNum(f.kkalPerKg)}
                          </td>
                          <td className="px-3 py-1.5 text-[11px] text-slate-500">{f.dasar}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  Nilai energi memakai Tabel Komposisi Pangan Indonesia (TKPI, Kemenkes RI); faktor
                  BDD/rendemen memakai konvensi Neraca Bahan Makanan (NBM) Bapanas. Seluruh faktor
                  terpusat di <code className="text-slate-600">src/services/ketahananPangan.ts</code>{" "}
                  sehingga dapat diaudit dan disesuaikan tanpa mengubah logika perhitungan.
                </p>
              </div>

              <div className="mt-6 border-t border-slate-200 pt-4">
                <h5 className="text-sm font-bold text-slate-700 mb-2">
                  Celah Data yang Diakui Terbuka ({CELAH_DATA_PILAR.length})
                </h5>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold">Pilar</th>
                        <th className="text-left px-3 py-2 font-semibold">Indikator belum tersedia</th>
                        <th className="text-left px-3 py-2 font-semibold">Sumber data dibutuhkan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CELAH_DATA_PILAR.map((c) => (
                        <tr key={`${c.pilar}-${c.indikator}`} className="border-t border-slate-100">
                          <td className="px-3 py-1.5 font-medium text-slate-700">{c.pilar}</td>
                          <td className="px-3 py-1.5 text-slate-600">{c.indikator}</td>
                          <td className="px-3 py-1.5 text-slate-500">{c.sumberDibutuhkan}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  Indikator-indikator di atas diminta{" "}
                  <code className="text-slate-600">public/gap-analysis-master.md</code> (Bidang
                  Ketahanan Pangan). Tidak disajikan sebagai angka perkiraan; setelah data tersedia
                  dapat dimasukkan lewat dasbor entri admin.
                </p>
              </div>

              <div className="mt-4 flex gap-3 items-start text-[11px] border border-slate-200 bg-slate-50 rounded p-3 text-slate-600">
                <Info size={14} className="shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Kelas Prioritas FSVA</strong> ({formatNum(fsvaKabupaten.totalDesa)} desa):{" "}
                  {distribusiPrioritas}
                  . IKP kabupaten rata-rata {formatNum(fsvaKabupaten.ikpRata, 1)} (skala 0–100, makin
                  tinggi makin tahan pangan).
                </p>
              </div>
            </div>
          </>
        )}
      </section>
    </DefaultLayout>
  );
}
