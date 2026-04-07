const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const Booking = require('../models/Booking');
const Team = require('../models/Team');
const AIService = require('../services/aiService');
const QRService = require('../services/qrService');
const verifyToken = require('../middleware/verifyToken');
const verifyMatch = require('../middleware/verifyMatch');

// @route   GET /api/matches/history/teams
// @desc    Extract unique historical teams/squads from past matches
// @access  Public
router.get('/history/teams', async (req, res) => {
    try {
        const pastMatches = await Match.find({ status: 'Completed' })
            .select('team_a team_b quick_teams title start_time format')
            .populate('team_a.team_id team_b.team_id')
            .sort({ start_time: -1 })
            .limit(50);

        const registeredTeams = await Team.find().populate('members.user_id');

        const historyPool = [];
        const seenNames = new Set();

        // 1. Add Registered Teams (Highest Priority)
        registeredTeams.forEach(t => {
            if (!seenNames.has(t.name)) {
                historyPool.push({ 
                    id: t._id, 
                    name: t.name, 
                    short: t.short_name || t.name.slice(0,3).toUpperCase(), 
                    players: t.members?.map(m => m.user_id?.name).filter(Boolean) || [],
                    type: 'official_registered_team' 
                });
                seenNames.add(t.name);
            }
        });

        // 2. Add Recent Match Teams
        pastMatches.forEach(m => {
            // Check Quick Teams
            if (m.quick_teams?.team_a?.name) {
                if (!seenNames.has(m.quick_teams.team_a.name)) {
                    historyPool.push({ id: `q-${m._id}-a`, name: m.quick_teams.team_a.name, short: (m.quick_teams.team_a.name.slice(0,3)).toUpperCase(), players: m.quick_teams.team_a.players.map(p => p.display_name || p.name), type: 'past_walkin' });
                    seenNames.add(m.quick_teams.team_a.name);
                }
            }
            if (m.quick_teams?.team_b?.name) {
                if (!seenNames.has(m.quick_teams.team_b.name)) {
                    historyPool.push({ id: `q-${m._id}-b`, name: m.quick_teams.team_b.name, short: (m.quick_teams.team_b.name.slice(0,3)).toUpperCase(), players: m.quick_teams.team_b.players.map(p => p.display_name || p.name), type: 'past_walkin' });
                    seenNames.add(m.quick_teams.team_b.name);
                }
            }
            // Check Official Teams from Match Data
            if (m.team_a?.team_id?.name && !seenNames.has(m.team_a.team_id.name)) {
                historyPool.push({ id: `o-${m._id}-a`, name: m.team_a.team_id.name, short: m.team_a.team_id.short_name || 'TMA', players: m.live_data?.scorecard?.batsmen?.map(b => b.name) || [], type: 'past_official' });
                seenNames.add(m.team_a.team_id.name);
            }
        });

        res.json({ success: true, teams: historyPool, last_match: pastMatches[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   GET /api/matches/live
// @desc    Get only active in-progress matches for today
// @access  Public
router.get('/live', async (req, res) => {
    try {
        // Use a more robust IST date calculation
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istDate = new Date(now.getTime() + istOffset);
        
        const istMidnight = new Date(istDate);
        istMidnight.setUTCHours(0,0,0,0);
        istMidnight.setTime(istMidnight.getTime() - istOffset); // Back to UTC
        
        const istNextMidnight = new Date(istMidnight);
        istNextMidnight.setDate(istNextMidnight.getDate() + 1);

        // Get all live and upcoming matches for today
        const activeMatches = await Match.find({ 
            status: { $in: ['In Progress', 'Scheduled'] },
            start_time: { $gte: istMidnight, $lte: istNextMidnight }
        })
        .populate('team_a.team_id team_b.team_id team_a.captain team_b.captain result.winner')
        .sort({ status: 1, updatedAt: -1 }); // 'In Progress' before 'Scheduled'

        // Also get recently finished matches (fallback to the last 3 matches ever played if no recent ones)
        const completedMatches = await Match.find({ 
            status: 'Completed'
        })
        .sort({ end_time: -1, updatedAt: -1 }) // Sort strictly by the most recent end times
        .limit(3)
        .populate('team_a.team_id team_b.team_id team_a.captain team_b.captain result.winner');
        
        // Remove duplicates and combine
        const matchMap = new Map();
        activeMatches.forEach(m => matchMap.set(m._id.toString(), m));
        completedMatches.forEach(m => matchMap.set(m._id.toString(), m));
        
        const finalMatches = Array.from(matchMap.values());

        res.json({ success: true, matches: finalMatches });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   GET /api/matches/players/:id
// @desc    Get PUBLIC profile payload for a player (strictly safe data: names, stats, etc)
// @access  Public
router.get('/players/:id', async (req, res) => {
    try {
        const User = require('../models/User');
        const user = await User.findById(req.params.id)
            .select('name profile stats cricket_profile teams')
            .populate('teams.team_id', 'name logo');
            
        if (!user) return res.status(404).json({ success: false, message: 'Player not found' });
        
        // Also fetch their recent match history
        const recentMatches = await Match.find({
            $or: [
                { 'team_a.squad': user._id },
                { 'team_b.squad': user._id },
                { 'quick_teams.team_a.players.user_id': user._id },
                { 'quick_teams.team_b.players.user_id': user._id }
            ],
            status: 'Completed'
        })
        .select('team_a team_b start_time status result quick_teams live_data.scorecard.total format')
        .populate('team_a.team_id team_b.team_id result.winner')
        .sort({ end_time: -1, start_time: -1 })
        .limit(10);

        res.json({ success: true, player: user, matches: recentMatches });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   GET /api/matches/my-history
// @desc    Get all matches where the current user was a participant
// @access  Private
router.get('/my-history', verifyToken, async (req, res) => {
    try {
        const matches = await Match.find({
            $or: [
                { 'team_a.squad': req.user.id },
                { 'team_b.squad': req.user.id },
                { 'team_a.captain': req.user.id },
                { 'team_b.captain': req.user.id },
                { 'quick_teams.team_a.players.user_id': req.user.id },
                { 'quick_teams.team_b.players.user_id': req.user.id },
                { 'officials.scorer': req.user.id }
            ]
        })
        .populate('team_a.team_id team_b.team_id team_a.captain team_b.captain')
        .sort({ end_time: -1, start_time: -1 });

        res.json({ success: true, matches });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Assuming userAuth middleware is available to set req.user
// const { userAuth } = require('../middleware/auth'); // If such a middleware exists

// POST /api/matches/from-booking - Create match from existing booking ID
router.post('/from-booking', async (req, res) => {
    try {
        const { booking_id, title, format, team_a, team_b } = req.body;
        
        let booking = null;
        if (booking_id) {
             booking = await Booking.findById(booking_id);
             if (!booking) return res.status(404).json({ error: 'Booking not found' });
        }

        const match = new Match({
            booking_id: booking ? booking._id : null,
            title,
            format,
            start_time: booking ? booking.date : new Date(), // using date as start if available
            team_a,
            team_b,
            verification: { status: 'PENDING' }
        });

        await match.save();

        // Generate QR code for the match automatically
        const matchDate = match.start_time.toISOString().split('T')[0];
        const matchTime = `${match.start_time.getHours()}:${match.start_time.getMinutes()}`;

        const qrDetails = await QRService.generateMatchQR(match._id, match.booking_id, matchDate, matchTime);

        match.verification.qr_code.code = qrDetails.encodedData;
        match.verification.qr_code.qr_image = qrDetails.qrImage;
        match.verification.qr_code.generated_at = new Date();
        match.verification.qr_code.expires_at = qrDetails.expiresAt;
        match.verification.verification_token = qrDetails.securityToken;

        await match.save();

        res.status(201).json({ match, qr_code: qrDetails.qrImage });
    } catch (error) {
        console.error('Error creating match from booking:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/matches/:id/generateqr - Manual regeneration of QR code
router.post('/:id/generateqr', async (req, res) => {
    try {
        const match = await Match.findById(req.params.id);
        if (!match) return res.status(404).json({ error: 'Match not found' });

        const matchDate = match.start_time.toISOString().split('T')[0];
        const matchTime = `${match.start_time.getHours()}:${match.start_time.getMinutes()}`;

        const qrDetails = await QRService.generateMatchQR(match._id, match.booking_id, matchDate, matchTime);

        match.verification.qr_code.code = qrDetails.encodedData;
        match.verification.qr_code.qr_image = qrDetails.qrImage;
        match.verification.qr_code.generated_at = new Date();
        match.verification.qr_code.expires_at = qrDetails.expiresAt;
        match.verification.verification_token = qrDetails.securityToken;

        await match.save();

        res.json({ qr_code: qrDetails.qrImage, expires_at: qrDetails.expiresAt });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/matches/:id/offline - Mark match as offline (stats not counted)
router.post('/:id/offline', async (req, res) => {
    try {
        const match = await Match.findById(req.params.id);
        if (!match) return res.status(404).json({ error: 'Match not found' });

        match.is_offline_match = true;
        match.verification.status = 'OFFLINE';
        match.start_control.can_start = true;
        match.start_control.start_method = 'OFFLINE';

        await match.save();

        res.json({ message: 'Match set to offline mode. Stats will NOT be counted.', match });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/matches/:id - Get full match details
router.get('/:id', async (req, res) => {
    try {
        if (!req.params.id || req.params.id === 'undefined') {
            return res.status(400).json({ error: 'Invalid Match ID provided' });
        }
        
        const match = await Match.findById(req.params.id)
            .populate('team_a.team_id team_b.team_id result.winner')
            .populate('team_a.squad team_b.squad', 'name phone role')
            .populate('awards.man_of_the_match', 'name profile stats stats')
            .populate('quick_teams.team_a.players.user_id quick_teams.team_b.players.user_id', 'name phone profile.stats');
        
        if (!match) return res.status(404).json({ success: false, error: 'Match not found in database' });
        
        res.json({ success: true, match });
    } catch (error) {
        console.error('Fetch Match Error:', error);
        res.status(500).json({ error: error.message || 'Internal server error while loading match' });
    }
});

// POST /api/matches/:id/complete - Record match completion result and final awards
router.post('/:id/complete', async (req, res) => {
    try {
        const match = await Match.findById(req.params.id);
        if (!match) return res.status(404).json({ error: 'Match not found' });

        match.status = 'Completed';
        
        // Final synchronization of scores from live_data to root fields
        // This ensures the completion data is stored permanently and accurately in the DB
        if (match.live_data?.scorecard?.total?.runs !== undefined) {
             // Identifying which team was batting last
             if (match.live_active_team === 'A') {
                 match.team_a.score = match.live_data.scorecard.total.runs;
                 match.team_a.wickets = match.live_data.scorecard.total.wickets;
                 match.team_a.overs_played = match.live_data.scorecard.total.overs;
             } else {
                 match.team_b.score = match.live_data.scorecard.total.runs;
                 match.team_b.wickets = match.live_data.scorecard.total.wickets;
                 match.team_b.overs_played = match.live_data.scorecard.total.overs;
             }
        }
        
        // Sync Innings 1 score to root if missing
        if (match.live_data?.inn1_scorecard) {
             const inn1Key = match.live_active_team === 'A' ? 'team_b' : 'team_a';
             match[inn1Key].score = match.live_data.inn1_scorecard.score || match[inn1Key].score;
             match[inn1Key].wickets = match.live_data.inn1_scorecard.wickets || match[inn1Key].wickets;
             match[inn1Key].overs_played = match.live_data.inn1_scorecard.overs || match[inn1Key].overs_played;
        }

        match.result = {
            winner: req.body.winner || null,
            won_by: req.body.won_by || 'Pending',
            margin: req.body.margin || 0
        };
        match.awards = {
            man_of_the_match: req.body.man_of_the_match || null
        };
        
        match.markModified('team_a');
        match.markModified('team_b');
        await match.save();

        if (!match.stats_updated) {
            const statsService = require('../services/statsService');
            const io = req.app.get('socketio');
            // Using setImmediate to trigger in next event loop while response finishes
            setImmediate(() => {
                statsService.updatePlayerStats(match._id, io).catch(err => {
                    console.error('Stats Update Fail (complete):', err.message);
                });
            });
        }
        
        // Broadcast final state to Home Pages / live viewers
        const io = req.app.get('socketio');
        if (io) {
            io.to(`match_${match._id}`).emit('match:update', { matchId: match._id, status: 'Completed', result: match.result });
        }

        res.json({ success: true, message: 'Match successfully completed and archived.' });
    } catch (error) {
        console.error('Error completing match:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/matches/:id/live-update - Update full live state with Socket.IO broadcast
router.post('/:id/live-update', async (req, res) => {
    try {
        const match = await Match.findById(req.params.id);
        if (!match) return res.status(404).json({ error: 'Match not found' });

        const { generateCommentary } = require('../utils/commentaryGenerator');
        const prevBalls = match.live_data?.totalBalls || 0;
        const newBalls = req.body.totalBalls || 0;
        const isNewBall = newBalls > prevBalls;

        match.live_data = {
            ...match.live_data,
            ...req.body,
            last_updated: new Date()
        };

        // Sync root status for Home Page / Admin analytics
        if (req.body.status) {
            match.status = req.body.status;
        } else if (match.status === 'Scheduled') {
            match.status = 'In Progress';
        }

        // Identify current inning (index 0 for first, 1 for second)
        const innIdx = (req.body.inningsNum ? req.body.inningsNum - 1 : 0);
        match.current_innings_index = innIdx;
        
        // Determine which overall team is batting — TRUST THE CLIENT BATTING TEAM IF PROVIDED
        let activeTeam = 'A';
        if (req.body.batting_team === 'B' || req.body.battingTeam === 1 || (req.body.battingTeam === '1')) {
            activeTeam = 'B';
        } else if (req.body.batting_team === 'A' || req.body.battingTeam === 0 || (req.body.battingTeam === '0')) {
            activeTeam = 'A';
        } else if (innIdx === 1) {
            activeTeam = (match.live_active_team === 'A' ? 'B' : 'A');
        } else {
            activeTeam = match.live_active_team || 'A';
        }

        match.live_active_team = activeTeam;
        const battingTeamKey = activeTeam === 'B' ? 'team_b' : 'team_a';
        const bowlingTeamKey = activeTeam === 'B' ? 'team_a' : 'team_b';

        // Ensure the current innings array slot exists
        while (match.innings.length <= innIdx) {
            const nextInnNum = match.innings.length + 1;
            match.innings.push({ 
                number: nextInnNum, 
                score: 0, 
                wickets: 0, 
                overs_completed: 0, 
                batting_team: match[battingTeamKey].team_id,
                bowling_team: match[bowlingTeamKey].team_id,
                batsmen: [], 
                bowlers: [] 
            });
        }
        const currentInning = match.innings[innIdx];

        if (req.body.runs !== undefined) match[battingTeamKey].score = req.body.runs;
        if (req.body.wickets !== undefined) match[battingTeamKey].wickets = req.body.wickets;
        if (req.body.overs !== undefined) match[battingTeamKey].overs_played = req.body.overs;
        if (req.body.status) match.status = req.body.status;

        // CRITICAL: Update individual player stats and INNINGS scores for Home Page
        if (req.body.batters || req.body.bowlers || req.body.runs !== undefined) {
            // Sync inning-level scores
            if (req.body.runs !== undefined) currentInning.score = req.body.runs;
            if (req.body.wickets !== undefined) currentInning.wickets = req.body.wickets;
            if (req.body.overs !== undefined) currentInning.overs_completed = req.body.overs;

            if (req.body.batters) {
                currentInning.batsmen = req.body.batters.map(b => ({
                    user_id: b.user_id,
                    runs: b.r || 0,
                    balls: b.b || 0,
                    fours: b.fours || b.f || 0,
                    sixes: b.sixes || b.s || 0,
                    out_type: b.out ? 'Out' : 'Not Out',
                    is_on_strike: b.batting || false
                }));
            }

            if (req.body.bowlers) {
                currentInning.bowlers = req.body.bowlers.map(bw => ({
                    user_id: bw.user_id,
                    overs: bw.balls ? parseFloat(`${Math.floor(bw.balls / 6)}.${bw.balls % 6}`) : (bw.overs || 0),
                    runs: bw.r || 0,
                    wickets: bw.w || 0,
                    balls: bw.balls || 0
                }));
            }
        }

        // Map live_data for public view (striker index -> striker object)
        if (req.body.batters && req.body.striker !== undefined) {
            const s = req.body.batters[req.body.striker];
            if (s) match.live_data.striker = { name: s.name, runs: s.r, balls: s.b, fours: s.fours || s.f || 0, sixes: s.sixes || s.s || 0 };
        }
        if (req.body.batters && req.body.nonStriker !== undefined) {
            const ns = req.body.batters[req.body.nonStriker];
            if (ns) match.live_data.non_striker = { name: ns.name, runs: ns.r, balls: ns.b, fours: ns.fours || ns.f || 0, sixes: ns.sixes || ns.s || 0 };
        }
        if (req.body.bowlers && req.body.currentBowlerIdx !== undefined) {
            const bw = req.body.bowlers[req.body.currentBowlerIdx];
            if (bw) {
                const formattedOvers = `${Math.floor(bw.balls / 6)}.${bw.balls % 6}`;
                match.live_data.bowler = { 
                    name: bw.name, 
                    overs: formattedOvers,
                    r: bw.r, 
                    w: bw.w, 
                    balls: bw.balls,
                    eco: bw.balls > 0 ? (bw.r / (bw.balls / 6)).toFixed(1) : '0.0' 
                };
            }
        }
        if (req.body.batters) {
            match.live_data.batters = req.body.batters;
        }
        if (req.body.bowlers) {
            match.live_data.bowlers = req.body.bowlers;
        }
        if (req.body.inn1Batters) {
            match.live_data.inn1Batters = req.body.inn1Batters;
        }
        if (req.body.inn1Bowlers) {
            match.live_data.inn1Bowlers = req.body.inn1Bowlers;
        }

        if (req.body.currentOverBalls) {
            match.live_data.recent_balls = req.body.currentOverBalls;
        }

        // Build over summaries for over-by-over display
        if (req.body.overHistory || req.body.currentOverBalls) {
            match.live_data.over_summaries = (req.body.overHistory || []).map((over, i) => ({
                over_number: i + 1,
                balls: over,
                runs: over.reduce((sum, b) => {
                    if (b === '·') return sum;
                    if (b === 'W') return sum;
                    if (b === 'Wd') return sum + 1;
                    if (b === 'Nb') return sum + 1;
                    if (b === 'B') return sum + 1;
                    return sum + (parseInt(b) || 0);
                }, 0)
            }));
        }

        // Generate commentary for new balls
        let commentaryObj = null;
        if (isNewBall && req.body.currentOverBalls?.length > 0) {
            const lastBall = req.body.currentOverBalls[req.body.currentOverBalls.length - 1];
            const batter = req.body.batters?.[req.body.striker];
            const bowler = req.body.bowlers?.[req.body.currentBowlerIdx];
            
            // Wait for AI-generated commentary
            commentaryObj = await generateCommentary({
                runs: lastBall === '·' ? 0 : (parseInt(lastBall) || 0),
                isWicket: lastBall === 'W',
                wicketType: lastBall === 'W' ? (req.body.pendingWicket?.type || 'bowled') : null,
                extraType: lastBall === 'Wd' ? 'wide' : lastBall === 'Nb' ? 'noball' : lastBall === 'B' ? 'bye' : null,
                batsmanName: batter?.name || 'Batsman',
                bowlerName: bowler?.name || 'Bowler',
                overNum: req.body.overNum || 0,
                ballNum: req.body.ballInOver || 0
            });

            // Store commentary log (keep last 30 entries)
            if (!match.live_data.commentary_log) match.live_data.commentary_log = [];
            match.live_data.commentary_log.unshift({
                text: commentaryObj.text,
                keywords: commentaryObj.keywords,
                sentiment: commentaryObj.sentiment,
                ball: lastBall,
                runs: req.body.runs,
                wickets: req.body.wickets,
                overs: `${req.body.overNum || 0}.${req.body.ballInOver || 0}`,
                timestamp: new Date()
            });
            if (match.live_data.commentary_log.length > 30) {
                match.live_data.commentary_log = match.live_data.commentary_log.slice(0, 30);
            }
        }


        // Calculate run rate and required run rate
        const totalOvers = (req.body.overNum || 0) + (req.body.ballInOver || 0) / 6;
        match.live_data.run_rate = totalOvers > 0 ? ((req.body.runs || 0) / totalOvers).toFixed(2) : '0.00';
        if (req.body.target && req.body.inningsNum === 2) {
            const remainingRuns = req.body.target - (req.body.runs || 0);
            const totalMatchOvers = req.body.formatOvers || 20;
            const remainingOvers = totalMatchOvers - totalOvers;
            match.live_data.required_run_rate = remainingOvers > 0 ? (remainingRuns / remainingOvers).toFixed(2) : '0.00';
            match.live_data.runs_needed = remainingRuns;
            match.live_data.balls_remaining = Math.round(remainingOvers * 6);
        }

        // Partnership data
        match.live_data.partnership = req.body.partnership || { runs: 0, balls: 0 };
        
        if (req.body.status) match.status = req.body.status;
        if (req.body.runs !== undefined) match.live_data.runs = req.body.runs;
        if (req.body.wickets !== undefined) match.live_data.wickets = req.body.wickets;

        // Ensure precise boundary counting by analyzing the balls array if available
        currentInning = match.innings[match.current_innings_index];
        const resolveBoundaries = (player, type) => {
            if (type === '4s' && (player.fours || player.f)) return player.fours || player.f;
            if (type === '6s' && (player.sixes || player.s)) return player.sixes || player.s;
            
            // Fallback: Infer from balls array in the active inning
            if (currentInning && currentInning.balls) {
                const pBalls = currentInning.balls.filter(b => b.batsman_name === player.name || b.batter_name === player.name);
                if (pBalls.length > 0) {
                    if (type === '4s') return pBalls.filter(b => b.runs_off_bat === 4).length;
                    if (type === '6s') return pBalls.filter(b => b.runs_off_bat === 6).length;
                }
            }
            // Second Fallback: Mathematical inference for obvious cases (e.g. 6 runs in 1 ball)
            if (type === '6s' && player.r === 6 && player.b === 1) return 1;
            if (type === '4s' && player.r === 4 && player.b === 1) return 1;
            
            return 0;
        };

        // Full scorecard for Cricbuzz tabs
        match.live_data.scorecard = {
            batsmen: (req.body.batters || []).filter(b => b.batting || b.out || b.r > 0 || b.b > 0).map(b => ({
                name: b.name,
                runs: b.r || 0,
                balls: b.b || 0,
                fours: resolveBoundaries(b, '4s'),
                sixes: resolveBoundaries(b, '6s'),
                sr: b.b > 0 ? ((b.r / b.b) * 100).toFixed(1) : '0.0',
                out: b.out || false,
                batting: b.batting || false
            })),
            bowlers: (req.body.bowlers || []).filter(bw => bw.balls > 0 || bw.w > 0).map(bw => ({
                name: bw.name,
                overs: bw.balls ? `${Math.floor(bw.balls / 6)}.${bw.balls % 6}` : '0.0',
                maidens: bw.maidens || 0,
                runs: bw.r || 0,
                wickets: bw.w || 0,
                eco: bw.balls > 0 ? ((bw.r / (bw.balls / 6))).toFixed(1) : '0.0'
            })),
            extras: req.body.extras || { wides: 0, noballs: 0, byes: 0 },
            total: {
                runs: req.body.runs || 0,
                wickets: req.body.wickets || 0,
                overs: `${req.body.overNum || 0}.${req.body.ballInOver || 0}`
            }
        };

        // Inn1 Scorecard (for 2nd innings view)
        if (req.body.inn1Batters && req.body.inn1Bowlers) {
            match.live_data.inn1_scorecard = {
                score: req.body.inn1Score || 0,
                wickets: req.body.inn1Wickets || 0,
                overs: req.body.inn1Overs || 0,
                batsmen: req.body.inn1Batters.filter(b => b.r > 0 || b.b > 0 || b.out).map(b => ({
                    name: b.name, runs: b.r || 0, balls: b.b || 0,
                    fours: b.fours || b.f || 0, sixes: b.sixes || b.s || 0,
                    sr: b.b > 0 ? ((b.r / b.b) * 100).toFixed(1) : '0.0',
                    out: b.out || false
                })),
                bowlers: req.body.inn1Bowlers.filter(bw => bw.balls > 0).map(bw => ({
                    name: bw.name, 
                    overs: bw.balls ? `${Math.floor(bw.balls / 6)}.${bw.balls % 6}` : '0.0',
                    runs: bw.r || 0, wickets: bw.w || 0,
                    eco: bw.balls > 0 ? ((bw.r / (bw.balls / 6))).toFixed(1) : '0.0'
                }))
            };
        }

        // Mark modified for nested fields (CRITICAL for persistence)
        match.markModified('innings');
        match.markModified('live_data');
        match.markModified('team_a');
        match.markModified('team_b');

        await match.save();

        if (req.body.status === 'Completed' && !match.stats_updated) {
            const statsService = require('../services/statsService');
            const io = req.app.get('socketio');
            setImmediate(() => {
                statsService.updatePlayerStats(match._id, io).catch(err => {
                    console.error('Stats Update Fail (live):', err.message);
                });
            });
        }

        // 🔥 SOCKET.IO BROADCAST — Real-time to all connected viewers
        const io = req.app.get('socketio');
        if (io) {
            const payload = {
                ...match.live_data,
                matchId: match._id,
                status: match.status,
                phase: req.body.phase,
                inningsNum: req.body.inningsNum,
                timestamp: new Date()
            };
            // Map common aliases for transition period
            payload.score = { runs: payload.runs, wickets: payload.wickets };
            payload.overs = `${req.body.overNum || 0}.${req.body.ballInOver || 0}`;
            
            // Add graphPoint for real-time visualization (calculated from current state)
            payload.graphPoint = {
                over: parseFloat(`${req.body.overNum || 0}.${req.body.ballInOver || 0}`),
                runs: req.body.runs || 0,
                wickets: req.body.wickets || 0,
                inning: req.body.inningsNum || 1
            };

            io.to(`match_${match._id}`).emit('match:update', payload);
            io.to(`match_${match._id}`).emit('match:ball', payload);
            io.to(`match_${match._id}`).emit('liveScoreUpdate', payload);
        }

        res.json({ success: true, match_id: match._id });
    } catch (error) {
        console.error('live-update error:', error);
        res.status(500).json({ error: error.message });
    }
});


// POST /api/matches/:id/ball - Granular ball recording (Spec v4.0)
router.post('/:id/ball', async (req, res) => {
    try {
        const match = await Match.findById(req.params.id);
        if (!match) return res.status(404).json({ error: 'Match not found' });

        if (!match.canBeScored()) {
            return res.status(403).json({ error: 'Match not verified for official scoring.' });
        }

        const { inning, over, ball, batter_id, bowler_id, runs, is_four, is_six, extra_type, is_wicket, wicket } = req.body;

        const newBall = {
            ball_number: `${over}.${ball}`,
            over_number: over,
            ball_in_over: ball,
            batter_id,
            bowler_id,
            runs_off_bat: runs || 0,
            is_four: is_four || false,
            is_six: is_six || false,
            extra_type: extra_type || null,
            extra_runs: (extra_type === 'wide' || extra_type === 'noball' || extra_type === 'bye' || extra_type === 'legbye') ? 1 : 0,
            is_wicket: is_wicket || false,
            wicket: wicket || null,
            timestamp: new Date()
        };

        // Push to deep storage
        const currentInning = match.innings.find(inn => inn.number === inning);
        if (currentInning) {
            currentInning.balls.push(newBall);
            currentInning.score += (newBall.runs_off_bat + newBall.extra_runs);
            if (is_wicket) currentInning.wickets += 1;
        }

        await match.save();

        res.json({ success: true, ball_id: newBall._id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/matches/:id/undo-ball - Remove last ball
router.post('/:id/undo-ball', async (req, res) => {
    try {
        const Match = require('../models/Match');
        const match = await Match.findById(req.params.id);
        if (!match) return res.status(404).json({ error: 'Match not found' });

        const innIdx = match.current_innings_index || 0;
        const currentInning = match.innings[innIdx];
        
        if (currentInning && currentInning.balls.length > 0) {
            const poppedBall = currentInning.balls.pop();
            // Subtract runs/wickets
            const runs = (poppedBall.runs_off_bat || 0) + (poppedBall.extra_runs || 0);
            currentInning.score = Math.max(0, currentInning.score - runs);
            if (poppedBall.is_wicket) currentInning.wickets = Math.max(0, currentInning.wickets - 1);
            
            // Sync live_data runs too
            match.live_data.runs = currentInning.score;
            match.live_data.wickets = currentInning.wickets;

            match.markModified('innings');
            match.markModified('live_data');
            await match.save();
            
            // Broadcast the correction via socket
            const io = req.app.get('socketio');
            if (io) {
                io.to(`match_${match._id}`).emit('match:update', {
                    ...match.live_data,
                    matchId: match._id,
                    is_correction: true
                });
            }
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/matches/players/:id - Detailed player profile (Spec v4.0)
router.get('/players/:id', async (req, res) => {
    try {
        const User = require('../models/User');
        const player = await User.findById(req.params.id)
            .select('-password -realPassword')
            .populate('teams.team_id', 'name short_name colour');

        if (!player) return res.status(404).json({ error: 'Player not found' });

        // Fetch last 25 matches with broader lookup (including phone match for quick teams)
        const recentMatches = await Match.find({
            status: 'Completed',
            $or: [
                { 'team_a.squad': player._id },
                { 'team_b.squad': player._id },
                { 'quick_teams.team_a.players.user_id': player._id },
                { 'quick_teams.team_b.players.user_id': player._id },
                { 'quick_teams.team_a.players.input': player.phone },
                { 'quick_teams.team_b.players.input': player.phone }
            ]
        }).sort({ end_time: -1, start_time: -1 }).limit(25);

        // Fetch leaderboard ranks
        const battingRank = await User.countDocuments({ 'stats.batting.runs': { $gt: player.stats.batting.runs } }) + 1;
        const bowlingRank = await User.countDocuments({ 'stats.bowling.wickets': { $gt: player.stats.bowling.wickets } }) + 1;

        res.json({
            success: true,
            player: {
                ...player.toObject(),
                leaderboard: {
                    batting_rank: battingRank,
                    bowling_rank: bowlingRank
                }
            },
            matches: recentMatches.map(m => {
                // Combine all possible stat sources
                const allBatters = [
                    ...(m.live_data?.batters || []), 
                    ...(m.live_data?.inn1Batters || []),
                    ...(m.live_data?.inn2Batters || []),
                    ...(m.innings?.[0]?.batsmen || []),
                    ...(m.innings?.[1]?.batsmen || [])
                ];
                const allBowlers = [
                    ...(m.live_data?.bowlers || []),
                    ...(m.live_data?.inn1Bowlers || []),
                    ...(m.live_data?.inn2Bowlers || []),
                    ...(m.innings?.[0]?.bowlers || []),
                    ...(m.innings?.[1]?.bowlers || [])
                ];
                
                const pBat = allBatters.find(b => 
                    b.user_id?.toString() === player._id.toString() || 
                    b.name?.toLowerCase() === player.name?.toLowerCase() ||
                    b.id?.toString() === player._id.toString()
                );
                
                const pBowl = allBowlers.find(bw => 
                    bw.user_id?.toString() === player._id.toString() || 
                    bw.name?.toLowerCase() === player.name?.toLowerCase() ||
                    bw.id?.toString() === player._id.toString()
                );

                return {
                    _id: m._id,
                    id: m._id,
                    date: m.end_time || m.start_time,
                    format: m.format,
                    status: m.status,
                    result: m.result,
                    team_a: m.team_a,
                    team_b: m.team_b,
                    quick_teams: m.quick_teams,
                    performance: {
                        runs: pBat ? (pBat.runs || pBat.r || 0) : 0,
                        balls: pBat ? (pBat.balls || pBat.b || 0) : 0,
                        wickets: pBowl ? (pBowl.wickets || pBowl.w || 0) : 0,
                        economy: pBowl ? (pBowl.economy || pBowl.eco || 0) : 0,
                        sr: (pBat?.runs && pBat?.balls) ? ((pBat.runs / pBat.balls) * 100).toFixed(1) : 0
                    }
                };
            })
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/matches
 * @desc    Get all matches (filtered)
 * @access  Public
 */
router.get('/', async (req, res) => {
    try {
        const { status } = req.query;
        let query = {};
        if (status) query.status = status;

        const matches = await Match.find(query)
            .populate('team_a.team_id team_b.team_id')
            .sort({ start_time: -1 });
        
        res.json({ success: true, matches });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   GET /api/matches/:id/invite
// @desc    Get invite link and code
// @access  Private (Captain)
router.get('/:id/invite', async (req, res) => {
    try {
        const match = await Match.findById(req.params.id);
        if (!match) return res.status(404).json({ success: false, message: 'Match node not found.' });

        if (!match.match_creation.invite_code) {
            match.match_creation.invite_code = Math.random().toString(36).substring(2, 8).toUpperCase();
            match.match_creation.invite_link = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/join/match/${match.match_creation.invite_code}`;
            await match.save();
        }

        res.json({ 
            success: true, 
            invite_code: match.match_creation.invite_code,
            invite_link: match.match_creation.invite_link 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/matches/:id/accept
// @desc    Opposing captain accepts match
// @access  Private
router.post('/:id/accept', async (req, res) => {
    try {
        const { team_id } = req.body;
        const match = await Match.findById(req.params.id);
        if (!match) return res.status(404).json({ success: false, message: 'Match Node Failure.' });

        match.team_b.team_id = team_id;
        match.match_creation.opponent_status = 'ACCEPTED';
        match.status = 'Scheduled'; // Match transitions to scheduled once opponent accepts

        await match.save();

        // Emit acceptance event
        const io = req.app.get('socketio');
        if (io) {
            io.to(`match_${match._id}`).emit('match:opponent_accepted', {
                match_id: match._id,
                status: match.status
            });
        }

        res.json({ success: true, message: 'Alliance confirmed. Match scheduled.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/matches/:id/playing-xi
// @desc    Set the playing XI for a team
// @access  Private (Team Captain)
router.post('/:id/playing-xi', async (req, res) => {
    try {
        const { team_id, playing_xi } = req.body; // playing_xi is an array of player IDs
        const match = await Match.findById(req.params.id);
        if (!match) return res.status(404).json({ success: false, message: 'Match not found.' });

        // Determine which team is setting their XI
        if (match.team_a.team_id.toString() === team_id) {
            match.team_a.squad = playing_xi;
            match.match_creation.team_a_confirmed = true;
        } else if (match.team_b.team_id.toString() === team_id) {
            match.team_b.squad = playing_xi;
            match.match_creation.team_b_confirmed = true;
        } else {
            return res.status(403).json({ success: false, message: 'Unauthorized to set XI for this team.' });
        }

        // Check if both teams have confirmed their XI
        if (match.match_creation.team_a_confirmed && match.match_creation.team_b_confirmed) {
            match.status = 'BOTH_TEAMS_CONFIRMED';
            match.start_control.can_start = true; // Match can now be started
        }

        await match.save();

        // Emit update event
        const io = req.app.get('socketio');
        if (io) {
            io.to(`match_${match._id}`).emit('match:playing_xi_updated', {
                match_id: match._id,
                team_id: team_id,
                status: match.status,
                team_a_confirmed: match.match_creation.team_a_confirmed,
                team_b_confirmed: match.match_creation.team_b_confirmed
            });
        }

        res.json({ success: true, message: 'Playing XI updated successfully.', match });
    } catch (err) {
        console.error('Error setting playing XI:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/matches/quick/create
// @desc    Create a Quick Match (Guest/Walk-in)
// @access  Private
router.post('/quick/create', async (req, res) => {
    try {
        const { format, team_a, team_b, booking_id } = req.body;
        const crypto = require('crypto');
        const User = require('../models/User'); // Ensure User model is available
        const setupPlayers = async (teamData, teamName) => {
            const players = [];
            for (const p of teamData.players) {
                let claimToken = null;
                let isLinked = false;
                let userId = null;

                if (p.input_type === 'MOBILE') {
                    const user = await User.findOne({ phone: p.input });
                    if (user) {
                        isLinked = true;
                        userId = user._id;
                    } else {
                        claimToken = crypto.randomBytes(4).toString('hex').toUpperCase();
                        // Dispatch SMS (Pseudo-code for now, will integrate with twilioClient below)
                        console.log(`[SMS] To ${p.input}: Hi! You played for ${teamName}. Register at the-turf.app/claim/${claimToken} to save stats.`);
                    }
                }

                players.push({
                    display_name: p.display_name,
                    input: p.input,
                    input_type: p.input_type,
                    user_id: userId,
                    is_linked: isLinked,
                    claim_token: claimToken,
                    role: p.role,
                    is_captain: p.is_captain,
                    is_wk: p.is_wk,
                    batting_position: p.batting_position
                });
            }
            return players;
        };

        const processedTeamA = await setupPlayers(team_a, team_a.name);
        const processedTeamB = await setupPlayers(team_b, team_b.name);

        const match = new Match({
            title: `${team_a.name} vs ${team_b.name} — Quick Match`,
            match_mode: 'QUICK',
            format: format || 'T10',
            start_time: new Date(),
            quick_teams: { 
                team_a: { name: team_a.name, players: processedTeamA }, 
                team_b: { name: team_b.name, players: processedTeamB } 
            },
            status: 'Scheduled',
            booking_id: booking_id || null,
            match_creation: { 
                created_via: booking_id ? 'BOOKING' : 'DIRECT',
                linked_booking_id: booking_id || null
            }
        });


        // Generate Match QR
        const qrDetails = await QRService.generateMatchQR(match._id);
        match.verification.qr_code.code = qrDetails.encodedData;
        match.verification.qr_code.qr_image = qrDetails.qrImage;
        match.verification.qr_code.generated_at = new Date();
        match.verification.qr_code.expires_at = qrDetails.expiresAt;
        match.verification.verification_token = qrDetails.securityToken;

        await match.save();

        // Twilio SMS Integration for Invites
        const twilioClient = req.app.get('twilio');
        if (twilioClient) {
            const allPlayers = [...processedTeamA, ...processedTeamB];
            const unregistered = allPlayers.filter(p => p.input_type === 'MOBILE' && !p.is_linked);
            
            for (const p of unregistered) {
                try {
                    await twilioClient.messages.create({
                        body: `Hi! You played in ${team_a.name} vs ${team_b.name} at The Turf. Register to claim your stats: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/claim/${p.claim_token}`,
                        from: process.env.TWILIO_PHONE_NUMBER,
                        to: `+91${p.input}`
                    });
                    // Mark as sent in DB
                    await Match.updateOne(
                        { _id: match._id, "quick_teams.team_a.players.input": p.input },
                        { $set: { "quick_teams.team_a.players.$.sms_invite_sent": true } }
                    );
                    await Match.updateOne(
                        { _id: match._id, "quick_teams.team_b.players.input": p.input },
                        { $set: { "quick_teams.team_b.players.$.sms_invite_sent": true } }
                    );
                } catch (smsErr) {
                    console.error(`SMS Failed for ${p.input}:`, smsErr.message);
                }
            }
        }

        res.status(201).json({ 
            success: true, 
            message: 'Quick Match Manifested. Invites Dispatched.', 
            match_id: match._id,
            qr_code: qrDetails.qrImage 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/matches/quick/:id/convert
// @desc    Convert Quick Match teams into Registered Teams
// @access  Private (Admin Role)
router.post('/quick/:id/convert', async (req, res) => {
    try {
        const match = await Match.findById(req.params.id);
        if (!match || match.match_mode !== 'QUICK') {
            return res.status(404).json({ success: false, message: 'Quick match node not found for conversion.' });
        }

        const teamA = new Team({
            name: match.quick_teams.team_a.name,
            leader_id: match.quick_teams.team_a.players.find(p => p.is_captain)?.user_id || req.user.id,
            members: match.quick_teams.team_a.players.map(p => ({
                user_id: p.user_id,
                role: p.is_captain ? 'VICE_CAPTAIN' : 'PLAYER',
                status: p.is_linked ? 'ACTIVE' : 'INVITED'
            }))
        });

        const teamB = new Team({
            name: match.quick_teams.team_b.name,
            leader_id: match.quick_teams.team_b.players.find(p => p.is_captain)?.user_id || req.user.id,
            members: match.quick_teams.team_b.players.map(p => ({
                user_id: p.user_id,
                role: p.is_captain ? 'VICE_CAPTAIN' : 'PLAYER',
                status: p.is_linked ? 'ACTIVE' : 'INVITED'
            }))
        });

        await teamA.save();
        await teamB.save();

        match.converted_to_teams.done = true;
        match.converted_to_teams.team_a_id = teamA._id;
        match.converted_to_teams.team_b_id = teamB._id;
        match.converted_to_teams.converted_at = new Date();
        await match.save();

        res.json({ success: true, team_a_id: teamA._id, team_b_id: teamB._id });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/matches/:id/complete
// @desc    Match Completion & Stats Update Protocol
// @access  Private (Scorer/Admin)
router.post('/:id/complete', async (req, res) => {
    try {
        const { winner, won_by, margin, man_of_the_match } = req.body;
        const match = await Match.findById(req.params.id);
        if (!match) return res.status(404).json({ success: false, message: 'Match Node Failure.' });

        match.status = 'Completed';
        match.result = { winner, won_by, margin };
        match.awards.man_of_the_match = man_of_the_match;
        match.end_time = new Date();
        
        // Auto-verify if processed by Authorized Scorer/Admin to trigger Career Stats
        match.verification.status = 'VERIFIED';
        match.verification.verified_by = req.user?.id || 'SYSTEM';
        match.verification.verified_at = new Date();

        await match.save();

        // 🚨 CRITICAL: Workflow 5 — Career Stats Manifestation
        const statsService = require('../services/statsService');
        const statsResult = await statsService.updatePlayerStats(match._id, req.app.get('socketio'));

        res.json({ 
            success: true, 
            message: 'Match Completed. Statistics Manifested.', 
            stats_updated: statsResult.success,
            match 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   GET /api/matches/:id/prediction
// @desc    Get AI-driven match prediction
// @access  Public
router.get('/:id/prediction', async (req, res) => {
    try {
        const match = await Match.findById(req.params.id)
            .populate('team_a.team_id team_b.team_id')
            .populate('team_a.squad team_b.squad', 'name profile.stats stats')
            .populate('quick_teams.team_a.players.user_id quick_teams.team_b.players.user_id', 'name profile.stats stats');

        if (!match) return res.status(404).json({ success: false, message: 'Match Node Failure.' });

        // Clean match data for AI context
        const context = {
            title: match.title,
            format: match.format,
            teams: {
                team_a: {
                    name: match.team_a.team_id?.name || match.quick_teams?.team_a?.name || 'Team A',
                    score: match.team_a.score,
                    wickets: match.team_a.wickets,
                    overs: match.team_a.overs_played
                },
                team_b: {
                    name: match.team_b.team_id?.name || match.quick_teams?.team_b?.name || 'Team B',
                    score: match.team_b.score,
                    wickets: match.team_b.wickets,
                    overs: match.team_b.overs_played
                }
            },
            currentInnings: match.current_innings_index + 1,
            battingTeam: match.live_active_team,
            live_data: {
                striker: match.live_data?.striker,
                non_striker: match.live_data?.non_striker,
                bowler: match.live_data?.bowler,
                run_rate: match.live_data?.run_rate,
                req_run_rate: match.live_data?.required_run_rate,
                runs_needed: match.live_data?.runs_needed,
                balls_remaining: match.live_data?.balls_remaining
            }
        };

        let prediction = {
            winner: "Neutral",
            probability: "50%",
            leadingTeam: "Analyzing...",
            keyPlayer: "N/A",
            reason: "AI Prediction node is currently synchronizing."
        };

        try {
            prediction = await AIService.generateMatchPrediction(context);
        } catch (aiErr) {
            console.error('AI Prediction Execution Failed:', aiErr.message);
        }

        res.json({ success: true, prediction });
    } catch (err) {
        console.error('AI Prediction Route Error:', err);
        res.status(500).json({ success: false, message: 'Strategic AI Node Failure' });
    }
});

// @route   GET /api/matches/player/search
// @desc    Search players for comparison (ByName or ByPhone)
// @access  Public
router.get('/player/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) return res.json({ success: true, players: [] });
        
        const User = require('../models/User');
        const players = await User.find({
            $or: [
                { name: { $regex: q, $options: 'i' } },
                { phone: { $regex: q, $options: 'i' } }
            ]
        })
        .select('name phone profile.stats stats cricket_profile image')
        .limit(10);
        
        res.json({ success: true, players });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Search synchronized failure.' });
    }
});

// @route   GET /api/matches/player/compare
// @desc    Get side-by-side career stats for two players
// @access  Public
router.get('/player/compare', async (req, res) => {
    try {
        const { p1, p2 } = req.query;
        if (!p1 || !p2) return res.status(400).json({ message: 'Select two gladiators to compare.' });
        
        const User = require('../models/User');
        const [player1, player2] = await Promise.all([
            User.findById(p1).select('name stats profile cricket_profile image phone'),
            User.findById(p2).select('name stats profile cricket_profile image phone')
        ]);
        
        if (!player1 || !player2) return res.status(404).json({ message: 'One or more gladiators not found.' });
        
        // Data mapping for Radar/Bar Chart comparison
        const comparisonData = {
           p1: {
               name: player1.name,
               runs: player1.stats?.batting?.runs || 0,
               sr: player1.stats?.batting?.strike_rate || 0,
               avg: player1.stats?.batting?.average || 0,
               wickets: player1.stats?.bowling?.wickets || 0,
               economy: player1.stats?.bowling?.economy || 0,
               avatar: player1.image
           },
           p2: {
               name: player2.name,
               runs: player2.stats?.batting?.runs || 0,
               sr: player2.stats?.batting?.strike_rate || 0,
               avg: player2.stats?.batting?.average || 0,
               wickets: player2.stats?.bowling?.wickets || 0,
               economy: player2.stats?.bowling?.economy || 0,
               avatar: player2.image
           }
        };

        res.json({ success: true, comparison: comparisonData });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Combat comparison failed.' });
    }
});

module.exports = router;
