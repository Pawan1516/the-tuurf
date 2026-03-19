const express = require('express');
const router = express.Router();
const Tournament = require('../models/Tournament');
const verifyToken = require('../middleware/verifyToken');
const roleGuard = require('../middleware/roleGuard');

/**
 * @route   POST /api/tournaments
 * @desc    Create a new tournament
 * @access  Private (ADMIN)
 */
router.post('/', verifyToken, roleGuard(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    try {
        const { name, format, start_date, end_date, entry_fee, prize_pool } = req.body;

        if (!name || !format || !start_date) {
            return res.status(400).json({ success: false, message: 'Tournament specs required.' });
        }

        const tournament = new Tournament({
            name,
            format,
            start_date,
            end_date,
            entry_fee,
            prize_pool
        });

        await tournament.save();
        res.status(201).json({ success: true, tournament });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * @route   GET /api/tournaments
 * @desc    Get all active tournaments
 * @access  Public
 */
router.get('/', async (req, res) => {
    try {
        const tournaments = await Tournament.find({ status: { $ne: 'Cancelled' } }).sort({ start_date: 1 });
        res.json({ success: true, tournaments });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * @route   POST /api/tournaments/:id/register
 * @desc    Register a team for a tournament
 * @access  Private (CAPTAIN)
 */
router.post('/:id/register', verifyToken, roleGuard(['CAPTAIN', 'ADMIN']), async (req, res) => {
    try {
        const { team_id } = req.body;
        const tournament = await Tournament.findById(req.params.id);
        
        if (!tournament) return res.status(404).json({ success: false, message: 'Arena variant not found.' });
        if (tournament.status !== 'Upcoming' && tournament.status !== 'Registration Open') {
            return res.status(400).json({ success: false, message: 'Registry window is closed for this tournament.' });
        }

        // Check if already registered
        const isRegistered = tournament.teams.find(t => t.team_id.toString() === team_id);
        if (isRegistered) return res.status(400).json({ success: false, message: 'Team already rostered for this event.' });

        tournament.teams.push({
            team_id,
            entry_fee_paid: false,
            registration_status: 'Pending'
        });

        await tournament.save();
        res.json({ success: true, message: 'Team variant registration request received.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
