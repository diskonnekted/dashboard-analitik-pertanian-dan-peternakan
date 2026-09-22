import { useEffect, useState, useMemo, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, LayersControl, useMap, LayerGroup } from "react-leaflet";
import L from "leaflet";
import ReactDOMServer from "react-dom/server";
import { Search, Plus, Minus, Lock, AlertTriangle, RotateCw, ArrowUpRight } from "lucide-react";
import { LoadingSpinner } from "@/components/ui";

import "leaflet/dist/leaflet.css";
import { LahanDesa, KelompokTaniRow, fetchKelompokTani, fetchSt2023DesaExtra, St2023DesaExtra, fetchVegetableProduction, VegetableProduction } from "@/services/api";
import { buildDesaPath } from "@/services/desa";

/**
 * Link CTA ke halaman detail desa. Ditempatkan sebagai baris lebar-penuh
 * di bagian bawah popup — bukan inline di header — supaya kelihatan jelas
 * sebagai tombol, bukan label.
 *
 * CATATAN: Popup ini di-render oleh Leaflet via ReactDOMServer.renderToString
 * (bukan portal React modern), jadi tidak punya akses ke <Router> Context.
 * Untuk menghindari error "Cannot destructure basename of useContext(...) null",
 * pakai <a href> biasa, bukan <Link> dari react-router-dom. SPA fallback di
 * nginx (index.html untuk semua route) membuat full-reload tetap mulus.
 */
const DetailDesaLink = ({ desaName, kecName }: { desaName: string; kecName: string }) => {
  const path = buildDesaPath(kecName, desaName);
  return (
    <a
      href={path}
      className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 active:bg-emerald-100 px-3 py-2 text-xs font-semibold transition-colors"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Lihat Detail Lengkap
      </span>
      <ArrowUpRight className="w-3.5 h-3.5" />
    </a>
  );
};

// Label ramah untuk kunci ternak ST2023 (urutan = prioritas tampilan di popup)
const TERNAK_LABELS: [string, string][] = [
  ["sapiPotong", "Sapi"], ["sapiPerah", "Sapi Perah"], ["kerbau", "Kerbau"],
  ["kambing", "Kambing"], ["domba", "Domba"], ["babi", "Babi"], ["kuda", "Kuda"],
  ["kelinci", "Kelinci"], ["ayamRasPedaging", "Ayam Ras Pedaging"], ["ayamRasPetelur", "Ayam Ras Petelur"],
  ["ayamKampung", "Ayam Kampung"], ["itik", "Itik"], ["puyuh", "Puyuh"],
  ["angsa", "Angsa"], ["merpati", "Merpati"], ["kalkun", "Kalkun"],
  ["walet", "Walet"], ["unggasLainnya", "Unggas Lainnya"],
];

// Fix leaflet icon issues
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapWidgetProps {
  data?: LahanDesa[];
}

// Marker standar Leaflet (teardrop) dengan warna jelas
const createColoredIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
      <circle cx="12.5" cy="12.5" r="4.5" fill="#ffffff"/>
    </svg>`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });
};

// Warna marker per kategori pasar — pasar tradisional dibedakan dari kategori lain
const PASAR_MARKER_COLORS: Record<string, string> = {
  "Pasar Tradisional": "#059669", // hijau
  "Pasar Hewan": "#d97706", // amber
  "Pasar Ikan": "#0284c7", // biru
  "Pasar Unggas": "#ea580c", // oranye
  "Pasar Buah": "#e11d48", // merah muda
};

const getPointIconColor = (layer: AuxiliaryGeoJsonLayer, feature?: any) => {
  if (layer.key === "pasar") {
    const kat = feature?.properties?.kategori || "";
    return PASAR_MARKER_COLORS[kat] || layer.color;
  }
  return layer.color;
};

type AuxiliaryGeoJsonLayer = {
  key: string;
  name: string;
  file: string;
  color: string;
  fillColor: string;
  checked?: boolean;
  point?: boolean;
  lineWeight?: number;
};

const auxiliaryGeoJsonLayers: AuxiliaryGeoJsonLayer[] = [
  {
    key: "sawah",
    name: "🌾 Area Sawah",
    file: "/sawah.geojson",
    color: "#047857",
    fillColor: "#86efac",
  },
  {
    key: "kebun",
    name: "🌳 Area Kebun",
    file: "/kebun.geojson",
    color: "#166534",
    fillColor: "#22c55e",
  },
  {
    key: "ladang",
    name: "🌽 Area Ladang",
    file: "/ladang.geojson",
    color: "#a16207",
    fillColor: "#facc15",
  },
  {
    key: "danau",
    name: "💧 Area Danau/Waduk",
    file: "/danau.geojson",
    color: "#1d4ed8",
    fillColor: "#60a5fa",
    checked: true,
  },
  {
    key: "bangunan",
    name: "🏢 Area Bangunan",
    file: "/bangunan_area.geojson",
    color: "#525252",
    fillColor: "#a3a3a3",
  },
  {
    key: "tonggak",
    name: "📍 Tonggak Kilometer",
    file: "/tonggak-kilometer.geojson",
    color: "#dc2626",
    fillColor: "#f87171",
    point: true,
  },
  {
    key: "pasar",
    name: "🛒 Pasar",
    file: "/data/pasar-banjarnegara.geojson",
    color: "#c2410c",
    fillColor: "#fb923c",
    point: true,
    checked: true,
  },
  {
    key: "jalan",
    name: "🛣️ Jalan",
    file: "/jalan.geojson",
    color: "#9ca3af",
    fillColor: "#9ca3af",
    lineWeight: 1,
  },
  {
    key: "sungai",
    name: "🌊 Sungai",
    file: "/sungai.geojson",
    color: "#3b82f6",
    fillColor: "#3b82f6",
    lineWeight: 1.5,
  },
  {
    key: "air-permukaan",
    name: "💦 Air Permukaan",
    file: "/banjarnegara-air-permukaan.geojson",
    color: "#0ea5e9",
    fillColor: "#7dd3fc",
    lineWeight: 1.5,
  },
];

// Target hasil pencarian desa untuk fly-to + highlight
type DesaSearchTarget = {
  name: string;          // nama desa apa adanya dari GeoJSON
  kec: string;           // kecamatan (pembeda desa kembar antar-kecamatan)
  bounds: L.LatLngBounds;
  token: number;         // berubah tiap pemilihan â†’ memicu ulang efek flyTo
};

/**
 * SearchFlyTo â€” saat user memilih desa dari dropdown pencarian, peta
 * "terbang" (flyToBounds) ke polygon desa tsb lalu membuka popup-nya.
 * Timeout (bukan moveend) dipakai agar popup tetap terbuka walau kamera
 * tidak berpindah (mis. memilih desa yang sama dua kali).
 */
const SearchFlyTo = ({ target, geoJsonRef }: { target: DesaSearchTarget | null; geoJsonRef: { current: L.GeoJSON | null } }) => {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyToBounds(target.bounds, { padding: [60, 60], maxZoom: 15, duration: 1.1 });
    const t = setTimeout(() => {
      const gj = geoJsonRef.current;
      if (!gj) return;
      gj.eachLayer((lyr: any) => {
        const f = lyr?.feature;
        if (!f) return;
        const nm = f.properties?.Nama_Desa_ || f.properties?.Name || "";
        const kc = f.properties?.Kecamatan || "";
        if (nm === target.name && kc === target.kec && lyr.openPopup) lyr.openPopup();
      });
    }, 1200);
    return () => clearTimeout(t);
  }, [target, map, geoJsonRef]);
  return null;
};

const MapBounds = ({ data }: { data: any }) => {
  const map = useMap();
  useEffect(() => {
    if (!data || !data.features || data.features.length === 0) return;

    const fit = () => {
      try {
        const layer = L.geoJSON(data);
        const bounds = layer.getBounds();
        if (!bounds.isValid()) return;
        // Paskan peta ke bounds Banjarnegara dengan padding minimal
        // (8 px). Lalu zoom in 2 step dari hasil fit supaya polygon
        // lebih proporsional dengan frame.
        map.fitBounds(bounds, { padding: [8, 8] });
        const z = map.getZoom();
        map.setZoom(Math.min(z + 2, 18));
        map.setMaxZoom(18);
      } catch (err) {
        console.error("Gagal mendapatkan bounds peta", err);
      }
    };

    // Fit langsung jika container sudah terukur; kalau belum, coba ulang sebentar lagi
    if (map.getSize() && map.getSize().x > 0) {
      fit();
    } else {
      const id = setTimeout(fit, 120);
      return () => clearTimeout(id);
    }
  }, [data, map]);
  return null;
};

// Bridge antara tombol zoom kustom (DOM) dengan instance Leaflet.
// Mengunci zoom: hanya bisa dilakukan dengan Ctrl+scroll atau Ctrl+klik tombol.
const ZoomBridge = ({ onLockChange }: { onLockChange?: (locked: boolean) => void }) => {
  const map = useMap();
  useEffect(() => {
    // 1. Matikan double-click zoom & touch zoom bawaan Leaflet
    map.doubleClickZoom.disable();
    map.touchZoom.disable();

    // 2. Pantau status tombol Ctrl/Cmd secara global
    const ctrlState = { down: false };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Control" || e.key === "Meta") {
        if (!ctrlState.down) {
          ctrlState.down = true;
          onLockChange?.(false);
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Control" || e.key === "Meta") {
        if (ctrlState.down) {
          ctrlState.down = false;
          onLockChange?.(true);
        }
      }
    };
    const onBlur = () => {
      if (ctrlState.down) {
        ctrlState.down = false;
        onLockChange?.(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    // 3. Kunci scroll-wheel zoom — hanya aktif saat Ctrl ditekan
    map.scrollWheelZoom.disable();
    const container = map.getContainer();
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || ctrlState.down) {
        e.preventDefault();
        if (e.deltaY < 0) map.zoomIn();
        else if (e.deltaY > 0) map.zoomOut();
      }
    };
    container.addEventListener("wheel", onWheel, { passive: false });

    // 4. Handler tombol zoom kustom — hanya aktif saat Ctrl ditekan
    const onZoomIn = () => { if (ctrlState.down) map.zoomIn(); };
    const onZoomOut = () => { if (ctrlState.down) map.zoomOut(); };
    window.addEventListener("map:zoom-in", onZoomIn);
    window.addEventListener("map:zoom-out", onZoomOut);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      container.removeEventListener("wheel", onWheel);
      window.removeEventListener("map:zoom-in", onZoomIn);
      window.removeEventListener("map:zoom-out", onZoomOut);
    };
  }, [map, onLockChange]);
  return null;
};

// --- Rich Popup Component (2 kolom: Lahan | SDM & Kelembagaan) ---
// Tampilan "dashboard card": baris dengan titik warna, nilai tebal rata kanan.
const MetricRow = ({ label, value, sub, dot = "bg-slate-300", tip }: { label: string, value: string, sub?: string, dot?: string, tip?: string }) => {
  return (
    <div
      className={`flex items-center justify-between gap-2 py-[4px] border-b border-dotted border-slate-100 last:border-0 ${tip ? "cursor-help" : ""}`}
      title={tip}
    >
      <span className="flex items-center gap-1.5 min-w-0">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
        <span className={`text-slate-600 text-[11px] truncate ${tip ? "underline decoration-dotted decoration-slate-300 underline-offset-2" : ""}`}>{label}</span>
      </span>
      <span className="text-slate-900 text-[11px] font-bold tabular-nums whitespace-nowrap shrink-0">
        {value}
        {sub && <span className="text-slate-400 font-medium text-[9px] ml-0.5">{sub}</span>}
      </span>
    </div>
  );
};

const SectionHeader = ({ icon, label, color }: { icon: string, label: string, color: string }) => (
  <div className="flex items-center gap-1.5 mb-1">
    <span className="text-[12px] leading-none">{icon}</span>
    <p className={`text-[10px] font-black uppercase tracking-wider ${color}`}>{label}</p>
  </div>
);

const HeroStat = ({ label, value, unit }: { label: string, value: string, unit: string }) => (
  <div className="rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 px-2.5 py-2 shadow-sm">
    <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">{label}</p>
    <p className="text-[22px] font-black text-emerald-800 leading-none tabular-nums mt-1">
      {value}
      <span className="text-[11px] font-semibold text-emerald-500 ml-1">{unit}</span>
    </p>
  </div>
);

// ——— Foto ilustrasi karakter desa (popup dasbor) ———
// File: public/img/minidesa-min (hasil kompresi scripts/compress-minidesa.py;
// foto mentah pengguna di public/img/minidesa dibiarkan utuh).
// Kategori ditentukan dari data: komposisi lahan ST2023 T4.10 (sawah vs ladang),
// rasio RT budidaya ikan (Sensus ST2023), dan sentra sayuran kecamatan (Distankan).
type DesaFotoKategori = "sawah" | "ladang" | "kentang" | "kobis" | "kolam";

const DESA_FOTO_FILES: Record<DesaFotoKategori, string[]> = {
  sawah: ["sawah1.jpg", "sawah2.jpg", "sawah4.jpg", "sawah5.jpg", "sawah6.jpg", "sawah7.jpg", "sawah8.jpg", "sawah9.jpg"],
  ladang: ["ladang1.jpg", "ladang3.jpg", "ladang4.jpg", "ladang5.jpg", "ladang7.jpg", "ladang8.jpg", "ladang9.jpg"],
  kentang: ["kentang1.jpg", "kentang2.jpg", "kentang5.jpg", "kentang6.jpg"],
  kobis: ["kobis1.jpg", "kobis5.jpg", "kobis6.jpg"],
  kolam: ["kolam1.jpg", "kolam4.jpg", "kolam5.jpg"],
};

const DESA_FOTO_LABEL: Record<DesaFotoKategori, string> = {
  sawah: "dominasi sawah (padi)",
  ladang: "dominasi ladang / lahan kering",
  kentang: "sentra kentang kecamatan",
  kobis: "sentra kubis kecamatan",
  kolam: "dominasi budidaya ikan (kolam)",
};

// Dominasi sayuran per kecamatan: komoditas dengan tonase terbesar (dari 8 jenis)
// dan share >= 35% -> sentra foto (hanya kentang/kubis yang tersedia fotonya).
function buildKecVegMap(rows: VegetableProduction[]): Record<string, "kentang" | "kubis"> {
  const KEYS: (keyof VegetableProduction)[] = ["bawangMerah", "cabaiBesar", "kentang", "kubis", "petsai", "tomat", "bawangPutih", "cabaiRawit"];
  const agg: Record<string, Record<string, number>> = {};
  for (const r of rows || []) {
    const kec = (r.kecamatan || "").trim().toLowerCase();
    if (!kec || kec === "jumlah" || kec === "total") continue;
    const e = (agg[kec] ??= {});
    for (const k of KEYS) e[k] = (e[k] || 0) + ((r[k] as number) || 0);
  }
  const map: Record<string, "kentang" | "kubis"> = {};
  for (const [kec, e] of Object.entries(agg)) {
    let total = 0;
    let bestKey: string | null = null;
    let bestVal = 0;
    for (const [k, v] of Object.entries(e)) {
      total += v;
      if (v > bestVal) {
        bestVal = v;
        bestKey = k;
      }
    }
    if (total > 0 && bestKey && bestVal / total >= 0.35) {
      if (bestKey === "kentang") map[kec] = "kentang";
      else if (bestKey === "kubis") map[kec] = "kubis";
    }
  }
  return map;
}

// Prioritas kategori foto: (1) mayoritas RT petani menekuni budidaya ikan -> kolam,
// (2) lahan sawah >= 50% lahan usaha tani -> sawah, (3) lahan kering dominan ->
// sentra sayuran kecamatan (kentang/kubis), sisanya ladang umum.
function pickDesaFotoKategori(args: { data: any; st2023?: St2023DesaExtra | null; kecVeg?: "kentang" | "kubis" | null }): DesaFotoKategori | null {
  const rtBud = args.st2023?.rtPerikananBudidaya ?? 0;
  const rtPetani = args.st2023?.rumahTanggaPetani ?? 0;
  if (rtBud > 0 && rtPetani > 0 && rtBud / rtPetani >= 0.5) return "kolam";
  const sawah = args.data?.lahanSawah ?? 0;
  const bukanSawah = args.data?.lahanBukanSawah ?? 0;
  const totalLahan = sawah + bukanSawah;
  if (totalLahan > 0 && sawah / totalLahan >= 0.5) return "sawah";
  if (args.kecVeg === "kentang") return "kentang";
  if (args.kecVeg === "kubis") return "kobis";
  if (!args.data && !args.st2023 && !args.kecVeg) return null; // tanpa sinyal apa pun
  return "ladang";
}

// Varian foto deterministik per desa (hash nama) — konsisten antar buka popup.
function pickDesaFotoFile(kategori: DesaFotoKategori, key: string): string {
  const files = DESA_FOTO_FILES[kategori];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return `/img/minidesa-min/${files[h % files.length]}`;
}

const PopupContent = ({ desaName, kecName, data, taniData, st2023, kecVeg }: { desaName: string, kecName: string, data: any, taniData?: KelompokTaniRow | null, st2023?: St2023DesaExtra | null, kecVeg?: "kentang" | "kubis" | null }) => {
  // Kec. Karangkobar & Madukara: sumber resmi (CKAN) hanya punya total, tanpa rincian
  const rincianTersedia = data && !(data.lahanSawah === 0 && data.lahanBukanSawah === 0 && data.jumlah > 0);
  const topTernak = st2023
    ? TERNAK_LABELS
        .map(([k, label]) => [label, st2023.ternak?.[k] ?? 0] as [string, number])
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
    : [];

  // Foto ilustrasi karakter desa — kategori dari data, varian file deterministik per desa
  const fotoKategori = pickDesaFotoKategori({ data, st2023, kecVeg });
  const fotoSrc = fotoKategori ? pickDesaFotoFile(fotoKategori, `${kecName}|${desaName}`) : null;

  const sentraBadge = !rincianTersedia
    ? null
    : data.lahanSawah > 100
      ? "🌟 SENTRA PADI"
      : data.lahanBukanSawah > 100
        ? "🌟 SENTRA PALAWIJA"
        : "POTENSI BERKEMBANG";

  return (
    <div className="font-sans w-[440px] max-w-[90vw]">
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 text-white px-3 py-2.5 shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-[16px] font-black leading-tight uppercase drop-shadow-sm">{desaName}</h3>
            <p className="text-emerald-200/90 text-[10px] font-bold uppercase tracking-[0.18em]">{kecName}</p>
          </div>
          {sentraBadge && (
            <span className="shrink-0 bg-amber-300 text-amber-900 text-[9px] font-black uppercase rounded-full px-2 py-1 shadow-sm">
              {sentraBadge}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-3">
        {/* ===== KOLOM KIRI: LAHAN ===== */}
        <div>
          <SectionHeader icon="🌾" label="Lahan Usaha Tani" color="text-emerald-700" />
          {data ? (
            rincianTersedia ? (
              <>
                <MetricRow label="Sawah" value={`${data.lahanSawah.toLocaleString('id-ID')}`} sub="Ha" dot="bg-emerald-400" />
                <MetricRow label="Ladang / Lain" value={`${data.lahanBukanSawah.toLocaleString('id-ID')}`} sub="Ha" dot="bg-teal-400" />
                {data.tanamanTahunan != null && data.tanamanTahunan > 0 && (
                  <MetricRow label="Tanaman Tahunan" value={`${data.tanamanTahunan.toLocaleString('id-ID')}`} sub="Ha" dot="bg-lime-600" />
                )}
                <div className="mt-2">
                  <HeroStat label="Total Dikuasai" value={data.jumlah.toLocaleString('id-ID')} unit="Ha" />
                </div>
              </>
            ) : (
              <>
                <div className="mt-0.5">
                  <HeroStat label="Total Dikuasai" value={data.jumlah.toLocaleString('id-ID')} unit="Ha" />
                </div>
                <p className="text-[9px] italic text-slate-400 leading-snug mt-1">
                  Rincian per jenis lahan belum tersedia
                </p>
              </>
            )
          ) : (
            <p className="text-[11px] italic text-slate-400">Data lahan tidak tersedia</p>
          )}
          {data?.tahun && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[9px] text-slate-400">
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              Sumber: BPS ST2023 T4.10 {data.tahun}
            </p>
          )}
          {fotoKategori && fotoSrc && (
            <figure className="mt-2.5">
              <img
                src={fotoSrc}
                alt={`Foto ilustrasi desa — ${DESA_FOTO_LABEL[fotoKategori]}`}
                className="h-28 w-full rounded-lg object-cover shadow-sm"
                loading="lazy"
              />
              <figcaption className="mt-1 text-[9px] leading-tight text-slate-400">
                Foto ilustrasi — {DESA_FOTO_LABEL[fotoKategori]}
              </figcaption>
            </figure>
          )}
        </div>

        {/* ===== KOLOM KANAN: SDM & KELEMBAGAAN ===== */}
        <div>
          <SectionHeader icon="👥" label="Kelembagaan" color="text-blue-700" />
          {taniData ? (
            <>
              <MetricRow label="Kelompok Tani" value={`${taniData.kelompokTani}`} dot="bg-blue-500" />
              <MetricRow label="Anggota Tani" value={taniData.anggotaTani.toLocaleString('id-ID')} dot="bg-blue-400" tip="Jumlah orang yang tergabung dalam kelompok tani. Ini bagian (subset) dari jumlah Petani hasil Sensus BPS — tidak semua petani masuk kelompok." />
              <MetricRow label="Gapoktan" value={`${taniData.gapoktan}`} dot="bg-indigo-400" />
              <MetricRow label="Anggota Gapoktan" value={taniData.anggotaGapoktan.toLocaleString('id-ID')} dot="bg-indigo-300" />
              {(taniData.kelompokPerikanan || 0) > 0 && (
                <MetricRow label="Kelompok Perikanan" value={`${taniData.kelompokPerikanan}`} dot="bg-cyan-400" />
              )}
              {(taniData.kelompokTaniHutan || 0) > 0 && (
                <MetricRow label="Kelp. Tani Hutan" value={`${taniData.kelompokTaniHutan}`} dot="bg-green-500" />
              )}
            </>
          ) : (
            !st2023 && <p className="text-[11px] italic text-slate-400">Data kelembagaan tidak tersedia</p>
          )}

          {st2023 && (
            <div className="mt-2.5">
              <SectionHeader icon="📊" label="Sensus 2023" color="text-orange-600" />
              {(st2023.petani ?? 0) > 0 && (
                <MetricRow label="Petani" value={st2023.petani!.toLocaleString('id-ID')} sub="org" dot="bg-orange-500" tip="Jumlah seluruh petani perseorangan di desa ini (hasil Sensus Pertanian 2023 BPS) — dihitung per orang." />
              )}
              {(st2023.rumahTanggaPetani ?? 0) > 0 && (
                <MetricRow label="RT Petani" value={st2023.rumahTanggaPetani!.toLocaleString('id-ID')} sub="RT" dot="bg-amber-400" tip="Jumlah rumah tangga petani (per rumah tangga, bukan per orang). Satu rumah tangga bisa memiliki lebih dari satu petani." />
              )}
              {st2023.rtAnggotaKelompok !== undefined && (
                <MetricRow
                  label="RT Anggota"
                  value={st2023.rtAnggotaKelompok.toLocaleString('id-ID')}
                  sub={`/ ${st2023.rtup?.toLocaleString('id-ID')} RTUP`}
                  dot="bg-orange-300"
                  tip={`Rumah tangga yang menjadi anggota kelompok (dari total ${st2023.rtup?.toLocaleString('id-ID')} Rumah Tangga Usaha Pertanian / RTUP).`}
                />
              )}
              {(st2023.rtPerikanan ?? 0) > 0 && (
                <MetricRow label="RT Perikanan" value={st2023.rtPerikanan!.toLocaleString('id-ID')} sub="RT" dot="bg-cyan-400" />
              )}
              {topTernak.length > 0 && (
                <>
                  <p className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-orange-600">
                    <span>🐄</span> Ternak
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {topTernak.map(([label, v]) => (
                      <span key={label} className="text-[9px] font-semibold bg-orange-50 border border-orange-200 text-orange-700 rounded-full px-1.5 py-0.5">
                        {`${label} ${v.toLocaleString('id-ID')}`}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {(taniData || st2023) && (
            <p className="mt-2.5 text-[9px] leading-snug text-slate-400 border-t border-slate-100 pt-1.5">
              <span className="font-semibold text-slate-500">ℹ️ </span>
              Kelembagaan (data dinas) &amp; Sensus (BPS) adalah dua sumber berbeda — jumlah
              "Anggota Tani" hanya sebagian dari total "Petani" (tidak semua petani tergabung kelompok tani).
            </p>
          )}
        </div>
      </div>

      {/* Footer CTA — link ke halaman detail desa */}
      <DetailDesaLink desaName={desaName} kecName={kecName} />
    </div>
  );
};

export const MapWidget = ({ data = [] }: MapWidgetProps) => {
  const [desaGeoData, setDesaGeoData] = useState<any>(null);
  const [kecGeoData, setKecGeoData] = useState<any>(null);
  const [auxiliaryLayers, setAuxiliaryLayers] = useState<Record<string, any>>({});
  const [taniData, setTaniData] = useState<KelompokTaniRow[]>([]);
  const [st2023Data, setSt2023Data] = useState<St2023DesaExtra[]>([]);
  const [kecVegMap, setKecVegMap] = useState<Record<string, "kentang" | "kubis">>({});
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  
  // States for interactive features
  const [activeMetric, setActiveMetric] = useState<"lahanSawah" | "lahanBukanSawah" | "jumlah">("lahanSawah");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchTarget, setSearchTarget] = useState<DesaSearchTarget | null>(null);
  const desaGeoJsonRef = useRef<L.GeoJSON | null>(null);

  // Indeks pencarian desa dari GeoJSON (nama + kecamatan + referensi feature)
  const desaSearchIndex = useMemo(() => {
    if (!desaGeoData?.features) return [] as { name: string; kec: string; feature: any }[];
    const list: { name: string; kec: string; feature: any }[] = [];
    for (const f of desaGeoData.features) {
      const name = f.properties?.Nama_Desa_ || f.properties?.Name;
      if (!name) continue;
      list.push({ name: String(name), kec: String(f.properties?.Kecamatan || ""), feature: f });
    }
    list.sort((a, b) => a.name.localeCompare(b.name, "id"));
    return list;
  }, [desaGeoData]);

  // Hasil dropdown â€” maks 8; cocok-awalan didahulukan, lalu substring.
  // "DESA "/"KELURAHAN " diabaikan saat pencocokan awalan.
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toUpperCase();
    if (q.length < 2) return [] as typeof desaSearchIndex;
    const starts: typeof desaSearchIndex = [];
    const contains: typeof desaSearchIndex = [];
    for (const item of desaSearchIndex) {
      const nm = item.name.toUpperCase();
      if (nm.startsWith(q) || nm.replace(/^(DESA|KELURAHAN)\s+/, "").startsWith(q)) starts.push(item);
      else if (nm.includes(q)) contains.push(item);
    }
    return [...starts, ...contains].slice(0, 8);
  }, [desaSearchIndex, searchQuery]);

  // Pilih desa â†’ set filter + target fly-to
  const handleSelectDesa = (item: { name: string; kec: string; feature: any }) => {
    try {
      const bounds = L.geoJSON(item.feature).getBounds();
      if (!bounds.isValid()) return;
      setSearchQuery(item.name);
      setShowSearchDropdown(false);
      setSearchTarget({ name: item.name, kec: item.kec, bounds, token: Date.now() });
    } catch (err) {
      console.error("Gagal menghitung batas desa:", err);
    }
  };
  const [activeLegendCategory, setActiveLegendCategory] = useState<number | null>(null);
  const [zoomLocked, setZoomLocked] = useState(true); // true = terkunci (Ctrl dibutuhkan)

  const coreMapLoading = !desaGeoData && !mapLoadError;
  const handleRetry = () => {
    setMapLoadError(null);
    setReloadToken((t) => t + 1);
  };

  useEffect(() => {
    // Load GeoJSON with localStorage cache fallback
    const loadGeoJSON = async (url: string, cacheKey: string, setter: (d: any) => void): Promise<boolean> => {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try { setter(JSON.parse(cached)); return true; } catch {}
      }
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch {}
        setter(data);
        return true;
      } catch (err) {
        console.error(`Gagal memuat ${url}:`, err);
        return false;
      }
    };

    Promise.all([
      loadGeoJSON("/peta_desa_v3.geojson", "geojson_desa_cache", setDesaGeoData),
      loadGeoJSON("/peta_kecamatan.geojson", "geojson_kec_cache", setKecGeoData),
    ]).then(([desaOk]) => {
      if (!desaOk) {
        setMapLoadError("Peta batas desa gagal dimuat. Periksa koneksi internet Anda, lalu coba lagi.");
      }
    });
    Promise.all(
      auxiliaryGeoJsonLayers.map(async (layer) => {
        const cacheKey = `geojson_aux_${layer.key}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try { return [layer.key, JSON.parse(cached)] as const; } catch {}
        }
        const res = await fetch(layer.file);
        if (!res.ok) throw new Error(`Gagal memuat ${layer.file}`);
        const data = await res.json();
        try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch {}
        return [layer.key, data] as const;
      }),
    )
      .then((entries) => setAuxiliaryLayers(Object.fromEntries(entries)))
      .catch((err) => console.error("Gagal memuat layer GeoJSON tambahan:", err));
    fetchKelompokTani().then(setTaniData).catch((err) => console.error("Gagal memuat data kelompok tani:", err));
    fetchSt2023DesaExtra().then(setSt2023Data).catch((err) => console.error("Gagal memuat data ST2023 per-desa:", err));
    // Sentra sayuran per kecamatan (kentang/kubis) untuk foto ilustrasi popup desa
    fetchVegetableProduction()
      .then((rows) => setKecVegMap(buildKecVegMap(rows)))
      .catch((err) => console.error("Gagal memuat data sayuran per kecamatan:", err));
  }, [reloadToken]);

  const isKecamatanMatch = (kecGeo: string, kecCsv: string) => {
    if (!kecGeo || !kecCsv) return true;
    const clean = (s: string) => s.toLowerCase().replace(/kecamatan|kec|\.|\s|-/gi, "");
    const g = clean(kecGeo);
    const c = clean(kecCsv);
    return g === c || g.includes(c) || c.includes(g);
  };

  const getDesaData = (feature: any) => {
    if (!data || data.length === 0) return null;
    let namaDesaGeo = feature.properties?.Nama_Desa_ || feature.properties?.Name || "";
    namaDesaGeo = namaDesaGeo.toUpperCase().replace("DESA ", "").replace("KELURAHAN ", "").trim();

    let matched = data.find((d) =>
        namaDesaGeo.includes(d.desa.toUpperCase().trim()) && d.desa.length > 2 && isKecamatanMatch(feature.properties?.Kecamatan, d.kecamatan)
    );

    if (!matched) {
      const sanitize = (str: string) => str.replace(/[AEIOU\s-]/gi, "");
      const geoSanitized = sanitize(namaDesaGeo);
      matched = data.find((d) => {
        const dSanitized = sanitize(d.desa.toUpperCase());
        return (dSanitized.length > 3 && isKecamatanMatch(feature.properties?.Kecamatan, d.kecamatan) && (geoSanitized.includes(dSanitized) || dSanitized.includes(geoSanitized)));
      });
    }
    return matched;
  };

  const getDesaTaniData = (feature: any): KelompokTaniRow | null => {
    if (!taniData || taniData.length === 0) return null;
    let namaDesaGeo = feature.properties?.Nama_Desa_ || feature.properties?.Name || "";
    namaDesaGeo = namaDesaGeo.toUpperCase().replace("DESA ", "").replace("KELURAHAN ", "").trim();

    let matched = taniData
      .filter((d) => d.desa && d.desa.length > 2)
      .find((d) =>
        namaDesaGeo.includes(d.desa.toUpperCase().trim()) && isKecamatanMatch(feature.properties?.Kecamatan, d.kecamatan)
      );

    if (!matched) {
      const sanitize = (str: string) => str.replace(/[AEIOU\s-]/gi, "");
      const geoSanitized = sanitize(namaDesaGeo);
      matched = taniData.find((d) => {
        const dSanitized = sanitize(d.desa.toUpperCase());
        return (dSanitized.length > 3 && isKecamatanMatch(feature.properties?.Kecamatan, d.kecamatan) && (geoSanitized.includes(dSanitized) || dSanitized.includes(geoSanitized)));
      });
    }
    return matched || null;
  };

  const getDesaSt2023 = (feature: any): St2023DesaExtra | null => {
    if (!st2023Data || st2023Data.length === 0) return null;
    let namaDesaGeo = feature.properties?.Nama_Desa_ || feature.properties?.Name || "";
    namaDesaGeo = namaDesaGeo.toUpperCase().replace("DESA ", "").replace("KELURAHAN ", "").trim();

    let matched = st2023Data
      .filter((d) => d.desa && d.desa.length > 2)
      .find((d) =>
        namaDesaGeo.includes(d.desa.toUpperCase().trim()) && isKecamatanMatch(feature.properties?.Kecamatan, d.kecamatan)
      );

    if (!matched) {
      const sanitize = (str: string) => str.replace(/[AEIOU\s-]/gi, "");
      const geoSanitized = sanitize(namaDesaGeo);
      matched = st2023Data.find((d) => {
        const dSanitized = sanitize(d.desa.toUpperCase());
        return (dSanitized.length > 3 && isKecamatanMatch(feature.properties?.Kecamatan, d.kecamatan) && (geoSanitized.includes(dSanitized) || dSanitized.includes(geoSanitized)));
      });
    }
    return matched || null;
  };

  const getDesaStyle = (feature: any) => {
    const desaData = getDesaData(feature);
    const desaName = (feature.properties?.Nama_Desa_ || feature.properties?.Name || "").toUpperCase();
    
    // Default style — polygon sudah besar, garis batas dibuat tipis (0.7)
    let fillColor = "#cccccc";
    let fillOpacity = 0.4;
    let weight = 0.7;
    let opacity = 1;
    let borderColor = "#1f2937";

    // Smart Filter: Search matching
    const matchesSearch = searchQuery === "" || desaName.includes(searchQuery.toUpperCase());
    
    if (desaData) {
      const metricValue = desaData[activeMetric] || 0;
      let category = 0; // 0 = lowest, 3 = highest

      if (activeMetric === "lahanSawah") {
        if (metricValue > 100) { fillColor = "#12a150"; category = 3; }
        else if (metricValue > 50) { fillColor = "#17c964"; category = 2; }
        else if (metricValue > 10) { fillColor = "#70e09b"; category = 1; }
        else { fillColor = "#f5a524"; category = 0; }
      } else if (activeMetric === "lahanBukanSawah") {
        if (metricValue > 150) { fillColor = "#c27a13"; category = 3; }
        else if (metricValue > 80) { fillColor = "#f5a524"; category = 2; }
        else if (metricValue > 30) { fillColor = "#f5d562"; category = 1; }
        else { fillColor = "#fef08a"; category = 0; }
      } else { 
        if (metricValue > 300) { fillColor = "#047857"; category = 3; }
        else if (metricValue > 150) { fillColor = "#059669"; category = 2; }
        else if (metricValue > 60) { fillColor = "#34d399"; category = 1; }
        else { fillColor = "#6ee7b7"; category = 0; }
      }

      // Smart Filter: Interactive Legend Check
      const matchesLegend = activeLegendCategory === null || activeLegendCategory === category;

      if (matchesSearch && matchesLegend) {
        fillOpacity = 0.7;
        weight = 0.7;
        opacity = 1;
      } else {
        // Mute if not matching search or legend — tetap
        // terlihat dengan outline yang lebih tipis
        fillOpacity = 0.2;
        opacity = 0.5;
        fillColor = "#a1a1aa";
      }
    } else {
      // No Data behavior
      if (!matchesSearch) {
        fillOpacity = 0.1;
        opacity = 0.3;
      }
    }

    // Desa terpilih dari pencarian: highlight biru tegas
    if (searchTarget && desaName === searchTarget.name.toUpperCase() && (feature.properties?.Kecamatan || "") === searchTarget.kec) {
      fillColor = "#2563eb";
      fillOpacity = 0.65;
      weight = 3;
      opacity = 1;
      borderColor = "#1d4ed8";
    }

    return {
      fillColor,
      weight,
      opacity,
      color: borderColor,
      dashArray: "",
      fillOpacity,
    };
  };

  const kecStyle = {
    fill: false,
    color: "#9f1239",
    weight: 0.7,
    opacity: 0.85,
    dashArray: "6 4",
  };

  const getAuxiliaryStyle = (layer: AuxiliaryGeoJsonLayer, feature?: any) => {
    const geomType = feature?.geometry?.type;
    const isLine = geomType === "LineString" || geomType === "MultiLineString";
    if (isLine) {
      return {
        color: layer.color,
        weight: layer.lineWeight ?? 1.5,
        opacity: 0.85,
        fill: false,
      };
    }
    return {
      color: layer.color,
      fillColor: layer.fillColor,
      weight: 1,
      opacity: 0.85,
      fillOpacity: 0.35,
    };
  };

  const getAuxiliaryPopup = (feature: any, layerName: string) => {
    const props = feature.properties || {};

    // Popup khusus marker Pasar (properties: name, kategori, alamat)
    if (props.kategori || props.alamat) {
      const katColors: Record<string, string> = {
        "Pasar Tradisional": "bg-emerald-100 text-emerald-700 border-emerald-200",
        "Pasar Hewan": "bg-amber-100 text-amber-700 border-amber-200",
        "Pasar Ikan": "bg-sky-100 text-sky-700 border-sky-200",
        "Pasar Unggas": "bg-orange-100 text-orange-700 border-orange-200",
        "Pasar Buah": "bg-rose-100 text-rose-700 border-rose-200",
      };
      const kat = props.kategori || "Pasar";
      const badge = katColors[kat] || "bg-neutral-100 text-neutral-600 border-neutral-200";
      const nama = props.name || props.NAMOBJ || "Pasar tanpa nama";
      const alamat = props.alamat || null;
      return `
        <div class="font-sans min-w-[220px]">
          <p class="text-[9px] font-mono font-bold text-orange-600 uppercase">🛒 Pasar</p>
          <h4 class="font-black text-[15px] leading-tight mb-1.5">${nama}</h4>
          <span class="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge}">${kat}</span>
          ${alamat ? `<p class="text-[11px] text-neutral-500 mt-2 leading-snug">${alamat}</p>` : ""}
        </div>
      `;
    }

    // Air permukaan (OSM tags: props.tags)
    if (props.tags) {
      const tags = props.tags || {};
      const nama = tags.name || tags.designation || "Air permukaan";
      const kind = tags.waterway || tags.natural || tags.landuse || tags.leisure || tags.man_made || "-";
      return `
        <div class="font-sans min-w-[190px]">
          <p class="text-[9px] font-mono font-bold text-sky-600 uppercase">💦 Air Permukaan</p>
          <h4 class="font-black text-sm uppercase leading-tight mb-1">${nama}</h4>
          <div class="w-full h-0.5 bg-[#e2e8f0] my-2"></div>
          <p class="text-xs text-neutral-600"><b>Jenis:</b> ${kind}</p>
        </div>
      `;
    }

    // Jalan & sungai (punya props.type)
    if (props.type) {
      const nama = props.name || "Tanpa nama";
      return `
        <div class="font-sans min-w-[190px]">
          <p class="text-[9px] font-mono font-bold text-neutral-500 uppercase">${layerName}</p>
          <h4 class="font-black text-sm uppercase leading-tight mb-1">${nama}</h4>
          <div class="w-full h-0.5 bg-[#e2e8f0] my-2"></div>
          <p class="text-xs text-neutral-600"><b>Jenis:</b> ${props.type}</p>
          ${props.ref ? `<p class="text-xs text-neutral-600"><b>Ruas:</b> ${props.ref}</p>` : ""}
        </div>
      `;
    }

    const nama = props.NAMOBJ || props.Nama_Desa_ || props.Kecamatan || props.Name || "Objek tanpa nama";
    const remark = props.REMARK || props.JNSKBN || props.JNSSWH || props.FCODE || "-";
    const area = props.SHAPE_Area ? Number(props.SHAPE_Area).toLocaleString("id-ID") : null;

    return `
      <div class="font-sans min-w-[190px]">
        <p class="text-[9px] font-mono font-bold text-neutral-500 uppercase">${layerName}</p>
        <h4 class="font-black text-sm uppercase leading-tight mb-1">${nama}</h4>
        <div class="w-full h-0.5 bg-[#e2e8f0] my-2"></div>
        <p class="text-xs text-neutral-600"><b>Keterangan:</b> ${remark}</p>
        ${area ? `<p class="text-xs text-neutral-600"><b>Luas:</b> ${area}</p>` : ""}
      </div>
    `;
  };

  // Legend Configuration based on active metric
  const legendConfig = useMemo(() => {
    if (activeMetric === "lahanSawah") {
      return [
        { label: "> 100 Ha", color: "#12a150", cat: 3 },
        { label: "50 - 100 Ha", color: "#17c964", cat: 2 },
        { label: "10 - 50 Ha", color: "#70e09b", cat: 1 },
        { label: "< 10 Ha", color: "#f5a524", cat: 0 },
      ];
    }
    if (activeMetric === "lahanBukanSawah") {
      return [
        { label: "> 150 Ha", color: "#c27a13", cat: 3 },
        { label: "80 - 150 Ha", color: "#f5a524", cat: 2 },
        { label: "30 - 80 Ha", color: "#f5d562", cat: 1 },
        { label: "< 30 Ha", color: "#fef08a", cat: 0 },
      ];
    }
    return [
      { label: "> 300 Ha", color: "#047857", cat: 3 },
      { label: "150 - 300 Ha", color: "#059669", cat: 2 },
      { label: "60 - 150 Ha", color: "#34d399", cat: 1 },
      { label: "< 60 Ha", color: "#6ee7b7", cat: 0 },
    ];
  }, [activeMetric]);

  return (
    <div className="flex flex-col h-full w-full relative group/map">
      
      {/* --- TOP LEFT: Gabungan Zoom + Dropdown Layer Metrik (sejajar horizontal) --- */}
      <div className="absolute top-3 left-3 z-[1000] flex items-stretch gap-1.5">
        {/* Custom Zoom Buttons (terkunci — perlu Ctrl) */}
        <div className={`flex flex-col bg-white border shadow-sm rounded-lg overflow-hidden transition-colors ${zoomLocked ? "border-amber-300" : "border-emerald-400"}`}>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("map:zoom-in"))}
            className={`w-8 h-8 flex items-center justify-center border-b border-slate-200 transition-colors ${zoomLocked ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
            title={zoomLocked ? "Zoom Terkunci — tahan Ctrl lalu klik" : "Ctrl aktif — klik untuk zoom in"}
          >
            {zoomLocked ? <Lock size={13} /> : <Plus size={16} />}
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("map:zoom-out"))}
            className={`w-8 h-8 flex items-center justify-center transition-colors ${zoomLocked ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
            title={zoomLocked ? "Zoom Terkunci — tahan Ctrl lalu klik" : "Ctrl aktif — klik untuk zoom out"}
          >
            {zoomLocked ? <Lock size={13} /> : <Minus size={16} />}
          </button>
        </div>

        {/* Dropdown Choropleth (sebelah kanan zoom buttons) */}
        <div className="bg-white border border-slate-200 shadow-sm p-2 flex flex-col gap-1 w-[210px] rounded-lg">
          <label className="text-[10px] font-mono font-bold uppercase text-neutral-500">Pilih Layer Metrik</label>
          <select 
            className="font-mono text-[11px] font-bold uppercase p-1.5 border border-slate-200 focus:outline-none cursor-pointer bg-neutral-50 rounded"
            value={activeMetric}
            onChange={(e) => setActiveMetric(e.target.value as any)}
          >
            <option value="lahanSawah">Lahan Sawah (Padi)</option>
            <option value="lahanBukanSawah">Ladang (Palawija)</option>
            <option value="jumlah">Total Lahan Dikuasai (ST2023)</option>
          </select>
          <span className="text-[9px] font-mono text-neutral-500 mt-0.5">
            <kbd className="px-1 py-0.5 bg-neutral-100 border border-slate-300 rounded text-[9px] font-bold">CTRL</kbd>
            {" + scroll / klik untuk zoom"}
          </span>
        </div>
      </div>

      {/* --- TOP RIGHT: Search Bar + dropdown hasil desa --- */}
      <div className="absolute top-3 right-3 z-[1000] flex">
        <div className="relative">
          {showSearchDropdown && searchQuery.trim().length >= 2 && (
            <div className="fixed inset-0 z-0" onClick={() => setShowSearchDropdown(false)} />
          )}
          <div className="relative z-10 bg-white border border-slate-200 shadow-sm flex items-center p-1 w-[190px] transition-all focus-within:w-[230px] rounded-lg">
            <Search className="text-neutral-400 mx-2" size={16} />
            <input
              type="text"
              placeholder="CARI DESA..."
              className="w-full font-mono text-[11px] font-bold uppercase focus:outline-none bg-transparent"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
                if (!e.target.value) setSearchTarget(null);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchResults.length > 0) handleSelectDesa(searchResults[0]);
                if (e.key === "Escape") setShowSearchDropdown(false);
              }}
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setSearchTarget(null); setShowSearchDropdown(false); }}
                className="px-2 font-black text-red-500 hover:bg-red-50"
              >X</button>
            )}
          </div>

          {showSearchDropdown && searchResults.length > 0 && (
            <div className="absolute right-0 z-10 mt-1 w-[230px] bg-white border border-slate-200 shadow-lg rounded-lg overflow-hidden">
              {searchResults.map((item, idx) => (
                <button
                  key={`${item.kec}-${item.name}-${idx}`}
                  onClick={() => handleSelectDesa(item)}
                  className="w-full text-left px-3 py-2 hover:bg-emerald-50 active:bg-emerald-100 border-b border-slate-100 last:border-b-0 transition-colors"
                >
                  <span className="block font-mono text-[11px] font-bold uppercase text-slate-800 leading-tight">{item.name}</span>
                  {item.kec && (
                    <span className="block font-mono text-[9px] uppercase text-emerald-700 leading-tight">Kec. {item.kec}</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {showSearchDropdown && searchQuery.trim().length >= 2 && searchResults.length === 0 && desaGeoData && (
            <div className="absolute right-0 z-10 mt-1 w-[230px] bg-white border border-slate-200 shadow-lg rounded-lg px-3 py-2">
              <span className="font-mono text-[10px] uppercase text-neutral-500">Desa tidak ditemukan</span>
            </div>
          )}
        </div>
      </div>

      {/* --- BOTTOM RIGHT: Interactive Legend --- */}
      <div className="absolute bottom-3 right-3 z-[1000] bg-white border border-slate-200 shadow-sm p-2.5 flex flex-col gap-1.5 rounded-lg max-w-[180px]">
        <span className="text-[10px] font-mono font-bold uppercase text-neutral-500 border-b border-slate-200 pb-1">
          Legenda & Filter
        </span>
        <div className="flex flex-col gap-1">
          {legendConfig.map((item, idx) => (
            <div 
              key={idx} 
              className={`flex items-center gap-2 cursor-pointer p-0.5 transition-all ${activeLegendCategory === item.cat ? 'bg-neutral-100 border border-slate-200' : 'hover:bg-neutral-50 border border-transparent'}`}
              onClick={() => setActiveLegendCategory(activeLegendCategory === item.cat ? null : item.cat)}
            >
              <div className="w-3.5 h-3.5 border border-slate-200" style={{ backgroundColor: item.color }}></div>
              <span className="font-mono text-[9px] font-bold uppercase">{item.label}</span>
            </div>
          ))}
        </div>
        {activeLegendCategory !== null && (
          <button onClick={() => setActiveLegendCategory(null)} className="mt-0.5 text-[9px] font-mono font-black text-red-500 hover:underline text-left">
            Reset Filter
          </button>
        )}
      </div>

      {/* --- LEAFLET MAP --- */}
      <div className="h-full w-full z-0 relative overflow-hidden">
        {(coreMapLoading || mapLoadError) && (
          <div className="absolute inset-0 z-[1100] flex flex-col items-center justify-center bg-white">
            {coreMapLoading ? (
              <LoadingSpinner height="h-40" label="Memuat peta wilayah..." />
            ) : (
              <div className="max-w-xs px-4 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-red-100 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-slate-800">Peta gagal dimuat</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{mapLoadError}</p>
                <button
                  onClick={handleRetry}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-blue-800 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-900"
                >
                  <RotateCw className="h-3.5 w-3.5" /> Coba Lagi
                </button>
              </div>
            )}
          </div>
        )}
        <MapContainer center={[-7.3941, 109.6965]} style={{ height: "100%", width: "100%" }} zoom={11} minZoom={5} maxZoom={18} zoomControl={false}>
          <MapBounds data={kecGeoData} />
          <ZoomBridge onLockChange={setZoomLocked} />
          <SearchFlyTo target={searchTarget} geoJsonRef={desaGeoJsonRef} />
          
          <LayersControl position="bottomleft">
            {/* Base layers: Esri ArcGIS Online — gratis, tanpa API key, tidak terblokir */}
            <LayersControl.BaseLayer name="Peta Jalan (Esri)">
              <TileLayer
                attribution="Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
                maxNativeZoom={18}
                maxZoom={18}
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Satelit (Esri)">
              <LayerGroup>
                <TileLayer
                  attribution="Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  maxNativeZoom={18}
                  maxZoom={18}
                />
                <TileLayer
                  attribution=""
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                  maxNativeZoom={18}
                  maxZoom={18}
                />
              </LayerGroup>
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer checked name="Topografi (Esri)">
              <TileLayer
                attribution="Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
                maxNativeZoom={18}
                maxZoom={18}
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Abu-abu Minimal (Esri)">
              <TileLayer
                attribution="Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                maxNativeZoom={16}
                maxZoom={18}
              />
            </LayersControl.BaseLayer>

            {desaGeoData && (
              <LayersControl.Overlay checked name="🗺️ Area & Choropleth">
                <GeoJSON
                  key={`desa-${desaGeoData.features.length}-${data?.length || 0}-${taniData.length || 0}-${st2023Data.length || 0}-${Object.keys(kecVegMap).length}-${activeMetric}-${searchQuery}-${activeLegendCategory}-${searchTarget?.token || 0}`}
                  data={desaGeoData}
                  ref={desaGeoJsonRef as any}
                  style={getDesaStyle}
                  onEachFeature={(feature, layer) => {
                    const desaName = feature.properties?.Nama_Desa_ || feature.properties?.Name || "Tidak diketahui";
                    const kecName = feature.properties?.Kecamatan || "";
                    const kecVeg = kecVegMap[kecName.replace(/^kec\.?\s*/i, "").trim().toLowerCase()] ?? null;
                    const desaData = getDesaData(feature);
                    const desaTaniData = getDesaTaniData(feature);
                    const desaSt2023 = getDesaSt2023(feature);

                    // Render Rich Popup Component to string
                    const htmlContent = ReactDOMServer.renderToString(
                      <PopupContent desaName={desaName} kecName={kecName} data={desaData} taniData={desaTaniData} st2023={desaSt2023} kecVeg={kecVeg} />
                    );
                    
                    layer.bindPopup(htmlContent, {
                      className: 'custom-popup-modern',
                      maxWidth: 460,
                      minWidth: 320,
                      autoPanPadding: [30, 30],
                    });
                  }}
                />
              </LayersControl.Overlay>
            )}

            {kecGeoData && (
              <LayersControl.Overlay checked name="Batas Kecamatan">
                <GeoJSON
                  key={`kec-${kecGeoData.features.length}`}
                  data={kecGeoData}
                  style={kecStyle}
                  onEachFeature={(feature, layer) => {
                    const kecName = feature.properties?.Kecamatan || feature.properties?.WADMKC || "Tidak diketahui";
                    layer.bindTooltip(`KEC. ${kecName.toUpperCase()}`, { sticky: true, className: "font-mono font-bold text-xs uppercase" });
                  }}
                />
              </LayersControl.Overlay>
            )}

            {auxiliaryGeoJsonLayers.map((layerConfig) => {
              const layerData = auxiliaryLayers[layerConfig.key];
              if (!layerData) return null;

              return (
                <LayersControl.Overlay
                  key={layerConfig.key}
                  checked={layerConfig.checked}
                  name={layerConfig.name}
                >
                  <GeoJSON
                    key={`${layerConfig.key}-${layerData.features?.length || 0}`}
                    data={layerData}
                    pointToLayer={(feature, latlng) =>
                      L.marker(latlng, {
                        icon: createColoredIcon(getPointIconColor(layerConfig, feature)),
                      })
                    }
                    style={(feature) => getAuxiliaryStyle(layerConfig, feature)}
                    onEachFeature={(feature, layer) => {
                      layer.bindPopup(getAuxiliaryPopup(feature, layerConfig.name), {
                        className: "custom-popup-modern",
                      });
                    }}
                  />
                </LayersControl.Overlay>
              );
            })}

          </LayersControl>
        </MapContainer>
      </div>

    </div>
  );
};
