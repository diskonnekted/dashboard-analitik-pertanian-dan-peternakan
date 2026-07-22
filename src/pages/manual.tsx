import DefaultLayout from "@/layouts/default";
import {
  BookOpen,
  CheckCircle2,
  FileText,
  Globe2,
  MapPinned,
  MousePointerClick,
  Printer,
  ShieldCheck,
  Smartphone,
  XCircle,
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
  ["Nilai Ekonomi", "Nilai ekonomi produksi perikanan."],
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
  ["Hijau", "Nilai tinggi, kondisi baik, atau potensi kuat.", "bg-emerald-200"],
  ["Kuning/Amber", "Perlu perhatian, potensi sedang, atau transisi.", "bg-amber-200"],
  ["Merah", "Risiko/peringatan atau prioritas intervensi.", "bg-red-200"],
  ["Biru", "Informasi pendukung atau kategori tertentu.", "bg-blue-200"],
  ["Abu-abu", "Data tidak tersedia atau belum cocok.", "bg-neutral-200"],
];

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-md font-mono font-black uppercase tracking-wide text-[#141414] border-b-2 border-[#141414] pb-2 mb-4 flex items-center gap-2">
    <FileText size={18} className="text-emerald-700" />
    {children}
  </h3>
);

export default function ManualPage() {
  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8 py-2 max-w-6xl mx-auto">
        <div className="print-block bg-white border-2 border-[#141414] p-6 md:p-8 shadow-[4px_4px_0px_0px_#141414]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-200 border-2 border-[#141414] font-mono font-black text-xs uppercase shadow-[2px_2px_0px_0px_#141414] mb-4">
                <BookOpen size={15} /> Manual Pengunjung / Guest
              </span>
              <h1 className="font-serif italic text-3xl sm:text-5xl mt-2 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-800 to-teal-500 font-black drop-shadow-sm">
                Panduan Penggunaan SISPERTANI
              </h1>
              <p className="font-mono text-sm md:text-base font-bold text-neutral-600 mt-4 max-w-3xl border-l-4 border-emerald-500 pl-4 bg-emerald-50 py-2">
                Manual ringkas untuk pengunjung yang ingin membaca data, grafik, peta, dan rekomendasi Dasbor Analitik Pertanian Kabupaten Banjarnegara tanpa login.
              </p>
            </div>
            <button
              className="no-print inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-200 border-2 border-[#141414] font-mono font-black text-xs uppercase shadow-[3px_3px_0px_0px_#141414] hover:bg-emerald-300 transition-all"
              onClick={() => window.print()}
            >
              <Printer size={18} /> Cetak / Simpan PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="print-block bg-emerald-100 border-2 border-[#141414] p-5 shadow-[4px_4px_0px_0px_#141414]">
            <Globe2 className="w-8 h-8 text-emerald-700 mb-3" />
            <h4 className="font-mono font-black uppercase text-xs text-emerald-800">Alamat Aplikasi</h4>
            <p className="font-mono text-sm font-bold mt-2 break-all">https://pertanian.sistemdata.id</p>
          </div>
          <div className="print-block bg-yellow-100 border-2 border-[#141414] p-5 shadow-[4px_4px_0px_0px_#141414]">
            <ShieldCheck className="w-8 h-8 text-yellow-700 mb-3" />
            <h4 className="font-mono font-black uppercase text-xs text-yellow-800">Jenis Akses</h4>
            <p className="font-serif text-2xl font-black mt-2">Tanpa Login</p>
          </div>
          <div className="print-block bg-blue-100 border-2 border-[#141414] p-5 shadow-[4px_4px_0px_0px_#141414]">
            <Smartphone className="w-8 h-8 text-blue-700 mb-3" />
            <h4 className="font-mono font-black uppercase text-xs text-blue-800">Perangkat</h4>
            <p className="font-mono text-sm font-bold mt-2">Desktop, laptop, tablet, dan ponsel.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="print-block bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414]">
            <SectionTitle>Yang Dapat Dilakukan Guest</SectionTitle>
            <ul className="space-y-2">
              {canDo.map((item) => (
                <li key={item} className="flex gap-3 text-sm text-neutral-700">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="print-block bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414]">
            <SectionTitle>Batasan Akses Guest</SectionTitle>
            <ul className="space-y-2">
              {cannotDo.map((item) => (
                <li key={item} className="flex gap-3 text-sm text-neutral-700">
                  <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="print-block bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414]">
          <SectionTitle>Alur Cepat Penggunaan</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {["Buka aplikasi", "Pilih menu", "Lihat data", "Gunakan filter", "Cetak bila perlu"].map((step, index) => (
              <div key={step} className="bg-emerald-50 border-2 border-[#141414] p-4 text-center shadow-[2px_2px_0px_0px_#141414]">
                <div className="mx-auto w-8 h-8 rounded-full bg-yellow-300 border-2 border-[#141414] flex items-center justify-center font-mono font-black mb-3">
                  {index + 1}
                </div>
                <p className="font-mono font-black text-xs uppercase">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="print-block bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414]">
          <SectionTitle>Daftar Menu untuk Pengunjung</SectionTitle>
          <div className="overflow-x-auto border-2 border-[#141414]">
            <table className="w-full text-left text-sm">
              <thead className="bg-emerald-100 border-b-2 border-[#141414]">
                <tr>
                  <th className="p-3 font-mono font-black uppercase text-xs">Menu</th>
                  <th className="p-3 font-mono font-black uppercase text-xs">Fungsi</th>
                </tr>
              </thead>
              <tbody>
                {menuItems.map(([menu, desc], index) => (
                  <tr key={menu} className={index % 2 === 0 ? "bg-white" : "bg-neutral-50"}>
                    <td className="p-3 border-b border-neutral-200 font-mono font-black uppercase text-xs whitespace-nowrap">{menu}</td>
                    <td className="p-3 border-b border-neutral-200 text-neutral-700">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="print-block bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414]">
          <SectionTitle>Panduan Menggunakan Peta Interaktif</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-emerald-50 border-2 border-[#141414] p-5">
              <MapPinned className="w-7 h-7 text-emerald-700 mb-3" />
              <h4 className="font-mono font-black uppercase text-sm mb-2">Layer & Legenda</h4>
              <p className="text-sm text-neutral-700 leading-relaxed">
                Pilih metrik Lahan Sawah, Ladang, atau Total Keseluruhan. Klik kategori pada legenda untuk menyaring wilayah berdasarkan rentang luasan.
              </p>
            </div>
            <div className="bg-yellow-50 border-2 border-[#141414] p-5">
              <MousePointerClick className="w-7 h-7 text-yellow-700 mb-3" />
              <h4 className="font-mono font-black uppercase text-sm mb-2">Cari & Klik Desa</h4>
              <p className="text-sm text-neutral-700 leading-relaxed">
                Gunakan kotak pencarian untuk menemukan desa. Klik area desa untuk melihat popup berisi luas sawah, lahan bukan sawah, total luas, dan data kelembagaan tani bila tersedia.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {guideSections.map((section) => (
            <div key={section.title} className="print-block bg-white border-2 border-[#141414] p-5 shadow-[4px_4px_0px_0px_#141414]">
              <h4 className="font-mono font-black uppercase text-sm text-emerald-800 mb-2">{section.title}</h4>
              <p className="text-sm text-neutral-700 leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>

        <div className="print-block bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414]">
          <SectionTitle>Cara Membaca Warna</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {colorMeanings.map(([name, desc, bg]) => (
              <div key={name} className={`${bg} border-2 border-[#141414] p-4 shadow-[2px_2px_0px_0px_#141414]`}>
                <h4 className="font-mono font-black uppercase text-xs mb-2">{name}</h4>
                <p className="text-xs text-neutral-700 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="print-block bg-red-50 border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414]">
          <SectionTitle>Troubleshooting & Catatan</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-neutral-700 leading-relaxed">
            <div>
              <h4 className="font-mono font-black uppercase text-xs mb-2">Jika data tidak muncul</h4>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Refresh halaman browser.</li>
                <li>Gunakan hard refresh: Ctrl + Shift + R.</li>
                <li>Pastikan koneksi internet stabil.</li>
                <li>Coba buka dengan browser lain.</li>
              </ol>
            </div>
            <div>
              <h4 className="font-mono font-black uppercase text-xs mb-2">Batasan data</h4>
              <p>
                Data mengikuti ketersediaan sumber lokal dan Open Data. Wilayah abu-abu pada peta berarti data belum tersedia atau nama wilayah belum cocok. Hasil analisis adalah alat bantu dan tetap perlu validasi instansi/lapangan.
              </p>
            </div>
          </div>
        </div>
      </section>
    </DefaultLayout>
  );
}
