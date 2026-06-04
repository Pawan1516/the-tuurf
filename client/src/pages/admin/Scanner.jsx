import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { Link } from 'react-router-dom';
import jsQR from 'jsqr';
import apiClient from '../../api/client';
import AuthContext from '../../context/AuthContext';
import AdminSidebar from '../../components/AdminSidebar';
import { toast } from 'react-toastify';

import { 
    CheckCircle, 
    AlertTriangle, 
    XCircle, 
    Camera, 
    ShieldCheck, 
    Activity, 
    Lock,
    Unlock,
    CameraOff,
    Zap,
    LayoutDashboard,
    Calendar,
    Briefcase,
    PieChart,
    Settings,
    LogOut,
    ChevronRight,
    Search,
    Database,
    QrCode,
    RefreshCcw,
    ShieldAlert,
    Clock,
    Cpu,
    Target,
    Maximize2,
    CircleDot,
    Layers
} from 'lucide-react';

// ─── Real Camera QR Scanner (jsQR — works in ALL browsers) ──────────────────
const CameraScanner = ({ onScan }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const intervalRef = useRef(null);
    const [camError, setCamError] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const [manualInput, setManualInput] = useState('');

    const stopCamera = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    }, []);

    const scanFrame = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'both' 
        });

        if (code && code.data) {
            stopCamera();
            onScan(code.data);
        }
    }, [onScan, stopCamera]);

    useEffect(() => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setCamError('Optical Sensor interface not supported (HTTPS required).');
            return;
        }

        const startCamera = async () => {
            const constraintsList = [
                { 
                    video: { 
                        facingMode: { ideal: 'environment' },
                        width: { min: 640, ideal: 1920, max: 1920 },
                        height: { min: 480, ideal: 1080, max: 1080 },
                        frameRate: { ideal: 30, max: 60 }
                    } 
                },
                { video: { facingMode: { exact: 'environment' } } },
                { video: { facingMode: 'environment' } },
                { video: true }
            ];

            let stream = null;
            for (const constraints of constraintsList) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia(constraints);
                    if (stream) break;
                } catch (err) {
                    console.warn(`Scanner: Constraints fallback triggered`, err.name);
                }
            }

            if (!stream) {
                setCamError('Sensor Error: Access denied or no optic node detected.');
                return;
            }

            streamRef.current = stream;
            const video = videoRef.current;
            if (video) {
                video.srcObject = stream;
                video.onloadedmetadata = () => {
                    video.play().then(() => {
                        setIsReady(true);
                        intervalRef.current = setInterval(scanFrame, 150);
                    }).catch(e => console.error('Sensor stream playback failed:', e));
                };
            }
        };

        startCamera();
        return () => stopCamera();
    }, [scanFrame, stopCamera]);

    const hiddenCanvas = <canvas ref={canvasRef} style={{ display: 'none' }} />;

    if (camError) {
        return (
            <div className="rounded-[3.5rem] border-4 border-dashed border-rose-100 p-16 flex flex-col items-center gap-10 bg-rose-50/20 animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-[0.02] text-rose-600">
                    <ShieldAlert size={250} />
                </div>
                {hiddenCanvas}
                <div className="p-6 bg-rose-600 text-white rounded-[1.5rem] shadow-2xl relative z-10">
                   <ShieldAlert size={48} />
                </div>
                <div className="text-center space-y-4 relative z-10">
                    <h4 className="text-xl font-black text-rose-700 uppercase tracking-tighter italic">Sensor Initialization Failure</h4>
                    <p className="text-rose-600/60 text-[10px] font-black uppercase tracking-[0.3em] leading-relaxed max-w-sm mx-auto italic">{camError}</p>
                </div>
                <div className="w-full max-w-md space-y-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="h-px flex-1 bg-rose-100"></div>
                        <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.4em]">— MANUAL OVERRIDE —</p>
                        <div className="h-px flex-1 bg-rose-100"></div>
                    </div>
                    <div className="relative group">
                        <Cpu className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-600 transition-colors" size={20} />
                        <input
                            type="text"
                            value={manualInput}
                            onChange={e => setManualInput(e.target.value)}
                            placeholder="INPUT REGISTRY PAYLOAD HASH"
                            className="w-full p-6 pl-16 rounded-2xl bg-white border-2 border-slate-100 text-emerald-600 font-mono text-xs focus:border-emerald-600 outline-none transition-all placeholder:text-slate-200 shadow-sm italic"
                            autoFocus
                            onKeyDown={e => { if (e.key === 'Enter' && manualInput.trim()) { stopCamera(); onScan(manualInput.trim()); }}}
                        />
                    </div>
                    <button
                        onClick={() => { if (manualInput.trim()) { stopCamera(); onScan(manualInput.trim()); }}}
                        className="w-full bg-slate-950 text-white py-6 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-2xl hover:bg-emerald-600 italic"
                    >
                        Force Registry Validation
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative rounded-[4rem] overflow-hidden border-2 border-slate-200 bg-black shadow-2xl" style={{ minHeight: '500px' }}>
            {hiddenCanvas}
            <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover"
                style={{ display: isReady ? 'block' : 'none' }}
            />

            {isReady && (
                <>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="relative w-72 h-72 md:w-96 md:h-96">
                            <div className="absolute top-0 left-0 w-16 h-16 border-t-8 border-l-8 border-emerald-600 rounded-tl-[2.5rem]"/>
                            <div className="absolute top-0 right-0 w-16 h-16 border-t-8 border-r-8 border-emerald-600 rounded-tr-[2.5rem]"/>
                            <div className="absolute bottom-0 left-0 w-16 h-16 border-b-8 border-l-8 border-emerald-600 rounded-bl-[2.5rem]"/>
                            <div className="absolute bottom-0 right-0 w-16 h-16 border-b-8 border-r-8 border-emerald-600 rounded-br-[2.5rem]"/>
                            <div 
                                className="absolute left-4 right-4 h-1 bg-emerald-500 shadow-[0_0_30px_rgba(37,99,235,1)]"
                                style={{ animation: 'scanLine 4s ease-in-out infinite' }}
                            />
                            <div className="absolute inset-0 bg-emerald-500/5 backdrop-blur-[1px]"></div>
                        </div>
                    </div>
                    <div className="absolute top-10 left-10 flex items-center gap-4">
                        <div className="px-5 py-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full flex items-center gap-3">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,1)]"></div>
                            <span className="text-[9px] font-black text-white uppercase tracking-widest italic">Optic Feed: Active</span>
                        </div>
                    </div>
                    <div className="absolute bottom-10 left-0 right-0 text-center px-10">
                        <span className="bg-white/10 backdrop-blur-2xl border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.4em] px-10 py-4 rounded-full italic">
                           Registry Acquisition protocol Alpha-9
                        </span>
                    </div>
                </>
            )}

            {!isReady && !camError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950">
                    <div className="relative">
                        <div className="w-24 h-24 border-4 border-emerald-600/10 border-t-emerald-600 rounded-full animate-spin"></div>
                        <Target className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600 animate-pulse" size={32} />
                    </div>
                    <p className="text-white text-[10px] font-black uppercase tracking-[0.4em] italic mt-10">Synchronizing Optic Node...</p>
                </div>
            )}

            <style>{`
                @keyframes scanLine {
                    0%, 100% { top: 10%; opacity: 0.3; }
                    50% { top: 90%; opacity: 1; }
                }
            `}</style>
        </div>
    );
};

// ─── Main Scanner Component ──────────────────────────────────────────────────
const Scanner = () => {
    const { user, logout } = useContext(AuthContext);
    const [scanStatus, setScanStatus] = useState('idle');
    const [matchDetails, setMatchDetails] = useState(null);
    const [dashboardStats, setDashboardStats] = useState(null);
    const [showScanner, setShowScanner] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    
    const [showOverride, setShowOverride] = useState(false);
    const [overrideMatchId, setOverrideMatchId] = useState('');
    const [overrideReason, setOverrideReason] = useState('');

    const fetchDashboard = useCallback(async () => {
        try {
            const res = await apiClient.get('/admin/scan-dashboard');
            if (res.data.success) setDashboardStats(res.data.dashboard);
        } catch (error) {
            console.error('Error fetching scanner intelligence:', error);
        }
    }, []);

    useEffect(() => { 
        fetchDashboard(); 
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, [fetchDashboard]);

    const handleScan = async (payload) => {
        if (!payload) return;
        setShowScanner(false);
        setScanStatus('scanning');
        try {
            const res = await apiClient.post('/admin/scan-match', {
                qr_payload: payload,
                ip_address: 'admin_node_secure',
                device_info: navigator.userAgent
            });
            if (res.data.success) {
                setScanStatus('success');
                setMatchDetails(res.data.match);
                toast.success('✅ Subject Verified Successfully');
                fetchDashboard();
            }
        } catch (err) {
            setScanStatus('error');
            const reason = err.response?.data?.reason || 'Security Validation Failed.';
            toast.error(`Verification Failed: ${reason}`);
        }
    };

    const handleManualOverride = async (e) => {
        e.preventDefault();
        try {
            const res = await apiClient.post('/admin/override-match', {
                match_id: overrideMatchId,
                reason: overrideReason
            });
            if (res.data.success) {
                toast.success('Manual Override protocol Authorized');
                setShowOverride(false);
                setOverrideMatchId('');
                setOverrideReason('');
                fetchDashboard();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Authorization Failure');
        }
    };

    return (
        <div className="min-h-screen bg-[#F1F5F9] flex font-sans selection:bg-emerald-600/20">
            <AdminSidebar user={user} logout={logout} />

            <main className="flex-1 overflow-y-auto pb-24 relative custom-scrollbar">
                {/* BI Style Top Bar */}
                <header className="bg-white border-b border-slate-200 sticky top-0 z-[40] px-10 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div>
                            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                                <QrCode className="text-emerald-600" size={26} /> 
                                Verification Center <span className="text-slate-400">/ Security Hub</span>
                            </h1>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Optic Validation Hub v4.1</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden xl:flex items-center gap-4 bg-slate-50 border border-slate-200 p-2 rounded-2xl">
                            <div className="px-4 py-1.5 border-r border-slate-200">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Local Time</p>
                                <p className="text-xs font-black text-slate-900 tabular-nums italic">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                            </div>
                            <div className="px-4 py-1.5">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Security Status</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                    <span className="text-[10px] font-black text-emerald-600 uppercase">Secure Hub</span>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowScanner(prev => !prev)}
                            className={`px-10 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all flex items-center gap-4 active:scale-95 italic ${
                                showScanner 
                                ? 'bg-rose-600 text-white shadow-rose-500/20' 
                                : 'bg-emerald-600 text-white shadow-emerald-500/20'
                            }`}
                        >
                            {showScanner ? <><XCircle size={18} /> Terminate Sensor</> : <><Camera size={18} /> Initialize Sensor</>}
                        </button>
                    </div>
                </header>

                <div className="max-w-[1600px] mx-auto p-10 space-y-12">
                    
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        {/* Main Verification HUD */}
                        <div className="lg:col-span-8 space-y-10">
                            <div className="bg-white rounded-[4rem] p-12 shadow-sm border border-slate-200 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-12 opacity-[0.01] text-slate-900 pointer-events-none">
                                    <Target size={300} />
                                </div>
                                
                                <div className="flex flex-col md:flex-row justify-between items-center gap-10 relative z-10 border-b border-slate-100 pb-12 mb-12">
                                    <div className="text-center md:text-left">
                                        <div className="flex items-center gap-6 mb-4 justify-center md:justify-start">
                                            <div className="p-5 bg-slate-950 text-white rounded-2xl shadow-2xl">
                                               <QrCode size={32} />
                                            </div>
                                            <div>
                                                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Security <span className="text-emerald-600">Verification Matrix</span></h2>
                                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2 italic">Awaiting Subject Identity Registry Scan</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                                        <div className="px-6 py-2 border-r border-slate-200">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Acquisitions</p>
                                            <p className="text-lg font-black text-slate-900 italic tabular-nums leading-none">{dashboardStats?.matches?.verified || 0}</p>
                                        </div>
                                        <div className="px-6 py-2">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Sensor Heat</p>
                                            <p className="text-lg font-black text-emerald-600 italic tabular-nums leading-none">Optimal</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative">
                                    {showScanner ? (
                                        <CameraScanner
                                            onScan={handleScan}
                                            onClose={() => setShowScanner(false)}
                                        />
                                    ) : (
                                        <div className="bg-slate-50 rounded-[3.5rem] border-4 border-dashed border-slate-200 h-[500px] flex flex-col items-center justify-center text-slate-300 gap-8 group hover:border-blue-200 transition-all duration-500 overflow-hidden relative">
                                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-100/50"></div>
                                            <div className="w-32 h-32 bg-white rounded-[2.5rem] flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 relative z-10 border border-slate-100">
                                               <CameraOff className="text-slate-200 group-hover:text-emerald-600 transition-colors" size={56} strokeWidth={1} />
                                            </div>
                                            <div className="text-center space-y-3 relative z-10">
                                                <h4 className="text-xl font-black text-slate-400 uppercase tracking-tighter italic">Optic Sensor Offline</h4>
                                                <p className="text-[10px] font-black uppercase tracking-[0.4em] italic opacity-60">Initiate sensor deployment for identity validation</p>
                                            </div>
                                            <button 
                                                onClick={() => setShowScanner(true)}
                                                className="bg-slate-950 text-white px-12 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-emerald-600 transition-all relative z-10 italic"
                                            >
                                                Deploy Verification Node
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {scanStatus !== 'idle' && (
                                    <div className={`mt-12 p-10 rounded-[3rem] border-2 shadow-2xl animate-fade-up relative overflow-hidden ${
                                        scanStatus === 'success' ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' : 
                                        scanStatus === 'scanning' ? 'bg-blue-50/50 border-blue-100 text-blue-800' : 
                                        'bg-rose-50/50 border-rose-100 text-rose-800'
                                    }`}>
                                        <div className="absolute top-0 right-0 p-10 opacity-[0.05] pointer-events-none">
                                            {scanStatus === 'success' ? <ShieldCheck size={150} /> : <ShieldAlert size={150} />}
                                        </div>
                                        <div className="flex items-start gap-8 relative z-10">
                                            <div className={`p-6 rounded-[1.8rem] shadow-2xl ${
                                                scanStatus === 'success' ? 'bg-emerald-600 text-white' : 
                                                scanStatus === 'scanning' ? 'bg-emerald-600 text-white' : 
                                                'bg-rose-600 text-white'
                                            }`}>
                                                {scanStatus === 'success' ? <CheckCircle size={32} /> : 
                                                 scanStatus === 'scanning' ? <RefreshCcw className="animate-spin" size={32} /> : 
                                                 <XCircle size={32} />}
                                            </div>
                                            
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-6 border-b border-black/5 pb-6">
                                                    <h3 className="text-3xl font-black uppercase tracking-tighter italic">
                                                        {scanStatus === 'success' ? 'Identity Authorized' : 
                                                         scanStatus === 'scanning' ? 'Payload Decryption...' : 
                                                         'Authorization Refused'}
                                                    </h3>
                                                    {scanStatus === 'success' && (
                                                        <div className="bg-emerald-600 text-white px-5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest italic animate-pulse shadow-lg">
                                                            Live Access
                                                        </div>
                                                    )}
                                                </div>

                                                {scanStatus === 'success' && matchDetails && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                        <div className="space-y-6">
                                                            <div className="space-y-1">
                                                                <p className="text-[9px] font-black uppercase tracking-widest opacity-40 italic">Operational Title</p>
                                                                <p className="text-xl font-black uppercase italic tracking-tighter">{matchDetails.title}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-[9px] font-black uppercase tracking-widest opacity-40 italic">Subject Identity</p>
                                                                <p className="text-lg font-black uppercase italic tracking-tight">{matchDetails.userName || 'Unknown Subject'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="bg-white/50 backdrop-blur-md rounded-3xl p-6 border border-emerald-100/50 space-y-4">
                                                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                                               <span className="opacity-40 italic">Registry Hash</span>
                                                               <span className="text-slate-900 font-mono">TX_{matchDetails._id.slice(-8).toUpperCase()}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                                               <span className="opacity-40 italic">temporal Status</span>
                                                               <span className="text-emerald-600 italic">Confirmed</span>
                                                            </div>
                                                            <div className="pt-4 border-t border-emerald-100 flex items-center gap-3 text-emerald-600">
                                                                <Zap size={14} className="animate-pulse" />
                                                                <span className="text-[9px] font-black uppercase tracking-widest italic">Live Session Intelligence Unlocked</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                {scanStatus === 'error' && (
                                                    <div className="space-y-8">
                                                        <p className="text-sm font-black uppercase tracking-widest opacity-60 leading-relaxed italic max-w-2xl">The identity signature provided is invalid or session entropy has exceeded limits. Security breach protocol initiated.</p>
                                                        <div className="flex gap-4">
                                                            <button 
                                                                onClick={() => setShowOverride(true)}
                                                                className="bg-rose-600 hover:bg-slate-900 text-white px-10 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-rose-500/30 transition-all italic"
                                                            >
                                                                Invoke Manual Override Protocol
                                                            </button>
                                                            <button 
                                                                onClick={() => { setScanStatus('idle'); setShowScanner(true); }}
                                                                className="bg-white border-2 border-rose-100 text-rose-600 px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-rose-50 transition-all italic"
                                                            >
                                                                Reset Optic Node
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sidebar Security Controls */}
                        <div className="lg:col-span-4 space-y-10">
                            {/* Override Terminal */}
                            <div className="bg-white rounded-[3.5rem] p-10 shadow-sm border border-slate-200 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.02] text-amber-600 group-hover:rotate-12 transition-all duration-1000">
                                    <ShieldAlert size={150} />
                                </div>
                                <div className="flex items-center gap-5 mb-8 relative z-10">
                                    <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl shadow-sm border border-amber-100"><AlertTriangle size={24} /></div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Security <span className="text-amber-600">Override</span></h2>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Manual Identity Injection Node</p>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-relaxed mb-10 italic relative z-10">
                                    Manual protocols are authorized ONLY when physical presence is confirmed but optical sensor fails to acquire registry. Protocol violation is logged.
                                </p>
                                
                                {(showOverride || scanStatus === 'error') ? (
                                    <form onSubmit={handleManualOverride} className="space-y-8 animate-fade-in relative z-10">
                                        <div className="space-y-3">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2 italic">
                                                <Lock size={12} className="text-rose-600" /> Target registry ID
                                            </label>
                                            <div className="relative group">
                                                <Database className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-rose-600 transition-colors" size={16} />
                                                <input 
                                                    type="text" 
                                                    value={overrideMatchId}
                                                    onChange={(e) => setOverrideMatchId(e.target.value)}
                                                    placeholder="UID_XXXXXX"
                                                    className="w-full bg-slate-50 border-2 border-transparent focus:border-rose-100 p-4 pl-12 rounded-xl outline-none text-xs font-black tracking-widest transition-all italic placeholder:text-slate-200"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2 italic">
                                                <ShieldCheck size={12} className="text-emerald-600" /> Justification Node
                                            </label>
                                            <div className="relative group">
                                                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 rotate-90 pointer-events-none" size={16} />
                                                <select 
                                                    value={overrideReason}
                                                    onChange={(e) => setOverrideReason(e.target.value)}
                                                    className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-100 p-4 rounded-xl outline-none text-[10px] font-black uppercase tracking-widest transition-all appearance-none cursor-pointer italic"
                                                    required
                                                >
                                                    <option value="">Select Justification...</option>
                                                    <option value="Physical Verification Success">Physical Identity Confirmed</option>
                                                    <option value="Device Failure">Optic Sensor Hardware Failure</option>
                                                    <option value="Network Isolation">Registry Network Isolation</option>
                                                </select>
                                            </div>
                                        </div>
                                        <button 
                                            type="submit"
                                            className="w-full bg-slate-950 text-white py-6 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-2xl hover:bg-rose-600 italic"
                                        >
                                            Authorize Force Override
                                        </button>
                                    </form>
                                ) : (
                                    <button 
                                        onClick={() => setShowOverride(true)}
                                        className="w-full border-4 border-dashed border-slate-100 text-slate-300 py-16 rounded-[3.5rem] hover:bg-slate-50 hover:border-blue-100 hover:text-emerald-600 transition-all group relative z-10"
                                    >
                                        <Unlock size={40} className="mx-auto mb-6 opacity-20 group-hover:scale-125 group-hover:opacity-100 transition-all duration-700" />
                                        <span className="text-[9px] font-black uppercase tracking-[0.4em] italic leading-relaxed block">Invoke Manual<br/>Override protocol</span>
                                    </button>
                                )}
                            </div>
                            
                            {/* Analytics Terminal */}
                            <div className="bg-slate-950 rounded-[3.5rem] p-10 shadow-2xl flex flex-col gap-8 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.05] text-emerald-500 group-hover:scale-110 transition-all duration-1000">
                                    <Activity size={180} />
                                </div>
                                <div className="flex items-center gap-5 relative z-10">
                                    <div className="p-4 bg-white/5 text-emerald-500 rounded-2xl shadow-xl border border-white/10 backdrop-blur-md"><Activity size={24} /></div>
                                    <div>
                                        <h2 className="text-xl font-black text-white uppercase tracking-tighter italic leading-none">Security <span className="text-emerald-500">Analytics</span></h2>
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1 italic">Real-time validation intelligence</p>
                                    </div>
                                </div>
                                <div className="space-y-5 pt-8 border-t border-white/5 relative z-10">
                                   <div className="flex justify-between items-center group/row">
                                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic group-hover/row:text-slate-400 transition-colors">Sensor Latency</span>
                                      <span className="text-[10px] font-black text-emerald-500 uppercase italic tabular-nums">34ms</span>
                                   </div>
                                   <div className="flex justify-between items-center group/row">
                                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic group-hover/row:text-slate-400 transition-colors">Acquisition Rate</span>
                                      <span className="text-[10px] font-black text-white uppercase italic tabular-nums">98.2%</span>
                                   </div>
                                   <div className="flex justify-between items-center group/row">
                                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic group-hover/row:text-slate-400 transition-colors">System Entropy</span>
                                      <span className="text-[10px] font-black text-emerald-500 uppercase italic tracking-widest">Stable</span>
                                   </div>
                                   <div className="pt-6 border-t border-white/5">
                                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] italic mb-4">Live Threat Map</p>
                                      <div className="flex gap-2">
                                         {[...Array(8)].map((_, i) => (
                                            <div key={i} className={`h-1.5 flex-1 rounded-full ${i < 6 ? 'bg-emerald-600' : 'bg-white/5'} shadow-[0_0_8px_rgba(37,99,235,0.3)]`}></div>
                                         ))}
                                      </div>
                                   </div>
                                </div>
                            </div>

                            {/* System Status Banner */}
                            <div className="bg-white rounded-[3.5rem] p-10 shadow-sm border border-slate-200 overflow-hidden relative group">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.02] text-slate-950 group-hover:rotate-45 transition-all duration-1000">
                                    <Maximize2 size={120} />
                                </div>
                                <div className="flex items-center gap-6 relative z-10">
                                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 shadow-inner group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500">
                                        <Layers size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Global Node Registry</p>
                                        <p className="text-xs font-black text-slate-900 uppercase italic tracking-tighter">Sync: ACTIVE (100%)</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Scanner;
