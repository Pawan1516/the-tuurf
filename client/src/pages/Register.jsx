import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { UserPlus, ShieldCheck, Mail, Phone, Lock, KeyRound, ArrowRight, User, Shield, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';

const Register = () => {
    const { sendRegisterOTP, verifyRegistration } = useContext(AuthContext);
    const [step, setStep] = useState(1); // 1: Form, 2: OTP
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const { name, email, phone, password, confirmPassword } = formData;

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError('');
        if (password !== confirmPassword) {
            setError('Access Keys mismatch.');
            return;
        }
        if (phone.length !== 10) {
            setError('Operational Mobile ID must be 10 digits.');
            return;
        }

        setLoading(true);
        try {
            const res = await sendRegisterOTP(email);
            if (res.success) {
                setStep(2);
                toast.success("Security Pass Sent to Inbox!");
            } else {
                setError(res.message);
            }
        } catch (err) {
            setError('Identity server dispatch failure.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyRegistration = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await verifyRegistration({ ...formData, otp });
            if (res.success) {
                toast.success(`Welcome to the Arena, ${res.user.name}!`);
                navigate('/dashboard');
            } else {
                setError(res.message);
            }
        } catch (err) {
            setError('Registry synchronization error.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#08090a] flex items-center justify-center p-4 relative overflow-hidden font-sans">
            <div className="absolute inset-0 pointer-events-none opacity-30">
                <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-emerald-500/10 rounded-full blur-[140px]animate-pulse"/>
                <div className="absolute bottom-[-20%] right-[-10%] w-[80%] h-[80%] bg-emerald-900/10 rounded-full blur-[140px]"/>
            </div>

            <div className="w-full max-w-[500px] relative z-10 transition-all duration-700">
                <div className="bg-[#121417]/80 backdrop-blur-3xl rounded-[3rem] shadow-2xl p-10 md:p-14 border border-white/5 ring-1 ring-white/10">
                    <div className="text-center space-y-6">
                        <div className="inline-flex relative">
                             <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20"></div>
                             <div className="relative bg-emerald-600 text-white p-5 rounded-[1.8rem] shadow-2xl">
                                {step === 1 ? <UserPlus size={32} /> : <Shield size={32} />}
                             </div>
                        </div>
                        <div className="space-y-2">
                           <h1 className="text-4xl font-black text-white tracking-tighter uppercase">The Turf</h1>
                           <p className="text-[10px] font-black text-emerald-500/70 uppercase tracking-[0.4em]">
                              {step === 1 ? 'Start Player Enrollment' : 'Identity Confirmation'}
                           </p>
                        </div>
                    </div>

                    {error && (
                        <div className="mt-8 bg-red-500/10 border border-red-500/20 p-5 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-4">
                            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] font-black text-red-500 uppercase tracking-tight">{error}</p>
                        </div>
                    )}

                    {step === 1 ? (
                        <form onSubmit={handleSendOTP} className="mt-10 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-emerald-500 transition-colors" size={16} />
                                        <input type="text" name="name" required placeholder="John Doe" className="w-full bg-white/5 border-2 border-white/5 focus:border-emerald-500/30 p-4 pl-12 rounded-2xl outline-none font-bold text-xs text-white" value={name} onChange={onChange} />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Mobile ID</label>
                                    <div className="relative group">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-emerald-500 transition-colors" size={16} />
                                        <input type="tel" name="phone" required placeholder="10 Digits" className="w-full bg-white/5 border-2 border-white/5 focus:border-emerald-500/30 p-4 pl-12 rounded-2xl outline-none font-bold text-xs text-white" value={phone} onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Email Identity</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-emerald-500 transition-colors" size={16} />
                                    <input type="email" name="email" required placeholder="player@arena.com" className="w-full bg-white/5 border-2 border-white/5 focus:border-emerald-500/30 p-4 pl-12 rounded-2xl outline-none font-bold text-xs text-white" value={email} onChange={onChange} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Access Key</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-emerald-500 transition-colors" size={16} />
                                        <input type="password" name="password" required placeholder="••••••••" className="w-full bg-white/5 border-2 border-white/5 focus:border-emerald-500/30 p-4 pl-12 rounded-2xl outline-none font-bold text-xs text-white" value={password} onChange={onChange} />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Confirm Key</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-emerald-500 transition-colors" size={16} />
                                        <input type="password" name="confirmPassword" required placeholder="••••••••" className="w-full bg-white/5 border-2 border-white/5 focus:border-emerald-500/30 p-4 pl-12 rounded-2xl outline-none font-bold text-xs text-white" value={confirmPassword} onChange={onChange} />
                                    </div>
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className="group w-full h-[72px] bg-white hover:bg-emerald-500 text-black py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-4 transition-all duration-500 disabled:opacity-20 shadow-xl">
                                {loading ? 'Initializing...' : <>Dispatch Security Code <ArrowRight size={18} className="group-hover:translate-x-1" /></>}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyRegistration} className="mt-10 space-y-8">
                            <div className="space-y-1 text-center bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10 mb-8">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">Passcode Sent To</p>
                                <p className="text-xs font-black text-emerald-500 truncate lowercase">{email}</p>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 text-center block">Security Access Code</label>
                                <input type="text" required autoFocus placeholder="6 digits" className="w-full bg-white/5 border-2 border-white/5 focus:border-emerald-500/30 p-5 rounded-[1.5rem] outline-none transition-all font-black text-2xl text-white text-center tracking-[0.6em] placeholder:text-gray-800" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} />
                            </div>
                            <div className="space-y-4 pt-4">
                                <button type="submit" disabled={loading || otp.length < 6} className="w-full h-[72px] bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-4 transition-all duration-500 shadow-2xl shadow-emerald-500/20 disabled:opacity-20">
                                    {loading ? 'Verifying...' : 'Finalize Roster Enrollment'}
                                </button>
                                <button type="button" onClick={() => setStep(1)} className="w-full text-[9px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors py-2">Return to Configuration</button>
                            </div>
                        </form>
                    )}

                    <div className="mt-12 pt-8 border-t border-white/5 text-center">
                        <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest">
                            Already Enrolled? <Link to="/login" className="text-emerald-500 hover:text-white transition-colors">Return to Base</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
