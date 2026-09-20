import { Database, ExternalLink } from "lucide-react";

export function DesaFooter() {
  return (
    <section className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600">
      <div className="flex items-start gap-2">
        <Database className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Sumber Data</h3>
          <ul className="space-y-1 list-disc list-inside marker:text-slate-400">
            <li>
              <strong>Polygon & luas:</strong>{" "}
              <code className="bg-white px-1 rounded">/peta_desa_v3.geojson</code>
            </li>
            <li>
              <strong>Penggunaan Lahan:</strong>{" "}
              <code className="bg-white px-1 rounded">/data/lahan-fallback.json</code>{" "}
              (sawah / bukan sawah per-desa)
            </li>
            <li>
              <strong>Demografi & Ternak:</strong>{" "}
              <code className="bg-white px-1 rounded">/data/st2023-desa-fallback.json</code>{" "}
              (BPS ST2023)
            </li>
            <li>
              <strong>Kelembagaan Pertanian:</strong>{" "}
              <code className="bg-white px-1 rounded">/data/kelompok-tani-fallback.json</code>{" "}
              (kelompok tani, perikanan, gapoktan)
            </li>
          </ul>
          <p className="mt-2 text-slate-500">
            Catatan: sesuai keputusan arsitektur, halaman ini hanya memuat data per-desa.
            Data tingkat kecamatan (padi, perkebunan, sayuran, buah) ditampilkan di
            dasbor utama pada bagian peta.{" "}
            <a href="/map" className="text-emerald-700 hover:underline inline-flex items-center gap-0.5">
              Buka peta <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
