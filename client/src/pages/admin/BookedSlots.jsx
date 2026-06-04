import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
    LayoutDashboard, 
    Calendar, 
    Activity, 
    Briefcase, 
    PieChart, 
    LogOut, 
    ChevronRight, 
    Database, 
    CheckCircle, 
    Clock,
    Phone,
    User,
    ArrowRight,
    RefreshCcw,
    Zap,
    Maximize2,
    Info,
    Layers,
    Filter,
    Download,
    CircleDot
} from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import { bookingsAPI, adminAPI } from '../../api/client';
import AdminSidebar from '../../components/AdminSidebar';

const AdminBookedSlots = () => {
    const navigate = useNavigate();
    const { user, logout } = useContext(AuthContext);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [filterDate, setFilterDate] = useState(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()));

    const fetchBookings = useCallback(async () => {
        try {
            setLoading(true);
            const [confRes, holdRes] = await Promise.all([
                bookingsAPI.getAll({ status: 'confirmed' }),
                bookingsAPI.getAll({ status: 'hold' })
            ]);
            
            const booked = [...(confRes.data.bookings || []), ...(holdRes.data.bookings || [])];
            booked.sort((a, b) => new Date(b.slot?.date || b.createdAt) - new Date(a.slot?.date || a.createdAt));
            setBookings(booked);
        } catch (error) {
            console.error('Registry fetch failure:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBookings();
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, [fetchBookings]);

    const filteredBookings = bookings.filter(b => 
        b.slot?.date ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(b.slot.date)) === filterDate : false
    );

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6">
            <div className="relative">
                <div className="w-24 h-24 border-4 border-blue-100 border-t-emerald-600 rounded-full animate-spin"></div>
                <Database className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600 animate-pulse" size={32} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Accessing Deployment Registry...</p>
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
                                <Calendar className="text-emerald-600" size={26} /> 
                                Deployment Registry <span className="text-slate-400">/ Active Nodes</span>
                            </h1>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Operational Calendar v3.4</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden xl:flex items-center gap-4 bg-slate-50 border border-slate-200 p-2 rounded-2xl">
                            <div className="px-4 py-1.5 border-r border-slate-200">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Local Time</p>
                                <p className="text-xs font-black text-slate-900 tabular-nums italic">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                            </div>
                            <div className="px-4 py-1.5">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Registry Synchronization</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                    <span className="text-[10px] font-black text-emerald-600 uppercase">Live Node</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                            <button
                                onClick={() => setFilterDate(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()))}
                                className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filterDate === new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Today
                            </button>
                            <input
                                type="date"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                                className="bg-transparent border-none text-[9px] font-black uppercase tracking-widest px-4 outline-none cursor-pointer [color-scheme:light]"
                            />
                        </div>
                        <button onClick={fetchBookings} className="p-3 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-blue-700 transition-all">
                            <RefreshCcw size={20} />
                        </button>
                    </div>
                </header>

                <div className="max-w-[1600px] mx-auto p-10 space-y-10">
                    
                    {/* Registry KPI Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                        {[
                            { label: 'Active Deployments', value: filteredBookings.length, icon: <Layers className="text-emerald-500" /> },
                            { label: 'Confirmed Yield', value: `₹${filteredBookings.filter(b => b.bookingStatus === 'confirmed').reduce((s, b) => s + b.amount, 0).toLocaleString()}`, icon: <Zap className="text-emerald-500" /> },
                            { label: 'Temporal Holds', value: filteredBookings.filter(b => b.bookingStatus === 'hold').length, icon: <Clock className="text-amber-500" /> },
                            { label: 'System Reach', value: '98.2%', icon: <Activity className="text-emerald-500" /> }
                        ].map((kpi, idx) => (
                            <div key={idx} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-2xl transition-all group overflow-hidden relative">
                                <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-slate-900 group-hover:scale-110 transition-transform duration-700">
                                    {kpi.icon}
                                </div>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                                        {kpi.icon}
                                    </div>
                                </div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">{kpi.label}</p>
                                <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter tabular-nums">{kpi.value}</h3>
                            </div>
                        ))}
                    </div>

                    {/* Main Registry Grid */}
                    {filteredBookings.length === 0 ? (
                        <div className="bg-white rounded-[4rem] p-32 text-center border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-20 opacity-[0.02] text-slate-900">
                                <Calendar size={300} />
                            </div>
                            <div className="relative z-10">
                                <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto text-slate-200 mb-8 border border-slate-100">
                                    <Calendar size={48} strokeWidth={1} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-4 italic">No Active Deployments</h3>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] italic">No booked nodes synchronized for {filterDate}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {filteredBookings.map(b => (
                                <div
                                    key={b._id}
                                    onClick={() => navigate(`/admin/bookings/${b._id}`)}
                                    className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm hover:shadow-2xl hover:border-emerald-600 hover:-translate-y-2 transition-all duration-500 cursor-pointer group flex flex-col justify-between min-h-[420px] relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.01] rounded-full blur-[40px]"></div>
                                    
                                    <div className="space-y-10 relative z-10">
                                        <div className="flex justify-between items-start">
                                            <div className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-3 border shadow-sm italic ${
                                                b.bookingStatus === 'confirmed' 
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                                : 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse'
                                            }`}>
                                                <CircleDot size={12} className={b.bookingStatus === 'hold' ? 'animate-pulse' : ''} /> 
                                                {b.bookingStatus}
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <div className="bg-slate-950 text-white px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg italic">
                                                    {b.paymentType}
                                                </div>
                                                <div className="text-3xl font-black text-slate-900 italic tabular-nums tracking-tighter group-hover:text-emerald-600 transition-colors">
                                                    ₹{b.amount.toLocaleString()}
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Subject Identity</p>
                                            <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic leading-none group-hover:text-emerald-600 transition-colors">{b.userName}</h4>
                                            <div className="flex items-center gap-3 text-slate-500 mt-4 bg-slate-50 p-3 rounded-xl border border-slate-100 group-hover:bg-blue-50 transition-colors">
                                                <Phone size={14} className="text-emerald-600" />
                                                <span className="text-[11px] font-black uppercase tracking-widest tabular-nums">+91 {b.userPhone}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-10 mt-10 border-t border-slate-50 group-hover:border-blue-50 transition-colors relative z-10">
                                        <div className="p-6 bg-slate-950 rounded-[2rem] shadow-xl group-hover:bg-emerald-600 transition-all duration-700 relative overflow-hidden">
                                            <div className="absolute -right-4 -bottom-4 opacity-10 text-white group-hover:scale-150 transition-transform">
                                                <Clock size={80} />
                                            </div>
                                            <div className="flex items-center gap-5 relative z-10">
                                                <div className="bg-white/10 p-3 rounded-xl backdrop-blur-md text-white shadow-inner">
                                                    <Zap size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-white/60 italic">Temporal Segment</p>
                                                    <p className="text-lg font-black text-white italic tabular-nums leading-none">
                                                        {b.slot?.startTime} • {b.slot?.endTime || '---'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-8 px-4">
                                           <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic font-mono">NODE_TX_{b._id.slice(-6).toUpperCase()}</span>
                                           <div className="flex items-center gap-2 text-emerald-600 group-hover:translate-x-2 transition-transform">
                                              <span className="text-[10px] font-black uppercase tracking-widest italic">Node Detail</span>
                                              <ArrowRight size={16} />
                                           </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminBookedSlots;
