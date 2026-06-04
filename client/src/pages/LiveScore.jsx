import React, { useEffect } from 'react';
import { useMatchFlow } from '../context/MatchFlowContext';
import { connectLive } from '../utils/liveApi';
import Scoreboard from '../components/live/Scoreboard';
import WatchList from '../components/live/WatchList';
import BallByBall from '../components/live/BallByBall';
import ScoreGraph from '../components/live/ScoreGraph';
import PlayerStats from '../components/live/PlayerStats';
import MatchResultImage from '../components/live/MatchResultImage';

export default function LiveScore() {
  const { matchId, liveScore, updateLiveScore, matchResult } = useMatchFlow();
  const [showResult, setShowResult] = React.useState(false);

  useEffect(() => {
    if (!matchId) return;
    const { close } = connectLive(matchId, data => {
      updateLiveScore(data);
    });
    return () => close();
  }, [matchId, updateLiveScore]);

  if (!matchId) {
    return (
      <div style={{ padding: '2rem', color: '#f0fdf4', fontFamily: "'Inter', sans-serif" }}>
        <h2>Select a match to view live scoring.</h2>
      </div>
    );
  }

  const toggleResult = () => setShowResult(prev => !prev);

  return (
    <div style={pageContainer}>
      <aside style={sidebarStyle}>
        <WatchList />
      </aside>
      <section style={mainStyle}>
        <Scoreboard data={liveScore} />
        <ScoreGraph matchId={matchId} />
        <BallByBall matchId={matchId} />
        <PlayerStats matchId={matchId} innings={liveScore.inningsNum} />
        {matchResult && (
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <button onClick={toggleResult} style={resultButtonStyle}>
              {showResult ? 'Hide Match Summary' : 'Show Match Summary'}
            </button>
            {showResult && <MatchResultImage data={matchResult} />}
          </div>
        )}
      </section>
    </div>
  );
}

// Styles
const pageContainer = {
  display: 'flex',
  minHeight: 'calc(100vh - 4rem)',
  gap: '1.5rem',
  padding: '1rem',
  background: 'linear-gradient(135deg, #0c1a0c 0%, #050b14 100%)',
  color: '#f0fdf4',
  fontFamily: "'Inter', sans-serif",
};

const sidebarStyle = {
  flex: '0 0 260px',
  background: 'rgba(15,23,42,0.45)',
  borderRadius: '12px',
  backdropFilter: 'blur(12px)',
  padding: '1rem',
  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
};

const mainStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
};

const resultButtonStyle = {
  background: 'linear-gradient(135deg, #10b981, #059669)',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  padding: '0.6rem 1.2rem',
  cursor: 'pointer',
  fontWeight: 600,
  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
};
