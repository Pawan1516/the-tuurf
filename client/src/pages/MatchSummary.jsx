import React from 'react';
import { useMatchFlow } from '../context/MatchFlowContext';
import { useNavigate } from 'react-router-dom';
import StepBadge from '../components/StepBadge';

export default function MatchSummary() {
  const [showScorecard, setShowScorecard] = React.useState(false);
  const scorecardImageUrl = 'file:///C:/Users/Pawan/.gemini/antigravity-ide/brain/d56c8e56-de5f-403c-aa30-ad8649bb6950/scorecard_image_1780512699653.png';
  const navigate = useNavigate();
  const { matchData, liveScore, isVerified } = useMatchFlow();



  const teamA = matchData?.teams?.teamA?.name || 'Team A';
  const teamB = matchData?.teams?.teamB?.name || 'Team B';
  const trophy = matchData?.toss?.winner || teamA;

  // Gather innings data (fallback to liveScore if present)
  const inn1 = matchData?.inn1Score || {
    runs: liveScore?.inn1Runs || 0,
    wickets: liveScore?.inn1Wickets || 0,
    overs: liveScore?.inn1Overs || '0.0',
    batsmen: liveScore?.inn1Batsmen || [],
    bowlers: liveScore?.inn1Bowlers || [],
  };
  const inn2 = matchData?.inn2Score || {
    runs: liveScore?.runs || 0,
    wickets: liveScore?.wickets || 0,
    overs: liveScore?.overs || '0.0',
    batsmen: liveScore?.batsmen || [],
    bowlers: liveScore?.bowlers || [],
  };

  return (
    <div style={pageStyle}>
      <BackgroundOrbs />
      <div style={{ width: '100%', maxWidth: '720px', textAlign: 'center' }}>
        <StepBadge label="STEP 4 OF 5" />
        <h1 style={h1Style}>Scorecard</h1>
        <p style={subStyle}>Full match summary for {teamA} vs {teamB}</p>
        <button onClick={() => setShowScorecard(prev => !prev)} style={{ ...primaryBtn, margin: '1rem 0' }}>Show Scorecard Image</button>
        {showScorecard && (
          <img src={scorecardImageUrl} alt="Scorecard" style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '1rem' }} />
        )}
        <p style={subStyle}>Full match summary for {teamA} vs {teamB}</p>

        {/* Teams header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <TeamHeader name={teamA} color="#10b981" />
          <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#4b5563' }}>vs</span>
          <TeamHeader name={teamB} color="#6366f1" />
        </div>

        {/* Innings 1 */}
        <InningsBlock title="1st Innings" data={inn1} battingTeam={teamA} />
        {/* Divider */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)', margin: '1rem 0' }} />
        {/* Innings 2 */}
        <InningsBlock title="2nd Innings" data={inn2} battingTeam={teamB} />

        {/* Footer actions */}
        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={() => navigate('/match/result')}
            style={primaryBtn}
          >
            🏆 View Result
          </button>
          <button
            onClick={() => navigate('/match/stats')}
            style={secondaryBtn}
          >
            📊 Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
}

function TeamHeader({ name, color }) {
  return (
    <div style={{
      background: `${color}15`,
      border: `1px solid ${color}30`,
      borderRadius: '12px',
      padding: '0.6rem 1rem',
      color: color,
      fontWeight: '800',
      fontSize: '0.95rem',
    }}>{name}</div>
  );
}

function InningsBlock({ title, data, battingTeam }) {
  const { runs, wickets, overs, batsmen, bowlers } = data;
  return (
    <div style={cardStyle}>
      <h2 style={inningsTitle}>{title} – {battingTeam}</h2>
      <div style={scoreLine}>
        <span style={runsStyle}>{runs}</span>
        <span style={wkStyle}>/{wickets}</span>
        <span style={oversStyle}>overs: {overs}</span>
      </div>
      {/* Batsmen Table */}
      {batsmen && batsmen.length > 0 && (
        <div style={sectionStyle}>
          <p style={sectionHeader}>Batsmen</p>
          <table style={tableStyle}>
            <thead><tr><th>Name</th><th>R</th><th>B</th><th>4s</th><th>6s</th></tr></thead>
            <tbody>
              {batsmen.map((b, i) => (
                <tr key={i}>
                  <td>{b.name || b.display_name || '—'}</td>
                  <td>{b.r || b.runs || 0}</td>
                  <td>{b.b || b.balls || 0}</td>
                  <td>{b.fours || b.f || 0}</td>
                  <td>{b.sixes || b.s || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Bowlers Table */}
      {bowlers && bowlers.length > 0 && (
        <div style={sectionStyle}>
          <p style={sectionHeader}>Bowlers</p>
          <table style={tableStyle}>
            <thead><tr><th>Name</th><th>O</th><th>R</th><th>W</th><th>Eco</th></tr></thead>
            <tbody>
              {bowlers.map((b, i) => (
                <tr key={i}>
                  <td>{b.name || b.display_name || '—'}</td>
                  <td>{b.overs || `${Math.floor((b.balls||0)/6)}.${(b.balls||0)%6}`}</td>
                  <td>{b.r || b.runs || 0}</td>
                  <td>{b.w || b.wickets || 0}</td>
                  <td>{b.economy || (b.balls ? ((b.r||0)/(b.balls/6)).toFixed(2) : '0.0')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LockedScreen({ onBack }) {
  return (
    <div style={{ ...pageStyle, flexDirection: 'column', gap: '1.5rem', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem' }}>🔒</div>
      <h2 style={{ color: '#f87171', fontWeight: '800' }}>Scorecard Locked</h2>
      <p style={{ color: '#6b7280' }}>Admin verification required before viewing the scorecard.</p>
      <button onClick={onBack} style={primaryBtn}>← Back to QR Gate</button>
    </div>
  );
}

function BackgroundOrbs() {
  return (
    <>
      <div style={{ position: 'fixed', top: '10%', right: '10%', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '10%', left: '5%', width: '250px', height: '250px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
    </>
  );
}

const pageStyle = { minHeight: '100vh', background: 'linear-gradient(135deg, #0a0f1a 0%, #0d1f0d 60%, #0a0f1a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: "'Inter', sans-serif" };
const h1Style = { fontSize: '2rem', fontWeight: '800', color: '#f0fdf4', margin: '0 0 0.4rem 0' };
const subStyle = { color: '#6b7280', fontSize: '0.88rem', margin: 0 };
const cardStyle = { background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' };
const primaryBtn = { padding: '0.9rem 1.5rem', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: '800', cursor: 'pointer', fontSize: '0.9rem', boxShadow: '0 4px 20px rgba(16,185,129,0.35)' };
const secondaryBtn = { padding: '0.9rem 1.5rem', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '12px', color: '#818cf8', fontWeight: '800', cursor: 'pointer', fontSize: '0.9rem' };
const inningsTitle = { fontSize: '1.2rem', fontWeight: '700', color: '#f0fdf4', marginBottom: '0.6rem' };
const scoreLine = { fontSize: '2rem', fontWeight: '900', color: '#f0fdf4', marginBottom: '0.8rem' };
const runsStyle = { marginRight: '0.2rem' };
const wkStyle = { color: '#6b7280', fontSize: '1.2rem', marginRight: '0.5rem' };
const oversStyle = { fontSize: '0.9rem', color: '#6b7280' };
const sectionStyle = { marginTop: '1rem' };
const sectionHeader = { fontSize: '0.85rem', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.4rem' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', color: '#f0fdf4' };
