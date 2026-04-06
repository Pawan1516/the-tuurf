import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Activity,
  Briefcase,
  PieChart,
  LogOut,
  ChevronRight,
  FileText,
  Database,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Settings,
  Zap
} from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import { adminAPI } from '../../api/client';
import MobileNav from '../../components/MobileNav';
import AdminSidebar from '../../components/AdminSidebar';


const AdminReport = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [downloading, setDownloading] = useState(false);
  const [period, setPeriod] = useState('all');
  const [error, setError] = useState('');
  const [settings, setSettings] = useState({ TURF_NAME: 'The Turf' });
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/operations', label: 'Operations HUB', icon: Activity },
    { to: '/admin/slots', label: 'Slot Control', icon: Calendar },
    { to: '/admin/bookings', label: 'Booking Log', icon: Activity },
    { to: '/admin/workers', label: 'Workers Team', icon: Briefcase },
    { to: '/admin/users', label: 'User Control', icon: ShieldCheck },
    { to: '/admin/report', label: 'Intelligence', icon: PieChart },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
    { to: '/admin/scanner', label: 'QR Scanner', icon: Cpu }
  ];

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const fetchAIInsights = async () => {
    setAnalyzing(true);
    try {
        const { data } = await adminAPI.getExpertHub();
        if (data.success) {
            setAiAnalysis(data.report.businessAnalyst);
        }
    } catch (err) {
        console.error('AI Insight error:', err);
    } finally {
        setAnalyzing(false);
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await adminAPI.getSettings();
        if (data.success) {
          setSettings(prev => ({ ...prev, ...data.settings }));
        }
      } catch (err) {
        console.error('Settings fetch error:', err);
      }
    };
    fetchSettings();
    fetchAIInsights();
  }, []);

  const handleDownloadReport = async (format = 'pdf') => {
    setDownloading(true);
    setError('');

    try {
      const response = format === 'pdf'
        ? await adminAPI.downloadPDFReport({ period })
        : await adminAPI.downloadReport({ period }); // Placeholder if CSV for admin exists

      const blob = new Blob([response.data], { type: format === 'pdf' ? 'application/pdf' : 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `intel-report-${period}-${new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setError('Global intelligence extraction failure. Data node unreachable.');
      console.error('Download error:', error);
    } finally {
      setDownloading(false);
    }
  };

  const NavItem = ({ to, label, icon: Icon, active = false }) => (
    <Link
      to={to}
      className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all group ${active
        ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-200'
        : 'text-gray-400 hover:bg-emerald-50 hover:text-emerald-700'}`}
    >
      <Icon size={20} className={active ? 'text-white' : 'group-hover:text-emerald-600'} />
      <span className="text-xs font-black uppercase tracking-widest">{label}</span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row">
      <MobileNav user={user} logout={logout} navItems={navItems} dashboardTitle={settings.TURF_NAME} />

      <AdminSidebar user={user} logout={logout} turfName={settings.TURF_NAME} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24">

        <header className="bg-white/80 backdrop-blur-md px-6 md:px-10 h-20 md:h-24 flex items-center justify-between sticky top-0 z-40 border-b border-gray-100">
          <div className="flex flex-col">
            <h2 className="text-lg md:text-2xl font-black text-gray-900 tracking-tighter uppercase leading-none">Report Center</h2>
            <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Intel Extraction</p>
          </div>
        </header>

        <div className="p-4 md:p-10 space-y-8 md:space-y-10">
          {error && (
            <div className="bg-red-50 border border-red-100 p-6 rounded-[2rem] text-red-600 text-xs font-black uppercase tracking-tight flex items-center gap-4">
              <ShieldCheck className="rotate-180" size={18} /> {error}
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6 md:gap-10">

            {/* Primary Report Console */}
            <div className="bg-emerald-900 rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 text-white shadow-2xl shadow-emerald-900/20 flex flex-col justify-between group overflow-hidden relative">
              <div className="absolute -right-20 -bottom-20 p-20 opacity-5 text-emerald-400 rotate-12 group-hover:rotate-0 transition-transform duration-1000">
                <FileText size={400} />
              </div>

              <div className="relative z-10 space-y-6 md:space-y-8">
                <div className="space-y-2">
                  <p className="text-[8px] md:text-[10px] font-black text-emerald-400/60 uppercase tracking-[0.3em]">report generation</p>
                  <h3 className="text-2xl md:text-4xl font-black tracking-tighter uppercase leading-none">select <span className="text-emerald-400 italic">and download</span></h3>
                </div>
                <p className="text-emerald-100/40 text-xs md:text-sm font-medium leading-relaxed max-w-sm">
                  Generates a PDF containing revenue aggregates, operative performance, and granular booking metadata.
                </p>

                <div className="space-y-4 md:space-y-6 pt-6 md:pt-10">
                  <div className="grid grid-cols-2 md:flex gap-2">
                    {['all', 'daily', 'weekly', 'monthly'].map(p => (
                      <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`px-4 md:px-6 py-3 rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all ${period === p
                          ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-400/20'
                          : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3 md:gap-4 pt-6 md:pt-10">
                    <button
                      onClick={() => handleDownloadReport('pdf')}
                      disabled={downloading}
                      className="flex-1 bg-white text-emerald-900 py-4 md:py-6 rounded-xl md:rounded-2xl font-black uppercase text-[8px] md:text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-emerald-400 hover:text-black transition-all shadow-xl"
                    >
                      <TrendingUp size={16} className="rotate-45" />
                      {downloading ? 'Compiling...' : 'Download PDF'}
                    </button>
                    <button
                      onClick={() => handleDownloadReport('csv')}
                      disabled={downloading}
                      className="flex-1 bg-white/10 text-white py-4 md:py-6 rounded-xl md:rounded-2xl font-black uppercase text-[8px] md:text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-white/20 transition-all"
                    >
                      <Database size={16} className="text-emerald-400" />
                      {downloading ? 'Extracting...' : 'CSV Matrix'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Audit Details & Information */}
            <div className="space-y-6 md:space-y-8">
              <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-gray-100 shadow-xl shadow-emerald-900/5">
                <h4 className="text-[10px] md:text-xs font-black text-gray-900 uppercase tracking-[0.2em] mb-6 md:mb-8 flex items-center gap-3">
                  <TrendingUp size={18} className="text-emerald-600" /> Operational Metrics
                </h4>
                <div className="space-y-3 md:space-y-4">
                  {[
                    { label: 'Revenue Matrix', desc: 'Financial intake by unit' },
                    { label: 'Operative Logs', desc: 'Personnel efficiency' },
                    { label: 'Slot Density', desc: 'Infrastructure utilization' },
                    { label: 'Traffic Audit', desc: 'Booking tracking' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-4 p-3 md:p-4 rounded-xl md:rounded-2xl hover:bg-emerald-50/50 transition-colors group">
                      <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <BadgeCheck size={16} />
                      </div>
                      <div>
                        <p className="text-[9px] md:text-[10px] font-black text-gray-900 uppercase tracking-widest leading-none">{item.label}</p>
                        <p className="text-[8px] md:text-[10px] font-bold text-gray-400 mt-1 uppercase leading-none">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

                <div className="bg-slate-900 rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-10 border border-emerald-500/20 shadow-2xl relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-8 opacity-10 text-emerald-400 rotate-12 group-hover:rotate-0 transition-transform duration-1000">
                     <Cpu size={140} />
                   </div>
                   <div className="relative z-10 space-y-6">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
                            <Zap size={14} className="text-emerald-400 fill-emerald-400 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">AI Analyst Connected</span>
                         </div>
                         <button 
                            onClick={fetchAIInsights}
                            disabled={analyzing}
                            className="bg-white/5 hover:bg-white/10 p-2 rounded-lg text-white/40 hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50"
                         >
                            <TrendingUp size={14} className="rotate-45" />
                         </button>
                      </div>
                      
                      {analyzing ? (
                         <div className="space-y-4 animate-pulse">
                            <div className="h-4 bg-white/5 rounded-full w-3/4"></div>
                            <div className="h-3 bg-white/5 rounded-full w-full"></div>
                            <div className="h-3 bg-white/5 rounded-full w-2/3"></div>
                         </div>
                      ) : (
                         <div className="space-y-4">
                            <h4 className="text-sm font-black text-white uppercase tracking-widest leading-tight">
                               Strategy: <span className="text-emerald-400">{aiAnalysis?.status || 'Active Analysis'}</span>
                            </h4>
                            <p className="text-[11px] font-medium text-slate-400 leading-relaxed italic">
                               "{aiAnalysis?.report || 'System is currently synthesizing revenue trajectory. Click refresh to connect.'}"
                            </p>
                         </div>
                      )}
                      
                      <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                         <ShieldCheck size={12} className="text-emerald-500" />
                         <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Synchronized with Mumbai Node · Gemini High Intensity</span>
                      </div>
                   </div>
                </div>
              </div>
            </div>
        </div>
      </main>
    </div>
  );
};

// Placeholder for missing icon in previous file (used BadgeCheck from lucide)
const BadgeCheck = ({ size }) => (
  <ShieldCheck size={size} />
);

export default AdminReport;
