import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Cpu, Database, Map, Radar, Zap } from "lucide-react";

const loadingModules = [
  {
    label: "Open Data CKAN Gateway",
    detail: "Handshake API, validasi skema JSON, dan sinkronisasi indeks dataset pertanian",
    target: 98,
    icon: Database,
    color: "from-blue-600 to-blue-400",
  },
  {
    label: "Geospasial Lahan Desa",
    detail: "Parsing koordinat wilayah, normalisasi hektare, dan penyusunan tile layer peta",
    target: 94,
    icon: Map,
    color: "from-emerald-500 to-emerald-350",
  },
  {
    label: "Analitik Produksi & Komoditas",
    detail: "Agregasi time-series, komputasi indikator panen, serta kalibrasi model tren",
    target: 91,
    icon: Activity,
    color: "from-amber-500 to-amber-350",
  },
  {
    label: "Risk Engine Ketahanan Pangan",
    detail: "Matriks anomali, deteksi volatilitas harga, dan penandaan wilayah prioritas",
    target: 88,
    icon: Radar,
    color: "from-rose-500 to-rose-350",
  },
  {
    label: "UI Runtime & Cache Layer",
    detail: "Preload komponen chart, optimasi render React, dan aktivasi cache lokal browser",
    target: 100,
    icon: Cpu,
    color: "from-violet-500 to-violet-355",
  },
];

export function AppLoader({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(() => loadingModules.map(() => 0));
  const [systemProgress, setSystemProgress] = useState(0);
  const [bootLogIndex, setBootLogIndex] = useState(0);
  const hasCompletedRef = useRef(false);

  const bootLogs = useMemo(
    () => [
      "Membuka secure data channel ke opendata.banjarnegarakab.go.id",
      "Menginisialisasi parser CSV/JSON untuk dataset lintas sektor",
      "Menyiapkan worker visualisasi untuk chart, tabel, dan peta Leaflet",
      "Mengkalkulasi indikator sawah, bukan sawah, produksi, dan risiko pangan",
      "Mengaktifkan dashboard interaktif SISPERTANI",
    ],
    [],
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setProgress((current) => {
        let changed = false;
        const next = current.map((value, index) => {
          const target = loadingModules[index].target;

          if (value >= target) return target;

          changed = true;
          const velocity = 2 + index + Math.random() * 7;

          return Math.min(target, value + velocity);
        });

        return changed ? next : current;
      });
    }, 170);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const average = progress.reduce((sum, item) => sum + item, 0) / progress.length;

    setSystemProgress(Math.round(average));

    const allModulesComplete = progress.every((value, index) => value >= loadingModules[index].target);

    if (allModulesComplete && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onComplete();
    }
  }, [onComplete, progress]);

  useEffect(() => {
    const logInterval = window.setInterval(() => {
      setBootLogIndex((index) => Math.min(index + 1, bootLogs.length - 1));
    }, 720);

    return () => window.clearInterval(logInterval);
  }, [bootLogs.length]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-slate-50 px-4">
      {/* Background radial gradient to give modern feel */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.06),transparent_70%)]" />

      <section className="relative w-full max-w-5xl border border-slate-200 bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex flex-col gap-6 border-b border-slate-100 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div>
            <div className="mb-3 inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider">
              <Zap size={13} className="animate-pulse" /> System Boot Sequence
            </div>
            <h1 className="font-sans text-3xl font-bold tracking-tight text-slate-800 md:text-4xl">
              Memuat Dashboard Analitik
            </h1>
            <p className="mt-2.5 max-w-2xl text-xs text-slate-500 leading-relaxed md:text-sm">
              Orkestrasi data pertanian, peternakan, geospasial, dan indikator risiko sedang disiapkan ke runtime aplikasi.
            </p>
          </div>

          <div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-slate-50 font-mono shadow-sm">
            <div className="absolute inset-2 border border-dashed border-slate-300 rounded-xl animate-spin-slow" />
            <strong className="mt-1 text-3xl text-slate-800">{systemProgress}%</strong>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">percent</span>
          </div>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-[1.4fr_0.6fr] md:p-8">
          <div className="space-y-4">
            {loadingModules.map((module, index) => {
              const Icon = module.icon;
              const value = Math.round(progress[index]);

              return (
                <div key={module.label} className="border border-slate-200 bg-slate-50/50 p-4 rounded-xl">
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600">
                        <Icon size={16} />
                      </div>
                      <div>
                        <h2 className="font-sans text-xs font-bold text-slate-700">{module.label}</h2>
                        <p className="mt-0.5 text-[11px] text-slate-400 leading-normal">{module.detail}</p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-700">{value}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${module.color} transition-all duration-300 ease-out`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <aside className="flex flex-col justify-between border border-slate-200 bg-slate-50/50 p-5 rounded-xl font-mono">
            <div>
              <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> Telemetry Log
              </div>
              <div className="space-y-3 text-[11px] leading-relaxed text-slate-500">
                {bootLogs.slice(0, bootLogIndex + 1).map((log, index) => (
                  <p key={log} className="animate-fade-in">
                    <span className="font-semibold text-blue-600">[{String(index + 1).padStart(2, "0")}]</span> {log}
                  </p>
                ))}
              </div>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-4 text-[10px] leading-relaxed text-slate-450">
              <p>Mode: client-side analytics runtime</p>
              <p>Render pipeline: React + Vite + Leaflet + Recharts</p>
              <p>Status: preparing dashboard</p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
