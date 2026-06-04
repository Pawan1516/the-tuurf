import React, { memo, useState } from 'react';
import { Undo2, RefreshCw, Skull } from 'lucide-react';

const styles = {
    glass: {
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '2rem',
    },
    buttonGlass: {
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.06)',
        color: '#e2e8f0',
        transition: 'all 0.2s',
    }
};

const ScoringNode = memo(({ value, onClick, sub, className = "", style = {} }) => (
    <button 
        onClick={() => onClick(value)}
        style={{ ...styles.buttonGlass, ...style }}
        className={`flex flex-col items-center justify-center p-4 rounded-3xl transition-all active:scale-95 hover:bg-white/10 ${className}`}
    >
        <span className="text-3xl font-black text-white">{value}</span>
        {sub && <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#64748b] mt-1">{sub}</span>}
    </button>
));

const LiveScoringControls = memo(({ onRecord, onWicket, onUndo, onSwap, canUndo = true }) => {
    const [showNbRuns, setShowNbRuns] = useState(false);

    return (
        <div className="w-full mt-8">
            <div style={styles.glass} className="max-w-md mx-auto p-5 shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
                
                {/* Utilities Bar */}
                <div className="flex items-center justify-between px-1 mb-4">
                    <button 
                        onClick={onUndo} 
                        disabled={!canUndo} 
                        style={styles.buttonGlass}
                        className="p-3 rounded-2xl hover:bg-white/10 disabled:opacity-20 flex items-center justify-center"
                        title="Undo Last Ball"
                    >
                        <Undo2 size={20} className={canUndo ? "text-emerald-400" : "text-slate-500"} />
                    </button>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Scoring Controls</span>
                    <button 
                        onClick={onSwap} 
                        style={styles.buttonGlass}
                        className="p-3 rounded-2xl hover:bg-white/10 flex items-center justify-center active:scale-95"
                        title="Swap Strike"
                    >
                        <RefreshCw size={20} className="text-emerald-400" />
                    </button>
                </div>

                {/* Runs Grid 1 (0 to 3) */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                    <ScoringNode value={0} onClick={onRecord} sub="Dot" />
                    <ScoringNode value={1} onClick={onRecord} sub="Single" />
                    <ScoringNode value={2} onClick={onRecord} sub="Double" />
                    <ScoringNode value={3} onClick={onRecord} sub="Triple" />
                </div>

                {/* Runs Grid 2 (4 to 6) */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <button 
                        onClick={() => onRecord(4)}
                        className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 rounded-2xl flex flex-col items-center justify-center py-4 active:scale-95 transition-all border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                    >
                        <span className="text-xl font-black">4</span>
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-80 mt-0.5">Four</span>
                    </button>
                    <button 
                        onClick={() => onRecord(5)}
                        style={styles.buttonGlass}
                        className="rounded-2xl flex flex-col items-center justify-center py-4 shadow-sm active:scale-95 transition-all hover:bg-white/10"
                    >
                        <span className="text-xl font-black text-white">5</span>
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 mt-0.5">Five</span>
                    </button>
                    <button 
                        onClick={() => onRecord(6)}
                        className="bg-emerald-500/25 hover:bg-emerald-500/35 text-emerald-400 rounded-2xl flex flex-col items-center justify-center py-4 active:scale-95 transition-all border border-emerald-500/50 shadow-[0_0_18px_rgba(16,185,129,0.25)]"
                    >
                        <span className="text-xl font-black">6</span>
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-90 mt-0.5">Six</span>
                    </button>
                </div>

                {/* Extras Panel Header */}
                <div className="flex items-center gap-2 mb-3 px-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Extras Panel</span>
                    <div className="h-px flex-1 bg-white/5" />
                </div>

                {/* Extras Selection */}
                {!showNbRuns ? (
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => onRecord('wd')} className="py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-[9px] font-black uppercase tracking-wider border border-emerald-500/20 active:scale-95 transition-all">Wide</button>
                            <button onClick={() => onRecord('wd+1')} className="py-3 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 rounded-xl text-[9px] font-black uppercase tracking-wider border border-emerald-500/30 active:scale-95 transition-all">Wd + 1</button>
                            <button onClick={() => onRecord('nb')} className="py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-[9px] font-black uppercase tracking-wider border border-emerald-500/20 active:scale-95 transition-all">No Ball</button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => setShowNbRuns(true)} className="py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl text-[9px] font-black uppercase tracking-wider border border-amber-500/20 active:scale-95 transition-all">NB + Runs</button>
                            <button onClick={() => onRecord('b')} className="py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-wider border border-white/5 active:scale-95 transition-all">Bye</button>
                            <button onClick={() => onRecord('lb')} className="py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-wider border border-white/5 active:scale-95 transition-all">Leg Bye</button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-black/30 border border-white/5 rounded-2xl p-3 mb-6 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex justify-between items-center mb-2 px-1">
                            <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest">Select Runs Off No-Ball</span>
                            <button onClick={() => setShowNbRuns(false)} className="text-[8px] font-black text-slate-400 uppercase tracking-widest hover:text-white">Cancel</button>
                        </div>
                        <div className="grid grid-cols-6 gap-1.5">
                            {[0, 1, 2, 3, 4, 6].map(r => (
                                <button 
                                    key={r}
                                    onClick={() => { onRecord(`nb+${r}`); setShowNbRuns(false); }}
                                    className="py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg text-[10px] font-black border border-amber-500/25 active:scale-95 transition-all"
                                >
                                    +{r}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Dismissal Protocol Header */}
                <div className="flex items-center gap-2 mb-3 px-1">
                    <span className="text-[9px] font-black text-rose-400 uppercase tracking-wider">Dismissal Protocol</span>
                    <div className="h-px flex-1 bg-white/5" />
                </div>

                {/* Wickets Direct Selector */}
                <div className="grid grid-cols-4 gap-2">
                    <button 
                        onClick={() => onWicket(null)} 
                        className="py-3.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-[9px] font-black uppercase tracking-wider border border-rose-500/20 active:scale-95 transition-all"
                    >
                        Wicket
                    </button>
                    <button 
                        onClick={() => onWicket('caught')} 
                        className="py-3.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 rounded-xl text-[9px] font-black uppercase tracking-wider border border-rose-500/30 active:scale-95 transition-all"
                    >
                        Catch Out
                    </button>
                    <button 
                        onClick={() => onWicket('stumped')} 
                        className="py-3.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 rounded-xl text-[9px] font-black uppercase tracking-wider border border-rose-500/30 active:scale-95 transition-all"
                    >
                        Stamp
                    </button>
                    <button 
                        onClick={() => onWicket('runout')} 
                        className="py-3.5 bg-rose-500/25 hover:bg-rose-500/35 text-rose-400 rounded-xl text-[9px] font-black uppercase tracking-wider border border-rose-500/40 active:scale-95 transition-all shadow-[0_0_12px_rgba(244,63,94,0.1)]"
                    >
                        Run Out
                    </button>
                </div>
            </div>
        </div>
    );
});

export default LiveScoringControls;
