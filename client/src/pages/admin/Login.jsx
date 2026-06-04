import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import { 
    ShieldAlert, Mail, Lock, AlertCircle, TrendingUp, ShieldCheck, 
    Zap, ArrowRight, Loader2, Key, Cpu, CircleDot, 
    Globe, Database, Monitor, Activity, Shield
} from 'lucide-react';

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const navigate = useNavigate();
    const { login } = useContext(AuthContext);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await login('admin', email, password);
            if (result.success) {
                navigate('/admin/dashboard');
            } else {
                setError(result.message || 'Invalid administrative credentials. Access denied.');
            }
        } catch (err) {
            setError('Global synchronization failure. Please verify connection.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-emerald-600/20">
            {/* High-Fidelity Background Accents */}
            <div className="absolute top-0 right-0 w-[1000px] h-[1000px] bg-emerald-600/5 rounded-full blur-[150px] translate-x-1/3 -translate-y-1/3"></div>
            <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-slate-300/30 rounded-full blur-[120px] -translate-x-1/3 translate-y-1/3"></div>
            
            {/* Data Grid Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#1e293b 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>

            <div className="w-full max-w-2xl relative z-10 animate-fade-up">
                {/* System Top Header */}
                <div className="flex justify-between items-center mb-10 px-8">
                    <div className="flex items-center gap-4">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,1)]"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic">Node Connectivity: Optimal</span>
                    </div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic tabular-nums">
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                </div>

                <div className="bg-white rounded-[5rem] shadow-2xl border border-slate-200 p-12 md:p-24 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-24 opacity-[0.01] text-slate-950 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                        <ShieldCheck size={500} />
                    </div>

                    {/* Gateway Header */}
                    <div className="text-center mb-20 relative z-10">
                        <div className="inline-flex bg-slate-950 text-white p-8 rounded-[2.5rem] mb-12 shadow-2xl shadow-slate-950/30 group-hover:bg-emerald-600 transition-all duration-700 relative">
                            <Key size={56} className="relative z-10" />
                            <div className="absolute inset-0 bg-emerald-600 rounded-[2.5rem] opacity-0 group-hover:opacity-100 blur-2xl transition-opacity"></div>
                        </div>
                        <h2 className="text-6xl font-black text-slate-950 tracking-tighter uppercase leading-none italic mb-5">
                            Terminal <span className="text-emerald-600 italic">Auth</span>
                        </h2>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] italic border-t border-slate-100 pt-6 inline-block">Security clearance Protocol v5.0</p>
                    </div>

                    {error && (
                        <div className="bg-rose-600 border-4 border-white p-8 rounded-[3rem] flex items-center gap-6 mb-16 animate-shake shadow-2xl shadow-rose-900/20 text-white">
                            <div className="bg-white/20 p-4 rounded-2xl">
                                <ShieldAlert size={28} className="shrink-0" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-1 opacity-80 italic">Access Violation Detected</p>
                                <p className="text-sm font-black leading-relaxed uppercase italic">{error}</p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-12 relative z-10">
                        <div className="space-y-5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-4 italic">Registry Identity (Email)</label>
                            <div className="relative group/input">
                                <Mail className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-emerald-600 transition-colors" size={24} />
                                <input
                                    type="email"
                                    required
                                    placeholder="ADMIN@THETURF.ENGINE"
                                    className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-100 focus:bg-white p-8 pl-18 rounded-[2.5rem] outline-none transition-all font-black text-sm text-slate-900 uppercase tracking-widest italic placeholder:text-slate-200"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-4 italic">Encrypted Security Key</label>
                            <div className="relative group/input">
                                <Lock className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-emerald-600 transition-colors" size={24} />
                                <input
                                    type="password"
                                    required
                                    placeholder="••••••••••••"
                                    className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-100 focus:bg-white p-8 pl-18 rounded-[2.5rem] outline-none transition-all font-black text-sm text-slate-900 tracking-[0.5em] placeholder:text-slate-200"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="pt-10">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-slate-950 hover:bg-emerald-600 text-white py-10 rounded-[3rem] font-black uppercase text-[13px] tracking-[0.5em] flex items-center justify-center gap-6 transition-all shadow-2xl shadow-slate-950/30 outline-none active:scale-[0.98] disabled:opacity-50 italic group/btn"
                            >
                                {loading ? <Loader2 size={28} className="animate-spin" /> : <Activity size={28} className="group-hover/btn:rotate-12 transition-transform" />} 
                                {loading ? 'SYNCHRONIZING HUB...' : 'INITIATE TERMINAL SESSION'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-20 text-center border-t border-slate-100 pt-12 flex flex-col gap-6">
                        <div className="flex justify-center gap-12">
                            <div className="flex items-center gap-3">
                                <Database size={16} className="text-slate-300" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PostgreSQL: ACTIVE</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Monitor size={16} className="text-slate-300" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">AES-256: ENABLED</span>
                            </div>
                        </div>
                        <p className="text-[9px] text-slate-300 font-black uppercase tracking-[0.4em] leading-relaxed max-w-[80%] mx-auto italic">
                            Clearance level 5 required for this gateway. unauthorized acquisition attempts are traced and logged.
                        </p>
                    </div>
                </div>
                
                {/* System Status Indicators */}
                <div className="mt-12 flex justify-center gap-12">
                   <div className="flex items-center gap-4 group/status">
                      <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full animate-pulse shadow-[0_0_12px_rgba(37,99,235,0.8)]"></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic group-hover/status:text-emerald-600 transition-colors">Neural Sync: 100%</span>
                   </div>
                   <div className="flex items-center gap-4 group/status">
                      <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full animate-pulse shadow-[0_0_12px_rgba(37,99,235,0.8)]"></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic group-hover/status:text-emerald-600 transition-colors">Crypto: Protocol 4.2</span>
                   </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
