import React from 'react';
import { AlertCircle, LogOut, ShieldCheck } from 'lucide-react';

const SessionWarningModal = ({ isOpen, timeLeft, onStay, onLogout }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="bg-emerald-600 p-8 text-center text-white relative">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                        <div className="absolute top-[-20px] left-[-20px] w-32 h-32 bg-white rounded-full blur-3xl"></div>
                    </div>
                    
                    <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 border border-white/20 shadow-xl">
                        <AlertCircle size={40} className="text-white" />
                    </div>
                    
                    <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Session Expiry Warning</h2>
                    <p className="text-blue-100 text-xs font-bold uppercase tracking-widest opacity-80">Security Protocol Imminent</p>
                </div>

                <div className="p-8 text-center space-y-6">
                    <div className="space-y-2">
                        <p className="text-slate-500 text-sm font-medium">Your security session will expire due to inactivity in:</p>
                        <p className="text-4xl font-black text-slate-900 tracking-tighter">
                            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                        </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3 text-left">
                        <ShieldCheck className="text-emerald-600 shrink-0" size={20} />
                        <p className="text-[10px] font-black text-slate-500 uppercase leading-relaxed tracking-tight">
                            Identity will be revoked and all temporary payloads cleared upon expiration.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={onStay}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-200 transition-all active:scale-95 text-xs uppercase tracking-widest"
                        >
                            Stay Logged In
                        </button>
                        <button 
                            onClick={onLogout}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-4 rounded-2xl transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                            <LogOut size={14} />
                            Logout Now
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SessionWarningModal;
