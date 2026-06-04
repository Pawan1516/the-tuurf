import React, { memo } from 'react';
import { Target, BarChart2, Activity, Settings, LayoutGrid } from 'lucide-react';

const BottomNavigation = memo(({ activeTab, onTabChange }) => {
    const tabs = [
        { id: 'live', label: 'Score', icon: Target },
        { id: 'commentary', label: 'Feed', icon: Activity },
        { id: 'scorecard', label: 'Stats', icon: LayoutGrid },
        { id: 'insights', label: 'AI Log', icon: BarChart2 },
        { id: 'settings', label: 'Menu', icon: Settings },
    ];

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] w-[92%] max-w-lg pointer-events-none">
            <div className="pointer-events-auto">
                <div style={{
                    background: 'rgba(2,12,7,0.85)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '2.5rem',
                }} className="px-6 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex justify-between items-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/[0.03] to-transparent pointer-events-none" />
                    
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={`flex flex-col items-center gap-1.5 transition-all duration-300 relative group ${
                                    isActive ? 'scale-110' : 'hover:scale-105'
                                }`}
                            >
                                {/* Active Indicator Dot */}
                                {isActive && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981] animate-pulse" />
                                    </div>
                                )}
                                
                                <div className={`p-3 rounded-[1.2rem] transition-all duration-300 ${
                                    isActive 
                                    ? 'bg-emerald-600 text-black shadow-[0_8px_20px_rgba(16,185,129,0.3)]' 
                                    : 'text-slate-400 hover:text-[#e2e8f0] hover:bg-white/5'
                                }`}>
                                    <Icon 
                                        size={18} 
                                        strokeWidth={isActive ? 2.5 : 2} 
                                    />
                                </div>
                                
                                <span className={`text-[7px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${
                                    isActive ? 'text-emerald-400 opacity-100' : 'text-slate-500 opacity-0 group-hover:opacity-100'
                                }`}>
                                    {tab.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});

export default BottomNavigation;
