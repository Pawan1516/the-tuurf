import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
    Zap, Bot, Activity, Trophy, QrCode, CreditCard, 
    Smartphone, AlertTriangle, CheckCircle2, ChevronRight, 
    ArrowRight, BarChart3, Users, Network, TrendingUp
} from 'lucide-react';

const FadeInSection = ({ children, delay = 0 }) => {
    const [isVisible, setVisible] = useState(false);
    const domRef = React.useRef();

    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setVisible(entry.isIntersecting);
                }
            });
        });
        const currentRef = domRef.current;
        if (currentRef) observer.observe(currentRef);
        return () => {
             if (currentRef) observer.unobserve(currentRef);
        };
    }, []);

    return (
        <div
            ref={domRef}
            className={`transition-all duration-1000 ease-out ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'
            }`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
};

export default function AboutUs() {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-emerald-500/30 selection:text-white">
            
            {/* 1. HERO SECTION */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-[#020617] to-[#020617]"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[500px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none"></div>
                
                <div className="max-w-7xl mx-auto relative z-10 text-center">
                    <FadeInSection>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-widest mb-8">
                            <Zap size={14} className="animate-pulse" /> Welcome to the Future of Sports
                        </div>
                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter mb-6 leading-[1.1]">
                            Play Smart. <br className="md:hidden" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">Book Instantly.</span> <br />
                            Compete Better.
                        </h1>
                        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 font-medium tracking-wide">
                            The Turf is an AI-powered sports arena ecosystem. We eliminate booking friction and elevate your match-day experience with real-time stats and automation.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link to="/#booking" className="w-full sm:w-auto px-8 py-4 bg-emerald-500 text-[#020617] rounded-full font-black uppercase tracking-widest text-sm hover:bg-emerald-400 active:scale-95 transition-all shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]">
                                Book Your Slot
                            </Link>
                            <a href="#features" className="w-full sm:w-auto px-8 py-4 bg-white/5 text-white border border-white/10 rounded-full font-black uppercase tracking-widest text-sm hover:bg-white/10 active:scale-95 transition-all">
                                Explore Platform
                            </a>
                        </div>
                    </FadeInSection>
                </div>
            </section>

            {/* 2. PROBLEM VS SOLUTION */}
            <section className="py-24 px-6 bg-[#0B1120] relative">
                <div className="max-w-7xl mx-auto">
                    <FadeInSection>
                        <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-stretch">
                            {/* The Old Way */}
                            <div className="bg-rose-950/20 border border-rose-900/30 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                    <Smartphone size={100} />
                                </div>
                                <h3 className="text-sm font-black text-rose-500 uppercase tracking-[0.2em] mb-8">The Old Way</h3>
                                <div className="space-y-6">
                                    {[
                                        "Endless phone calls & WhatsApp texts",
                                        "Frustrating double bookings",
                                        "No real-time availability checking",
                                        "Zero player stats or match history"
                                    ].map((text, i) => (
                                        <div key={i} className="flex items-start gap-4 text-rose-200">
                                            <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={20} />
                                            <p className="font-medium text-lg leading-tight">{text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* The Smart Way */}
                            <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border border-emerald-500/30 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden group shadow-[0_0_60px_-15px_rgba(16,185,129,0.2)]">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                    <Zap size={100} />
                                </div>
                                <h3 className="text-sm font-black text-emerald-400 uppercase tracking-[0.2em] mb-8">The Smart Arena</h3>
                                <div className="space-y-6">
                                    {[
                                        "Tap & book slots instantly, 24/7",
                                        "Seamless QR-code verify check-ins",
                                        "AI CricBot answers queries instantly",
                                        "Live scoring networks & leaderboards"
                                    ].map((text, i) => (
                                        <div key={i} className="flex items-start gap-4 text-emerald-50">
                                            <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={20} />
                                            <p className="font-bold text-lg leading-tight">{text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </FadeInSection>
                </div>
            </section>

            {/* 4. CORE FEATURES */}
            <section id="features" className="py-24 px-6 relative z-10">
                <div className="max-w-7xl mx-auto">
                    <FadeInSection>
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-4">Core Technology</h2>
                            <p className="text-slate-400 max-w-2xl mx-auto text-lg">Next-generation infrastructure designed to put athletes first.</p>
                        </div>
                        
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[
                                { title: "Instant Booking", icon: <Zap size={32} />, desc: "Find open slots in real-time and secure them securely in seconds." },
                                { title: "AI CricBot", icon: <Bot size={32} />, desc: "Our 24/7 intelligent agent helps you book, check stats, and resolve issues." },
                                { title: "Live Match Scoring", icon: <Activity size={32} />, desc: "Pro-grade broadcast scoring interface tracking every ball and run." },
                                { title: "Leaderboards", icon: <Trophy size={32} />, desc: "Compete with local athletes. Your stats define your rank." },
                                { title: "QR Access", icon: <QrCode size={32} />, desc: "Contactless, cryptographically secure field entry on match day." },
                                { title: "Secure Payments", icon: <CreditCard size={32} />, desc: "Frictionless embedded checkouts handling splits and refunds." }
                            ].map((feat, i) => (
                                <FadeInSection key={i} delay={i * 100}>
                                    <div className="h-full bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-3xl p-8 hover:bg-slate-800 hover:border-emerald-500/30 transition-all group">
                                        <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 group-hover:bg-emerald-500/10 transition-transform">
                                            {feat.icon}
                                        </div>
                                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-3">{feat.title}</h3>
                                        <p className="text-slate-400 leading-relaxed text-sm">{feat.desc}</p>
                                    </div>
                                </FadeInSection>
                            ))}
                        </div>
                    </FadeInSection>
                </div>
            </section>

            {/* 6. AI POWER SECTION */}
            <section className="py-24 px-6 bg-[#030712] relative overflow-hidden border-y border-emerald-900/30">
                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-cyan-600/10 blur-[100px] rounded-full"></div>
                <div className="max-w-7xl mx-auto">
                    <FadeInSection>
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            <div className="space-y-8">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400 text-[10px] font-black uppercase tracking-widest">
                                    <Network size={14} /> Cognitive Infrastructure
                                </div>
                                <h2 className="text-4xl md:text-6xl font-black text-white leading-[1.1] tracking-tighter">
                                    Powered by <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Intelligence.</span>
                                </h2>
                                <p className="text-lg text-slate-400">
                                    Our platform doesn't just manage bookings; it learns from them. The built-in AI engine recommends dynamic squad compositions, handles automated customer support queries via CricBot, and provides operations analytics to the admin staff.
                                </p>
                                <ul className="space-y-4">
                                    {[
                                        "Automated Matchmaking & Squad Suggestions",
                                        "Intelligent Cancellation/Refund Handling",
                                        "Business Analytics for Operations Staff"
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center gap-4 border border-white/5 bg-white/5 py-4 px-6 rounded-2xl">
                                            <div className="w-2 h-2 bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.8)]"></div>
                                            <span className="font-bold text-sm tracking-wide text-slate-200">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="relative">
                                {/* Abstract AI Graphic */}
                                <div className="aspect-square max-h-[500px] mx-auto relative border border-cyan-500/20 rounded-full flex items-center justify-center bg-cyan-950/20 backdrop-blur-xl animate-[spin_60s_linear_infinite]">
                                    <div className="w-3/4 h-3/4 border border-blue-500/30 rounded-full flex items-center justify-center animate-[spin_40s_linear_infinite_reverse]">
                                        <div className="w-1/2 h-1/2 border border-emerald-500/40 rounded-full bg-gradient-to-tr from-cyan-500/10 to-emerald-500/10 shadow-[inner_0_0_50px_rgba(6,182,212,0.2)]"></div>
                                    </div>
                                </div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-400 flex items-center justify-center bg-[#030712] p-8 rounded-full border border-cyan-500/30 shadow-[0_0_60px_-10px_rgba(6,182,212,0.4)]">
                                    <Bot size={64} className="animate-pulse" />
                                </div>
                            </div>
                        </div>
                    </FadeInSection>
                </div>
            </section>

            {/* 5. HOW IT WORKS */}
            <section className="py-24 px-6">
                <div className="max-w-7xl mx-auto">
                    <FadeInSection>
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-4">The Turf Flow</h2>
                            <p className="text-slate-400">Six simple steps to get you on the field.</p>
                        </div>
                        
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch">
                            {[
                                { step: "1", title: "Select", icon: <Activity size={24} /> },
                                { step: "2", title: "Book", icon: <ChevronRight size={24} /> },
                                { step: "3", title: "Verify", icon: <QrCode size={24} /> },
                                { step: "4", title: "Play", icon: <Zap size={24} /> },
                                { step: "5", title: "Score", icon: <BarChart3 size={24} /> },
                                { step: "6", title: "Rank", icon: <Trophy size={24} /> }
                            ].map((s, i) => (
                                <FadeInSection key={i} delay={i * 150}>
                                    <div className="flex-1 min-w-[120px] bg-slate-900/80 border border-slate-800 rounded-[2rem] p-6 text-center hover:-translate-y-2 transition-transform duration-300">
                                        <div className="w-12 h-12 mx-auto bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center font-black mb-4 border border-emerald-500/20">
                                            {s.step}
                                        </div>
                                        <div className="text-slate-500 mb-2 flex justify-center">{s.icon}</div>
                                        <h4 className="font-black uppercase tracking-widest text-[#f8fafc] text-[11px]">{s.title}</h4>
                                    </div>
                                </FadeInSection>
                            ))}
                        </div>
                    </FadeInSection>
                </div>
            </section>

            {/* 7 & 8 PLAYER AND ADMIN EXPERIENCES */}
            <section className="py-24 px-6 bg-[#0B1120] border-t border-slate-800/50">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-8">
                        <FadeInSection delay={100}>
                            <div className="h-full bg-slate-900 border border-slate-800 rounded-[3rem] p-10 md:p-14 relative overflow-hidden">
                                <Users size={200} className="absolute -bottom-10 -right-10 opacity-5 text-emerald-500" />
                                <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">Player Hub</h3>
                                <p className="text-slate-400 mb-8 max-w-sm">
                                    Every match is recorded. Track your <span className="text-white font-bold">Career Stats</span>, monitor your performance trajectory, and climb the competitive local leaderboard to earn bragging rights.
                                </p>
                                <Link to="/login" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 hover:text-emerald-300">
                                    Access Player Area <ArrowRight size={14} />
                                </Link>
                            </div>
                        </FadeInSection>
                        <FadeInSection delay={300}>
                            <div className="h-full bg-slate-900 border border-slate-800 rounded-[3rem] p-10 md:p-14 relative overflow-hidden">
                                <TrendingUp size={200} className="absolute -bottom-10 -right-10 opacity-5 text-cyan-500" />
                                <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">Admin Command</h3>
                                <p className="text-slate-400 mb-8 max-w-sm">
                                    Manage operations with precision. The Ops Hub features real-time revenue telemetry, dynamic booking management, and AI-driven growth insights.
                                </p>
                                <Link to="/admin/login" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 hover:text-cyan-300">
                                    System Access <ArrowRight size={14} />
                                </Link>
                            </div>
                        </FadeInSection>
                    </div>
                </div>
            </section>

            {/* 9. TRUST & STATS */}
            <section className="py-20 px-6">
                <div className="max-w-7xl mx-auto">
                    <FadeInSection>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-slate-800">
                            {[
                                { stat: "90%+", label: "Successful Matches" },
                                { stat: "<200ms", label: "Real-time Sync" },
                                { stat: "24/7", label: "AI Support" },
                                { stat: "100%", label: "Secure Venues" }
                            ].map((item, i) => (
                                <div key={i} className={`text-center pl-8 ${i === 0 ? 'pl-0 border-none' : ''}`}>
                                    <p className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tighter">{item.stat}</p>
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">{item.label}</p>
                                </div>
                            ))}
                        </div>
                    </FadeInSection>
                </div>
            </section>

            {/* 10. FINAL CTA */}
            <section className="py-32 px-6 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-emerald-900/10"></div>
                <div className="max-w-3xl mx-auto relative z-10">
                    <FadeInSection>
                        <h2 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mb-6 leading-none">
                            Ready to take <br/>the field?
                        </h2>
                        <p className="text-xl text-slate-400 mb-10">Start playing today and elevate your game.</p>
                        <Link to="/" className="inline-block px-12 py-5 bg-gradient-to-r from-emerald-500 to-teal-400 text-black text-lg rounded-full font-black uppercase tracking-widest shadow-[0_20px_40px_-10px_rgba(16,185,129,0.5)] hover:scale-105 active:scale-95 transition-all">
                            Book Your Slot Now
                        </Link>
                    </FadeInSection>
                </div>
            </section>

        </div>
    );
}
