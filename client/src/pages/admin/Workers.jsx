import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard,
  Calendar,
  Activity,
  Briefcase,
  PieChart,
  Database,
  LogOut,
  ChevronRight,
  Plus,
  X,
  User,
  Mail,
  Phone,
  Trash2,
  ShieldAlert,
  Lock,
  Edit2,
  ShieldCheck,
  Settings, Clock } from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import { adminAPI } from '../../api/client';
import MobileNav from '../../components/MobileNav';
import AdminSidebar from '../../components/AdminSidebar';

const AdminWorkers = () => {

  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState({ TURF_NAME: 'The Turf' });

  const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/operations', label: 'Operations HUB', icon: Activity },
    { to: '/admin/slots', label: 'Slot Control', icon: Calendar },
    { to: '/admin/bookings', label: 'Booking Log', icon: Activity },
    { to: '/admin/workers', label: 'Workers Team', icon: Briefcase },
    { to: '/admin/users', label: 'User Control', icon: User },
    { to: '/admin/report', label: 'Intelligence', icon: PieChart },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
    { to: '/admin/scanner', label: 'QR Scanner', icon: Clock }
  ];

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  useEffect(() => {
    fetchWorkers();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await adminAPI.getSettings();
      if (data.success) {
        setSettings(prev => ({ ...prev, ...data.settings }));
      }
    } catch (err) {
      console.error('Settings fetch error:', err);
    }
  };

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getWorkers();
      setWorkers(response.data.workers || []);
    } catch (error) {
      setError('Biometric registry sync failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateWorker = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await adminAPI.createWorker(formData);
      setFormData({ name: '', email: '', phone: '', password: '' });
      setShowForm(false);
      await fetchWorkers();
    } catch (error) {
      setError(error.response?.data?.message || 'Protocol violation during registration.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWorker = async (workerId) => {
    if (!window.confirm('Neutralize this operative permanently?')) return;
    try {
      await adminAPI.deleteWorker(workerId);
      await fetchWorkers();
    } catch (error) {
      setError('Registry deletion failed.');
    }
  };

  const NavItem = ({ to, label, icon: Icon, active = false }) => (
    <Link
      to={to}
      className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all group ${active
        ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-200'
        : 'text-gray-400 hover:bg-emerald-50 hover:text-emerald-700'}`}
    >
      <Icon size={20} className={active ? 'text-white' : 'group-hover:text-emerald-600'} />
      <span className="text-xs font-black uppercase tracking-widest">{label}</span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <MobileNav user={user} logout={logout} navItems={navItems} dashboardTitle={settings.TURF_NAME} />

      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar user={user} logout={logout} turfName={settings.TURF_NAME} />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-24 bg-gray-50">


        <header className="bg-white/80 backdrop-blur-md px-6 md:px-10 h-20 md:h-24 flex items-center justify-between sticky top-0 z-40 border-b border-gray-100">
          <div className="flex flex-col">
            <h2 className="text-lg md:text-2xl font-black text-gray-900 tracking-tighter uppercase leading-none">Workers</h2>
            <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Operative Registry</p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 md:px-8 py-2 md:py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shadow-xl shadow-emerald-200"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            <span className="hidden md:inline">{showForm ? 'Abort Registration' : 'Register Operative'}</span>
            <span className="md:hidden">{showForm ? 'Cancel' : 'Add'}</span>
          </button>
        </header>

        <div className="p-4 md:p-10 space-y-8 md:space-y-10">
          {error && (
            <div className="bg-red-50 border border-red-100 p-6 rounded-[2rem] flex items-center gap-4 text-red-600 animate-shake">
              <ShieldAlert className="shrink-0" size={18} />
              <p className="text-[10px] md:text-xs font-black uppercase tracking-tight">{error}</p>
            </div>
          )}

          {/* Registration Form */}
          {showForm && (
            <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 border-2 border-emerald-100 shadow-2xl shadow-emerald-900/5 transition-all">
              <h3 className="text-[10px] md:text-xs font-black text-gray-900 uppercase tracking-[0.2em] mb-10">Neural Identity Enrollment</h3>
              <form onSubmit={handleCreateWorker} className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                <div className="space-y-3 md:space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Legal Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600/30" size={18} />
                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} required placeholder="Full Identity" className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 p-4 pl-12 rounded-xl font-bold text-sm outline-none" />
                  </div>
                </div>
                <div className="space-y-3 md:space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Comms Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600/30" size={18} />
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} required placeholder="operative@theturf.com" className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 p-4 pl-12 rounded-xl font-bold text-sm outline-none" />
                  </div>
                </div>
                <div className="space-y-3 md:space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Secure Mobile</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600/30" size={18} />
                    <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required placeholder="10-digit mobile" className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 p-4 pl-12 rounded-xl font-bold text-sm outline-none" />
                  </div>
                </div>
                <div className="space-y-3 md:space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Access Key</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600/30" size={18} />
                    <input type="password" name="password" value={formData.password} onChange={handleInputChange} required placeholder="••••••••" className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 p-4 pl-12 rounded-xl font-bold text-sm outline-none" />
                  </div>
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <button type="submit" disabled={submitting} className="w-full md:w-auto bg-gray-900 text-white px-12 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-200 disabled:opacity-50">
                    {submitting ? 'Encrypting...' : 'Confirm Enrollment'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Personnel List */}
          {loading ? (
            <div className="py-40 flex flex-col items-center gap-6">
              <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Syncing Personnel Data...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {workers.map(worker => (
                <div key={worker._id} className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 shadow-xl shadow-emerald-900/[0.02] p-6 md:p-8 group hover:border-emerald-500 transition-all flex flex-col">
                  <div className="flex justify-between items-start mb-6 md:mb-8">
                    <div className="bg-gray-50 p-3 md:p-4 rounded-[1.5rem] md:rounded-3xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      <ShieldCheck size={32} />
                    </div>
                    <button onClick={() => handleDeleteWorker(worker._id)} className="bg-red-50 text-red-300 p-3 rounded-xl hover:bg-red-500 hover:text-white transition-all md:opacity-0 group-hover:opacity-100">
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="space-y-3 md:space-y-4 mb-8 md:mb-10 flex-1">
                    <h3 className="text-xl md:text-2xl font-black text-gray-900 tracking-tighter uppercase leading-none">{worker.name}</h3>
                    <p className="text-[8px] md:text-[10px] font-black text-emerald-600 uppercase tracking-widest border-b-2 border-emerald-50 border-dotted pb-2 truncate">{worker.email}</p>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <p className="text-[8px] md:text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Mobile Unit</p>
                        <p className="text-[10px] md:text-xs font-bold text-gray-900">{worker.phone}</p>
                      </div>
                      <div>
                        <p className="text-[8px] md:text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Deployed</p>
                        <p className="text-[10px] md:text-xs font-bold text-gray-900">{worker.assignedSlots?.length || 0} nodes</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/admin/workers/${worker._id}`)}
                    className="w-full bg-gray-50 text-gray-400 py-3 md:py-4 rounded-xl md:rounded-2xl font-black uppercase text-[8px] md:text-[10px] tracking-widest hover:bg-emerald-50 hover:text-emerald-700 transition-all flex items-center justify-center gap-3"
                  >
                    <Edit2 size={14} /> Profile
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        </main>
      </div>
    </div>
  );
};

export default AdminWorkers;
