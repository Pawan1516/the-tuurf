import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { leaderboardAPI } from '../api/client';
import apiClient from '../api/client';
import { Trophy as TrophyIcon, ChevronLeft as BackIcon, Search as SearchIcon, Star as StarIcon, Zap as ZapIcon, ChevronRight, Award } from 'lucide-react';

const Leaderboard = () => {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const navigate = useNavigate();

    // Tournament Filtering States
    const [tournaments, setTournaments] = useState([]);
    const [selectedTournament, setSelectedTournament] = useState('');
    const [tournamentLbs, setTournamentLbs] = useState(null);
    const [activeCategory, setActiveCategory] = useState('orangeCap'); // orangeCap | purpleCap | mvp | mostSixes | mostFours | bestStrikeRate | bestEconomy | mostCatches

    const LB_TABS = [
        { id: 'orangeCap', label: '🟠 Orange Cap', stat: 'runs', statLabel: 'Runs' },
        { id: 'purpleCap', label: '🟣 Purple Cap', stat: 'wickets', statLabel: 'Wickets' },
        { id: 'mvp', label: '⭐ MVP', stat: 'mvpScore', statLabel: 'XP' },
        { id: 'mostSixes', label: '💥 Sixes', stat: 'sixes', statLabel: 'Sixes' },
        { id: 'mostFours', label: '4️⃣ Fours', stat: 'fours', statLabel: 'Fours' },
        { id: 'bestStrikeRate', label: '⚡ Strike Rate', stat: 'strikeRate', statLabel: 'SR' },
        { id: 'bestEconomy', label: '📉 Economy', stat: 'economy', statLabel: 'Eco' },
        { id: 'mostCatches', label: '🧤 Catches', stat: 'catches', statLabel: 'Catches' },
    ];

    // Load tournaments list
    useEffect(() => {
        apiClient.get('/tournaments/list')
            .then(res => {
                if (res.data.success) {
                    setTournaments(res.data.tournaments || []);
                }
            })
            .catch(err => console.error('Error fetching tournaments list:', err));
    }, []);

    // Load overall global leaderboard by default
    useEffect(() => {
        if (selectedTournament) return;
        
        const fetchLeaderboard = async () => {
            setLoading(true);
            try {
                const res = await leaderboardAPI.getOverall();
                if (res.data.success) {
                    setPlayers(res.data.players || []);
                }
            } catch (error) {
                console.error('Error fetching leaderboard:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, [selectedTournament]);

    // Load tournament-specific leaderboards if selected
    useEffect(() => {
        if (!selectedTournament) {
            setTournamentLbs(null);
            return;
        }

        const fetchTournamentLeaderboards = async () => {
            setLoading(true);
            try {
                const res = await apiClient.get(`/tournaments/${selectedTournament}/leaderboards`);
                if (res.data.success) {
                    setTournamentLbs(res.data.leaderboards);
                }
            } catch (error) {
                console.error('Error fetching tournament leaderboards:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchTournamentLeaderboards();
    }, [selectedTournament]);

    // Determine current active player roster based on overall vs tournament selection
    const getActiveRoster = () => {
        if (selectedTournament) {
            return tournamentLbs?.[activeCategory] || [];
        }
        return players;
    };

    const activeRoster = getActiveRoster();
    const currentTabInfo = LB_TABS.find(t => t.id === activeCategory);

    // Map roster items for display
    const mappedRoster = activeRoster.map((p) => {
        const scoreVal = selectedTournament ? (p[currentTabInfo.stat] || 0) : (p.careerScore || 0);
        return {
            _id: p.player_id?._id || p.player_id || p._id,
            name: p.name || 'Player',
            image: p.avatar || p.image || '',
            score: scoreVal
        };
    });

    const filteredPlayers = mappedRoster.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

    // Podium order: [Rank 2, Rank 1, Rank 3]
    const topThree = [];
    if (filteredPlayers.length > 0) {
        if (filteredPlayers[1]) topThree.push({ ...filteredPlayers[1], rank: 2 });
        if (filteredPlayers[0]) topThree.push({ ...filteredPlayers[0], rank: 1 });
        if (filteredPlayers[2]) topThree.push({ ...filteredPlayers[2], rank: 3 });
    }

    const showPodium = !searchQuery && !isSearching && filteredPlayers.length > 0;

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6">
                <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-black font-sans overflow-x-hidden pb-10">
            {/* Header - Premium Navigation Bar */}
            <header className="px-8 pt-10 pb-6 bg-white border-b border-slate-100 sticky top-0 z-[60] flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <button 
                        onClick={() => {
                            if (isSearching) {
                                setIsSearching(false);
                                setSearchQuery('');
                            } else {
                                navigate('/');
                            }
                        }}
                        className="p-3 bg-slate-50 hover:bg-slate-100 text-black rounded-2xl transition-all"
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
                            className="flex-1 mx-4 bg-slate-50 border border-slate-200 px-5 py-2.5 rounded-full outline-none focus:border-emerald-500 transition-all text-sm font-semibold"
                        />
                    ) : (
                        <h1 className="text-xl font-black tracking-tight text-black flex items-center gap-2">
                            🏆 Leaderboard
                        </h1>
                    )}
                    
                    {!isSearching && (
                        <button 
                            onClick={() => setIsSearching(true)}
                            className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 transition-colors"
                        >
                            <SearchIcon size={20} />
                        </button>
                    )}
                </div>

                {/* Tournament Filter Dropdown */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 w-full sm:w-auto">
                        <Award size={16} className="text-emerald-600" />
                        <select
                            value={selectedTournament}
                            onChange={(e) => setSelectedTournament(e.target.value)}
                            className="bg-transparent text-xs font-black uppercase tracking-wider text-slate-700 outline-none cursor-pointer w-full"
                        >
                            <option value="">All-Time / Overall Platform</option>
                            {tournaments.map(t => (
                                <option key={t._id} value={t._id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Category tabs for tournament leaderboards */}
                    {selectedTournament && (
                        <div className="flex gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
                            {LB_TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveCategory(tab.id)}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                                        activeCategory === tab.id
                                            ? 'bg-black text-white'
                                            : 'bg-black/5 text-slate-500 hover:bg-black/10'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </header>

            {/* 3D Podium Section - Premium Hall of Fame */}
            {showPodium ? (
                <div className="relative px-8 flex justify-center items-end gap-4 pt-20 pb-12 min-h-[420px] bg-transparent animate-in fade-in zoom-in duration-500">
                    {topThree.map((player) => {
                        const isRank1 = player.rank === 1;
                        const isRank2 = player.rank === 2;
                        const isRank3 = player.rank === 3;

                        return (
                            <div 
                                key={player._id}
                                onClick={() => player._id && navigate(`/player/${player._id}`)}
                                className={`flex flex-col items-center cursor-pointer transition-all duration-500 hover:scale-105 ${
                                    isRank1 ? 'w-[40%] z-20' : 'w-[28%] z-10'
                                }`}
                            >
                                {/* Avatar & Info Floating Above Block */}
                                <div className="flex flex-col items-center mb-6 w-full drop-shadow-xl">
                                    {isRank1 && (
                                        <div className="mb-3 animate-bounce">
                                            <TrophyIcon className="text-amber-400 fill-amber-400" size={36} />
                                        </div>
                                    )}
                                    
                                    <div className="relative mb-3 group">
                                        <div className={`rounded-3xl overflow-hidden border-4 bg-white shadow-xl transition-all group-hover:rotate-6 ${
                                            isRank1 ? 'w-24 h-24 md:w-32 md:h-32 border-emerald-500' : 'w-16 h-16 md:w-20 md:h-20 border-white'
                                        }`}>
                                            {player.image ? (
                                                <img src={player.image} alt={player.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-400 to-emerald-600 font-black text-2xl text-white uppercase italic">
                                                    {player.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        {isRank1 && (
                                            <div className="absolute -bottom-1 -right-1 bg-amber-400 text-black w-8 h-8 rounded-xl flex items-center justify-center border-2 border-white shadow">
                                                <StarIcon size={12} className="fill-zinc-900" />
                                            </div>
                                        )}
                                    </div>
                                    
                                    <span className={`text-center font-black tracking-tighter mb-1.5 truncate w-full uppercase ${isRank1 ? 'text-sm text-black' : 'text-[10px] text-slate-400'}`}>
                                        {player.name}
                                    </span>
                                    
                                    <div className={`${isRank1 ? 'bg-white text-black border-slate-200' : 'bg-white/70 text-slate-400 border-transparent'} px-3 py-1 rounded-xl flex items-center gap-1.5 shadow border text-[10px] font-black`}>
                                        <span className="tabular-nums">
                                            {player.score} <span className="opacity-40 uppercase tracking-widest text-[8px] ml-0.5">
                                                {selectedTournament ? currentTabInfo.statLabel : 'XP'}
                                            </span>
                                        </span>
                                        <ZapIcon size={10} className={isRank1 ? 'text-emerald-500 fill-emerald-500' : 'text-slate-400'} />
                                    </div>
                                </div>

                                {/* Stand - Operations Style Blocks */}
                                <div className="relative w-full">
                                    <div 
                                        className={`w-full rounded-3xl transition-all shadow-md flex items-center justify-center font-black italic text-5xl md:text-7xl text-slate-300 ${
                                            isRank1 ? 'h-48 bg-white border-t border-slate-100' : 
                                            'h-32 bg-white/70 backdrop-blur-xl border-t border-white'
                                        }`}
                                    >
                                        <span>{player.rank}</span>
                                    </div>
                                    {isRank1 && <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent rounded-3xl pointer-events-none" />}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : null}

            {/* List View - Hall of Fame Roster */}
            <div className="px-8 py-8 space-y-3 max-w-2xl mx-auto">
                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">
                    {selectedTournament ? `${currentTabInfo.label} Leaderboard` : 'Challengers Roster'}
                </h3>
                
                {(searchQuery ? filteredPlayers : filteredPlayers.slice(3)).map((player, index) => {
                    const displayRank = searchQuery 
                        ? (mappedRoster.findIndex(p => p._id === player._id) + 1) 
                        : index + 4;
                    const maxScore = mappedRoster[0]?.score || 1;
                    const completion = Math.min(100, (player.score / maxScore) * 100);

                    return (
                        <div 
                            key={player._id}
                            onClick={() => player._id && navigate(`/player/${player._id}`)}
                            className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] transition-all group"
                        >
                            <span className="text-sm font-black text-slate-300 italic w-8 text-center">#{displayRank}</span>
                            
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-50 border shadow-inner group-hover:rotate-6 transition-all">
                                {player.image ? (
                                    <img src={player.image} alt={player.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-emerald-500/10 text-emerald-600 font-black text-sm italic">
                                        {player.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-black text-black tracking-tighter uppercase leading-tight mb-1">{player.name}</h4>
                                <div className="flex items-center gap-2">
                                    <div className="h-1 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                         <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${completion}%` }} />
                                    </div>
                                    <span className="text-[10px] font-black text-emerald-600 tabular-nums">
                                        {player.score} <span className="opacity-40 uppercase tracking-widest text-[7px] ml-0.5">
                                            {selectedTournament ? currentTabInfo.statLabel : 'XP'}
                                        </span>
                                    </span>
                                </div>
                            </div>

                            <ChevronRight size={16} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                        </div>
                    );
                })}

                {filteredPlayers.length === 0 && (
                    <div className="py-20 text-center flex flex-col items-center gap-3">
                        <TrophyIcon size={48} className="text-slate-300" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">No players found</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Leaderboard;



