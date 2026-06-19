import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Activity, Calendar, Trophy, User, Plus, X, Zap, BarChart2, LogOut } from 'lucide-react';

const TABS = [
  { id: 'home',     label: 'Home',     icon: Home,     to: '/' },
  { id: 'live',     label: 'Live',     icon: Activity, to: '/dashboard' },
  { id: 'book',     label: 'Book',     icon: Calendar, to: '/#slots', special: true },
  { id: 'matches',  label: 'Matches',  icon: Trophy,   to: '/tournaments' },
  { id: 'profile',  label: 'Profile',  icon: User,     to: '/profile' },
  { id: 'logout',   label: 'Logout',   icon: LogOut,   to: '#', special: true }
];

const MobileNav = ({ user, logout, navItems }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  // Hide on match and admin pages
  const hidden = ['/match', '/admin', !navItems && '/worker', '/live'].filter(Boolean).some(p =>
    location.pathname.startsWith(p)
  );
  if (hidden) return null;

  const activeId = (() => {
    const p = location.pathname;
    if (navItems) {
      const activeItem = navItems.find(item => p.startsWith(item.to));
      return activeItem ? activeItem.label : '';
    }
    if (p === '/' || p === '/home') return 'home';
    if (p.startsWith('/dashboard') || p.startsWith('/match')) return 'live';
    if (p.startsWith('/tournaments') || p.startsWith('/leaderboard')) return 'matches';
    if (p.startsWith('/player') || p.startsWith('/profile')) return 'profile';
    return 'home';
  })();

  return (
    <>
      {/* Overlay */}
      {showMenu && (
        <div
          className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setShowMenu(false)}
        />
      )}

      {/* Quick action radial menu */}
      {showMenu && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[90] md:hidden animate-scale-in">
          <div className="flex flex-col items-center gap-3">
            {[
              { icon: Zap, label: 'Start Match', to: '/dashboard', color: 'bg-emerald-500' },
              { icon: Calendar, label: 'Book Turf', to: '/#slots', color: 'bg-blue-500' },
              { icon: BarChart2, label: 'AI Hub', to: '/ai-hub', color: 'bg-purple-500' },
              { icon: Trophy, label: 'Tournaments', to: '/tournaments', color: 'bg-amber-500' },
            ].map((item, i) => (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setShowMenu(false)}
                className={`flex items-center gap-3 ${item.color} text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl active:scale-95 transition-all`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <div className="fixed bottom-0 inset-x-0 z-[70] md:hidden pb-safe">
        <div className="mx-3 mb-3 bg-white/95 backdrop-blur-xl rounded-[2rem] border border-black/8 shadow-2xl shadow-black/20 px-2 py-2 flex items-center justify-between">
          {(navItems || TABS).map(tab => {
            const isActive = navItems ? location.pathname === tab.to : activeId === tab.id;
            const isSpecial = tab.special;

            if (isSpecial) {
              // Logout tab: show its own icon and label
              if (tab.id === 'logout') {
                return (
                  <button
                    key={tab.id}
                    onClick={() => logout()}
                    className="relative flex flex-col items-center justify-center flex-1 py-2 gap-1 transition-all"
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all">
                      <LogOut size={18} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-rose-400">Logout</span>
                  </button>
                );
              }
              // Book tab: show the radial menu toggle
              return (
                <button
                  key={tab.id || tab.to}
                  onClick={() => setShowMenu(p => !p)}
                  className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-all ${showMenu ? 'scale-95' : 'scale-100'}`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-xl ${showMenu ? 'bg-rose-500 rotate-45 shadow-rose-500/30' : 'bg-emerald-500 shadow-emerald-500/30'}`}>
                    {showMenu ? <X size={20} className="text-white" /> : <Plus size={22} className="text-white" />}
                  </div>
                </button>
              );
            }

            // Profile tab special handling
            if (tab.id === 'profile') {
              const profileDest = user
                ? (user.role === 'admin' ? '/admin/dashboard' : user.role === 'worker' ? '/worker/dashboard' : '/dashboard')
                : '/login';
              const profileActive = user
                ? (user.role === 'admin' ? location.pathname.startsWith('/admin') : user.role === 'worker' ? location.pathname.startsWith('/worker') : location.pathname === '/dashboard')
                : false;
              return (
                <Link
                  key={tab.id}
                  to={profileDest}
                  className="flex flex-col items-center justify-center flex-1 py-2 gap-1"
                >
                  {user ? (
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm transition-all duration-300 ${profileActive ? 'bg-emerald-500 text-white scale-110' : 'bg-black/5 text-slate-500'}`}>
                      {(user.name || user.username || 'U')[0].toUpperCase()}
                    </div>
                  ) : (
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${profileActive ? 'bg-emerald-500 text-white scale-110 shadow-lg shadow-emerald-500/30' : 'text-slate-400'}`}>
                      <User size={18} />
                    </div>
                  )}
                  <span className={`text-[9px] font-black uppercase tracking-wider transition-colors ${profileActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {user ? (user.name?.split(' ')[0] || 'Profile') : 'Login'}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={tab.id || tab.to}
                to={tab.to}
                className="flex flex-col items-center justify-center flex-1 py-2 gap-1 group"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-emerald-500 text-white scale-110 shadow-lg shadow-emerald-500/30' : 'text-slate-400 group-hover:text-black group-hover:bg-black/5'}`}>
                  <tab.icon size={18} />
                </div>
                <span className={`text-[9px] font-black uppercase tracking-wider transition-colors ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default MobileNav;
