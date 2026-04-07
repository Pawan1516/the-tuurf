import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, User, LogOut, Home, Menu, X, Activity, ScanLine, Briefcase, Settings, Bell, Trophy, Shield, Users, BarChart } from 'lucide-react';
import { requestNotificationPermission } from '../utils/notifications';
import { toast } from 'react-toastify';

// ─── Bottom Tab Bar & Full Mobile Drawer ────────────
const MobileNav = ({ user, logout, navItems, dashboardTitle = "The Turf", className = "" }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const isWorker = location.pathname.includes('/worker');
    const isAdmin = location.pathname.includes('/admin');
    const isPublic = !isWorker && !isAdmin;
    const portalType = isAdmin ? 'Admin Portal' : isWorker ? 'Worker Portal' : user ? 'Player Portal' : 'Public Arena';

    const defaultTabs = user ? [
        { to: '/dashboard', label: 'Home', icon: Home },
        { to: '/player-analytics', label: 'Intel', icon: BarChart },
        { to: '/', label: 'Book', icon: Calendar },
        { to: '/dashboard?tab=profile', label: 'Profile', icon: User },
    ] : [
        { to: '/', label: 'Arena', icon: Home },
        { to: '/leaderboard', label: 'Ranks', icon: Trophy },
        { to: '/login', label: 'Login', icon: User },
    ];

    const adminTabs = [
        { to: '/admin/dashboard', label: 'Dash', icon: LayoutDashboard },
        { to: '/admin/operations', label: 'Ops', icon: Activity },
        { to: '/admin/scanner', label: 'Scan', icon: ScanLine },
        { to: '/admin/bookings', label: 'Logs', icon: Calendar },
    ];

    const workerTabs = [
        { to: '/worker/dashboard', label: 'Dash', icon: LayoutDashboard },
        { to: '/worker/assigned-slots', label: 'Tasks', icon: Briefcase },
        { to: '/worker/report', label: 'Report', icon: Activity },
    ];

    let displayTabs = defaultTabs;
    let allLinksToDisplay = defaultTabs;
    
    if (isAdmin) {
        displayTabs = adminTabs;
        allLinksToDisplay = [
            { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { to: '/admin/operations', label: 'Live Operations', icon: Activity },
            { to: '/admin/scanner', label: 'QR Scanner', icon: ScanLine },
            { to: '/admin/bookings', label: 'Bookings & Logs', icon: Calendar },
            { to: '/admin/slots', label: 'Slot Manager', icon: Calendar },
            { to: '/admin/users', label: 'User Directory', icon: Users },
            { to: '/admin/workers', label: 'Staff Management', icon: Briefcase },
            { to: '/admin/strategy', label: 'Strategy Hub', icon: Trophy },
            { to: '/admin/report', label: 'Reports & Analytics', icon: BarChart },
            { to: '/admin/settings', label: 'Terminal Settings', icon: Settings },
        ];
    } else if (isWorker) {
        displayTabs = workerTabs;
        allLinksToDisplay = workerTabs;
    }
    
    // Close menu when route changes
    React.useEffect(() => {
        setIsMenuOpen(false);
    }, [location.pathname]);
    return (
        <div className={`contents ${className}`}>
            {/* ── Top Header (Universal) ── */}
            <header className="bg-white/80 backdrop-blur-xl px-5 h-16 flex items-center justify-between sticky top-0 z-[60] border-b border-gray-100/50 md:hidden">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <img 
                            src="/logo.png" 
                            alt="The Turf Mobile" 
                            className="h-10 w-auto object-contain bg-white rounded-xl border border-emerald-500/10 shadow-sm"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://cdn-icons-png.flaticon.com/512/3233/3233513.png';
                            }}
                        />
                        {user && <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>}
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-sm font-black text-slate-900 tracking-tight leading-none uppercase truncate">{dashboardTitle}</h1>
                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none mt-1 opacity-70">{portalType}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {user ? (
                         <div className="flex items-center gap-3">
                             <button
                                onClick={async () => {
                                    const success = await requestNotificationPermission(user?.id);
                                    if (success) toast.success('Alerts Active');
                                }}
                                className={`p-2.5 rounded-xl transition-all ${
                                    window.Notification?.permission === 'granted' 
                                    ? 'bg-emerald-50/50 text-emerald-600' 
                                    : 'bg-yellow-50/50 text-yellow-600'
                                }`}
                            >
                                <Bell size={18} />
                            </button>
                            <button
                                onClick={() => setIsMenuOpen(true)}
                                className="bg-slate-900 text-white p-2.5 rounded-xl shadow-lg active:scale-95 transition-all outline-none"
                            >
                                <Menu size={18} />
                            </button>
                         </div>
                    ) : (
                        <Link
                            to="/login"
                            className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                        >
                            Login
                        </Link>
                    )}
                </div>
            </header>

            {/* ── Bottom Tab Bar (Universal) ── */}
            <nav className="fixed bottom-0 left-0 right-0 z-[60] pb-safe md:hidden px-4 mb-4">
                <div className="bg-white/90 backdrop-blur-2xl border border-gray-100/50 rounded-[2.5rem] shadow-[0_8px_32px_rgba(0,0,0,0.12)] flex items-stretch justify-center h-20 px-4 max-w-lg mx-auto">
                    {displayTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = location.pathname === tab.to || 
                            (tab.to?.includes('?tab=profile') && location.search.includes('tab=profile'));
                        return (
                            <Link
                                key={tab.to}
                                to={tab.to}
                                className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all relative ${
                                    isActive ? 'text-emerald-600' : 'text-slate-400 opacity-60'
                                }`}
                            >
                                <div className={`p-2 rounded-2xl transition-all duration-300 ${isActive ? 'bg-emerald-50 scale-110' : 'hover:bg-slate-50'}`}>
                                    <Icon size={20} className={isActive ? 'text-emerald-600' : 'text-slate-400'} strokeWidth={isActive ? 2.5 : 2} />
                                </div>
                                <span className={`text-[8px] font-black uppercase tracking-[0.1em] transition-all ${isActive ? 'opacity-100' : 'opacity-0 scale-90 translate-y-1'}`}>
                                    {tab.label}
                                </span>
                                {isActive && <div className="absolute -bottom-1 w-1 h-1 bg-emerald-500 rounded-full"></div>}
                            </Link>
                        );
                    })}
                </div>
            </nav>
            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;  /* IE and Edge */
                    scrollbar-width: none;  /* Firefox */
                }
            `}</style>

            {/* ── Full Screen Menu Overlay ── */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-[100] bg-white md:hidden overflow-y-auto animate-in slide-in-from-right-full duration-300">
                    <div className="px-5 h-16 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-xl border-b border-gray-100 z-10">
                         <div className="flex items-center gap-3">
                             <div className="relative">
                                 <img 
                                     src="/logo.png" 
                                     alt="The Turf Mobile" 
                                     className="h-10 w-auto object-contain bg-white rounded-xl border border-emerald-500/10 shadow-sm"
                                     onError={(e) => {
                                         e.target.onerror = null;
                                         e.target.src = 'https://cdn-icons-png.flaticon.com/512/3233/3233513.png';
                                     }}
                                 />
                             </div>
                             <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">All Modules</h2>
                         </div>
                         <button onClick={() => setIsMenuOpen(false)} className="p-2.5 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 active:scale-95 transition-all">
                             <X size={20} />
                         </button>
                    </div>
                    
                    <div className="px-5 py-8 pb-32 space-y-3">
                         {allLinksToDisplay.map((link, idx) => {
                             const Icon = link.icon;
                             const isActive = location.pathname === link.to;
                             return (
                                 <Link
                                     key={idx}
                                     to={link.to}
                                     className={`flex items-center gap-4 p-4 rounded-[1.5rem] font-bold uppercase text-xs tracking-widest transition-all ${
                                         isActive ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'bg-gray-50 text-slate-600 border border-gray-100 hover:bg-gray-100'
                                     }`}
                                 >
                                     <div className={`p-2.5 rounded-xl ${isActive ? 'bg-white/20' : 'bg-white shadow-sm'}`}>
                                         <Icon size={18} />
                                     </div>
                                     {link.label}
                                 </Link>
                             )
                         })}
                         
                         {user && (
                             <button
                                 onClick={handleLogout}
                                 className="w-full flex justify-between items-center p-5 mt-8 bg-rose-50 text-rose-600 rounded-[1.5rem] font-black uppercase text-xs tracking-widest border border-rose-100 transition-all active:scale-95"
                             >
                                 Secure Logout
                                 <LogOut size={18} />
                             </button>
                         )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MobileNav;
