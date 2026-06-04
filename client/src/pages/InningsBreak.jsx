import React, { useState, useEffect } from 'react';
import { useMatchFlow } from '../context/MatchFlowContext';
import { useNavigate } from 'react-router-dom';

export default function InningsBreak() {
  const { matchData, liveScore, updateMatch, nextStep } = useMatchFlow();
  const navigate = useNavigate();

  const inn1Runs = liveScore?.inn1Runs || matchData?.inn1Score?.runs || 0;
  const inn1Wickets = liveScore?.inn1Wickets || matchData?.inn1Score?.wickets || 0;
  const inn1Overs = liveScore?.inn1Overs || matchData?.inn1Score?.overs || '0.0';
  const target = inn1Runs + 1;

  const battingFirst = matchData?.toss?.battingFirst || 'Team A';
  const chasingTeam = matchData?.toss?.bowlingFirst || 'Team B';

  const [countdown, setCountdown] = useState(30);
  const [ready, setReady] = useState(false);
  const [targetAnim, setTargetAnim] = useState(0);

  useEffect(() => {
    // Animate target counter
    let current = 0;
    const step = target / 40;
    const t = setInterval(() => {
      current = Math.min(current + step, target);
      setTargetAnim(Math.floor(current));
      if (current >= target) clearInterval(t);
    }, 30);

    // Countdown
    const cd = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(cd);
          setReady(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { clearInterval(t); clearInterval(cd); };
  }, [target]);

  const startSecondInnings = () => {
    updateMatch({ currentInnings: 2 });
    nextStep('scoring');
    navigate('/match/scoring');
  };

  return (
    <div style={pageStyle}>
      <BackgroundOrbs />

      <div style={{ width: '100%', maxWidth: '500px', textAlign: 'center' }}>
        {/* Badge */}
        <div style={{ display: 'inline-flex', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: '100px', padding: '0.4rem 1.2rem', marginBottom: '1.5rem', color: '#818cf8', fontSize: '0.78rem', fontWeight: '700', letterSpacing: '0.1em' }}>
          ⏸ INNINGS BREAK
        </div>

        {/* Main card */}
        <div style={cardStyle}>
          {/* 1st Innings Score */}
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ color: '#6b7280', fontSize: '0.78rem', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              {battingFirst} – 1st Innings
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.3rem' }}>
              <span style={{ fontSize: '3.5rem', fontWeight: '900', color: '#f0fdf4', lineHeight: 1 }}>{inn1Runs}</span>
              <span style={{ fontSize: '1.5rem', color: '#6b7280', fontWeight: '700' }}>/{inn1Wickets}</span>
            </div>
            <p style={{ color: '#4b5563', fontSize: '0.9rem', marginTop: '0.3rem' }}>{inn1Overs} overs</p>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)', margin: '1rem 0' }} />

          {/* Target */}
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
              Target for {chasingTeam}
            </p>
            <div style={{
              fontSize: '5rem', fontWeight: '900', lineHeight: 1,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {targetAnim}
            </div>
            <p style={{ color: '#4b5563', fontSize: '0.82rem', marginTop: '0.4rem' }}>
              Need {target} runs in {matchData?.overs || 10} overs
            </p>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'CRR', value: inn1Overs ? (inn1Runs / parseFloat(inn1Overs || 1)).toFixed(2) : '—' },
              { label: 'Required RR', value: matchData?.overs ? (target / matchData.overs).toFixed(2) : '—' },
              { label: 'Wickets Left', value: (10 - inn1Wickets) },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '0.75rem' }}>
                <div style={{ color: '#4b5563', fontSize: '0.72rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                <div style={{ color: '#f0fdf4', fontWeight: '800', fontSize: '1.1rem', marginTop: '0.2rem' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Countdown */}
          {!ready && (
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ color: '#6b7280', fontSize: '0.82rem', marginBottom: '0.5rem' }}>2nd Innings starts in</p>
              <div style={{
                fontSize: '2.5rem', fontWeight: '900', color: '#10b981',
                animation: 'pulse 1s ease-in-out infinite',
              }}>{countdown}s</div>
            </div>
          )}

          <button
            onClick={startSecondInnings}
            style={{
              width: '100%', padding: '1rem',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none', borderRadius: '12px', color: '#fff',
              fontSize: '1rem', fontWeight: '800', cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(16,185,129,0.4)',
              animation: ready ? 'pulse 1.5s ease-in-out infinite' : 'none',
            }}
          >
            🏏 Start 2nd Innings
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.03)} }
      `}</style>
    </div>
  );
}

function BackgroundOrbs() {
  return (
    <>
      <div style={{ position: 'fixed', top: '5%', right: '5%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '5%', left: '5%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
    </>
  );
}

const pageStyle = { minHeight: '100vh', background: 'linear-gradient(135deg, #0a0f1a 0%, #0d1f0d 60%, #0a0f1a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: "'Inter', sans-serif" };
const cardStyle = { background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '2rem', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' };
