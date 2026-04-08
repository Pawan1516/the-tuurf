import React, { useState, useEffect, useCallback, memo, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../api/client';
import { ShieldAlert, Trophy, Coins, Users, User, ArrowLeft, RefreshCw, Undo2, LogOut, Zap, CheckCircle, Swords } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import io from 'socket.io-client';
import { PlayerDB } from '../utils/playerDb';

const SOCKET_URL = process.env.NODE_ENV === 'production' 
    ? 'https://the-tuurf-ufkd.onrender.com' 
    : 'http://localhost:5001';

const PRESET_TEAMS = [
    {
        id: 'mumbai', name: 'Mumbai Strikers', short: 'MBS', emoji: '🔵',
        color: '#1565C0', bg: '#E3F2FD',
        players: ['Rohit Sharma', 'Ishan Kishan', 'Suryakumar Yadav', 'Tilak Varma', 'Hardik Pandya', 'Tim David', 'Kieron Pollard', 'Krunal Pandya', 'Jasprit Bumrah', 'Trent Boult', 'Piyush Chawla']
    },
    {
        id: 'chennai', name: 'Chennai Super Kings', short: 'CSK', emoji: '🟡',
        color: '#F9A825', bg: '#FFFDE7',
        players: ['Ruturaj Gaikwad', 'Devon Conway', 'Ajinkya Rahane', 'Shivam Dube', 'Moeen Ali', 'MS Dhoni', 'Ravindra Jadeja', 'Deepak Chahar', 'Mitchell Santner', 'Simarjeet Singh', 'Matheesha Pathirana']
    },
    {
        id: 'rcb', name: 'Royal Challengers', short: 'RCB', emoji: '🔴',
        color: '#C62828', bg: '#FFEBEE',
        players: ['Virat Kohli', 'Faf du Plessis', 'Glenn Maxwell', 'Rajat Patidar', 'Dinesh Karthik', 'Anuj Rawat', 'Cameron Green', 'Wanindu Hasaranga', 'Mohammed Siraj', 'Josh Hazlewood', 'Akash Deep']
    },
    {
        id: 'kolkata', name: 'Kolkata Knight Riders', short: 'KKR', emoji: '🟣',
        color: '#6A1B9A', bg: '#F3E5F5',
        players: ['Shreyas Iyer', 'Venkatesh Iyer', 'Phil Salt', 'Rinku Singh', 'Andre Russell', 'Sunil Narine', 'Rahmanullah Gurbaz', 'Nitish Rana', 'Varun Chakravarthy', 'Mitchell Starc', 'Harshit Rana']
    },
    {
        id: 'sunrisers', name: 'Sunrisers Hyderabad', short: 'SRH', emoji: '🟠',
        color: '#E65100', bg: '#FFF3E0',
        players: ['Travis Head', 'Abhishek Sharma', 'Aiden Markram', 'Heinrich Klaasen', 'Abdul Samad', 'Pat Cummins', 'Shahbaz Ahmed', 'Bhuvneshwar Kumar', 'Mayank Agarwal', 'T Natarajan', 'Umran Malik']
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
    return Object.values(scored).sort((a, b) => b.pts - a.pts).slice(0, 3);
};

export default function ScoringDashboard() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [match, setMatch] = useState(null);
    const [isDbLoading, setIsDbLoading] = useState(true);
    const [presetTeams, setPresetTeams] = useState(JSON.parse(JSON.stringify(PRESET_TEAMS)));
    const [TEAMS, setTeams] = useState([
        { name: 'Team A', short: 'TMA', players: Array(11).fill("").map((_, i) => ({ name: `Player ${i + 1}`, user_id: null })) },
        { name: 'Team B', short: 'TMB', players: Array(11).fill("").map((_, i) => ({ name: `Player ${i + 1}`, user_id: null })) }
    ]);
    const [viewingPlayer, setViewingPlayer] = useState(null);

    const [setupState, setSetupState] = useState({
        step: 0, title: '', venue: '', overs: 20,
        teams: [
            { name: '', players: Array(11).fill(null).map((_, i) => ({ name: `Player ${i + 1}`, user_id: null })) },
            { name: '', players: Array(11).fill(null).map((_, i) => ({ name: `Player ${i + 1}`, user_id: null })) }
        ]
    });

    const [quickMatchState, setQuickMatchState] = useState({ teamAId: null, teamBId: null, overs: 20, step: 'pick_a' });
    const [editSquadId, setEditSquadId] = useState(null);
    const [recentTeams, setRecentTeams] = useState([]);
    const [lastMatch, setLastMatch] = useState(null);
    const socketRef = useRef(null);
    const [playerSearchResults, setPlayerSearchResults] = useState([]);
    const [searchTarget, setSearchTarget] = useState(null); // { teamIdx, playerIdx }
    const [isSearching, setIsSearching] = useState(false);
    const [activeTab, setActiveTab] = useState('live'); // live, scorecard, insights, commentary
    const [commentary, setCommentary] = useState([]);

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
        formatOvers: 20, history: [], history_balls: [],
        pendingMilestone: null, milestoneLog: [], lastOverSummary: null,
        partnership: { runs: 0, balls: 0 },
        inningsNum: 1, target: null,
        pendingWicket: null,
        openerStrikerIdx: null, openerNSIdx: null, openerBowlerIdx: null,
        aiLoading: false,
        aiRecommendation: null
    });

    // Sync to DB and Cloud on every state change + Local Flash Recovery
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
        
        // Auto-save to LocalStorage for offline resilience
        const localKey = `live_match_${id}`;
        localStorage.setItem(localKey, JSON.stringify({ ...state, _ts: Date.now(), history: [] }));

        // Sync with Server if it's a scoring action
        if (state.lastBallData && state.phase === 'batting') {
            syncBallWithServer(state);
        }
    }, [state.phase, state.runs, state.wickets, state.totalBalls, id]);

    const ScoreboardCard = memo(({ runs, wickets, overNum, ballInOver, overs, teamName, currentOverBalls, inn1Score, inn1Wickets, inningsNum, target, runRate, requiredRunRate }) => {
        const progressPct = Math.min(((overNum + ballInOver / 6) / (overs || 1)) * 100, 100);
        return (
            <div className="space-y-3">
                {/* Score Display */}
                <div className="bg-[#0a1a0c] border border-white/8 rounded-[2rem] px-6 pt-6 pb-5 relative overflow-hidden">
                    {/* Team name & Innings tag */}
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.25em] truncate max-w-[55%]">{teamName}</p>
                        <div className="flex items-center gap-2">
                            {inningsNum === 2 && target && (
                                <span className="text-[9px] font-black text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full uppercase tracking-widest">
                                    Need {target - runs} from {((overs - overNum - ballInOver / 6) * 6).toFixed(0)}b
                                </span>
                            )}
                            <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${inningsNum === 2 ? 'bg-orange-500/10 text-orange-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                {inningsNum === 2 ? '2nd Inn' : '1st Inn'}
                            </span>
                        </div>
                    </div>

                    {/* BIG Score */}
                    <div className="flex items-end gap-2 mb-4">
                        <span className="text-[80px] leading-none font-black text-white tracking-tighter">{runs}</span>
                        <div className="flex flex-col items-start pb-3 gap-1">
                            <span className="text-3xl font-black text-white/15">/</span>
                            <span className="text-3xl font-black text-emerald-400 leading-none">{wickets}</span>
                        </div>
                        {inningsNum === 2 && inn1Score !== undefined && (
                            <div className="ml-auto text-right pb-2">
                                <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-0.5">1st Inn</p>
                                <p className="text-base font-black text-white/30">{inn1Score}/{inn1Wickets}</p>
                            </div>
                        )}
                    </div>

                    {/* Overs + CRR */}
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-black text-white/40">{overNum}.{ballInOver} <span className="text-white/15 text-[10px]">/ {overs} Ov</span></span>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-emerald-400">CRR {runRate || '0.00'}</span>
                            {inningsNum === 2 && requiredRunRate && requiredRunRate !== '0.00' && (
                                <span className="text-[10px] font-black text-amber-400">RRR {requiredRunRate}</span>
                            )}
                        </div>
                    </div>

                    {/* Overs Progress Bar */}
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-4">
                        <div 
                            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>

                    {/* Current Over Balls */}
                    <div className="flex gap-2 justify-center">
                        {currentOverBalls.map((b, i) => (
                            <div key={i} className={`w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black transition-all ${
                                b === 'W'  ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' :
                                b === '4'  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' :
                                b === '6'  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' :
                                b === 'Wd' || b === 'Nb' ? 'bg-purple-700/60 text-purple-200' :
                                'bg-white/8 text-white/50'
                            }`}>{b === '·' ? '0' : b}</div>
                        ))}
                        {Array.from({ length: Math.max(0, 6 - currentOverBalls.length) }).map((_, i) => (
                            <div key={i} className="w-9 h-9 rounded-xl border border-white/5 opacity-20" />
                        ))}
                    </div>
                </div>
            </div>
        );
    });

    const AIAnalyticsBar = memo(({ winProb, teamA, teamB, momentum }) => {
        const probA = winProb || 50;
        const probB = 100 - probA;
        
        return (
            <div className="mb-4 space-y-3">
                <div className="flex justify-between items-center mb-1.5 px-2">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/30">{teamA}</span>
                        <span className="text-xl font-black text-emerald-400 leading-none">{probA}%</span>
                    </div>
                    <div className="text-center bg-white/5 border border-white/10 rounded-full px-3 py-1">
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40">AI Win Prob</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/30">{teamB}</span>
                        <span className="text-xl font-black text-blue-400 leading-none">{probB}%</span>
                    </div>
                </div>
                
                {/* Probability Slider Bar */}
                <div className="relative h-2.5 bg-white/5 rounded-full overflow-hidden flex border border-white/10">
                    <div 
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                        style={{ width: `${probA}%` }}
                    />
                    <div className="w-0.5 h-full bg-white/20 absolute left-[50%] -translate-x-1/2 z-10" />
                    <div 
                        className="h-full bg-gradient-to-l from-blue-600 to-blue-400 transition-all duration-1000 ease-out"
                        style={{ width: `${probB}%` }}
                    />
                </div>

                {/* Momentum Gauge */}
                <div className="flex items-center gap-3 px-1">
                    <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden flex">
                        <div className="h-full bg-amber-500 transition-all duration-700" style={{ width: `${momentum || 50}%` }} />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-amber-500 whitespace-nowrap">Momentum</span>
                </div>
            </div>
        );
    });

    const MomentumChart = memo(({ history }) => {
        const data = (history || []).map((b, i) => ({
            name: `${b.over}.${b.ball}`,
            prob: b.win_prob || 50,
            runs: b.runs
        })).slice(-20); // Last 20 balls

        return (
            <div className="h-40 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorProb" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" hide />
                        <YAxis hide domain={[0, 100]} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }}
                            itemStyle={{ color: '#10b981' }}
                        />
                        <Area type="monotone" dataKey="prob" stroke="#10b981" fillOpacity={1} fill="url(#colorProb)" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
                <p className="text-[8px] font-black uppercase tracking-widest text-center text-white/20 mt-2">Match Momentum (Win % Swing)</p>
            </div>
        );
    });

    const ScoringButtons = memo(({ onRecord, onWicket, onUndo, onSwap }) => (
        <div className="bg-[#0a1a0c] border border-white/8 rounded-[2rem] p-4 space-y-3">
            {/* Run buttons row 1: 0-3 */}
            <div className="grid grid-cols-4 gap-2.5">
                {[0, 1, 2, 3].map(r => (
                    <button
                        key={r}
                        onClick={() => onRecord(r)}
                        className="h-[4.5rem] bg-white/5 hover:bg-white/10 active:scale-95 active:bg-white/15 border border-white/5 rounded-2xl text-xl font-black text-white transition-all"
                    >{r}</button>
                ))}
            </div>

            {/* Run buttons row 2: 4, 6, WD, NB */}
            <div className="grid grid-cols-4 gap-2.5">
                <button onClick={() => onRecord(4)} className="h-[4.5rem] bg-blue-600 hover:bg-blue-500 active:scale-95 border border-blue-500/50 text-white text-2xl font-black rounded-2xl shadow-lg shadow-blue-600/20 transition-all">4</button>
                <button onClick={() => onRecord(6)} className="h-[4.5rem] bg-orange-600 hover:bg-orange-500 active:scale-95 border border-orange-500/50 text-white text-2xl font-black rounded-2xl shadow-lg shadow-orange-600/20 transition-all">6</button>
                <button onClick={() => onRecord('wd')} className="h-[4.5rem] bg-purple-900/60 hover:bg-purple-800/70 active:scale-95 border border-purple-500/20 text-purple-300 text-sm font-black rounded-2xl transition-all flex flex-col items-center justify-center gap-0.5">
                    <span>WD</span><span className="text-[8px] opacity-50">+1</span>
                </button>
                <button onClick={() => onRecord('nb')} className="h-[4.5rem] bg-purple-900/60 hover:bg-purple-800/70 active:scale-95 border border-purple-500/20 text-purple-300 text-sm font-black rounded-2xl transition-all flex flex-col items-center justify-center gap-0.5">
                    <span>NB</span><span className="text-[8px] opacity-50">+1</span>
                </button>
            </div>

            {/* Action row: WICKET + UNDO + SWAP */}
            <div className="grid grid-cols-3 gap-2.5">
                <button onClick={onWicket} className="h-[4.5rem] bg-red-600 hover:bg-red-500 active:scale-95 border border-red-500/50 text-white font-black text-sm rounded-2xl shadow-lg shadow-red-600/30 tracking-wider transition-all uppercase">
                    WICKET
                </button>
                <button onClick={onUndo} className="h-[4.5rem] bg-white/5 hover:bg-white/10 active:scale-95 border border-white/5 rounded-2xl flex items-center justify-center text-white/30 hover:text-white transition-all">
                    <Undo2 size={22} />
                </button>
                <button onClick={onSwap} className="h-[4.5rem] bg-white/5 hover:bg-white/10 active:scale-95 border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-1 text-emerald-400 hover:text-emerald-300 transition-all">
                    <RefreshCw size={16} />
                    <span className="text-[8px] font-black uppercase tracking-widest">SWAP</span>
                </button>
            </div>
        </div>
    ));


    const updateState = useCallback((updates) => setState(prev => ({ ...prev, ...updates })), []);

    const syncBallWithServer = async (stateData) => {
        try {
            const lastBall = stateData.lastBallData;
            if (!lastBall) return;

            // 1. Push to Granular Ball Trace
            await apiClient.post(`/matches/${id}/ball`, {
                inning: stateData.inningsNum,
                over: stateData.overNum,
                ball: stateData.ballInOver,
                batter_id: lastBall.batsmanId,
                bowler_id: lastBall.bowlerId,
                runs: lastBall.runs || 0,
                is_four: lastBall.runs === 4,
                is_six: lastBall.runs === 6,
                extra_type: lastBall.extra,
                is_wicket: !!lastBall.isWicket,
                wicket: lastBall.wicket || null
            });

            // 2. Push to Legacy Scorecard Sync (Live Dashboard Cards)
            await apiClient.post(`/matches/${id}/live-update`, {
                runs: stateData.runs,
                wickets: stateData.wickets,
                overNum: stateData.overNum,
                ballInOver: stateData.ballInOver,
                batters: stateData.batters,
                bowlers: stateData.bowlers,
                inningsNum: stateData.inningsNum,
                target: stateData.target,
                recent_balls: stateData.currentOverBalls
            });
        } catch (err) {
            console.error("Cloud Sync Failed:", err);
        }
    };

    useEffect(() => {
        PlayerDB.initializePresets(PRESET_TEAMS);
        
        const fetchMatch = async () => {
            try {
                // 1. Check Local Storage first for ultra-fast "Flash Recovery"
                const localKey = `live_match_${id}`;
                const cached = localStorage.getItem(localKey);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    // Only use cache if it was saved within the last hour
                    if (Date.now() - (parsed._ts || 0) < 3600000) {
                        setState(prev => ({ ...prev, ...parsed, _isFromCache: true }));
                    }
                }

                // 2. Fetch ground truth from Server
                const res = await apiClient.get(`/matches/${id}`);
                const matchData = res.data.match || res.data;
                setMatch(matchData);
                
                // Initialize Teams from DB
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

                // 3. Routing Logic based on Database Status
                const hasInGameProgress = (matchData.team_a?.score > 0 || matchData.team_b?.score > 0 || matchData.live_data?.striker !== null);
                const isMatchLive = matchData.status === 'In Progress' || hasInGameProgress;

                if (matchData.status === 'Completed') {
                    setState(s => ({ ...s, phase: 'match_result', result: 'Match Completed' }));
                } else if (isMatchLive) {
                    // It's Live! Stay on scoring screen, restore from live_data
                    setState(s => {
                        const live = matchData.live_data || {};
                        let p = live.phase || 'batting';
                        if (p === 'batting' || p === 'select_openers' || p === 'select_bowler') {
                            if (live.striker === null || live.striker === undefined) p = 'select_openers';
                            else if (live.currentBowlerIdx === null || live.currentBowlerIdx === undefined) p = 'select_bowler';
                        }
                        return { ...s, ...live, phase: p, history_balls: matchData.ball_history || [] };
                    });
                } else if (matchData.verification?.status === 'VERIFIED' || matchData.status === 'Scheduled') {
                    // Match exists but hasn't started -> Show Toss
                    setState(s => ({ ...s, phase: 'toss' }));
                }

                // Clean up cache if server says match is different
                console.log("💾 Match Node Initialized:", matchData.title);
                if (matchData.commentary_log) setCommentary(matchData.commentary_log);
                localStorage.removeItem(localKey);

            } catch (error) {
                console.error("Fetch Match Error:", error);
                toast.error("Match link broken or session expired.");
                navigate('/dashboard');
            } finally {
                setIsDbLoading(false);
            }
        };

        fetchMatch();

        const fetchHistory = async () => {
            try {
                const res = await apiClient.get('/matches/history/teams');
                if (res.data.success) {
                    setRecentTeams(res.data.teams || []);
                    setLastMatch(res.data.last_match);
                }
            } catch (err) {
                console.error("History fetch fail:", err);
            }
        };
        fetchHistory();
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

    const PlayerProfileModal = memo(({ player, onClose }) => {
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
                                <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1">Runs</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                                <p className="text-lg font-black text-blue-400">{stats.fours}</p>
                                <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest mt-1">Fours</p>
                            </div>
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                                <p className="text-lg font-black text-orange-400">{stats.sixes}</p>
                                <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest mt-1">Sixes</p>
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
    });    const UserSearchModal = memo(({ target, onClose, onSelect }) => {
        const [query, setQuery] = useState('');
        const [results, setResults] = useState([]);
        const [loading, setLoading] = useState(false);

        const handleSearch = async (val) => {
            setQuery(val);
            if (val.length < 3) {
                setResults([]);
                return;
            }
            setLoading(true);
            try {
                const res = await apiClient.get(`/players/search-player?q=${val}`);
                if (res.data.success) setResults(res.data.players);
            } catch (err) {
                console.error("Search failed:", err);
            } finally {
                setLoading(false);
            }
        };

        return (
            <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col p-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-black uppercase tracking-tighter">Link Turf Account</h2>
                    <button onClick={onClose} className="p-2.5 bg-white/5 rounded-xl text-white/40"><ArrowLeft size={18} /></button>
                </div>

                <div className="relative mb-6">
                    <input 
                        autoFocus
                        placeholder="Name or Mobile Number..." 
                        value={query} 
                        onChange={e => handleSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-bold focus:border-emerald-500/50 transition-all outline-none"
                    />
                    {loading && <RefreshCw className="absolute right-5 top-5 text-emerald-500 animate-spin" size={18} />}
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {results.length === 0 && query.length >= 3 && !loading && (
                        <div className="p-8 text-center text-white/20">
                            <Users className="mx-auto mb-4 opacity-10" size={48} />
                            <p className="text-xs font-black uppercase tracking-widest">No matching accounts</p>
                        </div>
                    )}
                    {results.map(u => (
                        <button 
                            key={u._id} 
                            onClick={() => onSelect(u)}
                            className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center font-black text-xs text-emerald-400">
                                    {u.name.slice(0, 1).toUpperCase()}
                                </div>
                                <div className="text-left">
                                    <p className="text-xs font-black uppercase tracking-tight group-hover:text-emerald-400 transition-colors">{u.name}</p>
                                    <p className="text-[10px] text-white/30 font-bold">@{u.username || u.phone?.slice(-4)}</p>
                                </div>
                            </div>
                            <CheckCircle size={16} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    ))}
                    {query.length < 3 && (
                        <div className="p-8 text-center text-white/10 italic text-[10px]">Type at least 3 characters to search...</div>
                    )}
                </div>
            </div>
        );
    });

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
            formatOvers: overs,
            batters: [],
            bowlers: []
        }));
    };

    const startCustomMatch = () => {
        const t1Players = setupState.teams[0].players.map(p => ({ ...p }));
        const t2Players = setupState.teams[1].players.map(p => ({ ...p }));

        setTeams([
            { name: setupState.teams[0].name || 'Team A', short: (setupState.teams[0].name || 'TMA').slice(0, 3).toUpperCase(), players: t1Players },
            { name: setupState.teams[1].name || 'Team B', short: (setupState.teams[1].name || 'TMB').slice(0, 3).toUpperCase(), players: t2Players }
        ]);

        setState(prev => ({
            ...prev,
            phase: 'toss',
            formatOvers: setupState.overs,
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
    const initTeams = useCallback((batTeam, bowlTeam) => {
        const bt = TEAMS[batTeam];
        const bwt = TEAMS[bowlTeam];
        if (!bt || !bwt) return;

        setState(prev => ({
            ...prev,
            batters: bt.players.map((p, i) => ({
                name: p.name,
                user_id: p.user_id,
                r: 0, b: 0, fours: 0, sixes: 0, sr: 0, out: false, batting: false, milestones: []
            })),
            bowlers: bwt.players.map((p, i) => ({
                name: p.name,
                user_id: p.user_id,
                style: BOWLING_STYLES[i % BOWLING_STYLES.length],
                overs: 0, r: 0, w: 0, balls: 0
            })),
            striker: null, nonStriker: null, currentBowlerIdx: null, prevBowlerIdx: null
        }));
    }, [TEAMS]);

    const saveCheckpoint = () => {
        setState(prev => {
            const h = [...prev.history, JSON.stringify({ ...prev, history: [] })];
            if (h.length > 20) h.shift();
            return { ...prev, history: h };
        });
    };

    const handleUndo = () => {
        if (!state.history.length) return;
        
        // Haptic Feedback for Undo
        if (window.navigator?.vibrate) {
            window.navigator.vibrate([10, 30, 10]);
        }

        const last = JSON.parse(state.history.pop());
        setState({ ...last, history: state.history });
        
        // Notify backend to remove the last recorded ball to avoid duplication in graph
        apiClient.post(`/matches/${id}/undo-ball`).catch(e => console.error("Undo sync fail", e));
    };

    const syncWithBackend = useCallback(async () => {
        if (!id || !state.batters.length || isDbLoading) return; // DON'T SYNC DURING LOAD
        
        // --- 1. Snapshot to Local Storage (Flash Backup) ---
        try {
            const cachePayload = { ...state, _ts: Date.now() };
            localStorage.setItem(`live_match_${id}`, JSON.stringify(cachePayload));
        } catch (e) {
            console.warn("Local storage cache failed (likely over quota)");
        }

        // --- 2. Push to Database (Ground Truth) ---
        try {
            await apiClient.post(`/matches/${id}/live-update`, {
                runs: state.runs,
                wickets: state.wickets,
                overs: state.overNum + (state.ballInOver / 6),
                formatOvers: state.formatOvers,
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
                striker_name: state.batters[state.striker]?.name || "The Batsman",
                battingTeam: state.battingTeam,
                lastBallData: state.lastBallData,
                inn1Score: state.inn1Score,
                inn1Wickets: state.inn1Wickets,
                inn1Overs: state.inn1Overs,
                inn1Batters: state.inn1Batters,
                inn1Bowlers: state.inn1Bowlers
            });
        } catch (error) {
            console.warn("Backend sync failed:", error.message);
        }
    }, [id, state, isDbLoading]);

    useEffect(() => {
        if (!socketRef.current) {
            socketRef.current = io(SOCKET_URL);
            socketRef.current.emit('join_match', id);
        }

        const socket = socketRef.current;

        if (!isDbLoading && state.phase !== 'match_setup') {
            const timer = setTimeout(syncWithBackend, 200);
            
            socket.on('stats:updated', (data) => {
                console.log('🚀 Career stats synced:', data);
                if (data.match_id === id) {
                    toast.success('Career Stats Updated!', {
                        position: 'bottom-center',
                        autoClose: 3000
                    });
                }
            });

            // If we just entered match_result phase, trigger a final sync
            if (state.phase === 'match_result') {
                syncWithBackend();
            }

            return () => {
                clearTimeout(timer);
                socket.off('stats:updated');
            };
        }
    }, [id, state.runs, state.wickets, state.totalBalls, state.phase, syncWithBackend, isDbLoading]);

    const recordBall = useCallback((type) => {
        if (state.phase !== 'batting') return;

        // Haptic Feedback for Scoring
        if (window.navigator?.vibrate) {
            window.navigator.vibrate(20);
        }

        saveCheckpoint();
        setState(prev => {
            const next = {
                ...prev,
                extras: { ...prev.extras },
                currentOverBalls: [...prev.currentOverBalls],
                overHistory: [...prev.overHistory],
                batters: [...prev.batters],
                bowlers: [...prev.bowlers],
                lastBallData: null // Reset before recording
            };
            const isWide = type === 'wd', isNB = type === 'nb', isBye = type === 'bye';
            const bIndex = prev.striker;
            const bwIdx = prev.currentBowlerIdx;
            
            // Temporary ball info for logging
            const ballData = {
                runs: 0,
                isWicket: false,
                extra: type,
                batsmanId: prev.batters[bIndex]?.user_id || prev.batters[bIndex]?.name,
                bowlerId: prev.bowlers[bwIdx]?.user_id || prev.bowlers[bwIdx]?.name
            };

            const bw = { ...prev.bowlers[bwIdx] };
            const striker = {
                ...prev.batters[prev.striker],
                milestones: [...(prev.batters[prev.striker]?.milestones || [])]
            };

            if (isWide) {
                next.runs++; next.extras.wides++; bw.r++;
                next.currentOverBalls.push('Wd'); next.freeHit = false;
                ballData.runs = 1;
            } else if (isNB) {
                next.runs++; next.extras.noballs++; bw.r++;
                striker.b++; next.currentOverBalls.push('Nb'); next.freeHit = true;
                ballData.runs = 1;
            } else if (isBye) {
                next.runs++; next.extras.byes++; bw.balls++; next.ballInOver++; next.totalBalls++;
                next.currentOverBalls.push('B'); next.freeHit = false;
                ballData.runs = 1;
                const t = next.striker; next.striker = next.nonStriker; next.nonStriker = t;
            } else {
                const runs = Number(type);
                ballData.runs = runs;
                ballData.extra = null;
                next.runs += runs; striker.r += runs; striker.b++;
                if (runs === 4) { striker.fours = (striker.fours || 0) + 1; }
                if (runs === 6) { striker.sixes = (striker.sixes || 0) + 1; }
                bw.r += runs; bw.balls++; next.ballInOver++; next.totalBalls++;
                next.currentOverBalls.push(runs === 0 ? '·' : String(runs)); next.freeHit = false;
                if (runs % 2 !== 0) { const t = next.striker; next.striker = next.nonStriker; next.nonStriker = t; }
            }

            next.lastBallData = ballData;
            next.batters[prev.striker] = striker;
            next.bowlers[bwIdx] = bw;

            if (striker.r >= 100 && !striker.milestones.includes(100)) {
                striker.milestones.push(100);
                next.pendingMilestone = { name: striker.name, typ: 'CENTURY', val: 100 };
            } else if (striker.r >= 50 && !striker.milestones.includes(50)) {
                striker.milestones.push(50);
                next.pendingMilestone = { name: striker.name, typ: 'HALF-CENTURY', val: 50 };
            }

            if (next.ballInOver >= 6 && next.phase === 'batting') {
                next.overHistory.push([...next.currentOverBalls]);
                next.currentOverBalls = []; next.overNum++; next.ballInOver = 0;
                next.prevBowlerIdx = next.currentBowlerIdx; next.currentBowlerIdx = null;
                const t = next.striker; next.striker = next.nonStriker; next.nonStriker = t;
                next.phase = next.overNum >= next.formatOvers ? 'innings_over' : 'select_bowler';
            }

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
            const ballEntry = {
                over: next.overNum,
                ball: next.ballInOver,
                runs: ballData.runs,
                is_wicket: false,
                extra: ballData.extra,
                score_at_ball: next.runs,
                wickets_at_ball: next.wickets,
                win_prob: prev.win_probability || 50
            };
            
            next.history_balls = [...(prev.history_balls || []), ballEntry];
            
            const resPayload = {
                inning: next.inningsNum, over: next.overNum, ball: next.ballInOver,
                batter_id: striker.user_id, bowler_id: bw.user_id, runs: isWide || isNB || isBye ? 0 : type,
                is_four: !isWide && !isNB && !isBye && type == 4,
                is_six: !isWide && !isNB && !isBye && type == 6,
                fours: striker.fours || 0, sixes: striker.sixes || 0,
                extra_type: isWide ? 'wide' : isNB ? 'noball' : isBye ? 'bye' : null, is_wicket: false
            };
            apiClient.post(`/matches/${id}/ball`, resPayload).catch(e => { });

            return next;
        });
    }, [state.phase, id, match]);

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
                next.phase = next.overNum >= next.formatOvers ? 'innings_over' : 'select_bowler';
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

            next.history_balls = [...(prev.history_balls || []), {
                over: next.overNum,
                ball: next.ballInOver,
                runs: completedRuns || 0,
                is_wicket: true,
                score_at_ball: next.runs,
                wickets_at_ball: next.wickets,
                win_prob: prev.win_probability || 50
            }];

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
                winner = state.battingTeam === 'A' ? (match.team_a.team_id?._id || match.team_a.team_id) : (match.team_b.team_id?._id || match.team_b.team_id);
                won_by = 'Wickets';
                margin = 10 - state.wickets;
            } else {
                // If match is ended prematurely or overs finished
                const target = state.target;
                if (state.runs < target - 1) {
                    winner = state.battingTeam === 'A' ? (match.team_b.team_id?._id || match.team_b.team_id) : (match.team_a.team_id?._id || match.team_a.team_id);
                    won_by = 'Runs';
                    margin = (target - 1) - state.runs;
                } else if (state.runs === target - 1) {
                    won_by = 'Tie';
                    winner = null;
                }
            }
        } else {
            // First innings ended manually - technically no winner yet
            won_by = 'Innings Break';
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
    const handleAiMatchmake = async (choice) => {
        updateState({ aiLoading: true, aiRecommendation: null });
        try {
            const res = await apiClient.post('/matchmaking/post-match', { matchId: id, choice });
            if (res.data.success) {
                updateState({ aiRecommendation: res.data });
                toast.success("AI Recommendation ready!");
            } else {
                toast.error(res.data.message || "Matchmaking failed.");
            }
        } catch (err) {
            toast.error("Could not reach AI agent.");
        } finally {
            updateState({ aiLoading: false });
        }
    };


    if (isDbLoading) return (
        <div className="min-h-screen bg-[#0D1B0F] flex flex-col items-center justify-center text-white">
            <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">Loading Scorer ...</p>
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
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => {
                            if (window.confirm("⚠️ RESET SESSION? This will clear your local progress tracking.")) {
                                localStorage.removeItem(`live_match_${id}`);
                                updateState({ phase: 'match_setup', runs: 0, wickets: 0, ballInOver: 0, overNum: 0, totalBalls: 0, batters: [], bowlers: [], striker: null, nonStriker: null, currentBowlerIdx: null });
                                window.location.reload(); 
                            }
                        }} 
                        className="p-2.5 bg-red-500/10 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                    >
                        <RefreshCw size={14} />
                    </button>
                    <button onClick={() => navigate('/dashboard')} className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-white/40 hover:text-white transition-all">
                        <LogOut size={16} />
                    </button>
                </div>
            </div>

            {searchTarget && (
                <UserSearchModal 
                    target={searchTarget} 
                    onClose={() => setSearchTarget(null)} 
                    onSelect={(user) => {
                        const nt = [...setupState.teams];
                        nt[searchTarget.teamIdx].players[searchTarget.playerIdx] = {
                            name: user.name,
                            user_id: user._id
                        };
                        setSetupState({ ...setupState, teams: nt });
                        setSearchTarget(null);
                        toast.success(`Linked to ${user.name}!`);
                    }} 
                />
            )}
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

                        {lastMatch && (
                            <button
                                onClick={() => {
                                    const ta = lastMatch.quick_teams?.team_a || { name: lastMatch.team_a?.team_id?.name, players: lastMatch.live_data?.inn1Batters || [] };
                                    const tb = lastMatch.quick_teams?.team_b || { name: lastMatch.team_b?.team_id?.name, players: lastMatch.live_data?.inn2Batters || [] };

                                    setTeams([
                                        { name: ta.name, short: (ta.name.slice(0, 3)).toUpperCase(), players: (ta.players || []).map(p => ({ name: typeof p === 'string' ? p : p.display_name || p.name, user_id: p.user_id || null })) },
                                        { name: tb.name, short: (tb.name.slice(0, 3)).toUpperCase(), players: (tb.players || []).map(p => ({ name: typeof p === 'string' ? p : p.display_name || p.name, user_id: p.user_id || null })) }
                                    ]);

                                    setState(prev => ({
                                        ...prev,
                                        phase: 'toss',
                                        formatOvers: lastMatch.format?.replace('T', '') || 20,
                                        batters: [],
                                        bowlers: []
                                    }));
                                }}
                                className="w-full mt-4 p-6 bg-white/5 border border-white/10 rounded-[2rem] flex items-center justify-between group hover:border-amber-500/40 transition-all hover:bg-amber-500/5"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                                        <RefreshCw size={20} className="text-amber-500 group-hover:rotate-180 transition-transform duration-500" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Instant Rematch</p>
                                        <p className="text-xs font-bold">{lastMatch.quick_teams?.team_a?.name || lastMatch.team_a?.team_id?.name} vs {lastMatch.quick_teams?.team_b?.name || lastMatch.team_b?.team_id?.name}</p>
                                    </div>
                                </div>
                                <span className="text-[8px] font-black uppercase tracking-widest px-3 py-1 bg-white/5 rounded-full text-white/20">Last Match</span>
                            </button>
                        )}

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
                            <div className="mt-8 space-y-6 bg-white/5 border border-white/10 rounded-[2.5rem] p-6 animate-in zoom-in-95 duration-400">
                                <div className="space-y-1">
                                    <h3 className="font-black uppercase tracking-widest text-xs">Team A Setup</h3>
                                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Map names to The Turf accounts</p>
                                </div>
                                <input placeholder="Team Name" value={setupState.teams[0].name} onChange={e => {
                                    const nt = [...setupState.teams]; nt[0].name = e.target.value; setSetupState({ ...setupState, teams: nt });
                                }} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs font-bold" />
                                
                                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {setupState.teams[0].players.map((p, i) => (
                                        <div key={i} className="flex gap-2 items-center">
                                            <span className="w-8 text-[10px] font-black text-white/20">{i+1}</span>
                                            <input 
                                                value={p.name} 
                                                onChange={e => {
                                                    const nt = [...setupState.teams]; 
                                                    nt[0].players[i].name = e.target.value; 
                                                    setSetupState({ ...setupState, teams: nt });
                                                }}
                                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[11px] font-bold"
                                            />
                                            <button 
                                                onClick={() => setSearchTarget({ teamIdx: 0, playerIdx: i })}
                                                className={`p-3 rounded-xl border transition-all ${p.user_id ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-white/20'}`}
                                            >
                                                <User size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => setSetupState(s => ({ ...s, step: 1 }))} className="py-4 border border-white/10 rounded-2xl font-black uppercase text-[10px]">Back</button>
                                    <button onClick={() => setSetupState(s => ({ ...s, step: 3 }))} className="py-4 bg-emerald-600 rounded-2xl font-black uppercase text-[10px]">Team B →</button>
                                </div>
                            </div>
                        )}

                        {setupState.step === 3 && (
                            <div className="mt-8 space-y-6 bg-white/5 border border-white/10 rounded-[2.5rem] p-6 animate-in zoom-in-95 duration-400">
                                <div className="space-y-1">
                                    <h3 className="font-black uppercase tracking-widest text-xs">Team B Setup</h3>
                                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Map names to The Turf accounts</p>
                                </div>
                                <input placeholder="Team Name" value={setupState.teams[1].name} onChange={e => {
                                    const nt = [...setupState.teams]; nt[1].name = e.target.value; setSetupState({ ...setupState, teams: nt });
                                }} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs font-bold" />
                                
                                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {setupState.teams[1].players.map((p, i) => (
                                        <div key={i} className="flex gap-2 items-center">
                                            <span className="w-8 text-[10px] font-black text-white/20">{i+1}</span>
                                            <input 
                                                value={p.name} 
                                                onChange={e => {
                                                    const nt = [...setupState.teams]; 
                                                    nt[1].players[i].name = e.target.value; 
                                                    setSetupState({ ...setupState, teams: nt });
                                                }}
                                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[11px] font-bold"
                                            />
                                            <button 
                                                onClick={() => setSearchTarget({ teamIdx: 1, playerIdx: i })}
                                                className={`p-3 rounded-xl border transition-all ${p.user_id ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-white/20'}`}
                                            >
                                                <User size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

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
                                    <span className="w-8 h-10 flex items-center justify-center text-[10px] font-black text-white/20">{i + 1}</span>
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

                                {recentTeams.length > 0 && (
                                    <div className="space-y-3 mt-6">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/20">🏆 Recent Teams</p>
                                        <div className="grid gap-2">
                                            {recentTeams.map(t => (
                                                <button key={t.id} onClick={() => {
                                                    const newT = { id: t.id, name: t.name, emoji: '🏠', players: t.players, short: t.short };
                                                    setPresetTeams(prev => [newT, ...prev.filter(x => x.id !== t.id)]);
                                                    setQuickMatchState({ ...quickMatchState, teamAId: t.id, step: 'pick_b' });
                                                }} className="w-full p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center justify-between group hover:bg-emerald-500/10 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center font-black text-[10px] text-emerald-400">{t.short}</div>
                                                        <div className="text-left">
                                                            <p className="text-xs font-black uppercase tracking-tight">{t.name}</p>
                                                            <p className="text-[10px] text-white/30 truncate max-w-[150px]">{t.players.slice(0, 3).join(', ')}...</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-white/20">PREV MATCH</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
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

                                {recentTeams.filter(t => t.id !== quickMatchState.teamAId).length > 0 && (
                                    <div className="space-y-3 mt-6">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/20">🏆 Recent Opponents</p>
                                        <div className="grid gap-2">
                                            {recentTeams.filter(t => t.id !== quickMatchState.teamAId).map(t => (
                                                <button key={t.id} onClick={() => {
                                                    const newT = { id: t.id, name: t.name, emoji: '🛡️', players: t.players, short: t.short };
                                                    setPresetTeams(prev => [newT, ...prev.filter(x => x.id !== t.id)]);
                                                    setQuickMatchState({ ...quickMatchState, teamBId: t.id, step: 'confirm' });
                                                }} className="w-full p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-center justify-between group hover:bg-amber-500/10 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center font-black text-[10px] text-amber-500">{t.short}</div>
                                                        <div className="text-left">
                                                            <p className="text-xs font-black uppercase tracking-tight">{t.name}</p>
                                                            <p className="text-[10px] text-white/30 truncate max-w-[150px]">{t.players.slice(0, 3).join(', ')}...</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-white/20">PREV MATCH</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
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
                    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                        <div className="text-center">
                            <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">The Toss</h2>
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Who is calling at the pitch?</p>
                        </div>

                        <div className="relative h-48 flex items-center justify-center">
                            <div className="absolute inset-0 bg-emerald-500/5 blur-[100px] rounded-full"></div>
                            <div className="w-32 h-32 bg-gradient-to-br from-yellow-400 via-orange-500 to-yellow-600 rounded-full flex items-center justify-center text-5xl shadow-[0_0_50px_rgba(245,158,11,0.4)] border-8 border-white/10 ring-4 ring-orange-500/20 animate-bounce">🪙</div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {TEAMS.map((t, i) => (
                                <button key={i} onClick={() => updateState({ tossWinner: i, phase: 'bb_choice' })} className="relative overflow-hidden p-8 bg-white/5 border border-white/10 rounded-[2.5rem] flex flex-col items-center gap-4 hover:border-emerald-500/50 hover:bg-emerald-500/5 group transition-all">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Users size={80} /></div>
                                    <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                                        <span className="text-2xl font-black text-emerald-400">{t.name.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Pick Winner</p>
                                        <span className="text-xs font-black uppercase tracking-widest text-white group-hover:text-emerald-400">{t.name}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Bat/Ball Choice Phase */}
                {state.phase === 'bb_choice' && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                        <div className="bg-emerald-600/10 border border-emerald-500/20 rounded-[3rem] p-10 text-center relative overflow-hidden">
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl"></div>
                            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-emerald-500 mb-3">Toss Result</h2>
                            <p className="text-2xl font-black text-white mb-2">{TEAMS[state.tossWinner]?.name}</p>
                            <p className="text-[10px] font-black text-emerald-400/60 uppercase tracking-widest">has won the toss</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => updateState({ bbChoice: 'bat' })} className={`p-10 rounded-[2.5rem] border-2 flex flex-col items-center gap-6 transition-all duration-300 ${state.bbChoice === 'bat' ? 'bg-emerald-600/20 border-emerald-500 shadow-2xl shadow-emerald-500/20' : 'bg-white/5 border-white/10 opacity-40 hover:opacity-100'}`}>
                                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-4xl">🏏</div>
                                <div className="text-center">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Decision</span>
                                    <p className="text-sm font-black uppercase tracking-widest text-white mt-1">Bat First</p>
                                </div>
                            </button>
                            <button onClick={() => updateState({ bbChoice: 'ball' })} className={`p-10 rounded-[2.5rem] border-2 flex flex-col items-center gap-6 transition-all duration-300 ${state.bbChoice === 'ball' ? 'bg-emerald-600/20 border-emerald-500 shadow-2xl shadow-emerald-500/20' : 'bg-white/5 border-white/10 opacity-40 hover:opacity-100'}`}>
                                <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center text-4xl">⚾</div>
                                <div className="text-center">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Decision</span>
                                    <p className="text-sm font-black uppercase tracking-widest text-white mt-1">Bowl First</p>
                                </div>
                            </button>
                        </div>

                        <button 
                            disabled={!state.bbChoice} 
                            onClick={() => {
                                const batTeam = state.bbChoice === 'bat' ? state.tossWinner : (state.tossWinner === 0 ? 1 : 0);
                                const bowlTeam = state.bbChoice === 'bat' ? (state.tossWinner === 0 ? 1 : 0) : state.tossWinner;
                                updateState({ battingTeam: batTeam, bowlingTeam: bowlTeam, phase: 'select_openers' });
                                initTeams(batTeam, bowlTeam);
                            }} 
                            className="w-full bg-white text-[#0D1B0F] py-6 rounded-[2.5rem] font-black uppercase text-xs tracking-[0.3em] shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-20"
                        >
                            Select Openers <ArrowLeft className="rotate-180" size={16} />
                        </button>
                    </div>
                )}

                {/* Openers Selection Phase */}
                {state.phase === 'select_openers' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-600">
                        <div className="bg-[#0a1a0c] border border-emerald-500/20 rounded-[3rem] p-8 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 p-4 opacity-10"><Swords size={60} /></div>
                            <h2 className="text-xs font-black uppercase tracking-[0.4em] text-emerald-500 mb-3">Batting Unit</h2>
                            <p className="text-xl font-black text-white">{TEAMS[state.battingTeam]?.name}</p>
                            <div className="mt-4 flex items-center justify-center gap-2">
                                <span className="px-3 py-1 bg-emerald-500/10 rounded-full text-[9px] font-black text-emerald-500 uppercase tracking-widest">Opening Partnership</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className={`p-6 rounded-[2.5rem] border-2 transition-all duration-300 ${typeof state.openerStrikerIdx === 'number' ? 'bg-emerald-600/10 border-emerald-500 shadow-xl shadow-emerald-500/10' : 'bg-white/5 border-dashed border-white/10'}`}>
                                <p className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest mb-1.5">Striker</p>
                                <p className="text-sm font-black text-white truncate">{typeof state.openerStrikerIdx === 'number' ? state.batters[state.openerStrikerIdx]?.name : "—"}</p>
                            </div>
                            <div className={`p-6 rounded-[2.5rem] border-2 transition-all duration-300 ${typeof state.openerNSIdx === 'number' ? 'bg-emerald-600/10 border-emerald-500 shadow-xl shadow-emerald-500/10' : 'bg-white/5 border-dashed border-white/10'}`}>
                                <p className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest mb-1.5 text-right">Non-Striker</p>
                                <p className="text-sm font-black text-white truncate text-right">{typeof state.openerNSIdx === 'number' ? state.batters[state.openerNSIdx]?.name : "—"}</p>
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-4 max-h-72 overflow-y-auto space-y-2 custom-scrollbar">
                            {state.batters?.map((p, i) => (
                                <button 
                                    key={i} 
                                    disabled={state.openerStrikerIdx === i || state.openerNSIdx === i} 
                                    onClick={() => {
                                        if (typeof state.openerStrikerIdx !== 'number') updateState({ openerStrikerIdx: i });
                                        else updateState({ openerNSIdx: i });
                                    }} 
                                    className="w-full p-5 rounded-2xl border border-white/5 bg-white/5 text-left flex items-center justify-between hover:bg-emerald-500/10 transition-all disabled:opacity-20"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center font-black text-[10px] text-white/40">{i+1}</div>
                                        <span className="text-xs font-black uppercase tracking-tight text-white/80">{p.name}</span>
                                    </div>
                                    { (state.openerStrikerIdx === i || state.openerNSIdx === i) ? <CheckCircle size={16} className="text-emerald-500" /> : <User size={16} className="text-white/10" /> }
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => updateState({ openerStrikerIdx: null, openerNSIdx: null, phase: 'bb_choice' })} className="py-5 border border-white/10 rounded-2xl font-black uppercase text-[10px] tracking-widest text-white/30">Back</button>
                                <button 
                                    disabled={typeof state.openerStrikerIdx !== 'number' || typeof state.openerNSIdx !== 'number'} 
                                    onClick={() => {
                                        const nb = [...state.batters];
                                        if (nb[state.openerStrikerIdx]) nb[state.openerStrikerIdx].batting = true;
                                        if (nb[state.openerNSIdx]) nb[state.openerNSIdx].batting = true;
                                        updateState({ batters: nb, striker: state.openerStrikerIdx, nonStriker: state.openerNSIdx, phase: 'select_bowler' });
                                    }} 
                                    className="py-5 bg-emerald-600 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-emerald-500/20 disabled:opacity-20"
                                >
                                    Next: Bowler →
                                </button>
                        </div>
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
                    <div className="space-y-4">
                        {/* Professional Tab Bar */}
                        <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 mb-2">
                            {['live', 'scorecard', 'insights', 'commentary'].map(t => (
                                <button 
                                    key={t}
                                    onClick={() => setActiveTab(t)}
                                    className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-white/30'}`}
                                >
                                    {t === 'insights' ? 'AI Insights' : t}
                                </button>
                            ))}
                        </div>

                        {activeTab === 'live' && (
                            <div className="space-y-3">
                                <AIAnalyticsBar 
                                    winProb={state.win_probability || 50} 
                                    momentum={state.momentum_score || 50}
                                    teamA={TEAMS[0]?.name || "Team A"}
                                    teamB={TEAMS[1]?.name || "Team B"}
                                />
                                <ScoreboardCard
                                    runs={state.runs}
                                    wickets={state.wickets}
                                    overNum={state.overNum}
                                    ballInOver={state.ballInOver}
                                    overs={state.formatOvers}
                                    teamName={TEAMS[state.battingTeam]?.name}
                                    currentOverBalls={state.currentOverBalls}
                                    inn1Score={state.inn1Score}
                                    inn1Wickets={state.inn1Wickets}
                                    inningsNum={state.inningsNum}
                                    target={state.target}
                                    runRate={(state.runs / (state.overNum + state.ballInOver / 6 || 1)).toFixed(2)}
                                    requiredRunRate={state.inningsNum === 2 ? ((state.target - state.runs) / (((state.formatOvers * 6) - (state.overNum * 6 + state.ballInOver)) / 6 || 1)).toFixed(2) : '0.00'}
                                />
                                
                                {/* Player Strip */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-[#0a1a0c] border border-emerald-500/20 rounded-2xl p-3">
                                        <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1.5 line-clamp-1">Striker</p>
                                        <p className="text-[11px] font-black text-white truncate mb-1">{state.batters[state.striker]?.name || '—'}</p>
                                        <p className="text-xl font-black text-emerald-400 leading-none">{state.batters[state.striker]?.r ?? 0}<span className="text-[10px] text-white/30 ml-1">({state.batters[state.striker]?.b ?? 0})</span></p>
                                    </div>
                                    <div className="bg-[#0a1a0c] border border-white/5 rounded-2xl p-3 opacity-60">
                                        <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1.5 line-clamp-1">Non-Str</p>
                                        <p className="text-[11px] font-black text-white truncate mb-1">{state.batters[state.nonStriker]?.name || '—'}</p>
                                        <p className="text-xl font-black text-white/40 leading-none">{state.batters[state.nonStriker]?.r ?? 0}<span className="text-[10px] text-white/20 ml-1">({state.batters[state.nonStriker]?.b ?? 0})</span></p>
                                    </div>
                                    <div className="bg-[#0a1a0c] border border-red-500/15 rounded-2xl p-3">
                                        <p className="text-[8px] font-black text-red-400 uppercase tracking-widest mb-1.5 line-clamp-1">Bowler</p>
                                        <p className="text-[11px] font-black text-white truncate mb-1">{state.bowlers[state.currentBowlerIdx]?.name || '—'}</p>
                                        <p className="text-xl font-black text-red-400 leading-none">{state.bowlers[state.currentBowlerIdx]?.w ?? 0}<span className="text-[10px] text-white/30 ml-1">/{state.bowlers[state.currentBowlerIdx]?.r ?? 0}</span></p>
                                    </div>
                                </div>

                                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-2.5 flex items-center justify-between px-4">
                                    <div className="flex items-center gap-2">
                                        <Users size={12} className="text-white/20" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Partnership</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-white/60">{state.partnership?.runs || 0}</span>
                                        <span className="text-[10px] font-bold text-white/20">({state.partnership?.balls || 0})</span>
                                    </div>
                                </div>
                                <ScoringButtons
                                    onRecord={recordBall}
                                    onWicket={() => updateState({ phase: 'wicket_type' })}
                                    onUndo={handleUndo}
                                    onSwap={() => updateState({ striker: state.nonStriker, nonStriker: state.striker })}
                                />
                            </div>
                        )}

                        {activeTab === 'scorecard' && (
                            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <p className="text-center text-white/20 text-[10px] uppercase font-black tracking-widest py-12">Scorecard View Loading...</p>
                            </div>
                        )}

                        {activeTab === 'insights' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-[#0a1a0c] border border-emerald-500/20 rounded-[2rem] p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Zap size={16} className="text-emerald-400 fill-emerald-400" />
                                        <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400">Match Momentum</h3>
                                    </div>
                                    <MomentumChart history={state.history_balls || []} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white/5 border border-white/10 rounded-3xl p-4">
                                        <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Pressure Index</p>
                                        <p className="text-xl font-black text-white">{Math.min(100, (state.runs / (state.overNum + state.ballInOver / 6 || 1) * 10).toFixed(0))}</p>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-3xl p-4">
                                        <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Win Probability</p>
                                        <p className="text-xl font-black text-emerald-400">{state.win_probability || 50}%</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'commentary' && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center gap-2 px-1">
                                    <Zap size={14} className="text-amber-500 fill-amber-500" />
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Live Commentary</h3>
                                </div>
                                <div className="space-y-2">
                                    {(commentary || []).slice(0, 10).map((comm, i) => (
                                        <div key={i} className={`p-4 rounded-2xl border transition-all ${i === 0 ? 'bg-amber-500/5 border-amber-500/20' : 'bg-white/5 border-white/10 opacity-60'}`}>
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-[10px] font-black bg-white/10 text-white/40 px-2 py-0.5 rounded-md">{comm.ball}</span>
                                                <span className="text-[10px] font-black text-white/20">{comm.runs} R</span>
                                            </div>
                                            <p className="text-[11px] font-bold text-white/80 leading-relaxed">{comm.text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Bowler Select Phase */}
                {state.phase === 'select_bowler' && (
                    <div className="space-y-4">
                        <div className="bg-emerald-600/10 border border-emerald-500/20 rounded-3xl p-6">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500 mb-1">Over {state.overNum + 1}</h2>
                            <p className="text-xl font-black">Select Bowler</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-4 max-h-[60vh] overflow-y-auto space-y-2">
                            {state.bowlers?.map((p, i) => {
                                const dis = i === state.prevBowlerIdx || p?.overs >= (state.formatOvers / 5);
                                return (
                                    <button key={i} disabled={dis} onClick={() => {
                                        updateState({ currentBowlerIdx: i, phase: 'batting' });
                                        if (state.totalBalls === 0) {
                                            toast.success("Match Started! First ball ready.", { icon: "🏏" });
                                        }
                                    }} className="w-full p-6 rounded-2xl border border-white/5 bg-white/5 text-left flex items-center justify-between hover:bg-emerald-500/10 transition-colors disabled:opacity-20">
                                        <div>
                                            <p className="text-sm font-black uppercase tracking-tight mb-1">{p?.name || `Bowler ${i+1}`}</p>
                                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-none">{p?.style || "Bowler"}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-emerald-400">{p?.overs || 0}.{p?.balls % 6 || 0}</p>
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
                            <p className="text-white/40 font-medium mt-2">Target: <span className="text-white font-bold">{state.runs + 1}</span> runs in {state.formatOvers} overs</p>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6">
                            <div className="flex justify-between items-center">
                                <div className="text-left">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Total Score</p>
                                    <p className="text-4xl font-black">{state.runs}/{state.wickets}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Run Rate</p>
                                    <p className="text-2xl font-black">{(state.runs / (state.overNum + state.ballInOver / 6 || 1)).toFixed(2)}</p>
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
                                    batters: TEAMS[nextBattingTeam].players.map(p => ({ ...p, r: 0, b: 0, fours: 0, sixes: 0, sr: 0, out: false, batting: false, milestones: [] })),
                                    bowlers: TEAMS[nextBowlingTeam].players.map(p => ({ ...p, o: 0, r: 0, w: 0, eco: 0, balls: 0 }))
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

                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 text-center">Post-Match Action</p>

                            {/* Option 1: Instant Rematch (Same Players) */}
                            <button
                                onClick={() => {
                                    // Reset to TOSS but keep TEAMS as is
                                    setState(prev => ({
                                        ...prev,
                                        phase: 'toss',
                                        inningsNum: 1,
                                        runs: 0, wickets: 0, ballInOver: 0, overNum: 0, totalBalls: 0,
                                        striker: null, nonStriker: null, currentBowlerIdx: null,
                                        currentOverBalls: [], overHistory: [], log: [],
                                        history: [], batters: [], bowlers: [], target: null,
                                        tossWinner: null, battingTeam: null, bowlingTeam: null, bbChoice: null
                                    }));
                                    toast.success("Preparing Rematch... Time for a New Toss!");
                                }}
                                className="w-full p-6 bg-emerald-600 rounded-3xl flex items-center justify-between group shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
                            >
                                <div className="flex items-center gap-4 text-left">
                                    <RefreshCw className="text-white animate-spin-slow group-hover:rotate-180 transition-transform duration-500" />
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-tight">Same Players</p>
                                        <p className="text-[9px] text-white/60 uppercase">Instant 2nd Match (Re-toss)</p>
                                    </div>
                                </div>
                                <ArrowLeft className="rotate-180" size={16} />
                            </button>

                            <div className="w-px h-10 bg-white/5 mx-auto"></div>

                            {/* Option 3: AI Selection (The Modern Choice) */}
                            {!state.aiRecommendation ? (
                                <button
                                    onClick={() => handleAiMatchmake('different')}
                                    disabled={state.aiLoading}
                                    className="w-full p-6 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl flex items-center justify-between group shadow-xl shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    <div className="flex items-center gap-4 text-left">
                                        {state.aiLoading ? (
                                            <RefreshCw className="text-white animate-spin" />
                                        ) : (
                                            <div className="bg-white/20 p-2 rounded-xl">
                                                <Zap className="text-white fill-white" size={20} />
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-tight">AI Recommended Squad</p>
                                            <p className="text-[9px] text-emerald-100/60 uppercase">Matches players by skill level & location</p>
                                        </div>
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">New</span>
                                </button>
                            ) : (
                                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-3xl p-6 animate-in zoom-in-95 duration-300">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="text-emerald-500" size={16} />
                                            <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">AI Squad Suggestions</span>
                                        </div>
                                        <button onClick={() => updateState({ aiRecommendation: null })} className="text-[9px] font-black uppercase text-white/30 hover:text-white">Clear</button>
                                    </div>

                                    <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                        {(state.aiRecommendation.suggestedTeam || []).map((p, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-6 h-6 bg-emerald-500/10 rounded-full flex items-center justify-center text-[9px] font-black text-emerald-500">{i + 1}</div>
                                                    <div>
                                                        <p className="text-[11px] font-black uppercase">{p.name}</p>
                                                        <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">{p.role} · {p.skillLevel}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-emerald-400">{p.compatibilityScore}%</p>
                                                    <p className="text-[7px] font-bold text-white/10 uppercase tracking-widest">Match</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => {
                                            const recTeam = state.aiRecommendation.suggestedTeam.map(p => ({ name: p.name, user_id: p.id }));
                                            setTeams(prev => [
                                                prev[0], // Keep admin team as is
                                                { name: 'AI Opponents', short: 'AIO', players: recTeam }
                                            ]);
                                            setState(prev => ({
                                                ...prev,
                                                phase: 'toss',
                                                inningsNum: 1, runs: 0, wickets: 0, ballInOver: 0, overNum: 0, totalBalls: 0,
                                                striker: null, nonStriker: null, currentBowlerIdx: null,
                                                currentOverBalls: [], overHistory: [], log: [],
                                                history: [], batters: [], bowlers: [], target: null,
                                                tossWinner: null, battingTeam: null, bowlingTeam: null, bbChoice: null,
                                                aiRecommendation: null
                                            }));
                                            toast.success("AI Squad imported! Good luck!");
                                        }}
                                        className="w-full py-3 bg-emerald-500 text-emerald-950 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-400 transition-colors shadow-lg"
                                    >
                                        Import Squad for Next Game
                                    </button>
                                </div>
                            )}

                            {/* Option 2: Same Teams, but different members */}
                            <button
                                onClick={() => {
                                    updateState({ phase: 'match_setup' });
                                    setSetupState(s => ({ ...s, step: 1 })); // Jump to custom squad setup
                                    toast.info("Updating Squads...");
                                }}
                                className="w-full p-6 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-between hover:bg-white/10 active:scale-95 transition-all"
                            >
                                <div className="flex items-center gap-4 text-left">
                                    <Users className="text-emerald-400" />
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-tight">Same Teams, New Members</p>
                                        <p className="text-[9px] text-white/20 uppercase">Edit squad before playing</p>
                                    </div>
                                </div>
                            </button>

                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => updateState({ phase: 'summary' })} className="py-5 bg-white/5 border border-white/10 rounded-2xl font-black uppercase tracking-widest text-[10px]">Scorecard</button>
                                <button onClick={() => { updateCareerStats(); navigate('/admin/operations'); }} className="py-5 bg-white/10 border border-white/20 rounded-2xl font-black uppercase tracking-widest text-[10px]">All Done</button>
                            </div>
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
                                            <div className="flex-1">
                                                <p className="text-sm font-black uppercase tracking-tight">{b.name}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <p className="text-[10px] font-bold text-white/30 truncate">{b.out ? 'Out' : (b.batting ? 'Not Out*' : 'DNB')}</p>
                                                    <span className="text-[9px] font-bold text-blue-400">4s: {b.fours || 0}</span>
                                                    <span className="text-[9px] font-bold text-orange-400">6s: {b.sixes || 0}</span>
                                                </div>
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
                                                <p className="text-sm font-black">{Math.floor(bw.balls / 6)}.{bw.balls % 6}-{bw.r}-{bw.w}</p>
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
