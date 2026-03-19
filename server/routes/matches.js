const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const Booking = require('../models/Booking');
const AIService = require('../services/aiService');
const QRService = require('../services/qrService');
const verifyMatch = require('../middleware/verifyMatch');
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
        const match = await Match.findById(req.params.id)
            .populate('team_a.team_id team_b.team_id')
            .populate('team_a.squad team_b.squad', 'name phone role');
        
        if (!match) return res.status(404).json({ error: 'Match not found' });
        
        res.json(match);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
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
                ball: { runs: run_count, type: is_wicket ? 'WICKET' : 'RUNS', over: match.innings[0].overs.length, ballNo: currentOver.balls.length },
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
        const { format, team_a, team_b } = req.body;
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
            match_creation: { created_via: 'DIRECT' }
        });

        // Generate Match QR
        const qrDetails = await QRService.generateMatchQR(match._id);
        match.verification.qr_code.code = qrDetails.encodedData;
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
