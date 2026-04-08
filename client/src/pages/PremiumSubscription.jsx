import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { 
    Zap, Shield, TrendingUp, Trophy, Target, BarChart3, 
    ChevronRight, CheckCircle2, Star, Sparkles, Activity
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function PremiumSubscription() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [isPremium, setIsPremium] = useState(false);
    const scriptLoaded = useRef(false);

    useEffect(() => {
        // Pre-load Razorpay Script
        if (!scriptLoaded.current) {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            script.onload = () => { scriptLoaded.current = true; };
            script.onerror = () => { toast.error("Razorpay SDK failed to load."); };
            document.body.appendChild(script);
        }

        const checkStatus = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const res = await apiClient.get('/auth/profile');
                if (res.data.success && res.data.user?.subscription?.isPremium) {
                    setIsPremium(true);
                }
            } catch (err) {
                console.error('Status check fail:', err);
            }
        };
        checkStatus();
    }, []);

    const handleSubscribe = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            toast.warning("Please login to unlock premium features");
            navigate('/login');
            return;
        }

        if (!window.Razorpay) {
            toast.error("Billing gateway not ready.");
            return;
        }

        setLoading(true);
        try {
            const orderRes = await apiClient.post('/payments/create-order', { 
                amount: 49, 
                bookingId: `pass_${Date.now().toString().slice(-10)}`
            });

            if (orderRes.data.success) {
                const options = {
                    key: orderRes.data.keyId,
                    amount: orderRes.data.order.amount,
                    currency: orderRes.data.order.currency,
                    name: "The Turf Premium",
                    description: "Annual Analytics Pass",
                    order_id: orderRes.data.order.id,
                    handler: async function (response) {
                        try {
                            const verifyRes = await apiClient.post('/payments/verify-subscription', {
                                razorpayOrderId: response.razorpay_order_id,
                                razorpayPaymentId: response.razorpay_payment_id,
                                razorpaySignature: response.razorpay_signature
                            });

                            if (verifyRes.data.success) {
                                setIsPremium(true);
                                toast.success("Intel Pass Activated! Redirecting...");
                                setTimeout(() => navigate('/live/latest'), 2000);
                            }
                        } catch (vErr) {
                            toast.error("Verification failed");
                        }
                    },
                    prefill: {
                        name: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).name : "Player",
                    },
                    theme: { color: "#10b981" }
                };
                const rzp = new window.Razorpay(options);
                rzp.open();
            }
        } catch (err) {
            toast.error("Server error. Try again.");
        } finally {
            setLoading(false);
        }
    };

    const features = [
        { icon: TrendingUp, title: "Velocity Comparison", desc: "Real-time speed and run-rate shift analysis between teams." },
        { icon: Target, title: "Win Probability", desc: "AI-powered live match outcome predictions updated every ball." },
        { icon: Activity, title: "Innings Momentum", desc: "Visualise tactical shifts and match-defining momentum bursts." },
        { icon: Star, title: "MVP Predictor", desc: "Identify the most valuable player based on impact metrics." },
        { icon: BarChart3, title: "Boundary Profiles", desc: "Deep dive into scoring zones and boundary frequency data." },
        { icon: Shield, title: "Elite Analytics", desc: "Professional-grade match intelligence used by professional clubs." }
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-white selection:bg-emerald-500">
            {/* Hero Section */}
            <div className="relative pt-20 pb-32 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-emerald-500/10 blur-[120px] rounded-full opacity-50"></div>
                <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20 mb-8 animate-fade-in">
                        <Zap className="text-emerald-400 fill-emerald-400/20" size={16} />
                        <span className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em]">Intel Analytics Pass</span>
                    </div>
                    <h1 className="text-5xl md:text-8xl font-black tracking-tighter uppercase italic leading-[0.9] mb-8">
                        Elevate your <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">Match Vision</span>
                    </h1>
                    <p className="text-slate-400 text-lg md:text-xl font-bold max-w-2xl mx-auto mb-12 uppercase tracking-widest leading-relaxed">
                        Unlock deep-learning predictions and tactical intelligence for every live game at The Turf.
                    </p>
                    
                    {isPremium ? (
                        <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-[2.5rem] p-8 max-w-md mx-auto backdrop-blur-xl">
                            <CheckCircle2 className="text-emerald-400 mx-auto mb-4" size={48} />
                            <h2 className="text-2xl font-black uppercase italic mb-2">You are Elite</h2>
                            <p className="text-emerald-400/70 text-xs font-bold uppercase tracking-widest mb-6">Your Intel Pass is Active</p>
                            <button 
                                onClick={() => navigate('/home')}
                                className="w-full bg-emerald-500 text-slate-900 font-black py-4 rounded-2xl uppercase tracking-[0.2em] transition-transform active:scale-95"
                            >
                                Go to Matches
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-6">
                            <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 md:p-16 text-center max-w-2xl w-full shadow-2xl relative group">
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-blue-500 px-6 py-2 rounded-full shadow-xl">
                                    <span className="text-[10px] font-black uppercase tracking-widest">Early Adopter Offer</span>
                                </div>
                                <p className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] mb-4">The Complete Intel Suite</p>
                                <div className="flex items-end justify-center gap-2 mb-2">
                                    <span className="text-7xl md:text-9xl font-black tracking-tighter">₹49</span>
                                    <span className="text-2xl text-emerald-400 font-black mb-4">/ YEAR</span>
                                </div>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mb-12 italic">Experience match data like never before</p>
                                
                                <button 
                                    onClick={handleSubscribe}
                                    disabled={loading}
                                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-6 rounded-[2rem] text-lg uppercase tracking-[0.3em] transition-all shadow-2xl shadow-emerald-500/20 disabled:opacity-50"
                                >
                                    {loading ? "Processing..." : "Get Started Now"}
                                </button>
                                
                                <div className="mt-8 grid grid-cols-3 gap-4">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                            <Sparkles className="text-emerald-400" size={16} />
                                        </div>
                                        <span className="text-[8px] font-black text-slate-500 uppercase">Live Stats</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                                            <Target className="text-blue-400" size={16} />
                                        </div>
                                        <span className="text-[8px] font-black text-slate-500 uppercase">AI Analytics</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                                            <Shield className="text-purple-400" size={16} />
                                        </div>
                                        <span className="text-[8px] font-black text-slate-500 uppercase">Pro Access</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Features Grid */}
            <div className="max-w-7xl mx-auto px-6 pb-32">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((f, i) => (
                        <div key={i} className="bg-slate-900/50 border border-white/5 p-10 rounded-[2.5rem] hover:border-emerald-500/30 transition-all duration-500 group">
                            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <f.icon className="text-emerald-400" size={28} />
                            </div>
                            <h3 className="text-xl font-black uppercase italic mb-3">{f.title}</h3>
                            <p className="text-slate-400 text-sm font-medium leading-relaxed tracking-wide">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* CTA Section */}
            <div className="bg-emerald-500 py-24 px-6 text-center">
                <h2 className="text-4xl md:text-6xl font-black italic text-slate-950 uppercase tracking-tighter mb-8">
                    Don't Just Watch. <br /> Predict.
                </h2>
                <button 
                    onClick={handleSubscribe}
                    className="bg-slate-950 text-white px-12 py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] hover:scale-105 transition-all text-sm"
                >
                    Unlock Intelligence
                </button>
            </div>
        </div>
    );
}
