import React, { useState, useEffect } from 'react';
import { useMatchFlow } from '../context/MatchFlowContext';
import { useNavigate, useParams } from 'react-router-dom';
import { Bot, Coins, HandMetal, Wind, Droplets, Target, ChevronRight } from 'lucide-react';

export default function TossScreen() {
  const { updateMatch, nextStep, matchData } = useMatchFlow();
  const navigate = useNavigate();
  const { id } = useParams();

  const [phase, setPhase] = useState('choose'); // choose | flipping | result
  const [playerChoice, setPlayerChoice] = useState('');
  const [coinResult, setCoinResult] = useState('');
  const [tossWinner, setTossWinner] = useState('');
  const [flipAngle, setFlipAngle] = useState(0);
  const [animComplete, setAnimComplete] = useState(false);
  const [animIn, setAnimIn] = useState(false);

  // AI-assisted states
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState('');

  const teamA = matchData?.teams?.teamA?.name || 'Team A';
  const teamB = matchData?.teams?.teamB?.name || 'Team B';

  useEffect(() => {
    if (matchData?.status === 'Completed') {
      navigate(`/live/${id || matchData?.matchId || ''}`);
    } else if (matchData?.status === 'In Progress') {
      navigate(`/match/scoring/${id || matchData?.matchId || ''}`);
    }
  }, [matchData?.status, id, matchData?.matchId, navigate]);

  useEffect(() => {
    setTimeout(() => setAnimIn(true), 50);
  }, []);

  // Analyze Pitch and Weather with simulated AI analysis
  useEffect(() => {
    setAiAnalyzing(true);
    const t = setTimeout(() => {
      const isNight = new Date().getHours() >= 17;
      const recText = isNight 
        ? '🤖 Pitch Analysis: Dry, hard turf with high humidity. Early dew is expected in 40 minutes. Swing bowlers will gain massive grip in the first innings. AI strongly recommends winning the toss and choosing to BOWL first to chase comfortably in the wet outfield.'
        : '🤖 Pitch Analysis: Flat turf, dry and dusty. Ideal batting surface with zero atmospheric moisture. Chasing will be demanding as the surface crumbles slightly. AI strongly recommends winning the toss and choosing to BAT first to set a massive scoreboard target.';
      setAiRecommendation(recText);
      setAiAnalyzing(false);
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  const doToss = (choice) => {
    setPlayerChoice(choice);
    setPhase('flipping');
    // Animate coin flip
    let angle = 0;
    const interval = setInterval(() => {
      angle += 45;
      setFlipAngle(angle);
      if (angle >= 1440) { // 4 full rotations
        clearInterval(interval);
        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        setCoinResult(result);
        const won = choice === result ? teamA : teamB;
        setTossWinner(won);
        setPhase('result');
        setAnimComplete(true);
        // Navigation to scoring is now handled after player selection via chooseBatBowl
      }
    }, 40);
  };

  const runAiTossCall = () => {
    const aiCall = Math.random() < 0.5 ? 'heads' : 'tails';
    doToss(aiCall);
  };

  const chooseBatBowl = (decision) => {
    const battingTeam = tossWinner;
    const bowlingTeam = tossWinner === teamA ? teamB : teamA;
    updateMatch({
      toss: {
        winner: tossWinner,
        choice: playerChoice,
        result: coinResult,
        battingFirst: decision === 'bat' ? battingTeam : bowlingTeam,
        bowlingFirst: decision === 'bat' ? bowlingTeam : battingTeam,
      },
      innings: {
        striker: null,
        nonStriker: null,
        currentBowlerIdx: null
      }
    });
    navigate(`/match/select/${id || matchData?.matchId || ''}`);
  };

  return (
    <div className={`w-full max-w-4xl mx-auto px-4 pb-24 transition-all duration-700 ease-out ${animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      
      <div className="text-center mb-8 pt-8">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-500/5">
          <Coins size={28} />
        </div>
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">The Toss</h1>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{teamA} vs {teamB}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
        
        {/* Coin Toss Interaction Frame */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col items-center">
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
          
          <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8 flex items-center gap-2">
            <Coins size={16} className="text-emerald-400" /> Coin Toss Portal
          </h3>
          
          {/* 3D Coin Canvas */}
          <div className="h-40 flex items-center justify-center [perspective:1000px] w-full mb-8">
            <div 
                className="w-32 h-32 rounded-full border-[6px] flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.3)] transition-transform ease-in-out [transform-style:preserve-3d]"
                style={{
                    transform: `rotateX(${flipAngle}deg)`,
                    background: coinResult === 'heads' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 
                                coinResult === 'tails' ? 'linear-gradient(135deg, #94a3b8, #64748b)' : 
                                'linear-gradient(135deg, #fbbf24, #d97706)',
                    borderColor: coinResult === 'tails' ? '#cbd5e1' : '#fef3c7'
                }}
            >
                <span className="text-5xl font-black text-white drop-shadow-md">
                    {coinResult === 'heads' ? 'H' : coinResult === 'tails' ? 'T' : '🪙'}
                </span>
            </div>
          </div>

          {phase === 'choose' && (
            <div className="w-full space-y-4 animate-in fade-in duration-300">
              <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{teamA} Captain to Call</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => doToss('heads')}
                  className="flex flex-col items-center gap-2 p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all"
                >
                  <span className="text-3xl">👑</span>
                  <span className="text-xs font-black uppercase tracking-widest">Heads</span>
                </button>
                <button
                  onClick={() => doToss('tails')}
                  className="flex flex-col items-center gap-2 p-5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400 hover:bg-indigo-500/20 active:scale-95 transition-all"
                >
                  <span className="text-3xl">🦅</span>
                  <span className="text-xs font-black uppercase tracking-widest">Tails</span>
                </button>
              </div>

              <div className="h-px bg-white/5 w-full my-6" />

              <button
                type="button"
                onClick={runAiTossCall}
                className="w-full flex items-center justify-center gap-2 py-4 bg-white/5 border border-white/10 text-slate-300 hover:text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-white/10 active:scale-[0.98] transition-all"
              >
                <Bot size={16} /> Let AI Autocall
              </button>
            </div>
          )}

          {phase === 'flipping' && (
            <div className="text-center mt-6 animate-pulse">
              <div className="text-sm font-black text-emerald-400 uppercase tracking-[0.3em]">
                Flipping Coin...
              </div>
            </div>
          )}

          {phase === 'result' && animComplete && (
            <div className="w-full text-center mt-2 animate-in zoom-in-95 duration-500">
              <div className="inline-block bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 px-6 py-2 rounded-full font-black text-sm uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.2)] mb-4">
                {tossWinner} Won!
              </div>
              <p className="text-xs text-slate-400 uppercase tracking-widest mb-6">
                Coin landed on <span className="text-white font-black">{coinResult}</span> (Call: {playerChoice})
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => chooseBatBowl('bat')}
                  className="py-5 bg-emerald-500 text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:bg-emerald-400 active:scale-95 transition-all"
                >
                  🏏 Bat First
                </button>
                <button
                  onClick={() => chooseBatBowl('bowl')}
                  className="py-5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 active:scale-95 transition-all"
                >
                  🥎 Bowl First
                </button>
              </div>
            </div>
          )}
        </div>

        {/* AI Toss Predictor and Environmental Panel */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
          
          <div>
            <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Bot size={16} /> AI Pitch Predictor
            </h3>
            
            <div className="bg-black/30 border border-white/5 rounded-[1.5rem] p-6 shadow-inner relative overflow-hidden">
                <div className="flex flex-wrap gap-2 mb-4 relative z-10">
                <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                    <HandMetal size={12} className="text-amber-400" /> Dry & Flat
                </span>
                <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                    <Wind size={12} className="text-sky-400" /> 14 km/h
                </span>
                <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                    <Droplets size={12} className="text-blue-400" /> Dew 68%
                </span>
                </div>
                
                {aiAnalyzing ? (
                <div className="flex items-center gap-3 text-slate-500 py-4 animate-pulse relative z-10">
                    <Target size={16} className="animate-spin" /> 
                    <span className="text-xs font-bold uppercase tracking-widest">Running turf parameters...</span>
                </div>
                ) : (
                <p className="text-xs text-slate-300 leading-relaxed font-mono relative z-10 animate-in fade-in duration-500">
                    {aiRecommendation}
                </p>
                )}
            </div>
          </div>

          <div className="mt-8">
            <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-4">
              🏟️ The Turf Live Data
            </h4>
            <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs font-bold text-slate-400 uppercase">Slot Duration</span>
                    <span className="text-xs font-black text-white font-mono">Optimized Overs</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs font-bold text-slate-400 uppercase">Average 1st Inn</span>
                    <span className="text-xs font-black text-white font-mono">86 Runs</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs font-bold text-slate-400 uppercase">Win % Bat First</span>
                    <span className="text-xs font-black text-rose-400 font-mono">42% (Bowl Favored)</span>
                </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
