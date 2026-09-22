/**
 * Dasbor Admin SISPERTANI — manajemen data via Excel (pengganti Sanity Studio).
 *
 * - Login token (backend routes/admin.js, kredensial di backend/.env).
 * - 15 domain data MySQL: unduh TEMPLATE .xlsx, EXPORT data, IMPORT .xlsx
 *   (upsert per kunci natural — baris kunci sama memperbarui data lama).
 * - Panel ringkas Data Bantuan Pemerintah + status backend.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE, fetchSyncLog, type SyncLogRow } from "@/services/api";
import {
  clearBantuanCache,
  fetchBantuanPemerintah,
  formatRupiahShort,
  formatTanggal,
  type BantuanData,
} from "@/services/bantuan";

interface DomainSheet {
  name: string;
  table: string;
  key: string[];
}
interface DomainInfo {
  domain: string;
  label: string;
  desc: string;
  sheets: DomainSheet[];
}
interface SheetReport {
  name: string;
  table: string;
  inserted?: number;
  updated?: number;
  skipped?: number;
  missing?: boolean;
  errors: { row: number; message: string }[];
}
interface ImportReport {
  domain: string;
  sheets: SheetReport[];
  inserted: number;
  updated: number;
  skipped: number;
  errors: { sheet?: string; row: number; message: string }[];
}

interface PaketFile {
  file: string;
  bytes: number;
}
interface PaketGroup {
  id: string;
  dir: string;
  files: PaketFile[];
}
interface PaketIndex {
  snapshot: string | null;
  groups: PaketGroup[];
}
const PAKET_LABELS: Record<string, string> = {
  "template-xlsx": "Template Excel — 16 domain (siap isi)",
  "template-csv": "Template CSV — 37 tabel (header + baris contoh)",
  "export-xlsx": "Export Excel — snapshot data live",
  "export-csv": "Export CSV — 37 tabel (data penuh)",
};
const formatBytes = (n: number): string =>
  n >= 1024 * 1024 ? `${(n / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

const TOKEN_KEY = "sispertani:admin-token";
const AUTH_HEADERS = (token: string) => ({ Authorization: `Bearer ${token}` });
const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState("admin");
  const [pass, setPass] = useState("");
  const [loginErr, setLoginErr] = useState<string | null>(null);
  const [domains, setDomains] = useState<DomainInfo[] | null>(null);
  const [health, setHealth] = useState<{ ok?: boolean; db?: string } | null>(null);
  const [bantuan, setBantuan] = useState<BantuanData | null>(null);
  const [syncLog, setSyncLog] = useState<{ total: number; rows: SyncLogRow[] } | null>(null);
  const [paket, setPaket] = useState<PaketIndex | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // `${domain}:${aksi}`
  const [msg, setMsg] = useState<string | null>(null);
  const [report, setReport] = useState<(ImportReport & { label: string }) | null>(null);

  // Muat domains + health + bantuan saat sudah login
  useEffect(() => {
    if (!token) return;
    let alive = true;
    (async () => {
      try {
        const [h, d, b] = await Promise.all([
          fetch(`${API_BASE}/health`).then((r) => r.json()),
          fetch(`${API_BASE}/v1/admin/domains`, { headers: AUTH_HEADERS(token) }).then((r) => {
            if (r.status === 401) throw new Error("sesi berakhir");
            return r.json();
          }),
          fetchBantuanPemerintah(),
        ]);
        if (!alive) return;
        setHealth(h);
        setDomains(d);
        setBantuan(b);
        // --- fetch sync-log (best-effort; abaikan error) ---
        try {
          const s = await fetchSyncLog(token, 50);
          if (s && Array.isArray(s.data)) {
            if (alive) setSyncLog({ total: s.total, rows: s.data });
          }
        } catch {
          /* sync-log gagal — kosongkan saja di UI */
        }
        // --- fetch paket template/export statis (best-effort; abaikan error) ---
        try {
          const p = await fetch(`${API_BASE}/v1/admin/paket`, { headers: AUTH_HEADERS(token) }).then((r) => r.json());
          if (alive && p && Array.isArray(p.groups)) setPaket(p);
        } catch {
          /* backend lama tanpa endpoint paket — panel disembunyikan */
        }
      } catch (e) {
        if (!alive) return;
        if (errMsg(e) === "sesi berakhir") doLogout();
        else setMsg(`Gagal memuat data dasbor: ${errMsg(e)}`);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  function doLogout() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setDomains(null);
    setReport(null);
    setBantuan(null);
    setPaket(null);
  }

  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginErr(null);
    try {
      const res = await fetch(`${API_BASE}/v1/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, pass }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      sessionStorage.setItem(TOKEN_KEY, body.token);
      setToken(body.token);
      setPass("");
    } catch (err) {
      setLoginErr(errMsg(err));
    }
  }

  async function download(domain: string, mode: "template" | "export") {
    if (!token) return;
    setBusy(`${domain}:${mode}`);
    setMsg(null);
    try {
      const res = await fetch(`${API_BASE}/v1/admin/${mode}/${domain}`, { headers: AUTH_HEADERS(token) });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `HTTP ${res.status}`);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${mode === "template" ? "template" : "export"}-${domain}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
   } catch (e) {
      setMsg(`Gagal mengunduh ${mode} ${domain}: ${errMsg(e)}`);
    } finally {
      setBusy(null);
    }
  }

  async function downloadPaket(groupId: string, file: string) {
    if (!token) return;
    setBusy(`paket:${groupId}:${file}`);
    setMsg(null);
    try {
      const res = await fetch(`${API_BASE}/v1/admin/paket/${groupId}/${encodeURIComponent(file)}`, {
        headers: AUTH_HEADERS(token),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `HTTP ${res.status}`);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = file;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setMsg(`Gagal mengunduh ${file}: ${errMsg(e)}`);
    } finally {
      setBusy(null);
    }
  }

  async function doImport(domain: string, label: string, file: File | undefined) {
    if (!file || !token) return;
    setBusy(`${domain}:import`);
    setMsg(null);
    setReport(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE}/v1/admin/import/${domain}`, {
        method: "POST",
        headers: AUTH_HEADERS(token),
        body: form,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      setReport({ ...body, label });
      // Refresh ringkasan bantuan bila domain terkait
      if (domain.startsWith("bantuan-")) {
        clearBantuanCache();
        setBantuan(await fetchBantuanPemerintah());
      }
   } catch (e) {
      setMsg(`Gagal import ${domain}: ${errMsg(e)}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="bg-slate-100 py-10">
      <div className="container mx-auto px-4 lg:px-8">
        <h1 className="text-3xl font-bold text-slate-800">Dasbor Admin SISPERTANI</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Manajemen data MySQL server lokal: unduh template Excel, ekspor data, dan impor pembaruan
          (upsert — baris dengan kunci sama memperbarui data lama). Semua data statistik & bantuan
          pemerintah kini tersimpan di <b>sispertani</b> (MySQL) — tidak lagi bergantung pada layanan
          eksternal.
        </p>

        {!token ? (
          /* ---------------------------------------------------------------- Login */
          <form onSubmit={doLogin} className="mx-auto mt-8 max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">Masuk Admin Distan</h2>
            <p className="mt-1 text-sm text-slate-500">Kredensial diatur di <code>backend/.env</code> (ADMIN_USER / ADMIN_PASS).</p>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Username
              <input
                type="text"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                autoComplete="username"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </label>
            <label className="mt-3 block text-sm font-medium text-slate-700">
              Password
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                autoComplete="current-password"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </label>
            {loginErr && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{loginErr}</p>}
            <button
              type="submit"
              className="mt-5 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Masuk
            </button>
          </form>
        ) : (
          <>
            {/* ---------------------------------------------------- Status bar */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  health?.db === "up" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                }`}
              >
                Backend {health?.ok ? "OK" : "?"} • MySQL {health?.db ?? "?"}
              </span>
              {bantuan && (
                <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
                  Bantuan: {bantuan.program.length} program •{" "}
                  {bantuan.program.reduce((a, p) => a + p.nilaiRupiah, 0) > 0
                    ? `total ${formatRupiahShort(bantuan.program.reduce((a, p) => a + p.nilaiRupiah, 0))}`
                    : "belum ada data"}
                </span>
              )}
              <span className="flex-1" />
              <Link to="/government-assistance" className="text-sm font-medium text-emerald-700 hover:underline">
                Halaman publik bantuan →
              </Link>
              <button onClick={doLogout} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Keluar
              </button>
            </div>
            {bantuan && bantuan.program.length > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                Data bantuan terakhir diperbarui {formatTanggal(bantuan.updatedAt)}
              </p>
            )}

            {msg && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{msg}</div>
            )}

            {/* ------------------------------------------------ Sync Log */}
            {syncLog && syncLog.rows.length > 0 && (
              <div className="mt-6">
                <h2 className="text-lg font-semibold text-slate-800">Riwayat Sinkronisasi (Sync Log)</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {syncLog.total} total entri • menampilkan {syncLog.rows.length} terbaru
                </p>
                <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">Waktu</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">Dataset</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">Aksi</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-700">Baris</th>
                        <th className="px-3 py-2 text-center font-semibold text-slate-700">Status</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">Pesan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {syncLog.rows.map((r) => (
                        <tr key={r.id} className="border-t border-slate-100">
                          <td className="px-3 py-2">{new Date(r.created_at).toLocaleString("id-ID")}</td>
                          <td className="px-3 py-2"><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{r.dataset}</code></td>
                          <td className="px-3 py-2">{r.aksi}</td>
                          <td className="px-3 py-2 text-right">{r.baris}</td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={
                                r.status === "ok"
                                  ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800"
                                  : r.status === "error"
                                    ? "rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800"
                                    : "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800"
                              }
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-500">{r.sumber ?? r.pesan ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ------------------------------------------------ Laporan import */}
            {report && (
              <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-baseline gap-3">
                  <h2 className="text-lg font-semibold text-slate-800">Hasil Import — {report.label}</h2>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${report.errors.length ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                    {report.inserted} ditambah • {report.updated} diperbarui
                    {report.errors.length ? ` • ${report.errors.length} baris ditolak` : " • tanpa error"}
                  </span>
                </div>
                <div className="mt-3 space-y-3">
                  {report.sheets.map((s) => (
                    <div key={s.name} className="rounded-lg bg-slate-50 p-3 text-sm">
                      <b>Sheet “{s.name}”</b>{" "}
                      {s.missing ? (
                        <span className="text-amber-700">tidak ada di file (dilewati)</span>
                      ) : (
                        <span className="text-slate-600">
                          +{s.inserted ?? 0} tambah, {s.updated ?? 0} perbarui
                          {s.errors.length ? `, ${s.errors.length} baris ditolak` : ""}
                        </span>
                      )}
                      {s.errors.length > 0 && (
                        <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs text-red-700">
                          {s.errors.slice(0, 50).map((e, i) => (
                            <li key={i}>
                              Baris {e.row}: {e.message}
                            </li>
                          ))}
                          {s.errors.length > 50 && <li>… {s.errors.length - 50} error lainnya</li>}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ---------------------------------------------------- Domain grid */}
            <h2 className="mt-8 text-xl font-bold text-slate-800">Manajemen Data (Excel)</h2>
            <p className="mt-1 text-sm text-slate-600">
              Alur: unduh <b>Template</b> (atau <b>Export</b> sebagai titik awal) → isi di Excel → unggah
              via tombol <b>Import</b>. Detail aturan kolom ada di sheet <b>PETUNJUK</b> dalam tiap file.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(domains ?? []).map((d) => {
                const id = `file-${d.domain}`;
                const isBusy = busy?.startsWith(`${d.domain}:`);
                return (
                  <div key={d.domain} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="font-semibold text-slate-800">{d.label}</h3>
                    <p className="mt-1 flex-1 text-sm text-slate-600">{d.desc}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      {d.sheets.map((s) => `${s.name} (kunci: ${s.key.join("+")})`).join(" • ")}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => download(d.domain, "template")}
                        disabled={isBusy}
                        className="rounded-lg border border-emerald-600 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                      >
                        {busy === `${d.domain}:template` ? "…" : "Template Excel"}
                      </button>
                      <button
                        onClick={() => download(d.domain, "export")}
                        disabled={isBusy}
                        className="rounded-lg border border-slate-400 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        {busy === `${d.domain}:export` ? "…" : "Export"}
                      </button>
                      <label
                        htmlFor={id}
                        className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition ${
                          isBusy ? "bg-emerald-400" : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                      >
                        {busy === `${d.domain}:import` ? "Mengunggah…" : "Import…"}
                      </label>
                      <input
                        id={id}
                        type="file"
                        accept=".xlsx"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = ""; // supaya file sama bisa diunggah ulang
                          doImport(d.domain, d.label, f);
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              {domains === null && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Memuat daftar domain…</div>
              )}
            </div>

            {/* ------------------------------------ Paket template & export (Excel+CSV) */}
            {paket && paket.groups.some((g) => g.files.length > 0) && (
              <div className="mt-8">
                <h2 className="text-xl font-bold text-slate-800">Paket Template & Export (Excel + CSV)</h2>
                <p className="mt-1 max-w-3xl text-sm text-slate-600">
                  Berkas siap unduh dari paket generator <code>database/template-import-export</code> — melengkapi
                  tombol per domain di atas dengan versi <b>CSV per tabel</b> dan domain <b>Referensi</b> (kecamatan
                  dan desa; hanya dokumentasi/audit — tidak untuk impor).
                  {paket.snapshot ? ` Snapshot export: ${paket.snapshot}.` : ""} Regenerasi paket:{" "}
                  <code>npm run generate</code> di folder tersebut.
                </p>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {paket.groups
                    .filter((g) => g.files.length > 0)
                    .map((g) => (
                      <div key={g.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="font-semibold text-slate-800">{PAKET_LABELS[g.id] ?? g.id}</h3>
                          <span className="text-xs font-medium text-slate-400">{g.files.length} berkas</span>
                        </div>
                        <div className="mt-3 flex max-h-56 flex-wrap gap-2 overflow-y-auto pr-1">
                          {g.files.map((f) => {
                            const fBusy = busy === `paket:${g.id}:${f.file}`;
                            return (
                              <button
                                key={f.file}
                                onClick={() => downloadPaket(g.id, f.file)}
                                disabled={fBusy}
                                title={`Unduh ${f.file}`}
                                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
                              >
                                {fBusy ? "Mengunduh…" : `${f.file.replace(/\.(xlsx|csv)$/i, "")} · ${formatBytes(f.bytes)}`}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* -------------------------------------------------------- Petunjuk */}
            <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800">Catatan Penggunaan</h2>
              <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-slate-600">
                <li>Import bersifat <b>upsert</b>: baris dengan kombinasi kolom kunci yang sama dengan data lama akan <b>memperbarui</b> data lama (kolom yang dikosongkan tidak mengubah nilai lama).</li>
                <li>Baris yang gagal validasi (kecamatan tidak resmi, angka/tahun salah, nilai enum di luar pilihan) ditolak dan dilaporkan — baris lain tetap diproses.</li>
                <li>Nama kecamatan mengikuti daftar resmi (lihat sheet PETUNJUK di file template); varian umum seperti <i>Purwonegoro</i> dikenali otomatis.</li>
                <li>Tabel infrastruktur (kecamatan, desa, metadata sync) tidak dikelola via dasbor ini; data detail KTH & lahan desa (kolom JSON) menyusul.</li>
                <li>Sesi login berlaku 12 jam. Setelah import domain bantuan, halaman publik /government-assistance otomatis menampilkan data terbaru (cache lama dihapus).</li>
              </ol>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
