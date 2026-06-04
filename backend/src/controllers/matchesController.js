const express = require('express');
const router = express.Router();
const Match = require('../../models/Match');
const aiService = require('../../services/aiService');

// Verify QR and unlock match for scoring
router.post('/verify-qr', async (req, res) => {
  try {
    const { matchId, token } = req.body;
    if (!matchId) return res.status(400).json({ error: 'matchId required' });

    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    // If a verification token exists, validate it
    if (match.verification && match.verification.verification_token) {
      if (!token || token !== match.verification.verification_token) {
        match.verification.qr_code.scan_attempts = (match.verification.qr_code.scan_attempts || 0) + 1;
        await match.save();
        return res.status(401).json({ success: false, message: 'Invalid verification token' });
      }
    }

    match.verification.status = 'VERIFIED';
    match.verification.qr_code.scanned_at = new Date();
    match.start_control.can_start = true;
    match.start_control.start_method = 'QR_SCAN';
    await match.save();

    return res.json({ success: true, message: 'Match verified', matchId });
  } catch (err) {
    console.error('verify-qr error', err);
    return res.status(500).json({ error: err.message });
  }
});

// Toss endpoint: set toss winner and decision (Bat/Bowl)
router.post('/:id/toss', async (req, res) => {
  try {
    const { id } = req.params;
    const { tossWinner, decision } = req.body; // tossWinner: 'A' or 'B' or Team ObjectId
    const match = await Match.findById(id);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    match.toss = { winner: tossWinner, decision: decision || 'Bat' };
    await match.save();

    return res.json({ success: true, matchId: id, toss: match.toss });
  } catch (err) {
    console.error('toss error', err);
    return res.status(500).json({ error: err.message });
  }
});

// Start match: set status to In Progress, set openers and initial live_data
router.post('/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    const { openers = {}, bowlingOrder = [] } = req.body; // openers: { strikerId, nonStrikerId }

    const match = await Match.findById(id);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    if (!match.canBeScored() && !match.is_offline_match) {
      return res.status(403).json({ error: 'Match not verified. QR scan required.' });
    }

    // Initialize innings if empty
    if (!match.innings || match.innings.length === 0) {
      match.innings = [{ number: 1, batting_team: match.team_a.team_id || null, bowling_team: match.team_b.team_id || null, score: 0, wickets: 0, overs_completed: 0, overs: [], balls: [], batsmen: [], bowlers: [], ball_history: [], fall_of_wickets: [], partnership_log: [] }];
      match.current_innings_index = 0;
    }

    // Ensure openers are set into innings.batsmen
    const inns = match.innings[match.current_innings_index];
    if (openers.strikerId || openers.nonStrikerId) {
      inns.batsmen = inns.batsmen || [];
      const addIfMissing = (idVal) => {
        if (!idVal) return;
        if (!inns.batsmen.find(b => String(b.user_id) === String(idVal))) {
          inns.batsmen.push({ user_id: idVal, name: '', runs: 0, balls: 0, fours: 0, sixes: 0, out_type: 'Not Out', is_on_strike: false });
        }
      };
      addIfMissing(openers.strikerId);
      addIfMissing(openers.nonStrikerId);

      inns.batsmen = inns.batsmen.map(b => ({ ...b.toObject ? b.toObject() : b }));
      inns.batsmen.forEach(b => {
        if (String(b.user_id) === String(openers.strikerId)) b.is_on_strike = true;
        else b.is_on_strike = false;
      });
    }

    match.status = 'In Progress';
    match.live_data = match.live_data || {};
    match.live_data.phase = 'batting';
    match.live_data.striker = openers.strikerId || (inns.batsmen[0] && inns.batsmen[0].user_id) || null;
    match.live_data.nonStriker = openers.nonStrikerId || (inns.batsmen[1] && inns.batsmen[1].user_id) || null;
    match.live_data.currentBowlerIdx = 0;
    match.start_control.can_start = true;

    await match.save();
    return res.json({ success: true, matchId: id, status: match.status, live_data: match.live_data });
  } catch (err) {
    console.error('start match error', err);
    return res.status(500).json({ error: err.message });
  }
});

// Record a ball: handle runs, extras, wickets, update batsmen/bowlers, overs, and live_data
router.post('/:id/balls', async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body; // { type: '0'|'1'|'4'|'6'|'wd'|'nb'|'b'|'lb'|'wicket', runs, dismissal }

    const match = await Match.findById(id);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (!match.canBeScored() && !match.is_offline_match) return res.status(403).json({ error: 'Match not verified for scoring' });

    const innsIdx = match.current_innings_index || 0;
    const inns = match.innings[innsIdx];
    if (!inns) return res.status(400).json({ error: 'No innings initialized' });

    // Determine ball numbers
    const totalValidBalls = inns.balls ? inns.balls.filter(b => !b.extra_type || (b.extra_type !== 'wide' && b.extra_type !== 'noball')).length : 0;
    const absoluteBall = totalValidBalls + 1;
    const ballInOver = ((absoluteBall - 1) % 6) + 1;
    const overNumber = Math.floor((absoluteBall - 1) / 6) + 1;

    // Identify striker/non-striker and current bowler
    const strikerId = match.live_data?.striker || (inns.batsmen[0] && inns.batsmen[0].user_id) || null;
    const nonStrikerId = match.live_data?.nonStriker || (inns.batsmen[1] && inns.batsmen[1].user_id) || null;
    const bowlerId = payload.bowlerId || (inns.bowlers && inns.bowlers[match.live_data?.currentBowlerIdx || 0]?.user_id) || null;

    // Build ball record
    const ballRecord = {
      ball_number: `${overNumber}.${ballInOver}`,
      over_number: overNumber,
      ball_in_over: ballInOver,
      absolute_ball: absoluteBall,
      batter_id: strikerId,
      non_striker_id: nonStrikerId,
      bowler_id: bowlerId,
      runs_off_bat: 0,
      is_four: false,
      is_six: false,
      extra_type: null,
      extra_runs: 0,
      is_free_hit: false,
      is_wicket: false,
      wicket: null,
      commentary: payload.commentary || ''
    };

    // Interpret payload
    if (payload.type === 'wd' || payload.type === 'wide') {
      ballRecord.extra_type = 'wide';
      ballRecord.extra_runs = 1 + (payload.runs || 0);
      // wides do not count as valid balls
    } else if (payload.type === 'nb' || payload.type === 'noball') {
      ballRecord.extra_type = 'noball';
      ballRecord.extra_runs = 1 + (payload.runs || 0);
      // no-balls do not count as valid balls
    } else if (payload.type === 'b' || payload.type === 'bye') {
      ballRecord.extra_type = 'bye';
      ballRecord.extra_runs = payload.runs || 0;
    } else if (payload.type === 'lb' || payload.type === 'legbye') {
      ballRecord.extra_type = 'legbye';
      ballRecord.extra_runs = payload.runs || 0;
    } else if (payload.type === 'wicket' || payload.type === 'w') {
      ballRecord.is_wicket = true;
      ballRecord.wicket = payload.wicket || {};
      ballRecord.runs_off_bat = payload.runs || 0;
    } else {
      // numeric runs (0-6)
      const runs = Number(payload.type || payload.runs || 0);
      ballRecord.runs_off_bat = isNaN(runs) ? 0 : runs;
      if (ballRecord.runs_off_bat === 4) ballRecord.is_four = true;
      if (ballRecord.runs_off_bat === 6) ballRecord.is_six = true;
    }

    // Push into innings.balls
    inns.balls = inns.balls || [];
    inns.balls.push(ballRecord);

    // Update aggregates
    // Runs: runs_off_bat + extra_runs
    const runsThisBall = (ballRecord.runs_off_bat || 0) + (ballRecord.extra_runs || 0);
    inns.score = (inns.score || 0) + runsThisBall;
    if (ballRecord.is_wicket) inns.wickets = (inns.wickets || 0) + 1;

    // Update batsman stats
    inns.batsmen = inns.batsmen || [];
    const striker = inns.batsmen.find(b => String(b.user_id) === String(strikerId));
    if (striker) {
      striker.runs = (striker.runs || 0) + (ballRecord.runs_off_bat || 0);
      striker.balls = (striker.balls || 0) + ((ballRecord.extra_type === 'wide' || ballRecord.extra_type === 'noball') ? 0 : 1);
      if (ballRecord.is_four) striker.fours = (striker.fours || 0) + 1;
      if (ballRecord.is_six) striker.sixes = (striker.sixes || 0) + 1;
    }

    // Update bowler stats
    inns.bowlers = inns.bowlers || [];
    let bowler = inns.bowlers.find(bw => String(bw.user_id) === String(bowlerId));
    if (!bowler && bowlerId) {
      bowler = { user_id: bowlerId, name: '', overs: 0, balls: 0, runs: 0, wickets: 0, maidens: 0 };
      inns.bowlers.push(bowler);
    }
    if (bowler) {
      bowler.runs = (bowler.runs || 0) + (ballRecord.runs_off_bat || 0) + (ballRecord.extra_runs || 0);
      // Only count balls for valid deliveries
      if (!ballRecord.extra_type || (ballRecord.extra_type !== 'wide' && ballRecord.extra_type !== 'noball')) {
        bowler.balls = (bowler.balls || 0) + 1;
        bowler.overs = Math.floor((bowler.balls || 0) / 6) + ((bowler.balls || 0) % 6) / 10;
      }
      if (ballRecord.is_wicket) bowler.wickets = (bowler.wickets || 0) + 1;
    }

    // Update ball_history (summary)
    inns.ball_history = inns.ball_history || [];
    inns.ball_history.push({ over: overNumber, ball: ballInOver, runs: runsThisBall, is_wicket: ballRecord.is_wicket, extra: ballRecord.extra_type, batsman_id: strikerId, bowler_id: bowlerId, dismissal_type: ballRecord.wicket ? ballRecord.wicket.dismissal_type : null, fielder_id: ballRecord.wicket ? ballRecord.wicket.fielder_id : null, score_at_ball: inns.score, wickets_at_ball: inns.wickets, timestamp: new Date() });

    // Update over summary in inns.overs array
    const overIdx = inns.overs.findIndex(o => o.over_number === overNumber);
    if (overIdx === -1) {
      inns.overs.push({ over_number: overNumber, bowler_id: bowlerId, balls: (ballRecord.extra_type && (ballRecord.extra_type === 'wide' || ballRecord.extra_type === 'noball')) ? 0 : 1, runs: runsThisBall, extras: (ballRecord.extra_runs || 0), wickets: ballRecord.is_wicket ? 1 : 0, maidens: false, dots: (ballRecord.runs_off_bat === 0 && !ballRecord.extra_type) ? 1 : 0, fours: ballRecord.is_four ? 1 : 0, sixes: ballRecord.is_six ? 1 : 0 } );
    } else {
      const ov = inns.overs[overIdx];
      ov.balls += (ballRecord.extra_type && (ballRecord.extra_type === 'wide' || ballRecord.extra_type === 'noball')) ? 0 : 1;
      ov.runs += runsThisBall;
      ov.extras += (ballRecord.extra_runs || 0);
      ov.wickets += ballRecord.is_wicket ? 1 : 0;
      ov.dots += (ballRecord.runs_off_bat === 0 && !ballRecord.extra_type) ? 1 : 0;
      ov.fours += ballRecord.is_four ? 1 : 0;
      ov.sixes += ballRecord.is_six ? 1 : 0;
    }

    // Update match-level live_data
    match.live_data = match.live_data || {};
    match.live_data.runs = inns.score;
    match.live_data.wickets = inns.wickets;
    match.live_data.totalBalls = inns.balls.filter(b => !b.extra_type || (b.extra_type !== 'wide' && b.extra_type !== 'noball')).length;
    match.live_data.overNum = Math.floor((match.live_data.totalBalls || 0) / 6);
    match.live_data.ballInOver = ((match.live_data.totalBalls || 0) % 6) + 1;
    match.live_data.striker = strikerId;
    match.live_data.nonStriker = nonStrikerId;

    // Append commentary via AI service (async, but await for now)
    try {
      const comment = await aiService.getSpecialistInsight(`Ball: ${ballRecord.ball_number}, runs ${runsThisBall}`, match._id);
      match.commentary_log = match.commentary_log || [];
      match.commentary_log.push({ text: comment, ball: ballRecord.ball_number, runs: runsThisBall, wickets: inns.wickets, overs: `${match.live_data.overNum}.${match.live_data.ballInOver}` });
    } catch (e) {
      console.warn('AI commentary failed:', e.message);
    }

    match.markModified('innings');
    match.markModified('live_data');
    await match.save();

    // Emit simple response
    return res.status(201).json({ success: true, matchId: id, ball: ballRecord, innings: inns });
  } catch (err) {
    console.error('record ball error', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: err.message || 'Failed to record ball' });
  }
});

module.exports = router;
