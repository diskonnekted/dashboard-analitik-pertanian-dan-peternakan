import DefaultLayout from "@/layouts/default";
import { useMemo, type ReactNode } from "react";
import {
  Printer,
  Sprout,
  Beef,
  Fish,
  Building2,
  Target,
  AlertCircle,
} from "lucide-react";

interface Rekomendasi {
  judul: string;
  masalah: string;
  aksi: string[];
  dampak: string;
  prioritas: "Tinggi" | "Sedang" | "Jangka Panjang";
}

interface Sektor {
  id: string;
  nama: string;
  icon: ReactNode;
  warna: string;
  ringkasan: string;
  items: Rekomendasi[];
}

const PRIORITY_STYLE: Record<string, string> = {
  Tinggi: "bg-red-100 text-red-700 border-red-700",
  Sedang: "bg-amber-100 text-amber-700 border-amber-700",
  "Jangka Panjang": "bg-sky-100 text-sky-700 border-sky-700",
};

export default function RecommendationsPage() {
  const tanggalCetak = useMemo(
    () =>
      new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [],
  );

  const sektor: Sektor[] = [
    {
      id: "pertanian",
      nama: "Pertanian",
      icon: <Sprout size={20} />,
      warna: "bg-emerald-100",
      ringkasan:
        "Produksi padi terkonsentrasi di beberapa kecamatan sentra, sementara alih fungsi lahan dan ketergantungan pada satu komoditas menjadi risiko utama ketahanan pangan.",
      items: [
        {
          judul: "Diversifikasi Tanaman Pangan Selain Padi",
          masalah:
            "Ketergantungan tinggi pada padi membuat daerah rentan terhadap gagal panen dan fluktuasi harga tunggal.",
          aksi: [
            "Dorong penanaman jagung, kedelai, dan ubi pada lahan marginal/tegalan melalui bantuan benih.",
            "Fasilitasi pasar dan offtaker untuk komoditas non-padi agar petani punya kepastian jual.",
            "Integrasikan data produksi palawija ke dalam sistem pemantauan seperti data padi.",
          ],
          dampak:
            "Menurunkan risiko krisis pangan dan menambah sumber pendapatan petani.",
          prioritas: "Tinggi",
        },
        {
          judul: "Pengendalian Alih Fungsi Lahan Sawah",
          masalah:
            "Tren penyusutan luas lahan sawah produktif akibat konversi ke non-pertanian.",
          aksi: [
            "Tetapkan dan tegakkan Lahan Pertanian Pangan Berkelanjutan (LP2B) di kecamatan sentra.",
            "Berikan insentif (keringanan pajak/bantuan input) bagi petani yang mempertahankan sawah.",
            "Pantau perubahan tutupan lahan tiap tahun menggunakan data spasial.",
          ],
          dampak: "Menjaga kapasitas produksi pangan jangka panjang.",
          prioritas: "Jangka Panjang",
        },
        {
          judul: "Peningkatan Produktivitas di Kecamatan Non-Sentra",
          masalah:
            "Kesenjangan produktivitas antara kecamatan sentra dan non-sentra masih lebar.",
          aksi: [
            "Prioritaskan penyuluhan dan mekanisasi di kecamatan berproduktivitas rendah.",
            "Perbaiki irigasi tersier pada wilayah dengan hasil per hektar di bawah rata-rata.",
          ],
          dampak: "Pemerataan hasil dan kenaikan total produksi kabupaten.",
          prioritas: "Sedang",
        },
      ],
    },
    {
      id: "peternakan",
      nama: "Peternakan",
      icon: <Beef size={20} />,
      warna: "bg-orange-100",
      ringkasan:
        "Populasi ternak tersebar tidak merata antar kecamatan. Penguatan rantai daging dan pencatatan neraca ternak diperlukan untuk mendukung swasembada protein.",
      items: [
        {
          judul: "Penguatan Sentra Ternak Berbasis Data Kepadatan",
          masalah:
            "Populasi ternak besar/kecil terkonsentrasi di sebagian kecamatan, rawan penularan penyakit.",
          aksi: [
            "Bangun pos kesehatan hewan di kecamatan dengan kepadatan ternak tertinggi.",
            "Jadwalkan vaksinasi rutin untuk mencegah penurunan populasi mendadak (deteksi anomali).",
            "Kembangkan sentra pembibitan di kecamatan berpotensi namun populasi rendah.",
          ],
          dampak: "Mengurangi risiko wabah dan menstabilkan populasi ternak.",
          prioritas: "Tinggi",
        },
        {
          judul: "Pencatatan Neraca & Pemotongan Ternak",
          masalah:
            "Data pemasukan-pengeluaran dan pemotongan ternak belum terpantau, menyulitkan perhitungan surplus/defisit daging.",
          aksi: [
            "Wajibkan pelaporan pemotongan melalui RPH resmi untuk pengawasan mutu.",
            "Susun neraca ternak tahunan untuk menentukan kebutuhan impor/ekspor antar daerah.",
          ],
          dampak:
            "Kepastian pasokan daging dan dasar kebijakan swasembada protein.",
          prioritas: "Sedang",
        },
        {
          judul: "Hilirisasi Produk Turunan (Susu & Kulit)",
          masalah:
            "Produk turunan peternakan belum dioptimalkan sebagai nilai tambah ekonomi.",
          aksi: [
            "Fasilitasi UMKM pengolahan susu dan kulit di sentra ternak.",
            "Hubungkan peternak dengan industri pengolahan melalui koperasi.",
          ],
          dampak: "Menaikkan pendapatan peternak melalui nilai tambah.",
          prioritas: "Jangka Panjang",
        },
      ],
    },
    {
      id: "perikanan",
      nama: "Perikanan",
      icon: <Fish size={20} />,
      warna: "bg-sky-100",
      ringkasan:
        "Perikanan budidaya (kolam pembesaran) mendominasi produksi, sementara mina padi dan karamba belum tergarap. Nilai ekonomi perikanan berpotensi ditingkatkan.",
      items: [
        {
          judul: "Optimalisasi Perikanan Budidaya Kolam",
          masalah:
            "Produksi terpusat pada kolam pembesaran di beberapa kecamatan; potensi wilayah lain belum tergarap.",
          aksi: [
            "Perluas bantuan bibit dan pakan ke kecamatan dengan sumber air memadai.",
            "Dampingi teknis budidaya intensif untuk menaikkan hasil per satuan luas.",
          ],
          dampak: "Kenaikan produksi ikan dan pemerataan antar kecamatan.",
          prioritas: "Tinggi",
        },
        {
          judul: "Revitalisasi Mina Padi & Karamba",
          masalah:
            "Produksi mina padi hampir nol sejak 2019 dan karamba jaring apung sangat terbatas.",
          aksi: [
            "Hidupkan kembali program mina padi (penyelang/tumpang sari) di sawah beririgasi.",
            "Manfaatkan waduk/perairan umum untuk karamba dengan kajian daya dukung lingkungan.",
          ],
          dampak: "Menambah sumber protein dan pendapatan sampingan petani.",
          prioritas: "Sedang",
        },
        {
          judul: "Peningkatan Nilai Ekonomi & Rantai Dingin",
          masalah:
            "Harga jual implisit rendah karena minim pengolahan dan penyimpanan pascapanen.",
          aksi: [
            "Bangun fasilitas cold storage di sentra produksi ikan.",
            "Dorong pengolahan (fillet, ikan asap) untuk menaikkan nilai jual per kg.",
          ],
          dampak: "Nilai ekonomi perikanan naik tanpa harus menaikkan volume.",
          prioritas: "Jangka Panjang",
        },
      ],
    },
  ];

  const strategisDinas = [
    "Integrasikan seluruh dataset (pertanian, peternakan, perikanan) ke dalam satu dashboard pemantauan berkala agar pengambilan keputusan berbasis data.",
    "Standarkan format pencatatan data antar UPT dan kecamatan (nama kecamatan, satuan, tahun) untuk mengurangi kesalahan analisis.",
    "Bentuk tim reaksi cepat berdasarkan sistem deteksi anomali untuk merespons penurunan produksi tajam.",
    "Alokasikan anggaran penyuluhan secara proporsional terhadap potensi dan kesenjangan produktivitas tiap kecamatan.",
  ];

  const strategisBupati = [
    "Jadikan ketahanan pangan sebagai prioritas RPJMD dengan target terukur untuk luas lahan lestari dan diversifikasi komoditas.",
    "Terbitkan regulasi perlindungan Lahan Pertanian Pangan Berkelanjutan (LP2B) untuk menahan laju alih fungsi lahan.",
    "Dorong hilirisasi hasil tani-ternak-ikan melalui insentif investasi pengolahan di tingkat kabupaten.",
    "Perkuat kolaborasi lintas dinas (Pertanian, PUPR untuk irigasi, Perdagangan untuk pasar) dalam satu peta jalan agribisnis.",
  ];

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8 py-2 max-w-5xl mx-auto">
        {/* Toolbar (tidak ikut tercetak) */}
        <div className="no-print flex items-center justify-between bg-white border-2 border-[#141414] p-4 shadow-[4px_4px_0px_0px_#141414]">
          <p className="text-xs font-mono font-bold uppercase text-neutral-600">
            Dokumen ini dapat dicetak atau disimpan sebagai PDF
          </p>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 py-2 px-4 border-2 border-[#141414] bg-emerald-200 font-mono font-bold text-xs uppercase shadow-[2px_2px_0px_0px_#141414] hover:bg-emerald-300 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            <Printer size={16} />
            Cetak / Simpan PDF
          </button>
        </div>

        {/* Kop Dokumen */}
        <div className="print-block bg-white border-2 border-[#141414] p-8 shadow-[4px_4px_0px_0px_#141414] text-center">
          <p className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-500">
            Pemerintah Kabupaten Banjarnegara
          </p>
          <h1 className="text-2xl md:text-3xl font-serif font-black uppercase tracking-tight text-[#141414] mt-3">
            Rekomendasi Strategis Pembangunan
          </h1>
          <h2 className="text-lg md:text-xl font-serif font-bold text-emerald-700 mt-1">
            Sektor Pertanian, Peternakan &amp; Perikanan
          </h2>
          <p className="text-xs font-mono font-bold text-neutral-600 mt-4 uppercase">
            Ditujukan kepada Dinas Terkait &amp; Bupati Banjarnegara
          </p>
          <p className="text-[10px] font-mono text-neutral-500 mt-1 uppercase">
            Berdasarkan Analisis Data Terbuka · Dicetak {tanggalCetak}
          </p>
        </div>

        {/* Ringkasan Eksekutif */}
        <div className="print-block bg-neutral-50 border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] text-left">
          <div className="flex items-center gap-2 mb-3 border-b border-neutral-300 pb-2">
            <Target size={18} className="text-emerald-700" />
            <h3 className="text-md font-serif font-black uppercase">
              Ringkasan Eksekutif
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-neutral-800">
            Berdasarkan analisis data produksi, tren deret waktu, deteksi
            anomali, dan nilai ekonomi, teridentifikasi tiga isu lintas sektor:
            (1) ketergantungan pada komoditas tunggal dan konsentrasi produksi
            di sedikit kecamatan, (2) minimnya hilirisasi yang menekan nilai
            tambah ekonomi, serta (3) kebutuhan penguatan pencatatan data untuk
            respons cepat. Dokumen ini merumuskan rekomendasi teknis per sektor
            dan langkah strategis bagi dinas serta pimpinan daerah.
          </p>
        </div>

        {/* Rekomendasi per Sektor */}
        {sektor.map((s) => (
          <div key={s.id} className="flex flex-col gap-4">
            <div
              className={`print-block ${s.warna} border-2 border-[#141414] p-5 shadow-[4px_4px_0px_0px_#141414] text-left`}
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 border-2 border-[#141414] bg-white flex items-center justify-center shadow-[2px_2px_0px_0px_#141414]">
                  {s.icon}
                </span>
                <h3 className="text-xl font-serif font-black uppercase text-[#141414]">
                  Rekomendasi Sektor {s.nama}
                </h3>
              </div>
              <p className="text-sm text-neutral-700 mt-3 leading-relaxed">
                {s.ringkasan}
              </p>
            </div>

            {s.items.map((item, idx) => (
              <div
                key={idx}
                className="print-block bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] text-left"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h4 className="text-md font-serif font-black uppercase text-[#141414]">
                    {idx + 1}. {item.judul}
                  </h4>
                  <span
                    className={`shrink-0 text-[10px] font-mono font-bold uppercase px-2 py-1 border-2 ${PRIORITY_STYLE[item.prioritas]}`}
                  >
                    {item.prioritas}
                  </span>
                </div>

                <div className="flex items-start gap-2 mb-3">
                  <AlertCircle
                    size={16}
                    className="text-red-600 mt-0.5 shrink-0"
                  />
                  <p className="text-sm text-neutral-700">
                    <span className="font-bold">Permasalahan: </span>
                    {item.masalah}
                  </p>
                </div>

                <div className="mb-3">
                  <p className="text-xs font-mono font-bold uppercase text-neutral-500 mb-2">
                    Langkah Rekomendasi
                  </p>
                  <ul className="space-y-1.5">
                    {item.aksi.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-emerald-700 font-black mt-0.5">
                          ▸
                        </span>
                        <span className="text-neutral-800">{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-emerald-50 border-l-4 border-emerald-600 px-3 py-2">
                  <p className="text-sm text-neutral-800">
                    <span className="font-bold">Dampak yang diharapkan: </span>
                    {item.dampak}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Rekomendasi Strategis untuk Dinas */}
        <div className="print-block bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] text-left">
          <div className="flex items-center gap-2 mb-4 border-b border-neutral-300 pb-2">
            <Building2 size={18} className="text-emerald-700" />
            <h3 className="text-md font-serif font-black uppercase">
              Rekomendasi Strategis untuk Dinas Terkait
            </h3>
          </div>
          <ol className="space-y-3">
            {strategisDinas.map((r, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="shrink-0 w-6 h-6 border-2 border-[#141414] bg-emerald-100 flex items-center justify-center font-mono font-black text-xs">
                  {i + 1}
                </span>
                <span className="text-neutral-800 leading-relaxed">{r}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Rekomendasi Strategis untuk Bupati */}
        <div className="print-block bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] text-left">
          <div className="flex items-center gap-2 mb-4 border-b border-neutral-300 pb-2">
            <Target size={18} className="text-emerald-700" />
            <h3 className="text-md font-serif font-black uppercase">
              Rekomendasi Strategis untuk Bupati
            </h3>
          </div>
          <ol className="space-y-3">
            {strategisBupati.map((r, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="shrink-0 w-6 h-6 border-2 border-[#141414] bg-yellow-200 flex items-center justify-center font-mono font-black text-xs">
                  {i + 1}
                </span>
                <span className="text-neutral-800 leading-relaxed">{r}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Blok Tanda Tangan */}
        <div className="print-block bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414]">
          <div className="text-center text-sm">
            <p className="text-neutral-600 mb-2">
              Disusun oleh,
            </p>
            <p className="font-serif font-black text-lg uppercase text-emerald-700">
              Jaga Data Nusantara (JDN)
            </p>
            <p className="text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest mt-1">
              Analitika Pertanian, Peternakan &amp; Perikanan
            </p>
            <p className="text-xs font-mono text-neutral-500 mt-3">
              Banjarnegara, {tanggalCetak}
            </p>
          </div>
        </div>

        <p className="text-[10px] font-mono text-neutral-500 uppercase text-center">
          Dokumen dihasilkan oleh Sistem Analitik Pertanian JDN Kab. Banjarnegara
        </p>
      </section>
    </DefaultLayout>
  );
}
