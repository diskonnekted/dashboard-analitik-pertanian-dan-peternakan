import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [react(), tailwindcss()],
  build: {
    // Rolldown sudah memecah vendor besar (maplibre-gl ~1 MB, recharts,
    // leaflet) secara otomatis ke chunk terpisah. MapLibre hanya diimpor oleh
    // 4 halaman peta (lazy), jadi otomatis didefer; pastikan TIDAK ada impor
    // global "maplibre-gl/dist/maplibre-gl.css" di main.tsx (itu dulu menarik
    // JS maplibre ke grafik entry dan mem-preload-nya di semua halaman).
  },
  server: {
    proxy: {
      // Fase B: proxy ke backend read-only MySQL (backend/, port 4100).
      // /api sudah dipakai proxy CKAN di bawah, jadi prefix dev khusus
      // /sispertani-api yang ditulis-ulang ke /api di sisi backend.
      // Produksi: set VITE_API_BASE=https://api.pertanian.sistemdata.id/api
      // saat build; tanpa itu frontend otomatis fallback ke CSV lokal.
      "/sispertani-api": {
        target: "http://127.0.0.1:4100",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sispertani-api/, "/api"),
      },
      "/api": {
        target: "https://opendata.banjarnegarakab.go.id",
        changeOrigin: true,
        secure: false,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Connection": "keep-alive"
        }
      },
      "/dataset": {
        target: "https://opendata.banjarnegarakab.go.id",
        changeOrigin: true,
        secure: false,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Connection": "keep-alive"
        }
      },
    },
  },
});
