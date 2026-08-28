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
      const [data, lahan] = await Promise.all([
        fetchOpenDataPertanian().catch((error) => {
          console.error(error);
          setDatasetCount("Error");
          return null;
        }),
        fetchLahanBanjarnegara().catch((error) => {
          console.error(error);
          return [];
        }),
      ]);

      if (data) setDatasetCount(data.result.count);
      if (lahan) setLahanData(lahan);
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
        <section className="relative text-left animate-fade-in py-4 md:py-8 flex flex-col md:flex-row items-center justify-between gap-8 border-b border-slate-200 pb-8">
          <div className="relative z-10 flex-1">
            <h2 className="text-2xl sm:text-4xl leading-tight font-bold tracking-tight text-slate-800">
              Dashboard Analitik Pertanian
            </h2>
            <p className="text-xs md:text-sm font-medium text-slate-500 mt-2 max-w-2xl border-l-2 border-blue-500 pl-3">
              Sistem Pemantauan Ketahanan Pangan & Prediksi Panen Kabupaten Banjarnegara berbasis Open Data API.
            </p>
          </div>
          <div className="w-full md:w-48 lg:w-64 shrink-0 flex items-center justify-center">
            <img
              src="/img/dashboard.png"
              alt="Grafik Dashboard SISPERTANI"
              className="w-full max-h-32 md:max-h-36 object-contain"
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
          <h3 className="text-lg font-mono font-bold uppercase flex items-center gap-2 text-slate-800 tracking-wide">
            <MapPin className="text-emerald-600" /> Peta Sebaran Lahan Pertanian
          </h3>
          <div className="group border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-2 bg-white transition-all duration-300 hover:shadow-md">
            <div className="w-full aspect-[4/3] md:aspect-[16/9] lg:aspect-[21/9] min-h-[500px] max-h-[80vh] rounded-xl overflow-hidden border border-transparent transition-colors duration-300 group-hover:border-emerald-100">
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
