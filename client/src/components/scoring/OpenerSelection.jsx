import React, { useState } from 'react';
import { Swords, Target, ChevronRight, Sparkles, Shield, Crown } from 'lucide-react';

const OpenerSelection = ({ match, battingTeam, bowlingTeam, onComplete }) => {
    const [striker, setStriker] = useState(null);
    const [nonStriker, setNonStriker] = useState(null);
    const [bowler, setBowler] = useState(null);

    const bTeam = battingTeam === 0 ? match.quick_teams?.team_a : match.quick_teams?.team_b;
    const boTeam = bowlingTeam === 0 ? match.quick_teams?.team_a : match.quick_teams?.team_b;

    // Use full squad or players array
    const bPlayers = bTeam?.squad || bTeam?.players || [];
    const boPlayers = boTeam?.squad || boTeam?.players || [];

    const handleConfirm = () => {
        if (!striker || !nonStriker || !bowler) return;
        onComplete({ striker, nonStriker, bowler });
    };

    const getDisplayName = (p) => p.name || p.display_name || p.input || 'Unknown';

    return (
        <div className="w-full max-w-lg mx-auto px-4 pb-24 pt-8 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 mb-6 shadow-lg shadow-emerald-500/10">
                    <Sparkles size={14} className="animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Match Setup</span>
                </div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Select <span className="text-emerald-500">Openers</span></h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Assign Striker & Bowler</p>
            </div>

            <div className="space-y-6">
                {/* Batting Team Openers */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[40px] pointer-events-none" />
                    
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/30">
                            <Swords size={20} />
                        </div>
                        <div>
                            <h4 className="text-lg font-black text-white uppercase tracking-tight">{bTeam?.name || 'Batting Team'}</h4>
                            <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em]">Batting Phase</p>
                        </div>
                    </div>

                    <div className="space-y-5 relative z-10">
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Crown size={12} className="text-amber-500"/> Striker</p>
                            <div className="flex flex-wrap gap-2">
                                {bPlayers.map((p, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setStriker(p)}
                                        className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 ${striker === p ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 border border-emerald-400' : 'bg-black/30 text-slate-300 border border-white/10 hover:border-white/20'}`}
                                    >
                                        {getDisplayName(p)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Shield size={12}/> Non-Striker</p>
                            <div className="flex flex-wrap gap-2">
                                {bPlayers.map((p, i) => (
                                    <button
                                        key={i}
                                        disabled={striker === p}
                                        onClick={() => setNonStriker(p)}
                                        className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-30 disabled:grayscale ${nonStriker === p ? 'bg-white text-black shadow-lg shadow-white/20 border border-white' : 'bg-black/30 text-slate-300 border border-white/10 hover:border-white/20'}`}
                                    >
                                        {getDisplayName(p)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bowling Team Opener */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 blur-[40px] pointer-events-none" />
                    
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/30">
                            <Target size={20} />
                        </div>
                        <div>
                            <h4 className="text-lg font-black text-white uppercase tracking-tight">{boTeam?.name || 'Bowling Team'}</h4>
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">Bowling Phase</p>
                        </div>
                    </div>

                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Opening Bowler</p>
                        <div className="flex flex-wrap gap-2">
                            {boPlayers.map((p, i) => (
                                <button
                                    key={i}
                                    onClick={() => setBowler(p)}
                                    className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 ${bowler === p ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-500' : 'bg-black/30 text-slate-300 border border-white/10 hover:border-white/20'}`}
                                >
                                    {getDisplayName(p)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0A0F16] via-[#0A0F16] to-transparent z-50">
                <button 
                    onClick={handleConfirm}
                    disabled={!striker || !nonStriker || !bowler}
                    className="w-full max-w-lg mx-auto py-5 bg-gradient-to-r from-emerald-500 to-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all active:scale-[0.98] disabled:opacity-30 disabled:grayscale"
                >
                    Start Match <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
};

export default OpenerSelection;
