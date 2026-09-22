import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPinned } from "lucide-react";
import { Protocol } from "pmtiles";
import type { DesaIndex, GeoFeature } from "../../services/desa";

/**
 * Peta mini tingkat-KECAMATAN untuk /kecamatan/:kec — saudara dari
 * DesaMapMini (tingkat desa): basemap MapLibre + OpenFreeMap "liberty"
 * (PMTiles, tanpa API key), semua polygon desa di kecamatan, label nama
 * desa, hover highlight, dan popup + tautan ke halaman detail desa.
 *
 * Data polygon TIDAK di-fetch ulang — berasal dari geoindex DesaIndex[]
 * (peta_desa_v3.geojson) yang sudah dimuat halaman kecamatan.
 *
 * Util computeBBox/escapeHtml/protocol sengahan diduplikasi dari DesaMapMini
 * agar refactor file yang sudah stabil di produksi tidak diperlukan.
 */

interface Props {
  desaList: DesaIndex[];
  namaKecamatan: string;
}

const OPENFREEMAP_LIBERTY_URL = "https://tiles.openfreemap.org/styles/liberty";

let _pmtilesProtocolRegistered = false;
function ensurePmtilesProtocol(maplibreNs: typeof maplibregl): void {
  if (_pmtilesProtocolRegistered) return;
  _pmtilesProtocolRegistered = true;
  const protocol = new Protocol();
  maplibreNs.addProtocol("pmtiles", protocol.tile);
}

/** Nama pendek utk label peta: buang prefix "Desa "/"Kel. ". */
const labelPendek = (namaTampil: string): string =>
  namaTampil.replace(/^Desa\s+/i, "").replace(/^Kel\.\s*/i, "");

export function KecamatanMapMini({ desaList, namaKecamatan }: Props) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapEl.current) return;
    if (mapRef.current) return;

    const withGeom = desaList.filter((v) => v.geometry);
    if (!withGeom.length) return;

    ensurePmtilesProtocol(maplibregl);
    maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");

    // Pusat awal: rata-rata centroid desa (fitBounds penuh dilakukan saat load).
    const cs = withGeom
      .map((v) => v.centroid)
      .filter((c): c is [number, number] => Array.isArray(c));
    const center: [number, number] = cs.length
      ? [
          cs.reduce((s, c) => s + c[0], 0) / cs.length,
          cs.reduce((s, c) => s + c[1], 0) / cs.length,
        ]
      : [109.6, -7.35]; // pusat Banjarnegara sebagai fallback

    const map = new maplibregl.Map({
      container: mapEl.current,
      style: OPENFREEMAP_LIBERTY_URL,
      center,
      zoom: 12.5,
      attributionControl: false,
      cooperativeGestures: true,
      scrollZoom: false,
      boxZoom: false,
      doubleClickZoom: true,
      pitchWithRotate: false,
      dragRotate: false,
      touchZoomRotate: false,
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
      const srcId = `kec-desa-${Date.now()}`;
      // PERHATIKAN BENTUK DATA: DesaIndex.geometry = GeoFeature UTUH
      // { type:"Feature", geometry:{...}, properties } — BUKAN objek geometry
      // (lihat loadGeoIndex: `geometry = f`). Fitur geojson harus dibangun
      // dengan base.geometry di slot geometry; memasang GeoFeature utuh di
      // slot itu menghasilkan nested { type:"Feature" } yang invalid dan
      // MapLibre membuang SEMUA fitur → polygon tidak pernah muncul.
      const fc: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: withGeom.map((v) => {
          const base = v.geometry as unknown as GeoJSON.Feature;
          return {
            type: "Feature" as const,
            geometry: base.geometry,
            properties: {
              OBJECTID: v.objectId, // promoteId — unik utk feature-state hover
              nama: v.namaTampil,
              namaPendek: labelPendek(v.namaTampil),
              desaSlug: v.namaSlug,
              kecSlug: v.kecamatanSlug,
              luasHa: Math.round(v.luasHa || 0),
            },
          };
        }),
      };

      map.addSource(srcId, {
        type: "geojson",
        data: fc,
        promoteId: "OBJECTID",
      });

      // Fill emerald transparan; hover via feature-state.
      map.addLayer({
        id: `${srcId}-fill`,
        type: "fill",
        source: srcId,
        paint: {
          "fill-color": "#10b981",
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.45,
            0.16,
          ],
        },
      });

      // Outline desa; hover → amber & lebih tebal.
      map.addLayer({
        id: `${srcId}-outline`,
        type: "line",
        source: srcId,
        paint: {
          "line-color": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            "#f59e0b",
            "#047857",
          ],
          "line-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            3,
            1.6,
          ],
        },
      });

      // Label nama desa pada centroid polygon.
      map.addLayer({
        id: `${srcId}-label`,
        type: "symbol",
        source: srcId,
        minzoom: 11,
        layout: {
          "text-field": ["get", "namaPendek"],
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 11, 9.5, 14, 12],
        },
        paint: {
          "text-color": "#1f2937",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.6,
        },
      });

      // Hover: feature-state + cursor.
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

      // Klik: popup nama desa + luas + tautan detail desa.
      map.on("click", `${srcId}-fill`, (e: maplibregl.MapLayerMouseEvent) => {
        const fs = e.features;
        if (!fs || !fs.length) return;
        const p = (fs[0].properties ?? {}) as Record<string, unknown>;
        const coords: [number, number] = e.lngLat.toArray() as [number, number];
        if (popup) popup.remove();
        popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true })
          .setLngLat(coords)
          .setHTML(
            `<div class="text-xs font-semibold text-slate-700">Desa di Kecamatan ${escapeHtml(
              namaKecamatan,
            )}</div>` +
              `<div class="text-sm font-bold text-slate-900 mt-0.5">${escapeHtml(
                String(p.nama ?? ""),
              )}</div>` +
              `<div class="text-[11px] text-slate-500 mt-0.5">${Number(p.luasHa ?? 0).toLocaleString(
                "id-ID",
              )} Ha wilayah</div>` +
              `<a class="block mt-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800" href="/desa/${encodeURIComponent(
                String(p.kecSlug ?? ""),
              )}/${encodeURIComponent(String(p.desaSlug ?? ""))}">Lihat detail desa →</a>`,
          )
          .addTo(map);
      });

      // Zoom otomatis ke seluruh wilayah kecamatan.
      const bbox = computeBBox(fc);
      if (bbox) {
        map.fitBounds(bbox, { padding: 24, duration: 0, animate: false, maxZoom: 14 });
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

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
      <div
        className="
          flex items-center gap-2 px-3 py-1.5
          border-b border-slate-200
          bg-gradient-to-r from-emerald-50 to-white
        "
      >
        <MapPinned className="w-3.5 h-3.5 text-emerald-700" aria-hidden />
        <span className="text-xs font-semibold text-slate-700">
          Peta Wilayah Kecamatan {namaKecamatan}
        </span>
        <span
          aria-hidden
          className="
            ml-auto inline-flex items-center gap-1
            rounded-full bg-white ring-1 ring-slate-200
            px-1.5 py-0.5 text-[10px] text-slate-500
          "
        >
          <span className="inline-block w-2.5 h-0.5 bg-emerald-600 rounded" />
          {desaList.length} desa
        </span>
      </div>
      <div ref={mapEl} style={{ height: 420, width: "100%" }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Utilitas kecil (duplikasi sadar dari DesaMapMini).                   */
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
    if (f.geometry as unknown === null) continue;
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

export type { GeoFeature };
