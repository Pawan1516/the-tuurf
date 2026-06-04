// src/components/live/Scoreboard.jsx
import React from 'react';

/**
 * Displays the current score, overs and inning.
 * Expects `data` prop shape: { runs, wickets, overs, inningsNum }
 */
export default function Scoreboard({ data }) {
  const { runs = 0, wickets = 0, overs = '0.0', inningsNum = 1 } = data || {};

  return (
    <div style={cardStyle}>
      <h2 style={titleStyle}>Inning {inningsNum}</h2>
      <div style={scoreStyle}>
        <span style={runsStyle}>{runs}</span>
        <span style={separator}>/</span>
        <span style={wicketsStyle}>{wickets}</span>
        <span style={oversStyle}>({overs} overs)</span>
      </div>
    </div>
  );
}

const cardStyle = {
  background: 'rgba(15,23,42,0.45)',
  borderRadius: '12px',
  padding: '1rem 1.5rem',
  color: '#f0fdf4',
  textAlign: 'center',
  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
  backdropFilter: 'blur(12px)',
};

const titleStyle = {
  margin: 0,
  fontSize: '1.2rem',
  color: '#10b981',
  fontWeight: 600,
};

const scoreStyle = {
  marginTop: '0.6rem',
  fontSize: '2rem',
  fontWeight: 700,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '0.4rem',
};

const runsStyle = { color: '#facc15' };
const wicketsStyle = { color: '#ef4444' };
const oversStyle = { fontSize: '0.8rem', color: '#94a3b8' };
const separator = { color: '#94a3b8' };
