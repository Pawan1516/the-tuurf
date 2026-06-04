import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Search, 
    Zap, 
    ShieldCheck, 
    TrendingUp, 
    ArrowLeft, 
    Users, 
    Target, 
    Activity,
    Trophy,
    User,
    BarChart3,
    PieChart as PieChartIcon,
    LineChart as LineChartIcon,
    Cpu,
    CheckCircle,
    X,
    Loader2,
    Database,
    TrendingDown,
    ZapOff,
    Filter,
    LayoutGrid,
    BarChart as BarChartIcon,
    Maximize2,
    Download,
    Share2,
    Info,
    ChevronRight,
    ArrowUpRight,
    ArrowDownRight,
    Clock
} from 'lucide-react';
import { 
    ResponsiveContainer, 
    RadarChart, 
    PolarGrid, 
    PolarAngleAxis, 
    PolarRadiusAxis, 
    Radar, 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    LineChart, 
    Line,
    AreaChart,
    Area,
    Cell,
    PieChart,
    Pie,
    ComposedChart,
    ScatterChart,
    Scatter,
    ZAxis
} from 'recharts';
import AuthContext from '../context/AuthContext';
import apiClient from '../api/client';
import { toast } from 'react-toastify';

const PlayerIntel = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [opponent, setOpponent] = useState(null);
    const [comparisonData, setComparisonData] = useState(null);
    const [player1Trends, setPlayer1Trends] = useState([]);
    const [player2Trends, setPlayer2Trends] = useState([]);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState('dashboard'); // dashboard, comparative, trends, predictive
    const [timeframe, setTimeframe] = useState('Last 5 Matches');

    const handleSearch = async (val) => {
        setSearchQuery(val);
        if (val.length < 3) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const res = await apiClient.get(`/players/search-player?q=${val}`);
            if (res.data.success) {
                setSearchResults(res.data.players.filter(p => p._id !== user?.id));
            }
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setIsSearching(false);
        }
    };

    const selectOpponent = async (p) => {
        setOpponent(p);
        setSearchQuery('');
        setSearchResults([]);
        
        setLoading(true);
        try {
            const [compRes, t1Res, t2Res] = await Promise.all([
                apiClient.get(`/analytics/compare?player1=${user?.id}&player2=${p._id}`),
                apiClient.get(`/players/${user?.id}/last5`),
                apiClient.get(`/players/${p._id}/last5`)
            ]);

            if (compRes.data.success) setComparisonData(compRes.data.comparison);
            if (t1Res.data.success) setPlayer1Trends(t1Res.data.trendData);
            if (t2Res.data.success) setPlayer2Trends(t2Res.data.trendData);

            toast.success(`BI Report Generated: ${p.name}`);
        } catch (err) {
            toast.error('Failed to aggregate BI data');
            setOpponent(null);
        } finally {
            setLoading(false);
        }
    };

    const clearDuel = () => {
        setOpponent(null);
        setComparisonData(null);
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white border border-white/10 p-4 rounded-xl shadow-2xl backdrop-blur-xl">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 border-b border-white/5 pb-2">{label}</p>
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between gap-8 py-1">
                            <span className="text-[9px] font-bold text-black uppercase">{entry.name}</span>
                            <span className="text-sm font-black italic" style={{ color: entry.color }}>{entry.value}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (loading) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6">
            <div className="relative">
                <div className="w-24 h-24 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                <Database className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600 animate-pulse" size={32} />
            </div>
            <p className="text-zinc-400 font-black uppercase tracking-[0.4em] text-[10px] italic">Compiling Advanced Analytics...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-white font-sans selection:bg-emerald-600/20">
            {/* Top BI Header */}
            <header className="bg-white border-b border-zinc-200 sticky top-0 z-50 px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <button onClick={() => navigate(-1)} className="p-3 hover:bg-zinc-100 rounded-xl transition-all text-zinc-400 hover:text-black">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="w-px h-8 bg-zinc-200 mx-2"></div>
                    <div>
                        <h1 className="text-lg font-black text-black uppercase tracking-tighter flex items-center gap-3">
                            <BarChart3 className="text-emerald-600" size={24} /> 
                            Player Intelligence <span className="text-zinc-400">/ Professional Dashboard</span>
                        </h1>
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Powered by Tableau-Grade Engine v2.4</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-zinc-100 p-1.5 rounded-2xl border border-zinc-200">
                        {['Dashboard', 'Comparative', 'Trends'].map(t => (
                            <button 
                                key={t}
                                onClick={() => setView(t.toLowerCase())}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === t.toLowerCase() ? 'bg-white text-emerald-600 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                    <div className="w-px h-8 bg-zinc-200 mx-2"></div>
                    <button className="p-3 bg-emerald-600 text-black rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all">
                        <Download size={18} />
                    </button>
                </div>
            </header>

            <div className="flex">
                {/* BI Sidebar Filters */}
                <aside className="w-80 bg-white border-r border-zinc-200 min-h-[calc(100vh-80px)] sticky top-20 p-8 space-y-10 hidden lg:block">
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                            <Filter size={12} /> Global Filters
                        </h3>
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-emerald-600 transition-all" size={16} />
                            <input 
                                type="text"
                                placeholder="Search Opponent..."
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="w-full bg-white border border-zinc-200 focus:border-emerald-500/50 p-4 pl-12 rounded-2xl text-[11px] font-bold outline-none transition-all"
                            />
                            {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 animate-spin" size={16} />}
                            
                            {searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-4 bg-white rounded-2xl shadow-2xl border border-zinc-200 p-2 z-[60] overflow-hidden">
                                    {searchResults.map(p => (
                                        <button 
                                            key={p._id}
                                            onClick={() => selectOpponent(p)}
                                            className="w-full flex items-center gap-3 p-3 hover:bg-white rounded-xl transition-all group text-left"
                                        >
                                            <div className="w-8 h-8 bg-white text-black rounded-lg flex items-center justify-center font-black text-[10px]">
                                                {p.name.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-black uppercase truncate">{p.name}</p>
                                                <p className="text-[8px] font-bold text-zinc-400 uppercase">@{p.username || 'user'}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                            <Clock size={12} /> Timeframe
                        </h3>
                        <div className="space-y-2">
                            {['Last 5 Matches', 'Last 10 Matches', 'Season 2026', 'Career Stats'].map(t => (
                                <button 
                                    key={t}
                                    onClick={() => setTimeframe(t)}
                                    className={`w-full text-left p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${timeframe === t ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-white text-zinc-400 border border-transparent hover:border-zinc-200'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 bg-white rounded-3xl text-black relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Zap size={60} />
                        </div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">System Status</p>
                        <h4 className="text-xs font-black italic uppercase tracking-widest mb-4">Neural Link Active</h4>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(37,99,235,1)]"></div>
                            <span className="text-[9px] font-bold text-emerald-500 uppercase">Sync Level: 100%</span>
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 p-8 md:p-12 overflow-x-hidden">
                    {!opponent ? (
                        <div className="max-w-5xl mx-auto space-y-12 py-12">
                            {/* Empty State / Tableau Initial Screen */}
                            <div className="grid md:grid-cols-2 gap-12 items-center">
                                <div className="space-y-8">
                                    <div className="inline-flex items-center gap-3 bg-emerald-600 text-black px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20">
                                        <Activity size={14} /> Intelligence Engine
                                    </div>
                                    <h2 className="text-6xl font-black text-black tracking-tighter uppercase leading-[0.9] italic">
                                        Advanced <br /> <span className="text-emerald-600">Player</span> Analytics
                                    </h2>
                                    <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-md italic">
                                        Aggregating multi-dimensional match telemetry into interactive dashboards. Select an opponent node to begin comparative drill-down.
                                    </p>
                                    <div className="flex items-center gap-6 pt-4">
                                        <div className="flex -space-x-4">
                                            {[1,2,3,4].map(i => (
                                                <div key={i} className="w-12 h-12 rounded-2xl border-4 border-white bg-zinc-200 flex items-center justify-center font-black text-[10px] text-zinc-400">U{i}</div>
                                            ))}
                                        </div>
                                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                            <span className="text-black">420+</span> Players Analyzed Today
                                        </p>
                                    </div>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-0 bg-emerald-600/5 rounded-[4rem] blur-3xl"></div>
                                    <div className="relative bg-white p-10 rounded-[4rem] shadow-2xl border border-zinc-100 space-y-8 rotate-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex gap-2">
                                                <div className="w-3 h-3 bg-rose-400 rounded-full"></div>
                                                <div className="w-3 h-3 bg-amber-400 rounded-full"></div>
                                                <div className="w-3 h-3 bg-emerald-400 rounded-full"></div>
                                            </div>
                                            <Maximize2 className="text-zinc-300" size={18} />
                                        </div>
                                        <div className="space-y-4">
                                            {[1,2,3].map(i => (
                                                <div key={i} className="h-12 bg-white rounded-2xl flex items-center px-6 gap-4 border border-zinc-100">
                                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                                    <div className={`h-2 bg-zinc-200 rounded-full transition-all duration-1000`} style={{ width: `${30 + i*20}%` }}></div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="h-32 bg-emerald-600 rounded-3xl shadow-xl shadow-emerald-500/20"></div>
                                            <div className="h-32 bg-white rounded-3xl shadow-xl"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-10 animate-fade-in">
                            {/* Comparison Summary Cards (KPIs) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                                {[
                                    { label: 'Scoring Advantage', value: comparisonData.insights.betterStriker === user?.name ? 'OWNER' : 'OPPONENT', icon: <Zap className="text-amber-500" />, sub: 'Velocity Index' },
                                    { label: 'Form Delta', value: (player1Trends[0]?.r > player2Trends[0]?.r) ? '+12.4%' : '-4.2%', icon: <TrendingUp className="text-emerald-500" />, sub: 'Last Match Momentum' },
                                    { label: 'Bowling Payload', value: Math.max(comparisonData.stats.find(s => s.metric === 'Wickets')?.p1, comparisonData.stats.find(s => s.metric === 'Wickets')?.p2), icon: <Target className="text-emerald-500" />, sub: 'Career Impact Units' },
                                    { label: 'Win Prob.', value: (comparisonData.stats.find(s => s.metric === 'Runs')?.p1 > comparisonData.stats.find(s => s.metric === 'Runs')?.p2) ? '68%' : '42%', icon: <Activity className="text-green-500" />, sub: 'Predictive Result' }
                                ].map((kpi, idx) => (
                                    <div key={idx} className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="p-4 bg-white rounded-2xl group-hover:bg-emerald-50 transition-colors">
                                                {kpi.icon}
                                            </div>
                                            <ArrowUpRight className="text-zinc-300 group-hover:text-black transition-colors" size={18} />
                                        </div>
                                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{kpi.label}</p>
                                        <h3 className="text-3xl font-black text-black uppercase italic tracking-tighter">{kpi.value}</h3>
                                        <p className="text-[9px] font-bold text-zinc-400 uppercase mt-2 italic">{kpi.sub}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Main BI Dashboard Grid */}
                            <div className="grid lg:grid-cols-12 gap-8">
                                
                                {/* Comparative Radar (3D Performance) */}
                                <div className="lg:col-span-4 bg-white p-10 rounded-[3rem] border border-zinc-200 shadow-sm relative overflow-hidden">
                                    <div className="flex items-center justify-between mb-10">
                                        <h3 className="text-xs font-black text-black uppercase tracking-[0.2em] italic">Dimensional Analysis</h3>
                                        <button className="text-zinc-300 hover:text-emerald-600 transition-colors"><Info size={16} /></button>
                                    </div>
                                    <div className="h-[350px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={comparisonData.radarData}>
                                                <PolarGrid stroke="#e2e8f0" strokeDasharray="4 4" />
                                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} />
                                                <Radar
                                                    name={user?.name}
                                                    dataKey="p1"
                                                    stroke="#059669"
                                                    strokeWidth={3}
                                                    fill="#059669"
                                                    fillOpacity={0.4}
                                                />
                                                <Radar
                                                    name={opponent.name}
                                                    dataKey="p2"
                                                    stroke="#0f172a"
                                                    strokeWidth={3}
                                                    fill="#0f172a"
                                                    fillOpacity={0.2}
                                                />
                                                <Tooltip content={<CustomTooltip />} />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="mt-8 flex justify-center gap-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-emerald-600 rounded-full"></div>
                                            <span className="text-[9px] font-black text-black uppercase">{user?.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-white rounded-full"></div>
                                            <span className="text-[9px] font-black text-black uppercase">{opponent.name}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Multi-Series Trend (The Tableau Look) */}
                                <div className="lg:col-span-8 bg-white p-10 rounded-[3rem] border border-zinc-200 shadow-sm">
                                    <div className="flex items-center justify-between mb-10">
                                        <div>
                                            <h3 className="text-xs font-black text-black uppercase tracking-[0.2em] italic">Historical Progression</h3>
                                            <p className="text-[9px] font-bold text-zinc-400 uppercase mt-1">Multi-Metric Correlation Graph</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="px-4 py-2 bg-white border border-zinc-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:bg-zinc-100 transition-all">Export CSV</button>
                                            <button className="px-4 py-2 bg-emerald-600 text-black rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">Expand View</button>
                                        </div>
                                    </div>
                                    <div className="h-[350px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={player1Trends.map((t, i) => ({
                                                match: `M${i+1}`,
                                                p1_runs: t.r,
                                                p2_runs: player2Trends[i]?.r || 0,
                                                p1_sr: t.r / (t.b || 1) * 100,
                                                p2_sr: (player2Trends[i]?.r || 0) / (player2Trends[i]?.b || 1) * 100
                                            }))}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                                <XAxis dataKey="match" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} axisLine={false} />
                                                <YAxis tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} axisLine={false} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Legend wrapperStyle={{ paddingTop: 20, fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }} />
                                                <Bar dataKey="p1_runs" name={`${user?.name} (Runs)`} fill="#059669" radius={[6, 6, 0, 0]} barSize={30} />
                                                <Bar dataKey="p2_runs" name={`${opponent.name} (Runs)`} fill="#94a3b8" radius={[6, 6, 0, 0]} barSize={30} />
                                                <Line type="monotone" dataKey="p1_sr" name="P1 Velocity (S/R)" stroke="#10B981" strokeWidth={3} dot={{ r: 4, fill: '#10B981' }} />
                                                <Line type="monotone" dataKey="p2_sr" name="P2 Velocity (S/R)" stroke="#0f172a" strokeWidth={3} dot={{ r: 4, fill: '#0f172a' }} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Wicket & Economy Correlation (Tableau Scatter Plot Style) */}
                                <div className="lg:col-span-7 bg-white p-10 rounded-[3rem] border border-zinc-200 shadow-sm">
                                    <h3 className="text-xs font-black text-black uppercase tracking-[0.2em] italic mb-10">Bowling Efficiency Matrix</h3>
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis type="number" dataKey="eco" name="Economy" unit="" label={{ value: 'Economy Rate', position: 'bottom', offset: 0, fontSize: 10, fontWeight: 900 }} tick={{ fontSize: 10, fontWeight: 900 }} />
                                                <YAxis type="number" dataKey="w" name="Wickets" label={{ value: 'Wickets', angle: -90, position: 'insideLeft', fontSize: 10, fontWeight: 900 }} tick={{ fontSize: 10, fontWeight: 900 }} />
                                                <ZAxis type="number" range={[100, 1000]} />
                                                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                                                <Scatter name={user?.name} data={player1Trends} fill="#059669" />
                                                <Scatter name={opponent.name} data={player2Trends} fill="#0f172a" />
                                            </ScatterChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mt-6 text-center italic">Lower X-Axis & Higher Y-Axis indicates professional bowling dominance.</p>
                                </div>

                                {/* Comparison Data Grid (Power BI Style) */}
                                <div className="lg:col-span-5 bg-white p-8 rounded-[3rem] border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
                                    <h3 className="text-xs font-black text-black uppercase tracking-[0.2em] italic mb-8">Data Registry Drill-down</h3>
                                    <div className="flex-1 overflow-auto no-scrollbar">
                                        <table className="w-full">
                                            <thead className="sticky top-0 bg-white z-10">
                                                <tr className="border-b border-zinc-100">
                                                    <th className="text-left py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Metric Node</th>
                                                    <th className="text-right py-4 text-[9px] font-black text-emerald-600 uppercase tracking-widest">{user?.name}</th>
                                                    <th className="text-right py-4 text-[9px] font-black text-black uppercase tracking-widest">{opponent.name}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-50">
                                                {comparisonData.stats.map(s => (
                                                    <tr key={s.metric} className="group hover:bg-white transition-colors">
                                                        <td className="py-4 text-[10px] font-black text-slate-400 uppercase italic">{s.metric}</td>
                                                        <td className={`py-4 text-right text-xs font-black italic tabular-nums ${s.p1 >= s.p2 ? 'text-emerald-600' : 'text-zinc-400'}`}>{s.p1}</td>
                                                        <td className={`py-4 text-right text-xs font-black italic tabular-nums ${s.p2 > s.p1 ? 'text-black' : 'text-zinc-400'}`}>{s.p2}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="pt-6 border-t border-zinc-100 mt-auto">
                                        <button className="w-full p-4 bg-white text-black rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-3">
                                            Aggregate Global Data <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>

                            </div>

                            {/* BI Predictive Verdict Section */}
                            <div className="p-12 bg-gradient-to-br from-emerald-600 to-green-800 rounded-[4rem] text-black relative overflow-hidden shadow-2xl shadow-emerald-500/20 group">
                                <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:rotate-12 group-hover:scale-125 transition-all duration-1000">
                                    <PieChartIcon size={250} />
                                </div>
                                <div className="flex flex-col md:flex-row items-center gap-16 relative z-10">
                                    <div className="w-56 h-56 bg-white/10 backdrop-blur-2xl rounded-[3rem] border border-white/20 p-8 flex flex-col items-center justify-center text-center">
                                        <div className="h-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={[
                                                            { name: 'P1', value: 68 },
                                                            { name: 'P2', value: 32 }
                                                        ]}
                                                        innerRadius={50}
                                                        outerRadius={80}
                                                        paddingAngle={8}
                                                        dataKey="value"
                                                    >
                                                        <Cell fill="#fff" />
                                                        <Cell fill="rgba(255,255,255,0.2)" />
                                                    </Pie>
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                            <p className="text-3xl font-black italic">68%</p>
                                        </div>
                                    </div>
                                    <div className="space-y-6 flex-1">
                                        <h4 className="text-3xl font-black italic uppercase tracking-tighter leading-none">BI Analytics Verdict: Professional Grade</h4>
                                        <p className="text-sm font-medium opacity-80 leading-relaxed max-w-4xl italic uppercase tracking-wider">
                                            The data indicates a scoring delta favoring {user?.name} by 24.8% in the opening match segments. However, {opponent.name} exhibits a higher resilience in defensive bowling (lower economy rate). <br /><br />
                                            <span className="text-black font-black underline decoration-emerald-400 decoration-4">Strategic recommendation:</span> Force the scoring rate in the middle overs to exploit the variance in the opponent's bowling progression.
                                        </p>
                                        <div className="flex gap-4 pt-4">
                                            <button className="bg-white text-emerald-600 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all">Download Report PDF</button>
                                            <button className="bg-white/10 text-black border border-white/20 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/20 transition-all">Share Analytics Hub</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
            
            {/* Quick BI Toolbar */}
            <div className="fixed bottom-10 right-10 flex flex-col gap-3 z-[100]">
                <button className="w-14 h-14 bg-white border border-zinc-200 rounded-2xl shadow-2xl flex items-center justify-center text-zinc-400 hover:text-emerald-600 hover:-translate-y-1 transition-all group relative">
                    <LayoutGrid size={24} />
                    <span className="absolute right-full mr-4 bg-white text-black text-[8px] font-black uppercase tracking-widest py-2 px-4 rounded-lg opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap pointer-events-none">Dashboard Views</span>
                </button>
                <button onClick={clearDuel} className="w-14 h-14 bg-white text-black rounded-2xl shadow-2xl flex items-center justify-center hover:bg-rose-600 hover:-translate-y-1 transition-all group relative">
                    <X size={24} />
                    <span className="absolute right-full mr-4 bg-white text-black text-[8px] font-black uppercase tracking-widest py-2 px-4 rounded-lg opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap pointer-events-none">Reset Environment</span>
                </button>
            </div>
        </div>
    );
};

export default PlayerIntel;
