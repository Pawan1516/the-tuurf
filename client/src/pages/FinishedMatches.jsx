// src/pages/FinishedMatches.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

// Image generated for a finished match summary
const finishedImageUrl = 'file:///C:/Users/Pawan/.gemini/antigravity-ide/brain/d56c8e56-de5f-403c-aa30-ad8649bb6950/scorecard_image_1780512699653.png';

export default function FinishedMatches() {
  const navigate = useNavigate();
  const [showImage, setShowImage] = React.useState(false);

  return (
    <div style={pageStyle}>
      <h2 style={titleStyle}>Finished Matches</h2>
      <p style={subStyle}>Click the button to view the match summary image.</p>
      <button
        onClick={() => setShowImage(prev => !prev)}
        style={primaryBtn}
      >
        {showImage ? 'Hide Summary' : 'Show Summary'}
      </button>
      {showImage && (
        <img
          src={finishedImageUrl}
          alt="Finished Match Summary"
          style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '1rem' }}
        />
      )}
      <button onClick={() => navigate('/') } style={secondaryBtn}>Back to Home</button>
    </div>
  );
}

const pageStyle = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #0a0f1a, #0d1f0d)',
  color: '#f0fdf4',
  fontFamily: "'Inter', sans-serif",
  padding: '2rem',
};

const titleStyle = { fontSize: '2rem', fontWeight: '800', marginBottom: '0.5rem' };
const subStyle = { color: '#94a3b8', marginBottom: '1rem' };

const primaryBtn = {
  padding: '0.8rem 1.2rem',
  background: 'linear-gradient(135deg, #10b981, #059669)',
  border: 'none',
  borderRadius: '8px',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: '600',
  marginTop: '1rem',
};

const secondaryBtn = {
  padding: '0.7rem 1rem',
  background: 'rgba(99,102,241,0.15)',
  border: '1px solid rgba(99,102,241,0.3)',
  borderRadius: '8px',
  color: '#818cf8',
  cursor: 'pointer',
  fontWeight: '600',
  marginTop: '1rem',
};
