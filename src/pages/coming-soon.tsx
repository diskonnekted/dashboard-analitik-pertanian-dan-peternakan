import { useLocation, Link } from "react-router-dom";
import { Construction, ArrowLeft } from "lucide-react";
import { siteConfig } from "@/config/site";

export default function ComingSoon() {
  const location = useLocation();
  const path = location.pathname;

  // Find the label from siteConfig
  const navItem = siteConfig.navItems.find((item) => item.href === path);
  const title = navItem?.label ?? path.split("/").pop()?.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) ?? "Modul";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-amber-100 mb-6">
          <Construction className="w-10 h-10 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-3 capitalize">{title}</h1>
        <p className="text-sm text-slate-500 mb-2">
          Modul ini sedang dalam pengembangan.
        </p>
        <p className="text-xs text-slate-400 mb-8">
          Konten akan segera tersedia pada pembaruan berikutnya.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
