import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { Trophy, Users, Timer, Info, Share2, Activity, BarChart3, ChevronLeft, Volume2, Maximize2, Zap } from 'lucide-react';
import io from 'socket.io-client';

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
    const [activeTab, setActiveTab] = useState('commentary'); // commentary, scorecard, overs
    const [prediction, setPrediction] = useState(null);
    const [newBallFlash, setNewBallFlash] = useState(false);
    const socketRef = useRef(null);
    const commentaryEndRef = useRef(null);

    // Initial fetch + Socket.IO connection
    useEffect(() => {
        const fetchMatch = async () => {
            try {
                const res = await apiClient.get(`/matches/${id}`);
                const matchData = res.data.match || res.data; 
                setMatch(matchData);
                setLiveData(matchData.live_data || {});
            } catch (err) {
                setError("Match not found or private.");
            } finally {
                setLoading(false);
            }
        };

        const fetchPrediction = async () => {
            // Use match state directly to avoid temporal dead zone with isMatchEnded
            if (match && (match.status === 'Completed')) return;
            try {
                const res = await apiClient.get(`/matches/${id}/prediction`);
                if (res.data.success) {
                    setPrediction(res.data.prediction);
                }
            } catch (err) {
                console.error("Prediction fetch failed");
            }
        };

        fetchMatch();
        // Fetch prediction initially
        setTimeout(fetchPrediction, 2000);

        const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('🟢 Connected to live stream');
            socket.emit('join_match', id);
        });

        socket.on('match:update', (data) => {
            setLiveData(prev => ({ ...prev, ...data }));
            setNewBallFlash(true);
            setTimeout(() => setNewBallFlash(false), 800);
            
            // Randomly refresh prediction on significant updates (e.g. status changes or every 5 balls)
            if (Math.random() > 0.8) fetchPrediction();
        });

        socket.on('match:ball', (data) => {
            setLiveData(prev => ({ ...prev, ...data }));
        });

        socket.on('disconnect', () => {
            console.log('🔴 Disconnected from live stream');
        });

        const pollTimer = setInterval(fetchMatch, 10000);
        const predTimer = setInterval(fetchPrediction, 60000); // Refresh prediction every minute

        return () => {
            if (socketRef.current) {
                socketRef.current.emit('leave_match', id);
                socketRef.current.disconnect();
            }
            clearInterval(pollTimer);
            clearInterval(predTimer);
        };
    }, [id, match?.status]);

    if (loading) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center text-slate-900 p-6">
            <div className="relative">
                <div className="w-20 h-20 border-4 border-emerald-500/20 rounded-full"></div>
                <div className="w-20 h-20 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-500 animate-pulse" size={24} />
            </div>
            <p className="mt-8 text-emerald-400 font-black tracking-[0.3em] uppercase text-[10px] animate-pulse">Syncing Arena Intel...</p>
        </div>
    );

    if (error || !match) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center text-slate-900 p-6 text-center">
            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mb-6 border border-red-500/20">
                <Info className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Match Off Air</h2>
            <p className="text-gray-400 text-sm mb-10 max-w-xs">{error || "This match might have ended or hasn't started yet. Check back soon for live updates."}</p>
            <Link to="/" className="bg-white text-black px-10 py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-emerald-500 hover:text-white transition-all">Back Home</Link>
        </div>
    );

    const currentScore = {
        runs: liveData?.runs ?? liveData?.scorecard?.total?.runs ?? 0,
        wickets: liveData?.wickets ?? liveData?.scorecard?.total?.wickets ?? 0,
        overs: liveData?.overNum !== undefined && liveData?.ballInOver !== undefined
            ? `${liveData.overNum}.${liveData.ballInOver}`
            : (typeof liveData?.overs === 'number' ? Math.floor(liveData.overs) + '.' + Math.round((liveData.overs % 1) * 6) : (liveData?.overs ?? liveData?.scorecard?.total?.overs ?? '0.0'))
    };
    const isMatchEnded = match.status === 'Completed' || liveData?.phase === 'match_result';
    const teamAName = match.team_a?.team_id?.name || match.quick_teams?.team_a?.name || 'Team A';
    const teamBName = match.team_b?.team_id?.name || match.quick_teams?.team_b?.name || 'Team B';
    const teamAColor = match.quick_teams?.team_a?.colour || '#3b82f6';
    const teamBColor = match.quick_teams?.team_b?.colour || '#ef4444';

    const getBallColor = (ball) => {
        if (ball === 'W') return 'bg-rose-600 border-rose-400 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)]';
        if (ball === '4') return 'bg-blue-600 border-blue-400 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]';
        if (ball === '6') return 'bg-amber-500 border-amber-300 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]';
        if (ball === 'Wd' || ball === 'Nb') return 'bg-purple-500 border-purple-400 text-white';
        if (ball === '·') return 'bg-emerald-100/50 border-emerald-100 text-emerald-300';
        return 'bg-emerald-50 border-emerald-100 text-emerald-400';
    };

    return (
        <div className="min-h-screen bg-emerald-50 text-slate-900 font-sans overflow-x-hidden pb-24 selection:bg-emerald-500/30">
            {/* Dynamic Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-40">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-600/20 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full"></div>
            </div>

            {/* Custom Navbar */}
            <header className="sticky top-0 z-[100] bg-white/80 backdrop-blur-2xl border-b border-emerald-100">
                <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors">
                        <ChevronLeft size={18} />
                    </button>
                    
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2">
                            {!isMatchEnded ? (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full">
                                    <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_#f43f5e]"></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">Live Stream</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                    <Trophy size={10} className="text-emerald-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Match Final</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            alert("Intel Link Copied!");
                        }} className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors">
                            <Share2 size={18} className="text-emerald-600" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-6 space-y-6 relative z-10">
                
                {/* MATCH SUMMARY STRIP (Top Tier Intel) */}
                <div className="bg-white border border-emerald-100 rounded-3xl p-4 flex items-center justify-between shadow-sm">
                    <div className="flex-1 flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{teamAName}</span>
                            <span className="text-sm font-black text-slate-800">
                                {liveData?.inningsNum === 2 ? (liveData?.inn1_scorecard?.score || 0) : currentScore.runs}/
                                {liveData?.inningsNum === 2 ? (liveData?.inn1_scorecard?.wickets || 0) : currentScore.wickets}
                                <span className="text-[9px] font-bold text-slate-300 ml-1">({liveData?.inningsNum === 2 ? (liveData?.inn1_scorecard?.overs || 0) : currentScore.overs})</span>
                            </span>
                        </div>
                    </div>
                    
                    <div className="px-4 flex flex-col items-center">
                        <div className="h-8 w-px bg-emerald-100"></div>
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em] my-1">VS</span>
                        <div className="h-8 w-px bg-emerald-100"></div>
                    </div>

                    <div className="flex-1 flex items-center justify-end gap-4 text-right">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{teamBName}</span>
                            <span className={`text-sm font-black ${liveData?.inningsNum === 2 ? 'text-emerald-600' : 'text-slate-300'}`}>
                                {liveData?.inningsNum === 2 ? currentScore.runs : '—'}/
                                {liveData?.inningsNum === 2 ? currentScore.wickets : '—'}
                                <span className="text-[9px] font-bold text-slate-200 ml-1">({liveData?.inningsNum === 2 ? currentScore.overs : '0.0'})</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* AI PREDICTION INTEL */}
                {!isMatchEnded && prediction && (
                    <div className="bg-[#050805] rounded-[2rem] p-6 shadow-xl border border-emerald-500/20 relative overflow-hidden group">
                        {/* Background Pulsing Glow */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full animate-pulse"></div>
                        
                        <div className="relative z-10 flex items-center justify-between gap-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                                        <Zap size={14} className="text-emerald-500 fill-emerald-500 animate-pulse" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Match Forecast Intelligence</span>
                                </div>
                                
                                <h4 className="text-xl font-black text-white tracking-tight mb-2">
                                    <span className="text-emerald-400">{prediction.winner}</span> is favored to win
                                </h4>
                                
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 flex-shrink-0">
                                        <div className="w-1.5 h-1.5 bg-emerald-500/40 rounded-full mt-1"></div>
                                    </div>
                                    <p className="text-[11px] font-bold text-white/40 leading-relaxed uppercase tracking-wide italic">
                                        "{prediction.reason}"
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-3xl border border-white/5 min-w-[100px]">
                                <span className="text-2xl font-[1000] text-emerald-500 tracking-tighter leading-none mb-1">
                                    {prediction.probability}
                                </span>
                                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Victory Prob.</span>
                            </div>
                        </div>

                        {/* Analysis Footer */}
                        <div className="relative z-10 mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Crucial Impact →</span>
                                <span className="text-[9px] font-black text-emerald-400/80 uppercase tracking-tight">{prediction.keyPlayer}</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                                <Activity size={10} className="text-blue-400" />
                                <span className="text-[8px] font-black text-blue-400/60 uppercase tracking-widest leading-none">
                                    {prediction.leadingTeam} leading
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* TARGET & SITUATION HUD */}
                <div className="space-y-4">
                    {liveData?.target && !isMatchEnded && (
                        <div className="bg-gradient-to-r from-yellow-400/10 via-yellow-400/5 to-transparent border-l-4 border-yellow-400 rounded-2xl p-4 flex items-center justify-between shadow-lg">
                            <div>
                                <p className="text-[9px] font-black text-yellow-400/60 uppercase tracking-[0.3em] mb-1">Target to Win</p>
                                <p className="text-2xl font-black text-yellow-400">{liveData.target} <span className="text-xs font-bold text-yellow-400/40 ml-1">RUNS</span></p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Required</p>
                                <p className="text-xl font-black text-slate-800">{liveData.runs_needed} <span className="text-[10px] text-slate-400">off {liveData.balls_remaining}</span></p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#0A0F0A] border border-white/5 rounded-[2rem] p-4 flex items-center justify-between shadow-inner">
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Curr. RR</span>
                            <span className="text-sm font-black text-emerald-500">{liveData?.run_rate || '0.00'}</span>
                        </div>
                        {liveData?.target && !isMatchEnded ? (
                            <div className="bg-white/5 border border-white/5 rounded-[2rem] p-4 flex items-center justify-between shadow-inner">
                                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Req. RR</span>
                                <span className={`text-sm font-black ${parseFloat(liveData.required_run_rate) > 12 ? 'text-rose-500' : 'text-blue-400'}`}>
                                    {liveData.required_run_rate}
                                </span>
                            </div>
                        ) : (
                            <div className="bg-white/5 border border-white/5 rounded-[2rem] p-4 flex items-center justify-between opacity-40">
                                <span className="text-[9px] font-black text-white/10 uppercase tracking-widest">Projected</span>
                                <span className="text-sm font-black text-white/20">
                                    {((currentScore.runs / (parseFloat(currentScore.overs) || 1)) * (match.format_overs || 20)).toFixed(0)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* BROADCAST SCOREBOARD CARD */}
                <div className={`relative group overflow-hidden rounded-[2.5rem] p-8 border transition-all duration-700 ${
                    newBallFlash ? 'border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.1)] scale-[1.01]' : 'border-emerald-100 shadow-sm'
                } bg-white`}>
                    
                    {/* Format Strip */}
                    <div className="flex justify-center mb-8">
                        <div className="bg-emerald-50 border border-emerald-100 px-4 py-1.5 rounded-full">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">
                                {match.format || 'T20'} Series • {liveData?.inningsNum === 2 ? '2nd Innings' : '1st Innings'}
                            </span>
                        </div>
                    </div>

                    {/* Team Logos and Names */}
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex flex-col items-center gap-4 flex-1">
                            <div className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center border-2 border-emerald-50 relative group-hover:scale-110 transition-transform duration-500" style={{ backgroundColor: teamAColor + '10' }}>
                                <Users size={28} style={{ color: teamAColor }} />
                                {liveData?.live_active_team === 'A' && !isMatchEnded && (
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                                        <Zap size={10} className="text-white fill-white" />
                                    </div>
                                )}
                            </div>
                            <div className="text-center">
                                <h3 className="text-sm md:text-base font-black uppercase tracking-tight leading-none mb-1 text-slate-800">{teamAName}</h3>
                                {liveData?.inn1_scorecard && liveData?.inningsNum === 2 && (
                                    <p className="text-[10px] font-bold text-slate-400 truncate">{liveData.inn1_scorecard.score}/{liveData.inn1_scorecard.wickets}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-2 px-6">
                            <div className="text-[11px] font-black text-emerald-200 uppercase tracking-widest">VS</div>
                            <div className="h-12 w-px bg-emerald-100"></div>
                        </div>

                        <div className="flex flex-col items-center gap-4 flex-1">
                            <div className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center border-2 border-emerald-50 relative group-hover:scale-110 transition-transform duration-500" style={{ backgroundColor: teamBColor + '10' }}>
                                <Users size={28} style={{ color: teamBColor }} />
                                {liveData?.live_active_team === 'B' && !isMatchEnded && (
                                    <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                                        <Zap size={10} className="text-white fill-white" />
                                    </div>
                                )}
                            </div>
                            <div className="text-center">
                                <h3 className="text-sm md:text-base font-black uppercase tracking-tight leading-none mb-1 text-slate-800">{teamBName}</h3>
                            </div>
                        </div>
                    </div>

                    {/* Main Score Display */}
                    {isMatchEnded ? (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-6 flex flex-col items-center justify-center gap-4 mb-6 text-center">
                            <div className="w-12 h-12 bg-yellow-400/20 rounded-full flex items-center justify-center border border-yellow-400/20">
                                <Trophy size={24} className="text-yellow-600" />
                            </div>
                            <div>
                                <h4 className="text-xl font-black text-emerald-600 mb-1">{liveData?.result || 'Match Completed'}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Official Result Recorded</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center mb-10">
                            <div className="inline-flex items-baseline gap-2">
                                <span className="text-7xl md:text-8xl font-[1000] tracking-tighter text-slate-900">{currentScore.runs}</span>
                                <span className="text-4xl md:text-5xl font-black text-emerald-600">/ {currentScore.wickets}</span>
                            </div>
                            <div className="flex items-center justify-center gap-3 mt-4">
                                <div className="px-4 py-1.5 bg-emerald-50 rounded-full border border-emerald-100 flex items-center gap-2">
                                    <Timer size={12} className="text-emerald-400" />
                                    <span className="text-xs font-black text-emerald-600 tracking-widest">{currentScore.overs || '0.0'} <span className="text-[10px] font-bold text-emerald-200">OVERS</span></span>
                                </div>
                                <div className="px-4 py-1.5 bg-emerald-600 rounded-full shadow-lg shadow-emerald-600/10">
                                    <span className="text-xs font-black text-white tracking-widest">CRR: {liveData?.run_rate || '0.00'}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Target Logic (2nd Innings) */}
                    {liveData?.target && !isMatchEnded && (
                        <div className="relative mt-8">
                            <div className="relative bg-emerald-50 border border-emerald-100 rounded-[2rem] p-6 overflow-hidden">
                                <div className="absolute top-0 right-0 p-3">
                                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-400/40 text-center mb-4">Target Pursuit</p>
                                <div className="grid grid-cols-3 gap-4 items-center">
                                    <div className="text-center group-hover:scale-105 transition-transform">
                                        <p className="text-3xl font-black text-yellow-600 leading-none mb-1">{liveData.runs_needed}</p>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Needed</p>
                                    </div>
                                    <div className="text-center scale-110">
                                        <p className="text-3xl font-black text-slate-800 leading-none mb-1">{liveData.balls_remaining}</p>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Balls</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-3xl font-black text-blue-600 leading-none mb-1">{liveData.required_run_rate}</p>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Req. RR</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Partnership Footer */}
                    {!isMatchEnded && (
                        <div className="mt-8 flex items-center justify-between px-2 pt-6 border-t border-emerald-100">
                            <div className="flex items-center gap-2">
                                <Users size={14} className="text-emerald-300" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Partnership</span>
                            </div>
                            <p className="text-sm font-black text-slate-700">{liveData?.partnership?.runs || 0} <span className="text-[10px] text-slate-400 ml-0.5">({liveData?.partnership?.balls || 0})</span></p>
                        </div>
                    )}
                </div>

                {/* ACTIVE COMBATANTS (Striker, Non-Striker, Bowler) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Batting Duo */}
                    <div className="bg-white border border-emerald-100 rounded-[2rem] p-5 space-y-4 shadow-sm">
                        <div className="flex items-center gap-2 pb-3 border-b border-emerald-50">
                            <span className="w-2 h-4 bg-emerald-500 rounded-full"></span>
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">At the Crease</h4>
                        </div>
                        <div className="space-y-3">
                            {/* Striker */}
                            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex items-center justify-between">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] animate-bounce">🏏</span>
                                        <p className="text-sm font-black truncate text-slate-800">{liveData?.striker?.name || '—'}</p>
                                    </div>
                                    <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">SR: {((liveData?.striker?.runs / (liveData?.striker?.balls || 1)) * 100).toFixed(1)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black text-emerald-600 leading-none">{liveData?.striker?.runs || 0}</p>
                                    <p className="text-[10px] font-bold text-slate-400 truncate mt-1">{liveData?.striker?.balls || 0} balls</p>
                                </div>
                            </div>
                            {/* Non-Striker */}
                            <div className="bg-emerald-50/50 border border-emerald-50 rounded-2xl p-4 flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="text-sm font-black truncate text-slate-400 mb-1">{liveData?.non_striker?.name || '—'}</p>
                                    <p className="text-[9px] font-bold text-emerald-200 uppercase tracking-widest">Non-Striker</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-black text-slate-400 leading-none">{liveData?.non_striker?.runs || 0}</p>
                                    <p className="text-[10px] font-bold text-slate-300 truncate mt-1">{liveData?.non_striker?.balls || 0} balls</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Current Bowler */}
                    <div className="bg-white border border-emerald-100 rounded-[2rem] p-5 shadow-sm">
                        <div className="flex items-center gap-2 pb-3 border-b border-emerald-50 mb-4">
                            <span className="w-2 h-4 bg-rose-500 rounded-full"></span>
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">Attacking Force</h4>
                        </div>
                        <div className="bg-rose-500/5 border border-rose-500/10 rounded-3xl p-6 h-[calc(100%-48px)] flex flex-col justify-between">
                            <div className="text-center">
                                <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] mb-3">Bowling Now</p>
                                <h4 className="text-xl font-black text-slate-800 mb-1 truncate">{liveData?.bowler?.name || 'Waiting...'}</h4>
                                <div className="inline-block px-3 py-1 bg-white border border-rose-100 rounded-full">
                                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">{liveData?.bowler?.w || 0} Wkts • ECO {liveData?.bowler?.eco || '0.0'}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-6 border-t border-rose-500/10 mt-6">
                                <div className="text-center flex-1 border-r border-rose-50">
                                    <p className="text-2xl font-black text-slate-800 leading-none">{liveData?.bowler?.r || 0}</p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Runs</p>
                                </div>
                                <div className="text-center flex-1">
                                    <p className="text-2xl font-black text-rose-600 leading-none">{liveData?.bowler?.w || 0}</p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Wkts</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RECENT FORM / RECENT BALLS */}
                <div className="bg-white border border-emerald-100 rounded-[2rem] p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Activity size={14} className="text-emerald-500" />
                            <p className="text-[10px] font-[1000] uppercase tracking-[0.3em] text-emerald-200">Current Over Pulse</p>
                        </div>
                        <div className="px-2 py-0.5 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter">Real-Time</span>
                        </div>
                    </div>
                    <div className="flex gap-3 flex-wrap items-center">
                        {(liveData?.recent_balls || []).length > 0 ? liveData.recent_balls.map((ball, i) => (
                            <div 
                                key={i} 
                                className={`w-11 h-11 rounded-[1rem] flex items-center justify-center text-xs font-black border-2 transition-all duration-500 ${getBallColor(ball)} ${
                                    i === liveData.recent_balls.length - 1 && newBallFlash ? 'scale-125 animate-pulse' : 'hover:scale-105'
                                }`}
                            >
                                {ball}
                            </div>
                        )) : (
                            <div className="w-full py-4 text-center border-2 border-dashed border-white/5 rounded-2xl">
                                <p className="text-[10px] font-bold text-white/10 uppercase tracking-widest italic">Awaiting First Delivery</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* TABS ENGINE */}
                <div className="bg-white rounded-[1.8rem] p-1.5 border border-emerald-100 flex shadow-sm">
                    {[
                        { key: 'commentary', label: 'Feed', icon: Activity },
                        { key: 'scorecard', label: 'Scorecard', icon: BarChart3 },
                        { key: 'overs', label: 'Intel', icon: Timer }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 flex items-center justify-center gap-2.5 py-4 rounded-[1.4rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${
                                activeTab === tab.key 
                                ? 'bg-emerald-600 text-white shadow-[0_10px_20px_rgba(16,185,129,0.3)] border border-white/10' 
                                : 'text-white/20 hover:text-white/40'
                            }`}
                        >
                            <tab.icon size={14} className={activeTab === tab.key ? 'animate-pulse' : ''} /> {tab.label}
                        </button>
                    ))}
                </div>

                {/* TAB CONTENT AREA */}
                <div className="min-h-[400px]">
                    {/* Commentary FEED */}
                    {activeTab === 'commentary' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {(liveData?.commentary_log || []).length === 0 ? (
                                <div className="bg-white border-2 border-dashed border-emerald-100 rounded-[2.5rem] p-16 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                                        <Volume2 className="text-emerald-200" size={32} />
                                    </div>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest max-w-[200px] leading-relaxed">Intelligence Feed is silent. Waiting for the match to commence.</p>
                                </div>
                            ) : (
                                liveData.commentary_log.map((entry, i) => (
                                    <div key={i} className={`relative group pl-8 transition-all duration-500 ${i === 0 ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
                                        {/* Vertical Connector */}
                                        <div className="absolute left-[15px] top-10 bottom-[-20px] w-px bg-white/5 group-last:hidden"></div>
                                        
                                        <div className={`relative bg-white border border-emerald-100 rounded-[1.8rem] p-5 shadow-sm transition-all ${
                                            i === 0 ? 'border-emerald-500 bg-emerald-50' : ''
                                        }`}>
                                            <div className="absolute top-[-10px] left-[-22px]">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border-2 z-10 transition-transform group-hover:scale-110 ${getBallColor(entry.ball)}`}>
                                                    {entry.ball}
                                                </div>
                                            </div>

                                            <div className="flex items-start justify-between gap-4 mb-2">
                                                <p className="text-[13px] font-bold text-slate-800 leading-relaxed flex-1">{entry.text}</p>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-[10px] font-black text-emerald-600 leading-none">{entry.runs}-{entry.wickets}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 pt-3 border-t border-emerald-100/50">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{entry.overs} Over</span>
                                                <div className="w-1 h-1 bg-emerald-100 rounded-full"></div>
                                                <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Arena Capture</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={commentaryEndRef} />
                        </div>
                    )}

                    {/* SCORECARD INTEL */}
                    {activeTab === 'scorecard' && (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                            {/* Batting Section */}
                            <div className="bg-white border border-emerald-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                                <div className="bg-emerald-50 px-6 py-5 flex justify-between items-center border-b border-emerald-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
                                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Batting Order</h4>
                                    </div>
                                    <span className="text-[11px] font-black text-emerald-600 font-mono">{currentScore.runs}/{currentScore.wickets} <span className="text-emerald-200 ml-1">({currentScore.overs})</span></span>
                                </div>
                                <div className="p-2 overflow-x-auto no-scrollbar">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] border-b border-white/5">
                                                <th className="text-left px-4 py-4">Spectator Target</th>
                                                <th className="px-2 py-4">R</th>
                                                <th className="px-2 py-4">B</th>
                                                <th className="px-2 py-4">4s / 6s</th>
                                                <th className="px-2 py-4 text-right">SR</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {(liveData?.scorecard?.batsmen || []).map((b, i) => (
                                                <tr key={i} className={`group transition-colors ${b.batting ? 'bg-emerald-500/5' : ''}`}>
                                                    <td className="px-4 py-5">
                                                        <div className="flex items-center gap-3">
                                                            {b.batting && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>}
                                                            <div className="flex flex-col">
                                                                <span 
                                                                    onClick={() => b.user_id && navigate(`/player/${b.user_id}`)}
                                                                    className={`text-xs font-black ${b.out ? 'text-white/20' : 'text-white/80'} ${b.user_id ? 'cursor-pointer hover:text-emerald-400' : ''}`}
                                                                >
                                                                    {b.name}
                                                                </span>
                                                                {b.out && <span className="text-[8px] font-black text-rose-500/40 uppercase tracking-widest mt-1">Eliminated</span>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-5 text-center font-black text-xs">{b.runs}</td>
                                                    <td className="px-2 py-5 text-center text-[10px] font-bold text-white/20">{b.balls}</td>
                                                    <td className="px-2 py-5 text-center text-[10px] font-bold">
                                                        <span className="text-blue-400">{b.fours}</span> <span className="text-white/10 mx-1">/</span> <span className="text-orange-400">{b.sixes}</span>
                                                    </td>
                                                    <td className="px-4 py-5 text-right font-mono text-[10px] font-bold text-emerald-500/60">{b.sr}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Bowling Section */}
                            <div className="bg-white border border-emerald-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                                <div className="bg-emerald-50 px-6 py-5 flex items-center gap-3 border-b border-emerald-100">
                                    <div className="w-2 h-6 bg-rose-500 rounded-full"></div>
                                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-rose-600">Bowling Attack</h4>
                                </div>
                                <div className="p-2 overflow-x-auto no-scrollbar">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-emerald-50">
                                                <th className="text-left px-4 py-4">Executioner</th>
                                                <th className="px-2 py-4">O</th>
                                                <th className="px-2 py-4">R</th>
                                                <th className="px-2 py-4">W</th>
                                                <th className="px-2 py-4 text-right">ECO</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-emerald-50">
                                            {(liveData?.scorecard?.bowlers || []).map((bw, i) => (
                                                <tr key={i} className="hover:bg-emerald-50 transition-colors">
                                                    <td className="px-4 py-5 text-xs font-black text-slate-700">{bw.name}</td>
                                                    <td className="px-2 py-5 text-center text-xs font-bold text-slate-400">{bw.overs}</td>
                                                    <td className="px-2 py-5 text-center text-xs font-black text-slate-800">{bw.runs}</td>
                                                    <td className="px-2 py-5 text-center text-xs font-black text-rose-600">{bw.wickets}</td>
                                                    <td className="px-4 py-5 text-right font-mono text-[10px] font-bold text-slate-400">{bw.eco}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* OVER SUMMARIES */}
                    {activeTab === 'overs' && (
                        <div className="space-y-4 animate-in fade-in duration-500">
                           {(liveData?.over_summaries || []).length === 0 ? (
                                <div className="bg-white border-2 border-dashed border-emerald-100 rounded-[2.5rem] p-16 flex flex-col items-center justify-center text-center">
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed">Intelligence data populating... Complete 1 over to view stats.</p>
                                </div>
                            ) : (
                                [...(liveData.over_summaries || [])].reverse().map((over, i) => (
                                    <div key={i} className="bg-white border border-emerald-100 rounded-[2rem] p-6 flex flex-col gap-4 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100">
                                                    <span className="text-xs font-[1000] text-emerald-600">#{over.over_number}</span>
                                                </div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Innings Milestone</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-black text-slate-800 leading-none">{over.runs}</p>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Runs Scored</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2.5 flex-wrap pt-4 border-t border-emerald-50">
                                            {(over.balls || []).map((ball, j) => (
                                                <div key={j} className={`w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black border-2 ${getBallColor(ball)}`}>
                                                    {ball}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* FLOATING ACTION NAVIGATION */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-md z-[100]">
                <div className="bg-white/90 backdrop-blur-3xl border border-emerald-100 rounded-full p-2 flex items-center shadow-2xl overflow-hidden shadow-emerald-900/10">
                    <Link 
                        to="/" 
                        className="flex-1 flex flex-col items-center justify-center py-2.5 rounded-full hover:bg-emerald-50 transition-all group"
                    >
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-300 group-hover:text-emerald-600 transition-colors">Surface</span>
                    </Link>
                    <div className="w-px h-6 bg-emerald-100 mx-2"></div>
                    <Link 
                        to="/login" 
                        className="flex-[1.5] flex items-center justify-center gap-3 bg-emerald-600 px-6 py-3.5 rounded-full shadow-lg shadow-emerald-600/20 group hover:bg-emerald-500 transition-all"
                    >
                        <Zap size={14} className="group-hover:animate-bounce" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Deployment</span>
                    </Link>
                    <div className="w-px h-6 bg-emerald-100 mx-2"></div>
                    <button 
                         onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                         className="flex-1 flex flex-col items-center justify-center py-2.5 rounded-full hover:bg-emerald-50 transition-all group"
                    >
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-300 group-hover:text-emerald-600 transition-colors">Skyline</span>
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 0.5; }
                    50% { transform: scale(1.05); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 0.5; }
                }
                .glow-emerald {
                    box-shadow: 0 0 30px rgba(16, 185, 129, 0.2);
                }
            `}</style>
        </div>
    );
}
