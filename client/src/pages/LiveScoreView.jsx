import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { 
    Trophy, Users, Timer, Info, Share2, Activity, BarChart3, ChevronLeft, 
    Volume2, Zap, Target, TrendingUp, PieChart as PieIcon, LineChart as LineIcon 
} from 'lucide-react';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, ComposedChart, AreaChart, Area, Scatter, ReferenceLine,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

const SOCKET_URL = process.env.NODE_ENV === 'production' 
    ? 'https://the-tuurf-ufkd.onrender.com' 
    : 'http://localhost:5001';

export default function LiveScoreView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [match, setMatch] = useState(null);
    const [liveData, setLiveData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('commentary'); // commentary, scorecard, overs, analytics
    const [prediction, setPrediction] = useState(null);
    const [newBallFlash, setNewBallFlash] = useState(false);
    const [chartData, setChartData] = useState([]);
    const [overAnalytics, setOverAnalytics] = useState([]);
    const [matchAnalytics, setMatchAnalytics] = useState({ boundaries: [], dotRatios: [] });
    const socketRef = useRef(null);

    useEffect(() => {
        const fetchMatch = async () => {
            try {
                const res = await apiClient.get(`/matches/${id}?t=${new Date().getTime()}`);
                const matchData = res.data.match || res.data; 
                setMatch(matchData);
                setLiveData(matchData.live_data || {});
                
                const pointsMap = new Map();
                // Initialize start
                pointsMap.set(0, { ballIndex: 0, over: 0, runs_inn1: 0, runs_inn2: 0, momentumA: 50, momentumB: 50 });

                if (matchData.innings) {
                    matchData.innings.forEach((inn, idx) => {
                        const runKey = idx === 0 ? 'runs_inn1' : 'runs_inn2';
                        const wicketKey = idx === 0 ? 'wicket_inn1' : 'wicket_inn2';
                        const momKey = idx === 0 ? 'momentumA' : 'momentumB';
                        let cumulativeRuns = 0;
                        
                        const totalBalls = inn.balls ? inn.balls.length : 0;
                        
                        (inn.balls || []).forEach((ball, bIdx) => {
                             const ballTotal = (ball.runs_off_bat || 0) + (ball.extra_runs || 0);
                             cumulativeRuns += ballTotal;
                             
                             const ballIndex = bIdx + 1;
                             const existing = pointsMap.get(ballIndex) || { ballIndex, over: parseFloat(ball.over + '.' + ball.ball) || (ballIndex/6).toFixed(1) };
                             
                             const ballMom = ballTotal >= 4 ? 80 : (ballTotal === 0 ? 30 : 50);

                             pointsMap.set(ballIndex, { 
                                 ...existing, 
                                 [runKey]: cumulativeRuns, 
                                 [wicketKey]: ball.is_wicket,
                                 [momKey]: ballMom
                             });
                        });
                    });
                }

                const sorted = Array.from(pointsMap.values()).sort((a,b) => a.ballIndex - b.ballIndex);
                setChartData(sorted);

                // Aggregating for Momentum Chart (Over by Over)
                const overSummaries = [];
                for (let i = 0; i <= (matchData.overs || 10); i++) {
                    const ballsInOver1 = (matchData.innings?.[0]?.balls || []).filter(b => b.over_number === i);
                    const ballsInOver2 = (matchData.innings?.[1]?.balls || []).filter(b => b.over_number === i);
                    
                    const runs1 = ballsInOver1.reduce((s, b) => s + (b.runs_off_bat || 0) + (b.extra_runs || 0), 0);
                    const runs2 = ballsInOver2.reduce((s, b) => s + (b.runs_off_bat || 0) + (b.extra_runs || 0), 0);
                    
                    if (ballsInOver1.length > 0 || ballsInOver2.length > 0) {
                        overSummaries.push({
                            over: i + 1,
                            [teamAName]: runs1,
                            [teamBName]: runs2,
                            diff: runs1 - runs2
                        });
                    }
                }
                setOverAnalytics(overSummaries);

                // Aggregating for Live Match Batting Analytics
                const allBalls = [...(matchData.innings?.[0]?.balls || []), ...(matchData.innings?.[1]?.balls || [])];
                const dots = allBalls.filter(b => (b.runs_off_bat === 0 && !b.extra_runs)).length;
                const fours = allBalls.filter(b => b.runs_off_bat === 4).length;
                const sixes = allBalls.filter(b => b.runs_off_bat === 6).length;
                const others = allBalls.length - dots - fours - sixes;

                setMatchAnalytics({
                    boundaries: [
                        { name: '4s', value: fours, fill: '#10b981' },
                        { name: '6s', value: sixes, fill: '#3b82f6' },
                        { name: 'Others', value: others, fill: '#94a3b8' }
                    ],
                    dotRatios: [
                        { name: 'Dots', value: dots, fill: '#ef4444' },
                        { name: 'Scored', value: allBalls.length - dots, fill: '#10b981' }
                    ]
                });
            } catch (err) {
                setError("Match information unavailable.");
            } finally {
                setLoading(false);
            }
        };

        const fetchPrediction = async () => {
            if (match && (match.status === 'Completed')) return;
            try {
                const res = await apiClient.get(`/matches/${id}/prediction`);
                if (res.data.success) {
                    setPrediction(res.data.prediction);
                }
            } catch (err) {
                console.error("Insight fetch failed");
            }
        };

        fetchMatch();
        setTimeout(fetchPrediction, 2000);

        const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('join_match', id);
        });

        socket.on('match:update', (data) => {
            setLiveData(prev => ({ ...prev, ...data }));
            setNewBallFlash(true);
            setTimeout(() => setNewBallFlash(false), 800);
            
            const overNum = parseFloat(data.overs) || 0;
            const currentInnings = data.inningsNum || 1;

            if (data.graphPoint) {
                setChartData(prev => {
                    const inningIdx = data.graphPoint.inning || 1;
                    const runKey = inningIdx === 1 ? 'runs_inn1' : 'runs_inn2';
                    const wicketKey = inningIdx === 1 ? 'wicket_inn1' : 'wicket_inn2';
                    
                    const exists = prev.find(p => p.over === data.graphPoint.over);

                    if (exists) {
                        // REPLACE: Single Source of Truth from Backend
                        return prev.map(p =>
                            p.over === data.graphPoint.over 
                                ? { ...p, [runKey]: data.graphPoint.runs, [wicketKey]: data.graphPoint.wickets > 0 } 
                                : p
                        );
                    }

                    // ADD: Prevent duplicate and sort
                    const newPoint = {
                        over: data.graphPoint.over,
                        inning: inningIdx,
                        [runKey]: data.graphPoint.runs,
                        [wicketKey]: data.graphPoint.wickets > 0,
                        momentumA: data.momentumA || (prev.length > 0 ? prev[prev.length - 1].momentumA : 50),
                        momentumB: data.momentumB || (prev.length > 0 ? prev[prev.length - 1].momentumB : 50)
                    };
                    
                    return [...prev, newPoint].sort((a,b) => a.over - b.over);
                });
            } else {
                setChartData(prev => {
                    const overNum = data.score?.overs || data.overs || 0;
                    const runs = data.score?.runs || data.runs || 0;
                    const exists = prev.find(p => p.over === parseFloat(overNum));

                    if (exists) {
                        return prev.map(p =>
                            p.over === parseFloat(overNum) 
                                ? { 
                                    ...p, 
                                    [currentInnings === 1 ? 'runs_inn1' : 'runs_inn2']: runs,
                                    [currentInnings === 1 ? 'wicket_inn1' : 'wicket_inn2']: (data.score?.wickets || data.wickets) > 0
                                } 
                                : p
                        );
                    } else {
                        const newPoint = {
                            ballIndex: prev.length + 1,
                            over: parseFloat(overNum),
                            [currentInnings === 1 ? 'runs_inn1' : 'runs_inn2']: runs,
                            [currentInnings === 1 ? 'wicket_inn1' : 'wicket_inn2']: (data.score?.wickets || data.wickets) > 0,
                            momentumA: 50,
                            momentumB: 50
                        };
                        return [...prev, newPoint];
                    }
                });
            }

            if (Math.random() > 0.8) fetchPrediction();
        });

        const pollTimer = setInterval(fetchMatch, 10000);
        return () => {
            if (socketRef.current) socketRef.current.disconnect();
            clearInterval(pollTimer);
        };
    }, [id, match?.status]);

    if (loading) return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-6"></div>
            <p className="text-emerald-700 font-bold uppercase tracking-widest text-[10px]">Broadcasting Live...</p>
        </div>
    );

    if (error && !match) return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex flex-col items-center justify-center p-6 text-center">
             <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                <Activity size={40} className="text-emerald-600" />
             </div>
             <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Broadcast Synchronizing</h2>
             <p className="text-slate-500 text-xs font-bold mt-2 uppercase tracking-widest">Attempting to re-establish high-fidelity link...</p>
             <Link to="/" className="mt-8 text-emerald-600 font-black uppercase text-[10px] tracking-widest px-8 py-3 bg-white border border-emerald-100 rounded-full shadow-lg">Back to Hub</Link>
        </div>
    );

    const isCompleted = match.status === 'Completed';
    const activeInningData = match.innings?.length ? match.innings[match.innings.length - 1] : null;
    const finalScoreSource = match.live_active_team === 'B' ? match.team_b : match.team_a; 

    const currentScore = {
        runs: liveData?.runs ?? liveData?.scorecard?.total?.runs ?? (isCompleted ? finalScoreSource?.score : activeInningData?.score) ?? 0,
        wickets: liveData?.wickets ?? liveData?.scorecard?.total?.wickets ?? (isCompleted ? finalScoreSource?.wickets : activeInningData?.wickets) ?? 0,
        overs: liveData?.overNum !== undefined && liveData?.ballInOver !== undefined
            ? `${liveData.overNum}.${liveData.ballInOver}`
            : (typeof liveData?.overs === 'number' 
                ? Math.floor(liveData.overs) + '.' + Math.round((liveData.overs % 1) * 6) 
                : (liveData?.overs ?? liveData?.scorecard?.total?.overs ?? activeInningData?.overs_completed ?? '0.0'))
    };

    const parseTitleA = match.title?.includes('vs') ? match.title.split('vs')[0].trim() : null;
    const parseTitleB = match.title?.includes('vs') ? match.title.split('vs')[1].replace('— Quick Match', '').replace('- Quick Match', '').trim() : null;

    const teamAName = match.team_a?.team_id?.name || match.quick_teams?.team_a?.name || parseTitleA || 'Team A';
    const teamBName = match.team_b?.team_id?.name || match.quick_teams?.team_b?.name || parseTitleB || 'Team B';
    const teamAColor = match.quick_teams?.team_a?.colour || '#3b82f6';
    const teamBColor = match.quick_teams?.team_b?.colour || '#ef4444';

    const Inn1WicketDot = (props) => {
        const { cx, cy, payload, index } = props;
        // End point marker
        if (index === chartData.length - 1 || (chartData[index+1] && chartData[index+1].runs_inn1 === undefined)) {
            return (
                <g>
                    <circle cx={cx} cy={cy} r={6} fill="#fff" stroke={teamAColor} strokeWidth={3} />
                    <text x={cx + 15} y={cy + 5} fill={teamAColor} fontSize={12} fontWeight="900" style={{textShadow: "1px 1px 2px #0f172a"}}>{teamAName} {payload.runs_inn1}</text>
                </g>
            );
        }
        if (payload.wicket_inn1) return <circle cx={cx} cy={cy} r={5} fill="#ef4444" stroke="#fff" strokeWidth={2} />;
        return null;
    };

    const Inn2WicketDot = (props) => {
        const { cx, cy, payload, index } = props;
        const isEnd = index === chartData.length - 1 || (chartData[index+1] && chartData[index+1].runs_inn2 === undefined);
        if (isEnd && payload.runs_inn2 !== undefined) {
            return (
                <g>
                    <circle cx={cx} cy={cy} r={6} fill="#fff" stroke={teamBColor} strokeWidth={3} />
                    <text x={cx + 15} y={cy + 15} fill={teamBColor} fontSize={12} fontWeight="900" style={{textShadow: "1px 1px 2px #0f172a"}}>{teamBName} {payload.runs_inn2}</text>
                </g>
            );
        }
        if (payload.wicket_inn2) return <circle cx={cx} cy={cy} r={5} fill="#ef4444" stroke="#fff" strokeWidth={2} />;
        return null;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 text-slate-800 font-sans pb-28 selection:bg-emerald-500/30">
            {/* dynamic background aura */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-200 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-emerald-100 rounded-full blur-[100px]"></div>
            </div>

            <header className="sticky top-0 z-[100] bg-white/90 backdrop-blur-2xl border-b border-emerald-100 shadow-lg">
                <div className="max-w-6xl mx-auto px-4 h-18 flex items-center justify-between py-3">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-emerald-700 hover:text-emerald-900 transition-colors bg-emerald-50 rounded-xl">
                        <ChevronLeft size={20} />
                    </button>
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${error ? 'bg-slate-400' : 'bg-rose-500 animate-pulse'}`}></span>
                            <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${error ? 'text-slate-500' : 'text-emerald-600'}`}>
                                {error ? 'Broadcast Offline' : 'Live Broadcast'}
                            </span>
                        </div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase mt-1 tracking-widest">{error ? "Showing Cached Intel" : (match.venue?.name || "The Turf Arena")}</p>
                    </div>
                    <button className="p-2 bg-emerald-50 rounded-xl text-emerald-700 hover:text-emerald-900">
                        <Share2 size={18} />
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-8 space-y-8 relative z-10">
                
                {match.status === 'Completed' && (
                    <div className="animate-in slide-in-from-top-4 duration-700">
                        <div className="bg-white rounded-[3rem] p-10 border border-emerald-100 shadow-2xl text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>                            <div className="relative z-10 text-center">
                                <Trophy className="mx-auto text-amber-400 mb-6 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" size={64} />
                                <h1 className="text-5xl font-black uppercase tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-r from-emerald-800 to-emerald-500">Match Concluded</h1>
                                <div className="inline-block px-8 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-8">
                                    <p className="text-2xl font-black text-emerald-400 uppercase italic tracking-tight">
                                        {(() => {
                                            const res = match.result;
                                            let winner = '';
                                            const teamAId = match.team_a?.team_id?._id || match.team_a?.team_id;
                                            const teamBId = match.team_b?.team_id?._id || match.team_b?.team_id;

                                            const winId = res?.winner?._id || res?.winner;
                                            
                                            const scoreA = match.team_a?.score || 0;
                                            const scoreB = match.team_b?.score || 0;

                                            if (winId) {
                                                if (winId.toString() === teamAId?.toString()) winner = teamAName;
                                                else if (winId.toString() === teamBId?.toString()) winner = teamBName;
                                            }
                                            if (!winner && res?.winner?.name) winner = res.winner.name;
                                            if (!winner && typeof res?.winner === 'string') winner = res.winner;

                                            let margin = res?.margin;
                                            let wonBy = res?.won_by;

                                            if (!winner || winner === 'Pending' || match.status === 'Completed') {
                                                const diff = scoreA - scoreB;
                                                if (diff > 0) { 
                                                    winner = teamAName; 
                                                    if (!margin) margin = diff;
                                                    if (!wonBy || wonBy === 'Pending') wonBy = 'Runs';
                                                }
                                                else if (diff < 0) { 
                                                    winner = teamBName;
                                                    if (!margin) margin = Math.max(10 - (match.team_b?.wickets || 0), 1); 
                                                    if (!wonBy || wonBy === 'Pending') wonBy = 'Wickets';
                                                }
                                                else if (diff === 0 && match.status === 'Completed') {
                                                    winner = 'Match Tied';
                                                    wonBy = 'Tie';
                                                    margin = 0;
                                                }
                                            }

                                            if (wonBy === 'Tie') return "MATCH TIED";
                                            if (winner === 'Result Pending' || !winner) return "RESULT PENDING";
                                            return `${winner} WON BY ${margin} ${wonBy}`.toUpperCase();
                                        })()}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-8 max-w-lg mx-auto bg-emerald-50/50 p-8 rounded-[2rem] border border-emerald-100 backdrop-blur-md">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase text-emerald-700 tracking-widest">{teamAName}</p>
                                    <p className="text-4xl font-black text-slate-900">{match.team_a.score}<span className="text-xl text-slate-400 ml-1">/{match.team_a.wickets}</span></p>
                                </div>
                                <div className="space-y-1 border-l border-emerald-200">
                                    <p className="text-[10px] font-black uppercase text-emerald-700 tracking-widest">{teamBName}</p>
                                    <p className="text-4xl font-black text-slate-900">{match.team_b.score}<span className="text-xl text-slate-400 ml-1">/{match.team_b.wickets}</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Score Hero */}
                <div className={`bg-white rounded-[3.5rem] p-10 md:p-14 border border-emerald-100 shadow-2xl relative overflow-hidden transition-all duration-500 ${newBallFlash ? 'scale-[1.02] border-emerald-400 ring-4 ring-emerald-200/30' : ''}`}>
                    <div className="absolute top-0 right-0 p-8">
                         <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl border border-emerald-200 flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                             <span className="text-[10px] font-black uppercase tracking-widest">Active Inning</span>
                         </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
                        <div className="flex flex-col items-center md:items-start group transition-transform hover:translate-x-1">
                            <div className="w-20 h-20 rounded-3xl bg-emerald-50 flex items-center justify-center border border-emerald-100 mb-5 shadow-xl transition-all group-hover:bg-emerald-100">
                                <Users size={32} style={{ color: teamAColor }} className="drop-shadow-lg" />
                            </div>
                            <h3 className="text-xs font-black uppercase text-slate-600 tracking-[0.2em] mb-1">{teamAName}</h3>
                            <div className="h-1 w-12 bg-gradient-to-r from-emerald-500 to-transparent rounded-full"></div>
                        </div>

                        <div className="text-center relative">
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-32 h-32 bg-emerald-100/50 rounded-full blur-3xl"></div>
                            <div className="flex items-baseline justify-center gap-2 mb-2 relative z-10">
                                <span className="text-8xl md:text-9xl font-black tracking-tighter text-slate-900 drop-shadow-sm">{currentScore.runs}</span>
                                <span className="text-3xl md:text-4xl font-black text-emerald-600">/{currentScore.wickets}</span>
                            </div>
                            <div className="inline-block px-6 py-2 bg-emerald-50 rounded-2xl border border-emerald-100 backdrop-blur-md">
                                <span className="text-[11px] font-black text-emerald-700 uppercase tracking-[0.3em]">{currentScore.overs} OVERS COMPLETE</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-center md:items-end group transition-transform hover:-translate-x-1">
                            <div className="w-20 h-20 rounded-3xl bg-emerald-50 flex items-center justify-center border border-emerald-100 mb-5 shadow-xl transition-all group-hover:bg-emerald-100">
                                <Users size={32} style={{ color: teamBColor }} className="drop-shadow-lg" />
                            </div>
                            <h3 className="text-xs font-black uppercase text-slate-600 tracking-[0.2em] mb-1">{teamBName}</h3>
                            <div className="h-1 w-12 bg-gradient-to-l from-rose-500 to-transparent rounded-full"></div>
                        </div>
                    </div>

                    <div className="mt-14 flex flex-wrap justify-between items-center gap-6 pt-10 border-t border-emerald-100">
                        <div className="flex gap-10">
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Current RR</p>
                                <p className="text-3xl font-black text-slate-900">{liveData?.run_rate || '0.00'}</p>
                            </div>
                            {liveData?.target && (
                                <div className="border-l border-emerald-200 pl-10">
                                    <p className="text-[10px] font-black text-rose-500/50 uppercase tracking-widest mb-1">Target</p>
                                    <p className="text-3xl font-black text-rose-500">{liveData.target}</p>
                                </div>
                            )}
                        </div>
                        <div className="bg-emerald-50 backdrop-blur-md px-6 py-4 rounded-3xl border border-emerald-100 flex items-center gap-4">
                             <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
                                <Zap size={18} className="text-emerald-600" />
                             </div>
                             <div>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Arena Insights</p>
                                <p className="text-xs font-black text-slate-800 uppercase">{prediction?.insight || 'Analyzing match trajectory...'}</p>
                             </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white/80 backdrop-blur-md rounded-3xl p-2 flex border border-emerald-100 shadow-lg">
                    {[
                        { id: 'analytics', label: 'Match Intel', icon: LineIcon },
                        { id: 'commentary', label: 'Highlights', icon: Volume2 },
                        { id: 'scorecard', label: 'Full Card', icon: BarChart3 }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={`flex-1 py-4 px-3 rounded-2xl flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${activeTab === t.id ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-emerald-700'}`}
                        >
                            <t.icon size={16} /> {t.label}
                        </button>
                    ))}
                </div>

                <div className="min-h-[500px]">
                    {activeTab === 'analytics' && (
                        <div className="space-y-8 animate-in fade-in duration-700">
                            <div className="bg-white rounded-[3rem] p-10 border border-emerald-100 shadow-2xl overflow-hidden relative">
                                <div className="absolute top-[-20%] right-[-20%] w-[50%] h-[50%] bg-emerald-100/30 rounded-full blur-[80px]"></div>
                                <h3 className="text-xs font-black text-emerald-700 mb-10 uppercase tracking-[0.3em] flex items-center gap-3">
                                    <TrendingUp className="text-emerald-500" size={16} /> Velocity Comparison
                                </h3>
                                
                                <div className="h-80 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="5 5" stroke="#1e293b" vertical={false} opacity={0.5} />
                                            <XAxis 
                                                type="number" 
                                                domain={[0, (match?.overs || 10) * 6]} 
                                                dataKey="ballIndex" 
                                                stroke="#475569" 
                                                tick={{ fontSize: 10, fill: '#475569', fontWeight: 700 }} 
                                                tickFormatter={(val) => Math.floor(val/6) + "." + (val%6)}
                                                axisLine={false} 
                                                tickLine={false} 
                                                label={{ value: 'TOTAL OVERS', position: 'insideBottom', offset: -10, fill: '#475569', fontSize: 10, fontWeight: 'black', tracking: '0.2em' }}
                                            />
                                            <YAxis 
                                                stroke="#475569" 
                                                tick={{ fontSize: 10, fill: '#475569', fontWeight: 700 }} 
                                                axisLine={false} 
                                                tickLine={false}
                                                domain={[0, (dataMax) => Math.max(dataMax + 10, 40)]}
                                                label={{ value: 'RUNS', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 10, fontWeight: 'black' }}
                                            />
                                            <Tooltip 
                                                labelFormatter={(val) => `Over: ${Math.floor(val/6)}.${val%6}`}
                                                contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #d1fae5', borderRadius: '20px', padding: '15px', color: '#1e293b', boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }} 
                                                itemStyle={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase' }}
                                            />
                                            <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: '#475569', paddingTop: '20px' }} />
                                            
                                            {(liveData?.target) && (
                                                <ReferenceLine y={liveData.target} stroke="#10b981" strokeDasharray="3 3" label={{ position: 'top', value: 'TARGET', fill: '#10b981', fontSize: 10, fontWeight: 900 }} />
                                            )}

                                            <Line 
                                                type="monotone" 
                                                dataKey="runs_inn1" 
                                                name={teamAName} 
                                                stroke={teamAColor} 
                                                strokeWidth={4} 
                                                dot={<Inn1WicketDot />}
                                                connectNulls
                                                animationDuration={1000}
                                                style={{ filter: `drop-shadow(0px 0px 8px ${teamAColor}50)` }}
                                            />
                                            
                                            {chartData.some(p => p.runs_inn2 !== null) && (
                                                <Line 
                                                    type="monotone" 
                                                    dataKey="runs_inn2" 
                                                    name={teamBName} 
                                                    stroke={teamBColor} 
                                                    strokeWidth={4} 
                                                    dot={<Inn2WicketDot />}
                                                    connectNulls
                                                    animationDuration={1000}
                                                    style={{ filter: `drop-shadow(0px 0px 8px ${teamBColor}50)` }}
                                                />
                                            )}
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-white rounded-[3rem] p-10 border border-emerald-100 shadow-2xl overflow-hidden relative">
                                <h3 className="text-xs font-black text-emerald-700 mb-10 uppercase tracking-[0.3em] flex items-center gap-3">
                                    <Zap className="text-emerald-500" size={16} /> Over Velocity Momentum
                                </h3>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={overAnalytics}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="over" stroke="#64748b" tick={{fontSize: 10, fontWeight: 900}} label={{ value: 'OVERS', position: 'insideBottom', offset: -5, fontSize: 10, fontWeight: 900 }} />
                                            <YAxis stroke="#64748b" tick={{fontSize: 10, fontWeight: 900}} />
                                            <Tooltip 
                                                cursor={{fill: '#f8fafc'}}
                                                contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                                            />
                                            <Legend iconType="circle" />
                                            <Bar dataKey={teamAName} fill={teamAColor} radius={[6, 6, 0, 0]} />
                                            <Bar dataKey={teamBName} fill={teamBColor} radius={[6, 6, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                                <div className="bg-white rounded-[3rem] p-8 border border-emerald-100 shadow-2xl text-center relative overflow-hidden">
                                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Match Boundary Profile</p>
                                     <div className="h-48">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={matchAnalytics.boundaries} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                    {matchAnalytics.boundaries.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                                                </Pie>
                                                <Tooltip contentStyle={{ borderRadius: '15px', border: 'none' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                     </div>
                                </div>
                                <div className="bg-white rounded-[3rem] p-8 border border-emerald-100 shadow-2xl text-center relative overflow-hidden">
                                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Innings Dot Ball Ratio</p>
                                     <div className="h-48">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={matchAnalytics.dotRatios} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                    {matchAnalytics.dotRatios.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                                                </Pie>
                                                <Tooltip contentStyle={{ borderRadius: '15px', border: 'none' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                     </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-white rounded-[2.5rem] p-8 border border-emerald-100 shadow-2xl relative overflow-hidden">
                                     <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl"></div>
                                     <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-6">Win Probability</p>
                                     <div className="flex items-center gap-6">
                                         <p className="text-6xl font-black text-slate-900">{prediction?.winProbability || 50}%</p>
                                         <div className="flex-1">
                                             <div className="w-full h-3 bg-emerald-50 rounded-full overflow-hidden border border-emerald-100 p-0.5">
                                                 <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-1000" style={{ width: `${prediction?.winProbability || 50}%` }}></div>
                                             </div>
                                             <p className="text-[9px] font-bold text-slate-500 mt-2 uppercase text-right">{teamAName} dominance</p>
                                         </div>
                                     </div>
                                </div>
                                <div className="bg-emerald-50 backdrop-blur-md rounded-[2.5rem] p-8 border border-emerald-100 flex items-center justify-between group cursor-default">
                                     <div className="space-y-1">
                                         <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">MVP Candidate</p>
                                         <p className="text-3xl font-black text-slate-900 transition-colors group-hover:text-emerald-700">{prediction?.mvp || "---"}</p>
                                     </div>
                                     <div className="w-16 h-16 rounded-3xl bg-emerald-100 flex items-center justify-center border border-emerald-200 group-hover:scale-110 transition-transform">
                                         <Trophy className="text-emerald-600" size={28} />
                                     </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'commentary' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
                            {[...(liveData?.commentary_log || [])].reverse().map((entry, i) => (
                                <div key={i} className={`bg-white backdrop-blur-md rounded-[2rem] border p-6 flex gap-6 transition-all hover:shadow-lg ${entry.text.includes('FOUR') || entry.text.includes('SIX') || entry.text.includes('WICKET') ? 'border-emerald-300 shadow-emerald-100/50' : 'border-emerald-100'}`}>
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-[11px] font-black shrink-0 shadow-lg ${entry.text.includes('WICKET') ? 'bg-rose-600 text-white' : 'bg-emerald-50 text-emerald-800 border border-emerald-100'}`}>
                                        {entry.ball}
                                    </div>
                                    <div className="space-y-3">
                                        <p className="text-sm font-bold text-slate-700 leading-relaxed tracking-wide">
                                            {entry.text.split(' ').map((word, idx) => (
                                                <span key={idx} className={['FOUR', 'SIX', 'WICKET'].includes(word.toUpperCase()) ? 'text-emerald-400 font-black px-1.5 py-0.5 bg-emerald-400/10 rounded-md' : ''}>
                                                    {word}{' '}
                                                </span>
                                            ))}
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">{entry.overs} OVS COMPLETE</span>
                                            {entry.text.includes('WICKET') && <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></div>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'scorecard' && (
                        <div className="space-y-10 animate-in fade-in duration-700">
                             {/* Match Boundary Summary Card */}
                             <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] p-6 text-center">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total 4s</p>
                                    <p className="text-3xl font-black text-emerald-700">
                                        {((liveData?.scorecard?.batsmen || []).reduce((sum, b) => sum + (b.fours || b.f || 0), 0))}
                                    </p>
                                </div>
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-[2rem] p-6 text-center">
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Total 6s</p>
                                    <p className="text-3xl font-black text-blue-700">
                                        {((liveData?.scorecard?.batsmen || []).reduce((sum, b) => sum + (b.sixes || b.s || 0), 0))}
                                    </p>
                                </div>
                             </div>

                             {/* Batting Section */}
                             <div className="bg-white shadow-2xl border border-emerald-100 backdrop-blur-xl rounded-[3rem] overflow-hidden">
                                 <div className="bg-emerald-50 px-8 py-5 border-b border-emerald-100">
                                     <h4 className="text-[11px] font-black uppercase text-emerald-700 tracking-[0.2em] flex items-center gap-2">
                                         <Users size={14} /> Batting Statistics
                                     </h4>
                                 </div>
                                 <div className="overflow-x-auto">
                                     <table className="w-full">
                                         <thead className="text-[10px] font-black uppercase text-slate-500 border-b border-emerald-100">
                                             <tr>
                                                 <th className="py-6 px-10 text-left tracking-widest">Batsman Name</th>
                                                 <th className="py-6 px-4 text-center">R</th>
                                                 <th className="py-6 px-4 text-center">B</th>
                                                 <th className="py-6 px-4 text-center">4s</th>
                                                 <th className="py-6 px-4 text-center">6s</th>
                                                 <th className="py-6 px-10 text-right">SR</th>
                                             </tr>
                                         </thead>
                                         <tbody className="divide-y divide-emerald-50">
                                             {((liveData?.scorecard?.batsmen || []).length > 0 ? liveData.scorecard.batsmen : (match.innings[match.innings.length - 1]?.batsmen || [])).map((b, i) => (
                                                 <tr key={i} className={`transition-colors hover:bg-emerald-50/50 ${b.batting || b.is_on_strike ? 'bg-emerald-50' : ''}`}>
                                                     <td className="py-5 px-10 text-left">
                                                         <div className="flex items-center gap-3">
                                                             <span className={`text-sm font-black transition-colors ${b.batting || b.is_on_strike ? 'text-emerald-700' : 'text-slate-800'}`}>{b.name || (b.user_id ? "Player " + (i+1) : "Unknown")}</span>
                                                             {(b.batting || b.is_on_strike) && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>}
                                                         </div>
                                                     </td>
                                                     <td className="py-5 px-4 text-center text-sm font-black text-slate-900">{b.runs}</td>
                                                     <td className="py-5 px-4 text-center text-xs font-bold text-slate-500">{b.balls}</td>
                                                     <td className="py-5 px-4 text-center text-xs font-bold text-slate-500">{b.fours ?? b.f ?? 0}</td>
                                                     <td className="py-5 px-4 text-center text-xs font-bold text-slate-500">{b.sixes ?? b.s ?? 0}</td>
                                                     <td className="py-5 px-10 text-right text-xs font-black text-slate-600">{b.sr || '0.0'}</td>
                                                 </tr>
                                             ))}
                                         </tbody>
                                     </table>
                                 </div>
                             </div>

                             {/* Bowling Section */}
                             <div className="bg-white shadow-2xl border border-emerald-100 backdrop-blur-xl rounded-[3rem] overflow-hidden">
                                 <div className="bg-emerald-50 px-8 py-5 border-b border-emerald-100">
                                     <h4 className="text-[11px] font-black uppercase text-rose-600 tracking-[0.2em] flex items-center gap-2">
                                         <Target size={14} /> Bowling Statistics
                                     </h4>
                                 </div>
                                 <div className="overflow-x-auto">
                                     <table className="w-full">
                                         <thead className="text-[10px] font-black uppercase text-slate-500 border-b border-emerald-100">
                                             <tr>
                                                 <th className="py-6 px-10 text-left tracking-widest">Bowler Name</th>
                                                 <th className="py-6 px-4 text-center">O</th>
                                                 <th className="py-6 px-4 text-center">M</th>
                                                 <th className="py-6 px-4 text-center">R</th>
                                                 <th className="py-6 px-4 text-center">W</th>
                                                 <th className="py-6 px-10 text-right">ECON</th>
                                             </tr>
                                         </thead>
                                         <tbody className="divide-y divide-emerald-50">
                                             {((liveData?.scorecard?.bowlers || []).length > 0 ? liveData.scorecard.bowlers : (match.innings[match.innings.length - 1]?.bowlers || [])).map((bw, i) => (
                                                 <tr key={i} className={`transition-colors hover:bg-emerald-50/50 ${bw.bowling ? 'bg-rose-50' : ''}`}>
                                                     <td className="py-5 px-10 text-left">
                                                         <div className="flex items-center gap-3">
                                                             <span className={`text-sm font-black transition-colors ${bw.bowling ? 'text-rose-600' : 'text-slate-800'}`}>{bw.name || (bw.user_id ? "Bowler " + (i+1) : "Unknown")}</span>
                                                             {bw.bowling && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>}
                                                         </div>
                                                     </td>
                                                     <td className="py-5 px-4 text-center text-sm font-black text-slate-900">{bw.overs}</td>
                                                     <td className="py-5 px-4 text-center text-xs font-bold text-slate-500">{bw.maidens || 0}</td>
                                                     <td className="py-5 px-4 text-center text-sm font-black text-slate-900">{bw.runs}</td>
                                                     <td className="py-5 px-4 text-center text-sm font-black text-rose-600">{bw.wickets}</td>
                                                     <td className="py-5 px-10 text-right text-xs font-black text-slate-600">{bw.eco || bw.economy || '0.0'}</td>
                                                 </tr>
                                             ))}
                                         </tbody>
                                     </table>
                                 </div>
                             </div>

                             {/* Extras & Totals */}
                             <div className="bg-emerald-50 rounded-[2rem] p-8 border border-emerald-100 text-center">
                                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Extras: <span className="text-slate-900 ml-2">{(liveData?.scorecard?.total?.extras || 0)}</span> (NB 0, WD 0, LB 0, B 0)</p>
                             </div>
                        </div>
                    )}
                </div>
            </main>

            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-sm z-[200]">
                <div className="bg-white/95 backdrop-blur-3xl rounded-3xl p-2.5 flex items-center shadow-[0_-10px_40px_rgb(0,0,0,0.08)] border border-emerald-100 ring-1 ring-emerald-50">
                    <button onClick={() => navigate('/')} className="flex-1 text-[10px] font-black text-slate-500 hover:text-emerald-700 uppercase transition-colors">Home</button>
                    <div className="w-px h-8 bg-emerald-100 mx-3"></div>
                    <button className="flex-[3] bg-gradient-to-r from-emerald-600 to-emerald-500 py-4 rounded-2xl flex items-center justify-center gap-3 group relative overflow-hidden shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform">
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <Zap size={16} className="text-white fill-white animate-pulse" />
                        <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Expert Analytics</span>
                    </button>
                    <div className="w-px h-8 bg-emerald-100 mx-3"></div>
                    <button className="flex-1 text-[10px] font-black text-slate-500 hover:text-emerald-700 uppercase transition-colors">Invite</button>
                </div>
            </div>
        </div>
    );
}
