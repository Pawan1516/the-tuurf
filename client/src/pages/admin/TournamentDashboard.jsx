import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Users, Calendar, MapPin, ChevronRight, Award, Plus, BarChart3, Star, Settings } from 'lucide-react';
import apiClient from '../../api/client';
import { toast } from 'react-toastify';
import AuthContext from '../../context/AuthContext';
import AdminSidebar from '../../components/AdminSidebar';

const TournamentDashboard = () => {
    const [tournaments, setTournaments] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        fetchTournaments();
    }, []);

    const fetchTournaments = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/tournaments/list');
            setTournaments(res.data.tournaments || []);
        } catch (err) {
            console.error("Tournament Sync Fail:", err);
            toast.error("Failed to sync tournament ecosystem.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6">
            <div className="relative">
                <div className="w-24 h-24 border-4 border-blue-100 border-t-emerald-600 rounded-full animate-spin"></div>
                <Trophy className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600 animate-pulse" size={32} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Accessing Arena Registries...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F1F5F9] flex font-sans selection:bg-emerald-600/20">
            <AdminSidebar user={user} logout={logout} />

            <main className="flex-1 overflow-y-auto pb-24 relative custom-scrollbar">
                {/* BI Style Top Bar */}
                <header className="bg-white border-b border-slate-200 sticky top-0 z-[40] px-10 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div>
                            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                                <Trophy className="text-emerald-600" size={26} /> 
                                Tournament Hub <span className="text-slate-400">/ Core Command</span>
                            </h1>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Grand Arena Ecosystem v2.1</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <button 
                            onClick={() => navigate('/tournaments/create')}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 italic"
                        >
                            <Plus size={18} />
                            Create Tournament
                        </button>
                    </div>
                </header>

                <div className="max-w-[1600px] mx-auto p-10 space-y-10">
                    {/* Active Tournaments Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {tournaments.map((t, idx) => (
                            <div key={idx} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 hover:shadow-lg transition-all group relative overflow-hidden flex flex-col justify-between min-h-[350px]">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 rounded-full blur-[50px] -mr-16 -mt-16 group-hover:bg-emerald-600/10 transition-colors" />
                                
                                <div>
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm">
                                            <Trophy size={28} className="text-emerald-600" />
                                        </div>
                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                            t.status === 'ongoing' ? 'bg-red-50 text-red-600 border border-red-100' :
                                            t.status === 'completed' ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                                            'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                        }`}>
                                            {t.status}
                                        </span>
                                    </div>

                                    <h3 className="text-2xl font-black uppercase tracking-tighter mb-2 italic text-slate-900 leading-tight">{t.name}</h3>
                                    <div className="flex items-center gap-2 text-slate-400 mb-6">
                                        <MapPin size={12} className="text-emerald-600" />
                                        <span className="text-[10px] font-black uppercase tracking-wider">{t.location || 'The Turf Arena'}</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Teams</p>
                                            <p className="text-xl font-black text-slate-900">{t.registeredTeams?.length || 0}/{t.totalTeams}</p>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Type</p>
                                            <p className="text-xl font-black uppercase italic text-slate-900">{t.matchFormat || t.matchType || 'T20'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => navigate(`/tournaments/${t._id}/admin`)}
                                        className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/10"
                                    >
                                        <Settings size={14} />
                                        Manage
                                    </button>
                                    <button 
                                        onClick={() => navigate(`/tournaments/${t._id}`)}
                                        className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                                    >
                                        <span>View Page</span>
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {tournaments.length === 0 && (
                            <div className="col-span-full bg-white rounded-[2.5rem] border border-slate-200 p-16 text-center">
                                <Trophy size={48} className="text-slate-300 mx-auto mb-4" />
                                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">No Tournaments Active</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-2 mb-6">Deploy a new tournament structure to get started</p>
                                <button 
                                    onClick={() => navigate('/tournaments/create')}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest"
                                >
                                    Launch Wizard
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TournamentDashboard;
