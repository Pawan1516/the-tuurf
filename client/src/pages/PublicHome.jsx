import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { configAPI, slotsAPI, matchesAPI } from '../api/client';
import { ChevronRight, Zap, MapPin, Plus, Trophy, Users, Timer, Activity, ArrowRight } from 'lucide-react';
import io from 'socket.io-client';

const PublicHome = () => {
    const SOCKET_URL = process.env.NODE_ENV === 'production'
        ? 'https://the-tuurf-ufkd.onrender.com'
        : 'http://localhost:5001';
        
    const getISODate = (date = new Date()) => {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
    };

    const [pageConfig, setPageConfig] = useState(null);
    const [slots, setSlots] = useState([]);
    const [liveMatches, setLiveMatches] = useState([]);
    const [selectedDate, setSelectedDate] = useState(getISODate());
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState({ PRICE_DAY: 1000, TURF_LOCATION: 'Hyderabad' });
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const heroImages = pageConfig?.hero?.images || [
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
            try {
                // Fetch CMS Config
                const configRes = await configAPI.get('home');
                if (configRes.data.success) {
                    setPageConfig(configRes.data.config);
                }
            } catch (err) { console.error('Config fetch error:', err); }

            try {
                // Fetch Slots
                const res = await slotsAPI.getAll(selectedDate);
                if (Array.isArray(res.data)) {
                    setSlots(res.data);
                }
            } catch (err) { console.error('Error fetching slots:', err); }

            try {
                // Fetch Global Settings
                const res = await slotsAPI.getSettings();
                if (res.data.success) {
                    setSettings(prev => ({ ...prev, ...res.data.settings }));
                }
            } catch (err) { console.error('Error fetching settings:', err); }

            fetchLiveMatches();
            setLoading(false);
        };
        init();
    }, [selectedDate]);

    const fetchLiveMatches = async () => {
        try {
            const res = await matchesAPI.getLive();
            if (res.data.success) {
                setLiveMatches(res.data.matches || []);
            }
        } catch (err) { console.error('Error fetching live matches:', err); }
    };

    useEffect(() => {
        const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
        socket.on('match:update', (data) => {
            setLiveMatches(prev => prev.map(m => {
                if (String(m._id) === String(data.matchId)) {
                    return { ...m, ...data };
                }
                return m;
            }));
        });
        return () => socket.disconnect();
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
        <div className="min-h-screen premium-gradient flex flex-col font-sans">
            {/* HERO SECTION - Taller more premium feel */}
            <section className="relative h-[320px] sm:h-[400px] md:h-[520px] w-full flex flex-col items-center justify-center overflow-hidden">
                {heroImages.map((img, idx) => (
                    <img
                        key={idx}
                        src={img}
                        alt="Turf background"
                        className={`absolute inset-0 w-full h-full object-cover brightness-[0.4] transition-all duration-1000 transform ${idx === currentImageIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
                    />
                ))}

                <div className="relative z-10 text-center space-y-6 px-6 max-w-4xl mx-auto">
                    <div className="flex flex-col items-center justify-center mb-6">
                         <span className="text-emerald-400 text-[10px] md:text-sm font-black uppercase tracking-[0.6em] mb-3 drop-shadow-lg animate-pulse">Smart Sports Arena</span>
                         <div className="h-1 w-32 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-8xl font-black text-white tracking-tighter uppercase leading-[0.9] drop-shadow-2xl">
                        {pageConfig?.hero?.title || 'Feel Free'} <span className="text-emerald-400 underline decoration-emerald-500/30 underline-offset-8">{pageConfig?.hero?.highlight || 'Play Better'}</span>
                    </h1>
                    <p className="text-[11px] md:text-base font-black text-white/80 uppercase tracking-[0.4em] mb-4 drop-shadow-lg">
                        {pageConfig?.hero?.subtext || 'Select your squad. Lock your slot'}
                    </p>

                    <div className="flex flex-wrap justify-center gap-4 mb-4">
                        <Link
                            to="/leaderboard"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 md:px-12 py-4 md:py-6 rounded-2xl md:rounded-3xl text-[10px] md:text-xs font-black uppercase tracking-widest shadow-2xl transition-all flex items-center gap-4 active:scale-95"
                        >
                            <Trophy size={20} className="text-yellow-400" /> View Arena Ranking
                        </Link>
                    </div>

                    <div className="flex justify-center gap-3">
                        {heroImages.map((_, idx) => (
                            <button key={idx} onClick={() => setCurrentImageIndex(idx)} className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentImageIndex ? 'w-10 bg-emerald-400' : 'w-2.5 bg-white/30'}`} />
                        ))}
                    </div>
                </div>
                {/* Scroll Indicator */}
                <div className="absolute bottom-16 md:bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50 hidden md:flex">
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/50">Explore Arena</span>
                    <div className="w-[1px] h-12 bg-gradient-to-b from-white to-transparent"></div>
                </div>
            </section>

            <div className="max-w-7xl mx-auto w-full px-3 md:px-6 -mt-10 md:-mt-32 relative z-20 mb-8 md:mb-32">
                {liveMatches.length > 0 && (
                    <div className="bg-[#050805] rounded-[2rem] md:rounded-[4rem] p-6 md:p-16 mb-16 shadow-2xl border border-white/10 overflow-hidden relative group">
                         {/* Abstract background detail */}
                         <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full group-hover:bg-emerald-500/20 transition-all duration-1000"></div>
                         
                         <div className="relative z-10 flex items-center justify-between mb-10 md:mb-16">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                                    <Zap size={24} className="text-emerald-500 fill-emerald-500 animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="text-lg md:text-2xl font-black uppercase tracking-[0.4em] text-emerald-400 leading-none">Live Arena</h3>
                                    <p className="text-[10px] md:text-[11px] font-bold text-white/30 uppercase tracking-[0.2em] mt-2 hidden md:block">Real-time match analytics and broadcast</p>
                                </div>
                            </div>
                            <Link to="/leaderboard" className="hidden md:flex items-center gap-3 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-full text-xs font-black uppercase tracking-widest shadow-[0_20px_40px_-5px_rgba(16,185,129,0.3)] transition-all active:scale-95">
                                <Trophy size={16} /> Global Ranking
                            </Link>
                        </div>
                        <div className="relative z-10 flex gap-4 md:gap-10 overflow-x-auto no-scrollbar pb-10 -mx-2 px-2 gpu-layer">
                            {liveMatches.map((match, idx) => (
                                <Link 
                                    key={match._id} 
                                    to={`/live/${match._id}`} 
                                    className={`flex-shrink-0 w-[85vw] md:w-[480px] bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 hover:bg-white/10 transition-all group overflow-hidden relative animate-fade-up`}
                                    style={{ animationDelay: `${idx * 100}ms` }}
                                >
                                    <div className="flex justify-between items-start mb-8 md:mb-12">
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{match.format || 'T20'} Segment</span>
                                            <p className="text-white font-black uppercase text-sm md:text-lg tracking-tight">{match.venue || 'Miyapur Arena'}</p>
                                        </div>
                                        <div className={`px-5 py-2 rounded-full border text-[9px] font-black uppercase tracking-widest ${
                                            match.status === 'Completed' 
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                                            : match.status === 'Scheduled'
                                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                                            : 'bg-rose-500/10 border-rose-500/20 text-rose-500 animate-pulse'
                                        }`}>
                                            {match.status === 'Completed' ? 'FINALIZED' : match.status === 'Scheduled' ? 'WAITING' : 'IN PLAY'}
                                        </div>
                                    </div>
                                     <div className="space-y-8 mb-12">
                                         {[
                                            { team: match.team_a, quick: match.quick_teams?.team_a, defaultName: 'Team A' },
                                            { team: match.team_b, quick: match.quick_teams?.team_b, defaultName: 'Team B' }
                                         ].map((item, idx) => (
                                             <div key={idx} className="flex items-center justify-between">
                                                 <span className="text-white/60 text-xs md:text-sm font-black uppercase tracking-widest">
                                                     {item.team?.team_id?.name || item.quick?.name || item.defaultName}
                                                 </span>
                                                 <div className="flex items-baseline gap-2">
                                                     <span className="text-2xl md:text-4xl font-black text-white tracking-tighter">{item.team?.score || 0}</span>
                                                     <span className="text-sm md:text-lg font-black text-white/30">/{item.team?.wickets || 0}</span>
                                                 </div>
                                             </div>
                                         ))}
                                     </div>

                                     {/* MATCH FOOTER CTA */}
                                     <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                                          <div className="flex-1 min-w-0 pr-4">
                                              {match.status === 'Completed' ? (
                                                  <div className="flex items-center gap-2">
                                                      <Trophy size={14} className="text-yellow-400 shrink-0" />
                                                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 truncate">
                                                          {match.live_data?.result ? match.live_data.result : (typeof match.result === 'string' ? match.result : `${match.result?.winner?.name || 'Winner'} won ${match.result?.won_by || 'match'}`)}
                                                      </span>
                                                  </div>
                                              ) : match.status === 'Scheduled' ? (
                                                  <div className="flex items-center gap-2">
                                                      <Timer size={14} className="text-blue-400 shrink-0" />
                                                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Match Setup Ready</span>
                                                  </div>
                                              ) : (
                                                  <div className="flex items-center gap-2">
                                                      <Activity size={14} className="text-rose-400 animate-pulse shrink-0" />
                                                      <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 truncate">Tracking Real-time</p>
                                                  </div>
                                              )}
                                          </div>
                                          
                                          <div className={`px-6 py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shadow-xl ${
                                              match.status === 'Completed' 
                                              ? 'bg-emerald-600 text-white group-hover:bg-emerald-500' 
                                              : match.status === 'Scheduled'
                                              ? 'bg-blue-600 text-white group-hover:bg-blue-500'
                                              : 'bg-white text-black group-hover:bg-emerald-400'
                                          }`}>
                                              {match.status === 'Completed' ? 'View Details' : match.status === 'Scheduled' ? 'Join' : 'Live Arena'}
                                          </div>
                                     </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-3 glass-card rounded-[2.5rem] p-6 shadow-xl flex lg:flex-col overflow-x-auto lg:overflow-x-visible gap-4 no-scrollbar">
                        {dates.map(d => (
                            <button key={d.dateStr} onClick={() => setSelectedDate(d.dateStr)} className={`flex-shrink-0 w-40 lg:w-full text-left p-6 rounded-[1.8rem] transition-all border-2 ${selectedDate === d.dateStr ? 'bg-white/80 border-emerald-500 shadow-xl shadow-emerald-500/10' : 'bg-transparent border-transparent hover:bg-white/40'}`}>
                                <div className={`font-black text-lg tracking-tight ${selectedDate === d.dateStr ? 'text-slate-900' : 'text-slate-400'}`}>{d.display}</div>
                                <div className={`text-[9px] font-black uppercase tracking-[0.3em] ${selectedDate === d.dateStr ? 'text-emerald-500' : 'text-slate-400'}`}>{d.label}</div>
                            </button>
                        ))}
                    </div>

                    <div className="lg:col-span-9 glass-card rounded-[3rem] shadow-2xl border border-white/50 overflow-hidden min-h-[600px]">
                        <div className="bg-slate-950 p-12 flex justify-between items-center text-white border-b border-white/5">
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-widest text-emerald-400">Today's Slots</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Fee</p>
                                <p className="text-2xl font-black text-white tracking-tighter">From ₹{settings.PRICE_DAY} / HR</p>
                            </div>
                        </div>

                        <div className="md:hidden p-6 space-y-4">
                            {loading ? (
                                <div className="py-24 text-center animate-pulse font-black text-slate-300 uppercase tracking-widest">Awaiting Arena Data...</div>
                            ) : slots.length === 0 ? (
                                <div className="py-24 text-center font-black text-slate-300 uppercase tracking-widest">Zero Slots in Registry</div>
                            ) : slots.sort((a,b) => a.startTime.localeCompare(b.startTime)).map(slot => (
                                <div key={slot._id} className={`p-6 rounded-[2rem] border-2 transition-all group ${slot.status === 'free' ? 'bg-white/60 border-white hover:border-emerald-500 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.05)]' : 'bg-slate-50/40 border-transparent opacity-60'}`}>
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <p className="text-2xl font-black text-slate-900 leading-none">{formatTime12h(slot.startTime)}</p>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Sessions End {formatTime12h(slot.endTime)}</p>
                                        </div>
                                        <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${slot.status === 'free' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                                            {slot.status === 'free' ? 'AVAILABLE' : 'RESERVED'}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-4 pt-6 border-t border-slate-50">
                                        <p className="text-xl font-black text-slate-900 tracking-tighter">₹{slot.price}</p>
                                        {slot.status === 'free' ? (
                                            <Link to={`/book/${slot._id}`} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-200 group-active:scale-95 transition-all">Select Slot</Link>
                                        ) : (
                                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">SLOT LOCKED</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="hidden md:block overflow-x-auto rounded-b-[3rem]">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-900 text-white/40 text-[11px] font-black uppercase tracking-widest border-t border-white/5">
                                        <th className="px-12 py-7 text-emerald-400">Time Segment</th>
                                        <th className="px-12 py-7">Status</th>
                                        <th className="px-12 py-7">Price</th>
                                        <th className="px-12 py-7 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/20 bg-white/40 backdrop-blur-md">
                                    {loading ? (
                                        <tr><td colSpan="4" className="py-24 text-center animate-pulse font-black text-slate-300 uppercase tracking-widest">Syncing Arena Data...</td></tr>
                                    ) : slots.length === 0 ? (
                                        <tr><td colSpan="4" className="py-24 text-center font-black text-slate-300 uppercase tracking-widest">No slots found</td></tr>
                                    ) : slots.sort((a,b) => a.startTime.localeCompare(b.startTime)).map(slot => (
                                        <tr key={slot._id} className="hover:bg-teal-50/20 transition-all">
                                            <td className="px-12 py-10">
                                                <div className="text-2xl font-black text-slate-900 tracking-tight">{formatTime12h(slot.startTime)}</div>
                                                <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Until {formatTime12h(slot.endTime)}</div>
                                            </td>
                                            <td className="px-12 py-10">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2.5 h-2.5 rounded-full ${slot.status === 'free' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                    <span className={`text-[11px] font-black uppercase tracking-widest ${slot.status === 'free' ? 'text-emerald-600' : 'text-rose-500'}`}>{slot.status === 'free' ? 'Free' : 'Booked'}</span>
                                                </div>
                                            </td>
                                            <td className="px-12 py-10 font-black text-2xl text-slate-900 tracking-tighter">₹{slot.price}</td>
                                            <td className="px-12 py-10 text-center">
                                                {slot.status === 'free' ? (
                                                    <Link to={`/book/${slot._id}`} className="bg-emerald-600 text-white font-black px-10 py-4 rounded-2xl hover:bg-emerald-700 shadow-xl text-[11px] uppercase tracking-widest">Book Now</Link>
                                                ) : (
                                                    <div className="px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 border-rose-100 text-rose-300">BOOKED</div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* ABOUT SECTION (Dynamic) */}
            <div id="about" className="max-w-7xl mx-auto w-full px-3 md:px-6 mb-32">
                <div className="glass-card rounded-[3rem] p-8 md:p-20 shadow-2xl border border-white/40 border-t-white/80 relative overflow-hidden group hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] transition-all duration-700">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                        <div className="space-y-10 relative z-10">
                            <div>
                                <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-700 text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-full mb-8 border border-emerald-500/20 shadow-sm backdrop-blur-md">
                                    <Zap size={12} className="fill-emerald-600" /> Flagship Arena
                                </div>
                                <h2 className="text-4xl md:text-7xl font-black text-slate-900 tracking-tighter uppercase leading-[0.9] mb-8">
                                    {pageConfig?.about?.title || 'The Turf Miyapur'}
                                </h2>
                                <p className="text-slate-600 text-sm md:text-lg leading-relaxed font-medium">
                                    {pageConfig?.about?.description || 'Welcome to Hyderabad’s premier tech-enabled sports arena. Our facility merges a high-performance 90ft x 60ft arena with a fully digital match-day experience.'}
                                </p>
                                <div className="mt-6">
                                    <Link to="/about" className="inline-flex items-center gap-2 border-2 border-slate-900 text-slate-900 px-6 py-3 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-slate-900 hover:text-white transition-all">
                                        Explore the Smart Arena Experience <ArrowRight size={14} />
                                    </Link>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-4">
                                {(pageConfig?.about?.tags || ['#TechTurfMiyapur', '#SmartArena', '#DigitalPlay']).map(tag => (
                                    <span key={tag} className="text-[10px] font-black uppercase tracking-widest text-emerald-700/60 bg-white/40 px-3 py-1.5 rounded-xl border border-white/50">{tag}</span>
                                ))}
                            </div>
                        </div>
                        <div className="relative group-hover:scale-[1.02] transition-transform duration-1000">
                            <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full scale-50 group-hover:scale-100 transition-all duration-1000"></div>
                            <img src={pageConfig?.about?.image || "https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&q=80&w=1200"} alt="Arena" className="relative z-10 aspect-square w-full object-cover rounded-[3rem] grayscale hover:grayscale-0 transition-all duration-1000 shadow-[0_20px_40px_-5px_rgba(0,0,0,0.2)]" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto w-full px-3 md:px-6 mb-32">
                <div className="glass-card border border-white/50 rounded-[3rem] p-12 flex flex-col md:flex-row items-center gap-12 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)]">
                    <div className="bg-emerald-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-emerald-600/30">
                        <MapPin size={48} />
                    </div>
                    <div className="flex-1 space-y-2">
                        <h4 className="font-black text-slate-900 text-3xl tracking-tighter uppercase leading-none">Location Intelligence</h4>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px]">{settings.TURF_LOCATION}</p>
                    </div>
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(settings.TURF_LOCATION)}`} target="_blank" className="bg-slate-900 text-white px-12 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-2xl">Get Directions</a>
                </div>
            </div>
        </div>
    );
};

export default PublicHome;
