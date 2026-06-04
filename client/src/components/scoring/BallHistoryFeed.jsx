import React, { memo } from 'react';
import { History, Clock, Activity } from 'lucide-react';

const styles = {
    glass: {
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '2.5rem',
    },
    glassCard: {
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '1.5rem',
        transition: 'all 0.3s',
    }
};

const BallHistoryFeed = memo(({ currentOverBalls, overHistory }) => {
    return (
        <div className="w-full">
            <div style={styles.glass} className="p-8 shadow-2xl relative overflow-hidden group">
                {/* Panel Header */}
                <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-7 relative z-10">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-[1.2rem] bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shadow-xl">
                            <Clock size={20} />
                        </div>
                        <div>
                            <h3 className="text-[11px] font-black text-white uppercase tracking-[0.3em] leading-none">Live Ball Feed</h3>
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Current Over Node Registry</p>
                        </div>
                    </div>

                    {/* Current Over Ball Nodes */}
                    <div className="flex gap-2">
                        {currentOverBalls.map((b, i) => (
                            <div key={i} className={`w-11 h-11 rounded-[1.2rem] flex items-center justify-center text-[13px] font-black transition-all duration-300 animate-in zoom-in-50 shadow-sm tabular-nums ${
                                b === 'W'  ? 'bg-rose-600/20 border border-rose-500/40 text-rose-400 shadow-[0_8px_20px_rgba(225,29,72,0.15)]' :
                                b === '4'  ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 shadow-[0_8px_20px_rgba(16,185,129,0.15)]' :
                                b === '6'  ? 'bg-emerald-600 text-black shadow-[0_8px_20px_rgba(16,185,129,0.35)]' :
                                b === 'Wd' || b === 'Nb' ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-[0_8px_20px_rgba(245,158,11,0.15)]' :
                                'bg-white/5 text-slate-400 border border-white/5'
                            }`}>
                                {b === '·' ? '0' : b}
                            </div>
                        ))}
                        {Array.from({ length: Math.max(0, 6 - currentOverBalls.length) }).map((_, i) => (
                            <div key={i} className="w-11 h-11 rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.02]" />
                        ))}
                    </div>
                </div>

                {/* Over History Registry */}
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1 relative z-10 custom-scrollbar">
                    {overHistory && overHistory.length > 0 ? (
                        overHistory.slice().reverse().map((over, idx) => (
                            <div key={idx} style={styles.glassCard} className="group/row flex items-center gap-6 p-5 border border-white/5 hover:border-emerald-500/30 hover:bg-white/[0.04]">
                                <div className="flex flex-col items-center border-r border-white/5 pr-6 min-w-[70px]">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Over</span>
                                    <span className="text-2xl font-black text-emerald-400 tracking-tighter tabular-nums">{(over.overNum || 0) + 1}</span>
                                </div>
                                
                                <div className="flex-1 flex gap-3 overflow-x-auto no-scrollbar py-1">
                                    {(over.balls || over).map((b, bi) => (
                                        <div key={bi} className={`flex items-center justify-center min-w-[28px] h-8 rounded-xl text-[11px] font-black transition-colors tabular-nums ${
                                            b === 'W' ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2' : 
                                            b === '4' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2' : 
                                            b === '6' ? 'text-black bg-emerald-500 px-2' : 
                                            'text-slate-400 bg-white/5 px-2'
                                        }`}>
                                            {b}
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-col items-end pl-6 border-l border-white/5 min-w-[80px]">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Yield</span>
                                    <div className="flex items-center gap-2">
                                        <Activity size={12} className="text-emerald-400" />
                                        <span className="text-2xl font-black text-white tracking-tighter tabular-nums">{over.runsConceded || 0}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-16 text-center border border-dashed border-white/10 rounded-[2.5rem] bg-white/[0.01]">
                            <div className="w-16 h-16 rounded-[1.5rem] bg-white/5 border border-white/5 flex items-center justify-center mx-auto mb-4">
                                <History size={28} className="text-slate-600" />
                            </div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Awaiting over completion</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default BallHistoryFeed;
