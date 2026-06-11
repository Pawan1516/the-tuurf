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
    Globe,
    Bot
} from 'lucide-react';

const AdminSidebar = ({ user, logout, turfName = "The Turf", mobileOpen = false, onClose = () => {} }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
    { to: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
        { to: '/admin/operations', label: 'Operations HUB', icon: Zap },
        { to: '/admin/slots', label: 'Slot Control', icon: Calendar },
        { to: '/admin/booked-slots', label: 'Booked Slots', icon: Box },
        { to: '/admin/bookings', label: 'Booking Log', icon: Activity },
        { to: '/admin/tournaments', label: 'Tournaments', icon: Trophy },
        { to: '/admin/workers', label: 'Workers Team', icon: Briefcase },
        { to: '/admin/users', label: 'User Control', icon: Users },
        { to: '/admin/report', label: 'Intelligence', icon: FileText },
        { to: '/admin/strategy', label: 'Strategy HUB', icon: Zap },
        { to: '/admin/settings', label: 'Settings', icon: Settings },
        { to: '/admin/scanner', label: 'QR Scanner', icon: Zap },
        { to: '/admin/booking-dashboard', label: 'Booking Analytics', icon: Activity },
        { to: '/ai-hub', label: 'AI HUB', icon: Bot },
    ];

    const mobileNavItems = menuItems.filter(item => [
      '/admin/dashboard',
      '/admin/operations',
      '/admin/bookings',
      '/admin/workers',
      '/admin/settings'
    ].includes(item.to));

    const handleLogout = () => {
        logout();
        navigate('/admin/login');
    };

    return (
        <>
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-72 bg-white/70 backdrop-blur-2xl border-r border-white/5 flex-col sticky top-0 h-screen z-50 animate-in fade-in slide-in-from-left duration-700">
            {/* Logo Section - Hub Protocol */}
            <div className="p-6 border-b border-white/5/50 flex items-center gap-4">
                <div className="bg-white p-3 rounded-[1.5rem] shadow-2xl relative group">
                    <img 
                        src="/logo.png" 
                        alt="Logo" 
                        className="h-10 w-auto object-contain brightness-100 group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                </div>
                <div>
                    <h1 className="text-xl font-black text-black tracking-tighter leading-none uppercase">{turfName}</h1>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mt-1 shrink-0">Admin Terminal</p>
                </div>
            </div>

            {/* Navigation Section - Operational Flow */}
            <div className="flex-1 p-6 space-y-1.5 overflow-y-auto no-scrollbar">
                {/* Admin Profile Mini-Card - High Visibility */}
                <div className="p-6 bg-white rounded-2xl border border-white/5 mb-6 shadow-sm relative overflow-hidden group hover:scale-[1.01] transition-transform duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full"></div>
                    <p className="text-[10px] font-black text-black/20 uppercase tracking-[0.3em] mb-2 relative z-10">Command Access</p>
                        <h3 className="text-lg font-black text-black uppercase truncate relative z-10 tracking-tighter leading-none">{user?.name || 'God Mode'}</h3>
                    <div className="flex items-center gap-2 mt-3 relative z-10">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                        <p className="text-[9px] font-bold text-black/40 uppercase tracking-widest">Protocol Active</p>
                    </div>
                </div>

                {menuItems.map((item) => {
                    const isActive = location.pathname === item.to;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.to}
                            to={item.to}
                            className={`w-full flex items-center justify-between px-6 py-3 rounded-lg transition-all group ${
                                isActive
                                ? 'bg-emerald-600 text-black shadow-[0_20px_40px_-5px_rgba(16,185,129,0.3)]'
                                : 'text-zinc-400 hover:bg-white hover:text-black'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <Icon size={20} className={isActive ? 'text-black' : 'text-zinc-300 group-hover:text-emerald-500 transition-colors'} />
                                <span className="text-sm font-bold uppercase tracking-wide">{item.label}</span>
                            </div>
                            {isActive && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                        </Link>
                    );
                })}
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-gray-50 bg-white/50">
                <button 
                    onClick={handleLogout} 
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-red-600 text-white hover:opacity-95 transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <LogOut size={18} className="text-emerald-400" />
                        <span className="text-sm font-black uppercase tracking-widest">Logout</span>
                    </div>
                    <ChevronRight size={14} className="opacity-30 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
            </aside>

            {/* Mobile Drawer */}
            <div className={`lg:hidden fixed inset-0 z-[60] ${mobileOpen ? 'block' : 'hidden'}`} role="dialog" aria-modal="true">
                <div className="absolute inset-0 bg-black/40" onClick={onClose} />
                <div className={`absolute left-0 top-0 bottom-0 w-full sm:w-80 bg-white/98 backdrop-blur-lg border-r border-white/5 shadow-xl transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform`} aria-label="Admin menu"> 
                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img src="/logo.png" alt="Logo" className="h-8" />
                            <div>
                                <h1 className="text-lg font-black">{turfName}</h1>
                                <p className="text-xs text-slate-400">Admin Terminal</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-lg bg-slate-100"><ChevronRight size={18} /></button>
                    </div>
                    <div className="p-4 overflow-y-auto h-full">
                        <div className="mb-4 p-4 bg-white rounded-xl border shadow-sm">
                            <p className="text-[10px] font-black text-black/20 uppercase tracking-[0.3em] mb-2">Command Access</p>
                            <h3 className="font-black text-sm">{user?.name || 'God Mode'}</h3>
                        </div>
                        {menuItems.map((item) => {
                            const isActive = location.pathname === item.to;
                            const Icon = item.icon;
                            return (
                                <Link key={item.to} to={item.to} onClick={onClose} className={`w-full flex items-center justify-between px-4 py-4 rounded-lg mb-2 transition-all ${isActive ? 'bg-emerald-600 text-black' : 'text-zinc-600 hover:bg-slate-50'}`}>
                                    <div className="flex items-center gap-3">
                                        <Icon size={20} />
                                        <span className="text-base font-black uppercase tracking-wide">{item.label}</span>
                                    </div>
                                    {isActive && <div className="w-2 h-2 bg-white rounded-full" />}
                                </Link>
                            );
                        })}
                    </div>
                    <div className="p-4 border-t">
                        <button onClick={() => { onClose(); handleLogout(); }} className="w-full p-3 rounded-lg bg-red-600 text-white font-black">Logout</button>
                    </div>
                </div>
            </div>

            {/* Mobile bottom tab bar */}
            <nav className="lg:hidden fixed inset-x-0 bottom-0 z-[60] bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-xl px-4 py-3">
                <div className="mx-auto flex max-w-5xl items-center justify-between gap-2">
                    {mobileNavItems.map((item) => {
                        const isActive = location.pathname === item.to;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                onClick={onClose}
                                className={`group flex-1 rounded-3xl px-3 py-3 text-center transition-all ${isActive ? 'bg-emerald-600 text-black shadow-[0_12px_35px_-16px_rgba(16,185,129,0.9)]' : 'bg-white/10 text-slate-200 hover:bg-white/15'}`}
                            >
                                <Icon size={20} className="mx-auto mb-1" />
                                <span className="block text-[9px] font-black uppercase tracking-[0.3em] leading-none">{item.label.replace('Admin ', '').replace(' HUB', '')}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
            </>
    );
};

export default AdminSidebar;



