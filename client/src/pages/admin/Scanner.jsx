import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import apiClient from '../../api/client';
import AuthContext from '../../context/AuthContext';
import MobileNav from '../../components/MobileNav';
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
    Database
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
            inversionAttempts: 'dontInvert'
        });

        if (code && code.data) {
            stopCamera();
            onScan(code.data);
        }
    }, [onScan, stopCamera]);

    useEffect(() => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setCamError('Camera API not supported in this browser.');
            return;
        }

        navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
        }).then(stream => {
            streamRef.current = stream;
            const video = videoRef.current;
            if (video) {
                video.srcObject = stream;
                video.onloadedmetadata = () => {
                    video.play().then(() => {
                        setIsReady(true);
                        // Scan every 200ms
                        intervalRef.current = setInterval(scanFrame, 200);
                    });
                };
            }
        }).catch(err => {
            console.error('Camera error:', err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setCamError('Camera permission denied. Click the camera icon in your browser address bar and allow access, then try again.');
            } else if (err.name === 'NotFoundError') {
                setCamError('No camera found on this device.');
            } else {
                setCamError(`Camera error: ${err.message}`);
            }
        });

        return () => stopCamera();
    }, [scanFrame, stopCamera]);

    // Hidden canvas for frame processing
    const hiddenCanvas = <canvas ref={canvasRef} style={{ display: 'none' }} />;

    if (camError) {
        return (
            <div className="rounded-[2.5rem] border-2 border-dashed border-yellow-500/30 p-8 flex flex-col items-center gap-4 bg-yellow-500/5">
                {hiddenCanvas}
                <AlertTriangle className="text-yellow-500" size={32} />
                <p className="text-yellow-400 text-xs font-bold text-center uppercase tracking-wide leading-relaxed max-w-sm">{camError}</p>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest text-center">— OR — paste QR payload manually below —</p>
                <div className="w-full max-w-md">
                    <input
                        type="text"
                        value={manualInput}
                        onChange={e => setManualInput(e.target.value)}
                        placeholder="Paste QR payload here..."
                        className="w-full p-5 rounded-[1.5rem] bg-gray-900/50 border-2 border-dashed border-gray-700 text-emerald-400 font-mono text-xs focus:border-emerald-500 outline-none transition-all placeholder:text-gray-600"
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter' && manualInput.trim()) { stopCamera(); onScan(manualInput.trim()); }}}
                    />
                    <button
                        onClick={() => { if (manualInput.trim()) { stopCamera(); onScan(manualInput.trim()); }}}
                        className="w-full mt-3 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
                    >
                        Submit Payload
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative rounded-[2.5rem] overflow-hidden border-2 border-emerald-500/30 bg-black" style={{ minHeight: '300px' }}>
            {hiddenCanvas}

            {/* Live camera feed */}
            <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover"
                style={{ display: isReady ? 'block' : 'none' }}
            />

            {/* Scanning overlay */}
            {isReady && (
                <>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="relative w-56 h-56 md:w-64 md:h-64">
                            <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl"/>
                            <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl"/>
                            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl"/>
                            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-emerald-400 rounded-br-xl"/>
                            <div 
                                className="absolute left-2 right-2 h-0.5 bg-emerald-400 shadow-lg shadow-emerald-400/50"
                                style={{ animation: 'scanLine 2s ease-in-out infinite' }}
                            />
                        </div>
                    </div>
                    <div className="absolute bottom-4 left-0 right-0 text-center">
                        <span className="bg-black/70 text-emerald-400 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full">
                            🔍 Align QR code inside the box
                        </span>
                    </div>
                </>
            )}

            {/* Loading state */}
            {!isReady && !camError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black" style={{ minHeight: '300px' }}>
                    <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"/>
                    <p className="text-emerald-400 text-xs font-black uppercase tracking-widest">Opening Camera...</p>
                    <p className="text-gray-600 text-[10px] mt-2 uppercase tracking-widest">Please allow camera access if prompted</p>
                </div>
            )}

            <style>{`
                @keyframes scanLine {
                    0%, 100% { top: 10%; }
                    50% { top: 90%; }
                }
            `}</style>
        </div>
    );
};

// ─── Main Scanner Component ──────────────────────────────────────────────────
const Scanner = () => {
    const [scanStatus, setScanStatus] = useState('idle');
    const [matchDetails, setMatchDetails] = useState(null);
    const [dashboardStats, setDashboardStats] = useState(null);
    const [showScanner, setShowScanner] = useState(false);
    
    const [showOverride, setShowOverride] = useState(false);
    const [overrideMatchId, setOverrideMatchId] = useState('');
    const [overrideReason, setOverrideReason] = useState('');
    const [settings, setSettings] = useState({ TURF_NAME: 'The Turf' });

    const navItems = [
        { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/admin/slots', label: 'Slot Control', icon: Calendar },
        { to: '/admin/bookings', label: 'Booking Log', icon: Activity },
        { to: '/admin/workers', label: 'Workers', icon: Briefcase },
        { to: '/admin/report', label: 'Report', icon: PieChart },
        { to: '/admin/settings', label: 'Settings', icon: Settings },
    ];

    const fetchDashboard = React.useCallback(async () => {
        try {
            const res = await apiClient.get('/admin/scan-dashboard');
            if (res.data.success) setDashboardStats(res.data.dashboard);
        } catch (error) {
            console.error('Error fetching dashboard:', error);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

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
                toast.success('✅ Match Verified Successfully!');
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
                toast.success('Admin Manual Override Successful.');
                setShowOverride(false);
                setOverrideMatchId('');
                setOverrideReason('');
                fetchDashboard();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Override Authorization Failure.');
        }
    };

    const NavItem = ({ to, label, icon: Icon, active = false }) => (
        <Link
            to={to}
            className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all group ${active
            ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-200'
            : 'text-gray-400 hover:bg-emerald-50 hover:text-emerald-700'}`}
        >
            <Icon size={20} className={active ? 'text-white' : 'group-hover:text-emerald-600'} />
            <span className="text-xs font-black uppercase tracking-widest">{label}</span>
        </Link>
    );

    const handleLogout = () => {
        logout();
        // navigate('/admin/login'); // Or window.location.href if no navigate
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-emerald-500/30">
            <MobileNav user={user} logout={logout} navItems={navItems} dashboardTitle={settings.TURF_NAME} />

            

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pb-24">
            <div className="p-4 md:p-10 pb-20">
            {/* Header Area */}
            <div className="max-w-7xl mx-auto flex flex-col justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-emerald-600 p-2 rounded-xl shadow-lg shadow-emerald-900/40">
                            <ShieldCheck size={20} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900">Verification Center</h1>
                    </div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Operational Security Hub / Workflow 03</p>
                </div>

                {dashboardStats && (
                    <div className="flex flex-wrap gap-4">
                        <div className="bg-white border border-gray-100 shadow-sm px-6 py-3 rounded-2xl flex items-center gap-4">
                            <Activity size={16} className="text-blue-500" />
                            <div>
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Active matches</p>
                                <p className="text-sm font-black text-gray-900">{dashboardStats.matches.total}</p>
                            </div>
                        </div>
                        <div className="bg-white border border-gray-100 shadow-sm px-6 py-3 rounded-2xl flex items-center gap-4">
                            <Zap size={16} className="text-emerald-500" />
                            <div>
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Verified Today</p>
                                <p className="text-sm font-black text-emerald-600">{dashboardStats.matches.verified}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Scanning HUD */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-[3rem] p-8 md:p-12 shadow-2xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/5 rounded-full blur-[100px] pointer-events-none"/>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/5 rounded-full blur-[100px] pointer-events-none"/>

                        <div className="flex flex-col justify-between items-center gap-8 relative z-10">
                            <div className="text-center md:text-left">
                                <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">Camera QR Scanner</h2>
                                <p className="text-gray-400 text-sm max-w-sm font-bold uppercase tracking-tight leading-relaxed">
                                    Point the camera at the match QR code to instantly verify and unlock scoring.
                                </p>
                            </div>
                            <button 
                                onClick={() => setShowScanner(prev => !prev)}
                                className={`px-10 py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] transition-all flex items-center gap-4 ${
                                    showScanner 
                                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/40' 
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-900/40'
                                }`}
                            >
                                {showScanner ? <><XCircle size={18} /> Stop Camera</> : <><Camera size={18} /> Open Camera</>}
                            </button>
                        </div>

                        {/* Scanner Viewport */}
                        <div className="mt-10">
                            {showScanner ? (
                                <CameraScanner
                                    onScan={handleScan}
                                    onClose={() => setShowScanner(false)}
                                />
                            ) : (
                                <div className="bg-gray-800/20 rounded-[2.5rem] border-2 border-dashed border-gray-700 h-64 flex flex-col items-center justify-center text-gray-600 gap-4">
                                    <CameraOff className="opacity-20" size={48} />
                                    <p className="text-xs font-black uppercase tracking-widest">Camera Offline — Press "Open Camera" to Start</p>
                                </div>
                            )}
                        </div>

                        {/* Status Feedback */}
                        {scanStatus !== 'idle' && (
                            <div className={`mt-8 p-8 rounded-[2rem] border-2 animate-in slide-in-from-bottom-4 duration-500 ${
                                scanStatus === 'success' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 
                                scanStatus === 'scanning' ? 'bg-blue-500/5 border-blue-500/20 text-blue-400' : 
                                'bg-red-500/5 border-red-500/20 text-red-400'
                            }`}>
                                <div className="flex items-start gap-4">
                                    {scanStatus === 'success' ? <CheckCircle size={24} /> : 
                                     scanStatus === 'scanning' ? <Activity className="animate-pulse" size={24} /> : 
                                     <XCircle size={24} />}
                                    
                                    <div className="flex-1">
                                        <h3 className="text-lg font-black uppercase tracking-tight mb-2">
                                            {scanStatus === 'success' ? 'Verification Successful' : 
                                             scanStatus === 'scanning' ? 'Decrypting Payload...' : 
                                             'Authorization Failed'}
                                        </h3>
                                        {scanStatus === 'success' && matchDetails && (
                                            <div className="space-y-1 text-xs font-bold uppercase opacity-80">
                                                <p>Match Node: {matchDetails.title}</p>
                                                <p>Verification Token: #{matchDetails._id.slice(-8)}</p>
                                                <p className="text-emerald-500">Live Scoring Protocols: Unlocked</p>
                                            </div>
                                        )}
                                        {scanStatus === 'error' && (
                                            <div className="space-y-4">
                                                <p className="text-xs font-bold uppercase opacity-80 leading-relaxed">The identity signature provided is invalid or has expired sessions.</p>
                                                <button 
                                                    onClick={() => setShowOverride(true)}
                                                    className="bg-red-500/10 text-red-500 border border-red-500/20 px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
                                                >
                                                    Manual Override Protocol
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Controls */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-[3rem] p-8 shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <AlertTriangle className="text-yellow-500" size={20} />
                            <h2 className="text-lg font-black text-white uppercase tracking-tight">System Override</h2>
                        </div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-tight leading-relaxed mb-8">
                            Only use manual protocols when physical team identity is confirmed but optical scanning fails.
                        </p>
                        
                        {(showOverride || scanStatus === 'error') ? (
                            <form onSubmit={handleManualOverride} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <Lock size={12} /> Target Match ID
                                    </label>
                                    <input 
                                        type="text" 
                                        value={overrideMatchId}
                                        onChange={(e) => setOverrideMatchId(e.target.value)}
                                        placeholder="Enter ID..."
                                        className="w-full bg-gray-900/50 border border-gray-700 p-4 rounded-2xl outline-none focus:border-red-500/50 text-sm font-bold transition-all"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <ShieldCheck size={12} /> Justification
                                    </label>
                                    <select 
                                        value={overrideReason}
                                        onChange={(e) => setOverrideReason(e.target.value)}
                                        className="w-full bg-gray-900/50 border border-gray-700 p-4 rounded-2xl outline-none focus:border-red-500/50 text-sm font-bold transition-all appearance-none"
                                        required
                                    >
                                        <option value="">Select Reason...</option>
                                        <option value="Physical Verification Success">Physical Identity Confirmed</option>
                                        <option value="Device Failure">Device Hardware Failure</option>
                                        <option value="Expired Session Override">Expired Session Override</option>
                                    </select>
                                </div>
                                <button 
                                    type="submit"
                                    className="w-full bg-red-600 hover:bg-red-700 text-white py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-red-900/40"
                                >
                                    Force Authorization
                                </button>
                            </form>
                        ) : (
                            <button 
                                onClick={() => setShowOverride(true)}
                                className="w-full border-2 border-dashed border-gray-700 text-gray-600 py-8 rounded-[2rem] hover:bg-gray-800/50 hover:border-gray-600 hover:text-gray-400 transition-all group"
                            >
                                <Unlock size={24} className="mx-auto mb-2 opacity-20 group-hover:opacity-100 transition-all" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Enter Override Protocol</span>
                            </button>
                        )}
                    </div>
                    
                    <div className="bg-emerald-950/20 border border-emerald-500/10 rounded-[3rem] p-8 shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <Activity className="text-emerald-500" size={20} />
                            <h2 className="text-lg font-black text-white uppercase tracking-tight">Status Insight</h2>
                        </div>
                        <p className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest leading-loose">
                            Last Scan: {dashboardStats?.scans?.latestResult || 'NONE'} <br/>
                            Scanner Latency: 42ms <br/>
                            Neural Integrity: 100%
                        </p>
                    </div>
                </div>
            </div>
            
            <style jsx>{`
                @keyframes scan {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(400%); }
                }
                .animate-scan {
                    animation: scan 3s linear infinite;
                }
            `}</style>
            </div>
            </main>
        </div>
    );
};

export default Scanner;
