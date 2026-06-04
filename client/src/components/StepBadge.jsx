import React from 'react';
import './StepBadge.css';

/**
 * StepBadge – simple badge component used in MatchSummary to show step information.
 * Props:
 *   label (string): Text to display inside the badge.
 */
const StepBadge = ({ label }) => {
  return (
    <span className="step-badge">{label}</span>
  );
};

export default StepBadge;
