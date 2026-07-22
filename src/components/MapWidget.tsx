import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON, LayersControl, useMap, Marker, Popup as LeafletPopup, LayerGroup } from "react-leaflet";
import L from "leaflet";
import ReactDOMServer from "react-dom/server";
import { Search } from "lucide-react";

import "leaflet/dist/leaflet.css";
import { LahanDesa } from "@/services/api";

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

const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid #141414; box-shadow: 2px 2px 0px #141414; display: flex; align-items: center; justify-content: center;"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

const marketIcon = createCustomIcon('#eab308'); // yellow
const waterIcon = createCustomIcon('#3b82f6'); // blue
const farmerIcon = createCustomIcon('#22c55e'); // green

const mockMarkers = [
  { id: 1, name: "Pasar Induk Banjarnegara", lat: -7.3995, lng: 109.6975, type: "Rantai Pasok", icon: marketIcon, desc: "Pusat distribusi hasil pertanian utama di Banjarnegara." },
  { id: 2, name: "Bendungan Panglima Besar Jenderal Soedirman", lat: -7.3871, lng: 109.6108, type: "Infrastruktur Air", icon: waterIcon, desc: "Sumber irigasi utama untuk lahan sawah sekitarnya." },
  { id: 3, name: "Gapoktan Makmur Jaya", lat: -7.3621, lng: 109.7212, type: "Kelompok Tani", icon: farmerIcon, desc: "Kelompok tani percontohan untuk inovasi hortikultura." },
];

const MapBounds = ({ data }: { data: any }) => {
  const map = useMap();
  useEffect(() => {
    if (data && data.features && data.features.length > 0) {
      try {
        const layer = L.geoJSON(data);
        map.fitBounds(layer.getBounds(), { padding: [20, 20] });
      } catch (err) {
        console.error("Gagal mendapatkan bounds peta", err);
      }
    }
  }, [data, map]);
  return null;
};

// --- Rich Popup Component ---
const PopupContent = ({ desaName, kecName, data }: { desaName: string, kecName: string, data: any }) => (
  <div className="font-sans min-w-[220px]">
    <h3 className="font-black text-lg text-[#141414] uppercase">{desaName}</h3>
    <p className="text-gray-500 font-mono text-[10px] font-bold uppercase tracking-wider mb-2">{kecName}</p>
    <div className="w-full h-1 bg-[#141414] mb-3"></div>
    {data ? (
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-sm bg-emerald-50 p-1 border border-emerald-200">
          <span className="font-mono">🌾 Sawah:</span>
          <span className="font-bold">{data.lahanSawah.toLocaleString('id-ID')} Ha</span>
        </div>
        <div className="flex justify-between text-sm bg-yellow-50 p-1 border border-yellow-200">
          <span className="font-mono">🌽 Ladang:</span>
          <span className="font-bold">{data.lahanBukanSawah.toLocaleString('id-ID')} Ha</span>
        </div>
        <div className="mt-1 pt-2 border-t-2 border-[#141414]">
          <div className="flex justify-between text-sm font-black">
            <span>TOTAL:</span>
            <span>{data.jumlah.toLocaleString('id-ID')} Ha</span>
          </div>
        </div>
        <div className="mt-2 text-center text-xs font-mono font-bold bg-yellow-300 p-1.5 border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414]">
           {data.lahanSawah > 100 ? "🌟 SENTRA PADI" : data.lahanBukanSawah > 100 ? "🌟 SENTRA PALAWIJA" : "POTENSI BERKEMBANG"}
        </div>
      </div>
    ) : (
      <p className="text-sm italic text-gray-400">Data tidak tersedia di API</p>
    )}
  </div>
);

export const MapWidget = ({ data = [] }: MapWidgetProps) => {
  const [desaGeoData, setDesaGeoData] = useState<any>(null);
  const [kecGeoData, setKecGeoData] = useState<any>(null);
  
  // States for interactive features
  const [activeMetric, setActiveMetric] = useState<"lahanSawah" | "lahanBukanSawah" | "jumlah">("lahanSawah");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeLegendCategory, setActiveLegendCategory] = useState<number | null>(null);

  useEffect(() => {
    fetch("/peta_desa_v3.geojson").then((res) => res.json()).then(setDesaGeoData).catch(console.error);
    fetch("/peta_kecamatan.geojson").then((res) => res.json()).then(setKecGeoData).catch(console.error);
  }, []);

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

  const getDesaStyle = (feature: any) => {
    const desaData = getDesaData(feature);
    const desaName = (feature.properties?.Nama_Desa_ || feature.properties?.Name || "").toUpperCase();
    
    // Default style
    let fillColor = "#cccccc";
    let fillOpacity = 0.2;
    let weight = 0.5;
    let opacity = 0.8;

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
        else if (metricValue > 50) { fillColor = "#34d399"; category = 1; }
        else { fillColor = "#6ee7b7"; category = 0; }
      }

      // Smart Filter: Interactive Legend Check
      const matchesLegend = activeLegendCategory === null || activeLegendCategory === category;

      if (matchesSearch && matchesLegend) {
        fillOpacity = 0.8;
        weight = 1;
      } else {
        // Mute if not matching search or legend
        fillOpacity = 0.1;
        opacity = 0.2;
        fillColor = "#a1a1aa";
      }
    } else {
      // No Data behavior
      if (!matchesSearch) {
        fillOpacity = 0.05;
        opacity = 0.1;
      }
    }

    return {
      fillColor,
      weight,
      opacity,
      color: "#27272a",
      dashArray: "",
      fillOpacity,
    };
  };

  const kecStyle = { fillColor: "transparent", color: "#d946ef", weight: 1, opacity: 0.6, fillOpacity: 0 };

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
      { label: "50 - 150 Ha", color: "#34d399", cat: 1 },
      { label: "< 50 Ha", color: "#6ee7b7", cat: 0 },
    ];
  }, [activeMetric]);

  return (
    <div className="flex flex-col h-full w-full relative group/map">
      
      {/* --- TOP LEFT: Dropdown Choropleth --- */}
      <div className="absolute top-4 left-4 z-[1000] bg-white border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] p-2 flex flex-col gap-1 w-[220px]">
        <label className="text-[10px] font-mono font-bold uppercase text-neutral-500">Pilih Layer Metrik</label>
        <select 
          className="font-mono text-[11px] font-bold uppercase p-1.5 border-2 border-[#141414] focus:outline-none cursor-pointer bg-neutral-50"
          value={activeMetric}
          onChange={(e) => setActiveMetric(e.target.value as any)}
        >
          <option value="lahanSawah">Lahan Sawah (Padi)</option>
          <option value="lahanBukanSawah">Ladang (Palawija)</option>
          <option value="jumlah">Total Keseluruhan</option>
        </select>
      </div>

      {/* --- TOP RIGHT: Search Bar --- */}
      <div className="absolute top-4 right-4 z-[1000] flex">
        <div className="bg-white border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] flex items-center p-1 w-[200px] transition-all focus-within:w-[250px]">
          <Search className="text-neutral-400 mx-2" size={16} />
          <input 
            type="text" 
            placeholder="CARI DESA..." 
            className="w-full font-mono text-[11px] font-bold uppercase focus:outline-none bg-transparent"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="px-2 font-black text-red-500 hover:bg-red-50">X</button>
          )}
        </div>
      </div>

      {/* --- BOTTOM RIGHT: Interactive Legend --- */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-white border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] p-3 flex flex-col gap-2">
        <span className="text-[10px] font-mono font-bold uppercase text-neutral-500 border-b-2 border-[#141414] pb-1">
          Legenda & Filter
        </span>
        <div className="flex flex-col gap-1.5">
          {legendConfig.map((item, idx) => (
            <div 
              key={idx} 
              className={`flex items-center gap-2 cursor-pointer p-1 transition-all ${activeLegendCategory === item.cat ? 'bg-neutral-100 border border-[#141414]' : 'hover:bg-neutral-50 border border-transparent'}`}
              onClick={() => setActiveLegendCategory(activeLegendCategory === item.cat ? null : item.cat)}
            >
              <div className="w-4 h-4 border-2 border-[#141414]" style={{ backgroundColor: item.color }}></div>
              <span className="font-mono text-[10px] font-bold uppercase">{item.label}</span>
            </div>
          ))}
        </div>
        {activeLegendCategory !== null && (
          <button onClick={() => setActiveLegendCategory(null)} className="mt-1 text-[9px] font-mono font-black text-red-500 hover:underline text-left">
            Reset Filter
          </button>
        )}
      </div>

      {/* --- LEAFLET MAP --- */}
      <div className="h-[600px] w-full z-0 relative rounded-none overflow-hidden shadow-hd border-2 border-[#141414]">
        <MapContainer center={[-7.3941, 109.6965]} style={{ height: "100%", width: "100%" }} zoom={11}>
          <MapBounds data={kecGeoData} />
          
          <LayersControl position="bottomleft">
            <LayersControl.BaseLayer checked name="Basemap Terang">
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Basemap Standar">
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>

            {desaGeoData && (
              <LayersControl.Overlay checked name="🗺️ Area & Choropleth">
                <GeoJSON
                  key={`desa-${desaGeoData.features.length}-${data?.length || 0}-${activeMetric}-${searchQuery}-${activeLegendCategory}`}
                  data={desaGeoData}
                  style={getDesaStyle}
                  onEachFeature={(feature, layer) => {
                    const desaName = feature.properties?.Nama_Desa_ || feature.properties?.Name || "Tidak diketahui";
                    const kecName = feature.properties?.Kecamatan || "";
                    const desaData = getDesaData(feature);

                    // Render Rich Popup Component to string
                    const htmlContent = ReactDOMServer.renderToString(
                      <PopupContent desaName={desaName} kecName={kecName} data={desaData} />
                    );
                    
                    layer.bindPopup(htmlContent, { className: 'custom-popup-neobrutalism' });
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
                    const kecName = feature.properties?.Kecamatan || feature.properties?.WADMKC || "Tidak diketahui";
                    layer.bindTooltip(`KEC. ${kecName.toUpperCase()}`, { sticky: true, className: "font-mono font-bold text-xs uppercase" });
                  }}
                />
              </LayersControl.Overlay>
            )}

            {/* Custom Markers Layer */}
            <LayersControl.Overlay checked name="🏭 Penanda Lintas Sektor">
              <LayerGroup>
                {mockMarkers.map(marker => (
                  <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={marker.icon}>
                    <LeafletPopup>
                      <div className="font-sans min-w-[150px]">
                        <p className="text-[9px] font-mono font-bold text-neutral-500 uppercase">{marker.type}</p>
                        <h4 className="font-black text-sm uppercase leading-tight mb-1">{marker.name}</h4>
                        <p className="text-xs text-neutral-600">{marker.desc}</p>
                      </div>
                    </LeafletPopup>
                  </Marker>
                ))}
              </LayerGroup>
            </LayersControl.Overlay>

          </LayersControl>
        </MapContainer>
      </div>

    </div>
  );
};
