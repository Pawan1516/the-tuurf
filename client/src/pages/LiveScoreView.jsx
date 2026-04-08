import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import apiClient from '../api/client';
import { 
    Trophy, Users, Timer, Info, Share2, Activity, BarChart3, ChevronLeft, 
    Volume2, Zap, Target, TrendingUp, PieChart as PieIcon, LineChart as LineIcon 
} from 'lucide-react';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, ComposedChart, AreaChart, Area, Scatter, ReferenceLine,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

const SOCKET_URL = process.env.NODE_ENV === 'production' 
    ? 'https://the-tuurf-ufkd.onrender.com' 
    : 'http://localhost:5001';

export default function LiveScoreView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [match, setMatch] = useState(null);
    const [liveData, setLiveData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('commentary'); // commentary, scorecard, overs, analytics
    const [selectedInning, setSelectedInning] = useState(0); // 0 or 1
    const [prediction, setPrediction] = useState(null);
    const [newBallFlash, setNewBallFlash] = useState(false);
    const [chartData, setChartData] = useState([]);
    const [overAnalytics, setOverAnalytics] = useState([]);
    const [matchAnalytics, setMatchAnalytics] = useState({ boundaries: [], dotRatios: [] });
    const [isPremium, setIsPremium] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const scriptLoaded = useRef(false);
    const socketRef = useRef(null);

    useEffect(() => {
        // Pre-load Razorpay Script to avoid pop-up blockers
        if (!scriptLoaded.current) {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            script.onload = () => { scriptLoaded.current = true; };
            script.onerror = () => { toast.error("Razorpay SDK failed to load."); };
            document.body.appendChild(script);
        }
        const checkPremiumStatus = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const profileRes = await apiClient.get('/auth/profile');
                if (profileRes.data.success) {
                    const u = profileRes.data.user;
                    if (u.isPremium || u.subscription?.isPremium) {
                        setIsPremium(true);
                    }
                }
            } catch (err) {
                console.error('Premium check error:', err);
            }
        };

        checkPremiumStatus();

        const fetchMatch = async () => {
            try {
                const response = await apiClient.get(`/matches/${id}?t=${new Date().getTime()}`);
                if (response.data.success) {
                    const matchData = response.data.match;
                    setMatch(matchData);
                    if (matchData.live_data) {
                        setLiveData(prev => ({
                            ...prev,
                            ...matchData.live_data,
                            // CRITICAL FIX: Prioritize real-time state over initial DB values during polling
                            runs: matchData.live_data.runs ?? prev?.runs ?? matchData.team_a?.score ?? matchData.team_b?.score ?? 0,
                            wickets: matchData.live_data.wickets ?? prev?.wickets ?? matchData.team_a?.wickets ?? matchData.team_b?.wickets ?? 0
                        }));
                    }

                    const pointsMap = new Map();
                    // Initialize start
                    pointsMap.set(0, { ballIndex: 0, over: 0, runs_inn1: 0, runs_inn2: 0, momentumA: 50, momentumB: 50 });

                    if (matchData.innings) {
                        matchData.innings.forEach((inn, idx) => {
                            const runKey = idx === 0 ? 'runs_inn1' : 'runs_inn2';
                            const wicketKey = idx === 0 ? 'wicket_inn1' : 'wicket_inn2';
                            const momKey = idx === 0 ? 'momentumA' : 'momentumB';
                            let cumulativeRuns = 0;
                            
                            const totalBalls = inn.balls ? inn.balls.length : 0;
                            
                            (inn.balls || []).forEach((ball, bIdx) => {
                                 const ballTotal = (ball.runs_off_bat || 0) + (ball.extra_runs || 0);
                                 cumulativeRuns += ballTotal;
                                 
                                 const ballIndex = bIdx + 1;
                                 const existing = pointsMap.get(ballIndex) || { ballIndex, over: parseFloat(ball.over + '.' + ball.ball) || (ballIndex/6).toFixed(1) };
                                 
                                 const ballMom = ballTotal >= 4 ? 80 : (ballTotal === 0 ? 30 : 50);

                                 pointsMap.set(ballIndex, { 
                                     ...existing, 
                                     [runKey]: cumulativeRuns, 
                                     [wicketKey]: ball.is_wicket,
                                     [momKey]: ballMom
                                 });
                            });
                        });
                    }

                    const sorted = Array.from(pointsMap.values()).sort((a,b) => a.ballIndex - b.ballIndex);
                    setChartData(sorted);

                    // Aggregating for Momentum Chart (Over by Over)
                    const overSummaries = [];
                    for (let i = 0; i <= (matchData.overs || 10); i++) {
                        const ballsInOver1 = (matchData.innings?.[0]?.balls || []).filter(b => b.over_number === i);
                        const ballsInOver2 = (matchData.innings?.[1]?.balls || []).filter(b => b.over_number === i);
                        
                        const runs1 = ballsInOver1.reduce((s, b) => s + (b.runs_off_bat || 0) + (b.extra_runs || 0), 0);
                        const runs2 = ballsInOver2.reduce((s, b) => s + (b.runs_off_bat || 0) + (b.extra_runs || 0), 0);
                        
                        if (ballsInOver1.length > 0 || ballsInOver2.length > 0) {
                            overSummaries.push({
                                over: i + 1,
                                [teamAName]: runs1,
                                [teamBName]: runs2,
                                diff: runs1 - runs2
                            });
                        }
                    }
                    setOverAnalytics(overSummaries);

                    // Aggregating for Live Match Batting Analytics
                    const allBalls = [...(matchData.innings?.[0]?.balls || []), ...(matchData.innings?.[1]?.balls || [])];
                    const dots = allBalls.filter(b => (b.runs_off_bat === 0 && !b.extra_runs)).length;
                    const fours = allBalls.filter(b => b.runs_off_bat === 4).length;
                    const sixes = allBalls.filter(b => b.runs_off_bat === 6).length;
                    const others = allBalls.length - dots - fours - sixes;

                    setMatchAnalytics({
                        boundaries: [
                            { name: '4s', value: fours, fill: '#10b981' },
                            { name: '6s', value: sixes, fill: '#3b82f6' },
                            { name: 'Others', value: others, fill: '#94a3b8' }
                        ],
                        dotRatios: [
                            { name: 'Dots', value: dots, fill: '#ef4444' },
                            { name: 'Scored', value: allBalls.length - dots, fill: '#10b981' }
                        ]
                    });
                }
            } catch (err) {
                setError("Match information unavailable.");
            } finally {
                setLoading(false);
            }
        };

        const fetchPrediction = async () => {
            if (match && (match.status === 'Completed')) return;
            try {
                const res = await apiClient.get(`/matches/${id}/prediction`);
                if (res.data.success) {
                    setPrediction(res.data.prediction);
                }
            } catch (err) {
                console.error("Insight fetch failed");
            }
        };

        fetchMatch();
        setTimeout(fetchPrediction, 2000);

        const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
        socketRef.current = socket;

        socket.on('connect', () => {
            const mid = String(id);
            socket.emit('join_match', mid);
            console.log('📡 Connected to Live Stream:', mid);
        });

        socket.on('match:update', (data) => handleLiveContent(data));
        socket.on('scoreUpdate', (data) => handleLiveContent(data));
        socket.on('playerUpdate', (data) => handleLiveContent(data));

        function handleLiveContent(data) {
            console.log('📡 Live Broadcast Sync:', data);
            setLiveData(prev => {
                const newData = {
                    ...prev,
                    ...data,
                    runs: data.runs ?? data.score?.runs ?? prev?.runs,
                    wickets: data.wickets ?? data.score?.wickets ?? prev?.wickets,
                    last_balls: data.recent_balls || data.last_balls || prev?.last_balls || [],
                    overs: data.overs ?? prev?.overs,
                    inningsNum: data.inningsNum ?? prev?.inningsNum,
                    batting_team: data.batting_team ?? prev?.batting_team
                };
                return newData;
            });
            setNewBallFlash(true);
            setTimeout(() => setNewBallFlash(false), 800);

            // Update Chart Data in Real-time
            if (data.graphPoint) {
                setChartData(prev => {
                    const inningIdx = data.graphPoint.inning || 1;
                    const runKey = inningIdx === 1 ? 'runs_inn1' : 'runs_inn2';
                    const wicketKey = inningIdx === 1 ? 'wicket_inn1' : 'wicket_inn2';
                    
                    const exists = prev.find(p => p.over === data.graphPoint.over);

                    if (exists) {
                        return prev.map(p =>
                            p.over === data.graphPoint.over 
                                ? { ...p, [runKey]: data.graphPoint.runs, [wicketKey]: data.graphPoint.wickets > 0 } 
                                : p
                        );
                    }

                    const newPoint = {
                        over: data.graphPoint.over,
                        inning: inningIdx,
                        [runKey]: data.graphPoint.runs,
                        [wicketKey]: data.graphPoint.wickets > 0,
                        momentumA: data.momentumA || (prev.length > 0 ? prev[prev.length - 1].momentumA : 50),
                        momentumB: data.momentumB || (prev.length > 0 ? prev[prev.length - 1].momentumB : 50)
                    };
                    
                    return [...prev, newPoint].sort((a,b) => a.over - b.over);
                });
            } else if (data.runs !== undefined) {
                setChartData(prev => {
                    const oNum = data.overs || 0;
                    const r = data.runs || 0;
                    const inn = data.inningsNum || 1;
                    const exists = prev.find(p => p.over === parseFloat(oNum));

                    if (exists) {
                        return prev.map(p =>
                            p.over === parseFloat(oNum) 
                                ? { 
                                    ...p, 
                                    [inn === 1 ? 'runs_inn1' : 'runs_inn2']: r,
                                    [inn === 1 ? 'wicket_inn1' : 'wicket_inn2']: (data.wickets || 0) > 0
                                } 
                                : p
                        );
                    } else {
                        const newPoint = {
                            ballIndex: prev.length + 1,
                            over: parseFloat(oNum),
                            [inn === 1 ? 'runs_inn1' : 'runs_inn2']: r,
                            [inn === 1 ? 'wicket_inn1' : 'wicket_inn2']: (data.wickets || 0) > 0,
                            momentumA: 50,
                            momentumB: 50
                        };
                        return [...prev, newPoint];
                    }
                });
            }

            if (Math.random() > 0.8) fetchPrediction();
        }

        // Poll every 5s so the score always stays fresh even if socket drops
        const pollTimer = setInterval(fetchMatch, 5000);
        return () => {
            if (socketRef.current) socketRef.current.disconnect();
            clearInterval(pollTimer);
        };
    }, [id, match?.status]);

    const handleSubscribe = async () => {
        if (!user) {
            setShowLoginModal(true);
            return;
        }

        try {
            toast.info("Preparing secure checkout...");
            const orderRes = await apiClient.post('/payments/create-order', { 
                amount: 49, 
                bookingId: `sub_${(id || 'match').slice(-8)}_${Date.now().toString().slice(-10)}`
            });

            if (orderRes.data.success) {
                const options = {
                    key: orderRes.data.keyId,
                    amount: orderRes.data.order.amount,
                    currency: orderRes.data.order.currency,
                    name: "The Turf Premium",
                    description: "Annual Analytics Subscription",
                    order_id: orderRes.data.order.id,
                    handler: async function (response) {
                        try {
                            toast.info("Verifying subscription...");
                            const verifyRes = await apiClient.post('/payments/verify-subscription', {
                                razorpayOrderId: response.razorpay_order_id,
                                razorpayPaymentId: response.razorpay_payment_id,
                                razorpaySignature: response.razorpay_signature
                            });

                            if (verifyRes.data.success) {
                                setIsPremium(true);
                                toast.success("Welcome to Premium! Analytics Unlocked.");
                            } else {
                                toast.error(verifyRes.data.message || "Verification failed");
                            }
                        } catch (vErr) {
                            toast.error("Failed to verify payment with server");
                        }
                    },
                    prefill: {
                        name: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).name : "Player",
                        email: "user@example.com",
                        contact: "9999999999"
                    },
                    theme: { color: "#10b981" },
                    modal: {
                        ondismiss: function() {
                            toast.warning("Payment cancelled");
                        }
                    }
                };
                const rzp = new window.Razorpay(options);
                rzp.open();
            } else {
                toast.error(orderRes.data.message || "Subscription failed to initialize");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Payment server unavailable");
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-6"></div>
            <p className="text-emerald-700 font-bold uppercase tracking-widest text-[10px]">Broadcasting Live...</p>
        </div>
    );

    if (error && !match) return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex flex-col items-center justify-center p-6 text-center">
             <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                <Activity size={40} className="text-emerald-600" />
             </div>
             <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Broadcast Synchronizing</h2>
             <p className="text-slate-500 text-xs font-bold mt-2 uppercase tracking-widest">Attempting to re-establish high-fidelity link...</p>
             <Link to="/" className="mt-8 text-emerald-600 font-black uppercase text-[10px] tracking-widest px-8 py-3 bg-white border border-emerald-100 rounded-full shadow-lg">Back to Hub</Link>
        </div>
    );

    const isCompleted = match.status === 'Completed';
    const isInningStarted = match.status !== 'Scheduled';
    const activeInningData = match.innings?.length ? match.innings[match.innings.length - 1] : null;
    const finalScoreSource = match.live_active_team === 'B' ? match.team_b : match.team_a; 

    // Determine which team is currently batting (Handle all variations: 'A'/'B', 0/1, battingTeam/batting_team)
    const rawBatting = liveData?.batting_team || liveData?.battingTeam || (liveData?.batting_team_idx === 1 ? 'B' : 'A');
    const battingTeamDoc = (rawBatting === 'B' || liveData?.batting_team_idx === 1) ? match.team_b : match.team_a;

    const currentScore = {
        runs: liveData?.runs 
            ?? liveData?.scorecard?.total?.runs 
            ?? (isInningStarted ? (battingTeamDoc?.score || 0) : 0),
        wickets: liveData?.wickets 
            ?? liveData?.scorecard?.total?.wickets 
            ?? (isInningStarted ? (battingTeamDoc?.wickets || 0) : 0),
        overs: liveData?.overNum !== undefined && liveData?.ballInOver !== undefined
            ? `${liveData.overNum}.${liveData.ballInOver}`
            : (liveData?.overs ?? liveData?.scorecard?.total?.overs ?? activeInningData?.overs_completed ?? '0.0')
    };

    // Ensure we don't show 0/0 if we know it should be something else (Multi-path fallback)
    if (currentScore.runs === 0 && !isCompleted) {
        if (match.team_a?.score > 0) currentScore.runs = match.team_a.score;
        else if (match.team_b?.score > 0) currentScore.runs = match.team_b.score;
    }

    // Helper for Ball-by-ball dots
    const getBallColor = (val) => {
        if (val === 'W') return 'bg-rose-500 text-white';
        if (val >= 4 && val < 6) return 'bg-emerald-500 text-white';
        if (val >= 6) return 'bg-blue-600 text-white';
        if (val === 0) return 'bg-slate-100 text-slate-400';
        return 'bg-emerald-50 text-emerald-700';
    };

    // Backend stores as recent_balls; last_balls is normalized in the socket handler above
    const lastBalls = (liveData?.last_balls || liveData?.recent_balls || liveData?.currentOverBalls || []).slice(-12);

    const parseTitleA = match.title?.includes('vs') ? match.title.split('vs')[0].trim() : null;
    const parseTitleB = match.title?.includes('vs') ? match.title.split('vs')[1].replace('— Quick Match', '').replace('- Quick Match', '').trim() : null;

    const teamAName = match.team_a?.team_id?.name || match.quick_teams?.team_a?.name || parseTitleA || 'Team A';
    const teamBName = match.team_b?.team_id?.name || match.quick_teams?.team_b?.name || parseTitleB || 'Team B';
    const teamAColor = match.quick_teams?.team_a?.colour || '#3b82f6';
    const teamBColor = match.quick_teams?.team_b?.colour || '#ef4444';

    const Inn1WicketDot = (props) => {
        const { cx, cy, payload, index } = props;
        // End point marker
        if (index === chartData.length - 1 || (chartData[index+1] && chartData[index+1].runs_inn1 === undefined)) {
            return (
                <g>
                    <circle cx={cx} cy={cy} r={6} fill="#fff" stroke={teamAColor} strokeWidth={3} />
                    <text x={cx + 15} y={cy + 5} fill={teamAColor} fontSize={12} fontWeight="900" style={{textShadow: "1px 1px 2px #0f172a"}}>{teamAName} {payload.runs_inn1}</text>
                </g>
            );
        }
        if (payload.wicket_inn1) return <circle cx={cx} cy={cy} r={5} fill="#ef4444" stroke="#fff" strokeWidth={2} />;
        return null;
    };

    const Inn2WicketDot = (props) => {
        const { cx, cy, payload, index } = props;
        const isEnd = index === chartData.length - 1 || (chartData[index+1] && chartData[index+1].runs_inn2 === undefined);
        if (isEnd && payload.runs_inn2 !== undefined) {
            return (
                <g>
                    <circle cx={cx} cy={cy} r={6} fill="#fff" stroke={teamBColor} strokeWidth={3} />
                    <text x={cx + 15} y={cy + 15} fill={teamBColor} fontSize={12} fontWeight="900" style={{textShadow: "1px 1px 2px #0f172a"}}>{teamBName} {payload.runs_inn2}</text>
                </g>
            );
        }
        if (payload.wicket_inn2) return <circle cx={cx} cy={cy} r={5} fill="#ef4444" stroke="#fff" strokeWidth={2} />;
        return null;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 text-slate-800 font-sans pb-28 selection:bg-emerald-500/30">
            {/* dynamic background aura */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-200 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-emerald-100 rounded-full blur-[100px]"></div>
            </div>

            {/* Premium Live Header */}
            <header className="sticky top-0 z-[100] bg-white/90 backdrop-blur-2xl border-b border-emerald-100 shadow-xl">
                <div className="max-w-6xl mx-auto px-4 h-18 flex items-center justify-between py-3">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-emerald-700 hover:text-emerald-900 transition-colors bg-emerald-50 rounded-xl">
                        <ChevronLeft size={20} />
                    </button>
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2">
                             <span className={`w-2 h-2 rounded-full ${!liveData?.runs && !match.status ? 'bg-slate-400' : 'bg-rose-500 animate-pulse'}`}></span>
                             <span className={`text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600`}>
                                 Live Broadcast
                             </span>
                        </div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase mt-1 tracking-widest">{match.venue || 'The Turf Arena'}</p>
                    </div>
                    <button className="p-2 bg-emerald-50 rounded-xl text-emerald-700 hover:text-emerald-900">
                        <Share2 size={18} />
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-8 space-y-8 relative z-10">
                
                {match.status === 'Completed' && (
                    <div className="animate-in slide-in-from-top-4 duration-700">
                        <div className="bg-white rounded-[3rem] p-10 border border-emerald-100 shadow-2xl text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>                            <div className="relative z-10 text-center">
                                <Trophy className="mx-auto text-amber-400 mb-6 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" size={64} />
                                <h1 className="text-5xl font-black uppercase tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-r from-emerald-800 to-emerald-500">Match Concluded</h1>
                                <div className="inline-block px-8 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-8">
                                    <p className="text-2xl font-black text-emerald-400 uppercase italic tracking-tight">
                                        {(() => {
                                            const res = match.result;
                                            let winner = '';
                                            const teamAId = match.team_a?.team_id?._id || match.team_a?.team_id;
                                            const teamBId = match.team_b?.team_id?._id || match.team_b?.team_id;

                                            const winId = res?.winner?._id || res?.winner;
                                            
                                            const scoreA = match.team_a?.score || 0;
                                            const scoreB = match.team_b?.score || 0;

                                            if (winId) {
                                                if (winId.toString() === teamAId?.toString()) winner = teamAName;
                                                else if (winId.toString() === teamBId?.toString()) winner = teamBName;
                                            }
                                            if (!winner && res?.winner?.name) winner = res.winner.name;
                                            if (!winner && typeof res?.winner === 'string') winner = res.winner;

                                            let margin = res?.margin;
                                            let wonBy = res?.won_by;

                                            if (!winner || winner === 'Pending' || match.status === 'Completed') {
                                                const diff = scoreA - scoreB;
                                                if (diff > 0) { 
                                                    winner = teamAName; 
                                                    if (!margin) margin = diff;
                                                    if (!wonBy || wonBy === 'Pending') wonBy = 'Runs';
                                                }
                                                else if (diff < 0) { 
                                                    winner = teamBName;
                                                    if (!margin) margin = Math.max(10 - (match.team_b?.wickets || 0), 1); 
                                                    if (!wonBy || wonBy === 'Pending') wonBy = 'Wickets';
                                                }
                                                else if (diff === 0 && match.status === 'Completed') {
                                                    winner = 'Match Tied';
                                                    wonBy = 'Tie';
                                                    margin = 0;
                                                }
                                            }

                                            if (wonBy === 'Tie') return "MATCH TIED";
                                            if (winner === 'Result Pending' || !winner) return "RESULT PENDING";
                                            return `${winner} WON BY ${margin} ${wonBy}`.toUpperCase();
                                        })()}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-8 max-w-lg mx-auto bg-emerald-50/50 p-8 rounded-[2rem] border border-emerald-100 backdrop-blur-md">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase text-emerald-700 tracking-widest">{teamAName}</p>
                                    <p className="text-4xl font-black text-slate-900">{match.team_a.score}<span className="text-xl text-slate-400 ml-1">/{match.team_a.wickets}</span></p>
                                </div>
                                <div className="space-y-1 border-l border-emerald-200">
                                    <p className="text-[10px] font-black uppercase text-emerald-700 tracking-widest">{teamBName}</p>
                                    <p className="text-4xl font-black text-slate-900">{match.team_b.score}<span className="text-xl text-slate-400 ml-1">/{match.team_b.wickets}</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Score Hero */}
                <div className={`bg-white/80 backdrop-blur-3xl rounded-[2.5rem] md:rounded-[3.5rem] p-6 md:p-14 border border-white/50 shadow-[0_32px_80px_-16px_rgba(0,0,0,0.12)] relative overflow-hidden transition-all duration-700 ${newBallFlash ? 'scale-[1.01] border-emerald-400 ring-4 ring-emerald-200/30' : ''}`}>
                    {/* Turf Pattern Overlay */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    
                    <div className="absolute top-0 right-0 p-4 md:p-8">
                         <div className="bg-emerald-500/10 backdrop-blur-md text-emerald-600 px-3 py-1.5 md:px-5 md:py-2.5 rounded-full border border-emerald-500/20 flex items-center gap-2 shadow-lg shadow-emerald-500/5 transition-transform hover:scale-105 cursor-default">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]"></div>
                             <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">Live Tracking</span>
                         </div>
                    </div>

                    <div className="flex flex-col gap-10 md:gap-14 relative z-10">
                        <div className="grid grid-cols-3 items-center gap-6">
                            <div className="flex flex-col items-center group">
                                <div className="w-14 h-14 md:w-24 md:h-24 rounded-3xl md:rounded-[2.5rem] bg-white flex items-center justify-center border border-slate-100 mb-4 shadow-2xl transition-all duration-500 group-hover:-translate-y-1 group-hover:rotate-3">
                                    <Users size={24} style={{ color: teamAColor }} className="md:w-10 md:h-10" />
                                </div>
                                <h3 className="text-[10px] md:text-xs font-black uppercase text-slate-800 tracking-[0.1em] text-center line-clamp-1 max-w-[80px] md:max-w-none">{teamAName}</h3>
                            </div>

                            <div className="text-center relative">
                                <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-32 h-32 bg-emerald-400/20 rounded-full blur-[60px]"></div>
                                <div className="flex items-baseline justify-center gap-1 mb-2 relative z-10">
                                    <span className="text-6xl md:text-[7rem] font-black tracking-tighter text-slate-900 leading-none drop-shadow-sm">{currentScore.runs}</span>
                                    <span className="text-2xl md:text-[2.5rem] font-black text-emerald-500">/{currentScore.wickets}</span>
                                </div>
                                <div className="inline-block px-4 py-1.5 bg-slate-900/5 rounded-2xl border border-slate-900/5">
                                    <span className="text-[10px] md:text-[12px] font-black text-slate-600 uppercase tracking-[0.2em]">{currentScore.overs} OV COMPLETE</span>
                                </div>
                            </div>

                            <div className="flex flex-col items-center group">
                                <div className="w-14 h-14 md:w-24 md:h-24 rounded-3xl md:rounded-[2.5rem] bg-white flex items-center justify-center border border-slate-100 mb-4 shadow-2xl transition-all duration-500 group-hover:-translate-y-1 group-hover:-rotate-3">
                                    <Users size={24} style={{ color: teamBColor }} className="md:w-10 md:h-10" />
                                </div>
                                <h3 className="text-[10px] md:text-xs font-black uppercase text-slate-800 tracking-[0.1em] text-center line-clamp-1 max-w-[80px] md:max-w-none">{teamBName}</h3>
                            </div>
                        </div>

                        {/* Recent Balls Visualization */}
                        {lastBalls.length > 0 && (
                            <div className="flex flex-col items-center gap-4 py-2 border-y border-slate-100/50">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Recent Deliveries</p>
                                <div className="flex gap-3 md:gap-4 overflow-x-auto pb-3 no-scrollbar max-w-full justify-center px-10">
                                    {lastBalls.map((ball, idx) => (
                                        <div key={idx} className={`w-9 h-9 md:w-11 md:h-11 rounded-[1.2rem] flex items-center justify-center text-[10px] md:text-xs font-black shadow-lg shadow-black/5 shrink-0 transition-all hover:scale-110 active:scale-95 ${getBallColor(ball)}`}>
                                            {ball}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex flex-wrap items-center justify-center md:justify-between gap-6 md:gap-8 pt-2">
                            <div className="flex gap-10 md:gap-14">
                                <div className="group cursor-default">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-emerald-500 transition-colors">Run Rate</p>
                                    <p className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">{liveData?.run_rate || '0.00'}</p>
                                </div>
                                {liveData?.target && (
                                    <div className="border-l border-slate-100 pl-10 md:pl-14 group cursor-default">
                                        <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1 group-hover:text-rose-500 transition-colors">Target</p>
                                        <p className="text-3xl md:text-4xl font-black text-rose-500 tracking-tight">{liveData.target}</p>
                                    </div>
                                )}
                            </div>
                            <div className="bg-emerald-50/60 backdrop-blur-xl px-5 py-4 rounded-[2rem] border border-emerald-100/50 flex items-center gap-4 shadow-xl shadow-emerald-500/5">
                                 <div className="w-10 h-10 rounded-2xl bg-white border border-emerald-50 flex items-center justify-center shadow-sm">
                                    <Zap size={18} className="text-emerald-500 fill-emerald-500/20" />
                                 </div>
                                 <div className="max-w-[160px] md:max-w-[200px]">
                                    <p className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest mb-0.5">Tactical Insight</p>
                                    <p className="text-[11px] font-bold text-slate-700 uppercase leading-snug line-clamp-2">{prediction?.insight || 'Analyzing match trajectory...'}</p>
                                 </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white/50 backdrop-blur-xl rounded-[2rem] p-1.5 flex border border-white/50 shadow-xl">
                    {[
                        { id: 'analytics', label: 'Intel', icon: LineIcon, premium: true },
                        { id: 'commentary', label: 'Live', icon: Volume2 },
                        { id: 'scorecard', label: 'Card', icon: BarChart3 }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={`flex-1 py-3.5 px-2 rounded-[1.5rem] flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] transition-all duration-500 relative ${activeTab === t.id ? 'bg-white text-emerald-600 shadow-sm border border-emerald-50' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <t.icon size={14} /> 
                            {t.label}
                            {t.premium && (
                                <Zap size={8} className="absolute top-2 right-2 text-amber-500 fill-amber-500 animate-pulse" />
                            )}
                        </button>
                    ))}
                </div>

                <div className="min-h-[500px]">
                    {activeTab === 'analytics' && (
                         <div className="space-y-8 animate-in fade-in duration-700">
                             {/* Intel Premium Subscription Banner */}
                             {!isPremium && (
                                 <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-8 md:p-10 border border-slate-700/50 shadow-2xl relative overflow-hidden group">
                                     <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                                     <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-[80px] -ml-24 -mb-24"></div>
                                     
                                     <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                                         <div className="space-y-4 text-center md:text-left">
                                             <div className="inline-flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
                                                 <Zap className="text-emerald-400 fill-emerald-400/20" size={14} />
                                                 <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Premium Intelligence</span>
                                             </div>
                                             <h2 className="text-3xl md:text-4xl font-black text-white leading-tight tracking-tighter uppercase italic">Unlock Elite <br /><span className="text-emerald-400">Match Analytics</span></h2>
                                             <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-relaxed max-w-sm">Deep learning predictions • Advanced player comparisons • Live momentum velocity shifts</p>
                                         </div>
                                         <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 text-center min-w-[240px] transform transition-transform group-hover:scale-105 duration-500 shadow-2xl">
                                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Annual Pass</p>
                                             <p className="text-5xl font-black text-white tracking-tighter mb-1">₹49<span className="text-lg text-emerald-400">/YR</span></p>
                                             <p className="text-[9px] font-bold text-slate-500 uppercase mb-8">All Matches Included</p>
                                             <button 
                                                 onClick={handleSubscribe}
                                                 className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black py-4 rounded-2xl text-[11px] uppercase tracking-[0.2em] transition-all shadow-lg shadow-emerald-500/20"
                                             >
                                                 Subscribe Now
                                             </button>
                                         </div>
                                     </div>
                                 </div>
                             )}

                             <div className="bg-white rounded-[3rem] p-10 border border-emerald-100 shadow-2xl overflow-hidden relative">
                                 <div className="absolute top-[-20%] right-[-20%] w-[50%] h-[50%] bg-emerald-100/30 rounded-full blur-[80px]"></div>
                                 <h3 className="text-xs font-black text-emerald-700 mb-10 uppercase tracking-[0.3em] flex items-center gap-3">
                                     <TrendingUp className="text-emerald-500" size={16} /> Velocity Comparison
                                 </h3>
                                 
                                 <div className={`h-80 w-full transition-all duration-700 ${!isPremium ? 'blur-md grayscale opacity-30 select-none' : ''}`}>
                                    {/* Overlay for Premium */}
                                    {!isPremium && (
                                        <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
                                            <div className="bg-white/90 backdrop-blur-md rounded-[2rem] p-8 border border-emerald-100 shadow-2xl text-center max-w-xs">
                                                <Zap className="mx-auto text-amber-500 fill-amber-500 mb-4 animate-bounce" size={32} />
                                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-2">Locked Feature</h4>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-6 leading-relaxed">Velocity charts are available for Premium users only.</p>
                                                <button onClick={handleSubscribe} className="w-full bg-slate-900 text-white font-black py-4 rounded-xl text-[10px] uppercase tracking-widest shadow-xl">Unlock Now</button>
                                            </div>
                                        </div>
                                    )}
                                     <ResponsiveContainer width="100%" height="100%">
                                         <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                                             <CartesianGrid strokeDasharray="5 5" stroke="#1e293b" vertical={false} opacity={0.5} />
                                             <XAxis 
                                                 type="number" 
                                                 domain={[0, (match?.overs || 10) * 6]} 
                                                 dataKey="ballIndex" 
                                                 stroke="#475569" 
                                                 tick={{ fontSize: 10, fill: '#475569', fontWeight: 700 }} 
                                                 tickFormatter={(val) => Math.floor(val/6) + "." + (val%6)}
                                                 axisLine={false} 
                                                 tickLine={false} 
                                                 label={{ value: 'TOTAL OVERS', position: 'insideBottom', offset: -10, fill: '#475569', fontSize: 10, fontWeight: 'black', tracking: '0.2em' }}
                                             />
                                             <YAxis 
                                                 stroke="#475569" 
                                                 tick={{ fontSize: 10, fill: '#475569', fontWeight: 700 }} 
                                                 axisLine={false} 
                                                 tickLine={false}
                                                 domain={[0, (dataMax) => Math.max(dataMax + 10, 40)]}
                                                 label={{ value: 'RUNS', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 10, fontWeight: 'black' }}
                                             />
                                             <Tooltip 
                                                 labelFormatter={(val) => `Over: ${Math.floor(val/6)}.${val%6}`}
                                                 contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #d1fae5', borderRadius: '20px', padding: '15px', color: '#1e293b', boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }} 
                                                 itemStyle={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase' }}
                                             />
                                             <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: '#475569', paddingTop: '20px' }} />
                                             
                                             {(liveData?.target) && (
                                                 <ReferenceLine y={liveData.target} stroke="#10b981" strokeDasharray="3 3" label={{ position: 'top', value: 'TARGET', fill: '#10b981', fontSize: 10, fontWeight: 900 }} />
                                             )}
 
                                             <Line 
                                                 type="monotone" 
                                                 dataKey="runs_inn1" 
                                                 name={teamAName} 
                                                 stroke={teamAColor} 
                                                 strokeWidth={4} 
                                                 dot={<Inn1WicketDot />}
                                                 connectNulls
                                                 animationDuration={1000}
                                                 style={{ filter: `drop-shadow(0px 0px 8px ${teamAColor}50)` }}
                                             />
                                             
                                             {chartData.some(p => p.runs_inn2 !== null) && (
                                                 <Line 
                                                     type="monotone" 
                                                     dataKey="runs_inn2" 
                                                     name={teamBName} 
                                                     stroke={teamBColor} 
                                                     strokeWidth={4} 
                                                     dot={<Inn2WicketDot />}
                                                     connectNulls
                                                     animationDuration={1000}
                                                     style={{ filter: `drop-shadow(0px 0px 8px ${teamBColor}50)` }}
                                                 />
                                             )}
                                         </LineChart>
                                     </ResponsiveContainer>
                                 </div>
                             </div>
 
                             <div className="bg-white rounded-[3rem] p-10 border border-emerald-100 shadow-2xl overflow-hidden relative">
                                 <h3 className="text-xs font-black text-emerald-700 mb-10 uppercase tracking-[0.3em] flex items-center gap-3">
                                     <Zap className="text-emerald-500" size={16} /> Over Velocity Momentum
                                 </h3>
                                 <div className={`h-64 w-full transition-all duration-700 ${!isPremium ? 'blur-md grayscale opacity-30 select-none' : ''}`}>
                                     {!isPremium && (
                                        <div className="absolute inset-0 z-50 flex items-center justify-center">
                                            <button onClick={handleSubscribe} className="bg-white border border-emerald-100 rounded-full py-3 px-8 text-[9px] font-black uppercase tracking-widest shadow-lg">View Momentum</button>
                                        </div>
                                     )}
                                     <ResponsiveContainer width="100%" height="100%">
                                         <BarChart data={overAnalytics}>
                                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                             <XAxis dataKey="over" stroke="#64748b" tick={{fontSize: 10, fontWeight: 900}} label={{ value: 'OVERS', position: 'insideBottom', offset: -5, fontSize: 10, fontWeight: 900 }} />
                                             <YAxis stroke="#64748b" tick={{fontSize: 10, fontWeight: 900}} />
                                             <Tooltip 
                                                 cursor={{fill: '#f8fafc'}}
                                                 contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                                             />
                                             <Legend iconType="circle" />
                                             <Bar dataKey={teamAName} fill={teamAColor} radius={[6, 6, 0, 0]} />
                                             <Bar dataKey={teamBName} fill={teamBColor} radius={[6, 6, 0, 0]} />
                                         </BarChart>
                                     </ResponsiveContainer>
                                 </div>
                             </div>
 
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                                 <div className="bg-white rounded-[3rem] p-8 border border-emerald-100 shadow-2xl text-center relative overflow-hidden">
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Match Boundary Profile</p>
                                      <div className={`h-48 relative ${!isPremium ? 'blur-md opacity-30' : ''}`}>
                                         {!isPremium && <div className="absolute inset-0 bg-transparent z-10 cursor-pointer" onClick={handleSubscribe}></div>}
                                         <ResponsiveContainer width="100%" height="100%">
                                             <PieChart>
                                                 <Pie data={matchAnalytics.boundaries} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                     {matchAnalytics.boundaries.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                                                 </Pie>
                                                 <Tooltip contentStyle={{ borderRadius: '15px', border: 'none' }} />
                                             </PieChart>
                                         </ResponsiveContainer>
                                      </div>
                                 </div>
                                 <div className="bg-white rounded-[3rem] p-8 border border-emerald-100 shadow-2xl text-center relative overflow-hidden">
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Innings Dot Ball Ratio</p>
                                      <div className={`h-48 relative ${!isPremium ? 'blur-md opacity-30' : ''}`}>
                                         {!isPremium && <div className="absolute inset-0 bg-transparent z-10 cursor-pointer" onClick={handleSubscribe}></div>}
                                         <ResponsiveContainer width="100%" height="100%">
                                             <PieChart>
                                                 <Pie data={matchAnalytics.dotRatios} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                     {matchAnalytics.dotRatios.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                                                 </Pie>
                                                 <Tooltip contentStyle={{ borderRadius: '15px', border: 'none' }} />
                                             </PieChart>
                                         </ResponsiveContainer>
                                      </div>
                                 </div>
                             </div>
 
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                 <div className="bg-white rounded-[2.5rem] p-8 border border-emerald-100 shadow-2xl relative overflow-hidden">
                                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl"></div>
                                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-6">Win Probability</p>
                                      <div className={`flex items-center gap-6 relative ${!isPremium ? 'blur-sm opacity-40' : ''}`}>
                                         {!isPremium && <div className="absolute inset-0 bg-transparent z-10 cursor-pointer" onClick={handleSubscribe}></div>}
                                          <p className="text-6xl font-black text-slate-900">{prediction?.winProbability || 50}%</p>
                                          <div className="flex-1">
                                              <div className="w-full h-3 bg-emerald-50 rounded-full overflow-hidden border border-emerald-100 p-0.5">
                                                  <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-1000" style={{ width: `${prediction?.winProbability || 50}%` }}></div>
                                              </div>
                                              <p className="text-[9px] font-bold text-slate-500 mt-2 uppercase text-right">{teamAName} dominance</p>
                                          </div>
                                      </div>
                                 </div>
                                 <div className="bg-emerald-50 backdrop-blur-md rounded-[2.5rem] p-8 border border-emerald-100 flex items-center justify-between group cursor-default relative">
                                      {!isPremium && <div className="absolute inset-0 bg-transparent z-10 cursor-pointer" onClick={handleSubscribe}></div>}
                                      <div className={`space-y-1 ${!isPremium ? 'blur-sm opacity-40' : ''}`}>
                                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">MVP Candidate</p>
                                          <p className="text-3xl font-black text-slate-900 transition-colors group-hover:text-emerald-700">{prediction?.mvp || "---"}</p>
                                      </div>
                                      <div className="w-16 h-16 rounded-3xl bg-emerald-100 flex items-center justify-center border border-emerald-200 group-hover:scale-110 transition-transform">
                                          <Trophy className="text-emerald-600" size={28} />
                                      </div>
                                 </div>
                             </div>
                         </div>
                     )}

                     {activeTab === 'commentary' && (
                        <div className="space-y-3 animate-in slide-in-from-bottom-4 duration-700">
                            {[...(liveData?.commentary_log || [])].reverse().map((entry, i) => (
                                <div key={i} className={`bg-white/80 backdrop-blur-xl rounded-[1.5rem] border p-4 flex gap-4 transition-all hover:translate-x-1 ${entry.text.includes('FOUR') || entry.text.includes('SIX') || entry.text.includes('WICKET') ? 'border-emerald-400/30 bg-emerald-50/20 shadow-md' : 'border-slate-100 shadow-sm'}`}>
                                     <div className="flex flex-col items-center shrink-0">
                                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black shadow-sm ${entry.text.includes('WICKET') ? 'bg-rose-500 text-white' : 'bg-slate-50 text-slate-800'}`}>
                                             {entry.ball}
                                         </div>
                                         <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">{entry.overs} OV</span>
                                     </div>
                                     <div className="flex-1 space-y-1">
                                         <div className="flex items-center justify-between">
                                             <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Update</p>
                                             {entry.text.includes('WICKET') && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></div>}
                                         </div>
                                         <p className="text-xs font-bold text-slate-700 leading-snug">
                                             {entry.text.split(' ').map((word, idx) => (
                                                 <span key={idx} className={['FOUR', 'SIX', 'WICKET'].includes(word.toUpperCase()) ? 'text-emerald-500 font-black' : ''}>
                                                     {word}{' '}
                                                 </span>
                                             ))}
                                         </p>
                                     </div>
                                 </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'scorecard' && (
                        <div className="space-y-6 animate-in fade-in duration-700 pb-10">
                             {/* Inning Selector */}
                             <div className="flex bg-slate-100/50 p-1.5 rounded-[1.5rem] border border-slate-200/50 shadow-inner">
                                 {match.innings?.map((inn, idx) => (
                                     <button
                                        key={idx}
                                        onClick={() => setSelectedInning(idx)}
                                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${selectedInning === idx ? 'bg-white text-emerald-600 shadow-md border border-emerald-50 scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}
                                     >
                                         Innings {idx + 1}
                                     </button>
                                 ))}
                             </div>

                             {/* Inning Title */}
                             <div className="flex items-center justify-between px-2">
                                 <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                                     {selectedInning === 0 ? teamAName : teamBName} Batting
                                 </h3>
                                 <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                     {match.innings?.[selectedInning]?.score || 0}/{match.innings?.[selectedInning]?.wickets || 0} ({match.innings?.[selectedInning]?.overs_completed || '0.0'})
                                 </span>
                             </div>

                             {/* Batting Section */}
                             <div className="bg-white/80 backdrop-blur-xl shadow-xl border border-white/50 rounded-[2.5rem] overflow-hidden">
                                 <div className="overflow-x-auto no-scrollbar">
                                     <table className="w-full">
                                         <thead className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 border-b border-emerald-50/50">
                                             <tr>
                                                 <th className="py-5 px-4 md:px-10 text-left tracking-widest min-w-[120px]">Batter</th>
                                                 <th className="py-5 px-2 md:px-4 text-center">R</th>
                                                 <th className="py-5 px-2 md:px-4 text-center">B</th>
                                                 <th className="py-5 px-2 md:px-4 text-center">4s</th>
                                                 <th className="py-5 px-2 md:px-4 text-center">6s</th>
                                                 <th className="py-5 px-4 md:px-10 text-right">SR</th>
                                             </tr>
                                         </thead>
                                         <tbody className="divide-y divide-slate-100/50">
                                             {(match.innings?.[selectedInning]?.batsmen || []).map((b, i) => (
                                                 <tr key={i} className={`group transition-all hover:bg-emerald-50/30 ${b.is_on_strike ? 'bg-emerald-50/40' : ''}`}>
                                                     <td className="py-5 px-4 md:px-10 text-left">
                                                         <div className="flex items-center gap-2 md:gap-3">
                                                             <div className={`w-1.5 h-1.5 rounded-full transition-all ${b.is_on_strike ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-transparent'}`}></div>
                                                             <span className={`text-[12px] md:text-sm font-bold tracking-tight line-clamp-1 ${b.is_on_strike ? 'text-emerald-700' : 'text-slate-700'}`}>{b.name || "Player"}</span>
                                                         </div>
                                                     </td>
                                                     <td className="py-5 px-2 md:px-4 text-center text-[12px] md:text-sm font-black text-slate-900 group-hover:scale-110 transition-transform">{b.runs}</td>
                                                     <td className="py-5 px-2 md:px-4 text-center text-[10px] md:text-xs font-bold text-slate-400">{b.balls}</td>
                                                     <td className="py-5 px-2 md:px-4 text-center text-[10px] md:text-xs font-bold text-emerald-500/70">{b.fours || 0}</td>
                                                     <td className="py-5 px-2 md:px-4 text-center text-[10px] md:text-xs font-bold text-blue-500/70">{b.sixes || 0}</td>
                                                     <td className="py-5 px-4 md:px-10 text-right text-[10px] md:text-[11px] font-black text-slate-500 italic">{b.sr || '0.0'}</td>
                                                 </tr>
                                             ))}
                                         </tbody>
                                     </table>
                                 </div>
                             </div>

                             {/* Bowling Section */}
                             <div className="bg-white/80 backdrop-blur-xl shadow-xl border border-white/50 rounded-[2.5rem] overflow-hidden">
                                 <div className="px-8 py-5 border-b border-emerald-50/50">
                                     <h4 className="text-[10px] font-black uppercase text-slate-600 tracking-widest flex items-center gap-2">
                                         <Target size={12} className="text-rose-500" /> Bowling Attack
                                     </h4>
                                 </div>
                                 <div className="overflow-x-auto">
                                     <table className="w-full">
                                         <thead className="text-[9px] font-black uppercase text-slate-400 border-b border-emerald-50/50">
                                             <tr>
                                                 <th className="py-5 px-6 md:px-10 text-left tracking-widest">Bowler</th>
                                                 <th className="py-5 px-3 text-center">O</th>
                                                 <th className="py-5 px-3 text-center hidden md:table-cell">M</th>
                                                 <th className="py-5 px-3 text-center">R</th>
                                                 <th className="py-5 px-3 text-center">W</th>
                                                 <th className="py-5 px-6 md:px-10 text-right">EC</th>
                                             </tr>
                                         </thead>
                                         <tbody className="divide-y divide-slate-100/50">
                                             {(match.innings?.[selectedInning]?.bowlers || []).map((bw, i) => (
                                                 <tr key={i} className="group transition-all hover:bg-rose-50/30">
                                                     <td className="py-5 px-6 md:px-10 text-left">
                                                         <span className="text-sm font-bold text-slate-700 tracking-tight">{bw.name || "Bowler"}</span>
                                                     </td>
                                                     <td className="py-5 px-3 text-center text-sm font-bold text-slate-800">{bw.overs}</td>
                                                     <td className="py-5 px-3 text-center text-xs font-bold text-slate-400 hidden md:table-cell">{bw.maidens || 0}</td>
                                                     <td className="py-5 px-3 text-center text-sm font-bold text-slate-800">{bw.runs}</td>
                                                     <td className="py-5 px-3 text-center text-sm font-black text-rose-500 group-hover:scale-110 transition-transform">{bw.wickets}</td>
                                                     <td className="py-5 px-6 md:px-10 text-right text-[11px] font-black text-slate-500 italic">{bw.economy || '0.0'}</td>
                                                 </tr>
                                             ))}
                                         </tbody>
                                     </table>
                                 </div>
                             </div>

                             <div className="bg-emerald-50/30 backdrop-blur-sm rounded-2xl p-5 border border-emerald-100/50 flex items-center justify-between shadow-sm">
                                  <div className="flex flex-col">
                                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Innings Extras</p>
                                      <p className="text-sm font-black text-slate-700">{(match.innings?.[selectedInning]?.extras || 0)} <span className="text-[9px] text-slate-400 font-bold ml-1">(WD 0, NB 0, LB 0, B 0)</span></p>
                                  </div>
                                  <div className="text-right">
                                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Partnership</p>
                                      <p className="text-sm font-black text-emerald-600">---</p>
                                  </div>
                             </div>
                        </div>
                    )}
                </div>
            </main>

            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-sm z-[200]">
                <div className="bg-white/95 backdrop-blur-3xl rounded-3xl p-2.5 flex items-center shadow-[0_-10px_40px_rgb(0,0,0,0.08)] border border-emerald-100 ring-1 ring-emerald-50">
                    <button onClick={() => navigate('/')} className="flex-1 text-[10px] font-black text-slate-500 hover:text-emerald-700 uppercase transition-colors">Home</button>
                    <div className="w-px h-8 bg-emerald-100 mx-3"></div>
                    <button className="flex-[3] bg-gradient-to-r from-emerald-600 to-emerald-500 py-4 rounded-2xl flex items-center justify-center gap-3 group relative overflow-hidden shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform">
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <Zap size={16} className="text-white fill-white animate-pulse" />
                        <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Expert Analytics</span>
                    </button>
                    <div className="w-px h-8 bg-emerald-100 mx-3"></div>
                    <button className="flex-1 text-[10px] font-black text-slate-500 hover:text-emerald-700 uppercase transition-colors">Invite</button>
                </div>
            </div>

        {/* Login Required Modal */}
        {showLoginModal && (
            <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center p-4" onClick={() => setShowLoginModal(false)}>
                <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
                <div
                    className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl border border-emerald-100 animate-in slide-in-from-bottom-8 duration-500"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Close */}
                    <button
                        onClick={() => setShowLoginModal(false)}
                        className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors text-sm font-black"
                    >
                        ✕
                    </button>

                    {/* Icon */}
                    <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-emerald-100">
                        <Zap size={28} className="text-emerald-500 fill-emerald-500/20" />
                    </div>

                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter text-center mb-2">Unlock Premium Intel</h2>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center mb-8 leading-relaxed">
                        Login or create a free account to access<br />advanced match analytics &amp; predictions
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl text-[11px] uppercase tracking-[0.2em] transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                        >
                            Login to My Account
                        </button>
                        <button
                            onClick={() => navigate('/register')}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl text-[11px] uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95"
                        >
                            Create Free Account
                        </button>
                        <button
                            onClick={() => setShowLoginModal(false)}
                            className="w-full text-slate-400 font-black py-3 rounded-2xl text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors"
                        >
                            Continue Watching
                        </button>
                    </div>

                    <p className="text-center text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-6">Premium pass · ₹49/year · All matches included</p>
                </div>
            </div>
        )}
        </div>
    );
}
