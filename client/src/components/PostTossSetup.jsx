import React, { useState } from 'react';

// Props: match, tossWinnerName, tossDecision, onUpdate (optional callback)
export default function PostTossSetup({ match, tossWinnerName, tossDecision, onUpdate }) {
  const [winner, setWinner] = useState(tossWinnerName || '');
  const [decision, setDecision] = useState(tossDecision || '');

  const handleConfirm = () => {
    if (onUpdate) {
      onUpdate({ winner, decision });
    }
  };

  return (
    <div style={{ padding: '24px', textAlign: 'center' }}>
      <h2 style={{ marginBottom: '12px' }}>Toss Decision</h2>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ marginRight: '8px' }}>Winner:</label>
        <input
          type="text"
          value={winner}
          onChange={e => setWinner(e.target.value)}
          placeholder="Enter team name"
          style={{ padding: '4px 8px' }}
        />
      </div>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ marginRight: '8px' }}>Decision:</label>
        <select value={decision} onChange={e => setDecision(e.target.value)}>
          <option value="">Select</option>
          <option value="bat">Bat</option>
          <option value="field">Field</option>
        </select>
      </div>
      <button
        onClick={handleConfirm}
        style={{ padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px' }}
      >
        Confirm
      </button>
    </div>
  );
}
