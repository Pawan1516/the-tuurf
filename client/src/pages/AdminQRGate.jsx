import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMatchFlow } from '../context/MatchFlowContext';
import { useNavigate } from 'react-router-dom';

import { BACKEND_ORIGIN as API } from '../api/client';

export default function AdminQRGate() {
  const { matchId, qrCode, verificationStatus, markVerified, matchData } = useMatchFlow();
  const navigate = useNavigate();

  const [status, setStatus] = useState(verificationStatus || 'PENDING');
  const [scanMode, setScanMode] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanSuccess, setScanSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pulseAnim, setPulseAnim] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const pollRef = useRef(null);
  const animFrameRef = useRef(null);

  // Poll backend every 3s for verification status
  useEffect(() => {
    if (!matchId) {
      navigate('/match/create');
      return;
    }
    if (status === 'VERIFIED') return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/matches/${matchId}`);
        const data = await res.json();
        if (data.match?.verification?.status === 'VERIFIED') {
          setStatus('VERIFIED');
          markVerified();
          setPulseAnim(true);
          clearInterval(pollRef.current);
        }
      } catch (_) {}
    }, 3000);

    return () => clearInterval(pollRef.current);
  }, [matchId, status, markVerified, navigate]);

  // Camera-based QR scan using jsQR (dynamically loaded)
  const startCamera = useCallback(async () => {
    setScanMode(true);
    setScanError('');
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
      // Try to use jsQR if available (CDN-loaded)
      if (window.jsQR) {
        const code = window.jsQR(imageData.data, canvas.width, canvas.height);
        if (code) {
          handleQRPayload(code.data);
          return;
        }
      }
    }
    animFrameRef.current = requestAnimationFrame(scanFrame);
  }, []);

  const handleQRPayload = async (payload) => {
    stopCamera();
    setScanError('');
    try {
      const res = await fetch(`${API}/api/matches/validate-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_payload: payload }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('VERIFIED');
        markVerified();
        setScanSuccess(true);
        setPulseAnim(true);
      } else {
        setScanError(`Scan failed: ${data.reason || 'Invalid QR'}`);
      }
    } catch {
      setScanError('Network error during scan validation.');
    }
  };

  // Manual token verification (for admin dashboard)
  const handleManualVerify = async (e) => {
    e.preventDefault();
    setManualLoading(true);
    setManualError('');
    try {
      const res = await fetch(`${API}/api/matches/admin/verify-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, token: manualToken }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('VERIFIED');
        markVerified();
        setPulseAnim(true);
      } else {
        setManualError(data.message || 'Verification failed');
      }
    } catch {
      setManualError('Network error');
    } finally {
      setManualLoading(false);
    }
  };

  const copyMatchId = () => {
    navigator.clipboard.writeText(matchId || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isVerified = status === 'VERIFIED';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0f1a 0%, #0d1f0d 60%, #0a0f1a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem', fontFamily: "'Inter', sans-serif",
    }}>
      {/* jsQR CDN loader */}
      <link rel="preload" href="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js" as="script" />

      {/* Animated background orbs */}
      <div style={{ position: 'fixed', top: '10%', right: '5%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)', pointerEvents: 'none', animation: 'orb1 6s ease-in-out infinite' }} />
      <div style={{ position: 'fixed', bottom: '10%', left: '5%', width: '250px', height: '250px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(5,150,105,0.05) 0%, transparent 70%)', pointerEvents: 'none', animation: 'orb2 8s ease-in-out infinite' }} />

      <div style={{ width: '100%', maxWidth: '560px' }}>
        {/* Status header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: isVerified ? 'rgba(16,185,129,0.2)' : 'rgba(234,179,8,0.15)',
            border: `1px solid ${isVerified ? 'rgba(16,185,129,0.5)' : 'rgba(234,179,8,0.4)'}`,
            borderRadius: '100px', padding: '0.4rem 1.2rem', marginBottom: '1rem',
            color: isVerified ? '#10b981' : '#eab308',
            fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.08em',
            animation: pulseAnim ? 'pulse 1s ease-out' : 'none',
            transition: 'all 0.5s',
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor', animation: isVerified ? 'none' : 'blink 1.2s infinite' }} />
            {isVerified ? '✅ ADMIN VERIFIED' : '⏳ PENDING ADMIN SCAN'}
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#f0fdf4', margin: '0 0 0.4rem 0' }}>
            {isVerified ? 'Match Unlocked!' : 'Admin QR Verification'}
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.88rem', margin: 0 }}>
            {isVerified
              ? 'The admin has verified this match. Proceed to the toss!'
              : 'An admin must scan the QR code below before the match can start.'}
          </p>
        </div>

        {/* Main card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${isVerified ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: '20px', padding: '2rem',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          transition: 'border-color 0.5s',
        }}>

          {/* QR Code Display */}
          {qrCode && !isVerified && (
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <p style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem' }}>
                📱 Show this QR to Admin
              </p>
              <div style={{
                display: 'inline-block', padding: '1rem',
                background: '#fff', borderRadius: '16px',
                boxShadow: '0 0 40px rgba(16,185,129,0.2), 0 0 0 4px rgba(16,185,129,0.1)',
              }}>
                <img src={qrCode} alt="Match QR Code" style={{ width: '200px', height: '200px', display: 'block' }} />
              </div>
              <p style={{ color: '#4b5563', fontSize: '0.75rem', marginTop: '0.75rem' }}>
                Valid for 3 hours after match start time
              </p>
            </div>
          )}

          {/* Verified checkmark */}
          {isVerified && (
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 1rem',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2rem',
                boxShadow: '0 0 40px rgba(16,185,129,0.5)',
                animation: 'popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}>
                ✅
              </div>
              <p style={{ color: '#10b981', fontWeight: '700', fontSize: '1.1rem' }}>Match Verified!</p>
              <p style={{ color: '#6b7280', fontSize: '0.82rem' }}>Proceed to the coin toss.</p>
            </div>
          )}

          {/* Match ID */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.05)', borderRadius: '10px',
            padding: '0.75rem 1rem', marginBottom: '1rem',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div>
              <div style={{ color: '#6b7280', fontSize: '0.72rem', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Match ID</div>
              <div style={{ color: '#f0fdf4', fontFamily: 'monospace', fontSize: '0.82rem', marginTop: '2px' }}>
                {matchId ? `...${matchId.slice(-12)}` : '—'}
              </div>
            </div>
            <button
              onClick={copyMatchId}
              style={{
                background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.08)',
                border: 'none', borderRadius: '8px', padding: '0.4rem 0.8rem',
                color: copied ? '#10b981' : '#9ca3af', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600',
              }}
            >
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
          </div>

          {/* Divider */}
          {!isVerified && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.25rem 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                <span style={{ color: '#4b5563', fontSize: '0.75rem', fontWeight: '600' }}>ADMIN OPTIONS</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
              </div>

              {/* Camera Scan Button */}
              {!scanMode ? (
                <button
                  onClick={startCamera}
                  style={{
                    width: '100%', padding: '0.85rem',
                    background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: '12px', color: '#10b981',
                    fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer', marginBottom: '0.75rem',
                  }}
                >
                  📸 Scan QR with Camera (Admin)
                </button>
              ) : (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#000' }}>
                    <video ref={videoRef} style={{ width: '100%', display: 'block' }} playsInline />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    {/* Scan overlay */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      border: '2px solid rgba(16,185,129,0.6)',
                      borderRadius: '12px',
                    }}>
                      <div style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '160px', height: '160px',
                        border: '2px solid #10b981',
                        borderRadius: '8px',
                      }} />
                    </div>
                  </div>
                  <button
                    onClick={stopCamera}
                    style={{
                      width: '100%', marginTop: '0.5rem', padding: '0.6rem',
                      background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: '10px', color: '#f87171', cursor: 'pointer', fontSize: '0.85rem',
                    }}
                  >
                    ✕ Cancel Scan
                  </button>
                </div>
              )}

              {scanError && (
                <div style={{ padding: '0.7rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', color: '#f87171', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                  ⚠️ {scanError}
                </div>
              )}

              {/* Manual token entry */}
              <form onSubmit={handleManualVerify}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text" value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="Enter admin verification token"
                    style={{
                      flex: 1, padding: '0.7rem 0.9rem',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                      color: '#f0fdf4', fontSize: '0.82rem', fontFamily: 'monospace',
                    }}
                  />
                  <button
                    type="submit" disabled={manualLoading || !manualToken}
                    style={{
                      padding: '0.7rem 1.2rem',
                      background: manualLoading ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg,#10b981,#059669)',
                      border: 'none', borderRadius: '10px',
                      color: '#fff', fontWeight: '700', cursor: manualLoading ? 'not-allowed' : 'pointer', fontSize: '0.82rem',
                    }}
                  >
                    {manualLoading ? '...' : 'Verify'}
                  </button>
                </div>
                {manualError && (
                  <p style={{ color: '#f87171', fontSize: '0.78rem', marginTop: '0.4rem' }}>⚠️ {manualError}</p>
                )}
              </form>
            </>
          )}

          {/* Continue Button */}
          <button
            onClick={() => navigate(`/match/toss/${matchId}`)}
            disabled={!isVerified}
            style={{
              width: '100%', padding: '1rem', marginTop: '1.5rem',
              background: isVerified
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : 'rgba(255,255,255,0.06)',
              border: 'none', borderRadius: '12px',
              color: isVerified ? '#fff' : '#4b5563',
              fontSize: '1rem', fontWeight: '700',
              cursor: isVerified ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s',
              boxShadow: isVerified ? '0 4px 20px rgba(16,185,129,0.4)' : 'none',
              letterSpacing: '0.03em',
            }}
          >
            {isVerified ? '🪙 Continue to Toss' : '🔒 Locked – Awaiting Admin Scan'}
          </button>

          {!isVerified && (
            <p style={{ textAlign: 'center', color: '#374151', fontSize: '0.75rem', marginTop: '0.75rem' }}>
              Polling every 3 seconds…
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.04); }
          100% { transform: scale(1); }
        }
        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes orb1 {
          0%, 100% { transform: translate(0,0); }
          50% { transform: translate(-20px, 20px); }
        }
        @keyframes orb2 {
          0%, 100% { transform: translate(0,0); }
          50% { transform: translate(20px, -15px); }
        }
      `}</style>
    </div>
  );
}
