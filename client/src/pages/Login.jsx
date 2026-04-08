import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { LogIn, Lock, Mail, ArrowRight, Zap, Trophy, ShieldCheck, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';

const Login = () => {
    const { login } = useContext(AuthContext);
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const { email, password } = formData;

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await login(email, password);
            if (res.success) {
                toast.success(`Welcome back to the Arena!`);
                navigate(res.user.role === 'admin' ? '/admin/dashboard' : '/dashboard');
            } else {
                setError(res.message);
            }
        } catch (err) {
            setError('Authentication signature invalid.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#08090a] flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Dynamic Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
                <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-emerald-500/10 rounded-full blur-[140px] animate-pulse"/>
                <div className="absolute bottom-[-20%] right-[-10%] w-[80%] h-[80%] bg-emerald-900/10 rounded-full blur-[140px]"/>
            </div>

            <div className="w-full max-w-[440px] relative z-10">
                <div className="bg-[#121417]/80 backdrop-blur-3xl rounded-[3rem] shadow-[0_32px_120px_-15px_rgba(0,0,0,0.5)] p-10 md:p-14 border border-white/5 ring-1 ring-white/10">
                    
                    {/* Header */}
                    <div className="text-center space-y-6">
                        <div className="inline-flex relative">
                             <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20"></div>
                             <div className="relative bg-emerald-600 text-white p-5 rounded-[1.8rem] shadow-2xl">
                                <ShieldCheck size={32} />
                             </div>
                        </div>
                        
                        <div className="space-y-2">
                           <h1 className="text-4xl font-black text-white tracking-tighter uppercase">The Turf</h1>
                           <p className="text-[10px] font-black text-emerald-500/70 uppercase tracking-[0.4em]">Player Base Access</p>
                        </div>
                    </div>

                    {error && (
                        <div className="mt-8 bg-red-500/10 border border-red-500/20 p-5 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-4">
                            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] font-black text-red-500 uppercase tracking-tight">{error}</p>
                        </div>
                    )}

                    <form onSubmit={onSubmit} className="mt-10 space-y-7">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Identity (Email / Phone)</label>
                            <div className="relative">
                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                                <input
                                    type="text"
                                    name="email"
                                    required
                                    placeholder="Email or Mobile Number"
                                    className="w-full bg-white/5 border-2 border-white/5 focus:border-emerald-500/30 p-5 pl-14 rounded-[1.5rem] outline-none transition-all font-bold text-sm text-white placeholder:text-gray-700"
                                    value={email}
                                    onChange={onChange}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Access Key</label>
                            <div className="relative">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                                <input
                                    type="password"
                                    name="password"
                                    required
                                    placeholder="Enter password"
                                    className="w-full bg-white/5 border-2 border-white/5 focus:border-emerald-500/30 p-5 pl-14 rounded-[1.5rem] outline-none transition-all font-bold text-sm text-white placeholder:text-gray-700"
                                    value={password}
                                    onChange={onChange}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="group w-full h-[72px] bg-white hover:bg-emerald-500 text-black py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-4 transition-all duration-500 disabled:opacity-20 shadow-xl"
                        >
                            {loading ? 'Verifying...' : (
                                <>Enter Base <ArrowRight size={18} className="group-hover:translate-x-1" /></>
                            )}
                        </button>
                    </form>

                    <div className="mt-12 pt-8 border-t border-white/5 text-center">
                        <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest">
                            New Player? <Link to="/register" className="text-emerald-500 hover:text-white transition-colors">Start Enrollment</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
