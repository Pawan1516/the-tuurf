import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import { bookingsAPI } from '../../api/client';
import { LogOut, Check, X, Database, ChevronRight, Search, MoreVertical, LayoutDashboard, Calendar, Activity, Briefcase, PieChart, MessageSquare, Zap, Plus } from 'lucide-react';
import { adminAPI } from '../../api/client';

const AdminBookings = () => {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showManualModal, setShowManualModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [manualData, setManualData] = useState({
    userName: '',
    userPhone: '',
    amount: '500',
    date: new Date().toISOString().split('T')[0],
    startTime: '18:00',
    endTime: '19:00'
  });

  useEffect(() => {
    if (manualData.startTime && manualData.endTime) {
      const [sh, sm] = manualData.startTime.split(':').map(Number);
      const [eh, em] = manualData.endTime.split(':').map(Number);
      const duration = (eh * 60 + em) - (sh * 60 + sm);
      if (duration > 0) {
        const calculated = Math.max(200, Math.ceil((duration / 60) * 500));
        setManualData(prev => ({ ...prev, amount: calculated.toString() }));
      }
    }
  }, [manualData.startTime, manualData.endTime]);

  const handleManualBookingSubmit = async (e) => {
    e.preventDefault();
    if (!manualData.userName || !manualData.userPhone || !manualData.amount || !manualData.date || !manualData.startTime || !manualData.endTime) {
      alert('Mission Parameters Missing: All fields (Name, Phone, Fee, Date, Window) are required for manual calibration.');
      return;
    }
    setSubmitting(true);
    try {
      await adminAPI.manualBooking(manualData);
      setShowManualModal(false);
      setManualData({
        userName: '',
        userPhone: '',
        amount: '500',
        date: new Date().toISOString().split('T')[0],
        startTime: '18:00',
        endTime: '19:00'
      });
      // Refresh
      const response = await bookingsAPI.getAll(filter !== 'all' ? { status: filter } : {});
      setBookings(response.data.bookings || []);
      alert('Manual Entry successfully synchronized with the Registry.');
    } catch (error) {
      alert(error.response?.data?.message || 'Synchronization failure.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        const response = await bookingsAPI.getAll(filter !== 'all' ? { status: filter } : {});
        setBookings(response.data.bookings || []);
      } catch (err) {
        console.error('Failed to fetch bookings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, [filter]);

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      await bookingsAPI.updateStatus(bookingId, newStatus);
      // Refetch bookings with current filter
      const response = await bookingsAPI.getAll(filter !== 'all' ? { status: filter } : {});
      setBookings(response.data.bookings || []);
    } catch (error) {
      console.error('Status change error:', error);
    }
  };

  const handleResendNotification = async (bookingId) => {
    try {
      await bookingsAPI.resendNotification(bookingId);
      alert('WhatsApp notification sent successfully!');
      // Refresh to update the icon
      const response = await bookingsAPI.getAll(filter !== 'all' ? { status: filter } : {});
      setBookings(response.data.bookings || []);
    } catch (error) {
      console.error('Notification error:', error);
      alert(error.response?.data?.message || 'Failed to send WhatsApp message');
    }
  };

  const handleDirectChat = (b) => {
    let cleaned = b.userPhone.toString().replace(/\D/g, '');
    if (cleaned.length === 10) cleaned = '91' + cleaned;

    // Status-specific message
    let statusMsg = "";
    if (b.bookingStatus === 'confirmed') statusMsg = "✅ CONFIRMED";
    else if (b.bookingStatus === 'rejected') statusMsg = "❌ REJECTED";
    else if (b.bookingStatus === 'hold') statusMsg = "⏳ on HOLD";

    const slotDate = b.slot?.date ? new Date(b.slot.date).toLocaleDateString() : 'N/A';
    const msg = `Hello ${b.userName}, this is The Turf. Your booking for ${slotDate} at ${b.slot?.startTime} is ${statusMsg}. 🏟️`;
    window.open(`https://wa.me/${cleaned}?text=${encodeURIComponent(msg)}`, '_blank');
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

  const adjustManualEndTime = (minutes) => {
    if (!manualData.startTime) return;
    const [h, m] = manualData.startTime.split(':').map(Number);
    const totalMins = h * 60 + m + minutes;
    const nh = Math.floor(totalMins / 60);
    const nm = totalMins % 60;
    const cappedH = Math.min(23, nh);
    const cappedM = nh > 23 ? 59 : nm;
    const newEndTime = `${cappedH.toString().padStart(2, '0')}:${cappedM.toString().padStart(2, '0')}`;
    setManualData(prev => ({ ...prev, endTime: newEndTime }));
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = b.userName.toLowerCase().includes(searchTerm.toLowerCase()) || b.userPhone.includes(searchTerm);

    const bookingDate = b.slot?.date ? new Date(b.slot.date) : new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filter === 'all') {
      return matchesSearch && bookingDate >= today;
    }

    if (filter === 'history') {
      return matchesSearch && bookingDate < today;
    }

    const matchesStatus = b.bookingStatus === filter;
    return matchesSearch && matchesStatus;
  });

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

  const [aiCommand, setAiCommand] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);

  const handleAICommand = async (e) => {
    e.preventDefault();
    if (!aiCommand.trim()) return;

    setAiLoading(true);
    setAiResponse(null);
    try {
      const { data } = await adminAPI.aiCommand(aiCommand);
      setAiResponse(data);
      if (data.type === 'MANUAL_BOOKING' && data.success) {
        // Refresh registry
        const response = await bookingsAPI.getAll(filter !== 'all' ? { status: filter } : {});
        setBookings(response.data.bookings || []);
        alert('AI processed manual booking successfully!');
      }
      setAiCommand('');
    } catch (error) {
      alert(error.response?.data?.message || 'AI Command failed');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-80 bg-white border-r border-gray-100 flex flex-col sticky top-0 md:h-screen z-50">
        <div className="p-8 border-b border-gray-50 flex items-center gap-4">
          <div className="bg-emerald-600 text-white p-2.5 rounded-2xl shadow-lg shadow-emerald-200">
            <Database size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none uppercase">The Turf</h1>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Admin OS v2.0</p>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2">
          <NavItem to="/admin/dashboard" label="Dashboard" icon={LayoutDashboard} />
          <NavItem to="/admin/slots" label="Slot Control" icon={Calendar} />
          <NavItem to="/admin/bookings" label="Booking Log" icon={Activity} active />
          <NavItem to="/admin/workers" label="Workers" icon={Briefcase} />
          <NavItem to="/admin/report" label="Report" icon={PieChart} />
        </nav>

        <div className="p-6 border-t border-gray-50">
          <button onClick={handleLogout} className="w-full flex items-center justify-between p-5 rounded-2xl bg-gray-900 text-white hover:bg-black transition-all group">
            <div className="flex items-center gap-3">
              <LogOut size={18} className="text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">Log Out</span>
            </div>
            <ChevronRight size={14} className="opacity-30 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white/80 backdrop-blur-md px-10 h-24 flex items-center justify-between sticky top-0 z-40 border-b border-gray-100">
          <div className="flex flex-col">
            <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase leading-none">Operational Log</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Universal Booking Registry & Audit Trail</p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowManualModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shadow-xl shadow-emerald-200"
            >
              <Plus size={18} />
              Add Manual Booking
            </button>
            <div className="relative w-80">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search Registry..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 p-3 pl-14 rounded-2xl outline-none transition-all font-bold text-sm"
              />
            </div>
          </div>
        </header>

        <div className="p-10 pb-0">
          <div className="bg-gray-900 rounded-[3rem] p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Zap size={120} className="text-emerald-400" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-emerald-600 p-2 rounded-lg">
                  <Zap size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-white font-black uppercase tracking-widest text-sm">CricBot Command Center</h3>
                  <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">AI-Powered Rapid Deployment</p>
                </div>
              </div>

              <form onSubmit={handleAICommand} className="relative">
                <input
                  type="text"
                  placeholder='e.g. "MANUAL: Ravi, 9123456789, 28 Feb, 7 PM, 2hr, Paid"'
                  value={aiCommand}
                  onChange={(e) => setAiCommand(e.target.value)}
                  className="w-full bg-white/10 border-2 border-white/5 focus:border-emerald-500/50 p-6 rounded-[2rem] outline-none text-white font-bold text-lg placeholder:text-white/20 transition-all pr-40"
                />
                <button
                  type="submit"
                  disabled={aiLoading}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 disabled:opacity-50"
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
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Target</span>
                              <span className="text-emerald-400 font-black text-xs uppercase">{aiResponse.parsed_data.name}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Schedule</span>
                              <span className="text-white font-black text-xs uppercase">{aiResponse.parsed_data.date} @ {aiResponse.parsed_data.startTime}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Window</span>
                              <span className="text-white font-black text-xs uppercase">{aiResponse.parsed_data.duration}</span>
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
        {/* Manual Booking Modal */}
        {showManualModal && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <div className="bg-white rounded-[3rem] p-10 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-300">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Direct System Entry</h3>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Manual Allocation Protocol</p>
                </div>
                <button onClick={() => setShowManualModal(false)} className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleManualBookingSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Target Date</label>
                    <input
                      type="date"
                      required
                      value={manualData.date}
                      onChange={(e) => setManualData({ ...manualData, date: e.target.value })}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 p-4 rounded-2xl font-bold text-sm outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Paid Amount (₹)</label>
                    <input
                      type="number"
                      required
                      value={manualData.amount}
                      onChange={(e) => setManualData({ ...manualData, amount: e.target.value })}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 p-4 rounded-2xl font-bold text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Start Time (Min 07:00)</label>
                    <input
                      type="time"
                      min="07:00"
                      max="23:00"
                      required
                      value={manualData.startTime}
                      onChange={(e) => setManualData({ ...manualData, startTime: e.target.value })}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 p-4 rounded-2xl font-bold text-sm outline-none"
                    />
                  </div>
                  <div className="space-y-2 relative">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">End Time (Max 23:00)</label>
                    <input
                      type="time"
                      min="07:00"
                      max="23:00"
                      required
                      value={manualData.endTime}
                      onChange={(e) => setManualData({ ...manualData, endTime: e.target.value })}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 p-4 rounded-2xl font-bold text-sm outline-none"
                    />
                    {manualData.startTime && manualData.endTime && (
                      <div className="absolute top-0 right-0">
                        <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md">
                          {(() => {
                            const [sh, sm] = manualData.startTime.split(':').map(Number);
                            const [eh, em] = manualData.endTime.split(':').map(Number);
                            const m = (eh * 60 + em) - (sh * 60 + sm);
                            return m > 0 ? `${m} MINS` : 'INV';
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 px-1">
                  {[60, 90, 120].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => adjustManualEndTime(mins)}
                      className="flex-1 py-3 rounded-xl bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100"
                    >
                      {mins} MINS
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Customer Identifier</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter customer name"
                    value={manualData.userName}
                    onChange={(e) => setManualData({ ...manualData, userName: e.target.value })}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 p-4 rounded-2xl font-bold text-sm outline-none uppercase"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp Comm-Link</label>
                  <input
                    type="tel"
                    required
                    pattern="[0-9]{10}"
                    placeholder="10-digit mobile number"
                    value={manualData.userPhone}
                    onChange={(e) => setManualData({ ...manualData, userPhone: e.target.value })}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 p-4 rounded-2xl font-bold text-sm outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-gray-200 disabled:opacity-50 mt-4"
                >
                  {submitting ? 'Deploying Entry...' : 'Confirm Manual Entry'}
                </button>
              </form>
            </div>
          </div>
        )}

        <div className="p-10 space-y-10">

          <div className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-xl shadow-emerald-900/[0.02] flex flex-wrap gap-2">
            {['all', 'pending', 'submitted', 'confirmed', 'rejected', 'hold', 'no-show', 'cancelled', 'history'].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === s
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Operational Data Table */}
          <div className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl shadow-emerald-900/5 overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="py-40 flex flex-col items-center gap-6">
                  <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Decrypting Logs...</p>
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className="py-40 text-center">
                  <h4 className="font-black text-gray-300 uppercase tracking-widest text-sm">Registry Entry Empty</h4>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-[0.2em]">
                      <th className="px-6 py-6 text-center">sl no</th>
                      <th className="px-6 py-6">name</th>
                      <th className="px-6 py-6">mobile number</th>
                      <th className="px-6 py-6">slot</th>
                      <th className="px-6 py-6 text-center">status</th>
                      <th className="px-6 py-6 text-center">money</th>
                      <th className="px-6 py-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredBookings.map((b, index) => (
                      <tr key={b._id} className="hover:bg-emerald-50/20 transition-colors group">
                        <td className="px-6 py-8 text-center font-black text-gray-400">
                          {index + 1}
                        </td>
                        <td className="px-6 py-8">
                          <div className="flex flex-col">
                            <span className="font-black text-gray-900 uppercase tracking-tight">{b.userName}</span>
                            <span className="text-[8px] font-mono text-gray-300 mt-1">ID: {b._id.slice(-8)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-8 text-[10px] font-bold text-gray-600 tracking-widest">
                          +91 {b.userPhone}
                        </td>
                        <td className="px-6 py-8">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-gray-700 tracking-tight">
                              {b.slot?.date ? new Date(b.slot.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) : 'N/A'}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-widest mt-1">
                              {formatTime12h(b.slot?.startTime) || '00:00'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-8 text-center">
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getStatusTheme(b.bookingStatus)}`}>
                            {b.bookingStatus}
                          </span>
                        </td>
                        <td className="px-6 py-8 text-center">
                          <span className="text-lg font-black text-gray-900 tracking-tighter">₹{b.amount.toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-8">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleStatusChange(b._id, 'confirmed')}
                              className={`p-2 rounded-lg transition-all ${b.bookingStatus === 'confirmed' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600'}`}
                              title="Confirm"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => handleStatusChange(b._id, 'rejected')}
                              className={`p-2 rounded-lg transition-all ${b.bookingStatus === 'rejected' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-400'}`}
                              title="Reject"
                            >
                              <X size={16} />
                            </button>
                            <button
                              onClick={() => handleDirectChat(b)}
                              className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all"
                              title="WhatsApp"
                            >
                              <MessageSquare size={16} />
                            </button>
                            <button
                              onClick={() => navigate(`/admin/bookings/${b._id}`)}
                              className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:bg-gray-900 hover:text-white transition-all"
                              title="View"
                            >
                              <MoreVertical size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminBookings;
