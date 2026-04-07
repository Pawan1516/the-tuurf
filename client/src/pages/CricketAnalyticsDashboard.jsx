import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import AuthContext from '../context/AuthContext';
import {
  BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart,
  AreaChart, Area
} from 'recharts';
import { Activity, TrendingUp, Zap, Trophy, Flame, Snowflake, Clock, Calendar } from 'lucide-react';

const COLORS = ['#10b981', '#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function CricketAnalyticsDashboard() {
  const { user: currentUser } = useContext(AuthContext);
  const [viewMode, setViewMode] = useState('batting'); // 'batting' or 'bowling'
  
  // States to hold backend data
  const [playerData, setPlayerData] = useState(null);
  const [last5MatchData, setLast5MatchData] = useState([]);
  const [liveDataPoints, setLiveDataPoints] = useState([]);
  const [distributionData, setDistributionData] = useState(null);
  const [activeMatchId, setActiveMatchId] = useState(null);
  const [insights, setInsights] = useState(null);
  const [cumulativeRuns, setCumulativeRuns] = useState(0);

  // Initial Fetch Data from Backend
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

  // Real Live Match Updates
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
      return (
        <circle cx={cx} cy={cy} r={6} fill="#ef4444" stroke="none" />
      );
    }
    return <circle cx={cx} cy={cy} r={4} fill="#10b981" stroke="none" />;
  };

  const getDayName = (dayNum) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[dayNum - 1] || 'Unknown';
  };

  const formatHour = (hour) => {
    return hour >= 12 ? `${hour === 12 ? 12 : hour - 12} PM` : `${hour === 0 ? 12 : hour} AM`;
  };

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-white p-4 md:p-8 font-sans selection:bg-emerald-500 pb-20">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {!playerData ? (
            <div className="flex justify-center items-center h-96">
                <div className="w-16 h-16 border-4 border-emerald-500 border-t-white rounded-full animate-spin"></div>
            </div>
        ) : (
        <>
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-orange-500">
              Cricket Analytics Data-Hub
            </h1>
            <p className="text-slate-400 mt-2 text-sm md:text-base font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Match Intelligence & Predictive Analytics
            </p>
          </div>
          <div className="flex bg-[#131b2f] p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('batting')}
              className={`px-6 py-2 rounded-lg text-sm font-bold uppercase transition-all ${viewMode === 'batting' ? 'bg-emerald-500 text-slate-900 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'text-slate-400 hover:text-white'}`}
            >
              Batting View
            </button>
            <button
              onClick={() => setViewMode('bowling')}
              className={`px-6 py-2 rounded-lg text-sm font-bold uppercase transition-all ${viewMode === 'bowling' ? 'bg-orange-500 text-slate-900 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'text-slate-400 hover:text-white'}`}
            >
              Bowling View
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-6">
            
            {/* Live Match Tracker */}
            <div className="bg-[#131b2f] rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all duration-500"></div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Activity className="text-emerald-400" /> Live Match Progression
                  </h3>
                  <p className="text-sm text-slate-400">Cumulative runs with wicket drops (Real-time)</p>
                </div>
                <div className="bg-[#0a0f1c] px-4 py-2 rounded-lg border border-slate-700/50">
                  <span className="text-2xl font-black text-emerald-400">{cumulativeRuns}</span>
                  <span className="text-slate-500 text-sm ml-2">/ {liveDataPoints.filter(d => d.wicket).length}</span>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={liveDataPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="over" stroke="#64748b" tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" stroke="#10b981" tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="#f97316" tick={{ fill: '#f97316' }} tickLine={false} axisLine={false} domain={[0, 15]} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line yAxisId="left" type="monotone" dataKey="runs" name="Runs" stroke="#10b981" strokeWidth={3} dot={<CustomWicketDot />} activeDot={{ r: 8, fill: '#10b981', stroke: '#0a0f1c', strokeWidth: 2 }} />
                    <Line yAxisId="left" type="monotone" dataKey="predictedRuns" name="Predicted Final" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="runRate" name="Run Rate" stroke="#f97316" strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="reqRunRate" name="Req. RR" stroke="#ef4444" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#131b2f] rounded-2xl p-6 border border-slate-800 shadow-xl">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                 <Activity className="text-blue-500" /> Match Momentum
              </h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={liveDataPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                     <defs>
                        <linearGradient id="colorA" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorB" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="over" stroke="#64748b" tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }} />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
                      <Area type="monotone" dataKey="momentumA" name="Team A" stroke="#3b82f6" fillOpacity={1} fill="url(#colorA)" />
                      <Area type="monotone" dataKey="momentumB" name="Team B" stroke="#ef4444" fillOpacity={1} fill="url(#colorB)" />
                   </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#131b2f] rounded-2xl p-6 border border-slate-800 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4">Head-to-Head Stats</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={playerData.comparisonData} layout="vertical" margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                      <XAxis type="number" stroke="#64748b" tick={false} axisLine={false} />
                      <YAxis dataKey="metric" type="category" stroke="#94a3b8" tick={{ fill: '#e2e8f0', fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
                      <Tooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }} />
                      <Bar dataKey="PlayerA" fill="#10b981" radius={[0, 4, 4, 0]} barSize={12} name="Player A" />
                      <Bar dataKey="PlayerB" fill="#f97316" radius={[0, 4, 4, 0]} barSize={12} name="Player B" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#131b2f] rounded-2xl p-6 border border-slate-800 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4">Overall Performance</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={playerData.radarData}>
                      <PolarGrid stroke="#1e293b" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                      <Radar name="Player A" dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                      <Radar name="Player B" dataKey="B" stroke="#f97316" fill="#f97316" fillOpacity={0.4} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* NEW: Platform Match Activity (Date/Time Wise) */}
            <div className="bg-gradient-to-br from-[#131b2f] to-[#0a0f1c] rounded-2xl p-6 border border-slate-800 shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Calendar className="text-emerald-400" /> Match Frequency Analysis
                        </h3>
                        <p className="text-sm text-slate-400">Total matches played date and time wise</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Hourly Distribution */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-400 flex items-center gap-2 uppercase tracking-widest">
                            <Clock size={16} className="text-orange-400" /> Peak Hours (Today)
                        </h4>
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={distributionData?.hourly}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis 
                                        dataKey="_id" 
                                        tickFormatter={formatHour} 
                                        stroke="#64748b" 
                                        fontSize={10}
                                    />
                                    <YAxis stroke="#64748b" fontSize={10} />
                                    <Tooltip 
                                        labelFormatter={formatHour}
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}
                                    />
                                    <Bar dataKey="count" name="Matches" fill="#f97316" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Weekly Distribution */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-400 flex items-center gap-2 uppercase tracking-widest">
                            <Calendar size={16} className="text-blue-400" /> Weekly Intensity
                        </h4>
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={distributionData?.weekly}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis 
                                        dataKey="_id" 
                                        tickFormatter={getDayName} 
                                        stroke="#64748b" 
                                        fontSize={10}
                                    />
                                    <YAxis stroke="#64748b" fontSize={10} />
                                    <Tooltip 
                                        labelFormatter={getDayName}
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}
                                    />
                                    <Bar dataKey="count" name="Matches" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* 30 Day Trend */}
                <div className="mt-8 pt-8 border-t border-slate-800">
                    <h4 className="text-sm font-bold text-slate-400 flex items-center gap-2 uppercase tracking-widest mb-4">
                        <TrendingUp size={16} className="text-emerald-400" /> 30-Day Velocity
                    </h4>
                    <div className="h-40 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={distributionData?.daily}>
                                <defs>
                                    <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="_id" stroke="#64748b" fontSize={10} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                                <YAxis stroke="#64748b" fontSize={10} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }} />
                                <Area type="monotone" dataKey="count" name="Matches Played" stroke="#10b981" fillOpacity={1} fill="url(#colorDaily)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-b from-[#131b2f] to-[#0a0f1c] rounded-2xl p-6 border border-emerald-500/20 shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-3 bg-emerald-500/10 rounded-bl-3xl border-b border-l border-emerald-500/20">
                  <Zap className="text-emerald-400 w-5 h-5 animate-pulse" />
               </div>
              <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-wider text-sm flex items-center gap-2">
                AI Match Predictions
              </h3>
              
              <div className="space-y-4">
                <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-800 flex justify-between items-center group hover:border-emerald-500/30 transition-colors">
                  <div>
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Predicted Next Score</p>
                    <p className="text-2xl font-black text-white group-hover:text-emerald-400 transition-colors">{insights?.predictedNextScore || "---"}</p>
                  </div>
                  <TrendingUp className="text-emerald-500 opacity-50" />
                </div>
                
                <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-800 flex justify-between items-center group hover:border-blue-500/30 transition-colors">
                   <div>
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Win Probability</p>
                    <div className="flex items-end gap-2 mt-1">
                      <p className="text-3xl font-black text-blue-400">{insights?.winProbability || 0}<span className="text-lg">%</span></p>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-full border-4 border-blue-500/30 border-t-blue-500 flex items-center justify-center rotate-45 transform">
                    <span className="-rotate-45 block text-xs font-bold text-blue-400">{insights?.winProbTrend || "0%"}</span>
                  </div>
                </div>

                <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-800">
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">MVP Suggestion</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500 to-yellow-400 p-[2px]">
                       <div className="w-full h-full bg-[#0a0f1c] rounded-full flex items-center justify-center">
                          <Trophy className="w-5 h-5 text-yellow-500" />
                       </div>
                    </div>
                    <div>
                      <p className="font-bold text-white leading-tight">{insights?.mvp || "---"}</p>
                      <p className="text-xs text-orange-400">Match Winner Prop</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {viewMode === 'batting' ? (
              <div className="space-y-6">
                <div className="bg-[#131b2f] rounded-2xl p-6 border border-slate-800 shadow-xl text-center">
                  <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wide text-slate-300">Run Distribution</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={playerData.batting.boundaryPieData} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                          {playerData.batting.boundaryPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} itemStyle={{ color: '#fff' }} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-[#131b2f] rounded-2xl p-6 border border-slate-800 shadow-xl">
                  <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wide text-slate-300">Dot Ball %</h3>
                   <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={playerData.batting.dotBallData} innerRadius={0} outerRadius={70} dataKey="value" stroke="none">
                             <Cell fill="#ef4444" />
                             <Cell fill="#10b981" />
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-[#131b2f] rounded-2xl p-6 border border-slate-800 shadow-xl">
                  <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wide text-slate-300">Economy Trend</h3>
                   <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={playerData.bowling.economyTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                        <XAxis dataKey="match" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(val) => `M${val}`} />
                        <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                        <Line type="monotone" dataKey="eco" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-[#131b2f] rounded-2xl p-6 border border-slate-800 shadow-xl">
                  <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wide text-slate-300">Wickets per Match</h3>
                   <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={playerData.bowling.wicketsTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="match" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(val) => `M${val}`} />
                        <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                        <Bar dataKey="wickets" fill="#f97316" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
