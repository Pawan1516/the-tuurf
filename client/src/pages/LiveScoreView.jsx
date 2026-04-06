import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { Trophy, Users, Timer, Info, Share2, Activity, BarChart3, ChevronLeft, Volume2, Zap, Target, TrendingUp } from 'lucide-react';
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
            <header className="sticky top-0 z-[100] bg-white/95 backdrop-blur-xl border-b border-slate-100 shadow-sm">
                <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="p-2 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                        <ChevronLeft size={24} />
                    </button>
                    
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5">THE TURF ARENA</span>
                        {!isMatchEnded ? (
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></div>
                                <span className="text-[11px] font-black uppercase text-red-600 tracking-tight">🔴 Tracking Live</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5">
                                <Trophy size={11} className="text-emerald-600" />
                                <span className="text-[11px] font-black uppercase text-emerald-600 tracking-tight">Match Final</span>
                            </div>
                        )}
                    </div>

                    <button onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        alert("Link Copied!");
                    }} className="p-2 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                        <Share2 size={20} />
                    </button>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                
                {/* PRO BROADCASTER SCOREBOARD */}
                <div className={`relative overflow-hidden rounded-[2rem] bg-white border border-slate-200 p-8 shadow-xl shadow-slate-200/50 transition-all duration-700 ${
                    newBallFlash ? 'border-emerald-500 scale-[1.01]' : ''
                }`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full"></div>
                    
                    {/* Header Strip */}
                    <div className="flex justify-center mb-8">
                        <div className="bg-slate-900 px-4 py-1 rounded-full">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white">
                                {match.format || 'T20'} • {liveData?.inningsNum === 2 ? '2nd Innings' : '1st Innings'}
                            </span>
                        </div>
                    </div>

                    {/* Score Display Area */}
                    <div className="grid grid-cols-3 gap-4 items-center mb-8 text-center">
                        {/* Team A */}
                        <div className="flex flex-col items-center">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center border-2 border-slate-50 mb-3 shadow-inner" style={{ backgroundColor: teamAColor + '10' }}>
                                <Users size={24} style={{ color: teamAColor }} />
                            </div>
                            <h3 className="text-xs font-black uppercase text-slate-800 leading-tight mb-1">{teamAName}</h3>
                            {/* Render score if Team A is batting currently */}
                            {liveData?.battingTeam === 0 && (
                                <p className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md mt-1">Batting</p>
                            )}
                            {/* Render 1st Innings score if Team A batted first */}
                            {liveData?.inningsNum === 2 && liveData?.battingTeam === 1 && liveData?.inn1Score !== undefined && (
                                <p className="text-xs font-bold text-slate-500 mt-1">{liveData.inn1Score}/{liveData.inn1Wickets} <span className="text-[9px]">({liveData.inn1Overs} ov)</span></p>
                            )}
                        </div>

                        {/* Center Score */}
                        <div className="flex flex-col items-center py-2 relative">
                            {isMatchEnded ? (
                                <div className="text-center">
                                    <Trophy className="text-yellow-500 mx-auto mb-2" size={28} />
                                    <h4 className="text-sm font-black text-slate-900 uppercase">Final</h4>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-5xl font-black tracking-tighter text-slate-900">{currentScore.runs}</span>
                                        <span className="text-2xl font-black text-emerald-600">/{currentScore.wickets}</span>
                                    </div>
                                    <div className="mt-2 px-3 py-1 bg-emerald-50 rounded-lg">
                                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">{currentScore.overs} OVS</span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Team B */}
                        <div className="flex flex-col items-center">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center border-2 border-slate-50 mb-3 shadow-inner" style={{ backgroundColor: teamBColor + '10' }}>
                                <Users size={24} style={{ color: teamBColor }} />
                            </div>
                            <h3 className="text-xs font-black uppercase text-slate-800 leading-tight mb-1">{teamBName}</h3>
                            {/* Render score if Team B is batting currently */}
                            {liveData?.battingTeam === 1 && (
                                <p className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md mt-1">Batting</p>
                            )}
                            {/* Render 1st Innings score if Team B batted first */}
                            {liveData?.inningsNum === 2 && liveData?.battingTeam === 0 && liveData?.inn1Score !== undefined && (
                                <p className="text-xs font-bold text-slate-500 mt-1">{liveData.inn1Score}/{liveData.inn1Wickets} <span className="text-[9px]">({liveData.inn1Overs} ov)</span></p>
                            )}
                        </div>
                    </div>

                    {/* Match Context Footer */}
                    <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={14} className="text-emerald-500" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Run Rate: <span className="text-slate-900">{liveData?.run_rate || '0.00'}</span></span>
                        </div>
                        {isMatchEnded ? (
                            <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">{liveData?.result || 'Ended'}</span>
                        ) : liveData?.target ? (
                            <div className="flex items-center gap-2">
                                <Target size={14} className="text-red-500" />
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Target: <span className="text-slate-900">{liveData.target}</span></span>
                            </div>
                        ) : (
                             <span className="text-[10px] font-black uppercase text-slate-300 tracking-[0.2em]">{match.venue || 'The Turf Arena'}</span>
                        )}
                    </div>
                </div>

                 {/* TARGET TRACKER (If active) */}
                 {liveData?.target && !isMatchEnded && (
                    <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Required Target</span>
                            <span className="text-xs font-black text-white/40 uppercase tracking-widest leading-none">RR: {liveData.required_run_rate}</span>
                        </div>
                        <div className="flex items-end gap-3 px-1">
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black text-white">{liveData.runs_needed}</span>
                                <span className="text-xs font-bold text-white/40 uppercase">Runs</span>
                            </div>
                            <div className="mb-1">
                                <span className="text-[10px] font-bold text-white/20 uppercase mx-2 tracking-widest">IN</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black text-white">{liveData.balls_remaining}</span>
                                <span className="text-xs font-bold text-white/40 uppercase">Balls</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ACTIVE BATTERS & BOWLER */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Batters */}
                    <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Batting</h4>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                <div>
                                    <p className="text-xs font-black text-slate-900 mb-0.5">{liveData?.striker?.name || '—'}*</p>
                                    <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">SR: {((liveData?.striker?.runs / (liveData?.striker?.balls || 1)) * 100).toFixed(1)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-black text-slate-900 leading-none">{liveData?.striker?.runs || 0}</p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1">({liveData?.striker?.balls || 0})</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-center px-4">
                                <p className="text-xs font-bold text-slate-400">{liveData?.non_striker?.name || '—'}</p>
                                <div className="text-right">
                                    <p className="text-sm font-black text-slate-400 leading-none">{liveData?.non_striker?.runs || 0} <span className="text-[10px] font-bold ml-1">({liveData?.non_striker?.balls || 0})</span></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bowler */}
                    <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-1.5 h-4 bg-red-500 rounded-full"></div>
                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Current Bowler</h4>
                        </div>
                        <div className="text-center mb-6">
                            <h4 className="text-sm font-black text-slate-900 mb-1">{liveData?.bowler?.name || 'Waiting...'}</h4>
                            <div className="inline-flex px-3 py-1 bg-red-50 rounded-full">
                                <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">{liveData?.bowler?.w || 0} Wkts • ECO {liveData?.bowler?.eco || '0.0'}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-px bg-slate-100 rounded-2xl p-px overflow-hidden">
                            <div className="bg-white p-3 text-center">
                                <span className="block text-xl font-black text-slate-900 leading-none mb-1">{liveData?.bowler?.r || 0}</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Runs</span>
                            </div>
                            <div className="bg-white p-3 text-center">
                                <span className="block text-xl font-black text-slate-900 leading-none mb-1">{liveData?.bowler?.w || 0}</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Wkts</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RECENT BALLS TIMELINE */}
                <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Recent Deliveries</h4>
                        <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-500 uppercase">
                            <Activity size={12} />
                            Live Hub
                        </div>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {(liveData?.recent_balls || []).map((ball, i) => (
                            <div 
                                key={i} 
                                className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black transition-all ${getBallColor(ball)} ${
                                    i === liveData.recent_balls.length - 1 ? 'ring-2 ring-emerald-500 ring-offset-2 scale-110' : ''
                                }`}
                            >
                                {ball}
                            </div>
                        ))}
                    </div>
                </div>

                {/* AI INSIGHTS (CLEANED UP) */}
                {!isMatchEnded && prediction && (
                    <div className="bg-emerald-50 rounded-[2rem] p-6 border border-emerald-100">
                        <div className="flex items-center gap-2 mb-4">
                            <Zap size={14} className="text-emerald-500 fill-emerald-500" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Smart Match Insight</h4>
                        </div>
                        <div className="flex items-start justify-between gap-6">
                            <div className="flex-1">
                                <h4 className="text-lg font-black text-slate-900 mb-2 leading-tight">
                                    <span className="text-emerald-700">{prediction.winner}</span> favored with {prediction.probability}
                                </h4>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium italic">"{prediction.reason}"</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* CONTENT TABS */}
                <div className="bg-white rounded-full p-1.5 border border-slate-200 flex shadow-sm">
                    {[
                        { key: 'commentary', label: 'Home', icon: Activity },
                        { key: 'scorecard', label: 'Scorecard', icon: BarChart3 },
                        { key: 'overs', label: 'Stats', icon: Timer }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                                activeTab === tab.key 
                                ? 'bg-slate-900 text-white shadow-lg' 
                                : 'text-slate-400 hover:text-slate-900'
                            }`}
                        >
                            <tab.icon size={14} /> {tab.label}
                        </button>
                    ))}
                </div>

                {/* TAB CONTENT AREA */}
                <div className="min-h-[400px]">
                    {activeTab === 'commentary' && (
                        <div className="space-y-3">
                            {(liveData?.commentary_log || []).length === 0 ? (
                                <div className="text-center py-20 text-slate-300">
                                    <Volume2 size={40} className="mx-auto mb-4 opacity-20" />
                                    <p className="text-xs font-bold uppercase tracking-widest">Waiting for first delivery...</p>
                                </div>
                            ) : (
                                [...(liveData.commentary_log || [])].reverse().map((entry, i) => (
                                    <div key={i} className={`bg-white rounded-2xl border border-slate-100 p-4 transition-all ${i === 0 ? 'bg-emerald-50/50 border-emerald-200 shadow-md ring-1 ring-emerald-500/20' : 'opacity-80'}`}>
                                        <div className="flex items-start gap-4">
                                            <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-[10px] font-black ${getBallColor(entry.ball)}`}>
                                                {entry.ball}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13px] font-bold text-slate-800 leading-normal">{entry.text}</p>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{entry.overs} OVS</span>
                                                    <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                                                    <span className="text-[9px] font-black text-emerald-600 uppercase">{entry.runs}-{entry.wickets}</span>
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
                            {/* Batting */}
                            <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                                    <h4 className="text-[10px] font-black uppercase text-slate-800 tracking-widest">Innings Summary</h4>
                                    <span className="text-xs font-black text-emerald-600">{currentScore.runs}/{currentScore.wickets}</span>
                                </div>
                                <div className="p-1 overflow-x-auto no-scrollbar">
                                    <table className="w-full text-center">
                                        <thead>
                                            <tr className="text-[9px] font-black text-slate-300 uppercase tracking-widest border-b border-slate-50">
                                                <th className="text-left px-5 py-4">Batter</th>
                                                <th className="px-2 py-4">R</th>
                                                <th className="px-2 py-4">B</th>
                                                <th className="px-2 py-4">4s/6s</th>
                                                <th className="px-5 py-4 text-right">SR</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {(liveData?.scorecard?.batsmen || []).map((b, i) => (
                                                <tr key={i} className={b.batting ? 'bg-emerald-50/30' : ''}>
                                                    <td className="px-5 py-4 text-left">
                                                        <span 
                                                            onClick={() => b.user_id && navigate(`/player/${b.user_id}`)}
                                                            className={`text-xs font-bold block ${b.out ? 'text-slate-300' : 'text-slate-800'} ${b.user_id ? 'cursor-pointer hover:text-emerald-600' : ''}`}
                                                        >
                                                            {b.name}{b.batting ? '*' : ''}
                                                            {b.out && <span className="block text-[8px] font-medium text-red-400 mt-0.5 uppercase tracking-tighter">out</span>}
                                                        </span>
                                                    </td>
                                                    <td className="px-2 py-4 text-xs font-black text-slate-800">{b.runs}</td>
                                                    <td className="px-2 py-4 text-[10px] font-medium text-slate-400">{b.balls}</td>
                                                    <td className="px-2 py-4 text-[10px] font-medium text-slate-500">{b.fours}/{b.sixes}</td>
                                                    <td className="px-5 py-4 text-right text-[10px] font-black text-slate-400">{b.sr}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Bowling */}
                            <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                                    <h4 className="text-[10px] font-black uppercase text-slate-800 tracking-widest">Bowling Performance</h4>
                                </div>
                                <div className="p-1 overflow-x-auto no-scrollbar">
                                    <table className="w-full text-center">
                                        <thead>
                                            <tr className="text-[9px] font-black text-slate-300 uppercase tracking-widest border-b border-slate-50">
                                                <th className="text-left px-5 py-4">Bowler</th>
                                                <th className="px-2 py-4">O</th>
                                                <th className="px-2 py-4">R</th>
                                                <th className="px-2 py-4">W</th>
                                                <th className="px-5 py-4 text-right">ECO</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {(liveData?.scorecard?.bowlers || []).map((bw, i) => (
                                                <tr key={i}>
                                                    <td className="px-5 py-4 text-left text-xs font-bold text-slate-800">{bw.name}</td>
                                                    <td className="px-2 py-4 text-xs font-medium text-slate-400">{bw.overs}</td>
                                                    <td className="px-2 py-4 text-xs font-black text-slate-800">{bw.runs}</td>
                                                    <td className="px-2 py-4 text-xs font-black text-red-600">{bw.wickets}</td>
                                                    <td className="px-5 py-4 text-right text-[10px] font-black text-slate-400">{bw.eco}</td>
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
                                <div className="text-center py-20 text-slate-200">
                                    <p className="text-[10px] font-black uppercase tracking-widest">Waiting for over completion...</p>
                                </div>
                            ) : (
                                [...(liveData.over_summaries || [])].reverse().map((over, i) => (
                                    <div key={i} className="bg-white border border-slate-100 rounded-3xl p-5 flex flex-col gap-4 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-[10px] font-black text-white">
                                                    #{over.over_number}
                                                </div>
                                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Over Summary</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-black text-slate-900 leading-none">{over.runs}</p>
                                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Scored</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2.5 flex-wrap pt-4 border-t border-slate-50">
                                            {(over.balls || []).map((ball, j) => (
                                                <div key={j} className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${getBallColor(ball)}`}>
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
