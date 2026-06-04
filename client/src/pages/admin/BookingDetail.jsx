import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    LayoutDashboard,
    Calendar,
    Activity,
    Briefcase,
    PieChart,
    LogOut,
    ChevronRight,
    ArrowLeft,
    XCircle,
    CheckCircle,
    Edit3,
    Zap,
    ShieldCheck,
    Loader2,
    MessageCircle,
    Database,
    Clock,
    Phone,
    MapPin,
    User,
    ArrowUpRight,
    Send,
    AlertTriangle,
    CreditCard,
    ShieldAlert,
    CircleDot,
    Maximize2,
    Layers,
    Cpu,
    ArrowRight,
    Download
} from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import { bookingsAPI, adminAPI, receiptsAPI } from '../../api/client';
import AdminSidebar from '../../components/AdminSidebar';

const AdminBookingDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, logout } = useContext(AuthContext);
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [sendingMsg, setSendingMsg] = useState(false);
    const [msgSuccess, setMsgSuccess] = useState('');
    const [userName, setUserName] = useState('');
    const [editingName, setEditingName] = useState(false);
    const [customMsg, setCustomMsg] = useState('');
    const [sendingCustomMsg, setSendingCustomMsg] = useState(false);
    const [error, setError] = useState('');
    const [aiInsights, setAiInsights] = useState(null);
    const [fetchingAI, setFetchingAI] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isDownloading, setIsDownloading] = useState(false);

    const fetchBooking = useCallback(async () => {
        const fetchAIInsights = async () => {
            try {
                setFetchingAI(true);
                const response = await bookingsAPI.getAIInsights(id);
                setAiInsights(response.data);
            } catch (err) {
                console.error('AI Insights Error:', err);
            } finally {
                setFetchingAI(false);
            }
        };

        try {
            setLoading(true);
            const response = await bookingsAPI.getById(id);
            setBooking(response.data.booking);
            setUserName(response.data.booking.userName);
            await fetchAIInsights();
        } catch (err) {
            console.error('Error fetching booking:', err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { 
        fetchBooking(); 
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, [id, fetchBooking]);

    const handleStatusChange = async (newStatus) => {
        setUpdatingStatus(true);
        setError('');
        setMsgSuccess('');
        try {
            await bookingsAPI.updateStatus(id, newStatus);
            if (newStatus === 'confirmed' && booking.paymentStatus === 'submitted') {
                await handleVerifyPayment();
            } else {
                await fetchBooking();
            }
            setMsgSuccess(`Registry Node recalibrated to ${newStatus}.`);
            setTimeout(() => setMsgSuccess(''), 4000);
        } catch (error) {
            setError('Registry update protocol failure.');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleVerifyPayment = async () => {
        try {
            setUpdatingStatus(true);
            const response = await bookingsAPI.verifyPayment(id, 'verified');
            setBooking(response.data.booking);
            return true;
        } catch (error) {
            setError('Payment verification failure.');
            return false;
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleSendWhatsApp = async () => {
        if (!['confirmed', 'rejected', 'hold'].includes(booking.bookingStatus)) {
            setError('Invalid status for transmission.');
            return;
        }
        setSendingMsg(true);
        setError('');
        try {
            await bookingsAPI.resendNotification(id);
            setMsgSuccess(`WhatsApp alert transmission complete.`);
            setTimeout(() => setMsgSuccess(''), 4000);
        } catch (err) {
            setError('Transmission failure.');
        } finally {
            setSendingMsg(false);
        }
    };

    const handleSendCustomWhatsApp = async () => {
        if (!customMsg.trim()) return;
        setSendingCustomMsg(true);
        setError('');
        try {
            await adminAPI.sendMessage(booking.userPhone, customMsg, booking._id);
            setMsgSuccess(`Custom transmission payload broadcasted.`);
            setCustomMsg('');
            setTimeout(() => setMsgSuccess(''), 4000);
        } catch (err) {
            setError('Custom transmission protocol failure.');
        } finally {
            setSendingCustomMsg(false);
        }
    };

    const handleUserNameUpdate = async () => {
        if (!userName.trim()) return;
        try {
            const response = await bookingsAPI.updateUsername(id, userName);
            setBooking(response.data.booking);
            setEditingName(false);
        } catch (error) {
            setError('Identity update protocol failure.');
        }
    };

    const handleDownloadReceipt = async () => {
        try {
            setIsDownloading(true);
            const response = await receiptsAPI.download(id);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `receipt-${id.slice(-6)}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            setMsgSuccess('Official Receipt downloaded.');
            setTimeout(() => setMsgSuccess(''), 4000);
        } catch (err) {
            console.error('Download Protocol Failure:', err);
            setError('Failed to transmit receipt payload.');
        } finally {
            setIsDownloading(false);
        }
    };


    if (loading && !booking) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6">
            <div className="relative">
                <div className="w-24 h-24 border-4 border-blue-100 border-t-emerald-600 rounded-full animate-spin"></div>
                <Database className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600 animate-pulse" size={32} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Accessing Node Registry...</p>
        </div>
    );

    if (!booking) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-12 text-center">
            <h2 className="text-3xl font-black text-slate-900 mb-8 uppercase italic tracking-tighter">Registry Node Null</h2>
            <button onClick={() => navigate('/admin/bookings')} className="bg-slate-950 text-white px-12 py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-xl active:scale-95 transition-all">
                Return to Registry hub
            </button>
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
                                <Database className="text-emerald-600" size={26} /> 
                                Node Audit <span className="text-slate-400">/ Registry Investigation</span>
                            </h1>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Transactional Integrity Registry v5.1</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden xl:flex items-center gap-4 bg-slate-50 border border-slate-200 p-2 rounded-2xl">
                            <div className="px-4 py-1.5 border-r border-slate-200">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Local Time</p>
                                <p className="text-xs font-black text-slate-900 tabular-nums italic">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                            </div>
                            <div className="px-4 py-1.5">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Audit Status</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                    <span className="text-[10px] font-black text-emerald-600 uppercase">Synchronized</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => navigate('/admin/bookings')} className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm flex items-center gap-3 px-6">
                            <ArrowLeft size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest italic">Registry Hub</span>
                        </button>
                    </div>
                </header>

                <div className="max-w-[1600px] mx-auto p-10 space-y-12">
                    
                    {/* Header Protocol Banners */}
                    <div className="flex flex-col xl:flex-row gap-8 items-start justify-between">
                        <div className="flex flex-col gap-6">
                            <div className="flex items-center gap-6">
                                <h2 className="text-5xl font-black text-slate-950 tracking-tighter uppercase italic leading-none">
                                    Booking <span className="text-emerald-600">#{booking._id?.slice(-6).toUpperCase()}</span>
                                </h2>
                                <div className="flex gap-4">
                                    <StatusBadge status={booking.bookingStatus} />
                                    {booking.aiRiskLevel && <RiskBadge level={booking.aiRiskLevel} />}
                                </div>
                            </div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] italic border-l-4 border-emerald-600 pl-6">Neural Transactional Audit & Behavioral Intel Layer</p>
                        </div>
                        
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex items-center gap-8">
                            <div className="flex flex-col">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Temporal Node Deployment</p>
                                <div className="flex items-center gap-4">
                                    <Calendar className="text-emerald-600" size={20} />
                                    <p className="text-xl font-black text-slate-900 italic tabular-nums">{booking.slot?.date ? new Date(booking.slot.date).toLocaleDateString('en-GB') : '---'}</p>
                                </div>
                            </div>
                            <button 
                                onClick={handleDownloadReceipt}
                                disabled={isDownloading}
                                className="bg-slate-950 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-emerald-600 transition-all active:scale-95 flex items-center gap-3 italic disabled:opacity-50"
                            >
                                {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                                Download Official Receipt
                            </button>
                        </div>
                    </div>

                    {/* Alerts Registry */}
                    {(error || msgSuccess) && (
                        <div className={`p-8 rounded-[2.5rem] flex items-center gap-6 border-4 shadow-2xl animate-fade-in ${error ? 'bg-rose-600 border-white text-white' : 'bg-emerald-600 border-white text-white'}`}>
                            <div className="bg-white/20 p-4 rounded-2xl shadow-lg">
                                {error ? <ShieldAlert size={24} /> : <CheckCircle size={24} />}
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80 mb-1 italic">Registry Broadcast</p>
                                <p className="text-lg font-black uppercase tracking-tight italic leading-none">{error || msgSuccess}</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        <div className="lg:col-span-8 space-y-12">
                            {/* Subject Identity Registry */}
                            <div className="bg-white rounded-[4rem] p-12 border border-slate-200 shadow-sm group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-12 opacity-[0.01] text-slate-900 pointer-events-none group-hover:scale-110 transition-all duration-1000">
                                   <User size={350} />
                                </div>
                                <div className="flex items-center gap-8 border-b border-slate-100 pb-10 mb-12 relative z-10">
                                    <div className="p-5 bg-slate-950 text-white rounded-[1.5rem] shadow-xl"><User size={28} /></div>
                                    <div>
                                        <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 italic">Subject <span className="text-emerald-600">Identity registry</span></h3>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5 italic">Verified Operational Identity nodes</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-12 relative z-10">
                                    <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 italic ml-2">Designated Identity Name</p>
                                        {editingName ? (
                                            <div className="flex gap-6 items-center">
                                                <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} className="bg-white border-2 border-emerald-600 p-6 rounded-[1.8rem] outline-none font-black text-slate-900 w-full text-2xl uppercase italic transition-all shadow-xl shadow-emerald-500/10" />
                                                <div className="flex gap-4">
                                                    <button onClick={handleUserNameUpdate} className="bg-emerald-600 text-white p-6 rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95"><CheckCircle size={24} /></button>
                                                    <button onClick={() => { setUserName(booking.userName); setEditingName(false); }} className="bg-white text-slate-400 p-6 rounded-2xl border border-slate-200 active:scale-95"><XCircle size={24} /></button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex justify-between items-center group/name">
                                                <h4 className="text-4xl font-black text-slate-950 tracking-tighter uppercase italic leading-none group-hover/name:text-emerald-600 transition-colors duration-500">{booking.userName}</h4>
                                                <button onClick={() => setEditingName(true)} className="p-5 bg-white text-slate-400 hover:bg-slate-950 hover:text-white rounded-2xl transition-all shadow-sm active:scale-95"><Edit3 size={22} /></button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="p-10 bg-slate-50 rounded-[3rem] border border-slate-100 group/ic hover:bg-white hover:border-emerald-600 transition-all duration-500">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 italic ml-1">Secure Line Transmission</p>
                                            <div className="flex items-center gap-5">
                                                <div className="p-3 bg-white rounded-xl text-emerald-600 shadow-sm"><Phone size={18} /></div>
                                                <p className="text-2xl font-black text-slate-900 italic tabular-nums group-hover/ic:text-emerald-600 transition-colors">+91 {booking.userPhone}</p>
                                            </div>
                                        </div>
                                        <div className="p-10 bg-slate-50 rounded-[3rem] border border-slate-100 group/ic hover:bg-white hover:border-emerald-600 transition-all duration-500">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 italic ml-1">Assigned Deployment Site</p>
                                            <div className="flex items-center gap-5">
                                                <div className="p-3 bg-white rounded-xl text-emerald-600 shadow-sm"><MapPin size={18} /></div>
                                                <p className="text-2xl font-black text-slate-900 italic uppercase group-hover/ic:text-emerald-600 transition-colors">{booking.turfLocation || 'Primary Arena'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Temporal Node Matrix */}
                            <div className="bg-white rounded-[4rem] p-12 border border-slate-200 shadow-sm group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-12 opacity-[0.01] text-slate-900 pointer-events-none group-hover:scale-110 transition-all duration-1000">
                                   <Clock size={350} />
                                </div>
                                <div className="flex items-center gap-8 border-b border-slate-100 pb-10 mb-12 relative z-10">
                                    <div className="p-5 bg-slate-950 text-white rounded-[1.5rem] shadow-xl"><Clock size={28} /></div>
                                    <div>
                                        <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 italic">Temporal <span className="text-emerald-600">Node Matrix</span></h3>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5 italic">Synchronized Schedule Nodes</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-12 relative z-10">
                                    <MatrixItem label="Deployment Date" value={booking.slot?.date ? new Date(booking.slot.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '---'} />
                                    <MatrixItem label="Operational Window" value={booking.slot?.startTime} highlight />
                                    <MatrixItem label="Registry ID" value={`#NODE_${booking.slot?._id?.slice(-4).toUpperCase()}`} />
                                    <MatrixItem label="Assigned Scorer" value={booking.slot?.assignedWorker?.name?.split(' ')[0] || 'Unassigned'} />
                                </div>
                            </div>

                            {/* Neural Behavioral Intelligence */}
                            <div className="bg-slate-950 rounded-[4rem] p-12 text-white relative overflow-hidden group shadow-2xl shadow-slate-950/40">
                                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-[120px] group-hover:bg-emerald-600/10 transition-all duration-1000"></div>
                                <div className="flex items-center justify-between mb-12 relative z-10 border-b border-white/5 pb-10">
                                    <div className="flex items-center gap-8">
                                        <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 text-emerald-500 shadow-2xl backdrop-blur-xl group-hover:scale-110 transition-transform">
                                            <Zap size={36} />
                                        </div>
                                        <div>
                                            <h3 className="text-3xl font-black tracking-tighter uppercase leading-none italic">Neural <span className="text-emerald-600">Behavioral Intel</span></h3>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2 italic">Automated Pattern Acquisition & Analytics</p>
                                        </div>
                                    </div>
                                    <div className="hidden md:flex items-center gap-4 bg-white/5 px-6 py-2 rounded-full border border-white/5">
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Analysis Live</span>
                                    </div>
                                </div>

                                {fetchingAI ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-6 relative z-10">
                                        <Loader2 size={40} className="animate-spin text-emerald-500/40" />
                                        <p className="text-[11px] font-black uppercase italic tracking-[0.4em] text-slate-600">Executing Neural Scan Protocol...</p>
                                    </div>
                                ) : aiInsights ? (
                                    <div className="space-y-12 relative z-10">
                                        <div className="p-12 bg-white/5 rounded-[3rem] border border-white/5 backdrop-blur-3xl relative overflow-hidden group/intel">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]"></div>
                                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mb-6 italic">Strategic Executive Synthesis</p>
                                            <p className="text-xl font-medium leading-relaxed italic text-blue-50/90 font-serif border-l-2 border-white/5 pl-8">"{aiInsights.insights}"</p>
                                        </div>
                                        <div className="grid grid-cols-3 gap-8">
                                            <IntelStat label="Registry volume" value={aiInsights.stats?.total || 0} />
                                            <IntelStat label="Confirmed nodes" value={aiInsights.stats?.confirmed || 0} color="text-emerald-500" />
                                            <IntelStat label="Registry collapse" value={aiInsights.stats?.noShow || 0} color="text-rose-500" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem] relative z-10">
                                        <AlertTriangle size={32} className="text-slate-800 mx-auto mb-6" />
                                        <p className="text-slate-700 text-[11px] font-black uppercase tracking-[0.4em] italic">Waiting for temporal behavioral acquisition payload.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Audit Actions Panel */}
                        <div className="lg:col-span-4 space-y-12">
                            {/* Financial Registry Matrix */}
                            <div className="bg-slate-900 rounded-[3.5rem] p-10 text-white shadow-2xl shadow-slate-950/40 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-600/10 blur-[60px] rounded-full group-hover:bg-emerald-600/20 transition-all duration-1000"></div>
                                <div className="flex items-center gap-5 mb-10 border-b border-white/5 pb-8 relative z-10">
                                    <div className="p-4 bg-white/5 text-emerald-500 rounded-2xl shadow-xl border border-white/10 backdrop-blur-md"><CreditCard size={24} /></div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tighter italic leading-none">Financial <span className="text-emerald-600">Matrix Registry</span></h3>
                                </div>

                                <div className="space-y-8 relative z-10">
                                    <div className="p-10 bg-white/5 border border-white/5 rounded-[2.5rem] flex flex-col gap-6 group/price hover:bg-white/10 transition-all duration-500">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">{booking.paymentType === 'full' ? 'Full Deployment Fee' : 'Advance Reservation payload'}</p>
                                            <Maximize2 size={16} className="text-white/20" />
                                        </div>
                                        <div className="flex items-end justify-between">
                                           <h4 className="text-6xl font-black tracking-tighter italic tabular-nums leading-none group-hover/price:text-emerald-500 transition-colors">₹{booking.amount?.toLocaleString()}</h4>
                                           <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic opacity-40">INR NODE</div>
                                        </div>
                                        {booking.paymentType === 'advance' && (
                                            <div className="pt-6 border-t border-white/5 flex justify-between items-center mt-2">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Pending Matrix Balance</span>
                                                <span className="text-2xl font-black text-amber-500 italic tabular-nums">₹{(booking.totalAmount - booking.amount)?.toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="p-8 bg-white/5 border border-white/5 rounded-[2rem] space-y-4 hover:bg-white/10 transition-all duration-500">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] italic ml-1">Transaction Identity Hash (UTR)</p>
                                        <div className="p-4 bg-black/40 rounded-xl font-mono text-[11px] font-black tracking-[0.2em] break-all text-emerald-400 tabular-nums border border-white/5">
                                            {booking.transactionId || booking.paymentId || 'AWAITING_REGISTRY_Acquisition'}
                                        </div>
                                    </div>

                                    <div className={`p-6 rounded-[1.8rem] border-4 text-center text-[10px] font-black uppercase tracking-[0.3em] italic flex items-center justify-center gap-4 transition-all duration-500 ${
                                        booking.paymentStatus === 'verified' ? 'border-emerald-600/30 bg-emerald-600/5 text-emerald-500' : 
                                        booking.paymentStatus === 'submitted' ? 'border-amber-600/30 bg-amber-600/5 text-amber-500' : 
                                        'border-white/10 bg-white/5 text-slate-500'
                                    }`}>
                                        <CircleDot size={12} className={booking.paymentStatus === 'submitted' ? 'animate-pulse' : ''} />
                                        Registry Status: {booking.paymentStatus?.toUpperCase()}
                                    </div>

                                    {booking.paymentStatus === 'submitted' && (
                                        <button onClick={handleVerifyPayment} disabled={updatingStatus} className="w-full bg-emerald-600 hover:bg-white hover:text-emerald-600 text-white py-6 rounded-[1.8rem] font-black uppercase text-[11px] tracking-widest shadow-2xl shadow-emerald-500/30 active:scale-95 transition-all flex items-center justify-center gap-4 italic">
                                            {updatingStatus ? <Loader2 size={20} className="animate-spin" /> : <ShieldCheck size={20} />}
                                            Validate Registry Node
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Operational Protocol Execution */}
                            <div className="bg-white rounded-[4rem] p-12 border border-slate-200 shadow-sm space-y-6 group">
                                <div className="flex items-center gap-6 mb-10 border-b border-slate-100 pb-8">
                                    <div className="p-4 bg-slate-950 text-white rounded-2xl shadow-xl transition-all duration-500 group-hover:bg-emerald-600"><Layers size={24} /></div>
                                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Protocol <span className="text-emerald-600">Execution</span></h3>
                                </div>

                                <div className="space-y-4">
                                    <ProtocolButton 
                                        onClick={() => handleStatusChange('confirmed')} 
                                        active={booking.bookingStatus === 'confirmed'} 
                                        loading={updatingStatus} 
                                        label="Confirm Deployment" 
                                        icon={<CheckCircle size={18} />}
                                        color="blue"
                                    />
                                    <ProtocolButton 
                                        onClick={() => handleStatusChange('rejected')} 
                                        active={booking.bookingStatus === 'rejected'} 
                                        loading={updatingStatus} 
                                        label="Reject Entry" 
                                        icon={<XCircle size={18} />}
                                        color="rose"
                                    />
                                    <ProtocolButton 
                                        onClick={() => handleStatusChange('hold')} 
                                        active={booking.bookingStatus === 'hold'} 
                                        loading={updatingStatus} 
                                        label="Temporal Hold" 
                                        icon={<Clock size={18} />}
                                        color="amber"
                                    />
                                </div>

                                <div className="pt-12 border-t border-slate-100 mt-10 space-y-8">
                                    <button
                                        onClick={handleSendWhatsApp}
                                        disabled={sendingMsg || !['confirmed', 'rejected', 'hold'].includes(booking.bookingStatus)}
                                        className="w-full bg-[#25D366] text-white py-6 rounded-[1.8rem] font-black uppercase text-[11px] tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-4 shadow-2xl shadow-green-500/20 italic"
                                    >
                                        {sendingMsg ? <Loader2 size={18} className="animate-spin" /> : <MessageCircle size={18} />}
                                        WhatsApp Alert transmission
                                    </button>
                                    
                                    <div className="space-y-4">
                                       <textarea
                                          value={customMsg}
                                          onChange={(e) => setCustomMsg(e.target.value)}
                                          placeholder="INPUT CUSTOM BROADCAST PAYLOAD..."
                                          className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-100 rounded-[1.8rem] p-8 text-[11px] font-black uppercase tracking-widest outline-none transition-all h-40 resize-none italic placeholder:text-slate-300 leading-relaxed"
                                       />
                                       <button
                                          onClick={handleSendCustomWhatsApp}
                                          disabled={sendingCustomMsg || !customMsg.trim()}
                                          className="w-full bg-slate-950 text-white py-6 rounded-[1.8rem] font-black uppercase text-[11px] tracking-widest hover:bg-emerald-600 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-4 italic group/send"
                                       >
                                          {sendingCustomMsg ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="group-hover/send:translate-x-1 group-hover/send:-translate-y-1 transition-transform" />}
                                          Execute Custom Broadcast
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

const StatusBadge = ({ status }) => {
    const map = {
        confirmed: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        rejected: 'bg-rose-50 text-rose-600 border-rose-100',
        hold: 'bg-amber-50 text-amber-600 border-amber-100',
        pending: 'bg-blue-50 text-emerald-600 border-blue-100'
    };
    return (
        <span className={`text-[10px] font-black uppercase tracking-[0.3em] px-6 py-2.5 rounded-full border shadow-sm italic flex items-center gap-2 ${map[status] || map.pending}`}>
            <CircleDot size={10} className={status === 'pending' ? 'animate-pulse' : ''} />
            {status}
        </span>
    );
};

const RiskBadge = ({ level }) => {
    const map = {
        LOW: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        MEDIUM: 'bg-amber-50 text-amber-600 border-amber-100',
        HIGH: 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse'
    };
    return (
        <span className={`text-[10px] font-black uppercase tracking-[0.3em] px-6 py-2.5 rounded-full border shadow-sm italic flex items-center gap-2 ${map[level] || map.LOW}`}>
            <ShieldAlert size={12} />
            RISK: {level}
        </span>
    );
};

const MatrixItem = ({ label, value, highlight }) => (
    <div className="group/matrix">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 italic transition-colors group-hover/matrix:text-emerald-600">{label}</p>
        <p className={`text-xl font-black uppercase italic tabular-nums leading-none transition-all group-hover/matrix:translate-x-1 ${highlight ? 'text-emerald-600 underline decoration-4 underline-offset-8 decoration-emerald-600/10' : 'text-slate-950'}`}>{value}</p>
    </div>
);

const IntelStat = ({ label, value, color }) => (
    <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5 hover:bg-white/10 transition-all duration-500 flex flex-col justify-center h-[140px] relative overflow-hidden group/is">
        <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-white group-hover/is:scale-125 transition-transform">
            <Activity size={60} />
        </div>
        <p className="text-slate-500 text-[9px] font-black uppercase mb-3 italic tracking-[0.2em] relative z-10 leading-none">{label}</p>
        <p className={`text-3xl font-black italic tabular-nums relative z-10 leading-none ${color || 'text-white'}`}>{value}</p>
    </div>
);

const ProtocolButton = ({ onClick, active, loading, label, icon, color }) => {
    const colors = {
        blue: 'bg-emerald-600 hover:bg-blue-700 text-white shadow-emerald-500/20',
        rose: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20',
        amber: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20'
    };
    return (
        <button
            onClick={onClick}
            disabled={loading || active}
            className={`w-full py-6 rounded-[1.8rem] font-black uppercase text-[11px] tracking-[0.2em] transition-all disabled:opacity-30 flex items-center justify-center gap-4 shadow-xl active:scale-95 italic ${active ? 'bg-slate-50 text-slate-300 shadow-none border border-slate-100' : colors[color]}`}
        >
            {loading ? <Loader2 size={18} className="animate-spin" /> : icon}
            {label}
        </button>
    );
};

export default AdminBookingDetail;
