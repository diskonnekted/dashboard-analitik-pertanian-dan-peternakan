import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPinned } from "lucide-react";
import { Protocol } from "pmtiles";
import {
  KEC_KEY,
  type KecGeoCollection,
  type SebaranBidangRow,
} from "../../services/kecamatan";

/**
 * Peta choropleth SEBARAN BIDANG untuk /sebaran/:bidang — saudara dari
 * KecamatanMapMini (tingkat kecamatan, /kecamatan/:kec):
 * - basemap MapLibre + OpenFreeMap "liberty" (PMTiles, tanpa API key);
 * - polygon 20 kecamatan diwarnai per KELAS nilai (5 kelas kuantil —
 * warna precomputed di properties.warna agar ekspresi fill-color
 * cukup ["get","warna"]);
 * - label nama kecamatan + angka indikator (compact);
 * - hover: highlight + popup ringkas; klik: menuju profil kecamatan.
 *
 * Komponen sengaja di-remount per bidang (key={bidang} di halaman) sehingga
 * satu efek mount membangun peta dari data yang sudah siap — pola yang
 * sudah terbukti stabil di KecamatanMapMini.
 */

interface Props {
  geo: KecGeoCollection;
  rows: SebaranBidangRow[];
  /** Batas atas kelas 0..3 (panjang 4) — kelas ke-4 = di atas breaks[3]. */
  breaks: number[];
  /** 5 warna kelas (terang → gelap). */
  colors: string[];
  unit: string;
  judul: string;
}

/** Warna polygon tanpa data (slate-200) + outline-nya (slate-300). */
const WARNA_TANPA_DATA = "#e2e8f0";
const WARNA_TANPA_DATA_LINE = "#cbd5e1";

const OPENFREEMAP_LIBERTY_URL = "https://tiles.openfreemap.org/styles/liberty";

/** Format angka penuh (tabel/legenda): 12.345 / 12,3. */
export const formatNilaiSebaran = (n: number): string =>
  n >= 100
    ? Math.round(n).toLocaleString("id-ID")
    : n.toLocaleString("id-ID", { maximumFractionDigits: 1 });

const compactFmt = new Intl.NumberFormat("id-ID", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Format singkat label peta: 12,3 rb. */
export const formatCompactSebaran = (n: number): string => compactFmt.format(n);

let _pmtilesProtocolRegistered = false;
function ensurePmtilesProtocol(maplibreNs: typeof maplibregl): void {
  if (_pmtilesProtocolRegistered) return;
  _pmtilesProtocolRegistered = true;
  const protocol = new Protocol();
  maplibreNs.addProtocol("pmtiles", protocol.tile);
}

export function SebaranBidangMap({ geo, rows, breaks, colors, unit, judul }: Props) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    if (!geo.features.length) return;

    ensurePmtilesProtocol(maplibregl);
    maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");

    // Join data ↔ polygon: rows diindeks dengan KEC_KEY (tahan varian ejaan).
    const rowByKey = new Map(rows.map((r) => [KEC_KEY(r.kecamatan), r] as const));
    const kelasOf = (n: number): number => {
      for (let i = 0; i < breaks.length; i++) if (n <= breaks[i]) return i;
      return breaks.length;
    };

    const fc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: geo.features.map((f, i) => {
        const row = rowByKey.get(f.properties.kecKey) ?? null;
        const ada = row && row.nilai > 0;
        const kelas = ada ? kelasOf(row.nilai) : -1;
        return {
          type: "Feature" as const,
          geometry: f.geometry as GeoJSON.Geometry,
          properties: {
            OBJECTID: i + 1, // promoteId — unik utk feature-state hover
            nama: f.properties.nama,
            kecKey: f.properties.kecKey,
            routeSlug: row?.kecamatanSlug ?? "",
            nilai: ada ? row.nilai : 0,
            tahun: row?.tahun ?? "",
            ada: ada ? 1 : 0,
            label: ada ? formatCompactSebaran(row.nilai) : "·",
            warna: ada ? colors[Math.min(kelas, colors.length - 1)] : WARNA_TANPA_DATA,
            warnaLine:
              ada ? colors[Math.min(kelas, colors.length - 1)] : WARNA_TANPA_DATA_LINE,
          },
        };
      }),
    };

    const center: [number, number] = [109.6, -7.35]; // pusat Banjarnegara (fallback)

    const map = new maplibregl.Map({
      container: mapEl.current,
      style: OPENFREEMAP_LIBERTY_URL,
      center,
      zoom: 10,
      attributionControl: false,
      cooperativeGestures: true,
      scrollZoom: true,
      boxZoom: false,
      doubleClickZoom: true,
      pitchWithRotate: false,
      dragRotate: false,
      touchZoomRotate: true,
      dragPan: true,
    });
    mapRef.current = map;

    map.addControl(
      new maplibregl.AttributionControl({
        customAttribution:
          '© <a href="https://openfreemap.org">OpenFreeMap</a> · ' +
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }),
    );
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      const srcId = "sebaran-bidang";
      map.addSource(srcId, {
        type: "geojson",
        data: fc,
        promoteId: "OBJECTID",
      });

      // Choropleth: warna precomputed per-feature (kelas kuantil 5).
      map.addLayer({
        id: `${srcId}-fill`,
        type: "fill",
        source: srcId,
        paint: {
          "fill-color": ["get", "warna"],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.95,
            0.78,
          ],
        },
      });

      // Outline kecamatan; hover → amber & lebih tebal.
      map.addLayer({
        id: `${srcId}-outline`,
        type: "line",
        source: srcId,
        paint: {
          "line-color": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            "#f59e0b",
            ["get", "warnaLine"],
          ],
          "line-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            3.2,
            1.8,
          ],
        },
      });

      // Label nama kecamatan + angka indikator (compact, 2 baris).
      map.addLayer({
        id: `${srcId}-label`,
        type: "symbol",
        source: srcId,
        minzoom: 9.5,
        layout: {
          "text-field": ["concat", ["get", "nama"], "\n", ["get", "label"]],
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 9.5, 9, 13, 12],
          "text-anchor": "center",
        },
        paint: {
          "text-color": "#111827",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.6,
        },
      });

      // Hover: feature-state + cursor + popup ringkas mengikuti kursor.
      let hoveredId: string | number | null = null;
      let popup: maplibregl.Popup | null = null;
      map.on("mousemove", `${srcId}-fill`, (e) => {
        map.getCanvas().style.cursor = "pointer";
        const fs = e.features;
        if (!fs || !fs.length) return;
        const fid = fs[0].id as string | number | undefined;
        if (hoveredId !== null && hoveredId !== undefined) {
          map.setFeatureState({ source: srcId, id: hoveredId }, { hover: false });
        }
        if (fid !== null && fid !== undefined) {
          map.setFeatureState({ source: srcId, id: fid }, { hover: true });
          hoveredId = fid;
        }
        const p = (fs[0].properties ?? {}) as Record<string, unknown>;
        const ada = Number(p.ada ?? 0) === 1;
        const html =
          `<div class="text-sm font-bold text-slate-900">${escapeHtml(String(p.nama ?? ""))}</div>` +
          (ada
            ? `<div class="text-xs text-slate-600 mt-0.5">${escapeHtml(
                formatNilaiSebaran(Number(p.nilai ?? 0)),
              )} ${escapeHtml(unit)}${p.tahun ? ` · ${escapeHtml(String(p.tahun))}` : ""}</div>`
            : `<div class="text-xs text-slate-500 italic mt-0.5">Data belum tercatat</div>`);
        if (!popup) {
          popup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 14,
          })
            .setLngLat(e.lngLat)
            .setHTML(html)
            .addTo(map);
        } else {
          popup.setLngLat(e.lngLat).setHTML(html);
        }
      });
      map.on("mouseleave", `${srcId}-fill`, () => {
        map.getCanvas().style.cursor = "";
        if (hoveredId !== null && hoveredId !== undefined) {
          map.setFeatureState({ source: srcId, id: hoveredId }, { hover: false });
          hoveredId = null;
        }
        if (popup) {
          popup.remove();
          popup = null;
        }
      });

      // Klik polygon → profil kecamatan (route slug dari rows).
      map.on("click", `${srcId}-fill`, (e: maplibregl.MapLayerMouseEvent) => {
        const fs = e.features;
        if (!fs || !fs.length) return;
        const p = (fs[0].properties ?? {}) as Record<string, unknown>;
        const slug = String(p.routeSlug ?? "");
        if (slug) navigate(`/kecamatan/${slug}`);
      });

      // Zoom otomatis ke seluruh kabupaten.
      const bbox = computeBBox(fc);
      if (bbox) {
        map.fitBounds(bbox, { padding: 28, duration: 0, animate: false, maxZoom: 11 });
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const adaData = rows.filter((r) => r.nilai > 0).length;

  return (
    <div className="rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-white">
      <div
        className="
          flex items-center gap-2 px-3 py-1.5
          border-b border-slate-200
          bg-gradient-to-r from-emerald-50 to-white
        "
      >
        <MapPinned className="w-3.5 h-3.5 text-emerald-700" aria-hidden />
        <span className="text-xs font-semibold text-slate-700">{judul} — Peta Kabupaten Banjarnegara</span>
        <span
          aria-hidden
          className="
            ml-auto inline-flex items-center gap-1
            rounded-full bg-white ring-1 ring-slate-200
            px-1.5 py-0.5 text-[10px] text-slate-500
          "
        >
          <span className="inline-block w-2.5 h-0.5 bg-emerald-600 rounded" />
          {adaData}/{geo.features.length} kecamatan berdata
        </span>
      </div>
      <div ref={mapEl} style={{ height: 480, width: "100%" }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Utilitas kecil (duplikasi sadar dari KecamatanMapMini). */
/* ------------------------------------------------------------------ */

function computeBBox(fc: GeoJSON.FeatureCollection): [[number, number], [number, number]] | null {
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;

  const visitCoords = (coords: unknown): void => {
    if (!Array.isArray(coords)) return;
    const first = coords[0];
    if (typeof first === "number" && typeof coords[1] === "number") {
      const lng = coords[0];
      const lat = coords[1];
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
      return;
    }
    for (const c of coords) visitCoords(c);
  };

  const visit = (geom: GeoJSON.Geometry): void => {
    if (geom.type === "GeometryCollection") {
      for (const g of geom.geometries) visit(g);
      return;
    }
    visitCoords((geom as { coordinates: unknown }).coordinates);
  };

  for (const f of fc.features) {
    const geom = f.geometry as GeoJSON.Geometry | undefined;
    if (!geom) continue;
    visit(geom);
  }

  if (!isFinite(minLng) || !isFinite(maxLng)) return null;
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
