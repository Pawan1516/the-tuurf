import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Swords, Search, ChevronLeft, Zap, Shield, Target, Activity, BarChart as BarChartIcon } from 'lucide-react';
import { matchesAPI } from '../api/client';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Cell } from 'recharts';

const PlayerComparison = () => {
    const { id } = useParams(); // Current player
    const [searchParams] = useSearchParams();
    const p2Id = searchParams.get('vs'); // Competitor ID
    
    const navigate = useNavigate();
    const [player1, setPlayer1] = useState(null);
    const [player2, setPlayer2] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [comparing, setComparing] = useState(false);

    const fetchPlayerData = async () => {
        try {
            setLoading(true);
            const res1 = await matchesAPI.getPlayerProfile(id);
            if (res1.data.success) setPlayer1(res1.data.player);

            if (p2Id) {
                const res2 = await matchesAPI.getPlayerProfile(p2Id);
                if (res2.data.success) setPlayer2(res2.data.player);
            }
        } catch (error) {
            console.error('Combatants load failure:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlayerData();
    }, [id, p2Id]);

    const handleSearch = async (val) => {
        setSearchQuery(val);
        if (val.length < 2) return setSearchResults([]);
        try {
            const res = await matchesAPI.searchPlayer(val);
            if (res.data.success) setSearchResults(res.data.players.filter(p => p._id !== id));
        } catch (error) {
            console.error('Search failure:', error);
        }
    };

    const radarData = [
        { subject: 'Runs', A: player1?.stats?.batting?.runs || 0, B: player2?.stats?.batting?.runs || 0, fullMark: Math.max(player1?.stats?.batting?.runs || 0, player2?.stats?.batting?.runs || 2000, 1) },
        { subject: 'S/R', A: player1?.stats?.batting?.strike_rate || 0, B: player2?.stats?.batting?.strike_rate || 0, fullMark: 250 },
        { subject: 'Avg', A: player1?.stats?.batting?.average || 0, B: player2?.stats?.batting?.average || 0, fullMark: 100 },
        { subject: 'Wkts', A: (player1?.stats?.bowling?.wickets || 0) * 10, B: (player2?.stats?.bowling?.wickets || 0) * 10, fullMark: 1000 },
        { subject: 'Inns', A: (player1?.stats?.batting?.matches || 0) * 5, B: (player2?.stats?.batting?.matches || 0) * 5, fullMark: 500 },
    ];

    const barData = [
        { name: 'Runs', p1: player1?.stats?.batting?.runs || 0, p2: player2?.stats?.batting?.runs || 0 },
        { name: 'S/Rate', p1: player1?.stats?.batting?.strike_rate || 0, p2: player2?.stats?.batting?.strike_rate || 0 },
        { name: 'Avg', p1: player1?.stats?.batting?.average || 0, p2: player2?.stats?.batting?.average || 0 },
        { name: 'Wkts', p1: player1?.stats?.bowling?.wickets || 0, p2: player2?.stats?.bowling?.wickets || 0 },
    ];

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center font-black text-emerald-500 animate-pulse uppercase tracking-widest text-xl">Initializing Face-Off...</div>;

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans pb-24 overflow-x-hidden">
            {/* HEADER */}
            <div className="bg-slate-900/50 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50 px-6 py-6">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest group">
                        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back
                    </button>
                    <div className="flex flex-col items-center">
                        <h1 className="text-xl md:text-3xl font-black uppercase tracking-tighter italic"><span className="text-emerald-500">Player</span> vs <span className="text-slate-400">Gladiator</span></h1>
                        <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.4em] mt-1">Combat Intel v1.0</span>
                    </div>
                    <div className="w-16"></div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-6 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
                
                {/* COMBATANTS SECTION */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="relative group">
                         <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-blue-600 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                         <div className="relative bg-slate-900 rounded-[2.5rem] p-8 border border-white/5 space-y-8">
                            {/* PLAYER 1 */}
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center border-2 border-emerald-500/30 overflow-hidden">
                                     {player1?.image ? <img src={player1.image} alt={player1.name} className="w-full h-full object-cover" /> : <span className="text-3xl font-black text-emerald-500">{player1?.name?.charAt(0)}</span>}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black tracking-tight">{player1?.name}</h2>
                                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none bg-emerald-500/10 px-2 py-0.5 rounded-full">Challenger</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-center py-4 relative grow">
                                <div className="h-px bg-white/10 w-full absolute"></div>
                                <div className="w-12 h-12 bg-white text-slate-900 rounded-full flex items-center justify-center font-black italic relative z-10 shadow-2xl border-4 border-slate-900">VS</div>
                            </div>

                            {/* PLAYER 2 SEARCH/DISPLAY */}
                            {!player2 ? (
                                <div className="space-y-4">
                                     <div className="relative">
                                         <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                                         <input 
                                            type="text" 
                                            placeholder="Summon Opponent (Name/Phone)" 
                                            className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-white/10"
                                            value={searchQuery}
                                            onChange={(e) => handleSearch(e.target.value)}
                                         />
                                     </div>
                                     {searchResults.length > 0 && (
                                         <div className="bg-slate-800 rounded-2xl border border-white/5 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                                            {searchResults.map(p => (
                                                <button 
                                                    key={p._id} 
                                                    onClick={() => navigate(`/player/compare/${id}?vs=${p._id}`)}
                                                    className="w-full p-4 flex items-center gap-4 hover:bg-white/10 transition-colors border-b border-white/5 text-left"
                                                >
                                                    <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center font-black">{p.name.charAt(0)}</div>
                                                    <div>
                                                        <p className="text-sm font-black">{p.name}</p>
                                                        <p className="text-[10px] text-white/30 font-bold">{p.phone}</p>
                                                    </div>
                                                </button>
                                            ))}
                                         </div>
                                     )}
                                     <div className="p-8 border-2 border-dashed border-white/5 rounded-3xl text-center">
                                         <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] leading-relaxed italic">Search above to find an opponent for data comparison.</p>
                                     </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center border-2 border-blue-500/30 overflow-hidden relative">
                                        <button onClick={() => navigate(`/player/compare/${id}`)} className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center text-[8px] font-black uppercase transition-all backdrop-blur-sm">Change</button>
                                         {player2?.image ? <img src={player2.image} alt={player2.name} className="w-full h-full object-cover" /> : <span className="text-3xl font-black text-blue-500">{player2?.name?.charAt(0)}</span>}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black tracking-tight">{player2?.name}</h2>
                                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded-full">Opponent</span>
                                    </div>
                                </div>
                            )}
                         </div>
                    </div>
                    
                    {player2 && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-900 p-6 rounded-3xl border border-white/5 text-center">
                                <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Win Probability</p>
                                <p className="text-3xl font-black text-emerald-500">{Math.round((player1?.stats?.batting?.runs || 0) / ((player1?.stats?.batting?.runs || 0) + (player2?.stats?.batting?.runs || 0) || 1) * 100)}%</p>
                            </div>
                            <div className="bg-slate-900 p-6 rounded-3xl border border-white/5 text-center">
                                <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Form Rating</p>
                                <p className="text-3xl font-black text-blue-500">{((player1?.stats?.batting?.average || 0) > (player2?.stats?.batting?.average || 0)) ? 'A+' : 'A'}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* GRAPH SECTION */}
                <div className="lg:col-span-8 space-y-8">
                    {!player2 ? (
                        <div className="h-full min-h-[600px] flex flex-col items-center justify-center bg-slate-900/30 rounded-[3rem] border-2 border-dashed border-white/5 animate-pulse">
                            <Swords size={60} className="text-white/10 mb-6" />
                            <h3 className="text-xl font-black text-white/20 uppercase tracking-[0.3em]">Awaiting Challenger Data...</h3>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in fade-in duration-700">
                             {/* RADAR OVERVIEW */}
                             <div className="bg-slate-900 rounded-[3rem] p-10 border border-white/5 overflow-hidden">
                                <div className="flex items-center justify-between mb-12">
                                    <h3 className="text-xs font-black text-emerald-500 uppercase tracking-[0.3em] flex items-center gap-3"><Zap size={16} /> Power Comparison</h3>
                                    <div className="flex items-center gap-4 text-[10px] font-black uppercase">
                                        <div className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div> {player1.name}</div>
                                        <div className="flex items-center gap-2"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> {player2.name}</div>
                                    </div>
                                </div>
                                
                                <div className="h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                            <PolarGrid stroke="#ffffff10" />
                                            <PolarAngleAxis dataKey="subject" stroke="#ffffff40" fontSize={12} fontWeight={900} />
                                            <PolarRadiusAxis angle={30} domain={[0, 100]} hide />
                                            <Radar name={player1.name} dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                                            <Radar name={player2.name} dataKey="B" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                                            <Tooltip content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-slate-800 p-4 rounded-2xl shadow-2xl border border-white/10 text-[10px] font-black uppercase">
                                                            <p className="text-emerald-400 mb-2">{payload[0].name}: {payload[0].value}</p>
                                                            <p className="text-blue-400">{payload[1].name}: {payload[1].value}</p>
                                                        </div>
                                                    )
                                                }
                                                return null;
                                            }} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                             </div>

                             {/* BAR STATS COMPARISON */}
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-slate-900 rounded-[2.5rem] p-8 border border-white/5">
                                    <h3 className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-3 mb-8"><Shield size={16} /> Statistical Edge</h3>
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={barData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                                                <XAxis dataKey="name" stroke="#ffffff20" fontSize={10} fontWeight={900} />
                                                <YAxis hide />
                                                <Tooltip cursor={{ fill: 'transparent' }} content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        return (
                                                            <div className="bg-slate-800 p-4 rounded-2xl shadow-2xl border border-white/10 text-[10px] font-black uppercase">
                                                                <p className="text-emerald-400 mb-1">{payload[0].value}</p>
                                                                <p className="text-blue-400">{payload[1].value}</p>
                                                            </div>
                                                        )
                                                    }
                                                    return null;
                                                }} />
                                                <Bar dataKey="p1" fill="#10b981" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="p2" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="bg-slate-900 rounded-[2.5rem] p-8 border border-white/5 space-y-6">
                                    <h3 className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-3 mb-8"><Target size={16} /> Head-to-Head Intel</h3>
                                    <div className="space-y-4">
                                        {[
                                            { label: 'Primary Role', p1: player1.cricket_profile?.primary_role || 'All Rounder', p2: player2.cricket_profile?.primary_role || 'All Rounder' },
                                            { label: 'Batting Style', p1: player1.cricket_profile?.batting_style || 'Right Hand', p2: player2.cricket_profile?.batting_style || 'Right Hand' },
                                            { label: 'Consistency', p1: player1.stats?.batting?.average > 30 ? 'High' : 'Medium', p2: player2.stats?.batting?.average > 30 ? 'High' : 'Medium' },
                                            { label: 'Impact Player', p1: player1.stats?.batting?.runs > 500 ? 'YES' : 'NO', p2: player2.stats?.batting?.runs > 500 ? 'YES' : 'NO' }
                                        ].map((item, idx) => (
                                            <div key={idx} className="flex flex-col gap-2 p-4 bg-white/5 rounded-2xl border border-white/5">
                                                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">{item.label}</span>
                                                <div className="flex justify-between items-center text-[10px] font-black uppercase italic">
                                                    <span className="text-emerald-400">{item.p1}</span>
                                                    <span className="text-white/10 px-2 font-not-italic">vs</span>
                                                    <span className="text-blue-400">{item.p2}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                             </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlayerComparison;
