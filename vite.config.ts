import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
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
