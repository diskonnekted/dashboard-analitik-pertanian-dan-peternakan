import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { LoadingSpinner } from "@/components/ui";


const IndexPage = lazy(() => import("@/pages/index"));
const PredictionPage = lazy(() => import("@/pages/prediction"));
const SuitabilityPage = lazy(() => import("@/pages/suitability"));
const PriceVolatilityPage = lazy(() => import("@/pages/price-volatility"));
const FoodSecurityPage = lazy(() => import("@/pages/food-security"));
const SupplyChainPage = lazy(() => import("@/pages/supply-chain"));
const InfoPage = lazy(() => import("@/pages/info"));
const AdminPage = lazy(() => import("@/pages/admin"));
const LivestockPage = lazy(() => import("@/pages/livestock"));
const FisheriesPage = lazy(() => import("@/pages/fisheries"));
const EconomicValuePage = lazy(() => import("@/pages/economic-value"));
const RecommendationsPage = lazy(() => import("@/pages/recommendations"));
const PlantationPage = lazy(() => import("@/pages/plantation"));
const HorticulturePage = lazy(() => import("@/pages/horticulture"));
const FoodCropsPage = lazy(() => import("@/pages/food-crops"));
const LivestockFlowPage = lazy(() => import("@/pages/livestock-flow"));
const SensusPage = lazy(() => import("@/pages/sensus"));
const FarmersPage = lazy(() => import("@/pages/farmers"));
const RenstraPage = lazy(() => import("@/pages/renstra"));
const GovernmentAssistancePage = lazy(() => import("@/pages/government-assistance"));
const ManualPage = lazy(() => import("@/pages/manual"));
const ComingSoonPage = lazy(() => import("@/pages/coming-soon"));
const DesaDetailPage = lazy(() => import("@/pages/desa/[kec]-[nama]"));

function PageLoading() {
  return <LoadingSpinner height="min-h-[60vh]" label="Memuat halaman..." />;
}

function App() {
  return (
    <>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route element={<IndexPage />} path="/" />
          <Route element={<PredictionPage />} path="/prediction" />
          <Route element={<SuitabilityPage />} path="/suitability" />
          <Route element={<PriceVolatilityPage />} path="/price-volatility" />
          <Route element={<FoodSecurityPage />} path="/food-security" />
          <Route element={<SupplyChainPage />} path="/supply-chain" />
          <Route element={<LivestockPage />} path="/livestock" />
          <Route element={<LivestockFlowPage />} path="/livestock-flow" />
          <Route element={<FisheriesPage />} path="/fisheries" />
          <Route element={<EconomicValuePage />} path="/economic-value" />
          <Route element={<PlantationPage />} path="/plantation" />
          <Route element={<HorticulturePage />} path="/horticulture" />
          <Route element={<FoodCropsPage />} path="/food-crops" />
          <Route element={<SensusPage />} path="/sensus-2023" />
          <Route element={<FarmersPage />} path="/farmers" />
          <Route element={<RecommendationsPage />} path="/recommendations" />
          <Route element={<GovernmentAssistancePage />} path="/government-assistance" />
          <Route element={<RenstraPage />} path="/renstra" />
          <Route element={<ManualPage />} path="/manual" />
          <Route element={<InfoPage />} path="/info" />
          {/* Area internal — TIDAK ada di menu publik, akses langsung via URL */}
          <Route element={<AdminPage />} path="/admin" />
          <Route element={<DesaDetailPage />} path="/desa/:kec/:nama" />
          {/* Routes for modules in development */}
          <Route element={<ComingSoonPage />} path="/early-warning" />
          <Route element={<ComingSoonPage />} path="/master-petani" />
          <Route element={<ComingSoonPage />} path="/master-lahan" />
          <Route element={<ComingSoonPage />} path="/master-alsintan" />
          <Route element={<ComingSoonPage />} path="/ltt" />
          <Route element={<ComingSoonPage />} path="/opt" />
          <Route element={<ComingSoonPage />} path="/irigasi" />
          <Route element={<ComingSoonPage />} path="/kawasan-hortikultura" />
          <Route element={<ComingSoonPage />} path="/sertifikasi-mutu" />
          <Route element={<ComingSoonPage />} path="/kemitraan" />
          <Route element={<ComingSoonPage />} path="/kesehatan-hewan" />
          <Route element={<ComingSoonPage />} path="/pakan-ternak" />
          <Route element={<ComingSoonPage />} path="/kesehatan-ikan" />
          <Route element={<ComingSoonPage />} path="/cpd" />
          <Route element={<ComingSoonPage />} path="/penyuluhan" />
          <Route element={<ComingSoonPage />} path="/kinerja-penyuluh" />
          <Route element={<ComingSoonPage />} path="/monev" />
          <Route element={<ComingSoonPage />} path="/user-management" />
          <Route element={<ComingSoonPage />} path="/settings" />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
