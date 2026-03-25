import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Swords, Shield, Medal, ChevronLeft, Search, Star, Zap } from 'lucide-react';
import { leaderboardAPI } from '../api/client';

const Leaderboard = () => {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
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

    const filteredPlayers = players.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-6">
                <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                <p className="text-xs font-black text-emerald-500 uppercase tracking-[0.3em] animate-pulse">Calculating Rankings...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0F172A] text-white font-sans pb-20">
            {/* Header Section */}
            <div className="bg-gradient-to-b from-emerald-600/20 to-transparent pt-12 pb-24 px-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Trophy size={300} strokeWidth={1} />
                </div>
                
                <div className="max-w-4xl mx-auto relative z-10">
                    <button 
                        onClick={() => navigate('/')} 
                        className="flex items-center gap-2 mb-8 text-emerald-400 hover:text-emerald-300 transition-colors text-[10px] font-black uppercase tracking-widest"
                    >
                        <ChevronLeft size={16} /> Return to Turf
                    </button>
                    
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                <Star size={12} className="text-emerald-400 fill-emerald-400" />
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Global Rankings</span>
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none">
                                Gladiators<br/>
                                <span className="text-emerald-500">Leaderboard</span>
                            </h1>
                        </div>
                        
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-emerald-500 transition-colors" size={18} />
                            <input 
                                type="text"
                                placeholder="Search Gladiator..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 w-full md:w-64 outline-none focus:border-emerald-500/50 backdrop-blur-xl transition-all font-bold text-sm"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Top 3 Podium (Mobile-First Optimization) */}
            <div className="max-w-4xl mx-auto px-6 -mt-12 relative z-20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {filteredPlayers.slice(0, 3).map((player, index) => (
                        <div 
                            key={player._id}
                            onClick={() => navigate(`/player/${player._id}`)}
                            className={`relative group cursor-pointer transition-all duration-500 hover:-translate-y-2 ${
                                index === 0 ? 'order-first md:order-2 md:scale-110' : 
                                index === 1 ? 'order-2 md:order-1 mt-0 md:mt-4' : 
                                'order-3 mt-0 md:mt-4'
                            }`}
                        >
                            <div className={`p-8 rounded-[2.5rem] border-2 flex flex-col items-center text-center backdrop-blur-md shadow-2xl overflow-hidden ${
                                index === 0 ? 'bg-emerald-600/10 border-emerald-500/50' :
                                index === 1 ? 'bg-slate-800/50 border-slate-700/50' :
                                'bg-orange-900/10 border-orange-500/30'
                            }`}>
                                {/* Ranking Badge */}
                                <div className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center font-black border-2 ${
                                    index === 0 ? 'bg-yellow-400 text-black border-yellow-200' :
                                    index === 1 ? 'bg-slate-300 text-black border-white' :
                                    'bg-orange-500 text-white border-orange-200'
                                }`}>
                                    {index + 1}
                                </div>

                                <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6 relative group-hover:scale-110 transition-transform duration-500">
                                    <span className="text-3xl font-black text-white/20">{player.name.charAt(0)}</span>
                                    {index === 0 && <Medal className="absolute -top-3 -right-3 text-yellow-400 drop-shadow-lg" size={32} />}
                                </div>

                                <h3 className="text-xl font-black uppercase tracking-tight mb-2 truncate w-full">{player.name}</h3>
                                <div className="flex flex-col items-center gap-1">
                                    <p className="text-3xl font-black text-emerald-500 tabular-nums">{player.careerScore}</p>
                                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Career Points</p>
                                </div>
                                
                                <div className="mt-6 flex gap-3 opacity-40 group-hover:opacity-100 transition-opacity">
                                    <div className="flex items-center gap-1 text-[10px] font-bold"><Swords size={12} /> {player.stats?.batting?.runs || 0}</div>
                                    <div className="flex items-center gap-1 text-[10px] font-bold"><Shield size={12} /> {player.stats?.bowling?.wickets || 0}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* List View for 4+ */}
                <div className="space-y-3">
                    {filteredPlayers.slice(3).map((player, index) => (
                        <div 
                            key={player._id}
                            onClick={() => navigate(`/player/${player._id}`)}
                            className="bg-white/5 border border-white/5 hover:border-emerald-500/30 p-5 rounded-3xl flex items-center gap-4 cursor-pointer transition-all hover:bg-white/[0.08] hover:translate-x-1"
                        >
                            <span className="w-8 text-center text-xs font-black text-white/20">{index + 4}</span>
                            
                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-lg font-black text-white/10 uppercase">
                                {player.name.charAt(0)}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-black uppercase tracking-tight text-white/90 truncate">{player.name}</h4>
                                <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">{player.cricket_profile?.primary_role || 'All-Rounder'}</p>
                            </div>

                            <div className="text-right">
                                <p className="text-xl font-black text-emerald-500 leading-none">{player.careerScore}</p>
                                <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mt-1">PTS</p>
                            </div>
                        </div>
                    ))}
                    
                    {filteredPlayers.length === 0 && (
                        <div className="p-20 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                            <Zap className="mx-auto text-white/10 mb-4" size={48} />
                            <p className="text-sm font-black text-white/20 uppercase tracking-[0.2em]">No Gladiators found matching your search.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;
