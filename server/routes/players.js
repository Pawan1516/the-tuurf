const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Match = require('../models/Match');
const QRService = require('../services/qrService');
const verifyToken = require('../middleware/verifyToken');
const roleGuard = require('../middleware/roleGuard');

// @route   GET /api/players/:id/qr
// @desc    Fetch player's QR code PNG and payload
// @access  Private
router.get('/:id/qr', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('player_qr name');
        if (!user) return res.status(404).json({ success: false, message: 'Player not found' });
        
        // Security: only self or admin can see full QR payload details
        if (req.user.id !== req.params.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        res.json({ success: true, player_qr: user.player_qr });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/players/:id/qr/reset
// @desc    Regenerate player QR
// @access  Private (Owner or Admin)
router.post('/:id/qr/reset', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'Player not found' });
        
        if (req.user.id !== req.params.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const qrData = await QRService.generatePlayerQR(user);
        
        user.player_qr.code = qrData.encodedData;
        user.player_qr.qr_image_url = qrData.qrImage; // For now storing base64 as URL
        user.player_qr.last_reset_at = new Date();
        user.player_qr.reset_count += 1;
        
        await user.save();

        res.json({ success: true, message: 'Identity QR Regenerated.', player_qr: user.player_qr });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/players/resolve
// @desc    Resolve a username or mobile to a user profile
// @access  Private
router.post('/resolve', verifyToken, async (req, res) => {
    try {
        const { identifier } = req.body;
        if (!identifier) return res.status(400).json({ success: false, message: 'Registry criteria not met: identifier required.' });

        let user = null;
        if (identifier.startsWith('@')) {
            user = await User.findOne({ username: identifier.slice(1) })
                .select('name username phone player_qr.qr_image_url stats');
        } else if (/^\d{10}$/.test(identifier)) {
            user = await User.findOne({ phone: identifier })
                .select('name username phone player_qr.qr_image_url stats');
        }

        if (user) {
            res.json({ success: true, linked: true, user });
        } else {
            res.json({ success: true, linked: false, message: 'Node could not be addressed. Saved as guest.' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/players/lookup-mobile
// @desc    Lookup player by mobile (Addendum v2.6)
router.post('/lookup-mobile', verifyToken, async (req, res) => {
    try {
        const { mobile } = req.body;
        const user = await User.findOne({ phone: mobile }).select('name username phone stats');
        if (user) {
            res.json({ success: true, found: true, user });
        } else {
            res.json({ success: true, found: false });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/players/lookup-mobile/bulk
// @desc    Bulk lookup for team entry (Addendum v2.6)
router.post('/lookup-mobile/bulk', verifyToken, async (req, res) => {
    try {
        const { players } = req.body; // array of {mobile, name}
        const mobiles = players.map(p => p.mobile);
        const users = await User.find({ phone: { $in: mobiles } }).select('name username phone stats');
        
        const results = players.map(p => {
            const foundUser = users.find(u => u.phone === p.mobile);
            return {
                mobile: p.mobile,
                name: p.name,
                found: !!foundUser,
                user: foundUser || null
            };
        });

        res.json({ success: true, results });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/players/claim-stats
// @desc    Claim guest stats after registration (Addendum v2.6)
router.post('/claim-stats', verifyToken, async (req, res) => {
    try {
        const { mobile, claim_token } = req.body;
        const user = await User.findById(req.user.id);
        if (!user || user.phone !== mobile) {
            return res.status(403).json({ success: false, message: 'Mobile verification failed.' });
        }

        // Search for matches where this mobile appeared as a guest with the token
        const matches = await Match.find({
            $or: [
                { "quick_teams.team_a.players": { $elemMatch: { input: mobile, claim_token } } },
                { "quick_teams.team_b.players": { $elemMatch: { input: mobile, claim_token } } }
            ]
        });

        if (matches.length === 0) {
            return res.status(404).json({ success: false, message: 'No claimable stats found for this token/mobile.' });
        }

        // Linking logic (Phase 2): Iterate and update user_id in matches
        for (const match of matches) {
            ['team_a', 'team_b'].forEach(teamSide => {
                match.quick_teams[teamSide].players.forEach(p => {
                    if (p.input === mobile && p.claim_token === claim_token) {
                        p.user_id = user._id;
                        p.is_linked = true;
                    }
                });
            });
            await match.save();
        }

        res.json({ success: true, message: `Successfully claimed stats from ${matches.length} matches.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/players/scan-qr
// @desc    Extract profile from Player QR
// @access  Private
router.post('/scan-qr', verifyToken, async (req, res) => {
    try {
        const { qr_payload } = req.body;
        if (!qr_payload) return res.status(400).json({ success: false, message: 'Missing QR payload' });

        // Search user by QR code
        const player = await User.findOne({ 'player_qr.code': qr_payload })
            .select('name stats cricket_profile personal teams');

        if (!player) return res.status(404).json({ success: false, message: 'Identity not found in Registry.' });

        res.json({ success: true, profile: player });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/players/checkin
// @desc    Check a player into a match
// @access  Private (SCORER or ADMIN)
router.post('/checkin', verifyToken, roleGuard(['SCORER', 'ADMIN', 'admin', 'player', 'captain', 'PLAYER', 'CAPTAIN', 'WORKER', 'worker', 'USER', 'user']), async (req, res) => {
    try {
        const { match_id, player_qr_code, team_id, method = 'QR_SCAN' } = req.body;
        
        const player = await User.findOne({ 'player_qr.code': player_qr_code });
        if (!player) return res.status(404).json({ success: false, message: 'Player identity failed.' });

        const match = await Match.findById(match_id);
        if (!match) return res.status(404).json({ success: false, message: 'Match node not found.' });

        // Check if player already checked in
        const alreadyCheckedIn = match.player_checkin.find(c => c.player_id.toString() === player._id.toString());
        if (alreadyCheckedIn) {
            return res.status(400).json({ success: false, message: 'Player already manifested in match.' });
        }

        match.player_checkin.push({
            player_id: player._id,
            team_id: team_id,
            checked_in_at: new Date(),
            method,
            scanned_by: req.user.id
        });

        await match.save();

        // Emit check-in event
        const io = req.app.get('socketio');
        if (io) {
            io.to(`match_${match._id}`).emit('match:player_checkin', {
                player_name: player.name,
                team_id: team_id,
                total_checked_in: match.player_checkin.length
            });
        }

        res.json({ success: true, message: 'Player manifestations confirmed.', player_name: player.name });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   GET /api/players/profile/:name
// @desc    Fetch player career profile by name (Public)
router.get('/profile/:name', async (req, res) => {
    try {
        const name = req.params.name;
        // Case-insensitive search
        let player = await User.findOne({ name: { $regex: new RegExp("^" + name + "$", "i") } })
            .select('name username cricket_profile stats personal');

        if (!player) {
            // Return dummy profile for unidentified players
            return res.json({
                success: true,
                is_guest: true,
                profile: {
                    name: name,
                    stats: {
                        batting: { matches: 0, runs: 0, high_score: 0 },
                        bowling: { matches: 0, wickets: 0, best_bowling: { wickets: 0, runs: 0 } }
                    },
                    cricket_profile: { primary_role: 'Guest Player' }
                }
            });
        }

        res.json({ success: true, is_guest: false, profile: player });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/players/stats/bulk-update
// @desc    Update career stats for multiple players (Scorer/Admin Only)
router.post('/stats/bulk-update', verifyToken, roleGuard(['PLAYER', 'CAPTAIN', 'SCORER', 'ADMIN', 'WORKER', 'USER', 'worker', 'admin', 'player', 'captain', 'scorer', 'user']), async (req, res) => {
    try {
        const { match_results } = req.body; // array of { name, user_id, r, b, w, rc, o }
        
        for (const res of match_results) {
            let filter = {};
            if (res.user_id) {
                filter = { _id: res.user_id };
            } else {
                const escapedName = (res.name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                filter = { name: { $regex: new RegExp("^" + escapedName + "$", "i") } };
            }

            const player = await User.findOne(filter);
            if (player) {
                // Failsafe for legacy documents missing stats schema structure
                if (!player.stats) player.stats = {};
                if (!player.stats.batting) player.stats.batting = { matches: 0, innings: 0, runs: 0, balls_faced: 0, fifties: 0, hundreds: 0, high_score: 0, strike_rate: 0 };
                if (!player.stats.bowling) player.stats.bowling = { matches: 0, wickets: 0, overs: 0, runs_conceded: 0, best_bowling: { wickets: 0, runs: 0 } };
                if (!player.stats.bowling.best_bowling) player.stats.bowling.best_bowling = { wickets: 0, runs: 0 };

                // Batting
                if (res.b > 0) {
                    player.stats.batting.matches = (player.stats.batting.matches || 0) + 1;
                    player.stats.batting.innings = (player.stats.batting.innings || 0) + 1;
                    player.stats.batting.runs = (player.stats.batting.runs || 0) + res.r;
                    player.stats.batting.balls_faced = (player.stats.batting.balls_faced || 0) + res.b;
                    if (res.r >= 100) player.stats.batting.hundreds = (player.stats.batting.hundreds || 0) + 1;
                    else if (res.r >= 50) player.stats.batting.fifties = (player.stats.batting.fifties || 0) + 1;
                    if (res.r > (player.stats.batting.high_score || 0)) player.stats.batting.high_score = res.r;
                    
                    // Simple Avg/SR calc
                    if (player.stats.batting.balls_faced > 0) {
                        player.stats.batting.strike_rate = (player.stats.batting.runs / player.stats.batting.balls_faced) * 100;
                    }
                }

                // Bowling
                if (res.o > 0 || res.rc > 0 || res.w > 0) {
                    if (res.b === 0) player.stats.bowling.matches = (player.stats.bowling.matches || 0) + 1; 
                    player.stats.bowling.wickets = (player.stats.bowling.wickets || 0) + res.w;
                    player.stats.bowling.overs = (player.stats.bowling.overs || 0) + res.o;
                    player.stats.bowling.runs_conceded = (player.stats.bowling.runs_conceded || 0) + res.rc;
                    
                    // Best Bowling
                    const currentBest = player.stats.bowling.best_bowling;
                    if (res.w > currentBest.wickets || (res.w === currentBest.wickets && res.rc < currentBest.runs) || currentBest.wickets === undefined) {
                        player.stats.bowling.best_bowling = { wickets: res.w, runs: res.rc };
                    }
                }
                
                // Mongoose might not detect deeply nested un-schematized changes without markModified
                player.markModified('stats');
                await player.save();
            }
        }

        res.json({ success: true, message: 'Career registries updated successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;

