import { SectionCard, Badge } from "@/components/ui";
import {
  Wheat,
  Globe,
  FileSpreadsheet,
  Landmark,
  Map,
  Database,
  Archive,
  Phone,
  Mail,
  Clock,
  MapPin,
  CheckCircle2,
  Circle,
  ArrowRight,
  BarChart3,
  Layers,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

/* =========================================================
   Halaman Info SISPERTANI
   - Hero identitas aplikasi + logo resmi
   - Sumber data (garis besar, tanpa rincian teknis sensitif)
   - Alur akses data multi-lapis
   - Kontak & roadmap
   ========================================================= */

const RINGKASAN_FITUR = [
  {
    icon: Layers,
    title: "Integrasi Multi-Sumber",
    desc: "Statistik dinas, portal data terbuka kabupaten, dan layanan data pangan nasional dalam satu tampilan.",
    color: "bg-blue-50 text-blue-700",
  },
  {
    icon: BarChart3,
    title: "Visualisasi Interaktif",
    desc: "Peta 278 desa, tren produksi, harga, dan indikator ketahanan pangan dengan grafik yang mudah dibaca.",
    color: "bg-emerald-50 text-emerald-700",
  },
  {
    icon: ShieldCheck,
    title: "Akses Publik & Transparan",
    desc: "Setiap panel mencantumkan sumber datanya; arsip lokal menjaga ketersediaan saat gangguan jaringan.",
    color: "bg-amber-50 text-amber-700",
  },
];

/* Sumber data — garis besar institusi & jenis data saja.
   Rincian endpoint/tabel teknis tidak ditampilkan di halaman publik. */
const SUMBER_DATA = [
  {
    icon: Globe,
    nama: "Portal Open Data Kabupaten Banjarnegara",
    lembaga: "Pemerintah Kabupaten Banjarnegara",
    jenis: "Portal Data Terbuka",
    warna: "bg-blue-50 text-blue-700",
    cakupan: ["Produksi tanaman pangan", "Produksi sayuran", "Lumbung pangan", "Aktivitas pasar"],
    catatan:
      "Statistik resmi kabupaten yang diterbitkan melalui portal data terbuka opendata.banjarnegarakab.go.id.",
  },
  {
    icon: TrendingUp,
    nama: "Badan Pangan Nasional",
    lembaga: "Bapanas RI",
    jenis: "Layanan Data Daring",
    warna: "bg-rose-50 text-rose-700",
    cakupan: ["Indeks anomali harga pangan nasional", "Harga pangan konsumen Jateng", "Harga pangan produsen Jateng"],
    catatan:
      "Indikator stabilitas harga pangan nasional serta harga tingkat konsumen dan produsen Provinsi Jawa Tengah.",
  },
  {
    icon: FileSpreadsheet,
    nama: "Sensus Pertanian 2023",
    lembaga: "BPS Kabupaten Banjarnegara",
    jenis: "Publikasi Resmi",
    warna: "bg-teal-50 text-teal-700",
    cakupan: ["Profil lahan usaha tani per desa", "Rumah tangga pertanian", "Populasi ternak & perikanan"],
    catatan:
      "Hasil Sensus Pertanian 2023 (ST2023) hingga tingkat desa, sebagai baseline profil usaha tani kabupaten.",
  },
  {
    icon: Wheat,
    nama: "Dinas Pertanian & Ketahanan Pangan",
    lembaga: "Distankan Banjarnegara",
    jenis: "Arsip Dinas",
    warna: "bg-emerald-50 text-emerald-700",
    cakupan: ["Tanaman pangan & hortikultura", "Perkebunan, peternakan, perikanan", "Kelembagaan petani", "Dokumen renstra"],
    catatan:
      "Tabel statistik resmi dinas (±2018–2024) serta dokumen perencanaan yang menjadi acuan program pertanian.",
  },
  {
    icon: Map,
    nama: "Data Geospasial",
    lembaga: "Pemkab Banjarnegara / BIG",
    jenis: "Peta & Batas Wilayah",
    warna: "bg-sky-50 text-sky-700",
    cakupan: ["Batas 20 kecamatan & 278 desa", "Layer jalan, sungai, danau", "Peta dasar daring (Esri, OpenFreeMap)"],
    catatan:
      "Batas administrasi dan layer pendukung untuk visualisasi peta dasbor dan halaman detail desa.",
  },
  {
    icon: Database,
    nama: "Basis Data Internal SISPERTANI",
    lembaga: "Dikelola Dinas (Dasbor Admin)",
    jenis: "Integrasi & Normalisasi",
    warna: "bg-violet-50 text-violet-700",
    cakupan: ["Hasil integrasi seluruh sumber", "Normalisasi & validasi silang", "Arsip snapshot cadangan"],
    catatan:
      "Data utama aplikasi disajikan dari basis data internal yang dikelola melalui dasbor admin, dilengkapi arsip lokal sebagai lapisan cadangan.",
  },
];

const ALUR_AKSES = [
  {
    icon: Database,
    judul: "Basis Data Internal",
    desc: "Sajian utama dari hasil integrasi & normalisasi seluruh sumber.",
  },
  {
    icon: Globe,
    judul: "Sumber Daring Resmi",
    desc: "Pembaruan langsung dari portal/API lembaga saat data terbaru tersedia.",
  },
  {
    icon: Archive,
    judul: "Arsip Lokal",
    desc: "Snapshot tersimpan sebagai cadangan bila layanan daring mengalami gangguan.",
  },
];

const KONTAK = {
  alamat: "Dinas Pertanian dan Ketahanan Pangan Kabupaten Banjarnegara",
  telepon: "(0286) 123456",
  email: "info@pertanian.banjarnegarakab.go.id",
  jam: [
    { hari: "Senin – Kamis", pelayanan: "07.30 – 16.00 WIB" },
    { hari: "Jumat", pelayanan: "07.30 – 14.00 WIB" },
  ],
};

const ROADMAP = [
  { judul: "Integrasi portal data terbuka kabupaten", status: "selesai" },
  { judul: "Panel harga & anomali pangan nasional", status: "selesai" },
  { judul: "Profil desa lengkap 278 desa", status: "selesai" },
  { judul: "Estimasi nilai ekonomi per bidang", status: "selesai" },
  { judul: "Analitik lanjutan & bantuan petani", status: "berjalan" },
];

export default function InfoPage() {
  return (
    <div className="space-y-6">
      {/* ——— Hero identitas aplikasi ——— */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-900 via-blue-800 to-emerald-700 px-6 py-10 text-white shadow-lg">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, white 0, transparent 40%), radial-gradient(circle at 80% 70%, white 0, transparent 45%)",
          }}
        />
        <div className="relative flex flex-col items-center gap-6 text-center">
          <div className="rounded-3xl bg-white/95 p-4 shadow-xl ring-1 ring-white/40">
            <img src="/logo.png" alt="Logo resmi SISPERTANI" className="h-24 w-auto sm:h-28" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">SISPERTANI</h1>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-blue-100 sm:text-base">
              Sistem Informasi Pertanian Kabupaten Banjarnegara — integrasi data statistik pertanian,
              harga pangan, dan profil desa dalam satu dasbor untuk mendukung ketahanan pangan daerah.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-white/25">
              Kabupaten Banjarnegara
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-white/25">
              20 Kecamatan
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-white/25">
              278 Desa
            </span>
            <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-medium text-emerald-100 ring-1 ring-emerald-300/40">
              Data Resmi Multi-Sumber
            </span>
          </div>
        </div>
      </section>

      {/* ——— Ringkasan fitur ——— */}
      <div className="grid gap-4 md:grid-cols-3">
        {RINGKASAN_FITUR.map((f) => (
          <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ${f.color}`}>
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">{f.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* ——— Sumber data ——— */}
      <SectionCard icon={<Landmark className="h-5 w-5" />} title="Sumber Data">
        <p className="mb-4 text-sm text-slate-500">
          Institusi penyedia data yang digunakan aplikasi — garis besar per jenis kelompok data.
        </p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {SUMBER_DATA.map((s) => (
            <article key={s.nama} className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/60 p-5 transition-shadow hover:shadow-md">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${s.warna}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <Badge tone="slate">{s.jenis}</Badge>
              </div>
              <h3 className="text-sm font-semibold leading-snug text-slate-800">{s.nama}</h3>
              <p className="mt-0.5 text-xs font-medium text-slate-500">{s.lembaga}</p>
              <ul className="mt-3 space-y-1.5">
                {s.cakupan.map((c) => (
                  <li key={c} className="flex items-start gap-2 text-xs leading-relaxed text-slate-600">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                    {c}
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-slate-200 pt-3 text-xs leading-relaxed text-slate-500">{s.catatan}</p>
            </article>
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-slate-400">
          Rincian teknis akses data (endpoint, tabel, dan kunci layanan) tidak ditampilkan di halaman publik
          demi keamanan sistem. Setiap panel statistik mencantumkan sumber spesifiknya pada bagian bawah halaman.
        </p>
      </SectionCard>

      {/* ——— Alur akses data ——— */}
      <SectionCard icon={<Layers className="h-5 w-5" />} title="Alur Akses Data">
        <p className="mb-4 text-sm text-slate-500">
          Urutan lapisan penyajian data agar tampilan tetap tersedia dan mutakhir.
        </p>
        <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
          {ALUR_AKSES.map((a, i) => (
            <div key={a.judul} className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
              <div className="flex-1 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                    <a.icon className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Lapisan {i + 1}</p>
                    <h3 className="text-sm font-semibold text-slate-800">{a.judul}</h3>
                  </div>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{a.desc}</p>
              </div>
              {i < ALUR_AKSES.length - 1 && (
                <ArrowRight className="hidden h-5 w-5 shrink-0 text-slate-300 md:block" />
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ——— Kontak & jam layanan ——— */}
      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard icon={<MapPin className="h-5 w-5" />} title="Kontak">
          <p className="mb-3 text-sm text-slate-500">Layanan pengguna aplikasi.</p>
          <div className="space-y-3 text-sm text-slate-600">
            <p className="leading-relaxed">{KONTAK.alamat}</p>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-slate-400" />
              <span>{KONTAK.telepon}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400" />
              <span>{KONTAK.email}</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={<Clock className="h-5 w-5" />} title="Jam Layanan">
          <p className="mb-3 text-sm text-slate-500">Waktu layanan administrasi.</p>
          <div className="space-y-2">
            {KONTAK.jam.map((j) => (
              <div key={j.hari} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-600">{j.hari}</span>
                <span className="font-medium text-slate-800">{j.pelayanan}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard icon={<BarChart3 className="h-5 w-5" />} title="Roadmap">
          <p className="mb-3 text-sm text-slate-500">Pengembangan aplikasi.</p>
          <ul className="space-y-2.5">
            {ROADMAP.map((r) => (
              <li key={r.judul} className="flex items-start gap-2.5 text-sm">
                {r.status === "selesai" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                )}
                <span className={r.status === "selesai" ? "text-slate-600" : "font-medium text-slate-800"}>
                  {r.judul}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <p className="pb-2 text-center text-xs leading-relaxed text-slate-400">
        Foto pada peta dan halaman profil merupakan ilustrasi; seluruh angka statistik berasal dari sumber resmi
        sebagaimana tercantum di atas.
      </p>
    </div>
  );
}
