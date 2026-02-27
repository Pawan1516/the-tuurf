import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Database, LogOut, ChevronRight } from 'lucide-react';

const MobileNav = ({ user, logout, navItems, dashboardTitle = "The Turf" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    const toggleMenu = () => setIsOpen(!isOpen);

    const handleLogout = () => {
        logout();
        setIsOpen(false);
    };

    return (
        <div className="md:hidden">
            {/* Top Bar */}
            <header className="bg-white/80 backdrop-blur-md px-6 h-20 flex items-center justify-between sticky top-0 z-[60] border-b border-gray-100 w-full">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-600 text-white p-2 rounded-xl shadow-lg shadow-emerald-200">
                        <Database size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none uppercase">{dashboardTitle}</h1>
                        <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mt-0.5">Mobile Access</p>
                    </div>
                </div>

                <button
                    onClick={toggleMenu}
                    className="p-3 bg-gray-50 text-gray-900 rounded-2xl hover:bg-emerald-50 transition-all border border-gray-100"
                >
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            {/* Overlay Menu */}
            {isOpen && (
                <div className="fixed inset-0 z-[55] bg-white pt-24 px-6 animate-in slide-in-from-top duration-300">
                    <div className="flex flex-col h-full pb-10">
                        <div className="p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100 mb-8 mt-4">
                            <p className="text-[10px] font-black text-emerald-800/40 uppercase tracking-widest mb-1">Authenticated As</p>
                            <h3 className="text-lg font-black text-emerald-900 uppercase truncate">{user?.name || 'User'}</h3>
                            <p className="text-[10px] font-bold text-emerald-600/60 truncate">{user?.email}</p>
                        </div>

                        <nav className="flex-1 space-y-3">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.to;
                                return (
                                    <Link
                                        key={item.to}
                                        to={item.to}
                                        onClick={() => setIsOpen(false)}
                                        className={`flex items-center gap-4 px-6 py-5 rounded-2xl transition-all ${isActive
                                                ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-200'
                                                : 'text-gray-400 bg-gray-50 border border-gray-100'
                                            }`}
                                    >
                                        <Icon size={22} className={isActive ? 'text-white' : 'text-gray-400'} />
                                        <span className="text-sm font-black uppercase tracking-widest">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="mt-auto">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-between p-6 rounded-[2rem] bg-gray-900 text-white hover:bg-black transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <LogOut size={20} className="text-emerald-400" />
                                    <span className="text-xs font-black uppercase tracking-widest">Sign Out</span>
                                </div>
                                <ChevronRight size={18} className="opacity-30" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MobileNav;
