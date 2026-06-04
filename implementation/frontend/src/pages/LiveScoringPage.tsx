import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import LiveScoreboard from '../components/LiveScoreboard';
import BallScoringPanel from '../components/BallScoringPanel';
import StatisticsPanel from '../components/StatisticsPanel';
import { useSocket } from '../services/socket';
import { api } from '../services/api';

const LiveScoringPage: React.FC = () => {
  const { matchId } = useParams();
  const { socket, emit, on } = useSocket();
  
  const [matchData, setMatchData] = useState(null);
  const [liveScore, setLiveScore] = useState(null);
  const [playerStats, setPlayerStats] = useState(null);
  const [isScoringMode, setIsScoringMode] = useState(false);

  useEffect(() => {
    fetchMatchData();
    
    // Join match room
    if (socket) {
      socket.emit('match:join', { matchId });
    }
  }, [matchId, socket]);

  useEffect(() => {
    if (!socket) return;

    // Subscribe to live score updates
    const handleBallScored = (data: any) => {
      setLiveScore(data);
    };

    const handleWicket = (data: any) => {
      setLiveScore(prev => ({
        ...prev,
        wickets: prev.wickets + 1
      }));
    };

    socket.on('ball:scored', handleBallScored);
    socket.on('wicket:taken', handleWicket);

    return () => {
      socket.off('ball:scored', handleBallScored);
      socket.off('wicket:taken', handleWicket);
    };
  }, [socket]);

  const fetchMatchData = async () => {
    try {
      const [matchRes, scoreRes] = await Promise.all([
        api.get(`/matches/${matchId}`),
        api.get(`/matches/${matchId}/live-score`)
      ]);
      setMatchData(matchRes.data.data);
      setLiveScore(scoreRes.data.data);
    } catch (error) {
      console.error('Failed to fetch match data:', error);
    }
  };

  const handleBallSubmit = async (ballData: any) => {
    try {
      const res = await api.post(`/matches/${matchId}/ball/score`, ballData);
      emit('ball:scored', res.data.data);
    } catch (error) {
      console.error('Failed to score ball:', error);
    }
  };

  if (!matchData || !liveScore) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Scoreboard */}
          <div className="lg:col-span-2">
            <LiveScoreboard score={liveScore} match={matchData} />
            
            {/* Ball Scoring Panel */}
            {isScoringMode && (
              <div className="mt-6 bg-white rounded-lg shadow p-6">
                <BallScoringPanel 
                  onSubmit={handleBallSubmit}
                  currentBall={liveScore.ballNumber + 1}
                />
              </div>
            )}
          </div>

          {/* Statistics Panel */}
          <div className="lg:col-span-1">
            <StatisticsPanel 
              score={liveScore}
              match={matchData}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveScoringPage;
