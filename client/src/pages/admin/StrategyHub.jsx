import React, { useState, useEffect, useContext } from 'react';
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
  ShieldCheck,
  BarChart3,
  Cpu,
  Target,
  LineChart,
  School,
  Code,
  ExternalLink
} from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import { adminAPI } from '../../api/client';
import MobileNav from '../../components/MobileNav';
import AdminSidebar from '../../components/AdminSidebar';

const StrategyHub = () => {
    const navigate = useNavigate();
    const { user, logout } = useContext(AuthContext);
    const [activeExpert, setActiveExpert] = useState('ai_specialist');
    const [settings, setSettings] = useState({ TURF_NAME: 'The Turf' });
    const [hubReport, setHubReport] = useState(null);
    const [loading, setLoading] = useState(true);

    const navItems = [
        { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/admin/operations', label: 'Operations HUB', icon: Zap },
        { to: '/admin/slots', label: 'Slot Control', icon: Calendar },
        { to: '/admin/bookings', label: 'Booking Log', icon: Activity },
        { to: '/admin/workers', label: 'Workers Team', icon: Briefcase },
        { to: '/admin/users', label: 'User Control', icon: Users },
        { to: '/admin/report', label: 'Intelligence', icon: PieChart },
        { to: '/admin/strategy', label: 'Strategy HUB', icon: Target },
        { to: '/admin/settings', label: 'Settings', icon: LineChart }
    ];

    useEffect(() => {
        const fetchAll = async () => {
            try {
                setLoading(true);
                const [settingsRes, hubRes] = await Promise.all([
                    adminAPI.getSettings(),
                    adminAPI.getExpertHub()
                ]);

                if (settingsRes.data?.success) {
                    setSettings(prev => ({ ...prev, ...settingsRes.data.settings }));
                }

                if (hubRes.data?.success) {
                    setHubReport(hubRes.data.report);
                }
            } catch (err) {
                console.error('Expert Hub fetch error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    const experts = [
        { id: 'ai_specialist', label: 'AI Specialist', icon: Cpu, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
        { id: 'ai_analyst', label: 'AI Analyst', icon: Target, color: 'text-purple-400', bg: 'bg-purple-400/10' },
        { id: 'ai_prediction', label: 'AI Prediction', icon: LineChart, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
        { id: 'business_analyst', label: 'Business Analyst', icon: BarChart3, color: 'text-blue-400', bg: 'bg-blue-400/10' }
    ];

    const renderExpertPanel = (id, reportData) => {
        const expert = experts.find(e => e.id === id);
        if (!reportData) return (
            <div className="p-20 text-center animate-pulse">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Synthesizing {expert.label} Report...</p>
            </div>
        );

        return (
            <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="bg-slate-900 rounded-[2.5rem] p-10 border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 transition-transform group-hover:rotate-0 duration-1000">
                        <expert.icon size={250} />
                    </div>
                    <div className="flex items-center gap-4 mb-10 relative z-10">
                        <div className={`p-4 rounded-2xl ${expert.bg} ${expert.color} shadow-lg`}>
                            <expert.icon size={32} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-1">{expert.label} Command</p>
                            <h3 className="text-3xl font-black text-white tracking-tighter uppercase">{reportData.status || 'Live Intel'}</h3>
                        </div>
                    </div>
                    
                    <div className="relative z-10 max-w-4xl">
                        <div className="p-8 md:p-12 bg-white/5 border border-white/10 rounded-[2rem] backdrop-blur-md">
                            <p className="text-lg md:text-xl font-medium text-slate-200 leading-relaxed italic font-serif">
                                "{reportData.report || reportData}"
                            </p>
                            <div className="mt-10 pt-10 border-t border-white/10 flex flex-wrap gap-4">
                                <div className="px-5 py-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                    <ShieldCheck size={14} /> Synchronized
                                </div>
                                <div className="px-5 py-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20 text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                                    <Zap size={14} /> Platform Priority
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6 mt-8">
                     <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-xl shadow-slate-200/40">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Strategic Impact</p>
                         <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                             <div className="w-[85%] h-full bg-emerald-500 rounded-full transition-all duration-1000"></div>
                         </div>
                         <p className="text-xs font-black text-slate-900 mt-4 uppercase">85% Optimization Yield</p>
                     </div>
                     <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-xl shadow-slate-200/40">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Data Confidence</p>
                         <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                             <div className="w-[92%] h-full bg-purple-500 rounded-full transition-all duration-1000"></div>
                         </div>
                         <p className="text-xs font-black text-slate-900 mt-4 uppercase">92.4% Precision Index</p>
                     </div>
                     <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-xl shadow-slate-200/40">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Implementation Risk</p>
                         <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                             <div className="w-[15%] h-full bg-blue-500 rounded-full transition-all duration-1000"></div>
                         </div>
                         <p className="text-xs font-black text-slate-900 mt-4 uppercase">Low Entropy Factor</p>
                     </div>
                </div>
            </div>
        );
    };

    const renderHeader = () => (
        <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-2xl shadow-slate-200/20 mb-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] text-emerald-900 group-hover:rotate-12 transition-all"><School size={240} /></div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-4">
                    <div className="flex items-center gap-3 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100 w-fit">
                        <School size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Institute of Aeronautical Engineering (IARE)</span>
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">{settings.TURF_NAME} <span className="text-emerald-500">Intelligence Node</span></h2>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-lg">
                            <Code size={12} className="text-emerald-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Devs:</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">G.Manideep & K.Pavan Kumar</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg text-slate-500">
                            <Calendar size={12} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Submission: March 2026</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-4">
                    <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">System Model</p>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Gemini 2.0 Flash Active</p>
                    </div>
                    <a href="https://the-turf-cczo.vercel.app/" target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20 active:scale-95">
                        <ExternalLink size={14} /> Open Live Site
                    </a>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-950">
            <MobileNav user={user} logout={logout} navItems={navItems} dashboardTitle={settings.TURF_NAME} />

            <div className="flex flex-1">
                <AdminSidebar user={user} logout={logout} turfName={settings.TURF_NAME} />

                <main className="flex-1 overflow-y-auto relative pb-24">
                    <header className="bg-white/80 backdrop-blur-md px-10 h-24 flex items-center justify-between sticky top-0 z-40 border-b border-gray-100">
                        <div className="flex flex-col">
                            <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase leading-none">Strategy & Expert HUB</h2>
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Real-Time Platform Intelligence</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="px-5 py-2.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Global Strategy Loop Active</span>
                            </div>
                        </div>
                    </header>

                    <div className="p-10 space-y-10">
                        {renderHeader()}

                        {/* EXPERT SELECTOR */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            {experts.map(expert => (
                                <button
                                    key={expert.id}
                                    onClick={() => setActiveExpert(expert.id)}
                                    className={`p-8 rounded-[2.5rem] border-2 transition-all group relative overflow-hidden flex flex-col gap-6 ${activeExpert === expert.id 
                                        ? `bg-slate-950 border-slate-950 shadow-2xl shadow-slate-900/20 scale-[1.02]` 
                                        : `bg-white border-transparent hover:border-${expert.color.split('-')[1]}-200 shadow-xl shadow-slate-200/40`}`}
                                >
                                    <div className={`${expert.bg} ${expert.color} w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
                                        <expert.icon size={28} />
                                    </div>
                                    <div className="text-left">
                                        <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${activeExpert === expert.id ? 'text-slate-500' : 'text-slate-400'}`}>Perspective</p>
                                        <h4 className={`text-sm font-black uppercase tracking-widest mt-1 ${activeExpert === expert.id ? 'text-white' : 'text-slate-900'}`}>{expert.label}</h4>
                                    </div>
                                    {activeExpert === expert.id && (
                                        <div className="absolute top-6 right-6">
                                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* CONTENT AREA */}
                        <div className="mt-12 min-h-[400px]">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-24 gap-4">
                                    <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Consulting Expert Hub Intel...</p>
                                </div>
                            ) : (
                                renderExpertPanel(activeExpert, hubReport ? hubReport[(() => {
                                    if(activeExpert === 'ai_specialist') return 'aiSpecialist';
                                    if(activeExpert === 'ai_analyst') return 'aiAnalyst';
                                    if(activeExpert === 'ai_prediction') return 'aiPrediction';
                                    return 'businessAnalyst';
                                })()] : null)
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default StrategyHub;
