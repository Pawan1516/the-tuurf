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

// --- COMPATIBILITY ROUTES FOR STANDALONE DASHBOARD ---

/**
 * @route   GET /api/players
 * @desc    Get all players with filtering
 * @access  Public
 */
router.get('/', async (req, res) => {
    try {
        const { search, role } = req.query;
        let query = { role: { $in: ['PLAYER', 'CAPTAIN'] } };

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }
        if (role) {
            query['cricket_profile.primary_role'] = role;
        }

        const players = await User.find(query)
            .select('name cricket_profile stats role')
            .sort({ name: 1 });

        // Transform for dashboard compatibility
        const transformed = players.map(p => ({
            _id: p._id,
            name: p.name,
            team: "The Turf Resident",
            role: p.cricket_profile?.primary_role || 'Batsman',
            batting: {
                innings: p.stats?.batting?.innings || 0,
                runs: p.stats?.batting?.runs || 0,
                average: p.stats?.batting?.average || 0,
                strikeRate: p.stats?.batting?.strike_rate || 0,
                best: p.stats?.batting?.high_score?.toString() || "0",
                notOuts: p.stats?.batting?.not_outs || 0,
                fours: p.stats?.batting?.fours || 0,
                sixes: p.stats?.batting?.sixes || 0,
                fifties: p.stats?.batting?.fifties || 0,
                hundreds: p.stats?.batting?.hundreds || 0
            },
            bowling: {
                innings: p.stats?.bowling?.matches || 0,
                wickets: p.stats?.bowling?.wickets || 0,
                economy: p.stats?.bowling?.economy || 0,
                overs: (p.stats?.bowling?.overs || 0).toString(),
                best: `${p.stats?.bowling?.best_bowling?.wickets || 0}/${p.stats?.bowling?.best_bowling?.runs || 0}`,
                runs: p.stats?.bowling?.runs_conceded || 0,
                threeWickets: p.stats?.bowling?.three_wicket_hauls || 0,
                fiveWickets: p.stats?.bowling?.five_wicket_hauls || 0
            },
            fielding: {
                catches: p.stats?.fielding?.catches || 0,
                runOuts: p.stats?.fielding?.run_outs || 0,
                stumpings: p.stats?.fielding?.stumpings || 0
            },
            score: p.score || 0
        }));

        res.json(transformed);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * @route   GET /api/players/leaderboard
 * @desc    Top 20 players by score
 * @access  Public
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const players = await User.find({ role: { $in: ['PLAYER', 'CAPTAIN'] } })
            .select('name cricket_profile stats role')
            .lean();

        const transformed = players.map(p => {
            // Recalculate score for lean objects since virtuals don't work in lean query without plugin
            const score = (p.stats?.batting?.runs || 0) * 1 + 
                          (p.stats?.bowling?.wickets || 0) * 20 + 
                          (p.stats?.fielding?.catches || 0) * 10 + 
                          (p.stats?.fielding?.run_outs || 0) * 15;
            
            return {
                _id: p._id,
                name: p.name,
                team: "The Turf Elite",
                role: p.cricket_profile?.primary_role || 'Batsman',
                batting: { runs: p.stats?.batting?.runs || 0, average: p.stats?.batting?.average || 0 },
                bowling: { wickets: p.stats?.bowling?.wickets || 0 },
                score: score
            };
        }).sort((a, b) => b.score - a.score).slice(0, 20);

        res.json(transformed);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * @route   GET /api/players/:id
 * @desc    Get single player by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
    try {
        const p = await User.findById(req.params.id);
        if (!p) return res.status(404).json({ success: false, message: 'Operative not found' });

        const transformed = {
            _id: p._id,
            name: p.name,
            team: "The Turf Resident",
            role: p.cricket_profile?.primary_role || 'Batsman',
            batting: {
                innings: p.stats?.batting?.innings || 0,
                runs: p.stats?.batting?.runs || 0,
                average: p.stats?.batting?.average || 0,
                strikeRate: p.stats?.batting?.strike_rate || 0,
                best: p.stats?.batting?.high_score?.toString() || "0",
                notOuts: p.stats?.batting?.not_outs || 0,
                fours: p.stats?.batting?.fours || 0,
                sixes: p.stats?.batting?.sixes || 0,
                fifties: p.stats?.batting?.fifties || 0,
                hundreds: p.stats?.batting?.hundreds || 0
            },
            bowling: {
                innings: p.stats?.bowling?.matches || 0,
                wickets: p.stats?.bowling?.wickets || 0,
                economy: p.stats?.bowling?.economy || 0,
                overs: (p.stats?.bowling?.overs || 0).toString(),
                best: `${p.stats?.bowling?.best_bowling?.wickets || 0}/${p.stats?.bowling?.best_bowling?.runs || 0}`,
                runs: p.stats?.bowling?.runs_conceded || 0,
                threeWickets: p.stats?.bowling?.three_wicket_hauls || 0,
                fiveWickets: p.stats?.bowling?.five_wicket_hauls || 0
            },
            fielding: {
                catches: p.stats?.fielding?.catches || 0,
                runOuts: p.stats?.fielding?.run_outs || 0,
                stumpings: p.stats?.fielding?.stumpings || 0
            },
            score: p.score || 0
        };

        res.json(transformed);
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

router.post('/stats/bulk-update', verifyToken, roleGuard(['PLAYER', 'CAPTAIN', 'SCORER', 'ADMIN', 'WORKER', 'USER', 'worker', 'admin', 'player', 'captain', 'scorer', 'user']), async (req, res) => {
    try {
        const { match_results } = req.body; // array of { name, user_id, r, b, w, rc, o_float, fours, sixes, is_out }
        
        for (const stat of match_results) {
            let filter = {};
            if (stat.user_id) {
                filter = { _id: stat.user_id };
            } else {
                const escapedName = (stat.name || '').replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
                filter = { name: { $regex: new RegExp("^" + escapedName + "$", "i") } };
            }

            const player = await User.findOne(filter);
            if (player) {
                if (!player.stats) player.stats = {};
                if (!player.stats.batting) player.stats.batting = { matches: 0, innings: 0, runs: 0, balls_faced: 0, fifties: 0, hundreds: 0, high_score: 0, strike_rate: 0, fours: 0, sixes: 0, not_outs: 0 };
                if (!player.stats.bowling) player.stats.bowling = { matches: 0, wickets: 0, overs: 0, balls_bowled: 0, runs_conceded: 0, best_bowling: { wickets: 0, runs: 0 }, five_wicket_hauls: 0, three_wicket_hauls: 0 };

                // --- BATTING UPDATE ---
                if (stat.b > 0 || stat.r > 0) {
                    player.stats.batting.matches += 1;
                    player.stats.batting.innings += 1;
                    player.stats.batting.runs += (stat.r || 0);
                    player.stats.batting.balls_faced += (stat.b || 0);
                    player.stats.batting.fours += (stat.fours || 0);
                    player.stats.batting.sixes += (stat.sixes || 0);
                    
                    if (!stat.is_out && stat.b > 0) player.stats.batting.not_outs += 1;

                    if (stat.r >= 100) player.stats.batting.hundreds += 1;
                    else if (stat.r >= 50) player.stats.batting.fifties += 1;
                    
                    if (stat.r > (player.stats.batting.high_score || 0)) {
                        player.stats.batting.high_score = stat.r;
                    }

                    // Derived Batting Stats
                    if (player.stats.batting.balls_faced > 0) {
                        player.stats.batting.strike_rate = Number(((player.stats.batting.runs / player.stats.batting.balls_faced) * 100).toFixed(2));
                    }
                    const dismissals = player.stats.batting.innings - player.stats.batting.not_outs;
                    if (dismissals > 0) {
                        player.stats.batting.average = Number((player.stats.batting.runs / dismissals).toFixed(2));
                    } else {
                        player.stats.batting.average = player.stats.batting.runs;
                    }
                }

                // --- BOWLING UPDATE ---
                // Convert o_float (balls/6) to balls bowled
                const ballsBowledThisMatch = Math.round((stat.o || 0) * 6);
                if (ballsBowledThisMatch > 0 || stat.rc > 0 || stat.w > 0) {
                    if (stat.b === 0) player.stats.bowling.matches += 1; 
                    player.stats.bowling.wickets += (stat.w || 0);
                    player.stats.bowling.balls_bowled += ballsBowledThisMatch;
                    player.stats.bowling.runs_conceded += (stat.rc || 0);

                    // Update overs in standard notation (e.g. 10.4 balls -> internal float or just recalculated)
                    player.stats.bowling.overs = Number((player.stats.bowling.balls_bowled / 6).toFixed(1));

                    if (stat.w >= 5) player.stats.bowling.five_wicket_hauls += 1;
                    else if (stat.w >= 3) player.stats.bowling.three_wicket_hauls += 1;

                    // Best Bowling
                    const currentBest = player.stats.bowling.best_bowling || { wickets: 0, runs: 0 };
                    if (stat.w > currentBest.wickets || (stat.w === currentBest.wickets && stat.rc < currentBest.runs) || currentBest.wickets === 0) {
                        player.stats.bowling.best_bowling = { wickets: stat.w, runs: stat.rc };
                    }

                    // Economy
                    if (player.stats.bowling.balls_bowled > 0) {
                        player.stats.bowling.economy = Number(((player.stats.bowling.runs_conceded / player.stats.bowling.balls_bowled) * 6).toFixed(2));
                    }
                }

                player.markModified('stats');
                await player.save();
            }
        }

        // Notify individual players via Socket.IO to refresh their dashboards
        const io = req.app.get('socketio');
        if (io) {
            match_results.forEach(stat => {
                if (stat.user_id) {
                    io.to(`profile:${stat.user_id}`).emit('stats:updated', {
                        message: 'Match results synchronized with your career profile!',
                        timestamp: new Date()
                    });
                }
            });
        }

        res.json({ success: true, message: 'Career registries updated successfully.' });
    } catch (err) {
        console.error("Bulk Stats Update Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;

