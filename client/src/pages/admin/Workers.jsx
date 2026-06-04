import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard,
  Calendar,
  Activity,
  Briefcase,
  PieChart,
  User,
  Mail,
  Phone,
  Trash2,
  ShieldAlert,
  Lock,
  Edit2,
  ShieldCheck,
  Settings, 
  Clock,
  Plus,
  X,
  Zap,
    Loader2,
  UserPlus,
  ArrowUpRight,
  Database,
  ArrowRight,
  RefreshCcw,
  Cpu,
  Layers,
  CircleDot
} from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import { adminAPI } from '../../api/client';
import AdminSidebar from '../../components/AdminSidebar';
import AdminLayout from '../../components/AdminLayout';

const AdminWorkers = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchWorkers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getWorkers();
      setWorkers(response.data.workers || []);
    } catch (error) {
      setError('Biometric registry sync failure.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkers();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [fetchWorkers]);

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
      setError(error.response?.data?.message || 'Identity enrollment failure.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWorker = async (workerId) => {
    if (!window.confirm('Neutralize this operative registry?')) return;
    try {
      await adminAPI.deleteWorker(workerId);
      await fetchWorkers();
    } catch (error) {
      setError('Neutralization protocol failure.');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6">
        <div className="relative">
            <div className="w-24 h-24 border-4 border-blue-100 border-t-emerald-600 rounded-full animate-spin"></div>
            <User className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600 animate-pulse" size={32} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Accessing Personnel Registry...</p>
    </div>
  );

    return (
        <AdminLayout title="Personnel Registry" subtitle="/ Operational Assets">
            
            {/* Personnel KPI Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                {[
                    { label: 'Total Operatives', value: workers.length, icon: <User className="text-emerald-500" /> },
                    { label: 'Active Deployment', value: workers.filter(w => (w.assignedSlots?.length || 0) > 0).length, icon: <Zap className="text-emerald-500" /> },
                    { label: 'Registry Efficiency', value: '94.8%', icon: <Activity className="text-emerald-500" /> },
                    { label: 'Node Capacity', value: 'High', icon: <Database className="text-slate-500" /> }
                ].map((kpi, idx) => (
                    <div key={idx} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-2xl transition-all group overflow-hidden relative">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-slate-900 group-hover:scale-110 transition-transform duration-700">
                            {kpi.icon}
                        </div>
                        <div className="flex items-center justify-between mb-6">
                            <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors">
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
                            <div className="w-10 h-1 bg-emerald-600 rounded-full"></div> Neural Identity Enrollment Matrix
                        </h3>
                    </div>
                    <form onSubmit={handleCreateWorker} className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 italic">Legal Identity</label>
                            <div className="relative group">
                                <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-600 transition-colors" size={18} />
                                <input name="name" value={formData.name} onChange={handleInputChange} required placeholder="FULL NAME" className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-100 p-5 pl-16 rounded-2xl font-black text-xs uppercase tracking-widest outline-none transition-all italic placeholder:text-slate-200" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 italic">Comm Protocol (Email)</label>
                            <div className="relative group">
                                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-600 transition-colors" size={18} />
                                <input name="email" value={formData.email} onChange={handleInputChange} type="email" required placeholder="OPERATIVE@THETURF.COM" className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-100 p-5 pl-16 rounded-2xl font-black text-xs uppercase tracking-widest outline-none transition-all italic placeholder:text-slate-200" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 italic">Primary Comm Link</label>
                            <div className="relative group">
                                <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-600 transition-colors" size={18} />
                                <input name="phone" value={formData.phone} onChange={handleInputChange} type="tel" required placeholder="+91 00000 00000" className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-100 p-5 pl-16 rounded-2xl font-black text-xs uppercase tracking-widest outline-none transition-all italic placeholder:text-slate-200" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 italic">Secure Access Key</label>
                            <div className="relative group">
                                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-600 transition-colors" size={18} />
                                <input name="password" value={formData.password} onChange={handleInputChange} type="password" required placeholder="••••••••" className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-100 p-5 pl-16 rounded-2xl font-black text-xs uppercase tracking-widest outline-none transition-all italic placeholder:text-slate-200" />
                            </div>
                        </div>
                        <div className="md:col-span-2 flex justify-end pt-4">
                            <button type="submit" disabled={submitting} className="w-full md:w-auto bg-slate-950 text-white px-16 py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-emerald-600 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-4 italic">
                                {submitting ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
                                {submitting ? 'Encrypting Identity...' : 'Confirm Enrollment protocol'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Workers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
                {workers.map(worker => (
                    <div key={worker._id} className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm hover:shadow-2xl hover:border-emerald-600 hover:-translate-y-2 transition-all duration-500 group flex flex-col justify-between min-h-[450px] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.01] rounded-full blur-[40px]"></div>
                        
                        <div className="space-y-10 relative z-10">
                            <div className="flex justify-between items-start">
                                <div className="w-16 h-16 bg-slate-900 text-white rounded-[1.5rem] flex items-center justify-center shadow-xl group-hover:bg-emerald-600 transition-all italic font-black text-xl tabular-nums">
                                    {worker.name.slice(0, 2).toUpperCase()}
                                </div>
                                <button onClick={() => handleDeleteWorker(worker._id)} className="p-4 bg-rose-50 text-rose-300 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-sm">
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Operative Identity</p>
                                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic leading-none group-hover:text-emerald-600 transition-colors">{worker.name}</h3>
                                <div className="space-y-2 mt-6">
                                    <div className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">
                                        <Mail size={14} className="text-emerald-600" />
                                        {worker.email}
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-widest italic tabular-nums">
                                        <Phone size={14} className="text-slate-400" />
                                        +91 {worker.phone}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-10 mt-10 border-t border-slate-50 group-hover:border-blue-50 transition-colors relative z-10">
                            <div className="flex items-center justify-between mb-8 px-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                    <span className="text-[10px] font-black text-slate-900 uppercase italic tracking-widest">Active Asset</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Node Load</p>
                                    <p className="text-lg font-black text-slate-900 italic tabular-nums leading-none">{worker.assignedSlots?.length || 0} Slots</p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate(`/admin/workers/${worker._id}`)}
                                className="w-full bg-slate-950 text-white py-5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 shadow-xl italic"
                            >
                                <Edit2 size={16} /> View Registry Profile
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Registry Control Footer */}
            <div className="bg-slate-900 rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-600/10 blur-[80px] rounded-full group-hover:bg-emerald-600/20 transition-all duration-1000"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                    <div className="flex items-center gap-8">
                        <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 text-emerald-500 shadow-2xl backdrop-blur-md">
                            <Database size={36} />
                        </div>
                        <div>
                            <h4 className="text-3xl font-black tracking-tighter uppercase italic leading-none mb-3">Master Personnel <span className="text-emerald-500">Infrastructure</span></h4>
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] italic">Biometric Synchronization Active | 0 Protocol Violations Detected</p>
                        </div>
                    </div>
                    <button className="bg-emerald-600 hover:bg-white hover:text-emerald-600 text-white px-12 py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-2xl active:scale-95 flex items-center gap-4 italic">
                        Extract Master Registry <ArrowUpRight size={18} />
                    </button>
                </div>
            </div>

        </AdminLayout>
    );
};

export default AdminWorkers;
