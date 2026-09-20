import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DefaultLayout from "@/layouts/default";
import {
  ExternalLink,
  Lock,
  RefreshCw,
  Database,
  Coins,
  TrendingUp,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import {
  fetchBantuanPemerintah,
  clearBantuanCache,
  formatRupiahShort,
  formatTanggal,
  SANITY_PROJECT_ID,
  SANITY_DATASET,
  type BantuanData,
} from "@/services/bantuan";

/**
 * URL Sanity Studio — hostname resmi didasarkan pada projectId Sanity
 * ("spukl1fj"), bukan alias custom "sispertani" (yang me-load Dashboard
 * universal dan memicu banner "Studio is not fully compatible with Dashboard").
 *
 * Catatan: ganti <dataset> jika dataset Anda bukan "datasispertani".
 */
const STUDIO_URL =
  "https://spukl1fj.sanity.studio/datasispertani";

export default function AdminPage() {
  // Halaman internal: jangan diindeks mesin pencari
  useEffect(() => {
    const prev = document.title;
    document.title = "Admin — SISPERTANI";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      document.title = prev;
      meta.remove();
    };
  }, []);

  const [bantuan, setBantuan] = useState<BantuanData | null>(null);
  const [memuat, setMemuat] = useState(false);

  const muat = () => {
    setMemuat(true);
    fetchBantuanPemerintah().then((d) => {
      setBantuan(d);
      setMemuat(false);
    });
  };

  useEffect(() => {
    muat();
  }, []);

  const program = bantuan?.program ?? [];
  const alokasi = bantuan?.alokasi ?? [];
  const korelasi = bantuan?.korelasi ?? [];
  const totalNilai = program.reduce((s, p) => s + (p.nilaiRupiah || 0), 0);
  const adaData =
    program.length > 0 || alokasi.length > 0 || korelasi.length > 0;

  return (
    <DefaultLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Kepala halaman */}
        <div className="border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
            <Lock size={12} /> Area Internal Dinas
          </div>
          <h1 className="font-serif text-3xl font-black text-slate-800 mb-1">
            Dasbor Admin — Data Bantuan Pemerintah
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            Pusat input manual data alokasi bantuan pemerintah SISPERTANI.
            Seluruh data yang dipublish akan otomatis tampil di halaman publik{" "}
            <Link
              to="/government-assistance"
              className="underline text-blue-700 hover:text-blue-900"
            >
              Analisis Bantuan Pemerintah
            </Link>
            .
          </p>
        </div>

        {/* Kartu pintu Studio */}
        <div className="border border-blue-200 bg-blue-50 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="font-mono text-sm font-bold uppercase text-blue-900 mb-1 flex items-center gap-2">
                <Database size={16} /> Sanity Studio — Editor Data
              </h2>
              <p className="text-xs text-blue-800 max-w-xl">
                Klik tombol di samping, login dengan akun Sanity Dinas, lalu
                isi tiga jenis data: <strong>Program Bantuan</strong> (nominal
                per program kerja), <strong>Alokasi Anggaran Tahunan</strong>{" "}
                (APBD/APBN), dan <strong>Korelasi Bantuan per Sektor</strong>.
                Setiap penyimpanan tercatat otomatis (siapa, kapan, apa) di
                riwayat Sanity.
              </p>
            </div>
            <a
              href={STUDIO_URL}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 inline-flex items-center justify-center gap-2 rounded-md bg-blue-800 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 transition-colors"
            >
              Buka Studio <ExternalLink size={16} />
            </a>
          </div>
        </div>

        {/* Status data live */}
        <div className="border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-sm font-bold uppercase text-slate-700 flex items-center gap-2">
              <BarChart3 size={16} /> Status Data Saat Ini
            </h2>
            <button
              onClick={() => {
                clearBantuanCache();
                muat();
              }}
              disabled={memuat}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-[11px] font-mono font-bold uppercase text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={12} className={memuat ? "animate-spin" : ""} />
              {memuat ? "Memuat…" : "Refresh"}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="border border-slate-200 bg-slate-50 p-4 text-left">
              <span className="text-[10px] font-mono font-bold uppercase text-emerald-700 block mb-1">
                Program Bantuan
              </span>
              <span className="text-2xl font-serif font-black text-slate-800">
                {program.length}
              </span>
              <span className="text-[10px] font-mono text-slate-500 block mt-1 uppercase">
                Total {formatRupiahShort(totalNilai)}
              </span>
            </div>
            <div className="border border-slate-200 bg-slate-50 p-4 text-left">
              <span className="text-[10px] font-mono font-bold uppercase text-blue-700 block mb-1">
                Alokasi Tahunan
              </span>
              <span className="text-2xl font-serif font-black text-slate-800">
                {alokasi.length}
              </span>
              <span className="text-[10px] font-mono text-slate-500 block mt-1 uppercase">
                Tahun terisi
              </span>
            </div>
            <div className="border border-slate-200 bg-slate-50 p-4 text-left">
              <span className="text-[10px] font-mono font-bold uppercase text-purple-700 block mb-1">
                Korelasi Sektor
              </span>
              <span className="text-2xl font-serif font-black text-slate-800">
                {korelasi.length}
              </span>
              <span className="text-[10px] font-mono text-slate-500 block mt-1 uppercase">
                Sektor terisi
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 flex items-center gap-2 text-xs text-slate-500">
            <Coins size={14} />
            {bantuan === null
              ? "Memuat status…"
              : adaData
                ? `Data terakhir diperbarui per ${
                    bantuan.updatedAt
                      ? formatTanggal(bantuan.updatedAt)
                      : "-"
                  } — sumber: Sanity (project ${SANITY_PROJECT_ID}, dataset ${SANITY_DATASET}).`
                : "Belum ada data. Isi melalui Studio di atas — halaman publik akan otomatis terisi."}
          </div>

          {!adaData && bantuan !== null && (
            <p className="mt-3 text-[11px] text-slate-400 font-mono">
              Catatan: jika Anda sudah mengisi data di Studio tetapi status di
              sini tetap kosong, pastikan origin
              <code className="mx-1 px-1 bg-slate-100">
                https://pertanian.sistemdata.id
              </code>
              sudah ditambahkan pada CORS project (manage.sanity.io → Settings
              → API).
            </p>
          )}
        </div>

        {/* Alur singkat */}
        <div className="border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-mono text-sm font-bold uppercase text-slate-700 mb-4 flex items-center gap-2">
            <TrendingUp size={16} /> Alur Pengisian
          </h2>
          <ol className="space-y-3 text-sm text-slate-600">
            <li className="flex gap-3">
              <span className="font-mono font-black text-blue-800">01</span>
              <span>
                Buka <strong>Studio</strong> → login akun Sanity Dinas → pilih
                jenis data yang akan diisi.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono font-black text-blue-800">02</span>
              <span>
                Isi field sesuai label (nominal program dalam <strong>Rupiah
                penuh</strong>, alokasi & korelasi dalam <strong>Miliar</strong>).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono font-black text-blue-800">03</span>
              <span>
                Klik <strong>Publish</strong> — data langsung tersimpan ke
                Content Lake dengan stempel waktu & penulis.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono font-black text-blue-800">04</span>
              <span className="flex items-center gap-1">
                Cek hasil di halaman publik{" "}
                <Link
                  to="/government-assistance"
                  className="inline-flex items-center gap-0.5 text-blue-700 underline hover:text-blue-900"
                >
                  Analisis Bantuan Pemerintah <ArrowRight size={12} />
                </Link>{" "}
                (tekan Refresh di atas bila perlu).
              </span>
            </li>
          </ol>
        </div>
      </div>
    </DefaultLayout>
  );
}
