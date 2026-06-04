import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';

const Login = () => {
    const { login } = useContext(AuthContext);
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [adminKey, setAdminKey] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();


    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await login(formData.email, formData.password, adminKey);
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
        <div className="min-h-screen premium-gradient flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Dynamic Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
                <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-emerald-500/10 rounded-full blur-[140px] animate-pulse"/>
                <div className="absolute bottom-[-20%] right-[-10%] w-[80%] h-[80%] bg-emerald-900/10 rounded-full blur-[140px]"/>
            </div>

            <div className="w-full max-w-[440px] relative z-10">
                <div className="bg-white/80 backdrop-blur-3xl rounded-[3rem] shadow-[0_32px_120px_-15px_rgba(37,99,235,0.1)] p-10 md:p-14 border border-white/50 ring-1 ring-slate-100">
                    
                    {/* Header */}
                    <div className="text-center space-y-6">
                        <div className="inline-flex relative">
                             <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20"></div>
                             <div className="relative bg-emerald-600 text-white p-5 rounded-[1.8rem] shadow-2xl">
                                <Lock size={32} />
                             </div>
                        </div>
                        
                        <div className="space-y-2">
                           <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">The Turf</h1>
                           <p className="text-[10px] font-black text-emerald-600/70 uppercase tracking-[0.4em]">Player Base Access</p>
                        </div>
                    </div>



                    {error && (
                        <div className="mt-8 bg-red-500/10 border border-red-500/20 p-5 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-4">
                            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] font-black text-red-500 uppercase tracking-tight">{error}</p>
                        </div>
                    )}

                    <form onSubmit={onSubmit} className="mt-10 space-y-7">
                        <div className="space-y-7">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identity (Email / Phone)</label>
                                <div className="relative">
                                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                    <input
                                        type="text"
                                        name="email"
                                        required
                                        placeholder="Email or Mobile Number"
                                        className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500/30 focus:bg-white p-5 pl-14 rounded-[1.5rem] outline-none transition-all font-bold text-sm text-slate-900 placeholder:text-slate-200"
                                        value={formData.email}
                                        onChange={onChange}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Admin Key (optional)</label>
                                <div className="relative">
                                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                    <input
                                      type="password"
                                      name="password"
                                      required
                                      placeholder="Enter password"
                                      className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500/30 focus:bg-white p-5 pl-14 rounded-[1.5rem] outline-none transition-all font-bold text-sm text-slate-900 placeholder:text-slate-200"
                                      value={formData.password}
                                      onChange={onChange}
                                    />
                                    <input
                                      type="text"
                                      name="admin_key"
                                      placeholder="Admin Key (optional)"
                                      className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500/30 focus:bg-white p-5 mt-2 rounded-[1.5rem] outline-none transition-all font-bold text-sm text-slate-900 placeholder:text-slate-200"
                                      value={adminKey}
                                      onChange={e => setAdminKey(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>


                        <button
                            type="submit"
                            disabled={loading}
                            className="group w-full h-[72px] bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-4 transition-all duration-500 disabled:opacity-20 shadow-xl shadow-emerald-500/20"
                        >
                            {loading ? 'Verifying...' : (
                                <>Enter Base <ArrowRight size={18} className="group-hover:translate-x-1" /></>
                            )}
                        </button>
                    </form>

                    <div className="mt-12 pt-8 border-t border-slate-100 text-center">
                        <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">
                            New Player? <Link to="/register" className="text-emerald-600 hover:text-emerald-600 transition-colors">Start Enrollment</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;



