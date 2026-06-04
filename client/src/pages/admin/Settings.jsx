import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  TrendingUp,
  User,
  ShieldCheck,
  Globe,
  Cpu,
  Layers,
  ArrowRight,
  ShieldAlert,
  Loader2,
  MousePointer2,
  Lock,
  Wallet,
  RefreshCcw,
  CircleDot
} from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import { adminAPI } from '../../api/client';
import AdminSidebar from '../../components/AdminSidebar';

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

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getSettings();
      if (response.data.success) {
        setSettings(prev => ({ ...prev, ...response.data.settings }));
      }
    } catch (error) {
      console.error('Settings sync failure:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [fetchSettings]);

  const handleSave = async (e) => {
    if(e) e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await adminAPI.saveSettings(settings);
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Global infrastructure calibrated successfully.' });
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
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

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6">
        <div className="relative">
            <div className="w-24 h-24 border-4 border-blue-100 border-t-emerald-600 rounded-full animate-spin"></div>
            <SettingsIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600 animate-pulse" size={32} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Accessing Calibration Registry...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex font-sans selection:bg-emerald-600/20">
      <AdminSidebar user={user} logout={logout} />

      <main className="flex-1 overflow-y-auto pb-24 relative custom-scrollbar">
        {/* BI Style Top Bar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-[40] px-10 py-5 flex items-center justify-between">
            <div className="flex items-center gap-8">
                <div>
                    <h1 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                        <SettingsIcon className="text-emerald-600" size={26} /> 
                        System Calibration <span className="text-slate-400">/ Global Config</span>
                    </h1>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Core Configuration Hub v6.1</p>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="hidden xl:flex items-center gap-4 bg-slate-50 border border-slate-200 p-2 rounded-2xl">
                    <div className="px-4 py-1.5 border-r border-slate-200">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Local Time</p>
                        <p className="text-xs font-black text-slate-900 tabular-nums italic">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                    </div>
                    <div className="px-4 py-1.5">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Infrastructure Health</p>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-[10px] font-black text-emerald-600 uppercase">Optimal</span>
                        </div>
                    </div>
                </div>
                <button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="flex items-center gap-4 bg-emerald-600 hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 italic"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {saving ? 'Synchronizing...' : 'Commit Configuration'}
                </button>
            </div>
        </header>

        <div className="max-w-[1600px] mx-auto p-10 space-y-10">
            
            {message.text && (
                <div className={`p-8 rounded-[2.5rem] flex items-center gap-6 border-4 shadow-2xl animate-fade-in ${message.type === 'success' ? 'bg-emerald-600 border-white text-white' : 'bg-rose-600 border-white text-white'}`}>
                    <div className="bg-white/20 p-4 rounded-2xl">
                        {message.type === 'success' ? <CheckCircle size={24} /> : <ShieldAlert size={24} />}
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80 mb-1 italic">Structural Broadcast</p>
                        <p className="text-lg font-black uppercase tracking-tight italic leading-none">{message.text}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                
                {/* Pricing Strategy Calibration */}
                <div className="lg:col-span-7 bg-white rounded-[3.5rem] p-12 border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-12 opacity-[0.02] text-emerald-600 group-hover:rotate-12 transition-all duration-1000">
                        <TrendingUp size={250} />
                    </div>
                    <div className="flex items-center gap-8 border-b border-slate-100 pb-10 mb-10 relative z-10">
                        <div className="p-5 bg-slate-950 text-white rounded-[1.5rem] shadow-xl"><TrendingUp size={28} /></div>
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 italic">Pricing <span className="text-emerald-600">Calibration Matrix</span></h3>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5 italic">Revenue Optimization & Economic Tier Logic</p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 relative z-10">
                        <div className="space-y-10">
                            <PriceInput label="Weekday Primary Rate" value={settings.PRICE_DAY} onChange={(val) => handleInputChange('PRICE_DAY', val)} icon={<Sun size={18} className="text-amber-500" />} />
                            <PriceInput label="Weekday Nocturnal Rate" value={settings.PRICE_NIGHT} onChange={(val) => handleInputChange('PRICE_NIGHT', val)} icon={<Moon size={18} className="text-emerald-600" />} />
                        </div>
                        <div className="space-y-10">
                            <PriceInput label="Weekend Peak Rate" value={settings.PRICE_WEEKEND_DAY} onChange={(val) => handleInputChange('PRICE_WEEKEND_DAY', val)} icon={<Zap size={18} className="text-emerald-500" />} />
                            <PriceInput label="Weekend Premium Rate" value={settings.PRICE_WEEKEND_NIGHT} onChange={(val) => handleInputChange('PRICE_WEEKEND_NIGHT', val)} icon={<Activity size={18} className="text-rose-600" />} />
                        </div>
                    </div>
                </div>

                {/* Operational Thresholds Hub */}
                <div className="lg:col-span-5 bg-white rounded-[3.5rem] p-12 border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-12 opacity-[0.02] text-slate-900 group-hover:scale-110 transition-all duration-1000">
                        <Clock size={250} />
                    </div>
                    <div className="flex items-center gap-8 border-b border-slate-100 pb-10 mb-10 relative z-10">
                        <div className="p-5 bg-emerald-600 text-white rounded-[1.5rem] shadow-xl"><Clock size={28} /></div>
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 italic">Temporal <span className="text-slate-400">Parameters</span></h3>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5 italic">Shift Windows & Synchronization Thresholds</p>
                        </div>
                    </div>

                    <div className="space-y-10 relative z-10">
                        <div className="grid grid-cols-2 gap-8">
                            <SelectInput label="Transition Hour" value={settings.PRICE_TRANSITION_HOUR} onChange={(val) => handleInputChange('PRICE_TRANSITION_HOUR', val)} options={[...Array(24)].map((_, i) => ({ val: i, label: `${i.toString().padStart(2, '0')}:00 HRS` }))} />
                            <NumberInput label="Node Hold Duration" value={settings.HOLD_DURATION_MINUTES} onChange={(val) => handleInputChange('HOLD_DURATION_MINUTES', val)} unit="MIN" />
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                            <SelectInput label="Arena Activation" value={settings.TURF_OPEN_HOUR} onChange={(val) => handleInputChange('TURF_OPEN_HOUR', val)} options={[...Array(24)].map((_, i) => ({ val: i, label: `${i.toString().padStart(2, '0')}:00 HRS` }))} />
                            <SelectInput label="Arena Termination" value={settings.TURF_CLOSE_HOUR} onChange={(val) => handleInputChange('TURF_CLOSE_HOUR', val)} options={[...Array(24)].map((_, i) => ({ val: i, label: `${i.toString().padStart(2, '0')}:00 HRS` }))} />
                        </div>
                    </div>
                </div>

                {/* Global Platform Identity & Ledger */}
                <div className="lg:col-span-12 bg-slate-950 rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-12 opacity-[0.03] text-emerald-500 group-hover:-translate-x-10 transition-all duration-[2000ms]">
                        <Globe size={450} />
                    </div>
                    
                    <div className="flex items-center gap-8 border-b border-white/5 pb-10 mb-12 relative z-10">
                        <div className="p-5 bg-emerald-600 text-white rounded-[1.5rem] shadow-2xl"><Globe size={28} /></div>
                        <div>
                            <h3 className="text-3xl font-black uppercase tracking-tighter italic">Global Platform <span className="text-emerald-500">Identity Registry</span></h3>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1.5 italic">Geographic Location & Settlement Infrastructure Config</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 relative z-10">
                        <TextInput label="Platform Alias" value={settings.TURF_NAME} onChange={(val) => handleInputChange('TURF_NAME', val)} icon={<Cpu size={20} />} />
                        <TextInput label="Settlement Ledger (UPI)" value={settings.UPI_ID} onChange={(val) => handleInputChange('UPI_ID', val)} icon={<Wallet size={20} />} />
                        <TextInput label="Physical Deployment Site" value={settings.TURF_LOCATION} onChange={(val) => handleInputChange('TURF_LOCATION', val)} icon={<Database size={20} />} />
                    </div>
                </div>
            </div>

            {/* Safety Protocol Banner */}
            <div className="p-12 bg-emerald-600 rounded-[3.5rem] shadow-xl text-white flex flex-col md:flex-row items-center gap-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:rotate-45 transition-all duration-1000">
                    <ShieldAlert size={180} />
                </div>
                <div className="bg-white/10 p-8 rounded-[2rem] shadow-2xl backdrop-blur-md border border-white/10">
                    <Info size={40} className="text-white" />
                </div>
                <div className="space-y-4 relative z-10">
                    <h4 className="text-2xl font-black uppercase tracking-tighter italic leading-none">Infrastructure Integrity Notice</h4>
                    <p className="text-sm font-bold opacity-90 leading-relaxed max-w-5xl italic uppercase tracking-wider">
                        Modification of these operational variables impacts all future node cluster generations. To force-recalibrate active availability segments, please execute the <span className="text-slate-900 bg-white px-2 py-0.5 rounded-md mx-1 font-black">SYSTEM_REBOOT</span> protocol from the AI Command Hub.
                    </p>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
};

const PriceInput = ({ label, value, onChange, icon }) => (
  <div className="space-y-4">
    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 italic flex items-center gap-3">
       {icon} {label}
    </label>
    <div className="relative group">
       <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 font-black italic text-xl">₹</span>
       <input 
         type="number" 
         value={value} 
         onChange={(e) => onChange(e.target.value)} 
         className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-100 p-6 pl-14 rounded-2xl font-black text-2xl text-slate-900 outline-none transition-all italic tabular-nums group-hover:bg-white" 
       />
    </div>
  </div>
);

const SelectInput = ({ label, value, onChange, options }) => (
  <div className="space-y-4">
    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 italic">{label}</label>
    <div className="relative group">
        <select 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-100 p-5 rounded-xl font-black text-[11px] text-slate-900 outline-none transition-all italic cursor-pointer appearance-none uppercase tracking-widest group-hover:bg-white"
        >
           {options.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
        </select>
        <ChevronRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 rotate-90 pointer-events-none" />
    </div>
  </div>
);

const NumberInput = ({ label, value, onChange, unit }) => (
  <div className="space-y-4">
    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 italic">{label}</label>
    <div className="relative group">
       <input 
         type="number" 
         value={value} 
         onChange={(e) => onChange(e.target.value)} 
         className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-100 p-5 rounded-xl font-black text-[11px] text-slate-900 outline-none transition-all italic group-hover:bg-white" 
       />
       <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-black text-[8px] uppercase tracking-widest italic">{unit}</span>
    </div>
  </div>
);

const TextInput = ({ label, value, onChange, icon }) => (
  <div className="space-y-4">
    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 italic flex items-center gap-3">
       {icon} {label}
    </label>
    <input 
      type="text" 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      className="w-full bg-white/5 border-2 border-transparent focus:border-emerald-500/30 p-6 rounded-2xl font-black text-[11px] text-white outline-none transition-all italic tracking-widest uppercase placeholder:text-slate-700 hover:bg-white/10" 
    />
  </div>
);

export default AdminSettings;
