import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { useMatchFlow } from '../context/MatchFlowContext';
import apiClient from '../api/client';
import io from 'socket.io-client';
import { 
  Undo2, RefreshCw, AlertTriangle, Swords, Target, 
  TrendingUp, Play, Award, HelpCircle, CheckCircle, ChevronRight, X 
} from 'lucide-react';
import { toast } from 'react-toastify';

const SOCKET_URL = process.env.NODE_ENV === 'production'
  ? 'https://the-tuurf-ufkd.onrender.com'
  : 'http://localhost:5001';

/* ─── Premium Glassmorphism styling tokens ─── */
const styles = {
  glass: 'bg-white/5 border border-white/10 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-6 relative overflow-hidden',
  glassCard: 'bg-white/3 border border-white/5 backdrop-blur-md rounded-2xl p-4 transition-all hover:bg-white/6',
  buttonGlass: 'bg-white/5 hover:bg-white/10 active:scale-95 text-slate-200 border border-white/10 rounded-2xl transition-all flex flex-col items-center justify-center',
};

/* ─── Ball bubble helper ─── */
const BallBubble = ({ val }) => {
  let bg = 'bg-white/5 text-slate-400';
  let border = 'border-white/10';
  if (val === 'W') { bg = 'bg-rose-500/20 text-rose-400'; border = 'border-rose-500/30'; }
  else if (val === '6' || val === 6) { bg = 'bg-emerald-500/30 text-emerald-300'; border = 'border-emerald-500/40'; }
  else if (val === '4' || val === 4) { bg = 'bg-emerald-500/15 text-emerald-400'; border = 'border-emerald-500/20'; }
  else if (val === '0' || val === 0) { bg = 'bg-white/3 text-slate-600'; }
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs border ${bg} ${border} shadow-inner`}>
      {val}
    </div>
  );
};

export default function ScoringDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { updateMatch } = useMatchFlow();

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  // Scoring State
  const [runs, setRuns] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [overNum, setOverNum] = useState(0);
  const [ballInOver, setBallInOver] = useState(0);
  const [totalBalls, setTotalBalls] = useState(0);
  const [inningsNum, setInningsNum] = useState(1);
  const [target, setTarget] = useState(null);
  const [matchStatus, setMatchStatus] = useState('In Progress');
  const [battingSide, setBattingSide] = useState('A'); // 'A' | 'B'

  // Players indices and stats
  const [batters, setBatters] = useState([]);
  const [bowlers, setBowlers] = useState([]);
  const [strikerIdx, setStrikerIdx] = useState(0);
  const [nonStrikerIdx, setNonStrikerIdx] = useState(1);
  const [currentBowlerIdx, setCurrentBowlerIdx] = useState(0);

  // Timeline and logs
  const [currentOverBalls, setCurrentOverBalls] = useState([]);
  const [overHistory, setOverHistory] = useState([]);
  const [partnership, setPartnership] = useState({ runs: 0, balls: 0 });

  // Innings 1 cached stats (for second innings)
  const [inn1Batters, setInn1Batters] = useState([]);
  const [inn1Bowlers, setInn1Bowlers] = useState([]);
  const [inn1Score, setInn1Score] = useState(0);
  const [inn1Wickets, setInn1Wickets] = useState(0);
  const [inn1Overs, setInn1Overs] = useState(0);

  // Modals & Panels State
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showNextBowlerModal, setShowNextBowlerModal] = useState(false);
  const [showNewBatsmanModal, setShowNewBatsmanModal] = useState(false);
  const [showInningsBreakModal, setShowInningsBreakModal] = useState(false);
  const [showMatchCompleteModal, setShowMatchCompleteModal] = useState(false);

  // Temporary selectors
  const [selectedWicketType, setSelectedWicketType] = useState('Bowled');
  const [selectedFielder, setSelectedFielder] = useState('');
  const [runoutOutType, setRunoutOutType] = useState('striker'); // striker | nonStriker
  const [nextBowlerId, setNextBowlerId] = useState('');
  const [nextBatsmanId, setNextBatsmanId] = useState('');

  // Complete Match variables
  const [manOfTheMatch, setManOfTheMatch] = useState('');

  const socketRef = useRef(null);

  // Team names
  const teamAName = match?.team_a?.team_id?.name || match?.quick_teams?.team_a?.name || 'Team A';
  const teamBName = match?.team_b?.team_id?.name || match?.quick_teams?.team_b?.name || 'Team B';
  const battingTeamName = battingSide === 'A' ? teamAName : teamBName;
  const bowlingTeamName = battingSide === 'A' ? teamBName : teamAName;

  const teamAPlayers = (match?.quick_teams?.team_a?.players || match?.team_a?.players || match?.team_a?.squad || []).map(p => ({
    ...p,
    id: p.id || p._id,
    name: p.display_name || p.name || p.input || 'Player'
  }));
  const teamBPlayers = (match?.quick_teams?.team_b?.players || match?.team_b?.players || match?.team_b?.squad || []).map(p => ({
    ...p,
    id: p.id || p._id,
    name: p.display_name || p.name || p.input || 'Player'
  }));
  
  const battingSquad = battingSide === 'A' ? teamAPlayers : teamBPlayers;
  const bowlingSquad = battingSide === 'A' ? teamBPlayers : teamAPlayers;

  const isScorer = user && (user.role === 'admin' || user.role === 'worker');

  // Load Match State on Mount
  const loadMatch = async () => {
    try {
      const res = await apiClient.get(`/matches/${id}`);
      if (res.data.success && res.data.match) {
        const m = res.data.match;
        setMatch(m);
        
        if (m.live_data && Object.keys(m.live_data).length > 0) {
          const ld = m.live_data;
          setRuns(ld.runs ?? 0);
          setWickets(ld.wickets ?? 0);
          setOverNum(ld.overNum ?? 0);
          setBallInOver(ld.ballInOver ?? 0);
          setTotalBalls(ld.totalBalls ?? 0);
          setInningsNum(ld.inningsNum ?? 1);
          setTarget(ld.target ?? null);

          // Parse indices robustly to handle numbers, legacy indices, and name-based matching
          const parseIndex = (val, idxField, defaultIdx, battersList, objVal) => {
            if (idxField !== undefined && idxField !== null) return parseInt(idxField);
            if (typeof val === 'number') return val;
            if (typeof val === 'string' && !isNaN(val)) return parseInt(val);
            if (val && typeof val === 'object' && val.name && battersList) {
              const idx = battersList.findIndex(b => b.name === val.name);
              if (idx !== -1) return idx;
            }
            if (objVal && typeof objVal === 'object' && objVal.name && battersList) {
              const idx = battersList.findIndex(b => b.name === objVal.name);
              if (idx !== -1) return idx;
            }
            return defaultIdx;
          };

          const sIndex = parseIndex(ld.striker, ld.striker_idx, 0, ld.batters);
          const nsIndex = parseIndex(ld.nonStriker, ld.non_striker_idx, 1, ld.batters, ld.non_striker);

          setStrikerIdx(sIndex);
          setNonStrikerIdx(nsIndex);
          setCurrentBowlerIdx(ld.currentBowlerIdx ?? 0);
          setBatters(ld.batters || []);
          setBowlers(ld.bowlers || []);
          setCurrentOverBalls(ld.currentOverBalls || []);
          setOverHistory(ld.overHistory || []);
          setPartnership(ld.partnership || { runs: 0, balls: 0 });
          setMatchStatus(m.status || 'In Progress');

          // Innings 1 details
          setInn1Batters(ld.inn1Batters || []);
          setInn1Bowlers(ld.inn1Bowlers || []);
          setInn1Score(ld.inn1Score || 0);
          setInn1Wickets(ld.inn1Wickets || 0);
          setInn1Overs(ld.inn1Overs || 0);
        }
        if (m) {
          setBattingSide(m.live_data?.batting_team || m.live_active_team || 'A');
        }
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to load match:', err);
      toast.error('Failed to load match details.');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatch();

    // Setup Socket
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_match', String(id));
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);

  // Synchronize Live State with Server
  const syncLiveState = async (updates) => {
    try {
      const matchIdToUse = id || match?._id;
      const response = await apiClient.post(`/matches/${matchIdToUse}/live-update`, updates);
      if (response.data.success) {
        console.log('Match state synchronized successfully.');
      }
    } catch (err) {
      console.error('Error synchronizing match state:', err);
      toast.error('Sync issue: State not saved to server.');
    }
  };

  // Record a standard scoring delivery
  const handleScoreRuns = (runsOffBat, extraType = null, extraRuns = 0) => {
    if (submittingCheck()) return;

    const runsThisBall = runsOffBat + extraRuns;
    const isWide = extraType === 'wd';
    const isNoBall = extraType === 'nb';
    const isLegal = !isWide && !isNoBall;

    const newRuns = runs + runsThisBall;
    const newTotalBalls = totalBalls + 1;

    let newBallInOver = ballInOver;
    let newOverNum = overNum;
    if (isLegal) {
      newBallInOver = ballInOver + 1;
      if (newBallInOver === 6) {
        newOverNum = overNum + 1;
        newBallInOver = 0;
      }
    }

    // Update active striker stats
    const updatedBatters = [...batters];
    if (updatedBatters[strikerIdx]) {
      updatedBatters[strikerIdx].r += runsOffBat;
      if (isLegal || isNoBall) {
        updatedBatters[strikerIdx].b += 1;
      }
      if (runsOffBat === 4) updatedBatters[strikerIdx].fours = (updatedBatters[strikerIdx].fours || 0) + 1;
      if (runsOffBat === 6) updatedBatters[strikerIdx].sixes = (updatedBatters[strikerIdx].sixes || 0) + 1;
    }

    // Update active bowler stats
    const updatedBowlers = [...bowlers];
    if (updatedBowlers[currentBowlerIdx]) {
      if (isLegal) {
        updatedBowlers[currentBowlerIdx].balls += 1;
      }
      // Wides & no-balls runs go to bowler, byes/leg-byes do not
      const bowlerRuns = runsOffBat + (isWide || isNoBall ? extraRuns : 0);
      updatedBowlers[currentBowlerIdx].r += bowlerRuns;
    }

    // Update over balls timeline
    let ballLabel = String(runsOffBat);
    if (isWide) ballLabel = extraRuns > 1 ? `Wd+${extraRuns - 1}` : 'Wd';
    if (isNoBall) ballLabel = runsOffBat > 0 ? `Nb+${runsOffBat}` : 'Nb';
    const newCurrentOverBalls = [...currentOverBalls, ballLabel];

    // Update partnership
    const newPartnership = {
      runs: partnership.runs + runsThisBall,
      balls: partnership.balls + (isLegal ? 1 : 0),
    };

    // Striker Swapping Logic
    let newStrikerIdx = strikerIdx;
    let newNonStrikerIdx = nonStrikerIdx;
    
    // Check runs to swap strike (runs off bat, or running runs on wide/nb)
    const runsToSwap = runsOffBat || (isWide || isNoBall ? extraRuns - 1 : 0);
    if (runsToSwap % 2 !== 0) {
      newStrikerIdx = nonStrikerIdx;
      newNonStrikerIdx = strikerIdx;
    }

    // Over Completion Logic
    const overCompleted = isLegal && newBallInOver === 0;
    let newOverHistory = [...overHistory];
    let nextOverBalls = newCurrentOverBalls;

    if (overCompleted) {
      // Swap strike for new over
      const temp = newStrikerIdx;
      newStrikerIdx = newNonStrikerIdx;
      newNonStrikerIdx = temp;

      newOverHistory.push(newCurrentOverBalls);
      nextOverBalls = [];
    }

    // Build Server Update Payload
    const lastBallData = {
      runs: runsThisBall,
      isWicket: false,
      extra: extraType,
      batsmanId: batters[strikerIdx]?.id || batters[strikerIdx]?.user_id || null,
      bowlerId: bowlers[currentBowlerIdx]?.id || bowlers[currentBowlerIdx]?.user_id || null,
    };

    // Check if target is chased
    const targetChased = target && newRuns >= target;
    const isCompleted = targetChased || (inningsNum === 2 && newOverNum >= match.overs) || (inningsNum === 2 && wickets >= 10);

    const payload = {
      runs: newRuns,
      wickets: wickets,
      overNum: newOverNum,
      ballInOver: newBallInOver,
      totalBalls: newTotalBalls,
      inningsNum,
      target,
      batting_team: battingSide,
      striker: newStrikerIdx,
      nonStriker: newNonStrikerIdx,
      striker_idx: newStrikerIdx,
      non_striker_idx: newNonStrikerIdx,
      striker_name: updatedBatters[newStrikerIdx]?.name || null,
      currentBowlerIdx,
      batters: updatedBatters,
      bowlers: updatedBowlers,
      currentOverBalls: nextOverBalls,
      overHistory: newOverHistory,
      partnership: newPartnership,
      lastBallData,
      status: isCompleted ? 'Completed' : 'In Progress',
    };

    if (inningsNum === 2) {
      payload.inn1Batters = inn1Batters;
      payload.inn1Bowlers = inn1Bowlers;
      payload.inn1Score = inn1Score;
      payload.inn1Wickets = inn1Wickets;
      payload.inn1Overs = inn1Overs;
    }

    // Apply local state
    setRuns(newRuns);
    setTotalBalls(newTotalBalls);
    setOverNum(newOverNum);
    setBallInOver(newBallInOver);
    setBatters(updatedBatters);
    setBowlers(updatedBowlers);
    setCurrentOverBalls(nextOverBalls);
    setOverHistory(newOverHistory);
    setPartnership(newPartnership);
    setStrikerIdx(newStrikerIdx);
    setNonStrikerIdx(newNonStrikerIdx);

    syncLiveState(payload);

    if (isCompleted) {
      handleCompleteInningsFlow();
    } else if (overCompleted) {
      setShowNextBowlerModal(true);
    }
  };

  // Wicket dismissal handler
  const handleWicketDismissal = () => {
    if (submittingCheck()) return;
    
    const isLegal = selectedWicketType !== 'Run Out' || (selectedWicketType === 'Run Out' && !currentOverBalls.includes('Wd') && !currentOverBalls.includes('Nb'));
    
    const newWickets = wickets + 1;
    const newTotalBalls = totalBalls + 1;

    let newBallInOver = ballInOver;
    let newOverNum = overNum;
    if (isLegal) {
      newBallInOver = ballInOver + 1;
      if (newBallInOver === 6) {
        newOverNum = overNum + 1;
        newBallInOver = 0;
      }
    }

    // Update active striker / non-striker out state
    const updatedBatters = [...batters];
    let dismissedIdx = strikerIdx;
    
    if (selectedWicketType === 'Run Out' && runoutOutType === 'nonStriker') {
      dismissedIdx = nonStrikerIdx;
    }

    if (updatedBatters[dismissedIdx]) {
      updatedBatters[dismissedIdx].out = true;
      updatedBatters[dismissedIdx].batting = false;
      
      let dismissalText = selectedWicketType;
      if (selectedWicketType === 'Caught' && selectedFielder) {
        dismissalText = `c ${selectedFielder} b ${bowlers[currentBowlerIdx]?.name}`;
      } else if (selectedWicketType === 'Stumped' && selectedFielder) {
        dismissalText = `st ${selectedFielder} b ${bowlers[currentBowlerIdx]?.name}`;
      } else if (selectedWicketType === 'Run Out') {
        dismissalText = `run out (${selectedFielder || 'Fielder'})`;
      } else {
        dismissalText = `${selectedWicketType} b ${bowlers[currentBowlerIdx]?.name}`;
      }
      updatedBatters[dismissedIdx].dismissal = dismissalText;
      if (isLegal) {
        updatedBatters[dismissedIdx].b += 1;
      }
    }

    // Update active bowler wickets
    const updatedBowlers = [...bowlers];
    if (updatedBowlers[currentBowlerIdx]) {
      if (isLegal) updatedBowlers[currentBowlerIdx].balls += 1;
      if (selectedWicketType !== 'Run Out' && selectedWicketType !== 'Retired Out') {
        updatedBowlers[currentBowlerIdx].w += 1;
      }
    }

    // Over timeline
    const newCurrentOverBalls = [...currentOverBalls, 'W'];
    const overCompleted = isLegal && newBallInOver === 0;
    let newOverHistory = [...overHistory];
    let nextOverBalls = newCurrentOverBalls;

    if (overCompleted) {
      newOverHistory.push(newCurrentOverBalls);
      nextOverBalls = [];
    }

    const lastBallData = {
      runs: 0,
      isWicket: true,
      extra: null,
      batsmanId: batters[dismissedIdx]?.id || batters[dismissedIdx]?.user_id || null,
      bowlerId: bowlers[currentBowlerIdx]?.id || bowlers[currentBowlerIdx]?.user_id || null,
      wicketType: selectedWicketType,
      fielderId: selectedFielder || null,
    };

    const newPartnership = { runs: 0, balls: 0 }; // reset partnership on wicket

    // Innings completion conditions
    const inningsAllOut = newWickets >= 10 || (battingSquad.length > 0 && newWickets >= battingSquad.length - 1);
    const targetDefended = inningsNum === 2 && newOverNum >= match.overs;
    const isCompleted = inningsAllOut || targetDefended;

    const payload = {
      runs,
      wickets: newWickets,
      overNum: newOverNum,
      ballInOver: newBallInOver,
      totalBalls: newTotalBalls,
      inningsNum,
      target,
      batting_team: battingSide,
      striker: strikerIdx,
      nonStriker: nonStrikerIdx,
      striker_idx: strikerIdx,
      non_striker_idx: nonStrikerIdx,
      striker_name: updatedBatters[dismissedIdx === strikerIdx ? nonStrikerIdx : strikerIdx]?.name || null,
      currentBowlerIdx,
      batters: updatedBatters,
      bowlers: updatedBowlers,
      currentOverBalls: nextOverBalls,
      overHistory: newOverHistory,
      partnership: newPartnership,
      lastBallData,
      status: isCompleted ? 'Completed' : 'In Progress',
    };

    if (inningsNum === 2) {
      payload.inn1Batters = inn1Batters;
      payload.inn1Bowlers = inn1Bowlers;
      payload.inn1Score = inn1Score;
      payload.inn1Wickets = inn1Wickets;
      payload.inn1Overs = inn1Overs;
    }

    setWickets(newWickets);
    setTotalBalls(newTotalBalls);
    setOverNum(newOverNum);
    setBallInOver(newBallInOver);
    setBatters(updatedBatters);
    setBowlers(updatedBowlers);
    setCurrentOverBalls(nextOverBalls);
    setOverHistory(newOverHistory);
    setPartnership(newPartnership);

    syncLiveState(payload);

    setShowWicketModal(false);

    if (isCompleted) {
      handleCompleteInningsFlow();
    } else {
      // Prompt for new batsman
      setShowNewBatsmanModal(true);
    }
  };

  // Complete Inning transitions
  const handleCompleteInningsFlow = () => {
    if (inningsNum === 1) {
      setShowInningsBreakModal(true);
    } else {
      setShowMatchCompleteModal(true);
    }
  };

  // Start Second Innings Setup
  const handleStartSecondInnings = async () => {
    if (!nextBatsmanId || !nextBowlerId) {
      toast.warning('Please select striker, non-striker, and bowler.');
      return;
    }

    const nextStrikerName = bowlingSquad.find(p => p.id === nextBatsmanId || p._id === nextBatsmanId)?.name;
    const nextNonStrikerName = bowlingSquad.find(p => p.id !== nextBatsmanId && p._id !== nextBatsmanId)?.name || 'Batter 2';
    const nextBowlerName = battingSquad.find(p => p.id === nextBowlerId || p._id === nextBowlerId)?.name;

    const initialBatters = [
      { id: nextBatsmanId, name: nextStrikerName, r: 0, b: 0, batting: true, out: false },
      { id: 'ns-2', name: nextNonStrikerName, r: 0, b: 0, batting: false, out: false }
    ];

    const initialBowlers = [
      { id: nextBowlerId, name: nextBowlerName, balls: 0, r: 0, w: 0, bowling: true }
    ];

    const nextBattingSide = battingSide === 'A' ? 'B' : 'A';

    const payload = {
      status: 'In Progress',
      runs: 0,
      wickets: 0,
      overNum: 0,
      ballInOver: 0,
      totalBalls: 0,
      inningsNum: 2,
      target: runs + 1,
      batting_team: nextBattingSide,
      striker: 0,
      nonStriker: 1,
      currentBowlerIdx: 0,
      batters: initialBatters,
      bowlers: initialBowlers,
      currentOverBalls: [],
      overHistory: [],
      partnership: { runs: 0, balls: 0 },

      // Cache Innings 1
      inn1Batters: batters,
      inn1Bowlers: bowlers,
      inn1Score: runs,
      inn1Wickets: wickets,
      inn1Overs: `${overNum}.${ballInOver}`,
    };

    setInn1Batters(batters);
    setInn1Bowlers(bowlers);
    setInn1Score(runs);
    setInn1Wickets(wickets);
    setInn1Overs(`${overNum}.${ballInOver}`);

    setRuns(0);
    setWickets(0);
    setOverNum(0);
    setBallInOver(0);
    setTotalBalls(0);
    setInningsNum(2);
    setTarget(runs + 1);
    setBattingSide(nextBattingSide);
    setStrikerIdx(0);
    setNonStrikerIdx(1);
    setCurrentBowlerIdx(0);
    setBatters(initialBatters);
    setBowlers(initialBowlers);
    setCurrentOverBalls([]);
    setOverHistory([]);
    setPartnership({ runs: 0, balls: 0 });

    setShowInningsBreakModal(false);
    toast.success('Innings 2 is now LIVE!');

    syncLiveState(payload);
  };

  // Complete Match POST
  const handleFinishMatch = async () => {
    try {
      const matchIdToUse = id || match?._id;
      
      const winnerSide = runs > (target - 1) ? battingSide : (battingSide === 'A' ? 'B' : 'A');
      const winnerTeamId = winnerSide === 'A' ? match?.team_a?.team_id?._id : match?.team_b?.team_id?._id;

      const marginValue = runs > (target - 1)
        ? (10 - wickets) // chased by wickets
        : (target - 1 - runs); // defended by runs

      const marginType = runs > (target - 1) ? 'Wickets' : 'Runs';

      const payload = {
        winner: winnerTeamId,
        won_by: marginType,
        margin: marginValue,
        man_of_the_match: manOfTheMatch || null
      };

      await apiClient.post(`/matches/${matchIdToUse}/complete`, payload);
      toast.success('Match completed! Carrier statistics synced.');
      navigate(`/match/summary/${matchIdToUse}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to complete match.');
    }
  };

  // Select next bowler at over complete
  const handleSelectBowler = (bowlerId) => {
    const bObj = bowlingSquad.find(p => p.id === bowlerId || p._id === bowlerId);
    if (!bObj) return;

    const updatedBowlers = [...bowlers];
    let idx = updatedBowlers.findIndex(b => b.id === bowlerId);
    
    if (idx === -1) {
      updatedBowlers.push({
        id: bowlerId,
        name: bObj.name,
        balls: 0,
        r: 0,
        w: 0,
        bowling: true
      });
      idx = updatedBowlers.length - 1;
    }

    setCurrentBowlerIdx(idx);
    setBowlers(updatedBowlers);
    setShowNextBowlerModal(false);

    // Sync to backend
    const payload = {
      runs,
      wickets,
      overNum,
      ballInOver,
      totalBalls,
      inningsNum,
      target,
      striker: strikerIdx,
      nonStriker: nonStrikerIdx,
      striker_idx: strikerIdx,
      non_striker_idx: nonStrikerIdx,
      currentBowlerIdx: idx,
      batters,
      bowlers: updatedBowlers,
      currentOverBalls,
      overHistory,
      partnership,
    };
    syncLiveState(payload);
  };

  // Select next batsman on wicket
  const handleSelectNewBatsman = (batterId) => {
    const pObj = battingSquad.find(p => p.id === batterId || p._id === batterId);
    if (!pObj) return;

    const updatedBatters = [...batters];
    updatedBatters.push({
      id: batterId,
      name: pObj.name,
      r: 0,
      b: 0,
      batting: true,
      out: false
    });

    const newIdx = updatedBatters.length - 1;
    let newStrikerIdx = strikerIdx;
    let newNonStrikerIdx = nonStrikerIdx;

    if (selectedWicketType === 'Run Out' && runoutOutType === 'nonStriker') {
      newNonStrikerIdx = newIdx;
    } else {
      newStrikerIdx = newIdx;
    }

    setBatters(updatedBatters);
    setStrikerIdx(newStrikerIdx);
    setNonStrikerIdx(newNonStrikerIdx);
    setShowNewBatsmanModal(false);

    // Sync to backend
    const payload = {
      runs,
      wickets,
      overNum,
      ballInOver,
      totalBalls,
      inningsNum,
      target,
      striker: newStrikerIdx,
      nonStriker: newNonStrikerIdx,
      currentBowlerIdx,
      batters: updatedBatters,
      bowlers,
      currentOverBalls,
      overHistory,
      partnership,
    };
    syncLiveState(payload);
  };

  // Undo Last Ball
  const handleUndoBall = async () => {
    if (submittingCheck()) return;
    try {
      const matchIdToUse = id || match?._id;
      const res = await apiClient.post(`/matches/${matchIdToUse}/undo-ball`);
      if (res.data.success) {
        toast.info('Undid last delivery.');
        loadMatch();
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not undo last delivery.');
    }
  };

  // Manual swap strike button
  const handleManualSwap = () => {
    const temp = strikerIdx;
    setStrikerIdx(nonStrikerIdx);
    setNonStrikerIdx(temp);

    const payload = {
      runs,
      wickets,
      overNum,
      ballInOver,
      totalBalls,
      inningsNum,
      target,
      striker: nonStrikerIdx,
      nonStriker: strikerIdx,
      currentBowlerIdx,
      batters,
      bowlers,
      currentOverBalls,
      overHistory,
      partnership,
    };
    syncLiveState(payload);
  };

  const submittingCheck = () => {
    if (matchStatus === 'Completed') {
      toast.warning('Match is completed.');
      return true;
    }
    return false;
  };

  if (loading) {
    return (
      <div className="bg-[#020C07] min-h-screen text-slate-100 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Opening live scorer panel...</p>
      </div>
    );
  }

  const crr = totalBalls > 0 ? (runs / (totalBalls / 6)).toFixed(2) : '0.00';
  const remainingOvers = match?.overs ? match.overs - overNum : 20;

  // Filter remaining batters who have not batted yet
  const activeIds = batters.map(b => b.id || b.user_id);
  const remainingBatters = battingSquad.filter(p => !activeIds.includes(p.id) && !activeIds.includes(p._id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020C07] via-[#071A0F] to-[#020C07] text-slate-200 font-sans pb-24">
      {/* Visual Ambient Glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] height-[500px] rounded-full bg-radial-gradient from-emerald-500/5 to-transparent pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] height-[500px] rounded-full bg-radial-gradient from-indigo-500/4 to-transparent pointer-events-none" />

      {/* Scorer Panel Navbar */}
      <header className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(`/dashboard`)}
            className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <Undo2 size={16} className="rotate-90" />
          </button>
          <div>
            <h1 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              🏟️ scorer dashboard
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                {connected ? 'Live Feed Active' : 'Offline Mode'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleManualSwap}
            className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-emerald-400"
            title="Swap Strike"
          >
            <RefreshCw size={14} />
          </button>
          <button 
            onClick={handleUndoBall}
            className="px-4 py-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 font-black rounded-xl text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-rose-500/20"
          >
            <Undo2 size={12} /> Undo
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 mt-6 space-y-6">

        {/* ── Match Scoreboard Header ── */}
        <div className={`${styles.glass} relative`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[40px] pointer-events-none" />
          
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full uppercase tracking-widest">
              Innings {inningsNum}
            </span>
            {target && (
              <span className="text-xs font-black text-indigo-400 uppercase tracking-wider">
                Target: {target}
              </span>
            )}
          </div>

          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{battingTeamName}</h2>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black text-white tracking-tighter">{runs}</span>
                <span className="text-3xl font-black text-emerald-500">/{wickets}</span>
                <span className="text-sm font-bold text-slate-400 ml-2">({overNum}.{ballInOver} / {match?.overs || 20} Ov)</span>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="bg-black/30 border border-white/5 rounded-2xl px-4 py-2 text-center">
                <span className="block text-[8px] font-black text-slate-500 uppercase tracking-wider">CRR</span>
                <span className="text-base font-black text-white font-mono">{crr}</span>
              </div>
              {inningsNum === 2 && target && (
                <div className="bg-indigo-950/20 border border-indigo-500/15 rounded-2xl px-4 py-2 text-center">
                  <span className="block text-[8px] font-black text-indigo-400 uppercase tracking-wider">Runs Req</span>
                  <span className="text-base font-black text-indigo-300 font-mono">
                    {Math.max(0, target - runs)} off {Math.max(0, (match?.overs * 6) - totalBalls)} balls
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Active Batters and Bowler Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Batters */}
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-5">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Swords size={12} className="text-emerald-400" /> Batsmen
            </h3>

            <div className="space-y-3">
              {/* Striker */}
              <div className={`p-3 rounded-2xl border transition-all ${strikerIdx === 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-black/20 border-white/5'}`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full bg-emerald-500 ${strikerIdx === 0 && 'animate-pulse'}`} />
                    <span className="text-xs font-black text-white">{batters[strikerIdx]?.name || 'Striker'}</span>
                  </div>
                  <span className="text-sm font-black text-white font-mono">
                    {batters[strikerIdx]?.r ?? 0} <span className="text-slate-500 font-bold">({batters[strikerIdx]?.b ?? 0})</span>
                  </span>
                </div>
              </div>

              {/* Non-Striker */}
              <div className={`p-3 rounded-2xl border transition-all ${strikerIdx === 1 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-black/20 border-white/5'}`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full bg-slate-600`} />
                    <span className="text-xs font-black text-slate-300">{batters[nonStrikerIdx]?.name || 'Non-Striker'}</span>
                  </div>
                  <span className="text-sm font-black text-slate-300 font-mono">
                    {batters[nonStrikerIdx]?.r ?? 0} <span className="text-slate-600 font-bold">({batters[nonStrikerIdx]?.b ?? 0})</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bowler */}
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Target size={12} className="text-indigo-400" /> Current Bowler
              </h3>
              <div className="p-3 bg-black/20 border border-white/5 rounded-2xl">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-white">{bowlers[currentBowlerIdx]?.name || 'Bowler'}</span>
                  <div className="text-right">
                    <span className="text-sm font-black text-white font-mono">
                      {bowlers[currentBowlerIdx]?.w ?? 0} - {bowlers[currentBowlerIdx]?.r ?? 0}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 block">
                      Overs: {bowlers[currentBowlerIdx]?.balls ? `${Math.floor(bowlers[currentBowlerIdx].balls / 6)}.${bowlers[currentBowlerIdx].balls % 6}` : '0.0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-2 flex items-center justify-between">
              <span>Partnership: <span className="text-emerald-400 font-black">{partnership.runs} ({partnership.balls}b)</span></span>
            </div>
          </div>

        </div>

        {/* ── Live Ball Timeline ── */}
        <div className="bg-white/3 border border-white/5 p-4 rounded-3xl flex items-center justify-between gap-4">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex-shrink-0">This Over</span>
          <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none flex-1">
            {currentOverBalls.length > 0 ? (
              currentOverBalls.map((ball, i) => <BallBubble key={i} val={ball} />)
            ) : (
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Waiting for delivery...</span>
            )}
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
        </div>

        {/* ── Ball Scoring Buttons Panel ── */}
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 shadow-2xl space-y-6">
          
          {/* Runs Section */}
          <div>
            <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3">Record Runs</h4>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
              {[0, 1, 2, 3, 4, 5, 6].map(r => (
                <button
                  key={r}
                  onClick={() => handleScoreRuns(r)}
                  className={`py-4 text-xl font-black rounded-2xl active:scale-95 transition-all shadow-lg ${
                    r === 4 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                    r === 6 ? 'bg-emerald-500/40 text-emerald-300 border border-emerald-500/50 shadow-emerald-500/10' :
                    'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Extras Section */}
          <div>
            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">Record Extras</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button 
                onClick={() => handleScoreRuns(0, 'wd', 1)}
                className="py-3 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-black rounded-xl active:scale-95 transition-all"
              >
                Wide (+1)
              </button>
              <button 
                onClick={() => handleScoreRuns(0, 'nb', 1)}
                className="py-3 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-black rounded-xl active:scale-95 transition-all"
              >
                No Ball (+1)
              </button>
              
              {/* WD + Runs dropdown */}
              <div className="relative group">
                <select 
                  onChange={e => {
                    const extraR = parseInt(e.target.value);
                    if (extraR > 0) handleScoreRuns(0, 'wd', 1 + extraR);
                    e.target.value = '';
                  }}
                  className="w-full py-3 bg-black/40 border border-white/10 hover:border-white/20 text-slate-300 text-xs font-black rounded-xl active:scale-95 transition-all outline-none appearance-none text-center cursor-pointer"
                >
                  <option value="">Wd + Runs</option>
                  {[1, 2, 3, 4, 5, 6].map(runs => (
                    <option key={runs} value={runs} className="bg-slate-950">+ {runs} Runs</option>
                  ))}
                </select>
              </div>

              {/* NB + Runs dropdown */}
              <div className="relative group">
                <select 
                  onChange={e => {
                    const extraR = parseInt(e.target.value);
                    if (extraR > 0) handleScoreRuns(extraR, 'nb', 1);
                    e.target.value = '';
                  }}
                  className="w-full py-3 bg-black/40 border border-white/10 hover:border-white/20 text-slate-300 text-xs font-black rounded-xl active:scale-95 transition-all outline-none appearance-none text-center cursor-pointer"
                >
                  <option value="">Nb + Runs</option>
                  {[1, 2, 3, 4, 5, 6].map(runs => (
                    <option key={runs} value={runs} className="bg-slate-950">+ {runs} Batter Runs</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Wickets Section */}
          <div>
            <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-3 font-bold">Wickets Protocol</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button 
                onClick={() => {
                  setSelectedWicketType('Bowled');
                  setShowWicketModal(true);
                }}
                className="py-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-rose-500/20 active:scale-95 transition-all"
              >
                wicket
              </button>
              <button 
                onClick={() => {
                  setSelectedWicketType('Caught');
                  setShowWicketModal(true);
                }}
                className="py-3.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-rose-500/25 active:scale-95 transition-all"
              >
                catch out
              </button>
              <button 
                onClick={() => {
                  setSelectedWicketType('Stumped');
                  setShowWicketModal(true);
                }}
                className="py-3.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-rose-500/25 active:scale-95 transition-all"
              >
                stumped
              </button>
              <button 
                onClick={() => {
                  setSelectedWicketType('Run Out');
                  setShowWicketModal(true);
                }}
                className="py-3.5 bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-rose-500/35 active:scale-95 transition-all shadow-[0_0_15px_rgba(244,63,94,0.15)]"
              >
                run out
              </button>
            </div>
          </div>

        </div>

        {/* ── Innings break & completion trigger buttons ── */}
        <div className="flex gap-4">
          <button 
            onClick={handleCompleteInningsFlow}
            className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10"
          >
            Declaration / End Innings
          </button>
        </div>

        {/* ── Wagon Wheel & Analytics Placeholders ── */}
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 shadow-2xl space-y-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <TrendingUp size={14} className="text-emerald-400" /> Wagon Wheel & Live Analytics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Wagon Wheel mock */}
            <div className="bg-black/30 border border-white/5 rounded-3xl p-5 flex flex-col items-center justify-center min-h-[220px]">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Wagon Wheel</span>
              <div className="w-36 h-36 rounded-full border border-emerald-500/20 relative flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-white/5 scale-75" />
                <div className="absolute inset-0 rounded-full border border-white/5 scale-50" />
                <div className="absolute w-px h-full bg-white/5" />
                <div className="absolute h-px w-full bg-white/5" />
                <div className="absolute w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
                
                {/* SVG mock wheel lines */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                  <line x1="50" y1="50" x2="20" y2="25" stroke="#10b981" strokeWidth="1.5" strokeDasharray="1,1" />
                  <line x1="50" y1="50" x2="80" y2="35" stroke="#10b981" strokeWidth="1" />
                  <line x1="50" y1="50" x2="35" y2="75" stroke="#6366f1" strokeWidth="1" />
                  <circle cx="20" cy="25" r="2" fill="#10b981" />
                  <circle cx="80" cy="35" r="2" fill="#10b981" />
                  <circle cx="35" cy="75" r="2" fill="#6366f1" />
                </svg>
              </div>
              <span className="text-[8px] font-black text-emerald-400 uppercase tracking-wider mt-4">Off-side: 65% | On-side: 35%</span>
            </div>

            {/* Manhattan Chart - real overHistory data */}
            <div className="bg-black/30 border border-white/5 rounded-3xl p-5 flex flex-col justify-between min-h-[220px]">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center mb-4">Manhattan Chart (Runs Per Over)</span>
              {(() => {
                const overRunData = overHistory.map(overBalls =>
                  overBalls.reduce((sum, b) => {
                    if (!b || b === 'W' || b === '\u00b7') return sum;
                    if (typeof b === 'string' && b.startsWith('Wd')) return sum + (parseInt(b.split('+')[1] || '0') || 0) + 1;
                    if (typeof b === 'string' && b.startsWith('Nb')) return sum + (parseInt(b.split('+')[1] || '0') || 0) + 1;
                    return sum + (parseInt(b) || 0);
                  }, 0)
                );
                // Add current (incomplete) over from currentOverBalls
                if (currentOverBalls.length > 0) {
                  const curRuns = currentOverBalls.reduce((sum, b) => {
                    if (!b || b === 'W' || b === '\u00b7') return sum;
                    if (typeof b === 'string' && b.startsWith('Wd')) return sum + (parseInt(b.split('+')[1] || '0') || 0) + 1;
                    if (typeof b === 'string' && b.startsWith('Nb')) return sum + (parseInt(b.split('+')[1] || '0') || 0) + 1;
                    return sum + (parseInt(b) || 0);
                  }, 0);
                  overRunData.push(curRuns);
                }
                const maxRuns = Math.max(...overRunData, 1);
                return overRunData.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-xs font-bold text-slate-600">No overs bowled yet</span>
                  </div>
                ) : (
                  <div className="h-32 flex items-end gap-1.5 border-b border-l border-white/10 px-2">
                    {overRunData.map((val, idx) => (
                      <div
                        key={idx}
                        style={{ height: `${Math.max(4, (val / maxRuns) * 100)}%` }}
                        className={`flex-1 rounded-t-md relative group cursor-pointer hover:brightness-110 transition-all ${
                          idx === overRunData.length - 1 && currentOverBalls.length > 0
                            ? 'bg-gradient-to-t from-indigo-600 to-indigo-400'
                            : 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                        }`}
                      >
                        <span className="absolute top-[-18px] left-0 right-0 text-[8px] text-white font-bold text-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {val}r
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider text-center mt-2">
                {overHistory.length > 0 ? `Overs 1–${overHistory.length + (currentOverBalls.length > 0 ? 1 : 0)}` : 'Awaiting deliveries'}
              </span>
            </div>
          </div>
        </div>

      </main>

      {/* ── MODAL: Wicket dismissal details ── */}
      {showWicketModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] max-w-md w-full p-6 relative overflow-hidden animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setShowWicketModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>

            <h3 className="text-lg font-black text-white uppercase tracking-tight mb-1">Dismissal Protocol</h3>
            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-6">Select wicket type and fielder involved</p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Wicket Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Bowled', 'Caught', 'LBW', 'Stumped', 'Run Out', 'Hit Wicket', 'Retired Out'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedWicketType(type)}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all ${
                        selectedWicketType === type 
                          ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/20' 
                          : 'bg-black/20 text-slate-300 border-white/5 hover:border-white/15'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fielder / Keeper Input (Conditional) */}
              {(selectedWicketType === 'Caught' || selectedWicketType === 'Stumped' || selectedWicketType === 'Run Out') && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                    {selectedWicketType === 'Stumped' ? 'Wicket Keeper' : 'Fielder Name'}
                  </label>
                  <select
                    value={selectedFielder}
                    onChange={e => setSelectedFielder(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="">-- select fielder from squad --</option>
                    {bowlingSquad.map((p, idx) => (
                      <option key={idx} value={p.name} className="bg-slate-950 text-slate-200">
                        {p.name}
                      </option>
                    ))}
                    <option value="Sub Fielder">Sub Fielder</option>
                  </select>
                </div>
              )}

              {/* Who is out (Run Out only) */}
              {selectedWicketType === 'Run Out' && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Who is Out?</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRunoutOutType('striker')}
                      className={`py-3 text-xs font-bold rounded-xl border text-center ${
                        runoutOutType === 'striker' 
                          ? 'bg-white text-black border-white' 
                          : 'bg-black/20 text-slate-300 border-white/5'
                      }`}
                    >
                      Striker ({batters[strikerIdx]?.name || 'Striker'})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRunoutOutType('nonStriker')}
                      className={`py-3 text-xs font-bold rounded-xl border text-center ${
                        runoutOutType === 'nonStriker' 
                          ? 'bg-white text-black border-white' 
                          : 'bg-black/20 text-slate-300 border-white/5'
                      }`}
                    >
                      Non-Striker ({batters[nonStrikerIdx]?.name || 'Non-Striker'})
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleWicketDismissal}
                className="w-full py-4 bg-gradient-to-r from-rose-500 to-rose-600 text-white font-black uppercase text-xs tracking-widest rounded-xl shadow-lg shadow-rose-500/20 active:scale-95 transition-all mt-4"
              >
                Confirm Dismissal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Select New Batsman ── */}
      {showNewBatsmanModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] max-w-md w-full p-6 relative overflow-hidden animate-in zoom-in-95 duration-300">
            <h3 className="text-lg font-black text-white uppercase tracking-tight mb-1">Select New Batsman</h3>
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-6">Select next batsman from remaining प्लेइंग-XI</p>

            <div className="space-y-4">
              <div>
                <select
                  value={nextBatsmanId}
                  onChange={e => setNextBatsmanId(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-xs text-slate-200 focus:outline-none"
                >
                  <option value="">-- select batsman --</option>
                  {remainingBatters.map((p, idx) => (
                    <option key={idx} value={p.id || p._id} className="bg-slate-950 text-slate-200">
                      {p.name} {p.role ? `(${p.role})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => handleSelectNewBatsman(nextBatsmanId)}
                disabled={!nextBatsmanId}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black uppercase text-xs tracking-widest rounded-xl disabled:opacity-50 active:scale-95 transition-all"
              >
                Send to Strike
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Select New Bowler (Over complete) ── */}
      {showNextBowlerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] max-w-md w-full p-6 relative overflow-hidden animate-in zoom-in-95 duration-300">
            <h3 className="text-lg font-black text-white uppercase tracking-tight mb-1">Over Completed</h3>
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-6">Select bowler for the next over</p>

            <div className="space-y-4">
              <div>
                <select
                  value={nextBowlerId}
                  onChange={e => setNextBowlerId(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-xs text-slate-200 focus:outline-none"
                >
                  <option value="">-- select bowler --</option>
                  {bowlingSquad.map((p, idx) => (
                    <option key={idx} value={p.id || p._id} className="bg-slate-950 text-slate-200">
                      {p.name} {p.role ? `(${p.role})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => handleSelectBowler(nextBowlerId)}
                disabled={!nextBowlerId}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-xs tracking-widest rounded-xl disabled:opacity-50 active:scale-95 transition-all"
              >
                Confirm Bowler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Innings Break ── */}
      {showInningsBreakModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] max-w-lg w-full p-6 relative overflow-hidden animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-1">Innings Completed!</h3>
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-6">
              {battingTeamName} finished at {runs}/{wickets} ({overNum}.{ballInOver} overs)
            </p>

            <div className="bg-black/30 border border-white/5 p-4 rounded-2xl mb-6 text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Target for Chasing Inning</span>
              <span className="text-3xl font-black text-white">{runs + 1} Runs</span>
            </div>

            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Set Up Innings 2 Openers</h4>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[8px] font-black text-slate-500 uppercase tracking-wider mb-2">Striker Batsman</label>
                  <select
                    onChange={e => setNextBatsmanId(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 p-3.5 rounded-xl text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="">-- select striker --</option>
                    {/* Since we swap teams, battingSquad for innings 2 is bowlingSquad from innings 1 */}
                    {bowlingSquad.map((p, idx) => (
                      <option key={idx} value={p.id || p._id} className="bg-slate-950 text-slate-200">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[8px] font-black text-slate-500 uppercase tracking-wider mb-2">Opening Bowler</label>
                  <select
                    onChange={e => setNextBowlerId(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 p-3.5 rounded-xl text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="">-- select bowler --</option>
                    {battingSquad.map((p, idx) => (
                      <option key={idx} value={p.id || p._id} className="bg-slate-950 text-slate-200">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartSecondInnings}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-xl shadow-xl shadow-emerald-500/10 active:scale-95 transition-all mt-4"
              >
                Start Second Innings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Match Complete ── */}
      {showMatchCompleteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] max-w-md w-full p-6 relative overflow-hidden animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-1">Match Concluded!</h3>
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-6">Final validation checklist</p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Select Man of the Match</label>
                <select
                  value={manOfTheMatch}
                  onChange={e => setManOfTheMatch(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 p-3.5 rounded-xl text-xs text-slate-200 focus:outline-none"
                >
                  <option value="">-- select awardee --</option>
                  <optgroup label={teamAName} className="bg-slate-950">
                    {teamAPlayers.map((p, idx) => (
                      <option key={idx} value={p.id || p._id} className="text-slate-200">{p.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label={teamBName} className="bg-slate-950">
                    {teamBPlayers.map((p, idx) => (
                      <option key={idx} value={p.id || p._id} className="text-slate-200">{p.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <button
                type="button"
                onClick={handleFinishMatch}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black uppercase text-xs tracking-widest rounded-xl shadow-lg active:scale-95 transition-all mt-4"
              >
                Finalize & Sync Career Stats
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
