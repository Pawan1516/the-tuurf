import React, { useState, useEffect } from 'react';
import { Coins, Trophy, Swords, Zap } from 'lucide-react';

export default function CoinToss({ teamA, teamB, onComplete }) {
    const [step, setStep] = useState('call'); // call, flipping, result
    const [call, setCall] = useState(null); // Heads or Tails
    const [winner, setWinner] = useState(null);
    const [decision, setDecision] = useState(null); // bat or bowl
    const [flipResult, setFlipResult] = useState(null);

    const handleFlip = () => {
        setStep('flipping');
        setTimeout(() => {
            const res = Math.random() > 0.5 ? 'Heads' : 'Tails';
            setFlipResult(res);
            const won = res === call ? teamA : teamB;
            setWinner(won);
            setStep('result');
        }, 2000);
    };

    if (step === 'call') {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-white border border-black/5 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
                    <Coins size={40} className="text-emerald-600 animate-bounce" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tighter mb-2 text-slate-800">The Toss</h2>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-8">{teamA} Captain to Call</p>
                
                <div className="grid grid-cols-2 gap-4 w-full">
                    <button 
                        onClick={() => { setCall('Heads'); handleFlip(); }}
                        className="py-6 bg-slate-50 border-2 border-slate-100 rounded-3xl flex flex-col items-center gap-3 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group"
                    >
                        <div className="w-12 h-12 rounded-full border-4 border-emerald-600/20 flex items-center justify-center text-emerald-600 font-black text-xl group-hover:scale-110 transition-transform">H</div>
                        <span className="text-xs font-black uppercase tracking-widest">Heads</span>
                    </button>
                    <button 
                        onClick={() => { setCall('Tails'); handleFlip(); }}
                        className="py-6 bg-slate-50 border-2 border-slate-100 rounded-3xl flex flex-col items-center gap-3 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group"
                    >
                        <div className="w-12 h-12 rounded-full border-4 border-slate-600/20 flex items-center justify-center text-slate-600 font-black text-xl group-hover:scale-110 transition-transform">T</div>
                        <span className="text-xs font-black uppercase tracking-widest">Tails</span>
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'flipping') {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white border border-black/5 rounded-[2.5rem] shadow-2xl">
                <div className="relative w-24 h-24 mb-8">
                    <div className="absolute inset-0 bg-emerald-600 rounded-full animate-ping opacity-20"></div>
                    <div className="coin-3d w-full h-full bg-gradient-to-br from-emerald-500 to-blue-700 rounded-full flex items-center justify-center border-4 border-white/20 shadow-xl">
                        <span className="text-white font-black text-3xl">?</span>
                    </div>
                </div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-emerald-600 animate-pulse">Coin in the air...</h3>
                <style>{`
                    .coin-3d {
                        animation: coin-flip 0.2s linear infinite;
                    }
                    @keyframes coin-flip {
                        0% { transform: rotateY(0deg); }
                        100% { transform: rotateY(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-white border border-black/5 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                <Trophy size={40} className="text-green-600" />
            </div>
            
            <div className="text-center mb-8">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Toss Result: {flipResult}</p>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800">{winner} Won the Toss</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full">
                <button 
                    onClick={() => onComplete(winner, 'Bat')}
                    className="py-6 bg-emerald-600 text-white rounded-3xl flex flex-col items-center gap-3 shadow-xl shadow-emerald-500/20 hover:scale-[1.02] transition-all"
                >
                    <Zap size={24} />
                    <span className="text-xs font-black uppercase tracking-widest">Decision: Bat</span>
                </button>
                <button 
                    onClick={() => onComplete(winner, 'Bowl')}
                    className="py-6 bg-slate-800 text-white rounded-3xl flex flex-col items-center gap-3 shadow-xl shadow-slate-800/20 hover:scale-[1.02] transition-all"
                >
                    <Swords size={24} />
                    <span className="text-xs font-black uppercase tracking-widest">Decision: Bowl</span>
                </button>
            </div>
        </div>
    );
}
