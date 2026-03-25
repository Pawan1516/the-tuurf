import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { slotsAPI, matchesAPI } from '../api/client';
import { ChevronRight, Zap, MapPin, Plus, Trophy, Users, Timer, Activity } from 'lucide-react';
import io from 'socket.io-client';

const PublicHome = () => {
    const SOCKET_URL = process.env.NODE_ENV === 'production' 
        ? 'https://the-tuurf-ufkd.onrender.com' 
        : 'http://localhost:5001';
    const getISODate = (date = new Date()) => {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
    };

    const [slots, setSlots] = useState([]);
    const [liveMatches, setLiveMatches] = useState([]);
    const [selectedDate, setSelectedDate] = useState(getISODate());
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState({ PRICE_DAY: 1000 });

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const heroImages = [
        'https://lh3.googleusercontent.com/p/AF1QipNPrYKn27LUcosUUL_CKc_0kJAwvZidmXHu1fQI=w426-h240-k-no',
        'https://lh3.googleusercontent.com/p/AF1QipMsbwyFcmcNneeEsp6NfnXw27Ovyk38W3LqHRk_=w203-h114-k-no',
        'https://lh3.googleusercontent.com/gps-cs-s/AHVAwepkoP29RPlPNGboLneeOgvbhpHEwA99AxCpM55ViIdwNpOmphYvagNoffmNoh8g6xJ52bLQCmpLWMh1MxvnOZixgrwC8qCtHVvW5STmUmO_pWnP3Tem2-ceTSUzPnUxUazvfe1NBw=w203-h152-k-no',
        'https://lh3.googleusercontent.com/p/AF1QipOn7CkSrcWUs8IeOSKZFX0MT1NMp37Evqr1sSPZ=w203-h152-k-no'
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [heroImages.length]);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            
            // 1. Fetch Slots (Primary)
            try {
                const res = await slotsAPI.getAll(selectedDate);
                if (Array.isArray(res.data)) setSlots(res.data);
                else setSlots([]);
            } catch (err) {
                console.error('Error fetching slots:', err);
                setSlots([]);
            }

            // 2. Fetch Settings
            try {
                const res = await slotsAPI.getSettings();
                if (res.data.success) {
                    setSettings(prev => ({ ...prev, ...res.data.settings }));
                }
            } catch (err) {
                console.error('Error fetching settings:', err);
            }

            // Initial fetch for Match Data
            fetchLiveMatches();
            setLoading(false);
        };
        init();
    }, [selectedDate]);

    // Separate effect for polling live matches
    const fetchLiveMatches = async () => {
        try {
            const res = await matchesAPI.getLive();
            if (res.data.success) {
                setLiveMatches(res.data.matches || []);
            }
        } catch (err) {
            console.error('Error fetching live matches:', err);
        }
    };

    useEffect(() => {
        const interval = setInterval(fetchLiveMatches, 20000); // Fallback Polling
        
        // --- REAL-TIME INTEL (Workflow 5) ---
        const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
        
        socket.on('connect', () => {
            console.log('🟢 Home Intel Connected');
            // Join all live match rooms
            liveMatches.forEach(m => socket.emit('join_match', m._id));
        });

        socket.on('match:update', (data) => {
            setLiveMatches(prev => prev.map(m => {
                if (String(m._id) === String(data.matchId)) {
                    return { 
                        ...m, 
                        ...data,
                        status: data.status || m.status,
                        // Ensure top-level scores are updated from live payload
                        team_a: { ...m.team_a, score: data.live_active_team === 'A' ? data.runs : (data.inn1_scorecard?.score || m.team_a.score), wickets: data.live_active_team === 'A' ? data.wickets : (data.inn1_scorecard?.wickets || m.team_a.wickets) },
                        team_b: { ...m.team_b, score: data.live_active_team === 'B' ? data.runs : m.team_b.score, wickets: data.live_active_team === 'B' ? data.wickets : m.team_b.wickets }
                    };
                }
                return m;
            }));
        });

        return () => {
            clearInterval(interval);
            socket.disconnect();
        };
    }, [liveMatches.length]);

    const formatTime12h = (time24) => {
        if (!time24) return '';
        const [hours, minutes] = time24.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    const formatOvers = (overs) => {
        if (typeof overs !== 'number') return '0.0';
        const completeOvers = Math.floor(overs);
        const balls = Math.round((overs % 1) * 6);
        return `${completeOvers}.${balls}`;
    };

    const dates = [0, 1, 2, 3, 4, 5, 6].map(days => {
        const timestamp = new Date().getTime() + (days * 24 * 60 * 60 * 1000);
        const d = new Date(timestamp);
        const localDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
        const displayDate = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short', month: 'short', day: 'numeric' }).format(d);
        return {
            dateStr: localDateStr,
            display: displayDate,
            label: days === 0 ? "TODAY" : days === 1 ? "TOMORROW" : "AVAILABLE",
            days
        };
    });

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            {/* HERO SECTION WITH BACKGROUND IMAGE SLIDER */}
            <section className="relative h-[250px] sm:h-[300px] md:h-[420px] w-full flex flex-col items-center justify-center overflow-hidden">
                {heroImages.map((img, idx) => (
                    <div
                        key={idx}
                        className={`absolute inset-0 bg-cover bg-center brightness-[0.4] transition-all duration-1000 ease-in-out transform ${idx === currentImageIndex
                            ? 'opacity-100 scale-100'
                            : 'opacity-0 scale-105 select-none pointer-events-none'
                            }`}
                        style={{ backgroundImage: `url('${img}')` }}
                    ></div>
                ))}

                <div className="relative z-10 text-center space-y-4 px-6 md:px-4">
                    <h1 className="text-3xl sm:text-4xl md:text-8xl font-black text-white tracking-tighter uppercase leading-none drop-shadow-2xl">
                        Feel Free <span className="text-emerald-400"> Play Better</span>
                    </h1>
                    <p className="text-[10px] md:text-sm font-black text-white/80 uppercase tracking-[0.4em] md:tracking-[1em] mb-4 md:mb-8 drop-shadow-lg">
                        Select your squad. Lock your slot
                    </p>

                    <div className="flex flex-wrap justify-center gap-4 mb-4 md:mb-10">
                        <Link 
                            to="/leaderboard" 
                            className="bg-white/10 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/20 backdrop-blur-md transition-all shadow-2xl flex items-center gap-3"
                        >
                            <Trophy size={16} className="text-yellow-400" /> Hall of Fame
                        </Link>
                    </div>

                    {/* SLIDER DOTS */}
                    <div className="flex justify-center gap-2 md:gap-3">
                        {heroImages.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentImageIndex(idx)}
                                className={`h-1 md:h-1.5 rounded-full transition-all duration-500 ${idx === currentImageIndex ? 'w-6 md:w-8 bg-emerald-400' : 'w-1.5 md:w-2 bg-white/30'
                                    }`}
                            ></button>
                        ))}
                    </div>
                </div>
            </section>

            {/* MAIN INTERFACE OVERLAPPING HERO */}
            <div className="max-w-7xl mx-auto w-full px-3 md:px-6 -mt-10 md:-mt-32 relative z-20 mb-8 md:mb-32">
                
                {/* LIVE ARENA INTEL - PREMIUM OVERHAUL */}
                {liveMatches.length > 0 && (
                    <div className="bg-[#050805] rounded-[3rem] p-8 md:p-14 mb-16 shadow-[0_50px_100px_rgba(0,0,0,0.4)] border border-white/10 overflow-hidden relative">
                        {/* Mesh Gradients Background */}
                        <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
                            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-600/20 blur-[120px] rounded-full"></div>
                            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[120px] rounded-full"></div>
                        </div>

                        <div className="relative z-10 flex items-center justify-between mb-12 px-2">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                    <Zap size={20} className="text-emerald-500 fill-emerald-500 animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="text-sm md:text-base font-black uppercase tracking-[0.4em] text-emerald-400 leading-none">Arena Deployment</h3>
                                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-2">{liveMatches.length} Operational Units</p>
                                </div>
                            </div>
                            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                                <Activity size={14} className="text-emerald-500" />
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Global Sync Active</span>
                            </div>
                            <Link 
                                to="/leaderboard"
                                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg"
                            >
                                <Trophy size={14} className="text-yellow-400" /> Rankings
                            </Link>
                        </div>

                        <div className={`relative z-10 flex gap-6 md:gap-10 overflow-x-auto no-scrollbar pb-8 ${liveMatches.length === 1 ? 'justify-center' : ''}`}>
                            {liveMatches.map((match) => (
                                <Link 
                                    key={match._id} 
                                    to={`/live/${match._id}`}
                                    className="flex-shrink-0 w-[310px] md:w-[420px] bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 hover:bg-white/10 hover:border-emerald-500/30 transition-all duration-500 group relative overflow-hidden shadow-2xl"
                                >
                                    {/* Card Glow */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    
                                    <div className="flex justify-between items-start mb-8">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">{match.format || 'T20'} • {match.venue || 'Main Arena'}</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></div>
                                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Active Intel</span>
                                            </div>
                                        </div>
                                        <div className={`px-4 py-1.5 rounded-full border text-[9px] font-[1000] uppercase tracking-widest ${
                                            match.status === 'In Progress' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-white/5 border-white/10 text-white/40'
                                        }`}>
                                            {match.status === 'In Progress' ? 'LIVE' : match.status === 'Completed' ? 'FINAL' : 'UPCOMING'}
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        {[
                                            { team: match.team_a, active: match.live_active_team === 'A', idx: 0 },
                                            { team: match.team_b, active: match.live_active_team === 'B', idx: 1 }
                                        ].map((t) => (
                                            <div key={t.idx} className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500 ${
                                                        t.active ? 'bg-emerald-500/20 border-emerald-500/40 scale-110 shadow-lg shadow-emerald-500/10' : 'bg-white/5 border-white/10 opacity-40'
                                                    }`}>
                                                        <Users size={22} className={t.active ? 'text-emerald-400' : 'text-white'} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className={`text-base md:text-lg font-black tracking-tight truncate max-w-[160px] ${t.active ? 'text-white' : 'text-white/40'}`}>
                                                            {t.team?.team_id?.name || match.quick_teams?.[t.idx === 0 ? 'team_a' : 'team_b']?.name || (t.idx === 0 ? 'Team A' : 'Team B')}
                                                        </span>
                                                        {t.active && match.status === 'In Progress' && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Zap size={10} className="text-emerald-400 animate-bounce" />
                                                                <span className="text-[9px] font-black text-emerald-400/60 uppercase tracking-widest">Deploying</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {(match.status === 'In Progress' || match.status === 'Completed') && (
                                                    <div className="text-right">
                                                        <span className={`text-2xl md:text-3xl font-[1000] tracking-tighter ${t.active ? 'text-white' : 'text-white/20'}`}>
                                                            {t.team?.score || 0}
                                                        </span>
                                                        <span className={`text-sm md:text-base font-black ml-1.5 ${t.active ? 'text-emerald-500/60' : 'text-white/10'}`}>
                                                            / {t.team?.wickets || 0}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {match.status === 'Completed' ? (
                                                <div className="flex items-center gap-2 text-yellow-500/60 bg-yellow-500/5 px-3 py-1.5 rounded-lg border border-yellow-500/10">
                                                    <Trophy size={14} className="text-yellow-400" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest truncate max-w-[150px]">
                                                        {match.result?.winner?.name || 'Match'} Victory
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2.5 text-white/20">
                                                    <Timer size={14} />
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                                                        {match.status === 'In Progress' ? 
                                                            formatOvers(match.innings?.[match.current_innings_index || 0]?.overs_completed) + ' OVS' : 
                                                            new Date(match.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 bg-emerald-600 px-5 py-2.5 rounded-xl group-hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-950/20">
                                            <span className="text-[10px] font-black uppercase tracking-widest">Enter Intel</span>
                                            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">

                    {/* DATE SIDEBAR - Horizontal on Mobile, Vertical on Desktop */}
                    <div className="lg:col-span-3 bg-white rounded-[2rem] md:rounded-[2.5rem] p-4 md:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.08)] flex lg:flex-col overflow-x-auto lg:overflow-x-visible gap-3 md:gap-4 no-scrollbar">
                        {dates.map((d) => {
                            const isActive = selectedDate === d.dateStr;
                            return (
                                <button
                                    key={d.dateStr}
                                    onClick={() => setSelectedDate(d.dateStr)}
                                    className={`flex-shrink-0 w-40 lg:w-full text-left p-4 lg:p-8 rounded-[1.5rem] lg:rounded-[1.8rem] transition-all duration-300 flex flex-col gap-1 md:gap-1.5 relative border-2 ${isActive
                                        ? 'bg-white border-emerald-500 shadow-xl shadow-emerald-500/10'
                                        : 'bg-transparent border-transparent hover:bg-slate-50'
                                        }`}
                                >
                                    <div className={`font-black text-base lg:text-xl tracking-tight leading-none ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                                        {d.display}
                                    </div>
                                    <div className={`text-[8px] lg:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] flex items-center gap-2 ${isActive ? 'text-emerald-500' : 'text-slate-300'}`}>
                                        {d.days === 0 && <Zap size={10} className="fill-emerald-500" />} {d.label}
                                    </div>
                                    {isActive && (
                                        <div className="hidden lg:block absolute right-6 top-1/2 -translate-y-1/2 w-2 h-10 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/30"></div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* SLOT LISTING */}
                    <div className="lg:col-span-9 bg-white rounded-[2rem] md:rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden min-h-[500px] md:min-h-[600px]">

                        {/* NAVY HEADER */}
                        <div className="bg-[#1e293b] p-4 md:p-12 flex flex-col md:flex-row justify-between items-center text-white relative gap-3 md:gap-8">
                            <div className="space-y-1.5 flex-1 w-full text-center md:text-left">
                                <h2 className="text-xl md:text-2xl font-black uppercase tracking-[0.1em] text-emerald-400 leading-none">Arena Deployment</h2>
                                <p className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em] md:tracking-[0.4em]">
                                    {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                </p>
                            </div>
                            <div className="flex flex-wrap md:flex-nowrap items-center justify-center gap-4 md:gap-6">
                                <Link
                                    to="/book/custom"
                                    className="bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white px-4 md:px-6 py-2.5 md:py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all border border-emerald-500/20 flex items-center gap-2"
                                >
                                    <Plus size={14} /> Custom Time
                                </Link>
                                <div className="text-center md:text-right">
                                    <p className="text-[8px] md:text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-1">Fee</p>
                                    <p className="text-xl md:text-2xl font-black text-white leading-none tracking-tighter">From ₹{settings.PRICE_DAY} / HR</p>
                                </div>
                                <div className="hidden md:flex bg-emerald-500/10 p-4 rounded-2xl text-emerald-400 border border-emerald-500/20 shadow-inner">
                                    <Zap size={24} className="fill-emerald-400" />
                                </div>
                            </div>
                        </div>

                        {/* TABLE CONTENT (Hidden on Mobile) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#1e293b] text-white/40 text-[11px] font-black uppercase tracking-[0.3em] border-t border-white/5">
                                        <th className="px-12 py-7 text-emerald-400">Time Segment</th>
                                        <th className="px-12 py-7">Slot Type</th>
                                        <th className="px-12 py-7">Status</th>
                                        <th className="px-12 py-7">Price</th>
                                        <th className="px-12 py-7 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loading ? (
                                        <tr><td colSpan="5" className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Syncing Arena Data...</td></tr>
                                    ) : slots.length === 0 ? (
                                        <tr><td colSpan="5" className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No entries found in this timeframe</td></tr>
                                    ) : slots.sort((a, b) => a.startTime.localeCompare(b.startTime)).map((slot) => {
                                        const isFree = slot.status === 'free';
                                        const isBooked = slot.status === 'booked';
                                        return (
                                            <tr key={slot._id} className="transition-all hover:bg-teal-50/30 group">
                                                <td className="px-12 py-10">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-2xl font-black tracking-tight text-slate-900">
                                                            {formatTime12h(slot.startTime)}
                                                        </span>
                                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                                                            Until {formatTime12h(slot.endTime)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-12 py-10">
                                                    <span className="text-[10px] font-black px-5 py-2 rounded-xl uppercase tracking-widest bg-slate-900 text-teal-400 border border-teal-500/20">
                                                        Standard Hour
                                                    </span>
                                                </td>
                                                <td className="px-12 py-10">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-2.5 h-2.5 rounded-full ${isFree ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : isBooked ? 'bg-rose-500 shadow-[0_0_10px_#ef4444]' : 'bg-amber-500'}`}></div>
                                                        <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${isFree ? 'text-emerald-600' : isBooked ? 'text-rose-500' : 'text-amber-600'}`}>
                                                            {isFree ? 'Free' : isBooked ? 'Already Booked' : 'On Hold'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-12 py-10">
                                                    <span className="text-2xl font-black text-slate-900 tracking-tighter">₹{slot.price || 1000}</span>
                                                </td>
                                                <td className="px-12 py-10 text-center">
                                                    {isFree ? (
                                                        <Link
                                                            to={`/book/${slot._id}`}
                                                            className="inline-flex items-center gap-3 bg-emerald-600 text-white font-black px-10 py-4 rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/10 hover:shadow-emerald-900/30 transform hover:-translate-y-1 active:scale-95 text-[11px] uppercase tracking-widest leading-none"
                                                        >
                                                            Book <ChevronRight size={16} />
                                                        </Link>
                                                    ) : (
                                                        <div className={`inline-flex px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 leading-none ${isBooked ? 'border-rose-100 text-rose-300' : 'border-amber-100 text-amber-200'}`}>
                                                            ALREADY BOOKED
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* CARD LIST (Mobile Only) */}
                        <div className="md:hidden p-4 space-y-4">
                            {loading ? (
                                <div className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px] animate-pulse">Syncing Arena Data...</div>
                            ) : slots.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">No entries found in this timeframe</div>
                            ) : slots.sort((a, b) => a.startTime.localeCompare(b.startTime)).map((slot) => {
                                const isFree = slot.status === 'free';
                                const isBooked = slot.status === 'booked';
                                return (
                                    <div key={slot._id} className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4 relative overflow-hidden group">
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col">
                                                <span className="text-xl font-black tracking-tight text-slate-900 leading-none">
                                                    {formatTime12h(slot.startTime)}
                                                </span>
                                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mt-1">
                                                    Until {formatTime12h(slot.endTime)}
                                                </span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-lg font-black text-slate-900 tracking-tighter">₹{slot.price || 1000}</span>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <div className={`w-2 h-2 rounded-full ${isFree ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : isBooked ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                                                    <span className={`text-[8px] font-black uppercase tracking-[0.1em] ${isFree ? 'text-emerald-600' : isBooked ? 'text-rose-500' : 'text-amber-600'}`}>
                                                        {isFree ? 'Free' : isBooked ? 'Already Booked' : 'On Hold'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-2">
                                            <span className="text-[8px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest bg-slate-900 text-teal-400">
                                                Standard Hour
                                            </span>
                                            {isFree ? (
                                                <Link
                                                    to={`/book/${slot._id}`}
                                                    className="inline-flex items-center gap-2 bg-emerald-600 text-white font-black px-6 py-3 rounded-xl hover:bg-emerald-700 transition-all shadow-lg text-[9px] uppercase tracking-widest"
                                                >
                                                    Secure <ChevronRight size={12} />
                                                </Link>
                                            ) : (
                                                <div className={`px-6 py-3 rounded-xl font-black uppercase text-[8px] tracking-widest border-2 ${isBooked ? 'border-rose-100 text-rose-300' : 'border-amber-100 text-amber-200'}`}>
                                                    ALREADY BOOKED
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* LOCATION INTEL SECTION */}
            <div className="max-w-7xl mx-auto w-full px-3 md:px-6 mb-8 md:mb-32">
                <div className="bg-white border border-slate-100 rounded-[1.5rem] md:rounded-[3rem] p-5 md:p-12 flex flex-col md:flex-row items-center gap-4 md:gap-12 shadow-[0_20px_60px_rgba(0,0,0,0.05)]">
                    <div className="bg-emerald-600 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] text-white shadow-2xl shadow-emerald-600/30">
                        <MapPin size={48} />
                    </div>
                    <div className="flex-1 text-center md:text-left space-y-2">
                        <h4 className="font-black text-slate-900 text-xl md:text-3xl tracking-tighter uppercase leading-none">Location Intelligence</h4>
                        <p className="text-slate-400 font-bold uppercase tracking-[0.1em] md:tracking-[0.2em] text-[9px] md:text-[11px]">
                            {settings.TURF_LOCATION}
                        </p>
                    </div>
                    <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(settings.TURF_LOCATION)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full md:w-auto bg-slate-900 text-white px-8 md:px-12 py-4 md:py-5 rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-[0.2em] hover:bg-black transition-all shadow-2xl active:scale-95 whitespace-nowrap text-center"
                    >
                        Get Directions
                    </a>
                </div>
            </div>
        </div>
    );
};

export default PublicHome;
