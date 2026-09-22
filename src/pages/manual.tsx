import DefaultLayout from "@/layouts/default";
import { PageHeader, SectionCard, Badge } from "@/components/ui";
import {
  BookOpen,
  CheckCircle2,
  FileDown,
  FileText,
  Globe2,
  MapPinned,
  MousePointerClick,
  Printer,
  ShieldCheck,
  Smartphone,
  XCircle,
  Palette,
  Wrench,
} from "lucide-react";

const menuItems = [
  ["Dashboard", "Ringkasan utama dan peta sebaran lahan pertanian."],
  ["Prediksi Panen", "Analisis produktivitas dan simulasi prediksi panen padi."],
  ["Kesesuaian Lahan", "Analisis potensi/kesesuaian komoditas."],
  ["Fluktuasi Harga", "Analisis inflasi sebagai pendekatan fluktuasi harga."],
  ["Ketahanan Pangan", "Produksi padi dan infrastruktur cadangan pangan."],
  ["Rantai Pasok", "Informasi pasar dan kesiapan distribusi."],
  ["Peternakan", "Data ternak kecil, ternak besar, dan unggas."],
  ["Perkebunan", "Luas, produksi, produktivitas, dan proyeksi perkebunan."],
  ["Hortikultura", "Data sayuran, buah-buahan, dan proyeksi hortikultura."],
  ["Kelembagaan Tani", "Data kelompok tani, anggota, kelompok perikanan, dan gapoktan."],
  ["Perikanan", "Data perikanan budidaya, tangkap, dan pembenihan."],
  ["Nilai Ekonomi per Bidang", "Estimasi nilai ekonomi produksi — sub-menu di bawah tiap bidang (pangan, hortikultura, perkebunan, peternakan, perikanan)."],
  ["Rekomendasi", "Rekomendasi strategis berbasis data."],
  ["Analisis Bantuan", "Analisis bantuan pemerintah dan rekomendasi alokasi."],
  ["Analisis Renstra", "Evaluasi capaian indikator Renstra."],
  ["Info SISPERTANI", "Informasi umum sistem dan roadmap pengembangan."],
];

const canDo = [
  "Membuka seluruh halaman informasi yang tersedia.",
  "Melihat grafik, tabel, kartu statistik, dan peta analitik.",
  "Menggunakan filter/dropdown yang tersedia.",
  "Membuka detail wilayah pada peta.",
  "Membaca rekomendasi strategis.",
  "Mengunduh manual lengkap (DOCX) dari tombol di atas.",
  "Mencetak atau menyimpan halaman tertentu sebagai PDF.",
];

const cannotDo = [
  "Login sebagai admin.",
  "Mengubah, menambah, mengunggah, atau menghapus data.",
  "Mengubah konfigurasi aplikasi.",
  "Mengubah hasil analisis atau rekomendasi.",
];

const guideSections = [
  {
    title: "Dashboard",
    body: "Gunakan halaman awal untuk melihat jumlah dataset, total lahan sawah, lahan bukan sawah, cakupan wilayah, peta sebaran lahan, grafik luas lahan, dan tabel peringatan wilayah.",
  },
  {
    title: "Prediksi Panen",
    body: "Lihat produksi padi per kecamatan, produktivitas, dan simulasi tambahan luas tanam. Hasil prediksi bersifat simulatif dan perlu validasi lapangan.",
  },
  {
    title: "Ketahanan Pangan",
    body: "Amati produksi padi, jumlah lumbung/gudang, kapasitas cadangan pangan, dan wilayah yang perlu perhatian.",
  },
  {
    title: "Peternakan",
    body: "Bandingkan populasi ternak kecil, ternak besar, dan unggas antar wilayah untuk melihat sentra atau wilayah potensial.",
  },
  {
    title: "Perkebunan & Hortikultura",
    body: "Pilih metrik analisis seperti luas, produksi, atau produktivitas. Gunakan grafik dan proyeksi untuk membaca kecenderungan komoditas.",
  },
  {
    title: "Kelembagaan Tani",
    body: "Lihat jumlah kelompok tani, anggota tani, kelompok perikanan, gapoktan, dan sebarannya untuk memahami kekuatan kelembagaan wilayah.",
  },
  {
    title: "Perikanan & Nilai Ekonomi",
    body: "Pelajari produksi budidaya, tangkap, pembenihan, serta perbandingan nilai produksi untuk melihat potensi ekonomi sektor perikanan.",
  },
  {
    title: "Rekomendasi & Renstra",
    body: "Baca rekomendasi strategis dan evaluasi capaian Renstra. Gunakan tombol cetak untuk menyimpan laporan dalam format PDF.",
  },
];

const colorMeanings = [
  ["Hijau", "Nilai tinggi, kondisi baik, atau potensi kuat.", "bg-emerald-300"],
  ["Kuning/Amber", "Perlu perhatian, potensi sedang, atau transisi.", "bg-amber-300"],
  ["Merah", "Risiko/peringatan atau prioritas intervensi.", "bg-red-300"],
  ["Biru", "Informasi pendukung atau kategori tertentu.", "bg-blue-300"],
  ["Abu-abu", "Data tidak tersedia atau belum cocok.", "bg-slate-300"],
];

const quickSteps = ["Buka aplikasi", "Pilih menu", "Lihat data", "Gunakan filter", "Cetak bila perlu"];

const accessCards = [
  {
    icon: <Globe2 className="h-5 w-5" />,
    boxClass: "bg-blue-100 text-blue-700",
    label: "Alamat Aplikasi",
    value: "https://pertanian.sistemdata.id",
    breakAll: true,
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    boxClass: "bg-emerald-100 text-emerald-700",
    label: "Jenis Akses",
    value: "Tanpa Login",
    breakAll: false,
  },
  {
    icon: <Smartphone className="h-5 w-5" />,
    boxClass: "bg-purple-100 text-purple-700",
    label: "Perangkat",
    value: "Desktop, laptop, tablet, dan ponsel.",
    breakAll: false,
  },
];

export default function ManualPage() {
  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8 py-2 max-w-6xl mx-auto">
        {/* Hero / kop panduan */}
        <PageHeader
          className="print-block"
          icon={<BookOpen className="h-6 w-6" />}
          title="Panduan Penggunaan SISPERTANI"
          subtitle="Manual ringkas untuk pengunjung yang ingin membaca data, grafik, peta, dan rekomendasi Dasbor Analitik Pertanian Kabupaten Banjarnegara tanpa login."
          actions={
            <>
              <Badge tone="emerald">Manual Pengunjung / Guest</Badge>
              <a
                href="/Manual_Pengguna_SISPERTANI.docx"
                download
                className="no-print inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-800 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-900"
              >
                <FileDown className="h-3.5 w-3.5" /> Unduh Manual Lengkap (DOCX)
              </a>
              <button
                className="no-print inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-800 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-900"
                onClick={() => window.print()}
              >
                <Printer className="h-3.5 w-3.5" /> Cetak / Simpan PDF
              </button>
            </>
          }
        />

        {/* Kartu akses ringkas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {accessCards.map((card) => (
            <div
              key={card.label}
              className="print-block bg-white border border-slate-200 rounded-lg shadow-sm p-5"
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-md mb-3 ${card.boxClass}`}
              >
                {card.icon}
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {card.label}
              </p>
              <p
                className={`mt-1 text-sm font-semibold text-slate-800 ${
                  card.breakAll ? "break-all" : ""
                }`}
              >
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {/* Hak & batasan akses guest */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SectionCard
            className="print-block"
            title="Yang Dapat Dilakukan Guest"
            icon={<CheckCircle2 size={16} className="text-emerald-600" />}
          >
            <ul className="space-y-2.5">
              {canDo.map((item) => (
                <li key={item} className="flex gap-3 text-sm text-slate-600 leading-relaxed">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
          <SectionCard
            className="print-block"
            title="Batasan Akses Guest"
            icon={<XCircle size={16} className="text-red-600" />}
          >
            <ul className="space-y-2.5">
              {cannotDo.map((item) => (
                <li key={item} className="flex gap-3 text-sm text-slate-600 leading-relaxed">
                  <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        {/* Alur cepat penggunaan */}
        <SectionCard
          className="print-block"
          title="Alur Cepat Penggunaan"
          icon={<MousePointerClick size={16} className="text-blue-600" />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {quickSteps.map((step, index) => (
              <div
                key={step}
                className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center"
              >
                <div className="mx-auto flex h-6 w-6 items-center justify-center rounded-md bg-blue-800 text-xs font-semibold text-white mb-3">
                  {index + 1}
                </div>
                <p className="text-xs font-semibold text-slate-800">{step}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Daftar menu pengunjung */}
        <SectionCard
          className="print-block"
          title="Daftar Menu untuk Pengunjung"
          icon={<FileText size={16} className="text-indigo-600" />}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Menu
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Fungsi
                  </th>
                </tr>
              </thead>
              <tbody>
                {menuItems.map(([menu, desc]) => (
                  <tr key={menu} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">
                      {menu}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Panduan peta interaktif */}
        <SectionCard
          className="print-block"
          title="Panduan Menggunakan Peta Interaktif"
          icon={<MapPinned size={16} className="text-emerald-600" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 mb-3">
                <MapPinned className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-semibold tracking-wide text-slate-800 mb-1.5">
                Layer & Legenda
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Pilih metrik Lahan Sawah, Ladang, atau Total Keseluruhan. Klik kategori pada legenda
                untuk menyaring wilayah berdasarkan rentang luasan.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-100 text-amber-700 mb-3">
                <MousePointerClick className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-semibold tracking-wide text-slate-800 mb-1.5">
                Cari & Klik Desa
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Gunakan kotak pencarian untuk menemukan desa. Klik area desa untuk melihat popup
                berisi luas sawah, lahan bukan sawah, total luas, dan data kelembagaan tani bila
                tersedia.
              </p>
            </div>
          </div>
        </SectionCard>

        {/* Panduan per halaman */}
        <SectionCard
          className="print-block"
          title="Panduan per Halaman"
          icon={<FileText size={16} className="text-blue-600" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {guideSections.map((section) => (
              <div key={section.title} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h4 className="text-xs font-semibold text-slate-800 mb-1.5 leading-tight">
                  {section.title}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">{section.body}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Cara membaca warna */}
        <SectionCard
          className="print-block"
          title="Cara Membaca Warna"
          icon={<Palette size={16} className="text-purple-600" />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            {colorMeanings.map(([name, desc, swatch]) => (
              <div key={name} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`h-3 w-3 rounded-sm border border-slate-300 ${swatch}`} />
                  <h4 className="text-xs font-semibold text-slate-800">{name}</h4>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Troubleshooting & catatan */}
        <SectionCard
          className="print-block"
          title="Troubleshooting & Catatan"
          icon={<Wrench size={16} className="text-red-600" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h4 className="text-xs font-semibold tracking-wide text-slate-800 mb-2">
                Jika data tidak muncul
              </h4>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-600">
                <li>Refresh halaman browser.</li>
                <li>Gunakan hard refresh: Ctrl + Shift + R.</li>
                <li>Pastikan koneksi internet stabil.</li>
                <li>Coba buka dengan browser lain.</li>
              </ol>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h4 className="text-xs font-semibold tracking-wide text-slate-800 mb-2">
                Batasan data
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Data mengikuti ketersediaan sumber lokal dan Open Data. Wilayah abu-abu pada peta
                berarti data belum tersedia atau nama wilayah belum cocok. Hasil analisis adalah
                alat bantu dan tetap perlu validasi instansi/lapangan.
              </p>
            </div>
          </div>
        </SectionCard>
      </section>
    </DefaultLayout>
  );
}
