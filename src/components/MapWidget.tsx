import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON, LayersControl, useMap, Marker, Popup as LeafletPopup, LayerGroup } from "react-leaflet";
import L from "leaflet";
import ReactDOMServer from "react-dom/server";
import { Search } from "lucide-react";

import "leaflet/dist/leaflet.css";
import { LahanDesa, KelompokTaniRow, fetchKelompokTani } from "@/services/api";

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

const marketIcon = createColoredIcon('#dc2626'); // merah — pasar/distribusi
const waterIcon = createColoredIcon('#2563eb');   // biru — infrastruktur air
const farmerIcon = createColoredIcon('#16a34a');  // hijau — kelompok tani

const mockMarkers = [
  { id: 1, name: "Pasar Induk Banjarnegara", lat: -7.3995, lng: 109.6975, type: "Rantai Pasok", icon: marketIcon, desc: "Pusat distribusi hasil pertanian utama di Banjarnegara." },
  { id: 2, name: "Bendungan Panglima Besar Jenderal Soedirman", lat: -7.3871, lng: 109.6108, type: "Infrastruktur Air", icon: waterIcon, desc: "Sumber irigasi utama untuk lahan sawah sekitarnya." },
  { id: 3, name: "Gapoktan Makmur Jaya", lat: -7.3621, lng: 109.7212, type: "Kelompok Tani", icon: farmerIcon, desc: "Kelompok tani percontohan untuk inovasi hortikultura." },
];

type AuxiliaryGeoJsonLayer = {
  key: string;
  name: string;
  file: string;
  color: string;
  fillColor: string;
  checked?: boolean;
  point?: boolean;
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
const PopupContent = ({ desaName, kecName, data, taniData }: { desaName: string, kecName: string, data: any, taniData?: KelompokTaniRow | null }) => (
  <div className="font-sans min-w-[260px]">
    <h3 className="font-black text-lg text-slate-800 uppercase">{desaName}</h3>
    <p className="text-gray-500 font-mono text-[10px] font-bold uppercase tracking-wider mb-2">{kecName}</p>
    <div className="w-full h-1 bg-[#e2e8f0] mb-3"></div>
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
        <div className="mt-1 pt-2 border-t-2 border-[#e2e8f0]">
          <div className="flex justify-between text-sm font-black">
            <span>TOTAL:</span>
            <span>{data.jumlah.toLocaleString('id-ID')} Ha</span>
          </div>
        </div>
        <div className="mt-2 text-center text-xs font-mono font-bold bg-yellow-300 p-1.5 border border-slate-200 shadow-sm">
           {data.lahanSawah > 100 ? "🌟 SENTRA PADI" : data.lahanBukanSawah > 100 ? "🌟 SENTRA PALAWIJA" : "POTENSI BERKEMBANG"}
        </div>
      </div>
    ) : (
      <p className="text-sm italic text-gray-400 mb-2">Data lahan tidak tersedia</p>
    )}

    {/* --- Kelembagaan Tani --- */}
    {taniData ? (
      <div className="mt-3 pt-2 border-t-2 border-[#e2e8f0]">
        <p className="text-[10px] font-mono font-black uppercase text-neutral-500 mb-2">Kelembagaan Tani ({taniData.tahun})</p>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs bg-green-50 p-1 border border-green-200">
            <span className="font-mono">👨‍🌾 Kelompok Tani:</span>
            <span className="font-bold">{taniData.kelompokTani}</span>
          </div>
          <div className="flex justify-between text-xs bg-green-50 p-1 border border-green-200">
            <span className="font-mono">👥 Anggota Tani:</span>
            <span className="font-bold">{taniData.anggotaTani.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-xs bg-blue-50 p-1 border border-blue-200">
            <span className="font-mono">🐟 Kelompok Perikanan:</span>
            <span className="font-bold">{taniData.kelompokPerikanan}</span>
          </div>
          <div className="flex justify-between text-xs bg-blue-50 p-1 border border-blue-200">
            <span className="font-mono">👥 Anggota Perikanan:</span>
            <span className="font-bold">{taniData.anggotaPerikanan.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-xs bg-amber-50 p-1 border border-amber-200">
            <span className="font-mono">🤝 Gapoktan:</span>
            <span className="font-bold">{taniData.gapoktan}</span>
          </div>
          <div className="flex justify-between text-xs bg-amber-50 p-1 border border-amber-200">
            <span className="font-mono">👥 Anggota Gapoktan:</span>
            <span className="font-bold">{taniData.anggotaGapoktan.toLocaleString('id-ID')}</span>
          </div>
          {(taniData.kelompokTaniHutan || 0) > 0 && (
            <>
              <div className="flex justify-between text-xs bg-emerald-50 p-1 border border-emerald-200">
                <span className="font-mono">🌲 KTH:</span>
                <span className="font-bold">{taniData.kelompokTaniHutan}</span>
              </div>
              <div className="text-[10px] font-mono text-neutral-600 leading-tight bg-neutral-50 p-1 border border-neutral-200">
                Pemula: {taniData.kthPemula || 0} • Madya: {taniData.kthMadya || 0} • Utama: {taniData.kthUtama || 0}
              </div>
            </>
          )}
        </div>
      </div>
    ) : (
      <p className="mt-3 pt-2 border-t-2 border-[#e2e8f0] text-sm italic text-gray-400">Data kelembagaan tani tidak tersedia</p>
    )}
  </div>
);

export const MapWidget = ({ data = [] }: MapWidgetProps) => {
  const [desaGeoData, setDesaGeoData] = useState<any>(null);
  const [kecGeoData, setKecGeoData] = useState<any>(null);
  const [auxiliaryLayers, setAuxiliaryLayers] = useState<Record<string, any>>({});
  const [taniData, setTaniData] = useState<KelompokTaniRow[]>([]);
  
  // States for interactive features
  const [activeMetric, setActiveMetric] = useState<"lahanSawah" | "lahanBukanSawah" | "jumlah">("lahanSawah");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeLegendCategory, setActiveLegendCategory] = useState<number | null>(null);

  useEffect(() => {
    // Load GeoJSON with localStorage cache fallback
    const loadGeoJSON = async (url: string, cacheKey: string, setter: (d: any) => void) => {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try { setter(JSON.parse(cached)); return; } catch {}
      }
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch {}
        setter(data);
      } catch (err) {
        console.error(`Gagal memuat ${url}:`, err);
      }
    };

    loadGeoJSON("/peta_desa_v3.geojson", "geojson_desa_cache", setDesaGeoData);
    loadGeoJSON("/peta_kecamatan.geojson", "geojson_kec_cache", setKecGeoData);
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

  const kecStyle = {
    fill: false,
    color: "#be123c",
    weight: 0.8,
    opacity: 0.6,
  };

  const getAuxiliaryStyle = (layer: AuxiliaryGeoJsonLayer) => ({
    color: layer.color,
    fillColor: layer.fillColor,
    weight: 1,
    opacity: 0.85,
    fillOpacity: 0.35,
  });

  const getAuxiliaryPopup = (feature: any, layerName: string) => {
    const props = feature.properties || {};
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
      { label: "50 - 150 Ha", color: "#34d399", cat: 1 },
      { label: "< 50 Ha", color: "#6ee7b7", cat: 0 },
    ];
  }, [activeMetric]);

  return (
    <div className="flex flex-col h-full w-full relative group/map">
      
      {/* --- TOP LEFT: Dropdown Choropleth (di bawah zoom control) --- */}
      <div className="absolute top-[70px] left-3 z-[1000] bg-white border border-slate-200 shadow-sm p-2 flex flex-col gap-1 w-[200px] rounded-lg">
        <label className="text-[10px] font-mono font-bold uppercase text-neutral-500">Pilih Layer Metrik</label>
        <select 
          className="font-mono text-[11px] font-bold uppercase p-1.5 border border-slate-200 focus:outline-none cursor-pointer bg-neutral-50 rounded"
          value={activeMetric}
          onChange={(e) => setActiveMetric(e.target.value as any)}
        >
          <option value="lahanSawah">Lahan Sawah (Padi)</option>
          <option value="lahanBukanSawah">Ladang (Palawija)</option>
          <option value="jumlah">Total Keseluruhan</option>
        </select>
      </div>

      {/* --- TOP RIGHT: Search Bar --- */}
      <div className="absolute top-3 right-3 z-[1000] flex">
        <div className="bg-white border border-slate-200 shadow-sm flex items-center p-1 w-[190px] transition-all focus-within:w-[230px] rounded-lg">
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
        <MapContainer center={[-7.3941, 109.6965]} style={{ height: "100%", width: "100%" }} zoom={11}>
          <MapBounds data={kecGeoData} />
          
          <LayersControl position="bottomleft">
            <LayersControl.BaseLayer checked name="Basemap Standar">
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Basemap Terang">
              <TileLayer
                attribution='&copy; Esri'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
              />
            </LayersControl.BaseLayer>

            {desaGeoData && (
              <LayersControl.Overlay checked name="🗺️ Area & Choropleth">
                <GeoJSON
                  key={`desa-${desaGeoData.features.length}-${data?.length || 0}-${taniData.length || 0}-${activeMetric}-${searchQuery}-${activeLegendCategory}`}
                  data={desaGeoData}
                  style={getDesaStyle}
                  onEachFeature={(feature, layer) => {
                    const desaName = feature.properties?.Nama_Desa_ || feature.properties?.Name || "Tidak diketahui";
                    const kecName = feature.properties?.Kecamatan || "";
                    const desaData = getDesaData(feature);
                    const desaTaniData = getDesaTaniData(feature);

                    // Render Rich Popup Component to string
                    const htmlContent = ReactDOMServer.renderToString(
                      <PopupContent desaName={desaName} kecName={kecName} data={desaData} taniData={desaTaniData} />
                    );
                    
                    layer.bindPopup(htmlContent, { className: 'custom-popup-modern' });
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
                    pointToLayer={(_, latlng) =>
                      L.circleMarker(latlng, {
                        radius: 5,
                        color: layerConfig.color,
                        fillColor: layerConfig.fillColor,
                        fillOpacity: 0.9,
                        weight: 2,
                      })
                    }
                    style={() => getAuxiliaryStyle(layerConfig)}
                    onEachFeature={(feature, layer) => {
                      layer.bindPopup(getAuxiliaryPopup(feature, layerConfig.name), {
                        className: "custom-popup-modern",
                      });
                    }}
                  />
                </LayersControl.Overlay>
              );
            })}

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
