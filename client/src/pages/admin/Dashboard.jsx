import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  LayoutDashboard,
  Calendar,
  Activity,
  Briefcase,
  PieChart as PieChartIcon,
  Database,
  CheckCircle,
  LogOut,
  ChevronRight,
  Users,
  TrendingUp,
  Zap,
  ArrowDownRight,
  X,
  Download,
  Settings,
  ScanLine,
  Bell,
  Cpu,
  ShieldCheck,
  MousePointer2,
  Layers,
  ArrowUpRight,
  Clock,
  Send,
  Loader2,
  Filter,
  BarChart3,
  BarChart as BarChartIcon,
  Maximize2,
  Info,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  CircleDot,
  FileText
} from 'lucide-react';
import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    BarChart, 
    Bar, 
    Cell, 
    PieChart, 
    Pie, 
    ComposedChart, 
    Line, 
    Legend 
} from 'recharts';
import AuthContext from '../../context/AuthContext';
import apiClient, { adminAPI, aiAPI } from '../../api/client';
import AdminSidebar from '../../components/AdminSidebar';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [lastBookingCount, setLastBookingCount] = useState(0);
  const [showAlarm, setShowAlarm] = useState(false);
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState('monthly');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [settings, setSettings] = useState({ TURF_NAME: 'The Turf' });
  const [loading, setLoading] = useState(true);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activityLogs, setActivityLogs] = useState([]);

  // AI Analyst State
  const [analystInsights, setAnalystInsights] = useState('');
  const [analyzingRevenue, setAnalyzingRevenue] = useState(false);
  const [analysisType, setAnalysisType] = useState('revenue');

  const fetchStats = useCallback(async () => {
    try {
      const [revRes, logRes] = await Promise.all([
        adminAPI.getRevenue(period),
        apiClient.get('/admin/activity-log')
      ]);
      
      if (revRes.data.success) {
        setStats(revRes.data);
        setLastBookingCount(revRes.data.totalBookings);
      }
      if (logRes.data.success) {
        setActivityLogs(logRes.data.logs);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchStats();
    const pollTimer = setInterval(fetchStats, 30000);
    return () => clearInterval(pollTimer);
  }, [fetchStats]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-white/10 p-4 rounded-xl shadow-2xl backdrop-blur-xl">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-white/5 pb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-8 py-1">
              <span className="text-[9px] font-bold text-white uppercase">{entry.name}</span>
              <span className="text-sm font-black italic" style={{ color: entry.color }}>
                {entry.name.toLowerCase().includes('revenue') || entry.name.toLowerCase().includes('yield') ? `₹${entry.value.toLocaleString()}` : entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6">
        <div className="relative">
            <div className="w-24 h-24 border-4 border-blue-100 border-t-emerald-600 rounded-full animate-spin"></div>
            <LayoutDashboard className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600 animate-pulse" size={32} />
        </div>
        <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[10px] italic">Synchronizing Operational Nodes...</p>
    </div>
  );

  return (
        <div className="min-h-screen bg-[#F1F5F9] flex font-sans selection:bg-emerald-600/20">
            <AdminSidebar user={user} logout={logout} mobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />

    <main className="flex-1 overflow-y-auto pb-24 relative custom-scrollbar">
    {/* BI Style Top Bar */}
    <header className="bg-white border-b border-slate-200 sticky top-0 z-[40] px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4 min-w-0">
                {/* Mobile sidebar toggle */}
                <button onClick={() => setMobileSidebarOpen(true)} className="lg:hidden p-2 mr-3 bg-slate-50 rounded-md">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600"><path d="M3 12h18M3 6h18M3 18h18"></path></svg>
                </button>
                <div className="min-w-0">
                    <h1 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3 truncate">
                        <BarChart3 className="text-emerald-600" size={22} /> 
                        <span className="truncate">Operational Intelligence</span>
                        <span className="hidden sm:inline text-slate-400 font-normal">/ Executive Hub</span>
                    </h1>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Platform Performance</p>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="hidden xl:flex items-center gap-4 bg-slate-50 border border-slate-200 p-2 rounded-2xl">
                    <div className="px-4 py-1.5 border-r border-slate-200">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Local Time</p>
                        <p className="text-xs font-black text-slate-900 tabular-nums italic">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                    </div>
                    <div className="px-4 py-1.5">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">System Health</p>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-[10px] font-black text-emerald-600 uppercase">Optimal</span>
                        </div>
                    </div>
                </div>
                <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                    {['Daily', 'Weekly', 'Monthly', 'Annual'].map(t => (
                        <button 
                            key={t}
                            onClick={() => setPeriod(t.toLowerCase())}
                            className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${period === t.toLowerCase() ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
                <button className="p-3 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-blue-700 transition-all">
                    <Download size={20} />
                </button>
            </div>
        </header>

            <div className="max-w-[1600px] mx-auto p-4 sm:p-10 space-y-8">
            
            {/* KPI Summary Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                {[
                    { label: 'Total Revenue', value: `₹${stats?.totalRevenue.toLocaleString()}`, trend: '+14.2%', icon: <Zap className="text-emerald-500" />, color: 'blue' },
                    { label: 'Node Bookings', value: stats?.totalBookings, trend: '+8.1%', icon: <Calendar className="text-amber-500" />, color: 'amber' },
                    { label: 'Active Users', value: stats?.totalUsers?.toLocaleString() || '0', trend: '+12.4%', icon: <Users className="text-emerald-500" />, color: 'indigo' },
                    { label: 'Efficiency', value: stats ? `${Math.round(((stats.statusBreakdown.confirmed || 0) / (stats.totalBookings || 1)) * 100)}%` : '0%', trend: 'Nominal', icon: <Activity className="text-emerald-500" />, color: 'emerald' }
                ].map((kpi, idx) => (
                    <div key={idx} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all group overflow-hidden relative">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-slate-900 group-hover:scale-110 transition-transform duration-700">
                            {kpi.icon}
                        </div>
                        <div className="flex items-center justify-between mb-8">
                            <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-blue-50 transition-colors">
                                {kpi.icon}
                            </div>
                            <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${kpi.trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-500'}`}>
                                {kpi.trend}
                            </div>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">{kpi.label}</p>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tighter tabular-nums">{kpi.value}</h3>
                    </div>
                ))}
            </div>

            {/* Main Intelligence Grid */}
            <div className="grid lg:grid-cols-12 gap-10">
                
                {/* Revenue Lifecycle Chart (The Power BI View) */}
                <div className="lg:col-span-8 min-w-0 bg-white p-12 rounded-[4rem] border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-12">
                        <div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] italic">Revenue Lifecycle Progression</h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Multi-Temporal Yield Correlation</p>
                        </div>
                        <div className="flex gap-3">
                            <button className="p-3 hover:bg-slate-50 rounded-xl text-slate-400 transition-all"><Info size={18} /></button>
                            <button className="p-3 hover:bg-slate-50 rounded-xl text-slate-400 transition-all"><Maximize2 size={18} /></button>
                        </div>
                    </div>
                    <div className="h-[450px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats?.trendData || []}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} axisLine={false} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="revenue" name="Actual Yield" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                                <Line type="monotone" dataKey="target" name="Registry Target" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                                <Legend wrapperStyle={{ paddingTop: 30, fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Utilization Radar */}
                <div className="lg:col-span-4 min-w-0 bg-white p-12 rounded-[4rem] border border-slate-200 shadow-sm flex flex-col">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] italic mb-12">Arena Utilization Matrix</h3>
                    <div className="flex-1 flex flex-col justify-center">
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Prime Slots', value: stats?.statusBreakdown.confirmed || 0, color: '#2563eb' },
                                            { name: 'Off-Peak', value: stats?.statusBreakdown.pending || 0, color: '#94a3b8' },
                                            { name: 'Maintenance', value: stats?.statusBreakdown.hold || 0, color: '#f1f5f9' }
                                        ]}
                                        innerRadius={80}
                                        outerRadius={110}
                                        paddingAngle={8}
                                        dataKey="value"
                                    >
                                        {[1,2,3].map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={['#2563eb', '#94a3b8', '#0f172a'][index]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                                <p className="text-4xl font-black text-slate-900 italic leading-none tabular-nums">
                                    {Math.round(((stats?.statusBreakdown.confirmed || 0) / (stats?.totalBookings || 1)) * 100)}%
                                </p>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Total Load</p>
                            </div>
                        </div>
                        <div className="mt-12 space-y-4">
                            {[
                                { label: 'Confirmed Load', value: `${stats?.statusBreakdown.confirmed || 0} units`, color: 'bg-emerald-600' },
                                { label: 'Pending Load', value: `${stats?.statusBreakdown.pending || 0} units`, color: 'bg-slate-400' },
                                { label: 'System Hold', value: `${stats?.statusBreakdown.hold || 0} units`, color: 'bg-slate-900' }
                            ].map(i => (
                                <div key={i.label} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-2 h-2 rounded-full ${i.color}`}></div>
                                        <span className="text-[10px] font-black text-slate-500 uppercase italic">{i.label}</span>
                                    </div>
                                    <span className="text-xs font-black italic tabular-nums">{i.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Daily Operational Intelligence (The BI Daily View) */}
                <div className="lg:col-span-12 min-w-0 bg-white p-12 rounded-[4rem] border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-[0.02] text-slate-900">
                        <BarChartIcon size={200} />
                    </div>
                    <div className="flex flex-col md:flex-row items-center justify-between mb-12 relative z-10">
                        <div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] italic">Daily Performance Intelligence</h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Cross-Metric Daily Yield & Booking Volume</p>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 animate-pulse">
                                <Database size={14} />
                                <span className="text-[9px] font-black uppercase tracking-widest">Fast Data Processing Active</span>
                            </div>
                            <div className="w-px h-8 bg-slate-200"></div>
                            <button className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline italic">Interactive Report Dashboard</button>
                        </div>
                    </div>

                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={stats?.trendData || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} axisLine={false} />
                                <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ paddingTop: 30, fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }} />
                                <Bar yAxisId="left" dataKey="revenue" name="Daily Yield" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={40} />
                                <Line yAxisId="right" type="monotone" dataKey="bookings" name="Node Transactions" stroke="#0f172a" strokeWidth={4} dot={{ r: 6, fill: '#0f172a' }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Drill-down Registry (The Detailed Grid) */}
                <div className="lg:col-span-7 bg-white p-12 rounded-[4rem] border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-12">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] italic">Registry Drill-down</h3>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-widest bg-blue-50 px-4 py-2 rounded-xl">
                                <CircleDot size={12} className="animate-pulse" /> Live Logs
                            </div>
                            <button className="text-slate-400 hover:text-slate-900 transition-colors"><Maximize2 size={18} /></button>
                        </div>
                    </div>
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Node ID</th>
                                    <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Temporal Node</th>
                                    <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Yield</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {activityLogs.slice(0, 10).map((log, idx) => (
                                    <tr key={log.id} className="group hover:bg-slate-50 transition-colors cursor-default">
                                        <td className="py-5 font-mono text-xs font-black text-slate-900 italic uppercase">#{log.id.slice(-6)}</td>
                                        <td className="py-5 text-xs font-black text-slate-500 italic tabular-nums">{log.slotTime}</td>
                                        <td className="py-5">
                                            <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest italic ${
                                                log.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600' : 
                                                log.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                                            }`}>
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="py-5 text-right font-black italic tabular-nums text-slate-900">₹{log.amount?.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="pt-10 mt-10 border-t border-slate-50">
                        <button className="w-full p-5 bg-slate-950 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 italic">
                            Access Global Master Registry <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

                {/* AI Intelligence & Logic Node */}
                <div className="lg:col-span-5 flex flex-col gap-8">
                    <div className="bg-white p-12 rounded-[4rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.03] text-emerald-600 group-hover:rotate-12 transition-all">
                            <Cpu size={150} />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] italic mb-10 flex items-center gap-4">
                            <Zap className="text-emerald-600" size={18} /> Neural Synthesis Engine
                        </h3>
                        <div className="space-y-8">
                            <div className="flex gap-4">
                                <select 
                                    value={analysisType} 
                                    onChange={(e) => setAnalysisType(e.target.value)}
                                    className="flex-1 bg-slate-50 border border-slate-200 p-5 rounded-[1.5rem] outline-none font-black text-xs text-slate-900 uppercase tracking-widest italic"
                                >
                                    <option value="revenue">Yield Optimization</option>
                                    <option value="traffic">Traffic Density</option>
                                </select>
                                <button
                                    onClick={() => toast.info('ANALYSIS_PROTOCOL_STARTED')}
                                    className="bg-emerald-600 text-white p-6 rounded-[1.5rem] shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                                >
                                    <Zap size={24} />
                                </button>
                            </div>
                            <div className="p-8 bg-slate-950 rounded-[2.5rem] border border-white/5 shadow-2xl relative min-h-[160px]">
                                <div className="absolute top-0 right-0 p-6 opacity-10 text-emerald-500">
                                    <ShieldCheck size={60} />
                                </div>
                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] italic mb-4">Analyst Output</p>
                                <p className="text-slate-400 text-sm font-mono font-black uppercase tracking-widest italic leading-relaxed">
                                    Yield remains high. Recommend deploying dynamic surge pricing for evening slots (18:00 - 22:00) to maximize terminal output.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-900 to-slate-950 p-12 rounded-[4rem] text-white shadow-2xl shadow-slate-950/30 flex-1 relative overflow-hidden group">
                        <div className="absolute -right-10 -bottom-10 p-12 opacity-10 group-hover:scale-125 transition-all duration-1000">
                            <Layers size={250} />
                        </div>
                        <div className="relative z-10 flex flex-col justify-between h-full">
                            <div>
                                <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] italic mb-8">System Health Protocol</h3>
                                <div className="space-y-8">
                                    <div className="flex items-center gap-6">
                                        <div className="p-4 bg-white/5 rounded-2xl text-emerald-500"><Database size={24} /></div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic mb-1">Data Registry Integrity</p>
                                            <p className="text-xl font-black italic uppercase">100% Synchronized</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="p-4 bg-white/5 rounded-2xl text-amber-500"><ScanLine size={24} /></div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic mb-1">Active Optic Links</p>
                                            <p className="text-xl font-black italic uppercase">84 Validated</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button className="mt-12 w-full bg-white text-slate-950 py-5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest transition-all shadow-xl hover:scale-105 active:scale-95 italic">
                                Initialize Global Infrastructure Sync
                            </button>
                        </div>
                    </div>
                </div>

                {/* BI Intelligence Report Export Center (The Tableau Export View) */}
                <div className="lg:col-span-12 bg-slate-900 rounded-[4rem] p-12 text-white shadow-2xl shadow-slate-950/40 relative overflow-hidden group border border-white/5">
                    <div className="absolute top-0 right-0 p-20 opacity-[0.03] text-emerald-500 group-hover:scale-125 transition-transform duration-1000">
                        <PieChartIcon size={300} />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-3 bg-emerald-600/20 text-emerald-400 px-5 py-2 rounded-full border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest italic">
                                <FileText size={14} /> Report Generation Engine
                            </div>
                            <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none">Interactive <span className="text-emerald-500">Business</span> Reports</h2>
                            <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-2xl italic uppercase tracking-wider">
                                Aggregate complex operational telemetry into professional-grade PDF and CSV reports. The intelligence engine performs fast data processing to correlate revenue, utilization, and user growth nodes.
                            </p>
                            <div className="flex flex-wrap gap-4 pt-4">
                                {['Revenue Audit', 'User Analytics', 'Turf Load Index', 'Peak Time Heatmap'].map(tag => (
                                    <div key={tag} className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:text-white transition-colors">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> {tag}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="w-full md:w-[400px] bg-white/5 backdrop-blur-3xl rounded-[3rem] border border-white/10 p-10 space-y-8">
                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Target Export Format</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <button className="bg-emerald-600 text-white p-4 rounded-2xl flex flex-col items-center gap-2 shadow-xl shadow-emerald-600/20">
                                        <FileText size={24} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Acrobat PDF</span>
                                    </button>
                                    <button className="bg-white/5 hover:bg-white/10 text-white p-4 rounded-2xl flex flex-col items-center gap-2 border border-white/10 transition-all">
                                        <Database size={24} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Excel CSV</span>
                                    </button>
                                </div>
                            </div>
                            <button className="w-full bg-white text-slate-950 py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all shadow-2xl hover:scale-105 active:scale-95 italic">
                                Initialize Data Compilation
                            </button>
                            <div className="flex items-center justify-center gap-3">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Engine Status: Ready</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

        </div>

        {/* Floating Quick Action BI Bar */}
        <div className="fixed bottom-12 right-12 flex flex-col gap-4 z-[50]">
            <button onClick={() => navigate('/admin/settings')} className="w-16 h-16 bg-white border border-slate-200 rounded-[1.5rem] shadow-2xl flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-all group relative">
                <Settings size={28} />
                <span className="absolute right-full mr-6 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest py-2 px-5 rounded-xl opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap pointer-events-none">System Config</span>
            </button>
            <button onClick={logout} className="w-16 h-16 bg-slate-950 text-white rounded-[1.5rem] shadow-2xl flex items-center justify-center hover:bg-rose-600 transition-all group relative">
                <LogOut size={28} />
                <span className="absolute right-full mr-6 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest py-2 px-5 rounded-xl opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap pointer-events-none">Terminate Session</span>
            </button>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
