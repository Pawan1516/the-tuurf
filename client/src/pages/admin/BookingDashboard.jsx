import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Calendar, Users, Activity, TrendingUp, Search, Filter, 
    ChevronDown, Zap, Clock, MapPin, AlertCircle, RefreshCw,
    TrendingDown, CheckCircle2, XCircle, ArrowUpRight,
    BarChart3, PieChart as PieIcon, LineChart as LineIcon,
    Layers, MousePointer2, ShieldCheck, Database,
    Maximize2, CircleDot, FileText
} from 'lucide-react';
import { 
    LineChart, Line, BarChart, Bar, XAxis, YAxis, 
    CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import apiClient from '../../api/client';
import { toast } from 'react-toastify';
import AdminSidebar from '../../components/AdminSidebar';

const BookingDashboard = () => {
    const [stats, setStats] = useState({ total: 0, today: 0, week: 0, month: 0 });
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    const localInsights = useMemo(() => {
        if (!bookings.length) return { analysis: null, predictions: [] };

        const timeMap = {};
        let eveningCount = 0;
        bookings.forEach(b => {
            if (b.slot?.startTime) {
                const hour = parseInt(b.slot.startTime.split(':')[0]);
                const hKey = `${hour}:00`;
                timeMap[hKey] = (timeMap[hKey] || 0) + 1;
                if (hour >= 16) eveningCount++;
            }
        });
        
        const peakTimeLabel = eveningCount > (bookings.length / 2) ? "Evening (6PM–9PM)" : "Morning/Afternoon";

        const turfMap = {};
        bookings.forEach(b => {
            const t = b.turfLocation || 'Main Ground';
            turfMap[t] = (turfMap[t] || 0) + 1;
        });
        const popularTurf = Object.entries(turfMap).sort((a,b) => b[1] - a[1])[0]?.[0] || 'Main Ground';

        const trendMap = {};
        let weekendCount = 0;
        let weekdayCount = 0;
        bookings.forEach(b => {
            const dateObj = new Date(b.createdAt);
            const dateStr = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            trendMap[dateStr] = (trendMap[dateStr] || 0) + 1;

            const day = dateObj.getDay();
            if (day === 0 || day === 6) weekendCount++;
            else weekdayCount++;
        });

        const preds = [];
        if (eveningCount > (bookings.length / 2)) preds.push("Evening slots will be highly booked today based on local trends.");
        if (weekendCount > weekdayCount) preds.push("High traffic surge expected this weekend. Priority staff allocation recommended.");
        else preds.push("Normal booking activity expected during weekdays.");
        if (bookings.length > 50) preds.push("Protocol velocity is increasing. Demand peak likely tomorrow.");

        const total = bookings.length;
        const cancelled = bookings.filter(b => b.bookingStatus === 'cancelled').length;

        return {
            analysis: {
                peakTime: peakTimeLabel,
                popularTurf,
                cancellationRate: total > 0 ? (cancelled / total * 100).toFixed(1) : 0,
                trendData: Object.entries(trendMap).map(([name, count]) => ({ name, count })).slice(-7),
                timeSlotData: Object.entries(timeMap).map(([hour, count]) => ({ hour, count })),
                turfPopularity: Object.entries(turfMap).map(([name, count]) => ({ name, count })),
                weekendVsWeekday: { weekend: weekendCount, weekday: weekdayCount }
            },
            predictions: preds
        };
    }, [bookings]);

    const fetchData = useCallback(async (isAuto = false) => {
        if (!isAuto) setLoading(true);
        try {
            const [statsRes, listRes] = await Promise.all([
                apiClient.get('/admin-booking/stats'),
                apiClient.get(`/admin-booking/list?search=${searchTerm}&status=${statusFilter}`)
            ]);

            if (statsRes.data.success) setStats(statsRes.data.stats);
            if (listRes.data.success) setBookings(listRes.data.bookings);
        } catch (err) {
            console.error('Data sync failure:', err);
            if (!isAuto) toast.error('Data sync protocol failed');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [searchTerm, statusFilter]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(true), 15000); 
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => {
            clearInterval(interval);
            clearInterval(timer);
        };
    }, [fetchData]);

    if (loading && bookings.length === 0) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6">
            <div className="relative">
                <div className="w-24 h-24 border-4 border-blue-100 border-t-emerald-600 rounded-full animate-spin"></div>
                <Activity className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600 animate-pulse" size={32} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Accessing Intelligence Feed...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F1F5F9] flex font-sans selection:bg-emerald-600/20">
            <AdminSidebar user={{role: 'admin'}} logout={() => {}} />

            <main className="flex-1 overflow-y-auto pb-24 relative custom-scrollbar">
                {/* BI Style Top Bar */}
                <header className="bg-white border-b border-slate-200 sticky top-0 z-[40] px-10 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div>
                            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                                <Activity className="text-emerald-600" size={26} /> 
                                Neural Dashboard <span className="text-slate-400">/ Analytics Hub</span>
                            </h1>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Booking Intelligence Registry v4.8</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden xl:flex items-center gap-4 bg-slate-50 border border-slate-200 p-2 rounded-2xl">
                            <div className="px-4 py-1.5 border-r border-slate-200">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Local Time</p>
                                <p className="text-xs font-black text-slate-900 tabular-nums italic">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                            </div>
                            <div className="px-4 py-1.5">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Telemetry Status</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                    <span className="text-[10px] font-black text-emerald-600 uppercase">Live Stream</span>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={() => { setIsRefreshing(true); fetchData(); }}
                            className="p-3 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-blue-700 transition-all active:scale-95 group"
                        >
                            <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'} />
                        </button>
                    </div>
                </header>

                <div className="max-w-[1600px] mx-auto p-10 space-y-12">
                    
                    {/* Stats Matrix */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <StatCard label="Total Volume" value={stats.total} icon={<Activity size={24} />} trend="+12% Core" color="blue" />
                        <StatCard label="Today Inbound" value={stats.today} icon={<Zap size={24} />} sub="Inbound Velocity" color="amber" />
                        <StatCard label="Weekly Node" value={stats.week} icon={<TrendingUp size={24} />} color="blue" />
                        <StatCard label="Monthly Core" value={stats.month} icon={<Database size={24} />} color="indigo" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                        {/* Registry Table Hub */}
                        <div className="lg:col-span-8 bg-white rounded-[3.5rem] shadow-sm border border-slate-200 overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-12 opacity-[0.01] text-slate-900 pointer-events-none group-hover:scale-110 transition-all duration-1000">
                                <Layers size={400} />
                            </div>
                            
                            <div className="p-10 border-b border-slate-100 flex flex-col md:flex-row gap-8 justify-between items-center bg-white/50 backdrop-blur-xl relative z-10">
                                <div className="flex items-center gap-6">
                                    <div className="p-4 bg-slate-950 text-white rounded-2xl shadow-xl">
                                        <Database size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Registry <span className="text-emerald-600">Master List</span></h4>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5 italic">Synchronized Transaction nodes</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 flex-1 max-w-md">
                                    <div className="relative flex-1 group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={16} />
                                        <input 
                                            type="text"
                                            placeholder="SEARCH REGISTRY..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="bg-slate-100 border border-slate-200 focus:bg-white focus:border-emerald-600 p-3 pl-12 rounded-xl outline-none text-[10px] font-black text-slate-900 w-full transition-all italic tracking-widest uppercase"
                                        />
                                    </div>
                                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                                        {['all', 'confirmed', 'pending'].map((status) => (
                                            <button
                                                key={status}
                                                onClick={() => setStatusFilter(status)}
                                                className={`px-6 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${statusFilter === status ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-900'}`}
                                            >
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto custom-scrollbar relative z-10">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            {['Protocol ID', 'Subject Identity', 'Target Node', 'Temporal', 'Status'].map(h => (
                                                <th key={h} className="px-10 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400 italic border-b border-slate-100">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {bookings.map((booking) => (
                                            <tr key={booking._id} className="hover:bg-slate-50/80 transition-all group">
                                                <td className="px-10 py-8">
                                                    <span className="font-mono text-[10px] font-black text-emerald-600 uppercase">TX_{booking.bookingId || booking._id.slice(-6).toUpperCase()}</span>
                                                </td>
                                                <td className="px-10 py-8">
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-black text-slate-900 group-hover:text-emerald-600 transition-colors uppercase italic leading-none mb-1">{booking.userName}</span>
                                                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest italic tabular-nums border-l-2 border-slate-200 pl-2">{booking.userPhone}</span>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                                                            <MapPin size={14} />
                                                        </div>
                                                        <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight italic">
                                                            {booking.turfName || booking.turfLocation || 'Main Arena'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8">
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-black text-slate-950 tabular-nums italic leading-none mb-1">
                                                            {booking.slot?.date ? new Date(booking.slot.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'N/A'}
                                                        </span>
                                                        <span className="text-[9px] text-emerald-600 font-black uppercase tracking-widest italic tabular-nums border-l-2 border-emerald-600/20 pl-2">
                                                            {booking.slot?.startTime} - {booking.slot?.endTime}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8">
                                                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest italic shadow-sm ${
                                                        booking.bookingStatus === 'confirmed' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                                                        booking.bookingStatus === 'pending' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                                                        'bg-rose-50 border-rose-100 text-rose-600'
                                                    }`}>
                                                        <CircleDot size={10} className={booking.bookingStatus === 'pending' ? 'animate-pulse' : ''} />
                                                        {booking.bookingStatus}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Neural Intelligence Hub */}
                        <div className="lg:col-span-4 space-y-10">
                            <div className="bg-white rounded-[3.5rem] p-10 shadow-sm border border-slate-200 relative overflow-hidden group h-full flex flex-col justify-between">
                                <div className="absolute top-0 right-0 p-12 opacity-[0.02] text-emerald-600 group-hover:rotate-12 transition-all duration-1000">
                                    <Zap size={180} />
                                </div>
                                <div className="relative z-10 space-y-10">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 bg-blue-50 text-emerald-600 px-5 py-2 rounded-2xl border border-blue-100 shadow-sm">
                                            <Zap size={18} className="animate-pulse" />
                                            <span className="text-[9px] font-black uppercase tracking-widest italic">AI Analyst feed</span>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-6">
                                        <InsightCard label="Peak temporal node" value={localInsights.analysis?.peakTime || 'N/A'} icon={<Clock size={20} />} color="blue" />
                                        <InsightCard label="Operational Arena" value={localInsights.analysis?.popularTurf || 'Main Arena'} icon={<MapPin size={20} />} color="amber" />
                                        <InsightCard label="Entropy Index" value={`${localInsights.analysis?.cancellationRate}%`} icon={<TrendingDown size={20} />} color="rose" />
                                        <InsightCard label="Registry Status" value="ACTIVE" icon={<ShieldCheck size={20} />} color="blue" />
                                    </div>

                                    <div className="bg-slate-950 rounded-[3rem] p-8 relative overflow-hidden group shadow-2xl">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-600/10 blur-3xl"></div>
                                        <div className="relative z-10 space-y-6">
                                            <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                                                <div className="p-3 bg-white/5 text-emerald-500 rounded-xl"><CircleDot size={18} className="animate-pulse" /></div>
                                                <h4 className="text-white font-black uppercase text-base tracking-tighter italic leading-none">Neural <span className="text-emerald-600">Forecasts</span></h4>
                                            </div>
                                            <div className="space-y-4">
                                                {localInsights.predictions.length > 0 ? localInsights.predictions.map((pred, i) => (
                                                    <div key={i} className="flex gap-4 items-start group/pred">
                                                        <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full mt-1.5 shadow-[0_0_8px_rgba(37,99,235,1)] group-hover/pred:scale-150 transition-transform"></div>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 leading-relaxed italic group-hover/pred:text-slate-300 transition-colors">{pred}</p>
                                                    </div>
                                                )) : (
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-700 italic text-center py-4">Waiting for temporal data...</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Data Visualization Cluster */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="bg-white rounded-[4rem] p-12 shadow-sm border border-slate-200 h-[450px] relative overflow-hidden group min-w-0">
                            <div className="absolute top-0 right-0 p-12 opacity-[0.01] text-slate-900 pointer-events-none group-hover:scale-110 transition-all duration-1000">
                                <LineIcon size={300} />
                            </div>
                            <div className="flex items-center justify-between mb-12 relative z-10">
                                <div className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em] italic flex items-center gap-4">
                                    <div className="p-3 bg-slate-50 rounded-xl text-emerald-600 shadow-sm"><LineIcon size={18} /></div> Operational Volume Velocity
                                </div>
                                <div className="text-[9px] font-black text-emerald-600 uppercase italic bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-100 shadow-sm">Sync Active</div>
                            </div>
                            <div className="h-64 relative z-10">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={localInsights.analysis?.trendData || []}>
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} dy={15} />
                                        <YAxis hide />
                                        <Tooltip 
                                            contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '24px', padding: '20px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'}}
                                            itemStyle={{color: '#3B82F6', fontWeight: 900, textTransform: 'uppercase', fontSize: '11px'}}
                                            labelStyle={{color: '#94a3b8', fontSize: '9px', marginBottom: '8px', fontWeight: 900, textTransform: 'uppercase'}}
                                        />
                                        <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={6} dot={{r: 6, fill: '#2563eb', strokeWidth: 4, stroke: '#fff'}} activeDot={{r: 10, strokeWidth: 0}} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white rounded-[4rem] p-12 shadow-sm border border-slate-200 h-[450px] relative overflow-hidden group min-w-0">
                            <div className="absolute top-0 right-0 p-12 opacity-[0.01] text-slate-900 pointer-events-none group-hover:scale-110 transition-all duration-1000">
                                <BarChart3 size={300} />
                            </div>
                            <div className="flex items-center justify-between mb-12 relative z-10">
                                <div className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em] italic flex items-center gap-4">
                                    <div className="p-3 bg-slate-50 rounded-xl text-emerald-600 shadow-sm"><BarChart3 size={18} /></div> temporal Inbound Load Matrix
                                </div>
                                <div className="text-[9px] font-black text-emerald-600 uppercase italic bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 shadow-sm">Real-time Node</div>
                            </div>
                            <div className="h-64 relative z-10">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={localInsights.analysis?.timeSlotData || []}>
                                        <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} dy={15} />
                                        <YAxis hide />
                                        <Tooltip 
                                            contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '24px', padding: '20px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'}}
                                            itemStyle={{color: '#3b82f6', fontWeight: 900, textTransform: 'uppercase', fontSize: '11px'}}
                                            cursor={{fill: '#f8fafc', radius: [20, 20, 0, 0]}}
                                        />
                                        <Bar dataKey="count" fill="#2563eb" radius={[15, 15, 0, 0]} barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
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
        amber: 'text-amber-600 bg-slate-50 group-hover:bg-amber-600 group-hover:text-white',
        indigo: 'text-emerald-600 bg-slate-50 group-hover:bg-emerald-600 group-hover:text-white'
    };
    return (
        <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm group hover:shadow-2xl transition-all duration-700 h-[260px] flex flex-col justify-between overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-[0.02] text-slate-900 group-hover:scale-110 transition-transform duration-700">
                {icon}
            </div>
            <div className="flex justify-between items-start relative z-10">
                <div className={`p-5 rounded-[2rem] shadow-sm transition-all duration-500 ${colors[color] || colors.blue}`}>
                    {icon}
                </div>
                {trend && <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic bg-blue-50 px-5 py-2 rounded-full border border-blue-100 shadow-sm">{trend}</span>}
            </div>
            <div className="relative z-10">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">{label}</p>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none group-hover:text-emerald-600 transition-colors duration-500 tabular-nums">{value}</h2>
                {sub && <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-4 italic border-l-2 border-slate-200 pl-3">{sub}</p>}
            </div>
        </div>
    );
};

const InsightCard = ({ label, value, icon, color }) => {
    const colors = {
        blue: 'bg-slate-50 text-emerald-600 group-hover/ic:bg-emerald-600 group-hover/ic:text-white',
        amber: 'bg-slate-50 text-amber-600 group-hover/ic:bg-amber-600 group-hover/ic:text-white',
        rose: 'bg-slate-50 text-rose-600 group-hover/ic:bg-rose-600 group-hover/ic:text-white'
    };
    return (
        <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 group/ic hover:bg-white hover:shadow-xl hover:border-blue-100 transition-all duration-500 h-[180px] flex flex-col justify-between overflow-hidden relative">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] text-slate-900">
                {icon}
            </div>
            <div className={`p-3.5 rounded-xl w-fit shadow-sm transition-all duration-500 relative z-10 ${colors[color] || colors.blue}`}>
                {icon}
            </div>
            <div className="relative z-10">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic leading-none">{label}</p>
                <h4 className="text-[13px] font-black text-slate-950 uppercase italic truncate tracking-tight">{value}</h4>
            </div>
        </div>
    );
};

export default BookingDashboard;
