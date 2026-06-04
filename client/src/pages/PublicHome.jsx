import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { configAPI, slotsAPI, matchesAPI } from '../api/client';
import {
  ChevronRight, Zap, MapPin, Trophy, Users, Timer, Activity,
  ArrowRight, Star, Clock, Calendar, TrendingUp, Wifi,
  Shield, Target, Award, Eye, Play, BookOpen, Search,
  ChevronLeft, CircleDot, Flame, Wind, Sparkles, BarChart2
} from 'lucide-react';
import io from 'socket.io-client';
import { SOCKET_URL as API_SOCKET_URL } from '../api/client';


/* ─────────────────────────────────────────────
   TILT CARD (3-D interactive hover)
───────────────────────────────────────────── */
const TiltCard = ({ children, className }) => {
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setRotate({ x: (rect.height / 2 - y) / 22, y: (x - rect.width / 2) / 22 });
  };
  return (
    <div
      className={`${className} transition-transform duration-500 ease-out cursor-pointer`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setRotate({ x: 0, y: 0 })}
      style={{ transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`, transformStyle: 'preserve-3d' }}
    >
      <div style={{ transform: 'translateZ(25px)', transformStyle: 'preserve-3d' }}>
        {children}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   HERO CAROUSEL SLIDES
───────────────────────────────────────────── */
const HERO_SLIDES = [
  {
    tag: '🏏 Live Cricket Scoring',
    title: 'Feel Free',
    highlight: 'Play Better',
    sub: 'Ball-by-ball scoring · Live streaming · Pro analytics',
    cta1: { label: 'Book Turf Now', to: '#slots' },
    cta2: { label: 'Watch Live', to: '/live' },
    accent: 'from-emerald-900/80 via-emerald-950/60 to-black/90',
    bg: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80&w=1600'
  },
  {
    tag: '🏆 Tournaments',
    title: 'Battle For',
    highlight: 'Glory',
    sub: 'Join tournaments · Win prizes · Build your legacy',
    cta1: { label: 'View Tournaments', to: '/tournaments' },
    cta2: { label: 'Register Team', to: '/tournaments' },
    accent: 'from-emerald-950/85 via-black/70 to-emerald-900/60',
    bg: 'https://images.unsplash.com/photo-1578977633743-cabe4acce6cf?auto=format&fit=crop&q=80&w=1600'
  },
  {
    tag: '⚡ Premium Turf',
    title: 'The Best',
    highlight: 'Arena',
    sub: 'FIFA-grade surface · LED floodlights · Real-time booking',
    cta1: { label: 'Start Match', to: '/dashboard' },
    cta2: { label: 'Book Slot', to: '#slots' },
    accent: 'from-black/85 via-emerald-950/70 to-emerald-900/80',
    bg: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=1600'
  }
];

/* ─────────────────────────────────────────────
   STATS BAR DATA
───────────────────────────────────────────── */
const QUICK_STATS = [
  { icon: Users, value: '2,400+', label: 'Players' },
  { icon: CircleDot, value: '850+', label: 'Matches' },
  { icon: Trophy, value: '48', label: 'Tournaments' },
  { icon: Star, value: '4.9', label: 'Rating' }
];

/* ─────────────────────────────────────────────
   MOCK UPCOMING TOURNAMENTS (fallback)
───────────────────────────────────────────── */
const MOCK_TOURNAMENTS = [
  {
    _id: 't1', name: 'Miyapur Premier League', prize: '₹50,000',
    teams: 16, startDate: '2026-06-10', status: 'Registrations Open',
    format: 'T20', banner: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80&w=600'
  },
  {
    _id: 't2', name: 'Hyderabad Cup 2026', prize: '₹25,000',
    teams: 8, startDate: '2026-06-20', status: 'Coming Soon',
    format: 'T10', banner: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=600'
  },
  {
    _id: 't3', name: 'Night Cricket League', prize: '₹15,000',
    teams: 12, startDate: '2026-07-01', status: 'Registrations Open',
    format: 'Box Cricket', banner: 'https://images.unsplash.com/photo-1578977633743-cabe4acce6cf?auto=format&fit=crop&q=80&w=600'
  }
];

/* ─────────────────────────────────────────────
   FORMAT HELPERS
───────────────────────────────────────────── */
const fmt12h = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':');
  const n = parseInt(h);
  return `${n % 12 || 12}:${m} ${n >= 12 ? 'PM' : 'AM'}`;
};

const fmtOvers = (o) => {
  if (typeof o !== 'number') return '0.0';
  return `${Math.floor(o)}.${Math.round((o % 1) * 6)}`;
};

const getISODate = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════ */
const PublicHome = () => {
  const SOCKET_URL = API_SOCKET_URL;

  const location = useLocation();
  const navigate = useNavigate();

  // Scroll to slots section if url contains #slots
  useEffect(() => {
    if (location.hash === '#slots') {
      const el = document.getElementById('slots');
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [location.hash]);

  /* ── state ── */
  const [heroIdx, setHeroIdx] = useState(0);
  const [pageConfig, setPageConfig] = useState(null);
  const [slots, setSlots] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getISODate());
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({ PRICE_DAY: 1000, TURF_LOCATION: 'Miyapur, Hyderabad' });
  const [heroAnimating, setHeroAnimating] = useState(false);
  const socketRef = useRef(null);
  const joinedRef = useRef(new Set());

  /* ── hero auto-slide ── */
  useEffect(() => {
    const t = setInterval(() => {
      setHeroAnimating(true);
      setTimeout(() => { setHeroIdx(p => (p + 1) % HERO_SLIDES.length); setHeroAnimating(false); }, 300);
    }, 6000);
    return () => clearInterval(t);
  }, []);

  /* ── data fetch ── */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try { const r = await configAPI.get('home'); if (r.data.success) setPageConfig(r.data.config); } catch {}
      try { const r = await slotsAPI.getAll(selectedDate); if (Array.isArray(r.data)) setSlots(r.data); } catch {}
      try { const r = await slotsAPI.getSettings(); if (r.data.success) setSettings(p => ({ ...p, ...r.data.settings })); } catch {}
      await fetchLive();
      setLoading(false);
    })();
    const rt = setInterval(fetchLive, 30000);
    return () => clearInterval(rt);
  }, [selectedDate]);

  const fetchLive = async () => {
    try {
      const r = await matchesAPI.getLive(`?t=${Date.now()}`);
      if (r.data.success) setLiveMatches(r.data.matches || []);
    } catch {}
  };

  /* ── socket ── */
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('match:update', data => {
      setLiveMatches(prev => prev.map(m => {
        const mid = data.matchId || data._id;
        if (String(m._id) !== String(mid)) return m;
        const bt = data.batting_team || data.live_data?.batting_team || 'A';
        const tKey = bt === 'B' ? 'team_b' : 'team_a';
        return { ...m, ...data, [tKey]: { ...m[tKey], score: data.runs ?? m[tKey]?.score, wickets: data.wickets ?? m[tKey]?.wickets }, live_data: { ...(m.live_data || {}), ...(data.live_data || {}), ...data } };
      }));
    });
    return () => socket.disconnect();
  }, []);

  /* ── hash scroll ── */
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.substring(1);
      const element = document.getElementById(id);
      if (element) {
        const timer = setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [location, loading]);

  /* ── join rooms ── */
  useEffect(() => {
    if (!socketRef.current) return;
    liveMatches.forEach(m => {
      const mid = String(m._id);
      if (!joinedRef.current.has(mid)) { socketRef.current.emit('join_match', mid); joinedRef.current.add(mid); }
    });
  }, [liveMatches]);

  /* ── derived ── */
  const displayMatches = useMemo(() => {
    // Sort matches by start time descending
    const sorted = [...liveMatches].sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
    const live = sorted.filter(m => m.status === 'In Progress');
    const completed = sorted.filter(m => m.status === 'Completed');
    return [...live, ...completed];
  }, [liveMatches]);

  const dates = [0, 1, 2, 3, 4, 5, 6].map(d => {
    const ts = Date.now() + d * 864e5;
    const date = new Date(ts);
    return {
      dateStr: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date),
      display: new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' }).format(date),
      label: d === 0 ? 'TODAY' : d === 1 ? 'TOMORROW' : 'OPEN',
      d
    };
  });

  const slide = HERO_SLIDES[heroIdx];

  /* ══════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ═══════════════════════════════
          HERO BANNER
      ════════════════════════════════ */}
      <section className="relative h-[92vh] min-h-[600px] max-h-[900px] overflow-hidden flex items-center justify-center">
        {/* Background images */}
        {HERO_SLIDES.map((s, i) => (
          <img
            key={i}
            src={s.bg}
            alt=""
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ${i === heroIdx ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
          />
        ))}

        {/* Dark overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${slide.accent} transition-all duration-700`} />



        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/6 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] animate-pulse-slow pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/6 w-96 h-96 bg-emerald-400/8 rounded-full blur-[120px] animate-float-slow pointer-events-none" />

        {/* Grid lines overlay */}
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(16,185,129,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.4) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        {/* Content */}
        <div className={`relative z-10 text-center px-6 max-w-5xl mx-auto transition-all duration-300 ${heroAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>

          {/* Tag */}
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black uppercase tracking-[0.4em] px-5 py-2.5 rounded-full backdrop-blur-md mb-8 animate-fade-in">
            <Zap size={12} className="fill-emerald-400" />
            {slide.tag}
          </div>

          {/* Title */}
          <h1 className="font-bebas text-[90px] sm:text-[130px] md:text-[170px] leading-[0.82] uppercase tracking-tight text-white drop-shadow-[0_8px_30px_rgba(0,0,0,0.6)] mb-4">
            {slide.title} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-500">
              {slide.highlight}
            </span>
          </h1>

          {/* Sub */}
          <p className="text-white/60 text-sm font-bold uppercase tracking-[0.3em] mb-10 drop-shadow-lg">
            {slide.sub}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            {slide.cta1.to.startsWith('#') ? (
              <button
                onClick={() => {
                  document.getElementById(slide.cta1.to.substring(1))?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="group flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-white px-9 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 shadow-2xl shadow-emerald-500/30 active:scale-95"
              >
                <Play size={16} className="fill-white" />
                {slide.cta1.label}
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <Link
                to={slide.cta1.to}
                className="group flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-white px-9 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 shadow-2xl shadow-emerald-500/30 active:scale-95"
              >
                <Play size={16} className="fill-white" />
                {slide.cta1.label}
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            )}

            {slide.cta2.to.startsWith('#') ? (
              <button
                onClick={() => {
                  document.getElementById(slide.cta2.to.substring(1))?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex items-center gap-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-9 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 backdrop-blur-md active:scale-95"
              >
                <Eye size={16} />
                {slide.cta2.label}
              </button>
            ) : (
              <Link
                to={slide.cta2.to}
                className="flex items-center gap-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-9 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 backdrop-blur-md active:scale-95"
              >
                <Eye size={16} />
                {slide.cta2.label}
              </Link>
            )}
          </div>

          {/* Slide dots */}
          <div className="flex justify-center items-center gap-3">
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setHeroIdx(i)}
                className={`transition-all duration-500 rounded-full ${i === heroIdx ? 'w-10 h-2.5 bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.7)]' : 'w-2.5 h-2.5 bg-white/25 hover:bg-white/50'}`}
              />
            ))}
          </div>
        </div>

        {/* Prev / Next arrows */}
        <button
          onClick={() => setHeroIdx(p => (p - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
          className="absolute left-6 top-1/2 -translate-y-1/2 z-20 p-3 bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-2xl backdrop-blur-md transition-all hidden md:flex"
        >
          <ChevronLeft size={22} />
        </button>
        <button
          onClick={() => setHeroIdx(p => (p + 1) % HERO_SLIDES.length)}
          className="absolute right-6 top-1/2 -translate-y-1/2 z-20 p-3 bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-2xl backdrop-blur-md transition-all hidden md:flex"
        >
          <ChevronRight size={22} />
        </button>

        {/* Bottom fade */}
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-white via-white/50 to-transparent z-10" />
      </section>

      {/* ═══════════════════════════════
          QUICK STATS BAR
      ════════════════════════════════ */}
      <section className="relative z-20 -mt-10 mx-4 md:mx-auto max-w-5xl">
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-black/5 p-6 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {QUICK_STATS.map((s, i) => (
            <div key={i} className="flex items-center gap-4 group">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/15 group-hover:bg-emerald-500 group-hover:border-emerald-500 transition-all duration-300">
                <s.icon size={20} className="text-emerald-600 group-hover:text-white transition-colors" />
              </div>
              <div>
                <p className="text-2xl font-bebas text-black tracking-wider leading-none">{s.value}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 space-y-24">

        {/* ═══════════════════════════════
            LIVE MATCHES
        ════════════════════════════════ */}
        <section>
          {/* Section header */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center border border-rose-500/20">
                <Activity size={24} className="text-rose-500 animate-pulse" />
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-bebas uppercase tracking-[0.15em] text-black leading-none">Live Arena</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1.5">Real-time · Ball by ball</p>
              </div>
            </div>
            <Link to="/dashboard" className="hidden md:flex items-center gap-2 text-emerald-600 font-black text-xs uppercase tracking-widest hover:gap-3 transition-all">
              All Matches <ArrowRight size={14} />
            </Link>
          </div>

          {/* Cards */}
          {displayMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {displayMatches.slice(0, 2).map(match => {
                const isLive = match.status === 'In Progress';
                const isCompleted = match.status === 'Completed';
                const ld = match.live_data || {};
                const battingTeam = ld.batting_team || ld.battingTeam || 'A';
                const teamAName = match.team_a?.team_id?.name || match.quick_teams?.team_a?.name || 'Team A';
                const teamBName = match.team_b?.team_id?.name || match.quick_teams?.team_b?.name || 'Team B';
                const scoreA = isLive && battingTeam === 'A' ? (ld.runs ?? match.team_a?.score ?? 0) : (match.team_a?.score ?? 0);
                const wickA = isLive && battingTeam === 'A' ? (ld.wickets ?? match.team_a?.wickets ?? 0) : (match.team_a?.wickets ?? 0);
                const scoreB = isLive && battingTeam === 'B' ? (ld.runs ?? match.team_b?.score ?? 0) : (match.team_b?.score ?? 0);
                const wickB = isLive && battingTeam === 'B' ? (ld.wickets ?? match.team_b?.wickets ?? 0) : (match.team_b?.wickets ?? 0);
                const overs = ld.overNum !== undefined ? `${ld.overNum}.${ld.ballInOver}` : fmtOvers(ld.overs);
                const crr = ld.run_rate || (ld.runs && ld.overs ? (ld.runs / parseFloat(ld.overs)).toFixed(2) : null);

                return (
                  <TiltCard key={match._id} className="group">
                    <Link to={`/live/${match._id}`} className="match-card block p-7">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <p className="text-[9px] font-black text-emerald-600/60 uppercase tracking-[0.3em]">{match.format || 'T20'} · {match.venue || 'Miyapur Arena'}</p>
                          <p className="text-sm font-black text-black mt-1 leading-tight truncate max-w-[160px]">{match.title || `${teamAName} vs ${teamBName}`}</p>
                        </div>
                        {isLive ? (
                          <span className="badge-live flex items-center gap-1.5">
                            <span className="live-dot flex-shrink-0" style={{width:6,height:6}} /> LIVE
                          </span>
                        ) : isCompleted ? (
                          <span className="badge-completed">FINAL</span>
                        ) : (
                          <span className="badge-upcoming">SOON</span>
                        )}
                      </div>

                      {/* Score */}
                      <div className="space-y-3 mb-6">
                        {[
                          { name: teamAName, score: scoreA, wic: wickA, batting: isLive && battingTeam === 'A' },
                          { name: teamBName, score: scoreB, wic: wickB, batting: isLive && battingTeam === 'B' }
                        ].map((t, i) => (
                          <div key={i} className={`flex items-center justify-between rounded-2xl px-4 py-3 transition-all ${t.batting ? 'bg-emerald-500/8 border border-emerald-500/15' : 'bg-black/[0.02]'}`}>
                            <div className="flex items-center gap-2.5">
                              {t.batting && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
                              <span className={`font-bebas text-xl tracking-wide ${t.batting ? 'text-black' : 'text-slate-400'}`}>{t.name}</span>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                              <span className={`text-3xl font-bebas tracking-tight ${t.batting ? 'text-emerald-600 text-score' : 'text-slate-300'}`}>{t.score}</span>
                              <span className="text-base font-bebas text-slate-300">/{t.wic}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Live info row */}
                      {isLive && (
                        <div className="bg-black/[0.03] rounded-2xl px-4 py-3 grid grid-cols-3 gap-3 mb-5 border border-black/5">
                          <div className="text-center">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Overs</p>
                            <p className="text-sm font-bebas text-black mt-0.5">{overs}</p>
                          </div>
                          <div className="text-center border-x border-black/5">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">CRR</p>
                            <p className="text-sm font-bebas text-emerald-600 mt-0.5">{crr || '--'}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Balls</p>
                            <div className="flex justify-center gap-1 mt-1 flex-wrap">
                              {(ld.last_balls || ld.recent_balls || ld.currentOverBalls || []).slice(-6).map((b, bi) => (
                                <span key={bi} className={`w-5 h-5 rounded-md text-[9px] font-bebas flex items-center justify-center ${b === 'W' ? 'bg-rose-500 text-white' : b >= 6 ? 'bg-emerald-600 text-white' : b >= 4 ? 'bg-emerald-400 text-white' : b === 0 ? 'bg-slate-100 text-slate-400' : 'bg-emerald-50 text-emerald-700'}`}>{b === 'W' ? 'W' : b}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Players row */}
                      {isLive && (ld.striker || ld.bowler) && (
                        <div className="grid grid-cols-2 gap-3 mb-5">
                          {ld.striker && (
                            <div className="bg-emerald-500/5 rounded-xl px-3 py-2 border border-emerald-500/10">
                              <p className="text-[8px] font-black text-emerald-600/60 uppercase tracking-widest">Batting</p>
                              <p className="text-xs font-black text-black truncate">{ld.striker?.name || '—'}</p>
                              <p className="text-[10px] font-bold text-emerald-600">{ld.striker?.runs ?? '—'}({ld.striker?.balls ?? '—'})</p>
                            </div>
                          )}
                          {ld.bowler && (
                            <div className="bg-rose-500/5 rounded-xl px-3 py-2 border border-rose-500/10">
                              <p className="text-[8px] font-black text-rose-500/60 uppercase tracking-widest">Bowling</p>
                              <p className="text-xs font-black text-black truncate">{ld.bowler?.name || '—'}</p>
                              <p className="text-[10px] font-bold text-rose-500">{ld.bowler?.w ?? '—'}-{ld.bowler?.r ?? '—'}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-black/5">
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                          {isCompleted ? (
                            <span className="text-emerald-600 flex items-center gap-1.5"><Trophy size={12} />{ld.result || match.result?.summary || 'Match Ended'}</span>
                          ) : isLive ? (
                            <span className="text-rose-500 flex items-center gap-1.5 animate-pulse"><Wifi size={12} />Live Broadcasting</span>
                          ) : (
                            <span className="text-amber-500 flex items-center gap-1.5"><Clock size={12} />Upcoming</span>
                          )}
                        </div>
                        <span className="text-emerald-600 font-black text-[9px] uppercase tracking-widest flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                          {isLive ? 'Watch Live' : 'Scorecard'} <ChevronRight size={12} />
                        </span>
                      </div>

                      {/* Scorecard button for completed matches */}
                      {isCompleted && (
                        <div className="mt-4 flex justify-center">
                          <span
                            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 shadow-lg shadow-emerald-500/20 active:scale-95"
                          >
                            <BookOpen size={14} /> View Full Scorecard
                          </span>
                        </div>
                      )}
                    </Link>
                  </TiltCard>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-black/5 rounded-[3rem] py-20 text-center shadow-sm">
              <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-black/5">
                <Activity size={32} className="text-slate-200" />
              </div>
              <h3 className="text-lg font-black text-black uppercase tracking-widest mb-2">No Active Matches</h3>
              <p className="text-xs text-slate-400 uppercase tracking-[0.3em] mb-8">The arena is resting — start a new match</p>
              <Link to="/dashboard" className="inline-flex items-center gap-2 bg-emerald-500 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20">
                <Play size={14} className="fill-white" /> Start Match
              </Link>
            </div>
          )}
        </section>

        {/* ═══════════════════════════════
            TURF SLOTS
        ════════════════════════════════ */}
        <section id="slots">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                <Calendar size={24} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-bebas uppercase tracking-[0.15em] text-black leading-none">Arena Registry</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1.5">Pick your slot · Lock your game</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 text-slate-400 text-xs font-black uppercase tracking-widest">
              From <span className="text-black text-xl font-bebas">₹{settings.PRICE_DAY}</span>/hr
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Date picker */}
            <div className="lg:col-span-3 flex lg:flex-col gap-3 overflow-x-auto lg:overflow-visible pb-3 lg:pb-0 no-scrollbar">
              {dates.map(d => (
                <button
                  key={d.dateStr}
                  onClick={() => setSelectedDate(d.dateStr)}
                  className={`flex-shrink-0 px-6 py-5 rounded-[2rem] border-2 transition-all duration-400 flex flex-col items-center min-w-[100px] lg:w-full ${selectedDate === d.dateStr
                    ? 'bg-emerald-500 border-emerald-400 shadow-xl shadow-emerald-500/25 scale-105'
                    : 'bg-white border-slate-100 hover:border-emerald-200 shadow-sm'}`}
                >
                  <span className={`text-[9px] font-black uppercase tracking-[0.4em] mb-1 ${selectedDate === d.dateStr ? 'text-white/70' : 'text-slate-400'}`}>{d.label}</span>
                  <span className={`text-base font-bebas tracking-wider ${selectedDate === d.dateStr ? 'text-white' : 'text-slate-500'}`}>{d.display}</span>
                </button>
              ))}
            </div>

            {/* Slot grid */}
            <div className="lg:col-span-9">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-slate-50 rounded-[2.5rem] p-8 border border-black/5 animate-pulse">
                      <div className="w-12 h-12 bg-slate-100 rounded-2xl mb-6" />
                      <div className="h-6 bg-slate-100 rounded-xl mb-3 w-3/4" />
                      <div className="h-4 bg-slate-100 rounded-xl w-1/2" />
                    </div>
                  ))
                ) : slots.length === 0 ? (
                  <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border border-black/5">
                    <Calendar size={40} className="text-slate-200 mx-auto mb-4" />
                    <p className="text-sm font-black text-slate-300 uppercase tracking-widest">No Slots Available</p>
                  </div>
                ) : slots.sort((a, b) => a.startTime.localeCompare(b.startTime)).map(slot => (
                  <TiltCard key={slot._id} className="group">
                    <div 
                      onClick={() => {
                        if (slot.status === 'free') {
                          navigate(`/book/${slot._id}`);
                        }
                      }}
                      className={`rounded-[2.5rem] border-2 transition-all duration-400 flex flex-col h-full relative overflow-hidden ${slot.status === 'free'
                        ? 'bg-white border-slate-100 hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-500/10 cursor-pointer'
                        : 'bg-slate-50 border-slate-100 opacity-55'}`}
                    >
                      <div className="p-7 flex flex-col flex-1">
                        {/* Status badge + icon */}
                        <div className="flex justify-between items-start mb-7">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${slot.status === 'free'
                            ? 'bg-emerald-50/10 border-emerald-50/20 text-emerald-600'
                            : 'bg-rose-50/10 border-rose-50/20 text-rose-400'}`}>
                            <Timer size={20} />
                          </div>
                          <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border ${slot.status === 'free' ? 'slot-available' : 'slot-booked'}`}>
                            {slot.status === 'free' ? '● Available' : '● Reserved'}
                          </span>
                        </div>

                        {/* Time */}
                        <div className="mb-7">
                          <p className="text-4xl font-bebas text-black tracking-widest leading-none">{fmt12h(slot.startTime)}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">→ {fmt12h(slot.endTime)}</p>
                        </div>

                        {/* Features */}
                        <div className="flex gap-2 mb-7 flex-wrap">
                          {['LED Lights', 'Parking', 'Cafeteria'].map(f => (
                            <span key={f} className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded-lg border border-black/5">{f}</span>
                          ))}
                        </div>

                        {/* Price + CTA */}
                        <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
                          <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Price</p>
                            <p className="text-2xl font-bebas text-black tracking-tight">₹{slot.price}</p>
                          </div>
                          {slot.status === 'free' ? (
                            <Link
                              to={`/book/${slot._id}`}
                              className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 active:scale-95 text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Book Now
                            </Link>
                          ) : (
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest border border-black/5 px-5 py-2.5 rounded-xl">
                              Booked
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TiltCard>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════
            UPCOMING TOURNAMENTS
        ════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
                <Trophy size={24} className="text-amber-500" />
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-bebas uppercase tracking-[0.15em] text-black leading-none">Tournaments</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1.5">Compete · Win · Earn glory</p>
              </div>
            </div>
            <Link to="/tournaments" className="hidden md:flex items-center gap-2 text-emerald-600 font-black text-xs uppercase tracking-widest hover:gap-3 transition-all">
              View All <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MOCK_TOURNAMENTS.map((t, i) => (
              <TiltCard key={t._id} className="group">
                <div className="tournament-card overflow-hidden">
                  {/* Banner image */}
                  <div className="relative h-40 overflow-hidden">
                    <img src={t.banner} alt={t.name} className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 brightness-50" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a1a0a] via-transparent to-transparent" />
                    <div className="absolute top-4 left-4">
                      <span className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${t.status === 'Registrations Open' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                        {t.status}
                      </span>
                    </div>
                    <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-xl">
                      <p className="text-[9px] font-black text-amber-400 uppercase tracking-wider">{t.format}</p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-6 space-y-4">
                    <h3 className="text-white font-black text-lg leading-tight">{t.name}</h3>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
                        <Trophy size={14} className="text-amber-400 mx-auto mb-1" />
                        <p className="text-[8px] font-black text-white/30 uppercase tracking-wider">Prize</p>
                        <p className="text-sm font-bebas text-amber-400 mt-0.5">{t.prize}</p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
                        <Users size={14} className="text-emerald-400 mx-auto mb-1" />
                        <p className="text-[8px] font-black text-white/30 uppercase tracking-wider">Teams</p>
                        <p className="text-sm font-bebas text-white mt-0.5">{t.teams}</p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
                        <Calendar size={14} className="text-emerald-400 mx-auto mb-1" />
                        <p className="text-[8px] font-black text-white/30 uppercase tracking-wider">Starts</p>
                        <p className="text-xs font-black text-white mt-0.5">{new Date(t.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                      </div>
                    </div>

                    <Link
                      to="/tournaments"
                      className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${t.status === 'Registrations Open'
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                        : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'}`}
                    >
                      {t.status === 'Registrations Open' ? <><Shield size={12} /> Register Now</> : <><Clock size={12} /> Notify Me</>}
                    </Link>
                  </div>
                </div>
              </TiltCard>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════
            WHY CHOOSE US
        ════════════════════════════════ */}
        <section className="bg-gradient-to-br from-[#070d07] via-[#0a1a0a] to-[#070d07] rounded-[4rem] p-10 md:p-20 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400/5 blur-[100px] rounded-full pointer-events-none" />

          <div className="relative z-10 text-center mb-14">
            <span className="inline-flex items-center gap-2 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 text-xs font-black uppercase tracking-[0.4em] px-5 py-2.5 rounded-full mb-6">
              <Zap size={12} className="fill-emerald-400" /> Why The Turf
            </span>
            <h2 className="text-5xl md:text-[80px] font-bebas text-white tracking-tight uppercase leading-[0.85]">
              The Ultimate<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-emerald-500">
                Cricket Experience
              </span>
            </h2>
          </div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Zap, title: 'Live Scoring', desc: 'Ball-by-ball scoring with AI commentary and real-time updates', color: 'emerald' },
              { icon: Shield, title: 'Secure Booking', desc: 'Instant confirmation, QR entry pass, and payment protection', color: 'blue' },
              { icon: BarChart2, title: 'Pro Analytics', desc: 'Win probability, momentum charts, player intelligence', color: 'purple' },
              { icon: Trophy, title: 'Tournaments', desc: 'Compete in organized leagues with live points tables', color: 'amber' }
            ].map((f, i) => (
              <div key={i} className="glass-dark rounded-[2.5rem] p-7 group hover:-translate-y-1 transition-all duration-400 stadium-glow">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 mb-6 group-hover:bg-emerald-500 group-hover:border-emerald-400 transition-all duration-300">
                  <f.icon size={22} className="text-emerald-400 group-hover:text-white transition-colors" />
                </div>
                <h4 className="text-white font-black text-lg mb-3 leading-tight">{f.title}</h4>
                <p className="text-white/40 text-xs font-bold leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════
            LOCATION CTA
        ════════════════════════════════ */}
        <section>
          <div className="bg-white border border-black/5 rounded-[3rem] p-10 md:p-14 flex flex-col md:flex-row items-center gap-10 shadow-xl">
            <div className="bg-emerald-500 p-7 rounded-[2.5rem] text-white shadow-2xl shadow-emerald-500/30 flex-shrink-0">
              <MapPin size={40} />
            </div>
            <div className="flex-1 text-center md:text-left">
              <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-[0.4em] mb-2">Find Us</p>
              <h4 className="text-2xl md:text-3xl font-black text-black tracking-tight leading-tight">Location Intelligence</h4>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px] mt-2">{settings.TURF_LOCATION}</p>
            </div>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(settings.TURF_LOCATION)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 flex items-center gap-3 bg-black text-white hover:bg-emerald-600 px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl active:scale-95"
            >
              <MapPin size={14} /> Get Directions
            </a>
          </div>
        </section>

      </div>{/* /container */}
    </div>
  );
};

export default PublicHome;
