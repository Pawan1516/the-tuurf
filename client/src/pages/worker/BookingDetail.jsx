import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingsAPI } from '../../api/client';
import {
  ArrowLeft, Check, X, User, Phone, MapPin, Calendar, Clock,
  ShieldCheck, AlertCircle, Edit3, CheckCircle, XCircle,
  MessageCircle, Loader2
} from 'lucide-react';

const WorkerBookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [msgSuccess, setMsgSuccess] = useState('');
  const [userName, setUserName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [error, setError] = useState('');

  const fetchBooking = useCallback(async () => {
    try {
      setLoading(true);
      const response = await bookingsAPI.getById(id);
      setBooking(response.data.booking);
      setUserName(response.data.booking.userName);
    } catch (err) {
      console.error('Error fetching booking:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchBooking(); }, [id, fetchBooking]);

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    setError('');
    setMsgSuccess('');
    try {
      const response = await bookingsAPI.updateStatus(id, newStatus);
      setBooking(response.data.booking);
      setMsgSuccess(`✅ Booking ${newStatus}! WhatsApp sent to user.`);
      setTimeout(() => setMsgSuccess(''), 4000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleUserNameUpdate = async () => {
    if (!userName.trim()) { setError('Name cannot be empty'); return; }
    try {
      const response = await bookingsAPI.updateUsername(id, userName);
      setBooking(response.data.booking);
      setEditingName(false);
      setError('');
    } catch (error) {
      setError('Error updating name');
    }
  };

  const handlePaymentVerify = async (status) => {
    try {
      const response = await bookingsAPI.verifyPayment(id, status, booking.paymentId);
      setBooking(response.data.booking);
      setError('');
      setMsgSuccess(status === 'verified' ? '✅ Payment verified!' : '❌ Payment marked failed.');
      setTimeout(() => setMsgSuccess(''), 4000);
    } catch (error) {
      setError('Error updating payment status');
    }
  };

  const handleSendWhatsApp = async () => {
    if (!['confirmed', 'rejected', 'hold'].includes(booking.bookingStatus)) {
      setError('Can only send WhatsApp for confirmed, rejected, or hold bookings.');
      return;
    }
    setSendingMsg(true);
    setError('');
    setMsgSuccess('');
    try {
      await bookingsAPI.resendNotification(id);
      setMsgSuccess(`📱 WhatsApp message sent to ${booking.userPhone}!`);
      setTimeout(() => setMsgSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send WhatsApp.');
    } finally {
      setSendingMsg(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Loading Booking...</p>
    </div>
  );

  if (!booking) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mb-6 text-red-500">
        <AlertCircle size={40} />
      </div>
      <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase">Booking Not Found</h2>
      <button onClick={() => navigate('/worker/dashboard')} className="mt-8 bg-emerald-600 text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-emerald-700 transition-all">
        Return to Dashboard
      </button>
    </div>
  );

  const statusColors = {
    confirmed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
    hold: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    pending: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-emerald-900 pt-20 pb-40 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-400 rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-5xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-4">
            <button
              onClick={() => navigate('/worker/dashboard')}
              className="bg-white/10 hover:bg-white/20 text-emerald-100 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all mb-4 outline-none"
            >
              <ArrowLeft size={14} /> Back to Dashboard
            </button>
            <h2 className="text-4xl font-black text-white tracking-tight uppercase">Booking Details</h2>
            <div className="flex items-center gap-3">
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-3 py-1 rounded-md uppercase tracking-widest border border-emerald-500/30">
                #{booking._id?.slice(-6) || 'XXXXXX'}
              </span>
              <span className={`text-[10px] font-black px-3 py-1 rounded-md uppercase tracking-widest border ${statusColors[booking.bookingStatus] || statusColors.pending}`}>
                {booking.bookingStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 -mt-24 relative z-20 mb-20 w-full">

        {/* Alerts */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-6 py-4 rounded-2xl flex items-center gap-3">
            <XCircle size={16} /> {error}
          </div>
        )}
        {msgSuccess && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-6 py-4 rounded-2xl flex items-center gap-3">
            <CheckCircle size={16} /> {msgSuccess}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Customer + Slot Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Customer Card */}
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-emerald-900/5 border border-gray-100 p-10">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-10 flex items-center gap-3">
                <User size={16} className="text-emerald-600" /> Customer Information
              </h3>
              <div className="space-y-10">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Full Name</p>
                  {editingName ? (
                    <div className="flex gap-2">
                      <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} className="bg-gray-50 border-2 border-emerald-500 p-4 rounded-xl outline-none font-black text-gray-900 w-full" />
                      <button onClick={handleUserNameUpdate} className="bg-emerald-600 text-white px-6 rounded-xl font-black uppercase text-[10px]">Save</button>
                      <button onClick={() => { setUserName(booking.userName); setEditingName(false); }} className="bg-gray-100 text-gray-400 px-6 rounded-xl font-black uppercase text-[10px]">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <p className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">{booking.userName}</p>
                      <button onClick={() => setEditingName(true)} className="text-emerald-600 p-2 hover:bg-emerald-50 rounded-lg transition-colors">
                        <Edit3 size={18} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid md:grid-cols-2 gap-10">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Phone</p>
                    <div className="flex items-center gap-3 text-lg font-black text-gray-900 tracking-tight">
                      <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600"><Phone size={18} /></div>
                      +91 {booking.userPhone}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Location</p>
                    <div className="flex items-center gap-3 text-lg font-black text-gray-900 tracking-tight">
                      <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600"><MapPin size={18} /></div>
                      {booking.turfLocation || 'Not Specified'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Slot Details */}
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-emerald-900/5 border border-gray-100 p-10">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-10 flex items-center gap-3">
                <Calendar size={16} className="text-emerald-600" /> Slot Details
              </h3>
              <div className="grid md:grid-cols-3 gap-10">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Date</p>
                  <p className="text-xl font-black text-gray-900 tracking-tight">
                    {booking.slot?.date ? new Date(booking.slot.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'TBD'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Time</p>
                  <p className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <Clock size={18} className="text-emerald-500" />
                    {booking.slot?.startTime || '00:00'} – {booking.slot?.endTime || '00:00'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Amount</p>
                  <p className="text-xl font-black text-emerald-600 tracking-tight">₹{booking.amount?.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="space-y-6">
            {/* Payment Verification */}
            <div className="bg-emerald-900 rounded-[2.5rem] shadow-2xl shadow-emerald-900/20 p-8 text-white">
              <h3 className="text-[10px] font-black text-emerald-400/60 uppercase tracking-[0.2em] mb-6">Payment</h3>
              <div className="space-y-5">
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">
                    {booking.paymentStatus === 'submitted' ? 'Transaction ID' : 'Payment ID'}
                  </p>
                  <p className="font-mono text-xs opacity-60 truncate">
                    {booking.transactionId || booking.paymentId || 'NO_IDENTIFIER'}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handlePaymentVerify('verified')} disabled={booking.paymentStatus === 'verified'} className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:bg-white/10 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all outline-none">
                    <ShieldCheck size={14} /> Verify
                  </button>
                  <button onClick={() => handlePaymentVerify('failed')} disabled={booking.paymentStatus === 'failed'} className="flex-1 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all outline-none">
                    <X size={14} /> Fail
                  </button>
                </div>
                <p className={`text-[10px] font-black text-center uppercase tracking-[0.2em] ${booking.paymentStatus === 'verified' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                  Status: {booking.paymentStatus}
                </p>
              </div>
            </div>

            {/* Status Buttons */}
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-emerald-900/5 border border-gray-100 p-8">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.15em] mb-6">Booking Actions</h3>
              <div className="space-y-3">
                {/* Confirm */}
                <button
                  onClick={() => handleStatusChange('confirmed')}
                  disabled={updatingStatus || booking.bookingStatus === 'confirmed'}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 transition-all outline-none border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1"
                >
                  {updatingStatus ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  ✅ Confirm Booking
                </button>

                {/* Reject */}
                <button
                  onClick={() => handleStatusChange('rejected')}
                  disabled={updatingStatus || booking.bookingStatus === 'rejected'}
                  className="w-full bg-red-50 hover:bg-red-100 disabled:opacity-30 text-red-600 py-4 rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 transition-all outline-none border-b-4 border-red-200 active:border-b-0 active:translate-y-1"
                >
                  <XCircle size={16} />
                  ❌ Reject Booking
                </button>

                {/* Hold */}
                <button
                  onClick={() => handleStatusChange('hold')}
                  disabled={updatingStatus || booking.bookingStatus === 'hold'}
                  className="w-full bg-yellow-50 hover:bg-yellow-100 disabled:opacity-30 text-yellow-700 py-4 rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 transition-all outline-none border-b-4 border-yellow-200 active:border-b-0 active:translate-y-1"
                >
                  <Clock size={16} />
                  ⏳ Put on Hold
                </button>

                <div className="border-t border-gray-100 pt-3">
                  {/* Send WhatsApp */}
                  <button
                    onClick={handleSendWhatsApp}
                    disabled={sendingMsg || !['confirmed', 'rejected', 'hold'].includes(booking.bookingStatus)}
                    className="w-full bg-[#25D366] hover:bg-[#1ebe5c] disabled:opacity-30 text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 transition-all outline-none shadow-lg shadow-green-200"
                  >
                    {sendingMsg ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
                    📱 Send WhatsApp
                  </button>
                  <p className="text-[9px] text-gray-400 text-center mt-2 font-medium">
                    Resends status message to {booking.userPhone}
                  </p>
                </div>
              </div>

              <p className="mt-6 text-[9px] text-gray-400 font-bold uppercase leading-relaxed text-center px-2">
                Confirming will notify user via WhatsApp & lock the slot.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerBookingDetail;
