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
import UserDashboard from './pages/UserDashboard';
import ScoringDashboard from './pages/ScoringDashboard';
import LiveScoreView from './pages/LiveScoreView';
import PlayerProfile from './pages/PlayerProfile';
import PlayerStatsDashboard from './pages/PlayerStatsDashboard';
import Leaderboard from './pages/Leaderboard';
import TurfDetailPage from './pages/TurfDetailPage';
import ProtectedRoute from './components/ProtectedRoute';
import CricBotWidget from './components/CricBotWidget';
import FirebaseAuthTest from './pages/FirebaseAuthTest';
import { slotsAPI } from './api/client';

import { Zap } from 'lucide-react';

const NavLinks = () => {
    const { user, logout } = React.useContext(AuthContext);
    const location = useLocation();

    if (user) {
        return (
            <div className="flex items-center gap-2 md:gap-4">
                <button 
                  onClick={logout} 
                  className="bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100 px-2 md:px-4 py-2 rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Out
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 md:gap-4">
            <a
                href="/#about"
                className="hidden md:flex items-center gap-1.5 text-slate-500 hover:text-emerald-600 transition-colors text-[10px] font-black uppercase tracking-widest"
            >
                🏟️ About Arena
            </a>
            <Link 
                to="/login" 
                className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 md:px-8 py-2 md:py-3 rounded-xl md:rounded-2xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95 text-[10px] md:text-sm font-black uppercase tracking-widest leading-none border border-emerald-500/20"
            >
                Login
            </Link>
        </div>
    );
};

const Layout = ({ children, turfName = "The Turf" }) => (
    <div className="min-h-screen bg-gray-50 font-sans selection:bg-emerald-100 selection:text-emerald-900">
        <nav className="bg-white sticky top-0 z-[100] border-b border-gray-50 h-16 md:h-24 flex items-center shadow-sm shadow-emerald-500/5">
            <div className="max-w-7xl mx-auto px-3 md:px-6 w-full flex items-center justify-between h-full gap-2">
                <Link to="/" className="flex items-center gap-3 group min-w-0 flex-1 h-full">
                    <img 
                        src="/logo.png" 
                        alt="The Turf Logo" 
                        className="h-12 md:h-16 w-auto object-contain group-hover:scale-105 transition-transform duration-500 py-1"
                        onError={(e) => {
                            e.target.onerror = null; 
                            e.target.src = 'https://cdn-icons-png.flaticon.com/512/3233/3233513.png'; // Fallback
                        }}
                    />
                    <div className="flex flex-col">
                        <span className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">{turfName}</span>
                        <span className="text-[8px] md:text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">Premium Sports Arena</span>
                    </div>
                </Link>
                <div className="shrink-0">
                    <NavLinks />
                </div>
            </div>
        </nav>
        <main>{children}</main>
        <footer className="bg-[#0f172a] text-white py-16 md:py-24 mt-16 md:mt-32 pb-safe border-t border-white/5">
            <div className="max-w-7xl mx-auto px-6 text-center space-y-12">
                <div className="flex flex-col items-center gap-6">
                    <img src="/logo.png" alt="Footer Logo" className="h-24 md:h-32 w-auto object-contain brightness-100 transition-all" />
                    <div className="space-y-4">
                        <h3 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter">🏟️ {turfName}</h3>
                        <p className="text-slate-400 text-sm md:text-base max-w-lg mx-auto leading-relaxed">
                            Miyapur's flagship smart arena. Experience 90ft x 60ft of professional high-performance turf with digital match-day intelligence.
                        </p>
                    </div>
                </div>
                <p className="text-gray-400 text-sm max-w-md mx-auto mb-4 md:mb-8">Premium booking platform for cricket and football turfs. Elevate your game with us.</p>
                <div className="flex items-center justify-center gap-4 mt-6 text-[10px] font-black uppercase tracking-widest text-gray-500">
                    <Link to="/login" className="hover:text-emerald-400 transition-colors">Player Login</Link>
                    <span className="opacity-20 text-gray-700">•</span>
                    <Link to="/admin/login" className="hover:text-emerald-400 transition-colors">Admin</Link>
                    <span className="opacity-20 text-gray-700">•</span>
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

  const WrapLayout = ({ children }) => <Layout turfName={settings.TURF_NAME}>{children}</Layout>;

  return (
    <Router>
      <Routes>
          <Route path="/" element={<WrapLayout><PublicHome /></WrapLayout>} />
          <Route path="/home" element={<WrapLayout><PublicHome /></WrapLayout>} />
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
          
          <Route path="*" element={<WrapLayout><PublicHome /></WrapLayout>} />
      </Routes>
      <CricBotWidget />
      <ToastContainer position="bottom-right" theme="dark" />
    </Router>
  );
}

export default App;
