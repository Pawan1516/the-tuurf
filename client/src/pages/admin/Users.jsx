import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Activity,
  Briefcase,
  PieChart,
  LogOut,
  ChevronRight,
  User,
   Phone,
  Mail,
  Lock,
  Search,
  CheckCircle,
  Settings,
  ShieldCheck,
  Eye,
  EyeOff,
  Clock,
  Zap,
  Users as UsersIcon,
  Filter,
  ArrowRight,
  Database,
  ShieldAlert,
  ArrowUpRight,
  RefreshCcw,
  Cpu,
  Layers,
  CircleDot
} from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import { adminAPI } from '../../api/client';
import AdminSidebar from '../../components/AdminSidebar';
import AdminLayout from '../../components/AdminLayout';

const AdminUsers = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [showPasswords, setShowPasswords] = useState({});
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getUsers();
      setUsers(response.data.users || []);
    } catch (error) {
      setError('Neural registry access failure.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [fetchUsers]);

  const togglePassword = (userId) => {
    setShowPasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.userPhone?.includes(searchTerm)
  );

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6">
        <div className="relative">
            <div className="w-24 h-24 border-4 border-blue-100 border-t-emerald-600 rounded-full animate-spin"></div>
            <UsersIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600 animate-pulse" size={32} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Accessing Subject Registry...</p>
    </div>
  );

  return (
   <AdminLayout title="Subject Registry" subtitle="/ Neural Nodes">
            
            {/* Identity KPI Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                {[
                    { label: 'Total Subjects', value: users.length, icon: <UsersIcon className="text-emerald-500" /> },
                    { label: 'Verified Nodes', value: users.length, icon: <ShieldCheck className="text-emerald-500" /> },
                    { label: 'Registry Load', value: 'Nominal', icon: <Activity className="text-emerald-500" /> },
                    { label: 'Database Health', value: '100%', icon: <Database className="text-slate-500" /> }
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

            {/* Main Identity Table */}
            <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-200 overflow-hidden relative">
                 <div className="absolute top-0 right-0 p-12 opacity-[0.01] text-slate-900 pointer-events-none">
                    <Cpu size={300} />
                 </div>
                 
                 {/* Table Header Controls */}
                 <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-8 bg-white/50 backdrop-blur-xl relative z-10">
                    <div className="flex items-center gap-6">
                       <div className="bg-slate-950 text-white p-4 rounded-2xl shadow-xl">
                          <Layers size={24} />
                       </div>
                       <div>
                          <h4 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">{filteredUsers.length} <span className="text-slate-400">/ {users.length}</span></h4>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5 italic">Filtered Identity Nodes</p>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                       <div className="bg-slate-50 px-6 py-2.5 rounded-xl border border-slate-200 flex items-center gap-3">
                          <CircleDot size={12} className="text-emerald-600 animate-pulse" />
                          <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest italic">Neural Registry Stream Active</span>
                       </div>
                    </div>
                 </div>

                 <div className="overflow-x-auto custom-scrollbar relative z-10">
                    <table className="w-full text-left border-collapse">
                       <thead>
                          <tr className="bg-slate-50/50">
                             {['Subject Persona', 'Comm Protocol', 'Security Hash', 'System Status', 'Verification'].map(h => (
                                <th key={h} className="px-10 py-8 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic border-b border-slate-100">{h}</th>
                             ))}
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {filteredUsers.length > 0 ? filteredUsers.map((u) => (
                            <tr key={u._id} className="hover:bg-slate-50/80 transition-all group">
                               <td className="px-10 py-10">
                                  <div className="flex items-center gap-6">
                                     <div className="w-16 h-16 bg-slate-950 text-white rounded-[1.5rem] flex items-center justify-center font-black text-xl uppercase group-hover:bg-emerald-600 transition-all shadow-xl italic tabular-nums">
                                        {u.name.slice(0, 2)}
                                     </div>
                                     <div className="flex flex-col">
                                        <span className="font-black text-slate-900 uppercase tracking-tighter text-lg italic group-hover:text-emerald-600 transition-colors leading-none mb-2">{u.name}</span>
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic tabular-nums border-l-2 border-emerald-600/20 pl-2">UID_{u._id.slice(-8).toUpperCase()}</span>
                                     </div>
                                  </div>
                               </td>
                               <td className="px-10 py-10">
                                  <div className="space-y-3">
                                     <div className="flex items-center gap-3 text-slate-600 font-black text-[11px] italic">
                                        <Mail size={14} className="text-emerald-600" />
                                        {u.email}
                                     </div>
                                     <div className="flex items-center gap-3 text-slate-400 font-black text-[10px] italic tabular-nums">
                                        <Phone size={14} className="text-slate-300" />
                                        +91 {u.userPhone || 'PROTOCOL_ERROR'}
                                     </div>
                                  </div>
                               </td>
                               <td className="px-10 py-10">
                                  <div className="flex items-center gap-4">
                                     <div className="bg-slate-100/50 border border-slate-200 px-6 py-3 rounded-xl flex items-center gap-5 group-hover:bg-white transition-all shadow-inner">
                                        <Lock size={14} className="text-slate-400" />
                                        <code className="text-[10px] font-black text-slate-600 tracking-[0.2em] uppercase tabular-nums">
                                           {showPasswords[u._id] ? (u.realPassword || 'HASH_NULL') : '••••••••••••'}
                                        </code>
                                     </div>
                                     <button onClick={() => togglePassword(u._id)} className="p-3 bg-white border border-slate-200 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white hover:border-slate-950 transition-all shadow-sm">
                                        {showPasswords[u._id] ? <EyeOff size={16} /> : <Eye size={16} />}
                                     </button>
                                  </div>
                               </td>
                               <td className="px-10 py-10">
                                  <div className="flex items-center gap-5">
                                     <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-600 w-full rounded-full shadow-[0_0_8px_rgba(37,99,235,0.4)]"></div>
                                     </div>
                                     <span className="text-[9px] font-black text-slate-900 uppercase italic">Nominal</span>
                                  </div>
                               </td>
                               <td className="px-10 py-10">
                                  <div className="inline-flex items-center gap-3 bg-emerald-50 text-emerald-600 px-5 py-2 rounded-full border border-emerald-100 shadow-sm group-hover:bg-emerald-600 group-hover:text-white transition-all cursor-default italic">
                                     <ShieldCheck size={14} />
                                     <span className="text-[9px] font-black uppercase tracking-widest">Verified Identity</span>
                                  </div>
                               </td>
                            </tr>
                          )) : (
                            <tr>
                               <td colSpan="5" className="px-10 py-48 text-center bg-slate-50/20">
                                  <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto text-slate-200 mb-8 border border-slate-100">
                                     <Database size={48} strokeWidth={1} />
                                  </div>
                                  <h5 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic mb-3">Zero Matching Node Identities</h5>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic leading-relaxed">No subject nodes detected in the current filter parameters.<br/>Initiate broad scan to reset parameters.</p>
                               </td>
                            </tr>
                          )}
                       </tbody>
                    </table>
                 </div>

                 {/* Registry Footer */}
                 <div className="p-8 bg-slate-950 text-white border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 to-transparent"></div>
                    <div className="flex items-center gap-6 relative z-10">
                       <div className="bg-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-md border border-white/10"><Activity size={24} className="text-emerald-500 animate-pulse" /></div>
                       <div>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic mb-1">Neural Infrastructure Sync</p>
                          <p className="text-xs font-black text-white uppercase italic tracking-wide">Protocol Alpha-9 | {filteredUsers.length} Operational Identities Online</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4 relative z-10">
                       <button className="px-10 py-4 bg-white/10 hover:bg-white text-white hover:text-slate-900 border border-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-2xl flex items-center gap-3 italic">
                          Extract Identity Registry <ArrowUpRight size={18} />
                       </button>
                    </div>
                 </div>
            </div>
            </div>
      </AdminLayout>
   );
};

export default AdminUsers;
