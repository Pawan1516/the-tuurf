import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { leaderboardAPI } from '../api/client';
import { Trophy as TrophyIcon, ChevronLeft as BackIcon, Search as SearchIcon, Star as StarIcon, Zap as ZapIcon } from 'lucide-react';

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
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6">
                <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-x-hidden pb-10">
            {/* Header */}
            <header className="px-6 pt-12 pb-6 flex items-center justify-center relative bg-white border-b border-slate-100">
                <button 
                    onClick={() => navigate('/')}
                    className="absolute left-6 top-12 p-1 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
                >
                    <BackIcon size={28} />
                </button>
                <h1 className="text-xl font-bold tracking-tight text-slate-800">The Turf </h1>
                <button className="absolute right-6 top-12 p-1 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
                    <SearchIcon size={26} />
                </button>
            </header>

            {/* 3D Podium Section - Green & White Theme */}
            <div className="relative px-6 flex justify-center items-end gap-3 pt-24 pb-12 min-h-[420px] bg-white border-b border-slate-100 shadow-sm">
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
                            <div className="flex flex-col items-center mb-6 w-full drop-shadow-lg">
                                {isRank1 && (
                                    <div className="mb-2 animate-bounce">
                                        <TrophyIcon className="text-yellow-500 fill-yellow-500" size={32} />
                                    </div>
                                )}
                                
                                <div className={`relative mb-3`}>
                                    <div className={`rounded-full overflow-hidden border-4 bg-white shadow-xl ${
                                        isRank1 ? 'w-24 h-24 md:w-28 md:h-28 border-emerald-500' : 'w-18 h-18 md:w-20 md:h-20 border-white'
                                    }`}>
                                        {player.image ? (
                                            <img src={player.image} alt={player.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100 font-black text-2xl text-emerald-700 uppercase italic">
                                                {player.name.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <span className={`text-center font-black tracking-tight mb-1 truncate w-full ${isRank1 ? 'text-[15px]' : 'text-[12px]'} text-slate-800`}>
                                    {player.name}
                                </span>
                                
                                <div className={`${isRank1 ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600'} px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md border border-slate-100`}>
                                    <span className="text-[10px] md:text-[12px] font-black tabular-nums">
                                        {player.careerScore} pts
                                    </span>
                                    <ZapIcon size={12} className={isRank1 ? 'text-yellow-300 fill-yellow-300' : 'text-orange-500 fill-orange-500'} />
                                </div>
                            </div>

                            {/* 3D Block Stand - Green/Gray Gradients */}
                            <div className="relative w-full perspective-[1000px]">
                                <div 
                                    className={`w-full rounded-t-2xl transition-all shadow-xl flex items-center justify-center font-black italic text-5xl md:text-6xl text-white/50 ${
                                        isRank1 ? 'h-52 bg-gradient-to-b from-emerald-500 to-emerald-700 border-t border-emerald-400' : 
                                        isRank2 ? 'h-40 bg-gradient-to-b from-slate-200 to-slate-300 border-t border-white' : 
                                        'h-32 bg-gradient-to-b from-slate-200 to-slate-400 border-t border-white shadow-inner'
                                    }`}
                                >
                                    <span className={isRank1 ? 'text-white/20' : 'text-slate-400/30'}>{player.rank}</span>
                                </div>
                                {/* Top Highlight */}
                                <div className={`absolute top-0 left-0 right-0 h-1.5 overflow-hidden rounded-t-2xl ${isRank1 ? 'bg-white/20' : 'bg-white/50'}`} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* List View - Clean White Style */}
            <div className="px-5 py-10 space-y-4 max-w-lg mx-auto min-h-[500px]">
                {players.slice(3).map((player, index) => {
                    const displayRank = index + 4;
                    const completion = Math.min(100, (player.careerScore / (players[0]?.careerScore || 1)) * 100);

                    return (
                        <div 
                            key={player._id}
                            onClick={() => navigate(`/player/${player._id}`)}
                            className="bg-white p-4 rounded-3xl flex items-center gap-5 cursor-pointer hover:bg-slate-50 transition-all border border-slate-100 shadow-sm hover:shadow-md group active:scale-[0.98]"
                        >
                            <span className="text-[15px] font-black text-slate-300 italic w-5">{displayRank}.</span>
                            
                            <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-50 border-2 border-slate-100 shadow-inner group-hover:border-emerald-200 transition-colors">
                                {player.image ? (
                                    <img src={player.image} alt={player.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-emerald-600 font-black italic shadow-inner">
                                        {player.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <h4 className="text-[17px] font-bold text-slate-800 tracking-tight truncate leading-tight mb-1">{player.name}</h4>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[12px] font-black text-emerald-600 uppercase tracking-widest">{player.careerScore} pts</span>
                                    {completion > 70 && <span className="text-[12px] font-bold text-orange-500 animate-pulse">Hot 🔥</span>}
                                </div>
                            </div>

                            <div className="text-right">
                                <p className="text-[16px] font-black text-emerald-600">#{displayRank}</p>
                            </div>
                        </div>
                    );
                })}

                {players.length <= 3 && (
                    <div className="py-24 text-center text-slate-200 flex flex-col items-center gap-4">
                        <TrophyIcon size={56} className="opacity-10" />
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-300">New Gladiators Joining soon...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Leaderboard;
