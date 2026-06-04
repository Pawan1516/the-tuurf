import React, { memo } from 'react';
import { Trophy, Activity, Timer, Zap } from 'lucide-react';

const styles = {
    glass: {
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '2rem',
    },
    glassCard: {
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '1.25rem',
    }
};

const FloatingHeader = memo(({ 
    teamA, 
    teamB, 
    runs, 
    wickets, 
    overNum, 
    ballInOver, 
    maxOvers, 
    inningsNum, 
    target, 
    crr, 
    rrr,
    socketStatus 
}) => {
    return (
        <div className="w-full mt-6 px-4 sm:px-6">
            <div className="max-w-xl mx-auto w-full">
                <div style={styles.glass} className="p-8 shadow-2xl relative overflow-hidden group">
                    {/* Status Indicator Panel */}
                    <div className="absolute top-6 right-10 flex items-center gap-2.5 bg-black/40 px-4 py-1.5 rounded-full border border-white/5">
                        <div className={`w-2 h-2 rounded-full ${socketStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">
                            {socketStatus === 'connected' ? 'Live Sync' : 'Offline'}
                        </span>
                    </div>

                    <div className="flex flex-col gap-6">
                        {/* Match Info Header */}
                        <div className="flex items-center justify-between border-b border-white/5 pb-5 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shadow-lg">
                                    <Trophy size={18} />
                                </div>
                                <div className="flex flex-col">
                                    <h4 className="text-sm font-black text-white uppercase tracking-tight">
                                        {teamA} <span className="text-emerald-500 mx-1">vs</span> {teamB}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[9px] font-bold text-[#64748b] uppercase tracking-widest">The Turf Arena • Live Scorer</span>
                                    </div>
                                </div>
                            </div>
                            <div className={`px-4 py-1.5 rounded-full border flex items-center gap-2 ${inningsNum === 2 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-600/15 border-emerald-500/30 text-emerald-400'}`}>
                                <Zap size={10} className="fill-current" />
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                    {inningsNum === 2 ? 'Innings 2' : 'Innings 1'}
                                </span>
                            </div>
                        </div>

                        {/* Main Scoreboard */}
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-end gap-6">
                                <div className="flex items-baseline">
                                    <span className="text-7xl font-black text-white leading-none tracking-tighter tabular-nums">{runs}</span>
                                    <span className="text-3xl font-bold text-slate-600 mx-3">/</span>
                                    <span className="text-5xl font-black text-emerald-400 leading-none tabular-nums">{wickets}</span>
                                </div>
                                <div className="pb-1.5 flex flex-col gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <Timer size={14} className="text-slate-400" />
                                        <span className="text-base font-bold text-slate-300 tabular-nums">
                                            {overNum}.{ballInOver} <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-1">Overs</span>
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-16 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                        <div 
                                            className="h-full bg-emerald-500 transition-all duration-1000" 
                                            style={{ width: `${Math.min(((overNum * 6 + ballInOver) / (maxOvers * 6)) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                                <div style={styles.glassCard} className="px-4 py-2.5 flex flex-col items-end">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">CRR</span>
                                    <span className="text-xl font-black text-white tabular-nums">{crr || '0.00'}</span>
                                </div>
                                {inningsNum === 2 && rrr && (
                                    <div style={styles.glassCard} className="px-4 py-2.5 flex flex-col items-end border-l-2 border-emerald-500/30">
                                        <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-0.5">RRR</span>
                                        <span className="text-xl font-black text-emerald-400 tabular-nums">{rrr}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Chase Progress */}
                        {inningsNum === 2 && target && (
                            <div className="relative z-10">
                                <div style={styles.glassCard} className="p-5 flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-5">
                                        <div className="w-10 h-10 rounded-xl bg-[#03140b] flex items-center justify-center border border-emerald-500/20 shadow-sm">
                                            <Activity size={20} className="text-emerald-400" />
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Target:</p>
                                                <p className="text-lg font-black text-white tabular-nums">{target}</p>
                                            </div>
                                            <p className="text-xs font-bold text-slate-300 mt-1">
                                                Need <span className="text-emerald-400 font-black">{target - runs}</span> in <span className="text-emerald-400 font-black">{((maxOvers - overNum - ballInOver/6)*6).toFixed(0)}</span> balls
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Progress</span>
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                        </div>
                                        <div className="h-1.5 w-24 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                            <div 
                                                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-1000" 
                                                style={{ width: `${Math.max(0, Math.min(100, (runs/target)*100))}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

export default FloatingHeader;
