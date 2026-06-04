import React, { useState, useEffect } from 'react';

export default function MatchSimulation({ lastBall }) {
    const [animation, setAnimation] = useState(null);

    useEffect(() => {
        if (!lastBall) return;

        if (lastBall.isWicket) {
            setAnimation('WICKET');
        } else if (lastBall.runs === 6) {
            setAnimation('SIX');
        } else if (lastBall.runs === 4) {
            setAnimation('FOUR');
        } else if (lastBall.runs > 0) {
            setAnimation('RUNS');
        } else {
            setAnimation('DOT');
        }

        const timer = setTimeout(() => setAnimation(null), 3000);
        return () => clearTimeout(timer);
    }, [lastBall]);

    if (!animation) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
            <div className={`
                text-8xl font-black uppercase tracking-tighter italic
                ${animation === 'WICKET' ? 'text-red-500' : ''}
                ${animation === 'SIX' ? 'text-green-500' : ''}
                ${animation === 'FOUR' ? 'text-emerald-500' : ''}
                ${animation === 'RUNS' ? 'text-amber-500' : ''}
                ${animation === 'DOT' ? 'text-slate-400' : ''}
                animate-simulation
            `}>
                {animation}
            </div>

            <style>{`
                @keyframes simulation-text {
                    0% { transform: scale(0.5) rotate(-10deg); opacity: 0; filter: blur(10px); }
                    20% { transform: scale(1.2) rotate(5deg); opacity: 1; filter: blur(0); }
                    80% { transform: scale(1) rotate(0deg); opacity: 1; }
                    100% { transform: scale(2) rotate(10deg); opacity: 0; filter: blur(20px); }
                }
                .animate-simulation {
                    animation: simulation-text 2s cubic-bezier(0.23, 1, 0.32, 1) forwards;
                }
            `}</style>
        </div>
    );
}
