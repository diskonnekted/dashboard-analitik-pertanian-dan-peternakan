import { Beef, Rabbit, Bird, Egg } from "lucide-react";
import { HARGA_TELUR } from "@/data/harga-referensi";
import { EmptyBlock } from "./EmptyBlock";

interface Props {
  /**
   * Peta `nama_jenis → jumlah_ekor`. Mis.
   `{"Sapi Potong": 24, "Kerbau": 5, "Ayam Kampung": 1230}`.
   * `undefined` atau object kosong = data belum tersedia.
   */
  data: Record<string, number> | null | undefined;
}

/** Kata kunci (lowercase) untuk mengelompokkan jenis ternak. */
const KATEGORI_KEYWORDS: Record<"BESAR" | "KECIL" | "UNGGAS", string[]> = {
  BESAR: ["sapi", "kerbau", "kuda", "kambing besar", "domba besar"],
  KECIL: ["kambing", "domba", "babi"],
  UNGGAS: ["ayam", "bebek", "itik", "angsa", "burung", "kalkun", "puyuh"],
};

function classify(jenis: string): "BESAR" | "KECIL" | "UNGGAS" | null {
  const lc = jenis.toLowerCase();
  for (const [k, list] of Object.entries(KATEGORI_KEYWORDS) as Array<
    ["BESAR" | "KECIL" | "UNGGAS", string[]]
  >) {
    if (list.some((kw) => lc.includes(kw))) return k;
  }
  return null;
}

/** Memformat label jenis agar lebih mudah dibaca. */
function prettify(jenis: string): string {
  return jenis
    .replace(/([a-z])([A-Z])/g, "$1 $2") // camelCase → spasi
    .replace(/\s+/g, " ")
    .trim();
}

const groupMeta = {
  BESAR: {
    Icon: Beef,
    label: "Ternak Besar",
    sub: "Sapi, kerbau, kuda",
    bar: "from-amber-500 to-orange-500",
    bg: "from-amber-50/60 to-white",
    ring: "ring-amber-100",
    chip: "bg-amber-100 text-amber-700",
  },
  KECIL: {
    Icon: Rabbit,
    label: "Ternak Kecil",
    sub: "Kambing, domba, babi",
    bar: "from-emerald-500 to-teal-500",
    bg: "from-emerald-50/60 to-white",
    ring: "ring-emerald-100",
    chip: "bg-emerald-100 text-emerald-700",
  },
  UNGGAS: {
    Icon: Bird,
    label: "Unggas",
    sub: "Ayam, bebek, burung",
    bar: "from-blue-500 to-indigo-500",
    bg: "from-blue-50/60 to-white",
    ring: "ring-blue-100",
    chip: "bg-blue-100 text-blue-700",
  },
};

export function DesaTernak({ data }: Props) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <EmptyBlock
        label="Populasi Ternak"
        message="Data ternak dari BPS ST2023 belum tersedia untuk desa ini."
      />
    );
  }

  // Kelompokkan per kategori
  const groups: Record<"BESAR" | "KECIL" | "UNGGAS", Array<{ jenis: string; jumlah: number }>> = {
    BESAR: [],
    KECIL: [],
    UNGGAS: [],
  };

  for (const [rawJenis, jml] of Object.entries(data)) {
    if (!jml) continue;
    const cat = classify(rawJenis);
    if (!cat) continue;
    groups[cat].push({ jenis: prettify(rawJenis), jumlah: jml });
  }

  const present = (["BESAR", "KECIL", "UNGGAS"] as const).filter(
    (k) => groups[k].length > 0
  );

  if (present.length === 0) {
    return (
      <EmptyBlock
        label="Populasi Ternak"
        message="Data ternak dari BPS ST2023 belum tersedia untuk desa ini."
      />
    );
  }

  const unit = (n: number) => n.toLocaleString("id-ID");

  // ===== P1-4: Estimasi telur per desa — populasi ST2023 × faktor konversi indikatif =====
  // Key ternak bisa camelCase mentah ("ayamRasPetelur") maupun label ("Ayam Ras Petelur")
  // — samakan via normalisasi. Faktor konversi indikatif (petelur 250 butir/ekor/thn,
  // kampung 60, puyuh 250; berat butir 60/45/12 g); harga telur ras & kampung dari
  // harga-referensi.ts (indikatif), puyuh indikatif lokal — bukan angka resmi BPS.
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  const pick = (target: string) =>
    Number(
      Object.entries(data).find(([k]) => norm(k) === norm(target))?.[1] ?? 0,
    ) || 0;
  const hargaTelurRas = HARGA_TELUR["Ayam Ras Layer"]?.hargaRp ?? 28_000;
  const hargaTelurKampung = HARGA_TELUR["Ayam Kampung"]?.hargaRp ?? 45_000;
  const FAKTOR_TELUR = [
    { key: "ayamRasPetelur", label: "Ayam Ras Petelur", butirPerEkor: 250, gramPerButir: 60, hargaPerKg: hargaTelurRas },
    { key: "ayamKampung", label: "Ayam Kampung", butirPerEkor: 60, gramPerButir: 45, hargaPerKg: hargaTelurKampung },
    { key: "puyuh", label: "Puyuh", butirPerEkor: 250, gramPerButir: 12, hargaPerKg: 30_000 },
  ];
  const telur = FAKTOR_TELUR.map((f) => {
    const populasi = pick(f.key);
    const butir = populasi * f.butirPerEkor;
    const kg = (butir * f.gramPerButir) / 1000;
    return { ...f, populasi, butir, kg, nilai: kg * f.hargaPerKg };
  }).filter((t) => t.populasi > 0);
  const telurTotal = telur.reduce(
    (a, t) => ({
      butir: a.butir + t.butir,
      kg: a.kg + t.kg,
      nilai: a.nilai + t.nilai,
    }),
    { butir: 0, kg: 0, nilai: 0 },
  );
  const fmtRp = (v: number) =>
    v >= 1e9
      ? `Rp ${(v / 1e9).toFixed(2)} M`
      : v >= 1e6
        ? `Rp ${(v / 1e6).toFixed(1)} jt`
        : `Rp ${Math.round(v).toLocaleString("id-ID")}`;

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-4">
      <header className="mb-2.5 flex items-start gap-2.5">
        <span
          aria-hidden
          className="
            mt-1 inline-block h-5 w-1 rounded-full
            bg-gradient-to-b from-amber-500 to-amber-700
          "
        />
        <div className="flex-1">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-800 leading-tight">
            <Beef className="w-4 h-4 text-amber-600" />
            Populasi Ternak
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Per kategori: ternak besar, kecil, dan unggas (BPS ST2023).
          </p>
        </div>
      </header>

      <div className="space-y-3">
        {present.map((cat) => {
          const rows = groups[cat];
          rows.sort((a, b) => b.jumlah - a.jumlah);
          const total = rows.reduce((a, r) => a + r.jumlah, 0);
          const max = rows[0]?.jumlah ?? 0;
          const meta = groupMeta[cat];
          return (
            <div
              key={cat}
              className={`rounded-lg bg-gradient-to-br ${meta.bg} ring-1 ${meta.ring} p-3`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="
                    flex h-6 w-6 items-center justify-center
                    rounded-md bg-white ring-1 ring-slate-200 shadow-sm
                  "
                >
                  <meta.Icon className="w-3.5 h-3.5 text-slate-700" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-slate-800 leading-tight">{meta.label}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-800 tabular-nums">{unit(total)}</div>
                </div>
              </div>

              <div className="space-y-1">
                {rows.map((r) => {
                  const pct = max > 0 ? (r.jumlah / max) * 100 : 0;
                  return (
                    <div key={r.jenis} className="text-xs">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-medium text-slate-700 truncate">{r.jenis}</span>
                        <span className="text-slate-600 tabular-nums ml-2">{unit(r.jumlah)}</span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${meta.bar} rounded-full transition-all`}
                          style={{ width: `${Math.max(2, pct).toFixed(1)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {telur.length > 0 && (
        <div className="mt-3 rounded-lg bg-gradient-to-br from-yellow-50/70 to-white ring-1 ring-yellow-100 p-3">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="
                flex h-6 w-6 items-center justify-center
                rounded-md bg-white ring-1 ring-slate-200 shadow-sm
              "
            >
              <Egg className="w-3.5 h-3.5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-slate-800 leading-tight">
                Estimasi Produksi Telur (per tahun)
              </div>
              <div className="text-[10px] text-slate-500">
                Populasi ST2023 × faktor konversi indikatif
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            {telur.map((t) => (
              <div key={t.key} className="text-xs">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-medium text-slate-700">{t.label}</span>
                  <span className="font-bold text-slate-800 tabular-nums ml-2">
                    {unit(Math.round(t.kg))} kg · {fmtRp(t.nilai)}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 tabular-nums">
                  {unit(t.populasi)} ekor × {unit(t.butirPerEkor)} butir/ekor/thn ·{" "}
                  {t.gramPerButir} g/butir · Rp {unit(t.hargaPerKg)}/kg
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-yellow-200 pt-1.5 text-xs font-bold text-slate-800">
              <span>Jumlah estimasi</span>
              <span className="tabular-nums">
                {unit(telurTotal.butir)} butir · {unit(Math.round(telurTotal.kg))}{" "}
                kg · {fmtRp(telurTotal.nilai)}
              </span>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-slate-500 leading-relaxed">
            Estimasi indikatif — VERIFIKASI (harga ras &amp; kampung dari
            harga-referensi.ts, puyuh indikatif lokal); data telur resmi 3 jenis
            menyusul dari Distankan KP.
          </p>
        </div>
      )}
    </section>
  );
}