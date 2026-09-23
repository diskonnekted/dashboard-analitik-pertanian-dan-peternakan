import DefaultLayout from "@/layouts/default";
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
  BarChart3,
  Layers,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

/* =========================================================
   Halaman Info SISPERTANI — mengikuti pola layout & style
   halaman lain (DefaultLayout + PageHeader + kartu baku).
   Sumber data ditampilkan garis besar tanpa rincian teknis.
   ========================================================= */

const RINGKASAN_FITUR = [
  {
    icon: <Layers className="h-5 w-5" />,
    boxClass: "bg-blue-100 text-blue-700",
    title: "Integrasi Multi-Sumber",
    desc: "Statistik dinas, portal data terbuka kabupaten, dan layanan data pangan nasional dalam satu tampilan.",
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    boxClass: "bg-emerald-100 text-emerald-700",
    title: "Visualisasi Interaktif",
    desc: "Peta 278 desa, tren produksi, harga, dan indikator ketahanan pangan dengan grafik yang mudah dibaca.",
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    boxClass: "bg-amber-100 text-amber-700",
    title: "Akses Publik & Transparan",
    desc: "Setiap panel mencantumkan sumber datanya; arsip lokal menjaga ketersediaan saat gangguan jaringan.",
  },
];

/* Sumber data — garis besar institusi & jenis data saja.
   Rincian endpoint/tabel teknis tidak ditampilkan di halaman publik. */
const SUMBER_DATA = [
  {
    icon: <Globe className="h-5 w-5" />,
    boxClass: "bg-blue-100 text-blue-700",
    nama: "Portal Open Data Kabupaten Banjarnegara",
    lembaga: "Pemerintah Kabupaten Banjarnegara",
    jenis: "Portal Data Terbuka",
    cakupan: ["Produksi tanaman pangan", "Produksi sayuran", "Lumbung pangan", "Aktivitas pasar"],
    catatan:
      "Statistik resmi kabupaten yang diterbitkan melalui portal data terbuka opendata.banjarnegarakab.go.id.",
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    boxClass: "bg-rose-100 text-rose-700",
    nama: "Badan Pangan Nasional",
    lembaga: "Bapanas RI",
    jenis: "Layanan Data Daring",
    cakupan: [
      "Indeks anomali harga pangan nasional",
      "Harga pangan konsumen Jateng",
      "Harga pangan produsen Jateng",
    ],
    catatan:
      "Indikator stabilitas harga pangan nasional serta harga tingkat konsumen dan produsen Provinsi Jawa Tengah.",
  },
  {
    icon: <FileSpreadsheet className="h-5 w-5" />,
    boxClass: "bg-teal-100 text-teal-700",
    nama: "Sensus Pertanian 2023",
    lembaga: "BPS Kabupaten Banjarnegara",
    jenis: "Publikasi Resmi",
    cakupan: [
      "Profil lahan usaha tani per desa",
      "Rumah tangga pertanian",
      "Populasi ternak & perikanan",
    ],
    catatan:
      "Hasil Sensus Pertanian 2023 (ST2023) hingga tingkat desa, sebagai baseline profil usaha tani kabupaten.",
  },
  {
    icon: <Wheat className="h-5 w-5" />,
    boxClass: "bg-emerald-100 text-emerald-700",
    nama: "Dinas Pertanian & Ketahanan Pangan",
    lembaga: "Distankan Banjarnegara",
    jenis: "Arsip Dinas",
    cakupan: [
      "Tanaman pangan & hortikultura",
      "Perkebunan, peternakan, perikanan",
      "Kelembagaan petani",
      "Dokumen renstra",
    ],
    catatan:
      "Tabel statistik resmi dinas (±2018–2024) serta dokumen perencanaan yang menjadi acuan program pertanian.",
  },
  {
    icon: <Map className="h-5 w-5" />,
    boxClass: "bg-sky-100 text-sky-700",
    nama: "Data Geospasial",
    lembaga: "Pemkab Banjarnegara / BIG",
    jenis: "Peta & Batas Wilayah",
    cakupan: [
      "Batas 20 kecamatan & 278 desa",
      "Layer jalan, sungai, danau",
      "Peta dasar daring (Esri, OpenFreeMap)",
    ],
    catatan:
      "Batas administrasi dan layer pendukung untuk visualisasi peta dasbor dan halaman detail desa.",
  },
  {
    icon: <Database className="h-5 w-5" />,
    boxClass: "bg-violet-100 text-violet-700",
    nama: "Basis Data Internal SISPERTANI",
    lembaga: "Dikelola Dinas (Dasbor Admin)",
    jenis: "Integrasi & Normalisasi",
    cakupan: [
      "Hasil integrasi seluruh sumber",
      "Normalisasi & validasi silang",
      "Arsip snapshot cadangan",
    ],
    catatan:
      "Data utama aplikasi disajikan dari basis data internal yang dikelola melalui dasbor admin, dilengkapi arsip lokal sebagai lapisan cadangan.",
  },
];

const ALUR_AKSES = [
  {
    icon: <Database className="h-5 w-5" />,
    judul: "Basis Data Internal",
    desc: "Sajian utama dari hasil integrasi & normalisasi seluruh sumber.",
  },
  {
    icon: <Globe className="h-5 w-5" />,
    judul: "Sumber Daring Resmi",
    desc: "Pembaruan langsung dari portal/API lembaga saat data terbaru tersedia.",
  },
  {
    icon: <Archive className="h-5 w-5" />,
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
    <DefaultLayout>
      <section className="flex flex-col gap-8 py-2 max-w-6xl mx-auto">
        {/* Kartu identitas aplikasi + logo resmi */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <img
            src="/logo.png"
            alt="Logo resmi SISPERTANI"
            className="h-28 w-auto shrink-0 rounded-lg bg-white p-1"
          />
          <div className="text-center sm:text-left min-w-0">
            <h2 className="text-2xl font-bold tracking-tight text-slate-800">SISPERTANI</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
              Sistem Informasi Pertanian Kabupaten Banjarnegara — integrasi data statistik pertanian,
              harga pangan, dan profil desa dalam satu dasbor untuk mendukung ketahanan pangan daerah.
            </p>
            <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-2">
              <Badge tone="blue">Kabupaten Banjarnegara</Badge>
              <Badge tone="slate">20 Kecamatan</Badge>
              <Badge tone="slate">278 Desa</Badge>
            </div>
          </div>
        </div>

        {/* Ringkasan fitur */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {RINGKASAN_FITUR.map((f) => (
            <div key={f.title} className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
              <div className={`flex h-9 w-9 items-center justify-center rounded-md mb-3 ${f.boxClass}`}>
                {f.icon}
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Fitur</p>
              <h3 className="mt-1 text-sm font-semibold text-slate-800">{f.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Sumber data */}
        <SectionCard icon={<Landmark size={16} className="text-blue-800" />} title="Sumber Data">
          <p className="mb-4 text-sm text-slate-500">
            Institusi penyedia data yang digunakan aplikasi — garis besar per jenis kelompok data.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {SUMBER_DATA.map((s) => (
              <article
                key={s.nama}
                className="bg-white border border-slate-200 rounded-lg shadow-sm p-5 flex flex-col"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-md shrink-0 ${s.boxClass}`}>
                    {s.icon}
                  </div>
                  <Badge tone="slate">{s.jenis}</Badge>
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{s.lembaga}</p>
                <h3 className="mt-1 text-sm font-semibold leading-snug text-slate-800">{s.nama}</h3>
                <ul className="mt-3 space-y-1.5">
                  {s.cakupan.map((c) => (
                    <li key={c} className="flex items-start gap-2 text-sm leading-relaxed text-slate-600">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                      {c}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 pt-3 border-t border-slate-200 text-xs leading-relaxed text-slate-500">
                  {s.catatan}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-400">
            Rincian teknis akses data (endpoint, tabel, dan kunci layanan) tidak ditampilkan di halaman publik
            demi keamanan sistem. Setiap panel statistik mencantumkan sumber spesifiknya pada bagian bawah halaman.
          </p>
        </SectionCard>

        {/* Alur akses data */}
        <SectionCard icon={<Layers size={16} className="text-blue-800" />} title="Alur Akses Data">
          <p className="mb-4 text-sm text-slate-500">
            Urutan lapisan penyajian data agar tampilan tetap tersedia dan mutakhir.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ALUR_AKSES.map((a, i) => (
              <div key={a.judul} className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-100 text-blue-700 shrink-0">
                    {a.icon}
                  </div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Lapisan {i + 1}
                  </p>
                </div>
                <h3 className="text-sm font-semibold text-slate-800">{a.judul}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">{a.desc}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Kontak & jam layanan & roadmap */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SectionCard icon={<MapPin size={16} className="text-blue-800" />} title="Kontak">
            <div className="space-y-3 text-sm text-slate-600">
              <p className="leading-relaxed">{KONTAK.alamat}</p>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" />
                <span>{KONTAK.telepon}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                <span className="break-all">{KONTAK.email}</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={<Clock size={16} className="text-blue-800" />} title="Jam Layanan">
            <div className="space-y-2">
              {KONTAK.jam.map((j) => (
                <div
                  key={j.hari}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                >
                  <span className="text-slate-600">{j.hari}</span>
                  <span className="font-medium text-slate-800">{j.pelayanan}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard icon={<BarChart3 size={16} className="text-blue-800" />} title="Roadmap">
            <ul className="space-y-2.5">
              {ROADMAP.map((r) => (
                <li key={r.judul} className="flex items-start gap-2.5 text-sm">
                  {r.status === "selesai" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
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
      </section>
    </DefaultLayout>
  );
}
