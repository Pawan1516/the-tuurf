import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  LayoutDashboard,
  Calendar,
  Activity,
  Briefcase,
  PieChart,
  CheckCircle,
  LogOut,
  ChevronRight,
  Database,
  Save,
  Zap,
  Clock,
  Sun,
  Moon,
  Info,
  TrendingUp
} from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import { adminAPI } from '../../api/client';
import MobileNav from '../../components/MobileNav';

const AdminSettings = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [currentTime, setCurrentTime] = useState(new Date());

  const [settings, setSettings] = useState({
    PRICE_DAY: 1000,
    PRICE_NIGHT: 1200,
    PRICE_WEEKEND_DAY: 1000,
    PRICE_WEEKEND_NIGHT: 1400,
    PRICE_TRANSITION_HOUR: 18,
    TURF_OPEN_HOUR: 7,
    TURF_CLOSE_HOUR: 23,
    HOLD_DURATION_MINUTES: 5,
    TURF_NAME: 'The Turf',
    TURF_LOCATION: 'Plot no 491, Madhavapuri Hills, PJR Enclave, PJR Layout, Miyapur, Hyderabad',
    UPI_ID: 'theturf@upi'
  });

  const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/slots', label: 'Slot Control', icon: Calendar },
    { to: '/admin/booked-slots', label: 'Booked Slots', icon: CheckCircle },
    { to: '/admin/bookings', label: 'Booking Log', icon: Activity },
    { to: '/admin/workers', label: 'Workers', icon: Briefcase },
    { to: '/admin/report', label: 'Report', icon: PieChart },
    { to: '/admin/settings', label: 'Settings', icon: SettingsIcon },
  ];

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await adminAPI.getSettings();
        if (response.data.success) {
          // Merge fetched settings with defaults to ensure all keys exist
          setSettings(prev => ({
            ...prev,
            ...response.data.settings
          }));
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await adminAPI.saveSettings(settings);
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Global infrastructure calibrated successfully.' });
        // Optionally trigger a slot re-sync here or inform the admin to do so
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Synchronization failure: ' + (error.response?.data?.message || error.message) });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (key, value) => {
    const textSettings = ['TURF_LOCATION', 'TURF_NAME', 'UPI_ID'];
    setSettings(prev => ({
      ...prev,
      [key]: textSettings.includes(key) ? value : (parseInt(value) || 0)
    }));
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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row">
      <MobileNav user={user} logout={logout} navItems={navItems} dashboardTitle={settings.TURF_NAME} />

      {/* Sidebar (Desktop Only) */}
      <aside className="hidden md:flex w-80 bg-white border-r border-gray-100 flex-col sticky top-0 h-screen z-50">
        <div className="p-8 border-b border-gray-50 flex items-center gap-4">
          <div className="bg-emerald-600 text-white p-2.5 rounded-2xl shadow-lg shadow-emerald-200">
            <Database size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none uppercase">{settings.TURF_NAME}</h1>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Admin</p>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2">
          {navItems.map((item) => (
            <NavItem key={item.to} to={item.to} label={item.label} icon={item.icon} active={window.location.pathname === item.to} />
          ))}
        </nav>

        <div className="p-6 border-t border-gray-50">
          <button
            onClick={() => { logout(); navigate('/admin/login'); }}
            className="w-full flex items-center justify-between p-5 rounded-2xl bg-gray-900 text-white hover:bg-black transition-all group"
          >
            <div className="flex items-center gap-3">
              <LogOut size={18} className="text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">Log out</span>
            </div>
            <ChevronRight size={14} className="opacity-30 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative pb-20">
        <header className="hidden md:flex bg-white/80 backdrop-blur-md px-10 h-24 items-center justify-between sticky top-0 z-40 border-b border-gray-100">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase leading-none">Settings</h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">System Calibration</p>
            </div>
            <div className="h-10 w-[1px] bg-gray-100"></div>
            <div className="flex flex-col">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">{currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
              <p className="text-xl font-black text-gray-900 tracking-tighter tabular-nums">{currentTime.toLocaleTimeString()}</p>
            </div>
          </div>
        </header>

        <div className="p-6 md:p-10 max-w-5xl mx-auto w-full">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Fetching Global Config...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-10">
              
              {message.text && (
                <div className={`p-6 rounded-[1.5rem] flex items-center gap-4 border-2 animate-in fade-in slide-in-from-top-4 duration-500 ${
                  message.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                    : 'bg-red-50 border-red-100 text-red-700'
                }`}>
                  <div className={`p-2 rounded-xl text-white ${message.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                    {message.type === 'success' ? <CheckCircle size={18} /> : <Info size={18} />}
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest">{message.text}</p>
                </div>
              )}

              {/* Pricing Calibration */}
              <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-12 shadow-2xl shadow-emerald-900/5 border border-gray-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                  <TrendingUp size={120} className="text-emerald-950" />
                </div>

                <div className="flex items-center gap-4 mb-10">
                  <div className="bg-emerald-500 text-white p-3 rounded-2xl shadow-lg shadow-emerald-200">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tighter uppercase leading-none">Pricing Strategy</h3>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Hourly Rates & Variations</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                  <div className="space-y-6">
                    <label className="block">
                      <span className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
                        <Sun size={14} className="text-yellow-500" /> Weekday Day Price
                      </span>
                      <div className="relative group">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                        <input
                          type="number"
                          value={settings.PRICE_DAY}
                          onChange={(e) => handleInputChange('PRICE_DAY', e.target.value)}
                          className="w-full bg-gray-50 border-2 border-slate-100 focus:border-emerald-500/30 focus:bg-white p-5 pl-12 rounded-2xl outline-none transition-all font-black text-lg text-gray-900"
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
                        <Moon size={14} className="text-slate-800" /> Weekday Night Price
                      </span>
                      <div className="relative group">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                        <input
                          type="number"
                          value={settings.PRICE_NIGHT}
                          onChange={(e) => handleInputChange('PRICE_NIGHT', e.target.value)}
                          className="w-full bg-gray-50 border-2 border-slate-100 focus:border-emerald-500/30 focus:bg-white p-5 pl-12 rounded-2xl outline-none transition-all font-black text-lg text-gray-900"
                        />
                      </div>
                    </label>
                  </div>

                  <div className="space-y-6">
                    <label className="block">
                      <span className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
                        <Sun size={14} className="text-emerald-500" /> Weekend Day Price
                      </span>
                      <div className="relative group">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                        <input
                          type="number"
                          value={settings.PRICE_WEEKEND_DAY}
                          onChange={(e) => handleInputChange('PRICE_WEEKEND_DAY', e.target.value)}
                          className="w-full bg-gray-50 border-2 border-slate-100 focus:border-emerald-500/30 focus:bg-white p-5 pl-12 rounded-2xl outline-none transition-all font-black text-lg text-gray-900"
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
                        <Moon size={14} className="text-emerald-950" /> Weekend Night Price
                      </span>
                      <div className="relative group">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                        <input
                          type="number"
                          value={settings.PRICE_WEEKEND_NIGHT}
                          onChange={(e) => handleInputChange('PRICE_WEEKEND_NIGHT', e.target.value)}
                          className="w-full bg-gray-50 border-2 border-slate-100 focus:border-emerald-500/30 focus:bg-white p-5 pl-12 rounded-2xl outline-none transition-all font-black text-lg text-gray-900"
                        />
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Operational Thresholds */}
              <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-12 shadow-2xl shadow-emerald-900/5 border border-gray-100">
                <div className="flex items-center gap-4 mb-10">
                  <div className="bg-emerald-950 text-white p-3 rounded-2xl">
                    <Clock size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tighter uppercase leading-none">Operational Thresholds</h3>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Timeline & Access Windows</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                  <label className="block">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-4">Day/Night Split Hour</span>
                    <select
                      value={settings.PRICE_TRANSITION_HOUR}
                      onChange={(e) => handleInputChange('PRICE_TRANSITION_HOUR', e.target.value)}
                      className="w-full bg-gray-50 border-2 border-slate-100 p-5 rounded-2xl outline-none transition-all font-black text-lg text-gray-900"
                    >
                      {[...Array(24)].map((_, i) => (
                        <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-4">Opening Hour</span>
                    <select
                      value={settings.TURF_OPEN_HOUR}
                      onChange={(e) => handleInputChange('TURF_OPEN_HOUR', e.target.value)}
                      className="w-full bg-gray-50 border-2 border-slate-100 p-5 rounded-2xl outline-none transition-all font-black text-lg text-gray-900"
                    >
                      {[...Array(24)].map((_, i) => (
                        <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-4">Closing Hour</span>
                    <select
                      value={settings.TURF_CLOSE_HOUR}
                      onChange={(e) => handleInputChange('TURF_CLOSE_HOUR', e.target.value)}
                      className="w-full bg-gray-50 border-2 border-slate-100 p-5 rounded-2xl outline-none transition-all font-black text-lg text-gray-900"
                    >
                      {[...Array(24)].map((_, i) => (
                        <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <label className="block">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-4">Hold Duration (Minutes)</span>
                    <div className="relative group">
                      <input
                        type="number"
                        value={settings.HOLD_DURATION_MINUTES}
                        onChange={(e) => handleInputChange('HOLD_DURATION_MINUTES', e.target.value)}
                        className="w-full bg-gray-50 border-2 border-slate-100 p-5 rounded-2xl outline-none transition-all font-black text-lg text-gray-900"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-4">Venue Name</span>
                    <div className="relative group">
                      <input
                        type="text"
                        value={settings.TURF_NAME}
                        onChange={(e) => handleInputChange('TURF_NAME', e.target.value)}
                        className="w-full bg-gray-50 border-2 border-slate-100 p-5 rounded-2xl outline-none transition-all font-black text-base text-gray-900"
                        placeholder="The Turf"
                      />
                    </div>
                  </label>

                  <label className="block md:col-span-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-4">Venue Location</span>
                    <div className="relative group">
                      <input
                        type="text"
                        value={settings.TURF_LOCATION}
                        onChange={(e) => handleInputChange('TURF_LOCATION', e.target.value)}
                        className="w-full bg-gray-50 border-2 border-slate-100 p-5 rounded-2xl outline-none transition-all font-black text-base text-gray-900"
                        placeholder="Plot no 491, Madhavapuri Hills..."
                      />
                    </div>
                  </label>

                  <label className="block md:col-span-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-4">UPI ID for Payments</span>
                    <div className="relative group">
                      <input
                        type="text"
                        value={settings.UPI_ID}
                        onChange={(e) => handleInputChange('UPI_ID', e.target.value)}
                        className="w-full bg-gray-50 border-2 border-slate-100 p-5 rounded-2xl outline-none transition-all font-black text-base text-gray-900"
                        placeholder="yourname@upi"
                      />
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-6">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 text-white font-black p-8 rounded-[2rem] shadow-2xl shadow-emerald-500/20 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-4 group"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Committing Changes...
                    </>
                  ) : (
                    <>
                      <Save size={20} className="group-hover:scale-125 transition-transform" />
                      Save Configurations
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setSaving(true);
                      await adminAPI.syncSlots();
                      setMessage({ type: 'success', text: 'Infrastructure node synchronized with latest pricing.' });
                    } catch (e) {
                      setMessage({ type: 'error', text: 'Synchronization Interrupt.' });
                    } finally {
                      setSaving(false);
                    }
                  }}
                  className="bg-gray-900 hover:bg-black text-white px-10 rounded-[2rem] font-black uppercase text-[10px] tracking-widest hidden md:flex items-center justify-center gap-3"
                >
                  <Database size={16} /> Re-Sync Infrastructure
                </button>
              </div>

              <div className="bg-emerald-950 p-8 rounded-[2rem] text-emerald-100/60 border border-white/5 flex items-start gap-4">
                <Info size={24} className="shrink-0 text-emerald-400" />
                <p className="text-[10px] md:text-xs font-medium leading-relaxed">
                  <span className="font-black text-white uppercase">Critical Alert:</span> Updating these configurations will impact all freshly generated slots. To apply prices to existing free slots, use the <span className="text-white font-bold underline">Re-Sync Infrastructure</span> protocol after saving. Booked slots will remain unaffected to preserve historical data integrity.
                </p>
              </div>

            </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminSettings;
