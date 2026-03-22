
import React, { useState, useEffect } from 'react';
import { Swords, Trophy, Activity, User, Save, Edit3, X, ChevronRight, BarChart3, ShieldCheck } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const DEFAULT_STATS = {
    playerName: "Dhoni",
    batting: {
        runs: 0, avg: 0, sr: 0, best: 0, fours: 0, sixes: 0, no: 0, inns: 0
    },
    bowling: {
        wkts: 0, eco: 0, overs: 0, best: "0/0", inns: 0, runs: 0, threeW: 0, fiveW: 0
    },
    fielding: {
        catches: 0, runOuts: 0
    }
};

const STAT_LABELS = {
    batting: {
        runs: "Runs",
        avg: "Average",
        sr: "Strike Rate",
        best: "High Score",
        fours: "4s",
        sixes: "6s",
        no: "Not Outs",
        inns: "Innings"
    },
    bowling: {
        wkts: "Wickets",
        eco: "Economy",
        overs: "Overs",
        best: "Best Figs",
        inns: "Innings",
        runs: "Runs Conc.",
        threeW: "3-Wkt Hauls",
        fiveW: "5-Wkt Hauls"
    },
    fielding: {
        catches: "Catches",
        runOuts: "Run Outs"
    }
};

const PlayerStatsDashboard = () => {
    const [stats, setStats] = useState(DEFAULT_STATS);
    const [editingField, setEditingField] = useState(null); // { section, field }
    const [tempValue, setTempValue] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Initial load from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('cricket_player_intel');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setStats(prev => ({ ...prev, ...parsed }));
            } catch (e) {
                console.error("Failed to load stats:", e);
            }
        }
    }, []);

    const handleSave = () => {
        setIsSaving(true);
        localStorage.setItem('cricket_player_intel', JSON.stringify(stats));
        
        setTimeout(() => {
            setIsSaving(false);
            toast.success("📈 Stats successfully recorded to local intel!", {
                position: "bottom-center",
                autoClose: 2000,
                theme: "dark"
            });
        }, 600);
    };

    const startEditing = (section, field, currentVal) => {
        setEditingField({ section, field });
        setTempValue(currentVal.toString());
    };

    const confirmEdit = () => {
        if (!editingField) return;
        const { section, field } = editingField;
        
        setStats(prev => {
            const newStats = { ...prev };
            if (section === 'playerName') {
                newStats.playerName = tempValue;
            } else {
                newStats[section] = { ...newStats[section], [field]: tempValue };
            }
            return newStats;
        });
        
        setEditingField(null);
    };

    const StatCard = ({ section, field, value, label, icon: Icon }) => (
        <div 
            onClick={() => startEditing(section, field, value)}
            className="group relative bg-[#1c1c1c] border border-white/5 hover:border-emerald-500/50 p-5 rounded-[2rem] transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/5 cursor-pointer overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <Edit3 size={14} className="text-emerald-400/50" />
            </div>
            
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">{label}</p>
            <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-white tracking-tighter leading-none">{value}</span>
                <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-400/30 group-hover:text-emerald-400 transition-colors">
                    {Icon ? <Icon size={18} /> : <Activity size={18} />}
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-emerald-500 selection:text-white pb-32">
            <ToastContainer />
            
            {/* Glassmorphism Header */}
            <header className="sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5 px-6 py-6 md:px-12 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Trophy size={24} className="text-white" />
                    </div>
                    <div>
                        <div 
                            onClick={() => startEditing('playerName', null, stats.playerName)}
                            className="flex items-center gap-2 cursor-pointer group"
                        >
                            <h1 className="text-2xl font-black tracking-tighter uppercase leading-none group-hover:text-emerald-400 transition-colors">
                                {stats.playerName}
                            </h1>
                            <Edit3 size={12} className="text-white/20 group-hover:text-emerald-400" />
                        </div>
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">Player Intel Matrix</p>
                    </div>
                </div>

                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="relative px-8 py-3.5 bg-white text-black rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-emerald-500 hover:text-white transition-all overflow-hidden group active:scale-95 disabled:opacity-50"
                >
                    <span className="relative z-10 flex items-center gap-2">
                        {isSaving ? "Syncing..." : <><Save size={14} /> Commit Changes</>}
                    </span>
                    <div className="absolute inset-0 bg-emerald-400 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></div>
                </button>
            </header>

            <main className="max-w-7xl mx-auto px-6 md:px-12 mt-12 space-y-20">
                
                {/* 1. BATTING ARSENAL */}
                <section>
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-[2px] w-12 bg-emerald-500"></div>
                        <h2 className="text-xs font-black text-emerald-500 uppercase tracking-[0.4em] flex items-center gap-3">
                            <Swords size={16} /> Batting Arsenal
                        </h2>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                        {Object.entries(stats.batting).map(([key, val]) => (
                            <StatCard 
                                key={key} 
                                section="batting" 
                                field={key} 
                                value={val} 
                                label={STAT_LABELS.batting[key]} 
                                icon={key === 'runs' ? BarChart3 : null}
                            />
                        ))}
                    </div>
                </section>

                {/* 2. BOWLING COMMAND */}
                <section>
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-[2px] w-12 bg-white/20"></div>
                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.4em] flex items-center gap-3">
                            <Activity size={16} /> Bowling Command
                        </h2>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                        {Object.entries(stats.bowling).map(([key, val]) => (
                            <StatCard 
                                key={key} 
                                section="bowling" 
                                field={key} 
                                value={val} 
                                label={STAT_LABELS.bowling[key]} 
                                icon={key === 'wkts' ? ShieldCheck : null}
                            />
                        ))}
                    </div>
                </section>

                {/* 3. FIELDING PROWESS */}
                <section>
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-[2px] w-12 bg-emerald-500/20"></div>
                        <h2 className="text-xs font-black text-white/50 uppercase tracking-[0.4em] flex items-center gap-3">
                            <Trophy size={16} /> Fielding Prowess
                        </h2>
                    </div>
                    <div className="grid grid-cols-2 gap-4 md:gap-8">
                        {Object.entries(stats.fielding).map(([key, val]) => (
                            <StatCard 
                                key={key} 
                                section="fielding" 
                                field={key} 
                                value={val} 
                                label={STAT_LABELS.fielding[key]} 
                                icon={User}
                            />
                        ))}
                    </div>
                </section>
            </main>

            {/* EDIT MODAL OVERLAY */}
            {editingField && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
                    <div className="absolute inset-0 bg-[#0a0a0a]/90 backdrop-blur-md animate-in fade-in duration-300"></div>
                    <div className="relative bg-[#1c1c1c] border border-white/10 w-full max-w-md p-10 rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-300">
                        <button 
                            onClick={() => setEditingField(null)}
                            className="absolute top-8 right-8 text-white/20 hover:text-white"
                        >
                            <X size={24} />
                        </button>
                        
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Edit Attribute</p>
                        <h3 className="text-2xl font-black tracking-tighter uppercase mb-10">
                            {editingField.section === 'playerName' ? "Profile Name" : STAT_LABELS[editingField.section][editingField.field]}
                        </h3>
                        
                        <div className="relative group">
                            <input 
                                type="text"
                                value={tempValue}
                                onChange={(e) => setTempValue(e.target.value)}
                                autoFocus
                                className="w-full bg-[#2a2a2a] border-2 border-white/5 focus:border-emerald-500 rounded-3xl px-8 py-5 text-2xl font-black text-white outline-none transition-all placeholder:text-white/10"
                                placeholder="Enter value..."
                                onKeyDown={(e) => e.key === 'Enter' && confirmEdit()}
                            />
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 transition-opacity">
                                <ChevronRight size={24} className="text-emerald-500" />
                            </div>
                        </div>

                        <div className="flex items-center gap-4 mt-12">
                            <button 
                                onClick={confirmEdit}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[11px] tracking-widest py-5 rounded-2xl transition-all shadow-xl shadow-emerald-500/10"
                            >
                                Confirm Intel
                            </button>
                            <button 
                                onClick={() => setEditingField(null)}
                                className="px-8 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-[11px] tracking-widest py-5 rounded-2xl transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Native-App Footer Indicator */}
            <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none flex items-center justify-center">
                <p className="text-[9px] font-black text-white/5 uppercase tracking-[1em] mb-4">The Turf — Statistics Registry v1.0</p>
            </div>
        </div>
    );
};

export default PlayerStatsDashboard;
