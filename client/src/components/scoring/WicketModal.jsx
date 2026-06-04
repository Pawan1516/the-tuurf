import React, { memo, useState, useEffect } from 'react';
import { Skull, User, X, AlertTriangle, ChevronRight, ShieldAlert, CircleDot } from 'lucide-react';

const DISMISSAL_TYPES = [
    { key: 'bowled', label: 'Bowled', icon: '🎯' },
    { key: 'caught', label: 'Caught', icon: '🤲' },
    { key: 'runout', label: 'Run Out', icon: '🏃' },
    { key: 'lbw', label: 'LBW', icon: '🦵' },
    { key: 'stumped', label: 'Stumped', icon: '🧤' },
    { key: 'hitwicket', label: 'Hit Wicket', icon: '💥' }
];

const styles = {
    glass: {
        background: 'linear-gradient(135deg, rgba(13,27,15,0.95) 0%, rgba(2,12,7,0.98) 100%)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(16,185,129,0.15)',
        borderRadius: '3rem',
    },
    buttonGlass: {
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        color: '#94a3b8',
    },
    buttonGlassActive: {
        background: 'rgba(16,185,129,0.15)',
        border: '1px solid rgba(16,185,129,0.35)',
        color: '#fff',
        boxShadow: '0 8px 32px rgba(16,185,129,0.15)',
    }
};

const WicketModal = memo(({ isOpen, onClose, onConfirm, batters, bowlers, preselectedType }) => {
    const [selectedType, setSelectedType] = useState(preselectedType || null);
    const [selectedNextBatter, setSelectedNextBatter] = useState(null);
    
    useEffect(() => {
        if (isOpen) {
            setSelectedType(preselectedType || null);
            setSelectedNextBatter(null);
        }
    }, [isOpen, preselectedType]);
    
    if (!isOpen) return null;

    const availableBatters = (batters || []).filter(b => !b.out && !b.batting);

    return (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div style={styles.glass} className="w-full max-w-lg overflow-hidden shadow-2xl relative">
                {/* Red glow */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-rose-500/5 rounded-full blur-[100px]" />
                
                <button 
                    onClick={onClose}
                    className="absolute top-8 right-8 p-3 bg-white/5 rounded-2xl text-slate-400 hover:text-white hover:bg-white/10 transition-all z-10 border border-white/5"
                >
                    <X size={20} />
                </button>

                <div className="p-10 relative z-10">
                    {/* Protocol Header */}
                    <div className="text-center mb-8 border-b border-white/5 pb-8">
                        <div className="w-20 h-20 bg-rose-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-rose-500/20 shadow-lg">
                            <Skull size={40} className="text-rose-500 animate-pulse" />
                        </div>
                        <h2 className="text-3xl font-black tracking-tighter text-white leading-none uppercase">Wicket Protocol</h2>
                        <div className="flex items-center justify-center gap-3 mt-3">
                            <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></div>
                            <p className="text-[9px] font-black text-rose-400 uppercase tracking-[0.3em]">Select dismissal type & next batter</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Dismissal Type Grid */}
                        <div className="grid grid-cols-3 gap-3">
                            {DISMISSAL_TYPES.map(type => {
                                const isActive = selectedType === type.key;
                                return (
                                    <button
                                        key={type.key}
                                        onClick={() => setSelectedType(type.key)}
                                        style={isActive ? styles.buttonGlassActive : styles.buttonGlass}
                                        className="relative p-5 rounded-[2rem] transition-all duration-300 flex flex-col items-center justify-center gap-3 overflow-hidden group hover:scale-[1.03]"
                                    >
                                        {isActive && (
                                            <div className="absolute top-2 right-2">
                                                <CircleDot size={10} className="text-emerald-400 animate-pulse" />
                                            </div>
                                        )}
                                        <span className="text-3xl group-hover:scale-110 transition-transform">{type.icon}</span>
                                        <span className="text-[9px] font-black uppercase tracking-widest">{type.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Next Batter Selection */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-4 px-1">
                                <h4 className="text-[9px] font-black text-[#64748b] uppercase tracking-[0.3em] whitespace-nowrap">Incoming Batter</h4>
                                <div className="h-px flex-1 bg-white/5" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
                                {availableBatters.length > 0 ? (
                                    availableBatters.map((b, idx) => {
                                        const isActive = selectedNextBatter?.name === b.name;
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => setSelectedNextBatter(b)}
                                                style={isActive ? styles.buttonGlassActive : styles.buttonGlass}
                                                className="p-4 rounded-[1.5rem] transition-all duration-300 flex items-center justify-between group hover:scale-[1.02]"
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className={`w-9 h-9 rounded-[1rem] flex items-center justify-center transition-colors ${isActive ? 'bg-emerald-500 text-black font-black' : 'bg-white/5 text-slate-400 border border-white/5'}`}>
                                                        <User size={14} />
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-tight truncate">{b.name}</span>
                                                </div>
                                                {isActive && <ChevronRight size={14} className="text-emerald-400 shrink-0" />}
                                            </button>
                                        );
                                    })
                                ) : (
                                    <div className="col-span-2 py-8 bg-black/40 rounded-[2rem] border border-white/5 flex flex-col items-center gap-3">
                                        <AlertTriangle size={24} className="text-amber-500 animate-bounce" />
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">No more batters in the squad registry</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Confirm Execution */}
                        <button
                            disabled={!selectedType || (availableBatters.length > 0 && !selectedNextBatter)}
                            onClick={() => onConfirm(selectedType, selectedNextBatter)}
                            className="w-full bg-rose-600 hover:bg-rose-500 disabled:opacity-20 disabled:grayscale transition-all duration-300 rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-[11px] text-white shadow-[0_0_20px_rgba(225,29,72,0.35)] py-5 active:scale-95 flex items-center justify-center gap-3"
                        >
                            <ShieldAlert size={18} />
                            Confirm Dismissal
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default WicketModal;
