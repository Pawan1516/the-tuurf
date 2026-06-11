import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Calendar,
    Activity,
    Briefcase,
    PieChart,
    TrendingUp,
    Zap,
    Users,
    Globe,
    ShieldCheck,
    BarChart3,
    Cpu,
    Target,
    LineChart,
    School,
    Code,
    ExternalLink,
    BrainCircuit,
    Sparkles,
    Workflow,
    Microscope,
    RefreshCcw,
    Layers,
    ChevronRight,
    CircleDot,
    Database,
    Clock
} from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import { adminAPI, aiAPI } from '../../api/client';
import AdminSidebar from '../../components/AdminSidebar';

const StrategyHub = () => {
    const navigate = useNavigate();
    const { user, logout } = useContext(AuthContext);
    const [activeExpert, setActiveExpert] = useState('ai_specialist');
    const [settings, setSettings] = useState({ TURF_NAME: 'The Turf' });
    const [hubReport, setHubReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [agentResult, setAgentResult] = useState(null);
    const [agentJob, setAgentJob] = useState(null);

    const fetchAll = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [settingsRes, hubRes] = await Promise.all([
                adminAPI.getSettings(),
                aiAPI.getExpertHub()
            ]);

            if (settingsRes.data?.success) {
                setSettings(prev => ({ ...prev, ...settingsRes.data.settings }));
            }

            if (hubRes.data?.success) {
                setHubReport(hubRes.data.report);
            } else {
                setError('The AI Strategy engine is currently recalibrating.');
            }
        } catch (err) {
            console.error('Expert Hub fetch error:', err);
            setError(err.response?.data?.message || 'Connection to the AI Intelligence Node was interrupted.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, [fetchAll]);

    const runEnterpriseAgent = async () => {
        try {
            setAgentResult(null);
            setAgentJob(null);
            const res = await aiAPI.executeAgent({ agentName: 'executive', promptName: 'enterprise-ai', input: '' });
            const jobId = res.data.jobId;
            setAgentJob({ id: jobId, status: 'pending' });

            // Poll status
            let job = null;
            for (let i = 0; i < 30; i++) {
                await new Promise(r => setTimeout(r, 1000));
                const st = await aiAPI.getAgentStatus(jobId);
                job = st.data.job;
                setAgentJob(job);
                if (job.status === 'completed' || job.status === 'failed') break;
            }

            if (!job) return setAgentResult('No job status returned.');
            if (job.status === 'completed') setAgentResult(job.result);
            else setAgentResult(job.error || 'Agent failed');
        } catch (err) {
            console.error('Run agent error:', err);
            setAgentResult(err.response?.data?.error || err.message || String(err));
        }
    };

    const experts = [
        { id: 'ai_specialist', label: 'AI Specialist', icon: BrainCircuit, color: 'text-emerald-600', bg: 'bg-blue-50' },
        { id: 'ai_analyst', label: 'AI Analyst', icon: Sparkles, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { id: 'ai_prediction', label: 'AI Prediction', icon: Workflow, color: 'text-emerald-600', bg: 'bg-indigo-50' },
        { id: 'business_analyst', label: 'Business Expert', icon: Microscope, color: 'text-slate-900', bg: 'bg-slate-100' }
    ];

    const renderExpertPanel = (id, reportData) => {
        const expert = experts.find(e => e.id === id);
        if (!reportData) return (
            <div className="p-32 text-center bg-white rounded-[4rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-20 opacity-[0.01] text-slate-900 pointer-events-none">
                    <BrainCircuit size={300} />
                </div>
                {error ? (
                    <div className="space-y-8 relative z-10">
                        <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-sm border border-rose-100">
                           <Zap size={40} className="animate-pulse" />
                        </div>
                        <h4 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Synthesis Interrupt</h4>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 italic max-w-sm mx-auto">{error}</p>
                        <button
                            onClick={fetchAll}
                            className="bg-slate-950 text-white px-12 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-2xl italic"
                        >
                            Retry Neural Synthesis
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-8 relative z-10">
                        <div className="relative">
                            <div className="w-24 h-24 border-4 border-blue-50 border-t-emerald-600 rounded-full animate-spin"></div>
                            <expert.icon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600 animate-pulse" size={32} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Synthesizing {expert.label} Intelligence Registry...</p>
                    </div>
                )}
            </div>
        );
        // Special rendering for AI Specialist to display structured live-match facts
        if (id === 'ai_specialist') {
            const specialist = reportData || {};
            const business = hubReport?.businessAnalyst || {};
            return (
                <div className="space-y-8 animate-fade-up">
                    <div className="bg-slate-950 rounded-[4rem] p-16 border border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="relative z-10 flex flex-col gap-8">
                            <div className="flex items-center gap-6">
                                <div className={`p-6 rounded-[2rem] bg-white/5 border border-white/10 text-white shadow-2xl backdrop-blur-md`}>
                                    <expert.icon size={48} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-3 italic">AI Specialist</p>
                                    <h3 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">{specialist?.status || 'Verified Strategy Intel'}</h3>
                                    <p className="text-[10px] text-slate-400 mt-1">Live Data • {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                                </div>
                            </div>

                            <div className="p-10 bg-white/5 border border-white/5 rounded-[2rem]">
                                <div className="text-slate-200 space-y-3">
                                    <div>
                                        <div className="text-[12px] font-black uppercase text-slate-400 tracking-wider">Current Score</div>
                                        <div className="text-lg font-medium italic">{specialist?.currentScore || formatReportContent(specialist)}</div>
                                    </div>
                                    <div>
                                        <div className="text-[12px] font-black uppercase text-slate-400 tracking-wider">Top Scorer</div>
                                        <div className="text-lg font-medium italic">{specialist?.topScorer || 'N/A'}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                                    <p className="text-xs font-black text-slate-400 uppercase">Total Revenue</p>
                                    <p className="text-2xl font-black text-white">{business?.totalRevenue ? `₹${business.totalRevenue.toLocaleString()}` : '₹0'}</p>
                                </div>
                                <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                                    <p className="text-xs font-black text-slate-400 uppercase">Peak Time</p>
                                    <p className="text-2xl font-black text-white">{business?.peakTime || 'N/A'}</p>
                                </div>
                                <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                                    <p className="text-xs font-black text-slate-400 uppercase">Weekly Growth</p>
                                    <p className="text-2xl font-black text-white">{business?.weeklyGrowth ? `${business.weeklyGrowth}%` : 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-12 animate-fade-up">
                <div className="bg-slate-950 rounded-[4rem] p-16 border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3 group-hover:bg-emerald-600/10 transition-all duration-[2000ms]"></div>
                    <div className="absolute -bottom-24 -left-24 opacity-[0.03] group-hover:rotate-12 transition-all duration-[3000ms]">
                        <expert.icon size={400} className="text-white" />
                    </div>

                    <div className="relative z-10 flex flex-col gap-12">
                        <div className="flex items-center gap-8">
                            <div className={`p-6 rounded-[2rem] bg-white/5 border border-white/10 text-white shadow-2xl backdrop-blur-md`}>
                                <expert.icon size={48} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-3 italic">Intelligence Node Output</p>
                                <h3 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">{reportData.status || 'Verified Strategy Intel'}</h3>
                            </div>
                        </div>

                        <div className="max-w-6xl">
                            <div className="p-14 bg-white/5 border border-white/5 rounded-[3.5rem] backdrop-blur-2xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 p-8 opacity-[0.02] text-white">
                                    <Sparkles size={100} />
                                </div>
                                <div className="text-2xl md:text-3xl font-medium text-slate-200 leading-relaxed italic font-serif relative z-10">
                                    "{formatReportContent(reportData)}"
                                </div>
                                <div className="mt-14 pt-14 border-t border-white/5 flex flex-wrap gap-8 relative z-10">
                                    <div className="px-8 py-3.5 bg-emerald-600/10 rounded-2xl border border-emerald-500/20 text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-3 italic">
                                        <ShieldCheck size={18} /> Neural Synchronization Active
                                    </div>
                                    <div className="px-8 py-3.5 bg-white/5 rounded-2xl border border-white/10 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3 italic">
                                        <Zap size={18} /> Model Precision: Nominal
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    <ImpactMetric label="Operational Optimization" value="85%" color="bg-emerald-600" />
                    <ImpactMetric label="Neural Precision Index" value="92.4%" color="bg-emerald-600" />
                    <ImpactMetric label="Implementation Velocity" value="Extreme" color="bg-slate-900" />
                </div>
            </div>
        );
    };

    if (loading && !hubReport) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6">
            <div className="relative">
                <div className="w-24 h-24 border-4 border-blue-100 border-t-emerald-600 rounded-full animate-spin"></div>
                <BrainCircuit className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600 animate-pulse" size={32} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Initializing Strategy Synthesis Registry...</p>
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
                                <Target className="text-emerald-600" size={26} /> 
                                Strategy Hub <span className="text-slate-400">/ Intelligence Node</span>
                            </h1>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Strategic Operations v2.0-Alpha</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden xl:flex items-center gap-4 bg-slate-50 border border-slate-200 p-2 rounded-2xl">
                            <div className="px-4 py-1.5 border-r border-slate-200">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Local Time</p>
                                <p className="text-xs font-black text-slate-900 tabular-nums italic">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                            </div>
                            <div className="px-4 py-1.5">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Model Synthesis Status</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                    <span className="text-[10px] font-black text-emerald-600 uppercase">Synchronized</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 bg-slate-100 p-2 rounded-xl border border-slate-200">
                            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-lg">
                                <Sparkles size={16} />
                            </div>
                            <div className="flex flex-col pr-4">
                               <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">AI Engine</span>
                               <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 italic">Gemini Flash-v2</span>
                            </div>
                        </div>
                        <button onClick={fetchAll} className="p-3 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-blue-700 transition-all">
                            <RefreshCcw size={20} />
                        </button>
                    </div>
                </header>

                <div className="max-w-[1600px] mx-auto p-10 space-y-12">
                    
                    {/* Strategy KPI Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                        {[
                            { label: 'Intelligence Nodes', value: experts.length, icon: <BrainCircuit className="text-emerald-500" /> },
                            { label: 'Strategic Reach', value: 'Global', icon: <Globe className="text-emerald-500" /> },
                            { label: 'Optimization Index', value: 'High', icon: <TrendingUp className="text-emerald-500" /> },
                            { label: 'Data Latency', value: '14ms', icon: <Activity className="text-slate-500" /> }
                        ].map((kpi, idx) => (
                            <div key={idx} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-2xl transition-all group overflow-hidden relative">
                                <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-slate-900 group-hover:scale-110 transition-transform duration-700">
                                    {kpi.icon}
                                </div>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                                        {kpi.icon}
                                    </div>
                                </div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">{kpi.label}</p>
                                <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter tabular-nums">{kpi.value}</h3>
                            </div>
                        ))}
                    </div>

                    {/* EXPERT SELECTOR */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                        {experts.map(expert => (
                            <button
                                key={expert.id}
                                onClick={() => setActiveExpert(expert.id)}
                                className={`p-10 rounded-[3.5rem] border-4 transition-all group relative overflow-hidden flex flex-col gap-10 ${activeExpert === expert.id
                                    ? `bg-slate-950 border-slate-950 shadow-2xl shadow-slate-950/20 -translate-y-2`
                                    : `bg-white border-transparent hover:border-blue-100 shadow-sm border border-slate-200`}`}
                            >
                                <div className={`${expert.bg} ${expert.color} w-16 h-16 rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg relative z-10`}>
                                    <expert.icon size={32} />
                                </div>
                                <div className="text-left relative z-10">
                                    <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${activeExpert === expert.id ? 'text-slate-500' : 'text-slate-400'}`}>Perspective Node</p>
                                    <h4 className={`text-sm font-black uppercase tracking-widest mt-2 ${activeExpert === expert.id ? 'text-white' : 'text-slate-900'} italic`}>{expert.label}</h4>
                                </div>
                                {activeExpert === expert.id && (
                                    <div className="absolute top-8 right-8">
                                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></div>
                                    </div>
                                )}
                                <div className="absolute -right-4 -bottom-4 opacity-[0.02] text-slate-900 group-hover:scale-150 transition-transform duration-[3000ms]">
                                    <expert.icon size={120} />
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* CONTENT AREA */}
                    <div className="min-h-[600px]">
                        {renderExpertPanel(activeExpert, hubReport ? hubReport[(() => {
                            if (activeExpert === 'ai_specialist') return 'aiSpecialist';
                            if (activeExpert === 'ai_analyst') return 'aiAnalyst';
                            if (activeExpert === 'ai_prediction') return 'aiPrediction';
                            return 'businessAnalyst';
                        })()] : null)}
                    </div>

                    {/* Credits / Footer */}
                    <div className="flex flex-col md:flex-row items-center justify-between p-12 bg-white rounded-[4rem] border border-slate-200 shadow-sm group overflow-hidden relative">
                       <div className="absolute top-0 left-0 p-12 opacity-[0.01] text-slate-900 pointer-events-none">
                            <Layers size={300} />
                       </div>
                       <div className="flex items-center gap-8 relative z-10">
                          <div className="bg-slate-950 text-white p-6 rounded-[1.8rem] shadow-2xl">
                             <Code size={32} />
                          </div>
                          <div>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Architectural Lead Registry</p>
                             <h4 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Pawan Kumar <span className="text-emerald-600">/ IARE Core</span></h4>
                          </div>
                       </div>
                       <div className="flex items-center gap-10 mt-10 md:mt-0 relative z-10">
                          <div className="text-right">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Neural Entropy</p>
                             <p className="text-lg font-black text-emerald-600 uppercase italic flex items-center gap-3">
                                <CircleDot size={14} className="animate-pulse" /> Stable
                             </p>
                          </div>
                          <div className="w-px h-12 bg-slate-200"></div>
                          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center gap-4 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                             <Database size={24} className="text-emerald-600 group-hover:text-white transition-colors" />
                             <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-white/60 leading-none mb-1">Global Storage</p>
                                <p className="text-xs font-black text-slate-900 uppercase italic group-hover:text-white transition-colors tabular-nums">1.4 TB / SSD</p>
                             </div>
                          </div>
                       </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

    const formatReportContent = (data) => {
        if (!data) return 'No data available.';
        // prefer explicit .report string
        const content = (typeof data.report !== 'undefined') ? data.report : data;
        if (content === null || typeof content === 'undefined') return 'No content.';
        if (typeof content === 'string') return content;
        if (typeof content === 'object') {
            try {
                // render key: value lines for small objects
                const keys = Object.keys(content);
                if (keys.length <= 6) {
                    return (
                        <div className="not-italic">
                            {keys.map((k, i) => (
                                <div key={i} className="mb-2">
                                    <strong className="uppercase text-[10px] tracking-wider">{k}:</strong>{' '}
                                    <span className="italic">{String(content[k])}</span>
                                </div>
                            ))}
                        </div>
                    );
                }
                return JSON.stringify(content, null, 2);
            } catch (e) {
                return String(content);
            }
        }
        return String(content);
    };

const ImpactMetric = ({ label, value, color }) => (
    <div className="bg-white rounded-[3.5rem] p-12 border border-slate-200 shadow-sm group hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-[0.01] text-slate-900">
            <TrendingUp size={150} />
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10 italic relative z-10">{label}</p>
        <div className="flex items-end justify-between gap-6 relative z-10">
           <h4 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic leading-none tabular-nums">{value}</h4>
           <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
              <TrendingUp size={24} />
           </div>
        </div>
        <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden mt-10 border border-slate-100 p-0.5">
            <div className={`h-full ${color} rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(37,99,235,0.4)]`} style={{ width: value.includes('%') ? value : '100%' }}></div>
        </div>
    </div>
);

export default StrategyHub;
