import React, { useEffect } from 'react';
import LiveScore from './LiveScore';
import { Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { MatchFlowProvider, useMatchFlow } from '../context/MatchFlowContext';
import apiClient, { BACKEND_ORIGIN } from '../api/client';

// Import pages
import TossScreen from './TossScreen';
import MatchSummary from './MatchSummary';
import StatsLeaderboard from './StatsLeaderboard';

import FinishedMatches from './FinishedMatches';
import SelectPlayers from './SelectPlayers';
import ScoringDashboard from './ScoringDashboard';

const API = BACKEND_ORIGIN;

function MatchFlowContent() {
  const {
    matchId,
    setMatchId,
    setQrCode,
    setVerificationStatus,
    updateMatch,
    setResult,
  } = useMatchFlow();
  
  const location = useLocation();
  const navigate = useNavigate();

  // Parse path and optional match ID from pathname
  const pathParts = location.pathname.split('/');
  const activePath = pathParts[2] || 'result';
  const idFromUrl = pathParts[3] && pathParts[3] !== 'subpath' ? pathParts[3] : pathParts[4] || null;

  // Refresh-Resilient match data context restoration
  useEffect(() => {
    if (idFromUrl && idFromUrl !== matchId && idFromUrl.match(/^[0-9a-fA-F]{24}$/)) {
      console.log(`🔄 Restoring match context for ID: ${idFromUrl}`);
      apiClient.get(`/matches/${idFromUrl}`)
        .then((res) => {
          const data = res.data;
          if (data.success && data.match) {
            const m = data.match;
            setMatchId(m._id);
            if (m.qr_code) setQrCode(m.qr_code);
            
            const serverStatus = m.verification?.status || 'PENDING';
            setVerificationStatus(serverStatus);
            
            const mapPlayers = (squad, quickPlayers) => {
              if (squad && squad.length > 0) {
                return squad.map(p => ({
                  id: p._id || p.id,
                  name: p.name || p.display_name || 'Player',
                  phone: p.phone || '',
                  role: p.role || 'Batsman'
                }));
              }
              if (quickPlayers && quickPlayers.length > 0) {
                return quickPlayers.map((p, idx) => ({
                  id: p.user_id?._id || p.user_id || p.input || `q-${idx}`,
                  name: p.display_name || p.name || p.input || `Player ${idx + 1}`,
                  phone: p.input || '',
                  role: p.role || 'Batsman'
                }));
              }
              return [];
            };

            const teamAPlayers = mapPlayers(m.team_a?.squad, m.quick_teams?.team_a?.players);
            const teamBPlayers = mapPlayers(m.team_b?.squad, m.quick_teams?.team_b?.players);

            updateMatch({
              matchId: m._id,
              matchName: m.title,
              overs: m.overs,
              status: m.status,
              teams: {
                teamA: { name: m.team_a?.team_id?.name || m.quick_teams?.team_a?.name || 'Team A', players: teamAPlayers },
                teamB: { name: m.team_b?.team_id?.name || m.quick_teams?.team_b?.name || 'Team B', players: teamBPlayers },
              },
              toss: m.toss ? {
                winner: m.toss.won_by,
                decision: m.toss.decision,
                battingFirst: m.toss.batting_first,
                bowlingFirst: m.toss.bowling_first,
              } : null,
              matchResult: m.result || null,
            });
            if (m.result) setResult(m.result);
          }
        })
        .catch((err) => console.error('Error auto-restoring match context:', err));
    }
  }, [idFromUrl, matchId, setMatchId, setQrCode, setVerificationStatus, updateMatch, setResult]);

  const handleTabClick = (targetPath) => {
    const activeMatchId = matchId || idFromUrl;
    if (activeMatchId) {
      navigate(`/match/${targetPath}/${activeMatchId}`);
    } else {
      navigate(`/match/${targetPath}`);
    }
  };

  const isTabActive = (paths) => {
    return paths.includes(activePath);
  };

  return (
    <div style={containerStyle}>
      {/* Visual Ambient Glows */}
      <div style={glowLeft} />
      <div style={glowRight} />

      <div style={innerWrapperStyle}>
        {/* Core Header */}
        <header style={headerStyle}>
          <div style={badgeContainer}>
            <span style={liveIndicator} />
            <span style={badgeText}>🏏 THE TURF MATCH CENTER</span>
          </div>
          <h2 style={titleStyle}>Match Progression Center</h2>
          <p style={subtitleStyle}>Track, verify, and view real-time tournament matches and stats</p>
        </header>

        {/* Tab Selector Navigation */}
        <div style={tabContainerStyle}>
          <button 
            onClick={() => handleTabClick('result')}
            style={{
              ...tabItemStyle,
              ...(isTabActive(['result']) ? tabItemActiveStyle : {})
            }}
          >
            🪙 Toss Portal
          </button>
          <button 
            onClick={() => handleTabClick('summary')}
            style={{
              ...tabItemStyle,
              ...(isTabActive(['summary']) ? tabItemActiveStyle : {})
            }}
          >
            📋 Match Summary
          </button>
          <button 
            onClick={() => handleTabClick('stats')}
            style={{
              ...tabItemStyle,
              ...(isTabActive(['stats']) ? tabItemActiveStyle : {})
            }}
          >
            🏆 Leaderboard
          </button>
          <button 
            onClick={() => handleTabClick('finished')}
            style={{
              ...tabItemStyle,
              ...(isTabActive(['finished']) ? tabItemActiveStyle : {})
            }}
          >
            📁 Finished Matches
          </button>
          <button 
            onClick={() => handleTabClick('live')}
            style={{
              ...tabItemStyle,
              ...(isTabActive(['live']) ? tabItemActiveStyle : {})
            }}
          >
            📡 Live Score
          </button>
        </div>

        {/* Active Child Component Viewport */}
        <div style={viewportStyle}>
          <Routes>
            <Route path="result" element={<TossScreen />} />
            <Route path="result/:id" element={<TossScreen />} />
            
            <Route path="select" element={<SelectPlayers />} />
            <Route path="select/:id" element={<SelectPlayers />} />
            
            <Route path="scoring/:id" element={<ScoringDashboard />} />
            
            <Route path="summary" element={<MatchSummary />} />
            <Route path="summary/:id" element={<MatchSummary />} />
            
            <Route path="stats" element={<StatsLeaderboard />} />
            <Route path="stats/:id" element={<StatsLeaderboard />} />

            <Route path="finished" element={<FinishedMatches />} />
            
            <Route path="live" element={<LiveScore />} />
            <Route path="live/:id" element={<LiveScore />} />
            
            {/* Fallback to Toss Portal */}
            <Route path="*" element={<TossScreen />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function MatchFlow() {
  return (
    <MatchFlowProvider>
      <MatchFlowContent />
    </MatchFlowProvider>
  );
}

/* ─── STYLING SYSTEM ─── */
const containerStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #050b14 0%, #0c1a0c 50%, #050b14 100%)',
  color: '#f0fdf4',
  fontFamily: "'Inter', sans-serif",
  padding: '2rem 1rem',
  position: 'relative',
  overflowX: 'hidden',
};

const innerWrapperStyle = {
  maxWidth: '1200px',
  margin: '0 auto',
  position: 'relative',
  zIndex: 2,
};

const glowLeft = {
  position: 'fixed',
  top: '-10%',
  left: '-10%',
  width: '500px',
  height: '500px',
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)',
  pointerEvents: 'none',
};

const glowRight = {
  position: 'fixed',
  bottom: '-10%',
  right: '-10%',
  width: '500px',
  height: '500px',
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)',
  pointerEvents: 'none',
};

const headerStyle = {
  textAlign: 'center',
  marginBottom: '2rem',
};

const badgeContainer = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.6rem',
  background: 'rgba(16,185,129,0.1)',
  border: '1px solid rgba(16,185,129,0.25)',
  borderRadius: '100px',
  padding: '0.4rem 1.2rem',
  marginBottom: '1rem',
};

const liveIndicator = {
  width: '8px',
  height: '8px',
  background: '#10b981',
  borderRadius: '50%',
  boxShadow: '0 0 10px #10b981',
};

const badgeText = {
  color: '#10b981',
  fontSize: '0.75rem',
  fontWeight: '800',
  letterSpacing: '0.1em',
};

const titleStyle = {
  fontSize: '2.2rem',
  fontWeight: '900',
  color: '#f8fafc',
  margin: '0 0 0.5rem 0',
  letterSpacing: '-0.02em',
};

const subtitleStyle = {
  color: '#64748b',
  fontSize: '0.95rem',
  margin: 0,
};

const tabContainerStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '0.5rem',
  background: 'rgba(15, 23, 42, 0.4)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  borderRadius: '100px',
  padding: '0.4rem',
  maxWidth: '500px',
  margin: '0 auto 2.5rem auto',
  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
};

const tabItemStyle = {
  flex: 1,
  padding: '0.6rem 1.2rem',
  borderRadius: '100px',
  border: 'none',
  background: 'transparent',
  color: '#94a3b8',
  fontSize: '0.85rem',
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
};

const tabItemActiveStyle = {
  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  color: '#ffffff',
  boxShadow: '0 0 15px rgba(16,185,129,0.3)',
};

const viewportStyle = {
  animation: 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
};

// CSS Injection for Custom Animations
if (typeof document !== 'undefined') {
  const styleTag = document.createElement('style');
  styleTag.textContent = `
    @keyframes spinGlow {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(styleTag);
}
