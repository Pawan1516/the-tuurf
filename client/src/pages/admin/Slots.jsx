import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Database, 
  Calendar, 
  Activity, 
  Briefcase, 
  LogOut, 
  ChevronRight, 
  Plus, 
  X, 
  TrendingUp, 
  Clock, 
  Trash2, 
  Settings,
  Zap,
  ShieldCheck,
  PlusCircle,
  ShieldAlert,
  Loader2,
  Cpu,
  RefreshCcw,
  Layers,
  CircleDot,
  BarChart3,
  Maximize2,
  Info,
  ChevronDown
} from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import { slotsAPI, adminAPI } from '../../api/client';
import AdminSidebar from '../../components/AdminSidebar';

const AdminSlots = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [slots, setSlots] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [formData, setFormData] = useState({
    date: '',
    startTime: '',
    endTime: ''
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingData, setBookingData] = useState({
    userName: '',
    userPhone: '',
    amount: '1000'
  });

  const init = useCallback(async () => {
    try {
        setLoading(true);
        const [slotRes, workerRes] = await Promise.all([
            slotsAPI.getAll(),
            adminAPI.getWorkers()
        ]);
        setSlots(Array.isArray(slotRes.data) ? slotRes.data : slotRes.data.slots || []);
        setWorkers(workerRes.data.workers || []);
    } catch (e) {
        setError('Operational synchronization failure.');
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    init();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [init]);

  const handleManualBooking = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await adminAPI.manualBooking({
        slotId: selectedSlot._id,
        ...bookingData
      });
      setShowBookingModal(false);
      setBookingData({ userName: '', userPhone: '', amount: '1000' });
      await init();
    } catch (error) {
      setError(error.response?.data?.message || 'Override protocol failure.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignWorker = async (slotId, workerId) => {
    try {
      setError('');
      await slotsAPI.assignWorker(slotId, workerId);
      await init();
    } catch (error) {
      setError('Assigned operative link failed.');
    }
  };

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await slotsAPI.create(formData);
      setFormData({ date: '', startTime: '', endTime: '' });
      setShowForm(false);
      await init();
    } catch (error) {
      setError(error.response?.data?.message || 'Infrastructure node deployment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm('Neutralize this temporal node?')) return;
    try {
      await slotsAPI.delete(slotId);
      await init();
    } catch (error) {
      setError('Neutralization protocol failed.');
    }
  };

  const formatTime12h = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const groupedSlots = slots.reduce((acc, slot) => {
    const slotDate = new Date(slot.date);
    const dateKey = slotDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(slot);
    return acc;
  }, {});

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6">
        <div className="relative">
            <div className="w-24 h-24 border-4 border-blue-100 border-t-emerald-600 rounded-full animate-spin"></div>
            <Layers className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600 animate-pulse" size={32} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Accessing Temporal Logistics Registry...</p>
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
                        <Database className="text-emerald-600" size={26} /> 
                        Slot Logistics <span className="text-slate-400">/ Temporal Nodes</span>
                    </h1>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Cluster Management System v2.1</p>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="hidden xl:flex items-center gap-4 bg-slate-50 border border-slate-200 p-2 rounded-2xl">
                    <div className="px-4 py-1.5 border-r border-slate-200">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Local Time</p>
                        <p className="text-xs font-black text-slate-900 tabular-nums italic">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                    </div>
                    <div className="px-4 py-1.5">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Registry Status</p>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-[10px] font-black text-emerald-600 uppercase">Synchronized</span>
                        </div>
                    </div>
                </div>
                <button
                  onClick={() => setShowForm(!showForm)}
                  className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all flex items-center gap-3 active:scale-95 ${
                    showForm 
                    ? 'bg-slate-900 text-white shadow-slate-950/20' 
                    : 'bg-emerald-600 text-white shadow-emerald-500/20'
                  }`}
                >
                  {showForm ? <X size={18} /> : <PlusCircle size={18} />}
                  {showForm ? 'Abort Deployment' : 'Deploy New Node'}
                </button>
            </div>
        </header>

        <div className="max-w-[1600px] mx-auto p-10 space-y-10">
            
            {/* Slot KPI Slicers */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                {[
                    { label: 'Total Nodes', value: slots.length, icon: <Database className="text-emerald-500" /> },
                    { label: 'Free Channels', value: slots.filter(s => s.status === 'free').length, icon: <Zap className="text-emerald-500" /> },
                    { label: 'Booked Nodes', value: slots.filter(s => s.status === 'booked').length, icon: <ShieldCheck className="text-emerald-500" /> },
                    { label: 'System Hold', value: slots.filter(s => s.status === 'hold').length, icon: <Clock className="text-amber-500" /> }
                ].map((kpi, idx) => (
                    <div key={idx} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-2xl transition-all group overflow-hidden relative">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-slate-900">
                            {kpi.icon}
                        </div>
                        <div className="flex items-center justify-between mb-6">
                            <div className="p-3 bg-slate-50 rounded-xl">
                                {kpi.icon}
                            </div>
                        </div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">{kpi.label}</p>
                        <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter tabular-nums">{kpi.value}</h3>
                    </div>
                ))}
            </div>

            {error && (
                <div className="bg-rose-50 border border-rose-100 p-6 rounded-[2rem] flex items-center gap-4 text-rose-600 animate-fade-in">
                    <ShieldAlert size={20} />
                    <p className="text-[10px] font-black uppercase tracking-widest italic">{error}</p>
                </div>
            )}

            {showForm && (
                <div className="bg-white rounded-[3.5rem] p-12 border border-slate-200 shadow-2xl animate-fade-up relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-12 opacity-[0.02] text-emerald-600">
                        <Cpu size={250} />
                    </div>
                    <div className="flex items-center justify-between mb-10 relative z-10">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] italic flex items-center gap-4">
                            <div className="w-10 h-1 bg-emerald-600 rounded-full"></div> Deployment Specification Matrix
                        </h3>
                    </div>
                    <form onSubmit={handleCreateSlot} className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Temporal Date</label>
                            <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-100 p-5 rounded-2xl font-black text-xs outline-none transition-all italic [color-scheme:light]" />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Start T-Minus</label>
                            <input type="time" value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})} required className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-100 p-5 rounded-2xl font-black text-xs outline-none transition-all italic [color-scheme:light]" />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Phase End</label>
                            <input type="time" value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} required className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-100 p-5 rounded-2xl font-black text-xs outline-none transition-all italic [color-scheme:light]" />
                        </div>
                        <div className="flex items-end">
                            <button type="submit" disabled={submitting} className="w-full bg-slate-950 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-emerald-600 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-4 italic">
                                {submitting ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
                                Initialize Deployment
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Cluster Visualization */}
            <div className="space-y-12">
                {Object.entries(groupedSlots).sort((a, b) => new Date(a[0]) - new Date(b[0])).map(([date, daySlots]) => (
                    <div key={date} className="space-y-8 bg-white/50 p-8 rounded-[4rem] border border-slate-200/50">
                        <div className="flex items-center gap-8">
                            <div className="bg-slate-950 text-white px-10 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.3em] shadow-xl italic border-b-4 border-emerald-600">
                                {date}
                            </div>
                            <div className="h-px flex-1 bg-slate-200"></div>
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic bg-white px-6 py-2 rounded-xl border border-slate-200">
                                Node Cluster: {daySlots.length}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {daySlots.sort((a, b) => a.startTime.localeCompare(b.startTime)).map(slot => (
                                <div key={slot._id} className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm hover:shadow-2xl hover:border-emerald-600 hover:-translate-y-1 transition-all duration-500 group flex flex-col justify-between min-h-[320px] relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/[0.01] rounded-full blur-[30px]"></div>
                                    
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-8">
                                            <div className="p-3 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                                <Clock size={18} />
                                            </div>
                                            <div className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border italic ${
                                                slot.status === 'booked' ? 'bg-slate-50 text-slate-400 border-slate-100' : 
                                                slot.status === 'hold' ? 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse' :
                                                'bg-emerald-50 text-emerald-600 border-emerald-100'
                                            }`}>
                                                {slot.status}
                                            </div>
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none group-hover:text-emerald-600 transition-colors mb-1 tabular-nums">
                                            {formatTime12h(slot.startTime)}
                                        </h3>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Phase End: {formatTime12h(slot.endTime)}</p>
                                    </div>

                                    <div className="pt-8 mt-8 border-t border-slate-50 group-hover:border-blue-50 transition-colors space-y-6 relative z-10">
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-lg font-black text-slate-900 italic tabular-nums leading-none">₹{slot.price || 1200}</span>
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1.5">Node Yield</span>
                                            </div>
                                            <div className="flex gap-2">
                                                {slot.status === 'free' && (
                                                <button onClick={() => { setSelectedSlot(slot); setShowBookingModal(true); }} className="bg-slate-900 text-white p-3 rounded-xl hover:bg-emerald-600 transition-all shadow-lg active:scale-95">
                                                    <Plus size={16} />
                                                </button>
                                                )}
                                                <button onClick={() => handleDeleteSlot(slot._id)} className="bg-rose-50 text-rose-600 p-3 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-95">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic ml-1">Operative Link</p>
                                            <div className="relative">
                                                <select
                                                  value={slot.assignedWorker?._id || ''}
                                                  onChange={(e) => handleAssignWorker(slot._id, e.target.value)}
                                                  className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-100 py-3.5 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest outline-none transition-all cursor-pointer italic appearance-none group-hover:bg-white"
                                                >
                                                  <option value="">-- UNASSIGNED --</option>
                                                  {workers.map(w => <option key={w._id} value={w._id}>{w.name.toUpperCase()}</option>)}
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
                                                    <ChevronDown size={14} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

        </div>

        {/* Manual Override Modal */}
        {showBookingModal && (
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-fade-in">
                <div className="bg-white rounded-[3.5rem] p-14 w-full max-w-xl shadow-2xl border border-white/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-16 opacity-[0.02] text-emerald-600">
                        <Settings size={200} />
                    </div>
                    <div className="flex justify-between items-start mb-10 relative z-10">
                        <div>
                            <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-3">Manual <span className="text-emerald-600">Override</span></h3>
                            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                                <CircleDot size={12} className="text-emerald-600 animate-pulse" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">{new Date(selectedSlot?.date).toLocaleDateString('en-GB')} | {formatTime12h(selectedSlot?.startTime)}</span>
                            </div>
                        </div>
                        <button onClick={() => setShowBookingModal(false)} className="p-4 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-95">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleManualBooking} className="space-y-8 relative z-10">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 italic">Subject Identity</label>
                            <input required value={bookingData.userName} onChange={(e) => setBookingData({ ...bookingData, userName: e.target.value })} placeholder="FULL NAME" className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-100 p-5 rounded-2xl font-black text-xs uppercase tracking-widest outline-none transition-all italic placeholder:text-slate-200" />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 italic">Comm Link (Mobile)</label>
                            <input required type="tel" value={bookingData.userPhone} onChange={(e) => setBookingData({ ...bookingData, userPhone: e.target.value })} placeholder="+91 00000 00000" className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-100 p-5 rounded-2xl font-black text-xs uppercase tracking-widest outline-none transition-all italic placeholder:text-slate-200" />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 italic">Operational Fee (₹)</label>
                            <input required type="number" value={bookingData.amount} onChange={(e) => setBookingData({ ...bookingData, amount: e.target.value })} className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-100 p-5 rounded-2xl font-black text-xs uppercase tracking-widest outline-none transition-all italic" />
                        </div>
                        
                        <button type="submit" disabled={submitting} className="w-full bg-slate-950 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-emerald-600 transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-4 italic">
                            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                            Confirm Override protocol
                        </button>
                    </form>
                </div>
            </div>
        )}

      </main>
    </div>
  );
};

export default AdminSlots;
