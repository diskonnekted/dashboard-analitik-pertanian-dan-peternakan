import DefaultLayout from "@/layouts/default";
import { Handshake, Database, Network, Brain, GitMerge, MessageSquare, Scale, Info, Sprout, MapPin } from "lucide-react";

export default function InfoPage() {
  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8 py-2">
        {/* Hero / intro */}
        <section className="text-left animate-fade-in flex flex-col md:flex-row items-start md:items-center gap-6">
          <img src="/logo.png" alt="Logo Dinas" className="w-20 h-20 object-contain shrink-0" />
          <div>
            
            <h2 className="font-serif italic text-3xl sm:text-5xl mt-2 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-800 to-teal-500 font-black drop-shadow-sm">
              Sistem Informasi Pertanian (SIMPERTAN)
            </h2>
            <p className="font-mono text-sm md:text-base font-medium text-[#4a4a4a] mt-4 max-w-2xl border-l-4 border-emerald-500 pl-4 bg-white/80 py-1">
              Dinas Pertanian, Perikanan dan Ketahanan Pangan Kabupaten Banjarnegara. Berdedikasi untuk mewujudkan tata kelola data sektor agrikultur yang transparan, akurat, dan berdampak.
            </p>
            <a href="https://distankan.banjarnegarakab.go.id/" target="_blank" rel="noreferrer" className="inline-block mt-3 text-xs font-mono font-bold uppercase border-b-2 border-emerald-600 text-emerald-700 hover:text-emerald-500">
              Kunjungi Situs Resmi Distankan Banjarnegara &rarr;
            </a>
          </div>
        </section>

        {/* Content Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            <div className="bg-white border-2 border-[#141414] p-6 rounded-none shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
              <h3 className="text-sm font-mono font-bold uppercase tracking-wide tracking-widest text-[#141414] mb-4 flex items-center gap-2 border-b-2 border-[#141414] pb-2">
                <Handshake className="w-4 h-4 text-emerald-600" /> Analitik Agrikultur Terpadu
              </h3>
              <p className="text-xs font-mono font-bold text-neutral-600 leading-relaxed text-justify uppercase">
                Sistem Informasi Manajemen Pertanian (SIMPERTAN) dikembangkan secara eksklusif untuk Dinas Pertanian, Perikanan dan Ketahanan Pangan Kabupaten Banjarnegara. 
                Aplikasi ini merupakan alat strategis berbasis dasbor super analitik skala penuh untuk mendukung pengambilan keputusan pemerintah daerah.
              </p>
            </div>

            <div className="bg-emerald-50 border-2 border-[#141414] p-6 rounded-none shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
              <h3 className="text-sm font-mono font-bold uppercase tracking-wide tracking-widest text-emerald-950 mb-4 flex items-center gap-2 border-b-2 border-[#141414] pb-2">
                <Database className="w-4 h-4 text-emerald-700" /> Integrasi Open Data
              </h3>
              <p className="text-xs font-mono font-bold text-emerald-900 leading-relaxed uppercase">
                Seluruh data primer yang ditampilkan ditarik dan disinkronisasi secara langsung dari infrastruktur API OpenData Kabupaten Banjarnegara. 
                Integrasi dua arah ini menjamin bahwa seluruh data yang tersaji selalu valid, mutakhir, dan diakui secara resmi oleh pemerintah daerah.
              </p>
            </div>

            <div className="bg-amber-50 border-2 border-[#141414] p-6 rounded-none shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
              <h3 className="text-sm font-mono font-bold uppercase tracking-wide tracking-widest text-amber-950 mb-4 flex items-center gap-2 border-b-2 border-[#141414] pb-2">
                <MapPin className="w-4 h-4 text-amber-700" /> Kontak & Alamat Resmi
              </h3>
              <div className="text-xs font-mono font-bold text-amber-900 space-y-2 uppercase">
                <p><span className="text-amber-950 font-black">Alamat:</span> Jl. Raya Semampir, KM 3, Banjarnegara, Jawa Tengah 53418</p>
                <p><span className="text-amber-950 font-black">Telepon:</span> (0286) 542833</p>
                <p><span className="text-amber-950 font-black">Email:</span> distankankp@banjarnegarakab.go.id</p>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="bg-white border-2 border-[#141414] p-6 rounded-none shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
            <h3 className="text-sm font-mono font-bold uppercase tracking-wide tracking-widest text-[#141414] mb-6 flex items-center gap-2 border-b-2 border-[#141414] pb-2">
              <Network className="w-4.5 h-4.5 text-purple-600" /> Metodologi Distankan
            </h3>
            
            <ul className="space-y-5 font-mono font-bold text-xs">
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 border-2 border-[#141414] bg-green-100 flex items-center justify-center flex-shrink-0 shadow-[1px_1px_0px_0px_#141414]">
                  <Sprout className="w-4 h-4 text-green-700" />
                </div>
                <div>
                  <h4 className="font-mono font-bold uppercase text-[11px] tracking-wide text-[#141414]">Kesesuaian Lahan & Komoditas</h4>
                  <p className="text-[10px] text-neutral-500 mt-1 uppercase">Pemetaan kesesuaian lahan secara spasial terhadap komoditas unggulan Banjarnegara.</p>
                </div>
              </li>
              
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 border-2 border-[#141414] bg-blue-100 flex items-center justify-center flex-shrink-0 shadow-[1px_1px_0px_0px_#141414]">
                  <Network className="w-4 h-4 text-blue-700" />
                </div>
                <div>
                  <h4 className="font-mono font-bold uppercase text-[11px] tracking-wide text-[#141414]">Kajian Rantai Pasok Pangan</h4>
                  <p className="text-[10px] text-neutral-500 mt-1 uppercase">Pengawasan alur distribusi panen dari tingkat petani hingga konsumen untuk memastikan ketahanan pangan.</p>
                </div>
              </li>
              
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 border-2 border-[#141414] bg-yellow-100 flex items-center justify-center flex-shrink-0 shadow-[1px_1px_0px_0px_#141414]">
                  <Info className="w-4 h-4 text-yellow-700" />
                </div>
                <div>
                  <h4 className="font-mono font-bold uppercase text-[11px] tracking-wide text-[#141414]">Prediksi Produktivitas</h4>
                  <p className="text-[10px] text-neutral-500 mt-1 uppercase">Pemanfaatan data runtun waktu (time-series) untuk kalkulasi proyeksi hasil panen di masa mendatang.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Future Roadmap Section */}
        <div className="bg-white border-2 border-[#141414] p-8 rounded-none shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
          <div className="text-center mb-8 border-b-2 border-dashed border-[#141414] pb-6">
            <span className="inline-block px-3 py-1 bg-emerald-200 border-2 border-[#141414] font-mono font-black text-xs uppercase shadow-[2px_2px_0px_0px_#141414]">
              Peta Jalan SIMPERTAN

            </span>
            <h3 className="text-2xl font-serif font-black text-[#141414] uppercase mt-3">Pengembangan Analitik Pertanian</h3>
            <p className="text-neutral-500 font-mono font-bold text-xs mt-1 uppercase">Sistem pendukung keputusan rilis berikutnya:</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 font-mono font-bold text-xs">
            {/* --- EXISTING ROADMAP --- */}
            {/* ML */}
            <div className="bg-neutral-50 border-2 border-[#141414] p-5 shadow-[3px_3px_0px_0px_#141414] flex flex-col justify-between hover:shadow-[4px_4px_0px_0px_#141414] transition-all">
              <div>
                <div className="w-9 h-9 border-2 border-[#141414] bg-indigo-100 flex items-center justify-center mb-4 shadow-[1.5px_1.5px_0px_0px_#141414]">
                  <Brain className="w-5 h-5 text-indigo-700" />
                </div>
                <h4 className="font-mono font-bold uppercase tracking-wide text-[#141414] mb-2 leading-tight">Predictive AI</h4>
                <p className="text-[10px] text-neutral-500 leading-relaxed uppercase">Peramalan volume panen bulanan di musim pancaroba menggunakan pemodelan cuaca real-time.</p>
              </div>
            </div>

            {/* Correlation */}
            <div className="bg-neutral-50 border-2 border-[#141414] p-5 shadow-[3px_3px_0px_0px_#141414] flex flex-col justify-between hover:shadow-[4px_4px_0px_0px_#141414] transition-all">
              <div>
                <div className="w-9 h-9 border-2 border-[#141414] bg-purple-100 flex items-center justify-center mb-4 shadow-[1.5px_1.5px_0px_0px_#141414]">
                  <GitMerge className="w-5 h-5 text-purple-700" />
                </div>
                <h4 className="font-mono font-bold uppercase tracking-wide text-[#141414] mb-2 leading-tight">Korelasi Lahan</h4>
                <p className="text-[10px] text-neutral-500 leading-relaxed uppercase">Menghubungkan data degradasi lahan terhadap indeks kerentanan pangan pedesaan secara spasial.</p>
              </div>
            </div>

            {/* NLP */}
            <div className="bg-neutral-50 border-2 border-[#141414] p-5 shadow-[3px_3px_0px_0px_#141414] flex flex-col justify-between hover:shadow-[4px_4px_0px_0px_#141414] transition-all">
              <div>
                <div className="w-9 h-9 border-2 border-[#141414] bg-rose-100 flex items-center justify-center mb-4 shadow-[1.5px_1.5px_0px_0px_#141414]">
                  <MessageSquare className="w-5 h-5 text-rose-700" />
                </div>
                <h4 className="font-mono font-bold uppercase tracking-wide text-[#141414] mb-2 leading-tight">Sentimen Pasar</h4>
                <p className="text-[10px] text-neutral-500 leading-relaxed uppercase">Analisis pergerakan harga komoditas sayuran dari laporan harga harian dinas pasar Banjarnegara.</p>
              </div>
            </div>

            {/* Prescriptive */}
            <div className="bg-neutral-50 border-2 border-[#141414] p-5 shadow-[3px_3px_0px_0px_#141414] flex flex-col justify-between hover:shadow-[4px_4px_0px_0px_#141414] transition-all">
              <div>
                <div className="w-9 h-9 border-2 border-[#141414] bg-teal-100 flex items-center justify-center mb-4 shadow-[1.5px_1.5px_0px_0px_#141414]">
                  <Scale className="w-5 h-5 text-teal-700" />
                </div>
                <h4 className="font-mono font-bold uppercase tracking-wide text-[#141414] mb-2 leading-tight">Logistik AI</h4>
                <p className="text-[10px] text-neutral-500 leading-relaxed uppercase">Rekomendasi optimasi alur logistik armada distribusi dari kecamatan surplus ke wilayah rentan pangan.</p>
              </div>
            </div>

            {/* --- NEW ANALYTICAL ROADMAP --- */}
            <div className="bg-neutral-50 border-2 border-[#141414] p-5 shadow-[3px_3px_0px_0px_#141414] transition-all">
              <h4 className="font-mono font-bold uppercase tracking-wide text-[#141414] mb-2 leading-tight">1. Analisis Tren (Temporal)</h4>
              <p className="text-[10px] text-neutral-500 leading-relaxed uppercase">CAGR produksi, deteksi anomali tahunan, dan *forecasting* hasil panen 1-2 tahun ke depan.</p>
            </div>

            <div className="bg-neutral-50 border-2 border-[#141414] p-5 shadow-[3px_3px_0px_0px_#141414] transition-all">
              <h4 className="font-mono font-bold uppercase tracking-wide text-[#141414] mb-2 leading-tight">2. Analisis Efisiensi</h4>
              <p className="text-[10px] text-neutral-500 leading-relaxed uppercase">Produktivitas per hektar (yield) dan pemetaan rasio kebutuhan vs produksi pangan (surplus/defisit).</p>
            </div>

            <div className="bg-neutral-50 border-2 border-[#141414] p-5 shadow-[3px_3px_0px_0px_#141414] transition-all">
              <h4 className="font-mono font-bold uppercase tracking-wide text-[#141414] mb-2 leading-tight">3. Analisis Spasial</h4>
              <p className="text-[10px] text-neutral-500 leading-relaxed uppercase">Indeks spesialisasi komoditas unggulan kecamatan dan heatmap korelasi antar komoditas.</p>
            </div>

            <div className="bg-neutral-50 border-2 border-[#141414] p-5 shadow-[3px_3px_0px_0px_#141414] transition-all">
              <h4 className="font-mono font-bold uppercase tracking-wide text-[#141414] mb-2 leading-tight">4. Indeks Diversifikasi</h4>
              <p className="text-[10px] text-neutral-500 leading-relaxed uppercase">Mengukur keberagaman komoditas untuk membangun ketahanan wilayah terhadap fluktuasi pasar.</p>
            </div>

            <div className="bg-neutral-50 border-2 border-[#141414] p-5 shadow-[3px_3px_0px_0px_#141414] transition-all">
              <h4 className="font-mono font-bold uppercase tracking-wide text-[#141414] mb-2 leading-tight">5. Analisis Risiko</h4>
              <p className="text-[10px] text-neutral-500 leading-relaxed uppercase">Volatilitas produksi tahunan sebagai indikator dini kerentanan ketahanan pangan wilayah.</p>
            </div>

            <div className="bg-neutral-50 border-2 border-[#141414] p-5 shadow-[3px_3px_0px_0px_#141414] transition-all">
              <h4 className="font-mono font-bold uppercase tracking-wide text-[#141414] mb-2 leading-tight">6. Neraca Pangan Wilayah</h4>
              <p className="text-[10px] text-neutral-500 leading-relaxed uppercase">Simulasi ketersediaan vs kebutuhan pangan per kecamatan untuk menentukan prioritas distribusi dan cadangan.</p>
            </div>

            <div className="bg-neutral-50 border-2 border-[#141414] p-5 shadow-[3px_3px_0px_0px_#141414] transition-all">
              <h4 className="font-mono font-bold uppercase tracking-wide text-[#141414] mb-2 leading-tight">7. Integrasi Data Iklim</h4>
              <p className="text-[10px] text-neutral-500 leading-relaxed uppercase">Menghubungkan data curah hujan dan musim tanam terhadap fluktuasi hasil panen untuk peringatan dini gagal panen.</p>
            </div>

            <div className="bg-neutral-50 border-2 border-[#141414] p-5 shadow-[3px_3px_0px_0px_#141414] transition-all">
              <h4 className="font-mono font-bold uppercase tracking-wide text-[#141414] mb-2 leading-tight">8. Dasbor Nilai Ekonomi</h4>
              <p className="text-[10px] text-neutral-500 leading-relaxed uppercase">Estimasi kontribusi PDRB sektor pertanian, peternakan, dan perikanan beserta proyeksi nilai tambah hilirisasi.</p>
            </div>

            <div className="bg-neutral-50 border-2 border-[#141414] p-5 shadow-[3px_3px_0px_0px_#141414] transition-all">
              <h4 className="font-mono font-bold uppercase tracking-wide text-[#141414] mb-2 leading-tight">9. Rekomendasi Strategis</h4>
              <p className="text-[10px] text-neutral-500 leading-relaxed uppercase">Penyusunan rekomendasi kebijakan otomatis berbasis temuan data untuk dinas dan pimpinan daerah, siap cetak/PDF.</p>
            </div>

            <div className="bg-neutral-50 border-2 border-[#141414] p-5 shadow-[3px_3px_0px_0px_#141414] transition-all">
              <h4 className="font-mono font-bold uppercase tracking-wide text-[#141414] mb-2 leading-tight">10. Portal Data Terbuka</h4>
              <p className="text-[10px] text-neutral-500 leading-relaxed uppercase">Ekspor dataset lintas sektor dalam format standar (CSV/API) untuk mendukung transparansi dan riset publik.</p>
            </div>
          </div>
        </div>
      </section>
    </DefaultLayout>
  );
}
