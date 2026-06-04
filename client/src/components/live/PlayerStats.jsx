// src/components/live/PlayerStats.jsx
import React, { useEffect, useState } from 'react';
import { connectLive } from '../../utils/liveApi';

/**
 * Placeholder component showing batting & bowling tables for the current inning.
 * It expects live updates with `playerStats` payload containing arrays:
 *   batting: [{ name, runs, balls, fours, sixes, strikeRate }]
 *   bowling: [{ name, overs, maidens, runs, wickets, economy }]
 */
export default function PlayerStats({ matchId, innings }) {
  const [batting, setBatting] = useState([]);
  const [bowling, setBowling] = useState([]);

  useEffect(() => {
    if (!matchId) return;
    const { close } = connectLive(matchId, (payload) => {
      if (payload.playerStats) {
        const { batting: bat, bowling: bowl } = payload.playerStats;
        if (Array.isArray(bat)) setBatting(bat);
        if (Array.isArray(bowl)) setBowling(bowl);
      }
    });
    return () => close();
  }, [matchId]);

  // Simple table rendering – can be replaced with a richer UI later
  return (
    <div style={containerStyle}>
      <h3 style={titleStyle}>Inning {innings} – Player Stats</h3>
      <div style={tablesWrapperStyle}>
        <div style={tableContainerStyle}>
          <h4 style={subTitleStyle}>Batting</h4>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th>Name</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th>
              </tr>
            </thead>
            <tbody>
              {batting.map((p, i) => (
                <tr key={i}>
                  <td>{p.name}</td>
                  <td>{p.runs}</td>
                  <td>{p.balls}</td>
                  <td>{p.fours}</td>
                  <td>{p.sixes}</td>
                  <td>{p.strikeRate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={tableContainerStyle}>
          <h4 style={subTitleStyle}>Bowling</h4>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th>Name</th><th>O</th><th>M</th><th>R</th><th>W</th><th>Eco</th>
              </tr>
            </thead>
            <tbody>
              {bowling.map((p, i) => (
                <tr key={i}>
                  <td>{p.name}</td>
                  <td>{p.overs}</td>
                  <td>{p.maidens}</td>
                  <td>{p.runs}</td>
                  <td>{p.wickets}</td>
                  <td>{p.economy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
const subTitleStyle = { margin: '0.4rem 0 0.2rem', color: '#10b981' };
const tablesWrapperStyle = { display: 'flex', gap: '1rem', flexWrap: 'wrap' };
const tableContainerStyle = { flex: '1 1 250px', overflowX: 'auto' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', color: '#f0fdf4' };

// Basic table cell styling via inline CSS (could be moved to CSS file)
const thStyle = { borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0.4rem' };
const tdStyle = { borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0.3rem' };

// Apply cell styles via CSS-in-JS selectors if needed – omitted for brevity.
