import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { slotsAPI, bookingsAPI } from '../api/client';
import AuthContext from '../context/AuthContext';
import { Calendar, Clock, User, Phone, MapPin, ShieldCheck, ChevronRight, Info, Zap, ArrowLeft } from 'lucide-react';

const BookingPage = () => {
    const { slotId } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        fullName: user?.name || '',
        whatsappNumber: user?.phone || '',
        date: '',
        startTime: '',
        endTime: ''
    });
    const [calculatedPrice, setCalculatedPrice] = useState(500);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (formData.startTime && formData.endTime) {
            const [sh, sm] = formData.startTime.split(':').map(Number);
            const [eh, em] = formData.endTime.split(':').map(Number);
            const duration = (eh * 60 + em) - (sh * 60 + sm);
            if (duration > 0) {
                setCalculatedPrice(Math.max(200, Math.ceil((duration / 60) * 500)));
            }
        }
    }, [formData.startTime, formData.endTime]);

    const adjustEndTime = (minutes) => {
        if (!formData.startTime) return;
        const [h, m] = formData.startTime.split(':').map(Number);
        const totalMins = h * 60 + m + minutes;
        const nh = Math.floor(totalMins / 60);
        const nm = totalMins % 60;
        // Cap at 23:59
        const cappedH = Math.min(23, nh);
        const cappedM = nh > 23 ? 59 : nm;
        const newEndTime = `${cappedH.toString().padStart(2, '0')}:${cappedM.toString().padStart(2, '0')}`;
        setFormData(prev => ({ ...prev, endTime: newEndTime }));
    };

    useEffect(() => {
        const fetchSlot = async () => {
            if (!slotId || slotId === 'custom') {
                setFormData(prev => ({
                    ...prev,
                    date: new Date().toISOString().split('T')[0],
                    startTime: '10:00',
                    endTime: '11:00'
                }));
                setLoading(false);
                return;
            }
            try {
                const res = await slotsAPI.getById(slotId);
                const s = res.data.slot || res.data;
                // Sync formData with slot data
                setFormData(prev => ({
                    ...prev,
                    date: s.date ? new Date(s.date).toISOString().split('T')[0] : '',
                    startTime: s.startTime || '',
                    endTime: s.endTime || ''
                }));
                setLoading(false);
            } catch (err) {
                console.error('Error fetching slot:', err);
                setError('Failed to load slot details.');
                setLoading(false);
            }
        };
        fetchSlot();
    }, [slotId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.fullName || !formData.whatsappNumber || !formData.date || !formData.startTime || !formData.endTime) {
            setError('Operational Protocol Violation: All deployment specifications (Name, WhatsApp, Date, Start, and End) must be finalized.');
            return;
        }

        if (formData.whatsappNumber.length !== 10) {
            setError('Invalid Pulse. Please enter a valid 10-digit number.');
            return;
        }

        setSubmitting(true);
        try {
            const apiPayload = {
                userName: formData.fullName,
                userPhone: formData.whatsappNumber,
                date: formData.date,
                startTime: formData.startTime,
                endTime: formData.endTime,
                turfLocation: 'The Turf, Miyapur',
                amount: calculatedPrice,
                userId: user?.id
            };

            if (slotId && slotId !== 'custom') {
                apiPayload.slotId = slotId;
            }

            const res = await bookingsAPI.create(apiPayload);

            navigate(`/payment/${res.data.booking._id}`);
        } catch (err) {
            console.error('Booking error:', err);
            const serverMessage = err.response?.data?.message;
            const targetUrl = process.env.REACT_APP_API_URL || 'localhost (Spec Violation)';
            setError(serverMessage || `Synchronization Error. Target [${targetUrl}] may be unstable.`);
            setSubmitting(false);
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

    if (loading) return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
            <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Initializing Reservation Protocol...</p>
        </div>
    );

    const courtFee = Math.round(calculatedPrice * 0.8);
    const convenienceFee = calculatedPrice - courtFee;

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24">
            {/* Minimal Header for Flow */}
            <div className="bg-white border-b border-gray-100 h-20 md:h-24 flex items-center px-4 md:px-6 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
                    <button onClick={() => navigate('/')} className="flex items-center gap-2 md:gap-3 text-gray-400 hover:text-emerald-600 transition-all group">
                        <div className="bg-gray-50 p-2 md:p-2.5 rounded-xl group-hover:bg-emerald-50 transition-colors">
                            <ArrowLeft size={18} />
                        </div>
                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">Abort Reservation</span>
                    </button>
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50"></div>
                        <span className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Live Node Sync</span>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-16">
                <div className="grid lg:grid-cols-2 gap-10 md:gap-16 items-start">

                    {/* Left Column: Summary & Verification */}
                    <div className="space-y-8 md:space-y-10">
                        <div className="flex flex-col gap-3 md:gap-4">
                            <div className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] w-fit">
                                Milestone: Slot Reservation
                            </div>
                            <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase leading-none">
                                Allocation <span className="text-emerald-600">Details</span>
                            </h1>
                            <p className="text-xs md:text-sm text-gray-500 font-medium leading-relaxed max-w-sm">
                                System ready for slot assignment. Verify the temporal window and location identifiers before proceeding.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-emerald-900/[0.02] flex flex-col gap-4 transition-transform hover:scale-[1.02]">
                                    <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600 w-fit">
                                        <Calendar size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Target Date</p>
                                        <p className="font-black text-gray-900 text-lg uppercase tracking-tight">
                                            {formData.date ? new Date(formData.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'SELECT DATE'}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-emerald-900/[0.02] flex flex-col gap-4 transition-transform hover:scale-[1.02]">
                                    <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600 w-fit">
                                        <Clock size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Temporal Window</p>
                                        <div className="flex items-center justify-between">
                                            <p className="font-black text-gray-900 text-lg uppercase tracking-tight leading-none">
                                                {formatTime12h(formData.startTime)} – {formatTime12h(formData.endTime)}
                                            </p>
                                            {formData.startTime && formData.endTime && (
                                                <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md uppercase">
                                                    {(() => {
                                                        const [sh, sm] = formData.startTime.split(':').map(Number);
                                                        const [eh, em] = formData.endTime.split(':').map(Number);
                                                        const mins = (eh * 60 + em) - (sh * 60 + sm);
                                                        return mins > 0 ? `${mins} MINS` : 'INV';
                                                    })()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-emerald-900/[0.03] flex items-center gap-6">
                                <div className="bg-emerald-500/10 p-5 rounded-3xl text-emerald-600 border border-emerald-500/20">
                                    <Zap size={28} className="fill-emerald-600/10" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Fee (Min-wise)</p>
                                    <p className="text-3xl font-black text-gray-900 tracking-tighter leading-none">
                                        ₹{calculatedPrice.toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-emerald-900/[0.02] flex items-center justify-between transition-transform hover:scale-[1.01]">
                                <div className="flex items-center gap-6">
                                    <div className="bg-emerald-100 p-4 rounded-3xl text-emerald-600 shadow-inner">
                                        <MapPin size={28} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Venue Cluster</p>
                                        <p className="font-black text-gray-900 text-xl uppercase tracking-tighter">The Turf, Miyapur</p>
                                        <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mt-0.5">Arena One · Premier Surface</p>
                                    </div>
                                </div>
                                <div className="hidden md:block">
                                    <Zap size={24} className="text-gray-100 fill-gray-100" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#1e293b] p-10 rounded-[3rem] shadow-2xl shadow-emerald-950/20 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-10">
                                <ShieldCheck size={140} className="text-emerald-400" />
                            </div>
                            <div className="flex items-center gap-3 text-emerald-400 font-black mb-4 text-[10px] uppercase tracking-[0.3em] relative z-10">
                                <Zap size={18} className="fill-emerald-400" /> Arena Protocol v1.0
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tight mb-4 relative z-10">Encryption Active</h3>
                            <p className="text-sm text-gray-400 leading-relaxed font-medium relative z-10">
                                All reservation data is handled through our high-precision matching engine. Confirmation identifiers will be transmitted to your terminal via encrypted WhatsApp protocol.
                            </p>
                        </div>
                    </div>

                    {/* Right Column: Reservation Form */}
                    <div className="bg-white rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl shadow-emerald-950/5 p-8 md:p-12 border border-blue-50/20 relative">
                        <div className="mb-8 md:mb-12 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tighter uppercase leading-none">Identity</h2>
                                <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-2">Operator Information</p>
                            </div>
                            <div className="h-12 w-12 md:h-14 md:w-14 bg-gray-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-gray-100">
                                <User size={24} />
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-10">
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Target Date</label>
                                        <input
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500/30 focus:bg-white p-6 rounded-[1.5rem] outline-none transition-all font-black text-sm text-gray-900 uppercase tracking-wider"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Time Segment (07:00 AM - 11:00 PM)</label>
                                        <div className="flex flex-col gap-2">
                                            <div className="flex gap-2">
                                                <input
                                                    type="time"
                                                    min="07:00"
                                                    max="23:00"
                                                    value={formData.startTime}
                                                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                                    className="w-1/2 bg-gray-50 border-2 border-transparent focus:border-emerald-500/30 focus:bg-white p-4 md:p-6 rounded-xl md:rounded-[1.5rem] outline-none transition-all font-black text-xs md:text-sm text-gray-900 uppercase tracking-wider"
                                                    required
                                                />
                                                <input
                                                    type="time"
                                                    min="07:00"
                                                    max="23:00"
                                                    value={formData.endTime}
                                                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                                    className="w-1/2 bg-gray-50 border-2 border-transparent focus:border-emerald-500/30 focus:bg-white p-4 md:p-6 rounded-xl md:rounded-[1.5rem] outline-none transition-all font-black text-xs md:text-sm text-gray-900 uppercase tracking-wider"
                                                    required
                                                />
                                            </div>
                                            <div className="flex gap-2 px-1">
                                                {[60, 90, 120].map(mins => (
                                                    <button
                                                        key={mins}
                                                        type="button"
                                                        onClick={() => adjustEndTime(mins)}
                                                        className="flex-1 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100"
                                                    >
                                                        {mins} MINS
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Identity</label>
                                    <div className="relative group">
                                        <User className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors" size={18} />
                                        <input
                                            type="text"
                                            placeholder="RECIPIENT NAME"
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value.toUpperCase() })}
                                            className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500/30 focus:bg-white p-5 md:p-6 pl-14 md:pl-16 rounded-xl md:rounded-[1.5rem] outline-none transition-all font-black text-xs md:text-sm text-gray-900 placeholder:text-gray-200 uppercase tracking-wider"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp Comm-Link</label>
                                    <div className="relative group">
                                        <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors" size={18} />
                                        <input
                                            type="tel"
                                            maxLength="10"
                                            placeholder="000 000 0000"
                                            value={formData.whatsappNumber}
                                            onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value.replace(/\D/g, '') })}
                                            className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500/30 focus:bg-white p-5 md:p-6 pl-14 md:pl-16 rounded-xl md:rounded-[1.5rem] outline-none transition-all font-black text-xs md:text-sm text-gray-900 placeholder:text-gray-200 tracking-[0.15em] md:tracking-[0.2em]"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-950 p-10 rounded-[2.5rem] space-y-6 shadow-2xl shadow-gray-950/20">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 font-black uppercase tracking-[0.2em] text-[9px]">Infrastructure Access</span>
                                    <span className="font-black text-white text-xs tracking-wider">₹{courtFee.toLocaleString()}.00</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 font-black uppercase tracking-[0.2em] text-[9px]">System Overhead</span>
                                    <span className="font-black text-white text-xs tracking-wider">₹{convenienceFee.toLocaleString()}.00</span>
                                </div>
                                <div className="pt-6 border-t border-white/5 flex justify-between items-center">
                                    <span className="font-black text-white uppercase tracking-widest text-[10px]">Total Balance Due</span>
                                    <span className="text-4xl font-black text-emerald-400 tracking-tighter">₹{calculatedPrice.toLocaleString()}.00</span>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50/50 border-2 border-red-100/50 p-6 rounded-[1.5rem] flex items-start gap-4 animate-shake">
                                    <div className="bg-red-500 text-white p-1.5 rounded-lg shadow-lg shadow-red-500/30 shrink-0"><Info size={14} /></div>
                                    <p className="text-red-700 text-[10px] font-black uppercase tracking-widest leading-normal">System: {error}</p>
                                </div>
                            )}

                            <div className="pt-2 space-y-6">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 text-white font-black py-7 rounded-[2rem] shadow-2xl shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all transform hover:-translate-y-1 active:scale-95 text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4 group overflow-hidden relative"
                                >
                                    {submitting ? (
                                        <>
                                            <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            DEPLOYING RESERVATION...
                                        </>
                                    ) : (
                                        <>
                                            Authorize Payment Phase
                                            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                                <div className="text-center px-6">
                                    <p className="text-[8px] text-gray-300 font-bold uppercase tracking-[0.3em] leading-relaxed">
                                        By authorizing, you consent to the <span className="text-emerald-600/60 underline cursor-pointer hover:text-emerald-600 transition-colors">Protocol Agreements</span> and automated system policies.
                                    </p>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingPage;
