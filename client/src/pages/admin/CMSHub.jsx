import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Layout, 
    Home, 
    Info, 
    Save, 
    CheckCircle, 
    AlertCircle, 
    Activity,
    Image as ImageIcon,
    Plus,
    Trash2,
    Zap,
    Settings,
    FileText,
    Monitor,
    Loader2,
    ArrowUpRight,
    MousePointer2,
    Layers,
    Cpu,
    Globe,
    ShieldCheck,
    Briefcase,
    RefreshCcw,
    CircleDot,
    Maximize2,
    Database,
    Clock
} from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import { configAPI, adminAPI } from '../../api/client';
import AdminSidebar from '../../components/AdminSidebar';

const CMSHub = () => {
    const navigate = useNavigate();
    const { user, logout } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('home');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [turfName, setTurfName] = useState('The Turf');
    const [currentTime, setCurrentTime] = useState(new Date());

    const [homeConfig, setHomeConfig] = useState({
        hero: { title: '', highlight: '', subtext: '', images: [], buttonText: '' },
        about: { title: '', description: '', image: '', tags: [] }
    });

    const [aboutConfig, setAboutConfig] = useState({
        hero: { welcome: '', title: '', subtitle: '', description: '' },
        features: [],
        stats: []
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [homeRes, aboutRes, settingsRes] = await Promise.all([
                configAPI.get('home'),
                configAPI.get('about'),
                adminAPI.getSettings()
            ]);

            if (homeRes.data.success) setHomeConfig(homeRes.data.config);
            if (aboutRes.data.success) setAboutConfig(aboutRes.data.config);
            if (settingsRes.data.success) setTurfName(settingsRes.data.settings.TURF_NAME || 'The Turf');
        } catch (err) {
            console.error('CMS registry sync failure:', err);
            setStatus({ type: 'error', message: 'Registry sync failed.' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, [fetchData]);

    const handleSave = async () => {
        setSaving(true);
        setStatus({ type: '', message: '' });
        try {
            const configToSave = activeTab === 'home' ? homeConfig : aboutConfig;
            const res = await configAPI.update(activeTab, configToSave);
            if (res.data.success) {
                setStatus({ type: 'success', message: `${activeTab.toUpperCase()} infrastructure recalibrated.` });
                setTimeout(() => setStatus({ type: '', message: '' }), 5000);
            }
        } catch (err) {
            setStatus({ type: 'error', message: 'Command Interrupted: Protocol Failure.' });
        } finally {
            setSaving(false);
        }
    };

    const updateHomeHero = (key, value) => {
        setHomeConfig(prev => ({
            ...prev,
            hero: { ...prev.hero, [key]: value }
        }));
    };

    const updateAboutHero = (key, value) => {
        setAboutConfig(prev => ({
            ...prev,
            hero: { ...prev.hero, [key]: value }
        }));
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6">
            <div className="relative">
                <div className="w-24 h-24 border-4 border-blue-100 border-t-emerald-600 rounded-full animate-spin"></div>
                <Layers className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600 animate-pulse" size={32} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Accessing Content Registry...</p>
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
                                <Layers className="text-emerald-600" size={26} /> 
                                CMS Hub <span className="text-slate-400">/ Content Terminal</span>
                            </h1>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Asset Deployment Center v5.0</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden xl:flex items-center gap-4 bg-slate-50 border border-slate-200 p-2 rounded-2xl">
                            <div className="px-4 py-1.5 border-r border-slate-200">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Local Time</p>
                                <p className="text-xs font-black text-slate-900 tabular-nums italic">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                            </div>
                            <div className="px-4 py-1.5">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Deployment Health</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                    <span className="text-[10px] font-black text-emerald-600 uppercase">Synchronized</span>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={handleSave} 
                            disabled={saving}
                            className="flex items-center gap-4 bg-emerald-600 hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 italic"
                        >
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            {saving ? 'Synchronizing...' : 'Commit Deployment'}
                        </button>
                    </div>
                </header>

                <div className="max-w-[1600px] mx-auto p-10 space-y-12">
                    
                    {/* CMS KPI Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                        {[
                            { label: 'Content Nodes', value: '2', icon: <Layers className="text-emerald-500" /> },
                            { label: 'Asset Density', value: 'High', icon: <ImageIcon className="text-emerald-500" /> },
                            { label: 'Latency Index', value: 'Nominal', icon: <Activity className="text-emerald-500" /> },
                            { label: 'Global Status', value: 'Live', icon: <Globe className="text-slate-500" /> }
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

                    {status.message && (
                        <div className={`p-8 rounded-[2.5rem] flex items-center gap-6 border-4 shadow-2xl animate-fade-in ${status.type === 'success' ? 'bg-emerald-600 border-white text-white' : 'bg-rose-600 border-white text-white'}`}>
                            <div className="bg-white/20 p-4 rounded-2xl shadow-lg">
                                {status.type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80 mb-1 italic">Registry Broadcast</p>
                                <p className="text-lg font-black uppercase tracking-tight italic leading-none">{status.message}</p>
                            </div>
                        </div>
                    )}

                    {/* Navigation Cluster */}
                    <div className="bg-white rounded-[2.5rem] p-3 shadow-sm border border-slate-200 w-fit flex items-center gap-3">
                        <button onClick={() => setActiveTab('home')} className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all italic ${activeTab === 'home' ? 'bg-slate-950 text-white shadow-2xl shadow-slate-950/20' : 'text-slate-400 hover:text-slate-950'}`}>Home Interface Registry</button>
                        <button onClick={() => setActiveTab('about')} className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all italic ${activeTab === 'about' ? 'bg-slate-950 text-white shadow-2xl shadow-slate-950/20' : 'text-slate-400 hover:text-slate-950'}`}>About Protocol Registry</button>
                    </div>

                    <div className="grid grid-cols-1 gap-12">
                        {activeTab === 'home' ? (
                            <div className="space-y-12 animate-fade-up">
                                {/* HOME HERO CONFIG */}
                                <div className="bg-white rounded-[4rem] p-12 border border-slate-200 shadow-sm space-y-12 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-12 opacity-[0.01] text-emerald-600 group-hover:rotate-12 transition-all duration-1000">
                                        <Monitor size={350} />
                                    </div>
                                    <div className="flex items-center gap-8 border-b border-slate-100 pb-10 relative z-10">
                                        <div className="p-5 bg-slate-950 text-white rounded-[1.5rem] shadow-xl"><Monitor size={28} /></div>
                                        <div>
                                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 italic">Interface <span className="text-emerald-600">Hero Section</span></h3>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5 italic">Initial Engagement Matrix & UX Deployment</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid md:grid-cols-2 gap-12 relative z-10">
                                        <InputField label="Primary Identity (Title)" value={homeConfig?.hero?.title} onChange={(val) => updateHomeHero('title', val)} placeholder="FEEL FREE" />
                                        <InputField label="Highlight Parameter" value={homeConfig?.hero?.highlight} onChange={(val) => updateHomeHero('highlight', val)} placeholder="PLAY BETTER" />
                                        <InputField label="Narrative subtext" value={homeConfig?.hero?.subtext} onChange={(val) => updateHomeHero('subtext', val)} placeholder="SELECT YOUR SQUAD..." />
                                        <InputField label="Primary CTA protocol" value={homeConfig?.hero?.buttonText} onChange={(val) => updateHomeHero('buttonText', val)} placeholder="BOOK NOW" />
                                    </div>

                                    <div className="space-y-8 pt-8 relative z-10">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 block italic">Visual Asset Cluster (URLs)</label>
                                            <button onClick={() => updateHomeHero('images', [...(homeConfig?.hero?.images || []), ''])} className="flex items-center gap-3 px-6 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest italic shadow-xl active:scale-95">
                                                <Plus size={16} /> Append Asset
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 gap-6">
                                            {(homeConfig?.hero?.images || []).map((img, idx) => (
                                                <div key={idx} className="flex gap-6 group/asset">
                                                    <div className="flex-1 relative">
                                                        <ImageIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/asset:text-emerald-600 transition-colors" size={20} />
                                                        <input 
                                                            value={img} 
                                                            onChange={(e) => {
                                                                const newImgs = [...homeConfig.hero.images];
                                                                newImgs[idx] = e.target.value;
                                                                updateHomeHero('images', newImgs);
                                                            }}
                                                            className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-100 p-6 pl-16 rounded-[1.8rem] text-[11px] font-black text-slate-500 outline-none transition-all italic tracking-widest uppercase placeholder:text-slate-200"
                                                            placeholder="ASSET_URL_NODE"
                                                        />
                                                    </div>
                                                    <button onClick={() => {
                                                        const newImgs = homeConfig.hero.images.filter((_, i) => i !== idx);
                                                        updateHomeHero('images', newImgs);
                                                    }} className="p-6 bg-rose-50 text-rose-300 rounded-[1.8rem] hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-95"><Trash2 size={22} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* FEATURE NARRATIVE HUB */}
                                <div className="bg-white rounded-[4rem] p-12 border border-slate-200 shadow-sm space-y-12 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-12 opacity-[0.01] text-slate-900 group-hover:scale-110 transition-all duration-1000">
                                        <FileText size={350} />
                                    </div>
                                    <div className="flex items-center gap-8 border-b border-slate-100 pb-10 relative z-10">
                                        <div className="p-5 bg-slate-950 text-white rounded-[1.5rem] shadow-xl"><FileText size={28} /></div>
                                        <div>
                                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 italic">Brand <span className="text-slate-400">Narrative Hub</span></h3>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5 italic">Philosophical Foundation & Strategic Placement</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-12 relative z-10">
                                        <InputField label="Structural Heading" value={homeConfig?.about?.title} onChange={(val) => setHomeConfig(prev => ({ ...prev, about: { ...prev.about, title: val }}))} placeholder="THE TURF MIYAPUR" />
                                        <TextAreaField label="Strategic Story Registry" value={homeConfig?.about?.description} onChange={(val) => setHomeConfig(prev => ({ ...prev, about: { ...prev.about, description: val }}))} placeholder="INPUT WELCOME PROTOCOL..." />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-12 animate-fade-up">
                                {/* ABOUT PROTOCOL HUB */}
                                <div className="bg-white rounded-[4rem] p-12 border border-slate-200 shadow-sm space-y-12 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-12 opacity-[0.01] text-emerald-600 group-hover:rotate-12 transition-all duration-1000">
                                        <Home size={350} />
                                    </div>
                                    <div className="flex items-center gap-8 border-b border-slate-100 pb-10 relative z-10">
                                        <div className="p-5 bg-emerald-600 text-white rounded-[1.5rem] shadow-xl"><Home size={28} /></div>
                                        <div>
                                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 italic">About <span className="text-emerald-600">Protocol Registry</span></h3>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5 italic">Corporate Identity Hub & Strategic Vision Layer</p>
                                        </div>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-12 relative z-10">
                                        <InputField label="Welcome Authorization" value={aboutConfig?.hero?.welcome} onChange={(val) => updateAboutHero('welcome', val)} placeholder="WELCOME TO..." />
                                        <InputField label="Primary Identity node" value={aboutConfig?.hero?.title} onChange={(val) => updateAboutHero('title', val)} placeholder="PLAY SMART..." />
                                        <InputField label="Secondary Identity Hub" value={aboutConfig?.hero?.subtitle} onChange={(val) => updateAboutHero('subtitle', val)} placeholder="COMPETE BETTER" />
                                    </div>
                                    <TextAreaField label="Strategic Story Synthesis" value={aboutConfig?.hero?.description} onChange={(val) => updateAboutHero('description', val)} placeholder="THE TURF IS..." />
                                </div>

                                {/* PERFORMANCE METRICS NODE */}
                                <div className="bg-white rounded-[4rem] p-12 border border-slate-200 shadow-sm space-y-12 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-12 opacity-[0.01] text-slate-900 group-hover:scale-110 transition-all duration-1000">
                                        <Zap size={350} />
                                    </div>
                                    <div className="flex items-center gap-8 border-b border-slate-100 pb-10 relative z-10">
                                        <div className="p-5 bg-slate-950 text-white rounded-[1.5rem] shadow-xl"><Zap size={28} /></div>
                                        <div>
                                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 italic">Performance <span className="text-emerald-600">Metrics Hub</span></h3>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5 italic">Data-driven Intelligence & Efficiency Parameters</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 relative z-10">
                                        {(aboutConfig?.stats || []).map((s, idx) => (
                                            <div key={idx} className="p-10 bg-slate-50 rounded-[3rem] border border-slate-100 space-y-6 hover:bg-white hover:border-emerald-600 hover:shadow-2xl transition-all group/stat relative overflow-hidden h-[260px] flex flex-col justify-center">
                                                <div className="absolute top-0 right-0 p-8 opacity-[0.02] text-emerald-600">
                                                    <Briefcase size={100} />
                                                </div>
                                                <input 
                                                    value={s.stat} 
                                                    onChange={(e) => {
                                                        const newStats = [...aboutConfig.stats];
                                                        newStats[idx].stat = e.target.value;
                                                        setAboutConfig(prev => ({ ...prev, stats: newStats }));
                                                    }} 
                                                    className="w-full bg-transparent text-5xl font-black text-slate-950 italic tracking-tighter outline-none group-hover/stat:text-emerald-600 transition-all uppercase leading-none mb-2" 
                                                    placeholder="STAT_VAL"
                                                />
                                                <input 
                                                    value={s.label} 
                                                    onChange={(e) => {
                                                        const newStats = [...aboutConfig.stats];
                                                        newStats[idx].label = e.target.value;
                                                        setAboutConfig(prev => ({ ...prev, stats: newStats }));
                                                    }} 
                                                    className="w-full bg-transparent text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 outline-none italic group-hover/stat:text-slate-600 transition-all" 
                                                    placeholder="STAT_LABEL_NODE"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <div className="p-12 bg-emerald-600 rounded-[4rem] shadow-xl text-white flex flex-col md:flex-row items-center gap-12 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:rotate-45 transition-all duration-1000">
                                <ShieldCheck size={200} />
                            </div>
                            <div className="bg-white/10 p-8 rounded-[2rem] shadow-2xl backdrop-blur-md border border-white/10">
                                <Info size={40} className="text-white" />
                            </div>
                            <div className="space-y-4 relative z-10">
                                <h4 className="text-2xl font-black uppercase tracking-tighter italic leading-none">Automated Infrastructure Deployment</h4>
                                <p className="text-sm font-bold opacity-90 leading-relaxed max-w-6xl italic uppercase tracking-wider">
                                    Committing changes via this terminal recalibrates the <span className="text-slate-950 font-black">Central Content Registry</span>. Visual assets and narrative payloads are propagated instantly across the platform node network without requiring downtime or code injection.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

const InputField = ({ label, value, onChange, placeholder, type = "text" }) => (
    <div className="space-y-4">
        <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 block ml-2 italic">{label}</label>
        <div className="relative group">
            <Cpu className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-600 transition-colors" size={20} />
            <input 
                type={type}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-100 rounded-2xl p-6 pl-16 text-slate-900 font-black italic outline-none transition-all placeholder:text-slate-200 uppercase tracking-widest text-[11px] group-hover:bg-white"
            />
        </div>
    </div>
);

const TextAreaField = ({ label, value, onChange, placeholder }) => (
    <div className="space-y-4">
        <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 block ml-2 italic">{label}</label>
        <div className="relative group">
            <FileText className="absolute left-6 top-8 text-slate-300 group-focus-within:text-emerald-600 transition-colors" size={20} />
            <textarea 
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={5}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-100 rounded-[2.5rem] p-8 pl-16 text-slate-900 font-black italic outline-none transition-all placeholder:text-slate-200 resize-none uppercase tracking-widest text-[11px] leading-relaxed group-hover:bg-white"
            />
        </div>
    </div>
);

export default CMSHub;
