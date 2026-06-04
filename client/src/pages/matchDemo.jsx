import React, { useState, useEffect } from 'react';
import { connectSocket, disconnectSocket } from '../utils/socketClient';
import MatchControlPanel from '../features/match/components/MatchControlPanel';
import LiveScoringPad from '../features/match/components/LiveScoringPad';

export default function MatchDemo() {
  const [matchId, setMatchId] = useState('m1');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const s = connectSocket();
    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('match:verified', (data) => console.log('match:verified', data));
    s.on('timeline:append', (data) => console.log('timeline:append', data));
    return () => disconnectSocket();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl mb-4">Match Demo</h1>
      <div className="mb-4">
        <label className="mr-2">Match ID:</label>
        <input value={matchId} onChange={(e) => setMatchId(e.target.value)} className="border p-1" />
        <span className="ml-4">Socket: {connected ? 'connected' : 'disconnected'}</span>
      </div>

      <MatchControlPanel match={{ status: 'SCHEDULED' }} onStart={() => console.log('start')} />

      <div className="mt-4">
        <LiveScoringPad matchId={matchId} onBall={(b) => console.log('local ball', b)} />
      </div>
    </div>
  );
}
