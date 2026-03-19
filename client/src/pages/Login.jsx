import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { Mail, Lock, LogIn, AlertCircle, ChevronRight } from 'lucide-react';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const Login = () => {
    const { login, loginWithGoogle } = useContext(AuthContext);
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

    const handleGoogleSignIn = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Transmit securely to backend to get standard JWT
            const backendResult = await loginWithGoogle(user.email, user.displayName, user.uid);

            if (backendResult.success) {
                const userRole = backendResult.user.role;
                if (userRole === 'admin') navigate('/admin/dashboard');
                else if (userRole === 'worker') navigate('/worker/dashboard');
                else navigate('/dashboard');
            } else {
                setError(backendResult.message || 'Google authentication mapping failed.');
            }
        } catch (err) {
            console.error(err);
            setError(err.message || 'Google Login process was prematurely terminated.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 md:p-6 relative overflow-hidden font-sans">
            {/* Ambient Background */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-100 rounded-full blur-[120px]"/>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-50 rounded-full blur-[120px]"/>
            </div>

            <div className="w-full max-w-xl relative z-10">
                <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] md:rounded-[3rem] shadow-2xl p-7 md:p-14 border border-white/20">
                    <div className="text-center mb-7 md:mb-10">
                        <div className="inline-flex bg-emerald-600 text-white p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] mb-4 md:mb-6 shadow-xl shadow-emerald-200">
                            <LogIn size={32} />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter uppercase leading-none">Welcome Back</h2>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] md:tracking-[0.4em] mt-3 md:mt-4">Sign in to continue</p>
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
                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-600 transition-colors" size={18} />
                                <input
                                    type="email"
                                    required
                                    placeholder="player@theturf.com"
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500/50 p-4 pl-14 rounded-2xl outline-none transition-all font-bold text-sm text-gray-900 placeholder:text-gray-300"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Access Key</label>
                            <div className="relative group">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-600 transition-colors" size={18} />
                                <input
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500/50 p-4 pl-14 rounded-2xl outline-none transition-all font-bold text-sm text-gray-900 placeholder:text-gray-300"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gray-900 hover:bg-black text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-4 transition-all shadow-2xl shadow-gray-200 outline-none hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                            >
                                {loading ? 'Validating...' : (
                                    <>
                                        Initiate Session <ChevronRight size={20} />
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="flex items-center my-6">
                            <div className="flex-grow border-t border-gray-100"></div>
                            <span className="flex-shrink-0 mx-4 text-gray-400 text-[10px] font-bold uppercase tracking-widest">Or authenticate with</span>
                            <div className="flex-grow border-t border-gray-100"></div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={handleGoogleSignIn}
                                disabled={loading}
                                className="w-full bg-white border-2 border-gray-100 hover:bg-gray-50 text-gray-700 py-4 rounded-[2rem] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 transition-all shadow-sm outline-none hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z" fill="#FBBC05"/>
                                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                </svg>
                                Continue with Google
                            </button>
                        </div>
                    </form>

                    <div className="mt-12 pt-8 border-t border-gray-100 text-center space-y-4">
                        <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest">
                            New to the roster? <Link to="/register" className="text-emerald-600 hover:text-emerald-800 transition-colors">Apply for Registry</Link>
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-4 text-[9px] font-black text-gray-300 uppercase tracking-[0.2em]">
                            <Link to="/admin/login" className="hover:text-emerald-600 transition-colors">Admin Portal</Link>
                            <span className="opacity-20">•</span>
                            <Link to="/worker/login" className="hover:text-emerald-600 transition-colors">Worker Terminal</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
