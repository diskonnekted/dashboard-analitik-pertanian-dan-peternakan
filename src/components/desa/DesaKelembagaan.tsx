import { Users2, Tractor, Fish, Trees } from "lucide-react";
import type { KelompokTaniRow } from "../../services/api";
import { EmptyBlock } from "./DesaLahan";

interface Props {
  data: KelompokTaniRow[];
}

/**
 * Kelembagaan Pertanian — agregasi per desa:
 *   - Kelompok tani (jumlah + total anggota)
 *   - Kelompok perikanan (jumlah + total anggota)
 *   - Gapoktan (jumlah + total anggota)
 *   - KTH (Kelompok Tani Hutan) bila ada field
 *
 * Field name mengikuti KelompokTaniRow di src/services/api.ts.
 * Ditampilkan sebagai stat cards atas dan tabel ringkas di bawah.
 */
export function DesaKelembagaan({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <EmptyBlock
        label="Kelembagaan Pertanian"
        message="Data kelompok tani/perikanan belum tersedia untuk desa ini."
      />
    );
  }

  // Field names (berdasarkan KelompokTaniRow di api.ts):
  //   kelompokTani, anggotaTani, kelompokPerikanan, anggotaPerikanan,
  //   gapoktan, anggotaGapoktan, namaKelompok, penyuluh
  const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const field = (row: Record<string, unknown>, k: string): number => num(row[k]);
  let sumKT = 0, sumAnggotaTani = 0;
  let sumKP = 0, sumAnggotaPerik = 0;
  let sumGap = 0, sumAnggotaGap = 0;
  let sumPenyuluh = 0;
  let sumKTH = 0;
  const rows: { nama: string; jenis: string; anggota: number }[] = [];

  // Field for nama kelompok mungkin berbeda tergantung dataset
  // Beberapa record punya 'namaKelompok', beberapa 'kelompok', dll.
  const fieldKelompokPerRow = (row: Record<string, unknown>) =>
    String(row.namaKelompok ?? row.kelompok ?? row.nama ?? "").trim();

  const fieldJenisPerRow = (row: Record<string, unknown>) => {
    if (num(row.kelompokTani) > 0 || num(row.anggotaTani) > 0) return "Kelompok Tani";
    if (num(row.kelompokPerikanan) > 0 || num(row.anggotaPerikanan) > 0) return "Kelompok Perikanan";
    if (num(row.gapoktan) > 0 || num(row.anggotaGapoktan) > 0) return "Gapoktan";
    return "Lainnya";
  };

  const sumAnggotaPerRow = (row: Record<string, unknown>) => {
    return (
      num(row.anggotaTani) ||
      num(row.anggotaGapoktan) ||
      num(row.anggotaPerikanan) ||
      0
    );
  };

  for (const r of data) {
    const row = r as unknown as Record<string, unknown>;
    sumKT += field(row, "kelompokTani");
    sumAnggotaTani += field(row, "anggotaTani");
    sumKP += field(row, "kelompokPerikanan");
    sumAnggotaPerik += field(row, "anggotaPerikanan");
    sumGap += field(row, "gapoktan");
    sumAnggotaGap += field(row, "anggotaGapoktan");
    sumPenyuluh += field(row, "penyuluh");
    sumKTH += field(row, "kth");

    const nama = fieldKelompokPerRow(row);
    if (nama) {
      rows.push({ nama, jenis: fieldJenisPerRow(row), anggota: sumAnggotaPerRow(row) });
    }
  }

  const tiles = [
    { icon: <Users2 className="w-4 h-4 text-emerald-600" />, label: "Kelompok Tani", value: sumKT, extra: `${sumAnggotaTani} anggota` },
    { icon: <Fish className="w-4 h-4 text-cyan-600" />, label: "Kelompok Perikanan", value: sumKP, extra: `${sumAnggotaPerik} anggota` },
    { icon: <Tractor className="w-4 h-4 text-amber-600" />, label: "Gapoktan", value: sumGap, extra: `${sumAnggotaGap} anggota` },
    { icon: <Trees className="w-4 h-4 text-green-700" />, label: "KTH (Hutan)", value: sumKTH, extra: sumPenyuluh ? `${sumPenyuluh} penyuluh` : undefined },
  ];

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5">
      <header className="mb-3">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Users2 className="w-4 h-4 text-emerald-700" />
          Kelembagaan Pertanian
        </h2>
        <p className="text-xs text-slate-500">Kelompok tani, perikanan, gapoktan, KTH.</p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase tracking-wide mb-0.5">
              {t.icon}
              {t.label}
            </div>
            <div className="text-base font-bold text-slate-800">
              {t.value.toLocaleString("id-ID")}
            </div>
            {t.extra && (
              <div className="text-[11px] text-slate-500 mt-0.5">{t.extra}</div>
            )}
          </div>
        ))}
      </div>

      {rows.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Daftar Nama Kelompok</h3>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Nama</th>
                  <th className="text-left px-3 py-2 font-semibold">Jenis</th>
                  <th className="text-right px-3 py-2 font-semibold">Anggota</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-700">{r.nama}</td>
                    <td className="px-3 py-2 text-slate-600">{r.jenis}</td>
                    <td className="px-3 py-2 text-right text-slate-700 tabular-nums">{r.anggota.toLocaleString("id-ID")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
