import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { QrCode, Users, MapPin, Phone, Shield, User, CheckCircle2, ArrowRight } from 'lucide-react';
import apiClient from '../../api/client';
import { toast } from 'react-toastify';

export default function QRJoin() {
  const navigate = useNavigate();
  const { id: tournamentId } = useParams(); // optional, in case navigated from tournament

  const [scanMode, setScanMode] = useState(false);
  const [scanError, setScanError] = useState('');
  const [loading, setLoading] = useState(false);
  const [teamInfo, setTeamInfo] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requestStatus, setRequestStatus] = useState(null); // 'pending' | 'submitted'

  // User input details for join request
  const [userName, setUserName] = useState('');
  const [userMobile, setUserMobile] = useState('');
  const [playerRole, setPlayerRole] = useState('All-rounder');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  // Auto-populate user info if logged in
  useEffect(() => {
    // Attempt to get user from localStorage or state
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        setUserName(u.name || u.username || '');
        setUserMobile(u.phone || '');
      }
    } catch (_) {}
  }, []);

  // Camera QR scanner integration
  const startCamera = useCallback(async () => {
    setScanMode(true);
    setScanError('');
    setTeamInfo(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        scanFrame();
      }
    } catch (err) {
      setScanError('Camera access denied. Use Manual Entry below.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    setScanMode(false);
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  }, []);

  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      if (window.jsQR) {
        const code = window.jsQR(imageData.data, canvas.width, canvas.height);
        if (code) {
          handleDecodedCode(code.data);
          return;
        }
      }
    }
    animFrameRef.current = requestAnimationFrame(scanFrame);
  }, []);

  const handleDecodedCode = (dataString) => {
    stopCamera();
    // Expected QR code format: team ID or joinCode or full URL
    // If it's a URL, extract the join code or team id
    let parsedCode = dataString.trim();
    if (dataString.includes('/join/')) {
      const parts = dataString.split('/join/');
      parsedCode = parts[parts.length - 1];
    }
    setJoinCode(parsedCode);
    fetchTeamDetails(parsedCode);
  };

  const fetchTeamDetails = async (codeToUse) => {
    const code = codeToUse || joinCode;
    if (!code) return toast.error('Please enter a team code');
    setLoading(true);
    setTeamInfo(null);
    try {
      const res = await apiClient.get(`/teams/by-code/${code}`);
      if (res.data.success) {
        setTeamInfo(res.data.team);
      } else {
        toast.error(res.data.message || 'Team not found');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch team details');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    if (!teamInfo) return;
    if (!userName.trim()) return toast.error('Name is required');
    if (!userMobile.trim()) return toast.error('Mobile number is required');

    setSubmitting(true);
    try {
      const res = await apiClient.post(`/teams/${teamInfo._id}/request-join`, {
        joinCode: teamInfo.joinCode,
        userName,
        userMobile,
        role: playerRole
      });
      if (res.data.success) {
        setRequestStatus('submitted');
        toast.success('Join request sent to Captain! 🚀');
      } else {
        toast.error(res.data.message || 'Failed to send request');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error sending request');
    } finally {
      setSubmitting(false);
    }
  };

  if (requestStatus === 'submitted') {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center px-6">
        <div className="bg-white border border-black/8 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl shadow-emerald-500/10">
          <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-emerald-600 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-black mb-2">Request Submitted!</h2>
          <p className="text-slate-400 text-sm font-medium mb-8">
            Your request to join <strong>{teamInfo?.name}</strong> has been transmitted. The captain will review your application.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => navigate(tournamentId ? `/tournaments/${tournamentId}` : '/tournaments')}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black py-3.5 rounded-xl uppercase tracking-widest text-xs transition-all"
            >
              Back to Tournament
            </button>
            <button
              onClick={() => { setRequestStatus(null); setTeamInfo(null); setJoinCode(''); }}
              className="flex-1 bg-black/5 hover:bg-black/8 text-slate-600 font-black py-3.5 rounded-xl uppercase tracking-widest text-xs transition-all"
            >
              Scan Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] py-12 px-6">
      {/* jsQR CDN loader */}
      <link rel="preload" href="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js" as="script" />

      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <QrCode size={28} />
          </div>
          <h1 className="text-3xl font-black text-black uppercase tracking-tighter">Join a Team</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Scan QR Code or enter Team Join Code</p>
        </div>

        {/* QR Scan Mode & Manual Entry Switch */}
        <div className="bg-white border border-black/8 rounded-3xl p-8 shadow-sm space-y-6">
          
          {!teamInfo && (
            <>
              {/* QR Scanner Node */}
              {!scanMode ? (
                <button
                  onClick={startCamera}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                >
                  <QrCode size={18} /> Scan Team QR Code
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-emerald-500/20 aspect-video max-w-sm mx-auto">
                    <video ref={videoRef} className="w-full h-full object-cover" playsInline />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute inset-0 border-2 border-emerald-500 rounded-2xl pointer-events-none opacity-40">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 border-2 border-emerald-500 rounded-xl" />
                    </div>
                  </div>
                  <button
                    onClick={stopCamera}
                    className="w-full py-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl font-bold text-xs uppercase tracking-widest"
                  >
                    Cancel Scan
                  </button>
                </div>
              )}

              {scanError && (
                <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-bold text-center">
                  ⚠️ {scanError}
                </div>
              )}

              {/* Divider */}
              <div className="flex items-center gap-4 py-2">
                <div className="flex-1 h-px bg-black/5" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OR ENTER MANUALLY</span>
                <div className="flex-1 h-px bg-black/5" />
              </div>

              {/* Manual Entry Form */}
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Enter Join Code (e.g. TF-78AB2)"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="flex-1 bg-black/3 border border-black/10 rounded-xl px-4 py-3 text-sm font-bold placeholder-slate-400 outline-none focus:border-emerald-500"
                />
                <button
                  onClick={() => fetchTeamDetails()}
                  disabled={loading || !joinCode}
                  className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                >
                  {loading ? 'Searching...' : 'Find Team'}
                </button>
              </div>
            </>
          )}

          {/* Decoded Team Info & Join Request Details */}
          {teamInfo && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="bg-black/3 rounded-2xl p-5 flex items-center gap-4">
                {teamInfo.logo ? (
                  <img src={teamInfo.logo} alt={teamInfo.name} className="w-16 h-16 rounded-2xl object-cover border" />
                ) : (
                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 font-black text-2xl">
                    {teamInfo.name?.[0]}
                  </div>
                )}
                <div>
                  <h3 className="font-black text-lg text-black uppercase tracking-tight">{teamInfo.name}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><MapPin size={12} className="text-slate-400" />{teamInfo.city || 'Any City'}</span>
                    <span className="flex items-center gap-1"><Shield size={12} className="text-slate-400" />Captain: {teamInfo.captain?.name || 'Captain'}</span>
                    <span className="flex items-center gap-1"><Users size={12} className="text-slate-400" />{teamInfo.players?.length || 0} Players</span>
                  </div>
                </div>
              </div>

              {/* Player signup details form */}
              <form onSubmit={handleJoinSubmit} className="space-y-4 pt-4 border-t border-black/5">
                <div>
                  <h4 className="text-xs font-black text-black uppercase tracking-widest mb-4">Your Squad Profile</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Full Name</label>
                    <input
                      type="text"
                      placeholder="Your Name"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="w-full bg-black/3 border border-black/10 rounded-xl px-4 py-3 text-sm font-bold text-black outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Mobile Number</label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        placeholder="10-digit number"
                        value={userMobile}
                        onChange={(e) => setUserMobile(e.target.value)}
                        className="w-full bg-black/3 border border-black/10 pl-10 pr-4 py-3 text-sm font-bold text-black outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Playing Role</label>
                  <select
                    value={playerRole}
                    onChange={(e) => setPlayerRole(e.target.value)}
                    className="w-full bg-black/3 border border-black/10 rounded-xl px-4 py-3 text-sm font-bold text-black outline-none focus:border-emerald-500"
                  >
                    <option value="All-rounder">All-rounder</option>
                    <option value="Batsman">Batsman</option>
                    <option value="Bowler">Bowler</option>
                    <option value="Wicketkeeper">Wicketkeeper</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-black py-4 rounded-2xl uppercase tracking-widest text-xs transition-all shadow-lg shadow-emerald-500/20"
                  >
                    {submitting ? (
                      <><div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />Sending...</>
                    ) : (
                      <><User size={16} />Request to Join Squad</>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTeamInfo(null); setJoinCode(''); }}
                    className="bg-black/5 hover:bg-black/8 text-slate-600 font-black px-6 py-4 rounded-2xl uppercase tracking-widest text-xs transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
