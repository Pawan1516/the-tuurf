import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ScanFace, XCircle, Zap, Loader2, ShieldCheck } from 'lucide-react';
import apiClient from '../api/client';
import { useNavigate } from 'react-router-dom';

const AdminQRScanner = () => {
    const [scanResult, setScanResult] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');
    const [animIn, setAnimIn] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        setTimeout(() => setAnimIn(true), 50);

        const scanner = new Html5QrcodeScanner("reader", {
            qrbox: { width: 250, height: 250 },
            fps: 10,
        });

        scanner.render(success, error);

        async function success(result) {
            scanner.clear();
            setScanResult(result);
            setStatus('loading');
            
            try {
                const res = await apiClient.post('/ag-match/scan-qr', { qrData: result });
                
                if (res.data.success) {
                    setStatus('success');
                    setMessage('Match Verified! Redirecting to Toss...');
                    setTimeout(() => {
                        navigate(`/match/toss/${res.data.matchId}`);
                    }, 2000);
                } else {
                    setStatus('error');
                    setMessage(res.data.message || 'Invalid or Duplicate QR Code');
                }
            } catch (err) {
                setStatus('error');
                setMessage(err.response?.data?.message || 'Network error scanning QR');
            }
        }

        function error(err) {
            // console.warn(err);
        }

        return () => {
            scanner.clear().catch(console.error);
        };
    }, [navigate]);

    return (
        <div className={`w-full max-w-md mx-auto px-4 pb-24 transition-all duration-700 ease-out ${animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-center mb-8 pt-12">
                <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl relative">
                    <ScanFace size={32} />
                    <div className="absolute inset-0 bg-emerald-400/20 rounded-[2.5rem] blur-xl animate-pulse pointer-events-none" />
                </div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tighter">QR Gateway</h1>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-2">Admin Match Authorization</p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute -top-32 -left-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />

                {status === 'idle' && (
                    <div className="relative z-10 animate-in fade-in duration-300">
                        <div id="reader" className="w-full rounded-[1.5rem] overflow-hidden border border-white/10 bg-black/40 shadow-inner"></div>
                        <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mt-6">Align QR Code within the frame</p>
                    </div>
                )}

                {status === 'loading' && (
                    <div className="flex flex-col items-center justify-center py-16 animate-in zoom-in-95 duration-300 relative z-10">
                        <Loader2 size={48} className="text-emerald-500 animate-spin mb-6" />
                        <p className="text-sm font-black text-white uppercase tracking-widest">Validating Signature...</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-2">Checking with Agentic AI Engine</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center justify-center py-12 text-center animate-in zoom-in-95 duration-500 relative z-10">
                        <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 border border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                            <ShieldCheck size={48} className="text-emerald-400" />
                        </div>
                        <h2 className="font-black text-2xl text-white uppercase tracking-tight mb-2">Access Granted</h2>
                        <p className="font-bold text-xs text-emerald-400 uppercase tracking-widest">{message}</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center justify-center py-12 text-center animate-in zoom-in-95 duration-500 relative z-10">
                        <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center mb-6 border border-rose-500/30 shadow-[0_0_40px_rgba(244,63,94,0.3)]">
                            <XCircle size={48} className="text-rose-400" />
                        </div>
                        <h2 className="font-black text-2xl text-white uppercase tracking-tight mb-2">Verification Failed</h2>
                        <p className="font-bold text-xs text-rose-400 uppercase tracking-widest">{message}</p>
                        
                        <button 
                            onClick={() => window.location.reload()}
                            className="mt-8 w-full flex items-center justify-center gap-2 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-white/10 active:scale-[0.98] transition-all"
                        >
                            <ScanFace size={16} /> Scan Again
                        </button>
                    </div>
                )}
            </div>
            
            {/* Override html5-qrcode injected styles */}
            <style dangerouslySetInnerHTML={{__html: `
                #reader { border: none !important; }
                #reader button { 
                    background: rgba(16, 185, 129, 0.2) !important;
                    color: #10b981 !important;
                    border: 1px solid rgba(16, 185, 129, 0.5) !important;
                    padding: 0.5rem 1rem !important;
                    border-radius: 0.75rem !important;
                    font-weight: 800 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.1em !important;
                    font-size: 0.75rem !important;
                    margin-top: 1rem !important;
                    cursor: pointer !important;
                }
                #reader__dashboard_section_csr span { color: #94a3b8 !important; }
                #reader__dashboard_section_swaplink { color: #6366f1 !important; font-weight: bold !important; text-decoration: none !important; }
            `}} />
        </div>
    );
};

export default AdminQRScanner;
