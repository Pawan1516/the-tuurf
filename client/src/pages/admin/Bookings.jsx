import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Activity, 
  Calendar, 
  Download, 
  ShieldCheck, 
  User, 
  Clock, 
  ChevronRight, 
  Filter,
  ArrowUpRight,
  Database,
  ArrowRight,
  RefreshCcw,
  Loader2,
  MousePointer2,
  Layers,
  LayoutDashboard,
  CircleDot,
  FileText,
  Maximize2
} from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar';
import AuthContext from '../../context/AuthContext';
import { adminAPI, receiptsAPI } from '../../api/client';

const AdminBookings = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await adminAPI.getAllBookings();
      if (data.success) {
        setBookings(data.bookings);
      }
    } catch (err) {
      console.error('Booking registry sync failure:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [fetchBookings]);

  const filteredBookings = bookings.filter(b => {
    const matchesFilter = filter === 'all' || b.status === filter;
    const matchesSearch = searchTerm === '' || 
      b._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.userId?.phone?.includes(searchTerm) ||
      b.timeSlot?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleDownloadReceipt = async (id) => {
    try {
        setDownloadingId(id);
        const response = await receiptsAPI.download(id);
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `receipt-${id.slice(-6)}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (err) {
        console.error('Download Protocol Failure:', err);
        alert('Failed to transmit receipt payload.');
    } finally {
        setDownloadingId(null);
    }
  };

  if (loading && bookings.length === 0) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6">
        <div className="relative">
            <div className="w-24 h-24 border-4 border-blue-100 border-t-emerald-600 rounded-full animate-spin"></div>
            <Database className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600 animate-pulse" size={32} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Accessing Booking Registry...</p>
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
                        Booking Log <span className="text-slate-400">/ Registry Audit</span>
                    </h1>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Master Transaction Ledger v4.5</p>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="hidden xl:flex items-center gap-4 bg-slate-50 border border-slate-200 p-2 rounded-2xl">
                    <div className="px-4 py-1.5 border-r border-slate-200">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Local Time</p>
                        <p className="text-xs font-black text-slate-900 tabular-nums italic">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                    </div>
                    <div className="px-4 py-1.5">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Registry Synchronization</p>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-[10px] font-black text-emerald-600 uppercase">Live Nodes</span>
                        </div>
                    </div>
                </div>
                <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                  {['all', 'confirmed', 'pending', 'rejected'].map(p => (
                    <button
                      key={p}
                      onClick={() => setFilter(p)}
                      className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filter === p
                        ? 'bg-white text-emerald-600 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <button onClick={fetchBookings} className="p-3 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-blue-700 transition-all">
                    <RefreshCcw size={20} />
                </button>
            </div>
        </header>

        <div className="max-w-[1600px] mx-auto p-10 space-y-10">
            
            {/* Booking KPI Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                {[
                    { label: 'Total Logs', value: bookings.length, icon: <Database className="text-emerald-500" /> },
                    { label: 'Confirmed Nodes', value: bookings.filter(b => b.status === 'confirmed').length, icon: <ShieldCheck className="text-emerald-500" /> },
                    { label: 'Audit Efficiency', value: '100%', icon: <Activity className="text-emerald-500" /> },
                    { label: 'Database Health', value: 'Optimal', icon: <Layers className="text-slate-500" /> }
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

            {/* Registry Table Hub */}
            <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-200 overflow-hidden relative">
                 <div className="absolute top-0 right-0 p-12 opacity-[0.01] text-slate-900 pointer-events-none">
                    <Layers size={300} />
                 </div>
                 
                 {/* Table Header Controls */}
                 <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-8 bg-white/50 backdrop-blur-xl relative z-10">
                    <div className="flex items-center gap-6">
                       <div className="bg-slate-950 text-white p-4 rounded-2xl shadow-xl">
                          <Database size={24} />
                       </div>
                       <div>
                          <h4 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">{filteredBookings.length} <span className="text-slate-400">/ {bookings.length}</span></h4>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5 italic">Synchronized Transaction Records</p>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-6 flex-1 max-w-xl">
                       <div className="relative flex-1 group">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={16} />
                          <input 
                             type="text" 
                             value={searchTerm}
                             onChange={(e) => setSearchTerm(e.target.value)}
                             placeholder="SEARCH IDENTITY, NODE, OR PAYLOAD..."
                             className="bg-slate-100 border border-slate-200 focus:bg-white focus:border-emerald-600 p-3 pl-12 rounded-xl outline-none text-[10px] font-black text-slate-900 w-full transition-all italic tracking-widest uppercase"
                          />
                       </div>
                       <button className="bg-slate-950 hover:bg-emerald-600 text-white p-3 rounded-xl transition-all shadow-xl active:scale-95 group">
                          <Download size={20} className="group-hover:-translate-y-0.5 transition-transform" />
                       </button>
                    </div>
                 </div>

                 <div className="overflow-x-auto custom-scrollbar relative z-10">
                    <table className="w-full text-left border-collapse">
                       <thead>
                          <tr className="bg-slate-50/50">
                             {['Protocol ID', 'Operational Node', 'Registry Subject', 'Temporal Config', 'Status', 'Audit'].map(h => (
                                <th key={h} className="px-10 py-8 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic border-b border-slate-100">{h}</th>
                             ))}
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {filteredBookings.length > 0 ? (
                             filteredBookings.map((b) => (
                                <tr key={b._id} className="hover:bg-slate-50/80 transition-all group">
                                   <td className="px-10 py-10">
                                      <div className="flex flex-col">
                                         <span className="text-[11px] font-black text-slate-950 tracking-tighter uppercase mb-1 italic group-hover:text-emerald-600 transition-colors tabular-nums">TXN_{b._id.slice(-8).toUpperCase()}</span>
                                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic tabular-nums border-l-2 border-emerald-600/20 pl-2">{new Date(b.createdAt).toLocaleDateString('en-GB')}</span>
                                      </div>
                                   </td>
                                   <td className="px-10 py-10">
                                      <div className="flex items-center gap-4">
                                         <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                                            <Layers size={16} />
                                         </div>
                                         <div className="flex flex-col">
                                            <span className="text-[11px] font-black text-slate-900 uppercase italic tracking-tight leading-none mb-1">{b.turfId?.name || 'MAIN_ARENA'}</span>
                                            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest italic">PROTOCOL_ALPHA</span>
                                         </div>
                                      </div>
                                   </td>
                                   <td className="px-10 py-10">
                                      <div className="flex flex-col">
                                         <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight italic leading-none mb-1">{b.userId?.name || 'GUEST_OPERATIVE'}</span>
                                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic tabular-nums border-l-2 border-slate-200 pl-2">LINK: {b.userId?.phone || 'N/A'}</span>
                                      </div>
                                   </td>
                                   <td className="px-10 py-10">
                                      <div className="bg-white border border-slate-200 px-5 py-2 rounded-xl inline-flex flex-col shadow-sm group-hover:border-blue-100 transition-all">
                                         <span className="text-[10px] font-black text-slate-950 italic tracking-tighter tabular-nums mb-1 leading-none">{b.timeSlot}</span>
                                         <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest italic leading-none">CLUSTER_NODE</span>
                                      </div>
                                   </td>
                                   <td className="px-10 py-10">
                                      <div className={`inline-flex px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border italic shadow-sm items-center gap-2 ${
                                         b.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                         b.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse' :
                                         'bg-rose-50 text-rose-600 border-rose-100'
                                      }`}>
                                         <CircleDot size={10} className={b.status === 'pending' ? 'animate-pulse' : ''} />
                                         {b.status}
                                      </div>
                                   </td>
                                   <td className="px-10 py-10">
                                      <div className="flex items-center gap-3">
                                         <button 
                                            onClick={() => navigate(`/admin/booking/${b._id}`)}
                                            className="bg-white border border-slate-200 p-2.5 rounded-xl text-slate-400 hover:text-emerald-600 hover:border-emerald-600 transition-all shadow-sm active:scale-95 group/btn"
                                            title="Audit Record"
                                         >
                                            <Search size={16} className="group-hover/btn:scale-110 transition-transform" />
                                         </button>
                                          <button 
                                             onClick={() => handleDownloadReceipt(b._id)}
                                             disabled={downloadingId === b._id}
                                             className="bg-white border border-slate-200 p-2.5 rounded-xl text-slate-400 hover:text-slate-950 hover:border-slate-950 transition-all shadow-sm active:scale-95 group/btn disabled:opacity-50"
                                             title="Download Intel"
                                          >
                                             {downloadingId === b._id ? (
                                                <Loader2 size={16} className="animate-spin text-emerald-600" />
                                             ) : (
                                                <Download size={16} className="group-hover/btn:-translate-y-0.5 transition-transform" />
                                             )}
                                          </button>
                                      </div>
                                   </td>
                                </tr>
                             ))
                          ) : (
                             <tr>
                                <td colSpan="6" className="py-48 text-center bg-slate-50/20">
                                   <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto text-slate-200 mb-8 border border-slate-100">
                                      <Calendar size={48} strokeWidth={1} />
                                   </div>
                                   <h5 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic mb-3">Zero Matching Clusters</h5>
                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic leading-relaxed">No registry records detected in the current filter node.<br/>Initiate broad scan to reset parameters.</p>
                                </td>
                             </tr>
                          )}
                       </tbody>
                    </table>
                 </div>

                 {/* Registry Footer */}
                 <div className="p-8 bg-slate-950 text-white border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-10 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 to-transparent"></div>
                    <div className="flex items-center gap-6 relative z-10">
                       <div className="bg-white/10 p-4 rounded-xl shadow-2xl backdrop-blur-md border border-white/10 text-emerald-500">
                          <Activity size={24} className="animate-pulse" />
                       </div>
                       <div>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic mb-1">Pagination Protocol Status</p>
                          <p className="text-xs font-black text-white uppercase italic tracking-wide">Nominal | Displaying Cluster 1 of 1</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4 relative z-10">
                       <button className="px-10 py-4 bg-white/10 hover:bg-white text-white hover:text-slate-900 border border-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-2xl flex items-center gap-3 italic" disabled>
                          Previous Phase
                       </button>
                       <button className="px-10 py-4 bg-white/10 hover:bg-white text-white hover:text-slate-900 border border-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-2xl flex items-center gap-3 italic" disabled>
                          Next Phase
                       </button>
                    </div>
                 </div>
            </div>
        </div>
      </main>
    </div>
  );
};

export default AdminBookings;
