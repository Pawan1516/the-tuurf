import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Save, Circle, EyeOff, ShieldAlert } from 'lucide-react';

const ScoringDashboard = () => {
    const { id } = useParams(); // Match ID
    const navigate = useNavigate();
    const [match, setMatch] = useState(null);
    const [score, setScore] = useState({
        runs: 0,
        wickets: 0,
        overs: 0,
        balls: 0
    });
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        // Fetch match data
        const loadMatch = async () => {
            try {
                const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
                const res = await axios.get(`http://localhost:5001/api/matches/${id}`, {
                    headers: { 'Authorization': token }
                });
                setMatch(res.data);
            } catch (error) {
                toast.error('Failed to load match details');
                navigate('/dashboard'); // or wherever appropriate
            }
        };

        loadMatch();

        // Connect WebSocket for live updates (simulated here)
        const newSocket = io('http://localhost:5001');
        setSocket(newSocket);

        return () => newSocket.close();
    }, [id, navigate]);

    // Ensure Match verification
    if (match && match.verification.status !== 'VERIFIED' && !match.is_offline_match) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
                <ShieldAlert className="w-16 h-16 text-red-500 mb-6" />
                <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-4">Verification Required</h1>
                
                <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl shadow-gray-200 border border-gray-100 mb-8 max-w-sm w-full">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-4">Official Match QR Code</p>
                    {match.verification?.qr_code?.qr_image ? (
                        <div className="bg-gray-50 p-4 rounded-3xl border-2 border-dashed border-gray-200 aspect-square flex items-center justify-center overflow-hidden">
                            <img 
                                src={match.verification.qr_code.qr_image}
                                alt="Match QR" 
                                className="w-full h-full object-contain"
                            />
                        </div>
                    ) : match.verification?.qr_code?.code ? (
                        <div className="aspect-square bg-gray-100 rounded-3xl flex flex-col items-center justify-center gap-3 p-4">
                            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest text-center">QR Image Unavailable</p>
                            <button 
                                onClick={async () => {
                                    try {
                                        const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
                                        const res = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/matches/${id}/generateqr`, {}, { headers: { Authorization: token } });
                                        if (res.data.qr_code) {
                                            setMatch(prev => ({ ...prev, verification: { ...prev.verification, qr_code: { ...prev.verification.qr_code, qr_image: res.data.qr_code } } }));
                                        }
                                    } catch(e) { toast.error('Could not refresh QR'); }
                                }}
                                className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-emerald-700 transition-all"
                            >
                                Refresh QR
                            </button>
                        </div>
                    ) : (
                        <div className="aspect-square bg-gray-100 rounded-3xl flex items-center justify-center text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                            Generating QR...
                        </div>
                    )}
                    <p className="mt-6 text-[11px] font-bold text-gray-400 leading-relaxed px-4">
                        Please present this QR to the <span className="text-gray-900 underline decoration-emerald-400 decoration-2">Turf Administrator</span> to unlock scoring.
                    </p>
                </div>

                <div className="flex flex-col gap-3 w-full max-w-xs">
                    <button onClick={() => window.location.reload()} className="bg-emerald-600 text-white w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200">
                        Check Verification
                    </button>
                    <button onClick={() => navigate('/dashboard')} className="bg-white text-gray-400 w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:text-gray-900 transition-all">
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (!match) {
        return <div className="min-h-screen flex items-center justify-center font-black uppercase tracking-widest text-emerald-600">Loading Scoring Interface...</div>;
    }

    // Handles Ball Entry
    const recordBall = async (runs, isWicket = false, extra = null) => {
        // Optimistic UI update
        const newBalls = score.balls + 1;
        const completeOver = newBalls === 6;
        
        setScore(prev => ({
            ...prev,
            runs: prev.runs + runs,
            wickets: prev.wickets + (isWicket ? 1 : 0),
            overs: prev.overs + (completeOver ? 1 : 0),
            balls: completeOver ? 0 : newBalls
        }));

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
            await axios.post(`http://localhost:5001/api/matches/${id}/ball`, {
                runs, isWicket, extra
            }, {
                headers: { 'Authorization': token }
            });

            // Emit to sockets (in a real scenario, the backend handles broadcasting)
            socket?.emit('match:update', { id, newScore: score });

            if (isWicket) toast.error('Wicket!', { icon: '🏏' });
            else if (runs === 4) toast.success('Boundary! 4 Runs', { icon: '⚡' });
            else if (runs === 6) toast.success('Maximum! 6 Runs', { icon: '🔥' });

        } catch (error) {
            toast.error('Failed to sync ball with server');
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20 md:pb-0">
            {/* Header */}
            <header className="bg-emerald-950 text-white p-6 md:p-8 flex flex-col md:flex-row justify-between items-center relative overflow-hidden shadow-2xl shadow-emerald-950/20">
                <div className="relative z-10 flex flex-col items-center md:items-start">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="bg-red-500 uppercase tracking-widest font-black text-[10px] px-3 py-1 rounded-full flex items-center gap-2 shadow-lg shadow-red-500/20 animate-pulse">
                            <Circle size={8} className="fill-white" /> LIVE SCOM
                        </span>
                        {match.is_offline_match && (
                            <span className="bg-yellow-500 text-black uppercase tracking-widest font-black text-[10px] px-3 py-1 rounded-full">OFFLINE MODE</span>
                        )}
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">{match.title || "Team A vs Team B"}</h1>
                    <p className="text-[10px] md:text-xs text-emerald-400 font-bold uppercase tracking-widest mt-2">{match.format || 'T20'} Match • {match.location}</p>
                </div>
                
                <div className="mt-8 md:mt-0 relative z-10 bg-white/10 backdrop-blur-md p-6 rounded-[2rem] border border-white/20 text-center shadow-inner min-w-[200px]">
                    <p className="text-[10px] text-emerald-300 font-black uppercase tracking-widest mb-1">Current Score</p>
                    <div className="flex justify-center items-end gap-2">
                        <h2 className="text-6xl font-black tracking-tighter">{score.runs}<span className="text-4xl text-white/50">/{score.wickets}</span></h2>
                    </div>
                    <p className="text-sm font-bold mt-2 text-white/80">Overs: {score.overs}.{score.balls}</p>
                </div>
            </header>

            <div className="max-w-5xl mx-auto p-4 md:p-8 grid md:grid-cols-2 gap-8">
                {/* Scoring Panel */}
                <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-gray-200/50 border border-gray-100">
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Record Next Play</h3>
                    
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        {[0, 1, 2, 3, 4, 6].map(run => (
                            <button
                                key={run}
                                onClick={() => recordBall(run)}
                                className={`h-20 rounded-2xl font-black text-2xl transition-all shadow-sm
                                    ${run === 4 || run === 6 
                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-600 hover:text-white hover:scale-105' 
                                        : 'bg-gray-50 text-gray-800 border-b-4 border-gray-200 hover:bg-gray-100 hover:border-gray-300 active:translate-y-1 active:border-b-0'
                                    }`}
                            >
                                {run}
                            </button>
                        ))}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => recordBall(0, true)}
                            className="h-16 bg-red-50 text-red-600 rounded-2xl font-black uppercase tracking-widest border border-red-200 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                        >
                            Wicket!
                        </button>
                        <button className="h-16 bg-yellow-50 text-yellow-600 rounded-2xl font-black uppercase tracking-widest border border-yellow-200 hover:bg-yellow-500 hover:text-white transition-all shadow-sm">
                            Wide
                        </button>
                        <button className="h-16 bg-blue-50 text-blue-600 rounded-2xl font-black uppercase tracking-widest border border-blue-200 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                            No Ball
                        </button>
                        <button className="h-16 bg-purple-50 text-purple-600 rounded-2xl font-black uppercase tracking-widest border border-purple-200 hover:bg-purple-600 hover:text-white transition-all shadow-sm">
                            Leg Bye
                        </button>
                    </div>
                </div>

                {/* Scorecard Summary Panel */}
                <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col">
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 flex justify-between items-center">
                        <span>Current Over</span>
                        <span className="text-emerald-500 text-[10px]">Bowler: Active</span>
                    </h3>
                    
                    <div className="flex gap-2 flex-wrap mb-8">
                        {/* Mock Over History */}
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex justify-center items-center font-black text-gray-600 shadow-inner">0</div>
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex justify-center items-center font-black text-emerald-600 shadow-inner">4</div>
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex justify-center items-center font-black text-gray-600 shadow-inner">1</div>
                        <div className="w-10 h-10 rounded-full bg-red-100 flex justify-center items-center font-black text-red-600 shadow-inner text-xs">W</div>
                        <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 flex justify-center items-center font-bold text-gray-300"></div>
                        <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 flex justify-center items-center font-bold text-gray-300"></div>
                    </div>

                    <div className="mt-auto space-y-4">
                        <button className="w-full bg-gray-900 text-white rounded-xl py-4 font-black uppercase text-xs tracking-widest hover:bg-black transition-all flex justify-center items-center gap-2 shadow-lg">
                            <Save size={16} /> Complete Innings
                        </button>
                        <button onClick={() => navigate('/dashboard')} className="w-full bg-transparent border-2 border-dashed border-gray-300 text-gray-500 rounded-xl py-4 font-black uppercase text-xs tracking-widest hover:border-gray-500 hover:text-gray-700 transition-all flex justify-center items-center gap-2">
                            <EyeOff size={16} /> Exit Scoring
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScoringDashboard;
