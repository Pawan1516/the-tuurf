import React from 'react';

export default function LiveScoringPad({ onBall, matchId }) {
  const runs = [0,1,2,3,4,6];
  return (
import React from 'react';
import socket, { connectSocket } from '../../../utils/socketClient';

export default function LiveScoringPad({ onBall, matchId }) {
  const runs = [0,1,2,3,4,6];

  const emitBall = async (payload) => {
    const event = { matchId, inning: 1, over: 0, ball: 0, ...payload };
    try {
      connectSocket();
      socket.emit('ball:event', event, (ack) => {
        console.log('ball:event ack', ack);
      });
    } catch (err) {
      console.warn('socket emit failed, falling back to REST', err.message);
      // fallback to REST
      try {
        await fetch(`/api/matches/${matchId}/balls`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(event)
        });
      } catch (e) { console.error('REST fallback failed', e); }
    }
    if (onBall) onBall(event);
  };

  return (
    <div className="p-4 bg-gray-900 rounded">
      <div className="grid grid-cols-3 gap-2">
        {runs.map(r => (
          <button key={r} onClick={() => emitBall({ runs: r })} className="btn">
            {r}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <button onClick={() => emitBall({ extra: 'wide' })} className="btn">Wide</button>
        <button onClick={() => emitBall({ extra: 'no-ball' })} className="btn">No Ball</button>
        <button onClick={() => emitBall({ extra: 'bye' })} className="btn">Bye</button>
        <button onClick={() => emitBall({ extra: 'leg-bye' })} className="btn">Leg Bye</button>
      </div>
    </div>
  );
}
