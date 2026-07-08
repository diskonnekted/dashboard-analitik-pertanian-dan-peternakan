import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, LayersControl } from "react-leaflet";

import "leaflet/dist/leaflet.css";
import { LahanDesa } from "@/services/api";

interface MapWidgetProps {
  data?: LahanDesa[];
}

export const MapWidget = ({ data = [] }: MapWidgetProps) => {
  const [desaGeoData, setDesaGeoData] = useState<any>(null);
  const [kecGeoData, setKecGeoData] = useState<any>(null);
  const [sawahGeo, setSawahGeo] = useState<any>(null);
  const [ladangGeo, setLadangGeo] = useState<any>(null);
  const [kebunGeo, setKebunGeo] = useState<any>(null);
  const [danauGeo, setDanauGeo] = useState<any>(null);
  const [bangunanGeo, setBangunanGeo] = useState<any>(null);
  const [tonggakGeo, setTonggakGeo] = useState<any>(null);

  useEffect(() => {
    // Memuat semua file GeoJSON
    fetch("/peta_desa_v3.geojson")
      .then((res) => res.json())
      .then(setDesaGeoData)
      .catch((err) => console.error("GeoJSON Desa:", err));
    fetch("/peta_kecamatan.geojson")
      .then((res) => res.json())
      .then(setKecGeoData)
      .catch((err) => console.error("GeoJSON Kecamatan:", err));

    // Dataset tambahan
    fetch("/sawah.geojson")
      .then((res) => res.json())
      .then(setSawahGeo)
      .catch((err) => console.error("sawah:", err));
    fetch("/ladang.geojson")
      .then((res) => res.json())
      .then(setLadangGeo)
      .catch((err) => console.error("ladang:", err));
    fetch("/kebun.geojson")
      .then((res) => res.json())
      .then(setKebunGeo)
      .catch((err) => console.error("kebun:", err));
    fetch("/danau.geojson")
      .then((res) => res.json())
      .then(setDanauGeo)
      .catch((err) => console.error("danau:", err));
    fetch("/bangunan_area.geojson")
      .then((res) => res.json())
      .then(setBangunanGeo)
      .catch((err) => console.error("bangunan:", err));
    fetch("/tonggak-kilometer.geojson")
      .then((res) => res.json())
      .then(setTonggakGeo)
      .catch((err) => console.error("tonggak:", err));
  }, []);

  // Helper to normalize kecamatan name for matching
  const isKecamatanMatch = (kecGeo: string, kecCsv: string) => {
    if (!kecGeo || !kecCsv) return true;
    const clean = (s: string) => s.toLowerCase().replace(/kecamatan|kec|\.|\s|-/gi, "");
    const g = clean(kecGeo);
    const c = clean(kecCsv);
    return g === c || g.includes(c) || c.includes(g);
  };

  // Fungsi untuk mendapatkan data desa yang cocok dari CSV dengan Fuzzy Match
  const getDesaData = (feature: any) => {
    if (!data || data.length === 0) return null;
    let namaDesaGeo =
      feature.properties?.Nama_Desa_ || feature.properties?.Name || "";

    namaDesaGeo = namaDesaGeo
      .toUpperCase()
      .replace("DESA ", "")
      .replace("KELURAHAN ", "")
      .trim();

    let matched = data.find(
      (d) =>
        namaDesaGeo.includes(d.desa.toUpperCase().trim()) && 
        d.desa.length > 2 &&
        isKecamatanMatch(feature.properties?.Kecamatan, d.kecamatan),
    );

    if (!matched) {
      const sanitize = (str: string) => str.replace(/[AEIOU\s-]/gi, "");
      const geoSanitized = sanitize(namaDesaGeo);

      matched = data.find((d) => {
        const dSanitized = sanitize(d.desa.toUpperCase());

        return (
          dSanitized.length > 3 &&
          isKecamatanMatch(feature.properties?.Kecamatan, d.kecamatan) &&
          (geoSanitized.includes(dSanitized) ||
            dSanitized.includes(geoSanitized))
        );
      });
    }

    return matched;
  };

  // Styles
  const getDesaStyle = (feature: any) => {
    const desaData = getDesaData(feature);
    let fillColor = "#cccccc";
    let fillOpacity = 0.2;
    let weight = 0.5;

    if (desaData) {
      if (desaData.lahanSawah > 100) fillColor = "#12a150";
      else if (desaData.lahanSawah > 50) fillColor = "#17c964";
      else if (desaData.lahanSawah > 10) fillColor = "#70e09b";
      else fillColor = "#f5a524";

      fillOpacity = 0.7;
      weight = 1;
    } else if (
      feature.properties?.Kecamatan?.toUpperCase().includes("BANJARNEGARA") ||
      feature.properties?.Kecamatan?.toUpperCase().includes("KLAMPOK") ||
      feature.properties?.Kecamatan?.toUpperCase().includes("PURWAREJA")
    ) {
      fillColor = "#70e09b";
      fillOpacity = 0.1;
    }

    return {
      fillColor,
      weight,
      opacity: 0.8,
      color: "#27272a",
      dashArray: "",
      fillOpacity,
    };
  };

  const kecStyle = {
    fillColor: "transparent",
    color: "#d946ef",
    weight: 3,
    opacity: 1,
    fillOpacity: 0,
  };
  const sawahStyle = {
    fillColor: "#22c55e",
    color: "#16a34a",
    weight: 1,
    fillOpacity: 0.5,
  };
  const ladangStyle = {
    fillColor: "#f5a524",
    color: "#c27a13",
    weight: 1,
    fillOpacity: 0.5,
  };
  const kebunStyle = {
    fillColor: "#14532d",
    color: "#052e16",
    weight: 1,
    fillOpacity: 0.5,
  };
  const danauStyle = {
    fillColor: "#3b82f6",
    color: "#1d4ed8",
    weight: 1,
    fillOpacity: 0.5,
  };
  const bangunanStyle = {
    fillColor: "#71717a",
    color: "#3f3f46",
    weight: 1,
    fillOpacity: 0.5,
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="h-[600px] w-full z-0 relative rounded-xl overflow-hidden shadow-sm border border-divider/50">
        <MapContainer
          center={[-7.3941, 109.6965]}
          style={{ height: "100%", width: "100%" }}
          zoom={11}
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="OpenStreetMap">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>

            {desaGeoData && (
              <LayersControl.Overlay checked name="🗺️ Batas Desa & Choropleth">
                <GeoJSON
                  key={`desa-${desaGeoData.features.length}-${data?.length || 0}`}
                  data={desaGeoData}
                  style={getDesaStyle}
                  onEachFeature={(feature, layer) => {
                    const desaName =
                      feature.properties?.Nama_Desa_ ||
                      feature.properties?.Name ||
                      "Tidak diketahui";
                    const kecName = feature.properties?.Kecamatan || "";
                    const desaData = getDesaData(feature);

                    let popupContent = `<div style="font-family: sans-serif;">
                      <strong style="font-size: 14px;">Desa: ${desaName}</strong><br/>
                      <span style="color: #666;">Kecamatan: ${kecName}</span><br/><hr style="margin: 8px 0; border: 0; border-top: 1px solid #eee;"/>`;

                    if (desaData) {
                      popupContent += `<strong>📊 Data Pertanian:</strong><br/>
                        <table style="width: 100%; margin-top: 4px;">
                          <tr><td>Sawah</td><td style="text-align: right; font-weight: bold;">${desaData.lahanSawah} Ha</td></tr>
                          <tr><td>Ladang</td><td style="text-align: right; font-weight: bold;">${desaData.lahanBukanSawah} Ha</td></tr>
                          <tr><td>Total</td><td style="text-align: right; font-weight: bold;">${desaData.jumlah} Ha</td></tr>
                        </table></div>`;
                    } else {
                      popupContent += `<em>(Data belum tersedia dari API)</em></div>`;
                    }

                    layer.bindPopup(popupContent);
                  }}
                />
              </LayersControl.Overlay>
            )}

            {kecGeoData && (
              <LayersControl.Overlay checked name="📍 Batas Kecamatan">
                <GeoJSON
                  key={`kec-${kecGeoData.features.length}`}
                  data={kecGeoData}
                  style={kecStyle}
                  onEachFeature={(feature, layer) => {
                    const kecName =
                      feature.properties?.Kecamatan ||
                      feature.properties?.WADMKC ||
                      "Tidak diketahui";

                    layer.bindTooltip(`Kecamatan ${kecName}`, {
                      sticky: true,
                      className: "font-bold text-sm",
                    });
                  }}
                />
              </LayersControl.Overlay>
            )}

            {sawahGeo && (
              <LayersControl.Overlay name="🌾 Lahan Sawah">
                <GeoJSON data={sawahGeo} style={sawahStyle} />
              </LayersControl.Overlay>
            )}

            {ladangGeo && (
              <LayersControl.Overlay name="🌽 Ladang / Tegalan">
                <GeoJSON data={ladangGeo} style={ladangStyle} />
              </LayersControl.Overlay>
            )}

            {kebunGeo && (
              <LayersControl.Overlay name="🌳 Perkebunan">
                <GeoJSON data={kebunGeo} style={kebunStyle} />
              </LayersControl.Overlay>
            )}

            {danauGeo && (
              <LayersControl.Overlay name="💧 Danau / Perairan">
                <GeoJSON data={danauGeo} style={danauStyle} />
              </LayersControl.Overlay>
            )}

            {bangunanGeo && (
              <LayersControl.Overlay name="🏢 Area Bangunan">
                <GeoJSON data={bangunanGeo} style={bangunanStyle} />
              </LayersControl.Overlay>
            )}

            {tonggakGeo && (
              <LayersControl.Overlay name="🚩 Tonggak Kilometer">
                <GeoJSON data={tonggakGeo} />
              </LayersControl.Overlay>
            )}
          </LayersControl>
        </MapContainer>
      </div>
    </div>
  );
};
