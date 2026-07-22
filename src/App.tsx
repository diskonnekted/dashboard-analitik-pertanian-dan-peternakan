import { Route, Routes } from "react-router-dom";

import IndexPage from "@/pages/index";
import PredictionPage from "@/pages/prediction";
import SuitabilityPage from "@/pages/suitability";
import PriceVolatilityPage from "@/pages/price-volatility";
import FoodSecurityPage from "@/pages/food-security";
import SupplyChainPage from "@/pages/supply-chain";
import InfoPage from "@/pages/info";
import LivestockPage from "@/pages/livestock";
import FisheriesPage from "@/pages/fisheries";
import EconomicValuePage from "@/pages/economic-value";
import RecommendationsPage from "@/pages/recommendations";
import PlantationPage from "@/pages/plantation";
import HorticulturePage from "@/pages/horticulture";
import FarmersPage from "@/pages/farmers";
import RenstraPage from "@/pages/renstra";
import GovernmentAssistancePage from "@/pages/government-assistance";

function App() {
  return (
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
      <Route element={<InfoPage />} path="/info" />
    </Routes>
  );
}

export default App;
