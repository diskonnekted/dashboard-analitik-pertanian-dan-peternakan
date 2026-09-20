import { useEffect, useRef } from "react";
import L from "leaflet";
import type { GeoFeature } from "../../services/desa";

interface Props {
  centerLng: number;
  centerLat: number;
  geometry: GeoFeature | null;
  namaTampil: string;
}

/**
 * Peta mini 360px: polygon desa di-highlight dengan fill merah-oranye,
 * tanpa base map detail (CartoDB tile) supaya hemat beban. Tetap
 * sinkron zoom & fitBounds ke polygon centroid.
 */
export function DesaMapMini({ centerLng, centerLat, geometry, namaTampil }: Props) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapEl.current) return;
    if (mapRef.current) return; // sudah ter-init

    const map = L.map(mapEl.current, {
      center: [centerLat, centerLng],
      zoom: 12,
      scrollWheelZoom: false,
      attributionControl: false,
      zoomControl: true,
      dragging: true,
    });
    mapRef.current = map;

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      { subdomains: "abcd", maxZoom: 18 },
    ).addTo(map);

    if (geometry && (geometry.geometry.type === "Polygon" || geometry.geometry.type === "MultiPolygon")) {
      const layer = L.geoJSON(geometry as unknown as GeoJSON.Feature, {
        style: {
          color: "#dc2626",
          weight: 2,
          fillColor: "#f97316",
          fillOpacity: 0.35,
        },
      }).addTo(map);

      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.25), { animate: false });
      }

      // Marker label centroid
      L.marker([centerLat, centerLng], {
        icon: L.divIcon({
          className: "desa-marker",
          html: `<div class="px-2 py-0.5 text-[10px] font-semibold bg-red-600 text-white rounded shadow-md whitespace-nowrap">${namaTampil.replace(/</g, "&lt;")}</div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
        interactive: false,
      }).addTo(map);
    }

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      <div ref={mapEl} style={{ height: 360, width: "100%" }} />
    </div>
  );
}
