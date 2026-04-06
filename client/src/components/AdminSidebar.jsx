import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
    LayoutDashboard, 
    Calendar, 
    Activity, 
    Briefcase, 
    PieChart, 
    Database, 
    LogOut, 
    ChevronRight, 
    Users,
    Settings,
    Box,
    FileText,
    MessageSquare,
    Zap,
    Trophy,
    Shield
} from 'lucide-react';

const AdminSidebar = ({ user, logout, turfName = "The Turf" }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { to: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
        { to: '/admin/operations', label: 'Operations HUB', icon: Zap },
        { to: '/admin/slots', label: 'Slot Control', icon: Calendar },
        { to: '/admin/booked-slots', label: 'Booked Slots', icon: Box },
        { to: '/admin/bookings', label: 'Booking Log', icon: Activity },
        { to: '/admin/workers', label: 'Workers Team', icon: Briefcase },
        { to: '/admin/users', label: 'User Control', icon: Users },
        { to: '/admin/report', label: 'Intelligence', icon: FileText },
        { to: '/admin/settings', label: 'Settings', icon: Settings },
        { to: '/admin/scanner', label: 'QR Scanner', icon: Zap },
    ];

    const handleLogout = () => {
        logout();
        navigate('/admin/login');
    };

    return (
        <aside className="hidden lg:flex w-80 bg-white border-r border-gray-100 flex-col sticky top-0 h-screen z-50">
            {/* Logo Section */}
            <div className="p-8 border-b border-gray-50 flex items-center gap-4">
                <img 
                    src="/logo.png" 
                    alt="The Turf Admin" 
                    className="h-14 w-auto object-contain p-1.5 bg-white rounded-2xl shadow-xl shadow-emerald-900/10 border border-emerald-500/10"
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://cdn-icons-png.flaticon.com/512/3233/3233513.png';
                    }}
                />
                <div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none uppercase">{turfName}</h1>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Admin Protocol</p>
                </div>
            </div>

            {/* Navigation Section */}
            <div className="flex-1 p-6 space-y-1.5 overflow-y-auto custom-scrollbar">
                {/* Admin Profile Mini-Card */}
                <div className="p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100 mb-6 group hover:bg-emerald-600 transition-all duration-500">
                    <p className="text-[10px] font-black text-emerald-800/40 uppercase tracking-widest mb-1 group-hover:text-white/40">Authenticated Role</p>
                    <h3 className="text-sm font-black text-emerald-900 uppercase truncate group-hover:text-white">{user?.name || 'Administrator'}</h3>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full group-hover:bg-white animate-pulse"></span>
                        <p className="text-[9px] font-bold text-emerald-600/60 uppercase group-hover:text-white/60">System Online</p>
                    </div>
                </div>

                {menuItems.map((item) => {
                    const isActive = location.pathname === item.to;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.to}
                            to={item.to}
                            className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all group ${
                                isActive
                                ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-200'
                                : 'text-gray-400 hover:bg-emerald-50 hover:text-emerald-700'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <Icon size={18} className={isActive ? 'text-white' : 'group-hover:text-emerald-600'} />
                                <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
                            </div>
                            {isActive && <ChevronRight size={14} className="opacity-40" />}
                        </Link>
                    );
                })}
            </div>

            {/* Bottom Actions */}
            <div className="p-6 border-t border-gray-50 bg-gray-50/50">
                <button 
                    onClick={handleLogout} 
                    className="w-full flex items-center justify-between p-5 rounded-2xl bg-gray-900 text-white hover:bg-black transition-all group shadow-xl shadow-black/10"
                >
                    <div className="flex items-center gap-3">
                        <LogOut size={18} className="text-emerald-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Terminate Session</span>
                    </div>
                    <ChevronRight size={14} className="opacity-30 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </aside>
    );
};

export default AdminSidebar;
