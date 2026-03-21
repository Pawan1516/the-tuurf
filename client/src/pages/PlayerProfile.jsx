import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Swords, Database, Trophy, ChevronLeft } from 'lucide-react';
import { matchesAPI } from '../api/client';

const PlayerProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [recentMatches, setRecentMatches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPlayerProfile = async () => {
            try {
                const res = await matchesAPI.getPlayerProfile(id);
                if (res.data.success) {
                    setProfile(res.data.player);
                    setRecentMatches(res.data.matches || []);
                }
            } catch (error) {
                console.error('Error fetching player profile:', error);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchPlayerProfile();
    }, [id]);

    if(loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-black animate-pulse">Loading Profiler...</div>;
    if(!profile) return <div className="min-h-screen flex items-center justify-center font-black">Player Not Found</div>;

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-24 md:pb-12">
            <div className="bg-emerald-600 text-white pt-12 pb-24 px-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10"><Trophy size={200} /></div>
                <div className="max-w-7xl mx-auto relative z-10">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-8 text-emerald-100 hover:text-white transition-colors text-sm font-black uppercase tracking-widest"><ChevronLeft size={16} /> Back</button>
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                        <div className="w-24 h-24 md:w-32 md:h-32 bg-white/20 rounded-full flex items-center justify-center border-4 border-white/30 backdrop-blur-sm">
                            <span className="text-4xl md:text-5xl font-black text-white">{profile?.name?.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="text-center md:text-left mt-2 relative">
                            <h1 className="text-4xl md:text-5xl font-black tracking-tight">{profile?.name}</h1>
                            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
                                <div className="bg-white/10 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest border border-white/20">{profile?.cricket_profile?.primary_role || 'All-Rounder'}</div>
                                <div className="bg-emerald-500 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest">{profile?.cricket_profile?.batting_style || 'Right Hand'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-6 -mt-10 relative z-20 space-y-12">
                <div className="grid grid-cols-1 gap-10">
                    {/* BATTING */}
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-gray-100 shadow-xl">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3 mb-10 text-emerald-600"><Swords size={16} /> Batting Arsenal</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                            <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-50 text-center"><p className="text-3xl font-black text-gray-900">{profile?.stats?.batting?.runs || 0}</p><p className="text-[8px] font-black text-emerald-600 uppercase">Runs</p></div>
                            <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-50 text-center"><p className="text-3xl font-black text-gray-900">{profile?.stats?.batting?.average || 0}</p><p className="text-[8px] font-black text-emerald-600 uppercase">Avg</p></div>
                            <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-50 text-center"><p className="text-3xl font-black text-gray-900">{profile?.stats?.batting?.strike_rate || 0}</p><p className="text-[8px] font-black text-emerald-600 uppercase">S/R</p></div>
                            <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-50 text-center"><p className="text-3xl font-black text-gray-900">{profile?.stats?.batting?.high_score || 0}</p><p className="text-[8px] font-black text-emerald-600 uppercase">Best</p></div>
                            <div className="bg-gray-50 p-4 rounded-3xl text-center"><p className="text-xl font-black text-gray-900">{profile?.stats?.batting?.fours || 0}</p><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">4s</p></div>
                            <div className="bg-gray-50 p-4 rounded-3xl text-center"><p className="text-xl font-black text-gray-900">{profile?.stats?.batting?.sixes || 0}</p><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">6s</p></div>
                            <div className="bg-gray-50 p-4 rounded-3xl text-center"><p className="text-xl font-black text-gray-900">{profile?.stats?.batting?.not_outs || 0}</p><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">NO</p></div>
                            <div className="bg-gray-50 p-4 rounded-3xl text-center"><p className="text-xl font-black text-gray-900">{profile?.stats?.batting?.matches || 0}</p><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Inns</p></div>
                        </div>
                    </div>

                    {/* BOWLING */}
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-gray-100 shadow-xl">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3 mb-10 text-emerald-600"><Database size={16} /> Bowling Command</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                            <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-50 text-center"><p className="text-3xl font-black text-gray-900">{profile?.stats?.bowling?.wickets || 0}</p><p className="text-[8px] font-black text-emerald-600 uppercase">Wkts</p></div>
                            <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-50 text-center"><p className="text-3xl font-black text-gray-900">{profile?.stats?.bowling?.economy || 0}</p><p className="text-[8px] font-black text-emerald-600 uppercase">Eco</p></div>
                            <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-50 text-center"><p className="text-3xl font-black text-gray-900">{profile?.stats?.bowling?.overs || 0}</p><p className="text-[8px] font-black text-emerald-600 uppercase">Overs</p></div>
                            <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-50 text-center"><p className="text-3xl font-black text-gray-900">{profile?.stats?.bowling?.best_bowling?.wickets || 0} / {profile?.stats?.bowling?.best_bowling?.runs || 0}</p><p className="text-[8px] font-black text-emerald-600 uppercase">Best</p></div>
                            <div className="bg-gray-50 p-4 rounded-3xl text-center"><p className="text-xl font-black text-gray-900">{profile?.stats?.bowling?.matches || 0}</p><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Inns</p></div>
                            <div className="bg-gray-50 p-4 rounded-3xl text-center"><p className="text-xl font-black text-gray-900">{profile?.stats?.bowling?.runs_conceded || 0}</p><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Runs</p></div>
                            <div className="bg-gray-50 p-4 rounded-3xl text-center"><p className="text-xl font-black text-gray-900">{profile?.stats?.bowling?.three_wicket_hauls || 0}</p><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">3W</p></div>
                            <div className="bg-gray-50 p-4 rounded-3xl text-center"><p className="text-xl font-black text-gray-900">{profile?.stats?.bowling?.five_wicket_hauls || 0}</p><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">5W</p></div>
                        </div>
                    </div>

                    {/* FIELDING */}
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-gray-100 shadow-xl">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3 mb-10 text-emerald-600"><Trophy size={16} /> Fielding Prowess</h3>
                        <div className="grid grid-cols-3 gap-4 md:gap-6">
                            <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-50 text-center"><p className="text-3xl font-black text-gray-900">{profile?.stats?.fielding?.catches || 0}</p><p className="text-[8px] font-black text-emerald-600 uppercase">Catches</p></div>
                            <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-50 text-center"><p className="text-3xl font-black text-gray-900">{profile?.stats?.fielding?.run_outs || 0}</p><p className="text-[8px] font-black text-emerald-600 uppercase">Run Outs</p></div>
                            <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-50 text-center"><p className="text-3xl font-black text-gray-900">{profile?.stats?.fielding?.stumpings || 0}</p><p className="text-[8px] font-black text-emerald-600 uppercase">Stumpings</p></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerProfile;
