// src/components/live/ScoreGraph.jsx
import React, { useEffect, useState } from 'react';
import { connectLive } from '../../utils/liveApi';

/**
 * Placeholder line chart using Recharts (if installed) or simple div.
 * For now it renders a simple box with "Graph" text.
 */
export default function ScoreGraph({ matchId }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (!matchId) return;
    const { close } = connectLive(matchId, (payload) => {
      // Assume payload contains a `graphData` array
      if (payload.graphData) setData(payload.graphData);
    });
    return () => close();
  }, [matchId]);

  return (
    <div style={containerStyle}>
      <h3 style={titleStyle}>Score Progression</h3>
      {/* Replace with actual chart library later */}
      <div style={placeholderStyle}>Graph placeholder (data points: {data.length})</div>
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

const titleStyle = {
  margin: 0,
  marginBottom: '0.5rem',
  color: '#10b981',
  fontSize: '1.1rem',
};

const placeholderStyle = {
  height: '150px',
  background: 'rgba(255,255,255,0.05)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#94a3b8',
  fontStyle: 'italic',
};
