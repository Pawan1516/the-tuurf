import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle } from 'lucide-react';

import { BACKEND_ORIGIN as API } from '../api/client';

export default function QRGate() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [qr, setQr] = useState(null);
  const [status, setStatus] = useState('PENDING');
  const [checking, setChecking] = useState(false);

  // fetch QR code on mount
  useEffect(() => {
    async function fetchQr() {
      try {
        const res = await fetch(`${API}/api/matches/${matchId}/qr`);
        const data = await res.json();
        if (res.ok) setQr(data.qr_image);
      } catch (e) {
        console.error('QR fetch error', e);
      }
    }
    fetchQr();
  }, [matchId]);

  // poll verification status
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/matches/${matchId}/status`);
        const data = await res.json();
        if (res.ok) {
          setStatus(data.verification.status);
          if (data.verification.status === 'VERIFIED') {
            clearInterval(interval);
            // proceed to player connect step
            navigate(`/match/player-connect/${matchId}`);
          }
        }
      } catch (e) {
        console.error('status poll error', e);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [matchId, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-2xl font-bold mb-4">QR Gate – Admin Scan</h1>
      {qr ? (
        <img src={qr} alt="Match QR" className="w-64 h-64 rounded-lg mb-4" />
      ) : (
        <Loader2 className="animate-spin w-12 h-12 mb-4" />
      )}
      <p className="text-sm mb-2">Status: {status}</p>
      {checking && <Loader2 className="animate-spin w-6 h-6" />}
      {status === 'VERIFIED' && (
        <CheckCircle className="w-8 h-8 text-emerald-400" />
      )}
    </div>
  );
}
