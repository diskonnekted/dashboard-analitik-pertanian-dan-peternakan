import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.tsx";
import { Provider } from "./provider.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import "@/styles/globals.css";
// NOTE: CSS maplibre-gl tidak diimpor global di sini — tiap komponen peta
// (DesaMapMini/FsvaMap/KecamatanMapMini/SebaranBidangMap) sudah mengimpor
// "maplibre-gl/dist/maplibre-gl.css" sendiri. Impor global justru menarik
// chunk JS maplibre (~1 MB) ke grafik entry sehingga dipreload di semua halaman.

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Provider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </Provider>
    </BrowserRouter>
  </React.StrictMode>,
);
