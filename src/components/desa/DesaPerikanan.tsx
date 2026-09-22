import { Fish, Waves, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { PerikananBudidaya, PerikananTangkap } from "../../services/api";
import { EmptyBlock } from "./EmptyBlock";

/**
 * DesaPerikanan (P1-5) — panel perikanan pada detail desa.
 *
 * Konteks data:
 * - ST2023 per desa hanya mencatat jumlah RT perikanan (total/budidaya/tangkap)
 *   — sudah ditampilkan di panel Demografi, tidak diduplikasi di sini.
 * - Produksi resmi BPS hanya tersedia per KECAMATAN (budidaya per tempat
 *   pemeliharaan + tangkap per alat) → panel ini menampilkan konteks kecamatan
 *   untuk desa yang sedang dilihat.
 * - Tabel `ikan_kolam` (BPS "Luas & Produksi Kolam") TIDAK ditampilkan:
 *   luas tercatat beku antar tahun (68,93 Ha di semua tahun) dan angka 2019
 *   korup (Σ 1,72 miliar kg) — menunggu verifikasi dinas.
 */

interface Props {
  kecamatan: string;
  budidaya: PerikananBudidaya[];
  tangkap: PerikananTangkap[];
  /** false selagi data masih dimuat — panel disembunyikan agar tidak kedip empty-state */
  ready?: boolean;
}

/** Samakan penulisan nama kecamatan ("Kec. Susukan" vs "Susukan"). */
const normKec = (s: string) =>
  s.toLowerCase().replace(/^kec\.?\s*/, "").trim();

const fmtKg = (kg: number): string => {
  const v = Math.round(kg).toLocaleString("id-ID");
  return kg >= 1000 ? `${v} kg (≈ ${Math.round(kg / 1000).toLocaleString("id-ID")} ton)` : `${v} kg`;
};

export function DesaPerikanan({ kecamatan, budidaya, tangkap, ready = true }: Props) {
  if (!ready) return null;

  const rowsB = budidaya.filter((r) => normKec(r.kecamatan) === normKec(kecamatan));
  const rowsT = tangkap.filter((r) => normKec(r.kecamatan) === normKec(kecamatan));

  if (rowsB.length === 0 && rowsT.length === 0) {
    return (
      <EmptyBlock
        label="Perikanan Kecamatan"
        message={`Data produksi perikanan belum tersedia untuk kecamatan ${kecamatan}.`}
      />
    );
  }

  // Tahun terbaru yang ada datanya per seri
  const thB = rowsB.map((r) => r.tahun).sort().at(-1);
  const thT = rowsT.map((r) => r.tahun).sort().at(-1);
  const latestB = rowsB.filter((r) => r.tahun === thB);
  const latestT = rowsT.filter((r) => r.tahun === thT);

  const sumB = (f: keyof PerikananBudidaya) =>
    latestB.reduce((a, r) => a + (Number(r[f]) || 0), 0);
  const sumT = (f: keyof PerikananTangkap) =>
    latestT.reduce((a, r) => a + (Number(r[f]) || 0), 0);

  const minaPadi = sumB("minaPenyelang") + sumB("minaTumpangsari");
  const budidayaRows = [
    { label: "Kolam Pembesaran", v: sumB("kolamPembesaran") },
    { label: "Karamba Apung", v: sumB("karambaApung") },
    { label: "Minapadi (penyelang + tumpangsari)", v: minaPadi },
  ].filter((x) => x.v > 0);
  const totalB = budidayaRows.reduce((a, x) => a + x.v, 0);

  const tangkapRows = [
    { label: "Jala Tebar", v: sumT("jalaTebar") },
    { label: "Pancing", v: sumT("pancing") },
    { label: "Jaring Insang", v: sumT("jaringIngsang") },
    { label: "Alat Lainnya", v: sumT("lainnya") },
  ].filter((x) => x.v > 0);
  const totalT = tangkapRows.reduce((a, x) => a + x.v, 0);

  const Bar = ({ label, v, max }: { label: string; v: number; max: number }) => (
    <div className="text-[11px]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-slate-600">{label}</span>
        <span className="font-mono font-bold text-slate-700 tabular-nums">
          {Math.round(v).toLocaleString("id-ID")} kg
        </span>
      </div>
      <div className="mt-0.5 h-1 w-full rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-cyan-500"
          style={{ width: `${max > 0 ? (v / max) * 100 : 0}%` }}
        />
      </div>
    </div>
  );

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-4">
      <header className="mb-2.5 flex items-start gap-2.5">
        <span
          aria-hidden
          className="
            mt-1 inline-block h-5 w-1 rounded-full
            bg-gradient-to-b from-cyan-500 to-blue-600
          "
        />
        <div className="flex-1">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-800 leading-tight">
            <Fish className="w-4 h-4 text-cyan-700" />
            Perikanan se-Kecamatan {kecamatan}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Konteks BPS tingkat kecamatan — budidaya &amp; tangkap (jumlah RT
            perikanan desa ini ada di panel Demografi).
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {totalB > 0 && (
          <div
            className="
              rounded-lg border border-slate-200 bg-white
              px-3 py-2 hover:border-slate-300 transition-colors
            "
          >
            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">
              <Fish className="w-3.5 h-3.5 text-cyan-700" />
              Budidaya {thB && `· ${thB}`}
            </div>
            <div className="text-base font-bold text-slate-800 tabular-nums">
              {fmtKg(totalB)}
            </div>
            <div className="mt-1.5 space-y-1.5">
              {budidayaRows.map((x) => (
                <Bar key={x.label} label={x.label} v={x.v} max={totalB} />
              ))}
            </div>
          </div>
        )}

        {totalT > 0 && (
          <div
            className="
              rounded-lg border border-slate-200 bg-white
              px-3 py-2 hover:border-slate-300 transition-colors
            "
          >
            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">
              <Waves className="w-3.5 h-3.5 text-blue-700" />
              Tangkap {thT && `· ${thT}`}
            </div>
            <div className="text-base font-bold text-slate-800 tabular-nums">
              {fmtKg(totalT)}
            </div>
            <div className="mt-1.5 space-y-1.5">
              {tangkapRows.map((x) => (
                <Bar key={x.label} label={x.label} v={x.v} max={totalT} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        className="
          mt-3 rounded-md
          bg-slate-50 ring-1 ring-slate-200
          px-3 py-2
          flex items-start gap-2
          text-[11px] text-slate-500
        "
      >
        <ArrowUpRight className="w-3.5 h-3.5 text-cyan-700 flex-shrink-0 mt-0.5" />
        <p className="leading-snug">
          Rincian jenis ikan, harga referensi &amp; estimasi nilai lihat di{" "}
          <Link
            to="/fisheries"
            className="font-semibold text-cyan-700 hover:text-cyan-800 underline decoration-cyan-300 underline-offset-2"
          >
            halaman Perikanan
          </Link>
          . Jumlah/luas kolam per desa menyusul pendataan dinas.
        </p>
      </div>
    </section>
  );
}

export default DesaPerikanan;
