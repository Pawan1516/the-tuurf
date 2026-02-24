import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingsAPI } from '../api/client';
import { Lock, ArrowLeft, Info, QrCode, ShieldCheck, Zap, Hash, Clock } from 'lucide-react';

const PaymentPage = () => {
    const { bookingId } = useParams();
    const navigate = useNavigate();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [transactionId, setTransactionId] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const fetchBooking = async () => {
            try {
                const res = await bookingsAPI.getById(bookingId);
                setBooking(res.data.booking);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching booking:', err);
                setError('Failed to load booking details.');
                setLoading(false);
            }
        };
        fetchBooking();
    }, [bookingId]);

    const handleManualPaymentSubmit = async (e) => {
        e.preventDefault();
        if (!transactionId.trim()) {
            setError('Incomplete Metadata. Please enter your Transaction ID or UTR.');
            return;
        }

        try {
            setIsProcessing(true);
            setError('');

            const res = await bookingsAPI.submitPayment(bookingId, transactionId);

            if (res.data.success) {
                navigate('/booking-success', { state: { booking: res.data.booking, manual: true } });
            } else {
                setError(res.data.message || 'Transmission Failed');
            }
        } catch (err) {
            console.error('Submission error:', err);
            setError('Synchronization Failure. Please re-attempt transmission.');
        } finally {
            setIsProcessing(false);
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
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Loading Transmission Interface...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24">
            <div className="max-w-2xl mx-auto px-6 py-12">

                <button
                    onClick={() => navigate('/')}
                    className="mb-8 flex items-center gap-3 text-gray-400 hover:text-emerald-600 transition-all group"
                >
                    <div className="bg-white p-2 rounded-lg border border-gray-100 group-hover:border-emerald-200 shadow-sm transition-all">
                        <ArrowLeft size={16} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Cancel Transaction</span>
                </button>

                <div className="bg-white rounded-[3.5rem] shadow-2xl shadow-emerald-950/[0.03] overflow-hidden border border-gray-100">
                    <div className="p-12 text-center border-b border-gray-100 bg-[#0F172A] text-white relative">
                        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
                            <div className="absolute top-[-50px] left-[-50px] w-64 h-64 bg-emerald-500 rounded-full blur-[100px]"></div>
                        </div>

                        <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-emerald-400 border border-emerald-500/20 relative z-10">
                            <QrCode size={36} />
                        </div>
                        <h2 className="text-3xl font-black tracking-tighter mb-2 uppercase relative z-10">Transfer <span className="text-emerald-400">Initiated</span></h2>
                        <div className="flex items-center justify-center gap-3 opacity-60 relative z-10">
                            <div className="h-[1px] w-8 bg-emerald-400"></div>
                            <p className="font-black uppercase text-[9px] tracking-[0.3em]">Phase Two: Secure Transfer</p>
                            <div className="h-[1px] w-8 bg-emerald-400"></div>
                        </div>
                    </div>

                    <div className="p-12 space-y-12">
                        {/* QR Section */}
                        <div className="flex flex-col items-center">
                            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-emerald-50 inline-block shadow-2xl shadow-emerald-900/5 relative group">
                                <div className="absolute inset-0 bg-emerald-500/5 scale-0 group-hover:scale-100 transition-transform duration-500 rounded-[2.5rem]"></div>
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=theturf@upi&pn=The%20Turf&am=${booking?.amount}&cu=INR`}
                                    alt="Payment QR"
                                    className="w-56 h-56 mx-auto relative z-10 rounded-xl"
                                />
                            </div>

                            <div className="mt-8 text-center space-y-2">
                                <p className="text-gray-900 font-black text-2xl tracking-tighter uppercase leading-none">theturf@upi</p>
                                <div className="flex items-center justify-center gap-2">
                                    <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                    <p className="text-gray-400 font-black text-[9px] uppercase tracking-[0.3em]">Verified Settlement Hub</p>
                                </div>
                            </div>
                        </div>

                        {/* Order Summary */}
                        <div className="bg-gray-50 rounded-[2rem] p-10 space-y-6 border border-gray-100 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-150 transition-transform duration-700">
                                <Zap size={80} className="text-gray-900" />
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                                <span className="flex items-center gap-2"><Clock size={12} /> Allocation Window</span>
                                <span className="text-gray-900">
                                    {formatTime12h(booking?.slot.startTime)} – {formatTime12h(booking?.slot.endTime)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none pt-2">
                                <span className="flex items-center gap-2"><Hash size={12} /> Unique Booking ID</span>
                                <span className="text-gray-900 tracking-tighter">{booking?._id.slice(-12).toUpperCase()}</span>
                            </div>
                            <div className="pt-6 border-t border-gray-200 flex justify-between items-end">
                                <span className="font-black text-gray-900 uppercase text-xs tracking-widest">Total Settle Amount</span>
                                <span className="text-4xl font-black text-emerald-600 tracking-tighter">₹{booking?.amount}</span>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleManualPaymentSubmit} className="space-y-8">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Validation Token (Transaction ID / UTR)</label>
                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-tighter cursor-pointer hover:opacity-70">
                                        Where to find? <Info size={12} />
                                    </div>
                                </div>
                                <div className="relative group">
                                    <Hash className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors" size={20} />
                                    <input
                                        type="text"
                                        placeholder="ENTER 12-DIGIT UTR"
                                        className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500/30 focus:bg-white p-6 pl-16 rounded-[1.5rem] outline-none transition-all font-black text-sm text-gray-900 placeholder:text-gray-200 tracking-[0.2em] shadow-inner"
                                        value={transactionId}
                                        onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
                                        required
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50/50 border-2 border-red-100/50 p-6 rounded-[1.5rem] flex items-start gap-4 animate-shake">
                                    <div className="bg-red-500 text-white p-1.5 rounded-lg shadow-lg shadow-red-500/30 shrink-0"><Info size={14} /></div>
                                    <p className="text-red-700 text-[10px] font-black uppercase tracking-widest leading-normal">System: {error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isProcessing}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 text-white font-black py-7 rounded-[2rem] shadow-2xl shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all transform hover:-translate-y-1 active:scale-95 text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4 group overflow-hidden relative"
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        VALIDATING TRANSMISSION...
                                    </>
                                ) : (
                                    <>
                                        Authorize Final Transfer
                                        <ShieldCheck size={18} className="group-hover:scale-125 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="flex items-center gap-2 text-gray-300 font-black text-[9px] uppercase tracking-[0.4em]">
                                <Lock size={12} className="text-emerald-500" /> End-to-End Secure Channel
                            </div>
                            <p className="text-[9px] text-gray-400 font-extrabold max-w-[85%] uppercase tracking-tight leading-relaxed">
                                Our security node monitors this transaction. Once the validation token is submitted, our ground personnel will verify the settlement within 15 system minutes.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentPage;
