import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, ChevronLeft, Search, Star, Zap } from 'lucide-react';
import { leaderboardAPI } from '../api/client';

const Leaderboard = () => {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeToggle, setActiveToggle] = useState('Leaderboard');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await leaderboardAPI.getOverall();
                if (res.data.success) {
                    setPlayers(res.data.players);
                }
            } catch (error) {
                console.error('Error fetching leaderboard:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    // Podium order: [Rank 2, Rank 1, Rank 3]
    const topThree = [];
    if (players.length > 0) {
        if (players[1]) topThree.push({ ...players[1], rank: 2 });
        if (players[0]) topThree.push({ ...players[0], rank: 1 });
        if (players[2]) topThree.push({ ...players[2], rank: 3 });
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#121217] flex flex-col items-center justify-center gap-6">
                <div className="w-10 h-10 border-4 border-white/10 border-t-white rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#121217] text-white font-sans overflow-x-hidden pb-20">
            {/* Header */}
            <header className="px-6 pt-12 pb-6 flex items-center justify-center relative">
                <button 
                    onClick={() => navigate('/')}
                    className="absolute left-6 top-12 p-1 hover:bg-white/5 rounded-full"
                >
                    <ChevronLeft size={28} />
                </button>
                <h1 className="text-xl font-medium tracking-wide">The Turf Squad</h1>
            </header>

            {/* Toggle Switch */}
            <div className="px-6 mb-12">
                <div className="flex bg-[#1C1C24] p-1.5 rounded-2xl max-w-sm mx-auto">
                    {['Team members', 'Leaderboard'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveToggle(tab)}
                            className={`flex-1 py-3.5 rounded-xl text-sm font-medium transition-all ${
                                activeToggle === tab ? 'bg-[#32323D] text-white shadow-xl' : 'text-white/40'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* 3D Podium Section */}
            <div className="relative px-6 flex justify-center items-end gap-2 pt-24 pb-8 min-h-[400px]">
                {topThree.map((player) => {
                    const isRank1 = player.rank === 1;
                    const isRank2 = player.rank === 2;
                    const isRank3 = player.rank === 3;

                    return (
                        <div 
                            key={player._id}
                            onClick={() => navigate(`/player/${player._id}`)}
                            className={`flex flex-col items-center cursor-pointer transition-all duration-500 hover:scale-105 ${
                                isRank1 ? 'w-[36%] z-20' : 'w-[28%] z-10'
                            }`}
                        >
                            {/* Avatar & Info Floating Above Block */}
                            <div className="flex flex-col items-center mb-6 w-full">
                                {isRank1 && (
                                    <div className="mb-2 animate-bounce">
                                        <Trophy className="text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" size={32} />
                                    </div>
                                )}
                                
                                <div className={`relative mb-3 group`}>
                                    <div className={`rounded-full overflow-hidden border-2 bg-[#1C1C24] ${
                                        isRank1 ? 'w-20 h-20 md:w-24 md:h-24 border-yellow-500/50' : 'w-16 h-16 md:w-18 md:h-18 border-white/10'
                                    }`}>
                                        {player.image ? (
                                            <img src={player.image} alt={player.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 font-bold text-xl uppercase italic">
                                                {player.name.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <span className={`text-center font-bold tracking-tight mb-1 truncate w-full ${isRank1 ? 'text-[13px]' : 'text-[11px]'} text-white/90`}>
                                    {player.name}
                                </span>
                                
                                <div className="bg-[#262631] px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg border border-white/5">
                                    <span className="text-[10px] md:text-[12px] font-black tabular-nums">
                                        {player.careerScore}
                                    </span>
                                    <Zap size={10} className="text-orange-500 fill-orange-500" />
                                </div>
                            </div>

                            {/* 3D Block Stand */}
                            <div className="relative w-full perspective-[1000px]">
                                <div 
                                    className={`w-full rounded-t-xl transition-all shadow-[-10px_0_30px_rgba(0,0,0,0.5)] flex items-center justify-center font-black italic text-4xl md:text-5xl text-white/10 ${
                                        isRank1 ? 'h-48 bg-gradient-to-b from-[#3D3D4D] to-[#1C1C24] border-t border-white/10' : 
                                        isRank2 ? 'h-36 bg-gradient-to-b from-[#2D2D38] to-[#1C1C24] border-t border-white/5' : 
                                        'h-28 bg-gradient-to-b from-[#22222D] to-[#1C1C24] border-t border-white/5'
                                    }`}
                                >
                                    {player.rank}
                                </div>
                                {/* Top Lid Shadow */}
                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/5 overflow-hidden rounded-t-xl" />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* List View */}
            <div className="px-6 py-8 space-y-3 max-w-lg mx-auto bg-[#1C1C24] rounded-t-[3rem] mt-4 min-h-[500px]">
                {players.slice(3).map((player, index) => {
                    const displayRank = index + 4;
                    const completion = Math.min(100, (player.careerScore / (players[0]?.careerScore || 1)) * 100);

                    return (
                        <div 
                            key={player._id}
                            onClick={() => navigate(`/player/${player._id}`)}
                            className="bg-[#262631] p-5 rounded-3xl flex items-center gap-5 cursor-pointer hover:bg-[#2D2D3D] transition-all border border-white/5 group shadow-xl"
                        >
                            <span className="text-[15px] font-black text-white/20 italic w-4">{displayRank}.</span>
                            
                            <div className="w-14 h-14 rounded-full overflow-hidden bg-black/40 border border-white/5 shadow-inner">
                                {player.image ? (
                                    <img src={player.image} alt={player.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-indigo-900/50 text-indigo-200 font-bold uppercase italic shadow-inner">
                                        {player.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <h4 className="text-[17px] font-bold text-white tracking-tight truncate leading-tight mb-1">{player.name}</h4>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[12px] font-bold text-white/40 uppercase tracking-widest">{player.careerScore} pts</span>
                                    <span className="w-1 h-1 bg-white/10 rounded-full" />
                                    <span className="text-[12px] font-bold text-orange-400">Streak 🔥</span>
                                </div>
                            </div>

                            {/* Percentage Circle Visual */}
                            <div className="relative w-12 h-12 flex items-center justify-center">
                                <svg className="w-full h-full -rotate-90">
                                    <circle cx="24" cy="24" r="20" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                                    <circle 
                                        cx="24" cy="24" r="20" fill="transparent" stroke={completion > 70 ? "#10b981" : "#f59e0b"} 
                                        strokeWidth="4" strokeDasharray={`${(completion * 125) / 100} 125`}
                                        strokeLinecap="round" className="transition-all duration-1000 delay-300"
                                    />
                                </svg>
                                <span className="absolute text-[10px] font-black italic">{Math.round(completion)}%</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Custom Bottom Tab (Matching the Image feel) */}
            <div className="fixed bottom-0 left-0 right-0 h-20 bg-[#121217]/95 backdrop-blur-2xl border-t border-white/5 z-50 px-8 flex items-center justify-between">
                {[
                    { icon: Zap, label: 'Arena' },
                    { icon: Trophy, label: 'League', active: true },
                    { icon: Star, label: 'My Stats' },
                    { icon: Search, label: 'Scout' }
                ].map((item, i) => (
                    <div key={i} className={`flex flex-col items-center gap-1 ${item.active ? 'text-white' : 'text-white/20'}`}>
                        <item.icon size={22} strokeWidth={item.active ? 2.5 : 2} />
                        <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Leaderboard;
