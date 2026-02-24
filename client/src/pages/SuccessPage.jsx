import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { bookingsAPI } from '../api/client';
import { CheckCircle, XCircle, Phone, MapPin, Calendar, Clock, ArrowRight, User, Hash, Trophy, Zap, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

const SuccessPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const initialBooking = location.state?.booking;
    const [booking, setBooking] = useState(initialBooking);
    const [liveStatus, setLiveStatus] = useState(initialBooking?.bookingStatus || 'pending');
    const [slotStatus, setSlotStatus] = useState('hold');
    const [polling, setPolling] = useState(true);

    useEffect(() => {
        if (!initialBooking) {
            navigate('/');
        }
    }, [initialBooking, navigate]);

    // Poll for live status updates every 5 seconds
    useEffect(() => {
        if (!initialBooking?._id) return;

        const pollStatus = async () => {
            try {
                const res = await bookingsAPI.getById(initialBooking._id);
                const updated = res.data.booking || res.data;
                setBooking(updated);
                setLiveStatus(updated.bookingStatus);
                setSlotStatus(updated.slot?.status || 'hold');

                // Stop polling if final state reached
                if (['confirmed', 'rejected'].includes(updated.bookingStatus)) {
                    setPolling(false);
                }
            } catch (err) {
                console.error('Status poll error:', err);
            }
        };

        pollStatus(); // Initial fetch
        const interval = setInterval(pollStatus, 5000);
        return () => clearInterval(interval);
    }, [initialBooking]);

    if (!booking) return null;

    const formatTime12h = (time24) => {
        if (!time24) return '';
        const [hours, minutes] = time24.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    const getStatusConfig = () => {
        switch (liveStatus) {
            case 'confirmed':
                return {
                    icon: <CheckCircle size={48} className="text-emerald-400" />,
                    title: 'Booking Confirmed',
                    subtitle: 'Your slot has been secured successfully',
                    headerBg: 'bg-emerald-900',
                    badgeBg: 'bg-emerald-500/10',
                    badgeBorder: 'border-emerald-500/20',
                    dotColor: 'bg-emerald-500',
                    dotShadow: 'shadow-emerald-500/50',
                    statusText: 'CONFIRMED',
                    statusColor: 'text-emerald-400',
                    slotLabel: 'BOOKED',
                    slotBg: 'bg-emerald-500/10',
                    slotColor: 'text-emerald-600'
                };
            case 'rejected':
                return {
                    icon: <XCircle size={48} className="text-red-400" />,
                    title: 'Booking Rejected',
                    subtitle: 'Your booking could not be processed',
                    headerBg: 'bg-red-900',
                    badgeBg: 'bg-red-500/10',
                    badgeBorder: 'border-red-500/20',
                    dotColor: 'bg-red-500',
                    dotShadow: 'shadow-red-500/50',
                    statusText: 'REJECTED',
                    statusColor: 'text-red-400',
                    slotLabel: 'FREE',
                    slotBg: 'bg-red-50',
                    slotColor: 'text-red-600'
                };
            case 'hold':
                return {
                    icon: <AlertCircle size={48} className="text-blue-400" />,
                    title: 'Booking On Hold',
                    subtitle: 'Under review by admin',
                    headerBg: 'bg-blue-900',
                    badgeBg: 'bg-blue-500/10',
                    badgeBorder: 'border-blue-500/20',
                    dotColor: 'bg-blue-500',
                    dotShadow: 'shadow-blue-500/50',
                    statusText: 'ON HOLD',
                    statusColor: 'text-blue-400',
                    slotLabel: 'HOLD',
                    slotBg: 'bg-blue-50',
                    slotColor: 'text-blue-600'
                };
            default: // pending
                return {
                    icon: <Clock size={48} className="text-yellow-400" />,
                    title: 'Booking Pending',
                    subtitle: 'Waiting for confirmation',
                    headerBg: 'bg-[#0F172A]',
                    badgeBg: 'bg-yellow-500/10',
                    badgeBorder: 'border-yellow-500/20',
                    dotColor: 'bg-yellow-500',
                    dotShadow: 'shadow-yellow-500/50',
                    statusText: 'PENDING',
                    statusColor: 'text-yellow-400',
                    slotLabel: 'HOLD',
                    slotBg: 'bg-yellow-50',
                    slotColor: 'text-yellow-600'
                };
        }
    };

    const config = getStatusConfig();
    const slot = booking.slot || {};

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center py-20 px-6">
            <div className="max-w-xl w-full">
                <div className="bg-white rounded-[4rem] shadow-2xl shadow-emerald-950/5 border border-gray-100 overflow-hidden relative transition-all hover:shadow-emerald-950/10">

                    {/* Status Header */}
                    <div className={`${config.headerBg} p-16 text-center text-white relative`}>
                        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                            <div className="absolute top-[-40px] left-[-40px] w-64 h-64 bg-emerald-500 rounded-full blur-[100px]"></div>
                        </div>

                        <div className={`w-24 h-24 ${config.badgeBg} backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border ${config.badgeBorder} shadow-2xl relative z-10`}>
                            {config.icon}
                        </div>
                        <h1 className="text-4xl font-black mb-3 tracking-tighter uppercase relative z-10">
                            {config.title}
                        </h1>
                        <div className="flex items-center justify-center gap-3 opacity-60 relative z-10">
                            <div className="h-[1px] w-6 bg-white/40"></div>
                            <p className="font-black uppercase text-[9px] tracking-[0.4em]">{config.subtitle}</p>
                            <div className="h-[1px] w-6 bg-white/40"></div>
                        </div>
                    </div>

                    <div className="p-12 space-y-10">

                        {/* Live Status Tracker */}
                        <div className="bg-gray-50 rounded-[2rem] p-8 border border-gray-100">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]">Live Status</h3>
                                {polling && (
                                    <div className="flex items-center gap-2">
                                        <RefreshCw size={12} className="text-emerald-500 animate-spin" />
                                        <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Auto-updating</span>
                                    </div>
                                )}
                            </div>

                            {/* Status Steps */}
                            <div className="flex items-center justify-between gap-2">
                                {/* Step 1: Booked */}
                                <div className="flex flex-col items-center gap-2 flex-1">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${['pending', 'hold', 'confirmed', 'rejected'].includes(liveStatus) ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                        <CheckCircle size={18} />
                                    </div>
                                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">Submitted</span>
                                </div>

                                <div className={`h-[2px] flex-1 ${['hold', 'confirmed', 'rejected'].includes(liveStatus) ? 'bg-emerald-500' : 'bg-gray-200'}`}></div>

                                {/* Step 2: On Hold / Under Review */}
                                <div className="flex flex-col items-center gap-2 flex-1">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${liveStatus === 'hold' ? 'bg-blue-500 text-white animate-pulse' : ['confirmed', 'rejected'].includes(liveStatus) ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                        <AlertCircle size={18} />
                                    </div>
                                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">Review</span>
                                </div>

                                <div className={`h-[2px] flex-1 ${['confirmed', 'rejected'].includes(liveStatus) ? (liveStatus === 'confirmed' ? 'bg-emerald-500' : 'bg-red-500') : 'bg-gray-200'}`}></div>

                                {/* Step 3: Final Status */}
                                <div className="flex flex-col items-center gap-2 flex-1">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${liveStatus === 'confirmed' ? 'bg-emerald-500 text-white' : liveStatus === 'rejected' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                        {liveStatus === 'rejected' ? <XCircle size={18} /> : <Trophy size={18} />}
                                    </div>
                                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">
                                        {liveStatus === 'rejected' ? 'Rejected' : 'Confirmed'}
                                    </span>
                                </div>
                            </div>

                            {/* Current Status Badge */}
                            <div className="mt-6 flex items-center justify-center gap-3">
                                <div className={`h-2 w-2 rounded-full ${config.dotColor} animate-pulse ${config.dotShadow} shadow-lg`}></div>
                                <span className={`text-xs font-black uppercase tracking-[0.2em] ${config.statusColor}`}>
                                    Booking: {config.statusText}
                                </span>
                                <span className="text-gray-300">·</span>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${config.slotBg} ${config.slotColor}`}>
                                    Slot: {config.slotLabel}
                                </span>
                            </div>
                        </div>

                        {/* Booking Details */}
                        <div className="bg-gray-50 rounded-[2.5rem] p-10 border border-gray-100 space-y-8 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-full bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                            <div className="flex justify-between items-center relative z-10">
                                <div className="bg-emerald-500/10 p-4 rounded-3xl text-emerald-600 shadow-inner">
                                    <ShieldCheck size={32} />
                                </div>
                                <div className="text-right">
                                    <span className="text-gray-400 text-[9px] font-black uppercase tracking-[0.3em] flex items-center justify-end gap-2 mb-1">
                                        <Hash size={12} /> Booking ID
                                    </span>
                                    <span className="text-gray-900 font-black text-xs bg-white border border-gray-100 px-4 py-1.5 rounded-xl shadow-sm">
                                        {booking._id?.slice(-8).toUpperCase()}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-8 gap-y-8 relative z-10">
                                <div className="space-y-1">
                                    <p className="text-gray-400 text-[8px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                                        <User size={12} /> Name
                                    </p>
                                    <p className="text-gray-900 font-black text-sm uppercase tracking-tight">{booking.userName}</p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-gray-400 text-[8px] font-black uppercase tracking-[0.3em] flex items-center justify-end gap-2">
                                        <Phone size={12} /> Phone
                                    </p>
                                    <p className="text-gray-900 font-black text-sm tracking-tight">+91 {booking.userPhone}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-gray-400 text-[8px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                                        <Calendar size={12} /> Date
                                    </p>
                                    <p className="text-gray-900 font-black text-sm uppercase tracking-tight">
                                        {slot.date ? new Date(slot.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                                    </p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-gray-400 text-[8px] font-black uppercase tracking-[0.3em] flex items-center justify-end gap-2">
                                        <Clock size={12} /> Time
                                    </p>
                                    <p className="text-gray-900 font-black text-sm uppercase tracking-tight">
                                        {formatTime12h(slot.startTime)} – {formatTime12h(slot.endTime)}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-gray-400 text-[8px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                                        <MapPin size={12} /> Venue
                                    </p>
                                    <p className="text-gray-900 font-black text-sm uppercase tracking-tight">The Turf, Miyapur</p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-gray-400 text-[8px] font-black uppercase tracking-[0.3em]">Amount</p>
                                    <p className="text-emerald-600 font-black text-xl tracking-tighter">₹{booking.amount?.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-gray-200 flex justify-between items-center relative z-10">
                                <span className="text-gray-900 font-black uppercase text-[10px] tracking-widest">Payment</span>
                                <div className="flex items-center gap-2">
                                    <div className={`h-1.5 w-1.5 rounded-full animate-pulse shadow-lg ${booking.paymentStatus === 'verified' ? 'bg-emerald-500 shadow-emerald-500/50' : booking.paymentStatus === 'submitted' ? 'bg-purple-500 shadow-purple-500/50' : 'bg-yellow-500 shadow-yellow-500/50'}`}></div>
                                    <span className={`font-black text-[10px] uppercase tracking-widest ${booking.paymentStatus === 'verified' ? 'text-emerald-600' : booking.paymentStatus === 'submitted' ? 'text-purple-600' : 'text-yellow-600'}`}>
                                        {booking.paymentStatus === 'verified' ? 'Verified' : booking.paymentStatus === 'submitted' ? 'Under Review' : 'Pending'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* WhatsApp Notification */}
                        <div className="bg-emerald-900 p-8 rounded-[2rem] flex items-start gap-6 shadow-2xl shadow-emerald-950/20 relative group">
                            <div className="bg-emerald-400/10 p-4 rounded-2xl text-emerald-400 border border-emerald-400/20 shadow-inner group-hover:scale-110 transition-transform">
                                <Zap size={24} className="fill-emerald-400" />
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-black text-white text-[10px] uppercase tracking-[0.3em]">WhatsApp Notification</h4>
                                <p className="text-emerald-100/60 text-xs font-medium leading-relaxed">
                                    Status updates will be sent to <span className="text-white font-black">+91 {booking.userPhone}</span> via WhatsApp.
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate('/')}
                            className="w-full bg-gray-900 hover:bg-black text-white font-black py-7 rounded-[2rem] shadow-2xl shadow-gray-900/10 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-4 text-xs uppercase tracking-[0.3em] group"
                        >
                            Book Another Slot <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuccessPage;
