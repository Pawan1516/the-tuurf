import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { leaderboardAPI } from '../api/client';
import { Trophy as TrophyIcon, ChevronLeft as BackIcon, Search as SearchIcon, Star as StarIcon, Zap as ZapIcon, ChevronRight } from 'lucide-react';

const Leaderboard = () => {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeToggle, setActiveToggle] = useState('Leaderboard');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
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

    const filteredPlayers = players.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

    // Podium order: [Rank 2, Rank 1, Rank 3] (Original positions without filter)
    const topThree = [];
    if (players.length > 0) {
        if (players[1]) topThree.push({ ...players[1], rank: 2 });
        if (players[0]) topThree.push({ ...players[0], rank: 1 });
        if (players[2]) topThree.push({ ...players[2], rank: 3 });
    }

    const showPodium = !searchQuery && !isSearching;

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6">
                <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen premium-gradient text-slate-900 font-sans overflow-x-hidden pb-10">
            {/* Header - Operations Style */}
            <header className="px-8 pt-16 pb-8 flex items-center justify-between relative bg-white/70 backdrop-blur-xl border-b border-slate-100/50 sticky top-0 z-[60]">
                <button 
                    onClick={() => {
                        if (isSearching) {
                            setIsSearching(false);
                            setSearchQuery('');
                        } else {
                            navigate('/');
                        }
                    }}
                    className="p-3 bg-slate-900 text-white rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all z-10 relative"
                >
                    <BackIcon size={20} />
                </button>
                
                {isSearching ? (
                    <input 
                        type="text" 
                        autoFocus
                        placeholder="Search players..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 mx-4 bg-slate-50 border border-slate-200 px-5 py-2.5 rounded-full outline-none focus:border-emerald-500 transition-all text-sm font-semibold z-10 relative"
                    />
                ) : (
                    <h1 className="text-xl font-bold tracking-tight text-slate-800 absolute left-1/2 -translate-x-1/2">The Turf </h1>
                )}
                
                {!isSearching && (
                    <button 
                        onClick={() => setIsSearching(true)}
                        className="p-1 hover:bg-slate-100 rounded-full text-slate-600 transition-colors z-10 relative"
                    >
                        <SearchIcon size={26} />
                    </button>
                )}
            </header>

            {/* 3D Podium Section - Premium Hall of Fame */}
            {showPodium && (
                <div className="relative px-8 flex justify-center items-end gap-4 pt-32 pb-16 min-h-[480px] bg-transparent animate-in fade-in zoom-in duration-700">
                {topThree.map((player) => {
                    const isRank1 = player.rank === 1;
                    const isRank2 = player.rank === 2;
                    const isRank3 = player.rank === 3;

                    return (
                        <div 
                            key={player._id}
                            onClick={() => navigate(`/player/${player._id}`)}
                            className={`flex flex-col items-center cursor-pointer transition-all duration-500 hover:scale-105 ${
                                isRank1 ? 'w-[40%] z-20' : 'w-[28%] z-10'
                            }`}
                        >
                            {/* Avatar & Info Floating Above Block */}
                            <div className="flex flex-col items-center mb-8 w-full drop-shadow-2xl">
                                {isRank1 && (
                                    <div className="mb-4 animate-bounce">
                                        <TrophyIcon className="text-yellow-400 fill-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" size={48} />
                                    </div>
                                )}
                                
                                <div className={`relative mb-4 group`}>
                                    <div className={`rounded-[2.5rem] overflow-hidden border-4 bg-white shadow-2xl transition-all group-hover:rotate-6 ${
                                        isRank1 ? 'w-28 h-28 md:w-36 md:h-36 border-emerald-500' : 'w-20 h-20 md:w-24 md:h-24 border-white/50'
                                    }`}>
                                        {player.image ? (
                                            <img src={player.image} alt={player.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-400 to-emerald-600 font-black text-3xl text-white uppercase italic">
                                                {player.name.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    {isRank1 && (
                                        <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-slate-900 w-10 h-10 rounded-2xl flex items-center justify-center border-4 border-white shadow-lg">
                                            <StarIcon size={16} className="fill-slate-900" />
                                        </div>
                                    )}
                                </div>
                                
                                <span className={`text-center font-black tracking-tighter mb-2 truncate w-full uppercase ${isRank1 ? 'text-lg text-slate-900' : 'text-xs text-slate-500'}`}>
                                    {player.name}
                                </span>
                                
                                <div className={`${isRank1 ? 'bg-slate-900 text-white' : 'bg-white/50 text-slate-600'} px-4 py-1.5 rounded-2xl flex items-center gap-2 shadow-xl border border-white/20 backdrop-blur-md`}>
                                    <span className={`font-black tabular-nums ${isRank1 ? 'text-xs' : 'text-[10px]'}`}>
                                        {player.careerScore} <span className="opacity-40 uppercase tracking-widest ml-1 text-[8px]">XP</span>
                                    </span>
                                    <ZapIcon size={12} className={isRank1 ? 'text-emerald-400 fill-emerald-400' : 'text-slate-400'} />
                                </div>
                            </div>

                            {/* Stand - Operations Style Blocks */}
                            <div className="relative w-full">
                                <div 
                                    className={`w-full rounded-[2.5rem] transition-all shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] flex items-center justify-center font-black italic text-6xl md:text-8xl text-white/10 ${
                                        isRank1 ? 'h-64 bg-slate-900 border-t-2 border-white/10' : 
                                        'h-40 bg-white/40 backdrop-blur-xl border-t-2 border-white/60'
                                    }`}
                                >
                                    <span>{player.rank}</span>
                                </div>
                                {isRank1 && <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 to-transparent rounded-[2.5rem] pointer-events-none" />}
                            </div>
                        </div>
                    );
                })}
            </div>
            )}

            {/* List View - Hall of Fame Roster */}
            <div className={`px-8 py-16 space-y-4 max-w-2xl mx-auto ${searchQuery ? 'min-h-[500px]' : ''}`}>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-8 ml-2">Challengers Roster</h3>
                {(searchQuery ? filteredPlayers : players.slice(3)).map((player, index) => {
                    const displayRank = searchQuery ? (players.findIndex(p => p._id === player._id) + 1) : index + 4;
                    const completion = Math.min(100, (player.careerScore / (players[0]?.careerScore || 1)) * 100);

                    return (
                        <div 
                            key={player._id}
                            onClick={() => navigate(`/player/${player._id}`)}
                            className="glass-card p-6 rounded-[2rem] flex items-center gap-6 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all group"
                        >
                            <span className="text-[18px] font-black text-slate-200 italic w-8 tracking-tighter">#{displayRank}</span>
                            
                            <div className="w-16 h-16 rounded-[1.5rem] overflow-hidden bg-slate-100 border-2 border-white/50 shadow-inner group-hover:rotate-6 transition-all">
                                {player.image ? (
                                    <img src={player.image} alt={player.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-emerald-500/10 text-emerald-600 font-black text-xl italic">
                                        {player.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <h4 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-tight mb-1">{player.name}</h4>
                                <div className="flex items-center gap-2">
                                    <div className="h-1 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                         <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${completion}%` }} />
                                    </div>
                                    <span className="text-[11px] font-black text-emerald-600 tabular-nums">{player.careerScore} <span className="opacity-40 uppercase tracking-widest text-[8px]">XP</span></span>
                                </div>
                            </div>

                            <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                        </div>
                    );
                })}

                {filteredPlayers.length === 0 && searchQuery && (
                    <div className="py-24 text-center text-slate-200 flex flex-col items-center gap-4 animate-in fade-in duration-300">
                        <SearchIcon size={56} className="opacity-20 text-slate-400" />
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">No players found</p>
                    </div>
                )}

                {players.length <= 3 && !searchQuery && (
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
