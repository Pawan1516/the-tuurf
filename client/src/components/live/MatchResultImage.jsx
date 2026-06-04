// src/components/live/MatchResultImage.jsx
import React from 'react';

/**
 * Displays a match summary image when the match is finished.
 * Expects `data` prop with an `imageUrl` field (string).
 * Falls back to a styled placeholder if no image URL is provided.
 */
export default function MatchResultImage({ data }) {
  const placeholder = (
    <div style={placeholderStyle}>
      No summary image available.
    </div>
  );

  return (
    <div style={containerStyle}>
      {data && data.imageUrl ? (
        <img
          src={data.imageUrl}
          alt="Match Summary"
          style={imageStyle}
        />
      ) : (
        placeholder
      )}
    </div>
  );
}

const containerStyle = {
  background: 'rgba(15,23,42,0.45)',
  borderRadius: '12px',
  padding: '1rem',
  color: '#f0fdf4',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
  textAlign: 'center',
};

const imageStyle = {
  maxWidth: '100%',
  borderRadius: '8px',
};

const placeholderStyle = {
  height: '200px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#94a3b8',
  fontStyle: 'italic',
};
