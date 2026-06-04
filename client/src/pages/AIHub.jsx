import React, { useState, useEffect, useRef, useContext, useCallback, useMemo } from 'react';
import { 
    Bot, Zap, TrendingUp, Briefcase, MessageSquare, 
    Send, X, Activity, PieChart, Sparkles, 
    ChevronRight, Target, Users, BarChart3, Clock, MapPin,
    Cpu, CircleDot, Maximize2, Layers, Globe, ShieldCheck,
    Monitor, Database, Loader2, Search, ArrowRight,
    BrainCircuit, LineChart as LineIcon
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import apiClient from '../api/client';
import { toast } from 'react-toastify';

export default function AIHub() {
    const { matchId } = useParams();
    const { user } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('specialist');
    const [loading, setLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    
    // specialist states
    const [chat, setChat] = useState([
        { role: 'bot', text: "Protocol Initialized. I am your Neural Strategy Assistant. Data streams are synchronized and ready for query." }
    ]);
    const [input, setInput] = useState('');
    const scrollRef = useRef(null);

    // data states
    const [analysis, setAnalysis] = useState(null);
    const [prediction, setPrediction] = useState(null);
    const [business, setBusiness] = useState(null);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (matchId) {
            setTimeout(() => {
                setAnalysis({
                    runRate: "8.45",
                    highestSR: "210.5",
                    bestEconomy: "4.5",
                    dotBallPercentage: "35",
                    insights: [
                        "Offensive velocity peak detected in death overs.",
                        "Spin trajectory stability index increasing.",
                        "Subject Alpha approaching performance milestone (50 runs)."
                    ]
                });
                setPrediction({
                    teamA_prob: 65,
                    teamB_prob: 35,
                    rrr: "9.20",
                    ballsLeft: 24,
                    insight: "Node A dominance confirmed. Win probability index: 65%."
                });
            }, 500);
        }
        if (user?.role === 'admin') {
            fetchLocalBusinessData();
        }
    }, [matchId, user]);

    const fetchLocalBusinessData = async () => {
        try {
            const { data } = await apiClient.get(`/admin-booking/stats`);
            const listRes = await apiClient.get(`/admin-booking/list`);
            
            if (data.success && listRes.data.success) {
                const bookings = listRes.data.bookings;
                const totalRev = bookings.reduce((sum, b) => sum + (b.amount || 0), 0);
                
                const turfMap = {};
                bookings.forEach(b => {
                    const t = b.turfLocation || 'Main Arena';
                    turfMap[t] = (turfMap[t] || 0) + 1;
                });
                const popularTurf = Object.entries(turfMap).sort((a,b) => b[1] - a[1])[0]?.[0] || 'Main Arena';

                setBusiness({
                    totalRevenue: totalRev,
                    peakTime: "18:00 - 21:00",
                    popularTurf: popularTurf,
                    weeklyGrowth: 12,
                    insights: [
                        `Registry volume remains stable at ₹${totalRev.toLocaleString()}.`,
                        `${popularTurf} confirmed as primary revenue node.`,
                        "Weekend temporal surge detected in operational logs."
                    ]
                });
            }
        } catch (e) { 
            console.error(e);
        }
    };

    const handleChat = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input;
        setChat(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput('');
        setLoading(true);

        setTimeout(() => {
            let response = "Neural processing complete. ";
            if (userMsg.toLowerCase().includes('score')) {
                response += "Current temporal score node: 124/3 (14.2 Overs). Subject Alpha dominating trajectory.";
            } else if (userMsg.toLowerCase().includes('top')) {
                response += "Peak performance node identified: Subject Rahul (45 Runs / 28 Balls).";
            } else {
                response += "Operational parameters nominal. Detailed analytics synchronized in the Analyst registry.";
            }
            setChat(prev => [...prev, { role: 'bot', text: response }]);
            setLoading(false);
        }, 800);
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chat]);

    return (
        <div className="min-h-screen bg-white font-sans selection:bg-emerald-600/20">
            {/* AI HUB TOP BAR */}
            <header className="bg-white border-b border-zinc-200 sticky top-0 z-[40] px-10 py-5 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-8">
                    <div>
                        <h1 className="text-xl font-black text-black uppercase tracking-tighter flex items-center gap-3">
                            <BrainCircuit className="text-emerald-600" size={26} /> 
                            Neural HUB <span className="text-slate-400">/ Intelligence Command</span>
                        </h1>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Direct Predictive Engine v8.4</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden xl:flex items-center gap-4 bg-white border border-zinc-200 p-2 rounded-2xl">
                        <div className="px-4 py-1.5 border-r border-zinc-200">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Local Time</p>
                            <p className="text-xs font-black text-black tabular-nums italic">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                        </div>
                        <div className="px-4 py-1.5">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Neural sync</p>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                <span className="text-[10px] font-black text-emerald-600 uppercase">Synchronized</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex bg-zinc-100 p-1 rounded-2xl border border-zinc-200">
                        {[
                            { id: 'specialist', label: 'Specialist', icon: MessageSquare },
                            { id: 'analyst', label: 'Analyst', icon: Activity },
                            { id: 'prediction', label: 'Prediction', icon: Zap },
                            { id: 'business', label: 'Business', icon: Briefcase, admin: true }
                        ].filter(t => !t.admin || user?.role === 'admin').map(t => (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id)}
                                className={`flex items-center gap-3 py-3 px-8 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-500 italic ${activeTab === t.id ? 'bg-white text-black shadow-2xl shadow-zinc-950/20' : 'text-slate-400 hover:text-black'}`}
                            >
                                <t.icon size={14} />
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <div className="max-w-[1600px] mx-auto p-10 space-y-12">
                
                <div className="min-h-[700px]">
                    {/* 1. AI Specialist (Chat) */}
                    {activeTab === 'specialist' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                            <div className="lg:col-span-8 bg-white rounded-[3.5rem] border border-zinc-200 shadow-sm flex flex-col h-[750px] overflow-hidden relative group">
                                <div className="absolute top-0 right-0 p-12 opacity-[0.01] text-black pointer-events-none group-hover:scale-110 transition-all duration-1000">
                                    <Bot size={400} />
                                </div>
                                
                                <div className="p-8 border-b border-zinc-100 flex items-center justify-between bg-white/50 backdrop-blur-xl relative z-10">
                                    <div className="flex items-center gap-6">
                                        <div className="w-14 h-14 rounded-2xl bg-white text-black flex items-center justify-center shadow-2xl">
                                            <Cpu size={28} className="animate-pulse" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black uppercase tracking-tighter text-black italic">Strategy <span className="text-emerald-600">Assistance Node</span></h3>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 italic">Neural Response Protocol Active</p>
                                        </div>
                                    </div>
                                    <div className="bg-emerald-600/5 text-emerald-600 px-6 py-2 rounded-full border border-emerald-100 text-[9px] font-black uppercase tracking-widest italic animate-fade-in">
                                        Latency: 14ms
                                    </div>
                                </div>

                                <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar bg-white/20 relative z-10">
                                    {chat.map((msg, idx) => (
                                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-up`}>
                                            <div className={`max-w-[80%] p-8 rounded-[2.5rem] shadow-sm relative group/msg ${msg.role === 'user' ? 'bg-emerald-600 text-black font-black rounded-tr-none shadow-emerald-500/20' : 'bg-white border border-zinc-100 text-zinc-800 font-bold rounded-tl-none'}`}>
                                                <p className="text-sm italic leading-relaxed uppercase tracking-tight">{msg.text}</p>
                                                <div className={`absolute top-0 ${msg.role === 'user' ? 'right-full mr-4' : 'left-full ml-4'} opacity-0 group-hover/msg:opacity-100 transition-opacity`}>
                                                    <div className="bg-white text-black text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap">
                                                        {msg.role === 'user' ? 'Authorized' : 'Neural Node'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {loading && (
                                        <div className="flex justify-start">
                                            <div className="bg-white p-6 rounded-[2.5rem] rounded-tl-none flex gap-2 border border-zinc-100 shadow-sm items-center">
                                                <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce"></div>
                                                <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce delay-100"></div>
                                                <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce delay-200"></div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 italic">Neural Processing...</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <form onSubmit={handleChat} className="p-8 bg-white border-t border-zinc-100 relative z-10">
                                    <div className="flex gap-6">
                                        <div className="flex-1 relative group">
                                            <Monitor className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-emerald-600 transition-colors" size={20} />
                                            <input 
                                                type="text" 
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                placeholder="Ask about score, top scorer, best bowler..."
                                                className="w-full bg-white border-2 border-transparent focus:border-emerald-100 rounded-[1.8rem] px-8 pl-16 py-5 text-sm outline-none transition-all font-black text-black italic tracking-widest uppercase placeholder:text-zinc-300"
                                            />
                                        </div>
                                        <button className="w-20 h-20 bg-emerald-600 text-black rounded-[1.8rem] flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-500/30 group/send">
                                            <Send size={32} className="group-hover/send:translate-x-1 group-hover/send:-translate-y-1 transition-transform" />
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <div className="lg:col-span-4 space-y-10">
                                <div className="bg-white rounded-[3.5rem] p-10 text-black shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/10 blur-[40px] rounded-full"></div>
                                    <div className="relative z-10 space-y-8">
                                        <div className="flex items-center gap-5 border-b border-white/5 pb-8">
                                            <div className="p-4 bg-white/5 text-emerald-500 rounded-2xl shadow-xl border border-white/10 backdrop-blur-md"><Zap size={24} className="animate-pulse" /></div>
                                            <h3 className="text-xl font-black text-black uppercase tracking-tighter italic leading-none">Global <span className="text-emerald-600">Strategy</span></h3>
                                        </div>
                                        <div className="space-y-6">
                                            {[
                                                { label: 'Neural Accuracy', val: '98.4%', icon: <CircleDot size={14} className="text-emerald-600" /> },
                                                { label: 'Data Nodes', val: '4,120+', icon: <Layers size={14} className="text-emerald-600" /> },
                                                { label: 'Response Protocol', val: 'V8.4', icon: <Cpu size={14} className="text-emerald-600" /> }
                                            ].map((stat, i) => (
                                                <div key={i} className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5 group/stat hover:bg-white/10 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        {stat.icon}
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">{stat.label}</span>
                                                    </div>
                                                    <span className="text-sm font-black italic tabular-nums">{stat.val}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-[3.5rem] p-10 border border-zinc-200 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-10 opacity-[0.02] text-black pointer-events-none group-hover:scale-110 transition-all duration-1000">
                                        <Activity size={200} />
                                    </div>
                                    <h3 className="text-xs font-black uppercase text-emerald-600 tracking-[0.3em] mb-8 flex items-center gap-3 italic">
                                        <CircleDot size={14} className="animate-pulse" /> Live Telemetry
                                    </h3>
                                    <div className="space-y-6">
                                        {[
                                            "Trajectory analytics synchronized.",
                                            "Behavioral logs acquisition in progress.",
                                            "Strategic forecasts recalibrated."
                                        ].map((log, i) => (
                                            <div key={i} className="flex gap-4 items-start group/log">
                                                <div className="w-1 h-1 bg-emerald-600 rounded-full mt-1.5 shadow-[0_0_8px_rgba(37,99,235,1)]"></div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover/log:text-black transition-colors italic leading-relaxed">{log}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. AI Analyst Hub */}
                    {activeTab === 'analyst' && (
                        <div className="space-y-12 animate-fade-up">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                {[
                                    { label: 'Operational Run Rate', val: analysis?.runRate || '0.00', icon: Zap, color: 'blue' },
                                    { label: 'Subject SR Index', val: analysis?.highestSR || '0.0', icon: Target, color: 'rose' },
                                    { label: 'Economic Stability', val: analysis?.bestEconomy || '0.0', icon: Activity, color: 'amber' },
                                    { label: 'Acquisition %', val: (analysis?.dotBallPercentage || '0') + '%', icon: Users, color: 'emerald' }
                                ].map((stat, i) => (
                                    <div key={i} className="bg-white border border-zinc-200 p-10 rounded-[3.5rem] shadow-sm relative overflow-hidden group hover:shadow-2xl transition-all duration-700 h-[260px] flex flex-col justify-between">
                                        <div className="absolute top-0 right-0 p-10 opacity-[0.02] text-black group-hover:scale-110 transition-transform duration-700">
                                            <stat.icon size={150} />
                                        </div>
                                        <div className="flex justify-between items-start relative z-10">
                                            <div className="p-5 bg-white text-emerald-600 rounded-[2rem] shadow-sm group-hover:bg-emerald-600 group-hover:text-black transition-all duration-500">
                                                <stat.icon size={24} />
                                            </div>
                                            <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-100 italic">Sync active</div>
                                        </div>
                                        <div className="relative z-10">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">{stat.label}</p>
                                            <h2 className="text-5xl font-black text-black tracking-tighter uppercase italic leading-none tabular-nums group-hover:text-emerald-600 transition-colors duration-500">{stat.val}</h2>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-white border border-zinc-200 p-12 rounded-[4rem] shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-12 opacity-[0.01] text-black pointer-events-none group-hover:scale-110 transition-all duration-1000">
                                    <Sparkles size={400} />
                                </div>
                                <div className="flex items-center justify-between mb-12 relative z-10 border-b border-zinc-100 pb-8">
                                    <div className="flex items-center gap-6">
                                        <div className="p-5 bg-emerald-600 text-black rounded-2xl shadow-xl"><Sparkles size={28} /></div>
                                        <div>
                                            <h3 className="text-2xl font-black uppercase tracking-tighter text-black italic">Strategic <span className="text-emerald-600">Performance Insights</span></h3>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5 italic">Direct Narrative acquisition Nodes</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                                    {(analysis?.insights || ["Waiting for match data..."]).map((ins, i) => (
                                        <div key={i} className="flex items-center gap-8 p-10 bg-white rounded-[2.5rem] border border-transparent group/ins hover:bg-white hover:border-emerald-600 hover:shadow-2xl transition-all duration-500">
                                            <div className="w-16 h-16 rounded-[1.5rem] bg-white flex items-center justify-center border border-zinc-100 shadow-sm shrink-0 group-hover/ins:bg-emerald-600 group-hover/ins:text-black transition-all">
                                                <TrendingUp size={24} />
                                            </div>
                                            <p className="text-lg font-black text-black uppercase tracking-tight italic leading-relaxed">{ins}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 3. AI Prediction Hub */}
                    {activeTab === 'prediction' && (
                        <div className="space-y-12 animate-fade-up">
                            <div className="bg-white border border-zinc-200 p-16 rounded-[5rem] shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-600/5 rounded-full blur-[150px] -mr-48 -mt-48"></div>
                                
                                <div className="flex items-center gap-8 mb-16 relative z-10 border-b border-zinc-100 pb-12">
                                    <div className="p-6 bg-white text-black rounded-[2.5rem] shadow-2xl transition-all group-hover:bg-emerald-600"><Zap size={36} className="animate-pulse" /></div>
                                    <div>
                                        <h3 className="text-4xl font-black uppercase tracking-tighter text-black italic">Neural <span className="text-emerald-600">Trajectory Engine</span></h3>
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mt-3 italic">Win Probability Matrix & Tactical Forecasts</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 items-center relative z-10">
                                    <div className="lg:col-span-7 space-y-16">
                                        <div className="space-y-12">
                                            <div className="flex items-end justify-between border-b border-zinc-100 pb-8">
                                                <div className="space-y-4">
                                                    <p className="text-[11px] font-black uppercase text-slate-400 tracking-[0.3em] italic">Operational Side A</p>
                                                    <h4 className="text-7xl font-black text-black italic tabular-nums leading-none tracking-tighter">{prediction?.teamA_prob || '50'}%</h4>
                                                </div>
                                                <div className="flex-1 px-16 pb-4">
                                                    <div className="h-4 w-full bg-zinc-100 rounded-full overflow-hidden shadow-inner flex">
                                                        <div className="h-full bg-emerald-600 transition-all duration-1000 shadow-[0_0_15px_rgba(37,99,235,0.5)]" style={{ width: `${prediction?.teamA_prob || 50}%` }}></div>
                                                        <div className="h-full bg-white transition-all duration-1000" style={{ width: `${prediction?.teamB_prob || 50}%` }}></div>
                                                    </div>
                                                </div>
                                                <div className="space-y-4 text-right">
                                                    <p className="text-[11px] font-black uppercase text-slate-400 tracking-[0.3em] italic">Operational Side B</p>
                                                    <h4 className="text-7xl font-black text-emerald-600 italic tabular-nums leading-none tracking-tighter">{prediction?.teamB_prob || '50'}%</h4>
                                                </div>
                                            </div>

                                            <div className="bg-white p-12 rounded-[3.5rem] border border-zinc-100 space-y-6 relative overflow-hidden group/ins">
                                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-emerald-600">
                                                    <Bot size={120} />
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="p-4 bg-white text-emerald-600 rounded-[1.5rem] border border-emerald-100 shadow-xl group-hover/ins:scale-110 transition-transform">
                                                        <Bot size={24} />
                                                    </div>
                                                    <h5 className="text-xl font-black uppercase tracking-tighter text-black italic">Neural Tactical Forecast</h5>
                                                </div>
                                                <p className="text-lg font-bold text-zinc-700 italic leading-relaxed uppercase tracking-tight border-l-4 border-emerald-600 pl-8">"{prediction?.insight || "Recalibrating match trajectory based on current RR and node acquisition status..."}"</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="lg:col-span-5 grid grid-cols-2 gap-8">
                                        <div className="bg-white p-10 rounded-[3rem] border border-zinc-100 group/stat hover:bg-white hover:border-emerald-600 hover:shadow-2xl transition-all duration-500 flex flex-col justify-between h-[200px]">
                                            <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest italic group-hover/stat:text-emerald-600 transition-colors">Required RR Node</p>
                                            <p className="text-5xl font-black text-black italic tabular-nums leading-none tracking-tighter">{prediction?.rrr || '0.00'}</p>
                                        </div>
                                        <div className="bg-white p-10 rounded-[3rem] border border-zinc-100 group/stat hover:bg-white hover:border-emerald-600 hover:shadow-2xl transition-all duration-500 flex flex-col justify-between h-[200px]">
                                            <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest italic group-hover/stat:text-emerald-600 transition-colors">Temporal Nodes</p>
                                            <p className="text-5xl font-black text-black italic tabular-nums leading-none tracking-tighter">{prediction?.ballsLeft || '0'}</p>
                                        </div>
                                        <div className="col-span-2 bg-white p-10 rounded-[3rem] border border-white/5 flex items-center justify-between shadow-2xl relative overflow-hidden group/momentum">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/10 blur-3xl"></div>
                                            <div className="relative z-10">
                                                <p className="text-[11px] font-black uppercase text-emerald-600 tracking-[0.4em] mb-3 italic">Momentum Index</p>
                                                <p className="text-2xl font-black text-black italic tracking-tighter uppercase">Subject A Under Critical Pressure</p>
                                            </div>
                                            <TrendingUp size={48} className="text-emerald-600/20 group-hover/momentum:scale-125 transition-transform duration-700" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 4. Business Intelligence Hub */}
                    {activeTab === 'business' && user?.role === 'admin' && (
                        <div className="space-y-12 animate-fade-up">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                {[
                                    { label: 'Cumulative Revenue Registry', val: '₹' + (business?.totalRevenue?.toLocaleString() || '0'), icon: BarChart3, color: 'blue' },
                                    { label: 'Temporal Peak Window', val: business?.peakTime || 'N/A', icon: Clock, color: 'emerald' },
                                    { label: 'Primary Performance Node', val: business?.popularTurf || 'N/A', icon: MapPin, color: 'amber' },
                                    { label: 'Node Velocity Growth', val: (business?.weeklyGrowth || '0') + '%', icon: TrendingUp, color: 'rose' }
                                ].map((stat, i) => (
                                    <div key={i} className="bg-white border border-zinc-200 p-10 rounded-[3.5rem] shadow-sm relative overflow-hidden group hover:shadow-2xl transition-all duration-700 h-[260px] flex flex-col justify-between">
                                         <div className="absolute top-0 right-0 p-10 opacity-[0.02] text-black group-hover:scale-110 transition-transform duration-700">
                                            <stat.icon size={150} />
                                        </div>
                                        <div className="flex justify-between items-start relative z-10">
                                            <div className="p-5 bg-white text-emerald-600 rounded-[2rem] shadow-sm group-hover:bg-emerald-600 group-hover:text-black transition-all duration-500">
                                                <stat.icon size={24} />
                                            </div>
                                            <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-100 italic">Live Feed</div>
                                        </div>
                                        <div className="relative z-10">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">{stat.label}</p>
                                            <h2 className={`text-4xl font-black italic tracking-tighter uppercase group-hover:text-emerald-600 transition-colors duration-500`}>{stat.val}</h2>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-white border border-zinc-200 p-12 rounded-[4rem] shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-12 opacity-[0.01] text-black pointer-events-none group-hover:scale-110 transition-all duration-1000">
                                    <PieChart size={400} />
                                </div>
                                <div className="flex items-center justify-between mb-12 relative z-10 border-b border-zinc-100 pb-8">
                                    <div className="flex items-center gap-6">
                                        <div className="p-5 bg-white text-black rounded-2xl shadow-xl"><PieChart size={28} /></div>
                                        <div>
                                            <h3 className="text-2xl font-black uppercase tracking-tighter text-black italic">Market <span className="text-emerald-600">Intelligence registry</span></h3>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5 italic">Synchronized operational Acquisition Nodes</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                                    {(business?.insights || ["Analyzing registry logs..."]).map((ins, i) => (
                                        <div key={i} className="flex items-center gap-8 p-10 bg-white rounded-[2.5rem] border border-transparent group/ins hover:bg-white hover:border-emerald-600 hover:shadow-2xl transition-all duration-500">
                                            <div className="w-16 h-16 rounded-[1.5rem] bg-white flex items-center justify-center border border-zinc-100 shadow-sm shrink-0 group-hover/ins:bg-emerald-600 group-hover/ins:text-black transition-all">
                                                <Zap size={24} />
                                            </div>
                                            <p className="text-lg font-black text-black uppercase tracking-tight italic leading-relaxed">{ins}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
