import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Activity, Calendar, Trophy, User, Plus, X, Zap, BarChart2, LogOut } from 'lucide-react';

const TABS = [
  { id: 'home',     label: 'Home',     icon: Home,     to: '/' },
  { id: 'live',     label: 'Live',     icon: Activity, to: '/dashboard' },
  { id: 'book',     label: 'Book',     icon: Calendar, to: '/#slots', special: true },
  { id: 'matches',  label: 'Matches',  icon: Trophy,   to: '/tournaments' },
  { id: 'profile',  label: 'Profile',  icon: User,     to: '/dashboard' },
];

const MobileNav = ({ user, logout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  // Hide on match and admin pages
  const hidden = ['/match', '/admin', '/worker', '/live'].some(p =>
    location.pathname.startsWith(p)
  );
  if (hidden) return null;

  const activeId = (() => {
    const p = location.pathname;
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
          {TABS.map(tab => {
            const isActive = activeId === tab.id;
            const isSpecial = tab.special;

            if (isSpecial) {
              return (
                <button
                  key={tab.id}
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
            if (tab.id === 'profile' && user) {
              return (
                <Link
                  key={tab.id}
                  to={user.role === 'admin' ? '/admin/dashboard' : user.role === 'worker' ? '/worker/dashboard' : '/dashboard'}
                  className="flex flex-col items-center justify-center flex-1 py-2 gap-1"
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm transition-all duration-300 ${isActive ? 'bg-emerald-500 text-white scale-110' : 'bg-black/5 text-slate-500'}`}>
                    {(user.name || user.username || 'U')[0].toUpperCase()}
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-wider transition-colors ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {user.name?.split(' ')[0] || 'Profile'}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={tab.id}
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
