import React, { useState, useEffect } from 'react';
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
    History
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import MobileNav from '../../components/MobileNav';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [recentScans, setRecentScans] = useState([]);
    const [pendingMatches, setPendingMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const { user, logout } = React.useContext(AuthContext);

    const fetchDashboardData = React.useCallback(async () => {
        try {
            setLoading(true);
            const [statsRes, matchesRes] = await Promise.all([
                apiClient.get('/admin/scan-dashboard'),
                apiClient.get('/matches?status=Scheduled')
            ]);

            setStats(statsRes.data.dashboard);
            // Filter pending matches for today
            const today = new Date().toISOString().split('T')[0];
            setPendingMatches(matchesRes.data.matches.filter(m => 
                m.verification.status === 'PENDING' && 
                m.start_time.startsWith(today)
            ));
            
            // Mock recent scans for UI demo
            setRecentScans([
                { id: 1, time: '10:45 AM', match: 'Warriors vs Titans', user: 'Admin_1', result: 'SUCCESS' },
                { id: 2, time: '10:30 AM', match: 'Royals vs King XI', user: 'Scanner_A', result: 'FAILED' },
                { id: 3, time: '09:15 AM', match: 'Blues vs Reds', user: 'Admin_1', result: 'SUCCESS' },
            ]);

        } catch (error) {
            toast.error('Failed to synchronize dashboard telemetry.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    if (loading) return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8 gap-4">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em]">Initializing Operational Core</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 p-0 md:p-10 font-sans selection:bg-emerald-500/30">
            <MobileNav user={user} logout={logout} />
            <div className="p-4 md:p-0">
                {/* Header */}
            <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-emerald-600 p-2 rounded-xl shadow-lg shadow-emerald-900/40">
                            <Activity size={20} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-black uppercase tracking-tighter text-white">Operations Dashboard</h1>
                    </div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Administrator Command Center / PART 03</p>
                </div>
                
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button 
                        onClick={fetchDashboardData}
                        className="bg-gray-800 hover:bg-gray-700 p-4 rounded-2xl transition-all border border-gray-700 active:scale-95"
                    >
                        <RefreshCcw size={18} className="text-gray-400" />
                    </button>
                    <button 
                        onClick={() => navigate('/admin/scanner')}
                        className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-white text-black py-4 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-400 transition-all shadow-xl shadow-black/20"
                    >
                        <QrCode size={16} /> Start Scan Processor
                    </button>
                </div>
            </header>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Stats Grid */}
                <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard 
                        label="Total Matches" 
                        value={stats.matches.total} 
                        icon={<Activity className="text-blue-400" />} 
                        trend="+12% today"
                    />
                    <StatCard 
                        label="Verified Count" 
                        value={`${stats.matches.verified} / ${stats.matches.total}`} 
                        icon={<ShieldCheck className="text-emerald-400" />} 
                        sub={`${((stats.matches.verified/stats.matches.total)*100).toFixed(0)}% verification rate`}
                    />
                    <StatCard 
                        label="Scan Success" 
                        value={`${stats.scans.successRate}%`} 
                        icon={<Zap className="text-yellow-400" />} 
                        sub={`${stats.scans.success} successful scans`}
                    />
                    <StatCard 
                        label="Operation Status" 
                        value="Optimal" 
                        icon={<TrendingUp className="text-purple-400" />} 
                        sub="Latency: 42ms"
                    />
                </div>

                {/* Pending Verification */}
                <div className="lg:col-span-8">
                    <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-[2.5rem] overflow-hidden">
                        <div className="p-8 border-b border-gray-800 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-black text-white uppercase tracking-tight">Pending Verification</h2>
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">Action Required Before Toss</p>
                            </div>
                            <div className="bg-red-500/10 text-red-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse">
                                {pendingMatches.length} Pending
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-800/20 text-[9px] font-black text-gray-600 uppercase tracking-widest">
                                    <tr>
                                        <th className="px-8 py-4">Timing</th>
                                        <th className="px-8 py-4">Match Segment</th>
                                        <th className="px-8 py-4">QR Expiry</th>
                                        <th className="px-8 py-4">Protocol</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800/50">
                                    {pendingMatches.map(m => (
                                        <tr key={m._id} className="group hover:bg-white/5 transition-all">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <Clock size={16} className="text-gray-600" />
                                                    <span className="text-sm font-black text-white">{new Date(m.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-gray-300 group-hover:text-emerald-400 transition-colors uppercase">{m.title}</span>
                                                    <span className="text-[10px] text-gray-600 font-bold uppercase tracking-tight">{m.format} • {m._id.slice(-8)}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="text-[10px] font-black text-yellow-500/80 uppercase tracking-widest">
                                                    In 2h 15m
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <button 
                                                    onClick={() => navigate('/admin/scanner')}
                                                    className="bg-gray-800 group-hover:bg-emerald-600 text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all"
                                                >
                                                    Process QR
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {pendingMatches.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-8 py-20 text-center">
                                                <ShieldCheck size={48} className="mx-auto text-emerald-900 mb-4 opacity-20" />
                                                <p className="text-xs font-black text-gray-600 uppercase tracking-widest">Awaiting scheduled sessions...</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Sidebar: Recent Activity & Logs */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-[2.5rem] p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <History className="text-blue-400" size={18} />
                                <h2 className="text-lg font-black text-white uppercase tracking-tight">Access Log</h2>
                            </div>
                            <MoreVertical className="text-gray-700 cursor-pointer" size={18} />
                        </div>
                        <div className="space-y-6">
                            {recentScans.map(scan => (
                                <div key={scan.id} className="flex gap-4 group">
                                    <div className={`w-1 shadow-lg rounded-full ${scan.result === 'SUCCESS' ? 'bg-emerald-500 shadow-emerald-900/20' : 'bg-red-500 shadow-red-900/20'}`}></div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <p className="text-xs font-black text-white uppercase tracking-tight">{scan.match}</p>
                                            <span className="text-[8px] font-bold text-gray-600 uppercase">{scan.time}</span>
                                        </div>
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">
                                            Node: {scan.user} • Result: <span className={scan.result === 'SUCCESS' ? 'text-emerald-500' : 'text-red-500'}>{scan.result}</span>
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-8 border border-gray-800 hover:border-gray-700 text-[9px] font-black uppercase tracking-widest py-4 rounded-2xl text-gray-500 hover:text-white transition-all">
                            View Security Audit
                        </button>
                    </div>

                    {/* Quick Action Panel */}
                    <div className="bg-emerald-950/20 border border-emerald-500/10 rounded-[2.5rem] p-8 relative overflow-hidden group">
                        <Zap size={64} className="absolute -right-4 -bottom-4 text-emerald-500/10 rotate-12 transition-transform group-hover:scale-110" />
                        <h2 className="text-white font-black uppercase text-sm tracking-tight mb-2">Protocol Override</h2>
                        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-tight leading-relaxed mb-6">Force authentication for verified physical presence.</p>
                        <button 
                            onClick={() => navigate('/admin/scanner')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-lg shadow-emerald-950"
                        >
                            Emergency Override
                        </button>
                    </div>
                </div>
            </div>
        </div>
        </div>
    );
};

const StatCard = ({ label, value, icon, trend, sub }) => (
    <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 p-8 rounded-[2.5rem] relative group hover:border-gray-700 transition-all">
        <div className="flex justify-between items-start mb-6">
            <div className="bg-gray-800/50 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                {icon}
            </div>
            {trend && <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">{trend}</span>}
        </div>
        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{label}</h3>
        <p className="text-3xl font-black text-white uppercase tracking-tighter leading-none">{value}</p>
        {sub && <p className="text-[9px] font-bold text-gray-600 uppercase tracking-tight mt-3">{sub}</p>}
    </div>
);

export default AdminDashboard;
