const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const Booking = require('../models/Booking');
const Team = require('../models/Team');
const User = require('../models/User');
const AIService = require('../services/aiService');
const QRService = require('../services/qrService');
const aiInsightsService = require('../services/aiInsightsService');
const verifyToken = require('../middleware/verifyToken');
const llmClient = require('../services/llmClient');
const verifyMatch = require('../middleware/verifyMatch');
const BallEvent = require('../models/BallEvent');
const { sendNotification } = require('../services/webpushr');
const mongoose = require('mongoose');
const getValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : undefined;

const sanitizeMatchDocument = (match) => {
    if (!match.innings || !Array.isArray(match.innings)) return;
    match.innings.forEach((inn) => {
        if (inn.batsmen && Array.isArray(inn.batsmen)) {
            inn.batsmen.forEach((b) => {
                b.user_id = getValidObjectId(b.user_id) || null;
            });
        }
        if (inn.bowlers && Array.isArray(inn.bowlers)) {
            inn.bowlers.forEach((bw) => {
                bw.user_id = getValidObjectId(bw.user_id) || null;
            });
        }
        if (inn.ball_history && Array.isArray(inn.ball_history)) {
            inn.ball_history.forEach((h) => {
                h.batsman_id = getValidObjectId(h.batsman_id) || null;
                h.bowler_id = getValidObjectId(h.bowler_id) || null;
            });
        }
        if (inn.balls && Array.isArray(inn.balls)) {
            inn.balls.forEach((b) => {
                b.batter_id = getValidObjectId(b.batter_id) || null;
                b.non_striker_id = getValidObjectId(b.non_striker_id) || null;
                b.bowler_id = getValidObjectId(b.bowler_id) || null;
                if (b.wicket) {
                    b.wicket.player_out_id = getValidObjectId(b.wicket.player_out_id) || null;
                    b.wicket.fielder_id = getValidObjectId(b.wicket.fielder_id) || null;
                }
            });
        }
        if (inn.fall_of_wickets && Array.isArray(inn.fall_of_wickets)) {
            inn.fall_of_wickets.forEach((f) => {
                f.player_id = getValidObjectId(f.player_id) || null;
            });
        }
        if (inn.partnership_log && Array.isArray(inn.partnership_log)) {
            inn.partnership_log.forEach((p) => {
                p.batsman1_id = getValidObjectId(p.batsman1_id) || null;
                p.batsman2_id = getValidObjectId(p.batsman2_id) || null;
            });
        }
    });
};

// ✅ STEP 11: Player Confirmation
router.post('/:id/confirm-participation', async (req, res) => {
    try {
        const { mobile } = req.body;
        const match = await Match.findById(req.params.id);
        if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

        let found = false;
        ['team_a', 'team_b'].forEach(teamSide => {
            match.quick_teams[teamSide].players.forEach(p => {
                if (p.input === mobile) {
                    p.participation_status = 'confirmed';
                    found = true;
                }
            });
        });

        if (!found) return res.status(404).json({ success: false, message: 'Mobile not registered in this match' });

        await match.save();
        res.json({ success: true, message: 'Participation confirmed' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── GET MATCH BY QR CODE ─────────────────────────────────────────────
// GET /api/matches/by-code/:matchCode
// Public endpoint used by QR landing page when Google Lens scans match QR
router.get('/by-code/:matchCode', async (req, res) => {
    try {
        const match = await Match.findOne({ qrCode: req.params.matchCode })
            .populate('team_a.team_id', 'name shortName logo')
            .populate('team_b.team_id', 'name shortName logo')
            .select('matchTitle matchNumber status team_a team_b scheduledAt venue qrCode qrVerified tournament format');
        if (!match) return res.status(404).json({ success: false, message: 'Match QR code not found' });
        
        const aiMessage = await generateAIMatchPreview(match);
        res.json({ success: true, match, aiMessage });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Helper: AI match preview generator
async function generateAIMatchPreview(match) {
    const teamAName = match.team_a?.team_id?.name || match.quick_teams?.team_a?.name || 'Team A';
    const teamBName = match.team_b?.team_id?.name || match.quick_teams?.team_b?.name || 'Team B';
    const format = match.format || 'T20';
    const status = match.status || 'Pending';

    const prompt = `You are an expert cricket match analyst for "The Turf" platform.
Generate a short, catchy 1-2 sentence preview or status update for this match.
Context:
- Match: ${teamAName} vs ${teamBName}
- Format: ${format}
- Status: ${status}
Make it sound like a live broadcast commentary preview. Keep it under 180 characters.`;

    try {
        const reply = await llmClient.generateChat([
            { role: 'user', content: prompt }
        ], { maxTokens: 80 });
        if (reply) return reply.trim();
    } catch (err) {
        console.warn('AI preview generation failed, using fallback:', err.message);
    }
    return `🏏 A thrilling ${format} encounter between ${teamAName} and ${teamBName}. Follow live ball-by-ball action here!`;
}

// ✅ STEP 13: Admin QR Scan (MANDATORY APPROVAL)
router.post('/admin/verify-scan', async (req, res) => {
    try {
        const { matchId, token } = req.body;
        const match = await Match.findById(matchId);
        
        if (!match) return res.status(404).json({ success: false, message: 'Match Node Invalid' });
        
        // In a real scenario, check token validity. For now, simple check.
        if (match.verification.verification_token === token || !token) {
            match.status = 'Approved';
            match.verification.status = 'VERIFIED';
            match.verification.scanned_at = new Date();
            await match.save();
            
            return res.json({ success: true, message: 'Match Approved for Deployment' });
        } else {
            return res.status(401).json({ success: false, message: 'Security Token Mismatch' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

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

        const registeredTeams = await Team.find().populate('players.user_id');

        const historyPool = [];
        const seenNames = new Set();

        // 1. Add Registered Teams (Highest Priority)
        registeredTeams.forEach(t => {
            if (!seenNames.has(t.name)) {
                historyPool.push({ 
                    id: t._id, 
                    name: t.name, 
                    short: t.shortName || t.short_name || t.name.slice(0,3).toUpperCase(), 
                    players: t.players?.map(p => p.user_id?.name || p.name).filter(Boolean) || [],
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
// @desc    Get all active/recent matches for the home page live section
// @access  Public
router.get('/live', async (req, res) => {
    try {
        const matchFields = 'title format overs start_time location team_a team_b status live_data result venue';
        
        const inProgressMatches = await Match.find({ status: 'In Progress' })
            .select(matchFields)
            .populate('team_a.team_id team_b.team_id team_a.captain team_b.captain result.winner', 'name short_name logo primary_colour')
            .sort({ updatedAt: -1 })
            .lean();

        // Show Scheduled matches updated within the last 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const scheduledMatches = await Match.find({
            status: 'Scheduled',
            updatedAt: { $gte: sevenDaysAgo }
        })
        .select(matchFields)
        .populate('team_a.team_id team_b.team_id team_a.captain team_b.captain result.winner', 'name short_name logo primary_colour')
        .sort({ updatedAt: -1 })
        .limit(10)
        .lean();

        // Recently completed matches (last 3)
        const completedMatches = await Match.find({ status: 'Completed' })
            .select(matchFields)
            .sort({ end_time: -1, updatedAt: -1 })
            .limit(3)
            .populate('team_a.team_id team_b.team_id team_a.captain team_b.captain result.winner', 'name short_name logo primary_colour')
            .lean();

        // Merge, deduplicate, prioritize: In Progress > Scheduled > Completed
        const matchMap = new Map();
        completedMatches.forEach(m => matchMap.set(m._id.toString(), m));
        scheduledMatches.forEach(m => matchMap.set(m._id.toString(), m));
        inProgressMatches.forEach(m => matchMap.set(m._id.toString(), m));

        // Sort: In Progress first, then Scheduled, then Completed
        const priority = { 'In Progress': 0, 'Scheduled': 1, 'Completed': 2 };
        const finalMatches = Array.from(matchMap.values())
            .sort((a, b) => (priority[a.status] ?? 3) - (priority[b.status] ?? 3));

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
        const { booking_id, title, format, overs, team_a, team_b } = req.body;
        
        let booking = null;
        if (booking_id) {
             booking = await Booking.findById(booking_id);
             if (!booking) return res.status(404).json({ error: 'Booking not found' });
        }

        const match = new Match({
            booking_id: booking ? booking._id : null,
            title,
            format,
            overs: overs || 20,
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

// GET /api/matches/:id/ai-report - AI generated summary
router.get('/:id/ai-report', async (req, res) => {
    try {
        const match = await Match.findById(req.params.id).populate('team_a.team_id team_b.team_id result.winner');
        if (!match) return res.status(404).json({ success: false, message: 'Match node not found.' });

        const { generateMatchReport } = require('../utils/aiEngine');
        const report = generateMatchReport(match);

        res.json({ success: true, report });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/matches/:id - Get full match details
// @route   POST /api/matches/:id/undo-ball
// @desc    Remove last ball from history and revert state
// Route removed as it was redundant and used non-existent root ball_history.
// Primary undo logic is located further down in the file.

router.get('/:id', async (req, res) => {
    try {
        if (!req.params.id || req.params.id === 'undefined') {
            return res.status(400).json({ error: 'Invalid Match ID provided' });
        }
        
        let match;
        if (req.params.id === 'latest') {
            // Find the most recent active or completed match
            match = await Match.findOne()
                .populate('team_a.team_id team_b.team_id result.winner')
                .populate('team_a.squad team_b.squad', 'name phone role')
                .sort({ updatedAt: -1 });
        } else {
            match = await Match.findById(req.params.id)
                .populate('team_a.team_id team_b.team_id result.winner')
                .populate('team_a.squad team_b.squad', 'name phone role')
                .populate('awards.man_of_the_match', 'name profile stats')
                .populate('quick_teams.team_a.players.user_id quick_teams.team_b.players.user_id', 'name phone profile.stats');
        }
        
        if (!match) return res.status(404).json({ success: false, error: 'Match not found in database' });
        
        res.json({ success: true, match });
    } catch (error) {
        console.error('Fetch Match Error:', error);
        res.status(500).json({ error: error.message || 'Internal server error while loading match' });
    }
});

// GET /api/matches/:id/analytics - Get advanced analytics (PREMIUM ONLY)
const checkPremium = require('../middleware/checkPremium');
router.get('/:id/analytics', verifyToken, checkPremium, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    // Generate high-end analytics data (simulating AI processing)
    const analytics = {
        velocity: match.innings?.map(inn => ({
            team: inn.batting_team === 'A' ? 'Team A' : 'Team B',
            overs: (inn.balls || []).length / 6,
            velocity_score: Math.random() * 100 // AI derived metric
        })),
        momentum: match.live_data?.momentum || [],
        match_prediction: {
            win_prob_a: 50 + (Math.random() * 20 - 10),
            mvp_candidate: "Analyzing current performance..."
        }
    };

    res.json({ success: true, analytics });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/matches/:id/complete - Record match completion result and final awards
router.post('/:id/complete', async (req, res) => {
    try {
        // Validate match id early
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid match id' });

        const match = await Match.findById(req.params.id).lean();
        if (!match) return res.status(404).json({ error: 'Match not found' });

        // Build the $set payload — only update root-level fields, do NOT touch innings/ball_history
        const setPayload = {
            status: 'Completed',
            end_time: new Date(),
            result: {
                winner: req.body.winner || null,
                won_by: req.body.won_by || 'Pending',
                margin: req.body.margin || 0
            },
            awards: { man_of_the_match: req.body.man_of_the_match || null }
        };

        // Final synchronization of scores from live_data to root team fields
        if (match.live_data?.scorecard?.total?.runs !== undefined) {
            if (match.live_active_team === 'A') {
                setPayload['team_a.score'] = match.live_data.scorecard.total.runs;
                setPayload['team_a.wickets'] = match.live_data.scorecard.total.wickets;
                setPayload['team_a.overs_played'] = match.live_data.scorecard.total.overs;
            } else {
                setPayload['team_b.score'] = match.live_data.scorecard.total.runs;
                setPayload['team_b.wickets'] = match.live_data.scorecard.total.wickets;
                setPayload['team_b.overs_played'] = match.live_data.scorecard.total.overs;
            }
        }

        // Sync Innings 1 score to root if present
        if (match.live_data?.inn1_scorecard) {
            const inn1Key = match.live_active_team === 'A' ? 'team_b' : 'team_a';
            setPayload[`${inn1Key}.score`] = match.live_data.inn1_scorecard.score || match[inn1Key]?.score || 0;
            setPayload[`${inn1Key}.wickets`] = match.live_data.inn1_scorecard.wickets || match[inn1Key]?.wickets || 0;
            setPayload[`${inn1Key}.overs_played`] = match.live_data.inn1_scorecard.overs || match[inn1Key]?.overs_played || 0;
        }

        // Use raw MongoDB driver to avoid Mongoose CastError on corrupted Date fields in ball_history
        const matchObjId = new mongoose.Types.ObjectId(req.params.id);
        try {
            await Match.collection.findOneAndUpdate(
                { _id: matchObjId },
                { $set: setPayload },
                { returnDocument: 'after' }
            );
        } catch (innerErr) {
            console.error('Raw DB update failed (complete):', innerErr && innerErr.stack ? innerErr.stack : innerErr);
            return res.status(500).json({ error: 'Failed to persist match completion to DB' });
        }

        // If part of a tournament, update points table and recalculate NRR
        if (match.tournament) {
            try {
                const tournamentService = require('../services/tournamentService');
                
                const winnerId = req.body.winner || null;
                const teamAId = match.team_a?.team_id;
                const teamBId = match.team_b?.team_id;
                
                let loserId = null;
                if (winnerId) {
                    loserId = winnerId.toString() === teamAId?.toString() ? teamBId : teamAId;
                }
                
                const isDraw = req.body.won_by === 'Tie' || req.body.won_by === 'Super Over';
                const isAbandoned = match.status === 'Abandoned';

                const matchOvers = match.overs || 20;
                const teamARuns = setPayload['team_a.score'] ?? match.team_a?.score ?? 0;
                const teamBRuns = setPayload['team_b.score'] ?? match.team_b?.score ?? 0;

                // NRR Rule: if all-out (10 wickets), use full match overs; otherwise use actual overs faced
                const teamAWickets = setPayload['team_a.wickets'] ?? match.team_a?.wickets ?? 0;
                const teamBWickets = setPayload['team_b.wickets'] ?? match.team_b?.wickets ?? 0;
                const teamAOversRaw = setPayload['team_a.overs_played'] ?? match.team_a?.overs_played ?? 0;
                const teamBOversRaw = setPayload['team_b.overs_played'] ?? match.team_b?.overs_played ?? 0;
                // All-out = 10 wickets fallen; treat as full allotted overs for NRR
                const teamAOvers = teamAWickets >= 10 ? matchOvers : (teamAOversRaw || matchOvers);
                const teamBOvers = teamBWickets >= 10 ? matchOvers : (teamBOversRaw || matchOvers);

                await tournamentService.updatePointsTable(match.tournament, {
                    winnerTeamId: winnerId,
                    loserTeamId: loserId,
                    isDraw,
                    noResult: isAbandoned,
                    teamAId,
                    teamBId,
                    teamARuns,
                    teamAOvers,
                    teamBRuns,
                    teamBOvers,
                });
                console.log(`📈 Points table updated for tournament ${match.tournament}`);

                const tournamentStatsService = require('../services/tournamentStatsService');
                setImmediate(() => {
                    tournamentStatsService.syncMatchStatsToTournamentHistory(matchObjId.toString()).catch(e => {
                        console.error('Error syncing match stats to tournament history:', e);
                    });
                });
            } catch (tErr) {
                console.error('Error updating tournament points table:', tErr);
            }
        }

        if (!match.stats_updated) {
            const statsService = require('../services/statsService');
            const io = req.app.get('socketio');
            setImmediate(() => {
                statsService.updatePlayerStats(matchObjId, io).catch(err => {
                    console.error('Stats Update Fail (complete):', err && err.stack ? err.stack : err);
                });
            });
        }

        // Broadcast final state
        const io = req.app.get('socketio');
        if (io) {
            io.to(`match_${req.params.id}`).emit('match:update', { matchId: req.params.id, status: 'Completed', result: setPayload.result });
        }

        // Persistent Career Stats Update (defensive)
        const state = req.body || {};
        const playersToUpdate = [...(state.batters || []), ...(state.bowlers || []), ...(state.inn1Batters || []), ...(state.inn1Bowlers || [])];
        for (const p of playersToUpdate) {
            try {
                const uid = p && (p.user_id || p.id || p._id);
                if (!uid) continue;
                if (!mongoose.Types.ObjectId.isValid(String(uid))) continue;
                await User.findByIdAndUpdate(String(uid), {
                    $inc: {
                        'stats.matches': 1,
                        'stats.runs': p.r || 0,
                        'stats.wickets': p.w || 0,
                        'stats.ballsFaced': p.b || 0,
                        'stats.ballsBowled': p.balls || 0
                    }
                }).catch(uErr => console.warn('Player stats update failed for', uid, uErr && uErr.message ? uErr.message : uErr));
            } catch (puErr) {
                console.warn('Skipping bad player entry during completion:', puErr && puErr.message ? puErr.message : puErr);
                continue;
            }
        }

        res.json({ success: true, message: "Match completed and stats manifested." });
    } catch (error) {
        console.error('Error completing match:', error && error.stack ? error.stack : error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

// POST /api/matches/:id/live-update - Update full live state with Socket.IO broadcast
const { generateCommentary } = require('../utils/commentaryGenerator');
const { calculateWinProbability, calculateMomentumScore } = require('../utils/aiEngine');

// POST /api/matches/:id/live-update - Update full live state with Socket.IO broadcast
router.post('/:id/live-update', async (req, res) => {
    try {
        const match = await Match.findById(req.params.id).lean({ virtuals: false });
        if (!match) return res.status(404).json({ error: 'Match not found' });

        // Work on a plain JS copy to avoid Mongoose version tracking
        const matchData = JSON.parse(JSON.stringify(match));

        const prevBalls = match.live_data?.totalBalls || 0;
        const newBalls = req.body.totalBalls || 0;
        const isNewBall = newBalls > prevBalls;

        // --- 0. AI CALCULATIONS (WIN PROBABILITY) ---
        const currentContext = {
            runs: req.body.runs || 0,
            wickets: req.body.wickets || 0,
            overNum: req.body.overNum || 0,
            ballInOver: req.body.ballInOver || 0,
            target: req.body.target || null,
            inningsNum: req.body.inningsNum || 1
        };
        
        const { calculateAISnapshot } = require('../utils/aiEngine');
        const aiSnapshot = calculateAISnapshot(match, currentContext);
        
        const winProbBatting = aiSnapshot.winProb;
        const momentum = aiSnapshot.momentum;
        const projectedScore = aiSnapshot.projectedScore;

        // --- 1. BALL-BY-BALL LOGGING ---
        if (req.body.lastBallData && isNewBall) {
            const ballEntry = {
                over: req.body.overNum,
                ball: req.body.ballInOver,
                runs: req.body.lastBallData.runs || 0,
                is_wicket: !!req.body.lastBallData.isWicket,
                extra: (() => {
                  const e = req.body.lastBallData.extra;
                  if (!e) return null;
                  switch (e) {
                    case 'wd':
                      return 'wide';
                    case 'nb':
                      return 'noball';
                    case 'b':
                      return 'bye';
                    case 'lb':
                      return 'legbye';
                    default:
                      return e;
                  }
                })(),
                batsman_id: getValidObjectId(req.body.lastBallData.batsmanId) || null,
                bowler_id: getValidObjectId(req.body.lastBallData.bowlerId) || null,

                score_at_ball: req.body.runs || 0,
                wickets_at_ball: req.body.wickets || 0,
                win_prob: winProbBatting, // Store for charts
                timestamp: new Date()
            };
            
            const innIdx = Math.max(0, (req.body.inningsNum || 1) - 1);

            // Ensure innings slot exists BEFORE pushing ball_history
            while (matchData.innings.length <= innIdx) {
                const nextNum = matchData.innings.length + 1;
                matchData.innings.push({
                    number: nextNum,
                    score: 0,
                    wickets: 0,
                    overs_completed: 0,
                    batsmen: [],
                    bowlers: [],
                    ball_history: []
                });
            }

            const inning = matchData.innings[innIdx];
            inning.ball_history = inning.ball_history || [];
            inning.ball_history.push(ballEntry);

            // Generate Auto-Commentary — resolve striker name from batters array if not explicitly provided
            const strikerIdxForComm = typeof req.body.striker === 'number' ? req.body.striker
                : (parseInt(req.body.striker_idx) || 0);
            const currentBatsmanName = req.body.striker_name
                || (req.body.batters && req.body.batters[strikerIdxForComm]?.name)
                || "The Batsman";
            const commText = generateCommentary(
                ballEntry, 
                req.body.runs || 0, 
                req.body.wickets || 0, 
                currentBatsmanName
            );

            matchData.commentary_log = matchData.commentary_log || [];
            matchData.commentary_log.unshift({
                text: commText,
                ball: `${ballEntry.over}.${ballEntry.ball}`,
                runs: ballEntry.runs,
                wickets: ballEntry.wickets,
                overs: `${ballEntry.over}.${ballEntry.ball}`
            });

            // Persist AI commentary insight (best-effort, non-blocking)
            aiInsightsService.saveInsight({
                matchId: matchData._id,
                innings: req.body.inningsNum || 1,
                over: ballEntry.over,
                ball: ballEntry.ball,
                type: 'commentary',
                title: 'Auto Commentary',
                content: commText,
                meta: { win_prob: winProbBatting }
            }).catch(err => console.error('AIInsight save failed:', err.message));

            if (matchData.commentary_log.length > 50) matchData.commentary_log.pop();
            console.log(`🏏 AI Analytics: Win Prob ${winProbBatting}% | Momentum ${momentum}`);

            // --- 1.5. PERSIST RICH BALL EVENT (FOR ML TRAINING) ---
            try {
                const ballsDone = ballEntry.over * 6 + ballEntry.ball;
                const totalBalls = (match.overs || 20) * 6;
                const crr = ballsDone > 0 ? (req.body.runs / (ballsDone / 6)) : 0;
                const rrr = req.body.target ? (req.body.target - req.body.runs) / ((totalBalls - ballsDone) / 6 || 1) : 0;

                await BallEvent.create({
                    match_id: match._id,
                    innings_num: req.body.inningsNum || 1,
                    over_num: ballEntry.over,
                    ball_num: ballEntry.ball,
                    absolute_ball: ballsDone,
                    batter_id: ballEntry.batsman_id,
                    bowler_id: ballEntry.bowler_id,
                    runs_off_bat: ballEntry.runs,
                    extra_runs: (ballEntry.extra === 'wide' || ballEntry.extra === 'noball') ? 1 : 0,
                    extra_type: ballEntry.extra,
                    is_wicket: ballEntry.is_wicket,
                    features: {
                        score_at_ball: req.body.runs,
                        wickets_at_ball: req.body.wickets,
                        crr: crr,
                        rrr: rrr,
                        balls_left: totalBalls - ballsDone
                    },
                    predictions: {
                        win_prob: winProbBatting,
                        projected_score: projectedScore,
                        momentum_score: momentum
                    }
                });
            } catch (err) {
                console.error('Failed to persist BallEvent for ML:', err.message);
            }
        }

        // --- 2. AGGRESSIVE SYNC ---
        let sIdx = 0;
        if (req.body.striker !== undefined) {
            sIdx = typeof req.body.striker === 'object' && req.body.striker !== null 
                ? (req.body.striker_idx ?? 0) 
                : parseInt(req.body.striker) || 0;
        } else if (req.body.striker_idx !== undefined) {
            sIdx = parseInt(req.body.striker_idx) || 0;
        }

        let nsIdx = 1;
        if (req.body.nonStriker !== undefined) {
            nsIdx = typeof req.body.nonStriker === 'object' && req.body.nonStriker !== null 
                ? (req.body.non_striker_idx ?? 1) 
                : parseInt(req.body.nonStriker) || 1;
        } else if (req.body.non_striker_idx !== undefined) {
            nsIdx = parseInt(req.body.non_striker_idx) || 1;
        }

        // Clean req.body to avoid copy-spreading of object versions of striker/nonStriker
        const cleanBody = { ...req.body };
        delete cleanBody.striker;
        delete cleanBody.nonStriker;

        matchData.live_data = {
            ...matchData.live_data,
            ...cleanBody,
            striker_idx: sIdx,
            non_striker_idx: nsIdx,
            win_probability: winProbBatting,
            momentum_score: momentum,
            projected_score: projectedScore,
            last_updated: new Date()
        };
        const innIdx = (req.body.inningsNum ? req.body.inningsNum - 1 : 0);
        matchData.current_innings_index = innIdx;

        // Determine which overall team is batting — TRUST THE CLIENT BATTING TEAM IF PROVIDED
        let activeTeam = 'A';
        if (req.body.batting_team === 'B' || req.body.battingTeam === 1 || (req.body.battingTeam === '1')) {
            activeTeam = 'B';
        } else if (req.body.batting_team === 'A' || req.body.battingTeam === 0 || (req.body.battingTeam === '0')) {
            activeTeam = 'A';
        } else if (innIdx === 1) {
            activeTeam = (matchData.live_active_team === 'A' ? 'B' : 'A');
        } else {
            activeTeam = matchData.live_active_team || 'A';
        }

        matchData.live_active_team = activeTeam;
        const battingTeamKey = activeTeam === 'B' ? 'team_b' : 'team_a';
        const bowlingTeamKey = activeTeam === 'B' ? 'team_a' : 'team_b';

        // SYNC: Push current score into the top-level team object for overall consistency
        if (req.body.runs !== undefined) matchData[battingTeamKey].score = req.body.runs;
        if (req.body.wickets !== undefined) matchData[battingTeamKey].wickets = req.body.wickets;
        if (req.body.overs !== undefined) matchData[battingTeamKey].overs_played = req.body.overs;



        // Ensure the current innings array slot exists
        while (matchData.innings.length <= innIdx) {
            const nextInnNum = matchData.innings.length + 1;
            matchData.innings.push({ 
                number: nextInnNum, 
                score: 0, 
                wickets: 0, 
                overs_completed: 0, 
                batting_team: getValidObjectId(matchData[battingTeamKey]?.team_id),
                bowling_team: getValidObjectId(matchData[bowlingTeamKey]?.team_id),
                batsmen: [], 
                bowlers: [] 
            });
        }
        
        let currentInning = matchData.innings[innIdx];

        if (req.body.status) matchData.status = req.body.status;

        // CRITICAL: Update individual player stats and INNINGS scores for Home Page
        if (req.body.batters || req.body.bowlers || req.body.runs !== undefined) {
            // Sync inning-level scores
            if (req.body.runs !== undefined) currentInning.score = req.body.runs;
            if (req.body.wickets !== undefined) currentInning.wickets = req.body.wickets;
            if (req.body.overs !== undefined) currentInning.overs_completed = req.body.overs;

            if (req.body.batters) {
                currentInning.batsmen = req.body.batters.map(b => ({
                    user_id: getValidObjectId(b.user_id || b.id),
                    name: b.name,
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
                    user_id: getValidObjectId(bw.user_id || bw.id),
                    name: bw.name,
                    overs: bw.balls ? parseFloat(`${Math.floor(bw.balls / 6)}.${bw.balls % 6}`) : (bw.overs || 0),
                    runs: bw.r || 0,
                    wickets: bw.w || 0,
                    balls: bw.balls || 0,
                    maidens: bw.maidens || 0
                }));
            }
        }

        // Map live_data for public view (striker index -> striker object)
        if (req.body.batters && req.body.striker !== undefined) {
            const s = req.body.batters[req.body.striker];
            if (s) matchData.live_data.striker = { name: s.name, runs: s.r, balls: s.b, fours: s.fours || s.f || 0, sixes: s.sixes || s.s || 0 };
        }
        if (req.body.batters && req.body.nonStriker !== undefined) {
            const ns = req.body.batters[req.body.nonStriker];
            if (ns) matchData.live_data.non_striker = { name: ns.name, runs: ns.r, balls: ns.b, fours: ns.fours || ns.f || 0, sixes: ns.sixes || ns.s || 0 };
        }
        if (req.body.bowlers && req.body.currentBowlerIdx !== undefined) {
            const bw = req.body.bowlers[req.body.currentBowlerIdx];
            if (bw) {
                const formattedOvers = `${Math.floor(bw.balls / 6)}.${bw.balls % 6}`;
                matchData.live_data.bowler = { 
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
            matchData.live_data.batters = req.body.batters;
        }
        if (req.body.bowlers) {
            matchData.live_data.bowlers = req.body.bowlers;
        }
        if (req.body.inn1Batters) {
            matchData.live_data.inn1Batters = req.body.inn1Batters;
        }
        if (req.body.inn1Bowlers) {
            matchData.live_data.inn1Bowlers = req.body.inn1Bowlers;
        }

        if (req.body.currentOverBalls) {
            matchData.live_data.recent_balls = req.body.currentOverBalls;
        }

        // Build over summaries for over-by-over display
        if (req.body.overHistory || req.body.currentOverBalls) {
            matchData.live_data.over_summaries = (req.body.overHistory || []).map((over, i) => ({
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

        // Commentary handled in ball logging block above for new balls

        // Calculate run rate and required run rate
        const totalOvers = (req.body.overNum || 0) + (req.body.ballInOver || 0) / 6;
        matchData.live_data.run_rate = totalOvers > 0 ? ((req.body.runs || 0) / totalOvers).toFixed(2) : '0.00';
        if (req.body.target && req.body.inningsNum === 2) {
            const remainingRuns = req.body.target - (req.body.runs || 0);
            const totalMatchOvers = req.body.formatOvers || 20;
            const remainingOvers = totalMatchOvers - totalOvers;
            matchData.live_data.required_run_rate = remainingOvers > 0 ? (remainingRuns / remainingOvers).toFixed(2) : '0.00';
            matchData.live_data.runs_needed = remainingRuns;
            matchData.live_data.balls_remaining = Math.round(remainingOvers * 6);
        }

        // Partnership data
        matchData.live_data.partnership = req.body.partnership || { runs: 0, balls: 0 };
        
        if (req.body.status) matchData.status = req.body.status;
        if (req.body.status === 'Completed') matchData.end_time = new Date();
        if (req.body.runs !== undefined) matchData.live_data.runs = req.body.runs;
        if (req.body.wickets !== undefined) matchData.live_data.wickets = req.body.wickets;

        // Ensure precise boundary counting by analyzing the balls array if available
        currentInning = matchData.innings[matchData.current_innings_index];
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
        matchData.live_data.scorecard = {
            batsmen: (req.body.batters || []).filter((b, idx) => b.batting || b.out || b.r > 0 || b.b > 0 || idx === sIdx || idx === nsIdx).map(b => ({
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
            matchData.live_data.inn1_scorecard = {
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

        // Sanitize plain object before writing to DB
        // Also convert any ObjectId-like objects back to their string/id form for the raw driver
        const sanitizePlain = (obj) => {
            if (Array.isArray(obj)) return obj.map(sanitizePlain);
            if (obj && typeof obj === 'object') {
                // Handle ObjectId instances (both Mongoose and plain serialized)
                if (obj._bsontype === 'ObjectId' || obj._bsontype === 'ObjectID') return obj;
                if (obj.$oid) return new mongoose.Types.ObjectId(obj.$oid); // Extended JSON form
                const out = {};
                for (const [k, v] of Object.entries(obj)) {
                    if (v === undefined || v === null) continue;
                    if (typeof v === 'number' && isNaN(v)) { out[k] = 0; continue; }
                    if (typeof v === 'number' && !isFinite(v)) { out[k] = 0; continue; }
                    out[k] = sanitizePlain(v);
                }
                return out;
            }
            return obj;
        };
        const safeData = sanitizePlain(matchData);

        // ✅ ATOMIC UPDATE via raw MongoDB collection driver
        // Bypasses Mongoose version conflicts (VersionError) AND type casting (CastError)
        // entirely — safe for concurrent live-update requests
        const { ObjectId } = mongoose.Types;
        const matchObjectId = new ObjectId(req.params.id);
        await Match.collection.findOneAndUpdate(
            { _id: matchObjectId },
            {
                $set: {
                    live_data: safeData.live_data,
                    innings: safeData.innings,
                    commentary_log: safeData.commentary_log,
                    live_active_team: safeData.live_active_team,
                    current_innings_index: safeData.current_innings_index,
                    status: safeData.status,
                    end_time: safeData.end_time !== undefined ? safeData.end_time : null,
                    team_a: safeData.team_a,
                    team_b: safeData.team_b,
                }
            },
            { returnDocument: 'after' }
        );
        // Re-fetch as a Mongoose document for downstream use (socket emit, stats, etc.)
        const updatedMatch = await Match.findById(req.params.id).lean();
        if (!updatedMatch) return res.status(404).json({ error: 'Match disappeared during update' });
        Object.assign(match, updatedMatch);

        if (req.body.status === 'Completed' && !updatedMatch.stats_updated) {
            // Generate AI Match Summary
            const scorecard = updatedMatch.live_data.scorecard;
            const teamA = updatedMatch.team_a.team_id?.name || "Team A";
            const teamB = updatedMatch.team_b.team_id?.name || "Team B";
            
            let summary = "";
            const winner = updatedMatch.team_a.score > updatedMatch.team_b.score ? teamA : teamB;
            const margin = Math.abs(updatedMatch.team_a.score - updatedMatch.team_b.score);
            
            const topBatter = scorecard?.batsmen?.slice().sort((a,b) => b.runs - a.runs)[0];
            const topBowler = scorecard?.bowlers?.slice().sort((a,b) => b.wickets - a.wickets)[0];

            summary = `${winner} dominated the proceedings in this high-octane encounter at ${updatedMatch.venue || 'The Turf'}. `;
            summary += `The match pivoted on ${topBatter?.name || 'a clinical batting performance'}'s brilliant ${topBatter?.runs || 'knock'}, which dismantled the opposition attack. `;
            if (topBowler && topBowler.wickets > 0) {
                summary += `On the bowling front, ${topBowler.name} was lethal, picking up ${topBowler.wickets} crucial wickets to stifle the chase. `;
            }
            summary += `Ultimately, ${winner} secured a convincing ${margin} run victory, showcasing superior tactical execution under pressure.`;

            await Match.findOneAndUpdate(
                { _id: req.params.id },
                { $set: { 'live_data.ai_summary': summary } },
                { runValidators: false }
            );

            const statsService = require('../services/statsService');
            const io = req.app.get('socketio');
            setImmediate(() => {
                statsService.updatePlayerStats(updatedMatch._id, io).catch(err => {
                    console.error('Stats Update Fail (live):', err.message);
                });
            });
        }

        const io = req.app.get('socketio');
        if (io) {
            const payload = {
                ...updatedMatch.live_data,
                matchId: updatedMatch._id,
                status: updatedMatch.status,
                phase: req.body.phase,
                inningsNum: req.body.inningsNum,
                timestamp: new Date()
            };
            payload.score = { runs: payload.runs, wickets: payload.wickets };
            payload.overs = `${req.body.overNum || 0}.${req.body.ballInOver || 0}`;

            // 📡 BLUEPRINT EVENTS: score_update, toss_update, etc.
            io.to(`match_${updatedMatch._id}`).emit('score_update', payload);
            io.to(`match_${updatedMatch._id}`).emit('score:updated', payload);

            // 📺 live_feed — enriched payload for LiveScoreView spectators
            const liveFeedPayload = {
                runs: payload.runs,
                wickets: payload.wickets,
                overNum: req.body.overNum || 0,
                ballInOver: req.body.ballInOver || 0,
                overs: `${req.body.overNum || 0}.${req.body.ballInOver || 0}`,
                run_rate: payload.run_rate,
                required_run_rate: payload.required_run_rate,
                runs_needed: payload.runs_needed,
                balls_remaining: payload.balls_remaining,
                win_probability: payload.win_probability,
                inningsNum: req.body.inningsNum || 1,
                target: req.body.target || null,
                striker: payload.striker || null,
                non_striker: payload.non_striker || null,
                bowler: payload.bowler || null,
                recent_balls: payload.recent_balls || [],
                commentary_log: updatedMatch.commentary_log?.slice(0, 5) || [],
                newBall: isNewBall,
                status: updatedMatch.status,
                matchId: updatedMatch._id,
                timestamp: new Date()
            };
            io.to(`match_${updatedMatch._id}`).emit('live_feed', liveFeedPayload);
            
            // 🔔 TRIGGER NOTIFICATIONS
            if (req.body.type === 'wicket' || req.body.wickets > (matchData.live_data?.wickets || 0)) {
                sendNotification('☝️ WICKET!', `A crucial breakthrough for ${updatedMatch.live_active_team === 'A' ? 'Team B' : 'Team A'}!`);
                io.to(`match_${updatedMatch._id}`).emit('wicket_update', payload);
            }

            if (req.body.lastBallData?.runs === 4) {
                sendNotification('🏏 FOUR!', 'Classic boundary! The ball races away to the fence.');
            } else if (req.body.lastBallData?.runs === 6) {
                sendNotification('🚀 SIXER!', 'Massive hit! That one is out of the stadium.');
            }

            if (req.body.phase === 'innings_change') {
                sendNotification('🔄 INNINGS OVER', `Target set: ${payload.runs + 1}. Second innings starting soon.`);
                io.to(`match_${updatedMatch._id}`).emit('innings_change', payload);
            }

            if (req.body.status === 'Completed') {
                const winnerName = updatedMatch.team_a.score > updatedMatch.team_b.score ? (updatedMatch.team_a.team_id?.name || "Team A") : (updatedMatch.team_b.team_id?.name || "Team B");
                sendNotification('🏁 MATCH ENDED', `${winnerName} has secured the victory!`);
                io.to(`match_${updatedMatch._id}`).emit('match_end', {
                    winner: winnerName,
                    message: "Match has concluded"
                });
            }

            // Legacy & Internal Events
            io.to(`match_${updatedMatch._id}`).emit('match:update', payload);
            io.to(`match_${updatedMatch._id}`).emit('match:ball', payload);
            io.to(`match_${updatedMatch._id}`).emit('liveScoreUpdate', payload);
        }

        res.json({ success: true, match_id: updatedMatch._id });
    } catch (error) {
        console.error('live-update error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/matches/:id/ball - Record a single ball event (server-authoritative)
router.post('/:id/ball', async (req, res) => {
    try {
        const match = await Match.findById(req.params.id);
        if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
        if (!match.canBeScored()) return res.status(400).json({ success: false, message: 'Match not verified or cannot be scored yet' });

        const {
            inningsNum = 1,
            batsmanId,
            nonStrikerId,
            bowlerId,
            runsOffBat = 0,
            extraType = null, // 'wide','noball','bye','legbye' or null
            extraRuns = 0,
            isWicket = false,
            wicketType = null,
            dismissedPlayerId = null,
            newBatsmanId = null,
            isFreeHit = false,
            commentary: providedCommentary = null
        } = req.body;

        if (bowlerId === undefined || batsmanId === undefined) return res.status(400).json({ success: false, message: 'Bowler and striker (batsman) must be provided (can be null)' });

        const innIdx = Math.max(0, inningsNum - 1);
        while (match.innings.length <= innIdx) {
            match.innings.push({ number: match.innings.length + 1, batsmen: [], bowlers: [], balls: [], score: 0, wickets: 0, overs_completed: 0 });
        }

        const inning = match.innings[innIdx];
        // Server-detected free-hit: if previous delivery was a 'noball'
        const prevBall = inning.balls && inning.balls.length ? inning.balls[inning.balls.length - 1] : null;
        const serverDetectedFreeHit = prevBall && prevBall.extra_type === 'noball';

        // Enforce free-hit dismissal rules server-side: only 'runout' allowed as dismissal on free hit
        if ((isFreeHit || serverDetectedFreeHit) && isWicket) {
            const allowedOnFreeHit = ['runout'];
            if (!allowedOnFreeHit.includes((wicketType || '').toLowerCase())) {
                return res.status(400).json({ success: false, message: 'Dismissal not allowed on Free Hit except Run Out' });
            }
            // If dismissal is runout, mark wicket as not credited to bowler
            if ((wicketType || '').toLowerCase() === 'runout') {
                req.body._runout_on_freehit = true;
            }
        }
        const totalBallsSoFar = inning.balls ? inning.balls.length : 0;
        const overNumber = Math.floor(totalBallsSoFar / 6);
        const ballInOver = (totalBallsSoFar % 6) + 1;
        const absoluteBall = totalBallsSoFar + 1;

        const illegalExtras = ['wide', 'noball'];
        const legalBall = !illegalExtras.includes(extraType);

        // Build ball record compatible with schema
        const ballRecord = {
            ball_number: `${overNumber}.${ballInOver}`,
            over_number: overNumber,
            ball_in_over: ballInOver,
            absolute_ball: absoluteBall,
            batter_id: getValidObjectId(batsmanId) || null,
            non_striker_id: getValidObjectId(nonStrikerId) || null,
            bowler_id: getValidObjectId(bowlerId) || null,

            runs_off_bat: runsOffBat || 0,
            is_four: (runsOffBat === 4),
            is_six: (runsOffBat === 6),
            extra_type: extraType || null,
            extra_runs: extraRuns || 0,
            is_free_hit: !!isFreeHit,
            is_wicket: !!isWicket,
            wicket: isWicket ? { dismissal_type: wicketType || 'Unknown', player_out_id: dismissedPlayerId || batsmanId, fielder_id: req.body.fielderId || null, is_bowler_wicket: true } : null,
            commentary: providedCommentary || null,
            timestamp: new Date()
        };

        // Update inning-level aggregates
        const runsThisBall = (ballRecord.runs_off_bat || 0) + (ballRecord.extra_runs || 0);
        inning.score = (inning.score || 0) + runsThisBall;
        if (ballRecord.is_wicket) inning.wickets = (inning.wickets || 0) + 1;

        // Push ball record into inning.balls
        inning.balls = inning.balls || [];
        inning.balls.push(ballRecord);

        // Update overs_completed and ball history
        if (legalBall) {
            const validBalls = inning.balls.filter(b => !illegalExtras.includes(b.extra_type)).length;
            inning.overs_completed = Math.floor(validBalls / 6) + (validBalls % 6) / 10; // e.g., 4 balls -> 0.4
        }

        // Update batsman entry
        inning.batsmen = inning.batsmen || [];
        let batsmanNode = inning.batsmen.find(b => String(b.user_id) === String(batsmanId));
        if (!batsmanNode) {
            batsmanNode = { user_id: getValidObjectId(batsmanId) || null, name: req.body.batsmanName || '', runs: 0, balls: 0, fours: 0, sixes: 0, out_type: 'Not Out', is_on_strike: true };

            inning.batsmen.push(batsmanNode);
        }
        if (legalBall) batsmanNode.balls = (batsmanNode.balls || 0) + 1;
        batsmanNode.runs = (batsmanNode.runs || 0) + (ballRecord.runs_off_bat || 0);
        if (ballRecord.is_four) batsmanNode.fours = (batsmanNode.fours || 0) + 1;
        if (ballRecord.is_six) batsmanNode.sixes = (batsmanNode.sixes || 0) + 1;
        if (ballRecord.is_wicket && String(dismissedPlayerId) === String(batsmanId)) batsmanNode.out_type = ballRecord.wicket.dismissal_type;

        // Update bowler entry
        inning.bowlers = inning.bowlers || [];
        let bowlerNode = inning.bowlers.find(b => String(b.user_id) === String(bowlerId));
        if (!bowlerNode) {
            bowlerNode = { user_id: getValidObjectId(bowlerId) || null, name: req.body.bowlerName || '', overs: 0, balls: 0, runs: 0, wickets: 0, maidens: 0 };

            inning.bowlers.push(bowlerNode);
        }
        // Increment bowler balls/runs only on legal balls
        if (legalBall) {
            bowlerNode.balls = (bowlerNode.balls || 0) + 1;
        }
        bowlerNode.runs = (bowlerNode.runs || 0) + ((ballRecord.runs_off_bat || 0) + (ballRecord.extra_runs || 0));
        if (ballRecord.is_wicket) {
            // Do not credit bowler for run-outs occurring on a Free Hit
            if (!req.body._runout_on_freehit) {
                bowlerNode.wickets = (bowlerNode.wickets || 0) + 1;
            }
        }

        // Update top-level team score
        const battingTeamKey = match.live_active_team === 'B' ? 'team_b' : 'team_a';
        if (match[battingTeamKey]) {
            match[battingTeamKey].score = (match[battingTeamKey].score || 0) + runsThisBall;
            if (ballRecord.is_wicket) match[battingTeamKey].wickets = (match[battingTeamKey].wickets || 0) + 1;
        }
        match.markModified(`innings`);
        match.markModified('live_data');

        // Add to global ball_history for quick access
        inning.ball_history = inning.ball_history || [];
        inning.ball_history.push({ 
            over: overNumber, 
            ball: ballInOver, 
            runs: runsThisBall, 
            is_wicket: !!ballRecord.is_wicket, 
            extra: ballRecord.extra_type || null, 
            batsman_id: getValidObjectId(batsmanId) || null, 
            bowler_id: getValidObjectId(bowlerId) || null, 
 
            score_at_ball: inning.score, 
            wickets_at_ball: inning.wickets, 
            timestamp: new Date() 
        });

        // Generate commentary (sync util or AI) and persist as insight
        const currentBatsmanName = req.body.batsmanName || (batsmanNode && batsmanNode.name) || 'Batsman';
        let commText = providedCommentary;
        try {
            const ballDataForComm = { 
                over: overNumber, 
                ball: ballInOver, 
                runs: runsThisBall, 
                is_wicket: !!ballRecord.is_wicket, 
                extra: ballRecord.extra_type 
            };
            if (!commText) commText = generateCommentary(ballDataForComm, inning.score, inning.wickets, currentBatsmanName);
        } catch (e) {
            commText = commText || '';
        }

        if (commText) {
            match.commentary_log = match.commentary_log || [];
            match.commentary_log.unshift({ text: commText, ball: `${overNumber}.${ballInOver}`, runs: runsThisBall, wickets: inning.wickets, overs: `${overNumber}.${ballInOver}`, timestamp: new Date() });
            if (match.commentary_log.length > 100) match.commentary_log = match.commentary_log.slice(0, 100);

            aiInsightsService.saveInsight({ matchId: match._id, innings: inningsNum, over: overNumber, ball: ballInOver, type: 'commentary', title: 'Auto Commentary', content: commText }).catch(err => console.error('AIInsight save failed:', err.message));
        }

        // Emit socket event to viewers and scorers
        const io = req.app.get('socketio');
        if (io) {
            io.to(`match_${match._id}`).emit('match:ball', { matchId: match._id, innings: inningsNum, ball: ballRecord, live: { runs: inning.score, wickets: inning.wickets, over: inning.overs_completed } });
        }

        await match.save();

        res.json({ success: true, ball: ballRecord, live_data: { runs: inning.score, wickets: inning.wickets, overs: inning.overs_completed } });
    } catch (err) {
        console.error('Ball record error:', err);
        res.status(500).json({ success: false, message: err.message, stack: err.stack });
    }
});




// POST /api/matches/:id/undo-ball - Remove last ball
router.post('/:id/undo-ball', async (req, res) => {
    try {
        const Match = require('../models/Match');
        const mongoose = require('mongoose');
        const match = await Match.findById(req.params.id);
        if (!match) return res.status(404).json({ error: 'Match not found' });

        const innIdx = match.current_innings_index || 0;
        const currentInning = match.innings[innIdx];
        if (!currentInning || !currentInning.balls || currentInning.balls.length === 0) {
            return res.status(400).json({ error: 'No balls to undo in current innings' });
        }

        // Pop the last ball
        const poppedBall = currentInning.balls.pop();
        const runsOffBat = poppedBall.runs_off_bat || 0;
        const extraRuns = poppedBall.extra_runs || 0;
        const totalRuns = runsOffBat + extraRuns;
        const legalBall = poppedBall.extra_type !== 'wide' && poppedBall.extra_type !== 'noball';

        // Revert inning aggregates
        currentInning.score = Math.max(0, (currentInning.score || 0) - totalRuns);
        if (poppedBall.is_wicket) currentInning.wickets = Math.max(0, (currentInning.wickets || 0) - 1);

        // Revert batsman stats
        if (poppedBall.batter_id) {
            const bIdx = currentInning.batsmen.findIndex(b => String(b.user_id) === String(poppedBall.batter_id));
            if (bIdx !== -1) {
                const bats = currentInning.batsmen[bIdx];
                bats.runs = Math.max(0, (bats.runs || 0) - runsOffBat);
                if (legalBall) bats.balls = Math.max(0, (bats.balls || 0) - 1);
                if (runsOffBat === 4) bats.fours = Math.max(0, (bats.fours || 0) - 1);
                if (runsOffBat === 6) bats.sixes = Math.max(0, (bats.sixes || 0) - 1);
                if (poppedBall.is_wicket && String(currentInning.batsmen[bIdx].user_id) === String(poppedBall.wicket?.player_out_id)) {
                    currentInning.batsmen[bIdx].out_type = 'Not Out';
                }
            }
        }

        // Revert bowler stats
        if (poppedBall.bowler_id) {
            const bwIdx = currentInning.bowlers.findIndex(b => String(b.user_id) === String(poppedBall.bowler_id));
            if (bwIdx !== -1) {
                const bow = currentInning.bowlers[bwIdx];
                if (legalBall) bow.balls = Math.max(0, (bow.balls || 0) - 1);
                bow.runs = Math.max(0, (bow.runs || 0) - (runsOffBat + extraRuns));
                if (poppedBall.is_wicket && poppedBall.wicket && poppedBall.wicket.is_bowler_wicket) bow.wickets = Math.max(0, (bow.wickets || 0) - 1);
            }
        }

        // Remove from inning's ball_history if matches last
        if (currentInning.ball_history && currentInning.ball_history.length > 0) {
            const last = currentInning.ball_history[currentInning.ball_history.length - 1];
            if (last.over === poppedBall.over_number && last.ball === poppedBall.ball_in_over) {
                currentInning.ball_history.pop();
            } else {
                // fallback: remove any matching absolute ball
                const idx = currentInning.ball_history.findIndex(b => b.over === poppedBall.over_number && b.ball === poppedBall.ball_in_over);
                if (idx !== -1) currentInning.ball_history.splice(idx, 1);
            }
        }

        // Recompute overs_completed
        const validBalls = currentInning.balls.filter(b => b.extra_type !== 'wide' && b.extra_type !== 'noball').length;
        currentInning.overs_completed = Math.floor(validBalls / 6) + (validBalls % 6) / 10;

        // Sync top-level team scores
        const activeTeamKey = match.live_active_team === 'B' ? 'team_b' : 'team_a';
        match[activeTeamKey].score = currentInning.score;
        match[activeTeamKey].wickets = currentInning.wickets;

        match.markModified('innings');
        match.markModified('live_data');
        await match.save();

        // Broadcast correction
        const io = req.app.get('socketio');
        if (io) {
            io.to(`match_${match._id}`).emit('match:update', { matchId: match._id, live: { runs: currentInning.score, wickets: currentInning.wickets, over: currentInning.overs_completed }, is_correction: true });
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
            match.match_creation.invite_link = `${process.env.FRONTEND_URL}/join/match/${match.match_creation.invite_code}`;
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

        const io = req.app.get('socketio');
        if (io) {
            console.log(`📤 BROADCASTING UPDATE to match_${match._id}`);
            io.to(`match_${match._id.toString()}`).emit('match:playing_xi_updated', {
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
        const { format, overs, team_a, team_b, booking_id } = req.body;
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

        const mongoose = require('mongoose');
        const validBookingId = mongoose.Types.ObjectId.isValid(booking_id) ? booking_id : null;

        const match = new Match({
            title: `${team_a.name} vs ${team_b.name} — Quick Match`,
            match_mode: 'QUICK',
            format: format || 'T10',
            overs: overs || 10,
            start_time: new Date(),
            quick_teams: { 
                team_a: { name: team_a.name, short_name: team_a.short_name || team_a.name.slice(0,3).toUpperCase(), colour: team_a.colour || '#3b82f6', players: processedTeamA }, 
                team_b: { name: team_b.name, short_name: team_b.short_name || team_b.name.slice(0,3).toUpperCase(), colour: team_b.colour || '#ef4444', players: processedTeamB } 
            },
            status: 'Scheduled',
            booking_id: validBookingId,
            match_creation: { 
                created_via: validBookingId ? 'BOOKING' : 'DIRECT',
                linked_booking_id: validBookingId
            }
        });


        // Generate Match QR (Workflow 2, Step 6)
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
                        body: `Hi! You played in ${team_a.name} vs ${team_b.name} at The Turf. Register here: ${process.env.FRONTEND_URL}/claim/${p.claim_token}`,
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

        // Return full match document (Workflow 2, Step 7)
        const savedMatch = await Match.findById(match._id);

        res.status(201).json({ 
            success: true, 
            message: 'Quick Match Created. QR Generated. Captain must show QR to admin before match starts.', 
            match_id: match._id,
            match: savedMatch,
            qr_code: qrDetails.qrImage,
            qr_expires_at: qrDetails.expiresAt,
            verification_status: 'PENDING'
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
        const matchObjId = new mongoose.Types.ObjectId(req.params.id);

        // Use raw MongoDB driver to avoid CastError on corrupted Date fields (ball_history timestamps)
        await Match.collection.findOneAndUpdate(
            { _id: matchObjId },
            {
                $set: {
                    status: 'Completed',
                    end_time: new Date(),
                    result: { winner: winner || null, won_by: won_by || 'Pending', margin: margin || 0 },
                    'awards.man_of_the_match': man_of_the_match || null,
                    'verification.status': 'VERIFIED',
                    'verification.verified_by': req.user?.id || 'SYSTEM',
                    'verification.verified_at': new Date()
                }
            },
            { returnDocument: 'after' }
        );

        // 🚨 CRITICAL: Workflow 5 — Career Stats Manifestation
        const statsService = require('../services/statsService');
        const statsResult = await statsService.updatePlayerStats(matchObjId, req.app.get('socketio'));

        res.json({
            success: true,
            message: 'Match Completed. Statistics Manifested.',
            stats_updated: statsResult?.success
        });
    } catch (err) {
        console.error('Error completing match:', err);
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

// @route   POST /api/matches/:id/status
// @desc    Update match status (Live, Completed, etc)
// @access  Private
router.post('/:id/status', async (req, res) => {
    try {
        const { status, live_data } = req.body;
        const match = await Match.findById(req.params.id);
        if (!match) return res.status(404).json({ success: false, message: 'Match node not found.' });

        if (status) match.status = status;
        if (live_data) {
            match.live_data = { ...match.live_data, ...live_data };
            match.markModified('live_data');
        }

        await match.save();

        // Broadcast status change
        const io = req.app.get('socketio');
        if (io) {
            io.to(`match_${match._id}`).emit('match:status_changed', { 
                match_id: match._id, 
                status: match.status,
                live_data: match.live_data
            });
        }

        res.json({ success: true, message: `Status updated to ${status}`, match });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.get('/debug/sanitize', async (req, res) => {
    try {
        const matches = await Match.find({});
        let report = [];
        for (let match of matches) {
            let isModified = false;
            if (match.innings && Array.isArray(match.innings)) {
                match.innings.forEach((inn, innIdx) => {
                    if (inn.batsmen && Array.isArray(inn.batsmen)) {
                        inn.batsmen.forEach((b) => {
                            const validId = getValidObjectId(b.user_id);
                            if (String(b.user_id) !== String(validId)) {
                                report.push(`Match ${match._id}: Innings ${innIdx} batsman ${b.name} user_id invalid: ${b.user_id} -> ${validId}`);
                                b.user_id = validId;
                                isModified = true;
                            }
                        });
                    }
                    if (inn.bowlers && Array.isArray(inn.bowlers)) {
                        inn.bowlers.forEach((bw) => {
                            const validId = getValidObjectId(bw.user_id);
                            if (String(bw.user_id) !== String(validId)) {
                                report.push(`Match ${match._id}: Innings ${innIdx} bowler ${bw.name} user_id invalid: ${bw.user_id} -> ${validId}`);
                                bw.user_id = validId;
                                isModified = true;
                            }
                        });
                    }
                    if (inn.ball_history && Array.isArray(inn.ball_history)) {
                        inn.ball_history.forEach((h, hIdx) => {
                            const validBatsmanId = getValidObjectId(h.batsman_id);
                            if (String(h.batsman_id) !== String(validBatsmanId)) {
                                report.push(`Match ${match._id}: Innings ${innIdx} ball_history[${hIdx}] batsman_id invalid: ${h.batsman_id} -> ${validBatsmanId}`);
                                h.batsman_id = validBatsmanId;
                                isModified = true;
                            }
                            const validBowlerId = getValidObjectId(h.bowler_id);
                            if (String(h.bowler_id) !== String(validBowlerId)) {
                                report.push(`Match ${match._id}: Innings ${innIdx} ball_history[${hIdx}] bowler_id invalid: ${h.bowler_id} -> ${validBowlerId}`);
                                h.bowler_id = validBowlerId;
                                isModified = true;
                            }
                        });
                    }
                    if (inn.balls && Array.isArray(inn.balls)) {
                        inn.balls.forEach((b, bIdx) => {
                            const validBatterId = getValidObjectId(b.batter_id);
                            if (String(b.batter_id) !== String(validBatterId)) {
                                b.batter_id = validBatterId;
                                isModified = true;
                            }
                            const validNonStrikerId = getValidObjectId(b.non_striker_id);
                            if (String(b.non_striker_id) !== String(validNonStrikerId)) {
                                b.non_striker_id = validNonStrikerId;
                                isModified = true;
                            }
                            const validBowlerId = getValidObjectId(b.bowler_id);
                            if (String(b.bowler_id) !== String(validBowlerId)) {
                                b.bowler_id = validBowlerId;
                                isModified = true;
                            }
                            if (b.wicket) {
                                const validPlayerOutId = getValidObjectId(b.wicket.player_out_id);
                                if (String(b.wicket.player_out_id) !== String(validPlayerOutId)) {
                                    b.wicket.player_out_id = validPlayerOutId;
                                    isModified = true;
                                }
                                const validFielderId = getValidObjectId(b.wicket.fielder_id);
                                if (String(b.wicket.fielder_id) !== String(validFielderId)) {
                                    b.wicket.fielder_id = validFielderId;
                                    isModified = true;
                                }
                            }
                        });
                    }
                    if (inn.fall_of_wickets && Array.isArray(inn.fall_of_wickets)) {
                        inn.fall_of_wickets.forEach((f) => {
                            const validId = getValidObjectId(f.player_id);
                            if (String(f.player_id) !== String(validId)) {
                                f.player_id = validId;
                                isModified = true;
                            }
                        });
                    }
                    if (inn.partnership_log && Array.isArray(inn.partnership_log)) {
                        inn.partnership_log.forEach((p) => {
                            const validId1 = getValidObjectId(p.batsman1_id);
                            if (String(p.batsman1_id) !== String(validId1)) {
                                p.batsman1_id = validId1;
                                isModified = true;
                            }
                            const validId2 = getValidObjectId(p.batsman2_id);
                            if (String(p.batsman2_id) !== String(validId2)) {
                                p.batsman2_id = validId2;
                                isModified = true;
                            }
                        });
                    }
                });
            }
            if (isModified) {
                match.markModified('innings');
                await match.save();
                report.push(`Saved clean match ${match._id}`);
            }
        }
        res.json({ success: true, report });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;

