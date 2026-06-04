const express = require('express');
const router = express.Router();
const Tournament = require('../models/Tournament');
const Team = require('../models/Team');
const Match = require('../models/Match');

// List Tournaments
router.get('/list', async (req, res) => {
    try {
        const tournaments = await Tournament.find().populate('organizer').sort({ createdAt: -1 });
        res.json({ success: true, tournaments });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Create Tournament
router.post('/create', async (req, res) => {
    try {
        const tournament = new Tournament(req.body);
        await tournament.save();
        res.json({ success: true, tournament });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Register Team to Tournament
router.post('/:id/register-team', async (req, res) => {
    try {
        const { teamId } = req.body;
        const tournament = await Tournament.findById(req.params.id);
        
        if (tournament.registeredTeams.length >= tournament.totalTeams) {
            return res.status(400).json({ success: false, message: "Tournament full" });
        }
        
        tournament.registeredTeams.push({ team_id: teamId });
        await tournament.save();
        res.json({ success: true, tournament });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Schedule Matches (League - Round Robin)
router.post('/:id/schedule', async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);
        if (tournament.matchType !== 'league') return res.status(400).json({ message: "Only league scheduling supported for now." });

        const teams = tournament.registeredTeams.map(t => t.team_id);
        const matches = [];

        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                const match = new Match({
                    title: `${tournament.name}: Match ${matches.length + 1}`,
                    tournament: tournament._id,
                    team_a: { team_id: teams[i] },
                    team_b: { team_id: teams[j] },
                    overs: tournament.oversPerMatch,
                    status: 'Pending'
                });
                await match.save();
                matches.push(match._id);
            }
        }

        tournament.matches = matches;
        tournament.status = 'ongoing';
        await tournament.save();
        
        res.json({ success: true, matches_count: matches.length });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get Points Table
router.get('/:id/points-table', async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id).populate('registeredTeams.team_id');
        const sorted = tournament.registeredTeams.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            return b.nrr - a.nrr;
        });
        res.json({ success: true, table: sorted });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
