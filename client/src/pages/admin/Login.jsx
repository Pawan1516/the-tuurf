import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import { ShieldAlert, Mail, Lock, AlertCircle, TrendingUp } from 'lucide-react';

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useContext(AuthContext);

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
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Dark Mode Background Accents */}
            <div className="absolute inset-0 opacity-30 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-900 rounded-full blur-[150px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-800 rounded-full blur-[150px]"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="bg-black/40 backdrop-blur-2xl rounded-[3rem] shadow-2xl p-10 md:p-14 border border-white/10">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="inline-flex bg-emerald-400 text-black p-5 rounded-[2rem] mb-8 shadow-2xl shadow-emerald-400/20">
                            <ShieldAlert size={40} />
                        </div>
                        <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Welcome Back</h2>
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em] mt-4">Administrative Access</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-3xl flex items-start gap-4 mb-10 animate-shake">
                            <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
                            <p className="text-[11px] font-black text-red-300 leading-relaxed uppercase tracking-tight">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-emerald-400/40 uppercase tracking-[0.2em] ml-2">Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-400/40 group-focus-within:text-emerald-400 transition-colors" size={20} />
                                <input
                                    type="email"
                                    required
                                    placeholder="master@theturf.com"
                                    className="w-full bg-white/5 border-2 border-white/5 focus:border-emerald-500/50 p-5 pl-14 rounded-2xl outline-none transition-all font-black text-sm text-white placeholder:text-white/10"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-emerald-400/40 uppercase tracking-[0.2em] ml-2">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-400/40 group-focus-within:text-emerald-400 transition-colors" size={20} />
                                <input
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    className="w-full bg-white/5 border-2 border-white/5 focus:border-emerald-500/50 p-5 pl-14 rounded-2xl outline-none transition-all font-black text-sm text-white placeholder:text-white/10"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="pt-6 space-y-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-6 rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-4 transition-all shadow-2xl shadow-emerald-500/20 outline-none hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50"
                            >
                                <TrendingUp size={22} className="rotate-45" /> {loading ? 'Validating...' : 'Initiate Session'}
                            </button>

                        </div>
                    </form>

                    <div className="mt-12 text-center">
                        <p className="text-[9px] text-white/20 font-black uppercase tracking-[0.2em] leading-loose max-w-[80%] mx-auto">
                            Its only administrative access. If you are not an administrator, please return to the main site and enjoy the game!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
