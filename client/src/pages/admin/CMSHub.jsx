import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Layout, 
    Home, 
    Info, 
    Save, 
    CheckCircle, 
    AlertCircle, 
    Image as ImageIcon,
    Plus,
    Trash2,
    Zap
} from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import { configAPI, adminAPI } from '../../api/client';
import MobileNav from '../../components/MobileNav';
import AdminSidebar from '../../components/AdminSidebar';

const CMSHub = () => {
    const navigate = useNavigate();
    const { user, logout } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('home');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [turfName, setTurfName] = useState('The Turf');

    const [homeConfig, setHomeConfig] = useState({
        hero: { title: '', highlight: '', subtext: '', images: [], buttonText: '' },
        about: { title: '', description: '', image: '', tags: [] }
    });

    const [aboutConfig, setAboutConfig] = useState({
        hero: { welcome: '', title: '', subtitle: '', description: '' },
        features: [],
        stats: []
    });

    useEffect(() => {
        const fetchData = async () => {
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
                console.error('CMS fetch error:', err);
                setStatus({ type: 'error', message: 'Failed to synchronize with Central Config Registry.' });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setStatus({ type: '', message: '' });
        try {
            const configToSave = activeTab === 'home' ? homeConfig : aboutConfig;
            const res = await configAPI.update(activeTab, configToSave);
            if (res.data.success) {
                setStatus({ type: 'success', message: `${activeTab.toUpperCase()} infrastructure recalibrated successfully.` });
            }
        } catch (err) {
            setStatus({ type: 'error', message: 'Command Interrupted: Authorization or Network Failure.' });
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

    const InputField = ({ label, value, onChange, placeholder, type = "text" }) => (
        <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block ml-2">{label}</label>
            <input 
                type={type}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-slate-900 border border-white/5 rounded-[1.5rem] p-5 text-white font-bold outline-none focus:border-emerald-500/30 transition-all placeholder:text-white/10"
            />
        </div>
    );

    const TextAreaField = ({ label, value, onChange, placeholder }) => (
        <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block ml-2">{label}</label>
            <textarea 
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={4}
                className="w-full bg-slate-900 border border-white/5 rounded-[1.5rem] p-5 text-white font-bold outline-none focus:border-emerald-500/30 transition-all placeholder:text-white/10 resize-none"
            />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 font-sans flex flex-col">
            <MobileNav user={user} logout={logout} dashboardTitle={turfName} />
            <div className="flex flex-1 overflow-hidden">
                <AdminSidebar user={user} logout={logout} turfName={turfName} />

                <main className="flex-1 overflow-y-auto pb-32">
                    <header className="bg-slate-900/50 backdrop-blur-2xl border-b border-white/5 h-24 flex items-center justify-between px-10 sticky top-0 z-40">
                        <div className="flex flex-col">
                            <h2 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">CMS Command Hub</h2>
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">Platform Content Automation</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={handleSave} 
                                disabled={saving}
                                className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-emerald-900/20 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {saving ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> SYNCING...</> : <><Save size={14} /> Commit Changes</>}
                            </button>
                        </div>
                    </header>

                    <div className="p-6 md:p-10 max-w-5xl mx-auto w-full space-y-12">
                        {status.message && (
                            <div className={`p-6 rounded-[2rem] flex items-center gap-4 border ${status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'} animate-in fade-in slide-in-from-top-4`}>
                                {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                                <p className="text-[10px] font-black uppercase tracking-widest">{status.message}</p>
                            </div>
                        )}

                        {/* TABS */}
                        <div className="flex gap-4 p-2 bg-slate-900/50 rounded-[2rem] w-fit border border-white/5">
                            <button onClick={() => setActiveTab('home')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'home' ? 'bg-emerald-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}>Home Hub</button>
                            <button onClick={() => setActiveTab('about')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'about' ? 'bg-emerald-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}>About Registry</button>
                        </div>

                        {loading ? (
                            <div className="py-32 flex flex-col items-center justify-center gap-6">
                                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 animate-pulse">Requesting Platform State...</p>
                            </div>
                        ) : activeTab === 'home' ? (
                            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
                                {/* HERO SUBSECTION */}
                                <div className="bg-slate-900/30 rounded-[3rem] p-10 border border-white/5 space-y-8">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400"><Zap size={24} /></div>
                                        <h3 className="text-xl font-black uppercase tracking-tighter text-white">Hero Vision</h3>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-8">
                                        <InputField label="Title Segment" value={homeConfig?.hero?.title} onChange={(val) => updateHomeHero('title', val)} placeholder="Feel Free" />
                                        <InputField label="Highlight Text" value={homeConfig?.hero?.highlight} onChange={(val) => updateHomeHero('highlight', val)} placeholder="Play Better" />
                                        <InputField label="Subtext / Hook" value={homeConfig?.hero?.subtext} onChange={(val) => updateHomeHero('subtext', val)} placeholder="Select your squad..." />
                                        <InputField label="CTA Button Label" value={homeConfig?.hero?.buttonText} onChange={(val) => updateHomeHero('buttonText', val)} placeholder="Book Now" />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block ml-2">Hero Image Cluster (URLs)</label>
                                        <div className="grid grid-cols-1 gap-4">
                                            {(homeConfig?.hero?.images || []).map((img, idx) => (
                                                <div key={idx} className="flex gap-4">
                                                    <input 
                                                        value={img} 
                                                        onChange={(e) => {
                                                            const newImgs = [...homeConfig.hero.images];
                                                            newImgs[idx] = e.target.value;
                                                            updateHomeHero('images', newImgs);
                                                        }}
                                                        className="flex-1 bg-slate-900 border border-white/5 rounded-xl p-4 text-xs font-bold text-white/60"
                                                    />
                                                    <button onClick={() => {
                                                        const newImgs = homeConfig.hero.images.filter((_, i) => i !== idx);
                                                        updateHomeHero('images', newImgs);
                                                    }} className="p-4 bg-rose-500/10 text-rose-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                                                </div>
                                            ))}
                                            <button onClick={() => updateHomeHero('images', [...(homeConfig?.hero?.images || []), ''])} className="flex items-center justify-center gap-2 border-2 border-dashed border-white/5 hover:border-emerald-500 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-emerald-400 transition-all">
                                                <Plus size={14} /> New Image Element
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* ABOUT SUBSECTION */}
                                <div className="bg-slate-900/30 rounded-[3rem] p-10 border border-white/5 space-y-8">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-400"><Layout size={24} /></div>
                                        <h3 className="text-xl font-black uppercase tracking-tighter text-white">Feature Narrative</h3>
                                    </div>
                                    <InputField label="About Heading" value={homeConfig?.about?.title} onChange={(val) => setHomeConfig(prev => ({ ...prev, about: { ...prev.about, title: val }}))} placeholder="The Turf Miyapur" />
                                    <TextAreaField label="About Narrative" value={homeConfig?.about?.description} onChange={(val) => setHomeConfig(prev => ({ ...prev, about: { ...prev.about, description: val }}))} placeholder="Welcome message..." />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
                                {/* ABOUT HERO */}
                                <div className="bg-slate-900/30 rounded-[3rem] p-10 border border-white/5 space-y-8">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400"><Home size={24} /></div>
                                        <h3 className="text-xl font-black uppercase tracking-tighter text-white">About Storyline</h3>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-8">
                                        <InputField label="Welcome Tag" value={aboutConfig?.hero?.welcome} onChange={(val) => updateAboutHero('welcome', val)} placeholder="Welcome to..." />
                                        <InputField label="Main Heading" value={aboutConfig?.hero?.title} onChange={(val) => updateAboutHero('title', val)} placeholder="Play Smart..." />
                                        <InputField label="Secondary Heading" value={aboutConfig?.hero?.subtitle} onChange={(val) => updateAboutHero('subtitle', val)} placeholder="Compete Better" />
                                    </div>
                                    <TextAreaField label="Core Story" value={aboutConfig?.hero?.description} onChange={(val) => updateAboutHero('description', val)} placeholder="The Turf is..." />
                                </div>

                                {/* STATS */}
                                <div className="bg-slate-900/30 rounded-[3rem] p-10 border border-white/5 space-y-8">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400"><Zap size={24} /></div>
                                        <h3 className="text-xl font-black uppercase tracking-tighter text-white">Arena Statistics</h3>
                                    </div>
                                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {(aboutConfig?.stats || []).map((s, idx) => (
                                            <div key={idx} className="p-6 bg-slate-950 rounded-2x border border-white/5 space-y-4">
                                                <input value={s.stat} onChange={(e) => {
                                                    const newStats = [...aboutConfig.stats];
                                                    newStats[idx].stat = e.target.value;
                                                    setAboutConfig(prev => ({ ...prev, stats: newStats }));
                                                }} className="w-full bg-transparent text-2xl font-black text-emerald-400 outline-none" />
                                                <input value={s.label} onChange={(e) => {
                                                    const newStats = [...aboutConfig.stats];
                                                    newStats[idx].label = e.target.value;
                                                    setAboutConfig(prev => ({ ...prev, stats: newStats }));
                                                }} className="w-full bg-transparent text-[10px] font-black uppercase tracking-widest text-slate-500 outline-none" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <div className="p-8 bg-emerald-950/20 border border-emerald-500/10 rounded-[2.5rem] flex items-start gap-4">
                            <Info size={24} className="text-emerald-500 mt-1" />
                            <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-white leading-none">Automated Deployment Protocol</p>
                                <p className="text-xs font-medium text-emerald-300/60 leading-relaxed">Changes committed here propagate instantly to the the main platform. This eliminats the need for code-level text changes and empowers operations staff to run time-limited campaigns and branding updates dynamically.</p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default CMSHub;
