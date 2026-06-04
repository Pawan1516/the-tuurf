// src/components/live/BallByBall.jsx
import React, { useEffect, useState } from 'react';
import { connectLive } from '../../utils/liveApi';

/**
 * Placeholder component that shows a scrollable list of recent ball events.
 * It subscribes to live updates (expects `ballData` array in payload).
 */
export default function BallByBall({ matchId }) {
  const [balls, setBalls] = useState([]);

  useEffect(() => {
    if (!matchId) return;
    const { close } = connectLive(matchId, (payload) => {
      if (payload.ballData && Array.isArray(payload.ballData)) {
        // Keep only last 20 events
        setBalls((prev) => [...prev, ...payload.ballData].slice(-20));
      }
    });
    return () => close();
  }, [matchId]);

  return (
    <div style={containerStyle}>
      <h3 style={titleStyle}>Ball‑by‑Ball</h3>
      <div style={feedStyle}>
        {balls.length === 0 ? (
          <p style={emptyStyle}>Waiting for live ball data…</p>
        ) : (
          balls.map((b, i) => (
            <div key={i} style={ballItemStyle}>
              {/* Expected b shape: { over, ball, batsman, bowler, runs, wicket? } */}
              <span>{b.over}.{b.ball}</span>
              <span> {b.batsman} </span>
              <span>vs {b.bowler}</span>
              <span> – {b.runs} runs{b.wicket ? ' (Wicket!)' : ''}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const containerStyle = {
  background: 'rgba(15,23,42,0.45)',
  borderRadius: '12px',
  padding: '1rem',
  color: '#f0fdf4',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
};

const titleStyle = { margin: 0, marginBottom: '0.5rem', color: '#10b981', fontSize: '1.1rem' };
const feedStyle = { maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' };
const emptyStyle = { color: '#94a3b8', fontStyle: 'italic' };
const ballItemStyle = { display: 'flex', gap: '0.4rem', padding: '0.2rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' };
