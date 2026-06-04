import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import AuthContext from '../context/AuthContext';
import {
  BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart,
  AreaChart, Area
} from 'recharts';
import { 
    Activity, TrendingUp, Zap, Trophy, Flame, Snowflake, Clock, Calendar,
    Cpu, CircleDot, Maximize2, Layers, Globe, ShieldCheck, Monitor,
    Database, Loader2, Search, ArrowRight, BrainCircuit, LineChart as LineIcon,
    Target, Users, BarChart3, MapPin, Sparkles, ChevronRight, Share2, Download
} from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';

const COLORS = ['#10B981', '#f97316', '#10B981', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function CricketAnalyticsDashboard() {
  const { user: currentUser, logout } = useContext(AuthContext);
  const [viewMode, setViewMode] = useState('batting');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // States to hold backend data
  const [playerData, setPlayerData] = useState(null);
  const [last5MatchData, setLast5MatchData] = useState([]);
  const [liveDataPoints, setLiveDataPoints] = useState([]);
  const [distributionData, setDistributionData] = useState(null);
  const [activeMatchId, setActiveMatchId] = useState(null);
  const [insights, setInsights] = useState(null);
  const [cumulativeRuns, setCumulativeRuns] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!currentUser?._id) return;

    const fetchAnalytics = async () => {
      try {
        const [statsRes, last5Res, liveRes, distRes] = await Promise.all([
          axios.get(`/api/analytics/player/${currentUser._id}/stats`),
          axios.get(`/api/analytics/player/${currentUser._id}/last5`),
          axios.get(`/api/analytics/match/latest/live`),
          axios.get(`/api/analytics/matches/distribution`)
        ]);

        if (statsRes.data?.success) setPlayerData(statsRes.data);
        if (last5Res.data?.success) setLast5MatchData(last5Res.data.data);
        if (distRes.data?.success) setDistributionData(distRes.data);
        
        if (liveRes.data?.success) {
            setLiveDataPoints(liveRes.data.liveData || []);
            setInsights(liveRes.data.insights || {});
            setActiveMatchId(liveRes.data.matchId);
            if (liveRes.data.liveData?.length > 0) {
              setCumulativeRuns(liveRes.data.liveData[liveRes.data.liveData.length - 1].runs);
            }
        }
      } catch (error) {
        console.error("Failed to load analytics: ", error);
      }
    };
    fetchAnalytics();
  }, [currentUser]);

  useEffect(() => {
    const socket = io(process.env.NODE_ENV === 'production' ? 'https://the-tuurf-ufkd.onrender.com' : 'http://localhost:5001');

    if (activeMatchId) {
        socket.emit('join_match', activeMatchId);
    }

    socket.on('match:update', (data) => {
        const newPoint = {
            over: data.overs || 0,
            runs: data.score?.runs || data.runs || 0,
            wicket: (data.score?.wickets || data.wickets) > 0,
            runRate: data.run_rate || 0,
            reqRunRate: data.required_run_rate || 0,
            predictedRuns: data.scorecard?.total?.runs || 0,
            momentumA: data.momentumA || 50,
            momentumB: data.momentumB || 50
        };
        setLiveDataPoints((currentData) => [...currentData, newPoint]);
        setCumulativeRuns(newPoint.runs);
    });

    return () => socket.disconnect();
  }, [activeMatchId]);

  const CustomWicketDot = (props) => {
    const { cx, cy, payload } = props;
    if (payload.wicket) {
      return <circle cx={cx} cy={cy} r={6} fill="#ef4444" stroke="none" className="animate-pulse" />;
    }
    return <circle cx={cx} cy={cy} r={4} fill="#10B981" stroke="none" />;
  };

  const getDayName = (dayNum) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[dayNum - 1] || 'Unknown';
  };

  const formatHour = (hour) => {
    return hour >= 12 ? `${hour === 12 ? 12 : hour - 12} PM` : `${hour === 0 ? 12 : hour} AM`;
  };

  if (!playerData) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6">
        <div className="relative">
            <div className="w-24 h-24 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
            <LineIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600 animate-pulse" size={32} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Initializing Analytics Core...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex font-sans selection:bg-emerald-600/20">
      <AdminSidebar user={currentUser} logout={logout} />

      <main className="flex-1 overflow-y-auto pb-24 relative custom-scrollbar">
        {/* TOP BAR */}
        <header className="bg-white border-b border-zinc-200 sticky top-0 z-[40] px-10 py-5 flex items-center justify-between">
            <div className="flex items-center gap-8">
                <div>
                    <h1 className="text-xl font-black text-black uppercase tracking-tighter flex items-center gap-3">
                        <BarChart3 className="text-emerald-600" size={26} /> 
                        Sports Intel <span className="text-slate-400">/ Analytics Command</span>
                    </h1>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">High-Velocity Performance Matrix v9.2</p>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="hidden xl:flex items-center gap-4 bg-white border border-zinc-200 p-2 rounded-2xl">
                    <div className="px-4 py-1.5 border-r border-zinc-200">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Local Time</p>
                        <p className="text-xs font-black text-black tabular-nums italic">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                    </div>
                    <div className="px-4 py-1.5">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Data Stream</p>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-[10px] font-black text-emerald-600 uppercase">Live Feed</span>
                        </div>
                    </div>
                </div>
                <div className="flex bg-zinc-100 p-1 rounded-2xl border border-zinc-200">
                    <button
                        onClick={() => setViewMode('batting')}
                        className={`flex items-center gap-3 py-3 px-8 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-500 italic ${viewMode === 'batting' ? 'bg-white text-black shadow-2xl shadow-zinc-950/20' : 'text-slate-400 hover:text-black'}`}
                    >
                        <Zap size={14} />
                        Batting View
                    </button>
                    <button
                        onClick={() => setViewMode('bowling')}
                        className={`flex items-center gap-3 py-3 px-8 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-500 italic ${viewMode === 'bowling' ? 'bg-white text-black shadow-2xl shadow-zinc-950/20' : 'text-slate-400 hover:text-black'}`}
                    >
                        <Target size={14} />
                        Bowling View
                    </button>
                </div>
            </div>
        </header>

        <div className="max-w-[1600px] mx-auto p-10 space-y-12">
            
            {/* Live Match Registry */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-10">
                    {/* Progression Matrix */}
                    <div className="bg-white rounded-[3.5rem] p-12 border border-zinc-200 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.01] text-black pointer-events-none group-hover:scale-110 transition-all duration-1000">
                            <LineIcon size={400} />
                        </div>
                        
                        <div className="flex items-center justify-between mb-12 relative z-10 border-b border-zinc-100 pb-10">
                            <div className="flex items-center gap-6">
                                <div className="p-5 bg-emerald-600 text-black rounded-[1.5rem] shadow-xl"><Activity size={28} /></div>
                                <div>
                                    <h3 className="text-2xl font-black uppercase tracking-tighter text-black italic">Live <span className="text-emerald-600">Progression Matrix</span></h3>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5 italic">Real-time Node Acquisition Logs</p>
                                </div>
                            </div>
                            <div className="bg-white text-black px-8 py-4 rounded-[1.5rem] shadow-2xl flex items-center gap-4">
                                <div className="flex flex-col items-end">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Current Score Node</span>
                                    <span className="text-3xl font-black tabular-nums leading-none tracking-tighter">{cumulativeRuns} <span className="text-emerald-600 text-xl">/ {liveDataPoints.filter(d => d.wicket).length}</span></span>
                                </div>
                            </div>
                        </div>

                        <div className="h-[400px] w-full relative z-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={liveDataPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="progressionColor" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="over" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} tickLine={false} axisLine={false} />
                                    <YAxis yAxisId="left" stroke="#10B981" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} tickLine={false} axisLine={false} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#f97316" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} tickLine={false} axisLine={false} domain={[0, 15]} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '24px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', padding: '20px' }}
                                        labelStyle={{ color: '#0f172a', fontWeight: 900, textTransform: 'uppercase', marginBottom: '10px', fontSize: '10px', letterSpacing: '0.1em' }}
                                    />
                                    <Area yAxisId="left" type="monotone" dataKey="runs" fill="url(#progressionColor)" stroke="none" />
                                    <Line yAxisId="left" type="monotone" dataKey="runs" name="Actual Yield" stroke="#10B981" strokeWidth={4} dot={<CustomWicketDot />} activeDot={{ r: 8, fill: '#10B981', stroke: '#fff', strokeWidth: 4 }} />
                                    <Line yAxisId="left" type="monotone" dataKey="predictedRuns" name="Predicted Terminal" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="8 8" dot={false} />
                                    <Line yAxisId="right" type="monotone" dataKey="runRate" name="Acquisition RR" stroke="#f97316" strokeWidth={3} dot={false} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Momentum Hub */}
                    <div className="bg-white rounded-[3.5rem] p-12 text-black shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-[120px]"></div>
                        <div className="flex items-center justify-between mb-12 relative z-10">
                            <div className="flex items-center gap-6">
                                <div className="p-5 bg-white/5 text-emerald-500 rounded-[1.5rem] border border-white/10 backdrop-blur-xl"><Flame size={28} className="animate-pulse" /></div>
                                <div>
                                    <h3 className="text-2xl font-black uppercase tracking-tighter italic leading-none">Neural <span className="text-emerald-600">Momentum Index</span></h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 italic">Relative Acquisition Velocity Nodes</p>
                                </div>
                            </div>
                        </div>
                        <div className="h-[250px] w-full relative z-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={liveDataPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorA" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorB" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                    <XAxis dataKey="over" stroke="#ffffff20" tick={{ fill: '#ffffff40', fontSize: 10, fontWeight: 900 }} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#ffffff20" tick={{ fill: '#ffffff40', fontSize: 10, fontWeight: 900 }} tickLine={false} axisLine={false} domain={[0, 100]} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '24px' }} />
                                    <Area type="monotone" dataKey="momentumA" name="Alpha Node" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorA)" />
                                    <Area type="monotone" dataKey="momentumB" name="Beta Node" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorB)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-10">
                    {/* Predictive Intel Panel */}
                    <div className="bg-white rounded-[3.5rem] p-10 border border-zinc-200 shadow-sm space-y-10 group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-[0.01] text-black pointer-events-none group-hover:scale-110 transition-all duration-1000">
                            <BrainCircuit size={300} />
                        </div>
                        <div className="flex items-center gap-6 border-b border-zinc-100 pb-8 relative z-10">
                            <div className="p-4 bg-white text-black rounded-2xl shadow-xl transition-all group-hover:bg-emerald-600"><Zap size={24} className="animate-pulse" /></div>
                            <h3 className="text-xl font-black text-black uppercase tracking-tighter italic leading-none">Neural <span className="text-emerald-600">Forecasts</span></h3>
                        </div>

                        <div className="space-y-6 relative z-10">
                            <div className="p-8 bg-white border border-zinc-100 rounded-[2.5rem] space-y-4 hover:bg-white hover:border-emerald-600 transition-all duration-500 group/item">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic group-hover/item:text-emerald-600">Terminal Score Prediction</p>
                                    <TrendingUp size={16} className="text-emerald-600" />
                                </div>
                                <h4 className="text-5xl font-black text-black italic tabular-nums tracking-tighter">{insights?.predictedNextScore || "---"}</h4>
                            </div>

                            <div className="p-8 bg-white border border-zinc-100 rounded-[2.5rem] space-y-6 hover:bg-white hover:border-emerald-600 transition-all duration-500 group/item">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic group-hover/item:text-emerald-600">Acquisition Probability</p>
                                    <Target size={16} className="text-emerald-600" />
                                </div>
                                <div className="flex items-end justify-between">
                                    <h4 className="text-6xl font-black text-emerald-600 italic tabular-nums leading-none tracking-tighter">{insights?.winProbability || 0}<span className="text-2xl text-zinc-300 ml-1">%</span></h4>
                                    <div className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-100 uppercase italic">+{insights?.winProbTrend || "0%"} Vector</div>
                                </div>
                                <div className="h-2 w-full bg-zinc-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-600 shadow-[0_0_10px_rgba(37,99,235,0.5)] transition-all duration-1000" style={{ width: `${insights?.winProbability || 0}%` }}></div>
                                </div>
                            </div>

                            <div className="p-8 bg-white rounded-[2.5rem] flex items-center gap-8 group/mvp hover:bg-emerald-600 transition-all duration-500">
                                <div className="w-16 h-16 rounded-[1.5rem] bg-white/10 flex items-center justify-center border border-white/10 group-hover/mvp:bg-white group-hover/mvp:text-emerald-600 transition-all">
                                    <Trophy size={28} className="text-yellow-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-1 group-hover/mvp:text-black/60">Registry MVP Candidate</p>
                                    <p className="text-xl font-black text-black italic tracking-tighter uppercase">{insights?.mvp || "RECALIBRATING..."}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats Registry */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm flex flex-col justify-between h-[180px] group hover:border-emerald-600 transition-all">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic group-hover:text-emerald-600">Total Matches Played</p>
                            <p className="text-4xl font-black text-black italic tabular-nums leading-none tracking-tighter">{distributionData?.total || 0}</p>
                        </div>
                        <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm flex flex-col justify-between h-[180px] group hover:border-emerald-600 transition-all">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic group-hover:text-emerald-600">Active Registry Nodes</p>
                            <p className="text-4xl font-black text-black italic tabular-nums leading-none tracking-tighter">124+</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Distribution Registry */}
            <div className="bg-white rounded-[4rem] p-16 border border-zinc-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-16 opacity-[0.01] text-black pointer-events-none group-hover:scale-110 transition-all duration-1000">
                    <Calendar size={500} />
                </div>
                <div className="flex items-center justify-between mb-16 relative z-10 border-b border-zinc-100 pb-12">
                    <div className="flex items-center gap-8">
                        <div className="p-6 bg-white text-black rounded-[2rem] shadow-2xl transition-all group-hover:bg-emerald-600"><Globe size={32} /></div>
                        <div>
                            <h3 className="text-4xl font-black uppercase tracking-tighter text-black italic">Registry <span className="text-emerald-600">Temporal distribution</span></h3>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mt-3 italic">Global match intensity across temporal nodes</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                       <button className="p-5 bg-white text-slate-400 hover:bg-white hover:text-black rounded-[1.5rem] transition-all shadow-sm active:scale-95"><Share2 size={24} /></button>
                       <button className="p-5 bg-white text-slate-400 hover:bg-white hover:text-black rounded-[1.5rem] transition-all shadow-sm active:scale-95"><Download size={24} /></button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 relative z-10">
                    <div className="lg:col-span-8 space-y-16">
                        <div className="bg-white p-12 rounded-[3.5rem] border border-zinc-100 space-y-10 group/chart hover:bg-white hover:border-emerald-600 transition-all duration-700">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xl font-black uppercase tracking-tighter text-black italic flex items-center gap-4">
                                    <TrendingUp size={24} className="text-emerald-600" /> 30-Day Node Velocity
                                </h4>
                                <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-5 py-2 rounded-full border border-emerald-100 italic">Analysis Live</div>
                            </div>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={distributionData?.daily}>
                                        <defs>
                                            <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                                                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                        <XAxis dataKey="_id" stroke="#94a3b8" fontSize={10} fontWeight={900} tickFormatter={(val) => val.split('-').slice(1).join('/')} axisLine={false} tickLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={10} fontWeight={900} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '24px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)' }} />
                                        <Area type="monotone" dataKey="count" name="Match Acquisition" stroke="#10B981" strokeWidth={4} fillOpacity={1} fill="url(#colorDaily)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="bg-white p-12 rounded-[3.5rem] border border-zinc-100 group/dist hover:bg-white hover:border-emerald-600 transition-all duration-700">
                                <div className="flex items-center justify-between mb-8">
                                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] italic flex items-center gap-3">
                                        <Clock size={16} className="text-orange-500" /> Peak temporal nodes
                                    </h4>
                                </div>
                                <div className="h-[180px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={distributionData?.hourly}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                            <XAxis dataKey="_id" tickFormatter={formatHour} stroke="#94a3b8" fontSize={9} fontWeight={900} axisLine={false} tickLine={false} />
                                            <YAxis stroke="#94a3b8" fontSize={9} fontWeight={900} axisLine={false} tickLine={false} />
                                            <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '20px' }} />
                                            <Bar dataKey="count" name="Registry Load" fill="#f97316" radius={[6, 6, 0, 0]} barSize={24} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-white p-12 rounded-[3.5rem] border border-zinc-100 group/dist hover:bg-white hover:border-emerald-600 transition-all duration-700">
                                <div className="flex items-center justify-between mb-8">
                                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] italic flex items-center gap-3">
                                        <Calendar size={16} className="text-emerald-600" /> Weekly Intensity Matrix
                                    </h4>
                                </div>
                                <div className="h-[180px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={distributionData?.weekly}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                            <XAxis dataKey="_id" tickFormatter={getDayName} stroke="#94a3b8" fontSize={9} fontWeight={900} axisLine={false} tickLine={false} />
                                            <YAxis stroke="#94a3b8" fontSize={9} fontWeight={900} axisLine={false} tickLine={false} />
                                            <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '20px' }} />
                                            <Bar dataKey="count" name="Match Volume" fill="#10B981" radius={[6, 6, 0, 0]} barSize={24} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-4 space-y-10">
                        {/* Domain Specific Analytics */}
                        <div className="bg-white rounded-[3.5rem] p-10 border border-zinc-200 shadow-sm space-y-10 relative overflow-hidden h-full flex flex-col">
                            <div className="flex items-center gap-6 border-b border-zinc-100 pb-8">
                                <div className="p-4 bg-white text-emerald-600 rounded-2xl shadow-sm"><PieChart size={24} /></div>
                                <h3 className="text-xl font-black text-black uppercase tracking-tighter italic leading-none">{viewMode === 'batting' ? 'Batting' : 'Bowling'} <span className="text-emerald-600">Intelligence</span></h3>
                            </div>

                            <div className="flex-1 flex flex-col justify-between">
                                {viewMode === 'batting' ? (
                                    <div className="space-y-12">
                                        <div className="bg-white p-10 rounded-[3rem] border border-zinc-100 group/pie hover:bg-white hover:border-emerald-600 transition-all duration-500">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-8 italic">Yield Distribution Vector</p>
                                            <div className="h-[180px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie data={playerData.batting.boundaryPieData} innerRadius={50} outerRadius={75} paddingAngle={8} dataKey="value" stroke="none">
                                                            {playerData.batting.boundaryPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                                        </Pie>
                                                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: 'none', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                                                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '20px' }} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                        <div className="bg-white p-10 rounded-[3rem] border border-zinc-100 group/pie hover:bg-white hover:border-emerald-600 transition-all duration-500">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-8 italic">Registry Dot ball Vector</p>
                                            <div className="h-[180px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie data={playerData.batting.dotBallData} innerRadius={0} outerRadius={75} dataKey="value" stroke="none">
                                                            <Cell fill="#ef4444" />
                                                            <Cell fill="#10B981" />
                                                        </Pie>
                                                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: 'none', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                                                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '20px' }} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-12">
                                        <div className="bg-white p-10 rounded-[3rem] border border-zinc-100 group/pie hover:bg-white hover:border-emerald-600 transition-all duration-500">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-8 italic">Economy Temporal Vector</p>
                                            <div className="h-[180px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={playerData.bowling.economyTrend}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                                                        <XAxis dataKey="match" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} tickFormatter={(val) => `NODE_${val}`} axisLine={false} tickLine={false} />
                                                        <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} axisLine={false} tickLine={false} />
                                                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '20px' }} />
                                                        <Line type="monotone" dataKey="eco" stroke="#10B981" strokeWidth={4} dot={{ r: 6, fill: '#10B981', stroke: '#fff', strokeWidth: 3 }} activeDot={{ r: 8, fill: '#10B981', stroke: '#fff', strokeWidth: 4 }} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                        <div className="bg-white p-10 rounded-[3rem] border border-zinc-100 group/pie hover:bg-white hover:border-emerald-600 transition-all duration-500">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-8 italic">Wicket Acquisition Vector</p>
                                            <div className="h-[180px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={playerData.bowling.wicketsTrend}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                                        <XAxis dataKey="match" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} tickFormatter={(val) => `NODE_${val}`} axisLine={false} tickLine={false} />
                                                        <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} axisLine={false} tickLine={false} />
                                                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '20px' }} />
                                                        <Bar dataKey="wickets" fill="#f97316" radius={[6, 6, 0, 0]} barSize={24} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="mt-12 p-8 bg-white rounded-[2.5rem] flex items-center justify-between group/total">
                                   <div>
                                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Aggregated Yield</p>
                                       <p className="text-2xl font-black text-black italic tabular-nums leading-none tracking-tighter">7,420+</p>
                                   </div>
                                   <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-emerald-500 group-hover/total:bg-emerald-600 group-hover/total:text-black transition-all">
                                       <Share2 size={20} />
                                   </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}
