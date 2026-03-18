import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Briefcase } from 'lucide-react';
import AdminLogin from './pages/admin/Login';
import WorkerLogin from './pages/worker/Login';
import { AuthProvider } from './context/AuthContext';
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
import AdminSlots from './pages/admin/Slots';
import AdminBookings from './pages/admin/Bookings';
import AdminWorkers from './pages/admin/Workers';
import AdminReport from './pages/admin/Report';
import AdminBookedSlots from './pages/admin/BookedSlots';
import AdminBookingDetail from './pages/admin/BookingDetail';
import AdminSettings from './pages/admin/Settings';
import AdminUsers from './pages/admin/Users';
import UserDashboard from './pages/UserDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import CricBotWidget from './components/CricBotWidget';
import FirebaseAuthTest from './pages/FirebaseAuthTest';
import { slotsAPI } from './api/client';

const Layout = ({ children, turfName = "The Turf" }) => (
  <div className="min-h-screen bg-gray-50 font-sans selection:bg-emerald-100 selection:text-emerald-900">
    {/* ── Top Nav ── */}
    <nav className="bg-white sticky top-0 z-[100] border-b border-gray-50 h-16 md:h-20 flex items-center">
      <div className="max-w-7xl mx-auto px-4 md:px-6 w-full flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 md:gap-3 group">
          <div className="bg-emerald-600 text-white p-1.5 md:p-2 rounded-xl shadow-lg shadow-emerald-200 group-hover:rotate-12 transition-transform">
            <Briefcase size={18} />
          </div>
          <span className="text-lg md:text-xl font-black text-slate-900 tracking-tighter uppercase whitespace-nowrap">{turfName}</span>
        </Link>
        <div className="flex items-center gap-3 md:gap-8">
          <div className="flex items-center gap-3 md:gap-4 text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] text-slate-400">
            <Link to="/login" className="hover:text-emerald-600 transition-colors">Login</Link>
            <span className="opacity-20 text-slate-900">•</span>
            <Link to="/admin/login" className="hover:text-emerald-600 transition-colors hidden sm:block">Admin</Link>
            <span className="opacity-20 text-slate-900 hidden sm:block">•</span>
            <Link to="/worker/login" className="hover:text-emerald-600 transition-colors hidden sm:block">Worker</Link>
          </div>
        </div>
      </div>
    </nav>

    <main>{children}</main>

    {/* ── Footer ── */}
    <footer className="bg-gray-900 text-white py-10 md:py-20 mt-10 md:mt-20 pb-safe">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <h3 className="text-xl md:text-2xl font-black mb-3 md:mb-4 text-white uppercase tracking-tighter">🏟️ {turfName}</h3>
        <p className="text-gray-400 text-sm max-w-md mx-auto mb-4 md:mb-8">Premium booking platform for cricket and football turfs. Elevate your game with us.</p>
        <p className="text-xs text-gray-600">© 2026 {turfName} Inc. Built with ❤️ for sports enthusiasts.</p>
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

  const WrapLayout = ({ children }) => <Layout turfName={settings.TURF_NAME}>{children}</Layout>;

  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<WrapLayout><PublicHome /></WrapLayout>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/worker/login" element={<WorkerLogin />} />
          
          {/* Firebase Standalone Verification Route */}
          <Route path="/firebase-test" element={<FirebaseAuthTest />} />

          {/* Public Booking Flow */}
          <Route path="/book/:slotId" element={<WrapLayout><BookingPage /></WrapLayout>} />
          <Route path="/payment/:bookingId" element={<WrapLayout><PaymentPage /></WrapLayout>} />
          <Route path="/booking-success" element={<SuccessPage />} />

          {/* User Dashboard */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['user']}>
              <UserDashboard />
            </ProtectedRoute>
          } />

          {/* Worker Dashboard */}
          <Route path="/worker/dashboard" element={
            <ProtectedRoute allowedRoles={['worker']}>
              <WorkerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/worker/booked-slots" element={
            <ProtectedRoute allowedRoles={['worker']}>
              <WorkerBookedSlots />
            </ProtectedRoute>
          } />
          <Route path="/worker/assigned-slots" element={
            <ProtectedRoute allowedRoles={['worker']}>
              <WorkerAssignedSlots />
            </ProtectedRoute>
          } />
          <Route path="/worker/booking/:id" element={
            <ProtectedRoute allowedRoles={['worker']}>
              <WorkerBookingDetail />
            </ProtectedRoute>
          } />
          <Route path="/worker/report" element={
            <ProtectedRoute allowedRoles={['worker']}>
              <WorkerReport />
            </ProtectedRoute>
          } />

          {/* Admin Dashboard */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/slots" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminSlots />
            </ProtectedRoute>
          } />
          <Route path="/admin/booked-slots" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminBookedSlots />
            </ProtectedRoute>
          } />
          <Route path="/admin/bookings" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminBookings />
            </ProtectedRoute>
          } />
          <Route path="/admin/workers" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminWorkers />
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminUsers />
            </ProtectedRoute>
          } />
          <Route path="/admin/report" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminReport />
            </ProtectedRoute>
          } />
          <Route path="/admin/bookings/:id" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminBookingDetail />
            </ProtectedRoute>
          } />
          <Route path="/admin/settings" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminSettings />
            </ProtectedRoute>
          } />
        </Routes>
        <CricBotWidget />
      </AuthProvider>
    </Router>
  );
}
export default App;
