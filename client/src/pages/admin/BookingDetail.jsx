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
    Clock
} from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import { bookingsAPI, adminAPI } from '../../api/client';
import MobileNav from '../../components/MobileNav';

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

    const fetchBooking = useCallback(async () => {
        try {
            setLoading(true);
            const response = await bookingsAPI.getById(id);
            setBooking(response.data.booking);
            setUserName(response.data.booking.userName);

            // Also fetch AI insights
            await fetchAIInsights();
        } catch (err) {
            console.error('Error fetching booking:', err);
        } finally {
            setLoading(false);
        }
    }, [id, fetchAIInsights]);

    useEffect(() => { fetchBooking(); }, [id, fetchBooking]);

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
            setMsgSuccess(`✅ Booking ${newStatus}! WhatsApp sent to user.`);
            setTimeout(() => setMsgSuccess(''), 4000);
        } catch (error) {
            setError('Failed to update status. Try again.');
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
            setError('Payment verification failed.');
            return false;
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleSendWhatsApp = async () => {
        if (!['confirmed', 'rejected', 'hold'].includes(booking.bookingStatus)) {
            setError('Can only send WhatsApp for confirmed, rejected, or hold bookings.');
            return;
        }
        setSendingMsg(true);
        setError('');
        setMsgSuccess('');
        try {
            await bookingsAPI.resendNotification(id);
            setMsgSuccess(`📱 WhatsApp sent to ${booking.userPhone}!`);
            setTimeout(() => setMsgSuccess(''), 4000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send WhatsApp message.');
        } finally {
            setSendingMsg(false);
        }
    };

    const handleSendCustomWhatsApp = async () => {
        if (!customMsg.trim()) return;
        setSendingCustomMsg(true);
        setError('');
        setMsgSuccess('');
        try {
            await adminAPI.sendMessage(booking.userPhone, customMsg, booking._id);
            setMsgSuccess(`📱 Custom message sent to ${booking.userPhone}!`);
            setCustomMsg('');
            setTimeout(() => setMsgSuccess(''), 4000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send custom message.');
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
            setError('Failed to update name.');
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

    // Status badge helper
    const statusBadge = (status) => {
        const map = {
            confirmed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            rejected: 'bg-red-100 text-red-700 border-red-200',
            hold: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            pending: 'bg-gray-100 text-gray-600 border-gray-200'
        };
        return map[status] || map.pending;
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Loading Booking...</p>
        </div>
    );

    if (!booking) return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
            <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase">Booking Not Found</h2>
            <button onClick={() => navigate('/admin/bookings')} className="mt-8 bg-emerald-600 text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest">
                Back to Bookings
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row">
            <MobileNav user={user} logout={logout} navItems={navItems} dashboardTitle="Turf Ops" />

            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex w-80 bg-white border-r border-gray-100 flex flex-col sticky top-0 h-screen z-50">
                <div className="p-8 border-b border-gray-50 flex items-center gap-4">
                    <div className="bg-emerald-600 text-white p-2.5 rounded-2xl shadow-lg shadow-emerald-200">
                        <Database size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none uppercase">The Turf</h1>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Admin </p>
                    </div>
                </div>
                <nav className="flex-1 p-6 space-y-2">
                    <NavItem to="/admin/dashboard" label="Dashboard" icon={LayoutDashboard} />
                    <NavItem to="/admin/slots" label="Slots" icon={Calendar} />
                    <NavItem to="/admin/bookings" label="Bookings" icon={Activity} active />
                    <NavItem to="/admin/workers" label="Workers" icon={Briefcase} />
                    <NavItem to="/admin/report" label="Reports" icon={PieChart} />
                </nav>
                <div className="p-6 border-t border-gray-50">
                    <button onClick={handleLogout} className="w-full flex items-center justify-between p-5 rounded-2xl bg-gray-900 text-white hover:bg-black transition-all group">
                        <div className="flex items-center gap-3">
                            <LogOut size={18} className="text-emerald-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Logout</span>
                        </div>
                        <ChevronRight size={14} className="opacity-30 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <header className="bg-white/80 backdrop-blur-md px-6 md:px-10 h-20 md:h-24 flex items-center justify-between sticky top-0 z-40 border-b border-gray-100">
                    <button onClick={() => navigate('/admin/bookings')} className="flex items-center gap-2 md:gap-3 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors">
                        <ArrowLeft size={16} /> <span className="hidden md:inline">Return to Registry</span> <span className="md:hidden">Back</span>
                    </button>
                    <div className="flex flex-col items-end">
                        <h2 className="text-sm md:text-xl font-black text-gray-900 tracking-tighter uppercase leading-none">Booking #{booking._id?.slice(-4)}</h2>
                        <span className={`mt-1 text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2 md:px-3 py-1 rounded-full border ${statusBadge(booking.bookingStatus)}`}>
                            {booking.bookingStatus}
                        </span>
                        {booking.aiRiskLevel && (
                            <span className={`mt-1 text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2 md:px-3 py-1 rounded-full border ${booking.aiRiskLevel === 'LOW' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                booking.aiRiskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                    'bg-red-100 text-red-700 border-red-200 animate-pulse'
                                }`}>
                                RISK: {booking.aiRiskLevel}
                            </span>
                        )}
                    </div>
                </header>

                <div className="p-4 md:p-10 space-y-6 md:space-y-10">
                    {/* Alerts */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-[10px] md:text-xs font-bold px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl flex items-center gap-3">
                            <XCircle size={16} /> {error}
                        </div>
                    )}
                    {msgSuccess && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] md:text-xs font-bold px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl flex items-center gap-3">
                            <CheckCircle size={16} /> {msgSuccess}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                        <div className="lg:col-span-2 space-y-6 md:space-y-8">
                            {/* Customer Info Card */}
                            <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-gray-100 shadow-xl shadow-emerald-900/[0.02]">
                                <h3 className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6 md:mb-10">Customer Info</h3>
                                <div className="space-y-6 md:space-y-10">
                                    <div>
                                        <p className="text-[8px] md:text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1 md:mb-2">Legally Designated Name</p>
                                        {editingName ? (
                                            <div className="flex flex-col md:flex-row gap-2">
                                                <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} className="bg-gray-50 border-2 border-emerald-500 p-3 md:p-4 rounded-xl outline-none font-black text-gray-900 w-full text-sm md:text-base" />
                                                <div className="flex gap-2">
                                                    <button onClick={handleUserNameUpdate} className="flex-1 bg-emerald-600 text-white px-4 md:px-6 py-2 rounded-xl font-black uppercase text-[10px]">Save</button>
                                                    <button onClick={() => { setUserName(booking.userName); setEditingName(false); }} className="flex-1 bg-gray-100 text-gray-500 px-4 md:px-6 py-2 rounded-xl font-black uppercase text-[10px]">Cancel</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex justify-between items-center group">
                                                <p className="text-xl md:text-3xl font-black text-gray-900 tracking-tight uppercase leading-none">{booking.userName}</p>
                                                <button onClick={() => setEditingName(true)} className="text-emerald-600 p-2 hover:bg-emerald-50 rounded-lg"><Edit3 size={20} /></button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                                        <div>
                                            <p className="text-[8px] md:text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1 md:mb-2">Secure Line</p>
                                            <p className="text-sm md:text-lg font-black text-gray-900">+91 {booking.userPhone}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] md:text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1 md:mb-2">Site Location</p>
                                            <p className="text-sm md:text-lg font-black text-gray-900">{booking.turfLocation || 'Primary Unit'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-gray-100 shadow-xl shadow-emerald-900/[0.02]">
                                <h3 className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6 md:mb-10">Slot Matrix</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
                                    <div>
                                        <p className="text-[8px] md:text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1 md:mb-2">Date</p>
                                        <p className="text-xs md:text-lg font-black text-gray-900 leading-tight">
                                            {booking.slot?.date ? new Date(booking.slot.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'TBD'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] md:text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1 md:mb-2">Time</p>
                                        <p className="text-xs md:text-lg font-black text-emerald-600 leading-none">
                                            {booking.slot?.startTime}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] md:text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1 md:mb-2">Slot Registry</p>
                                        <p className="text-xs md:text-lg font-black text-gray-900 italic truncate leading-none">
                                            #{booking.slot?._id?.slice(-4) || '---'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] md:text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1 md:mb-2">Operative</p>
                                        <p className="text-xs md:text-lg font-black text-gray-900 leading-none">{booking.slot?.assignedWorker?.name?.split(' ')[0] || 'Unassigned'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* AI INTELLIGENCE INTEL */}
                            <div className="bg-emerald-950 rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 text-white relative overflow-hidden group border border-white/5">
                                <div className="absolute top-0 right-0 p-8 md:p-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                    <Zap size={100} className="text-emerald-400" />
                                </div>
                                <div className="flex items-center gap-4 mb-6 md:mb-8">
                                    <div className="bg-emerald-500/20 p-3 md:p-4 rounded-xl md:rounded-2xl border border-emerald-500/20">
                                        <ShieldCheck className="text-emerald-400" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg md:text-xl font-black tracking-tighter uppercase leading-none">Behavioral Intel</h3>
                                        <p className="text-[8px] md:text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mt-1">AI Pattern Analysis</p>
                                    </div>
                                </div>

                                {fetchingAI ? (
                                    <div className="flex items-center gap-3 text-emerald-400/60 font-black uppercase text-[8px] md:text-[10px]">
                                        <Loader2 size={14} className="animate-spin" /> Scanning Repository...
                                    </div>
                                ) : aiInsights ? (
                                    <div className="space-y-6 md:space-y-8">
                                        <div className="bg-white/5 rounded-2xl p-4 md:p-6 border border-white/5 backdrop-blur-sm">
                                            <p className="text-emerald-400/60 text-[8px] md:text-[10px] font-black uppercase tracking-widest mb-2 md:mb-3">Executive Summary</p>
                                            <p className="text-xs md:text-sm font-medium leading-relaxed italic text-emerald-50">"{aiInsights.insights}"</p>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3 md:gap-4">
                                            <div className="bg-white/5 p-3 md:p-4 rounded-xl border border-white/5">
                                                <p className="text-emerald-400/40 text-[7px] md:text-[8px] font-black uppercase mb-1">Total</p>
                                                <p className="text-base md:text-xl font-black">{aiInsights.stats?.total || 0}</p>
                                            </div>
                                            <div className="bg-white/5 p-3 md:p-4 rounded-xl border border-white/5">
                                                <p className="text-emerald-500/40 text-[7px] md:text-[8px] font-black uppercase mb-1">Conf</p>
                                                <p className="text-base md:text-xl font-black text-emerald-400">{aiInsights.stats?.confirmed || 0}</p>
                                            </div>
                                            <div className="bg-white/5 p-3 md:p-4 rounded-xl border border-white/5">
                                                <p className="text-red-400/40 text-[7px] md:text-[8px] font-black uppercase mb-1">Flops</p>
                                                <p className="text-base md:text-xl font-black text-red-400">{aiInsights.stats?.noShow || 0}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-emerald-400/40 text-[8px] md:text-[10px] font-black uppercase italic">No behavioral data retrieved from node.</p>
                                )}
                            </div>
                        </div>

                        {/* Right Panel — Actions */}
                        <div className="space-y-6">
                            {/* Payment Card */}
                            <div className="bg-emerald-950 rounded-[2rem] md:rounded-[3rem] p-6 md:p-8 text-white shadow-2xl shadow-emerald-950/20">
                                <h3 className="text-[10px] font-black text-emerald-400/60 uppercase tracking-[0.2em] mb-6">Payment Status</h3>
                                <div className="space-y-5">
                                    <div className="bg-white/5 border border-white/5 p-4 md:p-5 rounded-2xl">
                                        <p className="text-[8px] md:text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Fee Amount</p>
                                        <p className="text-2xl md:text-4xl font-black tracking-tighter">₹{booking.amount?.toLocaleString()}</p>
                                    </div>
                                    <div className={`p-4 rounded-xl border-2 text-center text-[8px] md:text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 ${booking.paymentStatus === 'verified' ? 'border-emerald-500 text-emerald-400' : booking.paymentStatus === 'submitted' ? 'border-purple-400 text-purple-400' : 'border-yellow-500 text-yellow-400'}`}>
                                        {booking.paymentStatus === 'verified' && <ShieldCheck size={14} />}
                                        {booking.paymentStatus === 'submitted' ? `TX: ${booking.transactionId}` : booking.paymentStatus}
                                    </div>
                                    {booking.paymentStatus === 'submitted' && (
                                        <button onClick={handleVerifyPayment} disabled={updatingStatus} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                            {updatingStatus ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                                            Verify Payment
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-8 border border-gray-100 shadow-xl space-y-3">
                                <h3 className="text-[10px] md:text-xs font-black text-gray-900 uppercase tracking-[0.15em] mb-4 md:mb-6">System Protocol</h3>

                                {/* Confirm */}
                                <button
                                    onClick={() => handleStatusChange('confirmed')}
                                    disabled={updatingStatus || booking.bookingStatus === 'confirmed'}
                                    className="w-full bg-emerald-600 text-white py-3 md:py-4 rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-30 flex items-center justify-center gap-3 border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1"
                                >
                                    {updatingStatus ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                    Finalize Slot
                                </button>

                                {/* Reject */}
                                <button
                                    onClick={() => handleStatusChange('rejected')}
                                    disabled={updatingStatus || booking.bookingStatus === 'rejected'}
                                    className="w-full bg-red-50 text-red-600 py-3 md:py-4 rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest hover:bg-red-100 transition-all disabled:opacity-30 flex items-center justify-center gap-3 border-b-4 border-red-200 active:border-b-0 active:translate-y-1"
                                >
                                    <XCircle size={16} />
                                    Reject Entry
                                </button>

                                {/* Hold */}
                                <button
                                    onClick={() => handleStatusChange('hold')}
                                    disabled={updatingStatus || booking.bookingStatus === 'hold'}
                                    className="w-full bg-yellow-50 text-yellow-700 py-3 md:py-4 rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest hover:bg-yellow-100 transition-all disabled:opacity-30 flex items-center justify-center gap-3 border-b-4 border-yellow-200 active:border-b-0 active:translate-y-1"
                                >
                                    <Clock size={16} />
                                    Neutralize Hold
                                </button>

                                <div className="border-t border-gray-100 pt-3">
                                    {/* Send WhatsApp */}
                                    <button
                                        onClick={handleSendWhatsApp}
                                        disabled={sendingMsg || !['confirmed', 'rejected', 'hold'].includes(booking.bookingStatus)}
                                        className="w-full bg-[#25D366] text-white py-3 md:py-4 rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest hover:bg-[#1ebe5c] transition-all disabled:opacity-30 flex items-center justify-center gap-3 shadow-lg shadow-green-200"
                                    >
                                        {sendingMsg ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
                                        WhatsApp Alert
                                    </button>
                                    <p className="text-[8px] text-gray-400 text-center mt-2 font-medium">
                                        Status alert to +91 {booking.userPhone}
                                    </p>
                                </div>

                                <div className="border-t border-gray-100 pt-4 md:pt-6 mt-3 space-y-3 md:space-y-4">
                                    <h4 className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Custom Broadcast</h4>
                                    <textarea
                                        value={customMsg}
                                        onChange={(e) => setCustomMsg(e.target.value)}
                                        placeholder="Transmit custom payload..."
                                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl md:rounded-2xl p-4 text-[10px] md:text-xs font-medium outline-none focus:border-emerald-500 focus:bg-white transition-all min-h-[80px] md:min-h-[100px] resize-none"
                                    />
                                    <button
                                        onClick={handleSendCustomWhatsApp}
                                        disabled={sendingCustomMsg || !customMsg.trim()}
                                        className="w-full bg-emerald-100 text-emerald-700 py-3 md:py-4 rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest hover:bg-emerald-200 transition-all disabled:opacity-30 flex items-center justify-center gap-3 border-b-4 border-emerald-300 active:border-b-0 active:translate-y-1"
                                    >
                                        {sendingCustomMsg ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                                        Send Payload
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminBookingDetail;
