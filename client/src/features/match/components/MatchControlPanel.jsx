import React from 'react';

export default function MatchControlPanel({ match, onStart }) {
  return (
    <div className="p-4 bg-gray-800 rounded">
      <h3 className="text-white">Match Control</h3>
      <div className="mt-2">
        <div>Status: {match?.status}</div>
        <button className="btn mt-2" onClick={() => onStart()}>Start Live Scoring</button>
      </div>
    </div>
  );
}
