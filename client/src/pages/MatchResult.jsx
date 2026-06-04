import React, { useState, useEffect } from 'react';
import { useMatchFlow } from '../context/MatchFlowContext';
import { useNavigate } from 'react-router-dom';

export default function MatchResult() {
  const { matchData, liveScore, matchId } = useMatchFlow();
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(false);
  const [animIn, setAnimIn] = useState(false);

  const teamA = matchData?.teams?.teamA?.name || 'Team A';
  const teamB = matchData?.teams?.teamB?.name || 'Team B';
  const result = matchData?.matchResult || {};
  const winner = result.winner || matchData?.toss?.battingFirst || teamA;
  const wonBy = result.wonBy || 'runs';
  const margin = result.margin || 0;

  // Scores
  const teamAScore = result.teamAScore || { runs: liveScore?.inn1Runs || 0, wickets: liveScore?.inn1Wickets || 0, overs: liveScore?.inn1Overs || '0.0' };
  const teamBScore = result.teamBScore || { runs: liveScore?.runs || 0, wickets: liveScore?.wickets || 0, overs: liveScore?.overs || '0.0' };

  useEffect(() => {
    setTimeout(() => { setAnimIn(true); setShowConfetti(true); }, 200);
    const t = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(t);
  }, []);

  // Confetti particles
  const confettiColors = ['#10b981', '#059669', '#f59e0b', '#6366f1', '#f0fdf4', '#34d399'];
  const confettiPieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 2,
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
    size: 6 + Math.random() * 8,
    shape: Math.random() > 0.5 ? 'circle' : 'rect',
  }));

  return (
    <div style={pageStyle}>
      {/* Confetti */}
      {showConfetti && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 10 }}>
          {confettiPieces.map(p => (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                left: `${p.x}%`,
                top: '-10px',
                width: `${p.size}px`,
                height: p.shape === 'circle' ? `${p.size}px` : `${p.size * 0.6}px`,
                borderRadius: p.shape === 'circle' ? '50%' : '2px',
                background: p.color,
                animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
                opacity: 0.9,
              }}
            />
          ))}
        </div>
      )}

      <BackgroundOrbs />

      <div style={{
        width: '100%', maxWidth: '540px', textAlign: 'center',
        opacity: animIn ? 1 : 0,
        transform: animIn ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.95)',
        transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        {/* Trophy */}
        <div style={{
          fontSize: '5rem', marginBottom: '0.5rem',
          animation: animIn ? 'trophyBounce 1s ease-out 0.3s both' : 'none',
        }}>🏆</div>

        {/* Winner badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.5)',
          borderRadius: '100px', padding: '0.5rem 1.5rem', marginBottom: '1rem',
          color: '#10b981', fontSize: '0.9rem', fontWeight: '800', letterSpacing: '0.05em',
          boxShadow: '0 0 30px rgba(16,185,129,0.3)',
          animation: animIn ? 'pulseGlow 2s ease-in-out infinite' : 'none',
        }}>
          🎉 {winner} wins!
        </div>

        <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          {margin > 0 ? `by ${margin} ${wonBy}` : 'Match Complete!'}
        </p>

        {/* Score comparison card */}
        <div style={cardStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
            {/* Team A */}
            <ScoreBlock
              name={teamA}
              runs={teamAScore.runs}
              wickets={teamAScore.wickets}
              overs={teamAScore.overs}
              isWinner={winner === teamA}
              color="#10b981"
            />

            {/* VS */}
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#4b5563', fontSize: '0.75rem', fontWeight: '800',
            }}>VS</div>

            {/* Team B */}
            <ScoreBlock
              name={teamB}
              runs={teamBScore.runs}
              wickets={teamBScore.wickets}
              overs={teamBScore.overs}
              isWinner={winner === teamB}
              color="#6366f1"
            />
          </div>

          {/* Result line */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.08))',
            border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: '12px', padding: '0.85rem 1.25rem',
            color: '#10b981', fontWeight: '700', fontSize: '0.95rem',
          }}>
            🏆 {winner} won {margin > 0 ? `by ${margin} ${wonBy}` : '!'}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button
            onClick={() => navigate('/match/summary')}
            style={{
              flex: 1, padding: '0.9rem',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none', borderRadius: '12px', color: '#fff',
              fontWeight: '800', cursor: 'pointer', fontSize: '0.9rem',
              boxShadow: '0 4px 20px rgba(16,185,129,0.35)',
            }}
          >
            📊 View Scorecard
          </button>
          <button
            onClick={() => navigate('/match/stats')}
            style={{
              flex: 1, padding: '0.9rem',
              background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: '12px', color: '#818cf8',
              fontWeight: '800', cursor: 'pointer', fontSize: '0.9rem',
            }}
          >
            🏅 Leaderboard
          </button>
        </div>

        <button
          onClick={() => { window.navigator.share?.({ title: `${winner} wins!`, text: `${winner} beat the opposition! Check the match on The Turf.` }); }}
          style={{
            width: '100%', marginTop: '0.75rem', padding: '0.75rem',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px', color: '#9ca3af', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600',
          }}
        >
          📤 Share Result
        </button>
      </div>

      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes trophyBounce {
          0% { transform: scale(0.3) rotate(-10deg); opacity: 0; }
          60% { transform: scale(1.2) rotate(5deg); }
          80% { transform: scale(0.95) rotate(-2deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 30px rgba(16,185,129,0.3); }
          50% { box-shadow: 0 0 50px rgba(16,185,129,0.6); }
        }
      `}</style>
    </div>
  );
}

function ScoreBlock({ name, runs, wickets, overs, isWinner, color }) {
  return (
    <div style={{
      padding: '1rem', borderRadius: '12px',
      background: isWinner ? `${color}15` : 'rgba(255,255,255,0.03)',
      border: `1px solid ${isWinner ? `${color}40` : 'rgba(255,255,255,0.06)'}`,
      transition: 'all 0.3s',
    }}>
      {isWinner && <div style={{ fontSize: '1rem', marginBottom: '0.3rem' }}>👑</div>}
      <div style={{ color: isWinner ? color : '#9ca3af', fontWeight: '800', fontSize: '0.85rem', marginBottom: '0.4rem' }}>{name}</div>
      <div style={{ color: '#f0fdf4', fontWeight: '900', fontSize: '1.6rem', lineHeight: 1 }}>
        {runs}<span style={{ color: '#6b7280', fontSize: '1rem' }}>/{wickets}</span>
      </div>
      <div style={{ color: '#4b5563', fontSize: '0.75rem', marginTop: '0.2rem' }}>{overs} ov</div>
    </div>
  );
}

function BackgroundOrbs() {
  return (
    <>
      <div style={{ position: 'fixed', top: '5%', right: '5%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '5%', left: '5%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
    </>
  );
}

const pageStyle = { minHeight: '100vh', background: 'linear-gradient(135deg, #0a0f1a 0%, #0d1f0d 60%, #0a0f1a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: "'Inter', sans-serif", position: 'relative', overflow: 'hidden' };
const cardStyle = { background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '1.5rem', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' };
