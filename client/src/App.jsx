import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { onMessageListener } from './utils/notifications';
import AuthContext, { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MatchCreationModal from './components/MatchCreationModal';
import TournamentDashboard from './pages/TournamentDashboard';
import SessionManager from './components/SessionManager';
import MobileNav from './components/MobileNav';
import CricBotWidget from './components/CricBotWidget';
import SplashScreen from './components/SplashScreen';
import AdminLayout from './components/AdminLayout';
import {
  Zap, Home, Calendar, Activity, Trophy, Users, User,
  Search, Bell, Menu, X, ChevronDown, MapPin, Phone,
  Mail, Instagram, Twitter, Youtube, ExternalLink
} from 'lucide-react';
import { slotsAPI } from './api/client';

// Lazy load all pages
const AdminLogin = lazy(() => import('./pages/admin/Login'));
const WorkerLogin = lazy(() => import('./pages/worker/Login'));
const Register = lazy(() => import('./pages/Register'));
const Login = lazy(() => import('./pages/Login'));
const PublicHome = lazy(() => import('./pages/PublicHome'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));
const SuccessPage = lazy(() => import('./pages/SuccessPage'));
const MatchFlow = lazy(() => import('./pages/MatchFlow'));
const MatchSummary = lazy(() => import('./pages/MatchSummary'));
const StatsLeaderboard = lazy(() => import('./pages/StatsLeaderboard'));
const WorkerDashboard = lazy(() => import('./pages/worker/Dashboard'));
const WorkerBookingDetail = lazy(() => import('./pages/worker/BookingDetail'));
const WorkerBookedSlots = lazy(() => import('./pages/worker/BookedSlots'));
const WorkerAssignedSlots = lazy(() => import('./pages/worker/AssignedSlots'));
const WorkerReport = lazy(() => import('./pages/worker/Report'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const OperationsDashboard = lazy(() => import('./pages/admin/OperationsDashboard'));
const AdminSlots = lazy(() => import('./pages/admin/Slots'));
const AdminBookings = lazy(() => import('./pages/admin/Bookings'));
const AdminWorkers = lazy(() => import('./pages/admin/Workers'));
const AdminReport = lazy(() => import('./pages/admin/Report'));
const AdminBookedSlots = lazy(() => import('./pages/admin/BookedSlots'));
const AdminBookingDetail = lazy(() => import('./pages/admin/BookingDetail'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminScanner = lazy(() => import('./pages/admin/Scanner'));
const StrategyHub = lazy(() => import('./pages/admin/StrategyHub'));
const CMSHub = lazy(() => import('./pages/admin/CMSHub'));
const AdminAgentRunner = lazy(() => import('./pages/admin/AgentRunner'));
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const LiveScoreView = lazy(() => import('./pages/LiveScoreView'));
const PlayerProfile = lazy(() => import('./pages/PlayerProfile'));
const PlayerStatsDashboard = lazy(() => import('./pages/PlayerStatsDashboard'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const TurfDetailPage = lazy(() => import('./pages/TurfDetailPage'));
const FirebaseAuthTest = lazy(() => import('./pages/FirebaseAuthTest'));
const CricketAnalyticsDashboard = lazy(() => import('./pages/CricketAnalyticsDashboard'));
const PlayerAnalytics = lazy(() => import('./pages/PlayerAnalytics'));
const PlayerComparison = lazy(() => import('./pages/PlayerComparison'));
const PlayerIntel = lazy(() => import('./pages/PlayerIntel'));
const PremiumSubscription = lazy(() => import('./pages/PremiumSubscription'));
const AIHub = lazy(() => import('./pages/AIHub'));
const BookingDashboard = lazy(() => import('./pages/admin/BookingDashboard'));
const TeamProfile = lazy(() => import('./pages/TeamProfile'));
const Live3DMatch = lazy(() => import('./pages/Live3DMatch'));

/* ─────────────────────────────────────────────
   NAV LINKS (desktop)
───────────────────────────────────────────── */
const NAV_LINKS = [
  { label: 'Home', to: '/', icon: Home },
  { label: 'Book Turf', to: '/#slots', icon: Calendar },
  { label: 'Live Matches', to: '/dashboard', icon: Activity },
  { label: 'Tournaments', to: '/tournaments', icon: Trophy },
  { label: 'Players', to: '/leaderboard', icon: Users },
];

const NavLinks = () => {
  const { user, logout } = React.useContext(AuthContext);
  const location = useLocation();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);

  return (
    <div className="flex items-center gap-2 md:gap-6">
      {/* Desktop nav links */}
      <div className="hidden lg:flex items-center gap-1">
        {NAV_LINKS.map(l => {
          const active = location.pathname === l.to || (l.to !== '/' && location.pathname.startsWith(l.to));
          return (
            <Link
              key={l.to}
              to={l.to}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200 ${active
                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                : 'text-slate-500 hover:text-black hover:bg-black/5'}`}
            >
              <l.icon size={13} />
              {l.label}
            </Link>
          );
        })}
      </div>

      {/* Search (desktop) */}
      <div className="hidden md:flex items-center gap-2 bg-black/5 rounded-xl px-4 py-2.5 border border-black/8 focus-within:border-emerald-400 focus-within:bg-emerald-50/50 transition-all">
        <Search size={14} className="text-slate-400" />
        <input
          type="text"
          placeholder="Search..."
          className="bg-transparent text-xs font-bold text-black placeholder-slate-400 outline-none w-28 focus:w-40 transition-all"
        />
      </div>

      {/* Notifications */}
      {user && (
        <button className="relative p-2.5 rounded-xl text-slate-500 hover:text-black hover:bg-black/5 transition-all border border-transparent hover:border-black/8">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white shadow-sm" />
        </button>
      )}

      {/* User profile / Login */}
      {user ? (
        <div className="relative">
          <button
            onClick={() => setProfileOpen(p => !p)}
            className="flex items-center gap-2.5 bg-black/5 hover:bg-black/8 border border-black/8 rounded-xl px-4 py-2.5 transition-all"
          >
            <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center text-white text-xs font-black">
              {(user.name || user.username || 'U')[0].toUpperCase()}
            </div>
            <span className="text-xs font-black text-black hidden md:block max-w-[100px] truncate">{user.name || user.username}</span>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-black/8 rounded-2xl shadow-2xl overflow-hidden z-50 animate-scale-in">
              <div className="p-4 border-b border-black/5 bg-emerald-500/5">
                <p className="text-xs font-black text-black">{user.name || user.username}</p>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">{user.role || 'Player'}</p>
              </div>
              <div className="p-2">
                {user.role === 'admin' && <Link to="/admin/dashboard" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all">🛡️ Admin Panel</Link>}
                {user.role === 'worker' && <Link to="/worker/dashboard" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all">⚙️ Worker Panel</Link>}
                <Link to="/dashboard" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all"><User size={13} /> My Dashboard</Link>
                <Link to="/leaderboard" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all"><Trophy size={13} /> Leaderboard</Link>
                <Link to="/ai-hub" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all"><Zap size={13} /> AI Hub</Link>
                <div className="border-t border-black/5 mt-1 pt-1">
                  <button onClick={() => { logout(); setProfileOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black text-rose-500 hover:bg-rose-50 transition-all">🚪 Sign Out</button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Link to="/login" className="hidden md:block text-xs font-black text-slate-500 hover:text-black px-4 py-2.5 rounded-xl hover:bg-black/5 transition-all uppercase tracking-widest">Login</Link>
          <Link to="/register" className="bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95">
            Register
          </Link>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   PREMIUM FOOTER
───────────────────────────────────────────── */
const Footer = ({ turfName, settings }) => (
  <footer className="bg-[#070d07] text-white mt-20 border-t border-emerald-500/10">
    {/* Top section */}
    <div className="max-w-7xl mx-auto px-6 pt-16 pb-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
      {/* Brand */}
      <div className="space-y-6 lg:col-span-1">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 w-10 h-10 rounded-xl flex items-center justify-center">
            <img src="/logo.png" alt="Logo" className="h-7 w-auto object-contain" onError={e => { e.target.onerror = null; e.target.src = 'https://cdn-icons-png.flaticon.com/512/3233/3233513.png'; }} />
          </div>
          <div>
            <p className="font-black text-white uppercase tracking-tight text-lg leading-none">{turfName}</p>
            <p className="text-[9px] text-emerald-400/60 uppercase tracking-[0.3em] font-bold">Premium Sports Network</p>
          </div>
        </div>
        <p className="text-white/40 text-xs font-bold leading-relaxed">
          The ultimate cricket & sports arena with live scoring, AI analytics, and seamless booking.
        </p>
        <div className="flex gap-3">
          {[
            { icon: Instagram, href: '#', label: 'Instagram' },
            { icon: Twitter, href: '#', label: 'Twitter' },
            { icon: Youtube, href: '#', label: 'YouTube' },
          ].map(s => (
            <a key={s.label} href={s.href} aria-label={s.label}
              className="w-9 h-9 bg-white/5 hover:bg-emerald-500 rounded-xl flex items-center justify-center text-white/40 hover:text-white border border-white/5 hover:border-emerald-400 transition-all duration-300">
              <s.icon size={15} />
            </a>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div>
        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400/60 mb-5">Platform</h4>
        <ul className="space-y-3">
          {[
            { label: 'Book Turf', to: '/#slots' },
            { label: 'Live Matches', to: '/dashboard' },
            { label: 'Tournaments', to: '/tournaments' },
            { label: 'Leaderboard', to: '/leaderboard' },
            { label: 'AI Hub', to: '/ai-hub' },
            { label: 'About Us', to: '/about' },
          ].map(l => (
            <li key={l.to}>
              <Link to={l.to} className="text-white/40 hover:text-emerald-400 text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 group">
                <span className="w-0 group-hover:w-3 h-px bg-emerald-400 transition-all duration-300" />
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Legal */}
      <div>
        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400/60 mb-5">Legal</h4>
        <ul className="space-y-3">
          {[
            { label: 'Privacy Policy', to: '/about' },
            { label: 'Terms & Conditions', to: '/about' },
            { label: 'Refund Policy', to: '/about' },
            { label: 'Cookie Policy', to: '/about' },
          ].map(l => (
            <li key={l.label}>
              <Link to={l.to} className="text-white/40 hover:text-emerald-400 text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 group">
                <span className="w-0 group-hover:w-3 h-px bg-emerald-400 transition-all duration-300" />
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Contact */}
      <div>
        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400/60 mb-5">Contact</h4>
        <ul className="space-y-4">
          <li className="flex items-start gap-3">
            <MapPin size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
            <span className="text-white/40 text-xs font-bold leading-relaxed">{settings.TURF_LOCATION || 'Miyapur, Hyderabad, Telangana 500049'}</span>
          </li>
          <li className="flex items-center gap-3">
            <Phone size={14} className="text-emerald-400 flex-shrink-0" />
            <a href="tel:+919999999999" className="text-white/40 hover:text-emerald-400 text-xs font-bold transition-colors">+91 99999 99999</a>
          </li>
          <li className="flex items-center gap-3">
            <Mail size={14} className="text-emerald-400 flex-shrink-0" />
            <a href="mailto:info@theturf.in" className="text-white/40 hover:text-emerald-400 text-xs font-bold transition-colors">info@theturf.in</a>
          </li>
        </ul>
        {/* Portal access */}
        <div className="mt-6 pt-6 border-t border-white/5 space-y-2">
          <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">Portals</p>
          <div className="flex gap-2 flex-wrap">
            <Link to="/admin/login" className="text-[9px] font-black text-white/30 hover:text-emerald-400 uppercase tracking-widest transition-colors">Admin</Link>
            <span className="text-white/10">·</span>
            <Link to="/worker/login" className="text-[9px] font-black text-white/30 hover:text-emerald-400 uppercase tracking-widest transition-colors">Worker</Link>
          </div>
        </div>
      </div>
    </div>

    {/* Bottom bar */}
    <div className="border-t border-white/5 py-6 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">
          © 2026 {turfName} Inc. All rights reserved.
        </p>
        <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest flex items-center gap-2">
          Built with <span className="text-rose-400">❤️</span> for cricket lovers
        </p>
      </div>
    </div>
  </footer>
);

/* ─────────────────────────────────────────────
   MAIN LAYOUT
───────────────────────────────────────────── */
const Layout = ({ children, turfName = 'The Turf', settings = {} }) => (
  <div className="min-h-screen bg-white font-sans selection:bg-emerald-500 selection:text-white pb-safe">
    {/* Desktop Navbar */}
    <nav className="nav-glass md:h-20 hidden md:flex items-center animate-fade-in">
      <div className="max-w-7xl mx-auto px-6 w-full flex items-center justify-between h-full">
        {/* Left: Logo + Location */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="bg-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-300">
              <img
                src="/logo.png"
                alt="Logo"
                className="h-8 w-auto object-contain brightness-0 invert"
                onError={e => { e.target.onerror = null; e.target.src = 'https://cdn-icons-png.flaticon.com/512/3233/3233513.png'; }}
              />
            </div>
            <div>
              <span className="text-xl font-black text-black tracking-tight uppercase leading-none">
                {turfName} <span className="text-emerald-600">Miyapur</span>
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Premium Sports Arena</span>
              </div>
            </div>
          </Link>

          {/* Location selector */}
          <div className="hidden xl:flex items-center gap-2 bg-black/5 px-3 py-2 rounded-xl border border-black/8 cursor-pointer hover:border-emerald-400 transition-all">
            <MapPin size={12} className="text-emerald-500" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Miyapur</span>
            <ChevronDown size={12} className="text-slate-400" />
          </div>
        </div>

        {/* Right: Nav links + actions */}
        <NavLinks />
      </div>
    </nav>

    <main className="min-h-[60vh]">{children}</main>
    <Footer turfName={turfName} settings={settings} />
  </div>
);

/* ─────────────────────────────────────────────
   APP ROOT
───────────────────────────────────────────── */
function App() {
  const [settings, setSettings] = React.useState({ TURF_NAME: 'The Turf' });
  const [showSplash, setShowSplash] = React.useState(true);

  React.useEffect(() => {
    slotsAPI.getSettings().then(({ data }) => {
      if (data.success) setSettings(p => ({ ...p, ...data.settings }));
    }).catch(() => {});
  }, []);

  React.useEffect(() => {
    onMessageListener().then(payload => {
      toast.info(
        <div className="flex flex-col">
          <span className="font-bold">{payload.notification.title}</span>
          <span>{payload.notification.body}</span>
        </div>,
        { position: 'top-right', autoClose: 5000 }
      );
    }).catch(() => {});
  }, []);

  const WrapLayout = ({ children }) => {
    const { user, logout } = React.useContext(AuthContext);
    return (
      <Layout turfName={settings.TURF_NAME} settings={settings}>
        <MobileNav user={user} logout={logout} dashboardTitle={settings.TURF_NAME} className="md:hidden" />
        {children}
      </Layout>
    );
  };

  return (
    <>
      <SplashScreen onComplete={() => setShowSplash(false)} />
      {!showSplash && (
        <Router future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
          v7_fetcherPersist: true,
          v7_normalizeFormMethod: true,
          v7_partialHydration: true,
          v7_skipActionErrorRevalidation: true
        }}>
          <AuthProvider>
            <SessionManager>
              <Suspense fallback={
                <div className="min-h-screen bg-white flex flex-col items-center justify-center">
                  <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                </div>
              }>
                <Routes>
                  {/* Public */}
                  <Route path="/" element={<WrapLayout><PublicHome /></WrapLayout>} />
                  <Route path="/home" element={<WrapLayout><PublicHome /></WrapLayout>} />
                  <Route path="/about" element={<WrapLayout><AboutUs /></WrapLayout>} />
                  <Route path="/tournaments" element={<TournamentDashboard />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/worker/login" element={<WorkerLogin />} />
                  <Route path="/firebase-test" element={<FirebaseAuthTest />} />
                  <Route path="/book/custom" element={<WrapLayout><BookingPage /></WrapLayout>} />
                  <Route path="/book/:slotId" element={<WrapLayout><BookingPage /></WrapLayout>} />
                  <Route path="/payment/:bookingId" element={<WrapLayout><PaymentPage /></WrapLayout>} />
                  <Route path="/booking-success" element={<SuccessPage />} />
                  <Route path="/live/:id" element={<LiveScoreView />} />
                  <Route path="/player/:id" element={<PlayerProfile />} />
                  <Route path="/teams/:id" element={<WrapLayout><TeamProfile /></WrapLayout>} />
                  <Route path="/stats-dashboard" element={<PlayerStatsDashboard />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/turfs/:id" element={<WrapLayout><TurfDetailPage /></WrapLayout>} />
                  <Route path="/intel-premium" element={<WrapLayout><PremiumSubscription /></WrapLayout>} />
                  <Route path="/match/live/3d/:id" element={<Live3DMatch />} />

                  {/* Scoring (public access) */}
<Route path="/match/*" element={<MatchFlow />} />

                  {/* Protected: User */}
                  <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['user', 'player']}><UserDashboard /></ProtectedRoute>} />
                  <Route path="/player-analytics" element={<ProtectedRoute allowedRoles={['user', 'player', 'admin']} requiresPremium={true}><PlayerAnalytics /></ProtectedRoute>} />
                  <Route path="/player/compare/:id" element={<ProtectedRoute allowedRoles={['user', 'player', 'admin']} requiresPremium={true}><PlayerComparison /></ProtectedRoute>} />
                  <Route path="/player-intel" element={<ProtectedRoute allowedRoles={['user', 'player', 'admin']} requiresPremium={true}><PlayerIntel /></ProtectedRoute>} />
                  <Route path="/ai-hub" element={<ProtectedRoute allowedRoles={['user', 'player', 'admin']}><AIHub /></ProtectedRoute>} />
                  <Route path="/ai-hub/:matchId" element={<ProtectedRoute allowedRoles={['user', 'player', 'admin']}><AIHub /></ProtectedRoute>} />

                  {/* Protected: Worker */}
                  <Route path="/worker/dashboard" element={<ProtectedRoute allowedRoles={['worker']}><WorkerDashboard /></ProtectedRoute>} />
                  <Route path="/worker/bookings/:id" element={<ProtectedRoute allowedRoles={['worker']}><WorkerBookingDetail /></ProtectedRoute>} />
                  <Route path="/worker/booked-slots" element={<ProtectedRoute allowedRoles={['worker']}><WorkerBookedSlots /></ProtectedRoute>} />
                  <Route path="/worker/assigned-slots" element={<ProtectedRoute allowedRoles={['worker']}><WorkerAssignedSlots /></ProtectedRoute>} />
                  <Route path="/worker/report" element={<ProtectedRoute allowedRoles={['worker']}><WorkerReport /></ProtectedRoute>} />

                  {/* Protected: Admin */}
                  <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                  <Route path="/admin/operations" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><OperationsDashboard /></AdminLayout></ProtectedRoute>} />
                  <Route path="/admin/booking-dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><BookingDashboard /></AdminLayout></ProtectedRoute>} />
                  <Route path="/admin/slots" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminSlots /></AdminLayout></ProtectedRoute>} />
                  <Route path="/admin/bookings" element={<ProtectedRoute allowedRoles={['admin']}><AdminBookings /></ProtectedRoute>} />
                  <Route path="/admin/workers" element={<ProtectedRoute allowedRoles={['admin']}><AdminWorkers /></ProtectedRoute>} />
                  <Route path="/admin/report" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminReport /></AdminLayout></ProtectedRoute>} />
                  <Route path="/admin/booked-slots" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminBookedSlots /></AdminLayout></ProtectedRoute>} />
                  <Route path="/admin/bookings/:id" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminBookingDetail /></AdminLayout></ProtectedRoute>} />
                  <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminSettings /></AdminLayout></ProtectedRoute>} />
                  <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute>} />
                  <Route path="/admin/scanner" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminScanner /></AdminLayout></ProtectedRoute>} />
                  <Route path="/admin/strategy" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><StrategyHub /></AdminLayout></ProtectedRoute>} />
                  <Route path="/admin/cms" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><CMSHub /></AdminLayout></ProtectedRoute>} />
                  <Route path="/admin/agent-runner" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminAgentRunner /></AdminLayout></ProtectedRoute>} />
                  {/* removed AdminDashboardV2 route */}
                  <Route path="/cricket-analytics" element={<ProtectedRoute allowedRoles={['admin']}><CricketAnalyticsDashboard /></ProtectedRoute>} />

                  {/* Fallback */}
                  <Route path="*" element={<WrapLayout><PublicHome /></WrapLayout>} />
                </Routes>
              </Suspense>
            </SessionManager>
          </AuthProvider>
          <CricBotWidget />
          <ToastContainer position="bottom-right" theme="dark" />
        </Router>
      )}
    </>
  );
}

export default App;
