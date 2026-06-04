import React, { memo, useState } from 'react';
import { User, Target, TrendingUp, Shield } from 'lucide-react';

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

const TiltCard = ({ children, className, style = {} }) => {
    const [rotate, setRotate] = useState({ x: 0, y: 0 });
    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        setRotate({ x: (centerY - y) / 25, y: (x - centerX) / 25 });
    };
    return (
        <div 
            className={`${className} transition-transform duration-500 ease-out`}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setRotate({ x: 0, y: 0 })}
            style={{ 
                ...style,
                transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
                transformStyle: 'preserve-3d'
            }}
        >
            <div style={{ transform: 'translateZ(20px)', transformStyle: 'preserve-3d' }}>
                {children}
            </div>
        </div>
    );
};

const PlayerCards = memo(({ striker, nonStriker, bowler }) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-7xl mx-auto text-white">
            {/* ── Batting Status ── */}
            <TiltCard style={styles.glass} className="p-8 shadow-2xl hover-3d">
                <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shadow-md">
                            <TrendingUp size={16} />
                        </div>
                        <span className="text-xs font-black text-white uppercase tracking-widest">Batting</span>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Striker */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-black/40 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)] overflow-hidden relative">
                                <User size={28} className="text-emerald-400/70" />
                                <div className="absolute bottom-0 inset-x-0 h-1 bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-black text-white uppercase tracking-tight">{striker?.name || 'Striker'}</span>
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                                </div>
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-0.5">Striker</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="flex items-baseline justify-end gap-2">
                                <span className="text-5xl font-black text-white leading-none tabular-nums tracking-tighter">{striker?.r || 0}</span>
                                <span className="text-xl font-bold text-slate-500">({striker?.b || 0})</span>
                            </div>
                            <div className="flex gap-4 justify-end mt-2">
                                <div className="flex flex-col items-end">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">S/R</span>
                                    <span className="text-sm font-black text-emerald-400 tabular-nums">{striker?.sr || '0.0'}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">4s / 6s</span>
                                    <span className="text-sm font-bold text-slate-300 tabular-nums">{striker?.fours || 0} / {striker?.sixes || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Non-Striker */}
                    <div style={styles.glassCard} className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-black/20 flex items-center justify-center border border-white/5 shadow-inner">
                                    <User size={20} className="text-slate-500" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-slate-200 uppercase tracking-tight">{nonStriker?.name || 'Non-Striker'}</span>
                                    <span className="text-[9px] font-bold text-[#64748b] uppercase tracking-widest mt-0.5">Non-Striker</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="flex items-baseline justify-end gap-2">
                                    <span className="text-2xl font-black text-slate-200 leading-none tabular-nums">{nonStriker?.r || 0}</span>
                                    <span className="text-sm font-bold text-slate-500">({nonStriker?.b || 0})</span>
                                </div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">SR {nonStriker?.sr || '0.0'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </TiltCard>

            {/* ── Bowling Status ── */}
            <TiltCard style={styles.glass} className="p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shadow-md">
                            <Target size={16} />
                        </div>
                        <span className="text-xs font-black text-white uppercase tracking-widest">Bowling</span>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25">
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">{bowler?.style || 'PACE'}</span>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-black/40 flex items-center justify-center border border-white/5 shadow-inner relative overflow-hidden">
                                <User size={28} className="text-slate-500" />
                                <div className="absolute bottom-0 inset-x-0 h-1 bg-emerald-500" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-lg font-black text-white uppercase tracking-tight">{bowler?.name || 'Bowler'}</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <Shield size={10} className="text-emerald-400" />
                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Current Bowler</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="flex items-baseline justify-end">
                                <span className="text-5xl font-black text-white leading-none tracking-tighter tabular-nums">{bowler?.w || 0}</span>
                                <span className="text-2xl font-bold text-slate-600 mx-2">-</span>
                                <span className="text-5xl font-black text-emerald-400 leading-none tracking-tighter tabular-nums tracking-tighter">{bowler?.r || 0}</span>
                            </div>
                            <div className="flex items-center justify-end gap-4 mt-2">
                                <div className="flex flex-col items-end">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">ECO</span>
                                    <span className="text-sm font-black text-emerald-400 tabular-nums">{(bowler?.r / (bowler?.overs + (bowler?.balls || 0)/6) || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Overs</span>
                                    <span className="text-sm font-bold text-slate-300 tabular-nums">{bowler?.overs || 0}.{bowler?.balls || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Over Progress Bar */}
                    <div className="flex gap-1.5 mt-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden relative border border-white/5">
                                <div 
                                    className={`h-full transition-all duration-700 ${i < (bowler?.balls || 0) ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : ''}`}
                                />
                                {i === (bowler?.balls || 0) && (
                                    <div className="absolute inset-0 bg-emerald-400/20 animate-pulse" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </TiltCard>
        </div>
    );
});

export default PlayerCards;
