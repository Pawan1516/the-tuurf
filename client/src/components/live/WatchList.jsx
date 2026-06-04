import React, { useEffect } from 'react';
import { useMatchFlow } from '../../context/MatchFlowContext';

// Simple watch list UI with premium dark theme and micro‑animations
const WatchList = () => {
  const { watchList, addToWatchList, removeFromWatchList } = useMatchFlow();

  // Persist watch list in localStorage (client‑side only)
  useEffect(() => {
    const stored = localStorage.getItem('watchList');
    if (stored) {
      try {
        const ids = JSON.parse(stored);
        // sync with context if context is empty
        if (ids.length && (!watchList || watchList.length === 0)) {
          ids.forEach(id => addToWatchList(id));
        }
      } catch (e) {}
    }
  }, []);

  // Keep localStorage up‑to‑date
  useEffect(() => {
    if (watchList) {
      localStorage.setItem('watchList', JSON.stringify(watchList));
    }
  }, [watchList]);

  const handleToggle = (matchId) => {
    if (watchList?.includes(matchId)) {
      removeFromWatchList(matchId);
    } else {
      addToWatchList(matchId);
    }
  };

  if (!watchList || watchList.length === 0) {
    return <p style={emptyStyle}>Your watch list is empty – add a match to see live updates.</p>;
  }

  return (
    <ul style={listStyle}>
      {watchList.map((id) => (
        <li key={id} style={itemStyle}>
          <span style={idStyle}>Match {id.slice(-6).toUpperCase()}</span>
          <button
            onClick={() => handleToggle(id)}
            style={buttonStyle}
            title="Remove from watch list"
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
};

// Styles – premium dark‑mode palette (HSL 210,30%,15% background, accent HSL 170,60%,55%)
const emptyStyle = {
  color: '#94a3b8',
  fontStyle: 'italic',
  textAlign: 'center',
  marginTop: '1rem',
};

const listStyle = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.6rem',
};

const itemStyle = {
  background: 'rgba(16,185,129,0.08)',
  border: '1px solid rgba(16,185,129,0.2)',
  borderRadius: '8px',
  padding: '0.6rem 0.8rem',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  transition: 'transform 0.2s ease',
};

const buttonStyle = {
  background: 'rgba(239,68,68,0.12)',
  border: 'none',
  color: '#ef4444',
  borderRadius: '4px',
  cursor: 'pointer',
  padding: '0.2rem 0.4rem',
  fontWeight: 600,
  lineHeight: 1,
  transition: 'background 0.2s',
};

const idStyle = {
  color: '#10b981',
  fontWeight: 600,
};

export default WatchList;
