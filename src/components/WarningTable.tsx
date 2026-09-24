import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";
import { LahanDesa } from "@/services/api";

interface WarningTableProps {
  data: LahanDesa[];
}

export const WarningTable = ({ data }: WarningTableProps) => {
  const worst5 = [...data].sort((a, b) => a.jumlah - b.jumlah).slice(0, 5);

  const analyzedData = worst5.map((row, idx) => {
    let status = "Aman";
    let isu = "Lahan usaha tani memadai (≥ 100 Ha)";

    // Kalibrasi terhadap distribusi total_dikuasai ST2023 (n=278 desa):
    // min 4,6 | p10 59,6 | p25 93,6 | median 162,2 | p90 342,9 | max 784,2 Ha
    if (row.jumlah < 60) {
      status = "Bahaya";
      isu = "Lahan usaha tani sangat sempit (< 60 Ha)";
    } else if (row.jumlah < 100) {
      status = "Waspada";
      isu = "Lahan usaha tani terbatas (60–100 Ha)";
    }

    return {
      id: idx,
      desa: row.desa,
      kecamatan: row.kecamatan,
      status: status as "Aman" | "Waspada" | "Bahaya",
      isu: isu,
      lahan: row.jumlah,
    };
  });

  const statusStyleMap = {
    Aman: "bg-emerald-100 text-emerald-800 border-emerald-600",
    Waspada: "bg-amber-100 text-amber-800 border-amber-600",
    Bahaya: "bg-red-100 text-red-800 border-red-600",
  } as const;

  const getStatusIcon = (status: string) => {
    if (status === "Bahaya")
      return <AlertTriangle className="mr-1" size={14} />;
    if (status === "Waspada") return <ShieldAlert className="mr-1" size={14} />;

    return <ShieldCheck className="mr-1" size={14} />;
  };

  return (
    <div
      className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow transition-all duration-200 h-full flex flex-col p-6 transition-all duration-300 hover:shadow"
    >
      <div className="flex items-center gap-2 mb-4 border-b-2 border-[#e2e8f0] pb-3">
        <AlertTriangle className="text-red-600" />
        <h4 className="text-lg font-bold uppercase tracking-wide">Analisa Lahan Kritis</h4>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="border-b-2 border-[#e2e8f0] text-xs font-bold text-neutral-700">
              <th className="pb-3 px-2">DESA</th>
              <th className="pb-3 px-2 text-right">LAHAN USAHA TANI (Ha)</th>
              <th className="pb-3 px-6 text-center">STATUS</th>
              <th className="pb-3 px-2">ISU UTAMA</th>
            </tr>
          </thead>
          <tbody>
            {analyzedData.length === 0 ? (
              <tr>
                <td className="py-8 text-center text-default-400 " colSpan={4}>
                  Memuat analisa lahan...
                </td>
              </tr>
            ) : (
              analyzedData.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[#e2e8f0]/20 hover:bg-neutral-50 transition-colors"
                >
                  <td className="py-4 px-2 font-bold uppercase text-neutral-800 text-xs">
                    {item.desa}
                    <span className="block font-sans font-normal normal-case text-[10px] text-neutral-400 mt-0.5">
                      {item.kecamatan}
                    </span>
                  </td>
                  <td className="py-4 px-2 text-right font-bold text-neutral-800">
                    {item.lahan.toLocaleString("id-ID", { maximumFractionDigits: 4 })}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-1 border font-bold text-[10px] uppercase shadow-sm ${statusStyleMap[item.status]}`}
                    >
                      {getStatusIcon(item.status)}
                      {item.status}
                    </span>
                  </td>
                  <td className="py-4 px-2 text-neutral-600 text-xs font-medium">
                    {item.isu}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[10px] leading-relaxed text-neutral-400">
        Sumber: BPS ST2023 Tabel 4.10 — luas lahan yang dikuasai usaha pertanian
        perorangan per desa (termasuk sawah, bukan sawah, tanaman tahunan, dan
        lahan usaha tani lainnya); bukan total luas wilayah desa.
      </p>
    </div>
  );
};
