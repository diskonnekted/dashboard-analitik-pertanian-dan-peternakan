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
      },
      "/dataset": {
        target: "https://opendata.banjarnegarakab.go.id",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
