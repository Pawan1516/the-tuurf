import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard, Calendar, CalendarCheck, LogOut, ChevronRight, User, Phone } from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import { slotsAPI, bookingsAPI } from '../../api/client';
import MobileNav from '../../components/MobileNav';

const WorkerAssignedSlots = () => {
    const navigate = useNavigate();
    const { user, logout } = useContext(AuthContext);
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterDate, setFilterDate] = useState(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()));
    const [settings, setSettings] = useState({ TURF_NAME: 'The Turf' });

    const navItems = [
        { to: '/worker/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/worker/assigned-slots', label: 'Assigned Work', icon: CalendarCheck },
        { to: '/worker/booked-slots', label: 'Booked Slots', icon: Calendar },
    ];

    useEffect(() => {
        const fetchSlots = async () => {
            try {
                setLoading(true);
                // Fetch all slots without date restriction (we will handle it here or let them see all)
                const [slotsRes, bookingsRes] = await Promise.all([
                    slotsAPI.getAll(),
                    bookingsAPI.getMySlots()
                ]);

                const allSlots = slotsRes.data || [];
                const allBookings = bookingsRes.data.bookings || [];

                // Filter slots securely to only those where this worker is assigned
                const mySlots = allSlots
                    .filter(s => s.assignedWorker?._id === user?.id)
                    .map(s => {
                        const booking = allBookings.find(b => b.slot?._id === s._id);
                        return { ...s, booking };
                    });

                // Sort by time
                mySlots.sort((a, b) => a.startTime.localeCompare(b.startTime));

                setSlots(mySlots);
            } catch (error) {
                console.error('Error fetching assigned slots:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSlots();
        fetchSettings();
    }, [user]);

    const fetchSettings = async () => {
        try {
            const { data } = await slotsAPI.getSettings();
            if (data.success) {
                setSettings(prev => ({ ...prev, ...data.settings }));
            }
        } catch (err) {
            console.error('Settings fetch error:', err);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/worker/login');
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

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row">
            <MobileNav user={user} logout={logout} navItems={navItems} dashboardTitle={settings.TURF_NAME} />

            {/* Sidebar (Desktop Only) */}
            <aside className="hidden md:flex w-80 bg-white border-r border-gray-100 flex-col sticky top-0 h-screen z-50">
                <div className="p-8 border-b border-gray-50 flex items-center gap-4">
                    <div className="bg-emerald-600 text-white p-2.5 rounded-2xl shadow-lg shadow-emerald-200">
                        <LayoutDashboard size={24} />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none uppercase">{settings.TURF_NAME}</h1>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Live Management</p>
                    </div>
                </div>

                <nav className="flex-1 p-6 space-y-2">
                    {navItems.map((item) => (
                        <NavItem key={item.to} to={item.to} label={item.label} icon={item.icon} active={window.location.pathname === item.to} />
                    ))}
                </nav>

                <div className="p-6 border-t border-gray-50">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex flex-col">
                            <span className="text-sm font-black text-gray-900 truncate w-36 uppercase">{user?.name || 'Assigned Worker'}</span>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Ground Operations</span>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-between p-5 rounded-2xl bg-gray-900 text-white hover:bg-black transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <LogOut size={18} className="text-emerald-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Logout</span>
                        </div>
                        <ChevronRight size={14} className="opacity-30 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto relative">
                <header className="bg-white/80 backdrop-blur-md px-6 md:px-10 h-20 md:h-24 flex items-center justify-between sticky top-0 z-40 border-b border-gray-100">
                    <div className="flex flex-col">
                        <h2 className="text-lg md:text-2xl font-black text-gray-900 tracking-tighter uppercase leading-none">Assigned Work</h2>
                        <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Slots Assigned By Admin</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setFilterDate(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()))}
                            className={`hidden md:block px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterDate === new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'}`}
                        >
                            Today
                        </button>
                        <div className="relative">
                            <input
                                type="date"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                                className="bg-white border-2 border-transparent focus:border-emerald-500 p-2 md:p-3 rounded-xl outline-none transition-all font-bold text-xs md:text-sm text-gray-700 shadow-sm outline outline-1 outline-gray-200"
                            />
                        </div>
                    </div>
                </header>

                <div className="p-4 md:p-10">
                    {loading ? (
                        <div className="py-20 flex justify-center">
                            <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                        </div>
                    ) : slots.filter(s => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(s.date)) === filterDate).length === 0 ? (
                        <div className="py-20 text-center text-gray-400 font-bold uppercase tracking-widest">No slots assigned to you for {filterDate}.</div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {slots.filter(s => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(s.date)) === filterDate).map(s => (
                                <div key={s._id}
                                    onClick={() => s.booking && navigate(`/worker/booking/${s.booking._id}`)}
                                    className={`bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-emerald-900/5 transition-transform flex flex-col justify-between ${s.booking ? 'cursor-pointer hover:scale-[1.02]' : ''}`}>
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${s.status === 'booked' ? 'bg-emerald-100 text-emerald-700' :
                                                s.status === 'hold' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                {s.status}
                                            </div>
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                ID: {s._id.slice(-4)}
                                            </div>
                                        </div>

                                        <div className="py-4 space-y-4">
                                            <h4 className="text-3xl font-black text-gray-900 tracking-tighter tabular-nums gap-1 flex items-baseline">
                                                {s.startTime}
                                            </h4>
                                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                                                Date: {new Date(s.date).toLocaleDateString('en-GB')}
                                            </p>
                                        </div>
                                    </div>

                                    {s.booking && (
                                        <div className="mt-2 mb-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                                            <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs mb-2 truncate">
                                                <User size={14} className="text-emerald-600 shrink-0" />
                                                <span className="truncate">{s.booking.userName}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-emerald-700/70 font-bold text-[10px]">
                                                <Phone size={12} className="shrink-0" />
                                                <span>{s.booking.userPhone}</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-auto pt-4 border-t border-gray-100 border-dashed">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg"><CalendarCheck size={16} /></div>
                                                <p className="font-black text-[10px] text-emerald-600 uppercase tracking-widest">Assigned to you</p>
                                            </div>
                                            {s.booking && (
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ChevronRight size={18} className="text-emerald-600" />
                                                </div>
                                            )}
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

export default WorkerAssignedSlots;
