import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import { slotsAPI, adminAPI } from '../../api/client';
import { LogOut, Plus, Trash2, Database, ChevronRight, Clock, Activity, TrendingUp, X, LayoutDashboard, Calendar, Briefcase, PieChart, UserPlus } from 'lucide-react';

const AdminSlots = () => {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);
  const [slots, setSlots] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
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
    amount: '500'
  });

  useEffect(() => {
    if (selectedSlot) {
      const [sh, sm] = selectedSlot.startTime.split(':').map(Number);
      const [eh, em] = selectedSlot.endTime.split(':').map(Number);
      const duration = (eh * 60 + em) - (sh * 60 + sm);
      if (duration > 0) {
        const calculated = Math.max(200, Math.ceil((duration / 60) * 500));
        setBookingData(prev => ({ ...prev, amount: calculated.toString() }));
      }
    }
  }, [selectedSlot]);

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchSlots(), fetchWorkers()]);
    };
    init();
  }, []);

  const fetchSlots = async () => {
    try {
      setLoading(true);
      const response = await slotsAPI.getAll();
      setSlots(Array.isArray(response.data) ? response.data : response.data.slots || []);
    } catch (error) {
      setError('System synchronization error.');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkers = async () => {
    try {
      const response = await adminAPI.getWorkers();
      setWorkers(response.data.workers || []);
    } catch (error) {
      console.error('Error fetching workers:', error);
    }
  };

  const handleManualBooking = async (e) => {
    e.preventDefault();
    if (!bookingData.userName || !bookingData.userPhone || !bookingData.amount) {
      setError('Operational Hazard: Customer identity and fee parameters must be defined.');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      await adminAPI.manualBooking({
        slotId: selectedSlot._id,
        ...bookingData
      });
      setShowBookingModal(false);
      setBookingData({ userName: '', userPhone: '', amount: '500' });
      await fetchSlots();
      alert('Booking created successfully!');
    } catch (error) {
      setError(error.response?.data?.message || 'Error creating manual booking.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignWorker = async (slotId, workerId) => {
    try {
      setError('');
      await slotsAPI.assignWorker(slotId, workerId);
      await fetchSlots(); // Refresh to show new assignment
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to assign operative to node.';
      setError(errorMsg);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    if (!formData.date || !formData.startTime || !formData.endTime) {
      setError('Infrastructure Calibration Failed: Date, Start, and End boundaries are mandatory.');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      await slotsAPI.create(formData);
      setFormData({ date: '', startTime: '', endTime: '' });
      setShowForm(false);
      await fetchSlots();
    } catch (error) {
      setError(error.response?.data?.message || 'Error creating infrastructure node.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm('Confirm permanent deletion of this slot?')) return;
    try {
      await slotsAPI.delete(slotId);
      await fetchSlots();
    } catch (error) {
      setError('Error neutralizing slot.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const adjustEndTime = (minutes) => {
    if (!formData.startTime) return;
    const [h, m] = formData.startTime.split(':').map(Number);
    const totalMins = h * 60 + m + minutes;
    const nh = Math.floor(totalMins / 60);
    const nm = totalMins % 60;
    const cappedH = Math.min(23, nh);
    const cappedM = nh > 23 ? 59 : nm;
    const newEndTime = `${cappedH.toString().padStart(2, '0')}:${cappedM.toString().padStart(2, '0')}`;
    setFormData(prev => ({ ...prev, endTime: newEndTime }));
  };

  const formatTime12h = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const sortedSlots = [...slots].sort((a, b) => {
    const dateDiff = new Date(a.date) - new Date(b.date);
    if (dateDiff !== 0) return dateDiff;
    return a.startTime.localeCompare(b.startTime);
  });

  const groupedSlots = sortedSlots.reduce((acc, slot) => {
    const slotDate = new Date(slot.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Keep only today and future slots
    if (slotDate >= today) {
      const dateKey = slotDate.toLocaleDateString();
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(slot);
    }
    return acc;
  }, {});

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
          <NavItem to="/admin/slots" label="Slot Control" icon={Calendar} active />
          <NavItem to="/admin/bookings" label="Booking Log" icon={Activity} />
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
            <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase leading-none">Slot Control</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Infrastructure Calibration & Availability</p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shadow-xl shadow-emerald-200"
          >
            {showForm ? <X size={18} /> : <Plus size={18} />}
            {showForm ? 'Abort Operation' : 'Initialize New Slot'}
          </button>
        </header>

        <div className="p-10 space-y-10">
          {error && (
            <div className="bg-red-50 border border-red-100 p-6 rounded-[2rem] flex items-center gap-4 text-red-600">
              <TrendingUp className="rotate-90 shrink-0" />
              <p className="text-xs font-black uppercase tracking-tight">{error}</p>
            </div>
          )}

          {/* Creation Form */}
          {showForm && (
            <div className="bg-white rounded-[3rem] p-10 border-2 border-emerald-100 shadow-2xl shadow-emerald-900/5 transition-all">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] mb-8">Specification Deployment</h3>
              <form onSubmit={handleCreateSlot} className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Universal Date</label>
                  <input type="date" name="date" value={formData.date} onChange={handleInputChange} required className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 p-4 rounded-xl font-bold text-sm outline-none" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Start T-Minus (Min 07:00)</label>
                  <input type="time" name="startTime" min="07:00" max="23:00" value={formData.startTime} onChange={handleInputChange} required className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 p-4 rounded-xl font-bold text-sm outline-none" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">End Phase (Max 23:00)</label>
                  <input type="time" name="endTime" min="07:00" max="23:00" value={formData.endTime} onChange={handleInputChange} required className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 p-4 rounded-xl font-bold text-sm outline-none" />
                </div>
                <div className="flex gap-2 mb-4">
                  {[60, 90, 120].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => adjustEndTime(mins)}
                      className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-600 text-[8px] font-black uppercase tracking-widest hover:bg-gray-900 hover:text-white transition-all"
                    >
                      {mins} MINS
                    </button>
                  ))}
                </div>
                <div className="flex items-end">
                  <button type="submit" disabled={submitting} className="w-full bg-gray-900 text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-200 disabled:opacity-50">
                    {submitting ? 'Deploying...' : 'Deploy Node'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Manual Booking Modal */}
          {showBookingModal && (
            <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
              <div className="bg-white rounded-[3rem] p-10 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-300">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Manual Booking</h3>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1 flex items-center gap-2">
                      {new Date(selectedSlot?.date).toLocaleDateString()} | {selectedSlot?.startTime} - {selectedSlot?.endTime}
                      <span className="bg-emerald-100 px-2 py-0.5 rounded text-[8px]">
                        {(() => {
                          const [sh, sm] = selectedSlot.startTime.split(':').map(Number);
                          const [eh, em] = selectedSlot.endTime.split(':').map(Number);
                          return (eh * 60 + em) - (sh * 60 + sm);
                        })()} MINS
                      </span>
                    </p>
                  </div>
                  <button onClick={() => setShowBookingModal(false)} className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleManualBooking} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Customer Name</label>
                    <input
                      type="text"
                      required
                      value={bookingData.userName}
                      onChange={(e) => setBookingData({ ...bookingData, userName: e.target.value })}
                      placeholder="Enter customer name"
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 p-4 rounded-2xl font-bold text-sm outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                    <input
                      type="tel"
                      required
                      pattern="[0-9]{10}"
                      value={bookingData.userPhone}
                      onChange={(e) => setBookingData({ ...bookingData, userPhone: e.target.value })}
                      placeholder="10-digit mobile number"
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 p-4 rounded-2xl font-bold text-sm outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Paid Amount (₹)</label>
                    <input
                      type="number"
                      required
                      value={bookingData.amount}
                      onChange={(e) => setBookingData({ ...bookingData, amount: e.target.value })}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 p-4 rounded-2xl font-bold text-sm outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-gray-200 disabled:opacity-50 mt-4"
                  >
                    {submitting ? 'Processing...' : 'Confirm Manual Booking'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Slots Breakdown */}
          {loading ? (
            <div className="py-40 flex flex-col items-center gap-6">
              <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Syncing Infrastructure...</p>
            </div>
          ) : (
            <div className="space-y-12">
              {Object.entries(groupedSlots).map(([date, daySlots]) => (
                <div key={date} className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-0.5 flex-1 bg-gray-100"></div>
                    <h4 className="bg-white border-2 border-gray-100 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">{date}</h4>
                    <div className="h-0.5 flex-1 bg-gray-100"></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {daySlots.map(slot => (
                      <div key={slot._id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-lg shadow-emerald-900/[0.02] hover:border-emerald-300 transition-all group flex flex-col justify-between min-h-[160px]">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-gray-900">
                              <Clock size={16} className="text-emerald-600" />
                              <span className="text-lg font-black tracking-tighter leading-none">{formatTime12h(slot.startTime)} – {formatTime12h(slot.endTime)}</span>
                            </div>
                            <div className={`text-[9px] font-black uppercase tracking-widest ${slot.status === 'booked' ? 'text-red-500' :
                              slot.status === 'hold' ? 'text-yellow-500' :
                                'text-emerald-500'
                              }`}>
                              System Status: {slot.status}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {slot.status === 'free' && (
                              <button
                                onClick={() => {
                                  setSelectedSlot(slot);
                                  setShowBookingModal(true);
                                }}
                                className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100"
                                title="Book Manually"
                              >
                                Book
                              </button>
                            )}
                            <button onClick={() => handleDeleteSlot(slot._id)} className="bg-red-50 text-red-400 p-2.5 rounded-xl hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-sm shadow-red-200">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-50 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Ground Unit Assignment</span>
                            <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                              <UserPlus size={14} />
                            </div>
                          </div>
                          <select
                            value={slot.assignedWorker?._id || ''}
                            onChange={(e) => handleAssignWorker(slot._id, e.target.value)}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider outline-none transition-all cursor-pointer"
                          >
                            <option value="">-- UNASSIGNED --</option>
                            {workers.map(w => (
                              <option key={w._id} value={w._id}>
                                {w.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminSlots;
