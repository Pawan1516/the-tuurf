import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Activity,
  Briefcase,
  PieChart,
  LogOut,
  ChevronRight,
  FileText,
  Database,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Settings,
  Zap,
  Download,
  ShieldAlert,
  BarChart3,
  Layers,
  RefreshCcw,
  Clock,
  ArrowRight,
  CircleDot,
  FileJson,
    Maximize2,
    Sparkles
} from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import { adminAPI, aiAPI } from '../../api/client';
import AdminSidebar from '../../components/AdminSidebar';

const AdminReport = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [downloading, setDownloading] = useState(false);
  const [period, setPeriod] = useState('all');
  const [error, setError] = useState('');
  const [settings, setSettings] = useState({ TURF_NAME: 'The Turf' });
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchAIInsights = useCallback(async () => {
    setAnalyzing(true);
    try {
        const { data } = await aiAPI.getExpertHub();
        if (data.success) {
            setAiAnalysis(data.report.businessAnalyst);
        }
    } catch (err) {
        console.error('AI Insight error:', err);
    } finally {
        setAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await adminAPI.getSettings();
        if (data.success) {
          setSettings(prev => ({ ...prev, ...data.settings }));
        }
      } catch (err) {
        console.error('Settings fetch error:', err);
      }
    };
    fetchSettings();
    fetchAIInsights();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [fetchAIInsights]);

    const formatReportContent = (data) => {
        if (!data) return 'System is currently synthesizing revenue trajectory. Deployment stable.';
        const content = (typeof data.report !== 'undefined') ? data.report : data;
        if (content === null || typeof content === 'undefined') return 'No content.';
        if (typeof content === 'string') return content;
        if (typeof content === 'object') {
            try {
                const keys = Object.keys(content);
                if (keys.length <= 6) {
                    return (
                        <div>
                            {keys.map((k, i) => (
                                <div key={i} className="mb-1">
                                    <strong className="uppercase text-[10px] tracking-wider">{k}:</strong>{' '}
                                    <span className="italic">{String(content[k])}</span>
                                </div>
                            ))}
                        </div>
                    );
                }
                return (
                    <pre className="whitespace-pre-wrap text-sm text-slate-700 bg-slate-50 p-3 rounded">{JSON.stringify(content, null, 2)}</pre>
                );
            } catch (e) {
                return String(content);
            }
        }
        return String(content);
    };

  const handleDownloadReport = async (format = 'pdf') => {
    setDownloading(true);
    setError('');
    try {
      const response = format === 'pdf'
        ? await adminAPI.downloadPDFReport({ period })
        : await adminAPI.downloadReport({ period });

      const blob = new Blob([response.data], { type: format === 'pdf' ? 'application/pdf' : 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `intel-report-${period}-${new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setError('Global intelligence extraction failure. Data node unreachable.');
      console.error('Download error:', error);
    } finally {
      setDownloading(false);
    }
  };

  if (analyzing && !aiAnalysis) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6">
        <div className="relative">
            <div className="w-24 h-24 border-4 border-blue-100 border-t-emerald-600 rounded-full animate-spin"></div>
            <FileText className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600 animate-pulse" size={32} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Synthesizing Intelligence Registry...</p>
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
                        <FileText className="text-emerald-600" size={26} /> 
                        Report Center <span className="text-slate-400">/ Intelligence Export</span>
                    </h1>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Operational Analytics Registry v3.2</p>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="hidden xl:flex items-center gap-4 bg-slate-50 border border-slate-200 p-2 rounded-2xl">
                    <div className="px-4 py-1.5 border-r border-slate-200">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Local Time</p>
                        <p className="text-xs font-black text-slate-900 tabular-nums italic">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                    </div>
                    <div className="px-4 py-1.5">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Data Stream Status</p>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-[10px] font-black text-emerald-600 uppercase">Live Registry</span>
                        </div>
                    </div>
                </div>
                <button 
                  onClick={fetchAIInsights}
                  disabled={analyzing}
                  className="p-3 bg-slate-100 hover:bg-emerald-600 hover:text-white rounded-xl transition-all border border-slate-200 active:scale-95 group shadow-sm"
                >
                  <RefreshCcw size={20} className={analyzing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'} />
                </button>
            </div>
        </header>

        <div className="max-w-[1600px] mx-auto p-10 space-y-12">
            
            {/* Report KPI Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                {[
                    { label: 'Intelligence Nodes', value: 'Live', icon: <Cpu className="text-emerald-500" /> },
                    { label: 'Extraction Latency', value: 'Sub-second', icon: <Zap className="text-emerald-500" /> },
                    { label: 'Registry Load', value: 'Nominal', icon: <Activity className="text-emerald-500" /> },
                    { label: 'System Reach', value: 'Global', icon: <Database className="text-slate-500" /> }
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

            {error && (
                <div className="bg-rose-50 border border-rose-100 p-6 rounded-[2rem] flex items-center gap-4 text-rose-600 animate-fade-in">
                    <ShieldAlert size={20} />
                    <p className="text-[10px] font-black uppercase tracking-widest italic">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                
                {/* Master Export Console */}
                <div className="lg:col-span-7">
                    <div className="bg-slate-950 rounded-[4rem] p-16 text-white shadow-2xl relative overflow-hidden group min-h-[600px] flex flex-col justify-between">
                        <div className="absolute top-0 right-0 p-16 opacity-[0.03] text-emerald-500 group-hover:-translate-x-10 transition-all duration-1000">
                            <FileJson size={450} />
                        </div>
                        <div className="absolute -bottom-24 -left-24 opacity-[0.02] group-hover:rotate-12 transition-all duration-[3000ms]">
                            <FileText size={400} />
                        </div>

                        <div className="relative z-10 space-y-12">
                            <div className="space-y-6">
                                <div className="bg-emerald-600/20 text-emerald-500 px-6 py-2 rounded-full border border-emerald-500/20 w-fit text-[10px] font-black uppercase tracking-widest italic flex items-center gap-3">
                                    <ShieldCheck size={14} /> Global Intelligence Synthesis
                                </div>
                                <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase leading-none italic">Select <span className="text-emerald-500">Payload Registry</span></h2>
                                <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xl italic border-l-4 border-emerald-600 pl-6 py-2 uppercase tracking-wide">
                                    Initiate a comprehensive audit extraction including revenue aggregates, operative deployment density, and granular node metadata.
                                </p>
                            </div>

                            <div className="space-y-10">
                                <div className="flex flex-wrap gap-4">
                                    {['all', 'daily', 'weekly', 'monthly'].map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setPeriod(p)}
                                            className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all italic ${period === p
                                                ? 'bg-emerald-600 text-white shadow-2xl shadow-emerald-500/30 -translate-y-1'
                                                : 'bg-white/5 text-slate-500 hover:text-white hover:bg-white/10 border border-white/5'}`}
                                        >
                                            {p} interval Registry
                                        </button>
                                    ))}
                                </div>

                                <div className="flex flex-col md:flex-row gap-6 pt-10">
                                    <button
                                        onClick={() => handleDownloadReport('pdf')}
                                        disabled={downloading}
                                        className="flex-1 bg-white text-slate-950 py-6 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-emerald-600 hover:text-white transition-all shadow-2xl active:scale-95 italic"
                                    >
                                        <FileText size={22} />
                                        {downloading ? 'Compiling Registry...' : 'Extract PDF Intelligence'}
                                    </button>
                                    <button
                                        onClick={() => handleDownloadReport('csv')}
                                        disabled={downloading}
                                        className="bg-white/5 border border-white/10 text-white px-12 py-6 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-white/10 transition-all active:scale-95 italic"
                                    >
                                        <Database size={22} className="text-emerald-500" />
                                        {downloading ? 'Extracting...' : 'CSV Data Matrix'}
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="relative z-10 pt-12 flex items-center justify-between border-t border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="w-2 h-2 bg-emerald-600 rounded-full animate-ping"></div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">Extraction protocol Alpha-9 Ready</span>
                            </div>
                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest italic tabular-nums">LOG_NODE_ID_{currentTime.getTime().toString().slice(-8)}</span>
                        </div>
                    </div>
                </div>

                {/* AI Intelligence Snapshot */}
                <div className="lg:col-span-5 space-y-10">
                    <div className="bg-white rounded-[3.5rem] p-12 shadow-sm border border-slate-200 relative overflow-hidden group h-full flex flex-col justify-between">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.02] text-emerald-600 group-hover:scale-110 transition-all duration-1000">
                            <Cpu size={180} />
                        </div>
                        <div className="relative z-10 space-y-10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 bg-blue-50 text-emerald-600 px-6 py-2.5 rounded-2xl border border-blue-100 shadow-sm">
                                    <Zap size={18} className="animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-widest italic">AI Analyst Synthetic Feed</span>
                                </div>
                            </div>
                            
                            <div className="space-y-6">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-2">Expert Strategic Insight</p>
                                <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none italic">
                                    Node Status: <span className="text-emerald-600">{aiAnalysis?.status || 'Analyzing...'}</span>
                                </h4>
                                <div className="p-10 bg-slate-50 rounded-[3rem] border border-slate-100 relative group-hover:bg-white transition-colors duration-500">
                                    <div className="absolute top-4 left-4 opacity-[0.05] text-slate-900">
                                        <Sparkles size={48} />
                                    </div>
                                    <div className="text-lg font-medium text-slate-600 leading-relaxed italic font-serif relative z-10">
                                        "{formatReportContent(aiAnalysis)}"
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="relative z-10 flex items-center gap-4 pt-10 border-t border-slate-50 mt-10">
                            <div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center shadow-lg">
                                <CircleDot size={20} className="animate-pulse" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-none mb-1">Source Model</p>
                                <p className="text-[11px] font-black text-slate-900 uppercase italic tracking-tight">Gemini Flash Intensity Node</p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Metrics Terminal */}
                    <div className="grid grid-cols-2 gap-8">
                        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col justify-between h-[220px] group hover:border-emerald-600 transition-all duration-500 overflow-hidden relative">
                            <div className="absolute -right-4 -bottom-4 opacity-[0.02] text-slate-900 group-hover:scale-110 transition-transform">
                                <TrendingUp size={100} />
                            </div>
                            <div className="bg-slate-50 text-emerald-600 p-4 rounded-2xl w-fit group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm"><TrendingUp size={24} /></div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic mb-2">Revenue Density</p>
                                <h4 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Optimal</h4>
                            </div>
                        </div>
                        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col justify-between h-[220px] group hover:border-emerald-600 transition-all duration-500 overflow-hidden relative">
                            <div className="absolute -right-4 -bottom-4 opacity-[0.02] text-slate-900 group-hover:scale-110 transition-transform">
                                <Layers size={100} />
                            </div>
                            <div className="bg-slate-50 text-slate-900 p-4 rounded-2xl w-fit group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm"><Layers size={24} /></div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic mb-2">Infrastructure</p>
                                <h4 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">94.2% Load</h4>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Audit Integrity Banner */}
                <div className="lg:col-span-12 p-14 bg-white border-2 border-blue-100 rounded-[4rem] flex flex-col md:flex-row items-center gap-12 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-16 opacity-[0.02] text-emerald-600 group-hover:rotate-12 transition-all duration-[2000ms]">
                        <ShieldCheck size={250} />
                    </div>
                    <div className="bg-emerald-600 text-white p-8 rounded-[2.5rem] shadow-2xl shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-700">
                        <ShieldCheck size={48} />
                    </div>
                    <div className="space-y-4 relative z-10">
                        <h4 className="text-2xl font-black uppercase tracking-tighter italic text-slate-900 leading-none">Audit Protocol & Data Integrity</h4>
                        <p className="text-sm font-bold text-slate-500 leading-relaxed max-w-6xl italic uppercase tracking-wider">
                            All extracted reports are cryptographically signed and synchronized with the central financial registry. Discrepancies in the <span className="text-emerald-600">Payload Registry</span> are logged as priority-1 security events. Automated audit synchronization is <span className="text-emerald-600">Active</span>.
                        </p>
                    </div>
                    <button className="md:ml-auto bg-slate-950 text-white px-10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-emerald-600 transition-all italic whitespace-nowrap">
                        Verify Ledger Integrity
                    </button>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
};

export default AdminReport;
