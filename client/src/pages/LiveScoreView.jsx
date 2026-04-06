import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { Trophy, Users, Timer, Info, Share2, Activity, BarChart3, ChevronLeft, Volume2, Zap, Target, TrendingUp } from 'lucide-react';
import { toast } from 'react-toastify';
import io from 'socket.io-client';

const SOCKET_URL = process.env.NODE_ENV === 'production' 
    ? 'https://the-tuurf-ufkd.onrender.com' 
    : '';

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

    useEffect(() => {
        const fetchMatch = async () => {
            try {
                const res = await apiClient.get(`/matches/${id}?t=${new Date().getTime()}`);
                const matchData = res.data.match || res.data; 
                setMatch(matchData);
                setLiveData(matchData.live_data || {});
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
            if (Math.random() > 0.8) fetchPrediction();
        });

        socket.on('match:ball', (data) => {
            setLiveData(prev => ({ ...prev, ...data }));
        });

        const pollTimer = setInterval(fetchMatch, 1000);
        const predTimer = setInterval(fetchPrediction, 30000);

        return () => {
            if (socketRef.current) {
                socketRef.current.emit('leave_match', id);
                socketRef.current.disconnect();
            }
            clearInterval(pollTimer);
            clearInterval(predTimer);
        };
    }, [id, match?.status]);

    // User requested to stop auto-scrolling. 
    // By reversing the commentary log (newest at the top), 
    // we no longer need to auto-scroll to the bottom.
    /*
    useEffect(() => {
        if (activeTab === 'commentary' && commentaryEndRef.current) {
            commentaryEndRef.current.scrollIntoView({ behavior: 'auto' });
        }
    }, [liveData?.commentary_log, activeTab]);
    */

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <div className="relative mb-6">
                <div className="w-16 h-16 border-4 border-emerald-500/20 rounded-full"></div>
                <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                <Activity className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600 animate-pulse" size={24} />
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Connecting to Venue...</p>
        </div>
    );

    if (error || !match) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-6">
                <Info className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Offline</h2>
            <p className="text-slate-400 text-sm mb-10 max-w-xs">{error || "This match data is no longer available."}</p>
            <Link to="/" className="bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-emerald-700 transition-all shadow-lg">Back to Home</Link>
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
        if (ball === 'W') return 'bg-red-600 text-white';
        if (ball === '4') return 'bg-emerald-100 text-emerald-700 font-bold';
        if (ball === '6') return 'bg-emerald-600 text-white font-bold';
        if (ball === 'Wd' || ball === 'Nb') return 'bg-slate-100 text-slate-900 border border-slate-200';
        if (ball === '·') return 'bg-slate-50 text-slate-300 border border-slate-100';
        return 'bg-white text-slate-900 border border-slate-200';
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-28 selection:bg-emerald-500/30">
            {/* Minimal Header */}
            <header className="sticky top-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-100/50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-2xl transition-all font-black uppercase text-[10px] tracking-widest border border-slate-100">
                        <ChevronLeft size={18} /> Exit Arena
                    </button>
                    
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2 mb-1">
                             <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
                             <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 border-b-2 border-emerald-500/30 pb-0.5">Arena Broadcast</span>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hidden md:block">Court ID: {id.slice(-8).toUpperCase()}</p>
                    </div>

                    <div className="flex items-center gap-3">
                         <button onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            toast.success("Broadcast Link Copied");
                        }} className="hidden md:flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">
                            <Share2 size={16} /> Share Live
                        </button>
                        <button onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                        }} className="md:hidden p-3 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors border border-slate-100">
                            <Share2 size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8 lg:py-16">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                    
                    {/* LEFT COLUMN: Main Scoreboard + Players */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* PRO BROADCASTER SCOREBOARD */}
                        <div className={`relative overflow-hidden rounded-[2.5rem] md:rounded-[4rem] bg-white border border-slate-200 p-8 md:p-16 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] transition-all duration-700 ${
                            newBallFlash ? 'border-emerald-500 ring-4 ring-emerald-500/10 scale-[1.01]' : ''
                        }`}>
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full"></div>
                            
                            {/* Header Strip */}
                            <div className="flex justify-center mb-10 md:mb-20">
                                <div className="bg-slate-900 px-6 py-2 rounded-full shadow-2xl">
                                    <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-white">
                                        {match.format || 'T20'} Segment • {liveData?.inningsNum === 2 ? 'Run Chase Active' : 'First Innings'}
                                    </span>
                                </div>
                            </div>

                            {/* Score Display Area */}
                            <div className="grid grid-cols-3 gap-4 items-center mb-12 text-center relative z-10">
                                {/* Team A */}
                                <div className="flex flex-col items-center">
                                    <div className="w-16 h-16 md:w-28 md:h-28 rounded-2xl md:rounded-[2.5rem] flex items-center justify-center border-2 border-slate-50 mb-4 md:mb-8 shadow-inner transition-transform group-hover:scale-105" style={{ backgroundColor: teamAColor + '15' }}>
                                        <Users size={32} className="md:w-16 md:h-16" style={{ color: teamAColor }} />
                                    </div>
                                    <h3 className="text-sm md:text-2xl font-black uppercase text-slate-900 tracking-tight leading-none mb-2">{teamAName}</h3>
                                    {liveData?.battingTeam === 0 && (
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-full">
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                            <span className="text-[9px] font-black text-emerald-600 uppercase">Batting</span>
                                        </div>
                                    )}
                                    {liveData?.inningsNum === 2 && liveData?.battingTeam === 1 && liveData?.inn1Score !== undefined && (
                                        <p className="text-xs md:text-sm font-bold text-slate-400 mt-2">{liveData.inn1Score}/{liveData.inn1Wickets} <span className="text-[10px] opacity-50">({liveData.inn1Overs})</span></p>
                                    )}
                                </div>

                                {/* Center Score */}
                                <div className="flex flex-col items-center py-4 relative">
                                    {isMatchEnded ? (
                                        <div className="text-center animate-in zoom-in duration-500 mt-2">
                                            <div className="inline-flex p-4 rounded-full bg-yellow-100 mb-4 relative">
                                                <div className="absolute inset-0 bg-yellow-400 blur-xl opacity-40 rounded-full animate-pulse"></div>
                                                <Trophy className="text-yellow-500 relative z-10" size={50} />
                                            </div>
                                            <h4 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">{liveData?.result ? liveData.result.split(' won by ')[0] : (match?.result?.winner?.name || "Match Ended")}</h4>
                                            {liveData?.result?.includes(' won by ') && (
                                                <p className="text-[10px] md:text-xs uppercase font-black text-emerald-600 tracking-[0.2em] mt-3 bg-emerald-50 py-2 px-5 rounded-full inline-block border border-emerald-100 shadow-sm">
                                                    Won by {liveData.result.split(' won by ')[1]}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex items-baseline justify-center gap-2">
                                                <span className="text-6xl md:text-9xl font-black tracking-tighter text-slate-900 leading-none">{currentScore.runs}</span>
                                                <span className="text-3xl md:text-5xl font-black text-emerald-500">/{currentScore.wickets}</span>
                                            </div>
                                            <div className="inline-flex px-5 py-2 bg-slate-900 rounded-2xl shadow-xl">
                                                <span className="text-xs md:text-sm font-black text-white uppercase tracking-[0.2em]">{currentScore.overs} OVERS</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Team B */}
                                <div className="flex flex-col items-center">
                                    <div className="w-16 h-16 md:w-28 md:h-28 rounded-2xl md:rounded-[2.5rem] flex items-center justify-center border-2 border-slate-50 mb-4 md:mb-8 shadow-inner transition-transform group-hover:scale-105" style={{ backgroundColor: teamBColor + '15' }}>
                                        <Users size={32} className="md:w-16 md:h-16" style={{ color: teamBColor }} />
                                    </div>
                                    <h3 className="text-sm md:text-2xl font-black uppercase text-slate-900 tracking-tight leading-none mb-2">{teamBName}</h3>
                                    {liveData?.battingTeam === 1 && (
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-full">
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                            <span className="text-[9px] font-black text-emerald-600 uppercase">Batting</span>
                                        </div>
                                    )}
                                    {liveData?.inningsNum === 2 && liveData?.battingTeam === 0 && liveData?.inn1Score !== undefined && (
                                        <p className="text-xs md:text-sm font-bold text-slate-400 mt-2">{liveData.inn1Score}/{liveData.inn1Wickets} <span className="text-[10px] opacity-50">({liveData.inn1Overs})</span></p>
                                    )}
                                </div>
                            </div>

                            {/* Match Context Footer */}
                            <div className="pt-10 md:pt-16 border-t border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                                            <TrendingUp size={18} className="text-emerald-500" />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Current RR</p>
                                            <p className="text-sm md:text-lg font-black text-slate-900">{liveData?.run_rate || '0.00'}</p>
                                        </div>
                                    </div>
                                    {liveData?.target && (
                                        <div className="hidden md:flex items-center gap-3">
                                            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
                                                <Target size={18} className="text-rose-500" />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Target Score</p>
                                                <p className="text-sm md:text-lg font-black text-slate-900">{liveData.target}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="text-right">
                                     {isMatchEnded ? (
                                        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-3 rounded-xl text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-lg border border-emerald-400/50">
                                            Game Set & Match
                                        </div>
                                     ) : (
                                        <p className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                            <span className="w-2 h-2 bg-red-600 rounded-full animate-ping"></span> Live Link Sync
                                        </p>
                                     )}
                                </div>
                            </div>
                        </div>

                        {/* DESKTOP CONTENT GRID */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Batters */}
                            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
                                <div className="flex items-center justify-between mb-8">
                                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em]">Live Batting</h4>
                                    <div className="w-8 h-1 bg-emerald-500 rounded-full"></div>
                                </div>
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center p-6 bg-emerald-50 rounded-3xl border border-emerald-100/50">
                                        <div>
                                            <p className="text-sm md:text-lg font-black text-slate-900 mb-1">{liveData?.striker?.name || '—'}*</p>
                                            <div className="flex gap-4">
                                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">SR: {((liveData?.striker?.runs / (liveData?.striker?.balls || 1)) * 100).toFixed(1)}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-3xl font-black text-slate-900 leading-none">{liveData?.striker?.runs || 0}</p>
                                            <p className="text-xs font-bold text-slate-400 mt-2">({liveData?.striker?.balls || 0} balls)</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center px-6">
                                        <div>
                                            <p className="text-sm font-bold text-slate-400">{liveData?.non_striker?.name || '—'}</p>
                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Non-Striker</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-black text-slate-400 leading-none">{liveData?.non_striker?.runs || 0}</p>
                                            <p className="text-xs font-bold text-slate-300 mt-1">({liveData?.non_striker?.balls || 0})</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bowler */}
                            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
                                <div className="flex items-center justify-between mb-8">
                                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em]">Bowling End</h4>
                                    <div className="w-8 h-1 bg-red-500 rounded-full"></div>
                                </div>
                                <div className="flex flex-col h-full justify-between">
                                    <div className="text-center mb-8">
                                        <h4 className="text-lg md:text-xl font-black text-slate-900 mb-2">{liveData?.bowler?.name || 'Waiting...'}</h4>
                                        <div className="inline-flex px-4 py-1.5 bg-red-50 rounded-full">
                                            <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">{liveData?.bowler?.w || 0} Wickets Session</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-px bg-slate-100 rounded-3xl overflow-hidden border border-slate-100 shadow-inner">
                                        <div className="bg-white p-5 text-center">
                                            <span className="block text-2xl font-black text-slate-900 mb-1">{liveData?.bowler?.ov || 0}</span>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Overs</span>
                                        </div>
                                        <div className="bg-white p-5 text-center">
                                            <span className="block text-2xl font-black text-slate-900 mb-1">{liveData?.bowler?.r || 0}</span>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Runs</span>
                                        </div>
                                        <div className="bg-white p-5 text-center">
                                            <span className="block text-2xl font-black text-red-600 mb-1">{liveData?.bowler?.w || 0}</span>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Wkts</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Commentary & Stats */}
                    <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-28">
                        {/* TAB NAV FOR DESKTOP */}
                        <div className="bg-white rounded-3xl p-2 border border-slate-100 flex shadow-xl">
                            {[
                                { key: 'commentary', label: 'Feed', icon: Activity },
                                { key: 'scorecard', label: 'Card', icon: BarChart3 },
                                { key: 'overs', label: 'Overs', icon: Timer }
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
                                        activeTab === tab.key 
                                        ? 'bg-slate-900 text-white shadow-xl scale-105' 
                                        : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
                                    }`}
                                >
                                    <tab.icon size={16} /> {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* RECENT BALLS (Integrated into right rail) */}
                        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full"></div>
                            <h4 className="text-[9px] font-black uppercase text-white/30 tracking-[0.3em] mb-6">Recent Deliveries</h4>
                            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
                                {(liveData?.recent_balls || []).map((ball, i) => (
                                    <div 
                                        key={i} 
                                        className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-xs font-black transition-all ${getBallColor(ball)} ${
                                            i === liveData.recent_balls.length - 1 ? 'ring-2 ring-emerald-400 ring-offset-4 ring-offset-slate-900 scale-110 shadow-emerald-500/20 shadow-2xl' : ''
                                        }`}
                                    >
                                        {ball}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* TAB CONTENT AREA */}
                        <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {activeTab === 'commentary' && (
                                <div className="space-y-4">
                                    {(liveData?.commentary_log || []).length === 0 ? (
                                        <div className="text-center py-20 text-slate-300 bg-white rounded-[2.5rem] border border-slate-50 shadow-sm">
                                            <Volume2 size={40} className="mx-auto mb-4 opacity-20" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">Awaiting First Ball...</p>
                                        </div>
                                    ) : (
                                        [...(liveData.commentary_log || [])].reverse().map((entry, i) => (
                                            <div key={i} className={`bg-white rounded-3xl border border-slate-100 p-6 transition-all duration-500 ${i === 0 ? 'bg-emerald-50/50 border-emerald-200 shadow-lg ring-1 ring-emerald-500/10' : 'opacity-80'}`}>
                                                <div className="flex items-start gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-black ${getBallColor(entry.ball)} shadow-sm`}>
                                                        {entry.ball}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-slate-800 leading-relaxed font-outfit">{entry.text}</p>
                                                        <div className="flex items-center gap-3 mt-3">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{entry.overs} OVS</span>
                                                            <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                                                            <span className="text-[10px] font-black text-emerald-600 uppercase italic">{entry.runs}-{entry.wickets} Score</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {activeTab === 'scorecard' && (
                                <div className="space-y-6">
                                    <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
                                        <div className="p-1 overflow-x-auto no-scrollbar">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="text-[9px] font-black text-slate-300 uppercase tracking-widest border-b border-slate-50">
                                                        <th className="text-left px-6 py-5">Batter</th>
                                                        <th className="px-5 py-5 text-center">Runs</th>
                                                        <th className="px-5 py-5 text-right">SR</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {(liveData?.scorecard?.batsmen || []).map((b, i) => (
                                                        <tr key={i} className={b.batting ? 'bg-emerald-50/30' : ''}>
                                                            <td className="px-6 py-5 text-left">
                                                                <span className={`text-xs font-bold block ${b.out ? 'text-slate-300 line-through decoration-red-400/30' : 'text-slate-800'}`}>
                                                                    {b.name}{b.batting ? '*' : ''}
                                                                </span>
                                                            </td>
                                                            <td className="px-5 py-5 text-center text-xs font-black text-slate-900">{b.runs} <span className="text-[10px] font-medium text-slate-400 ml-1">({b.balls})</span></td>
                                                            <td className="px-5 py-5 text-right text-[10px] font-black text-slate-400">{b.sr}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'overs' && (
                                <div className="space-y-4">
                                   {(liveData?.over_summaries || []).length === 0 ? (
                                        <div className="text-center py-24 text-slate-200 bg-white rounded-[2.5rem]">
                                            <p className="text-[10px] font-black uppercase tracking-widest">No Over History</p>
                                        </div>
                                    ) : (
                                        [...(liveData.over_summaries || [])].reverse().map((over, i) => (
                                            <div key={i} className="bg-white border border-slate-100 rounded-[2rem] p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex items-center justify-between">
                                                    <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-xs font-black text-white shadow-xl">
                                                        #{over.over_number}
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-2xl font-black text-slate-900 leading-none">{over.runs}</p>
                                                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mt-1">Runs Scored</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 flex-wrap pt-4 border-t border-slate-50">
                                                    {(over.balls || []).map((ball, j) => (
                                                        <div key={j} className={`w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black ${getBallColor(ball)} shadow-sm`}>
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
                    </div>
                </div>
            </main>

            {/* Bottom Floating Nav */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-md z-[101]">
                <div className="bg-slate-900/90 backdrop-blur-2xl rounded-3xl p-2.5 flex items-center shadow-2xl border border-white/10">
                    <Link to="/" className="flex-1 flex flex-col items-center py-2 rounded-2xl hover:bg-white/5 transition-colors">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-white">Esc</span>
                    </Link>
                    <div className="w-px h-6 bg-white/10 mx-2"></div>
                    <Link to="/login" className="flex-[2] bg-emerald-600 px-6 py-3.5 rounded-full shadow-lg flex items-center justify-center gap-2 group hover:bg-emerald-500 transition-all">
                        <Zap size={14} className="text-white fill-white group-hover:animate-pulse" />
                        <span className="text-[10px] font-black uppercase text-white tracking-widest">Management</span>
                    </Link>
                    <div className="w-px h-6 bg-white/10 mx-2"></div>
                    <button 
                         onClick={() => window.scrollTo({ top: 0, behavior: 'auto' })}
                         className="flex-1 flex items-center justify-center p-2 rounded-2xl hover:bg-white/5 transition-colors"
                    >
                        <TrendingUp size={16} className="text-white/40" />
                    </button>
                </div>
            </div>
        </div>
    );
}
