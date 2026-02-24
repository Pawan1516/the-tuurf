import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import { ShieldCheck, Mail, Lock, LogIn, AlertCircle } from 'lucide-react';

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
    <div className="min-h-screen bg-emerald-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-400 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 md:p-12 border border-white/20 backdrop-blur-sm">
          {/* Logo/Header */}
          <div className="text-center mb-10">
            <div className="inline-flex bg-emerald-100 p-4 rounded-3xl text-emerald-600 mb-6 shadow-xl shadow-emerald-900/5">
              <ShieldCheck size={40} />
            </div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase leading-none">Welcome Back</h2>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.2em] mt-3">Worker Terminal Access</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3 mb-8 animate-shake">
              <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-red-600 leading-relaxed uppercase tracking-tight">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Secure Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  required
                  placeholder="operator@theturf.com"
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 p-4 pl-12 rounded-2xl outline-none transition-all font-bold text-sm text-gray-900"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Access Key</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500 p-4 pl-12 rounded-2xl outline-none transition-all font-bold text-sm text-gray-900"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-4 space-y-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/10 outline-none hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                <LogIn size={20} />
                {loading ? 'Validating...' : 'Initiate Session'}
              </button>

            </div>
          </form>

          <div className="mt-10 text-center">
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.1em] leading-relaxed">
              Authorized personnel only. All access attempts are monitored and recorded for security auditing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerLogin;
