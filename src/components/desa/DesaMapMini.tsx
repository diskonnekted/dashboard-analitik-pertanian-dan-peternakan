import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin } from "lucide-react";
import { Protocol } from "pmtiles";
import type { GeoFeature } from "../../services/desa";

/**
 * Peta mini 360px dengan MapLibre GL JS + basemap OpenFreeMap.
 *
 * OpenFreeMap (https://openfreemap.org) adalah basemap global gratis, tanpa
 * API key, didistribusikan lewat PMTiles hosted di tiles.openfreemap.org.
 * Style.json tersedia di:
 *   - https://tiles.openfreemap.org/styles/liberty  (default kartografi)
 *   - https://tiles.openfreemap.org/styles/positron (positron/positron-like)
 *   - https://tiles.openfreemap.org/styles/bright   (bright)
 *   - https://tiles.openfreemap.org/styles/dark     (dark)
 * Kita pilih "liberty" — gaya kartografi Cantino-like dengan label kota,
 * jalan, dan kontur halus. Cocok untuk konteks pedesaan Banjarnegara.
 *
 * Library Leaflet yang sebelumnya dipakai ditarik dari komponen ini karena
 * tile-provider-nya (Esri, CartoDB, Thunderforest, OpenTopoMap) terbukti
 * tidak reliable untuk area Banjarnegara (tile blank, "API key required"
 * injection, throttling). OpenFreeMap + MapLibre berbasis PMTiles —
 * vektor yang di-render client-side, sehingga tidak bergantung pada
 * raster tile dari vendor ketiga.
 */

interface Props {
  centerLng: number;
  centerLat: number;
  geometry: GeoFeature | null;
  namaTampil: string;
}

const OPENFREEMAP_LIBERTY_URL = "https://tiles.openfreemap.org/styles/liberty";

/**
 * Flag singleton: register MapLibre custom protocol untuk pmtiles:// satu kali.
 * OpenFreeMap style pakai PMTiles vector tile (`https://tiles.openfreemap.org/planet`),
 * MapLibre GL JS tidak mengenali protokol ini tanpa registrasi eksplisit.
 */
let _pmtilesProtocolRegistered = false;
function ensurePmtilesProtocol(maplibreNs: typeof maplibregl): void {
  if (_pmtilesProtocolRegistered) return;
  _pmtilesProtocolRegistered = true;
  const protocol = new Protocol();
  maplibreNs.addProtocol("pmtiles", protocol.tile);
}

export function DesaMapMini({ centerLng, centerLat, geometry, namaTampil }: Props) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapEl.current) return;
    if (mapRef.current) return; // sudah ter-init

    // OpenFreeMap style pakai PMTiles sebagai sumber data tile. MapLibre
    // native tidak mengenali protokol "pmtiles://" — perlu didaftarkan
    // sekali per app instance.
    ensurePmtilesProtocol(maplibregl);

    /**
     * Worker URL — Vite tidak mengekstrak file worker MapLibre secara otomatis
     * (MapLibre default-nya menggunakan `import.meta.url` lalu me-resolve
     * `maplibre-gl-worker.mjs` di sebelah modul utama — pada build produksi
     * URL itu tidak valid karena worker tidak ikut ter-bundle ke dist).
     *
     * Kita override ke path statis `/maplibre-gl-worker.mjs` yang sudah
     * dicopy ke folder `public/` saat build. Berlaku untuk dev (Vite serve
     * public/ langsung) dan produksi (public/ ikut ke dist/).
     *
     * HARUS dipanggil SEBELUM `new maplibregl.Map(...)` — jika telat,
     * worker pertama sudah diminta dari URL default yang salah.
     */
    maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");

    /**
     * Style URL di-fetch lewat fetch() karena OpenFreeMap mengirim header
     * Access-Control-Allow-Origin: *, dan MapLibre akan otomasi decode JSON
     * menjadi StyleSpecification. Kita pakai "liberty" — label desa lebih
     * terasa "Indonesia" daripada positron.
     */
    const map = new maplibregl.Map({
      container: mapEl.current,
      style: OPENFREEMAP_LIBERTY_URL,
      center: [centerLng, centerLat],
      zoom: 14,
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
      if (!geometry) return;

      // Tambahkan sumber GeoJSON polygon desa.
      const featureId = `desa-poly-${Date.now()}`;
      map.addSource(featureId, {
        type: "geojson",
        data: geometry as unknown as GeoJSON.Feature,
      });

      // Layer fill oranye transparan.
      map.addLayer({
        id: `${featureId}-fill`,
        type: "fill",
        source: featureId,
        paint: {
          "fill-color": "#f59e0b",
          "fill-opacity": 0.18,
        },
      });

      // Layer outline merah putus-putus.
      map.addLayer({
        id: `${featureId}-outline`,
        type: "line",
        source: featureId,
        paint: {
          "line-color": "#dc2626",
          "line-width": 2.5,
          "line-dasharray": [3, 2],
        },
      });

      // Hover/tooltip pada outline: ubah style cursor + popup TTS.
      let popup: maplibregl.Popup | null = null;
      map.on("mouseenter", `${featureId}-outline`, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", `${featureId}-outline`, () => {
        map.getCanvas().style.cursor = "";
        if (popup) {
          popup.remove();
          popup = null;
        }
      });

      // Klik polygon: tampilkan popup TTS.
      map.on("click", `${featureId}-fill`, (e: maplibregl.MapMouseEvent) => {
        const coords: [number, number] = e.lngLat.toArray() as [number, number];
        if (popup) popup.remove();
        popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true })
          .setLngLat(coords)
          .setHTML(
            `<div class="text-xs font-semibold text-slate-700">Batas Administratif</div>` +
            `<div class="text-sm font-bold text-slate-900 mt-0.5">${escapeHtml(namaTampil)}</div>`,
          )
          .addTo(map);
      });

      // Label nama desa di centroid (pakai marker DOM sederhana, supaya
      // terbaca di atas warna apa pun).
      const labelEl = document.createElement("div");
      labelEl.className = "desa-maplibre-label";
      labelEl.textContent = namaTampil;
      new maplibregl.Marker({ element: labelEl, anchor: "bottom" })
        .setLngLat([centerLng, centerLat])
        .addTo(map);

      // Zoom otomatis ke polygon.
      // MapLibre butuh GeoJSON feature collection untuk fitBounds, jadi
      // kita bungkus geometry menjadi FeatureCollection dengan satu feature.
      const fc: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [geometry as unknown as GeoJSON.Feature],
      };
      const bbox = computeBBox(fc);
      if (bbox) {
        map.fitBounds(bbox, {
          padding: 24,
          duration: 0,
          animate: false,
          maxZoom: 16,
        });
      }
    });

    // Cleanup.
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
        <MapPin className="w-3.5 h-3.5 text-emerald-700" aria-hidden />
        <span className="text-xs font-semibold text-slate-700">Peta Lokasi Desa</span>
        <span
          aria-hidden
          className="
            ml-auto inline-flex items-center gap-1
            rounded-full bg-white ring-1 ring-slate-200
            px-1.5 py-0.5 text-[10px] text-slate-500
          "
        >
          <span className="inline-block w-2.5 h-0.5 bg-red-500 rounded" />
          batas desa
        </span>
      </div>
      <div ref={mapEl} style={{ height: 360, width: "100%" }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Utilitas kecil.                                                     */
/* ------------------------------------------------------------------ */

/**
 * Hitung bounding box dari FeatureCollection, kembalian sebagai
 * [[lngMin, latMin], [lngMax, latMax]] kompatibel dengan MapLibre fitBounds.
 */
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
    // GeometryCollection{bbox,geometries} — coordinates tidak selalu ada
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
