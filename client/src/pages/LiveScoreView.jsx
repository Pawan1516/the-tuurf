import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { Trophy, Users, Timer, Info, Share2, Activity, BarChart3 } from 'lucide-react';
import io from 'socket.io-client';

const SOCKET_URL = process.env.NODE_ENV === 'production' 
    ? 'https://the-turf-in.onrender.com' 
    : 'http://localhost:5001';

export default function LiveScoreView() {
    const { id } = useParams();
    const [match, setMatch] = useState(null);
    const [liveData, setLiveData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('commentary'); // commentary, scorecard, overs
    const [newBallFlash, setNewBallFlash] = useState(false);
    const socketRef = useRef(null);
    const commentaryEndRef = useRef(null);

    // Initial fetch + Socket.IO connection
    useEffect(() => {
        const fetchMatch = async () => {
            try {
                const res = await apiClient.get(`/matches/${id}`);
                setMatch(res.data);
                setLiveData(res.data.live_data || {});
            } catch (err) {
                setError("Match not found or private.");
            } finally {
                setLoading(false);
            }
        };

        fetchMatch();

        // Connect Socket.IO
        const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('🟢 Connected to live stream');
            socket.emit('join_match', id);
        });

        // Listen for real-time ball updates
        socket.on('match:update', (data) => {
            setLiveData(prev => ({ ...prev, ...data }));
            setNewBallFlash(true);
            setTimeout(() => setNewBallFlash(false), 800);
        });

        socket.on('match:ball', (data) => {
            setLiveData(prev => ({ ...prev, ...data }));
        });

        socket.on('disconnect', () => {
            console.log('🔴 Disconnected from live stream');
        });

        // Fallback polling every 10s
        const pollTimer = setInterval(fetchMatch, 10000);

        return () => {
            socket.emit('leave_match', id);
            socket.disconnect();
            clearInterval(pollTimer);
        };
    }, [id]);

    if (loading) return (
        <div className="min-h-screen bg-[#0A0F0A] flex flex-col items-center justify-center text-white p-6">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-emerald-400 font-bold tracking-widest uppercase text-xs">Connecting to Live Stream...</p>
        </div>
    );

    if (error || !match) return (
        <div className="min-h-screen bg-[#0A0F0A] flex flex-col items-center justify-center text-white p-6 text-center">
            <Info className="w-12 h-12 text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Match Unavailable</h2>
            <p className="text-gray-400 text-sm mb-6">{error || "This match might have ended or hasn't started yet."}</p>
            <Link to="/" className="bg-emerald-600 px-8 py-3 rounded-xl font-bold uppercase text-xs tracking-widest">Back Home</Link>
        </div>
    );

    const score = liveData?.scorecard?.total || { runs: liveData?.runs || 0, wickets: liveData?.wickets || 0, overs: '0.0' };
    const isMatchEnded = match.status === 'Completed' || liveData?.phase === 'match_result';
    const teamAName = match.team_a?.team_id?.name || match.quick_teams?.team_a?.name || 'Team A';
    const teamBName = match.team_b?.team_id?.name || match.quick_teams?.team_b?.name || 'Team B';
    const teamAColor = match.quick_teams?.team_a?.colour || '#3b82f6';
    const teamBColor = match.quick_teams?.team_b?.colour || '#ef4444';

    const getBallColor = (ball) => {
        if (ball === 'W') return 'bg-red-500 border-red-400 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]';
        if (ball === '4') return 'bg-blue-600 border-blue-400 text-white';
        if (ball === '6') return 'bg-orange-500 border-orange-400 text-white shadow-[0_0_12px_rgba(249,115,22,0.5)]';
        if (ball === 'Wd' || ball === 'Nb') return 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400';
        if (ball === '·') return 'bg-white/5 border-white/10 text-white/30';
        return 'bg-white/10 border-white/20 text-white/60';
    };

    return (
        <div className="min-h-screen bg-[#0A0F0A] text-white font-sans overflow-x-hidden pb-24">
            {/* Sticky Header */}
            <header className="sticky top-0 z-50 bg-[#0A0F0A]/95 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {!isMatchEnded && (
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                        )}
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                            {isMatchEnded ? 'Match Ended' : 'Live Scorecard'}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[9px] font-bold text-emerald-400/60 uppercase">
                            {match.format || 'T20'} • {liveData?.inningsNum === 2 ? '2nd Inn' : '1st Inn'}
                        </span>
                        <button onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            alert("Link copied!");
                        }} className="p-2 bg-white/5 rounded-lg border border-white/10 text-white/40 hover:text-white transition-colors">
                            <Share2 size={14} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
                {/* Score Card — Main */}
                <div className={`relative overflow-hidden rounded-[2rem] p-6 border transition-all duration-500 ${
                    newBallFlash ? 'border-emerald-500/60 shadow-[0_0_30px_rgba(16,185,129,0.15)]' : 'border-white/10'
                } bg-gradient-to-br from-emerald-950/40 to-[#0A0F0A]`}>
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"></div>

                    {/* Teams */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10" style={{ backgroundColor: teamAColor + '20' }}>
                                <Users size={18} style={{ color: teamAColor }} />
                            </div>
                            <div>
                                <p className="text-sm font-black uppercase tracking-tight">{teamAName}</p>
                                {liveData?.inn1_scorecard && (
                                    <p className="text-[10px] font-bold text-white/30">{liveData.inn1_scorecard.score}/{liveData.inn1_scorecard.wickets} ({liveData.inn1_scorecard.overs})</p>
                                )}
                            </div>
                        </div>
                        <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                            <span className="text-[9px] font-bold text-white/30 uppercase">VS</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div>
                                <p className="text-sm font-black uppercase tracking-tight text-right">{teamBName}</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10" style={{ backgroundColor: teamBColor + '20' }}>
                                <Users size={18} style={{ color: teamBColor }} />
                            </div>
                        </div>
                    </div>

                    {/* Main Score */}
                    {isMatchEnded ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-center gap-3 mb-4">
                            <Trophy size={18} className="text-yellow-400" />
                            <span className="text-sm font-bold text-emerald-100">{liveData?.result || 'Match Completed'}</span>
                        </div>
                    ) : (
                        <div className="text-center mb-4">
                            <div className="text-5xl font-black tracking-tighter text-white leading-none">
                                {score.runs}<span className="text-white/20 text-3xl mx-1">/</span><span className="text-emerald-500 text-3xl">{score.wickets}</span>
                            </div>
                            <p className="text-sm font-bold text-white/30 mt-1">
                                ({score.overs || liveData?.overs || '0.0'} Overs)
                            </p>
                        </div>
                    )}

                    {/* Target Info (2nd Innings) */}
                    {liveData?.target && !isMatchEnded && (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between text-center mb-4">
                            <div>
                                <p className="text-lg font-black text-yellow-400">{liveData.runs_needed}</p>
                                <p className="text-[8px] font-bold text-white/20 uppercase tracking-wider">Runs Needed</p>
                            </div>
                            <div>
                                <p className="text-lg font-black text-emerald-400">{liveData.balls_remaining}</p>
                                <p className="text-[8px] font-bold text-white/20 uppercase tracking-wider">Balls Left</p>
                            </div>
                            <div>
                                <p className="text-lg font-black text-blue-400">{liveData.required_run_rate}</p>
                                <p className="text-[8px] font-bold text-white/20 uppercase tracking-wider">Req. RR</p>
                            </div>
                        </div>
                    )}

                    {/* Run Rate + Partnership */}
                    <div className="flex items-center justify-between text-center gap-3">
                        <div className="flex-1 bg-white/5 rounded-xl p-2.5 border border-white/5">
                            <p className="text-sm font-black text-emerald-400">{liveData?.run_rate || '0.00'}</p>
                            <p className="text-[8px] font-bold text-white/20 uppercase tracking-wider">CRR</p>
                        </div>
                        <div className="flex-1 bg-white/5 rounded-xl p-2.5 border border-white/5">
                            <p className="text-sm font-black text-white/60">{liveData?.partnership?.runs || 0} ({liveData?.partnership?.balls || 0})</p>
                            <p className="text-[8px] font-bold text-white/20 uppercase tracking-wider">Partnership</p>
                        </div>
                    </div>
                </div>

                {/* Active Batsmen & Bowler Strip */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/10">
                            <p className="text-[9px] font-bold text-emerald-400/60 uppercase tracking-widest mb-1">🏏 On Strike</p>
                            <p className="text-sm font-black truncate">{liveData?.striker?.name || '—'}</p>
                            <p className="text-base font-black text-emerald-400">
                                {liveData?.striker?.runs || 0}<span className="text-[10px] text-white/30 ml-1">({liveData?.striker?.balls || 0})</span>
                            </p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1">Non-Striker</p>
                            <p className="text-sm font-black truncate text-white/60">{liveData?.non_striker?.name || '—'}</p>
                            <p className="text-base font-black text-white/40">
                                {liveData?.non_striker?.runs || 0}<span className="text-[10px] text-white/20 ml-1">({liveData?.non_striker?.balls || 0})</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <div>
                            <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">🎳 Bowler</p>
                            <p className="text-xs font-bold text-emerald-400">{liveData?.bowler?.name || 'Waiting...'}</p>
                        </div>
                        <div className="flex gap-4 text-right">
                            <div>
                                <p className="text-xs font-black text-white/60">{liveData?.bowler?.w || 0}-{liveData?.bowler?.r || 0}</p>
                                <p className="text-[8px] font-bold text-white/20 uppercase">Fig</p>
                            </div>
                            <div>
                                <p className="text-xs font-black text-white/60">{liveData?.bowler?.eco || '0.0'}</p>
                                <p className="text-[8px] font-bold text-white/20 uppercase">Eco</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Balls (This Over) */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 mb-3">This Over</p>
                    <div className="flex gap-2 flex-wrap">
                        {(liveData?.recent_balls || []).length > 0 ? liveData.recent_balls.map((ball, i) => (
                            <div key={i} className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black border transition-all ${getBallColor(ball)} ${i === liveData.recent_balls.length - 1 && newBallFlash ? 'scale-125' : ''}`}>
                                {ball}
                            </div>
                        )) : <p className="text-xs text-white/20 italic">No balls delivered yet</p>}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-white/5 rounded-2xl p-1 border border-white/10">
                    {[
                        { key: 'commentary', label: 'Commentary', icon: Activity },
                        { key: 'scorecard', label: 'Scorecard', icon: BarChart3 },
                        { key: 'overs', label: 'Overs', icon: Timer }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                activeTab === tab.key ? 'bg-emerald-600 text-white shadow-lg' : 'text-white/30 hover:text-white/60'
                            }`}
                        >
                            <tab.icon size={12} /> {tab.label}
                        </button>
                    ))}
                </div>

                {/* Commentary Tab */}
                {activeTab === 'commentary' && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 max-h-[400px] overflow-y-auto">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 sticky top-0 bg-[#0A0F0A] pb-2">Ball-by-Ball Commentary</h4>
                        {(liveData?.commentary_log || []).length === 0 ? (
                            <p className="text-xs text-white/20 italic text-center py-8">Commentary will appear here when the match starts</p>
                        ) : (
                            liveData.commentary_log.map((entry, i) => (
                                <div key={i} className={`flex gap-3 p-3 rounded-xl border transition-all ${
                                    i === 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/5 border-white/5'
                                }`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 border ${getBallColor(entry.ball)}`}>
                                        {entry.ball}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-white/80 leading-relaxed">{entry.text}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[9px] font-bold text-white/20">{entry.overs} ov</span>
                                            <span className="text-[9px] font-bold text-emerald-400/40">{entry.runs}/{entry.wickets}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={commentaryEndRef} />
                    </div>
                )}

                {/* Scorecard Tab */}
                {activeTab === 'scorecard' && (
                    <div className="space-y-4">
                        {/* Batting */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                            <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Batting</h4>
                                <span className="text-[9px] font-bold text-white/20">{score.runs}/{score.wickets} ({score.overs || liveData?.overs})</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="text-[8px] font-black text-white/20 uppercase tracking-widest border-b border-white/5">
                                            <th className="text-left px-4 py-2">Batter</th>
                                            <th className="px-2 py-2">R</th>
                                            <th className="px-2 py-2">B</th>
                                            <th className="px-2 py-2">4s</th>
                                            <th className="px-2 py-2">6s</th>
                                            <th className="px-2 py-2">SR</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(liveData?.scorecard?.batsmen || []).map((b, i) => (
                                            <tr key={i} className={`border-b border-white/5 ${b.batting ? 'bg-emerald-500/5' : ''}`}>
                                                <td className="px-4 py-2.5 font-bold flex items-center gap-1.5">
                                                    {b.batting && <span className="text-emerald-400">🏏</span>}
                                                    <span className={b.out ? 'text-white/30' : 'text-white'}>{b.name}</span>
                                                    {b.out && <span className="text-[8px] text-red-400/60 ml-auto">out</span>}
                                                </td>
                                                <td className="px-2 py-2.5 text-center font-black">{b.runs}</td>
                                                <td className="px-2 py-2.5 text-center text-white/40">{b.balls}</td>
                                                <td className="px-2 py-2.5 text-center text-blue-400">{b.fours}</td>
                                                <td className="px-2 py-2.5 text-center text-orange-400">{b.sixes}</td>
                                                <td className="px-2 py-2.5 text-center text-white/40">{b.sr}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Extras */}
                            {liveData?.scorecard?.extras && (
                                <div className="px-4 py-2 border-t border-white/5 text-[10px] font-bold text-white/30">
                                    Extras: <span className="text-white/50">W {liveData.scorecard.extras.wides} • NB {liveData.scorecard.extras.noballs} • B {liveData.scorecard.extras.byes}</span>
                                </div>
                            )}
                        </div>

                        {/* Bowling */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                            <div className="px-4 py-3 border-b border-white/5">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">Bowling</h4>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="text-[8px] font-black text-white/20 uppercase tracking-widest border-b border-white/5">
                                            <th className="text-left px-4 py-2">Bowler</th>
                                            <th className="px-2 py-2">O</th>
                                            <th className="px-2 py-2">R</th>
                                            <th className="px-2 py-2">W</th>
                                            <th className="px-2 py-2">ECO</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(liveData?.scorecard?.bowlers || []).map((bw, i) => (
                                            <tr key={i} className="border-b border-white/5">
                                                <td className="px-4 py-2.5 font-bold">{bw.name}</td>
                                                <td className="px-2 py-2.5 text-center text-white/40">{bw.overs}</td>
                                                <td className="px-2 py-2.5 text-center">{bw.runs}</td>
                                                <td className="px-2 py-2.5 text-center font-black text-emerald-400">{bw.wickets}</td>
                                                <td className="px-2 py-2.5 text-center text-white/40">{bw.eco}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* 1st Innings Scorecard (if available) */}
                        {liveData?.inn1_scorecard && (
                            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                                <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400">1st Innings</h4>
                                    <span className="text-[9px] font-bold text-white/30">{liveData.inn1_scorecard.score}/{liveData.inn1_scorecard.wickets} ({liveData.inn1_scorecard.overs})</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="text-[8px] font-black text-white/20 uppercase tracking-widest border-b border-white/5">
                                                <th className="text-left px-4 py-2">Batter</th>
                                                <th className="px-2 py-2">R</th>
                                                <th className="px-2 py-2">B</th>
                                                <th className="px-2 py-2">SR</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {liveData.inn1_scorecard.batsmen.map((b, i) => (
                                                <tr key={i} className="border-b border-white/5">
                                                    <td className="px-4 py-2 font-bold text-white/60">{b.name}</td>
                                                    <td className="px-2 py-2 text-center">{b.runs}</td>
                                                    <td className="px-2 py-2 text-center text-white/30">{b.balls}</td>
                                                    <td className="px-2 py-2 text-center text-white/30">{b.sr}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Overs Tab */}
                {activeTab === 'overs' && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Over-by-Over Summary</h4>
                        {(liveData?.over_summaries || []).length === 0 ? (
                            <p className="text-xs text-white/20 italic text-center py-8">Over summaries will appear after each over</p>
                        ) : (
                            [...(liveData.over_summaries || [])].reverse().map((over, i) => (
                                <div key={i} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/5">
                                    <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20">
                                        <span className="text-[10px] font-black text-emerald-400">{over.over_number}</span>
                                    </div>
                                    <div className="flex gap-1.5 flex-1 flex-wrap">
                                        {(over.balls || []).map((ball, j) => (
                                            <div key={j} className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black border ${getBallColor(ball)}`}>
                                                {ball}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-white/60">{over.runs}</p>
                                        <p className="text-[8px] font-bold text-white/20 uppercase">Runs</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </main>

            {/* Bottom Navigation */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-[#0A0F0A]/90 backdrop-blur-xl border border-white/10 rounded-full flex items-center gap-6 shadow-2xl z-50">
                <Link to="/" className="text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-emerald-400 transition-colors">Home</Link>
                <div className="w-px h-3 bg-white/10"></div>
                <Link to="/login" className="text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-emerald-400 transition-colors">Dashboard</Link>
            </div>
        </div>
    );
}
