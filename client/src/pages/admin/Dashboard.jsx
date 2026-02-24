import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import { adminAPI } from '../../api/client';
import { LogOut, TrendingUp, Calendar, Users, Activity, ChevronRight, PieChart, Download, ArrowUpRight, Database, Settings, LayoutDashboard, Briefcase, ArrowDownRight, X, Zap } from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [lastBookingCount, setLastBookingCount] = useState(0);
  const [showAlarm, setShowAlarm] = useState(false);
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState('all');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Audio Alarm (Base64 Chime)
  const playAlarm = () => {
    const audio = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTv9mD9vT19XQVZFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    audio.play().catch(e => console.log("Audio play blocked by browser policy"));
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await adminAPI.getRevenue(period);
      const newStats = response.data;

      // ALARM LOGIC: Check if new booking arrived
      if (lastBookingCount > 0 && newStats.totalBookings > lastBookingCount) {
        setShowAlarm(true);
        playAlarm();
        setTimeout(() => setShowAlarm(false), 8000); // Hide alert after 8s
      }

      setStats(newStats);
      setLastBookingCount(newStats.totalBookings);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
    // Start polling for "Alarm" every 10 seconds
    const pollTimer = setInterval(fetchStats, 10000);
    return () => clearInterval(pollTimer);
  }, [period, lastBookingCount]);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  // Helper to generate a simple SVG line chart from dailyRevenue
  const renderMiniChart = (data) => {
    if (!data || Object.keys(data).length < 2) return null;
    const values = Object.values(data);
    const max = Math.max(...values, 1000);
    const width = 200;
    const height = 40;
    const points = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - (v / max) * height}`).join(' ');

    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke="#10b981"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
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
      {/* Sidebar */}
      <aside className="w-full md:w-80 bg-white border-r border-gray-100 flex flex-col sticky top-0 md:h-screen z-50">
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
          <NavItem to="/admin/dashboard" label="Dashboard" icon={LayoutDashboard} active />
          <NavItem to="/admin/slots" label="Slot Control" icon={Calendar} />
          <NavItem to="/admin/bookings" label="Booking Log" icon={Activity} />
          <NavItem to="/admin/workers" label="workers" icon={Briefcase} />
          <NavItem to="/admin/report" label="report" icon={PieChart} />
        </nav>

        <div className="p-6 border-t border-gray-50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between p-5 rounded-2xl bg-gray-900 text-white hover:bg-black transition-all group"
          >
            <div className="flex items-center gap-3">
              <LogOut size={18} className="text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">Log out</span>
            </div>
            <ChevronRight size={14} className="opacity-30 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        {/* NEW BOOKING ALARM TOAST */}
        {showAlarm && (
          <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[100] w-fit min-w-[320px] animate-bounce-slow">
            <div className="bg-emerald-600 text-white p-6 rounded-[2rem] shadow-2xl shadow-emerald-500/40 border-4 border-white flex items-center gap-6">
              <div className="bg-white/20 p-4 rounded-2xl animate-pulse">
                <Zap size={24} className="fill-white" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-100">Intrusion Alert</p>
                <h4 className="text-xl font-black uppercase tracking-tighter">New Booking Found</h4>
              </div>
              <button onClick={() => navigate('/admin/bookings')} className="ml-4 bg-white text-emerald-700 px-6 py-3 rounded-xl font-black uppercase text-[10px] hover:bg-emerald-50 transition-all">
                Audit Registry
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md px-10 h-24 flex items-center justify-between sticky top-0 z-40 border-b border-gray-100">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase leading-none">Dashboard</h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1"></p>
            </div>
            <div className="h-10 w-[1px] bg-gray-100 hidden md:block"></div>
            <div className="hidden md:flex flex-col">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">{currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
              <p className="text-xl font-black text-gray-900 tracking-tighter tabular-nums">{currentTime.toLocaleTimeString()}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-10 w-[1px] bg-gray-100 mx-2"></div>
            <div className="flex flex-col items-end">
              <span className="text-sm font-black text-gray-900 uppercase tracking-tight">{user?.name || 'Grand Administrator'}</span>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">admin</span>
            </div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black overflow-hidden border border-emerald-100">
              ADMIN
            </div>
          </div>
        </header>

        <div className="p-10 space-y-10">

          {/* Period Switcher & Revenue Hero */}
          <div className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 bg-emerald-950 rounded-[3rem] p-10 shadow-2xl shadow-emerald-900/20 relative overflow-hidden group border border-white/5">
              <div className="absolute top-0 right-0 p-12 opacity-10 text-white group-hover:scale-110 transition-transform duration-700">
                <TrendingUp size={180} />
              </div>

              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em]"> Revenue</p>
                  <div className="flex items-end gap-3">
                    <h3 className="text-7xl font-black text-white tracking-tighter drop-shadow-2xl">₹{stats?.totalRevenue.toLocaleString() || '0'}</h3>
                    <div className="flex items-center gap-1 text-emerald-400 font-black text-xs mb-3 bg-white/10 px-4 py-1.5 rounded-full border border-white/5 backdrop-blur-sm">
                      <Zap size={14} className="fill-emerald-400" /> Live
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-emerald-100/40 text-[10px] font-black uppercase tracking-[0.2em]">Based on {period} time scale</p>
                    <div className="h-4 w-[1px] bg-white/10"></div>
                    <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em]">{stats?.totalBookings || 0} Transactions</p>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-md p-2 rounded-[2rem] border border-white/10 flex items-center gap-1">
                  {['all', 'daily', 'weekly', 'monthly'].map(p => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${period === p
                        ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 scale-105'
                        : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-xl shadow-emerald-900/5 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Total Bookings</p>
                <h4 className="text-4xl font-black text-gray-900 tracking-tight">{stats?.totalBookings || '0'}</h4>
                <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase">Processed Bookings</p>
              </div>
              <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-900 uppercase">Growth</p>
                  {renderMiniChart(stats?.dailyRevenue)}
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {[
              { label: 'Confirmed Access', val: stats?.statusBreakdown.confirmed || 0, color: 'text-emerald-600', icon: TrendingUp },
              { label: 'Pending Approvals', val: stats?.statusBreakdown.pending || 0, color: 'text-yellow-500', icon: Activity },
              { label: 'System Rejections', val: stats?.statusBreakdown.rejected || 0, color: 'text-red-500', icon: ArrowDownRight },
              { label: 'Current Hold', val: stats?.statusBreakdown.hold || 0, color: 'text-gray-400', icon: Database },
              { label: 'Historical Data', val: stats?.totalBookings || 0, color: 'text-emerald-950', icon: Activity }
            ].map((m, i) => (
              <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-emerald-900/5 group hover:border-emerald-200 transition-colors">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">{m.label}</p>
                <div className="flex items-end justify-between">
                  <span className={`text-4xl font-black ${m.color}`}>{m.val}</span>
                  <div className="p-3 bg-gray-50 text-gray-400 rounded-2xl group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                    <m.icon size={20} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* AUTO MACHINE & AI AGENT PANEL */}
          <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-2xl shadow-emerald-900/5 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <Zap size={100} className="text-emerald-600" />
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-10">
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tighter uppercase leading-none">Automated Intelligence Node</h3>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-2">Auto-Machine & AI Agent Deployment Status</p>
              </div>
              <button
                onClick={async () => {
                  try {
                    await adminAPI.syncSlots();
                    alert('Protocol Alpha: Infrastructure Synchronization Completed.');
                  } catch (e) {
                    alert('Synchronization Interrupt: System error.');
                  }
                }}
                className="bg-gray-900 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-200 flex items-center gap-3"
              >
                <Database size={14} /> Re-Sync Infrastructure
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 relative group overflow-hidden">
                <div className="flex items-center gap-4 relative z-10">
                  <div className="bg-emerald-100 text-emerald-600 p-3 rounded-xl shadow-sm group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <Zap size={18} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">AI Agent Node</p>
                    <p className="text-sm font-black text-gray-900 uppercase">Status: Operational</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">GPT-4o Model Connected</p>
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 relative group overflow-hidden">
                <div className="flex items-center gap-4 relative z-10">
                  <div className="bg-blue-100 text-blue-600 p-3 rounded-xl shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Database size={18} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Auto Machine</p>
                    <p className="text-sm font-black text-gray-900 uppercase">Auto-Generator: Active</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                  <p className="text-[9px] font-bold text-blue-600 uppercase tracking-tighter">30-Day Forward Scanning</p>
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 relative group overflow-hidden">
                <div className="flex items-center gap-4 relative z-10">
                  <div className="bg-purple-100 text-purple-600 p-3 rounded-xl shadow-sm group-hover:bg-purple-600 group-hover:text-white transition-all">
                    <Activity size={18} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Sync Protocol</p>
                    <p className="text-sm font-black text-gray-900 uppercase">Frequency: Hourly</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                  <p className="text-[9px] font-bold text-purple-600 uppercase tracking-tighter">Real-time DB Integrity</p>
                </div>
              </div>
            </div>
          </div>

          {/* Data Visualization & Quick Actions */}
          <div className="grid lg:grid-cols-3 gap-10">

            {/* Status Breakdown Viz */}
            <div className="lg:col-span-2 bg-white rounded-[3rem] p-10 border border-gray-100 shadow-2xl shadow-emerald-900/5">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] mb-10 flex items-center gap-3">
                <PieChart size={18} className="text-emerald-600" /> Portfolio Breakdown
              </h3>

              <div className="space-y-8">
                {[
                  { label: 'Confirmed Revenue', count: stats?.statusBreakdown.confirmed, total: stats?.totalBookings, color: 'bg-emerald-500', icon: TrendingUp },
                  { label: 'Pending Potential', count: stats?.statusBreakdown.pending, total: stats?.totalBookings, color: 'bg-yellow-500', icon: Activity },
                  { label: 'Lost Opportunity', count: stats?.statusBreakdown.rejected, total: stats?.totalBookings, color: 'bg-red-500', icon: X }
                ].map((item, i) => {
                  const percentage = item.total > 0 ? (item.count / item.total) * 100 : 0;
                  return (
                    <div key={i} className="space-y-4">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-black text-gray-900 uppercase tracking-widest">{item.label}</span>
                        <span className="font-black text-gray-400 tracking-tighter">{item.count} items / {percentage.toFixed(0)}%</span>
                      </div>
                      <div className="h-4 w-full bg-gray-50 rounded-full overflow-hidden flex">
                        <div
                          className={`h-full ${item.color} shadow-lg shadow-emerald-500/10 transition-all duration-1000 ease-out`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-12 p-8 bg-gray-50 rounded-[2rem] border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white p-3 rounded-xl shadow-sm"><Users size={20} className="text-emerald-600" /></div>
                  <div>
                    <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Ground Personnel</p>
                    <p className="text-xl font-black text-gray-900 leading-none">Status: Nominal</p>
                  </div>
                </div>
                <button onClick={() => navigate('/admin/workers')} className="bg-white px-6 py-3 rounded-xl font-black uppercase text-[10px] text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm">Manage Force</button>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-emerald-950 rounded-[3rem] p-10 shadow-2xl shadow-emerald-950/20 text-white space-y-8">
              <h3 className="text-[10px] font-black text-emerald-400/60 uppercase tracking-[0.2em] mb-4">Command Actions</h3>

              <div className="space-y-4">
                <Link to="/admin/slots" className="w-full bg-white/5 hover:bg-emerald-600 p-6 rounded-[2rem] border border-white/5 flex items-center gap-5 transition-all group">
                  <div className="bg-white/10 p-4 rounded-2xl group-hover:bg-black/20 transition-colors"><Calendar size={20} /></div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest">Calibrate Slots</p>
                    <p className="text-[9px] text-white/40 uppercase tracking-widest mt-1">Infrastructure Config</p>
                  </div>
                </Link>

                <Link to="/admin/bookings" className="w-full bg-white/5 hover:bg-emerald-600 p-6 rounded-[2rem] border border-white/5 flex items-center gap-5 transition-all group">
                  <div className="bg-white/10 p-4 rounded-2xl group-hover:bg-black/20 transition-colors"><Activity size={20} /></div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest">Audit Logs</p>
                    <p className="text-[9px] text-white/40 uppercase tracking-widest mt-1">Traffic Verification</p>
                  </div>
                </Link>

                <Link to="/admin/report" className="w-full bg-white/5 hover:bg-emerald-600 p-6 rounded-[2rem] border border-white/5 flex items-center gap-5 transition-all group">
                  <div className="bg-white/10 p-4 rounded-2xl group-hover:bg-black/20 transition-colors"><Download size={20} /></div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest">Extract Intel</p>
                    <p className="text-[9px] text-white/40 uppercase tracking-widest mt-1">Generation protocol</p>
                  </div>
                </Link>
              </div>

              <div className="bg-emerald-400 text-black p-8 rounded-[2rem] shadow-2xl shadow-emerald-400/20 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Settings size={20} className="animate-spin-slow" />
                  <span className="font-black uppercase text-xs tracking-widest">System Health</span>
                </div>
                <div className="space-y-2">
                  <div className="h-1.5 w-full bg-black/10 rounded-full overflow-hidden">
                    <div className="h-full bg-black w-[98%] rounded-full"></div>
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-widest">All Nodes Synchronized: 98% Efficiency</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
