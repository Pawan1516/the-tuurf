import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { Mail, Lock, LogIn, AlertCircle, ChevronRight, ShieldCheck, User } from 'lucide-react';

const Login = () => {
    const { login } = useContext(AuthContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await login('user', email, password);

            if (result.success) {
                const userRole = result.user.role;
                if (userRole === 'admin') {
                    navigate('/admin/dashboard');
                } else if (userRole === 'worker') {
                    navigate('/worker/dashboard');
                } else {
                    navigate('/dashboard');
                }
            } else {
                setError(result.message || 'Authentication failed. Please verify your credentials.');
            }
        } catch (err) {
            console.error(err);
            setError('Global synchronization failure. Please verify connection.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Ambient Background Elements */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-200 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-200 rounded-full blur-[120px]"></div>
            </div>

            <div className="w-full max-w-xl relative z-10">
                <div className="bg-white/80 backdrop-blur-xl rounded-[3rem] shadow-2xl p-10 md:p-14 border border-white/20">
                    <div className="text-center mb-10">
                        <div className="inline-flex bg-blue-600 text-white p-5 rounded-[2rem] mb-6 shadow-xl shadow-blue-200">
                            <LogIn size={40} />
                        </div>
                        <h2 className="text-4xl font-black text-blue-900 tracking-tighter uppercase leading-none">Welcome Back</h2>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mt-4">Authorized Access Only</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-100 p-5 rounded-3xl flex items-start gap-4 mb-8 animate-shake">
                            <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] font-black text-red-600 leading-relaxed uppercase tracking-tight">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                                <input
                                    type="email"
                                    required
                                    placeholder="player@theturf.com"
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500/50 p-4 pl-14 rounded-2xl outline-none transition-all font-bold text-sm text-gray-900 placeholder:text-gray-300"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Access Key</label>
                            <div className="relative group">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                                <input
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500/50 p-4 pl-14 rounded-2xl outline-none transition-all font-bold text-sm text-gray-900 placeholder:text-gray-300"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-4 transition-all shadow-2xl shadow-blue-200 outline-none hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                            >
                                {loading ? 'Validating...' : (
                                    <>
                                        Initiate Session <ChevronRight size={20} />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-12 pt-8 border-t border-gray-100 text-center space-y-4">
                        <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest">
                            New to the roster? <Link to="/register" className="text-blue-600 hover:text-blue-800 transition-colors">Apply for Registry</Link>
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-4 text-[9px] font-black text-gray-300 uppercase tracking-[0.2em]">
                            <Link to="/admin/login" className="hover:text-blue-600 transition-colors">Admin Portal</Link>
                            <span className="opacity-20">•</span>
                            <Link to="/worker/login" className="hover:text-blue-600 transition-colors">Worker Terminal</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
