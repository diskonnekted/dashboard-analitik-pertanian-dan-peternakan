import DefaultLayout from "@/layouts/default";
import { PageHeader, SectionCard, Badge } from "@/components/ui";
import {
  Handshake,
  Database,
  MapPin,
  Network,
  Sprout,
  MessageSquare,
  Scale,
  GitBranch,
  Brain,
  GitMerge,
  Info,
  ExternalLink,
} from "lucide-react";

export default function InfoPage() {
  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8 py-2">
        {/* Hero / intro */}
        <PageHeader
          icon={<Info className="h-6 w-6" />}
          title="Sistem Informasi Pertanian (SISPERTANI)"
          subtitle="Sistem informasi terpadu Dinas Pertanian, Perikanan dan Ketahanan Pangan Kabupaten Banjarnegara. Berdedikasi untuk mewujudkan tata kelola data sektor agrikultur yang transparan, akurat, dan berdampak."
          actions={
            <a
              href="https://distankan.banjarnegarakab.go.id/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-800 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-900"
            >
              Situs Resmi Distankan
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          }
        />

        {/* Content Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <SectionCard
              title="Analitik Agrikultur Terpadu"
              icon={<Handshake size={16} className="text-green-600" />}
            >
              <p className="text-sm text-slate-600 leading-relaxed">
                SISPERTANI adalah sistem informasi terpadu yang dikembangkan oleh Dinas Pertanian,
                Perikanan dan Ketahanan Pangan Kabupaten Banjarnegara. Platform ini mengintegrasikan
                data pertanian, perikanan, peternakan, dan ketahanan pangan ke dalam satu dasbor
                analitik yang komprehensif untuk mendukung pengambilan kebijakan berbasis data.
              </p>
            </SectionCard>

            <SectionCard
              title="Integrasi Open Data"
              icon={<Database size={16} className="text-blue-600" />}
            >
              <p className="text-sm text-slate-600 leading-relaxed">
                Data yang ditampilkan bersumber dari Portal Open Data Kabupaten Banjarnegara
                (data.banjarnegarakab.go.id) yang dikelola oleh Dinas Komunikasi dan Informatika.
                Melalui integrasi API CKAN, sistem ini memastikan data yang disajikan selalu
                up-to-date dan konsisten dengan sumber resmi.
              </p>
            </SectionCard>

            <SectionCard
              title="Kontak & Alamat Resmi"
              icon={<MapPin size={16} className="text-amber-600" />}
            >
              <dl className="divide-y divide-slate-100">
                <div className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:gap-4">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:w-24 shrink-0 sm:pt-0.5">
                    Alamat
                  </dt>
                  <dd className="text-sm text-slate-700">
                    Jl. Raya Semampir, KM 3, Banjarnegara, Jawa Tengah 53418
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:gap-4">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:w-24 shrink-0 sm:pt-0.5">
                    Telepon
                  </dt>
                  <dd className="text-sm text-slate-700">(0286) 123456</dd>
                </div>
                <div className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:gap-4">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:w-24 shrink-0 sm:pt-0.5">
                    Email
                  </dt>
                  <dd className="text-sm text-slate-700">distankan@banjarnegarakab.go.id</dd>
                </div>
              </dl>
            </SectionCard>
          </div>

          {/* Right Column */}
          <SectionCard
            title="Metodologi Distankan"
            icon={<Network size={16} className="text-purple-600" />}
          >
            <ul className="space-y-5">
              <li className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-green-100 text-green-700">
                  <Sprout className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold tracking-wide text-slate-800">
                    Kesesuaian Lahan & Komoditas
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Analisis kesesuaian lahan untuk komoditas unggulan Banjarnegara.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-700">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold tracking-wide text-slate-800">
                    Analisis Sosial Ekonomi
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Survei lapangan mendalam terhadap petani.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700">
                  <Scale className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold tracking-wide text-slate-800">
                    Estimasi Produksi
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Estimasi produksi berbasis luas panen.
                  </p>
                </div>
              </li>
            </ul>
          </SectionCard>
        </div>

        {/* Roadmap */}
        <SectionCard
          title="Peta Jalan SISPERTANI"
          icon={<GitBranch size={16} className="text-indigo-600" />}
          actions={<Badge tone="amber">Rencana Rilis Berikutnya</Badge>}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Featured roadmap items */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-indigo-100 text-indigo-700 mb-3">
                <Brain className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-semibold text-slate-800 mb-1.5 leading-tight">
                Predictive AI
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Integrasi model AI untuk prediksi dan forecasting hasil panen.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-purple-100 text-purple-700 mb-3">
                <GitMerge className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-semibold text-slate-800 mb-1.5 leading-tight">
                Adaptasi & Prototyping
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Pengembangan fitur adaptif sesuai kebutuhan pengguna.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-100 text-teal-700 mb-3">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-semibold text-slate-800 mb-1.5 leading-tight">
                Natural Language
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Interaksi bahasa alami untuk pencarian data.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-green-100 text-green-700 mb-3">
                <MapPin className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-semibold text-slate-800 mb-1.5 leading-tight">
                Live GIS Geospasial
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Pemetaan interaktif dan analisis geospasial real-time.
              </p>
            </div>

            {/* Numbered roadmap items */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-slate-800 mb-1.5 leading-tight">
                1. Analisis Tren (Temporal)
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Visualisasi tren multi-tahun produksi pangan.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-slate-800 mb-1.5 leading-tight">
                2. Laporan PDF
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Ekspor laporan satu klik (ringkas & lengkap).
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-slate-800 mb-1.5 leading-tight">
                3. Statistik Deskriptif
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Rata-rata, median, dan dispersi per kecamatan.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-slate-800 mb-1.5 leading-tight">
                4. Papan Pemantauan Gizi
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Analisis status gizi balita & puskesmas.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-slate-800 mb-1.5 leading-tight">
                5. Prediksi Harga Komoditas
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Estimasi harga jual komoditas utama.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-slate-800 mb-1.5 leading-tight">
                6. Data Baspil
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Integrasi Basis Data Pangan Lokal.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-slate-800 mb-1.5 leading-tight">
                7. Analisis Keuangan
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Rasio profitabilitas & margin pendapatan.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-slate-800 mb-1.5 leading-tight">
                8. Live Chat (Gemini)
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Asisten AI percakapan waktu nyata.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-slate-800 mb-1.5 leading-tight">
                9. Implementasi ARDA
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Alat Rekomendasi Digital Pertanian.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-slate-800 mb-1.5 leading-tight">
                10. Ketersediaan Pangan
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Pemantauan ketersediaan & keterjangkauan pangan.
              </p>
            </div>
          </div>
        </SectionCard>
      </section>
    </DefaultLayout>
  );
}
