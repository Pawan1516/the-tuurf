const fs = require('fs');
const content = fs.readFileSync('client/src/pages/ScoringDashboard.jsx', 'utf8');
const lines = content.split('\n');

const mainStartLine = 1368;
const mainEndLine = 2347;

const before = lines.slice(0, mainStartLine - 1).join('\n');
const after = lines.slice(mainEndLine).join('\n');

const mainBlock = `            <main className="max-w-md mx-auto p-4 space-y-4 pb-12">
                <MatchSimulation lastBall={state.lastBallData} />

                {/* Global Modal Overlay for Milestones */}
                {state.pendingMilestone && (
                    <div className="fixed inset-0 z-[100] bg-blue-600/90 flex flex-col items-center justify-center p-8 backdrop-blur-xl animate-in fade-in duration-500">
                        <div className="relative text-center scale-up-center">
                            <Trophy size={120} className="text-white mb-8 mx-auto" strokeWidth={1} />
                            <h2 className="text-7xl font-black text-white uppercase tracking-tighter leading-tight mb-4">{state.pendingMilestone.typ}</h2>
                            <p className="text-2xl font-black text-blue-900 uppercase tracking-[0.2em] mb-12">{state.pendingMilestone.name}</p>
                            <button onClick={() => updateState({ pendingMilestone: null })} className="bg-white text-blue-600 px-12 py-5 rounded-[2rem] font-black uppercase text-sm tracking-widest shadow-2xl">Terrific! 👏</button>
                        </div>
                    </div>
                )}

                {/* 1. Verification Phase (QR Scan) */}
                {state.phase === 'awaiting_verification' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500 pb-20">
                        <div className="text-center pt-8">
                            <div className="w-20 h-20 bg-blue-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-600/20">
                                <QrCode className="text-white" size={32} />
                            </div>
                            <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900 mb-2">Approval Locked</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Present QR to Admin</p>
                        </div>
                        <div className="bg-white border border-slate-200 shadow-xl rounded-[2.5rem] p-10 text-center space-y-8">
                            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 inline-block mx-auto">
                                <QRCodeSVG value={window.location.href} size={200} level="H" />
                            </div>
                            <div className="space-y-4">
                                <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 text-left">
                                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Status: Pending Verification</p>
                                    <p className="text-[9px] font-medium text-slate-500 leading-relaxed uppercase">Scoring functions are restricted. Present this match QR code to the on-site admin to unlock the Toss system.</p>
                                </div>
                                <button onClick={fetchMatchData} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg active:scale-[0.98]">
                                    <RefreshCw size={14} className={isDbLoading ? 'animate-spin' : ''} /> Check Approval Status
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. Toss Phase */}
                {state.phase === 'toss' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500 pb-20">
                        <div className="text-center pt-8">
                            <div className="w-20 h-20 bg-blue-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-600/20">
                                <Coins className="text-white" size={32} />
                            </div>
                            <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900 mb-2">The Toss</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">{TEAMS[0].name} vs {TEAMS[1].name}</p>
                        </div>
                        <div className="bg-white border border-slate-200 shadow-xl rounded-[2.5rem] p-8 text-center relative overflow-hidden">
                            {!state.tossCall ? (
                                <div className="space-y-8 animate-in fade-in duration-500">
                                    <div className="text-center">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{TEAMS[0].name} Captain</p>
                                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Make Your Call</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button onClick={() => updateState({ tossCall: 'Heads' })} className="h-44 bg-slate-50 border border-slate-200 rounded-[2rem] flex flex-col items-center justify-center gap-4 hover:bg-blue-50 hover:border-blue-200 transition-all active:scale-[0.98]">
                                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl shadow-sm border border-slate-100">🪙</div>
                                            <span className="text-xs font-bold uppercase tracking-widest text-slate-600">Heads</span>
                                        </button>
                                        <button onClick={() => updateState({ tossCall: 'Tails' })} className="h-44 bg-slate-50 border border-slate-200 rounded-[2rem] flex flex-col items-center justify-center gap-4 hover:bg-blue-50 hover:border-blue-200 transition-all active:scale-[0.98]">
                                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl shadow-sm border border-slate-100">🦅</div>
                                            <span className="text-xs font-bold uppercase tracking-widest text-slate-600">Tails</span>
                                        </button>
                                    </div>
                                </div>
                            ) : !state.tossWinner ? (
                                <div className="space-y-10 py-4 flex flex-col items-center">
                                    <div className="text-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{TEAMS[0].name} Called</p>
                                        <p className="text-3xl font-black text-blue-600 uppercase tracking-tight">{state.tossCall}</p>
                                    </div>
                                    <div className="perspective-1000 w-32 h-32 relative">
                                        <div className={\`coin-wrapper w-full h-full absolute transition-transform duration-[2000ms] preserve-3d \${state.isFlipping ? 'animate-coin-flip' : ''}\`}>
                                            <div className="coin-front w-full h-full absolute backface-hidden rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-4 border-amber-300 flex items-center justify-center text-5xl shadow-xl">🪙</div>
                                            <div className="coin-back w-full h-full absolute backface-hidden rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-4 border-amber-300 flex items-center justify-center text-5xl rotate-y-180 shadow-xl">🦅</div>
                                        </div>
                                    </div>
                                    <button disabled={state.isFlipping} onClick={() => { updateState({ isFlipping: true }); setTimeout(() => { const result = Math.random() > 0.5 ? 'Heads' : 'Tails'; const winner = state.tossCall === result ? 0 : 1; updateState({ isFlipping: false, tossResult: result, tossWinner: winner }); toast.success(\`\${TEAMS[winner].name} won the toss!\`, { icon: "🎊" }); }, 2000); }} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-all">
                                        {state.isFlipping ? 'Flipping...' : 'Flip Coin'}
                                    </button>
                                    {!state.isFlipping && <button onClick={() => updateState({ tossCall: null })} className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Change Call</button>}
                                </div>
                            ) : (
                                <div className="space-y-10 animate-in zoom-in-95 duration-500 py-4">
                                    <div className="flex flex-col items-center gap-6">
                                        <div className="w-24 h-24 bg-blue-50 border-4 border-blue-100 rounded-full flex items-center justify-center text-5xl shadow-xl animate-bounce">
                                            {state.tossResult === 'Heads' ? '🪙' : '🦅'}
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Result: {state.tossResult}</p>
                                            <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tight">{TEAMS[state.tossWinner].name} WON</h3>
                                        </div>
                                    </div>
                                    <div className="space-y-3 w-full">
                                        <button onClick={() => updateState({ phase: 'bb_choice' })} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98]">Continue to Decision</button>
                                        <button onClick={() => updateState({ tossWinner: null, tossResult: null, tossCall: null })} className="w-full py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Re-flip Coin</button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <style dangerouslySetInnerHTML={{ __html: \`
                            .perspective-1000 { perspective: 1000px; } .preserve-3d { transform-style: preserve-3d; } .backface-hidden { backface-visibility: hidden; } .rotate-y-180 { transform: rotateY(180deg); }
                            @keyframes coin-flip { 0% { transform: rotateY(0); } 100% { transform: rotateY(1800deg); } } .animate-coin-flip { animation: coin-flip 2s cubic-bezier(0.4, 0, 0.2, 1); }
                        \`}} />
                    </div>
                )}

                {/* 3. Bat/Bowl Decision Phase */}
                {state.phase === 'bb_choice' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500 pb-20">
                        <div className="text-center pt-8">
                            <div className="w-20 h-20 bg-blue-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-600/20">
                                <Trophy className="text-white" size={32} />
                            </div>
                            <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900 mb-2">{TEAMS[state.tossWinner]?.name} WON</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Make your decision</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => updateState({ bbChoice: 'bat' })} className={\`h-52 rounded-[2.5rem] border-2 transition-all duration-300 flex flex-col items-center justify-center gap-6 \${state.bbChoice === 'bat' ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-xl' : 'bg-white border-slate-200 opacity-50'}\`}>
                                <div className="w-20 h-20 bg-blue-600/10 rounded-2xl flex items-center justify-center text-5xl">🏏</div>
                                <div className="text-center"><span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Decision</span><p className="text-lg font-black uppercase tracking-widest text-slate-800 mt-1">Bat First</p></div>
                            </button>
                            <button onClick={() => updateState({ bbChoice: 'ball' })} className={\`h-52 rounded-[2.5rem] border-2 transition-all duration-300 flex flex-col items-center justify-center gap-6 \${state.bbChoice === 'ball' ? 'bg-indigo-50 border-indigo-600 text-indigo-900 shadow-xl' : 'bg-white border-slate-200 opacity-50'}\`}>
                                <div className="w-20 h-20 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-5xl">⚾</div>
                                <div className="text-center"><span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Decision</span><p className="text-lg font-black uppercase tracking-widest text-slate-800 mt-1">Bowl First</p></div>
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => updateState({ phase: 'toss', tossWinner: null, bbChoice: null })} className="py-5 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-slate-400">Back</button>
                            <button disabled={!state.bbChoice} onClick={() => { const batTeam = state.bbChoice === 'bat' ? state.tossWinner : (state.tossWinner === 0 ? 1 : 0); const bowlTeam = state.bbChoice === 'bat' ? (state.tossWinner === 0 ? 1 : 0) : state.tossWinner; updateState({ battingTeam: batTeam, bowlingTeam: bowlTeam, phase: 'select_xi_bat' }); }} className="py-5 bg-blue-600 text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 disabled:opacity-20 transition-all">Select XI →</button>
                        </div>
                    </div>
                )}

                {/* 4. Select XI Bat Phase */}
                {state.phase === 'select_xi_bat' && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500 pb-20">
                        <div className="text-center pt-8">
                            <div className="w-20 h-20 bg-blue-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-600/20">
                                <Users className="text-white" size={32} />
                            </div>
                            <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900 mb-2">{TEAMS[state.battingTeam]?.name}</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Select Playing 11 (Batting)</p>
                            <div className="mt-6"><span className={\`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest \${state.selectedXI_Bat.length === 11 ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 border border-blue-100'}\`}>{state.selectedXI_Bat.length} / 11 Selected</span></div>
                        </div>
                        <div className="bg-white border border-slate-200 shadow-xl rounded-[2.5rem] p-4 max-h-[45vh] overflow-y-auto space-y-2 custom-scrollbar">
                            {TEAMS[state.battingTeam]?.players?.map((p, i) => (
                                <button key={i} onClick={() => { const current = [...state.selectedXI_Bat]; if (current.includes(i)) updateState({ selectedXI_Bat: current.filter(idx => idx !== i) }); else if (current.length < 11) updateState({ selectedXI_Bat: [...current, i] }); else toast.warning("Maximum 11 players allowed."); }} className={\`w-full p-5 rounded-2xl border transition-all flex items-center justify-between \${state.selectedXI_Bat.includes(i) ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100 opacity-60 hover:opacity-100'}\`}>
                                    <div className="flex items-center gap-4"><div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center font-bold text-xs text-slate-400">{i+1}</div><span className="text-xs font-bold uppercase tracking-tight text-slate-800">{p.name}</span></div>
                                    {state.selectedXI_Bat.includes(i) && <CheckCircle size={18} className="text-blue-600" />}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => updateState({ phase: 'bb_choice', selectedXI_Bat: [] })} className="py-5 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-slate-400">Back</button>
                            <button disabled={state.selectedXI_Bat.length !== 11} onClick={() => updateState({ phase: 'select_xi_bowl' })} className="py-5 bg-blue-600 text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 disabled:opacity-20 transition-all">Next: Bowling XI →</button>
                        </div>
                    </div>
                )}

                {/* 5. Select XI Bowl Phase */}
                {state.phase === 'select_xi_bowl' && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500 pb-20">
                        <div className="text-center pt-8">
                            <div className="w-20 h-20 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-600/20">
                                <Target className="text-white" size={32} />
                            </div>
                            <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900 mb-2">{TEAMS[state.bowlingTeam]?.name}</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Select Playing 11 (Bowling)</p>
                            <div className="mt-6"><span className={\`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest \${state.selectedXI_Bowl.length === 11 ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}\`}>{state.selectedXI_Bowl.length} / 11 Selected</span></div>
                        </div>
                        <div className="bg-white border border-slate-200 shadow-xl rounded-[2.5rem] p-4 max-h-[45vh] overflow-y-auto space-y-2 custom-scrollbar">
                            {TEAMS[state.bowlingTeam]?.players?.map((p, i) => (
                                <button key={i} onClick={() => { const current = [...state.selectedXI_Bowl]; if (current.includes(i)) updateState({ selectedXI_Bowl: current.filter(idx => idx !== i) }); else if (current.length < 11) updateState({ selectedXI_Bowl: [...current, i] }); else toast.warning("Maximum 11 players allowed."); }} className={\`w-full p-5 rounded-2xl border transition-all flex items-center justify-between \${state.selectedXI_Bowl.includes(i) ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100 opacity-60 hover:opacity-100'}\`}>
                                    <div className="flex items-center gap-4"><div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center font-bold text-xs text-slate-400">{i+1}</div><span className="text-xs font-bold uppercase tracking-tight text-slate-800">{p.name}</span></div>
                                    {state.selectedXI_Bowl.includes(i) && <CheckCircle size={18} className="text-indigo-600" />}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => updateState({ phase: 'select_xi_bat', selectedXI_Bowl: [] })} className="py-5 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-slate-400">Back</button>
                            <button disabled={state.selectedXI_Bowl.length !== 11} onClick={() => { const battingPlayers = state.selectedXI_Bat.map(idx => TEAMS[state.battingTeam].players[idx]); const bowlingPlayers = state.selectedXI_Bowl.map(idx => TEAMS[state.bowlingTeam].players[idx]); const nextBatters = battingPlayers.map(p => ({ name: p.name, user_id: p.user_id || null, r: 0, b: 0, fours: 0, sixes: 0, sr: 0, out: false, batting: false, milestones: [] })); const nextBowlers = bowlingPlayers.map((p, i) => ({ name: p.name, user_id: p.user_id || null, style: 'Fast', overs: 0, r: 0, w: 0, balls: 0 })); updateState({ batters: nextBatters, bowlers: nextBowlers, phase: 'select_openers' }); }} className="py-5 bg-indigo-600 text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 disabled:opacity-20 transition-all">Finalize XI →</button>
                        </div>
                    </div>
                )}

                {/* 6. Openers Selection Phase */}
                {state.phase === 'select_openers' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-600 pb-20">
                        <div className="text-center pt-8">
                            <div className="w-20 h-20 bg-blue-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-600/20">
                                <Swords className="text-white" size={32} />
                            </div>
                            <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900 mb-2">{TEAMS[state.battingTeam]?.name}</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Select Opening Pair</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className={\`p-6 rounded-[2.5rem] border-2 transition-all duration-300 \${typeof state.openerStrikerIdx === 'number' ? 'bg-blue-50 border-blue-600' : 'bg-slate-50 border-slate-200 border-dashed opacity-50'}\`}>
                                <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mb-2">Striker</p>
                                <p className="text-sm font-black text-slate-900 truncate uppercase">{typeof state.openerStrikerIdx === 'number' ? state.batters[state.openerStrikerIdx]?.name : "Pick Striker"}</p>
                            </div>
                            <div className={\`p-6 rounded-[2.5rem] border-2 transition-all duration-300 \${typeof state.openerNSIdx === 'number' ? 'bg-indigo-50 border-indigo-600' : 'bg-slate-50 border-slate-200 border-dashed opacity-50'}\`}>
                                <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest mb-2">Non-Striker</p>
                                <p className="text-sm font-black text-slate-900 truncate uppercase">{typeof state.openerNSIdx === 'number' ? state.batters[state.openerNSIdx]?.name : "Pick Non-Striker"}</p>
                            </div>
                        </div>
                        <div className="bg-white border border-slate-200 shadow-xl rounded-[2.5rem] p-4 max-h-[40vh] overflow-y-auto space-y-2 custom-scrollbar">
                            {state.batters?.map((p, i) => {
                                const isStriker = state.openerStrikerIdx === i;
                                const isNS = state.openerNSIdx === i;
                                return (
                                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <span className="text-xs font-bold uppercase text-slate-800">{p.name}</span>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => updateState({ openerStrikerIdx: i, openerNSIdx: isNS ? null : state.openerNSIdx })}
                                                className={\`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest \${isStriker ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-400'}\`}
                                            >
                                                Striker
                                            </button>
                                            <button 
                                                onClick={() => updateState({ openerNSIdx: i, openerStrikerIdx: isStriker ? null : state.openerStrikerIdx })}
                                                className={\`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest \${isNS ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-400'}\`}
                                            >
                                                Non-Striker
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => updateState({ openerStrikerIdx: null, openerNSIdx: null, phase: 'select_xi_bowl' })} className="py-5 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-slate-400">Back</button>
                                <button 
                                    disabled={typeof state.openerStrikerIdx !== 'number' || typeof state.openerNSIdx !== 'number'} 
                                    onClick={() => {
                                        const nb = [...state.batters];
                                        if (nb[state.openerStrikerIdx]) nb[state.openerStrikerIdx].batting = true;
                                        if (nb[state.openerNSIdx]) nb[state.openerNSIdx].batting = true;
                                        updateState({ batters: nb, striker: state.openerStrikerIdx, nonStriker: state.openerNSIdx, phase: 'select_bowler' });
                                    }} 
                                    className="py-5 bg-blue-600 text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 disabled:opacity-20 transition-all"
                                >
                                    Next: Bowler →
                                </button>
                        </div>
                    </div>
                )}

                {/* 7. Bowler Selection Phase */}
                {state.phase === 'select_bowler' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500 pb-20">
                        <div className="text-center pt-8">
                            <div className="w-20 h-20 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-600/20">
                                <Target className="text-white" size={32} />
                            </div>
                            <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900 mb-2">{TEAMS[state.bowlingTeam]?.name}</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Select Bowler for Over {state.overNum + 1}</p>
                        </div>
                        <div className="bg-white border border-slate-200 shadow-xl rounded-[2.5rem] p-4 max-h-[50vh] overflow-y-auto space-y-2 custom-scrollbar">
                            {state.bowlers?.map((p, i) => {
                                const isCurrent = state.currentBowlerIdx === i;
                                const isPrevious = i === state.prevBowlerIdx;
                                const maxOversPerBowler = Math.ceil(state.formatOvers / 5);
                                const hasFinishedSpell = p?.overs >= maxOversPerBowler;
                                const dis = isPrevious || hasFinishedSpell;
                                return (
                                    <button key={i} disabled={dis} onClick={() => updateState({ currentBowlerIdx: i, phase: state.totalBalls === 0 ? 'match_confirmation' : 'batting' })} className={\`w-full p-5 rounded-2xl border transition-all flex items-center justify-between \${isCurrent ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100 hover:bg-slate-100 disabled:opacity-30'}\`}>
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center relative">
                                                <User size={18} className="text-slate-300" />
                                                {isPrevious && <div className="absolute -top-1 -right-1 w-4 h-4 bg-slate-400 rounded-full flex items-center justify-center border-2 border-white"><RotateCcw size={8} className="text-white" /></div>}
                                            </div>
                                            <div className="text-left">
                                                <p className="text-xs font-bold uppercase tracking-tight text-slate-800">{p?.name || \`Bowler \${i+1}\`}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{p?.style || "Pace"}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-indigo-600 tabular-nums">{p?.overs || 0}.{p?.balls % 6 || 0}</p>
                                            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Overs</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="grid grid-cols-1">
                            <button onClick={() => updateState({ phase: 'select_openers' })} className="py-5 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-slate-400">Back to Batters</button>
                        </div>
                    </div>
                )}

                {/* 8. Match Confirmation Phase */}
                {state.phase === 'match_confirmation' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500 pb-20">
                        <div className="bg-blue-600 border border-blue-500 rounded-[2.5rem] p-10 text-center shadow-2xl shadow-blue-500/20">
                            <CheckCircle size={48} className="text-white mx-auto mb-6" />
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Ready to Start?</h2>
                            <p className="text-blue-100 font-medium mt-2">Final verification of match details</p>
                        </div>
                        <div className="bg-white border border-black/5 shadow-xl rounded-[2.5rem] p-8 space-y-8">
                            <div className="space-y-4 border-b border-black/5 pb-8">
                                <div className="flex items-center gap-3 mb-2">
                                    <Coins size={14} className="text-blue-600" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Toss Summary</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-300 mb-1">Call</p>
                                        <p className="text-xs font-black text-slate-800">{state.tossCall}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-300 mb-1">Result</p>
                                        <p className="text-xs font-black text-blue-600">{state.tossResult}</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-blue-600/60 mb-1">Toss Winner</p>
                                    <p className="text-sm font-black text-blue-900 uppercase">{TEAMS[state.tossWinner]?.name}</p>
                                    <p className="text-[9px] font-black text-slate-500 uppercase mt-1">Chose to {state.bbChoice === 'bat' ? 'Bat First' : 'Bowl First'}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Swords size={12} className="text-blue-600" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Batting</span>
                                    </div>
                                    <p className="text-xs font-black text-slate-800 truncate">{TEAMS[state.battingTeam]?.name}</p>
                                    <div className="space-y-2">
                                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                            <p className="text-[7px] font-black uppercase tracking-widest text-slate-300 mb-1">Striker</p>
                                            <p className="text-[10px] font-bold text-slate-700 truncate">{state.batters[state.striker]?.name}</p>
                                        </div>
                                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                            <p className="text-[7px] font-black uppercase tracking-widest text-slate-300 mb-1">Non-Striker</p>
                                            <p className="text-[10px] font-bold text-slate-700 truncate">{state.batters[state.nonStriker]?.name}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Zap size={12} className="text-indigo-600" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Bowling</span>
                                    </div>
                                    <p className="text-xs font-black text-slate-800 truncate">{TEAMS[state.bowlingTeam]?.name}</p>
                                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                        <p className="text-[7px] font-black uppercase tracking-widest text-slate-300 mb-1">Bowler</p>
                                        <p className="text-[10px] font-bold text-slate-700 truncate">{state.bowlers[state.currentBowlerIdx]?.name}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4 space-y-4">
                                <button onClick={startMatchLive} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black uppercase tracking-[0.3em] shadow-2xl shadow-blue-500/30 active:scale-95 transition-all">Start Match 🏏</button>
                                <button onClick={() => updateState({ phase: 'select_bowler' })} className="w-full py-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">Modify Selections</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 9. Batting Phase (Main Scoreboard) */}
                {state.phase === 'batting' && (
                    <div className="relative z-10">
                        {/* Global Immersive Background Layer */}
                        <div className="fixed inset-0 -z-10 pointer-events-none">
                            <div className="absolute inset-0 bg-slate-950" />
                            <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 0)', backgroundSize: '40px 40px' }} />
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-indigo-600/5" />
                            <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-blue-600/10 to-transparent" />
                        </div>
                        {activeTab === 'live' && (
                            <div className="relative min-h-screen pb-96">
                                <div className="pt-8 px-4 sm:px-6 animate-in slide-in-from-top-10 duration-1000">
                                    <AIAnalyticsBar winProb={state.win_probability || state.winProbability} teamA={TEAMS[state.battingTeam === 0 ? 0 : 1]?.short} teamB={TEAMS[state.battingTeam === 0 ? 1 : 0]?.short} momentum={state.momentum_score || state.momentumScore} projectedScore={state.projected_score || state.projectedScore} />
                                </div>
                                <FloatingHeader teamA={TEAMS[state.battingTeam]?.short || 'TMA'} teamB={TEAMS[state.bowlingTeam]?.short || 'TMB'} runs={state.runs} wickets={state.wickets} overNum={state.overNum} ballInOver={state.ballInOver} maxOvers={state.formatOvers} inningsNum={state.inningsNum} target={state.target} crr={(state.runs / (state.overNum + state.ballInOver / 6 || 1)).toFixed(2)} rrr={state.inningsNum === 2 ? ((state.target - state.runs) / ((state.formatOvers * 6 - (state.overNum * 6 + state.ballInOver)) / 6 || 1)).toFixed(2) : null} socketStatus={socketStatus} />
                                <div className="mt-8 px-4 sm:px-6"><PlayerCards striker={state.batters[state.striker]} nonStriker={state.batters[state.nonStriker]} bowler={state.bowlers[state.currentBowlerIdx]} /></div>
                                <div className="mt-8 px-4 sm:px-6 flex justify-end"><div className="w-full max-w-xs"><BallHistoryFeed currentOverBalls={state.currentOverBalls} overHistory={state.overHistory} /></div></div>
                                <div className="px-4 sm:px-6 mb-24"><LiveScoringControls onRecord={(r) => recordBall(String(r))} onWicket={() => setIsWicketModalOpen(true)} onUndo={handleUndo} canUndo={canUndo} onSwap={() => updateState({ striker: state.nonStriker, nonStriker: state.striker })} /></div>
                            </div>
                        )}
                        {activeTab === 'insights' && (
                            <div className="mt-4 px-6 space-y-12 mb-32 relative z-20">
                                <ThreeStadiumNode />
                                <MatchGraphs wormData={state.history_balls || []} runRateData={state.overHistory || []} />
                            </div>
                        )}
                        {activeTab === 'commentary' && (
                            <div className="mt-4 px-4 space-y-4 mb-32 relative z-20">
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-300 px-2">Live Commentary</h3>
                                {state.commentary.map((c, i) => (
                                    <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/5 shadow-sm rounded-2xl p-5 flex gap-4 animate-in slide-in-from-right-4 duration-300">
                                        <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center font-black text-xs text-blue-400 shrink-0">{c.ball}</div>
                                        <div><p className="text-sm font-medium leading-relaxed text-slate-300">{c.text}</p></div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 10. Innings Over Phase */}
                {state.phase === 'innings_over' && (
                    <div className="space-y-8 animate-in zoom-in-95 duration-500 pb-20">
                        <div className="text-center pt-12">
                            <div className="w-20 h-20 bg-blue-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-600/20">
                                <Trophy className="text-white" size={32} />
                            </div>
                            <h2 className="text-4xl font-black uppercase tracking-tight text-slate-900 mb-2">Innings Break</h2>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">First Innings Concluded</p>
                        </div>
                        <div className="bg-white border border-slate-200 shadow-xl rounded-[2.5rem] p-8">
                            <div className="flex justify-between items-center mb-8 pb-8 border-b border-slate-100">
                                <div className="text-left">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Final Score</p>
                                    <p className="text-5xl font-black text-slate-900 tabular-nums tracking-tighter">{state.runs}<span className="text-2xl text-slate-300 mx-1">/</span>{state.wickets}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Run Rate</p>
                                    <p className="text-2xl font-black text-blue-600 tabular-nums">{(state.runs / (state.overNum + state.ballInOver / 6 || 1)).toFixed(2)}</p>
                                </div>
                            </div>
                            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-center">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-2">The Equation</p>
                                <p className="text-sm font-bold text-slate-700 uppercase">Target: <span className="text-2xl font-black text-blue-600 mx-1">{state.runs + 1}</span> Runs in {state.formatOvers} Overs</p>
                            </div>
                        </div>
                        <button onClick={() => { saveCheckpoint(); setState(prev => { const nextBatTeam = (prev.battingTeam === 0 || prev.battingTeam === 1) ? 1 - prev.battingTeam : 1; const nextBowlTeam = (prev.battingTeam === 0 || prev.battingTeam === 1) ? prev.battingTeam : 0; const nextBatters = (TEAMS[nextBatTeam]?.players || []).map((p) => ({ name: p.name, user_id: p.user_id || null, r: 0, b: 0, fours: 0, sixes: 0, sr: 0, out: false, batting: false, milestones: [] })); const nextBowlers = (TEAMS[nextBowlTeam]?.players || []).map((p, i) => ({ name: p.name, user_id: p.user_id || null, style: (BOWLING_STYLES && BOWLING_STYLES.length) ? BOWLING_STYLES[i % BOWLING_STYLES.length] : 'Fast', overs: 0, r: 0, w: 0, balls: 0 })); return { ...prev, inningsNum: 2, runs: 0, wickets: 0, overNum: 0, ballInOver: 0, totalBalls: 0, currentOverBalls: [], overHistory: [], battingTeam: nextBatTeam, bowlingTeam: nextBowlTeam, batters: nextBatters, bowlers: nextBowlers, inn1Score: prev.runs, inn1Wickets: prev.wickets, inn1Overs: prev.overNum + (prev.ballInOver/6), inn1OverHistory: [...(prev.currentInnOverHistory || [])], currentInnOverHistory: [], target: prev.runs + 1, phase: 'select_openers', openerStrikerIdx: null, openerNSIdx: null, currentBowlerIdx: null, striker: null, nonStriker: null }; }); }} className="w-full py-6 bg-blue-600 text-white font-black uppercase tracking-[0.2em] rounded-3xl shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-all">Start 2nd Innings 🏏</button>
                    </div>
                )}

                {/* 11. Match Result Phase */}
                {state.phase === 'match_result' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-700 pb-20">
                        <div className="text-center pt-10 pb-6">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full mb-6"><Trophy size={14} className="text-blue-600" /><span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Match Completed</span></div>
                            <h2 className="text-5xl font-black uppercase tracking-tight leading-tight text-slate-900 mb-4">{state.result}</h2>
                            <div className="flex items-center justify-center gap-2 text-slate-400"><span className="text-[10px] font-bold uppercase tracking-widest">Powered by The Turf Intelligence</span></div>
                        </div>
                        <div className="relative group"><div className="absolute inset-0 bg-blue-600/5 rounded-[2.5rem] blur-2xl group-hover:bg-blue-600/10 transition-all" /><div className="relative bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-xl overflow-hidden"><div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-slate-50 rounded-full flex items-center justify-center opacity-50"><Trophy size={80} className="text-slate-200" /></div><span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block mb-6">Player of the Match</span>{getPOTM(state).slice(0, 1).map((p, i) => (<div key={i} className="flex items-center gap-8"><div className="w-24 h-24 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center relative"><User size={40} className="text-slate-300" /><div className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg border-4 border-white"><Zap size={18} className="text-white fill-white" /></div></div><div><h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-3">{p?.name}</h3><div className="flex gap-4"><div className="flex flex-col"><span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Runs</span><span className="text-lg font-black text-slate-800">{p?.r} <span className="text-sm font-bold text-slate-300">({p?.b})</span></span></div><div className="w-px h-8 bg-slate-100 self-end" /><div className="flex flex-col"><span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Wickets</span><span className="text-lg font-black text-blue-600">{p?.w} <span className="text-sm font-bold text-slate-300">/{p?.r_bowl || 0}</span></span></div></div></div></div>))}</div></div>
                        <div className="bg-white border border-slate-200 shadow-xl rounded-[2.5rem] p-8 space-y-4"><h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center mb-4">Post-Match Actions</h4><div className="grid grid-cols-1 gap-3"><button onClick={() => { setState(prev => ({ ...prev, phase: 'toss', inningsNum: 1, runs: 0, wickets: 0, ballInOver: 0, overNum: 0, totalBalls: 0, striker: null, nonStriker: null, currentBowlerIdx: null, currentOverBalls: [], overHistory: [], log: [], history: [], batters: [], bowlers: [], target: null, tossWinner: null, battingTeam: null, bowlingTeam: null, bbChoice: null, selectedXI_Bat: [], selectedXI_Bowl: [], currentInnOverHistory: [], inn1OverHistory: [] })); toast.success("Preparing Rematch..."); }} className="flex items-center justify-between p-5 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all active:scale-[0.98] shadow-lg shadow-slate-900/10"><div className="flex items-center gap-4"><div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center"><RotateCcw size={18} /></div><div className="text-left"><p className="text-sm font-bold uppercase tracking-tight">Instant Rematch</p><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Keep same teams</p></div></div><ChevronRight size={18} className="opacity-40" /></button><button onClick={() => handleAiMatchmake('different')} disabled={state.aiLoading} className="flex items-center justify-between p-5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all active:scale-[0.98] shadow-lg shadow-blue-600/10 disabled:opacity-50"><div className="flex items-center gap-4"><div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">{state.aiLoading ? <RefreshCw size={18} className="animate-spin" /> : <Zap size={18} className="fill-white" />}</div><div className="text-left"><p className="text-sm font-bold uppercase tracking-tight">AI Recommended Squad</p><p className="text-[9px] font-bold text-blue-200 uppercase tracking-widest mt-0.5">Skill-based matchmaking</p></div></div><div className="px-2 py-1 bg-white/20 rounded-lg"><span className="text-[8px] font-bold uppercase">New</span></div></button><div className="grid grid-cols-2 gap-3 mt-4"><button onClick={() => updateState({ phase: 'summary' })} className="py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all">Full Scorecard</button><button onClick={() => { updateCareerStats(); navigate('/admin/operations'); }} className="py-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-indigo-600 hover:bg-indigo-100 transition-all">All Done</button></div></div></div>
                    </div>
                )}

                {/* 12. Summary / Scorecard Phase */}
                {state.phase === 'summary' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between"><button onClick={() => updateState({ phase: 'match_result' })} className="p-3 bg-white shadow-sm border border-black/5 rounded-2xl"><ArrowLeft size={20} className="text-slate-800" /></button><h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Match Scorecard</h2><div className="w-10" /></div>
                        <div className="space-y-4">
                            <div className="bg-white border border-black/5 shadow-xl rounded-3xl overflow-hidden"><div className="bg-slate-50 px-6 py-4 border-b border-black/5 flex justify-between items-center"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Batting</span><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">R (B)</span></div><div className="p-2 space-y-1">{state.batters.filter(b => b.r > 0 || b.out || b.batting).map((b, i) => (<div key={i} onClick={() => setViewingPlayer(b)} className="flex justify-between items-center px-4 py-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors active:scale-95"><div className="flex-1"><p className="text-sm font-black uppercase tracking-tight text-slate-800">{b.name}</p><div className="flex items-center gap-2 mt-0.5"><p className="text-[10px] font-bold text-slate-400 truncate">{b.out ? 'Out' : (b.batting ? 'Not Out*' : 'DNB')}</p><span className="text-[9px] font-bold text-blue-600">4s: {b.fours || 0}</span><span className="text-[9px] font-bold text-indigo-600">6s: {b.sixes || 0}</span></div></div><div className="text-right"><p className="text-sm font-black text-slate-800">{b.r} <span className="text-[10px] text-slate-300">({b.b})</span></p><p className="text-[10px] font-bold text-slate-400">SR: {b.sr}</p></div></div>))}</div></div>
                            <div className="bg-white border border-black/5 shadow-xl rounded-3xl overflow-hidden"><div className="bg-slate-50 px-6 py-4 border-b border-black/5 flex justify-between items-center"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bowling</span><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">O-R-W</span></div><div className="p-2 space-y-1">{state.bowlers.filter(bw => bw.balls > 0).map((bw, i) => (<div key={i} onClick={() => setViewingPlayer(bw)} className="flex justify-between items-center px-4 py-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors active:scale-95"><div><p className="text-sm font-black uppercase tracking-tight text-slate-800">{bw.name}</p><p className="text-[10px] font-bold text-slate-400">Eco: {bw.eco}</p></div><div className="text-right"><p className="text-sm font-black text-slate-800">{Math.floor(bw.balls / 6)}.{bw.balls % 6}-{bw.r}-{bw.w}</p></div></div>))}</div></div>
                        </div>
                    </div>
                )}`;

const result = before + '\n' + mainBlock + '\n' + after;
fs.writeFileSync('client/src/pages/ScoringDashboard.jsx', result);
console.log('Successfully cleaned ScoringDashboard.jsx');
