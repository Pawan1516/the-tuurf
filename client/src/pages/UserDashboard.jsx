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
    MapPin,
    Trophy,
    Swords
} from 'lucide-react';
import io from 'socket.io-client';
import AuthContext from '../context/AuthContext';
import { bookingsAPI, slotsAPI, matchesAPI, authAPI } from '../api/client';
import MobileNav from '../components/MobileNav';
import MatchCreationModal from '../components/MatchCreationModal';

const UserDashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const [profile, setProfile] = useState(user);
    const [bookings, setBookings] = useState([]);
    const [myMatches, setMyMatches] = useState([]);
    const [todaySlots, setTodaySlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('bookings'); // 'bookings', 'profile'
    const [settings, setSettings] = useState({ TURF_NAME: 'The Turf', TURF_LOCATION: 'The Turf Stadium' });
    const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const navigate = useNavigate();

    const navItems = [
        { to: '/dashboard', label: 'My Bookings', icon: LayoutDashboard },
        { to: '/', label: 'Book New Slot', icon: Calendar },
    ];

    useEffect(() => {
        fetchInitialData();

        // Socket.IO for real-time career stats updates
        const socket = io(process.env.NODE_ENV === 'production' ? 'https://the-turf-in.onrender.com' : 'http://localhost:5001');
        
        if (user?._id) {
            socket.emit('join:profile', user._id);
            socket.on('stats:updated', (data) => {
                console.log('🚀 Career stats updated via socket:', data);
                // Re-fetch profile to show new stats
                authAPI.getProfile().then(res => {
                    if (res.data?.success) setProfile(res.data.user);
                });
            });
        }

        return () => socket.disconnect();
    }, [user?._id]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const today = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Kolkata',
                year: 'numeric', month: '2-digit', day: '2-digit'
            }).format(new Date());

            const [bookingRes, slotRes, settingsRes, matchRes, profileRes] = await Promise.allSettled([
                bookingsAPI.getMyBookings(),
                slotsAPI.getAll(today),
                slotsAPI.getSettings(),
                matchesAPI.getMyHistory(),
                authAPI.getProfile()
            ]);

            if (slotRes.status === 'fulfilled') {
                const slotData = slotRes.value.data;
                setTodaySlots(Array.isArray(slotData) ? slotData : (slotData?.slots || []));
            }

            if (bookingRes.status === 'fulfilled') {
                setBookings(bookingRes.value.data?.bookings || []);
            }

            if (settingsRes.status === 'fulfilled' && settingsRes.value.data?.success) {
                setSettings(prev => ({ ...prev, ...settingsRes.value.data.settings }));
            }

            if (matchRes.status === 'fulfilled') {
                setMyMatches(matchRes.value.data?.matches || []);
            }

            if (profileRes.status === 'fulfilled' && profileRes.value.data?.success) {
                setProfile(profileRes.value.data.user);
            }

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

    const handleCreateMatchClick = (booking) => {
        setSelectedBooking(booking);
        setIsMatchModalOpen(true);
    };

    const handleMatchSuccess = (match) => {
        navigate(`/scoring/${match._id}`);
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
            <MobileNav user={user} logout={logout} navItems={navItems} dashboardTitle={settings.TURF_NAME} />

            <aside className="hidden md:flex w-80 bg-white border-r border-gray-100 flex-col sticky top-0 h-screen z-50">
                <div className="p-8 border-b border-gray-50 flex items-center gap-4">
                    <div className="bg-emerald-600 text-white p-2.5 rounded-2xl shadow-lg shadow-emerald-200">
                        <Database size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none uppercase">{settings.TURF_NAME}</h1>
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

            <main className="flex-1 overflow-y-auto">
                <header className="hidden md:flex bg-white/80 backdrop-blur-md px-10 h-24 items-center justify-between sticky top-0 z-40 border-b border-gray-100">
                    <div className="flex gap-8">
                        <button 
                            onClick={() => setActiveTab('bookings')}
                            className={`text-xl font-black tracking-tighter uppercase pb-2 border-b-4 transition-all ${activeTab === 'bookings' ? 'text-gray-900 border-emerald-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
                            Activity Log
                        </button>
                        <button 
                            onClick={() => setActiveTab('profile')}
                            className={`text-xl font-black tracking-tighter uppercase pb-2 border-b-4 transition-all ${activeTab === 'profile' ? 'text-gray-900 border-emerald-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
                            Profile & Stats
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Operational Status</p>
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">System Online</p>
                        </div>
                    </div>
                </header>

                <div className="p-4 md:p-10 space-y-6 md:space-y-12 mb-nav md:mb-0">
                
                <div className="md:hidden flex gap-4 overflow-x-auto pb-4 scrollbar-hide border-b border-gray-200">
                    <button 
                        onClick={() => setActiveTab('bookings')}
                        className={`text-sm font-black whitespace-nowrap uppercase pb-2 border-b-4 ${activeTab === 'bookings' ? 'text-gray-900 border-emerald-600' : 'text-gray-400 border-transparent'}`}>
                        Activity Log
                    </button>
                    <button 
                        onClick={() => setActiveTab('profile')}
                        className={`text-sm font-black whitespace-nowrap uppercase pb-2 border-b-4 ${activeTab === 'profile' ? 'text-gray-900 border-emerald-600' : 'text-gray-400 border-transparent'}`}>
                        Profile & Stats
                    </button>
                </div>

                {activeTab === 'profile' && (
                    <div className="space-y-10">
                        <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-12 border border-gray-100 shadow-xl shadow-emerald-900/[0.02]">
                            <div className="flex flex-col md:flex-row items-center gap-10">
                                <div className="relative group">
                                    <div className="w-40 h-40 md:w-56 md:h-56 rounded-[3rem] overflow-hidden border-8 border-emerald-50 bg-emerald-100 flex items-center justify-center shadow-2xl transition-transform group-hover:scale-105 duration-500">
                                        {profile?.personal?.photo ? (
                                            <img src={profile.personal.photo} alt={profile.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <Zap size={64} className="text-emerald-300" />
                                        )}
                                    </div>
                                    <div className="absolute -bottom-4 -right-4 bg-emerald-600 text-white p-5 rounded-3xl shadow-xl shadow-emerald-200 border-4 border-white">
                                        <Trophy size={24} />
                                    </div>
                                </div>
                                <div className="flex-1 text-center md:text-left space-y-4">
                                    <div className="inline-flex items-center gap-3 bg-emerald-50 px-5 py-2 rounded-full border border-emerald-100">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest leading-none">PLAYER PROFILE</span>
                                    </div>
                                    <h2 className="text-5xl md:text-7xl font-black text-gray-900 uppercase tracking-tighter leading-[0.8]">{profile?.name}</h2>
                                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                        <div className="bg-gray-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest">{profile?.cricket_profile?.primary_role || 'All-Rounder'}</div>
                                        <div className="bg-emerald-100 text-emerald-800 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest">{profile?.cricket_profile?.batting_style || 'Right Hand'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {/* BATTING ARSENAL */}
                            <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-gray-100 shadow-xl">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3 mb-10 text-emerald-600">
                                    <Swords size={16} /> Batting Arsenal
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                                    <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-50 text-center">
                                        <p className="text-3xl font-black text-gray-900">{profile?.stats?.batting?.runs || 0}</p>
                                        <p className="text-[8px] font-black text-emerald-600 uppercase">Runs</p>
                                    </div>
                                    <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-50 text-center">
                                        <p className="text-3xl font-black text-gray-900">{profile?.stats?.batting?.average || 0}</p>
                                        <p className="text-[8px] font-black text-emerald-600 uppercase">Avg</p>
                                    </div>
                                    <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-50 text-center">
                                        <p className="text-3xl font-black text-gray-900">{profile?.stats?.batting?.strike_rate || 0}</p>
                                        <p className="text-[8px] font-black text-emerald-600 uppercase">S/R</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-3xl text-center">
                                        <p className="text-xl font-black text-gray-900">{profile?.stats?.batting?.fours || 0}</p>
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">4s</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-3xl text-center">
                                        <p className="text-xl font-black text-gray-900">{profile?.stats?.batting?.sixes || 0}</p>
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">6s</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-3xl text-center">
                                        <p className="text-xl font-black text-gray-900">{profile?.stats?.batting?.not_outs || 0}</p>
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">NO</p>
                                    </div>
                                </div>
                            </div>

                            {/* BOWLING COMMAND */}
                            <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-gray-100 shadow-xl">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3 mb-10 text-emerald-600">
                                    <Database size={16} /> Bowling Command
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                                    <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-50 text-center">
                                        <p className="text-3xl font-black text-gray-900">{profile?.stats?.bowling?.wickets || 0}</p>
                                        <p className="text-[8px] font-black text-emerald-600 uppercase">Wkts</p>
                                    </div>
                                    <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-50 text-center">
                                        <p className="text-3xl font-black text-gray-900">{profile?.stats?.bowling?.economy || 0}</p>
                                        <p className="text-[8px] font-black text-emerald-600 uppercase">Eco</p>
                                    </div>
                                    <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-50 text-center">
                                        <p className="text-3xl font-black text-gray-900">{profile?.stats?.bowling?.overs || 0}</p>
                                        <p className="text-[8px] font-black text-emerald-600 uppercase">Overs</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-3xl text-center">
                                        <p className="text-xl font-black text-gray-900">{profile?.stats?.bowling?.matches || 0}</p>
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Inns</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-3xl text-center">
                                        <p className="text-xl font-black text-gray-900">{profile?.stats?.bowling?.runs_conceded || 0}</p>
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Runs</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-3xl text-center">
                                        <p className="text-xl font-black text-gray-900">{profile?.stats?.bowling?.five_wicket_hauls || 0}</p>
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">5W</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Matches Section */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Recent Battles</h3>
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-4 py-1.5 bg-emerald-50 rounded-full">{myMatches.length} Matches</span>
                            </div>

                            {myMatches.length === 0 ? (
                                <div className="p-12 text-center bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                                    <Swords size={32} className="mx-auto mb-4 text-gray-300" />
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No match records found.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {myMatches.map((m) => (
                                        <div key={m._id} 
                                            onClick={() => navigate(`/scoring/${m._id}`)}
                                            className="bg-white border border-gray-100 p-6 rounded-[2rem] hover:border-emerald-200 hover:shadow-lg transition-all cursor-pointer group flex flex-col md:flex-row md:items-center gap-6"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${m.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600 animate-pulse'}`}>
                                                        {m.status}
                                                    </span>
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tight">#{m._id.slice(-6)}</span>
                                                </div>
                                                <h4 className="text-base font-black text-gray-900 uppercase tracking-tight leading-none mb-1">
                                                    {m.team_a?.team_id?.name || m.quick_teams?.team_a?.name} vs {m.team_b?.team_id?.name || m.quick_teams?.team_b?.name}
                                                </h4>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">
                                                    {new Date(m.start_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-8 px-8 border-l border-r border-gray-50">
                                                <div className="text-center">
                                                    <p className="text-lg font-black text-gray-900 leading-none">{m.team_a?.score || 0}</p>
                                                    <p className="text-[8px] font-black text-gray-400 uppercase">TMA</p>
                                                </div>
                                                <div className="text-emerald-200 font-black">VS</div>
                                                <div className="text-center">
                                                    <p className="text-lg font-black text-gray-900 leading-none">{m.team_b?.score || 0}</p>
                                                    <p className="text-[8px] font-black text-gray-400 uppercase">TMB</p>
                                                </div>
                                            </div>

                                            <div className="flex-1 text-right">
                                                {m.status === 'Completed' ? (
                                                    <div className="inline-flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-xl">
                                                        <Trophy size={14} className="text-yellow-500" />
                                                        <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">
                                                            Detailed Intel
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest animate-pulse">Live Scoring</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'bookings' && (
                    <>
                    <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-gray-100 shadow-xl shadow-emerald-900/[0.02]">
                        <div className="flex justify-between items-center mb-6 md:mb-8">
                            <h3 className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3">
                                <Zap size={16} className="text-emerald-500" /> Today's Rapid Booking
                            </h3>
                            <button onClick={() => navigate('/')} className="text-[9px] md:text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline">View All</button>
                        </div>

                        <div className="flex overflow-x-auto gap-3 pb-4 scrollbar-hide">
                            {todaySlots.length === 0 ? (
                                <p className="text-xs font-bold text-gray-400 uppercase italic">No slots available for today yet.</p>
                            ) : (
                                todaySlots.sort((a, b) => a.startTime.localeCompare(b.startTime)).map((slot) => {
                                    const isBooked = slot.status === 'booked';
                                    return (
                                        <div
                                            key={slot._id}
                                            onClick={() => slot.status === 'free' && navigate(`/book/${slot._id}`)}
                                            className={`flex-shrink-0 w-24 md:w-32 p-4 md:p-6 rounded-[1.5rem] border-2 transition-all ${slot.status === 'free'
                                                ? 'border-emerald-100 bg-emerald-50 active:scale-95 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-200 cursor-pointer'
                                                : isBooked ? 'border-red-50 bg-red-50/50 opacity-40 cursor-not-allowed' : 'border-yellow-50 bg-yellow-50 opacity-40 cursor-not-allowed'
                                                }`}
                                        >
                                            <p className="text-[10px] md:text-xs font-black text-gray-900 mb-1">{slot.startTime}</p>
                                            <p className={`text-[8px] md:text-[8px] font-black uppercase tracking-widest ${slot.status === 'free' ? 'text-emerald-600' : isBooked ? 'text-red-500' : 'text-yellow-600'}`}>
                                                {slot.status === 'free' ? 'FREE' : isBooked ? 'ALREADY BOOKED' : slot.status.toUpperCase()}
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
                                                        {booking.turfLocation || settings.TURF_LOCATION}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex-1 flex flex-col gap-4">
                                                {(booking.matches || []).length > 0 && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                                        {(booking.matches || []).map((m, mi) => (
                                                            <div key={mi} className={`relative overflow-hidden rounded-[2rem] p-5 border transition-all duration-500 ${
                                                                m.status === 'Completed' ? 'bg-gradient-to-br from-[#064E3B] to-[#022C22] border-emerald-400/30' : 'bg-gray-900 border-gray-700'
                                                            }`}>
                                                                <div className="flex justify-between items-center mb-3">
                                                                    <div className="bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                                                        <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">{m.status === 'Completed' ? 'FINAL' : 'LIVE'}</p>
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => navigate(`/scoring/${m._id}`)}
                                                                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                                                                        {m.status === 'Completed' ? 'Intel' : 'Score'}
                                                                    </button>
                                                                </div>
                                                                <h4 className="text-[11px] font-black text-white uppercase tracking-tight mb-1">
                                                                    {m.status === 'Completed' && m.result?.won_by ? (m.result.won_by === 'Tie' ? 'MATCH TIED' : `WON BY ${m.result.margin} ${m.result.won_by === 'Runs' ? 'RUNS' : 'WICKETS'}`) : `${m.quick_teams?.team_a?.name || 'TMA'} Vs. ${m.quick_teams?.team_b?.name || 'TMB'}`}
                                                                </h4>
                                                                <p className="text-[8px] font-bold text-emerald-400/40 uppercase tracking-widest leading-none">Arena Session: #{m._id.slice(-6)}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="w-full pt-4 border-t border-gray-100 flex flex-row items-center justify-between gap-3 shrink-0">
                                                    <div className="text-left md:text-right">
                                                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest leading-none mb-1">Fee Registry</p>
                                                        <p className="text-2xl font-black text-emerald-600 tracking-tighter leading-none">₹{booking.amount}</p>
                                                        <p className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${booking.paymentStatus === 'verified' ? 'text-emerald-400' : 'text-yellow-500'}`}>
                                                            {booking.paymentStatus}
                                                        </p>
                                                    </div>
                                                    {booking.bookingStatus === 'confirmed' && (booking.matches || []).length < 5 && (
                                                        <button 
                                                            onClick={() => handleCreateMatchClick(booking)}
                                                            className="bg-emerald-600 active:bg-emerald-700 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-5 py-3 rounded-2xl shadow-md shadow-emerald-200 transition-all flex items-center gap-2">
                                                            🏏 Create {(booking.matches || []).length > 0 ? 'Next' : ''} Match
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    </>
                )}
                </div>
            </main>

            {selectedBooking && (
                <MatchCreationModal 
                    isOpen={isMatchModalOpen}
                    onClose={() => setIsMatchModalOpen(false)}
                    booking={selectedBooking}
                    onSuccess={handleMatchSuccess}
                />
            )}
        </div>
    );
};

export default UserDashboard;
