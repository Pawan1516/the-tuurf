const express = require('express');
const router = express.Router();
const Tournament = require('../models/Tournament');
const Team = require('../models/Team');
const Match = require('../models/Match');
const User = require('../models/User');
const tournamentService = require('../services/tournamentService');
const tournamentStatsService = require('../services/tournamentStatsService');
const qrService = require('../services/qrService');
const multer = require('multer');
const path = require('path');

// Multer for logo/banner upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
    filename: (req, file, cb) => cb(null, `tournament_${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ─── LIST TOURNAMENTS ────────────────────────────────────────────────
router.get('/list', async (req, res) => {
    try {
        const { status, type, featured, limit = 20, page = 1 } = req.query;
        const filter = { visibility: 'public' };
        if (status) filter.status = status;
        if (type) filter.tournamentType = type;
        if (featured) filter.featured = featured === 'true';

        const tournaments = await Tournament.find(filter)
            .populate('organizer', 'name email')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Tournament.countDocuments(filter);
        res.json({ success: true, tournaments, total, page: parseInt(page) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── CREATE TOURNAMENT ────────────────────────────────────────────────
router.post('/create', async (req, res) => {
    try {
        const tournamentData = {
            ...req.body,
            organizer: req.body.organizerId || req.body.organizer
        };
        const tournament = new Tournament(tournamentData);
        await tournament.save();
        res.json({ success: true, tournament });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── GET SINGLE TOURNAMENT ────────────────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id)
            .populate('organizer', 'name email phone avatar')
            .populate('registeredTeams.team_id', 'name shortName logo city captain stats')
            .populate('scorers', 'name email')
            .populate('umpires', 'name email')
            .populate('awards.orangeCap', 'name avatar')
            .populate('awards.purpleCap', 'name avatar')
            .populate('awards.mvp', 'name avatar')
            .populate('awards.winnerTeam', 'name logo')
            .populate('awards.runnerUpTeam', 'name logo');

        if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });
        res.json({ success: true, tournament });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── UPDATE TOURNAMENT ────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
    try {
        const tournament = await Tournament.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );
        res.json({ success: true, tournament });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── REGISTER TEAM ────────────────────────────────────────────────────
router.post('/:id/register-team', async (req, res) => {
    try {
        const { teamId } = req.body;
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });

        // Retrieve the team to validate squad size (must be between 7 and 11 members)
        const team = await Team.findById(teamId);
        if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

        const memberCount = team.players?.length || 0;
        if (memberCount < 7 || memberCount > 11) {
            return res.status(400).json({
                success: false,
                message: `Team size must be between 7 and 11 members. Current team size is ${memberCount} players.`
            });
        }

        // Check if already registered
        const existing = tournament.registeredTeams.find(t => t.team_id?.toString() === teamId);
        if (existing) return res.status(400).json({ success: false, message: 'Team already registered' });

        // Check capacity
        const approved = tournament.registeredTeams.filter(t => t.approvalStatus !== 'rejected').length;
        if (approved >= tournament.totalTeams) {
            return res.status(400).json({ success: false, message: 'Tournament is full' });
        }

        // ONE-PLAYER-PER-TOURNAMENT ENFORCEMENT
        const otherTeamIds = tournament.registeredTeams
            .filter(t => t.approvalStatus !== 'rejected' && t.team_id?.toString() !== teamId)
            .map(t => t.team_id);
        if (otherTeamIds.length > 0) {
            const otherTeams = await Team.find({ _id: { $in: otherTeamIds } });
            const existingPlayerIds = new Set(
                otherTeams.flatMap(t => (t.players || []).map(p => p.user_id?.toString()).filter(Boolean))
            );
            const newPlayerIds = (team.players || []).map(p => p.user_id?.toString()).filter(Boolean);
            const conflicting = newPlayerIds.filter(id => existingPlayerIds.has(id));
            if (conflicting.length > 0) {
                const conflictingUsers = await User.find({ _id: { $in: conflicting } }, 'name');
                const names = conflictingUsers.map(u => u.name).join(', ');
                return res.status(400).json({
                    success: false,
                    message: `${conflicting.length} player(s) already registered in another team in this tournament: ${names}`,
                    conflicting_player_ids: conflicting
                });
            }
        }

        tournament.registeredTeams.push({
            team_id: teamId,
            approvalStatus: 'pending',
            paymentStatus: tournament.entryFee > 0 ? 'pending' : 'paid'
        });
        await tournament.save();

        // Seed tournamentHistory for all players in this team
        const playerIds = (team.players || []).map(p => p.user_id).filter(Boolean);
        const season = String(new Date(tournament.startDate || tournament.createdAt).getFullYear());
        for (const pid of playerIds) {
            await User.updateOne(
                { _id: pid, 'tournamentHistory.tournament_id': { $ne: tournament._id } },
                {
                    $push: {
                        tournamentHistory: {
                            tournament_id: tournament._id,
                            tournament_name: tournament.name,
                            team_id: team._id,
                            team_name: team.name,
                            season: season,
                            status: 'active',
                            result: 'participated',
                            stats: {
                                matches: 0, runs: 0, balls_faced: 0,
                                wickets: 0, overs_bowled: 0, runs_conceded: 0,
                                catches: 0, run_outs: 0, stumpings: 0,
                                fifties: 0, hundreds: 0, best_score: 0,
                                best_bowling_wickets: 0, best_bowling_runs: 999,
                                not_outs: 0
                            }
                        }
                    }
                }
            );
        }

        res.json({ success: true, message: 'Registration submitted, awaiting approval', tournament });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── APPROVE TEAM ────────────────────────────────────────────────────
router.post('/:id/approve-team', async (req, res) => {
    try {
        const { teamId } = req.body;
        const tournament = await Tournament.findById(req.params.id);
        const team = tournament.registeredTeams.find(t => t.team_id?.toString() === teamId);
        if (!team) return res.status(404).json({ success: false, message: 'Team not found in tournament' });

        team.approvalStatus = 'approved';
        await tournament.save();
        res.json({ success: true, message: 'Team approved' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── APPROVE PAYMENT MANUALLY ─────────────────────────────────────────
router.post('/:id/approve-payment', async (req, res) => {
    try {
        const { teamId } = req.body;
        const tournament = await Tournament.findById(req.params.id);
        const team = tournament.registeredTeams.find(t => t.team_id?.toString() === teamId);
        if (!team) return res.status(404).json({ success: false, message: 'Team not found in tournament' });

        team.paymentStatus = 'paid';
        team.approvalStatus = 'approved'; // auto-approve on payment
        await tournament.save();
        res.json({ success: true, message: 'Manual payment approved and team registered' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── REJECT TEAM ────────────────────────────────────────────────────
router.post('/:id/reject-team', async (req, res) => {
    try {
        const { teamId, reason } = req.body;
        const tournament = await Tournament.findById(req.params.id);
        const team = tournament.registeredTeams.find(t => t.team_id?.toString() === teamId);
        if (!team) return res.status(404).json({ success: false, message: 'Team not found in tournament' });

        team.approvalStatus = 'rejected';
        await tournament.save();

        // Remove tournament history entries for these players
        const teamObj = await Team.findById(teamId);
        if (teamObj) {
            const playerIds = (teamObj.players || []).map(p => p.user_id).filter(Boolean);
            await User.updateMany(
                { _id: { $in: playerIds } },
                { $pull: { tournamentHistory: { tournament_id: tournament._id } } }
            );
        }

        res.json({ success: true, message: 'Team rejected' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── GET FIXTURES ────────────────────────────────────────────────────
router.get('/:id/fixtures', async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });

        const leagueMatches = await Match.find({ _id: { $in: tournament.leagueMatches } })
            .populate('team_a.team_id', 'name shortName logo')
            .populate('team_b.team_id', 'name shortName logo')
            .sort({ matchNumber: 1, scheduledAt: 1 });

        // Knockout matches
        const knockoutData = [];
        for (const round of tournament.knockoutRounds) {
            const roundMatches = await Match.find({ _id: { $in: round.matches } })
                .populate('team_a.team_id', 'name shortName logo')
                .populate('team_b.team_id', 'name shortName logo');
            knockoutData.push({ round: round.round, matches: roundMatches });
        }

        // Self-healing: Ensure all matches have QR codes generated
        for (const m of leagueMatches) {
            if (!m.qrCode || !m.qrCodeImage) {
                const matchCode = m.qrCode || qrService.generateMatchCode();
                const qrImage = await qrService.generateMatchQR(m._id.toString(), matchCode);
                m.qrCode = matchCode;
                m.qrCodeImage = qrImage;
                await m.save();
            }
        }
        for (const round of knockoutData) {
            for (const m of round.matches) {
                if (!m.qrCode || !m.qrCodeImage) {
                    const matchCode = m.qrCode || qrService.generateMatchCode();
                    const qrImage = await qrService.generateMatchQR(m._id.toString(), matchCode);
                    m.qrCode = matchCode;
                    m.qrCodeImage = qrImage;
                    await m.save();
                }
            }
        }

        res.json({ success: true, leagueMatches, knockoutRounds: knockoutData });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── GENERATE FIXTURES ────────────────────────────────────────────────
router.post('/:id/generate-fixtures', async (req, res) => {
    try {
        const { startDate, venues } = req.body;
        const result = await tournamentService.generateLeagueFixtures(
            req.params.id,
            { startDate: startDate ? new Date(startDate) : undefined, venues }
        );
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── GENERATE KNOCKOUT BRACKET ────────────────────────────────────────
router.post('/:id/generate-knockout', async (req, res) => {
    try {
        const { seededTeamIds } = req.body;
        const result = await tournamentService.generateKnockoutBracket(req.params.id, seededTeamIds);
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── POINTS TABLE ────────────────────────────────────────────────────
router.get('/:id/points-table', async (req, res) => {
    try {
        const table = await tournamentService.getPointsTable(req.params.id);
        res.json({ success: true, table });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── RECALCULATE NRR ────────────────────────────────────────────────
router.post('/:id/recalculate-nrr', async (req, res) => {
    try {
        const teams = await tournamentService.calculateNRR(req.params.id);
        res.json({ success: true, teams });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── LEADERBOARDS ────────────────────────────────────────────────────
router.get('/:id/leaderboards', async (req, res) => {
    try {
        const leaderboards = await tournamentService.computeLeaderboards(req.params.id);
        res.json({ success: true, leaderboards });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── FINALIZE AWARDS ────────────────────────────────────────────────
router.post('/:id/finalize-awards', async (req, res) => {
    try {
        const awards = await tournamentService.assignAwards(req.params.id);
        
        // Sync final results to players' tournament history
        const tournament = await Tournament.findById(req.params.id);
        if (tournament && tournament.awards) {
            const { winnerTeam, runnerUpTeam } = tournament.awards;
            await tournamentStatsService.finalizePlayerTournamentResult(
                req.params.id,
                winnerTeam,
                runnerUpTeam
            );
        }

        res.json({ success: true, awards });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── GET TOURNAMENT TEAMS ────────────────────────────────────────────
router.get('/:id/teams', async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id)
            .populate({
                path: 'registeredTeams.team_id',
                populate: { path: 'captain', select: 'name avatar' }
            });

        if (!tournament) return res.status(404).json({ success: false, message: 'Not found' });

        const teams = tournament.registeredTeams
            .filter(t => t.approvalStatus === 'approved')
            .map(t => ({
                ...t.team_id?.toObject(),
                points: t.points,
                played: t.played,
                won: t.won,
                approvalStatus: t.approvalStatus
            }));

        res.json({ success: true, teams });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── GET TOURNAMENT PLAYERS ──────────────────────────────────────────
router.get('/:id/players', async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id)
            .populate('registeredTeams.team_id', 'name logo players');

        const allPlayers = [];
        for (const rt of tournament.registeredTeams) {
            if (rt.approvalStatus !== 'approved') continue;
            const team = rt.team_id;
            if (!team) continue;
            for (const p of team.players || []) {
                allPlayers.push({ ...p, teamName: team.name, teamLogo: team.logo });
            }
        }

        res.json({ success: true, players: allPlayers });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── ADD SCORER / UMPIRE ─────────────────────────────────────────────
router.post('/:id/add-official', async (req, res) => {
    try {
        const { userId, role } = req.body; // role: 'scorer' | 'umpire'
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ success: false, message: 'Not found' });

        if (role === 'scorer') {
            if (!tournament.scorers.includes(userId)) tournament.scorers.push(userId);
        } else if (role === 'umpire') {
            if (!tournament.umpires.includes(userId)) tournament.umpires.push(userId);
        }

        await tournament.save();
        res.json({ success: true, message: `${role} added` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── ADD SPONSOR ─────────────────────────────────────────────────────
router.post('/:id/add-sponsor', async (req, res) => {
    try {
        const { name, logo, website, tier } = req.body;
        const tournament = await Tournament.findById(req.params.id);
        tournament.sponsors.push({ name, logo, website, tier });
        await tournament.save();
        res.json({ success: true, tournament });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── ADD GALLERY IMAGE ───────────────────────────────────────────────
router.post('/:id/gallery', async (req, res) => {
    try {
        const { url, caption } = req.body;
        const tournament = await Tournament.findById(req.params.id);
        tournament.gallery.push({ url, caption, uploadedAt: new Date() });
        await tournament.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── GENERATE MATCH QR ───────────────────────────────────────────────
// Generates URL-based QR (Google Lens opens /join/match/:matchCode directly)
router.post('/:id/matches/:matchId/generate-qr', async (req, res) => {
    try {
        const match = await Match.findById(req.params.matchId);
        if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

        const matchCode = qrService.generateMatchCode();
        const qrDataURL = await qrService.generateMatchQR(req.params.matchId, matchCode);

        // Save match code on match doc
        await Match.findByIdAndUpdate(req.params.matchId, {
            qrCode: matchCode,
            qrVerified: false,
            qrGeneratedAt: new Date()
        });

        res.json({
            success: true,
            qrDataURL,
            matchCode,
            joinUrl: `${qrService.FRONTEND_URL}/join/match/${matchCode}`,
            matchTitle: match.matchTitle || `Match ${match.matchNumber || ''}`
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── VERIFY MATCH QR ─────────────────────────────────────────────────
router.post('/:id/matches/:matchId/verify-qr', async (req, res) => {
    try {
        const { qrData, matchCode } = req.body;
        // Support both URL-based (matchCode direct) and legacy qrData
        const codeToVerify = matchCode || qrData;

        const match = await Match.findById(req.params.matchId);
        if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

        const result = qrService.verifyMatchQR(codeToVerify, match.qrCode);
        if (result.valid) {
            await Match.findByIdAndUpdate(req.params.matchId, { qrVerified: true });
        }
        res.json({ success: result.valid, ...result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── CHECK PLAYER ELIGIBILITY ──────────────────────────────────────────
router.get('/:id/check-player-eligibility', async (req, res) => {
    try {
        const { teamId, userId } = req.query;
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });

        const otherTeamIds = tournament.registeredTeams
            .filter(t => t.approvalStatus !== 'rejected' && t.team_id?.toString() !== teamId)
            .map(t => t.team_id);

        let existingPlayerIds = new Set();
        let registeredTeamMap = {};

        if (otherTeamIds.length > 0) {
            const otherTeams = await Team.find({ _id: { $in: otherTeamIds } });
            for (const t of otherTeams) {
                for (const p of t.players || []) {
                    if (p.user_id) {
                        const pIdStr = p.user_id.toString();
                        existingPlayerIds.add(pIdStr);
                        registeredTeamMap[pIdStr] = t.name;
                    }
                }
            }
        }

        let conflicts = [];

        if (teamId) {
            const team = await Team.findById(teamId);
            if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
            for (const p of team.players || []) {
                if (p.user_id && existingPlayerIds.has(p.user_id.toString())) {
                    conflicts.push({
                        user_id: p.user_id,
                        name: p.name || 'Unknown',
                        mobile: p.mobile || 'N/A',
                        teamName: registeredTeamMap[p.user_id.toString()]
                    });
                }
            }
        } else if (userId) {
            if (existingPlayerIds.has(userId)) {
                const user = await User.findById(userId, 'name phone mobileNumber');
                conflicts.push({
                    user_id: userId,
                    name: user ? user.name : 'Unknown',
                    mobile: user ? (user.phone || user.mobileNumber || 'N/A') : 'N/A',
                    teamName: registeredTeamMap[userId]
                });
            }
        }

        res.json({
            success: true,
            eligible: conflicts.length === 0,
            conflicts
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── START MATCH FROM FIXTURE ──────────────────────────────────────────
router.post('/:id/matches/:matchId/start', async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });

        const match = await Match.findById(req.params.matchId);
        if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

        // Verify match belongs to this tournament
        if (match.tournament?.toString() !== req.params.id) {
            return res.status(400).json({ success: false, message: 'Match does not belong to this tournament' });
        }

        match.status = 'In Progress';
        match.start_time = new Date();
        // Bypass QR checks
        match.verification.status = 'VERIFIED';
        match.start_control.can_start = true;
        match.start_control.start_method = 'ADMIN_OVERRIDE';

        await match.save();

        // Broadcast status update
        const io = req.app.get('socketio');
        if (io) {
            io.to(`match_${match._id}`).emit('match_status_change', { status: 'In Progress' });
            io.to(`tournament_${tournament._id}`).emit('fixtures_updated');
        }

        res.json({ success: true, message: 'Match started', matchId: match._id });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── SYNC PLAYER STATS MANUALLY ───────────────────────────────────────
router.post('/:id/sync-player-stats', async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });

        // Find all completed matches for this tournament
        const matches = await Match.find({ tournament: req.params.id, status: 'Completed' });
        
        // Reset/clear existing stats for this tournament for all users first
        const users = await User.find({ 'tournamentHistory.tournament_id': req.params.id });
        for (const user of users) {
            const th = user.tournamentHistory.find(h => h.tournament_id?.toString() === req.params.id);
            if (th) {
                th.stats = {
                    matches: 0, runs: 0, balls_faced: 0,
                    wickets: 0, overs_bowled: 0, runs_conceded: 0,
                    catches: 0, run_outs: 0, stumpings: 0,
                    fifties: 0, hundreds: 0, best_score: 0,
                    best_bowling_wickets: 0, best_bowling_runs: 999,
                    not_outs: 0
                };
                await user.save();
            }
        }

        // Loop through each completed match and sync
        for (const match of matches) {
            await tournamentStatsService.syncMatchStatsToTournamentHistory(match._id.toString());
        }

        res.json({ success: true, message: `Manually synced player stats for ${matches.length} completed matches.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── ADMIN: MANUAL PAYMENT APPROVAL (cash) ───────────────────────────
router.post('/:id/approve-payment', async (req, res) => {
    try {
        const { teamId } = req.body;
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });

        const teamEntry = tournament.registeredTeams.find(t => t.team_id?.toString() === teamId);
        if (!teamEntry) return res.status(404).json({ success: false, message: 'Team not registered' });

        teamEntry.paymentStatus = 'paid';
        teamEntry.approvalStatus = 'approved';
        teamEntry.paymentId = `MANUAL_${Date.now()}`;
        await tournament.save();

        res.json({ success: true, message: 'Payment approved and team registered successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── TOURNAMENT CONTROL ───────────────────────────────────────────────
router.post('/:id/control', async (req, res) => {
    try {
        const { action, reason } = req.body; // action: 'start' | 'pause' | 'resume' | 'end' | 'archive'
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });

        if (action === 'start') {
            tournament.status = 'ongoing';
            tournament.startedAt = new Date();
            // generate fixtures automatically if they don't exist
            if (tournament.leagueMatches.length === 0 && tournament.tournamentType === 'league') {
                await tournamentService.generateLeagueFixtures(tournament._id);
            }
        } else if (action === 'pause') {
            tournament.status = 'ongoing'; // keep status but tag paused
            tournament.pausedAt = new Date();
            tournament.pauseReason = reason || 'Rain / Delay';
        } else if (action === 'resume') {
            tournament.pausedAt = undefined;
            tournament.pauseReason = undefined;
        } else if (action === 'end') {
            tournament.status = 'completed';
            tournament.completedAt = new Date();
        } else if (action === 'archive') {
            tournament.archivedAt = new Date();
        } else {
            return res.status(400).json({ success: false, message: 'Invalid control action' });
        }

        await tournament.save();
        res.json({ success: true, message: `Tournament action '${action}' successful`, tournament });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── ENTRY FEE PAYMENT ROUTE: CREATE ORDER ─────────────────────────────
router.post('/:id/payment/create-order', async (req, res) => {
    try {
        const { teamId } = req.body;
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });

        const teamEntry = tournament.registeredTeams.find(t => t.team_id?.toString() === teamId);
        if (!teamEntry) return res.status(404).json({ success: false, message: 'Team not registered for this tournament' });

        const amount = tournament.entryFee || 0;
        if (amount <= 0) {
            return res.status(400).json({ success: false, message: 'This tournament is free to enter' });
        }

        const paymentService = require('../services/payment');
        const receiptId = `rec_${teamId.toString().slice(-12)}_${Date.now().toString().slice(-8)}`;
        const result = await paymentService.createOrder(amount, 'INR', receiptId);

        if (!result.success) {
            return res.status(500).json({ success: false, message: result.error });
        }

        teamEntry.razorpayOrderId = result.order.id;
        await tournament.save();

        res.json({
            success: true,
            order: result.order,
            keyId: process.env.RAZORPAY_KEY_ID || null
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── ENTRY FEE PAYMENT ROUTE: VERIFY ──────────────────────────────────
router.post('/:id/payment/verify', async (req, res) => {
    try {
        const { teamId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });

        const teamEntry = tournament.registeredTeams.find(t => t.team_id?.toString() === teamId);
        if (!teamEntry) return res.status(404).json({ success: false, message: 'Team registration not found' });

        const paymentService = require('../services/payment');
        const isSignatureValid = paymentService.verifyPaymentSignature(
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature
        );

        if (!isSignatureValid && process.env.NODE_ENV === 'production') {
            teamEntry.paymentStatus = 'failed';
            await tournament.save();
            return res.status(400).json({ success: false, message: 'Invalid payment signature' });
        }

        teamEntry.paymentStatus = 'paid';
        teamEntry.paymentId = razorpayPaymentId;
        teamEntry.razorpaySignature = razorpaySignature;
        // Approve team automatically on payment success
        teamEntry.approvalStatus = 'approved';
        await tournament.save();

        res.json({ success: true, message: 'Tournament registration payment successful', tournament });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── REPORTS EXPORTS ──────────────────────────────────────────────────
router.get('/:id/export/points-table', async (req, res) => {
    try {
        const csv = await tournamentService.exportPointsTableCSV(req.params.id);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=points_table_${req.params.id}.csv`);
        res.status(200).send(csv);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.get('/:id/export/match-results', async (req, res) => {
    try {
        const csv = await tournamentService.exportMatchResultsCSV(req.params.id);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=match_results_${req.params.id}.csv`);
        res.status(200).send(csv);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.get('/:id/export/player-stats', async (req, res) => {
    try {
        const csv = await tournamentService.exportPlayerStatsCSV(req.params.id);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=player_stats_${req.params.id}.csv`);
        res.status(200).send(csv);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── FINANCIAL SUMMARY ────────────────────────────────────────────────
router.get('/:id/financial-summary', async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });

        const entryFee = tournament.entryFee || 0;
        const totalTeams = tournament.registeredTeams.length;
        const approvedTeams = tournament.registeredTeams.filter(t => t.approvalStatus === 'approved').length;
        const paidTeams = tournament.registeredTeams.filter(t => t.paymentStatus === 'paid').length;
        
        const totalRevenueCollected = paidTeams * entryFee;
        const potentialRevenue = approvedTeams * entryFee;

        res.json({
            success: true,
            financials: {
                entryFee,
                totalTeams,
                approvedTeams,
                paidTeams,
                totalRevenueCollected,
                potentialRevenue,
                prizePool: tournament.prizePool || 0
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
