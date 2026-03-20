const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const Booking = require('../models/Booking');
const AIService = require('../services/aiService');
const QRService = require('../services/qrService');
const verifyMatch = require('../middleware/verifyMatch');

// @route   GET /api/matches/live
// @desc    Get the active match AND the most recent completed match for today
// @access  Public
router.get('/live', async (req, res) => {
    try {
        const now = new Date();
        const startOfToday = new Date(now).setHours(0,0,0,0);
        const endOfToday = new Date(now).setHours(23,59,59,999);

        // 1. Get the current Live Match
        const liveMatch = await Match.findOne({ 
            status: 'In Progress',
            start_time: { $gte: startOfToday, $lte: endOfToday }
        })
        .populate('team_a.team_id team_b.team_id team_a.captain team_b.captain')
        .sort({ start_time: -1 });

        // 2. Get the most recent Completed Match for today
        const completedMatch = await Match.findOne({
            status: 'Completed',
            start_time: { $gte: startOfToday, $lte: endOfToday }
        })
        .populate('team_a.team_id team_b.team_id team_a.captain team_b.captain')
        .sort({ end_time: -1 });

        const matches = [];
        if (liveMatch) matches.push(liveMatch);
        if (completedMatch) matches.push(completedMatch);

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
            .populate('team_a.team_id team_b.team_id')
            .populate('team_a.squad team_b.squad', 'name phone role')
            .populate('quick_teams.team_a.players.user_id quick_teams.team_b.players.user_id', 'name phone profile.stats');
        
        if (!match) return res.status(404).json({ error: 'Match not found in database' });
        
        res.json(match);
    } catch (error) {
        console.error('Fetch Match Error:', error);
        res.status(500).json({ error: error.message || 'Internal server error while loading match' });
    }
});

// POST /api/matches/:id/live-update - Update full live state
router.post('/:id/live-update', async (req, res) => {
    try {
        const match = await Match.findById(req.params.id);
        if (!match) return res.status(404).json({ error: 'Match not found' });

        match.live_data = {
            ...match.live_data,
            ...req.body,
            last_updated: new Date()
        };

        // Update the main score fields for the CURRENT batting team
        const battingTeamKey = (req.body.batting_team === 'B' || match.live_active_team === 'B') ? 'team_b' : 'team_a';
        
        if (req.body.runs !== undefined) match[battingTeamKey].score = req.body.runs;
        if (req.body.wickets !== undefined) match[battingTeamKey].wickets = req.body.wickets;
        if (req.body.overs !== undefined) match[battingTeamKey].overs_played = req.body.overs;
        if (req.body.status) match.status = req.body.status;

        // CRITICAL: Update individual player stats and INNINGS scores for Home Page
        if (req.body.batters || req.body.bowlers || req.body.runs !== undefined) {
            // Ensure first innings exists
            if (match.innings.length === 0) {
                match.innings.push({ number: 1, score: 0, wickets: 0, overs_completed: 0, batsmen: [], bowlers: [] });
            }
            const currentInning = match.innings[0];

            // Sync inning-level scores for home page display
            if (req.body.runs !== undefined) currentInning.score = req.body.runs;
            if (req.body.wickets !== undefined) currentInning.wickets = req.body.wickets;
            if (req.body.overs !== undefined) currentInning.overs_completed = req.body.overs;

            if (req.body.batters) {
                currentInning.batsmen = req.body.batters.map(b => ({
                    user_id: b.user_id,
                    runs: b.r,
                    balls: b.b,
                    fours: b.fours,
                    sixes: b.sixes,
                    out_type: b.out ? 'Out' : 'Not Out'
                }));
            }

            if (req.body.bowlers) {
                currentInning.bowlers = req.body.bowlers.map(bw => ({
                    user_id: bw.user_id,
                    overs: bw.overs,
                    runs: bw.r,
                    wickets: bw.w,
                    balls: bw.balls
                }));
            }
        }

        // Map live_data for public view (striker index -> striker object)
        if (req.body.batters && req.body.striker !== undefined) {
            const s = req.body.batters[req.body.striker];
            match.live_data.striker = { name: s.name, runs: s.r, balls: s.b };
        }
        if (req.body.batters && req.body.nonStriker !== undefined) {
            const ns = req.body.batters[req.body.nonStriker];
            match.live_data.non_striker = { name: ns.name, runs: ns.r, balls: ns.b };
        }
        if (req.body.bowlers && req.body.currentBowlerIdx !== undefined) {
            const bw = req.body.bowlers[req.body.currentBowlerIdx];
            match.live_data.bowler = { name: bw.name, overs: bw.overs, r: bw.r, w: bw.w, eco: bw.overs > 0 ? (bw.r / bw.overs).toFixed(1) : '0.0' };
        }
        if (req.body.currentOverBalls) {
            match.live_data.recent_balls = req.body.currentOverBalls;
        }

        await match.save();

        const io = req.app.get('socketio');
        if (io) {
            io.to(`match_${match._id}`).emit('match:update', match.live_data);
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/matches/:id/ball - Record a ball (Requires verifyMatch middleware protection)
router.post('/:id/ball', verifyMatch, async (req, res) => {
    try {
        const match = req.match; // populated by verifyMatch
        const { run, is_wicket, extra_type, extra_runs, bowler_id, batsman_id } = req.body;

        // In a real app, you'd maintain an 'innings' array and update the current over
        // For brevity in this v2.0 foundation, we update the status and emit the event
        const ballData = {
            match_id: match._id,
            run: run || 0,
            is_wicket: !!is_wicket,
            extra_type: extra_type || 'NONE',
            extra_runs: extra_runs || 0,
            bowler_id,
            batsman_id,
            timestamp: new Date()
        };

        // Generate AI Commentary (Phase 1 AI Integration)
        let aiCommentary = "";
        try {
            aiCommentary = await AIService.generateCommentary({
                ball: { runs: run || 0, type: is_wicket ? 'WICKET' : 'RUNS', over: match.innings && match.innings[0] && match.innings[0].overs ? match.innings[0].overs.length : 0, ballNo: 1 },
                batsman: { name: 'Player A', runs: 28, balls: 24 }, // Actual names would be retrieved here
                bowler: { name: 'Player B', wickets: 1, economy: 6.0 },
                match: { target: 145, required: 42, ballsLeft: 30, team: 'Chasing Team' },
                situation: 'NORMAL'
            });
            ballData.commentary = aiCommentary;
        } catch (aiErr) {
            console.warn('AI Commentary service failure (skipping):', aiErr.message);
        }

        // Emit real-time update to all listeners for this match
        const io = req.app.get('socketio');
        if (io) {
            io.to(`match_${match._id}`).emit(is_wicket ? 'match:wicket' : 'match:ball', ballData);
            console.log(`📡 Broadcasted ${is_wicket ? 'wicket' : 'ball'} with AI Commentary for match_${match._id}`);
        }

        res.json({ success: true, message: 'Ball recorded and broadcasted.', ball: ballData });
    } catch (error) {
        console.error('Ball Recording Error:', error);
        res.status(500).json({ error: 'Ball Recording protocol failure.' });
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
        match.verification.verified_by = req.user.id;
        match.verification.verified_at = new Date();

        await match.save();

        // 🚨 CRITICAL: Workflow 5 — Career Stats Manifestation
        const StatsService = require('../services/statsService');
        const statsResult = await StatsService.updateCareerStats(match);

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

module.exports = router;
