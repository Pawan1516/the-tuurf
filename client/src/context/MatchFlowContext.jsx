import React, { createContext, useContext, useState, useCallback } from 'react';

// Steps: create → qr-gate → player-connect → toss → team → scoring → innings-break → result → summary → stats
export const MatchFlowContext = createContext();

export const MatchFlowProvider = ({ children }) => {
  const [step, setStep] = useState('create');
  const [matchData, setMatchData] = useState({});
  const [matchId, setMatchId] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('PENDING'); // PENDING | VERIFIED
  const [qrCode, setQrCode] = useState(null); // base64 QR image
  const [matchResult, setMatchResult] = useState(null);
  const [liveScore, setLiveScore] = useState({ runs: 0, wickets: 0, overs: '0.0', inningsNum: 1 });
  const [watchList, setWatchList] = useState([]); // array of match IDs

  // Player connect state — players join using their mobile numbers
  const [registeredPlayers, setRegisteredPlayers] = useState({
    teamA: [], // [{ name, phone, userId, joined }]
    teamB: [],
  });
  const [playersReady, setPlayersReady] = useState(false);

  const nextStep = useCallback((next) => setStep(next), []);

  const updateMatch = useCallback((updates) => {
    setMatchData((prev) => ({ ...prev, ...updates }));
  }, []);

  const initMatch = useCallback((id, qr) => {
    setMatchId(id);
    setQrCode(qr);
    setVerificationStatus('PENDING');
    setStep('qr-gate');
  }, []);

  const markVerified = useCallback(() => {
    setVerificationStatus('VERIFIED');
  }, []);

  const updateLiveScore = useCallback((score) => {
    setLiveScore((prev) => ({ ...prev, ...score }));
  }, []);

  const setResult = useCallback((result) => {
    setMatchResult({ ...result, imageUrl: 'file:///C:/Users/Pawan/.gemini/antigravity-ide/brain/d56c8e56-de5f-403c-aa30-ad8649bb6950/match_summary_1780512417321.png' });
  }, []);

  // Player connect helpers
  const addRegisteredPlayer = useCallback((team, player) => {
    // player = { name, phone, userId (optional) }
    setRegisteredPlayers((prev) => {
      const list = prev[team] || [];
      const alreadyExists = list.some((p) => p.phone === player.phone);
      if (alreadyExists) return prev;
      return { ...prev, [team]: [...list, { ...player, joined: true }] };
    });
  }, []);

  const removeRegisteredPlayer = useCallback((team, phone) => {
    setRegisteredPlayers((prev) => ({
      ...prev,
      [team]: (prev[team] || []).filter((p) => p.phone !== phone),
    }));
  }, []);

  const markPlayersReady = useCallback(() => {
    setPlayersReady(true);
  }, []);

  const addToWatchList = useCallback((matchId) => {
    setWatchList((prev) => {
      if (prev.includes(matchId)) return prev;
      return [...prev, matchId];
    });
  }, []);

  const removeFromWatchList = useCallback((matchId) => {
    setWatchList((prev) => prev.filter((id) => id !== matchId));
  }, []);

  const resetFlow = useCallback(() => {
    setStep('create');
    setMatchData({});
    setMatchId(null);
    setVerificationStatus('PENDING');
    setQrCode(null);
    setMatchResult(null);
    setLiveScore({ runs: 0, wickets: 0, overs: '0.0', inningsNum: 1 });
    setRegisteredPlayers({ teamA: [], teamB: [] });
    setPlayersReady(false);
  }, []);

  const value = {
    step,
    setStep,
    nextStep,
    matchData,
    updateMatch,
    matchId,
    setMatchId,
    verificationStatus,
    setVerificationStatus,
    markVerified,
    qrCode,
    setQrCode,
    matchResult,
    setResult,
    liveScore,
    updateLiveScore,
    initMatch,
    resetFlow,
    isVerified: verificationStatus === 'VERIFIED',
    // Player connect
    registeredPlayers,
    addRegisteredPlayer,
    removeRegisteredPlayer,
    playersReady,
    markPlayersReady,
    // Watch list
    watchList,
    addToWatchList,
    removeFromWatchList,
  };

  return (
    <MatchFlowContext.Provider value={value}>
      {children}
    </MatchFlowContext.Provider>
  );
};

export const useMatchFlow = () => useContext(MatchFlowContext);
