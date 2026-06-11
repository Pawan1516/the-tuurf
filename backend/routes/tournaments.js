const express = require('express');
const router = express.Router();
const Tournament = require('../models/Tournament');
const Team = require('../models/Team');
const Match = require('../models/Match');
const User = require('../models/User');
const tournamentService = require('../services/tournamentService');
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

        // Check if already registered
        const existing = tournament.registeredTeams.find(t => t.team_id?.toString() === teamId);
        if (existing) return res.status(400).json({ success: false, message: 'Team already registered' });

        // Check capacity
        const approved = tournament.registeredTeams.filter(t => t.approvalStatus !== 'rejected').length;
        if (approved >= tournament.totalTeams) {
            return res.status(400).json({ success: false, message: 'Tournament is full' });
        }

        tournament.registeredTeams.push({
            team_id: teamId,
            approvalStatus: 'pending',
            paymentStatus: tournament.entryFee > 0 ? 'pending' : 'paid'
        });
        await tournament.save();
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

// ─── REJECT TEAM ────────────────────────────────────────────────────
router.post('/:id/reject-team', async (req, res) => {
    try {
        const { teamId, reason } = req.body;
        const tournament = await Tournament.findById(req.params.id);
        const team = tournament.registeredTeams.find(t => t.team_id?.toString() === teamId);
        if (!team) return res.status(404).json({ success: false, message: 'Team not found in tournament' });

        team.approvalStatus = 'rejected';
        await tournament.save();
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
router.post('/:id/matches/:matchId/generate-qr', async (req, res) => {
    try {
        const matchCode = qrService.generateMatchCode();
        const qrDataURL = await qrService.generateMatchQR(req.params.matchId, matchCode);

        // Save match code on match doc
        await Match.findByIdAndUpdate(req.params.matchId, { qrCode: matchCode, qrVerified: false });

        res.json({ success: true, qrDataURL, matchCode });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── VERIFY MATCH QR ─────────────────────────────────────────────────
router.post('/:id/matches/:matchId/verify-qr', async (req, res) => {
    try {
        const { qrData } = req.body;
        const result = qrService.verifyMatchQR(qrData, req.params.matchId);
        if (result.valid) {
            await Match.findByIdAndUpdate(req.params.matchId, { qrVerified: true });
        }
        res.json({ success: result.valid, ...result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
