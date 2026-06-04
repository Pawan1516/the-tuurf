import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Calendar, 
  Clock, 
  CheckCircle, 
  Search, 
  Settings, 
  LogOut, 
  Bell, 
  TrendingUp, 
  ShieldCheck, 
  Activity, 
  User, 
  Download, 
  Zap 
} from 'lucide-react';
import { bookingsAPI } from '../../api/client';

const WorkerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const { data } = await bookingsAPI.getAll();
        if (data.success) {
          setBookings(data.bookings);
        }
      } catch (err) {
        console.error('Failed to fetch bookings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
    
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    pending: bookings.filter(b => b.status === 'pending').length,
    revenue: bookings.filter(b => b.status === 'confirmed').reduce((acc, curr) => acc + (curr.totalAmount || 1000), 0)
  };

  const filteredBookings = bookings.filter(b => {
    if (filter === 'all') return true;
    return b.status === filter;
  });

  if (loading) return (
    <div className="min-h-screen premium-gradient flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-blue-100 border-t-emerald-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans selection:bg-emerald-500/30">
      {/* Sidebar - Pro Operations Hub */}
      <div className="hidden lg:flex w-80 bg-slate-950 flex-col border-r border-white/5 relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[80px] rounded-full -mr-16 -mt-16"></div>
        
        <div className="p-10 relative z-10 flex-1">
          <div className="flex items-center gap-3 mb-12">
            <div className="bg-emerald-600 p-2.5 rounded-xl shadow-lg shadow-emerald-500/20">
               <ShieldCheck size={24} className="text-white" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tighter uppercase italic leading-none">
              The <span className="text-emerald-500">Turf</span>
            </h1>
          </div>

          <nav className="space-y-3">
            {[
              { icon: LayoutDashboard, label: 'Dashboard', active: true },
              { icon: Calendar, label: 'Bookings' },
              { icon: Activity, label: 'Live Status' },
              { icon: TrendingUp, label: 'Revenue' },
              { icon: Settings, label: 'Settings' },
            ].map((item) => (
              <button
                key={item.label}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all group ${
                  item.active 
                    ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-500/20' 
                    : 'text-slate-500 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon size={18} className={item.active ? 'text-white' : 'text-slate-500 group-hover:text-emerald-400 transition-colors'} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-10 relative z-10">
           <div className="bg-white/5 border border-white/5 p-6 rounded-3xl mb-8">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Active Node</p>
              <div className="flex items-center gap-3">
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                 <span className="text-[10px] font-black text-white uppercase tracking-tight">Hyd-Main-01</span>
              </div>
           </div>
           <button 
             onClick={logout}
             className="w-full flex items-center gap-4 px-6 py-4 text-rose-400 font-black text-[10px] uppercase tracking-widest hover:bg-rose-500/10 rounded-2xl transition-all"
           >
             <LogOut size={18} /> Exit Terminal
           </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-24 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-10 flex items-center justify-between shrink-0 relative z-40">
           <div className="flex items-center gap-4">
              <div className="lg:hidden bg-slate-900 p-2.5 rounded-xl text-white mr-2"><LayoutDashboard size={20} /></div>
              <div>
                 <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Operations Control</h2>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Ground Level Management v2.4</p>
              </div>
           </div>

           <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-3 px-5 py-2.5 bg-blue-50 text-emerald-600 rounded-xl border border-blue-100 shadow-sm">
                 <Clock size={14} />
                 <span className="text-[10px] font-black uppercase tracking-widest italic">{currentTime.toLocaleTimeString()}</span>
              </div>
              <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-900/20 group hover:bg-emerald-600 transition-colors cursor-pointer">
                 <Bell size={20} className="group-hover:animate-bounce-subtle" />
              </div>
              <div className="flex items-center gap-4 pl-4 border-l border-slate-100">
                 <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-black text-slate-900 uppercase italic leading-none">{user?.name || 'Operator'}</p>
                    <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter mt-1">Ground Admin</p>
                 </div>
                 <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-indigo-700 rounded-2xl shadow-xl border-2 border-white flex items-center justify-center text-white font-black italic">
                    {user?.name?.[0] || 'A'}
                 </div>
              </div>
           </div>
        </header>

        {/* Dashboard Grid */}
        <main className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
           
           {/* Stats Section */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-fade-up">
              {[
                { label: 'Today Bookings', value: stats.total, icon: Calendar, color: 'text-emerald-600', bg: 'bg-blue-50', sub: 'Active Sessions' },
                { label: 'Confirmed', value: stats.confirmed, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-indigo-50', sub: 'Ready to Play' },
                { label: 'Pending Auth', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', sub: 'Verification Req' },
                { label: 'Est. Revenue', value: `₹${stats.revenue || 0}`, icon: TrendingUp, color: 'text-slate-900', bg: 'bg-slate-100', sub: 'Projected Daily' }
              ].map((stat, i) => (
                <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-blue-900/[0.03] group hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-[40px] rounded-full group-hover:bg-emerald-500/10 transition-all"></div>
                   <div className={`${stat.bg} ${stat.color} w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                      <stat.icon size={24} />
                   </div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{stat.label}</p>
                   <div className="flex items-baseline gap-2">
                      <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase">{stat.value}</h3>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{stat.sub}</span>
                   </div>
                </div>
              ))}
           </div>

           {/* Content Grid */}
           <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
              
              {/* Main Feed */}
              <div className="xl:col-span-2 space-y-8">
                 <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-blue-900/[0.03] overflow-hidden">
                    <div className="p-8 md:p-10 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                       <div>
                          <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Match Feed</h3>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Real-time booking intelligence</p>
                       </div>
                       <div className="flex items-center gap-3">
                          {['all', 'confirmed', 'pending'].map(f => (
                            <button
                              key={f}
                              onClick={() => setFilter(f)}
                              className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                filter === f ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                              }`}
                            >
                              {f}
                            </button>
                          ))}
                       </div>
                    </div>

                    <div className="p-4">
                       <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                          {filteredBookings.length > 0 ? (
                            filteredBookings.map((b) => (
                              <div key={b._id} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white hover:border-blue-200 transition-all group shadow-sm hover:shadow-xl hover:shadow-blue-900/[0.03]">
                                 <div className="flex flex-col md:flex-row gap-6 md:items-center">
                                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-50 flex flex-col items-center justify-center shrink-0 min-w-[100px] group-hover:bg-emerald-600 transition-colors">
                                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-100">Slot Time</span>
                                       <span className="text-xl font-black text-slate-900 italic tracking-tighter group-hover:text-white">{b.timeSlot}</span>
                                    </div>

                                    <div className="flex-1 space-y-1">
                                       <div className="flex items-center gap-3 mb-1">
                                          <h4 className="text-lg font-black text-slate-900 uppercase italic tracking-tight">{b.userId?.name || 'Guest Player'}</h4>
                                          <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                            b.status === 'confirmed' ? 'bg-blue-50 text-emerald-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                                          }`}>
                                            {b.status}
                                          </div>
                                       </div>
                                       <div className="flex flex-wrap gap-x-6 gap-y-2">
                                          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                                             <User size={14} className="text-emerald-500" /> {b.userId?.phone || 'N/A'}
                                          </div>
                                          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                                             <Activity size={14} className="text-emerald-500" /> {b.turfId?.name || 'Main Arena'}
                                          </div>
                                          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                                             <ShieldCheck size={14} className="text-emerald-500" /> ID: {b._id.slice(-6).toUpperCase()}
                                          </div>
                                       </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                       <button className="flex items-center gap-2 bg-white text-slate-900 border-2 border-slate-100 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-emerald-600 hover:text-emerald-600 transition-all shadow-sm">
                                          <Search size={14} /> Detail
                                       </button>
                                       {b.status !== 'confirmed' && (
                                         <button className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-emerald-500/20 active:scale-95">
                                            Verify
                                         </button>
                                       )}
                                    </div>
                                 </div>
                              </div>
                            ))
                          ) : (
                            <div className="py-20 text-center space-y-4">
                               <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                                  <Activity size={40} />
                               </div>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">No matching Match Data found</p>
                            </div>
                          )}
                       </div>
                    </div>
                 </div>
              </div>

              {/* Sidebar Controls */}
              <div className="space-y-8">
                 {/* Reports & Exports */}
                 <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden group border border-white/5 shadow-2xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[60px] rounded-full"></div>
                    <div className="flex items-center gap-3 mb-8">
                       <div className="bg-emerald-600 p-2.5 rounded-xl">
                          <TrendingUp size={18} className="text-white" />
                       </div>
                       <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Export Intelligence</p>
                    </div>
                    <h4 className="text-xl font-black tracking-tight uppercase italic mb-4">Operations Reporting</h4>
                    <p className="text-slate-400 text-[11px] font-bold leading-relaxed mb-10 tracking-tight">
                       Generate ground-level booking insights for auditing and revenue synchronization.
                    </p>
                    <div className="space-y-4">
                       <button className="w-full bg-white/5 hover:bg-emerald-600 border border-white/5 hover:border-emerald-500 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all duration-300">
                          <Download size={16} /> Daily Ops CSV
                       </button>
                       <button className="w-full bg-slate-950 hover:bg-white hover:text-slate-900 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all duration-300 group/btn">
                          <Activity size={16} className="text-emerald-500 group-hover/btn:text-slate-900" /> Real-time PDF
                       </button>
                    </div>
                 </div>

                 {/* System Alert Hub */}
                 <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-xl shadow-blue-900/[0.03] group">
                    <div className="flex items-center justify-between mb-8">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">System Alerts</h4>
                       <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                    </div>
                    <div className="space-y-6">
                       {[
                         { title: 'Peak Demand Phase', desc: 'Evening slots (18:00 - 21:00) fully booked.', icon: Zap, color: 'text-emerald-600', bg: 'bg-blue-50' },
                         { title: 'Sensor Sync', desc: 'Gate QR terminal synchronized successfully.', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-indigo-50' },
                       ].map((alert, i) => (
                         <div key={i} className="flex gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:border-blue-100 transition-all group/item shadow-sm">
                            <div className={`${alert.bg} ${alert.color} p-3 rounded-xl shrink-0 h-fit group-hover/item:scale-110 transition-transform`}>
                               <alert.icon size={16} />
                            </div>
                            <div>
                               <h5 className="text-[11px] font-black text-slate-900 uppercase italic tracking-tight mb-1">{alert.title}</h5>
                               <p className="text-[10px] text-slate-500 font-bold leading-relaxed">{alert.desc}</p>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>

                 {/* Operator Notes */}
                 <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-xl shadow-blue-900/[0.03]">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 italic">Terminal Notes</h4>
                    <textarea 
                      placeholder="Add operational notes for the next shift..."
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500/30 focus:bg-white p-6 rounded-[2rem] outline-none text-[11px] text-slate-900 transition-all resize-none font-bold shadow-inner mb-6"
                      rows={4}
                    />
                    <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-blue-900/10">
                       Save Protocol
                    </button>
                 </div>
              </div>

           </div>
        </main>
      </div>
    </div>
  );
};

export default WorkerDashboard;



