import DefaultLayout from "@/layouts/default";
import { Handshake, Database, Network, Brain, GitMerge, MessageSquare, Scale, Info, Sprout } from "lucide-react";

export default function InfoPage() {
  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8 py-2">
        {/* Header Section (Neo-Brutalist) */}
        <div className="bg-emerald-100 border-2 border-[#141414] p-8 rounded-none shadow-[4px_4px_0px_0px_#141414] flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6 flex-wrap md:flex-nowrap">
            <div className="h-20 w-20 bg-white border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414] flex items-center justify-center font-serif font-black text-2xl rotate-[-2deg] text-emerald-600 shrink-0">
              JDN
            </div>
            <div>
              <h2 className="text-3xl font-serif font-black text-[#141414] uppercase tracking-tight">Jaga Data Nusantara (JDN)</h2>
              <p className="text-xs font-mono font-bold text-neutral-600 mt-2 max-w-2xl uppercase tracking-wide">
                Organisasi nirlaba yang berdedikasi untuk mewujudkan tata kelola data publik yang transparan, akurat, dan berdampak bagi kemajuan daerah di Indonesia.
              </p>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            <div className="bg-white border-2 border-[#141414] p-6 rounded-none shadow-[4px_4px_0px_0px_#141414]">
              <h3 className="text-sm font-serif font-black uppercase tracking-widest text-[#141414] mb-4 flex items-center gap-2 border-b-2 border-[#141414] pb-2">
                <Handshake className="w-4 h-4 text-emerald-600" /> Dukungan untuk Banjarnegara
              </h3>
              <p className="text-xs font-mono font-bold text-neutral-600 leading-relaxed text-justify uppercase">
                Sistem Informasi Manajemen Pertanian ini dikembangkan secara sukarela oleh Jaga Data Nusantara (JDN) sebagai wujud dukungan teknologi kepada Pemerintah Kabupaten Banjarnegara. 
                Aplikasi ini merupakan modul strategis dari purwarupa Dasbor Super Analitik skala penuh yang sedang kami kembangkan untuk kemajuan daerah.
              </p>
            </div>

            <div className="bg-emerald-50 border-2 border-[#141414] p-6 rounded-none shadow-[4px_4px_0px_0px_#141414]">
              <h3 className="text-sm font-serif font-black uppercase tracking-widest text-emerald-950 mb-4 flex items-center gap-2 border-b-2 border-[#141414] pb-2">
                <Database className="w-4 h-4 text-emerald-700" /> Sumber Data Terbuka
              </h3>
              <p className="text-xs font-mono font-bold text-emerald-900 leading-relaxed uppercase">
                Seluruh data primer yang ditampilkan pada modul ini ditarik, disinkronisasi, dan diverifikasi secara langsung dari ekosistem API OpenData Banjarnegara. Integrasi dua arah ini memastikan data yang tersaji selalu mutakhir dan sejalan dengan rilis resmi pemerintah.
              </p>
            </div>
          </div>

          {/* Right Column */}
          <div className="bg-white border-2 border-[#141414] p-6 rounded-none shadow-[4px_4px_0px_0px_#141414]">
            <h3 className="text-sm font-serif font-black uppercase tracking-widest text-[#141414] mb-6 flex items-center gap-2 border-b-2 border-[#141414] pb-2">
              <Network className="w-4.5 h-4.5 text-purple-600" /> Metodologi Analisis
            </h3>
            
            <ul className="space-y-5 font-mono font-bold text-xs">
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 border-2 border-[#141414] bg-green-100 flex items-center justify-center flex-shrink-0 shadow-[1px_1px_0px_0px_#141414]">
                  <Sprout className="w-4 h-4 text-green-700" />
                </div>
                <div>
                  <h4 className="font-serif font-black uppercase text-[11px] text-[#141414]">Korelasi Lahan & Komoditas</h4>
                  <p className="text-[10px] text-neutral-500 mt-1 uppercase">Analisis radar karakteristik untuk mendeteksi kesesuaian lahan terhadap jenis komoditas sayuran aktual.</p>
                </div>
              </li>
              
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 border-2 border-[#141414] bg-blue-100 flex items-center justify-center flex-shrink-0 shadow-[1px_1px_0px_0px_#141414]">
                  <Network className="w-4 h-4 text-blue-700" />
                </div>
                <div>
                  <h4 className="font-serif font-black uppercase text-[11px] text-[#141414]">Time-Series Laju Produksi</h4>
                  <p className="text-[10px] text-neutral-500 mt-1 uppercase">Komparasi data historis antar tahun untuk menghasilkan persentase proyeksi dan tren hasil panen secara presisi.</p>
                </div>
              </li>
              
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 border-2 border-[#141414] bg-yellow-100 flex items-center justify-center flex-shrink-0 shadow-[1px_1px_0px_0px_#141414]">
                  <Info className="w-4 h-4 text-yellow-700" />
                </div>
                <div>
                  <h4 className="font-serif font-black uppercase text-[11px] text-[#141414]">Indeks Volatilitas Harga</h4>
                  <p className="text-[10px] text-neutral-500 mt-1 uppercase">Kalkulasi deviasi standar dari perbandingan tren inflasi lokal dan nasional untuk memantau gejolak harga pangan.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Future Roadmap Section */}
        <div className="bg-white border-2 border-[#141414] p-8 rounded-none shadow-[4px_4px_0px_0px_#141414]">
          <div className="text-center mb-8 border-b-2 border-dashed border-[#141414] pb-6">
            <span className="inline-block px-3 py-1 bg-purple-200 border-2 border-[#141414] font-mono font-black text-xs uppercase shadow-[2px_2px_0px_0px_#141414]">
              Peta Jalan JDN
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
                <h4 className="font-serif font-black uppercase text-[#141414] mb-2 leading-tight">Predictive AI</h4>
                <p className="text-[10px] text-neutral-500 leading-relaxed uppercase">Peramalan volume panen bulanan di musim pancaroba menggunakan pemodelan cuaca real-time.</p>
              </div>
            </div>

            {/* Correlation */}
            <div className="bg-neutral-50 border-2 border-[#141414] p-5 shadow-[3px_3px_0px_0px_#141414] flex flex-col justify-between hover:shadow-[4px_4px_0px_0px_#141414] transition-all">
              <div>
                <div className="w-9 h-9 border-2 border-[#141414] bg-purple-100 flex items-center justify-center mb-4 shadow-[1.5px_1.5px_0px_0px_#141414]">
                  <GitMerge className="w-5 h-5 text-purple-700" />
                </div>
                <h4 className="font-serif font-black uppercase text-[#141414] mb-2 leading-tight">Korelasi Lahan</h4>
                <p className="text-[10px] text-neutral-500 leading-relaxed uppercase">Menghubungkan data degradasi lahan terhadap indeks kerentanan pangan pedesaan secara spasial.</p>
              </div>
            </div>

            {/* NLP */}
            <div className="bg-neutral-50 border-2 border-[#141414] p-5 shadow-[3px_3px_0px_0px_#141414] flex flex-col justify-between hover:shadow-[4px_4px_0px_0px_#141414] transition-all">
              <div>
                <div className="w-9 h-9 border-2 border-[#141414] bg-rose-100 flex items-center justify-center mb-4 shadow-[1.5px_1.5px_0px_0px_#141414]">
                  <MessageSquare className="w-5 h-5 text-rose-700" />
                </div>
                <h4 className="font-serif font-black uppercase text-[#141414] mb-2 leading-tight">Sentimen Pasar</h4>
                <p className="text-[10px] text-neutral-500 leading-relaxed uppercase">Analisis pergerakan harga komoditas sayuran dari laporan harga harian dinas pasar Banjarnegara.</p>
              </div>
            </div>

            {/* Prescriptive */}
            <div className="bg-neutral-50 border-2 border-[#141414] p-5 shadow-[3px_3px_0px_0px_#141414] flex flex-col justify-between hover:shadow-[4px_4px_0px_0px_#141414] transition-all">
              <div>
                <div className="w-9 h-9 border-2 border-[#141414] bg-teal-100 flex items-center justify-center mb-4 shadow-[1.5px_1.5px_0px_0px_#141414]">
                  <Scale className="w-5 h-5 text-teal-700" />
                </div>
                <h4 className="font-serif font-black uppercase text-[#141414] mb-2 leading-tight">Logistik AI</h4>
                <p className="text-[10px] text-neutral-500 leading-relaxed uppercase">Rekomendasi optimasi alur logistik armada distribusi dari kecamatan surplus ke wilayah rentan pangan.</p>
              </div>
            </div>

            {/* --- NEW ANALYTICAL ROADMAP --- */}
            <div className="bg-neutral-50 border-2 border-[#141414] p-5 shadow-[3px_3px_0px_0px_#141414] transition-all">
              <h4 className="font-serif font-black uppercase text-[#141414] mb-2 leading-tight">1. Analisis Tren (Temporal)</h4>
              <p className="text-[10px] text-neutral-500 leading-relaxed uppercase">CAGR produksi, deteksi anomali tahunan, dan *forecasting* hasil panen 1-2 tahun ke depan.</p>
            </div>

            <div className="bg-neutral-50 border-2 border-[#141414] p-5 shadow-[3px_3px_0px_0px_#141414] transition-all">
              <h4 className="font-serif font-black uppercase text-[#141414] mb-2 leading-tight">2. Analisis Efisiensi</h4>
              <p className="text-[10px] text-neutral-500 leading-relaxed uppercase">Produktivitas per hektar (yield) dan pemetaan rasio kebutuhan vs produksi pangan (surplus/defisit).</p>
            </div>

            <div className="bg-neutral-50 border-2 border-[#141414] p-5 shadow-[3px_3px_0px_0px_#141414] transition-all">
              <h4 className="font-serif font-black uppercase text-[#141414] mb-2 leading-tight">3. Analisis Spasial</h4>
              <p className="text-[10px] text-neutral-500 leading-relaxed uppercase">Indeks spesialisasi komoditas unggulan kecamatan dan heatmap korelasi antar komoditas.</p>
            </div>

            <div className="bg-neutral-50 border-2 border-[#141414] p-5 shadow-[3px_3px_0px_0px_#141414] transition-all">
              <h4 className="font-serif font-black uppercase text-[#141414] mb-2 leading-tight">4. Indeks Diversifikasi</h4>
              <p className="text-[10px] text-neutral-500 leading-relaxed uppercase">Mengukur keberagaman komoditas untuk membangun ketahanan wilayah terhadap fluktuasi pasar.</p>
            </div>

            <div className="bg-neutral-50 border-2 border-[#141414] p-5 shadow-[3px_3px_0px_0px_#141414] transition-all">
              <h4 className="font-serif font-black uppercase text-[#141414] mb-2 leading-tight">5. Analisis Risiko</h4>
              <p className="text-[10px] text-neutral-500 leading-relaxed uppercase">Volatilitas produksi tahunan sebagai indikator dini kerentanan ketahanan pangan wilayah.</p>
            </div>
          </div>
        </div>
      </section>
    </DefaultLayout>
  );
}
