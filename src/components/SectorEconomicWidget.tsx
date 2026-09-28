import { useEffect, useState } from "react";
import { API_BASE } from "@/services/api";

export interface SektorRingkasanItem {
  komoditas: string;
  kecamatanSentra: string | null;
  volumeProduksi: string | number;
  satuan: string;
  nilaiEkonomiRp?: number;
}

export interface SektorRingkasanResponse {
  status?: string;
  sektor?: string;
  tahun?: string;
  items?: SektorRingkasanItem[];
  top1?: SektorRingkasanItem | null;
  totalNilaiEkonomiRp?: number;
  jumlahKomoditas?: number;
  message?: string;
}

function formatRp(val: number): string {
  if (!val || val <= 0) return "Rp 0";
  if (val >= 1e12) return `Rp ${(val / 1e12).toFixed(2).replace(".", ",")} Triliun`;
  if (val >= 1e9) return `Rp ${(val / 1e9).toFixed(2).replace(".", ",")} Miliar`;
  if (val >= 1e6) return `Rp ${(val / 1e6).toFixed(2).replace(".", ",")} Juta`;
  return `Rp ${val.toLocaleString("id-ID")}`;
}

/**
 * Ringkasan eksekutif per sektor: menampilkan komoditas utama (peringkat 1),
 * volume produksi, dan nilai ekonomi sektor — diambil dari endpoint
 * `/v1/ekonomi/sektor-ringkasan`. Menganut prinsip Zero Dummy Data: ketika
 * data belum tersedia, menampilkan empty-state, bukan angka rekaan.
 */
export function SectorEconomicWidget({
  sektor,
  tahun,
}: {
  sektor: string;
  tahun: string;
}) {
  const [data, setData] = useState<SektorRingkasanResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sektor || !tahun) return;
    setLoading(true);
    fetch(
      `${API_BASE}/v1/ekonomi/sektor-ringkasan?sektor=${encodeURIComponent(
        sektor,
      )}&tahun=${encodeURIComponent(tahun)}`,
    )
      .then((res) => res.json())
      .then((json: SektorRingkasanResponse) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => {
        setData(null);
        setLoading(false);
      });
  }, [sektor, tahun]);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-500 animate-pulse mb-4">
        Memuat komoditas utama dan nilai ekonomi...
      </div>
    );
  }

  // Zero Dummy Data: status "empty" atau tanpa komoditas sama sekali.
  if (
    !data ||
    data.status === "empty" ||
    !data.items ||
    data.items.length === 0
  ) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-300 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
          <span>
            Data komoditas utama dan nilai ekonomi sektor untuk tahun{" "}
            <strong className="text-slate-800">{tahun}</strong> belum tercatat
            / belum diunggah oleh bidang terkait.
          </span>
        </div>
        <span className="font-semibold text-slate-500 bg-white px-3 py-1 rounded border border-slate-200 tabular-nums shrink-0">
          Rp 0 (Belum Ada Data)
        </span>
      </div>
    );
  }

  const top1 = data.top1 || data.items[0];
  const totalNilai = data.totalNilaiEkonomiRp || 0;
  const jumlahKomoditas = data.jumlahKomoditas || data.items.length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      {/* Card 1: Komoditas Utama (Ranking #1) */}
      <div className="bg-white border border-slate-200 border-l-4 border-l-blue-800 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">
          <span>Komoditas Utama ({tahun})</span>
          <span className="text-[10px] bg-blue-50 text-blue-800 px-2 py-0.5 rounded-full font-medium">
            Ranking #1
          </span>
        </div>
        <h3
          className="text-lg font-bold text-slate-900 truncate mt-1"
          title={top1.komoditas}
        >
          {top1.komoditas}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Sentra Utama:{" "}
          <strong className="text-slate-800 font-medium">
            {top1.kecamatanSentra || "-"}
          </strong>
        </p>
      </div>

      {/* Card 2: Volume Produksi */}
      <div className="bg-white border border-slate-200 border-l-4 border-l-emerald-600 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">
          <span>Volume Produksi Utama</span>
          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
            BPS / Dinas
          </span>
        </div>
        <h3 className="text-lg font-bold text-emerald-700 tabular-nums mt-1">
          {Number(top1.volumeProduksi).toLocaleString("id-ID")} {top1.satuan}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Volume produksi tertinggi di sektor ini
        </p>
      </div>

      {/* Card 3: Nilai Ekonomi Sektor */}
      <div className="bg-white border border-slate-200 border-l-4 border-l-amber-600 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">
          <span>Nilai Ekonomi Sektor ({tahun})</span>
          <span className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full font-medium">
            {jumlahKomoditas} Komoditas
          </span>
        </div>
        <h3 className="text-lg font-bold text-slate-900 tabular-nums mt-1">
          {formatRp(totalNilai)}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Volume riil × harga acuan produsen
        </p>
      </div>
    </div>
  );
}