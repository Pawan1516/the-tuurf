import React, { useState, useEffect, useContext } from 'react';

import { useNavigate } from 'react-router-dom';

import {
  LayoutDashboard,
  Calendar,
  LogOut,
  ChevronRight,
  Search,
  Filter,
  Check,
  X,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download
} from 'lucide-react';

import AuthContext from '../../context/AuthContext';
import { bookingsAPI } from '../../api/client';

import MobileNav from '../../components/MobileNav';

const WorkerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [reportLoading, setReportLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  const navItems = [
    { to: '/worker/dashboard', label: 'My Assignments', icon: LayoutDashboard },
  ];

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await bookingsAPI.getMySlots();
      setBookings(response.data.bookings || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/worker/login');
  };

  const handleStatusChange = async (bookingId, status) => {
    try {
      await bookingsAPI.updateStatus(bookingId, status);
      await fetchBookings(); // Refresh list
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleDownloadReport = async (format = 'csv') => {
    setReportLoading(true);
    try {
      const response = format === 'pdf'
        ? await bookingsAPI.downloadPDFReport()
        : await bookingsAPI.downloadReport();

      const blob = new Blob([response.data], { type: format === 'pdf' ? 'application/pdf' : 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `booking-report-${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Report error:', error);
      alert('Error downloading report');
    } finally {
      setReportLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider">
            <CheckCircle size={12} /> Confirmed
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-wider">
            <XCircle size={12} /> Rejected
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-black uppercase tracking-wider">
            <AlertCircle size={12} /> Pending
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-[10px] font-black uppercase tracking-wider">
            <CheckCircle size={12} /> Submitted
          </span>
        );
      case 'hold':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-wider">
            <Clock size={12} /> On Hold
          </span>
        );
      default:
        return null;
    }
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = b.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.userPhone?.includes(searchTerm);

    if (filter === 'all') {
      return matchesSearch;
    }

    if (filter === 'history') {
      const bookingDate = b.slot?.date ? new Date(b.slot.date) : new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return matchesSearch && bookingDate < today;
    }

    const matchesStatus = b.bookingStatus === filter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter(b => b.bookingStatus === 'confirmed').length,
    pending: bookings.filter(b => b.bookingStatus === 'pending').length,
    hold: bookings.filter(b => b.bookingStatus === 'hold').length,
    rejected: bookings.filter(b => b.bookingStatus === 'rejected').length,
    history: bookings.filter(b => {
      const bDate = b.slot?.date ? new Date(b.slot.date) : new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return bDate < today;
    }).length
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MobileNav user={user} logout={logout} navItems={navItems} dashboardTitle="Worker Ops" />

      {/* Navbar (Desktop Only) */}
      <nav className="hidden md:block bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-600 text-white p-2 rounded-xl shadow-lg shadow-emerald-200">
              <LayoutDashboard size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none uppercase">Worker Portal</h1>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1">Live Management</p>
            </div>
            <div className="h-10 w-[1px] bg-gray-100 mx-4"></div>
            <div className="flex flex-col">
              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em]">{currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
              <p className="text-lg font-black text-gray-900 tracking-tighter tabular-nums leading-none">{currentTime.toLocaleTimeString()}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end mr-2">
              <p className="text-sm font-black text-gray-900">{user?.name || 'Assigned Worker'}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ground Operations</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-10 w-full space-y-10">

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white p-6 rounded-[1.5rem] border border-gray-100 shadow-xl shadow-emerald-900/5 transition-transform hover:scale-[1.02]">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-3">Total</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black text-gray-900">{stats.total}</span>
              <span className="text-emerald-500 font-bold text-[10px] mb-1 lowercase">bookings</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[1.5rem] border border-gray-100 shadow-xl shadow-emerald-900/5 transition-transform hover:scale-[1.02]">
            <p className="text-[9px] font-black text-yellow-500 uppercase tracking-[0.15em] mb-3">Pending</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black text-yellow-500">{stats.pending}</span>
              <span className="text-yellow-400 font-bold text-[10px] mb-1 lowercase">waiting</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[1.5rem] border border-gray-100 shadow-xl shadow-emerald-900/5 transition-transform hover:scale-[1.02]">
            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.15em] mb-3">Confirmed</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black text-emerald-600">{stats.confirmed}</span>
              <span className="text-emerald-500 font-bold text-[10px] mb-1 lowercase">ready</span>
            </div>
          </div>
          <div className="hidden md:block bg-white p-6 rounded-[1.5rem] border border-gray-100 shadow-xl shadow-emerald-900/5 transition-transform hover:scale-[1.02]">
            <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.15em] mb-3">On Hold</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black text-blue-500">{stats.hold}</span>
              <span className="text-blue-400 font-bold text-[10px] mb-1 lowercase">paused</span>
            </div>
          </div>
          <div className="hidden lg:block bg-white p-6 rounded-[1.5rem] border border-gray-100 shadow-xl shadow-emerald-900/5 transition-transform hover:scale-[1.02]">
            <p className="text-[9px] font-black text-red-500 uppercase tracking-[0.15em] mb-3">Rejected</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black text-red-500">{stats.rejected}</span>
              <span className="text-red-400 font-bold text-[10px] mb-1 lowercase">denied</span>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-4 gap-10">

          {/* Filters Sidebar */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-emerald-900/5 overflow-hidden">
              <h2 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                <Filter size={16} className="text-emerald-600" /> Filter View
              </h2>
              <div className="flex lg:flex-col gap-3 overflow-x-auto pb-4 lg:pb-0 scrollbar-hide">
                {['all', 'pending', 'submitted', 'confirmed', 'rejected', 'hold', 'history'].map(s => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    className={`whitespace-nowrap lg:whitespace-normal px-6 lg:px-4 py-4 rounded-2xl border-2 transition-all font-black text-[10px] lg:text-xs uppercase tracking-widest ${filter === s
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                      : 'border-transparent text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="hidden lg:block bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-emerald-900/5 space-y-4">
              <h2 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                <Download size={16} className="text-emerald-600" /> Export Data
              </h2>
              <button
                onClick={() => handleDownloadReport('csv')}
                disabled={reportLoading}
                className="w-full bg-emerald-50 p-6 rounded-2xl border-2 border-dashed border-emerald-100 text-emerald-600 font-black uppercase text-[10px] tracking-[0.2em] hover:border-emerald-400 hover:bg-emerald-100 transition-all flex items-center justify-center gap-3 group"
              >
                <Download size={18} />
                {reportLoading ? 'Working...' : 'CSV Matrix'}
              </button>
              <button
                onClick={() => handleDownloadReport('pdf')}
                disabled={reportLoading}
                className="w-full bg-gray-900 p-6 rounded-2xl text-white font-black uppercase text-[10px] tracking-[0.2em] hover:bg-black transition-all flex items-center justify-center gap-3 shadow-lg shadow-gray-200"
              >
                <FileText size={18} className="text-emerald-400" />
                {reportLoading ? 'Compiling...' : 'PDF Report'}
              </button>
            </div>
          </div>

          {/* List Area */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl shadow-emerald-900/5 overflow-hidden">

              {/* Header / Search */}
              <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-6 bg-gray-50/30">
                <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">Recent Assignments</h3>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search Name or Mobile..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border-2 border-transparent focus:border-emerald-500 p-4 pl-14 rounded-2xl outline-none transition-all font-bold text-sm shadow-sm"
                  />
                </div>
              </div>

              {/* Table (Desktop) / Cards (Mobile) */}
              <div className="">
                {loading ? (
                  <div className="py-40 flex flex-col items-center gap-6">
                    <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Syncing with Server...</p>
                  </div>
                ) : filteredBookings.length === 0 ? (
                  <div className="py-40 text-center">
                    <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-200">
                      <Calendar size={48} />
                    </div>
                    <p className="font-black text-gray-400 uppercase tracking-widest text-xs">No assignments match your filter</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile Card View */}
                    <div className="md:hidden divide-y divide-gray-50">
                      {filteredBookings.map((b) => (
                        <div key={b._id} className="p-6 space-y-6 hover:bg-emerald-50/30 transition-colors">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <h4 className="font-black text-gray-900 uppercase tracking-tight">{b.userName}</h4>
                              <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">+91 {b.userPhone}</p>
                            </div>
                            {getStatusBadge(b.bookingStatus)}
                          </div>

                          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <div className="flex items-center gap-3">
                              <Calendar size={14} className="text-emerald-600" />
                              <span className="text-[10px] font-black text-gray-700 uppercase">
                                {b.slot?.date ? new Date(b.slot.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) : 'N/A'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <Clock size={14} className="text-emerald-600" />
                              <span className="text-[10px] font-black text-gray-700 uppercase">{b.slot?.startTime || '00:00'}</span>
                            </div>
                            <div className="font-black text-gray-900 tracking-tighter">₹{b.amount.toLocaleString()}</div>
                          </div>

                          <div className="flex gap-3">
                            {b.bookingStatus !== 'confirmed' && (
                              <button
                                onClick={() => handleStatusChange(b._id, 'confirmed')}
                                className="flex-1 bg-emerald-600 text-white p-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                              >
                                <Check size={16} /> Confirm
                              </button>
                            )}
                            {b.bookingStatus !== 'rejected' && (
                              <button
                                onClick={() => handleStatusChange(b._id, 'rejected')}
                                className="flex-1 bg-white border-2 border-red-100 text-red-500 p-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
                              >
                                <X size={16} /> Reject
                              </button>
                            )}
                            <button
                              onClick={() => navigate(`/worker/booking/${b._id}`)}
                              className="bg-gray-900 text-white p-4 rounded-xl"
                            >
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-[0.2em]">
                            <th className="px-6 py-6 text-center">sl no</th>
                            <th className="px-6 py-6">name</th>
                            <th className="px-6 py-6">mobile number</th>
                            <th className="px-6 py-6 font-center">slot</th>
                            <th className="px-6 py-6 text-center">status</th>
                            <th className="px-6 py-6 text-center">money</th>
                            <th className="px-6 py-6 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredBookings.map((b, index) => (
                            <tr key={b._id} className="hover:bg-emerald-50/30 transition-colors group">
                              <td className="px-6 py-8 text-center font-black text-gray-400">
                                {index + 1}
                              </td>
                              <td className="px-6 py-8">
                                <span className="font-black text-gray-900 leading-tight tracking-tight capitalize">{b.userName}</span>
                              </td>
                              <td className="px-6 py-8 text-[10px] font-bold text-gray-400 tracking-widest">
                                +91 {b.userPhone}
                              </td>
                              <td className="px-6 py-8">
                                <div className="flex flex-col">
                                  <span className="font-black text-gray-700 tracking-tight text-xs">
                                    {b.slot?.date ? new Date(b.slot.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) : 'N/A'}
                                  </span>
                                  <span className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-widest mt-0.5">
                                    {b.slot?.startTime || '00:00'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-8 text-center">
                                {getStatusBadge(b.bookingStatus)}
                              </td>
                              <td className="px-6 py-8 text-center font-black text-gray-900 tracking-tighter">
                                ₹{b.amount.toLocaleString()}
                              </td>
                              <td className="px-6 py-8 text-center border-l border-gray-50 bg-gray-50/20">
                                <div className="flex items-center justify-center gap-2">
                                  {b.bookingStatus !== 'confirmed' && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleStatusChange(b._id, 'confirmed'); }}
                                      className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                      title="Confirm"
                                    >
                                      <Check size={18} />
                                    </button>
                                  )}
                                  {b.bookingStatus !== 'rejected' && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleStatusChange(b._id, 'rejected'); }}
                                      className="p-2.5 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                      title="Reject"
                                    >
                                      <X size={18} />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => navigate(`/worker/booking/${b._id}`)}
                                    className="bg-white border-2 border-gray-100 hover:border-emerald-600 hover:text-emerald-600 p-2.5 rounded-xl transition-all hover:scale-110 text-gray-400 shadow-sm"
                                    title="Details"
                                  >
                                    <ChevronRight size={20} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WorkerDashboard;
