import React, { useState, useEffect, useContext } from 'react';
import {
  BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, AreaChart, Area, Label
} from 'recharts';
import { 
  Activity, TrendingUp, Zap, Trophy, Users, Swords, Target, 
  Search, User, ChevronRight, LayoutDashboard, Star, Flame, Award
} from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

const PlayerAnalytics = () => {
  const { user: currentUser, loading: authLoading } = useContext(AuthContext);
  const [playerData, setPlayerData] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (authLoading) return; // wait for auth to decide

    const userId = currentUser?._id || currentUser?.id;
    if (userId) {
      fetchInitialData(userId);
    } else {
      setLoading(false); // finish loading if no user
    }
  }, [currentUser, authLoading]);

  const fetchInitialData = async (userId) => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/analytics/player/${userId}/stats`);
      if (res.data?.success) {
        setPlayerData(res.data);
      }
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (val) => {
    setSearchQuery(val);
    if (val.length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await axios.get(`/api/players/search-player?q=${val}`);
      if (res.data?.success) {
        setSearchResults(res.data.players.filter(p => p._id !== currentUser?._id));
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectOpponent = async (opponent) => {
    setSelectedOpponent(opponent);
    setSearchQuery('');
    setSearchResults([]);
    setLoading(true);
    try {
      const res = await axios.get(`/api/analytics/compare?player1=${currentUser?._id}&player2=${opponent._id}`);
      if (res.data?.success) {
        setComparisonData(res.data.comparison);
      }
    } catch (error) {
      console.error("Comparison failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetComparison = () => {
    setSelectedOpponent(null);
    setComparisonData(null);
  };

  if (loading && !comparisonData) {
    return (
      <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-white rounded-full animate-spin"></div>
          <p className="text-emerald-500 font-black uppercase tracking-widest text-xs">Syncing Performance Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-white p-4 md:p-8 font-sans pb-24">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header & Search */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="animate-in fade-in slide-in-from-left duration-700">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-blue-500 to-purple-600">
              Player Intel Hub
            </h1>
            <p className="text-slate-400 mt-2 text-sm md:text-base font-bold flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></span>
              Professional Comparison & Predictive Analysis
            </p>
          </div>

          <div className="w-full lg:w-96 relative z-[100] animate-in fade-in slide-in-from-right duration-700">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={20} />
              <input 
                type="text"
                placeholder="Search Opponent (@username / mobile)"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full bg-slate-900/80 border-2 border-white/5 focus:border-emerald-500 rounded-3xl py-5 pl-14 pr-8 text-sm font-bold placeholder:text-slate-600 outline-none transition-all backdrop-blur-3xl"
              />
              {isSearching && (
                <div className="absolute right-5 top-1/2 -translate-y-1/2">
                   <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-slate-900 border border-white/5 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-3xl">
                {searchResults.map(p => (
                  <button 
                    key={p._id}
                    onClick={() => selectOpponent(p)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-emerald-500/10 transition-colors border-b border-white/5 last:border-0"
                  >
                    <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center font-black text-emerald-500">
                      {p.name.charAt(0)}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black uppercase text-white">{p.name}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">@{p.username || 'unknown'}</p>
                    </div>
                    <ChevronRight size={14} className="ml-auto text-slate-700" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        {!comparisonData ? (
          /* Default Individual View (Existing Logic) */
          <div className="space-y-12 animate-in fade-in duration-1000">
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[2.5rem] p-8 text-center">
                 <Users size={48} className="mx-auto mb-4 text-emerald-500/30" />
                 <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Initialize Duel</h2>
                 <p className="text-slate-400 text-sm max-w-md mx-auto">Use the search bar above to select an opponent and generate a high-fidelity comparison matrix of your cricket stats.</p>
              </div>
              {/* Existing Graphs Rendered here as fallback or below ... */}
          </div>
        ) : (
          /* Comparison View (New Logic) */
          <div className="space-y-12 animate-in zoom-in-95 duration-500">
            
            {/* Player Cards DUEL View */}
            <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6">
              {/* Player 1 */}
              <div className="bg-slate-900/50 rounded-[3rem] p-8 border-2 border-emerald-500/20 shadow-2xl relative overflow-hidden group">
                 <div className="absolute -top-10 -left-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl"></div>
                 <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-24 h-24 bg-emerald-500/20 rounded-[2rem] border-4 border-emerald-500/30 overflow-hidden flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                       {comparisonData.player1.image ? (
                          <img src={comparisonData.player1.image} alt={comparisonData.player1.name} className="w-full h-full object-cover" />
                       ) : (
                          <User size={48} className="text-emerald-500" />
                       )}
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter">{comparisonData.player1.name}</h3>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mt-1">{comparisonData.player1.role}</p>
                    <div className="mt-4 flex items-center justify-center gap-3">
                        <div className="px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                            <Zap size={10} className="text-yellow-400 fill-yellow-400" />
                            <span className="text-[10px] font-black text-emerald-400">4s: {playerData?.batting?.fours || 0}</span>
                        </div>
                        <div className="px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                            <Zap size={10} className="text-emerald-400 fill-emerald-400" />
                            <span className="text-[10px] font-black text-emerald-400">6s: {playerData?.batting?.sixes || 0}</span>
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20">
                       <p className="text-[10px] font-bold text-emerald-400 font-mono tracking-widest">{comparisonData.player1.phone}</p>
                    </div>
                 </div>
              </div>

              {/* VS Animation */}
              <div className="flex flex-col items-center justify-center gap-4">
                 <div className="w-20 h-20 bg-gradient-to-tr from-emerald-500 to-blue-500 rounded-full flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-white/20 rounded-full animate-ping"></div>
                    <span className="text-3xl font-black italic tracking-tighter text-slate-900 relative z-10">VS</span>
                 </div>
                 <button 
                  onClick={resetComparison}
                  className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors"
                 >
                    Clear Comparison
                 </button>
              </div>

              {/* Player 2 */}
              <div className="bg-slate-900/50 rounded-[3rem] p-8 border-2 border-blue-500/20 shadow-2xl relative overflow-hidden group">
                 <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
                 <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-24 h-24 bg-blue-500/20 rounded-[2rem] border-4 border-blue-500/30 overflow-hidden flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                      {comparisonData.player2.image ? (
                           <img src={comparisonData.player2.image} alt={comparisonData.player2.name} className="w-full h-full object-cover" />
                        ) : (
                           <User size={48} className="text-blue-500" />
                        )}
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter">{comparisonData.player2.name}</h3>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mt-1">{comparisonData.player2.role}</p>
                    <div className="mt-4 flex items-center justify-center gap-3">
                        <div className="px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20 flex items-center gap-1.5">
                            <Zap size={10} className="text-yellow-400 fill-yellow-400" />
                            <span className="text-[10px] font-black text-blue-400">4s: {selectedOpponent?.stats?.batting?.fours || 0}</span>
                        </div>
                        <div className="px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20 flex items-center gap-1.5">
                            <Zap size={10} className="text-blue-400 fill-blue-400" />
                            <span className="text-[10px] font-black text-blue-400">6s: {selectedOpponent?.stats?.batting?.sixes || 0}</span>
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 bg-blue-500/10 px-4 py-1.5 rounded-full border border-blue-500/20">
                       <p className="text-[10px] font-bold text-blue-400 font-mono tracking-widest">{comparisonData.player2.phone}</p>
                    </div>
                 </div>
              </div>
            </div>

            {/* BAR CHART SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="bg-[#131b2f] rounded-[2.5rem] p-8 border border-white/5 shadow-2xl relative">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-10 flex items-center gap-2">
                     <Target className="text-emerald-500" size={16} /> Attribute Comparison
                  </h3>
                  <div className="h-80">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comparisonData.stats} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                           <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                           <XAxis dataKey="metric" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: '900' }} axisLine={false} tickLine={false} />
                           <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                           <Tooltip 
                              cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '20px', padding: '16px' }}
                           />
                           <Legend iconType="circle" />
                           <Bar dataKey="p1" name={comparisonData.player1.name} fill="#10b981" radius={[8, 8, 0, 0]} />
                           <Bar dataKey="p2" name={comparisonData.player2.name} fill="#3b82f6" radius={[8, 8, 0, 0]} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>

               {/* RADAR CHART SECTION */}
               <div className="bg-[#131b2f] rounded-[2.5rem] p-8 border border-white/5 shadow-2xl">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-10 flex items-center gap-2">
                     <Activity className="text-blue-500" size={16} /> Skill Matrix Coverage
                  </h3>
                  <div className="h-80">
                     <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={comparisonData.radarData}>
                           <PolarGrid stroke="#1e293b" />
                           <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: '900' }} />
                           <PolarRadiusAxis angle={30} domain={[0, 150]} stroke="#1e293b" tick={false} />
                           <Radar name={comparisonData.player1.name} dataKey="p1" stroke="#10b981" fill="#10b981" fillOpacity={0.5} />
                           <Radar name={comparisonData.player2.name} dataKey="p2" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                           <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '20px' }} />
                           <Legend iconType="circle" />
                        </RadarChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </div>

            {/* SMART INSIGHTS SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               <div className="bg-slate-900/30 p-6 rounded-[2rem] border border-white/5 flex flex-col items-center text-center">
                  <Zap className="text-emerald-500 mb-3" size={24} />
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Better Striker</p>
                  <p className="font-black text-white uppercase">{comparisonData.insights.betterStriker}</p>
               </div>
               <div className="bg-slate-900/30 p-6 rounded-[2rem] border border-white/5 flex flex-col items-center text-center">
                  <Flame className="text-blue-500 mb-3" size={24} />
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Best Bowler</p>
                  <p className="font-black text-white uppercase">{comparisonData.insights.bestBowler}</p>
               </div>
               <div className="bg-slate-900/30 p-6 rounded-[2rem] border border-white/5 flex flex-col items-center text-center">
                  <Award className="text-purple-500 mb-3" size={24} />
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">All-Rounder Potential</p>
                  <p className="font-black text-white uppercase">{comparisonData.insights.isAllRounder1 ? 'Confirmed' : 'Unverified'}</p>
               </div>
               <div className="bg-slate-900/30 p-6 rounded-[2rem] border border-white/5 flex flex-col items-center text-center">
                  <Star className="text-amber-500 mb-3" size={24} />
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Duel Dominance</p>
                  <p className="font-black text-white uppercase">High Performance</p>
               </div>
            </div>

          </div>
        )}

        {/* Individual Statistics (Only show if not comparing) */}
        {!comparisonData && playerData && (
          <div className="space-y-12">
            <div className="flex items-center gap-4">
               <div className="h-px flex-1 bg-white/5"></div>
               <h2 className="text-xs font-black text-slate-600 uppercase tracking-[0.5em]">Global Career Registries</h2>
               <div className="h-px flex-1 bg-white/5"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* 1. Last 5 Matches (Batting) */}
               <div className="bg-[#131b2f] rounded-[2.5rem] p-8 border border-white/5 shadow-2xl overflow-hidden group">
                  <div className="flex justify-between items-center mb-8">
                     <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <TrendingUp className="text-emerald-500" size={16} /> Recent Batting Form
                     </h3>
                     <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full uppercase">Last 5</span>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={(playerData?.batting?.strikeRateProgression || []).map((d) => ({ match: d.date || 'Recent', runs: d.runs || 0 }))}>
                        <defs>
                          <linearGradient id="colorBat" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="match" stroke="#64748b" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: '900' }} />
                        <YAxis stroke="#64748b" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px' }} />
                        <Area type="monotone" dataKey="runs" name="Runs" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorBat)" connectNulls={true} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
               </div>

               {/* 2. Last 5 Matches (Bowling) */}
               <div className="bg-[#131b2f] rounded-[2.5rem] p-8 border border-white/5 shadow-2xl overflow-hidden">
                  <div className="flex justify-between items-center mb-8">
                     <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Activity className="text-blue-500" size={16} /> Recent Bowling Force
                     </h3>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={(playerData?.bowling?.wicketsTrend || []).map((d, i) => ({ 
                          match: d.date || `M${i+1}`, 
                          wickets: d.wickets, 
                          economy: playerData?.bowling?.economyTrend?.[i]?.eco || 0
                        }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="match" stroke="#64748b" axisLine={false} tickLine={false} />
                        <YAxis yAxisId="left" stroke="#3b82f6" orientation="left" axisLine={false} tickLine={false} />
                        <YAxis yAxisId="right" stroke="#f59e0b" orientation="right" axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px' }} />
                        <Line yAxisId="left" type="monotone" dataKey="wickets" name="Wickets" stroke="#3b82f6" strokeWidth={4} dot={{ r: 6 }} />
                        <Line yAxisId="right" type="monotone" dataKey="economy" name="Economy" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {/* Strike Rate Progression */}
               <div className="bg-[#131b2f] rounded-[2.5rem] p-8 border border-white/5 shadow-2xl md:col-span-2">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-10">Strike Rate Progression Profile</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={playerData?.batting?.strikeRateProgression}>
                        <defs>
                          <linearGradient id="colorSr" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="match" stroke="#64748b" axisLine={false} tickLine={false} />
                        <YAxis stroke="#64748b" axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px' }} />
                        <Area type="monotone" dataKey="sr" name="S/R" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorSr)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
               </div>

               {/* Distributions */}
               <div className="space-y-8">
                  <div className="bg-[#131b2f] rounded-[2.5rem] p-6 border border-white/5 shadow-2xl text-center">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Boundary Distribution</p>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={playerData?.batting?.boundaryPieData} 
                            innerRadius={45} 
                            outerRadius={60} 
                            paddingAngle={5} 
                            dataKey="value"
                            stroke="none"
                          >
                            {playerData?.batting?.boundaryPieData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-[#131b2f] rounded-[2.5rem] p-6 border border-white/5 shadow-2xl text-center">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Dot Ball Index</p>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={playerData?.batting?.dotBallData} 
                            innerRadius={45} 
                            outerRadius={60} 
                            paddingAngle={5} 
                            dataKey="value"
                            stroke="none"
                          >
                            <Cell fill="#ef4444" />
                            <Cell fill="#10b981" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        )}

      </div>
      
      {/* Navigation Shortcuts */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
         <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-full px-8 py-4 flex items-center gap-8 shadow-2xl">
            <Link to="/dashboard" className="text-slate-400 hover:text-emerald-500 transition-colors flex items-center gap-2">
               <LayoutDashboard size={18} />
               <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">Dashboard</span>
            </Link>
         </div>
      </div>

    </div>
  );
};

// Internal standard Recharts Label usage is within the components above.
export default PlayerAnalytics;
