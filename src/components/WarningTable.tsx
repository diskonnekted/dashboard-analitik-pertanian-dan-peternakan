import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";
import { LahanDesa } from "@/services/api";

interface WarningTableProps {
  data: LahanDesa[];
}

export const WarningTable = ({ data }: WarningTableProps) => {
  const worst5 = [...data].sort((a, b) => a.jumlah - b.jumlah).slice(0, 5);

  const analyzedData = worst5.map((row, idx) => {
    let status = "Aman";
    let isu = "Ketersediaan lahan ideal";

    if (row.jumlah < 50) {
      status = "Bahaya";
      isu = "Total lahan pertanian sangat minim";
    } else if (row.jumlah < 150) {
      status = "Waspada";
      isu = "Potensi penyempitan lahan";
    }

    return {
      id: idx,
      desa: row.desa,
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
      className="bg-white border-2 border-[#141414] rounded-none shadow-[4px_4px_0px_0px_#141414] h-full flex flex-col p-6"
    >
      <div className="flex items-center gap-2 mb-4 border-b-2 border-[#141414] pb-3">
        <AlertTriangle className="text-red-600" />
        <h4 className="text-xl font-serif font-black uppercase">Analisa Lahan Kritis</h4>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="border-b-2 border-[#141414] text-xs font-mono font-bold text-neutral-700">
              <th className="pb-3 px-2">DESA</th>
              <th className="pb-3 px-2 text-right">TOTAL LAHAN (Ha)</th>
              <th className="pb-3 px-6 text-center">STATUS</th>
              <th className="pb-3 px-2">ISU UTAMA</th>
            </tr>
          </thead>
          <tbody>
            {analyzedData.length === 0 ? (
              <tr>
                <td className="py-8 text-center text-default-400 font-mono" colSpan={4}>
                  Memuat analisa lahan...
                </td>
              </tr>
            ) : (
              analyzedData.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[#141414]/20 hover:bg-neutral-50 transition-colors"
                >
                  <td className="py-4 px-2 font-mono font-bold uppercase text-neutral-800 text-xs">
                    {item.desa}
                  </td>
                  <td className="py-4 px-2 text-right font-mono font-bold text-neutral-800">
                    {item.lahan.toLocaleString("id-ID")}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-1 border-2 font-mono font-bold text-[10px] uppercase shadow-[1px_1px_0px_0px_#141414] ${statusStyleMap[item.status]}`}
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
    </div>
  );
};
