import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard, Calendar, Activity, Briefcase, PieChart, LogOut, ChevronRight, Database, CheckCircle, Clock } from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import { bookingsAPI, adminAPI } from '../../api/client';
import MobileNav from '../../components/MobileNav';

const AdminBookedSlots = () => {
    const navigate = useNavigate();
    const { user, logout } = useContext(AuthContext);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [settings, setSettings] = useState({ TURF_NAME: 'The Turf' });

    const navItems = [
        { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/admin/slots', label: 'Slot Control', icon: Calendar },
        { to: '/admin/booked-slots', label: 'Booked Slots', icon: CheckCircle },
        { to: '/admin/bookings', label: 'Booking Log', icon: Activity },
        { to: '/admin/workers', label: 'Workers', icon: Briefcase },
        { to: '/admin/report', label: 'Report', icon: PieChart },
    ];

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                setLoading(true);
                const response = await bookingsAPI.getAll({ status: 'confirmed' });
                const confirmed = response.data.bookings || [];

                const holdResponse = await bookingsAPI.getAll({ status: 'hold' });
                const hold = holdResponse.data.bookings || [];

                const booked = [...confirmed, ...hold];

                booked.sort((a, b) => {
                    const dateA = new Date(a.slot?.date || a.createdAt);
                    const dateB = new Date(b.slot?.date || b.createdAt);
                    return dateB - dateA;
                });

                setBookings(booked);
            } catch (error) {
                console.error('Error fetching booked slots:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchBookings();
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data } = await adminAPI.getSettings();
            if (data.success) {
                setSettings(prev => ({ ...prev, ...data.settings }));
            }
        } catch (err) {
            console.error('Settings fetch error:', err);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/admin/login');
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

            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex w-80 bg-white border-r border-gray-100 flex-col sticky top-0 h-screen z-50">
                <div className="p-8 border-b border-gray-50 flex items-center gap-4">
                    <div className="bg-emerald-600 text-white p-2.5 rounded-2xl shadow-lg shadow-emerald-200">
                        <Database size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none uppercase">{settings.TURF_NAME}</h1>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Admin OS v2.0</p>
                    </div>
                </div>

                <nav className="flex-1 p-6 space-y-2">
                    {navItems.map(item => (
                        <NavItem key={item.to} to={item.to} label={item.label} icon={item.icon} active={window.location.pathname === item.to} />
                    ))}
                </nav>

                <div className="p-6 border-t border-gray-50">
                    <button onClick={handleLogout} className="w-full flex items-center justify-between p-5 rounded-2xl bg-gray-900 text-white hover:bg-black transition-all group">
                        <div className="flex items-center gap-3">
                            <LogOut size={18} className="text-emerald-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Log Out</span>
                        </div>
                        <ChevronRight size={14} className="opacity-30 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </aside>


            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <header className="bg-white/80 backdrop-blur-md px-6 md:px-10 h-20 md:h-24 flex items-center justify-between sticky top-0 z-40 border-b border-gray-100">
                    <div className="flex flex-col">
                        <h2 className="text-lg md:text-2xl font-black text-gray-900 tracking-tighter uppercase leading-none">Booked Slots</h2>
                        <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Confirmed & On Hold Calendar</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setFilterDate(new Date().toISOString().split('T')[0])}
                            className={`hidden md:block px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterDate === new Date().toISOString().split('T')[0] ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'}`}
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
                    ) : bookings.length === 0 ? (
                        <div className="py-20 text-center text-gray-400 font-bold uppercase tracking-widest">No booked slots found.</div>
                    ) : (
                        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {bookings.filter(b => b.slot?.date ? new Date(b.slot.date).toISOString().split('T')[0] === filterDate : false).length === 0 ? (
                                <div className="col-span-full py-20 text-center text-gray-400 font-bold uppercase tracking-widest">No booked slots found for {filterDate}.</div>
                            ) : bookings.filter(b => b.slot?.date ? new Date(b.slot.date).toISOString().split('T')[0] === filterDate : false).map(b => (
                                <div
                                    key={b._id}
                                    onClick={() => navigate(`/admin/bookings/${b._id}`)}
                                    className="bg-emerald-900/5 p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-emerald-900/5 hover:scale-[1.02] transition-transform cursor-pointer group/card"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${b.bookingStatus === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {b.bookingStatus === 'confirmed' ? <CheckCircle size={10} /> : <Clock size={10} />} {b.bookingStatus}
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${b.paymentType === 'full' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}`}>
                                                {b.paymentType === 'full' ? 'Full' : 'Advance'}
                                            </div>
                                            <div className="bg-white text-emerald-600 px-3 py-1 rounded-lg text-[10px] font-black shadow-sm">
                                                ₹{b.amount}{b.paymentType === 'advance' ? ` / ₹${b.totalAmount}` : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <h4 className="text-xl font-black text-gray-900 capitalize tracking-tight mb-1">{b.userName}</h4>
                                    <p className="text-gray-400 text-xs font-bold tracking-widest">+91 {b.userPhone}</p>

                                    <div className="mt-6 p-4 bg-white rounded-2xl flex items-center gap-4 border border-emerald-100 shadow-sm">
                                        <div className="bg-emerald-50 p-3 rounded-xl shadow-sm text-emerald-600">
                                            <Calendar size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-0.5">Time Slot</p>
                                            <p className="text-sm font-black text-gray-900">
                                                {b.slot?.date ? new Date(b.slot.date).toLocaleDateString('en-GB') : 'N/A'} at {b.slot?.startTime}
                                            </p>
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
