import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import apiClient, { SOCKET_URL as API_SOCKET_URL } from '../api/client';
import {
    Trophy, Share2, BarChart3,
    Zap, Target, TrendingUp, WifiOff, ArrowLeft, Star,
    Shield, Eye, Radio, Swords, Coins
} from 'lucide-react';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import {
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area,
    BarChart, Bar
} from 'recharts';
import CricBotWidget from '../components/CricBotWidget';
import PostTossSetup from '../components/PostTossSetup';
import ScoringPanel from '../components/ScoringPanel';

const SOCKET_URL = API_SOCKET_URL;

/* ─── Design tokens ─────────────────────────────────────────────── */
const styles = {
    page: {
        background: 'linear-gradient(135deg, #020C07 0%, #071A0F 40%, #020C07 100%)',
        minHeight: '100vh',
        fontFamily: "'Inter', 'SF Pro Display', sans-serif",
        color: '#e2e8f0',
    },
    glass: {
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '1.5rem',
    },
    glassStrong: {
        background: 'rgba(16,185,129,0.06)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(16,185,129,0.15)',
        borderRadius: '1.5rem',
    },
    glassCard: {
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '1.25rem',
    },
};

/* ─── Ball bubble ───────────────────────────────────────────────── */
const BallBubble = ({ val }) => {
    let bg = 'rgba(255,255,255,0.08)';
    let color = '#94a3b8';
    let shadow = 'none';
    if (val === 'W') { bg = 'rgba(239,68,68,0.25)'; color = '#fca5a5'; shadow = '0 0 12px rgba(239,68,68,0.4)'; }
    else if (val === 6) { bg = 'rgba(16,185,129,0.3)'; color = '#34d399'; shadow = '0 0 12px rgba(16,185,129,0.5)'; }
    else if (val === 4) { bg = 'rgba(16,185,129,0.18)'; color = '#6ee7b7'; }
    else if (val === 0) { bg = 'rgba(255,255,255,0.04)'; color = '#475569'; }
    return (
        <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: bg, color, boxShadow: shadow,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 13, border: '1px solid rgba(255,255,255,0.1)',
            transition: 'transform 0.2s',
            flexShrink: 0,
        }}>
            {val === 'W' ? '🏏' : val}
        </div>
    );
};

/* ─── Stat chip ─────────────────────────────────────────────────── */
const StatChip = ({ label, value, accent }) => (
    <div style={{ ...styles.glassCard, padding: '12px 16px', minWidth: 90 }}>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#64748b', marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 20, fontWeight: 800, color: accent || '#e2e8f0', lineHeight: 1 }}>{value ?? '—'}</p>
    </div>
);

/* ─── Section header ────────────────────────────────────────────── */
const SectionHeader = ({ icon: Icon, title, color = '#10b981' }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ width: 3, height: 18, background: color, borderRadius: 99 }} />
        {Icon && <Icon size={14} style={{ color }} />}
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#94a3b8' }}>{title}</span>
    </div>
);

export default function LiveScoreView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [match, setMatch] = useState(null);
    const [liveData, setLiveData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('live');
    const [selectedInning, setSelectedInning] = useState(0);
    const [prediction, setPrediction] = useState(null);
    const [newBallFlash, setNewBallFlash] = useState(false);
    const [chartData, setChartData] = useState([]);
    const [overAnalytics, setOverAnalytics] = useState([]);
    const [matchAnalytics, setMatchAnalytics] = useState({ boundaries: [], dotRatios: [] });
    const [isPremium, setIsPremium] = useState(true);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [connected, setConnected] = useState(false);
    const [isConfiguring, setIsConfiguring] = useState(false);
    const [isScoring, setIsScoring] = useState(false);

    useEffect(() => {
        if (!match) return;

        // 1. Calculate Chart Data (Worm Chart)
        const chart = [];
        const inn1History = match.innings?.[0]?.ball_history || [];
        const inn2History = match.innings?.[1]?.ball_history || [];
        const maxBalls = Math.max(inn1History.length, inn2History.length);

        for (let i = 0; i < maxBalls; i++) {
            const dataPoint = { ballIndex: i };
            if (i < inn1History.length) {
                dataPoint.runs_inn1 = inn1History[i].score_at_ball;
            }
            if (i < inn2History.length) {
                dataPoint.runs_inn2 = inn2History[i].score_at_ball;
            }
            chart.push(dataPoint);
        }
        setChartData(chart);

        // 2. Calculate Over Analytics (Manhattan Chart)
        const overMap = {};

        // Innings 1
        inn1History.forEach(b => {
            const ov = b.over + 1; // 1-indexed
            if (!overMap[ov]) overMap[ov] = { over: ov };
            overMap[ov].Inn1 = (overMap[ov].Inn1 || 0) + (b.runs || 0);
        });

        // Innings 2
        inn2History.forEach(b => {
            const ov = b.over + 1;
            if (!overMap[ov]) overMap[ov] = { over: ov };
            overMap[ov].Inn2 = (overMap[ov].Inn2 || 0) + (b.runs || 0);
        });

        const sortedOvers = Object.values(overMap).sort((a, b) => a.over - b.over);
        setOverAnalytics(sortedOvers);

        // 3. Calculate Match Analytics (Boundary Breakdown)
        let fours = 0;
        let sixes = 0;
        let dots = 0;

        match.innings?.forEach(inn => {
            (inn.batsmen || []).forEach(bat => {
                fours += (bat.fours || 0);
                sixes += (bat.sixes || 0);
            });
            (inn.ball_history || []).forEach(b => {
                if (b.runs === 0 && !b.extra) {
                    dots++;
                }
            });
        });

        setMatchAnalytics({
            boundaries: [
                { name: 'Fours', value: fours, fill: '#10B981' },
                { name: 'Sixes', value: sixes, fill: '#fbbf24' }
            ],
            dotRatios: [
                { name: 'Dots', value: dots }
            ]
        });
    }, [match, liveData]);
    const scriptLoaded = useRef(false);
    const socketRef = useRef(null);
    const processedEvents = useRef(new Set());

    useEffect(() => {
        const fetchMatch = async () => {
            try {
                const res = await apiClient.get(`/matches/${id}`);
                const matchData = res.data?.match || res.data;
                setMatch(matchData);

                // Hydrate liveData from persisted live_data so scores show immediately
                if (matchData.live_data && Object.keys(matchData.live_data).length > 0) {
                    const ld = matchData.live_data;
                    setLiveData(prev => {
                        // Don't overwrite if a real-time socket event has already populated richer data
                        if (prev && prev._fromSocket) return prev;
                        return {
                            runs: ld.runs ?? 0,
                            wickets: ld.wickets ?? 0,
                            overNum: ld.overNum ?? 0,
                            ballInOver: ld.ballInOver ?? 0,
                            overs: ld.overNum !== undefined ? `${ld.overNum}.${ld.ballInOver || 0}` : (ld.overs ?? '0.0'),
                            run_rate: ld.run_rate ?? ld.crr ?? null,
                            inningsNum: ld.inningsNum ?? 1,
                            target: ld.target ?? null,
                            batting_team: ld.batting_team ?? 'A',
                            striker: ld.striker ?? null,
                            bowler: ld.bowler ?? null,
                            non_striker: ld.non_striker ?? null,
                            recent_balls: ld.recent_balls ?? ld.currentOverBalls ?? [],
                            currentOverBalls: ld.currentOverBalls ?? ld.recent_balls ?? [],
                            last_balls: ld.last_balls ?? ld.recent_balls ?? [],
                            partnership: ld.partnership ?? null,
                            required_run_rate: ld.required_run_rate ?? null,
                            runs_needed: ld.runs_needed ?? null,
                            balls_remaining: ld.balls_remaining ?? null,
                            win_probability: ld.win_probability ?? null,
                            commentary_log: matchData.commentary_log || ld.commentary_log || [],
                            batters: ld.batters ?? [],
                            bowlers: ld.bowlers ?? [],
                        };
                    });
                }

                setLoading(false);
            } catch (err) {
                setError(err);
                setLoading(false);
            }
        };
        fetchMatch();

        const socket = io(SOCKET_URL);
        socketRef.current = socket;
        socket.on('connect', () => {
            setConnected(true);
            socket.emit('join_match', String(id));
        });
        socket.on('disconnect', () => setConnected(false));

        const handleLiveContent = (data) => {
            setLiveData(prev => ({
                ...prev,
                ...data,
                commentary_log: data.commentary_log || prev?.commentary_log || [],
                _fromSocket: true
            }));
            if (data.newBall) {
                setNewBallFlash(true);
                setTimeout(() => setNewBallFlash(false), 700);
            }
        };

        socket.on('live_feed', handleLiveContent);
        
        socket.on('score_update', (data) => {
            const overNum = data.overs ?? data.overNum ?? 0;
            const ballInOver = data.balls ?? data.ballInOver ?? 0;
            const runs = data.runs ?? 0;
            const totalBalls = overNum * 6 + ballInOver;
            const crr = totalBalls > 0 ? (runs / (totalBalls / 6)).toFixed(2) : '0.00';
            handleLiveContent({
                runs,
                wickets: data.wickets ?? 0,
                overNum,
                ballInOver,
                overs: `${overNum}.${ballInOver}`,
                run_rate: crr,
                newBall: true,
                recent_balls: data.recent_balls || [],
                inningsNum: data.inningsNum || 1,
                target: data.target || null,
            });
        });

        socket.on('match_started', () => {
            toast.success('🚀 Match is now LIVE!');
            setMatch(prev => prev ? { ...prev, status: 'live' } : prev);
        });
        socket.on('innings_change', handleLiveContent);
        socket.on('match_end', (data) => {
            toast.success(`🏁 Match Ended! ${data.message}`);
            handleLiveContent(data);
        });

        const pollTimer = setInterval(fetchMatch, 8000);
        return () => {
            socket.disconnect();
            clearInterval(pollTimer);
        };
    }, [id]);


    /* ─── Payment handler ────────────────────────────────────────── */
    const handleSubscribe = async () => {
        if (!user) { setShowLoginModal(true); return; }
        try {
            toast.info('Preparing secure checkout...');
            const orderRes = await apiClient.post('/payments/create-order', {
                amount: 49,
                bookingId: `sub_${(id || 'match').slice(-8)}_${Date.now().toString().slice(-10)}`,
            });
            if (orderRes.data.success) {
                const options = {
                    key: orderRes.data.keyId,
                    amount: orderRes.data.order.amount,
                    currency: orderRes.data.order.currency,
                    name: 'The Turf Premium',
                    description: 'Annual Analytics Subscription',
                    order_id: orderRes.data.order.id,
                    handler: async (response) => {
                        try {
                            const verifyRes = await apiClient.post('/payments/verify-subscription', {
                                razorpayOrderId: response.razorpay_order_id,
                                razorpayPaymentId: response.razorpay_payment_id,
                                razorpaySignature: response.razorpay_signature,
                            });
                            if (verifyRes.data.success) { setIsPremium(true); toast.success('Welcome to Premium!'); }
                            else toast.error(verifyRes.data.message || 'Verification failed');
                        } catch { toast.error('Failed to verify payment'); }
                    },
                    prefill: { name: 'Player', email: 'user@example.com', contact: '9999999999' },
                    theme: { color: '#10B981' },
                    modal: { ondismiss: () => toast.warning('Payment cancelled') },
                };
                const rzp = new window.Razorpay(options);
                rzp.open();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Payment server unavailable');
        }
    };

    /* ─── Loading / Error ────────────────────────────────────────── */
    if (loading) return (
        <div style={{ ...styles.page, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            <div style={{
                width: 56, height: 56, borderRadius: '50%',
                border: '3px solid rgba(16,185,129,0.2)',
                borderTop: '3px solid #10b981',
                animation: 'spin 1s linear infinite',
            }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: '#10b981', textTransform: 'uppercase' }}>Connecting to live feed…</p>
        </div>
    );

    if (error && !match) return (
        <div style={{ ...styles.page, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <WifiOff size={48} style={{ color: '#475569' }} />
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0' }}>Broadcast Offline</h2>
            <p style={{ fontSize: 12, color: '#64748b' }}>Could not connect to match stream</p>
            <button onClick={() => navigate(-1)} style={{ marginTop: 8, padding: '10px 24px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, color: '#10b981', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>← Go Back</button>
        </div>
    );

    /* ─── Derived values ─────────────────────────────────────────── */
    const isCompleted = match.status === 'Completed';

    const isInningStarted = match.status !== 'Scheduled';
    const rawBatting = liveData?.batting_team || liveData?.battingTeam || 'A';
    const battingTeamDoc = (rawBatting === 'B' || liveData?.batting_team_idx === 1) ? match.team_b : match.team_a;

    const currentScore = {
        runs: liveData?.runs ?? (isInningStarted ? (battingTeamDoc?.score || 0) : 0),
        wickets: liveData?.wickets ?? (isInningStarted ? (battingTeamDoc?.wickets || 0) : 0),
        overs: liveData?.overNum !== undefined && liveData?.ballInOver !== undefined
            ? `${liveData.overNum}.${liveData.ballInOver}`
            : (liveData?.overs ?? '0.0'),
    };

    const parseTitleA = match.title?.includes('vs') ? match.title.split('vs')[0].trim() : null;
    const parseTitleB = match.title?.includes('vs') ? match.title.split('vs')[1].replace('— Quick Match', '').replace('- Quick Match', '').trim() : null;
    const teamAName = match.team_a?.team_id?.name || match.quick_teams?.team_a?.name || parseTitleA || 'Team A';
    const teamBName = match.team_b?.team_id?.name || match.quick_teams?.team_b?.name || parseTitleB || 'Team B';
    const teamAColor = match.quick_teams?.team_a?.colour || '#10B981';
    const teamBColor = match.quick_teams?.team_b?.colour || '#f43f5e';

    const lastBalls = (liveData?.last_balls || liveData?.recent_balls || liveData?.currentOverBalls || []).slice(-12);
    const winProb = liveData?.win_probability || prediction?.winProbability || 50;

    const tabs = [
        { id: 'live', label: 'Live Feed', icon: Radio },
        { id: 'scorecard', label: 'Scorecard', icon: BarChart3 },
        { id: 'analytics', label: 'Analytics', icon: TrendingUp, premium: true },
    ];

    /* ─── Helpers ────────────────────────────────────────────────── */
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload?.length) {
            return (
                <div style={{ background: 'rgba(7,26,15,0.95)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '10px 14px' }}>
                    {payload.map((p, i) => <p key={i} style={{ fontSize: 11, fontWeight: 700, color: p.color || '#10b981', margin: '2px 0' }}>{p.name}: {p.value}</p>)}
                </div>
            );
        }
        return null;
    };

    const tossWinnerId = match.toss?.won_by?._id || match.toss?.won_by;
    const teamAId = match.team_a?.team_id?._id || match.team_a?.team_id;
    const teamBId = match.team_b?.team_id?._id || match.team_b?.team_id;
    
    let tossWinnerName = '';
    if (tossWinnerId) {
        if (tossWinnerId.toString() === teamAId?.toString()) {
            tossWinnerName = teamAName;
        } else if (tossWinnerId.toString() === teamBId?.toString()) {
            tossWinnerName = teamBName;
        }
    }
    if (!tossWinnerName && match.toss?.won_by) {
        tossWinnerName = typeof match.toss.won_by === 'string' ? match.toss.won_by : (match.toss.won_by.name || '');
    }
    if (!tossWinnerName) {
        tossWinnerName = 'Toss Winner';
    }
    const tossDecision = match.toss?.decision;
    const isTossDecided = match.toss && tossDecision && tossDecision !== 'Pending';
    const isMatchLive = (
        (liveData?.runs > 0 || liveData?.wickets > 0 || liveData?.overNum > 0 || liveData?.ballInOver > 0) || 
        (match.live_data?.runs > 0 || match.live_data?.wickets > 0 || match.live_data?.overs_played > 0) ||
        (liveData?.striker || liveData?.bowler || match.live_data?.striker || match.live_data?.bowler)
    );

    const getSquadList = (teamKey) => {
        const team = match[teamKey];
        if (team?.squad && team.squad.length > 0) {
            return team.squad.map(p => p.name || p.display_name || 'Player');
        }
        const quickTeam = match.quick_teams?.[teamKey];
        if (quickTeam?.players && quickTeam.players.length > 0) {
            return quickTeam.players.map(p => p.display_name || p.name || p.input || 'Player');
        }
        return [];
    };

    const teamASquad = getSquadList('team_a');
    const teamBSquad = getSquadList('team_b');

    if (isTossDecided && !isMatchLive && !isCompleted) {
    return (
        <div style={styles.page}>
            <PostTossSetup match={match} tossWinnerName={tossWinnerName} tossDecision={tossDecision} />
        </div>
    );
}

    /* ─── Render ─────────────────────────────────────────────────── */
    return (
        <div style={styles.page}>
    <header style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px' }}>
        <button style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Share2 size={16} />
        </button>
    </header>

            <style>{`
                @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
                @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
                @keyframes flash { 0%,100%{background:rgba(255,255,255,0.03)} 50%{background:rgba(16,185,129,0.08)} }
                .tab-btn:hover { color: #e2e8f0 !important; }
                .score-row:hover { background: rgba(255,255,255,0.04) !important; }
            `}</style>

            <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 120px', position: 'relative', zIndex: 1 }}>

                {/* ── MATCH RESULT BANNER (completed) ── */}
                {isCompleted && (() => {
                    const res = match.result;
                    const teamAId = match.team_a?.team_id?._id || match.team_a?.team_id;
                    const teamBId = match.team_b?.team_id?._id || match.team_b?.team_id;
                    const winId = res?.winner?._id || res?.winner;
                    let winner = '';
                    if (winId) {
                        if (winId.toString() === teamAId?.toString()) winner = teamAName;
                        else if (winId.toString() === teamBId?.toString()) winner = teamBName;
                    }
                    if (!winner && res?.winner?.name) winner = res.winner.name;
                    if (!winner) {
                        const diff = (match.team_a?.score || 0) - (match.team_b?.score || 0);
                        if (diff > 0) winner = teamAName;
                        else if (diff < 0) winner = teamBName;
                        else winner = 'Tied';
                    }
                    return (
                        <div style={{ ...styles.glassStrong, padding: '28px 24px', marginBottom: 20, textAlign: 'center', animation: 'fadeIn 0.5s ease', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: 'radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%)', borderRadius: '50%' }} />
                            <Trophy size={40} style={{ color: '#fbbf24', marginBottom: 12, filter: 'drop-shadow(0 0 16px rgba(251,191,36,0.5))' }} />
                            <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>Match Concluded</p>
                            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fbbf24' }}>{winner} {res?.won_by !== 'Tie' ? 'WON' : 'TIED'}</h2>
                            {res?.margin && <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>by {res.margin} {res.won_by}</p>}

                            <div style={{ display: 'flex', justifyContent: 'center', gap: 40, marginTop: 20 }}>
                                <div>
                                    <p style={{ fontSize: 9, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{teamAName}</p>
                                    <p style={{ fontSize: 28, fontWeight: 800, color: '#e2e8f0', lineHeight: 1.1 }}>{match.team_a?.score}<span style={{ fontSize: 16, color: '#475569' }}>/{match.team_a?.wickets}</span></p>
                                </div>
                                <div style={{ width: 1, background: 'rgba(255,255,255,0.08)', alignSelf: 'stretch' }} />
                                <div>
                                    <p style={{ fontSize: 9, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{teamBName}</p>
                                    <p style={{ fontSize: 28, fontWeight: 800, color: '#e2e8f0', lineHeight: 1.1 }}>{match.team_b?.score}<span style={{ fontSize: 16, color: '#475569' }}>/{match.team_b?.wickets}</span></p>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* ── SCORE HERO CARD ── */}
                <div style={{
                    ...styles.glass,
                    padding: '28px 24px',
                    marginBottom: 16,
                    animation: newBallFlash ? 'flash 0.7s ease' : 'fadeIn 0.5s ease',
                    position: 'relative', overflow: 'hidden',
                }}>
                    {/* Glow */}
                    <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, background: `radial-gradient(circle, ${teamAColor}15 0%, transparent 70%)`, borderRadius: '50%', pointerEvents: 'none' }} />

                    {!isCompleted && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 20, padding: '4px 12px' }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }} />
                                <span style={{ fontSize: 9, fontWeight: 800, color: '#f87171', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Broadcasting Live</span>
                            </div>
                        </div>
                    )}

                    {/* Teams + score */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                        {/* Batting team score */}
                        <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: teamAColor, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
                                {teamAName}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                <span style={{ fontSize: 68, fontWeight: 900, color: '#f1f5f9', lineHeight: 1, letterSpacing: '-2px' }}>{currentScore.runs}</span>
                                <span style={{ fontSize: 32, fontWeight: 700, color: teamAColor, lineHeight: 1 }}>/{currentScore.wickets}</span>
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>({currentScore.overs} ov)</span>
                            </div>
                        </div>

                        {/* VS separator */}
                        <div style={{ textAlign: 'center', opacity: 0.4 }}>
                            <Swords size={20} style={{ color: '#94a3b8' }} />
                        </div>

                        {/* 2nd innings info */}
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: teamBColor, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
                                {teamBName}
                            </p>
                            {liveData?.inningsNum === 2 ? (
                                <>
                                    <p style={{ fontSize: 15, fontWeight: 700, color: teamBColor }}>Target: {liveData.target}</p>
                                    <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 10, padding: '6px 14px', marginTop: 6, display: 'inline-block' }}>
                                        <p style={{ fontSize: 13, fontWeight: 700, color: '#fca5a5' }}>Need {liveData.runs_needed} off {liveData.balls_remaining} balls</p>
                                    </div>
                                </>
                            ) : (
                                <p style={{ fontSize: 11, color: '#334155', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>2nd Innings Pending</p>
                            )}
                        </div>
                    </div>

                    {/* Run rate + player quick stats */}
                    <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
                        <StatChip label="CRR" value={liveData?.run_rate || '—'} accent="#10b981" />
                        <StatChip label="Striker" value={liveData?.striker?.name ? `${liveData.striker.name} ${liveData.striker.runs}(${liveData.striker.balls})` : '—'} accent="#e2e8f0" />
                        <StatChip label="Bowler" value={liveData?.bowler?.name ? `${liveData.bowler.name} ${liveData.bowler.w}-${liveData.bowler.r}` : '—'} accent="#f87171" />
                        {liveData?.inningsNum === 2 && <StatChip label="RRR" value={liveData?.required_run_rate || '—'} accent="#fbbf24" />}
                    </div>

                    {/* Recent balls */}
                    {lastBalls.length > 0 && (
                        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <p style={{ fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>This Over</p>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {lastBalls.map((ball, idx) => <BallBubble key={idx} val={ball} />)}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── WIN PROBABILITY STRIP ── */}
                <div style={{ ...styles.glassCard, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Zap size={14} style={{ color: '#fbbf24', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: teamAColor }}>{teamAName} {winProb}%</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: teamBColor }}>{100 - winProb}% {teamBName}</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${winProb}%`, background: `linear-gradient(90deg, ${teamAColor}, ${teamAColor}cc)`, borderRadius: 99, transition: 'width 1.5s ease' }} />
                        </div>
                    </div>
                    <span style={{ fontSize: 10, color: '#475569', fontWeight: 600, flexShrink: 0 }}>AI Win %</span>
                </div>

                {/* ── TABS ── */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: 'rgba(255,255,255,0.03)', padding: 5, borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)' }}>
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            className="tab-btn"
                            onClick={() => setActiveTab(t.id)}
                            style={{
                                flex: 1, padding: '10px 8px', borderRadius: 10, border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', transition: 'all 0.25s',
                                background: activeTab === t.id ? 'rgba(16,185,129,0.15)' : 'transparent',
                                color: activeTab === t.id ? '#10b981' : '#64748b',
                                outline: activeTab === t.id ? '1px solid rgba(16,185,129,0.25)' : '1px solid transparent',
                            }}
                        >
                            <t.icon size={13} />
                            {t.label}
                            {t.premium && <span style={{ fontSize: 8, background: 'rgba(251,191,36,0.2)', color: '#fbbf24', padding: '1px 5px', borderRadius: 4, fontWeight: 800 }}>PRO</span>}
                        </button>
                    ))}
                </div>

                {/* ── LIVE FEED TAB ── */}
                {activeTab === 'live' && (
                    <div style={{ animation: 'fadeIn 0.35s ease' }}>
                        {liveData?.commentary_log?.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <SectionHeader icon={Radio} title="Live Commentary" />
                                {[...liveData.commentary_log].reverse().map((entry, i) => {
                                    const isWicket = entry.text?.toUpperCase().includes('WICKET') || entry.text?.toUpperCase().includes('OUT');
                                    const isBoundary = entry.text?.toUpperCase().includes('FOUR') || entry.text?.toUpperCase().includes('SIX');
                                    return (
                                        <div key={i} className="score-row" style={{
                                            ...styles.glassCard,
                                            padding: '14px 16px',
                                            display: 'flex', gap: 14,
                                            borderColor: isWicket ? 'rgba(239,68,68,0.25)' : isBoundary ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
                                            transition: 'background 0.2s',
                                        }}>
                                            <div style={{ flexShrink: 0 }}>
                                                <div style={{
                                                    width: 38, height: 38, borderRadius: 10,
                                                    background: isWicket ? 'rgba(239,68,68,0.2)' : isBoundary ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                                                    border: `1px solid ${isWicket ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'}`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 13, fontWeight: 800,
                                                    color: isWicket ? '#f87171' : isBoundary ? '#34d399' : '#94a3b8',
                                                }}>
                                                    {entry.ball ?? '·'}
                                                </div>
                                                <p style={{ fontSize: 8, color: '#475569', textAlign: 'center', marginTop: 3, fontWeight: 600 }}>{entry.overs}</p>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                {(isWicket || isBoundary) && (
                                                    <span style={{
                                                        fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
                                                        color: isWicket ? '#f87171' : '#34d399', marginBottom: 4, display: 'block',
                                                    }}>
                                                        {isWicket ? '🏏 Wicket!' : '🔥 Boundary!'}
                                                    </span>
                                                )}
                                                <p style={{ fontSize: 13, fontWeight: 500, color: '#cbd5e1', lineHeight: 1.5 }}>
                                                    {entry.text?.split(' ').map((word, wi) => {
                                                        const upper = word.toUpperCase().replace(/[^A-Z]/g, '');
                                                        const highlight = ['FOUR', 'SIX', 'WICKET', 'OUT', 'BOUNDARY'].includes(upper);
                                                        return (
                                                            <span key={wi} style={{ color: highlight ? '#34d399' : 'inherit', fontWeight: highlight ? 800 : 'inherit' }}>
                                                                {word}{' '}
                                                            </span>
                                                        );
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div style={{ ...styles.glassCard, padding: '48px 24px', textAlign: 'center' }}>
                                <Radio size={40} style={{ color: '#334155', marginBottom: 12 }} />
                                <p style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Waiting for live commentary…</p>
                                <p style={{ fontSize: 11, color: '#334155', marginTop: 6 }}>Commentary will appear here as the match progresses</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── SCORECARD TAB ── */}
                {activeTab === 'scorecard' && (() => {
                    // Derive scorecard data from live_data.scorecard (populated during live scoring)
                    // Fall back to match.innings for completed matches, or liveData.batters for socket data
                    const sc = liveData?.scorecard || match.live_data?.scorecard || {};
                    const inn1sc = liveData?.inn1_scorecard || match.live_data?.inn1_scorecard || {};
                    const hasInn1 = inn1sc.batsmen?.length > 0 || inn1sc.score > 0;
                    const hasInnings = match.innings?.length > 0;
                    const showInningsSelector = hasInn1 || (hasInnings && match.innings.length > 1);

                    // Resolve batting data for current selected inning
                    let batsmen = [];
                    let bowlersList = [];
                    let inningScore = 0;
                    let inningWickets = 0;
                    let inningOvers = '0.0';
                    let inningExtras = 0;
                    let inningTeamName = teamAName;

                    if (selectedInning === 0 && hasInn1 && (liveData?.inningsNum === 2)) {
                        // Viewing innings 1 while innings 2 is live
                        batsmen = inn1sc.batsmen || [];
                        bowlersList = inn1sc.bowlers || [];
                        inningScore = inn1sc.score || 0;
                        inningWickets = inn1sc.wickets || 0;
                        inningOvers = inn1sc.overs || '0.0';
                        // Prefer explicit innings batting team if available
                        inningTeamName = (match.innings && match.innings[0] && match.innings[0].batting_team)
                            ? (String(match.innings[0].batting_team) === String(match.team_a?.team_id?._id) ? teamAName : teamBName)
                            : (match.toss?.battingFirst || teamAName);
                    } else if (selectedInning === 1 && hasInn1) {
                        // Viewing innings 2 (current live)
                        batsmen = sc.batsmen || [];
                        bowlersList = sc.bowlers || [];
                        inningScore = sc.total?.runs ?? liveData?.runs ?? 0;
                        inningWickets = sc.total?.wickets ?? liveData?.wickets ?? 0;
                        inningOvers = sc.total?.overs ?? currentScore.overs ?? '0.0';
                        // Prefer explicit innings batting team if available
                        inningTeamName = (match.innings && match.innings[1] && match.innings[1].batting_team)
                            ? (String(match.innings[1].batting_team) === String(match.team_a?.team_id?._id) ? teamAName : teamBName)
                            : (() => {
                                const battingFirstTeam = match.toss?.battingFirst || teamAName;
                                return battingFirstTeam === teamAName ? teamBName : teamAName;
                            })();
                    } else {
                        // Default: show current innings scorecard from live_data
                        batsmen = sc.batsmen?.length > 0 ? sc.batsmen : (liveData?.batters || []).map(b => ({
                            name: b.name,
                            runs: b.r ?? b.runs ?? 0,
                            balls: b.b ?? b.balls ?? 0,
                            fours: b.fours ?? b.f ?? 0,
                            sixes: b.sixes ?? b.s ?? 0,
                            sr: (b.b || b.balls) > 0 ? (((b.r || b.runs || 0) / (b.b || b.balls)) * 100).toFixed(1) : '0.0',
                            out: b.out || false,
                            batting: b.batting || false,
                            is_on_strike: b.is_on_strike || false,
                            dismissal: b.dismissal || null,
                        }));
                        bowlersList = sc.bowlers?.length > 0 ? sc.bowlers : (liveData?.bowlers || []).map(bw => ({
                            name: bw.name,
                            overs: bw.balls ? `${Math.floor(bw.balls / 6)}.${bw.balls % 6}` : '0.0',
                            maidens: bw.maidens || 0,
                            runs: bw.r ?? bw.runs ?? 0,
                            wickets: bw.w ?? bw.wickets ?? 0,
                            economy: bw.balls > 0 ? ((bw.r || bw.runs || 0) / ((bw.balls || 1) / 6)).toFixed(1) : '0.0',
                        }));
                        inningScore = sc.total?.runs ?? liveData?.runs ?? currentScore.runs;
                        inningWickets = sc.total?.wickets ?? liveData?.wickets ?? currentScore.wickets;
                        inningOvers = sc.total?.overs ?? currentScore.overs;
                        inningTeamName = (match.innings && match.innings[selectedInning] && match.innings[selectedInning].batting_team)
                            ? (String(match.innings[selectedInning].batting_team) === String(match.team_a?.team_id?._id) ? teamAName : teamBName)
                            : (match.toss?.battingFirst || teamAName);
                    }

                    // Also try match.innings as final fallback (completed matches)
                    if (batsmen.length === 0 && hasInnings && match.innings[selectedInning]?.batsmen?.length > 0) {
                        batsmen = match.innings[selectedInning].batsmen;
                    }
                    if (bowlersList.length === 0 && hasInnings && match.innings[selectedInning]?.bowlers?.length > 0) {
                        bowlersList = match.innings[selectedInning].bowlers;
                        inningScore = match.innings[selectedInning].score || inningScore;
                        inningWickets = match.innings[selectedInning].wickets || inningWickets;
                        inningOvers = match.innings[selectedInning].overs_completed || inningOvers;
                    }

                    const partnershipData = liveData?.partnership || match.live_data?.partnership;

                    return (
                    <div style={{ animation: 'fadeIn 0.35s ease' }}>
                        {/* Innings selector */}
                        {showInningsSelector && (
                            <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: 'rgba(255,255,255,0.03)', padding: 4, borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                                {[0, 1].map(idx => (
                                    <button key={idx} onClick={() => setSelectedInning(idx)} style={{
                                        flex: 1, padding: '9px', borderRadius: 9, border: 'none', cursor: 'pointer',
                                        fontSize: 11, fontWeight: 700,
                                        background: selectedInning === idx ? 'rgba(16,185,129,0.15)' : 'transparent',
                                        color: selectedInning === idx ? '#10b981' : '#475569',
                                        transition: 'all 0.2s',
                                    }}>
                                        {idx === 0 ? (match.toss?.battingFirst || teamAName) : (match.toss?.battingFirst === teamAName ? teamBName : teamAName)} Innings
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Score summary */}
                        <div style={{ ...styles.glassCard, padding: '12px 18px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{inningTeamName}</p>
                            <span style={{ fontSize: 13, fontWeight: 800, color: '#10b981' }}>
                                {inningScore}/{inningWickets}
                                <span style={{ fontSize: 11, color: '#475569', fontWeight: 600, marginLeft: 6 }}>({inningOvers})</span>
                            </span>
                        </div>

                        {/* Batting table */}
                        <div style={{ ...styles.glass, marginBottom: 12, overflow: 'hidden' }}>
                            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <SectionHeader icon={Shield} title="Batting" color="#10b981" />
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            {['Batter', 'R', 'B', '4s', '6s', 'SR'].map((h, i) => (
                                                <th key={h} style={{ padding: '10px 14px', fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: i === 0 ? 'left' : 'center' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {batsmen.map((b, i) => {
                                            const isStrike = b.is_on_strike || b.batting;
                                            const bRuns = b.runs ?? b.r ?? 0;
                                            const bBalls = b.balls ?? b.b ?? 0;
                                            const bFours = b.fours ?? b.f ?? 0;
                                            const bSixes = b.sixes ?? b.s ?? 0;
                                            const bSR = b.sr || (bBalls > 0 ? ((bRuns / bBalls) * 100).toFixed(1) : '0.0');
                                            return (
                                            <tr key={i} className="score-row" style={{
                                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                background: isStrike ? 'rgba(16,185,129,0.05)' : 'transparent',
                                                transition: 'background 0.2s',
                                            }}>
                                                <td style={{ padding: '12px 14px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        {isStrike && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', animation: 'pulse 1.5s infinite', flexShrink: 0 }} />}
                                                        <div>
                                                            <span style={{ fontSize: 13, fontWeight: isStrike ? 700 : 500, color: isStrike ? '#34d399' : '#cbd5e1' }}>{b.name || 'Player'}</span>
                                                            {b.dismissal && <p style={{ fontSize: 10, color: '#ef4444', marginTop: 2, fontWeight: 500 }}>{b.dismissal}</p>}
                                                            {b.out && !b.dismissal && <p style={{ fontSize: 10, color: '#ef4444', marginTop: 2, fontWeight: 500 }}>out</p>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 14, fontWeight: 800, color: '#f1f5f9' }}>{bRuns}</td>
                                                <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#475569' }}>{bBalls}</td>
                                                <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#10b981' }}>{bFours}</td>
                                                <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#34d399' }}>{bSixes}</td>
                                                <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#475569' }}>{bSR}</td>
                                            </tr>
                                            );
                                        })}
                                        {batsmen.length === 0 && (
                                            <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', fontSize: 12, color: '#334155' }}>No batting data yet</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Bowling table */}
                        <div style={{ ...styles.glass, marginBottom: 12, overflow: 'hidden' }}>
                            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <SectionHeader icon={Target} title="Bowling" color="#f43f5e" />
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            {['Bowler', 'O', 'M', 'R', 'W', 'Econ'].map((h, i) => (
                                                <th key={h} style={{ padding: '10px 14px', fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: i === 0 ? 'left' : 'center' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bowlersList.map((bw, i) => (
                                            <tr key={i} className="score-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }}>
                                                <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>{bw.name || 'Bowler'}</td>
                                                <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>{bw.overs || '0.0'}</td>
                                                <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#475569' }}>{bw.maidens || 0}</td>
                                                <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>{bw.runs ?? bw.r ?? 0}</td>
                                                <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 14, fontWeight: 800, color: '#f87171' }}>{bw.wickets ?? bw.w ?? 0}</td>
                                                <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#475569' }}>{bw.economy ?? bw.eco ?? '0.0'}</td>
                                            </tr>
                                        ))}
                                        {bowlersList.length === 0 && (
                                            <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', fontSize: 12, color: '#334155' }}>No bowling data yet</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Extras & Partnership */}
                        <div style={{ ...styles.glassCard, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <p style={{ fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 3 }}>Extras</p>
                                <p style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8' }}>{match.innings?.[selectedInning]?.extras || sc.extras?.total || 0}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 3 }}>Partnership</p>
                                <p style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>
                                    {partnershipData ? `${partnershipData.runs || 0}(${partnershipData.balls || 0})` : '—'}
                                </p>
                            </div>
                        </div>
                    </div>
                    );
                })()}

                {/* ── ANALYTICS TAB ── */}
                {activeTab === 'analytics' && (
                    <div style={{ animation: 'fadeIn 0.35s ease' }}>
                        {!isPremium ? (
                            <div style={{ ...styles.glassStrong, padding: '48px 24px', textAlign: 'center' }}>
                                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                    <Zap size={28} style={{ color: '#fbbf24' }} />
                                </div>
                                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#e2e8f0', marginBottom: 8 }}>Premium Analytics</h3>
                                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>Unlock Match Worm, Manhattan Charts,<br />AI Win Probability & MVP Predictions</p>
                                <button onClick={handleSubscribe} style={{
                                    padding: '13px 32px', borderRadius: 12, border: 'none', cursor: 'pointer',
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '0.05em',
                                    boxShadow: '0 8px 24px rgba(16,185,129,0.3)',
                                }}>
                                    Unlock for ₹49/year
                                </button>
                                <p style={{ fontSize: 10, color: '#334155', marginTop: 12 }}>All matches included · Cancel anytime</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {/* Manhattan Chart */}
                                <div style={{ ...styles.glass, padding: '20px' }}>
                                    <SectionHeader icon={BarChart3} title="Manhattan Chart — Runs per Over" />
                                    <div style={{ height: 200 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={overAnalytics} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                                                <XAxis dataKey="over" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Bar dataKey="Inn1" name={teamAName} fill={teamAColor} radius={[4, 4, 0, 0]} barSize={14} fillOpacity={0.85} />
                                                <Bar dataKey="Inn2" name={teamBName} fill={teamBColor} radius={[4, 4, 0, 0]} barSize={14} fillOpacity={0.85} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div style={{ display: 'flex', gap: 16, marginTop: 10, justifyContent: 'center' }}>
                                        {[{ name: teamAName, color: teamAColor }, { name: teamBName, color: teamBColor }].map(l => (
                                            <div key={l.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
                                                <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{l.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Worm Chart */}
                                <div style={{ ...styles.glass, padding: '20px' }}>
                                    <SectionHeader icon={TrendingUp} title="Match Worm — Cumulative Runs" />
                                    <div style={{ height: 200 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={teamAColor} stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor={teamAColor} stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={teamBColor} stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor={teamBColor} stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                                                <XAxis dataKey="ballIndex" tick={{ fill: '#475569', fontSize: 9 }} tickFormatter={v => Math.floor(v / 6) + '.' + (v % 6)} axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Area type="monotone" dataKey="runs_inn1" name={teamAName} stroke={teamAColor} strokeWidth={2} fillOpacity={1} fill="url(#gA)" dot={false} />
                                                <Area type="monotone" dataKey="runs_inn2" name={teamBName} stroke={teamBColor} strokeWidth={2} fillOpacity={1} fill="url(#gB)" dot={false} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Win probability + MVP */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div style={{ ...styles.glassCard, padding: '18px' }}>
                                        <p style={{ fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>AI Win Probability</p>
                                        <p style={{ fontSize: 36, fontWeight: 900, color: '#10b981', marginBottom: 10, lineHeight: 1 }}>{winProb}%</p>
                                        <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${winProb}%`, background: '#10b981', borderRadius: 99, transition: 'width 1s ease' }} />
                                        </div>
                                        <p style={{ fontSize: 10, color: '#334155', marginTop: 6 }}>{teamAName} leading</p>
                                    </div>

                                    <div style={{ ...styles.glassCard, padding: '18px' }}>
                                        <p style={{ fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>MVP Projection</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <Star size={20} style={{ color: '#fbbf24' }} />
                                            </div>
                                            <div>
                                                <p style={{ fontSize: 15, fontWeight: 800, color: '#e2e8f0' }}>{prediction?.mvp || '—'}</p>
                                                <p style={{ fontSize: 10, color: '#475569' }}>Best performer</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Boundary breakdown */}
                                <div style={{ ...styles.glass, padding: '20px' }}>
                                    <SectionHeader icon={Eye} title="Boundary Breakdown" />
                                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                        {matchAnalytics.boundaries.map(b => (
                                            <div key={b.name} style={{ flex: 1, minWidth: 80, ...styles.glassCard, padding: '14px 12px', textAlign: 'center' }}>
                                                <p style={{ fontSize: 24, fontWeight: 900, color: b.fill, lineHeight: 1 }}>{b.value}</p>
                                                <p style={{ fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>{b.name}</p>
                                            </div>
                                        ))}
                                        <div style={{ flex: 1, minWidth: 80, ...styles.glassCard, padding: '14px 12px', textAlign: 'center' }}>
                                            <p style={{ fontSize: 24, fontWeight: 900, color: '#ef4444', lineHeight: 1 }}>{matchAnalytics.dotRatios.find(d => d.name === 'Dots')?.value ?? 0}</p>
                                            <p style={{ fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>Dots</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </main>

            {/* ── BOTTOM BAR ── */}
            <div style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '12px 16px',
                background: 'rgba(2,12,7,0.95)',
                backdropFilter: 'blur(24px)',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                zIndex: 100,
            }}>
                <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: 12,
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.04)',
                            color: '#64748b',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            letterSpacing: '0.05em',
                        }}
                    >Home</button>

                    <button
                        onClick={() => { if (!isPremium) handleSubscribe(); else setActiveTab('analytics'); }}
                        style={{
                            flex: 3,
                            padding: '12px',
                            borderRadius: 12,
                            border: 'none',
                            cursor: 'pointer',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
                        }}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <Zap size={14} />
                            {isPremium ? 'Expert Analytics' : 'Unlock Analytics — ₹49/yr'}
                        </span>
                    </button>

                    <button
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: 12,
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.04)',
                            color: '#64748b',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            letterSpacing: '0.05em',
                        }}
                    >Share</button>
                </div>
</div>


            <CricBotWidget matchId={id} />
</div>

    );
}
