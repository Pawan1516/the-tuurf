import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
    CheckCircle, 
    AlertTriangle, 
    XCircle, 
    Camera, 
    ShieldCheck, 
    Activity, 
    Zap,
    Lock,
    Unlock,
    CameraOff
} from 'lucide-react';

// ─── Real Camera QR Scanner Component ───────────────────────────────────────
const CameraScanner = ({ onScan, onClose }) => {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const rafRef = useRef(null);
    const detectorRef = useRef(null);
    const [camError, setCamError] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const [manualMode, setManualMode] = useState(false);
    const [manualInput, setManualInput] = useState('');

    const stopCamera = useCallback(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    }, []);

    const scanLoop = useCallback(async () => {
        if (!videoRef.current || !detectorRef.current) return;
        if (videoRef.current.readyState < 2) {
            rafRef.current = requestAnimationFrame(scanLoop);
            return;
        }
        try {
            const codes = await detectorRef.current.detect(videoRef.current);
            if (codes.length > 0) {
                stopCamera();
                onScan(codes[0].rawValue);
                return;
            }
        } catch (_) {}
        rafRef.current = requestAnimationFrame(scanLoop);
    }, [onScan, stopCamera]);

    useEffect(() => {
        const hasBarcodeDetector = 'BarcodeDetector' in window;
        if (!hasBarcodeDetector) {
            setManualMode(true);
            return;
        }

        detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });

        navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
        }).then(stream => {
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current.play();
                    setIsReady(true);
                    rafRef.current = requestAnimationFrame(scanLoop);
                };
            }
        }).catch(err => {
            console.error('Camera error:', err);
            setCamError(err.name === 'NotAllowedError' 
                ? 'Camera permission denied. Please allow camera access in your browser settings.' 
                : 'Could not open camera. Try using the manual input below.');
            setManualMode(true);
        });

        return () => stopCamera();
    }, [scanLoop, stopCamera]);

    if (manualMode || camError) {
        return (
            <div className="rounded-[2.5rem] border-2 border-dashed border-gray-600 p-8 flex flex-col items-center gap-6">
                {camError && <p className="text-yellow-400 text-xs font-bold text-center uppercase tracking-wide">{camError}</p>}
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest text-center">
                    {camError ? 'Manual Override: Paste QR Payload' : 'Browser does not support camera scanning. Paste QR payload below.'}
                </p>
                <div className="w-full max-w-md">
                    <input
                        type="text"
                        value={manualInput}
                        onChange={e => setManualInput(e.target.value)}
                        placeholder="Paste QR payload here..."
                        className="w-full p-5 rounded-[1.5rem] bg-gray-900/50 border-2 border-dashed border-gray-700 text-emerald-400 font-mono text-xs focus:border-emerald-500 outline-none transition-all placeholder:text-gray-600"
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter' && manualInput.trim()) onScan(manualInput.trim()); }}
                    />
                    <button
                        onClick={() => manualInput.trim() && onScan(manualInput.trim())}
                        className="w-full mt-3 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
                    >
                        Submit Payload
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative rounded-[2.5rem] overflow-hidden border-2 border-emerald-500/30 bg-black" style={{ aspectRatio: '4/3' }}>
            {/* Live camera feed */}
            <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
            />

            {/* Scanning overlay */}
            {isReady && (
                <>
                    {/* Corner guides */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="relative w-56 h-56 md:w-64 md:h-64">
                            {/* Corners */}
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg"/>
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg"/>
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg"/>
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg"/>
                            {/* Scan line */}
                            <div className="absolute left-0 right-0 h-0.5 bg-emerald-400/80 shadow-lg shadow-emerald-400" style={{ animation: 'scanLine 2s linear infinite' }}/>
                        </div>
                    </div>
                    <div className="absolute bottom-4 left-0 right-0 text-center">
                        <span className="bg-black/60 text-emerald-400 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full">
                            Scanning for QR Code...
                        </span>
                    </div>
                </>
            )}

            {/* Loading state */}
            {!isReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
                    <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"/>
                    <p className="text-emerald-400 text-xs font-black uppercase tracking-widest">Initializing Camera...</p>
                </div>
            )}

            <style>{`
                @keyframes scanLine {
                    0% { top: 0%; }
                    50% { top: 100%; }
                    100% { top: 0%; }
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

    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
    
    const api = axios.create({
        baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001',
        headers: { 'Authorization': token }
    });

    const fetchDashboard = React.useCallback(async () => {
        try {
            const res = await api.get('/api/admin/scan-dashboard');
            if (res.data.success) setDashboardStats(res.data.dashboard);
        } catch (error) {
            console.error('Error fetching dashboard:', error);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

    const handleScan = async (payload) => {
        if (!payload) return;
        setShowScanner(false);
        setScanStatus('scanning');
        try {
            const res = await api.post('/api/admin/scan-match', {
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
            const res = await api.post('/api/admin/override-match', {
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

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-10 font-sans selection:bg-emerald-500/30">
            {/* Header Area */}
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-emerald-600 p-2 rounded-xl shadow-lg shadow-emerald-900/40">
                            <ShieldCheck size={20} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-black uppercase tracking-tighter text-white">Verification Center</h1>
                    </div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Operational Security Hub / Workflow 03</p>
                </div>

                {dashboardStats && (
                    <div className="flex flex-wrap gap-4">
                        <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 px-6 py-3 rounded-2xl flex items-center gap-4">
                            <Activity size={16} className="text-blue-400" />
                            <div>
                                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Active matches</p>
                                <p className="text-sm font-black text-white">{dashboardStats.matches.total}</p>
                            </div>
                        </div>
                        <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 px-6 py-3 rounded-2xl flex items-center gap-4">
                            <Zap size={16} className="text-emerald-400" />
                            <div>
                                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Verified Today</p>
                                <p className="text-sm font-black text-emerald-400">{dashboardStats.matches.verified}</p>
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

                        <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
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
    );
};

export default Scanner;
