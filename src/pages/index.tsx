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
        {/* Header Section */}
        <div className="bg-emerald-100 border-2 border-[#141414] rounded-none shadow-[4px_4px_0px_0px_#141414] p-6 text-left">
          <h1 className="text-3xl md:text-4xl font-serif font-black uppercase tracking-tight text-[#141414]">
            Dashboard Analitik Pertanian
          </h1>
          <p className="text-xs font-mono font-bold text-neutral-600 mt-2 uppercase tracking-wide">
            Sistem Pemantauan Ketahanan Pangan & Prediksi Panen Kabupaten
            Banjarnegara berbasis Open Data API
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatWidget
            icon={<Database size={20} />}
            title="Dataset Open Data"
            trend="Terhubung ke CKAN"
            trendUp={true}
            value={datasetCount}
          />
          <StatWidget
            icon={<Sprout size={20} />}
            title="Total Lahan Sawah"
            trend="Padi & Palawija"
            trendUp={true}
            value={`${formatNum(totalSawah)} Ha`}
          />
          <StatWidget
            icon={<Tractor size={20} />}
            title="Lahan Bukan Sawah"
            trend="Tegalan & Perkebunan"
            trendUp={true}
            value={`${formatNum(totalBukanSawah)} Ha`}
          />
          <StatWidget
            icon={<MapPin size={20} />}
            title="Cakupan Wilayah"
            trend="Terpetakan"
            trendUp={true}
            value={`${totalDesa} Desa`}
          />
        </div>

        {/* Map Section */}
        <div className="w-full flex flex-col gap-4">
          <h3 className="text-xl font-serif font-black uppercase flex items-center gap-2 text-[#141414]">
            <MapPin className="text-emerald-600" /> Peta Sebaran Lahan Pertanian
          </h3>
          <div className="border-2 border-[#141414] rounded-none shadow-[4px_4px_0px_0px_#141414] p-2 bg-white">
            <div className="h-[400px] w-full rounded-none overflow-hidden">
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
