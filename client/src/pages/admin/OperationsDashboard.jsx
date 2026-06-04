import React, { useState, useEffect, useCallback, useContext } from 'react';
import apiClient from '../../api/client';
import { 
    Activity, 
    ShieldCheck, 
    Clock, 
    RefreshCcw, 
    QrCode,
    Zap,
    TrendingUp,
    MoreVertical,
    History,
    LayoutDashboard,
    Calendar,
    Briefcase,
    PieChart,
    Settings,
    Database,
    ShieldAlert,
    Send,
    BellRing,
    CircleDot,
    Maximize2,
    Layers,
    Cpu,
    ArrowRight
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import AuthContext from '../../context/AuthContext';
import AdminSidebar from '../../components/AdminSidebar';

const OperationsDashboard = () => {
    const [stats, setStats] = useState(null);
    const [recentScans, setRecentScans] = useState([]);
    const [pendingMatches, setPendingMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const navigate = useNavigate();
    const [settings, setSettings] = useState({ TURF_NAME: 'The Turf' });

    const { user, logout } = useContext(AuthContext);

    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true);
            const [statsRes, matchesRes, activityRes] = await Promise.all([
                apiClient.get('/admin/scan-dashboard'),
                apiClient.get('/matches'),
                apiClient.get('/admin/activity-log').catch(() => ({ data: { logs: [] } }))
            ]);

            setStats(statsRes.data.dashboard);
            const allMatches = (matchesRes.data.matches || []).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
            setPendingMatches(allMatches);
            setRecentScans(activityRes.data.logs || []);
        } catch (error) {
            toast.error('Failed to synchronize operational telemetry.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 30000);
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => {
            clearInterval(interval);
            clearInterval(timer);
        };
    }, [fetchDashboardData]);

    if (loading && !stats) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6">
            <div className="relative">
                <div className="w-24 h-24 border-4 border-blue-100 border-t-emerald-600 rounded-full animate-spin"></div>
                <Cpu className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600 animate-pulse" size={32} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Synchronizing Operational Nodes...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F1F5F9] flex font-sans selection:bg-emerald-600/20">
            <AdminSidebar user={user} logout={logout} />

            <main className="flex-1 overflow-y-auto pb-24 relative custom-scrollbar">
                {/* BI Style Top Bar */}
                <header className="bg-white border-b border-slate-200 sticky top-0 z-[40] px-10 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div>
                            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                                <Cpu className="text-emerald-600" size={26} /> 
                                Operations Hub <span className="text-slate-400">/ Core Command</span>
                            </h1>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Real-time Deployment Engine v6.2</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden xl:flex items-center gap-4 bg-slate-50 border border-slate-200 p-2 rounded-2xl">
                            <div className="px-4 py-1.5 border-r border-slate-200">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Local Time</p>
                                <p className="text-xs font-black text-slate-900 tabular-nums italic">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                            </div>
                            <div className="px-4 py-1.5">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Protocol Heartbeat</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                    <span className="text-[10px] font-black text-emerald-600 uppercase">Synchronized</span>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={() => navigate('/admin/scanner')}
                            className="flex items-center gap-3 bg-emerald-600 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all italic hover:bg-blue-700"
                        >
                            <QrCode size={18} /> Initialize Optic Node
                        </button>
                        <button onClick={fetchDashboardData} className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                            <RefreshCcw size={20} />
                        </button>
                    </div>
                </header>

                <div className="max-w-[1600px] mx-auto p-10 space-y-12">
                    
                    {/* Operational Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <StatCard 
                            label="Active Operations" 
                            value={stats?.matches?.total || 0} 
                            icon={<Activity size={24} />} 
                            trend="+12% Delta"
                            color="blue"
                        />
                        <StatCard 
                            label="Verification Index" 
                            value={`${stats?.matches?.total ? ((stats.matches.verified/stats.matches.total)*100).toFixed(0) : 0}%`} 
                            icon={<ShieldCheck size={24} />} 
                            sub={`${stats?.matches?.verified || 0} / ${stats?.matches?.total || 0} Verified Nodes`}
                            color="blue"
                        />
                        <StatCard 
                            label="Neural Scan Success" 
                            value={`${stats?.scans?.successRate || 0}%`} 
                            icon={<Zap size={24} />} 
                            sub={`${stats?.scans?.success || 0} Acquisition Success`}
                            color="amber"
                        />
                        <StatCard 
                            label="Node Equilibrium" 
                            value="Optimal" 
                            icon={<TrendingUp size={24} />} 
                            sub="Latency Threshold: 42ms"
                            color="blue"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                        {/* Pending Operations Registry */}
                        <div className="lg:col-span-8 bg-white rounded-[3.5rem] shadow-sm border border-slate-200 overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-12 opacity-[0.01] text-slate-900 pointer-events-none group-hover:scale-110 transition-all duration-1000">
                                <Layers size={400} />
                            </div>
                            
                            <div className="p-10 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-8 bg-white/50 backdrop-blur-xl relative z-10">
                                <div className="flex items-center gap-6">
                                    <div className="bg-slate-950 text-white p-4 rounded-2xl shadow-xl">
                                        <Database size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Operational <span className="text-emerald-600">Pending Nodes</span></h4>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5 italic">Awaiting Field Identity Validation</p>
                                    </div>
                                </div>
                                <div className="bg-rose-600 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest italic animate-pulse shadow-xl shadow-rose-500/20">
                                    {pendingMatches.length} Priority Required
                                </div>
                            </div>
                            
                            <div className="overflow-x-auto custom-scrollbar relative z-10">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            {['Schedule', 'Operational Segment', 'Verification Protocol', 'Actions'].map(h => (
                                                <th key={h} className="px-10 py-8 text-[9px] font-black text-slate-400 uppercase tracking-widest italic border-b border-slate-100">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {pendingMatches.length > 0 ? pendingMatches.map(m => (
                                            <tr key={m._id} className="group hover:bg-slate-50/80 transition-all">
                                                <td className="px-10 py-10">
                                                    <div className="flex items-center gap-5">
                                                        <div className="p-3.5 bg-slate-100 text-slate-400 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                                                            <Clock size={18} />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[13px] font-black text-slate-950 tabular-nums italic leading-none mb-1">{new Date(m.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic tabular-nums">{new Date(m.start_time).toLocaleDateString('en-GB')}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-10">
                                                    <div className="flex flex-col">
                                                        <span className="text-[13px] font-black text-slate-900 group-hover:text-emerald-600 transition-colors uppercase tracking-tight italic leading-none mb-2">{m.title}</span>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest italic border-r border-slate-200 pr-3">{m.format}</span>
                                                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest italic tabular-nums">NODE_{m._id.slice(-6).toUpperCase()}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-10">
                                                    <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-amber-50 text-amber-600 border border-amber-100 text-[9px] font-black uppercase tracking-widest italic shadow-sm">
                                                        <CircleDot size={10} className="animate-pulse" />
                                                        Awaiting Acquisition
                                                    </div>
                                                </td>
                                                <td className="px-10 py-10">
                                                    <button 
                                                        onClick={() => navigate(m.status === 'Completed' || m.status === 'In Progress' ? `/live/${m._id}` : `/match/result/${m._id}`)}
                                                        className="bg-slate-950 text-white text-[10px] font-black uppercase tracking-[0.2em] px-8 py-3.5 rounded-xl hover:bg-emerald-600 transition-all shadow-xl shadow-slate-950/20 italic active:scale-95 flex items-center gap-3 group/btn"
                                                    >
                                                        Match Center <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                                    </button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="4" className="px-10 py-48 text-center bg-slate-50/20">
                                                    <div className="w-24 h-24 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-center mx-auto text-slate-200 mb-10 shadow-inner">
                                                        <ShieldCheck size={48} strokeWidth={1} />
                                                    </div>
                                                    <h5 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic mb-3">No Pending Nodes Detected</h5>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic leading-relaxed">System equilibrium achieved.<br/>All operational segments are currently verified.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Sidebar Intelligence Cluster */}
                        <div className="lg:col-span-4 space-y-10">
                            {/* Security Access Log */}
                            <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-200 p-10 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-10 opacity-[0.01] text-slate-950 group-hover:scale-110 transition-all duration-1000">
                                    <History size={180} />
                                </div>
                                <div className="flex items-center justify-between mb-10 relative z-10">
                                    <div className="flex items-center gap-5">
                                        <div className="p-4 bg-slate-50 text-emerald-600 rounded-2xl shadow-sm border border-slate-100 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500"><History size={24} /></div>
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Security <span className="text-emerald-600">Access Log</span></h2>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Real-time Node Access Registry</p>
                                        </div>
                                    </div>
                                    <MoreVertical className="text-slate-300 cursor-pointer hover:text-slate-950 transition-colors" size={20} />
                                </div>
                                <div className="space-y-6 relative z-10">
                                    {recentScans.length === 0 ? (
                                        <div className="py-16 text-center space-y-6">
                                            <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center mx-auto text-slate-200 border border-slate-100"><Database size={32} /></div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Awaiting Registry Inbound...</p>
                                        </div>
                                    ) : recentScans.slice(0, 8).map((log, idx) => (
                                        <div key={idx} className="flex gap-6 group/log items-center border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                                            <div className={`w-1.5 h-10 rounded-full transition-all group-hover/log:scale-y-125 shadow-sm ${
                                                log.status === 'confirmed' ? 'bg-emerald-500' :
                                                log.status === 'pending'   ? 'bg-amber-500' :
                                                log.status === 'rejected'  ? 'bg-rose-600' : 'bg-slate-200'
                                            }`}></div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-center mb-1">
                                                    <p className="text-[11px] font-black text-slate-950 uppercase tracking-tight italic leading-none">{log.userName}</p>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase italic tabular-nums">{log.slotDate}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-black text-emerald-600 tabular-nums italic">{log.slotTime}</span>
                                                    <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                                    <span className={`text-[9px] font-black uppercase tracking-widest italic ${
                                                        log.status === 'confirmed' ? 'text-emerald-600' :
                                                        log.status === 'pending'   ? 'text-amber-500' :
                                                        log.status === 'rejected'  ? 'text-rose-600' : 'text-slate-400'
                                                    }`}>{log.status}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button className="w-full mt-10 bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-950 hover:text-white hover:border-slate-950 py-5 rounded-[1.8rem] text-[10px] font-black uppercase tracking-[0.3em] transition-all italic active:scale-95">
                                    Analyze Full security registry
                                </button>
                            </div>

                            {/* Global Broadcast Console */}
                            <div className="bg-slate-950 rounded-[3.5rem] p-12 shadow-2xl shadow-slate-950/20 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-600/10 blur-[60px] rounded-full group-hover:bg-emerald-600/20 transition-all duration-1000"></div>
                                <div className="relative z-10 space-y-10">
                                    <div className="flex items-center gap-5 border-b border-white/5 pb-8">
                                        <div className="p-4 bg-white/5 text-emerald-500 rounded-2xl shadow-xl border border-white/10 backdrop-blur-md"><BellRing size={26} className="animate-pulse" /></div>
                                        <div>
                                            <h2 className="text-white font-black uppercase text-xl tracking-tighter italic leading-none">Global <span className="text-emerald-500">Transmission</span></h2>
                                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1.5 italic">Web Push & Neural Broadcast Hub</p>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Transmission Title</label>
                                            <input type="text" id="notif-title" placeholder="INPUT HEADING PROTOCOL" className="w-full bg-white/5 border-2 border-transparent focus:border-emerald-600/30 rounded-xl p-5 text-[11px] font-black uppercase tracking-widest text-white placeholder-white/5 outline-none transition-all italic" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Payload Narrative</label>
                                            <textarea id="notif-body" placeholder="INPUT BROADCAST NARRATIVE PAYLOAD" className="w-full bg-white/5 border-2 border-transparent focus:border-emerald-600/30 rounded-xl p-5 text-[11px] font-black uppercase tracking-widest text-white placeholder-white/5 outline-none h-32 resize-none transition-all italic leading-relaxed" />
                                        </div>
                                        <button 
                                            onClick={async () => {
                                                const title = document.getElementById('notif-title').value;
                                                const body = document.getElementById('notif-body').value;
                                                if (!title || !body) return toast.warning('Missing Transmission Payload');
                                                try {
                                                    toast.info('Initiating Broadcast protocol...');
                                                    const { aiAPI } = await import('../../api/client');
                                                    const res = await aiAPI.broadcastNotification(title, body);
                                                    if (res.data.success) {
                                                        toast.success('Broadcast Executed Successfully');
                                                        document.getElementById('notif-title').value = '';
                                                        document.getElementById('notif-body').value = '';
                                                    }
                                                } catch (err) { toast.error('Protocol Failure'); }
                                            }}
                                            className="w-full bg-emerald-600 hover:bg-white hover:text-emerald-600 text-white py-6 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] transition-all shadow-2xl shadow-emerald-500/30 flex items-center justify-center gap-4 italic active:scale-95"
                                        >
                                            <Send size={18} /> Execute Transmission
                                        </button>
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

const StatCard = ({ label, value, icon, trend, sub, color }) => {
    const colors = {
        blue: 'text-emerald-600 bg-slate-50 group-hover:bg-emerald-600 group-hover:text-white',
        amber: 'text-amber-600 bg-slate-50 group-hover:bg-amber-600 group-hover:text-white'
    };
    return (
        <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm group hover:shadow-2xl hover:-translate-y-2 transition-all duration-700 flex flex-col justify-between h-[260px] overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-[0.02] text-slate-900 group-hover:scale-110 transition-transform duration-700">
                {icon}
            </div>
            <div className="flex justify-between items-start relative z-10">
                <div className={`p-5 rounded-[2rem] shadow-sm transition-all duration-500 ${colors[color] || colors.blue}`}>
                    {icon}
                </div>
                {trend && <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-blue-50 px-5 py-2 rounded-full border border-blue-100 italic shadow-sm">{trend}</span>}
            </div>
            <div className="relative z-10">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic leading-none">{label}</p>
                <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic leading-none group-hover:text-emerald-600 transition-colors duration-500">{value}</h2>
                {sub && <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-4 italic border-l-2 border-slate-200 pl-3 leading-none">{sub}</p>}
            </div>
        </div>
    );
};

export default OperationsDashboard;
