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
import WorkerReport from './pages/worker/Report';
import AdminDashboard from './pages/admin/Dashboard';
import AdminSlots from './pages/admin/Slots';
import AdminBookings from './pages/admin/Bookings';
import AdminWorkers from './pages/admin/Workers';
import AdminReport from './pages/admin/Report';
import AdminBookingDetail from './pages/admin/BookingDetail';
import UserDashboard from './pages/UserDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import CricBotWidget from './components/CricBotWidget';

const Layout = ({ children }) => (
  <div className="min-h-screen bg-gray-50 font-sans selection:bg-emerald-100 selection:text-emerald-900">
    <nav className="bg-white sticky top-0 z-[100] border-b border-gray-50 h-20 flex items-center">
      <div className="max-w-7xl mx-auto px-6 w-full flex justify-between items-center">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="bg-emerald-600 text-white p-2 rounded-xl shadow-lg shadow-emerald-200 group-hover:rotate-12 transition-transform">
            <Briefcase size={20} />
          </div>
          <span className="text-xl font-black text-slate-900 tracking-tighter uppercase whitespace-nowrap">The Turf</span>
        </Link>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            <Link to="/admin/login" className="hover:text-emerald-600 transition-colors">Admin</Link>
            <span className="opacity-20 text-slate-900">•</span>
            <Link to="/worker/login" className="hover:text-emerald-600 transition-colors">Worker</Link>
          </div>
        </div>
      </div>
    </nav>
    <main>{children}</main>
    <CricBotWidget />
    <footer className="bg-gray-900 text-white py-20 mt-20">

      <div className="max-w-7xl mx-auto px-4 text-center">
        <h3 className="text-2xl font-black mb-4 text-white">🏟️ THE TURF</h3>
        <p className="text-gray-400 max-w-md mx-auto mb-8">Premium booking platform for cricket and football turfs. Elevate your game with us.</p>
        <p className="text-xs text-gray-600">© 2026 The Turf Inc. Built with ❤️ for sports enthusiasts.</p>
      </div>
    </footer>
  </div>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Layout><PublicHome /></Layout>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/worker/login" element={<WorkerLogin />} />

          {/* Public Booking Flow */}
          <Route path="/book/:slotId" element={<Layout><BookingPage /></Layout>} />
          <Route path="/payment/:bookingId" element={<Layout><PaymentPage /></Layout>} />
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
        </Routes>
      </AuthProvider>
    </Router>
  );
}
export default App;
