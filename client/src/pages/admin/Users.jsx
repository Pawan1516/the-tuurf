import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Activity,
  Briefcase,
  PieChart,
  LogOut,
  ChevronRight,
  User,
  Mail,
  Lock,
  Search,
  CheckCircle,
  Settings,
  ShieldCheck,
  Eye,
  EyeOff
, Clock} from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import { adminAPI } from '../../api/client';
import MobileNav from '../../components/MobileNav';
import AdminSidebar from '../../components/AdminSidebar';

const AdminUsers = () => {

  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [settings, setSettings] = useState({ TURF_NAME: 'The Turf' });
  const [showPasswords, setShowPasswords] = useState({});

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
    fetchUsers();
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

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getUsers();
      setUsers(response.data.users || []);
    } catch (error) {
      setError('Neural registry access denied or failed.');
    } finally {
      setLoading(false);
    }
  };

  const togglePassword = (userId) => {
    setShowPasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row">
      <MobileNav user={user} logout={logout} navItems={navItems} dashboardTitle={settings.TURF_NAME} />

      <AdminSidebar user={user} logout={logout} turfName={settings.TURF_NAME} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24">

        <header className="bg-white/80 backdrop-blur-md px-6 md:px-10 h-20 md:h-24 flex items-center justify-between sticky top-0 z-40 border-b border-gray-100">
          <div className="flex flex-col">
            <h2 className="text-lg md:text-2xl font-black text-gray-900 tracking-tighter uppercase leading-none">User Registry</h2>
            <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Personnel Database</p>
          </div>

          <div className="relative group hidden md:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-600 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="SEARCH IDENTITY..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-50 border-2 border-transparent focus:border-emerald-500 p-3 pl-12 rounded-xl text-[10px] font-black tracking-widest uppercase outline-none w-64 md:w-80 transition-all"
            />
          </div>
        </header>

        <div className="p-4 md:p-10">
          {error && (
            <div className="bg-red-50 border border-red-100 p-6 rounded-[2rem] flex items-center gap-4 text-red-600 mb-8">
              <Activity className="shrink-0" size={18} />
              <p className="text-[10px] md:text-xs font-black uppercase tracking-tight">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="py-40 flex flex-col items-center gap-6">
              <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Decrypting User Data...</p>
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] md:rounded-[3rem] overflow-hidden border border-gray-100 shadow-2xl shadow-emerald-900/[0.03]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Identified Name</th>
                      <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Comms Email</th>
                      <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Access Key (Hash)</th>
                      <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredUsers.length > 0 ? filteredUsers.map((u) => (
                      <tr key={u._id} className="hover:bg-emerald-50/30 transition-colors group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center font-black text-xs uppercase group-hover:bg-emerald-600 group-hover:text-white transition-all">
                              {u.name.slice(0, 2)}
                            </div>
                            <span className="font-bold text-gray-900 uppercase tracking-tight text-sm">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2 text-gray-500 font-medium text-xs">
                            <Mail size={14} className="text-emerald-400" />
                            {u.email}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <Lock size={14} className="text-gray-300" />
                            <code className="bg-gray-50 px-3 py-1.5 rounded-lg text-[10px] font-mono text-gray-400 truncate max-w-[200px] inline-block">
                              {showPasswords[u._id] ? (u.realPassword || '⚠️ Requires User Login') : '••••••••••••••••'}
                            </code>
                            <button 
                              onClick={() => togglePassword(u._id)}
                              className="text-gray-300 hover:text-emerald-600 transition-colors"
                            >
                              {showPasswords[u._id] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full border border-emerald-100">
                            <CheckCircle size={12} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Verified</span>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="4" className="px-8 py-20 text-center">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No matching identities found in local clusters.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminUsers;

