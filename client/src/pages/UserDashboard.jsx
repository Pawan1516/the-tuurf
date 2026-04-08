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
    Swords,
    Phone,
    Edit3,
    Save,
    X,
    BarChart,
    RefreshCw,
    CheckCircle2
} from 'lucide-react';
import io from 'socket.io-client';
import AuthContext from '../context/AuthContext';
import apiClient, { bookingsAPI, slotsAPI, matchesAPI, authAPI, analyticsAPI } from '../api/client';
import MobileNav from '../components/MobileNav';
import MatchCreationModal from '../components/MatchCreationModal';

const UserDashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const [profile, setProfile] = useState(user);
    const [bookings, setBookings] = useState([]);
    const [myMatches, setMyMatches] = useState([]);
    const [todaySlots, setTodaySlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState({ TURF_NAME: 'The Turf', TURF_LOCATION: 'The Turf Stadium' });
    const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState('');
    const [editSuccess, setEditSuccess] = useState('');
    const navigate = useNavigate();

    const navItems = [
        { to: '/dashboard', label: 'My Bookings', icon: LayoutDashboard },
        { to: '/', label: 'Book New Slot', icon: Calendar },
    ];

    useEffect(() => {
        fetchInitialData();

        // Socket.IO for real-time career stats updates
        const socket = io(process.env.NODE_ENV === 'production' ? 'https://the-tuurf-ufkd.onrender.com' : 'http://localhost:5001');
        
        if (user?._id) {
            socket.emit('join_profile', user._id);
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

    const [dbConnected, setDbConnected] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            setFetchError(null);
            const today = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Kolkata',
                year: 'numeric', month: '2-digit', day: '2-digit'
            }).format(new Date());

            const [bookingRes, slotRes, settingsRes, matchRes, profileRes, healthRes] = await Promise.allSettled([
                bookingsAPI.getMyBookings(),
                slotsAPI.getAll(today),
                slotsAPI.getSettings(),
                matchesAPI.getMyHistory(),
                authAPI.getProfile(),
                apiClient.get('/health')
            ]);

            if (healthRes.status === 'fulfilled') {
                setDbConnected(healthRes.value.data?.database === 'connected');
            } else {
                setDbConnected(false);
            }

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

    const getMyMatchStats = (m) => {
        if (!m.innings || !user?._id) return null;
        let batting = null;
        let bowling = null;
        
        m.innings.forEach(inn => {
            const b = (inn.batsmen || []).find(bt => {
                const bId = bt.user_id?._id || bt.user_id;
                return bId === user._id;
            });
            if (b) batting = b;
            const bw = (inn.bowlers || []).find(bwlr => {
                const bwId = bwlr.user_id?._id || bwlr.user_id;
                return bwId === user._id;
            });
            if (bw) bowling = bw;
        });
        
        if (!batting && !bowling) return null;
        return { batting, bowling };
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

    const formatTime12h = (time24) => {
        if (!time24) return 'N/A';
        const [hours, minutes] = time24.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'confirmed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
            case 'pending': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'hold': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const startEditProfile = () => {
        setEditForm({
            name: profile?.name || '',
            phone: profile?.phone || '',
            primary_role: profile?.cricket_profile?.primary_role || 'Batsman',
            batting_style: profile?.cricket_profile?.batting_style || 'Right-hand bat',
            bowling_style: profile?.cricket_profile?.bowling_style || 'None',
        });
        setEditError('');
        setEditSuccess('');
        setIsEditingProfile(true);
    };

    const handleSyncStats = async () => {
        if (!profile?._id) return;
        setEditLoading(true);
        setEditError('');
        setEditSuccess('');
        try {
            const res = await analyticsAPI.syncUserStats(profile._id);
            if (res.data.success) {
                setProfile(res.data.user);
                setEditSuccess('Stats synced successfully from match history!');
                setTimeout(() => setEditSuccess(''), 3000);
            }
        } catch (err) {
            setEditError(err.response?.data?.message || 'Sync failed');
            setTimeout(() => setEditError(''), 3000);
        } finally {
            setEditLoading(false);
        }
    };

    const cancelEdit = () => {
        setIsEditingProfile(false);
        setEditError('');
        setEditSuccess('');
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setEditError('');
        setEditSuccess('');
        if (editForm.phone && !/^[0-9]{10}$/.test(editForm.phone)) {
            setEditError('Mobile number must be exactly 10 digits.');
            return;
        }
        setEditLoading(true);
        try {
            const res = await authAPI.updateProfile({
                name: editForm.name,
                phone: editForm.phone,
                cricket_profile: {
                    primary_role: editForm.primary_role,
                    batting_style: editForm.batting_style,
                    bowling_style: editForm.bowling_style,
                }
            });
            if (res.data?.success) {
                setProfile(res.data.user);
                localStorage.setItem('user', JSON.stringify(res.data.user));
                setEditSuccess('Profile updated successfully!');
                setTimeout(() => { setIsEditingProfile(false); setEditSuccess(''); }, 1500);
            } else {
                setEditError(res.data?.message || 'Update failed.');
            }
        } catch (err) {
            setEditError(err.response?.data?.message || 'Failed to save profile.');
        } finally {
            setEditLoading(false);
        }
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
        <div className="min-h-screen premium-gradient flex flex-col md:flex-row overflow-hidden">
            <MobileNav user={user} logout={logout} navItems={navItems} dashboardTitle={settings.TURF_NAME} className="md:hidden" />

            <aside className="hidden md:flex w-96 bg-white/70 backdrop-blur-2xl border-r border-slate-100 flex-col sticky top-0 h-screen z-50 animate-in fade-in slide-in-from-left duration-700">
                <div className="p-10 border-b border-slate-100/50 flex items-center gap-5">
                    <div className="bg-slate-900 p-3 rounded-[1.5rem] shadow-2xl relative group">
                        <img 
                            src="/logo.png" 
                            alt="Logo" 
                            className="h-10 w-auto object-contain brightness-100 group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tighter leading-none uppercase">{settings.TURF_NAME}</h1>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mt-1 shrink-0">Arena Network</p>
                    </div>
                </div>

                <div className="flex-1 p-8 space-y-3 overflow-y-auto no-scrollbar">
                    <div className="p-8 bg-slate-900 rounded-[2.5rem] border border-white/5 mb-10 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full"></div>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-2 relative z-10">Digital ID</p>
                        <h3 className="text-xl font-black text-white uppercase truncate relative z-10 tracking-tight">{user?.name}</h3>
                        <div className="flex items-center gap-2 mt-2 relative z-10">
                             <div className="w-1 h-1 bg-emerald-500 rounded-full"></div>
                             <p className="text-[10px] font-bold text-white/40 tabular-nums uppercase tracking-widest">+91 {user?.phone}</p>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/dashboard')}
                        className={`w-full flex items-center justify-between px-8 py-5 rounded-[2rem] transition-all group ${window.location.pathname === '/dashboard'
                            ? 'bg-emerald-600 text-white shadow-[0_20px_40px_-5px_rgba(16,185,129,0.3)]'
                            : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                    >
                        <div className="flex items-center gap-4">
                            <LayoutDashboard size={20} className={window.location.pathname === '/dashboard' ? 'text-white' : 'text-slate-300 group-hover:text-emerald-500 transition-colors'} />
                            <span className="text-xs font-black uppercase tracking-widest">Activity Feed</span>
                        </div>
                        {window.location.pathname === '/dashboard' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                    </button>

                    <button onClick={() => navigate('/')} className="w-full flex items-center justify-between px-8 py-5 rounded-[2rem] text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all group">
                        <div className="flex items-center gap-4">
                             <Calendar size={20} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                             <span className="text-xs font-black uppercase tracking-widest">Reserve Slot</span>
                        </div>
                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </button>

                    <button onClick={() => navigate('/leaderboard')} className="w-full flex items-center justify-between px-8 py-5 rounded-[2rem] text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all group">
                        <div className="flex items-center gap-4">
                             <Trophy size={20} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                             <span className="text-xs font-black uppercase tracking-widest">Leaderboard</span>
                        </div>
                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </button>

                    <button onClick={() => navigate('/player-analytics')} className={`w-full flex items-center justify-between px-8 py-5 rounded-[2rem] transition-all group ${window.location.pathname === '/player-analytics'
                        ? 'bg-emerald-600 text-white shadow-[0_20px_40px_-5px_rgba(16,185,129,0.3)]'
                        : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
                        }`}>
                        <div className="flex items-center gap-4">
                             <BarChart size={20} className={window.location.pathname === '/player-analytics' ? 'text-white' : 'text-slate-300 group-hover:text-emerald-500 transition-colors'} />
                             <span className="text-xs font-black uppercase tracking-widest">Player Intel</span>
                        </div>
                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </button>

                </div>

                <div className="p-8 mt-auto">
                    <button onClick={handleLogout} className="w-full flex items-center justify-between p-6 rounded-[2rem] bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white transition-all group border border-rose-500/20">
                        <div className="flex items-center gap-3">
                            <LogOut size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Sign Out Hub</span>
                        </div>
                        <ChevronRight size={14} className="opacity-30 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </aside>

            <main className="flex-1 overflow-y-auto gpu-layer">
                <header className="hidden md:flex nav-glass px-12 h-28 items-center justify-between sticky top-0 z-40">
                    <div className="flex gap-12 h-full items-center">
                        <span className="text-2xl font-black tracking-tighter uppercase h-full border-b-[6px] border-emerald-600 transition-all pt-2 text-slate-900 flex items-center">
                            User Profile
                        </span>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="w-px h-8 bg-slate-100"></div>
                        <div className="text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Network Status</p>
                            <div className="flex items-center gap-2 justify-end">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Operations Live</p>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-4 md:p-10 space-y-6 md:space-y-12 mb-nav md:mb-0">
                
                <div className="space-y-10">
                        <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-12 border border-gray-100 shadow-xl shadow-emerald-900/[0.02]">
                            {!isEditingProfile ? (
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
                                        <div className="flex items-center gap-2 text-gray-500 font-mono text-sm border-l-4 border-emerald-500 pl-4 py-1">
                                            <Phone size={14} className="text-emerald-600" />
                                            <span>+91 {profile?.phone}</span>
                                        </div>
                                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                            <div className="bg-gray-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest">{profile?.cricket_profile?.primary_role || 'All-Rounder'}</div>
                                            <div className="bg-emerald-100 text-emerald-800 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest">{profile?.cricket_profile?.batting_style || 'Right Hand'}</div>
                                            <div className="bg-emerald-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-200">CAREER SCORE: {profile?.score || 0}</div>
                                            {profile?.subscription?.isPremium && (
                                                <div className="bg-gradient-to-r from-amber-400 to-amber-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-amber-500/20 flex items-center gap-2 animate-bounce-subtle">
                                                    <Zap size={14} className="fill-white" />
                                                    Intel Pass Active
                                                </div>
                                            )}
                                            {/* NEW PREMIUM LOGIC */}
                                            {profile?.isPremium && profile?.trialEndDate && new Date(profile.trialEndDate) > new Date() && !profile.premiumExpiry && (
                                                <div className="bg-emerald-100 text-emerald-800 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-200">
                                                    🎉 7-Day Free Trial Activated (Ends in {Math.ceil((new Date(profile.trialEndDate) - new Date()) / (1000 * 60 * 60 * 24))} days)
                                                </div>
                                            )}
                                            {profile?.isPremium && profile?.premiumExpiry && new Date(profile.premiumExpiry) > new Date() && (
                                                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-200">
                                                    ✅ Premium Active (Until {new Date(profile.premiumExpiry).toLocaleDateString()})
                                                </div>
                                            )}
                                            {(!profile?.isPremium || (profile?.trialEndDate && new Date(profile.trialEndDate) < new Date() && !profile.premiumExpiry)) && (
                                                <div className="bg-rose-50 text-rose-600 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-rose-100">
                                                    🔒 Your trial expired. Unlock Premium for ₹49/year
                                                </div>
                                            )}
                                        </div>
                                        <div className="pt-2 flex flex-wrap gap-4">
                                            <button
                                                onClick={startEditProfile}
                                                className="inline-flex items-center gap-2 bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-200 text-gray-600 hover:text-emerald-700 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                            >
                                                <Edit3 size={14} /> Edit Profile
                                            </button>
                                            <button
                                                onClick={handleSyncStats}
                                                disabled={editLoading}
                                                className="inline-flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 hover:border-emerald-200 text-emerald-700 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                                            >
                                                <RefreshCw size={14} className={editLoading ? 'animate-spin' : ''} />
                                                {editLoading ? 'Syncing...' : 'Sync Match Stats'}
                                            </button>
                                        </div>
                                        {editSuccess && (
                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest animate-pulse">{editSuccess}</p>
                                        )}
                                        {editError && (
                                            <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">{editError}</p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSaveProfile} className="space-y-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Edit Profile</h3>
                                        <button type="button" onClick={cancelEdit} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-all">
                                            <X size={18} />
                                        </button>
                                    </div>

                                    {editError && (
                                        <div className="bg-red-50 border border-red-100 text-red-600 text-[11px] font-black uppercase tracking-wide px-5 py-4 rounded-2xl">{editError}</div>
                                    )}
                                    {editSuccess && (
                                        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-black uppercase tracking-wide px-5 py-4 rounded-2xl">{editSuccess}</div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Full Name</label>
                                            <input
                                                type="text"
                                                value={editForm.name}
                                                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                                className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-400 p-4 rounded-2xl outline-none font-bold text-sm text-gray-900 transition-all"
                                                placeholder="Your name"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Mobile Number</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">+91</span>
                                                <input
                                                    type="tel"
                                                    value={editForm.phone}
                                                    onChange={e => setEditForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-400 p-4 pl-14 rounded-2xl outline-none font-bold text-sm text-gray-900 transition-all"
                                                    placeholder="10-digit number"
                                                    maxLength={10}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Cricket Role</label>
                                            <select
                                                value={editForm.primary_role}
                                                onChange={e => setEditForm(f => ({ ...f, primary_role: e.target.value }))}
                                                className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-400 p-4 rounded-2xl outline-none font-bold text-sm text-gray-900 transition-all"
                                            >
                                                {['Batsman', 'Bowler', 'All-rounder', 'Wicketkeeper'].map(r => (
                                                    <option key={r} value={r}>{r}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Batting Style</label>
                                            <select
                                                value={editForm.batting_style}
                                                onChange={e => setEditForm(f => ({ ...f, batting_style: e.target.value }))}
                                                className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-400 p-4 rounded-2xl outline-none font-bold text-sm text-gray-900 transition-all"
                                            >
                                                {['Right-hand bat', 'Left-hand bat'].map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1 md:col-span-2">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Bowling Style</label>
                                            <select
                                                value={editForm.bowling_style}
                                                onChange={e => setEditForm(f => ({ ...f, bowling_style: e.target.value }))}
                                                className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-400 p-4 rounded-2xl outline-none font-bold text-sm text-gray-900 transition-all"
                                            >
                                                {['Right-arm fast', 'Right-arm medium', 'Right-arm offbreak', 'Right-arm legbreak', 'Left-arm fast', 'Left-arm medium', 'Left-arm orthodox', 'Left-arm chinaman', 'None'].map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 pt-2">
                                        <button
                                            type="submit"
                                            disabled={editLoading}
                                            className="flex-1 flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                                        >
                                            <Save size={15} /> {editLoading ? 'Saving...' : 'Save Changes'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={cancelEdit}
                                            className="px-6 py-4 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-black uppercase tracking-widest transition-all"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {/* BATTING ARSENAL */}
                            <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-gray-100 shadow-xl">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3 mb-10 text-emerald-600">
                                    <Swords size={16} /> Batting Arsenal
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                                    <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-50 text-center col-span-2">
                                        <p className="text-4xl font-black text-gray-900">{profile?.stats?.batting?.runs || 0}</p>
                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Runs</p>
                                    </div>
                                    <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-50 text-center">
                                        <p className="text-2xl font-black text-gray-900">{profile?.stats?.batting?.average || 0}</p>
                                        <p className="text-[8px] font-black text-emerald-600 uppercase">Avg</p>
                                    </div>
                                    <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-50 text-center">
                                        <p className="text-2xl font-black text-gray-900">{profile?.stats?.batting?.strike_rate || 0}</p>
                                        <p className="text-[8px] font-black text-emerald-600 uppercase">S/R</p>
                                    </div>
                                    <div className="bg-gray-50 p-6 rounded-3xl text-center col-span-2">
                                        <p className="text-2xl font-black text-gray-900">{profile?.stats?.batting?.high_score || 0}</p>
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Personal Best</p>
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
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">N/O</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-3xl text-center">
                                        <p className="text-xl font-black text-gray-900">{profile?.stats?.batting?.fifties || 0}</p>
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">50s</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-3xl text-center">
                                        <p className="text-xl font-black text-gray-900">{profile?.stats?.batting?.hundreds || 0}</p>
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">100s</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-3xl text-center">
                                        <p className="text-xl font-black text-gray-900">{profile?.stats?.batting?.innings || 0}</p>
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Inns</p>
                                    </div>
                                </div>
                            </div>

                            {/* BOWLING COMMAND */}
                            <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-gray-100 shadow-xl">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3 mb-10 text-emerald-600">
                                    <Database size={16} /> Bowling Command
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
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
                                    <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-50 text-center">
                                        <p className="text-3xl font-black text-gray-900">{profile?.stats?.bowling?.best_bowling?.wickets || 0} / {profile?.stats?.bowling?.best_bowling?.runs || 0}</p>
                                        <p className="text-[8px] font-black text-emerald-600 uppercase">Best</p>
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
                                        <p className="text-xl font-black text-gray-900">{profile?.stats?.bowling?.three_wicket_hauls || 0}</p>
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">3W</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-3xl text-center">
                                        <p className="text-xl font-black text-gray-900">{profile?.stats?.bowling?.five_wicket_hauls || 0}</p>
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">5W</p>
                                    </div>
                                </div>
                            </div>

                            {/* FIELDING PROWESS */}
                            <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-gray-100 shadow-xl md:col-span-2 xl:col-span-1">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3 mb-10 text-emerald-600">
                                    <Trophy size={16} /> Fielding Prowess
                                </h3>
                                <div className="grid grid-cols-3 gap-4 md:gap-6">
                                    <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-50 text-center">
                                        <p className="text-3xl font-black text-gray-900">{profile?.stats?.fielding?.catches || 0}</p>
                                        <p className="text-[8px] font-black text-emerald-600 uppercase">Catches</p>
                                    </div>
                                    <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-50 text-center">
                                        <p className="text-3xl font-black text-gray-900">{profile?.stats?.fielding?.run_outs || 0}</p>
                                        <p className="text-[8px] font-black text-emerald-600 uppercase">Run Outs</p>
                                    </div>
                                    <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-50 text-center">
                                        <p className="text-3xl font-black text-gray-900">{profile?.stats?.fielding?.stumpings || 0}</p>
                                        <p className="text-[8px] font-black text-emerald-600 uppercase">Stumpings</p>
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

                                            {/* PERSONAL CONTRIBUTION (Workflow 5) */}
                                            {m.status === 'Completed' && (() => {
                                                const performance = getMyMatchStats(m);
                                                if (!performance) return null;
                                                return (
                                                    <div className="hidden lg:flex items-center gap-4 px-6 border-r border-gray-50">
                                                        {performance.batting && (
                                                            <div className="text-left">
                                                                <p className="text-emerald-600 text-sm font-black leading-none">{performance.batting.runs}* <span className="text-[10px] text-gray-400">({performance.batting.balls})</span></p>
                                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Your Batting</p>
                                                            </div>
                                                        )}
                                                        {performance.bowling && (
                                                            <div className="text-left border-l border-gray-100 pl-4 ml-2">
                                                                <p className="text-emerald-600 text-sm font-black leading-none">{performance.bowling.wickets} Wkts</p>
                                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Your Bowling</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}

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

                    <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-gray-100 shadow-xl shadow-emerald-900/[0.02]">
                        <div className="flex justify-between items-center mb-6 md:mb-8">
                            <h3 className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3">
                                <Zap size={16} className="text-emerald-500" /> TODAY'S RAPID BOOKING
                                {!dbConnected && (
                                    <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[8px] animate-pulse">DB OFFLINE</span>
                                )}
                                {dbConnected && todaySlots.length > 0 && (
                                    <span className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full text-[8px]">LIVE SYNC</span>
                                )}
                            </h3>
                            <button onClick={() => navigate('/')} className="text-[9px] md:text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline">VIEW ALL</button>
                        </div>

                        <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide -mx-2 px-2">
                            {todaySlots.length === 0 ? (
                                <div className="flex flex-col items-start gap-2 py-4 px-4 bg-gray-50 rounded-3xl border border-dashed border-gray-200 w-full animate-pulse">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                                        {loading ? 'Initializing Connection...' : 'Status Report: 0 Segments Loaded'}
                                    </p>
                                    <p className="text-xs font-bold text-gray-500 uppercase italic">
                                        {loading ? 'Fetching live telemetry from The Turf...' : 'Initialization pending. No active slots for the selected segment.'}
                                    </p>
                                </div>
                            ) : (
                                todaySlots
                                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                                    .map((slot) => {
                                        const isFree = slot.status === 'free';
                                        return (
                                            <div
                                                key={slot._id}
                                                onClick={() => isFree && navigate(`/book/${slot._id}`)}
                                                className={`flex-shrink-0 w-32 md:w-40 p-5 md:p-6 rounded-[2rem] border-2 transition-all group ${
                                                    isFree 
                                                        ? 'border-emerald-100 bg-white cursor-pointer hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-100 active:scale-95' 
                                                        : 'border-red-50 bg-red-50/30 cursor-not-allowed opacity-60'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <Zap size={14} className={isFree ? "text-emerald-500" : "text-red-300"} />
                                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${
                                                        isFree ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-100'
                                                    }`}>
                                                        {isFree ? 'FREE' : 'BOOKED'}
                                                    </span>
                                                </div>
                                                <p className="text-sm md:text-base font-black text-gray-900 mb-1">{formatTime12h(slot.startTime)}</p>
                                                <p className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-colors ${
                                                    isFree ? 'text-emerald-500 group-hover:text-emerald-600' : 'text-red-400'
                                                }`}>
                                                    {isFree ? 'BOOK NOW' : 'ALREADY BOOKED'}
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
                                    <Database size={32} />
                                </div>
                                <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-2 uppercase">No Active Registries</h3>
                                <p className="text-sm text-gray-400 font-bold mb-8 uppercase tracking-tighter max-w-xs mx-auto">Your booked slots and match identifiers will appear here after confirmation.</p>
                                <button onClick={() => navigate('/')} className="w-full md:w-auto bg-emerald-600 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 flex items-center justify-center gap-3 mx-auto group">
                                    <Calendar size={18} className="group-hover:rotate-12 transition-transform" />
                                    Reserve Your First Slot
                                </button>
                            </div>
                        ) : (
                            <div className="grid gap-6">
                                {bookings.map((booking) => {
                                    const status = getStatusInfo(booking.bookingStatus);
                                    return (
                                        <div key={booking._id} className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-gray-100 shadow-xl shadow-emerald-900/[0.04] flex flex-col items-center group hover:border-emerald-200 transition-all gap-8">
                                            {/* Date Circle */}
                                            <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-white shadow-lg flex flex-col items-center justify-center -mt-[5rem] bg-white group-hover:bg-emerald-600 group-hover:text-white transition-all transform group-hover:scale-110">
                                                <p className="text-[10px] font-black uppercase leading-none mb-1">
                                                    {booking.slot?.date ? new Date(booking.slot.date).toLocaleDateString('en-US', { month: 'short' }) : (booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-US', { month: 'short' }) : 'N/A')}
                                                </p>
                                                <p className="text-2xl font-black leading-none uppercase">
                                                    {booking.slot?.date ? new Date(booking.slot.date).getDate() : (booking.createdAt ? new Date(booking.createdAt).getDate() : '??')}
                                                </p>
                                            </div>

                                            <div className="w-full text-center space-y-6">
                                                <h4 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter uppercase">#{booking._id.slice(-6).toUpperCase()}</h4>
                                                
                                                <div className="flex justify-center">
                                                    <div className={`px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 border-2 ${status.bg} ${status.color} border-current shadow-lg shadow-emerald-900/5`}>
                                                        <CheckCircle2 size={14} className="stroke-[3]" />
                                                        {status.label}
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-center gap-4 py-4">
                                                    <div className="flex items-center gap-3 text-sm md:text-lg font-black text-gray-900 uppercase tracking-tight">
                                                        <Clock size={20} className="text-emerald-500 stroke-[3]" />
                                                        {booking.slot ? `${formatTime12h(booking.slot.startTime)} – ${formatTime12h(booking.slot.endTime)}` : 'No Time Assigned'}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-[0.1em]">
                                                        <MapPin size={14} className="text-emerald-500" />
                                                        {booking.turfLocation}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Financial & Action Bar */}
                                            <div className="w-full border-t border-gray-100 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
                                                <div className="flex flex-col items-center md:items-start">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Fee Registry</p>
                                                    <div className="flex items-center gap-3">
                                                        <p className="text-2xl font-black text-gray-900 tracking-tighter">₹{booking.totalAmount?.toLocaleString() || booking.amount?.toLocaleString()}</p>
                                                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${booking.paymentStatus === 'verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                                            {booking.paymentStatus === 'verified' ? 'PAYMENT VERIFIED' : (booking.paymentStatus || 'SUBMITTED')}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="w-full md:w-auto">
                                                    {booking.bookingStatus === 'confirmed' && (
                                                        <button 
                                                            onClick={() => handleCreateMatchClick(booking)}
                                                            className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-[0.2em] px-10 py-5 rounded-[1.8rem] shadow-xl shadow-emerald-200 transition-all flex items-center justify-center gap-3 active:scale-95">
                                                            🏏 Create Match
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {(booking.matches || []).length > 0 && (
                                                <div className="w-full border-t border-gray-100 pt-8 mt-4">
                                                    <div className="flex items-center gap-2 mb-6">
                                                        <Activity size={16} className="text-emerald-500" />
                                                        <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Live Arena Instances</h5>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {(booking.matches || []).map((m, mi) => (
                                                            <div key={mi} className={`relative overflow-hidden rounded-[2.5rem] p-6 border transition-all duration-500 ${
                                                                m.status === 'Completed' ? 'bg-gradient-to-br from-[#064E3B] to-[#022C22] border-emerald-400/30' : 'bg-gray-950 border-gray-800'
                                                            }`}>
                                                                <div className="flex justify-between items-center mb-4">
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
                                                </div>
                                            )}

                                            <div className="w-full pt-4 border-t border-gray-100 flex flex-row items-center justify-between gap-3 shrink-0">
                                                <div className="text-left">
                                                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest leading-none mb-1">Status Report</p>
                                                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${status.color}`}>
                                                        {status.label}
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
                                    );
                                })}
                            </div>
                        )}
                    </div>
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
