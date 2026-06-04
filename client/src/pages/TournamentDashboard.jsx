import React, { useState, useEffect } from 'react';
import { Trophy, Users, Calendar, MapPin, ChevronRight, Award, Plus, BarChart3, Star } from 'lucide-react';
import apiClient from '../api/client';
import { toast } from 'react-toastify';

const TournamentDashboard = () => {
    const [tournaments, setTournaments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTournaments();
    }, []);

    const fetchTournaments = async () => {
        try {
            const res = await apiClient.get('/tournaments/list'); // I'll need to add this route
            setTournaments(res.data.tournaments || []);
        } catch (err) {
            console.error("Tournament Sync Fail:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white text-black p-6 font-sans">
            {/* Header Node */}
            <div className="flex items-center justify-between mb-12">
                <div>
                    <h1 className="text-4xl font-black uppercase italic tracking-tighter">Grand <span className="text-emerald-600">Arena</span></h1>
                    <p className="text-[10px] font-black text-black/20 uppercase tracking-[0.3em]">Tournament Command Center</p>
                </div>
                <button className="p-4 bg-emerald-600 rounded-2xl shadow-2xl shadow-emerald-500/20 hover:scale-110 transition-transform">
                    <Plus size={24} className="text-black" />
                </button>
            </div>

            {/* Active Tournaments Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {tournaments.map((t, idx) => (
                    <div key={idx} className="bg-white/5 backdrop-blur-3xl rounded-[3rem] border border-white/10 p-8 hover:bg-white/10 transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/10 rounded-full blur-[50px] -mr-16 -mt-16 group-hover:bg-emerald-600/20 transition-colors" />
                        
                        <div className="flex items-start justify-between mb-6">
                            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                                <Trophy size={28} className="text-emerald-500" />
                            </div>
                            <span className="px-4 py-1.5 bg-emerald-600/20 border border-emerald-600/30 rounded-full text-[9px] font-black uppercase tracking-widest text-emerald-400">
                                {t.status}
                            </span>
                        </div>

                        <h3 className="text-2xl font-black uppercase tracking-tighter mb-2 italic">{t.name}</h3>
                        <div className="flex items-center gap-2 text-black/40 mb-6">
                            <MapPin size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">{t.location}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <p className="text-[9px] font-black text-black/20 uppercase tracking-widest mb-1">Teams</p>
                                <p className="text-xl font-black">{t.registeredTeams?.length}/{t.totalTeams}</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <p className="text-[9px] font-black text-black/20 uppercase tracking-widest mb-1">Type</p>
                                <p className="text-xl font-black uppercase italic">{t.matchType}</p>
                            </div>
                        </div>

                        <button className="w-full py-5 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 flex items-center justify-center gap-3 group/btn transition-all">
                            <span className="text-[10px] font-black uppercase tracking-widest">Enter Arena</span>
                            <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Global Leaderboard Node */}
            <div className="mt-16">
                <div className="flex items-center gap-4 mb-8">
                    <BarChart3 size={20} className="text-emerald-500" />
                    <h2 className="text-xl font-black uppercase italic tracking-widest">Elite Leaderboard</h2>
                </div>
                
                <div className="bg-white/5 backdrop-blur-3xl rounded-[3.5rem] border border-white/10 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="p-8 text-[10px] font-black text-black/20 uppercase tracking-widest">Rank</th>
                                <th className="p-8 text-[10px] font-black text-black/20 uppercase tracking-widest">Operator</th>
                                <th className="p-8 text-[10px] font-black text-black/20 uppercase tracking-widest">Node</th>
                                <th className="p-8 text-[10px] font-black text-black/20 uppercase tracking-widest text-right">Intel Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[1, 2, 3].map((r) => (
                                <tr key={r} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="p-8 font-black text-2xl italic text-emerald-500">#{r}</td>
                                    <td className="p-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                                                <Star size={16} className={r === 1 ? 'text-yellow-500' : 'text-black/40'} />
                                            </div>
                                            <span className="font-black uppercase tracking-tighter">Elite Player {r}</span>
                                        </div>
                                    </td>
                                    <td className="p-8 text-[10px] font-black text-black/40 uppercase tracking-widest">Team Alpha</td>
                                    <td className="p-8 text-right font-black text-xl italic">{2500 - (r * 300)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TournamentDashboard;
