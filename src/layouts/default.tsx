import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  BookOpen,
  ChevronDown,
  Crop,
  Handshake,
  HeartPulse,
  Info,
  LayoutDashboard,
  Leaf,
  LineChart,
  Lock,
  MapPin,
  Menu,
  Scale,
  Tractor,
  Waves,
  X,
} from "lucide-react";
import { siteConfig } from "@/config/site";

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const location = useLocation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  // Grup menu yang sedang terbuka (accordion — hanya satu terbuka dalam satu waktu)
  const [openGroup, setOpenGroup] = useState<number | null>(null);

  // Buka otomatis grup yang memuat halaman aktif saat rute berubah
  useEffect(() => {
    const idx = siteConfig.navGroups.findIndex((g) =>
      g.items.some((it) => it.href === location.pathname),
    );
    if (idx >= 0) setOpenGroup(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Pemetaan ikon grup navigasi — kunci dari siteConfig.navGroups[].icon
  const getGroupIcon = (icon: string, active: boolean) => {
    const cls = `w-4 h-4 shrink-0 transition-colors ${active ? "text-emerald-400" : "text-slate-400 group-hover:text-emerald-300"}`;
    switch (icon) {
      case "pangan":
        return <Crop className={cls} />;
      case "horti":
        return <Leaf className={cls} />;
      case "ternak":
        return <HeartPulse className={cls} />;
      case "ikan":
        return <Waves className={cls} />;
      case "ketapang":
        return <Scale className={cls} />;
      case "renstra":
        return <LineChart className={cls} />;
      case "lembaga":
        return <Handshake className={cls} />;
      case "bantuan":
        return <Tractor className={cls} />;
      case "lahan":
        return <MapPin className={cls} />;
      default:
        return <LayoutDashboard className={cls} />;
    }
  };

  // Helper to get active page title
  const getPageTitle = () => {
    const activeItem = siteConfig.navItems.find(item => item.href === location.pathname);
    if (activeItem) return activeItem.label;
    // Halaman yang diakses dari tombol top bar (bukan dari menu samping)
    if (location.pathname === "/info") return "Info SISPERTANI";
    if (location.pathname === "/manual") return "Manual Book / Panduan";
    return "Dasbor Pertanian";
  };

  // Render grouped nav items — kategori ALL-CAPS, grup ikon+judul+subjudul, item dot-bullet
  const renderNavGroups = (onLinkClick?: () => void) => (
    <>
      {siteConfig.navGroups.map((group, groupIndex) => {
        // Grup kosong (semua item hidden) dilewati
        const visibleItems = group.items.filter((it) => !it.hidden);
        if (!visibleItems.length) return null;
        const hasTitle = !!group.title;
        const isOpen = hasTitle ? openGroup === groupIndex : true;
        const hasActiveChild = group.items.some((it) => it.href === location.pathname);
        return (
          <div key={groupIndex}>
            {group.category && (
              <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase px-3 pt-3.5 pb-1 select-none">
                {group.category}
              </div>
            )}
            {group.title && (
              <button
                type="button"
                onClick={() => setOpenGroup(openGroup === groupIndex ? null : groupIndex)}
                aria-expanded={isOpen}
                className={`w-full flex items-center justify-between px-2.5 py-2 mb-0.5 rounded-lg text-xs font-medium transition-all text-left group ${
                  hasActiveChild
                    ? "bg-slate-800/90 text-white border border-emerald-500/40 shadow-sm"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {group.icon && (
                    <span
                      className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                        isOpen || hasActiveChild
                          ? "bg-emerald-950/70 text-emerald-400 border border-emerald-800/40"
                          : "bg-slate-800/60 text-slate-400 group-hover:bg-slate-800 group-hover:text-slate-200 border border-transparent"
                      }`}
                    >
                      {getGroupIcon(group.icon, isOpen || hasActiveChild)}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 leading-tight">
                    <span
                      className={`block truncate text-[12px] font-semibold ${
                        isOpen || hasActiveChild ? "text-white" : "text-slate-300 group-hover:text-white"
                      }`}
                    >
                      {group.title}
                    </span>
                    {group.subtitle && (
                      <span className="block truncate text-[10px] font-normal text-slate-400 mt-0.5">
                        {group.subtitle}
                      </span>
                    )}
                  </span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 shrink-0 ml-1.5 transition-transform duration-200 text-slate-400 group-hover:text-slate-200 ${
                    isOpen ? "rotate-180 text-emerald-400" : ""
                  }`}
                />
              </button>
            )}
            {isOpen && (
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  const isDisabled = item.disabled;

                  if (isDisabled) {
                    return (
                      <div
                        key={item.href}
                        className="group flex items-center px-2.5 py-2 rounded-lg text-xs text-slate-600 cursor-not-allowed"
                        title="Modul belum tersedia"
                      >
                        <span className="w-1.5 h-1.5 rounded-full mr-2 shrink-0 bg-slate-700" />
                        <span className="flex-1 truncate">{item.label}</span>
                        <span className="text-[8px] text-slate-700 bg-slate-800/60 px-1.5 py-0.5 rounded">SOON</span>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={onLinkClick}
                      className={`group flex items-center px-2.5 py-2 rounded-lg text-xs transition-all ${
                        isActive
                          ? "bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-950/50"
                          : "text-slate-400 hover:bg-slate-800/60 hover:text-white font-medium"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full mr-2 shrink-0 transition-colors ${
                          isActive ? "bg-white" : "bg-slate-600 group-hover:bg-slate-400"
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );

  return (
    <div className="print-root flex flex-col h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      
      {/* Main Shell */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar Modern (Desktop) */}
        <aside className="no-print w-64 bg-slate-900 text-white flex flex-col flex-shrink-0 hidden md:flex border-r border-slate-800">
          <div className="h-[88px] p-5 border-b border-slate-800 bg-slate-950 flex items-center gap-3">
            <img src="/logo.svg" alt="Logo Dinas" className="w-10 h-10 object-contain shrink-0" />
            <div>
              <span className="font-sans font-bold text-base tracking-tight uppercase text-white block leading-none">
                SISPERTANI
              </span>
              <span className="text-[9px] font-semibold text-emerald-400 uppercase tracking-wider block mt-1">
                Kab. Banjarnegara
              </span>
            </div>
          </div>
          
          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {renderNavGroups()}
          </nav>

          {/* Floating Executive Card — ringkasan status data + pintu masuk admin */}
          <div className="p-3">
            <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 leading-snug">
                Portal Data Dinas — Distankan KP Banjarnegara
              </p>
              <p className="mt-1.5 flex items-center gap-1.5 text-[10px] font-medium text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Basis Data Terhubung
              </p>
              <Link
                to="/admin"
                className="mt-2.5 flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold tracking-wide transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
                Masuk Dasbor Admin
              </Link>
            </div>
          </div>
        </aside>
        
        {/* Right Content Area */}
        <div className="flex-grow flex flex-col overflow-hidden">
          {/* Top Bar Header Modern */}
          <header className="no-print h-[88px] bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <button 
                aria-label="Buka menu navigasi"
                className="md:hidden text-slate-600 mr-2 border border-slate-200 p-2 rounded-lg bg-white hover:bg-slate-50 transition-all" 
                onClick={() => setIsMobileSidebarOpen(true)}
              >
                <Menu className="w-4 h-4" />
              </button>
              <h2 className="text-lg font-sans font-bold text-slate-800">
                {getPageTitle()}
              </h2>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Info & Panduan — utilitas (bukan bagian menu samping) */}
              <Link
                to="/info"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-all"
                title="Info SISPERTANI"
              >
                <Info className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Info</span>
              </Link>
              <Link
                to="/manual"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-all"
                title="Manual Book / Panduan"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Panduan</span>
              </Link>

              {/* Login Button → pintu masuk dasbor admin internal */}
              <Link
                to="/admin"
                className="hidden sm:inline-flex items-center px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-all"
                title="Buka Dasbor Admin — manajemen data & import/export Excel"
              >
                <Lock className="w-3 h-3 mr-1" />
                Login
              </Link>
              
              {/* Guest Avatar */}
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-semibold text-slate-900">Guest</p>
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider leading-none">Pengunjung</p>
                </div>
                <div className="w-8 h-8 rounded-full border border-slate-200 bg-amber-100 flex items-center justify-center font-sans font-bold text-xs text-amber-800">
                  G
                </div>
              </div>
            </div>
          </header>
          
          {/* Page Content Area */}
          <main className="print-main flex-grow overflow-y-auto p-6 md:p-8 bg-slate-50 custom-scrollbar">
            {children}
          </main>
          
          {/* Footer */}
          <footer className="no-print bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between text-xs font-medium text-slate-500 shrink-0">
            <p>&copy; {new Date().getFullYear()} Dinas Pertanian, Perikanan dan Ketahanan Pangan Kab. Banjarnegara - SISPERTANI</p>
            <p className="hidden sm:block">V{siteConfig.version} • Rilis: {siteConfig.releaseDate} • Status: OK</p>
          </footer>
        </div>
      </div>
      
      {/* Mobile Sidebar overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex animate-fade-in"
          onClick={() => setIsMobileSidebarOpen(false)}
        >
          <div 
            className="w-64 h-full bg-slate-900 text-white flex flex-col p-5 shadow"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <img src="/logo.svg" alt="Logo Dinas" className="w-8 h-8 object-contain shrink-0" />
                <span className="font-sans font-bold text-sm text-white uppercase leading-none">
                  SISPERTANI
                </span>
              </div>
              <button 
                aria-label="Tutup menu navigasi"
                className="border border-slate-800 p-1.5 rounded-lg text-slate-400 hover:text-white" 
                onClick={() => setIsMobileSidebarOpen(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-grow overflow-y-auto mt-4 custom-scrollbar">
              {renderNavGroups(() => setIsMobileSidebarOpen(false))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
