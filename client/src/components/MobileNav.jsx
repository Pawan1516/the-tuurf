import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, User, LogOut, Home, Menu, X, Activity, ScanLine, Briefcase, Settings, Bell } from 'lucide-react';
import { requestNotificationPermission } from '../utils/notifications';
import { toast } from 'react-toastify';

// ─── Bottom Tab Bar (mobile primary nav) ────────────
const MobileNav = ({ user, logout, navItems, dashboardTitle = "The Turf" }) => {
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const isWorker = location.pathname.includes('/worker');
    const isAdmin = location.pathname.includes('/admin');
    const portalType = isAdmin ? 'Admin Portal' : isWorker ? 'Worker Portal' : 'Player Portal';

    const defaultTabs = [
        { to: '/dashboard', label: 'Home', icon: Home },
        { to: '/', label: 'Book', icon: Calendar },
        { to: '/dashboard?tab=profile', label: 'Profile', icon: User },
    ];

    const adminTabs = [
        { to: '/admin/dashboard', label: 'Dash', icon: LayoutDashboard },
        { to: '/admin/operations', label: 'Ops', icon: Activity },
        { to: '/admin/scanner', label: 'Scan', icon: ScanLine },
        { to: '/admin/bookings', label: 'Logs', icon: Calendar },
        { to: '/admin/users', label: 'Users', icon: User },
        { to: '/admin/workers', label: 'Team', icon: Briefcase },
        { to: '/admin/report', label: 'Stats', icon: Activity },
        { to: '/admin/settings', label: 'Config', icon: Settings },
    ];

    const workerTabs = [
        { to: '/worker/dashboard', label: 'Dash', icon: LayoutDashboard },
        { to: '/worker/assigned-slots', label: 'Tasks', icon: Briefcase },
        { to: '/worker/report', label: 'Report', icon: Activity },
    ];

    let displayTabs = defaultTabs;
    if (isAdmin) displayTabs = adminTabs;
    if (isWorker) displayTabs = workerTabs;
    
    // For mobile, maybe we just use the simplified tabs to avoid horizontal scrolling overload
    // But if we override it completely, the dashboard desktop might use navItems or not. MobileNav is strictly mobile, so using simplified tabs is best.
    const finalTabs = displayTabs; // Ignore huge navItems list for bottom bar to make it clean


    return (
        <>
            {/* ── Top Header (Universal) ── */}
            <header className="bg-white/95 backdrop-blur-md px-5 h-16 flex items-center justify-between sticky top-0 z-[60] border-b border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-600 text-white p-2 rounded-xl shadow-md shadow-emerald-200">
                        <LayoutDashboard size={18} />
                    </div>
                    <div>
                        <h1 className="text-base font-black text-gray-900 tracking-tight leading-none uppercase">{dashboardTitle}</h1>
                        <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest leading-none mt-0.5">{portalType}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={async () => {
                            const success = await requestNotificationPermission(user?.id);
                            if (success) {
                                toast.success('Notifications Enabled Successfully!');
                            } else {
                                toast.info('Check browser settings to allow notifications');
                            }
                        }}
                        className={`p-2.5 rounded-xl transition-all ${
                            window.Notification?.permission === 'granted' 
                            ? 'bg-emerald-50 text-emerald-600' 
                            : 'bg-yellow-50 text-yellow-600'
                        }`}
                        title="Notification Settings"
                    >
                        <Bell size={20} className={window.Notification?.permission === 'granted' ? 'text-emerald-600' : 'text-yellow-600'} />
                    </button>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 px-3.5 py-2 rounded-xl transition-all"
                    >
                        <LogOut size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Out</span>
                    </button>
                </div>
            </header>

            {/* ── Bottom Tab Bar (Universal) — Fixed at bottom with horizontal scroll ── */}
            <nav className="fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pb-safe overflow-x-auto overflow-y-hidden no-scrollbar">
                <div className="flex items-stretch justify-center h-16 px-2 min-w-max mx-auto max-w-lg">
                    {displayTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = location.pathname === tab.to || 
                            (tab.to.includes('?tab=profile') && location.search.includes('tab=profile'));
                        return (
                            <Link
                                key={tab.to}
                                to={tab.to}
                                className={`flex flex-col items-center justify-center gap-1 transition-all px-4 ${
                                    isActive ? 'text-emerald-600' : 'text-gray-400'
                                }`}
                                style={{ minWidth: '64px' }}
                            >
                                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-emerald-50' : ''}`}>
                                    <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-wider ${isActive ? 'text-emerald-600' : 'text-gray-400'}`}>
                                    {tab.label}
                                </span>
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
        </>
    );
};

export default MobileNav;
