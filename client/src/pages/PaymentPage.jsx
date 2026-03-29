import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingsAPI, slotsAPI, paymentsAPI } from '../api/client';
import { Lock, ArrowLeft, Info, QrCode, ShieldCheck, Zap, Hash, Clock, CreditCard, ChevronRight } from 'lucide-react';

const PaymentPage = () => {
    const { bookingId } = useParams();
    const navigate = useNavigate();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [transactionId, setTransactionId] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('razorpay'); // 'razorpay' or 'manual'
    const [settings, setSettings] = useState({ TURF_NAME: 'The Turf', UPI_ID: 'theturf@upi' });

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                console.log('Fetching initial data for booking:', bookingId);
                const [bookingRes, settingsRes] = await Promise.all([
                    bookingsAPI.getById(bookingId),
                    slotsAPI.getSettings()
                ]);
                
                console.log('Booking Response:', bookingRes.data);
                
                const bookingData = bookingRes.data.booking || bookingRes.data;
                
                if (!bookingData || (typeof bookingData === 'object' && !bookingData._id)) {
                    console.error('Invalid booking data received:', bookingRes.data);
                    setError('Digital Record Not Found. The transaction state is invalid.');
                    setLoading(false);
                    return;
                }

                setBooking(bookingData);
                
                if (settingsRes.data.success) {
                    setSettings(prev => ({ ...prev, ...settingsRes.data.settings }));
                }
                
                // Load Razorpay script
                const script = document.createElement('script');
                script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                script.async = true;
                document.body.appendChild(script);
                
                setLoading(false);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError('Network Synchronization Error. Please check your connectivity.');
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [bookingId]);

    const handleRazorpayPayment = async () => {
        try {
            if (!booking) {
                setError('Booking data not loaded yet. Re-trying synchronization...');
                return;
            }
            setIsProcessing(true);
            setError('');

            // 1. Create Order on Backend
            const orderRes = await paymentsAPI.createOrder(booking.amount || 0, bookingId);
            
            if (!orderRes.data.success) {
                throw new Error(orderRes.data.message || 'Failed to initialize payment gateway');
            }

            const { order, keyId } = orderRes.data;
            
            if (!keyId) {
                throw new Error('Payment Terminal initialization failed: System Identifier Missing. Please notify administration.');
            }

            // 2. Configure Razorpay Options
            const options = {
                key: keyId,
                amount: order.amount,
                currency: order.currency,
                name: settings.TURF_NAME,
                description: `Booking #${bookingId.slice(-6).toUpperCase()}`,
                order_id: order.id,
                handler: async (response) => {
                    try {
                        setIsProcessing(true);
                        // 3. Verify Payment on Backend
                        const verifyRes = await paymentsAPI.verify({
                            bookingId,
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature
                        });

                        if (verifyRes.data.success) {
                            navigate('/booking-success', { 
                                state: { 
                                    booking: verifyRes.data.booking, 
                                    paymentId: response.razorpay_payment_id 
                                } 
                            });
                        } else {
                            setError('Payment verification failed. Please contact support.');
                        }
                    } catch (err) {
                        console.error('Verification error:', err);
                        setError('Technical synchronization failure during verification.');
                    } finally {
                        setIsProcessing(false);
                    }
                },
                prefill: {
                    name: booking?.userName || '',
                    contact: booking?.userPhone || ''
                },
                theme: {
                    color: '#059669' // Emerald-600
                },
                modal: {
                    ondismiss: () => {
                        setIsProcessing(false);
                    }
                }
            };

            if (window.Razorpay) {
                const rzp = new window.Razorpay(options);
                rzp.open();
            } else {
                throw new Error('Payment Gateway (Razorpay) script not loaded. Attempting re-initialization...');
            }
        } catch (err) {
            console.error('Razorpay Error:', err);
            setError(err.message || 'Could not initiate payment sequence.');
            setIsProcessing(false);
        }
    };

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
            <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-12">

                <button
                    onClick={() => navigate('/')}
                    className="mb-8 flex items-center gap-3 text-gray-400 hover:text-emerald-600 transition-all group"
                >
                    <div className="bg-white p-2 rounded-lg border border-gray-100 group-hover:border-emerald-200 shadow-sm transition-all">
                        <ArrowLeft size={16} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Cancel Transaction</span>
                </button>

                <div className="bg-white rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl shadow-emerald-950/[0.03] overflow-hidden border border-gray-100">
                    <div className="p-8 md:p-12 text-center border-b border-gray-100 bg-[#0F172A] text-white relative">
                        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
                            <div className="absolute top-[-50px] left-[-50px] w-64 h-64 bg-emerald-500 rounded-full blur-[100px]"></div>
                        </div>

                        <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-500/10 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto mb-4 md:mb-6 text-emerald-400 border border-emerald-500/20 relative z-10">
                            <Lock size={36} />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black tracking-tighter mb-2 uppercase relative z-10 text-white">Secure <span className="text-emerald-400">Payment</span></h2>
                        <div className="flex items-center justify-center gap-2 md:gap-3 opacity-60 relative z-10">
                            <div className="h-[1px] w-6 md:w-8 bg-emerald-400"></div>
                            <p className="font-black uppercase text-[8px] md:text-[9px] tracking-[0.2em] md:tracking-[0.3em] text-white">Final Synchronization Phase</p>
                            <div className="h-[1px] w-6 md:w-8 bg-emerald-400"></div>
                        </div>
                    </div>

                    <div className="p-8 md:p-12 space-y-10 md:space-y-12">
                        {error && (
                            <div className="bg-red-50/50 border-2 border-red-100/50 p-6 rounded-[1.5rem] flex items-start gap-4 animate-shake">
                                <div className="bg-red-500 text-white p-1.5 rounded-lg shadow-lg shadow-red-500/30 shrink-0"><Info size={14} /></div>
                                <div className="space-y-1">
                                    <p className="text-red-700 text-[10px] font-black uppercase tracking-widest leading-normal">System Failure</p>
                                    <p className="text-red-600/60 text-[8px] font-bold uppercase tracking-widest">{error}</p>
                                </div>
                            </div>
                        )}

                        {!booking && !loading ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
                                <div className="bg-gray-50 p-8 rounded-full text-gray-200">
                                    <Zap size={48} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-gray-900 font-black uppercase tracking-widest text-sm">Synchronization Void</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest max-w-[200px] mx-auto leading-relaxed">
                                        The requested allocation does not exist in our central ledger.
                                    </p>
                                </div>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="bg-emerald-600 text-white px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
                                >
                                    Re-sync Link
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Summary Section */}
                                <div className="bg-gray-50 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-10 space-y-6 border border-gray-100 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-150 transition-transform duration-700">
                                        <Clock size={80} className="text-gray-900" />
                                    </div>
                                    <div className="flex justify-between items-center text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                                        <span className="flex items-center gap-2"><Clock size={12} /> Allocation Window</span>
                                        <span className="text-gray-900">
                                            {formatTime12h(booking?.slot?.startTime)} – {formatTime12h(booking?.slot?.endTime)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none pt-2">
                                        <span className="flex items-center gap-2"><Hash size={12} /> Unique Booking ID</span>
                                        <span className="text-gray-900 tracking-tighter">{booking?._id?.slice(-12).toUpperCase()}</span>
                                    </div>
                                    <div className="pt-6 border-t border-gray-200 flex justify-between items-end">
                                        <div className="flex flex-col gap-1">
                                            <span className={`font-black uppercase text-[10px] md:text-xs tracking-widest ${booking?.paymentType === 'full' ? 'text-emerald-700' : 'text-gray-900'}`}>
                                                {booking?.paymentType === 'full' ? 'Full Settlement' : 'Confirmation Advance'}
                                            </span>
                                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                                Amount Payable (INR)
                                            </span>
                                        </div>
                                        <span className={`text-4xl md:text-5xl font-black tracking-tighter text-emerald-600`}>
                                            ₹{booking?.amount || 0}
                                        </span>
                                    </div>
                                </div>

                                {/* Payment Method Selector */}
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setPaymentMethod('razorpay')}
                                        className={`p-6 rounded-[1.5rem] border-2 transition-all flex flex-col items-center gap-3 text-center ${paymentMethod === 'razorpay' ? 'border-emerald-600 bg-emerald-50/50' : 'border-gray-50 bg-gray-50/50 grayscale opacity-60'}`}
                                    >
                                        <CreditCard size={24} className={paymentMethod === 'razorpay' ? 'text-emerald-600' : 'text-gray-400'} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Online / UPI</span>
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('manual')}
                                        className={`p-6 rounded-[1.5rem] border-2 transition-all flex flex-col items-center gap-3 text-center ${paymentMethod === 'manual' ? 'border-emerald-600 bg-emerald-50/50' : 'border-gray-50 bg-gray-50/50 grayscale opacity-60'}`}
                                    >
                                        <QrCode size={24} className={paymentMethod === 'manual' ? 'text-emerald-600' : 'text-gray-400'} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Scanner / UTR</span>
                                    </button>
                                </div>

                                {paymentMethod === 'razorpay' ? (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="bg-emerald-50/30 p-8 rounded-[2rem] border border-emerald-100/50 flex flex-col items-center text-center gap-4">
                                            <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-emerald-600/20">
                                                <ShieldCheck size={32} />
                                            </div>
                                            <div>
                                                <h3 className="font-black uppercase tracking-widest text-gray-900 text-sm">Encrypted Settlement</h3>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Automatic Node Verification</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleRazorpayPayment}
                                            disabled={isProcessing}
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 text-white font-black py-7 rounded-[2rem] shadow-2xl shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all transform hover:-translate-y-1 active:scale-95 text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4 group overflow-hidden relative"
                                        >
                                            {isProcessing ? (
                                                <>
                                                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    INITIALIZING...
                                                </>
                                            ) : (
                                                <>
                                                    Launch Checkout Terminal
                                                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="flex flex-col items-center">
                                            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-emerald-50 inline-block shadow-2xl shadow-emerald-900/5 relative group">
                                                <div className="absolute inset-0 bg-emerald-500/5 scale-0 group-hover:scale-100 transition-transform duration-500 rounded-[2.5rem]"></div>
                                                <img
                                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${settings.UPI_ID}&pn=${encodeURIComponent(settings.TURF_NAME)}&am=${booking?.amount}&cu=INR`}
                                                    alt="Payment QR"
                                                    className="w-56 h-56 mx-auto relative z-10 rounded-xl"
                                                />
                                            </div>
                                            <div className="mt-8 text-center space-y-2">
                                                <p className="text-gray-900 font-black text-2xl tracking-tighter uppercase leading-none">{settings.UPI_ID}</p>
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                                    <p className="text-gray-400 font-black text-[9px] uppercase tracking-[0.3em]">Verified Static Receiver</p>
                                                </div>
                                            </div>
                                        </div>

                                        <form onSubmit={handleManualPaymentSubmit} className="space-y-8">
                                            <div className="space-y-4">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Validation Token (Transaction ID / UTR)</label>
                                                <div className="relative group">
                                                    <Hash className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors" size={20} />
                                                    <input
                                                        type="text"
                                                        placeholder="ENTER 12-DIGIT UTR"
                                                        className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500/30 focus:bg-white p-5 md:p-6 pl-14 md:pl-16 rounded-xl md:rounded-[1.5rem] outline-none transition-all font-black text-xs md:text-sm text-gray-900 placeholder:text-gray-200 tracking-[0.2em] shadow-inner"
                                                        value={transactionId}
                                                        onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={isProcessing}
                                                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 text-white font-black py-7 rounded-[2rem] shadow-2xl shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all transform hover:-translate-y-1 active:scale-95 text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4 group overflow-hidden relative"
                                            >
                                                {isProcessing ? (
                                                    <>
                                                        <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                        VALIDATING...
                                                    </>
                                                ) : (
                                                    <>
                                                        Authorize Manual Settlement
                                                        <ShieldCheck size={18} />
                                                    </>
                                                )}
                                            </button>
                                        </form>
                                    </div>
                                )}
                            </>
                        )}

                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="flex items-center gap-2 text-gray-300 font-black text-[9px] uppercase tracking-[0.4em]">
                                <Lock size={12} className="text-emerald-500" /> High-Encryption Core
                            </div>
                            <p className="text-[9px] text-gray-400 font-extrabold max-w-[85%] uppercase tracking-tight leading-relaxed">
                                Our security node monitors every transaction. Authorization identifies your priority allocation and stabilizes your temporal window.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentPage;
