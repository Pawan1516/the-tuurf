import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Activity,
  Briefcase,
  PieChart,
  LogOut,
  ChevronRight,
  Search,
  Plus,
  Check,
  X,
  MessageSquare,
  MoreVertical,
  Database,
  Zap,
  Settings,
  ShieldCheck,
  TrendingUp,
  Clock,
  User
} from 'lucide-react';
import { toast } from 'react-toastify';
import AuthContext from '../../context/AuthContext';
import { bookingsAPI, adminAPI } from '../../api/client';
import MobileNav from '../../components/MobileNav';
import AdminSidebar from '../../components/AdminSidebar';

const AdminBookings = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showManualModal, setShowManualModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState({
    PRICE_DAY: 1000,
    PRICE_NIGHT: 1200,
    PRICE_WEEKEND_DAY: 1000,
    PRICE_WEEKEND_NIGHT: 1400,
    PRICE_TRANSITION_HOUR: 18,
    TURF_NAME: 'The Turf'
  });
  const [manualData, setManualData] = useState({
    userName: '',
    userPhone: '',
    amount: '1000',
    date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()),
    startTime: '18:00',
    endTime: '19:00',
    paymentType: 'full'
  });

  const [aiCommand, setAiCommand] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);

  const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/operations', label: 'Operations HUB', icon: Zap },
    { to: '/admin/slots', label: 'Slot Control', icon: Calendar },
    { to: '/admin/bookings', label: 'Booking Log', icon: Activity },
    { to: '/admin/workers', label: 'Workers Team', icon: Briefcase },
    { to: '/admin/users', label: 'User Control', icon: User },
    { to: '/admin/report', label: 'Intelligence', icon: PieChart },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
    { to: '/admin/scanner', label: 'QR Scanner', icon: Clock }
  ];

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const [bookingsRes, settingsRes] = await Promise.all([
        bookingsAPI.getAll(filter !== 'all' ? { status: filter } : {}),
        adminAPI.getSettings()
      ]);
      
      setBookings(bookingsRes.data.bookings || []);
      if (settingsRes.data.success) {
        setSettings(prev => ({ ...prev, ...settingsRes.data.settings }));
      }
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    if (manualData.startTime && manualData.endTime && manualData.date) {
      const [sh, sm] = manualData.startTime.split(':').map(Number);
      const [eh, em] = manualData.endTime.split(':').map(Number);
      const duration = (eh * 60 + em) - (sh * 60 + sm);
      if (duration > 0) {
        const bookingDate = new Date(manualData.date);
        const isWeekend = bookingDate.getDay() === 0 || bookingDate.getDay() === 6;
        const isDay = sh < settings.PRICE_TRANSITION_HOUR;
        
        const baseRate = isWeekend 
          ? (isDay ? settings.PRICE_WEEKEND_DAY : settings.PRICE_WEEKEND_NIGHT) 
          : (isDay ? settings.PRICE_DAY : settings.PRICE_NIGHT);
        
        let totalPrice = (duration / 60) * baseRate;
        
        if (sh < settings.PRICE_TRANSITION_HOUR && (sh + duration / 60) > settings.PRICE_TRANSITION_HOUR) {
          const dayHours = (settings.PRICE_TRANSITION_HOUR * 60 - (sh * 60 + sm)) / 60;
          const nightHours = (duration / 60) - dayHours;
          const nightRate = isWeekend ? settings.PRICE_WEEKEND_NIGHT : settings.PRICE_NIGHT;
          totalPrice = (dayHours * baseRate) + (nightHours * nightRate);
        }
        
        setManualData(prev => ({ ...prev, amount: Math.max(200, Math.ceil(totalPrice)).toString() }));
      }
    }
  }, [manualData.startTime, manualData.endTime, manualData.date, settings]);

  const handleManualBookingSubmit = async (e) => {
    e.preventDefault();
    if (!manualData.userName || !manualData.userPhone || !manualData.amount || !manualData.date || !manualData.startTime || !manualData.endTime) {
      toast.error('Mission Parameters Missing: All fields are required.');
      return;
    }
    setSubmitting(true);
    try {
      await adminAPI.manualBooking(manualData);
      setShowManualModal(false);
      setManualData({
        userName: '',
        userPhone: '',
        amount: '1000',
        date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()),
        startTime: '18:00',
        endTime: '19:00',
        paymentType: 'full'
      });
      toast.success('Manual Entry successfully synchronized.');
      fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Synchronization failure.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      await bookingsAPI.updateStatus(bookingId, newStatus);
      toast.success(`Booking status updated to ${newStatus}.`);
      fetchBookings();
    } catch (error) {
      toast.error('Status change error.');
    }
  };

  const handleResendNotification = async (bookingId) => {
    try {
      await bookingsAPI.resendNotification(bookingId);
      toast.success('✅ Communication packet delivered via WhatsApp.');
    } catch (err) {
      toast.error('❌ Notification node unreachable.');
    }
  };

  const handleSendMessage = async (booking) => {
    const message = window.prompt(`TRIGGER COMMUNICATION PACKET FOR ${booking.userName}`, `HELLO ${booking.userName}, YOUR SESSION AT ${settings.TURF_NAME} HAS BEEN CONFIRMED. PROTOCOLS ACTIVE.`);
    if (!message) return;

    try {
      await adminAPI.sendMessage(booking.userPhone, message, booking._id);
      toast.success('✅ Data packet delivered via official node.');
    } catch (err) {
      toast.error('❌ Communication failure: Payload rejected.');
    }
  };

  const handleDirectChat = (b) => {
    let cleaned = b.userPhone.toString().replace(/\D/g, '');
    if (cleaned.length === 10) cleaned = '91' + cleaned;
    const msg = `Hello ${b.userName}, this is ${settings.TURF_NAME}. Regarding your booking...`;
    window.open(`https://wa.me/${cleaned}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleAICommand = async (e) => {
    e.preventDefault();
    if (!aiCommand.trim()) return;
    setAiLoading(true);
    setAiResponse(null);
    try {
      const { data } = await adminAPI.aiCommand(aiCommand);
      setAiResponse(data);
      if (data.type === 'MANUAL_BOOKING' && data.success) {
        fetchBookings();
        toast.success('AI processed manual booking successfully!');
      }
      setAiCommand('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'AI Command failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const getStatusTheme = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'submitted': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'hold': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'no-show': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'cancelled': return 'bg-gray-200 text-gray-500 border-gray-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
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

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = b.userName.toLowerCase().includes(searchTerm.toLowerCase()) || b.userPhone.includes(searchTerm);
    if (!matchesSearch) return false;
    if (filter === 'all') return true;
    if (filter === 'history') {
        const bookingDate = new Date(b.slot?.date || Date.now());
        const today = new Date();
        today.setHours(0,0,0,0);
        return bookingDate < today;
    }
    return b.bookingStatus === filter;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <MobileNav user={user} logout={logout} navItems={navItems} dashboardTitle={settings.TURF_NAME} />

      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar user={user} logout={logout} turfName={settings.TURF_NAME} />

        <main className="flex-1 overflow-y-auto pb-24">
          <header className="bg-white/80 backdrop-blur-md px-6 md:px-10 h-20 md:h-24 flex items-center justify-between sticky top-0 z-40 border-b border-gray-100">
            <div className="flex flex-col">
              <h2 className="text-lg md:text-2xl font-black text-gray-900 tracking-tighter uppercase leading-none">Ops Log</h2>
              <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Booking Registry</p>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <button
                onClick={() => setShowManualModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 md:px-8 md:py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shadow-xl shadow-emerald-200"
              >
                <Plus size={18} />
                <span className="hidden md:inline">Add Manual Booking</span>
              </button>
              <div className="relative w-40 md:w-80">
                <Search className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 p-2 pl-10 md:p-3 md:pl-14 rounded-xl md:rounded-2xl outline-none transition-all font-bold text-xs md:text-sm"
                />
              </div>
            </div>
          </header>

          <div className="p-4 md:p-10 pb-0">
            <div className="bg-gray-900 rounded-[2rem] md:rounded-[3rem] p-6 md:p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Zap size={120} className="text-emerald-400" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-emerald-600 p-2 rounded-lg">
                    <Zap size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-black uppercase tracking-widest text-xs md:text-sm">CricBot Command</h3>
                    <p className="text-emerald-400 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] mt-1">AI-Powered Deployment</p>
                  </div>
                </div>

                <form onSubmit={handleAICommand} className="relative flex flex-col md:block gap-4">
                  <input
                    type="text"
                    placeholder='MANUAL: Ravi, 9123456789, 28 Feb, 7 PM'
                    value={aiCommand}
                    onChange={(e) => setAiCommand(e.target.value)}
                    className="w-full bg-white/10 border-2 border-white/5 focus:border-emerald-500/50 p-4 md:p-6 rounded-2xl md:rounded-[2rem] outline-none text-white font-bold text-sm md:text-lg placeholder:text-white/20 transition-all md:pr-40"
                  />
                  <button
                    type="submit"
                    disabled={aiLoading}
                    className="md:absolute right-4 md:top-1/2 md:-translate-y-1/2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl md:rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {aiLoading ? 'Processing...' : (
                      <>
                        Execute <ChevronRight size={16} />
                      </>
                    )}
                  </button>
                </form>

                {aiResponse && (
                  <div className="mt-6 animate-in slide-in-from-top-4 duration-500">
                    <div className={`p-6 rounded-[2rem] border-2 ${aiResponse.type === 'MANUAL_BOOKING' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/5 border-white/5'}`}>
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg mt-1 ${aiResponse.type === 'MANUAL_BOOKING' ? 'bg-emerald-500 text-white' : 'bg-white/20 text-white'}`}>
                          {aiResponse.type === 'MANUAL_BOOKING' ? <Check size={16} /> : <MessageSquare size={16} />}
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-bold leading-relaxed whitespace-pre-wrap">{aiResponse.reply}</p>
                          {aiResponse.parsed_data && (
                            <div className="mt-4 flex flex-wrap gap-4 pt-4 border-t border-white/5">
                              <div className="flex flex-col text-xs">
                                <span className="text-white/40 uppercase">Target</span>
                                <span className="text-emerald-400 font-black">{aiResponse.parsed_data.name}</span>
                              </div>
                              <div className="flex flex-col text-xs">
                                <span className="text-white/40 uppercase">Schedule</span>
                                <span className="text-white font-black">{aiResponse.parsed_data.date} @ {aiResponse.parsed_data.startTime}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {showManualModal && (
            <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 w-full max-w-lg shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-lg font-black text-gray-900 uppercase">System Entry</h3>
                  <button onClick={() => setShowManualModal(false)} className="p-2 text-gray-400 hover:text-red-500"><X size={20} /></button>
                </div>
                <form onSubmit={handleManualBookingSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input type="date" required value={manualData.date} onChange={(e) => setManualData({...manualData, date: e.target.value})} className="bg-gray-50 p-4 rounded-xl font-bold" />
                    <input type="number" required value={manualData.amount} onChange={(e) => setManualData({...manualData, amount: e.target.value})} className="bg-gray-50 p-4 rounded-xl font-bold" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="time" required value={manualData.startTime} onChange={(e) => setManualData({...manualData, startTime: e.target.value})} className="bg-gray-50 p-4 rounded-xl font-bold" />
                    <input type="time" required value={manualData.endTime} onChange={(e) => setManualData({...manualData, endTime: e.target.value})} className="bg-gray-50 p-4 rounded-xl font-bold" />
                  </div>
                  <input type="text" placeholder="Name" required value={manualData.userName} onChange={(e) => setManualData({...manualData, userName: e.target.value})} className="w-full bg-gray-50 p-4 rounded-xl font-bold" />
                  <input type="tel" placeholder="Phone" required value={manualData.userPhone} onChange={(e) => setManualData({...manualData, userPhone: e.target.value})} className="w-full bg-gray-50 p-4 rounded-xl font-bold" />
                  <button type="submit" disabled={submitting} className="w-full bg-gray-900 text-white py-4 rounded-xl font-black uppercase">Confirm</button>
                </form>
              </div>
            </div>
          )}

          <div className="p-4 md:p-10 space-y-8">
            <div className="bg-white p-2 rounded-2xl border border-gray-100 flex flex-wrap gap-1">
              {['all', 'pending', 'confirmed', 'rejected', 'hold', 'history'].map(s => (
                <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === s ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:bg-gray-50'}`}>{s}</button>
              ))}
            </div>

            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden">
              {loading ? (
                <div className="py-20 text-center"><p className="animate-pulse">Loading Logs...</p></div>
              ) : filteredBookings.length === 0 ? (
                <div className="py-20 text-center text-gray-400 uppercase font-black">No Records Found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-900 text-white text-[10px] uppercase font-black">
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Mobile</th>
                        <th className="px-6 py-4">Slot</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredBookings.map((b) => (
                        <tr key={b._id} className="hover:bg-emerald-50/20 transition-colors">
                          <td className="px-6 py-6 font-black uppercase">{b.userName}</td>
                          <td className="px-6 py-6 font-bold">{b.userPhone}</td>
                          <td className="px-6 py-6 text-xs">{b.slot?.date ? new Date(b.slot.date).toLocaleDateString() : 'N/A'}<br/>{formatTime12h(b.slot?.startTime)}</td>
                          <td className="px-6 py-6"><span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase border ${getStatusTheme(b.bookingStatus)}`}>{b.bookingStatus}</span></td>
                          <td className="px-6 py-6 font-black">₹{b.amount}</td>
                          <td className="px-6 py-6">
                            <div className="flex gap-1 justify-center">
                              <button onClick={() => handleStatusChange(b._id, 'confirmed')} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Check size={16} /></button>
                              <button onClick={() => handleStatusChange(b._id, 'rejected')} className="p-2 bg-red-50 text-red-500 rounded-lg"><X size={16} /></button>
                              <button onClick={() => handleResendNotification(b._id)} className="p-2 bg-purple-50 text-purple-600 rounded-lg" title="Resend Notification"><Zap size={16} /></button>
                              <button onClick={() => handleSendMessage(b)} className="p-2 bg-blue-50 text-blue-600 rounded-lg" title="Custom Message"><MessageSquare size={16} /></button>
                              <button onClick={() => handleDirectChat(b)} className="p-2 bg-gray-50 text-gray-600 rounded-lg" title="WhatsApp Link"><TrendingUp size={16} /></button>
                              <button onClick={() => navigate(`/admin/bookings/${b._id}`)} className="p-2 bg-gray-50 text-gray-400 rounded-lg"><MoreVertical size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminBookings;
