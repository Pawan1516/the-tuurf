import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import { ShieldCheck, Mail, Lock, LogIn, AlertCircle, User, ChevronRight, Activity } from 'lucide-react';

const WorkerLogin = () => {
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
      const result = await login('worker', email, password);
      if (result.success) {
        navigate('/worker/dashboard');
      } else {
        setError(result.message || 'Invalid credentials or unauthorized access.');
      }
    } catch (err) {
      console.error(err);
      setError('System synchronization error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen premium-gradient flex items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-emerald-500/30">
        {/* Modern Background Accents */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-400/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/20 rounded-full blur-[120px]"></div>

        <div className="w-full max-w-md relative z-10 animate-fade-up">
          <div className="bg-white/80 backdrop-blur-2xl rounded-[3.5rem] p-10 md:p-14 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] border border-white/50 text-center group">
            
            <div className="inline-flex bg-blue-50 p-5 rounded-3xl text-emerald-600 mb-8 shadow-xl shadow-blue-900/5 group-hover:scale-110 transition-transform duration-500">
               <ShieldCheck size={32} strokeWidth={2.5} />
            </div>

            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-2 italic">
                The <span className="text-emerald-600">Turf</span>
            </h1>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-12">Worker Terminal Access</p>

            {error && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3 mb-8 animate-shake">
                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-red-600 leading-relaxed uppercase tracking-tight">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 text-left">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-5">Operational ID</label>
                <div className="relative group/field">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/field:text-emerald-600 transition-colors">
                    <User size={18} />
                  </div>
                  <input
                    type="email"
                    placeholder="operator@theturf.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500/30 focus:bg-white p-5 pl-14 rounded-2xl outline-none transition-all font-bold text-sm text-slate-900 shadow-inner"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-5">Access Key</label>
                <div className="relative group/field">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/field:text-emerald-600 transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500/30 focus:bg-white p-5 pl-14 rounded-2xl outline-none transition-all font-bold text-sm text-slate-900 shadow-inner"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-emerald-600 text-white py-6 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-2xl shadow-blue-900/10 outline-none hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 mt-10"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>Authorize Access <ChevronRight size={18} /></>
                )}
              </button>
            </form>

            <div className="mt-12 pt-10 border-t border-slate-100/50 flex flex-col items-center gap-3">
               <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <Activity size={14} className="text-emerald-500" /> System Integrity Validated
               </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center gap-8 px-6">
             <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">v2.4.0 Stable</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hyd Node Active</span>
             </div>
          </div>
        </div>
    </div>
  );
};

export default WorkerLogin;



