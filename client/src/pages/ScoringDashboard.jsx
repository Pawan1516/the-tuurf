import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../api/client';
import { ShieldAlert } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const BOWLING_STYLES = ['Fast', 'Spin', 'Medium', 'Fast-Medium', 'Spin'];

export default function ScoringDashboard() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [match, setMatch] = useState(null);
    const [isDbLoading, setIsDbLoading] = useState(true);

    // Live Scorer V4 State
    const [state, setState] = useState({
        phase: 'toss',
        tossWinner: null,
        battingTeam: null,
        bowlingTeam: null,
        openerSelStep: 0,
        runs: 0, wickets: 0, ballInOver: 0, overNum: 0, totalBalls: 0,
        striker: null, nonStriker: null, currentBowlerIdx: null, prevBowlerIdx: null,
        freeHit: false, extras: { wides: 0, noballs: 0, byes: 0 },
        batters: [], bowlers: [],
        currentOverBalls: [], overHistory: [], log: [],
        overs: 20, history: [],
        pendingMilestone: null, milestoneLog: [], lastOverSummary: null,
        pendingNewBatter: false, pendingMilestoneBeforeBowler: false,
        // UI temporary selections
        tossChoice: null, bbChoice: null,
        openerStrikerIdx: null, openerNSIdx: null, selectingOpenerRole: 0
    });

    useEffect(() => {
        const loadMatch = async () => {
            try {
                const res = await apiClient.get(`/matches/${id}`);
                setMatch(res.data);
                
                // Initialize default overs from match if available
                if (res.data.format && res.data.format.startsWith('T')) {
                    setState(s => ({ ...s, overs: parseInt(res.data.format.replace('T', '')) || 20 }));
                }
            } catch (error) {
                console.error("Match fetch failed:", error.response?.data || error.message);
                toast.error(`Fail: ${error.response?.data?.error || error.response?.data?.message || 'Match details lost'}`);
                navigate('/dashboard');
            } finally {
                setIsDbLoading(false);
            }
        };
        loadMatch();
    }, [id, navigate]);

    // Build Teams dynamically based on loaded Match
    const TEAMS = match ? [
        {
            name: match.team_a?.team_id?.name || match.quick_teams?.team_a?.name || 'Team A',
            short: 'TMA',
            players: (match.team_a?.squad?.length ? match.team_a.squad : match.quick_teams?.team_a?.players)?.map(p => p.name || p.display_name) || ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11']
        },
        {
            name: match.team_b?.team_id?.name || match.quick_teams?.team_b?.name || 'Team B',
            short: 'TMB',
            players: (match.team_b?.squad?.length ? match.team_b.squad : match.quick_teams?.team_b?.players)?.map(p => p.name || p.display_name) || ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10', 'B11']
        }
    ] : [];

    // --- State Update Helpers ---
    const updateState = (updates) => setState(prev => ({ ...prev, ...updates }));

    const saveHistory = () => {
        setState(prev => {
            const h = [...prev.history, JSON.stringify({
                runs: prev.runs, wickets: prev.wickets, ballInOver: prev.ballInOver,
                overNum: prev.overNum, totalBalls: prev.totalBalls,
                striker: prev.striker, nonStriker: prev.nonStriker,
                currentBowlerIdx: prev.currentBowlerIdx, prevBowlerIdx: prev.prevBowlerIdx,
                freeHit: prev.freeHit, extras: { ...prev.extras },
                batters: prev.batters.map(b => ({ ...b, milestones: [...b.milestones] })),
                bowlers: prev.bowlers.map(b => ({ ...b })),
                currentOverBalls: [...prev.currentOverBalls],
                log: [...prev.log], milestoneLog: [...prev.milestoneLog],
                lastOverSummary: prev.lastOverSummary
            })];
            if (h.length > 15) h.shift();
            return { ...prev, history: h };
        });
    };

    const handleUndo = () => {
        if (!state.history.length) return;
        setState(prev => {
            const hist = [...prev.history];
            const p = JSON.parse(hist.pop());
            return {
                ...prev, ...p, history: hist,
                phase: 'batting', pendingMilestone: null,
                pendingNewBatter: false, pendingMilestoneBeforeBowler: false
            };
        });
    };

    const swapStrike = () => {
        setState(prev => ({ ...prev, striker: prev.nonStriker, nonStriker: prev.striker }));
    };

    const isOdd = r => r % 2 === 1;
    const rr = () => state.totalBalls > 0 ? ((state.runs / state.totalBalls) * 6).toFixed(2) : '0.00';
    const overStr = () => `${state.overNum}.${state.ballInOver}`;
    const sr = (r, b) => b > 0 ? Math.round((r / b) * 100) : 0;
    const bowlerOv = b => `${Math.floor(b.balls / 6)}.${b.balls % 6}`;
    const eco = b => b.balls > 0 ? ((b.r / (b.balls / 6))).toFixed(1) : '0.0';
    const batName = idx => (idx !== null && state.batters[idx]) ? state.batters[idx].name : '—';
    const bwlName = () => (state.currentBowlerIdx !== null && state.bowlers[state.currentBowlerIdx]) ? state.bowlers[state.currentBowlerIdx].name : '—';

    // --- Action Handlers ---
    const initTeams = (batTeam, bowlTeam) => {
        const bt = TEAMS[batTeam];
        const bwt = TEAMS[bowlTeam];
        updateState({
            batters: bt.players.map(n => ({ name: n, r: 0, b: 0, fours: 0, sixes: 0, out: false, batting: false, milestones: [] })),
            bowlers: bwt.players.map((n, i) => ({ name: n, style: BOWLING_STYLES[i % BOWLING_STYLES.length], overs: 0, r: 0, w: 0, balls: 0 })),
            striker: null, nonStriker: null, currentBowlerIdx: null, prevBowlerIdx: null
        });
    };

    const endOver = () => {
        setState(prev => {
            const bw = { ...prev.bowlers[prev.currentBowlerIdx] };
            bw.overs++;
            
            const runsStr = prev.currentOverBalls.reduce((s, b) => {
                if (b === 'W' || b === '·') return s;
                if (b === 'Wd' || b === 'Nb' || b === 'B') return s + 1;
                return s + (parseInt(b) || 0);
            }, 0);
            const wktStr = prev.currentOverBalls.filter(b => b === 'W').length;

            const sum = {
                overNum: prev.overNum + 1, balls: [...prev.currentOverBalls],
                bowlerName: bw.name, runs: runsStr, wickets: wktStr
            };
            
            const newBowlers = [...prev.bowlers];
            newBowlers[prev.currentBowlerIdx] = bw;

            return {
                ...prev,
                bowlers: newBowlers, lastOverSummary: sum,
                overHistory: [...prev.overHistory, [...prev.currentOverBalls]],
                currentOverBalls: [], overNum: prev.overNum + 1, ballInOver: 0,
                prevBowlerIdx: prev.currentBowlerIdx, currentBowlerIdx: null,
                striker: prev.nonStriker, nonStriker: prev.striker, // swap
                phase: (prev.overNum + 1) >= prev.overs ? 'innings_over' : 'select_bowler'
            };
        });
    };

    const recordBall = (type) => {
        if (state.phase !== 'batting') return;
        saveHistory();
        
        setState(prev => {
            const next = { ...prev, extras: { ...prev.extras }, bowlers: [...prev.bowlers], batters: [...prev.batters], log: [...prev.log], currentOverBalls: [...prev.currentOverBalls] };
            const isWide = type === 'wd', isNB = type === 'nb', isWkt = type === 'w', isBye = type === 'bye';
            const wasFreehit = prev.freeHit;
            let logMsg = '', logCls = '';
            const bwIdx = prev.currentBowlerIdx;
            const bw = { ...next.bowlers[bwIdx] };
            
            if (isWide) {
                next.runs++; next.extras.wides++; bw.r++; bw.balls++;
                next.currentOverBalls.push('Wd'); next.freeHit = false;
                logMsg = 'Wide — 1 extra. Ball not counted.';
            } else if (isNB) {
                next.runs++; next.extras.noballs++; bw.r++; bw.balls++;
                const striker = { ...next.batters[prev.striker] };
                striker.b++; next.batters[prev.striker] = striker;
                next.currentOverBalls.push('Nb'); next.freeHit = true;
                logMsg = 'No ball! FREE HIT next delivery.'; logCls = 'evt-nb';
            } else if (isBye) {
                next.runs++; next.extras.byes++;
                next.ballInOver++; next.totalBalls++; bw.balls++;
                next.currentOverBalls.push('B'); next.freeHit = false;
                if (isOdd(1)) { const t = next.striker; next.striker = next.nonStriker; next.nonStriker = t; }
                logMsg = 'Bye — 1 extra.';
            } else if (isWkt) {
                if (wasFreehit) {
                    const striker = { ...next.batters[prev.striker] };
                    striker.b++; next.batters[prev.striker] = striker;
                    bw.balls++; next.totalBalls++; next.ballInOver++;
                    next.currentOverBalls.push('0'); next.freeHit = false;
                    logMsg = 'Free hit — wicket does NOT count!'; logCls = 'evt-nb';
                } else {
                    next.wickets++;
                    const out = { ...next.batters[prev.striker], out: true, batting: false };
                    next.batters[prev.striker] = out;
                    bw.w++; bw.balls++; next.totalBalls++; next.ballInOver++;
                    next.currentOverBalls.push('W'); next.freeHit = false;
                    logMsg = `WICKET! ${out.name} out for ${out.r}(${out.b}).`; logCls = 'evt-w';
                    
                    if (next.wickets >= 10) next.phase = 'innings_over';
                    else next.phase = 'new_batter';
                }
            } else {
                const runs = type;
                const striker = { ...next.batters[prev.striker] };
                const prevR = striker.r;
                
                next.runs += runs;
                striker.r += runs;
                striker.b++;
                if (runs === 4) striker.fours++;
                if (runs === 6) striker.sixes++;
                
                bw.r += runs; bw.balls++;
                next.totalBalls++; next.ballInOver++;
                next.currentOverBalls.push(runs === 0 ? '·' : String(runs));
                next.freeHit = false;
                
                if (runs === 4) { logMsg = `FOUR! ${striker.name} drives!`; logCls = 'evt-4'; }
                else if (runs === 6) { logMsg = `SIX! ${striker.name} launches it!`; logCls = 'evt-6'; }
                else logMsg = runs === 0 ? 'Dot ball.' : `${runs} run${runs > 1 ? 's' : ''}${isOdd(runs) ? ' — strike rotates' : ''}`;
                
                next.batters[prev.striker] = striker;
                
                // Milestone check
                for(const val of [50,100,150,200]){
                    if(prevR < val && striker.r >= val && !striker.milestones.includes(val)){
                        striker.milestones.push(val);
                        next.pendingMilestone = { batter: striker, val, type: val >= 100 ? 'century' : 'fifty', fours: striker.fours, sixes: striker.sixes };
                        next.milestoneLog = [`${striker.name} — ${val===100?'Century!':val===50?'Fifty!':val+'!'} ${val}(${striker.b})`, ...next.milestoneLog];
                        next.phase = 'milestone';
                        break;
                    }
                }
                if (isOdd(runs)) { const t = next.striker; next.striker = next.nonStriker; next.nonStriker = t; }
            }
            
            next.bowlers[bwIdx] = bw;
            if (next.log.length > 3) next.log.shift();
            next.log.push({ msg: logMsg, cls: logCls });
            
            // Over logic AFTER ball processing (we check next state if it hasn't forced a wicket/milestone phase)
            if (next.ballInOver >= 6 && next.phase === 'batting') {
                 // Inline endOver logic
                 const newBw = { ...next.bowlers[next.currentBowlerIdx] };
                 newBw.overs++;
                 next.lastOverSummary = {
                     overNum: next.overNum + 1, balls: [...next.currentOverBalls],
                     bowlerName: newBw.name, runs: next.currentOverBalls.reduce((s, b) => (b === 'W' || b === '·' ? s : (b==='Wd'||b==='Nb'||b==='B')? s+1 : s+(parseInt(b)||0)), 0),
                     wickets: next.currentOverBalls.filter(b => b === 'W').length
                 };
                 next.overHistory.push([...next.currentOverBalls]);
                 next.currentOverBalls = []; next.overNum++; next.ballInOver = 0;
                 next.prevBowlerIdx = next.currentBowlerIdx; next.currentBowlerIdx = null;
                 const tmp = next.striker; next.striker = next.nonStriker; next.nonStriker = tmp;
                 
                 if (next.overNum >= next.overs) next.phase = 'innings_over';
                 else if (next.phase !== 'milestone' && next.phase !== 'new_batter') next.phase = 'select_bowler';
                 else if (next.phase === 'milestone') next.pendingMilestoneBeforeBowler = true;
            }
            
            // Sync with backend API
            apiClient.post(`/matches/${id}/ball`, { runs: typeof type === 'number' ? type : 0, isWicket: type==='w', extra: typeof type === 'string' && type !== 'w' ? type : null }).catch(() => {});

            return next;
        });
    };

    // Rendering Helpers
    const bc = b => {
        if (b==='W') return 'b-w'; if (b==='Wd') return 'b-wd'; if (b==='Nb') return 'b-nb';
        if (b==='4') return 'b-4'; if (b==='6') return 'b-6'; if (b==='·' || b==='0') return 'b-dot';
        if (b==='1') return 'b-1'; return 'b-2';
    };

    // Verification protection
    if (isDbLoading) return <div className="min-h-screen flex items-center justify-center font-black uppercase text-emerald-600">Loading Score Interface...</div>;
    
    if (match && match.verification?.status !== 'VERIFIED' && !match.is_offline_match) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
                <ShieldAlert className="w-16 h-16 text-red-500 mb-6" />
                <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-4">Verification Required</h1>
                <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl shadow-gray-200 border border-gray-100 mb-8 max-w-sm w-full">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-4">Official Match QR Code</p>
                    {match.verification?.qr_code?.code ? (
                        <div className="bg-white p-4 rounded-3xl border-2 border-dashed border-gray-200 flex items-center justify-center">
                            <QRCodeSVG value={match.verification.qr_code.code} size={220} level="H" includeMargin={true} style={{ width: '100%', height: 'auto' }} />
                        </div>
                    ) : ( <div className="aspect-square bg-gray-100 rounded-3xl flex flex-col items-center justify-center gap-2"><div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div></div> )}
                    <p className="mt-6 text-[11px] font-bold text-gray-400 leading-relaxed px-4">Please present this QR to the <span className="text-gray-900 underline decoration-emerald-400">Turf Administrator</span> to unlock scoring.</p>
                </div>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                    <button onClick={() => window.location.reload()} className="bg-emerald-600 text-white w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Check Verification</button>
                    <button onClick={() => navigate('/dashboard')} className="bg-white text-gray-400 w-full py-4 rounded-2xl font-black uppercase font-xs tracking-widest">Return to Dashboard</button>
                </div>
            </div>
        );
    }

    const { phase } = state;

    return (
        <div className="scorer-v4-app font-sans">
            <style>{`
                .scorer-v4-app { background: #F1F8E9; min-height: 100vh; padding: 12px; color: #1A1A2E; box-sizing: border-box; }
                .scorer-v4-app * { box-sizing: border-box; margin: 0; padding: 0; }
                .app-ctn { max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 20px rgba(0,0,0,.1); }
                .topbar { background: #1B5E20; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; }
                .topbar-left { color: #fff; font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
                .live-dot { width: 8px; height: 8px; border-radius: 50%; background: #4CAF50; animation: blink 1.2s infinite; }
                @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
                .scoreboard { background: #1B5E20; padding: 14px; color: #fff; }
                .sb-teams { display: flex; justify-content: space-between; font-size: 12px; color: #A5D6A7; margin-bottom: 8px; }
                .sb-main { display: flex; align-items: flex-end; justify-content: space-between; }
                .sb-score { font-size: 40px; font-weight: 700; line-height: 1; }
                .sb-over { font-size: 22px; font-weight: 600; color: #C8E6C9; }
                .sb-rr { font-size: 12px; color: #A5D6A7; margin-top: 2px; }
                .sb-extras { font-size: 11px; color: #81C784; margin-top: 6px; }
                .freehit-banner { background: #E65100; color: #fff; text-align: center; padding: 6px; font-size: 13px; font-weight: 600; }
                .balls-row { display: flex; gap: 5px; padding: 8px 14px; background: #145214; flex-wrap: wrap; align-items: center; min-height: 48px; }
                .ball { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; flex-shrink: 0; }
                .b-dot { background: rgba(255,255,255,.15); color: #C8E6C9; }
                .b-1 { background: rgba(255,255,255,.25); color: #fff; }
                .b-2, .b-3 { background: #2E7D32; color: #fff; }
                .b-4 { background: #1565C0; color: #fff; }
                .b-6 { background: #E65100; color: #fff; }
                .b-w { background: #C62828; color: #fff; }
                .b-wd { background: rgba(255,255,255,.1); color: #A5D6A7; font-size: 10px; }
                .b-nb { background: #7B1FA2; color: #fff; font-size: 10px; }
                .section { background: #fff; border: 1px solid #E0E0E0; border-radius: 12px; margin: 8px; padding: 12px; }
                .sec-title { font-size: 11px; font-weight: 600; color: #546E7A; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 10px; text-align: left; }
                .bat-table { width: 100%; border-collapse: collapse; font-size: 13px; }
                .bat-table th { font-size: 11px; color: #546E7A; font-weight: 600; text-align: right; padding: 3px 4px; }
                .bat-table th:first-child { text-align: left; }
                .bat-table td { padding: 5px 4px; text-align: right; }
                .bat-table td:first-child { text-align: left; }
                .bat-table tr.on-strike td { font-weight: 700; }
                .bat-table tr.on-strike td:first-child { color: #1B5E20; }
                .striker-badge { display: inline-block; background: #E8F5E9; color: #2E7D32; font-size: 10px; padding: 1px 5px; border-radius: 8px; margin-left: 4px; }
                .milestone-badge { display: inline-block; font-size: 10px; padding: 1px 6px; border-radius: 8px; margin-left: 3px; }
                .badge-50 { background: #FFF3E0; color: #E65100; }
                .badge-100 { background: #FFF8E1; color: #F57F17; }
                .bowl-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; padding: 6px 0; border-bottom: 1px solid #F5F5F5; }
                .bowl-row:last-child { border: none; }
                .btn-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
                .score-btn { padding: 12px 4px; border: 1px solid #E0E0E0; border-radius: 8px; background: #fff; cursor: pointer; font-size: 15px; font-weight: 700; font-family: inherit; color: #1A1A2E; transition: all .12s; text-align: center; }
                .score-btn:hover { background: #F5F5F5; }
                .score-btn:active { transform: scale(.94); }
                .score-btn.s4 { border-color: #1565C0; color: #0C447C; background: #E3F2FD; }
                .score-btn.s6 { border-color: #E65100; color: #633806; background: #FFF3E0; }
                .score-btn.sw { border-color: #C62828; color: #791F1F; background: #FFEBEE; }
                .score-btn.swd, .score-btn.sb { color: #546E7A; }
                .score-btn.snb { border-color: #7B1FA2; color: #4A148C; background: #F3E5F5; }
                .score-btn.disabled { opacity: .35; cursor: not-allowed; pointer-events: none; }
                .evt-log { font-size: 12px; color: #546E7A; text-align: center; padding: 4px; min-height: 18px; }
                .evt-log.evt-4 { color: #0C447C; } .evt-log.evt-6 { color: #633806; } .evt-log.evt-w { color: #791F1F; font-weight: 600; } .evt-log.evt-nb { color: #4A148C; }
                .wkt-dots { display: flex; gap: 4px; justify-content: center; padding: 4px 0; }
                .wkt-dot { width: 14px; height: 14px; border-radius: 50%; border: 1.5px solid #BDBDBD; }
                .wkt-dot.fallen { background: #C62828; border-color: #C62828; }
                .undo-btn { font-size: 11px; color: #546E7A; background: none; border: 1px solid #E0E0E0; border-radius: 8px; padding: 3px 8px; cursor: pointer; }
                .player-btn { display: block; width: 100%; padding: 10px 12px; border: 1px solid #E0E0E0; border-radius: 8px; background: #fff; cursor: pointer; font-size: 13px; font-family: inherit; color: #1A1A2E; text-align: left; margin-bottom: 6px; transition: all .12s; }
                .player-btn.disabled-bowler { opacity: .4; cursor: not-allowed; pointer-events: none; background: #FAFAFA; }
                .over-summary-card { background: #1B5E20; border-radius: 12px; padding: 12px 14px; color: #fff; margin: 8px 8px 0; }
                .bowler-select-card { border-radius: 12px; border: 1px solid #E0E0E0; background: #fff; margin: 8px; padding: 12px; text-align: left; }
                .congrats-overlay { background: rgba(0,0,0,.5); padding: 14px; border-radius: 12px; margin: 8px; }
                .congrats-card { border-radius: 12px; padding: 18px; text-align: center; }
                .congrats-card.fifty { background: linear-gradient(135deg, #FFF3E0, #FFE0B2); border: 2px solid #FF6F00; }
                .congrats-card.century { background: linear-gradient(135deg, #FFFDE7, #FFF9C4); border: 2px solid #F9A825; }
                .congrats-title { font-size: 22px; font-weight: 700; margin-bottom: 4px; } .congrats-title.fifty { color: #E65100; } .congrats-title.century { color: #F57F17; }
                .congrats-score-big { font-size: 44px; font-weight: 700; margin: 6px 0; } .congrats-score-big.fifty { color: #E65100; }
                .milestone-stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 10px 0; }
                .ms-stat { background: rgba(255,255,255,.7); border-radius: 8px; padding: 8px; text-align: center; }
                .dismiss-btn { border: none; border-radius: 8px; padding: 10px 28px; font-size: 14px; font-weight: 600; cursor: pointer; }
                .dismiss-btn.fifty { background: #E65100; color: #fff; } .dismiss-btn.century { background: #F9A825; color: #fff; }
                .toss-wrap { padding: 20px 16px; text-align: center; }
                .coin { width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg,#FFD700,#FFA000); display: inline-flex; align-items: center; justify-content: center; font-size: 32px; border: 3px solid #FF8F00; margin: 20px auto; cursor: pointer; transition: transform 0.2s; }
                .coin.spinning { animation: coinSpin 0.7s ease-in-out; }
                @keyframes coinSpin { 0%{transform:rotateY(0deg)} 40%{transform:rotateY(360deg)} 100%{transform:rotateY(720deg)} }
                .team-choice-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
                .team-choice-btn { padding: 14px 8px; border: 2px solid #E0E0E0; border-radius: 12px; background: #fff; cursor: pointer; font-size: 14px; font-weight: 600; text-align: center; }
                .team-choice-btn.selected { border-color: #1B5E20; background: #E8F5E9; color: #1B5E20; }
                .bat-ball-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
                .bb-btn { padding: 20px 10px; border: 2px solid #E0E0E0; border-radius: 14px; background: #fff; cursor: pointer; text-align: center; }
                .bb-btn.bat-opt.sel { border-color: #1B5E20; background: #E8F5E9; } .bb-btn.ball-opt.sel { border-color: #C62828; background: #FFEBEE; }
                .confirm-btn { width: 100%; padding: 13px; border: none; border-radius: 10px; background: #1B5E20; color: #fff; font-size: 15px; font-weight: 700; cursor: pointer; margin-top: 14px; }
                .confirm-btn:disabled { opacity: .35; cursor: not-allowed; }
                .toss-result-banner { background: #1B5E20; color: #fff; border-radius: 10px; padding: 12px; margin-bottom: 16px; }
                .opener-slot { border: 2px dashed #C8E6C9; border-radius: 10px; padding: 12px; margin-bottom: 10px; background: #F9FBF9; cursor: pointer; text-align: center; }
                .opener-slot.filled { border-style: solid; border-color: #1B5E20; background: #E8F5E9; }
                .op-item { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border: 1px solid #E0E0E0; border-radius: 8px; margin-bottom: 6px; cursor: pointer; background: #fff; text-align: left; }
                .op-item.used { opacity: .35; cursor: not-allowed; background: #F5F5F5; }
                .crease-card { background: linear-gradient(135deg, #1B5E20, #2E7D32); border-radius: 12px; margin: 8px 8px 0; padding: 14px; color: #fff; }
                .crease-row { display: flex; gap: 10px; }
                .crease-box { flex: 1; background: rgba(255,255,255,.12); border-radius: 10px; padding: 10px; text-align: center; }
                .crease-box.striker { background: rgba(255,255,255,.22); border: 2px solid rgba(255,255,255,.4); }
            `}</style>
            
            <div className="app-ctn pb-8">
                <div className="topbar">
                    <div className="topbar-left">
                        <div className="live-dot"></div>
                        The Turf — Live Scorer
                    </div>
                    <span style={{color: '#A5D6A7', fontSize: '12px'}}>v4</span>
                </div>

                {phase === 'toss' && (
                    <div className="toss-wrap">
                        <h2>🏏 The Toss</h2>
                        <p style={{fontSize: '13px', color: '#546E7A', marginTop: '4px'}}>Select the team that won the toss</p>
                        <div className="coin" id="tc" onClick={() => { document.getElementById('tc').classList.remove('spinning'); void document.getElementById('tc').offsetWidth; document.getElementById('tc').classList.add('spinning'); }}>🪙</div>
                        <div style={{fontSize: '12px', fontWeight: 600, color: '#546E7A', marginBottom: '8px'}}>Who won the toss?</div>
                        <div className="team-choice-row">
                            {TEAMS.map((t, i) => (
                                <button key={i} className={`team-choice-btn ${state.tossChoice === i ? 'selected' : ''}`} onClick={() => updateState({ tossChoice: i })}>
                                    <div style={{fontSize: '20px', marginBottom: '5px'}}>{i === 0 ? '🔵' : '🟡'}</div>
                                    <div>{t.name}</div>
                                </button>
                            ))}
                        </div>
                        <button className="confirm-btn" disabled={state.tossChoice === null} onClick={() => updateState({ tossWinner: state.tossChoice, tossChoice: null, phase: 'choose_bat_ball' })}>
                            Confirm Toss Winner →
                        </button>
                    </div>
                )}

                {phase === 'choose_bat_ball' && (
                    <div className="toss-wrap">
                        <div className="toss-result-banner">
                            <div style={{fontSize: '17px', fontWeight: 700}}>{TEAMS[state.tossWinner].name} won the toss!</div>
                            <div style={{fontSize: '12px', color: '#A5D6A7'}}>Choose to bat or bowl first</div>
                        </div>
                        <div className="bat-ball-row">
                            <button className={`bb-btn bat-opt ${state.bbChoice === 'bat' ? 'sel' : ''}`} onClick={() => updateState({ bbChoice: 'bat' })}>
                                <span style={{fontSize: '32px'}}>🏏</span><div style={{color: '#1B5E20', fontWeight: 700}}>Bat</div>
                            </button>
                            <button className={`bb-btn ball-opt ${state.bbChoice === 'ball' ? 'sel' : ''}`} onClick={() => updateState({ bbChoice: 'ball' })}>
                                <span style={{fontSize: '32px'}}>🎳</span><div style={{color: '#C62828', fontWeight: 700}}>Bowl</div>
                            </button>
                        </div>
                        <button className="confirm-btn" disabled={!state.bbChoice} onClick={() => {
                            const batTeam = state.bbChoice === 'bat' ? state.tossWinner : (state.tossWinner === 0 ? 1 : 0);
                            const bowlTeam = state.bbChoice === 'bat' ? (state.tossWinner === 0 ? 1 : 0) : state.tossWinner;
                            updateState({ battingTeam: batTeam, bowlingTeam: bowlTeam, phase: 'select_openers', openerSelStep: 0 });
                            initTeams(batTeam, bowlTeam);
                        }}>Confirm Choice →</button>
                    </div>
                )}

                {phase === 'select_openers' && (
                    <div style={{padding: '8px'}}>
                        <div className="section" style={{margin: '0 0 8px'}}>
                            <div style={{fontSize: '15px', fontWeight: 700}}>Opening Partnership</div>
                            <div style={{fontSize: '12px', color: '#546E7A'}}>{TEAMS[state.battingTeam].name}</div>
                        </div>
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px'}}>
                            <div className={`opener-slot ${state.openerStrikerIdx !== null ? 'filled' : ''}`} onClick={() => state.openerStrikerIdx === null && updateState({ selectingOpenerRole: 0 })}>
                                <div>Striker 🏏</div>
                                <div style={{fontSize: '15px', fontWeight: 700, marginTop: '5px'}}>{state.openerStrikerIdx !== null ? state.batters[state.openerStrikerIdx].name : 'Tap player below'}</div>
                            </div>
                            <div className={`opener-slot ${state.openerNSIdx !== null ? 'filled' : ''}`} onClick={() => state.openerStrikerIdx !== null && state.openerNSIdx === null && updateState({ selectingOpenerRole: 1 })}>
                                <div>Non-Striker 🏃</div>
                                <div style={{fontSize: '15px', fontWeight: 700, marginTop: '5px'}}>{state.openerNSIdx !== null ? state.batters[state.openerNSIdx].name : 'After striker'}</div>
                            </div>
                        </div>
                        <div style={{maxHeight: '260px', overflowY: 'auto'}}>
                            {TEAMS[state.battingTeam].players.map((n, i) => {
                                const used = state.openerStrikerIdx === i || state.openerNSIdx === i;
                                return (
                                    <div key={i} className={`op-item ${used ? 'used' : ''}`} onClick={() => {
                                        if (used) return;
                                        if (state.selectingOpenerRole === 0) updateState({ openerStrikerIdx: i, selectingOpenerRole: 1 });
                                        else updateState({ openerNSIdx: i });
                                    }}>
                                        <div style={{width: '32px', height: '32px', borderRadius: '50%', background: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#1B5E20'}}>{n[0]}</div>
                                        <div><div style={{fontWeight: 600, fontSize: '13px'}}>{n}</div></div>
                                    </div>
                                );
                            })}
                        </div>
                        <button className="confirm-btn" disabled={state.openerStrikerIdx === null || state.openerNSIdx === null} onClick={() => {
                            setState(s => {
                                const nb = [...s.batters];
                                nb[s.openerStrikerIdx].batting = true;
                                nb[s.openerNSIdx].batting = true;
                                return { ...s, batters: nb, striker: s.openerStrikerIdx, nonStriker: s.openerNSIdx, phase: 'select_bowler' };
                            });
                        }}>Start Match →</button>
                    </div>
                )}

                {phase === 'new_batter' && (
                    <div style={{margin: '8px'}}><div className="section">
                        <div style={{fontSize: '15px', fontWeight: 700, marginBottom: '4px'}}>Wicket — select new batsman</div>
                        <div className="wkt-dots" style={{marginBottom: '12px'}}>
                            {Array.from({length: 10}).map((_, i) => <div key={i} className={`wkt-dot ${i < state.wickets ? 'fallen' : ''}`}></div>)}
                        </div>
                        {state.batters.map((b, i) => !b.out && !b.batting && i >= 2 ? (
                            <button key={i} className="player-btn" onClick={() => {
                                setState(s => {
                                    const nb = [...s.batters]; nb[i].batting = true;
                                    return { ...s, batters: nb, nonStriker: s.striker, striker: i, phase: 'batting' };
                                });
                            }}>🏏 {b.name}</button>
                        ) : null)}
                    </div></div>
                )}

                {phase === 'select_bowler' && (
                    <div>
                        {state.lastOverSummary && (
                            <div className="over-summary-card">
                                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '6px'}}>
                                    <span>Over {state.lastOverSummary.overNum} — {state.lastOverSummary.bowlerName}</span>
                                    <span style={{fontWeight: 700}}>{state.lastOverSummary.runs} runs{state.lastOverSummary.wickets ? ' • ' + state.lastOverSummary.wickets + 'W' : ''}</span>
                                </div>
                                <div style={{display: 'flex', gap: '5px'}}>{state.lastOverSummary.balls.map((b, i) => <div key={i} className={`ball ${bc(b)}`}>{b==='·'?'0':b}</div>)}</div>
                            </div>
                        )}
                        <div className="bowler-select-card">
                            <div style={{fontWeight: 700, fontSize: '15px', marginBottom: '10px'}}>Select bowler — Over {state.overNum + 1}</div>
                            {state.bowlers.map((b, i) => {
                                const maxOvers = Math.ceil(state.overs / 5);
                                const disabled = i === state.prevBowlerIdx || b.overs >= maxOvers;
                                return (
                                    <button key={i} className={`player-btn ${disabled ? 'disabled-bowler' : ''}`} onClick={() => !disabled && updateState({ currentBowlerIdx: i, phase: 'batting' })}>
                                        <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                            <span><b>{b.name}</b> <small>{b.style}</small></span>
                                            <span>{bowlerOv(b)}-{b.r}-{b.w}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {phase === 'batting' && (
                    <div>
                        {state.freeHit && <div className="freehit-banner">FREE HIT — Wicket does not count this ball</div>}
                        <div className="scoreboard">
                            <div className="sb-teams"><span>{TEAMS[state.battingTeam].name} batting</span><span>Over {state.overNum + 1} of {state.overs}</span></div>
                            <div className="sb-main">
                                <div className="sb-score">{state.runs}/{state.wickets}</div>
                                <div style={{textAlign: 'right'}}><div className="sb-over">{overStr()} ov</div><div className="sb-rr">RR: {rr()}</div></div>
                            </div>
                            <div className="sb-extras">Extras: {state.extras.wides}wd {state.extras.noballs}nb {state.extras.byes}b</div>
                        </div>

                        <div className="balls-row">
                            <span style={{fontSize: '10px', color: '#81C784', marginRight: '2px'}}>O ${state.overNum + 1}:</span>
                            {state.currentOverBalls.map((b, i) => <div key={i} className={`ball ${bc(b)}`}>{b==='·'?'0':b}</div>)}
                            <div style={{marginLeft: 'auto'}}><button className="undo-btn" onClick={handleUndo}>↩ Undo</button></div>
                        </div>

                        <div className="crease-card">
                            <div style={{fontSize: '10px', color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', marginBottom: '8px'}}>At the Crease</div>
                            <div className="crease-row">
                                <div className="crease-box striker">
                                    <span className="crease-icon">🏏</span>
                                    <div className="crease-name">{batName(state.striker)}</div>
                                    <div style={{fontSize: '11px'}}>{state.striker !== null ? `${state.batters[state.striker].r}(${state.batters[state.striker].b})` : ''}</div>
                                </div>
                                <div className="crease-box">
                                    <span className="crease-icon">🏃</span>
                                    <div className="crease-name">{batName(state.nonStriker)}</div>
                                    <div style={{fontSize: '11px'}}>{state.nonStriker !== null ? `${state.batters[state.nonStriker].r}(${state.batters[state.nonStriker].b})` : ''}</div>
                                </div>
                                <div className="crease-box">
                                    <span className="crease-icon">🎳</span>
                                    <div className="crease-name">{bwlName()}</div>
                                    <div style={{fontSize: '11px'}}>{state.currentBowlerIdx !== null ? `${bowlerOv(state.bowlers[state.currentBowlerIdx])}-${state.bowlers[state.currentBowlerIdx].r}-${state.bowlers[state.currentBowlerIdx].w}` : ''}</div>
                                </div>
                            </div>
                        </div>

                        <div className="section">
                            <div className="btn-grid">
                                <button className="score-btn" onClick={() => recordBall(0)}>0</button>
                                <button className="score-btn" onClick={() => recordBall(1)}>1</button>
                                <button className="score-btn" onClick={() => recordBall(2)}>2</button>
                                <button className="score-btn" onClick={() => recordBall(3)}>3</button>
                                <button className="score-btn s4" onClick={() => recordBall(4)}>4</button>
                                <button className="score-btn s6" onClick={() => recordBall(6)}>6</button>
                                <button className={`score-btn sw ${state.freeHit ? 'disabled' : ''}`} onClick={() => recordBall('w')}>W</button>
                                <button className="score-btn swd" onClick={() => recordBall('wd')}>Wd</button>
                                <button className="score-btn snb" onClick={() => recordBall('nb')}>Nb</button>
                                <button className="score-btn sb" onClick={() => recordBall('bye')}>Bye</button>
                                <button className="score-btn" style={{gridColumn: 'span 2', fontSize: '12px'}} onClick={swapStrike}>⇄ Swap</button>
                            </div>
                        </div>
                    </div>
                )}

                {phase === 'innings_over' && (
                    <div className="section" style={{margin: '8px', textAlign: 'center'}}>
                        <h2 style={{fontSize: '28px', fontWeight: 700, margin: '10px 0'}}>{state.runs}/{state.wickets}</h2>
                        <div style={{fontSize: '13px', color: '#546E7A'}}>{overStr()} overs • RR {rr()} • {state.wickets >= 10 ? 'All out' : 'Complete'}</div>
                        <button className="score-btn" style={{width: '100%', marginTop: '20px', padding: '12px'}} onClick={() => navigate('/dashboard')}>✅ Finish Match</button>
                    </div>
                )}

                {phase === 'milestone' && state.pendingMilestone && (
                    <div className="congrats-overlay">
                        <div className={`congrats-card ${state.pendingMilestone.type}`}>
                            <h2 style={{fontSize: '22px', fontWeight: 'bold'}}>{state.pendingMilestone.val >= 100 ? 'Century!' : 'Fifty!'}</h2>
                            <div style={{fontSize: '18px', fontWeight: 'bold'}}>{state.pendingMilestone.batter.name}</div>
                            <div className={`congrats-score-big ${state.pendingMilestone.type}`}>{state.pendingMilestone.val}</div>
                            <button className={`dismiss-btn ${state.pendingMilestone.type}`} onClick={() => updateState({ phase: state.pendingMilestoneBeforeBowler ? 'select_bowler' : 'batting', pendingMilestone: null })}>Continue</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
