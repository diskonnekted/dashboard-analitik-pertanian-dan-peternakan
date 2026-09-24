import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPinned } from "lucide-react";
import { Protocol } from "pmtiles";
import type { DesaIndex } from "../../services/desa";
import type { FsvaDesa, FsvaIndicatorDef } from "../../data/fsva";

/**
 * Peta choropleth LEVEL DESA untuk Indeks Ketahanan Pangan (FSVA).
 * Saudara dari SebaranBidangMap (tingkat kecamatan):
 * - basemap MapLibre + OpenFreeMap "liberty" (PMTiles, tanpa API key);
 * - 278 polygon desa diwarnai per nilai indikator (warna sudah dihitung
 *   halaman lewat `colorOf`, ekspresi fill cukup ["get","warna"]);
 * - hover: highlight + popup ringkas; klik: menuju profil desa.
 *
 * Komponen di-remount per (tahun, indikator) via key di halaman.
 */

interface Props {
  desaIndex: DesaIndex[];
  rows: FsvaDesa[];
  indikator: FsvaIndicatorDef;
  /** Pemeta nilai mentah indikator → warna (dinilai di halaman). */
  colorOf: (v: number) => string;
  judul: string;
  berdata: number;
  total: number;
}

const WARNA_TANPA_DATA = "#e2e8f0";
const WARNA_TANPA_DATA_LINE = "#cbd5e1";
const OPENFREEMAP_LIBERTY_URL = "https://tiles.openfreemap.org/styles/liberty";

let _pmtilesProtocolRegistered = false;
function ensurePmtilesProtocol(maplibreNs: typeof maplibregl): void {
  if (_pmtilesProtocolRegistered) return;
  _pmtilesProtocolRegistered = true;
  const protocol = new Protocol();
  maplibreNs.addProtocol("pmtiles", protocol.tile);
}

export function FsvaMap({
  desaIndex,
  rows,
  indikator,
  colorOf,
  judul,
  berdata,
  total,
}: Props) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    if (!desaIndex.length) return;

    ensurePmtilesProtocol(maplibregl);
    maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");

    const rowByOid = new Map(rows.map((r) => [r.objectId, r] as const));
    const valOf = (r: FsvaDesa) => r[indikator.key] as number;

    const rawFeatures = desaIndex.map((d, i) => {
      const row = rowByOid.get(d.objectId) ?? null;
      const ada = !!row;
      const v = ada ? valOf(row) : 0;
      const warna = ada ? colorOf(v) : WARNA_TANPA_DATA;
      const warnaLine = ada ? colorOf(v) : WARNA_TANPA_DATA_LINE;
      const geometry = normalizeGeom(d.geometry?.geometry);
      if (!geometry) return null;
      return {
        type: "Feature" as const,
        geometry,
        properties: {
          OBJECTID: i + 1,
          nama: d.namaTampil,
          kecamatan: d.kecamatanTampil,
          routeKec: d.kecamatanSlug,
          routeNama: d.namaSlug,
          nilai: ada ? v : 0,
          nilaiText: ada ? indikator.format(v) : "·",
          ada: ada ? 1 : 0,
          warna,
          warnaLine,
        },
      };
    });

    const fc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: rawFeatures.filter((f) => f !== null) as GeoJSON.Feature[],
    };

    const center: [number, number] = [109.6, -7.35];

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
      const srcId = "fsva-desa";
      map.addSource(srcId, {
        type: "geojson",
        data: fc,
        promoteId: "OBJECTID",
      });

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
            3,
            0.8,
          ],
        },
      });

      let hoveredId: string | number | null = null;
      let popup: maplibregl.Popup | null = null;
      map.on("mousemove", `${srcId}-fill`, (e: maplibregl.MapLayerMouseEvent) => {
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
          `<div class="text-[11px] text-slate-500">${escapeHtml(String(p.kecamatan ?? ""))}</div>` +
          (ada
            ? `<div class="text-xs font-semibold text-slate-800 mt-1">${escapeHtml(
                indikator.label,
              )}: ${escapeHtml(String(p.nilaiText ?? ""))}${escapeHtml(indikator.unit)}</div>`
            : `<div class="text-xs text-slate-500 italic mt-1">Data belum tercatat</div>`);
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

      map.on("click", `${srcId}-fill`, (e: maplibregl.MapLayerMouseEvent) => {
        const fs = e.features;
        if (!fs || !fs.length) return;
        const p = (fs[0].properties ?? {}) as Record<string, unknown>;
        const kec = String(p.routeKec ?? "");
        const nama = String(p.routeNama ?? "");
        if (kec && nama) navigate(`/desa/${kec}/${nama}`);
      });

      const bbox = computeBBox(fc);
      if (bbox) {
        map.fitBounds(bbox, { padding: 24, duration: 0, animate: false, maxZoom: 12 });
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
    <div className="rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-white">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-200 bg-gradient-to-r from-teal-50 to-white">
        <MapPinned className="w-3.5 h-3.5 text-teal-700" aria-hidden />
        <span className="text-xs font-semibold text-slate-700">
          {judul} — Peta Kabupaten Banjarnegara
        </span>
        <span
          aria-hidden
          className="ml-auto inline-flex items-center gap-1 rounded-full bg-white ring-1 ring-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500"
        >
          <span className="inline-block w-2.5 h-0.5 bg-teal-600 rounded" />
          {berdata}/{total} desa berdata
        </span>
      </div>
      <div ref={mapEl} style={{ height: 520, width: "100%" }} />
    </div>
  );
}

/**
 * MapLibre (fill layer) tidak me-render GeometryCollection secara utuh.
 * 3 desa (Gemuruh, Gumelemkulon, Petambakan) memakai GeometryCollection
 * berisi Polygon; kita ratakan jadi MultiPolygon agar terisi warna.
 */
function normalizeGeom(geom: GeoJSON.Geometry | null | undefined): GeoJSON.Geometry | null {
  if (!geom) return null;
  if (geom.type !== "GeometryCollection") return geom;

  const polygons: GeoJSON.Polygon["coordinates"][] = [];
  const stack = (g: GeoJSON.Geometry): void => {
    if (g.type === "GeometryCollection") {
      for (const sub of g.geometries) stack(sub);
    } else if (g.type === "Polygon") {
      polygons.push(g.coordinates);
    } else if (g.type === "MultiPolygon") {
      polygons.push(...g.coordinates);
    }
  };
  stack(geom);

  if (polygons.length === 0) return null;
  if (polygons.length === 1)
    return { type: "Polygon", coordinates: polygons[0] } as GeoJSON.Geometry;
  return { type: "MultiPolygon", coordinates: polygons } as GeoJSON.Geometry;
}

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
