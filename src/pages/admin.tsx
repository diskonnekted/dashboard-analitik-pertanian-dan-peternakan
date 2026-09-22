/**
 * Dasbor Admin SISPERTANI — manajemen data via Excel (pengganti Sanity Studio).
 *
 * - Login token (backend routes/admin.js, kredensial di backend/.env).
 * - 15 domain data MySQL: unduh TEMPLATE .xlsx, EXPORT data, IMPORT .xlsx
 *   (upsert per kunci natural — baris kunci sama memperbarui data lama).
 * - Panel ringkas Data Bantuan Pemerintah + status backend.
 * - Desbor profesional: logo instansi, KPI ringkas, panel status & ringkasan.
 */
import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Beef,
  CheckCircle2,
  Cherry,
  ClipboardList,
  Coins,
  Database,
  Download,
  ExternalLink,
  FileCheck,
  FileSpreadsheet,
  Fish,
  History,
  KeyRound,
  Landmark,
  LoaderCircle,
  Lock,
  LogOut,
  Map as MapIcon,
  Package,
  RefreshCw,
  Server,
  ShieldCheck,
  Sprout,
  TreePine,
  TrendingUp,
  Upload,
  User,
  Users,
  Warehouse,
  Wheat,
  X,
} from "lucide-react";
import { API_BASE, fetchSyncLog, type SyncLogRow } from "@/services/api";
import {
  clearBantuanCache,
  fetchBantuanPemerintah,
  formatRupiahShort,
  formatTanggal,
  type BantuanData,
} from "@/services/bantuan";
import { siteConfig } from "@/config/site";
import { Badge, LoadingSpinner } from "@/components/ui";

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

/* ---------- ikon & warna per domain ---------- */
const DOMAIN_STYLE: Record<string, { icon: typeof Wheat; color: string }> = {
  "bantuan-program": { icon: Coins, color: "bg-amber-50 text-amber-700" },
  "bantuan-alokasi": { icon: Landmark, color: "bg-amber-50 text-amber-700" },
  "bantuan-korelasi": { icon: TrendingUp, color: "bg-amber-50 text-amber-700" },
  padi: { icon: Wheat, color: "bg-emerald-50 text-emerald-700" },
  palawija: { icon: Sprout, color: "bg-lime-50 text-lime-700" },
  hortikultura: { icon: Cherry, color: "bg-rose-50 text-rose-700" },
  perkebunan: { icon: TreePine, color: "bg-teal-50 text-teal-700" },
  peternakan: { icon: Beef, color: "bg-orange-50 text-orange-700" },
  perikanan: { icon: Fish, color: "bg-sky-50 text-sky-700" },
  lahan: { icon: MapIcon, color: "bg-stone-100 text-stone-700" },
  lumbung: { icon: Warehouse, color: "bg-slate-100 text-slate-700" },
  ekonomi: { icon: TrendingUp, color: "bg-indigo-50 text-indigo-700" },
  kelembagaan: { icon: Users, color: "bg-violet-50 text-violet-700" },
  st2023: { icon: ClipboardList, color: "bg-blue-50 text-blue-700" },
  renstra: { icon: FileCheck, color: "bg-cyan-50 text-cyan-700" },
};
const domainStyle = (d: string) =>
  DOMAIN_STYLE[d] ?? { icon: Database, color: "bg-slate-100 text-slate-700" };

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState("admin");
  const [pass, setPass] = useState("");
  const [loginErr, setLoginErr] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);
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

  async function doLogin(e: FormEvent) {
    e.preventDefault();
    setLoginErr(null);
    setLoginBusy(true);
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
    } finally {
      setLoginBusy(false);
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

  /* ---------- statistik ringkas ---------- */
  const totalSheets = (domains ?? []).reduce((a, d) => a + d.sheets.length, 0);
  const totalNilai = (bantuan?.program ?? []).reduce((a, p) => a + p.nilaiRupiah, 0);
  const totalPenerima = (bantuan?.program ?? []).reduce((a, p) => a + p.penerimaJumlah, 0);

  /* =====================================================
     TAMPILAN 1 — LOGIN
     ===================================================== */
  if (!token) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        {/* Panel merek (desktop) */}
        <aside className="relative hidden w-[44%] flex-col justify-between overflow-hidden bg-slate-900 p-10 lg:flex">
          <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-lime-500/10 blur-3xl" />

          <div className="relative">
            <img src="/logo.png" alt="Logo SISPERTANI" className="h-24 w-auto drop-shadow-lg" />
            <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-400">
              Sistem Informasi Pertanian Terintegrasi
            </p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white">SISPERTANI</h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-300">
              Dasbor data pertanian, perikanan, dan ketahanan pangan Kabupaten
              Banjarnegara — terintegrasi dari sensus BPS hingga bantuan
              pemerintah daerah.
            </p>
          </div>

          <ul className="relative space-y-3 text-sm text-slate-300">
            {[
              { icon: Database, text: "15 domain data MySQL — pangan, ternak, perikanan, bantuan" },
              { icon: RefreshCw, text: "Sinkronisasi Excel dua arah (template / export / import)" },
              { icon: ShieldCheck, text: "Area internal — akses terbatas pegawai dinas" },
            ].map((f) => (
              <li key={f.text} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-emerald-300">
                  <f.icon className="h-4 w-4" />
                </span>
                {f.text}
              </li>
            ))}
          </ul>

          <p className="relative text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Dinas Pertanian, Perikanan dan
            Ketahanan Pangan Kab. Banjarnegara
          </p>
        </aside>

        {/* Panel form */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            <div className="mb-6 text-center lg:hidden">
              <img src="/logo.png" alt="Logo SISPERTANI" className="mx-auto h-20 w-auto" />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-600">
                Dasbor Internal
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">
                Masuk Admin Distan
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                Dinas Pertanian, Perikanan dan Ketahanan Pangan — Kabupaten
                Banjarnegara
              </p>

              <form onSubmit={doLogin} className="mt-7 space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Nama Pengguna
                  </span>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={user}
                      onChange={(e) => setUser(e.target.value)}
                      autoComplete="username"
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/30"
                      placeholder="mis. admin"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Kata Sandi
                  </span>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={pass}
                      onChange={(e) => setPass(e.target.value)}
                      autoComplete="current-password"
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/30"
                      placeholder="••••••••"
                    />
                  </div>
                </label>

                {loginErr && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{loginErr}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loginBusy}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {loginBusy ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Memeriksa kredensial…
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Masuk ke Dasbor
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span>
                  Kredensial diatur di <span className="font-mono">backend/.env</span>{" "}
                  (ADMIN_USER / ADMIN_PASS). Sesi login berlaku 12 jam. Halaman ini
                  tidak tampil di menu publik.
                </span>
              </div>
            </div>

            <Link
              to="/"
              className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-emerald-600"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Kembali ke Dasbor Publik
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* =====================================================
     TAMPILAN 2 — DASBOR
     ===================================================== */
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* ---------- Header ---------- */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 md:px-6">
          <img src="/logo.png" alt="Logo SISPERTANI" className="h-9 w-auto" />
          <div className="min-w-0">
            <p className="text-sm font-extrabold tracking-tight text-slate-800">
              SISPERTANI <span className="font-medium text-slate-400">· Dasbor Admin</span>
            </p>
            <p className="truncate text-[11px] text-slate-400">
              Dinas Pertanian, Perikanan dan Ketahanan Pangan Kab. Banjarnegara
            </p>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {health?.db === "up" ? (
              <Badge tone="emerald">
                <Server className="h-3 w-3" /> Backend {health?.ok ? "OK" : "?"} · MySQL up
              </Badge>
            ) : (
              <Badge tone="amber">
                <Server className="h-3 w-3" /> MySQL {health?.db ?? "…"}
              </Badge>
            )}
            <Link
              to="/government-assistance"
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Halaman Publik Bantuan
            </Link>
            <button
              onClick={doLogout}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-900"
            >
              <LogOut className="h-3.5 w-3.5" />
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* ---------- Konten ---------- */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6">
        <div className="mb-6">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-600">
            Area Internal
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">
            Panel Manajemen Data
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">
            Manajemen data MySQL server lokal: unduh template Excel, ekspor data,
            dan impor pembaruan (<b>upsert</b> — baris dengan kunci sama memperbarui
            data lama). Semua data statistik &amp; bantuan pemerintah tersimpan di
            basis data <b>sispertani</b> (MySQL) — tidak lagi bergantung pada
            layanan eksternal.
          </p>
        </div>

        {msg && (
          <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        {/* ---------- KPI ---------- */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiTile
            icon={<Database className="h-5 w-5" />}
            color="bg-emerald-50 text-emerald-700"
            label="Domain Data"
            value={domains ? domains.length : null}
            hint="Katalog tabel MySQL siap kelola"
          />
          <KpiTile
            icon={<FileSpreadsheet className="h-5 w-5" />}
            color="bg-blue-50 text-blue-700"
            label="Tabel / Sheet"
            value={domains ? totalSheets : null}
            hint="Template · export · import"
          />
          <KpiTile
            icon={<Coins className="h-5 w-5" />}
            color="bg-amber-50 text-amber-700"
            label="Program Bantuan"
            value={bantuan ? bantuan.program.length : null}
            hint={
              bantuan && bantuan.program.length > 0
                ? `Total ${formatRupiahShort(totalNilai)} · ${totalPenerima.toLocaleString("id-ID")} penerima`
                : "Belum ada data bantuan"
            }
          />
          <KpiTile
            icon={<History className="h-5 w-5" />}
            color="bg-violet-50 text-violet-700"
            label="Log Sinkronisasi"
            value={syncLog ? syncLog.total : null}
            hint={
              syncLog && syncLog.rows.length > 0
                ? `Terakhir: ${new Date(syncLog.rows[0].created_at).toLocaleString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "Belum ada aktivitas impor"
            }
          />
        </div>

        {/* ---------- Laporan import ---------- */}
        {report && (
          <section
            className={`mt-6 overflow-hidden rounded-xl border shadow-sm ${
              report.errors.length ? "border-amber-200" : "border-emerald-200"
            }`}
          >
            <div
              className={`flex flex-wrap items-center gap-2.5 border-b px-5 py-3.5 ${
                report.errors.length ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"
              }`}
            >
              {report.errors.length ? (
                <AlertCircle className="h-5 w-5 text-amber-600" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              )}
              <p className="text-sm font-bold text-slate-700">
                Hasil Import — {report.label}
              </p>
              <Badge tone={report.errors.length ? "amber" : "emerald"}>
                {report.inserted} ditambah • {report.updated} diperbarui
                {report.errors.length ? ` • ${report.errors.length} baris ditolak` : " • tanpa error"}
              </Badge>
              <button
                onClick={() => setReport(null)}
                className="ml-auto rounded-md p-1 text-slate-400 transition hover:bg-white hover:text-slate-600"
                aria-label="Tutup laporan"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-px bg-slate-200/70 sm:grid-cols-4">
              {[
                { label: "Ditambahkan", value: report.inserted },
                { label: "Diperbarui", value: report.updated },
                { label: "Dilewati", value: report.skipped },
                { label: "Ditolak", value: report.errors.length },
              ].map((s) => (
                <div key={s.label} className="bg-white px-5 py-4">
                  <p className="text-xl font-bold tabular-nums text-slate-800">
                    {s.value.toLocaleString("id-ID")}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
            <div className="space-y-2.5 bg-white p-5 pt-4">
              {report.sheets.map((s) => (
                <div key={s.name} className="rounded-lg bg-slate-50 p-3 text-sm">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <b className="text-slate-700">Sheet “{s.name}”</b>
                    {s.missing ? (
                      <span className="text-xs font-semibold text-amber-700">
                        tidak ada di file (dilewati)
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600">
                        +{s.inserted ?? 0} tambah, {s.updated ?? 0} perbarui
                        {s.errors.length ? `, ${s.errors.length} baris ditolak` : ""}
                      </span>
                    )}
                  </div>
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
          </section>
        )}

        {/* ---------- Grid utama ---------- */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Kolom domain */}
          <div className="space-y-4 lg:col-span-2">
            <SectionLabel
              icon={<Database className="h-3.5 w-3.5" />}
              title={`Kelola Data Domain${domains ? ` (${domains.length})` : ""}`}
            />
            {domains === null ? (
              <LoadingSpinner height="h-[240px]" label="Memuat katalog domain" />
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {domains.map((d) => {
                  const id = `file-${d.domain}`;
                  const isBusy = busy?.startsWith(`${d.domain}:`);
                  const st = domainStyle(d.domain);
                  const Icon = st.icon;
                  return (
                    <section
                      key={d.domain}
                      className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                    >
                      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${st.color}`}>
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-bold text-slate-800">{d.label}</h3>
                          <p className="truncate text-xs text-slate-400">{d.desc}</p>
                        </div>
                        <Badge tone="slate">{d.sheets.length} sheet</Badge>
                      </div>
                      <div className="flex-1 px-4 py-3">
                        <ul className="space-y-1">
                          {d.sheets.map((s) => (
                            <li
                              key={s.name}
                              className="flex items-baseline justify-between gap-2 text-[11px] leading-relaxed"
                              title={`Tabel ${s.table}`}
                            >
                              <span className="truncate font-mono font-semibold text-slate-600">{s.name}</span>
                              <span className="shrink-0 text-slate-400">kunci: {s.key.join("+")}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
                        <button
                          onClick={() => download(d.domain, "template")}
                          disabled={isBusy}
                          className="flex items-center gap-1.5 rounded-lg border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                        >
                          <Download className="h-3.5 w-3.5" />
                          {busy === `${d.domain}:template` ? "Menyiapkan…" : "Template Excel"}
                        </button>
                        <button
                          onClick={() => download(d.domain, "export")}
                          disabled={isBusy}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-white disabled:opacity-50"
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5" />
                          {busy === `${d.domain}:export` ? "Menyiapkan…" : "Export"}
                        </button>
                        <label
                          htmlFor={id}
                          className={`ml-auto flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-sm transition ${
                            isBusy ? "bg-emerald-400" : "bg-emerald-600 hover:bg-emerald-700"
                          }`}
                        >
                          {busy === `${d.domain}:import` ? (
                            <>
                              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                              Mengunggah…
                            </>
                          ) : (
                            <>
                              <Upload className="h-3.5 w-3.5" />
                              Import…
                            </>
                          )}
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
                    </section>
                  );
                })}
              </div>
            )}

            {/* Petunjuk penggunaan */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Catatan Penggunaan
              </h3>
              <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-slate-600">
                <li>
                  Import bersifat <b>upsert</b>: baris dengan kombinasi kolom kunci yang sama
                  dengan data lama akan <b>memperbarui</b> data lama (kolom yang dikosongkan
                  tidak mengubah nilai lama).
                </li>
                <li>
                  Baris yang gagal validasi (kecamatan tidak resmi, angka/tahun salah, nilai
                  enum di luar pilihan) ditolak dan dilaporkan — baris lain tetap diproses.
                </li>
                <li>
                  Nama kecamatan mengikuti daftar resmi (lihat sheet <b>PETUNJUK</b> di file
                  template); varian umum seperti <i>Purwonegoro</i> dikenali otomatis.
                </li>
                <li>
                  Tabel infrastruktur (kecamatan, desa, metadata sync) tidak dikelola via
                  dasbor ini; data detail KTH &amp; lahan desa (kolom JSON) menyusul.
                </li>
                <li>
                  Sesi login berlaku 12 jam. Setelah import domain bantuan, halaman publik{" "}
                  <span className="font-mono">/government-assistance</span> otomatis menampilkan
                  data terbaru (cache lama dihapus).
                </li>
              </ol>
            </section>
          </div>

          {/* Kolom ringkasan */}
          <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <SectionLabel
              icon={<Coins className="h-3.5 w-3.5" />}
              title="Ringkasan Bantuan"
            />
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {bantuan === null ? (
                <div className="px-5 py-8 text-center text-sm text-slate-400">Memuat…</div>
              ) : bantuan.program.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm font-semibold text-slate-600">Belum ada data bantuan</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Import domain <span className="font-mono">bantuan-*</span> untuk mengisi data.
                  </p>
                </div>
              ) : (
                <>
                  <dl className="divide-y divide-slate-100">
                    {[
                      { k: "Program terdaftar", v: `${bantuan.program.length} program` },
                      { k: "Total nilai", v: formatRupiahShort(totalNilai) },
                      { k: "Total penerima", v: `${totalPenerima.toLocaleString("id-ID")} orang` },
                      {
                        k: "APBD / APBN",
                        v: `${bantuan.program.filter((p) => p.sumber === "APBD").length} / ${bantuan.program.filter((p) => p.sumber === "APBN").length}`,
                      },
                    ].map((r) => (
                      <div key={r.k} className="flex items-center justify-between px-5 py-3">
                        <dt className="text-xs font-semibold text-slate-500">{r.k}</dt>
                        <dd className="text-sm font-bold tabular-nums text-slate-800">{r.v}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
                    <p className="text-[11px] text-slate-400">
                      Data terakhir diperbarui {formatTanggal(bantuan.updatedAt)}
                    </p>
                    <Link
                      to="/government-assistance"
                      className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline"
                    >
                      Lihat halaman publik bantuan
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </>
              )}
            </section>

            <SectionLabel
              icon={<Server className="h-3.5 w-3.5" />}
              title="Status Sistem"
            />
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <dl className="divide-y divide-slate-100">
                {[
                  {
                    k: "Backend API",
                    v: health?.ok ? "Terhubung" : health ? "?" : "Memuat…",
                    tone: (health?.ok ?? false) ? ("emerald" as const) : ("amber" as const),
                  },
                  {
                    k: "Basis data MySQL",
                    v: health?.db ?? "…",
                    tone: health?.db === "up" ? ("emerald" as const) : ("amber" as const),
                  },
                  { k: "Sesi login", v: "Berlaku 12 jam", tone: "slate" as const },
                  {
                    k: "Snapshot paket export",
                    v: paket?.snapshot ?? "—",
                    tone: "slate" as const,
                  },
                ].map((r) => (
                  <div key={r.k} className="flex items-center justify-between gap-2 px-5 py-3">
                    <dt className="text-xs font-semibold text-slate-500">{r.k}</dt>
                    <dd>
                      <Badge tone={r.tone}>{r.v}</Badge>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </div>

        {/* ------------------------------------------------ Sync Log */}
        {syncLog && syncLog.rows.length > 0 && (
          <section className="mt-6">
            <SectionLabel
              icon={<History className="h-3.5 w-3.5" />}
              title={`Riwayat Sinkronisasi — ${syncLog.total} total entri, ${syncLog.rows.length} terbaru`}
            />
            <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="max-h-[480px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Waktu</th>
                      <th className="px-2 py-2.5 font-semibold">Dataset</th>
                      <th className="px-2 py-2.5 font-semibold">Aksi</th>
                      <th className="px-2 py-2.5 text-right font-semibold">Baris</th>
                      <th className="px-2 py-2.5 text-center font-semibold">Status</th>
                      <th className="px-2 py-2.5 font-semibold">Pesan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {syncLog.rows.map((r) => (
                      <tr key={r.id} className="align-top hover:bg-slate-50/60">
                        <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-slate-500">
                          {new Date(r.created_at).toLocaleString("id-ID")}
                        </td>
                        <td className="px-2 py-2.5">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                            {r.dataset}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 font-semibold text-slate-700">{r.aksi}</td>
                        <td className="px-2 py-2.5 text-right tabular-nums text-slate-600">{r.baris}</td>
                        <td className="px-2 py-2.5 text-center">
                          <Badge tone={r.status === "ok" ? "emerald" : r.status === "error" ? "red" : "amber"}>
                            {r.status}
                          </Badge>
                        </td>
                        <td className="px-2 py-2.5 text-slate-500">{r.sumber ?? r.pesan ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ------------------------------------ Paket template & export (Excel+CSV) */}
        {paket && paket.groups.some((g) => g.files.length > 0) && (
          <section className="mt-6">
            <SectionLabel
              icon={<Package className="h-3.5 w-3.5" />}
              title="Paket Template & Export (Excel + CSV)"
            />
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
              Berkas siap unduh dari paket generator{" "}
              <span className="font-mono text-xs">database/template-import-export</span> —
              melengkapi tombol per domain di atas dengan versi <b>CSV per tabel</b> dan
              domain <b>Referensi</b> (kecamatan dan desa; hanya dokumentasi/audit — tidak
              untuk impor).
              {paket.snapshot ? ` Snapshot export: ${paket.snapshot}.` : ""} Regenerasi paket:{" "}
              <span className="font-mono text-xs">npm run generate</span> di folder tersebut.
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {paket.groups
                .filter((g) => g.files.length > 0)
                .map((g) => (
                  <div key={g.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-800">{PAKET_LABELS[g.id] ?? g.id}</h3>
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
          </section>
        )}
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-500">
          <p>
            &copy; {new Date().getFullYear()} Dinas Pertanian, Perikanan dan
            Ketahanan Pangan Kab. Banjarnegara — SISPERTANI
          </p>
          <p className="flex items-center gap-2">
            V{siteConfig.version} · Rilis: {siteConfig.releaseDate}
            <Badge tone="amber">Area Internal</Badge>
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ---------- sub-komponen lokal ---------- */

function KpiTile({
  icon,
  color,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  color: string;
  label: string;
  value: number | null;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${color}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-slate-800">
          {value === null ? "…" : value.toLocaleString("id-ID")}
        </p>
        {hint && <p className="mt-0.5 truncate text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}

function SectionLabel({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <p className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
      {icon}
      {title}
    </p>
  );
}
