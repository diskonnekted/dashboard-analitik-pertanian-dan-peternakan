import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { 
  LayoutDashboard, 
  TrendingUp, 
  Map, 
  LineChart, 
  ShieldCheck, 
  Truck, 
  Menu, 
  X, 
  Info,
  Fish,
  DollarSign,
  ClipboardList,
  Sprout,
  Cherry,
  Users,
  Coins,
  BookOpen,
  AlertTriangle,
  Database,
  Tractor,
  Crop,
  HeartPulse,
  Wheat,
  Droplets,
  Award,
  Handshake,
  Bone,
  Leaf,
  Waves,
  Scale,
  GraduationCap,
  Calendar,
  FileCheck,
  Activity,
  Settings,
  UserCog,
} from "lucide-react";
import { siteConfig } from "@/config/site";

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const location = useLocation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Helper to map route to its Lucide icon
  const getIcon = (label: string, isActive: boolean) => {
    const iconColor = isActive ? "text-white" : "text-slate-400 group-hover:text-white";
    const disabledColor = "text-slate-600";
    const classes = `w-4 h-4 mr-3 shrink-0 ${isActive ? iconColor : iconColor} transition-colors`;
    const disabledClasses = `w-4 h-4 mr-3 shrink-0 ${disabledColor}`;
    
    // Check if this is a disabled item
    const item = siteConfig.navItems.find(i => i.label === label);
    const isDisabled = item?.disabled;
    const cls = isDisabled ? disabledClasses : classes;

    switch (label) {
      case "Dashboard":
        return <LayoutDashboard className={cls} />;
      case "Peta Sebaran & Alert":
        return <AlertTriangle className={cls} />;
      case "Data Petani & NPP":
        return <Users className={cls} />;
      case "Data Lahan & Peta Digital":
        return <Map className={cls} />;
      case "Kesesuaian Lahan":
        return <Crop className={cls} />;
      case "Data Alsintan":
        return <Tractor className={cls} />;
      case "Luas Tambah Tanam & Luas Panen":
        return <Wheat className={cls} />;
      case "Prediksi Panen":
        return <TrendingUp className={cls} />;
      case "OPT / Hama & Penyakit":
        return <AlertTriangle className={cls} />;
      case "Irigasi & Tata Air":
        return <Droplets className={cls} />;
      case "Produksi Sayuran, Buah & Flora Hias":
        return <Cherry className={cls} />;
      case "Kawasan Hortikultura":
        return <Leaf className={cls} />;
      case "Sertifikasi & Mutu Hasil":
        return <Award className={cls} />;
      case "Komoditas Unggulan":
        return <Sprout className={cls} />;
      case "Kemitraan & Hilirisasi":
        return <Handshake className={cls} />;
      case "Populasi & Produksi Ternak":
        return <Database className={cls} />;
      case "Kesehatan Hewan & Zoonosis":
        return <HeartPulse className={cls} />;
      case "Pakan Ternak & Hijauan":
        return <Bone className={cls} />;
      case "Produksi Perikanan":
        return <Fish className={cls} />;
      case "Nilai Ekonomi & Pasar":
        return <DollarSign className={cls} />;
      case "Kesehatan Ikan & Lingkungan Perairan":
        return <Waves className={cls} />;
      case "Neraca Komoditas Pangan":
        return <ShieldCheck className={cls} />;
      case "Rantai Pasok & Distribusi":
        return <Truck className={cls} />;
      case "Fluktuasi Harga & Inflasi":
        return <LineChart className={cls} />;
      case "Cadangan Pangan Daerah":
        return <Scale className={cls} />;
      case "Kelembagaan Tani":
        return <Users className={cls} />;
      case "Jadwal & Materi Penyuluhan":
        return <Calendar className={cls} />;
      case "Penilaian Kinerja Penyuluh":
        return <GraduationCap className={cls} />;
      case "Analisis Bantuan":
        return <Coins className={cls} />;
      case "Analisis Renstra & RKPD":
        return <FileCheck className={cls} />;
      case "Rekomendasi Kebijakan":
        return <ClipboardList className={cls} />;
      case "Monitoring & Evaluasi":
        return <Activity className={cls} />;
      case "Info SISPERTANI":
        return <Info className={cls} />;
      case "Manual Book / Panduan":
        return <BookOpen className={cls} />;
      case "Manajemen User & Hak Akses":
        return <UserCog className={cls} />;
      case "Pengaturan Sistem":
        return <Settings className={cls} />;
      default:
        return <LayoutDashboard className={cls} />;
    }
  };

  // Helper to get active page title
  const getPageTitle = () => {
    const activeItem = siteConfig.navItems.find(item => item.href === location.pathname);
    return activeItem ? activeItem.label : "Dasbor Pertanian";
  };

  // Render grouped nav items
  const renderNavGroups = (onLinkClick?: () => void) => (
    <>
      {siteConfig.navGroups.map((group, groupIndex) => (
        <div key={groupIndex} className={group.title ? "mt-4 first:mt-0" : ""}>
          {group.title && (
            <p className="px-4 mb-1.5 text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider">
              {group.title}
            </p>
          )}
          <div className="space-y-1">
            {group.items.map((item) => {
              const isActive = location.pathname === item.href;
              const isDisabled = item.disabled;
              
              if (isDisabled) {
                return (
                  <div
                    key={item.href}
                    className="group flex items-center px-4 py-2.5 rounded-lg font-sans font-semibold text-xs tracking-wide text-slate-600 cursor-not-allowed"
                    title="Modul belum tersedia"
                  >
                    {getIcon(item.label, false)}
                    <span className="flex-1">{item.label}</span>
                    <span className="text-[8px] font-mono text-slate-700 bg-slate-800/60 px-1.5 py-0.5 rounded">SOON</span>
                  </div>
                );
              }
              
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onLinkClick}
                  className={`group flex items-center px-4 py-2.5 rounded-lg font-sans font-semibold text-xs tracking-wide transition-all duration-150 ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {getIcon(item.label, isActive)}
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );

  return (
    <div className="print-root flex flex-col h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      
      {/* Main Shell */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar Modern (Desktop) */}
        <aside className="no-print w-64 bg-slate-900 text-white flex flex-col flex-shrink-0 hidden md:flex border-r border-slate-800">
          <div className="h-[88px] p-5 border-b border-slate-800 bg-slate-950 flex items-center gap-3">
            <img src="/logo.png" alt="Logo Dinas" className="w-10 h-10 object-contain shrink-0" />
            <div>
              <span className="font-sans font-bold text-base tracking-tight uppercase text-white block leading-none">
                SISPERTANI
              </span>
              <span className="text-[9px] font-mono font-semibold text-slate-400 uppercase tracking-wider block mt-1">
                Kab. Banjarnegara
              </span>
            </div>
          </div>
          
          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {renderNavGroups()}
          </nav>
        </aside>
        
        {/* Right Content Area */}
        <div className="flex-grow flex flex-col overflow-hidden">
          {/* Top Bar Header Modern */}
          <header className="no-print h-[88px] bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <button 
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
              {/* Login Button */}
              <button
                disabled
                className="hidden sm:inline-flex items-center px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-400 cursor-not-allowed opacity-80"
                title="Login belum tersedia untuk pengunjung"
              >
                Login
              </button>
              
              {/* Guest Avatar */}
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-semibold text-slate-850">Guest</p>
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
            <p className="hidden sm:block">V1.2.0 • Status: OK</p>
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
            className="w-64 h-full bg-slate-900 text-white flex flex-col p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="Logo Dinas" className="w-8 h-8 object-contain shrink-0" />
                <span className="font-sans font-bold text-sm text-white uppercase leading-none">
                  SISPERTANI
                </span>
              </div>
              <button 
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
