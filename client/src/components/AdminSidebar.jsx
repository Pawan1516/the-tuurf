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
    Shield,
    Globe
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
        { to: '/admin/strategy', label: 'Strategy HUB', icon: Zap },
        { to: '/admin/settings', label: 'Settings', icon: Settings },
        { to: '/admin/scanner', label: 'QR Scanner', icon: Zap },
    ];

    const handleLogout = () => {
        logout();
        navigate('/admin/login');
    };

    return (
        <aside className="hidden lg:flex w-96 bg-white/70 backdrop-blur-2xl border-r border-slate-100 flex-col sticky top-0 h-screen z-50 animate-in fade-in slide-in-from-left duration-700">
            {/* Logo Section - Hub Protocol */}
            <div className="p-10 border-b border-slate-100/50 flex items-center gap-5">
                <div className="bg-slate-900 p-3 rounded-[1.5rem] shadow-2xl relative group">
                    <img 
                        src="/logo.png" 
                        alt="Logo" 
                        className="h-10 w-auto object-contain brightness-100 group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tighter leading-none uppercase">{turfName}</h1>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mt-1 shrink-0">Admin Terminal</p>
                </div>
            </div>

            {/* Navigation Section - Operational Flow */}
            <div className="flex-1 p-8 space-y-1.5 overflow-y-auto no-scrollbar">
                {/* Admin Profile Mini-Card - High Visibility */}
                <div className="p-8 bg-slate-900 rounded-[2.5rem] border border-white/5 mb-8 shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full"></div>
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-2 relative z-10">Command Access</p>
                    <h3 className="text-xl font-black text-white uppercase truncate relative z-10 tracking-tighter leading-none">{user?.name || 'God Mode'}</h3>
                    <div className="flex items-center gap-2 mt-3 relative z-10">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                        <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Protocol Active</p>
                    </div>
                </div>

                {menuItems.map((item) => {
                    const isActive = location.pathname === item.to;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.to}
                            to={item.to}
                            className={`w-full flex items-center justify-between px-8 py-5 rounded-[2rem] transition-all group ${
                                isActive
                                ? 'bg-emerald-600 text-white shadow-[0_20px_40px_-5px_rgba(16,185,129,0.3)]'
                                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <Icon size={20} className={isActive ? 'text-white' : 'text-slate-300 group-hover:text-emerald-500 transition-colors'} />
                                <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
                            </div>
                            {isActive && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
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
