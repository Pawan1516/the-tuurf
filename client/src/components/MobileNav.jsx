import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, User, LogOut, Home } from 'lucide-react';

// ─── Bottom Tab Bar (mobile primary nav — like WhatsApp/Instagram) ────────────
const MobileNav = ({ user, logout, navItems, dashboardTitle = "The Turf" }) => {
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const tabs = [
        { to: '/dashboard', label: 'Home', icon: Home },
        { to: '/', label: 'Book', icon: Calendar },
        { to: '/dashboard?tab=profile', label: 'Profile', icon: User },
    ];

    return (
        <>
            {/* ── Top Header (Mobile) ── */}
            <header className="md:hidden bg-white/95 backdrop-blur-md px-5 h-16 flex items-center justify-between sticky top-0 z-[60] border-b border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-600 text-white p-2 rounded-xl shadow-md shadow-emerald-200">
                        <LayoutDashboard size={18} />
                    </div>
                    <div>
                        <h1 className="text-base font-black text-gray-900 tracking-tight leading-none uppercase">{dashboardTitle}</h1>
                        <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest leading-none mt-0.5">Player Portal</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 px-3.5 py-2 rounded-xl transition-all"
                >
                    <LogOut size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Out</span>
                </button>
            </header>

            {/* ── Bottom Tab Bar (Mobile) — Fixed at bottom like native app ── */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pb-safe">
                <div className="flex items-stretch h-16">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = location.pathname === tab.to || 
                            (tab.to.includes('?tab=profile') && location.search.includes('tab=profile'));
                        return (
                            <Link
                                key={tab.to}
                                to={tab.to}
                                className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${
                                    isActive ? 'text-emerald-600' : 'text-gray-400'
                                }`}
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
        </>
    );
};

export default MobileNav;
