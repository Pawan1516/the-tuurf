import React, { useState, useContext } from 'react';
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
  Cpu
} from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import { adminAPI } from '../../api/client';
import MobileNav from '../../components/MobileNav';

const AdminReport = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [downloading, setDownloading] = useState(false);
  const [period, setPeriod] = useState('all');
  const [error, setError] = useState('');

  const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/slots', label: 'Slot Control', icon: Calendar },
    { to: '/admin/bookings', label: 'Booking Log', icon: Activity },
    { to: '/admin/workers', label: 'Workers', icon: Briefcase },
    { to: '/admin/report', label: 'Report', icon: PieChart },
  ];

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

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
      link.setAttribute('download', `intel-report-${period}-${new Date().toISOString().split('T')[0]}.${format}`);
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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row">
      <MobileNav user={user} logout={logout} navItems={navItems} dashboardTitle="Turf Ops" />

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-80 bg-white border-r border-gray-100 flex-col sticky top-0 h-screen z-50">
        <div className="p-8 border-b border-gray-50 flex items-center gap-4">
          <div className="bg-emerald-600 text-white p-2.5 rounded-2xl shadow-lg shadow-emerald-200">
            <Database size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none uppercase">The Turf</h1>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Admin</p>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2">
          <NavItem to="/admin/dashboard" label="Dashboard" icon={LayoutDashboard} />
          <NavItem to="/admin/slots" label="Slot Control" icon={Calendar} />
          <NavItem to="/admin/bookings" label="Booking Log" icon={Activity} />
          <NavItem to="/admin/workers" label="Workers" icon={Briefcase} />
          <NavItem to="/admin/report" label="Report" icon={PieChart} active />
        </nav>

        <div className="p-6 border-t border-gray-50">
          <button onClick={handleLogout} className="w-full flex items-center justify-between p-5 rounded-2xl bg-gray-900 text-white hover:bg-black transition-all group">
            <div className="flex items-center gap-3">
              <LogOut size={18} className="text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">Log Out</span>
            </div>
            <ChevronRight size={14} className="opacity-30 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
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

                  <div className="flex flex-col md:flex-row gap-3 md:gap-4 pt-6 md:pt-10">
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

              <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-xl shadow-emerald-900/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 text-emerald-900">
                  <Cpu size={100} />
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
