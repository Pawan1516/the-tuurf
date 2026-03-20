import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { Trophy, Users, Timer, Info, Share2 } from 'lucide-react';

export default function LiveScoreView() {
    const { id } = useParams();
    const [match, setMatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchMatch = async () => {
            try {
                const res = await apiClient.get(`/matches/${id}`);
                setMatch(res.data);
            } catch (err) {
                setError("Match not found or private.");
            } finally {
                setLoading(false);
            }
        };

        fetchMatch();
        const timer = setInterval(fetchMatch, 15000); // Poll every 15s for "Live" updates
        return () => clearInterval(timer);
    }, [id]);

    if (loading) return (
        <div className="min-h-screen bg-[#0D1B0F] flex flex-col items-center justify-center text-white p-6">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-emerald-400 font-bold tracking-widest uppercase text-xs">Loading Live Stream...</p>
        </div>
    );

    if (error || !match) return (
        <div className="min-h-screen bg-[#0D1B0F] flex flex-col items-center justify-center text-white p-6 text-center">
            <Info className="w-12 h-12 text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Match Unavailable</h2>
            <p className="text-gray-400 text-sm mb-6">{error || "This match might have ended or hasn't started yet."}</p>
            <Link to="/" className="bg-emerald-600 px-8 py-3 rounded-xl font-bold uppercase text-xs tracking-widest">Back Home</Link>
        </div>
    );

    const teamA = match.team_a?.team_id?.name || match.quick_teams?.team_a?.name || "Team A";
    const teamB = match.team_b?.team_id?.name || match.quick_teams?.team_b?.name || "Team B";
    const scoreA = match.team_a?.score || 0;
    const wicketsA = match.team_a?.wickets || 0;
    const oversA = match.team_a?.overs_played || '0.0';

    const isMatchEnded = match.status === 'COMPLETED';
    const resultText = match.result?.winner ? `${match.result.winner.name} won by ${match.result.margin}` : "Match in Progress";

    return (
        <div className="min-h-screen bg-[#0D1B0F] text-white font-sans overflow-x-hidden pb-20">
            {/* Header */}
            <header className="p-4 flex items-center justify-between border-b border-white/5 bg-[#0D1B0F]/80 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Live Scorecard</span>
                </div>
                <button onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    alert("Link copied!");
                }} className="p-2 bg-white/5 rounded-lg border border-white/10 text-white/40 hover:text-white transition-colors">
                    <Share2 size={16} />
                </button>
            </header>

            <main className="max-w-md mx-auto p-4 space-y-4">
                {/* Match Header Card */}
                <div className="bg-emerald-950/40 border border-emerald-500/20 rounded-[2rem] p-6 text-center relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"></div>
                    
                    <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mb-6 opacity-60">
                        {match.format || "T20"} • {match.venue || "The Turf Arena"}
                    </p>

                    <div className="flex items-center justify-between gap-4 mb-8">
                        <div className="flex-1 text-center">
                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/10 group-hover:border-emerald-500/50 transition-colors">
                                <Users className="text-emerald-400" size={24} />
                            </div>
                            <h3 className="text-xs font-black uppercase tracking-tight line-clamp-2">{teamA}</h3>
                        </div>
                        
                        <div className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full">
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">VS</span>
                        </div>

                        <div className="flex-1 text-center">
                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/10 group-hover:border-emerald-500/50 transition-colors">
                                <Users className="text-emerald-400" size={24} />
                            </div>
                            <h3 className="text-xs font-black uppercase tracking-tight line-clamp-2">{teamB}</h3>
                        </div>
                    </div>

                    {isMatchEnded ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-center gap-3">
                            <Trophy size={18} className="text-yellow-400" />
                            <span className="text-sm font-bold text-emerald-100">{resultText}</span>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <div className="text-5xl font-black tracking-tighter text-white">
                                {scoreA}<span className="text-white/30 text-3xl font-bold ml-1">/</span><span className="text-emerald-500 text-3xl font-bold ml-1">{wicketsA}</span>
                            </div>
                            <p className="text-xs font-bold text-white/40 uppercase tracking-widest">
                                {oversA} <span className="text-[10px] opacity-50">Overs</span>
                            </p>
                        </div>
                    )}
                </div>

                {/* Status Ticker */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Timer size={16} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none mb-1">Innings Progress</p>
                        <p className="text-xs font-bold text-emerald-400">{match.status === 'LIVE' ? "Match is currently Live" : match.status}</p>
                    </div>
                </div>

                {/* Scoreboard Details */}
                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Active Partnership</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-2">On Strike</p>
                            <p className="text-sm font-black truncate">{match.live_data?.striker?.name || "—"}</p>
                            <p className="text-lg font-bold text-emerald-400">{match.live_data?.striker?.runs || 0}<span className="text-[10px] text-white/40 ml-1">({match.live_data?.striker?.balls || 0})</span></p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-2">Non-Striker</p>
                            <p className="text-sm font-black truncate">{match.live_data?.non_striker?.name || "—"}</p>
                            <p className="text-lg font-bold text-white/60">{match.live_data?.non_striker?.runs || 0}<span className="text-[10px] text-white/40 ml-1">({match.live_data?.non_striker?.balls || 0})</span></p>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                        <div>
                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1">Current Bowler</p>
                            <p className="text-xs font-bold text-emerald-400">{match.live_data?.bowler?.name || "Waiting..."}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1">Economy</p>
                            <p className="text-xs font-bold text-white">{match.live_data?.bowler?.eco || "0.0"}</p>
                        </div>
                    </div>
                </div>

                {/* Recent Balls */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-4">Last 6 Balls</p>
                    <div className="flex gap-2">
                        {match.live_data?.recent_balls?.map((ball, i) => (
                            <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border ${
                                ball === 'W' ? 'bg-red-500 border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 
                                ball === '4' ? 'bg-blue-600 border-blue-400' :
                                ball === '6' ? 'bg-orange-500 border-orange-400' :
                                'bg-white/10 border-white/20 text-white/60'
                            }`}>
                                {ball}
                            </div>
                        )) || <p className="text-xs text-white/20 italic">No balls delivered yet</p>}
                    </div>
                </div>
            </main>

            {/* Bottom Floating Nav for Public Home */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full flex items-center gap-6 shadow-2xl z-50">
                <Link to="/" className="text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-emerald-400 transition-colors">Home</Link>
                <div className="w-px h-3 bg-white/10"></div>
                <Link to="/login" className="text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-emerald-400 transition-colors">My Bookings</Link>
            </div>
        </div>
    );
}
