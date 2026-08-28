import { Suspense, lazy, useCallback, useState } from "react";
import { Route, Routes } from "react-router-dom";

import { AppLoader } from "@/components/AppLoader";

const IndexPage = lazy(() => import("@/pages/index"));
const PredictionPage = lazy(() => import("@/pages/prediction"));
const SuitabilityPage = lazy(() => import("@/pages/suitability"));
const PriceVolatilityPage = lazy(() => import("@/pages/price-volatility"));
const FoodSecurityPage = lazy(() => import("@/pages/food-security"));
const SupplyChainPage = lazy(() => import("@/pages/supply-chain"));
const InfoPage = lazy(() => import("@/pages/info"));
const LivestockPage = lazy(() => import("@/pages/livestock"));
const FisheriesPage = lazy(() => import("@/pages/fisheries"));
const EconomicValuePage = lazy(() => import("@/pages/economic-value"));
const RecommendationsPage = lazy(() => import("@/pages/recommendations"));
const PlantationPage = lazy(() => import("@/pages/plantation"));
const HorticulturePage = lazy(() => import("@/pages/horticulture"));
const FarmersPage = lazy(() => import("@/pages/farmers"));
const RenstraPage = lazy(() => import("@/pages/renstra"));
const GovernmentAssistancePage = lazy(() => import("@/pages/government-assistance"));
const ManualPage = lazy(() => import("@/pages/manual"));

function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
          Memuat modul...
        </p>
      </div>
    </div>
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const handleLoaderComplete = useCallback(() => setIsLoading(false), []);

  return (
    <>
      {isLoading && <AppLoader onComplete={handleLoaderComplete} />}
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route element={<IndexPage />} path="/" />
          <Route element={<PredictionPage />} path="/prediction" />
          <Route element={<SuitabilityPage />} path="/suitability" />
          <Route element={<PriceVolatilityPage />} path="/price-volatility" />
          <Route element={<FoodSecurityPage />} path="/food-security" />
          <Route element={<SupplyChainPage />} path="/supply-chain" />
          <Route element={<LivestockPage />} path="/livestock" />
          <Route element={<FisheriesPage />} path="/fisheries" />
          <Route element={<EconomicValuePage />} path="/economic-value" />
          <Route element={<PlantationPage />} path="/plantation" />
          <Route element={<HorticulturePage />} path="/horticulture" />
          <Route element={<FarmersPage />} path="/farmers" />
          <Route element={<RecommendationsPage />} path="/recommendations" />
          <Route element={<GovernmentAssistancePage />} path="/government-assistance" />
          <Route element={<RenstraPage />} path="/renstra" />
          <Route element={<ManualPage />} path="/manual" />
          <Route element={<InfoPage />} path="/info" />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
