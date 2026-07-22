import { useEffect, useState } from "react";
import { Database, Sprout, Tractor, MapPin } from "lucide-react";

import DefaultLayout from "@/layouts/default";
import { StatWidget } from "@/components/StatWidget";
import { MapWidget } from "@/components/MapWidget";
import {
  fetchOpenDataPertanian,
  fetchLahanBanjarnegara,
  LahanDesa,
} from "@/services/api";
import { LandAreaChart } from "@/components/LandAreaChart";
import { WarningTable } from "@/components/WarningTable";

export default function IndexPage() {
  const [datasetCount, setDatasetCount] = useState<number | string>("...");
  const [lahanData, setLahanData] = useState<LahanDesa[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchOpenDataPertanian();

        setDatasetCount(data.result.count);
      } catch (error) {
        console.error(error);
        setDatasetCount("Error");
      }

      try {
        const lahan = await fetchLahanBanjarnegara();

        setLahanData(lahan);
      } catch (error) {
        console.error(error);
      }
    };

    loadData();
  }, []);

  const totalSawah = lahanData.reduce((acc, curr) => acc + curr.lahanSawah, 0);
  const totalBukanSawah = lahanData.reduce(
    (acc, curr) => acc + (curr.jumlah - curr.lahanSawah),
    0,
  );
  const totalDesa = lahanData.length;

  const formatNum = (num: number) =>
    new Intl.NumberFormat("id-ID").format(Math.round(num));

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8 py-2">
        {/* Hero / intro */}
        <section className="relative text-left animate-fade-in py-4 md:py-8 flex flex-col md:flex-row items-center justify-between gap-8 border-b-2 border-dashed border-neutral-300 pb-8">
          <div className="relative z-10 flex-1">
            <h2 className="font-serif italic text-3xl sm:text-5xl mt-2 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-800 to-teal-500 font-black drop-shadow-sm">
              Dashboard Analitik Pertanian
            </h2>
            <p className="font-mono text-sm md:text-base font-medium text-[#4a4a4a] mt-4 max-w-2xl border-l-4 border-emerald-500 pl-4 bg-white/80 py-1">
              Sistem Pemantauan Ketahanan Pangan & Prediksi Panen Kabupaten Banjarnegara berbasis Open Data API.
            </p>
          </div>
          <div className="w-full md:w-72 lg:w-96 shrink-0">
            <img
              src="/img/dashboard.png"
              alt="Grafik Dashboard SIMPERTAN"
              className="w-full h-auto border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] rounded-none object-cover bg-white"
            />
          </div>
        </section>

        {/* Stats Row */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatWidget
            icon={<Database size={20} />}
            title="Dataset Open Data"
            trend="Terhubung ke CKAN"
            trendUp={true}
            value={datasetCount}
            color="bg-blue-300"
          />
          <StatWidget
            icon={<Sprout size={20} />}
            title="Total Lahan Sawah"
            trend="Padi & Palawija"
            trendUp={true}
            value={`${formatNum(totalSawah)} Ha`}
            color="bg-emerald-300"
          />
          <StatWidget
            icon={<Tractor size={20} />}
            title="Lahan Bukan Sawah"
            trend="Tegalan & Perkebunan"
            trendUp={true}
            value={`${formatNum(totalBukanSawah)} Ha`}
            color="bg-amber-300"
          />
          <StatWidget
            icon={<MapPin size={20} />}
            title="Cakupan Wilayah"
            trend="Terpetakan"
            trendUp={true}
            value={`${totalDesa} Desa`}
            color="bg-purple-300"
          />
        </div>

        {/* Map Section */}
        <div className="w-full flex flex-col gap-4">
          <h3 className="text-lg font-mono font-bold uppercase flex items-center gap-2 text-[#141414] tracking-wide">
            <MapPin className="text-emerald-600" /> Peta Sebaran Lahan Pertanian
          </h3>
          <div className="group border-2 border-[#141414] rounded-none shadow-[4px_4px_0px_0px_#141414] p-2 bg-white transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
            <div className="w-full aspect-[4/3] md:aspect-[16/9] lg:aspect-[21/9] min-h-[500px] max-h-[80vh] rounded-none overflow-hidden border-2 border-transparent transition-colors duration-300 group-hover:border-emerald-100">
              <MapWidget data={lahanData} />
            </div>
          </div>
        </div>

        {/* Charts and Tables Row */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <LandAreaChart data={lahanData} />
          <WarningTable data={lahanData} />
        </div>
      </section>
    </DefaultLayout>
  );
}
