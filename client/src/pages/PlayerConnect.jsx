import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMatchFlow } from '../context/MatchFlowContext';

function PlayerConnect() {
  const { matchId, matchData, updateMatch } = useMatchFlow();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');

  const addPlayer = () => {
    if (!name || !mobile) return;
    // For simplicity, add to teamA's player list
    const newPlayers = [...(matchData?.teams?.teamA?.players || []), { name, mobile }];
    updateMatch({
      ...matchData,
      teams: {
        ...matchData?.teams,
        teamA: {
          ...matchData?.teams?.teamA,
          players: newPlayers,
        },
      },
    });
    setName('');
    setMobile('');
  };

  const proceedToToss = () => {
    if (matchId) {
      navigate(`/match/toss/${matchId}`);
    }
  };

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>Player Connect</h2>
      <p style={subtitleStyle}>Enter player name and mobile number to join the match.</p>
      <div style={formStyle}>
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="Mobile"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          style={inputStyle}
        />
        <button onClick={addPlayer} style={buttonStyle}>Add Player</button>
      </div>
      <div style={listStyle}>
        <h3 style={sectionTitle}>Connected Players</h3>
        <ul>
          {(matchData?.teams?.teamA?.players || []).map((p, i) => (
            <li key={i}>{p.name} - {p.mobile}</li>
          ))}
        </ul>
      </div>
      <button onClick={proceedToToss} style={nextButtonStyle}>Proceed to Toss</button>
    </div>
  );
}

// Simple styling objects (reuse from existing theme)
const containerStyle = {
  background: 'rgba(15,23,42,0.6)',
  padding: '2rem',
  borderRadius: '12px',
  maxWidth: '600px',
  margin: '2rem auto',
  color: '#f0fdf4',
  fontFamily: "'Inter', sans-serif",
};
const titleStyle = { fontSize: '1.8rem', marginBottom: '0.5rem' };
const subtitleStyle = { marginBottom: '1rem', color: '#94a3b8' };
const formStyle = { display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' };
const inputStyle = { padding: '0.6rem', borderRadius: '6px', border: '1px solid #334155', background: '#1e293b', color: '#f0fdf4' };
const buttonStyle = { background: '#10b981', color: '#fff', border: 'none', padding: '0.6rem 1rem', borderRadius: '6px', cursor: 'pointer' };
const nextButtonStyle = { ...buttonStyle, marginTop: '1rem' };
const listStyle = { marginTop: '1rem' };
const sectionTitle = { marginBottom: '0.5rem' };

export default PlayerConnect;
