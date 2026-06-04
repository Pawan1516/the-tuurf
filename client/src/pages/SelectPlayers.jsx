import React, { useState, useEffect } from 'react';
import { useMatchFlow } from '../context/MatchFlowContext';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Swords, Target, User, Shield, CheckCircle } from 'lucide-react';
import apiClient from '../api/client';

// Simple dropdown helper
function Dropdown({ label, options, value, onChange, placeholder = "Select Player" }) {
  return (
    <div className="mb-5">
      <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">
        {label}
      </label>
      <select
        className="w-full bg-slate-950/70 border border-white/10 focus:border-emerald-500/50 p-4 rounded-2xl text-xs text-slate-200 focus:outline-none transition-colors"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="" className="bg-slate-950 text-slate-400">-- {placeholder} --</option>
        {options.map(opt => (
          <option key={opt.id} value={opt.id} className="bg-slate-950 text-slate-200">
            {opt.name} {opt.role ? `(${opt.role})` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function SelectPlayers() {
  const { matchData, updateMatch } = useMatchFlow();
  const navigate = useNavigate();
  const { id } = useParams(); // match id from url

  // Players are stored in matchData?.teams?.teamA?.players & teamB?.players
  const teamAPlayers = matchData?.teams?.teamA?.players || [];
  const teamBPlayers = matchData?.teams?.teamB?.players || [];

  const teamAName = matchData?.teams?.teamA?.name || 'Team A';
  const teamBName = matchData?.teams?.teamB?.name || 'Team B';
  const battingTeamName = matchData?.toss?.battingFirst || teamAName;
  const bowlingTeamName = battingTeamName === teamAName ? teamBName : teamAName;

  // Determine batting and bowling teams
  const battingTeam = battingTeamName === teamAName ? teamAPlayers : teamBPlayers;
  const bowlingTeam = battingTeamName === teamAName ? teamBPlayers : teamAPlayers;

  const [striker, setStriker] = useState('');
  const [nonStriker, setNonStriker] = useState('');
  const [bowler, setBowler] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    console.log('SelectPlayers matchData:', matchData);
    if (teamAPlayers.length || teamBPlayers.length) {
      setLoading(false);
    }
  }, [teamAPlayers, teamBPlayers, matchData]);

  const handleStartMatch = async () => {
    setErrorMessage('');
    if (!striker || !nonStriker || !bowler) {
      setErrorMessage('Please select striker, non-striker and bowler.');
      alert('Please select striker, non-striker and bowler.');
      return;
    }

    if (striker === nonStriker) {
      setErrorMessage('Striker and Non-Striker must be different players.');
      alert('Striker and Non-Striker must be different players.');
      return;
    }

    setSubmitting(true);

    try {
      const strikerObj = battingTeam.find(p => p.id === striker);
      const nonStrikerObj = battingTeam.find(p => p.id === nonStriker);
      const bowlerObj = bowlingTeam.find(p => p.id === bowler);

      // Create Innings & Over 0.0 state
      const payload = {
        status: 'In Progress',
        runs: 0,
        wickets: 0,
        overNum: 0,
        ballInOver: 0,
        inningsNum: 1,
        striker: 0,
        nonStriker: 1,
        currentBowlerIdx: 0,
        batting_team: battingTeamName === teamAName ? 'A' : 'B',
        batters: [
          { user_id: strikerObj.id, id: strikerObj.id, name: strikerObj.name, r: 0, b: 0, batting: true, out: false },
          { user_id: nonStrikerObj.id, id: nonStrikerObj.id, name: nonStrikerObj.name, r: 0, b: 0, batting: false, out: false }
        ],
        bowlers: [
          { user_id: bowlerObj.id, id: bowlerObj.id, name: bowlerObj.name, balls: 0, r: 0, w: 0, bowling: true }
        ],
        currentOverBalls: [],
        overHistory: [],
        partnership: { runs: 0, balls: 0 }
      };

      const matchIdToUse = id || matchData?.matchId || '';

      // Initialize live scoring state in database
      await apiClient.post(`/matches/${matchIdToUse}/live-update`, payload);

      // Update local match context
      updateMatch({
        status: 'In Progress',
        innings: {
          striker: strikerObj.name,
          nonStriker: nonStrikerObj.name,
          currentBowlerIdx: bowlerObj.name,
        },
      });

      // Open Live Scoring Dashboard
      navigate(`/match/scoring/${matchIdToUse}`);
    } catch (err) {
      console.error('Error starting match:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to start match. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Loading player data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6 sm:p-8 bg-white/5 border border-white/10 backdrop-blur-xl rounded-[2.5rem] mt-8 shadow-2xl relative overflow-hidden animate-in fade-in duration-500">
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />

      <h2 className="text-2xl font-black text-white uppercase mb-1 tracking-tighter text-center">
        Select Opening Players & Bowler
      </h2>
      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center mb-8">
        Set up the opening batsmen and bowler to start the innings
      </p>

      {errorMessage && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs font-bold text-center">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Batting Team Group */}
      <div className="bg-black/20 border border-white/5 p-5 rounded-[2rem] mb-6">
        <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
          <Swords size={14} className="text-emerald-400" /> Batting Team: <span className="text-emerald-400 font-black">{battingTeamName}</span>
        </h3>
        
        <Dropdown
          label="Striker Batsman"
          options={battingTeam}
          value={striker}
          onChange={setStriker}
          placeholder="Select Striker"
        />

        <Dropdown
          label="Non-Striker Batsman"
          options={battingTeam}
          value={nonStriker}
          onChange={setNonStriker}
          placeholder="Select Non-Striker"
        />
      </div>

      {/* Bowling Team Group */}
      <div className="bg-black/20 border border-white/5 p-5 rounded-[2rem] mb-8">
        <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
          <Target size={14} className="text-indigo-400" /> Bowling Team: <span className="text-indigo-400 font-black">{bowlingTeamName}</span>
        </h3>

        <Dropdown
          label="Opening Bowler"
          options={bowlingTeam}
          value={bowler}
          onChange={setBowler}
          placeholder="Select Opening Bowler"
        />
      </div>

      <button
        onClick={handleStartMatch}
        disabled={submitting}
        className="w-full py-5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black uppercase text-xs tracking-[0.2em] rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
      >
        {submitting ? (
          <>
            <div className="w-4 h-4 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
            STARTING MATCH...
          </>
        ) : (
          <>
            <CheckCircle size={16} /> START MATCH
          </>
        )}
      </button>
    </div>
  );
}
