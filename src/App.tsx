import { Route, Routes } from "react-router-dom";

import IndexPage from "@/pages/index";
import PredictionPage from "@/pages/prediction";
import SuitabilityPage from "@/pages/suitability";
import PriceVolatilityPage from "@/pages/price-volatility";
import FoodSecurityPage from "@/pages/food-security";
import SupplyChainPage from "@/pages/supply-chain";
import InfoPage from "@/pages/info";
import LivestockPage from "@/pages/livestock";

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
      <Route element={<InfoPage />} path="/info" />
    </Routes>
  );
}

export default App;
