import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../api/client';
import { ShieldAlert, Trophy, Coins, Users, User, ArrowLeft, RefreshCw, Undo2, LogOut } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { PlayerDB } from '../utils/playerDb';

const PRESET_TEAMS = [
    {
        id:'mumbai', name:'Mumbai Strikers', short:'MBS', emoji:'🔵',
        color:'#1565C0', bg:'#E3F2FD',
        players:['Rohit Sharma','Ishan Kishan','Suryakumar Yadav','Tilak Varma','Hardik Pandya','Tim David','Kieron Pollard','Krunal Pandya','Jasprit Bumrah','Trent Boult','Piyush Chawla']
    },
    {
        id:'chennai', name:'Chennai Super Kings', short:'CSK', emoji:'🟡',
        color:'#F9A825', bg:'#FFFDE7',
        players:['Ruturaj Gaikwad','Devon Conway','Ajinkya Rahane','Shivam Dube','Moeen Ali','MS Dhoni','Ravindra Jadeja','Deepak Chahar','Mitchell Santner','Simarjeet Singh','Matheesha Pathirana']
    },
    {
        id:'rcb', name:'Royal Challengers', short:'RCB', emoji:'🔴',
        color:'#C62828', bg:'#FFEBEE',
        players:['Virat Kohli','Faf du Plessis','Glenn Maxwell','Rajat Patidar','Dinesh Karthik','Anuj Rawat','Cameron Green','Wanindu Hasaranga','Mohammed Siraj','Josh Hazlewood','Akash Deep']
    },
    {
        id:'kolkata', name:'Kolkata Knight Riders', short:'KKR', emoji:'🟣',
        color:'#6A1B9A', bg:'#F3E5F5',
        players:['Shreyas Iyer','Venkatesh Iyer','Phil Salt','Rinku Singh','Andre Russell','Sunil Narine','Rahmanullah Gurbaz','Nitish Rana','Varun Chakravarthy','Mitchell Starc','Harshit Rana']
    },
    {
        id:'sunrisers', name:'Sunrisers Hyderabad', short:'SRH', emoji:'🟠',
        color:'#E65100', bg:'#FFF3E0',
        players:['Travis Head','Abhishek Sharma','Aiden Markram','Heinrich Klaasen','Abdul Samad','Pat Cummins','Shahbaz Ahmed','Bhuvneshwar Kumar','Mayank Agarwal','T Natarajan','Umran Malik']
    }
];

const BOWLING_STYLES = ['Fast', 'Spin', 'Medium', 'Fast-Medium', 'Off-Spin', 'Leg-Spin'];
const DISMISSAL_TYPES = [
    { key: 'bowled', label: 'Bowled', icon: '🎯', needsFielder: false, needsRORuns: false, creditsBowler: true },
    { key: 'caught', label: 'Caught', icon: '🤲', needsFielder: true, needsRORuns: false, creditsBowler: true },
    { key: 'runout', label: 'Run Out', icon: '🏃', needsFielder: true, needsRORuns: true, creditsBowler: false },
    { key: 'lbw', label: 'LBW', icon: '🦵', needsFielder: false, needsRORuns: false, creditsBowler: true },
    { key: 'stumped', label: 'Stumped', icon: '🧤', needsFielder: false, needsRORuns: false, creditsBowler: true },
    { key: 'hitwicket', label: 'Hit Wicket', icon: '💥', needsFielder: false, needsRORuns: false, creditsBowler: true }
];

const getPOTM = (state, teams) => {
    const scored = {};
    const processPlayer = (p, isBatting, isBowling) => {
        if (!scored[p.name]) scored[p.name] = { name: p.name, pts: 0, r: 0, w: 0, b: 0, overs: 0, eco: 0, sr: 0, user_id: p.user_id };
        const s = scored[p.name];
        if (isBatting) {
            s.r += p.r || 0;
            s.b += p.b || 0;
            s.pts += (p.r || 0);
            if (p.r >= 100) s.pts += 20;
            else if (p.r >= 50) s.pts += 10;
            s.sr = p.b > 0 ? Math.round((p.r / p.b) * 100) : 0;
        }
        if (isBowling) {
            s.w += p.w || 0;
            s.overs += p.overs || 0;
            s.pts += (p.w || 0) * 15;
            if (p.w >= 3) s.pts += 10;
        }
    };
    state.batters.forEach(b => processPlayer(b, true, false));
    state.bowlers.forEach(bw => processPlayer(bw, false, true));
    if (state.inn1Batters) state.inn1Batters.forEach(b => processPlayer(b, true, false));
    if (state.inn1Bowlers) state.inn1Bowlers.forEach(bw => processPlayer(bw, false, true));
    return Object.values(scored).sort((a,b) => b.pts - a.pts).slice(0, 3);
};

export default function ScoringDashboard() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [match, setMatch] = useState(null);
    const [isDbLoading, setIsDbLoading] = useState(true);
    const [presetTeams, setPresetTeams] = useState(JSON.parse(JSON.stringify(PRESET_TEAMS)));
    const [TEAMS, setTeams] = useState([
        { name: 'Team A', short: 'TMA', players: Array(11).fill("").map((_, i) => ({ name: `Player ${i+1}`, user_id: null })) },
        { name: 'Team B', short: 'TMB', players: Array(11).fill("").map((_, i) => ({ name: `Player ${i+1}`, user_id: null })) }
    ]);
    const [viewingPlayer, setViewingPlayer] = useState(null);

    const [setupState, setSetupState] = useState({
        step: 0, title: '', venue: '', overs: 20,
        teams: [
            { name: '', players: Array(11).fill("").map((_, i) => `Player ${i+1}`).join('\n') },
            { name: '', players: Array(11).fill("").map((_, i) => `Player ${i+1}`).join('\n') }
        ]
    });

    const [quickMatchState, setQuickMatchState] = useState({ teamAId: null, teamBId: null, overs: 20, step: 'pick_a' });
    const [editSquadId, setEditSquadId] = useState(null);

    const [state, setState] = useState({
        phase: 'match_setup', // Initial phase for new matches
        tossWinner: null, battingTeam: null, bowlingTeam: null,
        runs: 0, wickets: 0, ballInOver: 0, overNum: 0, totalBalls: 0,
        striker: null, nonStriker: null,
        currentBowlerIdx: null, prevBowlerIdx: null,
        freeHit: false,
        extras: { wides: 0, noballs: 0, byes: 0 },
        batters: [], bowlers: [],
        currentOverBalls: [], overHistory: [], log: [],
        overs: 20, history: [],
        pendingMilestone: null, milestoneLog: [], lastOverSummary: null,
        partnership: { runs: 0, balls: 0 },
        inningsNum: 1, target: null, 
        pendingWicket: null
    });

    const updateState = (updates) => setState(prev => ({ ...prev, ...updates }));

    useEffect(() => {
        PlayerDB.initializePresets(PRESET_TEAMS);
        const fetchMatch = async () => {
             try {
                const res = await apiClient.get(`/matches/${id}`);
                const matchData = res.data.match || res.data;
                setMatch(matchData);
                if (matchData.team_a && matchData.team_b) {
                    setTeams([
                        {
                            name: matchData.team_a?.team_id?.name || matchData.quick_teams?.team_a?.name || 'Team A',
                            short: matchData.team_a?.team_id?.short_name || 'TMA',
                            players: (matchData.team_a.squad?.length ? matchData.team_a.squad : matchData.quick_teams?.team_a?.players)?.map(p => ({
                                name: p.name || p.display_name,
                                user_id: p._id || p.user_id || null
                            })) || []
                        },
                        {
                            name: matchData.team_b?.team_id?.name || matchData.quick_teams?.team_b?.name || 'Team B',
                            short: matchData.team_b?.team_id?.short_name || 'TMB',
                            players: (matchData.team_b.squad?.length ? matchData.team_b.squad : matchData.quick_teams?.team_b?.players)?.map(p => ({
                                name: p.name || p.display_name,
                                user_id: p._id || p.user_id || null
                            })) || []
                        }
                    ]);
                }
                if (matchData.format && matchData.format.startsWith('T')) {
                    setState(s => ({ ...s, overs: parseInt(matchData.format.replace('T', '')) || 20 }));
                }
                
                if (matchData.live_data && Object.keys(matchData.live_data).length > 2) {
                    setState(s => ({ ...s, ...matchData.live_data }));
                } else if (matchData.status === 'Completed') {
                    setState(s => ({ ...s, phase: 'match_result', result: 'Match Completed' }));
                } else if (matchData.status === 'In Progress' || matchData.verification?.status === 'VERIFIED') {
                    setState(s => ({ ...s, phase: 'toss' }));
                }
            } catch (error) {
                toast.error("Match link broken or private.");
                navigate('/dashboard');
            } finally {
                setIsDbLoading(false);
            }
        };
        fetchMatch();
    }, [id, navigate]);

    const handleEditPlayerProfile = (name) => {
        const p = PlayerDB.get(name);
        const role = prompt(`Enter Role for ${name}:`, p.role);
        const bat = prompt(`Enter Batting Style for ${name}:`, p.batStyle);
        const bowl = prompt(`Enter Bowling Style for ${name}:`, p.bowlStyle);
        if (role !== null && bat !== null && bowl !== null) {
            PlayerDB.editProfile(name, { role, batStyle: bat, bowlStyle: bowl });
            toast.success("Profile Updated!");
        }
    };

    const PlayerProfileModal = ({ player, onClose }) => {
        const [stats, setStats] = useState(null);
        useEffect(() => {
            const load = async () => {
                const data = await PlayerDB.getRemoteProfile(typeof player === 'string' ? player : player.name);
                setStats(data);
            };
            load();
        }, [player]);

        if (!stats) return null;
        return (
            <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-[#0D1B0F] border border-white/10 rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95">
                    <div className="p-8 pb-4 text-center">
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                            <User size={40} className="text-emerald-500" />
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter">{stats.name}</h2>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1">{stats.role}</p>
                    </div>
                    
                    <div className="p-8 pt-0 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                                <p className="text-2xl font-black">{stats.matches}</p>
                                <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1">Matches</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                                <p className="text-2xl font-black">{stats.runs}</p>
                                <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1">Total Runs</p>
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                                <span className="opacity-40 font-bold uppercase tracking-widest text-[9px]">High Score</span>
                                <span className="font-black">{stats.highScore}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                                <span className="opacity-40 font-bold uppercase tracking-widest text-[9px]">Avg SR</span>
                                <span className="font-black">{stats.balls > 0 ? Math.round((stats.runs / stats.balls) * 100) : 0}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                                <span className="opacity-40 font-bold uppercase tracking-widest text-[9px]">Wickets</span>
                                <span className="font-black text-emerald-400">{stats.wickets}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                                <span className="opacity-40 font-bold uppercase tracking-widest text-[9px]">Best Bowling</span>
                                <span className="font-black text-emerald-400">{stats.bestBowling?.w || 0}-{stats.bestBowling?.r || 0}</span>
                            </div>
                        </div>

                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-[10px] space-y-1">
                            <p className="opacity-40 uppercase tracking-widest">Technique • {stats.notes}</p>
                            <p className="font-bold">{stats.batStyle} • {stats.bowlStyle}</p>
                        </div>

                        <button onClick={onClose} className="w-full bg-emerald-600 py-4 rounded-2xl font-black uppercase text-xs tracking-widest mt-4">Close Profile</button>
                    </div>
                </div>
            </div>
        );
    };

    // --- Setup Logic ---
    const startQuickMatch = (taId, tbId, overs) => {
        const ta = presetTeams.find(t => t.id === taId);
        const tb = presetTeams.find(t => t.id === tbId);
        if (!ta || !tb) return;
        
        setTeams([
            { name: ta.name, short: ta.short, players: ta.players.map(p => ({ name: p, user_id: null })) },
            { name: tb.name, short: tb.short, players: tb.players.map(p => ({ name: p, user_id: null })) }
        ]);
        
        setState(prev => ({
            ...prev,
            phase: 'toss',
            overs: overs,
            batters: [],
            bowlers: []
        }));
    };

    const startCustomMatch = () => {
        const t1Players = setupState.teams[0].players.split('\n').filter(p => p.trim()).map(p => ({ name: p.trim(), user_id: null }));
        const t2Players = setupState.teams[1].players.split('\n').filter(p => p.trim()).map(p => ({ name: p.trim(), user_id: null }));
        
        setTeams([
            { name: setupState.teams[0].name || 'Team A', short: (setupState.teams[0].name || 'TMA').slice(0,3).toUpperCase(), players: t1Players },
            { name: setupState.teams[1].name || 'Team B', short: (setupState.teams[1].name || 'TMB').slice(0,3).toUpperCase(), players: t2Players }
        ]);
        
        setState(prev => ({
            ...prev,
            phase: 'toss',
            overs: setupState.overs,
            batters: [],
            bowlers: []
        }));
    };

    const saveEditSquad = (id, newPlayers) => {
        setPresetTeams(prev => prev.map(t => t.id === id ? { ...t, players: newPlayers } : t));
        setEditSquadId(null);
        setQuickMatchState(prev => ({ ...prev, step: quickMatchState.step })); // Stay in current step
    };

    // --- Core Logic ---
    const initTeams = (batTeam, bowlTeam) => {
        const bt = TEAMS[batTeam];
        const bwt = TEAMS[bowlTeam];
        if (!bt || !bwt) return;

        setState(prev => ({
            ...prev,
            batters: bt.players.map((p, i) => ({ 
                name: p.name, 
                user_id: p.user_id,
                r: 0, b: 0, f: 0, s: 0, sr: 0, out: false, batting: false, milestones: [] 
            })),
            bowlers: bwt.players.map((p, i) => ({ 
                name: p.name, 
                user_id: p.user_id,
                style: BOWLING_STYLES[i % BOWLING_STYLES.length], 
                overs: 0, r: 0, w: 0, balls: 0 
            })),
            striker: null, nonStriker: null, currentBowlerIdx: null, prevBowlerIdx: null
        }));
    };

    const saveCheckpoint = () => {
        setState(prev => {
            const h = [...prev.history, JSON.stringify({ ...prev, history: [] })];
            if (h.length > 20) h.shift();
            return { ...prev, history: h };
        });
    };

    const handleUndo = () => {
        if (!state.history.length) return;
        const last = JSON.parse(state.history.pop());
        setState({ ...last, history: state.history });
    };

    const syncWithBackend = useCallback(async () => {
        if (!id || !state.batters.length) return;
        try {
            await apiClient.post(`/matches/${id}/live-update`, {
                runs: state.runs,
                wickets: state.wickets,
                overs: state.overNum + (state.ballInOver / 6),
                overNum: state.overNum,
                ballInOver: state.ballInOver,
                totalBalls: state.totalBalls,
                status: state.phase === 'match_result' ? 'Completed' : 'In Progress',
                phase: state.phase,
                inningsNum: state.inningsNum,
                batters: state.batters,
                bowlers: state.bowlers,
                striker: state.striker,
                nonStriker: state.nonStriker,
                currentBowlerIdx: state.currentBowlerIdx,
                currentOverBalls: state.currentOverBalls,
                overHistory: state.overHistory,
                extras: state.extras,
                partnership: state.partnership,
                target: state.target,
                result: state.result,
                inn1Score: state.inn1Score,
                inn1Wickets: state.inn1Wickets,
                inn1Overs: state.inn1Overs,
                inn1Batters: state.inn1Batters,
                inn1Bowlers: state.inn1Bowlers,
                battingTeam: state.battingTeam
            });
        } catch (error) {
            console.warn("Backend sync failed:", error.message);
        }
    }, [id, state]);

    useEffect(() => {
        if (state.phase !== 'toss' && state.phase !== 'bb_choice') {
            const timer = setTimeout(syncWithBackend, 200); 
            return () => clearTimeout(timer);
        }
    }, [state.runs, state.wickets, state.totalBalls, state.phase, syncWithBackend]);

    const recordBall = (type) => {
        if (state.phase !== 'batting') return;
        saveCheckpoint();
        
        setState(prev => {
            const next = { 
                ...prev, 
                extras: { ...prev.extras },
                currentOverBalls: [...prev.currentOverBalls],
                overHistory: [...prev.overHistory],
                batters: [...prev.batters],
                bowlers: [...prev.bowlers]
            };
            const isWide = type === 'wd', isNB = type === 'nb', isBye = type === 'bye';
            const bwIdx = prev.currentBowlerIdx;
            const bw = { ...prev.bowlers[bwIdx] };
            const striker = { 
                ...prev.batters[prev.striker], 
                milestones: [...(prev.batters[prev.striker]?.milestones || [])] 
            };
            
            if (isWide) {
                next.runs++; next.extras.wides++; bw.r++;
                next.currentOverBalls.push('Wd'); next.freeHit = false;
            } else if (isNB) {
                next.runs++; next.extras.noballs++; bw.r++;
                striker.b++; next.currentOverBalls.push('Nb'); next.freeHit = true;
            } else if (isBye) {
                next.runs++; next.extras.byes++; bw.balls++; next.ballInOver++; next.totalBalls++;
                next.currentOverBalls.push('B'); next.freeHit = false;
                // Swap on odd legbyes/byes if needed, but usually byes are just 1
                const t = next.striker; next.striker = next.nonStriker; next.nonStriker = t;
            } else {
                const runs = type;
                next.runs += runs; striker.r += runs; striker.b++;
                if (runs === 4) striker.fours++; if (runs === 6) striker.sixes++;
                bw.r += runs; bw.balls++; next.ballInOver++; next.totalBalls++;
                next.currentOverBalls.push(runs === 0 ? '·' : String(runs)); next.freeHit = false;
                if (runs % 2 !== 0) { const t = next.striker; next.striker = next.nonStriker; next.nonStriker = t; }
            }
            
            next.batters[prev.striker] = striker;
            next.bowlers[bwIdx] = bw;
            
            // Milestone Tracking
            if (striker.r >= 100 && !striker.milestones.includes(100)) {
                striker.milestones.push(100);
                next.pendingMilestone = { name: striker.name, typ: 'CENTURY', val: 100 };
            } else if (striker.r >= 50 && !striker.milestones.includes(50)) {
                striker.milestones.push(50);
                next.pendingMilestone = { name: striker.name, typ: 'HALF-CENTURY', val: 50 };
            }

            // Over Transition
            if (next.ballInOver >= 6 && next.phase === 'batting') {
                 next.overHistory.push([...next.currentOverBalls]);
                 next.currentOverBalls = []; next.overNum++; next.ballInOver = 0;
                 next.prevBowlerIdx = next.currentBowlerIdx; next.currentBowlerIdx = null;
                 const t = next.striker; next.striker = next.nonStriker; next.nonStriker = t;
                 next.phase = next.overNum >= next.overs ? 'innings_over' : 'select_bowler';
            }

            // Match Result Tracking
            if (next.inningsNum === 2 && next.target) {
                const teams = [match.team_a?.team_id?.name || match.quick_teams?.team_a?.name || 'Team A', match.team_b?.team_id?.name || match.quick_teams?.team_b?.name || 'Team B'];
                if (next.runs >= next.target) {
                    next.phase = 'match_result';
                    const wicketsLeft = 10 - next.wickets;
                    next.result = `${teams[next.battingTeam]} won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? 's' : ''}`;
                } else if (next.phase === 'innings_over' || next.wickets >= 10) {
                    if (next.runs < next.target - 1) {
                        const runDiff = (next.target - 1) - next.runs;
                        next.result = `${teams[1 - next.battingTeam]} won by ${runDiff} run${runDiff !== 1 ? 's' : ''}`;
                    } else if (next.runs === next.target - 1) {
                        next.result = "Match Tied!";
                    }
                    next.phase = 'match_result';
                }
            }
            const resPayload = {
                inning: next.inningsNum,
                over: next.overNum,
                ball: next.ballInOver,
                batter_id: striker.user_id,
                bowler_id: bw.user_id,
                runs: isWide || isNB || isBye ? 0 : type,
                is_four: !isWide && !isNB && !isBye && type === 4,
                is_six: !isWide && !isNB && !isBye && type === 6,
                extra_type: isWide ? 'wide' : isNB ? 'noball' : isBye ? 'bye' : null,
                is_wicket: false
            };
            apiClient.post(`/matches/${id}/ball`, resPayload).catch(e => console.error("Ball recording failed:", e));

            return next;
        });
    };

    const finalizeWicket = (nextBatterIdx = null) => {
        saveCheckpoint();
        setState(prev => {
            const next = { 
                ...prev,
                batters: [...prev.batters],
                bowlers: [...prev.bowlers],
                currentOverBalls: [...prev.currentOverBalls],
                overHistory: [...prev.overHistory]
            };
            const outIdx = prev.pendingWicket?.outIdx ?? prev.striker;
            const completedRuns = prev.pendingWicket?.completedRuns ?? 0;
            const dt = DISMISSAL_TYPES.find(d => d.key === prev.pendingWicket?.type);

            next.batters[outIdx] = { ...next.batters[outIdx], out: true, batting: false };
            next.wickets++;
            next.totalBalls++; 
            next.currentOverBalls.push('W');
            
            if (dt?.creditsBowler) {
                next.bowlers[prev.currentBowlerIdx] = { ...next.bowlers[prev.currentBowlerIdx], w: next.bowlers[prev.currentBowlerIdx].w + 1 };
            }
            next.bowlers[prev.currentBowlerIdx] = { ...next.bowlers[prev.currentBowlerIdx], balls: next.bowlers[prev.currentBowlerIdx].balls + 1 };
            next.ballInOver++;

            if (completedRuns > 0) {
                next.runs += completedRuns;
                next.bowlers[prev.currentBowlerIdx] = { ...next.bowlers[prev.currentBowlerIdx], r: next.bowlers[prev.currentBowlerIdx].r + completedRuns };
                if (completedRuns % 2 !== 0) {
                    const t = next.striker; next.striker = next.nonStriker; next.nonStriker = t;
                }
            }

            if (nextBatterIdx !== null) {
                next.batters[nextBatterIdx] = { ...next.batters[nextBatterIdx], batting: true };
                next.striker = nextBatterIdx; // Replace the outgoing striker with the new one
                next.phase = 'batting';
            } else {
                next.striker = null;
                next.phase = 'innings_over';
            }
            
            if (next.ballInOver >= 6 && next.phase === 'batting') {
                next.overHistory.push([...next.currentOverBalls]);
                next.currentOverBalls = []; next.overNum++; next.ballInOver = 0;
                next.prevBowlerIdx = next.currentBowlerIdx; next.currentBowlerIdx = null;
                const t = next.striker; next.striker = next.nonStriker; next.nonStriker = t;
                next.phase = next.overNum >= next.overs ? 'innings_over' : 'select_bowler';
            }

            if (next.inningsNum === 2 && next.target) {
                if (next.runs >= next.target) {
                    next.phase = 'match_result';
                    const wicketsLeft = 10 - next.wickets;
                    next.result = `${TEAMS[next.battingTeam]?.name} won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? 's' : ''}`;
                } else if (next.phase === 'innings_over' || next.wickets >= 10) {
                    if (next.runs < next.target - 1) {
                        const runDiff = (next.target - 1) - next.runs;
                        next.result = `${TEAMS[next.bowlingTeam]?.name} won by ${runDiff} run${runDiff !== 1 ? 's' : ''}`;
                    } else if (next.runs === next.target - 1) {
                        next.result = "Match Tied!";
                    }
                    next.phase = 'match_result';
                }
            }
            const resPayload = {
                inning: next.inningsNum,
                over: next.overNum,
                ball: next.ballInOver,
                batter_id: next.batters[outIdx].user_id,
                bowler_id: next.bowlers[prev.currentBowlerIdx].user_id,
                runs: completedRuns || 0,
                is_four: completedRuns === 4,
                is_six: completedRuns === 6,
                extra_type: null,
                is_wicket: true,
                wicket: {
                    dismissal_type: prev.pendingWicket?.type || 'bowled',
                    player_out_id: next.batters[outIdx].user_id,
                    is_bowler_wicket: !!(DISMISSAL_TYPES.find(d => d.key === prev.pendingWicket?.type)?.creditsBowler)
                }
            };
            apiClient.post(`/matches/${id}/ball`, resPayload).catch(e => console.error("Wicket recording failed:", e));

            next.pendingWicket = null;
            return next;
        });
    };

    const updateCareerStats = async () => {
        if (state.statsUpdated) return;

        // Calculate Result for Backend Persistence
        let winner = null;
        let won_by = 'Pending';
        let margin = 0;

        if (state.inningsNum === 2) {
            if (state.runs >= state.target) {
                winner = state.battingTeam === 'A' ? match.team_a.team_id : match.team_b.team_id;
                won_by = 'Wickets';
                margin = (match.format_overs * 6 || 60) - state.wickets; // Simplified: usually wickets left
                // Actually, let's use wickets left from state
                const totalWickets = 10; // Assuming 11 players
                margin = totalWickets - state.wickets;
            } else if (state.overNum >= state.overs || state.wickets >= 10) {
                const target = state.target;
                if (state.runs < target - 1) {
                    winner = state.battingTeam === 'A' ? match.team_b.team_id : match.team_a.team_id;
                    won_by = 'Runs';
                    margin = (target - 1) - state.runs;
                } else if (state.runs === target - 1) {
                    won_by = 'Tie';
                }
            }
        }

        try {
            const res = await apiClient.post(`/matches/${match._id}/complete`, {
                winner: winner?._id || winner,
                won_by,
                margin,
                man_of_the_match: getPOTM(state, TEAMS)?.[0]?.user_id || null
            });
            if (res.data.success) {
                updateState({ statsUpdated: true });
                toast.info("Match completed and career stats recorded!");
            }
        } catch (err) {
            console.error("Match Completion Persistence Failed:", err);
            toast.error("Match completion failed: " + (err.response?.data?.message || err.message));
        }
    };


    if (isDbLoading) return (
        <div className="min-h-screen bg-[#0D1B0F] flex flex-col items-center justify-center text-white">
            <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">Loading Scorer v6...</p>
        </div>
    );

    if (match && match.verification?.status !== 'VERIFIED' && !match.is_offline_match) {
        return (
            <div className="min-h-screen bg-[#0D1B0F] flex flex-col items-center justify-center p-6 text-center text-white">
                <ShieldAlert className="w-16 h-16 text-emerald-500 mb-6" />
                <h1 className="text-3xl font-black uppercase tracking-tighter mb-4">Official Unlock Required</h1>
                <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem] mb-12 max-w-sm w-full backdrop-blur-xl">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-6">Scan at Counter</p>
                    <div className="bg-white p-6 rounded-3xl mb-8 flex justify-center">
                        <QRCodeSVG value={match.verification?.qr_code?.code || "MATCH_ID"} size={220} level="H" />
                    </div>
                </div>
                <button onClick={() => window.location.reload()} className="bg-emerald-600 px-12 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-emerald-500/20">Verify Access</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0D1B0F] text-white font-sans selection:bg-emerald-500/30">
            {viewingPlayer && <PlayerProfileModal player={viewingPlayer} onClose={() => setViewingPlayer(null)} />}
            <style>{`
                .b-dot { background: rgba(255,255,255,0.1); color: #rgba(255,255,255,0.4); }
                .b-1 { background: rgba(255,255,255,0.2); }
                .b-4 { background: #1565C0; color: #fff; }
                .b-6 { background: #E65100; color: #fff; }
                .b-w { background: #C62828; color: #fff; }
                .b-wd, .b-nb { background: #7B1FA2; color: #fff; }
            `}</style>
            
            {/* Top Bar */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0D1B0F]/90 backdrop-blur-xl z-50">
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
                    <div>
                        <h2 className="text-xs font-black uppercase tracking-widest leading-none">Scorer v6</h2>
                        <p className="text-[9px] font-bold text-white/30 uppercase mt-1">{TEAMS[0]?.short} vs {TEAMS[1]?.short}</p>
                    </div>
                </div>
                <button onClick={() => navigate('/dashboard')} className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-white/40"><LogOut size={16} /></button>
            </div>

            <main className="max-w-md mx-auto p-4 space-y-4 pb-12">
                {/* Match Setup Phase */}
                {state.phase === 'match_setup' && (
                    <div className="setup-wrap animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="text-center mb-8">
                            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trophy size={48} className="text-emerald-500" />
                            </div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter">The Turf Scorer</h2>
                            <p className="text-white/40 text-sm font-medium mt-1">Set up your live match</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => updateState({ phase: 'quick_match' })} className="p-8 bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-[2.5rem] flex flex-col items-center gap-4 group hover:scale-[1.02] transition-all">
                                <span className="text-4xl">⚡</span>
                                <div className="text-center">
                                    <p className="text-xs font-black uppercase tracking-widest text-orange-400">Quick Match</p>
                                    <p className="text-[10px] text-orange-400/60 font-medium">Preset teams</p>
                                </div>
                            </button>
                            <button onClick={() => setSetupState(s => ({ ...s, step: 1 }))} className="p-8 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 rounded-[2.5rem] flex flex-col items-center gap-4 group hover:scale-[1.02] transition-all">
                                <span className="text-4xl">⚙️</span>
                                <div className="text-center">
                                    <p className="text-xs font-black uppercase tracking-widest text-emerald-400">Custom Match</p>
                                    <p className="text-[10px] text-emerald-400/60 font-medium">Own squads</p>
                                </div>
                            </button>
                        </div>

                        {/* Custom Setup Modal/Step */}
                        {setupState.step === 1 && (
                            <div className="mt-8 space-y-4 bg-white/5 border border-white/10 rounded-[2rem] p-6 animate-in zoom-in-95 duration-300">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-black uppercase tracking-widest text-xs">Match Details</h3>
                                    <button onClick={() => setSetupState(s => ({ ...s, step: 0 }))} className="text-[10px] font-bold text-white/30 uppercase">Cancel</button>
                                </div>
                                <input placeholder="Match Title" value={setupState.title} onChange={e => setSetupState({ ...setupState, title: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs font-bold" />
                                <input placeholder="Venue" value={setupState.venue} onChange={e => setSetupState({ ...setupState, venue: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs font-bold" />
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-2">Format (Overs)</p>
                                    <div className="grid grid-cols-5 gap-2">
                                        {[5, 10, 15, 20, 25].map(o => (
                                            <button key={o} onClick={() => setSetupState({ ...setupState, overs: o })} className={`py-2 rounded-lg text-[10px] font-black ${setupState.overs === o ? 'bg-emerald-500 text-black' : 'bg-white/5 border border-white/10'}`}>{o} O</button>
                                        ))}
                                    </div>
                                </div>
                                <button onClick={() => setSetupState(s => ({ ...s, step: 2 }))} className="w-full bg-emerald-600 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-emerald-500/20 mt-4">Next: Teams →</button>
                            </div>
                        )}

                        {setupState.step === 2 && (
                            <div className="mt-8 space-y-4 bg-white/5 border border-white/10 rounded-[2rem] p-6 animate-in zoom-in-95 duration-300">
                                <h3 className="font-black uppercase tracking-widest text-xs mb-4">Team A SQUAD</h3>
                                <input placeholder="Team Name" value={setupState.teams[0].name} onChange={e => {
                                    const nt = [...setupState.teams]; nt[0].name = e.target.value; setSetupState({ ...setupState, teams: nt });
                                }} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs font-bold" />
                                <textarea rows="10" placeholder="Paste 11 players (one per line)" value={setupState.teams[0].players} onChange={e => {
                                    const nt = [...setupState.teams]; nt[0].players = e.target.value; setSetupState({ ...setupState, teams: nt });
                                }} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-[10px] font-medium leading-relaxed" />
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => setSetupState(s => ({ ...s, step: 1 }))} className="py-4 border border-white/10 rounded-2xl font-black uppercase text-[10px]">Back</button>
                                    <button onClick={() => setSetupState(s => ({ ...s, step: 3 }))} className="py-4 bg-emerald-600 rounded-2xl font-black uppercase text-[10px]">Team B →</button>
                                </div>
                            </div>
                        )}

                        {setupState.step === 3 && (
                            <div className="mt-8 space-y-4 bg-white/5 border border-white/10 rounded-[2rem] p-6 animate-in zoom-in-95 duration-300">
                                <h3 className="font-black uppercase tracking-widest text-xs mb-4">Team B SQUAD</h3>
                                <input placeholder="Team Name" value={setupState.teams[1].name} onChange={e => {
                                    const nt = [...setupState.teams]; nt[1].name = e.target.value; setSetupState({ ...setupState, teams: nt });
                                }} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs font-bold" />
                                <textarea rows="10" placeholder="Paste 11 players (one per line)" value={setupState.teams[1].players} onChange={e => {
                                    const nt = [...setupState.teams]; nt[1].players = e.target.value; setSetupState({ ...setupState, teams: nt });
                                }} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-[10px] font-medium leading-relaxed" />
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => setSetupState(s => ({ ...s, step: 2 }))} className="py-4 border border-white/10 rounded-2xl font-black uppercase text-[10px]">Back</button>
                                    <button onClick={() => startCustomMatch()} className="py-4 bg-emerald-600 rounded-2xl font-black uppercase text-[10px]">Start Match!</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Edit Squad Phase */}
                {state.phase === 'edit_squad' && editSquadId && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="bg-emerald-600/10 border border-emerald-500/20 rounded-[2rem] p-6 text-center">
                            <h2 className="text-xl font-black uppercase tracking-widest mb-1">Edit Squad</h2>
                            <p className="text-xs font-medium text-white/30 uppercase tracking-widest">{presetTeams.find(t => t.id === editSquadId)?.name}</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-4 space-y-2">
                            {presetTeams.find(t => t.id === editSquadId)?.players.map((p, i) => (
                                    <div key={i} className="flex gap-2 items-center group/edit">
                                        <span className="w-8 h-10 flex items-center justify-center text-[10px] font-black text-white/20">{i+1}</span>
                                        <input value={p} onChange={e => {
                                            const np = [...presetTeams.find(t => t.id === editSquadId).players];
                                            np[i] = e.target.value;
                                            setPresetTeams(prev => prev.map(t => t.id === editSquadId ? { ...t, players: np } : t));
                                        }} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold" />
                                        <button onClick={() => handleEditPlayerProfile(p)} className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-white/20 hover:text-emerald-400 transition-colors">📊</button>
                                    </div>
                            ))}
                        </div>
                        <button onClick={() => updateState({ phase: 'quick_match' })} className="w-full bg-emerald-600 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/20">Save Changes</button>
                    </div>
                )}

                {/* Quick Match Phase */}
                {state.phase === 'quick_match' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between">
                            <button onClick={() => updateState({ phase: 'match_setup' })} className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10"><ArrowLeft size={18} /></button>
                            <h2 className="text-sm font-black uppercase tracking-[0.2em]">Quick Match</h2>
                            <div className="w-10" />
                        </div>

                        {quickMatchState.step === 'pick_a' && (
                            <div className="space-y-4">
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Step 1</p>
                                    <p className="text-sm font-bold">Pick Team A</p>
                                </div>
                                <div className="grid gap-2">
                                    {presetTeams.map(t => (
                                        <div key={t.id} className="relative group">
                                            <button onClick={() => setQuickMatchState({ ...quickMatchState, teamAId: t.id, step: 'pick_b' })} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between hover:border-emerald-500/40 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-2xl">{t.emoji}</span>
                                                    <div className="text-left">
                                                        <p className="text-xs font-black uppercase tracking-tight">{t.name}</p>
                                                        <p className="text-[10px] text-white/30 truncate max-w-[150px]">{t.players.slice(0, 3).join(', ')}...</p>
                                                    </div>
                                                </div>
                                            </button>
                                            <button onClick={() => { setEditSquadId(t.id); updateState({ phase: 'edit_squad' }); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/20 hover:text-white uppercase tracking-widest z-10">Edit</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {quickMatchState.step === 'pick_b' && (
                            <div className="space-y-4">
                                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-red-400">Step 2</p>
                                    <p className="text-sm font-bold">Pick Opponents for {presetTeams.find(t => t.id === quickMatchState.teamAId)?.name}</p>
                                </div>
                                <div className="grid gap-2">
                                    {presetTeams.filter(t => t.id !== quickMatchState.teamAId).map(t => (
                                        <button key={t.id} onClick={() => setQuickMatchState({ ...quickMatchState, teamBId: t.id, step: 'confirm' })} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between hover:border-emerald-500/40 group transition-all">
                                            <div className="flex items-center gap-4">
                                                <span className="text-2xl">{t.emoji}</span>
                                                <div className="text-left">
                                                    <p className="text-xs font-black uppercase tracking-tight">{t.name}</p>
                                                    <p className="text-[10px] text-white/30 truncate max-w-[150px]">{t.players.slice(0, 3).join(', ')}...</p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-white/20 group-hover:text-emerald-500">Pick</span>
                                        </button>
                                    ))}
                                </div>
                                <button onClick={() => setQuickMatchState({ ...quickMatchState, step: 'pick_a', teamAId: null })} className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-white/20">Change Team A</button>
                            </div>
                        )}

                        {quickMatchState.step === 'confirm' && (
                            <div className="space-y-6">
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] p-6 text-center">
                                    <div className="flex items-center justify-between gap-4 mb-6">
                                        <div className="flex-1">
                                            <span className="text-3xl mb-2 block">{presetTeams.find(t => t.id === quickMatchState.teamAId)?.emoji}</span>
                                            <p className="text-[10px] font-black uppercase tracking-tight">{presetTeams.find(t => t.id === quickMatchState.teamAId)?.name}</p>
                                        </div>
                                        <span className="text-xs font-black text-white/20 italic">VS</span>
                                        <div className="flex-1">
                                            <span className="text-3xl mb-2 block">{presetTeams.find(t => t.id === quickMatchState.teamBId)?.emoji}</span>
                                            <p className="text-[10px] font-black uppercase tracking-tight">{presetTeams.find(t => t.id === quickMatchState.teamBId)?.name}</p>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-white/5">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-3">Match Format</p>
                                        <div className="grid grid-cols-5 gap-2">
                                            {[5, 10, 15, 20, 25].map(o => (
                                                <button key={o} onClick={() => setQuickMatchState({ ...quickMatchState, overs: o })} className={`py-2 rounded-lg text-[10px] font-black ${quickMatchState.overs === o ? 'bg-emerald-500 text-black' : 'bg-white/5 border border-white/10'}`}>{o} O</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => startQuickMatch(quickMatchState.teamAId, quickMatchState.teamBId, quickMatchState.overs)} className="w-full bg-emerald-600 py-6 rounded-3xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-emerald-500/20">KICK OFF MATCH! 🏏</button>
                            </div>
                        )}
                    </div>
                )}
                {/* Toss Phase */}
                {state.phase === 'toss' && (
                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 text-center space-y-8">
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">The Toss</h2>
                            <p className="text-xs font-bold text-white/30 uppercase tracking-widest">Select match initiator</p>
                        </div>
                        <div className="flex justify-center py-4">
                            <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-full flex items-center justify-center text-4xl shadow-[0_0_30px_rgba(245,158,11,0.3)] border-4 border-orange-400">🪙</div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {TEAMS.map((t, i) => (
                                <button key={i} onClick={() => updateState({ tossWinner: i, phase: 'bb_choice' })} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] flex flex-col items-center gap-4 hover:border-amber-500/50 hover:bg-amber-500/5 group transition-all">
                                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Users className="text-emerald-400" size={32} />
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-widest">{t.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Bat/Ball Choice Phase */}
                {state.phase === 'bb_choice' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-[2.5rem] p-8 text-center">
                            <h2 className="text-xl font-black uppercase tracking-widest mb-1 text-amber-500">{TEAMS[state.tossWinner]?.name} Won!</h2>
                            <p className="text-xs font-medium text-amber-500/60 uppercase tracking-widest">Select their decision</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => updateState({ bbChoice: 'bat' })} className={`p-10 rounded-[2.5rem] border-2 flex flex-col items-center gap-4 transition-all ${state.bbChoice === 'bat' ? 'bg-emerald-600/20 border-emerald-500' : 'bg-white/5 border-white/10 opacity-40'}`}>
                                <Trophy size={32} />
                                <span className="text-xs font-black uppercase tracking-widest">Bat First</span>
                            </button>
                            <button onClick={() => updateState({ bbChoice: 'ball' })} className={`p-10 rounded-[2.5rem] border-2 flex flex-col items-center gap-4 transition-all ${state.bbChoice === 'ball' ? 'bg-emerald-600/20 border-emerald-500' : 'bg-white/5 border-white/10 opacity-40'}`}>
                                <Users size={32} />
                                <span className="text-xs font-black uppercase tracking-widest">Bowl First</span>
                            </button>
                        </div>
                        <button disabled={!state.bbChoice} onClick={() => {
                            const batTeam = state.bbChoice === 'bat' ? state.tossWinner : (state.tossWinner === 0 ? 1 : 0);
                            const bowlTeam = state.bbChoice === 'bat' ? (state.tossWinner === 0 ? 1 : 0) : state.tossWinner;
                            updateState({ battingTeam: batTeam, bowlingTeam: bowlTeam, phase: 'select_openers' });
                            initTeams(batTeam, bowlTeam);
                        }} className="w-full bg-white text-[#0D1B0F] py-6 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-white/10 disabled:opacity-20">Start Match →</button>
                    </div>
                )}

                {/* Openers Phase */}
                {state.phase === 'select_openers' && (
                    <div className="space-y-4">
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white/40 mb-1">Innings {state.inningsNum}</h2>
                            <p className="text-xl font-black">{TEAMS[state.battingTeam].name} Batting</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className={`p-4 rounded-2xl border-2 ${typeof state.openerStrikerIdx === 'number' ? 'bg-emerald-600/20 border-emerald-500' : 'bg-white/5 border-dashed border-white/10 text-white/20'}`}>
                                <p className="text-[9px] font-bold uppercase tracking-widest mb-1 opacity-60">Striker</p>
                                <p className="text-xs font-black truncate">{typeof state.openerStrikerIdx === 'number' ? state.batters[state.openerStrikerIdx]?.name : "Select Below"}</p>
                            </div>
                            <div className={`p-4 rounded-2xl border-2 ${typeof state.openerNSIdx === 'number' ? 'bg-emerald-600/20 border-emerald-500' : 'bg-white/5 border-dashed border-white/10 text-white/20'}`}>
                                <p className="text-[9px] font-bold uppercase tracking-widest mb-1 opacity-60">Non-Striker</p>
                                <p className="text-xs font-black truncate">{typeof state.openerNSIdx === 'number' ? state.batters[state.openerNSIdx]?.name : "Select Below"}</p>
                            </div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-4 max-h-72 overflow-y-auto space-y-2">
                            {TEAMS[state.battingTeam]?.players?.map((p, i) => (
                                <button key={i} disabled={state.openerStrikerIdx === i || state.openerNSIdx === i} onClick={() => {
                                    if (typeof state.openerStrikerIdx !== 'number') updateState({ openerStrikerIdx: i });
                                    else updateState({ openerNSIdx: i });
                                }} className="w-full p-4 rounded-xl border border-white/5 bg-white/5 text-left flex items-center justify-between hover:bg-emerald-500/10 transition-colors disabled:opacity-30">
                                    <span className="text-xs font-black uppercase tracking-tight">{p.name}</span>
                                    <User size={14} className="opacity-20" />
                                </button>
                            ))}
                        </div>
                        <button disabled={typeof state.openerStrikerIdx !== 'number' || typeof state.openerNSIdx !== 'number'} onClick={() => {
                            const nb = [...state.batters];
                            if(nb[state.openerStrikerIdx]) nb[state.openerStrikerIdx].batting = true;
                            if(nb[state.openerNSIdx]) nb[state.openerNSIdx].batting = true;
                            updateState({ batters: nb, striker: state.openerStrikerIdx, nonStriker: state.openerNSIdx, phase: 'select_bowler' });
                        }} className="w-full bg-emerald-600 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-emerald-500/20 disabled:opacity-20 disabled:grayscale transition-all">Confirm Openers →</button>
                    </div>
                )}

                {/* Wicket Type Phase */}
                {state.phase === 'wicket_type' && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h2 className="text-3xl font-black text-red-500 uppercase tracking-tighter">OUT!</h2>
                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-2">How was the dismissal?</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {DISMISSAL_TYPES.map(d => (
                                <button key={d.key} onClick={() => {
                                    if (d.needsFielder || d.needsRORuns) {
                                        updateState({ pendingWicket: { type: d.key, mode: d.needsRORuns ? 'runout' : 'fielder' }, phase: d.needsRORuns ? 'wicket_runout_choice' : 'wicket_fielder' });
                                    } else {
                                        updateState({ pendingWicket: { type: d.key }, phase: 'select_next_batter' });
                                    }
                                }} className="p-8 bg-white/5 border border-white/10 rounded-3xl flex flex-col items-center gap-4 hover:bg-red-500/10 hover:border-red-500/30 transition-all group">
                                    <span className="text-4xl filter grayscale group-hover:grayscale-0">{d.icon}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest">{d.label}</span>
                                </button>
                            ))}
                        </div>
                        <button onClick={() => updateState({ phase: 'batting' })} className="w-full py-4 text-white/30 text-xs font-black uppercase tracking-widest border border-white/5 rounded-2xl">Cancel</button>
                    </div>
                )}

                {/* Fielder Select Phase */}
                {state.phase === 'wicket_fielder' && (
                    <div className="space-y-4">
                        <div className="bg-red-600/10 border border-red-500/30 rounded-3xl p-6">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-red-500 mb-1">Catch / RunOut</h2>
                            <p className="text-xl font-black">Who took the wicket?</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-4 max-h-[60vh] overflow-y-auto space-y-2">
                            {TEAMS[state.bowlingTeam]?.players?.map((p, i) => (
                                <button key={i} onClick={() => updateState({ pendingWicket: { ...state.pendingWicket, fielderName: p?.name }, phase: state.pendingWicket.mode === 'runout' ? 'wicket_ro_runs' : 'select_next_batter' })} className="w-full p-6 rounded-2xl border border-white/5 bg-white/5 text-left flex items-center justify-between hover:bg-emerald-500/10 transition-colors">
                                    <span className="text-sm font-black uppercase tracking-tight">{p?.name}</span>
                                    <User size={16} className="opacity-20" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Run Out Choice (Which batter?) */}
                {state.phase === 'wicket_runout_choice' && (
                    <div className="space-y-4">
                        <div className="bg-red-600/10 border border-red-500/30 rounded-3xl p-6">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-red-500 mb-1">Run Out</h2>
                            <p className="text-xl font-black">Which batter is out?</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {[state.striker, state.nonStriker].map(idx => (
                                <button key={idx} onClick={() => updateState({ pendingWicket: { ...state.pendingWicket, outIdx: idx }, phase: 'wicket_fielder' })} className="p-8 bg-white/5 border border-white/10 rounded-3xl flex flex-col items-center gap-4 hover:bg-red-500/10 hover:border-red-500/30 transition-all">
                                    <User size={32} />
                                    <span className="text-xs font-black uppercase tracking-widest">{state.batters[idx]?.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Run Out Runs */}
                {state.phase === 'wicket_ro_runs' && (
                    <div className="space-y-4">
                        <div className="bg-red-600/10 border border-red-500/30 rounded-3xl p-6">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-red-500 mb-1">Run Out</h2>
                            <p className="text-xl font-black">How many runs were completed?</p>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                            {[0, 1, 2, 3].map(r => (
                                <button key={r} onClick={() => updateState({ pendingWicket: { ...state.pendingWicket, completedRuns: r }, phase: 'select_next_batter' })} className="h-20 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-xl font-black hover:bg-red-500/20">{r}</button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Next Batter Phase */}
                {state.phase === 'select_next_batter' && (
                    <div className="space-y-4">
                        <div className="bg-red-600/10 border border-red-500/30 rounded-3xl p-6">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-red-500 mb-1">{state.batters.filter(p => !p.out && !p.batting).length === 0 ? "Innings Complete" : "Incoming Batter"}</h2>
                            <p className="text-xl font-black">{state.batters.filter(p => !p.out && !p.batting).length === 0 ? "Team All Out" : "Select Replacement"}</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-4 max-h-[60vh] overflow-y-auto space-y-2">
                            {state.batters.filter(p => !p.out && !p.batting).length === 0 ? (
                                <button onClick={() => finalizeWicket(null)} className="w-full bg-red-600 border border-red-500 text-white rounded-2xl p-6 text-center hover:bg-red-700 transition-all shadow-[0_10px_30px_rgba(220,38,38,0.3)]">
                                    <p className="text-2xl font-black uppercase">ALL OUT</p>
                                    <p className="text-[10px] font-bold uppercase tracking-widest mt-1">End Innings</p>
                                </button>
                            ) : (
                                state.batters.map((p, i) => {
                                    if (p.out || p.batting) return null;
                                    return (
                                        <button key={i} onClick={() => finalizeWicket(i)} className="w-full p-6 rounded-2xl border border-white/5 bg-white/5 text-left flex items-center justify-between hover:bg-emerald-500/10 transition-colors">
                                            <span className="text-sm font-black uppercase tracking-tight">{p?.name}</span>
                                            <User size={16} className="opacity-20" />
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* Milestone Celebration */}
                {state.pendingMilestone && (
                    <div className="fixed inset-0 z-[100] bg-emerald-600/90 flex flex-col items-center justify-center p-8 backdrop-blur-xl animate-in fade-in duration-500">
                        <div className="relative text-center scale-up-center">
                            <Trophy size={120} className="text-white mb-8 mx-auto" strokeWidth={1} />
                            <h2 className="text-7xl font-black text-white uppercase tracking-tighter leading-tight mb-4">{state.pendingMilestone.typ}</h2>
                            <p className="text-2xl font-black text-emerald-950 uppercase tracking-[0.2em] mb-12">{state.pendingMilestone.name}</p>
                            <button onClick={() => updateState({ pendingMilestone: null })} className="bg-white text-emerald-600 px-12 py-5 rounded-[2rem] font-black uppercase text-sm tracking-widest shadow-2xl">Terrific! 👏</button>
                        </div>
                    </div>
                )}

                {/* Batting Phase (Main Scoreboard) */}
                {state.phase === 'batting' && (
                    <>
                        {/* Scoreboard Card */}
                        <div className="bg-emerald-600/10 border border-emerald-500/20 rounded-[2.5rem] p-8 text-center relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
                            <div className="flex justify-between items-center mb-6">
                                <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">{TEAMS[state.battingTeam]?.name}</p>
                                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em]">Live</p>
                            </div>
                            <div className="flex items-end justify-center gap-1 mb-2">
                                <span className="text-6xl font-black tracking-tighter">{state.runs}</span>
                                <span className="text-4xl text-white/20 font-bold">/</span>
                                <span className="text-4xl text-emerald-500 font-bold">{state.wickets}</span>
                            </div>
                            <p className="text-xs font-bold text-white/40 mb-6">Over {state.overNum}.{state.ballInOver} <span className="opacity-50 tracking-widest text-[10px] uppercase ml-1">of {state.overs}</span></p>
                            <div className="flex gap-2 justify-center">
                                {state.currentOverBalls.map((b, i) => (
                                    <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border ${
                                        b === 'W' ? 'bg-red-500 border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 
                                        b === '4' ? 'bg-blue-600 border-blue-400' :
                                        b === '6' ? 'bg-orange-500 border-orange-400' :
                                        'bg-white/10 border-white/10 text-white/60'
                                    }`}>{b === '·' ? '0' : b}</div>
                                ))}
                                {Array.from({ length: 6 - state.currentOverBalls.length }).map((_, i) => (
                                    <div key={i} className="w-8 h-8 rounded-full border border-white/5 opacity-20"></div>
                                ))}
                            </div>
                        </div>

                        {/* Crease & Bowler Details */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">On Strike</p>
                                </div>
                                <p className="text-sm font-black truncate mb-1">{state.batters[state.striker]?.name}</p>
                                <p className="text-lg font-bold">{state.batters[state.striker]?.r}<span className="text-[10px] opacity-20 ml-1">({state.batters[state.striker]?.b})</span></p>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-3 opacity-40">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Non-Striker</p>
                                </div>
                                <p className="text-sm font-black truncate mb-1 opacity-60">{state.batters[state.nonStriker]?.name}</p>
                                <p className="text-lg font-bold opacity-60">{state.batters[state.nonStriker]?.r}<span className="text-[10px] opacity-20 ml-1">({state.batters[state.nonStriker]?.b})</span></p>
                            </div>
                        </div>

                        {/* Scoring Buttons */}
                        <div className="bg-white/2 rounded-[2.5rem] p-4 space-y-3 border border-white/5">
                            <div className="grid grid-cols-4 gap-2">
                                {[0, 1, 2, 3].map(r => (
                                    <button key={r} onClick={() => recordBall(r)} className="h-16 bg-white/5 rounded-2xl border border-white/10 text-xl font-black hover:bg-white/10 transition-colors uppercase">{r}</button>
                                ))}
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                <button onClick={() => recordBall(4)} className="h-16 bg-blue-600/20 border-2 border-blue-500 text-blue-400 text-xl font-black rounded-2xl hover:bg-blue-600/30 transition-all uppercase">4</button>
                                <button onClick={() => recordBall(6)} className="h-16 bg-orange-600/20 border-2 border-orange-500 text-orange-400 text-xl font-black rounded-2xl hover:bg-orange-600/30 transition-all uppercase">6</button>
                                <button onClick={() => recordBall('wd')} className="h-16 bg-purple-600/10 border border-purple-500 text-purple-400 text-sm font-black rounded-2xl uppercase">Wd</button>
                                <button onClick={() => recordBall('nb')} className="h-16 bg-purple-600/10 border border-purple-500 text-purple-400 text-sm font-black rounded-2xl uppercase">Nb</button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => updateState({ phase: 'wicket_type' })} className="h-16 bg-red-600 border-2 border-red-400 text-white text-xl font-black rounded-2xl shadow-lg shadow-red-500/20 uppercase tracking-widest">Wicket</button>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={handleUndo} className="h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-colors"><Undo2 size={24} /></button>
                                    <button onClick={() => updateState({ striker: state.nonStriker, nonStriker: state.striker })} className="h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/60 hover:text-white transition-colors text-xs font-black uppercase">⇄</button>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Bowler Select Phase */}
                {state.phase === 'select_bowler' && (
                    <div className="space-y-4">
                        <div className="bg-emerald-600/10 border border-emerald-500/20 rounded-3xl p-6">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500 mb-1">Over {state.overNum + 1}</h2>
                            <p className="text-xl font-black">Select Bowler</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-4 max-h-[60vh] overflow-y-auto space-y-2">
                            {TEAMS[state.bowlingTeam]?.players?.map((p, i) => {
                                const dis = i === state.prevBowlerIdx || state.bowlers[i]?.overs >= (state.overs / 5);
                                return (
                                    <button key={i} disabled={dis} onClick={() => updateState({ currentBowlerIdx: i, phase: 'batting' })} className="w-full p-6 rounded-2xl border border-white/5 bg-white/5 text-left flex items-center justify-between hover:bg-emerald-500/10 transition-colors disabled:opacity-20">
                                        <div>
                                            <p className="text-sm font-black uppercase tracking-tight mb-1">{p?.name}</p>
                                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-none">{state.bowlers[i]?.style || "Bowler"}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-emerald-400">{state.bowlers[i]?.overs || 0}.{state.bowlers[i]?.balls % 6 || 0}</p>
                                            <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Overs</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Innings Over Phase */}
                {state.phase === 'innings_over' && (
                    <div className="space-y-6 text-center">
                        <div className="py-12">
                            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Trophy className="text-emerald-500" size={40} />
                            </div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter">Innings Over!</h2>
                            <p className="text-white/40 font-medium mt-2">Target: <span className="text-white font-bold">{state.runs + 1}</span> runs in {state.overs} overs</p>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6">
                            <div className="flex justify-between items-center">
                                <div className="text-left">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Total Score</p>
                                    <p className="text-4xl font-black">{state.runs}/{state.wickets}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Run Rate</p>
                                    <p className="text-2xl font-black">{(state.runs / (state.overNum + state.ballInOver/6 || 1)).toFixed(2)}</p>
                                </div>
                            </div>
                        </div>

                        <button onClick={() => {
                            saveCheckpoint();
                            setState(prev => {
                                const nextBattingTeam = prev.bowlingTeam;
                                const nextBowlingTeam = prev.battingTeam;
                                return {
                                    ...prev,
                                    phase: 'select_openers',
                                    inningsNum: 2,
                                    inn1Score: prev.runs,
                                    inn1Wickets: prev.wickets,
                                    inn1Overs: `${prev.overNum}.${prev.ballInOver}`,
                                    inn1Batters: [...prev.batters],
                                    inn1Bowlers: [...prev.bowlers],
                                    target: prev.runs + 1,
                                    battingTeam: nextBattingTeam,
                                    bowlingTeam: nextBowlingTeam,
                                    runs: 0, wickets: 0, overNum: 0, ballInOver: 0, totalBalls: 0,
                                    currentOverBalls: [], overHistory: [],
                                    striker: null, nonStriker: null, currentBowlerIdx: null,
                                    batters: TEAMS[nextBattingTeam].players.map(p => ({ ...p, r:0, b:0, f:0, s:0, sr:0, out:false, batting:false, milestones: [] })),
                                    bowlers: TEAMS[nextBowlingTeam].players.map(p => ({ ...p, o:0, r:0, w:0, eco:0, balls:0 }))
                                };
                            });
                        }} className="w-full py-6 bg-emerald-500 text-black font-black uppercase tracking-widest rounded-3xl shadow-[0_20px_40px_-10px_rgba(16,185,129,0.3)]">
                            Start 2nd Innings
                        </button>
                    </div>
                )}

                {/* Match Result Phase */}
                {state.phase === 'match_result' && (
                    <div className="space-y-6">
                        <div className="text-center py-8">
                            <div className="inline-block px-4 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4">Match Completed</div>
                            <h2 className="text-4xl font-black uppercase tracking-tighter mb-2">{state.result}</h2>
                        </div>

                        {/* Player of the Match */}
                        <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-[2.5rem] p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <Trophy size={80} />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 mb-4">Player of the Match</p>
                            {getPOTM(state).slice(0, 1).map((p, i) => (
                                <div key={i}>
                                    <h3 className="text-3xl font-black uppercase tracking-tight mb-2">{p?.name}</h3>
                                    <div className="flex gap-4">
                                        <div className="bg-black/20 px-3 py-1 rounded-lg text-xs font-bold text-amber-200">{p?.r} Runs ({p?.b})</div>
                                        <div className="bg-black/20 px-3 py-1 rounded-lg text-xs font-bold text-amber-200">{p?.w} Wickets</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => updateState({ phase: 'summary' })} className="py-6 bg-white/5 border border-white/10 rounded-3xl font-black uppercase tracking-widest text-xs">Full Scorecard</button>
                            <button onClick={() => { updateCareerStats(); navigate('/admin/operations'); }} className="py-6 bg-emerald-500 text-black rounded-3xl font-black uppercase tracking-widest text-xs shadow-lg">Done</button>
                        </div>
                    </div>
                )}

                {/* Summary / Scorecard Phase */}
                {state.phase === 'summary' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <button onClick={() => updateState({ phase: 'match_result' })} className="p-3 bg-white/5 rounded-2xl border border-white/10"><ArrowLeft size={20} /></button>
                            <h2 className="text-sm font-black uppercase tracking-widest">Match Scorecard</h2>
                            <div className="w-10" />
                        </div>

                        <div className="space-y-4">
                            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
                                <div className="bg-white/5 px-6 py-4 border-b border-white/10 flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Batting</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">R (B)</span>
                                </div>
                                <div className="p-2 space-y-1">
                                    {state.batters.filter(b => b.r > 0 || b.out || b.batting).map((b, i) => (
                                        <div key={i} onClick={() => setViewingPlayer(b)} className="flex justify-between items-center px-4 py-3 rounded-xl hover:bg-white/10 cursor-pointer transition-colors active:scale-95">
                                            <div>
                                                <p className="text-sm font-black uppercase tracking-tight">{b.name}</p>
                                                <p className="text-[10px] font-bold text-white/30 truncate max-w-[150px]">{b.out ? 'Out' : (b.batting ? 'Not Out*' : 'DNB')}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black">{b.r} <span className="text-[10px] opacity-40">({b.b})</span></p>
                                                <p className="text-[10px] font-bold text-white/30">SR: {b.sr}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
                                <div className="bg-white/5 px-6 py-4 border-b border-white/10 flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Bowling</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">O-R-W</span>
                                </div>
                                <div className="p-2 space-y-1">
                                    {state.bowlers.filter(bw => bw.balls > 0).map((bw, i) => (
                                        <div key={i} onClick={() => setViewingPlayer(bw)} className="flex justify-between items-center px-4 py-3 rounded-xl hover:bg-white/10 cursor-pointer transition-colors active:scale-95">
                                            <div>
                                                <p className="text-sm font-black uppercase tracking-tight">{bw.name}</p>
                                                <p className="text-[10px] font-bold text-white/30">Eco: {bw.eco}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black">{Math.floor(bw.balls/6)}.{bw.balls%6}-{bw.r}-{bw.w}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Floating Live Indicator for User Observation */}
            {state.phase === 'batting' && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-[#0D1B0F] border border-white/10 rounded-full flex items-center gap-4 shadow-2xl z-50">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Broadcast Active</span>
                    <div className="w-[1px] h-3 bg-white/10"></div>
                    <button onClick={() => {
                        const url = `${window.location.origin}/live/${id}`;
                        navigator.clipboard.writeText(url);
                        toast.success("Public Link Copied!");
                    }} className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Share Link</button>
                </div>
            )}
        </div>
    );
}
