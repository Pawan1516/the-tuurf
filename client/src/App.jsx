import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { onMessageListener } from './utils/notifications';
import AdminLogin from './pages/admin/Login';
import WorkerLogin from './pages/worker/Login';
import AuthContext, { AuthProvider } from './context/AuthContext';
import Register from './pages/Register';
import Login from './pages/Login';
import PublicHome from './pages/PublicHome';
import AboutUs from './pages/AboutUs';
import BookingPage from './pages/BookingPage';
import PaymentPage from './pages/PaymentPage';
import SuccessPage from './pages/SuccessPage';
import WorkerDashboard from './pages/worker/Dashboard';
import WorkerBookingDetail from './pages/worker/BookingDetail';
import WorkerBookedSlots from './pages/worker/BookedSlots';
import WorkerAssignedSlots from './pages/worker/AssignedSlots';
import WorkerReport from './pages/worker/Report';
import AdminDashboard from './pages/admin/Dashboard';
import OperationsDashboard from './pages/admin/OperationsDashboard';
import AdminSlots from './pages/admin/Slots';
import AdminBookings from './pages/admin/Bookings';
import AdminWorkers from './pages/admin/Workers';
import AdminReport from './pages/admin/Report';
import AdminBookedSlots from './pages/admin/BookedSlots';
import AdminBookingDetail from './pages/admin/BookingDetail';
import AdminSettings from './pages/admin/Settings';
import AdminUsers from './pages/admin/Users';
import AdminScanner from './pages/admin/Scanner';
import StrategyHub from './pages/admin/StrategyHub';
import CMSHub from './pages/admin/CMSHub';
import UserDashboard from './pages/UserDashboard';
import ScoringDashboard from './pages/ScoringDashboard';
import LiveScoreView from './pages/LiveScoreView';
import PlayerProfile from './pages/PlayerProfile';
import PlayerStatsDashboard from './pages/PlayerStatsDashboard';
import Leaderboard from './pages/Leaderboard';
import TurfDetailPage from './pages/TurfDetailPage';
import ProtectedRoute from './components/ProtectedRoute';
import MobileNav from './components/MobileNav';
import CricBotWidget from './components/CricBotWidget';
import FirebaseAuthTest from './pages/FirebaseAuthTest';
import CricketAnalyticsDashboard from './pages/CricketAnalyticsDashboard';
import PlayerAnalytics from './pages/PlayerAnalytics';
import PlayerComparison from './pages/PlayerComparison';
import { slotsAPI } from './api/client';

import { Zap } from 'lucide-react';

const NavLinks = () => {
    const { user, logout } = React.useContext(AuthContext);
    const location = useLocation();

    return (
        <div className="flex items-center gap-3 md:gap-6">
            <Link 
                to="/login" 
                className="bg-emerald-600 text-white hover:bg-emerald-500 px-6 md:px-10 py-3 md:py-4 rounded-2xl md:rounded-3xl transition-all shadow-2xl shadow-emerald-600/20 active:scale-95 text-xs md:text-sm font-black uppercase tracking-[0.1em] leading-none border border-emerald-400/20"
            >
                Login
            </Link>
        </div>
    );
};

const Layout = ({ children, turfName = "The Turf", settings = {} }) => (
    <div className="min-h-screen premium-gradient font-sans selection:bg-emerald-500 selection:text-white pb-safe">
        <nav className="nav-glass md:h-28 flex items-center hidden md:flex animate-fade-up">
            <div className="max-w-7xl mx-auto px-8 w-full flex items-center justify-between h-full gap-4">
                <Link to="/" className="flex items-center gap-4 group h-full">
                    <div className="bg-white p-2 rounded-2xl shadow-xl shadow-emerald-500/5 border border-emerald-500/10 group-hover:rotate-12 transition-transform duration-500">
                        <img 
                            src="/logo.png" 
                            alt="Logo" 
                            className="h-12 md:h-14 w-auto object-contain"
                            onError={(e) => {
                                e.target.onerror = null; 
                                e.target.src = 'https://cdn-icons-png.flaticon.com/512/3233/3233513.png';
                            }}
                        />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">{turfName} <span className="text-emerald-500">Miyapur</span></span>
                        <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                             Premium Sports Network
                        </span>
                    </div>
                </Link>
                <div className="shrink-0 flex items-center gap-6 h-full">
                    <NavLinks />
                </div>
            </div>
        </nav>
        <main className="gpu-layer animate-fade-up min-h-[60vh]">{children}</main>
        <footer className="bg-[#0f172a] text-white py-16 md:py-24 mt-16 md:mt-32 pb-safe border-t border-white/5">
            <div className="max-w-7xl mx-auto px-6 text-center space-y-12">
                <div className="flex flex-col items-center gap-6">
                    <img src="/logo.png" alt="Footer Logo" className="h-24 md:h-32 w-auto object-contain brightness-100 transition-all" />
                    <div className="space-y-4">
                        <h3 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter">🏟️ {turfName}</h3>
                        <p className="text-slate-400 text-sm md:text-base max-w-lg mx-auto leading-relaxed">
                            {turfName}'s flagship smart arena in {settings.TURF_LOCATION?.split(',')[0] || 'Miyapur'}. Experience professional high-performance turf with digital match-day intelligence.
                        </p>
                    </div>
                </div>
                <p className="text-gray-400 text-sm max-w-md mx-auto mb-4 md:mb-8">Premium booking platform for cricket and football turfs. Elevate your game with us.</p>
                <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-[10px] font-black uppercase tracking-widest text-gray-500">
                    <Link to="/about" className="hover:text-emerald-400 transition-colors">About Platform</Link>
                    <span className="opacity-20 text-gray-700 hidden sm:inline">•</span>
                    <Link to="/login" className="hover:text-emerald-400 transition-colors">Player Login</Link>
                    <span className="opacity-20 text-gray-700 hidden sm:inline">•</span>
                    <Link to="/admin/login" className="hover:text-emerald-400 transition-colors">Admin</Link>
                    <span className="opacity-20 text-gray-700 hidden sm:inline">•</span>
                    <Link to="/worker/login" className="hover:text-emerald-400 transition-colors">Worker</Link>
                </div>
                <p className="text-xs text-gray-600 mt-6">© 2026 {turfName} Inc. Built with ❤️ for sports enthusiasts.</p>
            </div>
        </footer>
    </div>
);

function App() {
  const [settings, setSettings] = React.useState({ TURF_NAME: 'The Turf' });

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await slotsAPI.getSettings();
        if (data.success) {
          setSettings(prev => ({ ...prev, ...data.settings }));
        }
      } catch (err) {
        console.error('App setting fetch error:', err);
      }
    };
    fetchSettings();
  }, []);

  React.useEffect(() => {
    onMessageListener().then(payload => {
      toast.info(
        <div className="flex flex-col">
          <span className="font-bold">{payload.notification.title}</span>
          <span>{payload.notification.body}</span>
        </div>,
        { position: "top-right", autoClose: 5000 }
      );
    }).catch(err => console.log('failed: ', err));
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
    <Router>
      <Routes>
          <Route path="/" element={<WrapLayout><PublicHome /></WrapLayout>} />
          <Route path="/home" element={<WrapLayout><PublicHome /></WrapLayout>} />
          <Route path="/about" element={<WrapLayout><AboutUs /></WrapLayout>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/worker/login" element={<WorkerLogin />} />
          <Route path="/firebase-test" element={<FirebaseAuthTest />} />
          <Route path="/book/:slotId" element={<WrapLayout><BookingPage /></WrapLayout>} />
          <Route path="/payment/:bookingId" element={<WrapLayout><PaymentPage /></WrapLayout>} />
          <Route path="/booking-success" element={<SuccessPage />} />
          <Route path="/live/:id" element={<LiveScoreView />} />
          <Route path="/player/:id" element={<PlayerProfile />} />
          <Route path="/stats-dashboard" element={<PlayerStatsDashboard />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/turfs/:id" element={<WrapLayout><TurfDetailPage /></WrapLayout>} />
          <Route path="/cricket-analytics" element={<ProtectedRoute allowedRoles={['admin']}><CricketAnalyticsDashboard /></ProtectedRoute>} />
          <Route path="/player-analytics" element={<ProtectedRoute allowedRoles={['user', 'player']}><PlayerAnalytics /></ProtectedRoute>} />
          <Route path="/player/compare/:id" element={<PlayerComparison />} />

          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['user', 'player']}><UserDashboard /></ProtectedRoute>} />
          <Route path="/scoring/:id" element={<ProtectedRoute allowedRoles={['user', 'player', 'admin']}><ScoringDashboard /></ProtectedRoute>} />
          <Route path="/worker/dashboard" element={<ProtectedRoute allowedRoles={['worker']}><WorkerDashboard /></ProtectedRoute>} />
          <Route path="/worker/booked-slots" element={<ProtectedRoute allowedRoles={['worker']}><WorkerBookedSlots /></ProtectedRoute>} />
          <Route path="/worker/assigned-slots" element={<ProtectedRoute allowedRoles={['worker']}><WorkerAssignedSlots /></ProtectedRoute>} />
          <Route path="/worker/booking/:id" element={<ProtectedRoute allowedRoles={['worker']}><WorkerBookingDetail /></ProtectedRoute>} />
          <Route path="/worker/report" element={<ProtectedRoute allowedRoles={['worker']}><WorkerReport /></ProtectedRoute>} />
          <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/slots" element={<ProtectedRoute allowedRoles={['admin']}><AdminSlots /></ProtectedRoute>} />
          <Route path="/admin/booked-slots" element={<ProtectedRoute allowedRoles={['admin']}><AdminBookedSlots /></ProtectedRoute>} />
          <Route path="/admin/bookings" element={<ProtectedRoute allowedRoles={['admin']}><AdminBookings /></ProtectedRoute>} />
          <Route path="/admin/workers" element={<ProtectedRoute allowedRoles={['admin']}><AdminWorkers /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/report" element={<ProtectedRoute allowedRoles={['admin']}><AdminReport /></ProtectedRoute>} />
          <Route path="/admin/bookings/:id" element={<ProtectedRoute allowedRoles={['admin']}><AdminBookingDetail /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><AdminSettings /></ProtectedRoute>} />
          <Route path="/admin/scanner" element={<ProtectedRoute allowedRoles={['admin']}><AdminScanner /></ProtectedRoute>} />
          <Route path="/admin/operations" element={<ProtectedRoute allowedRoles={['admin']}><OperationsDashboard /></ProtectedRoute>} />
          <Route path="/admin/strategy" element={<ProtectedRoute allowedRoles={['admin']}><StrategyHub /></ProtectedRoute>} />
          <Route path="/admin/cms" element={<ProtectedRoute allowedRoles={['admin']}><CMSHub /></ProtectedRoute>} />
          
          <Route path="*" element={<WrapLayout><PublicHome /></WrapLayout>} />
      </Routes>
      <CricBotWidget />
      <ToastContainer position="bottom-right" theme="dark" />
    </Router>
  );
}

export default App;
