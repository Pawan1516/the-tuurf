import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Calendar,
    Activity,
    CheckCircle,
    XCircle,
    Clock,
    Database,
    LogOut,
    ChevronRight,
    Zap,
    MapPin
} from 'lucide-react';
import AuthContext from '../context/AuthContext';
import { bookingsAPI, slotsAPI } from '../api/client';
import MobileNav from '../components/MobileNav';

const UserDashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const [bookings, setBookings] = useState([]);
    const [todaySlots, setTodaySlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const navItems = [
        { to: '/dashboard', label: 'My Bookings', icon: LayoutDashboard },
        { to: '/', label: 'Book New Slot', icon: Calendar },
    ];

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const today = new Date().toISOString().split('T')[0];
            const [bookingRes, slotRes] = await Promise.all([
                bookingsAPI.getMyBookings(),
                slotsAPI.getAll(today)
            ]);
            setBookings(bookingRes.data.bookings || []);
            setTodaySlots(slotRes.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const getStatusInfo = (status) => {
        switch (status) {
            case 'confirmed': return { icon: <CheckCircle className="text-emerald-500" size={16} />, label: 'CONFIRMED', color: 'text-emerald-600', bg: 'bg-emerald-50' };
            case 'rejected': return { icon: <XCircle className="text-red-500" size={16} />, label: 'REJECTED', color: 'text-red-600', bg: 'bg-red-50' };
            case 'hold': return { icon: <Clock className="text-yellow-500" size={16} />, label: 'ON HOLD', color: 'text-yellow-600', bg: 'bg-yellow-50' };
            default: return { icon: <Activity className="text-blue-500" size={16} />, label: 'PENDING', color: 'text-blue-600', bg: 'bg-blue-50' };
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Loading Your Experience...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row">
            <MobileNav user={user} logout={logout} navItems={navItems} dashboardTitle="My Turf" />

            {/* Sidebar (Desktop Only) */}
            <aside className="hidden md:flex w-80 bg-white border-r border-gray-100 flex-col sticky top-0 h-screen z-50">
                <div className="p-8 border-b border-gray-50 flex items-center gap-4">
                    <div className="bg-emerald-600 text-white p-2.5 rounded-2xl shadow-lg shadow-emerald-200">
                        <Database size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none uppercase">The Turf</h1>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Player Dashboard</p>
                    </div>
                </div>

                <div className="flex-1 p-6 space-y-2">
                    <div className="p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100 mb-8">
                        <p className="text-[10px] font-black text-emerald-800/40 uppercase tracking-widest mb-1">Authenticated As</p>
                        <h3 className="text-lg font-black text-emerald-900 uppercase truncate text-sm">{user?.name}</h3>
                        <p className="text-[10px] font-bold text-emerald-600/60 truncate">{user?.email}</p>
                    </div>

                    <button
                        onClick={() => navigate('/dashboard')}
                        className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${window.location.pathname === '/dashboard'
                            ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-200'
                            : 'text-gray-400 hover:bg-emerald-50 hover:text-emerald-700'
                            }`}
                    >
                        <LayoutDashboard size={20} />
                        <span className="text-xs font-black uppercase tracking-widest">My Bookings</span>
                    </button>

                    <button onClick={() => navigate('/')} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-gray-400 hover:bg-emerald-50 hover:text-emerald-700 transition-all group">
                        <Calendar size={20} className="group-hover:text-emerald-600" />
                        <span className="text-xs font-black uppercase tracking-widest">Book New Slot</span>
                    </button>
                </div>

                <div className="p-6 border-t border-gray-50">
                    <button onClick={handleLogout} className="w-full flex items-center justify-between p-5 rounded-2xl bg-gray-900 text-white hover:bg-black transition-all group">
                        <div className="flex items-center gap-3">
                            <LogOut size={18} className="text-emerald-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Sign Out</span>
                        </div>
                        <ChevronRight size={14} className="opacity-30 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <header className="hidden md:flex bg-white/80 backdrop-blur-md px-10 h-24 items-center justify-between sticky top-0 z-40 border-b border-gray-100">
                    <h2 className="text-xl font-black text-gray-900 tracking-tighter uppercase">Activity Log</h2>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Operational Status</p>
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">System Online</p>
                        </div>
                    </div>
                </header>

                <div className="p-4 md:p-10 space-y-12">
                    {/* Today's Rapid Booking Section (7 AM - 11 PM) */}
                    <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-gray-100 shadow-xl shadow-emerald-900/[0.02]">
                        <div className="flex justify-between items-center mb-6 md:mb-8">
                            <h3 className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3">
                                <Zap size={16} className="text-emerald-500" /> Today's Rapid Booking
                            </h3>
                            <button onClick={() => navigate('/')} className="text-[9px] md:text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline">View All</button>
                        </div>

                        <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide">
                            {todaySlots.length === 0 ? (
                                <p className="text-xs font-bold text-gray-400 uppercase italic">No slots available for today yet.</p>
                            ) : (
                                todaySlots.sort((a, b) => a.startTime.localeCompare(b.startTime)).map((slot) => {
                                    const isBooked = slot.status === 'booked';
                                    return (
                                        <div
                                            key={slot._id}
                                            onClick={() => slot.status === 'free' && navigate(`/book/${slot._id}`)}
                                            className={`flex-shrink-0 w-28 md:w-32 p-4 md:p-6 rounded-[2rem] border-2 transition-all cursor-pointer ${slot.status === 'free'
                                                ? 'border-emerald-100 bg-emerald-50 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-200'
                                                : isBooked ? 'border-red-50 bg-red-50/50 opacity-40 cursor-not-allowed' : 'border-yellow-50 bg-yellow-50 opacity-40 cursor-not-allowed'
                                                }`}
                                        >
                                            <p className="text-[10px] md:text-xs font-black text-gray-900 mb-1">{slot.startTime}</p>
                                            <p className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest ${slot.status === 'free' ? 'text-emerald-600' : isBooked ? 'text-red-500' : 'text-yellow-600'}`}>
                                                {slot.status === 'free' ? 'BOOK' : slot.status}
                                            </p>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Transaction Registry</h3>
                        {bookings.length === 0 ? (
                            <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-12 md:p-20 text-center border border-gray-100 shadow-xl shadow-emerald-900/[0.02]">
                                <div className="bg-emerald-50 w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
                                    <Calendar size={32} />
                                </div>
                                <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-2 uppercase">No Bookings Found</h3>
                                <p className="text-sm text-gray-400 font-bold mb-8 uppercase tracking-tighter">You haven't reserved any slots yet.</p>
                                <button onClick={() => navigate('/')} className="w-full md:w-auto bg-emerald-600 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200">
                                    Start Reservation
                                </button>
                            </div>
                        ) : (
                            <div className="grid gap-4 md:gap-6">
                                {bookings.map((booking) => {
                                    const status = getStatusInfo(booking.bookingStatus);
                                    return (
                                        <div key={booking._id} className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 border border-gray-100 shadow-xl shadow-emerald-900/[0.02] flex flex-col md:flex-row items-center gap-6 md:gap-8 group hover:border-emerald-200 transition-all">
                                            <div className="bg-emerald-50 w-16 h-16 md:w-20 md:h-20 rounded-[1.5rem] md:rounded-3xl flex flex-col items-center justify-center text-emerald-600 shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                                <p className="text-[8px] md:text-[10px] font-black uppercase leading-none mb-1">
                                                    {booking.slot?.date ? new Date(booking.slot.date).toLocaleDateString('en-US', { month: 'short' }) : 'N/A'}
                                                </p>
                                                <p className="text-xl md:text-2xl font-black leading-none">
                                                    {booking.slot?.date ? new Date(booking.slot.date).getDate() : '??'}
                                                </p>
                                            </div>

                                            <div className="flex-1 space-y-3 md:space-y-4 text-center md:text-left w-full">
                                                <div className="flex flex-col md:flex-row items-center md:justify-start gap-3 md:gap-4">
                                                    <h4 className="text-lg md:text-xl font-black text-gray-900 tracking-tight uppercase">#{booking._id.slice(-6)}</h4>
                                                    <div className={`px-4 py-1.5 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border ${status.bg} ${status.color} border-current`}>
                                                        {status.icon}
                                                        {status.label}
                                                    </div>
                                                </div>

                                                <div className="flex flex-col md:flex-row items-center md:justify-start gap-y-2 md:gap-x-8 opacity-60">
                                                    <div className="flex items-center gap-2 text-[10px] md:text-[11px] font-black text-gray-500 uppercase tracking-tight">
                                                        <Clock size={14} className="text-emerald-500" />
                                                        {booking.slot?.startTime || '??:??'} – {booking.slot?.endTime || '??:??'}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] md:text-[11px] font-black text-gray-500 uppercase tracking-tight">
                                                        <MapPin size={14} className="text-emerald-500" />
                                                        {booking.turfLocation}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="w-full md:w-auto text-center md:text-right shrink-0 pt-4 md:pt-0 border-t md:border-0 border-gray-50">
                                                <p className="text-[8px] md:text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Transaction Value</p>
                                                <p className="text-2xl font-black text-emerald-600 tracking-tighter">₹{booking.amount}</p>
                                                <p className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest mt-1 ${booking.paymentStatus === 'verified' ? 'text-emerald-400' : 'text-yellow-500'}`}>
                                                    Payment: {booking.paymentStatus}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default UserDashboard;
