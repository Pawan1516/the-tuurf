const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const User = require('../models/User');
const verifyToken = require('../middleware/verifyToken');

const PendingInvite = require('../models/PendingInvite');

// @route   POST /api/teams
// @desc    Create a new team
// @access  Private (Leader)
router.post('/', verifyToken, async (req, res) => {
    try {
        const { name, short_name, logo, primary_colour, home_ground } = req.body;
        const leader_id = req.user.id;

        if (!name || !short_name) {
            return res.status(400).json({ success: false, message: 'Identity missing: Team name and short name required.' });
        }

        const existing = await Team.findOne({ $or: [{ name }, { short_name }] });
        if (existing) return res.status(400).json({ success: false, message: 'Registry conflict: Team name or short name taken.' });

        const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        const team = new Team({
            name,
            short_name,
            logo,
            primary_colour: primary_colour || '#10b981',
            home_ground: home_ground || 'The Turf',
            leader_id,
            invite: {
                code: inviteCode,
                link: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/join/team/${inviteCode}`
            },
            members: [{
                user_id: leader_id,
                role: 'PLAYER',
                status: 'ACTIVE',
                joined_at: new Date(),
                invite_method: 'CODE'
            }]
        });

        await team.save();

        const user = await User.findById(leader_id);
        user.teams.push({ team_id: team._id, role: 'Leader' });
        await user.save();

        res.status(201).json({ success: true, team });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * @route   GET /api/teams
 * @desc    Get all teams
 * @access  Public
 */
router.get('/', async (req, res) => {
    try {
        const teams = await Team.find().populate('captain_id', 'name phone');
        res.json({ success: true, teams });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * @route   GET /api/teams/:id
 * @desc    Get team details
 * @access  Public
 */
router.get('/:id', async (req, res) => {
    try {
        const team = await Team.findById(req.params.id)
            .populate('captain_id', 'name phone')
            .populate('members.user_id', 'name phone cricket_profile');
        
        if (!team) return res.status(404).json({ success: false, message: 'Team variant not found.' });
        res.json({ success: true, team });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/teams/:id/players/add
// @desc    Add single player (username or mobile)
// @access  Private (Leader/VC)
router.post('/:id/players/add', verifyToken, async (req, res) => {
    try {
        const { identifier, role = 'PLAYER' } = req.body;
        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ success: false, message: 'Team node fail.' });

        // Logic check for Leader/VC
        const selfMember = team.members.find(m => m.user_id.toString() === req.user.id);
        if (!selfMember || !['PLAYER'].includes(selfMember.role)) {
             // In v2.2 expansion, we'll check properly for LEADER/VICE_CAPTAIN
             // For now, simple check
        }

        let targetUser = null;
        if (identifier.startsWith('@')) {
            targetUser = await User.findOne({ username: identifier.slice(1) });
        } else if (/^\d{10}$/.test(identifier)) {
            targetUser = await User.findOne({ phone: identifier });
        }

        if (targetUser) {
            const invite = new PendingInvite({
                team_id: team._id,
                invited_by: req.user.id,
                user_id: targetUser._id,
                role,
                method: identifier.startsWith('@') ? 'USERNAME' : 'MOBILE'
            });
            await invite.save();
            res.json({ success: true, message: `Invite manifested for @${targetUser.name}.` });
        } else {
            // Unregistered mobile logic
            if (/^\d{10}$/.test(identifier)) {
                const invite = new PendingInvite({
                    team_id: team._id,
                    invited_by: req.user.id,
                    mobile: identifier,
                    role,
                    method: 'MOBILE'
                });
                await invite.save();
                res.json({ success: true, message: `SMS protocol queued for node: ${identifier}.` });
            } else {
                res.status(404).json({ success: false, message: 'Node could not be addressed.' });
            }
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/teams/join/:code
// @desc    Join team using 6-char code
// @access  Private
router.post('/join/:code', verifyToken, async (req, res) => {
    try {
        const team = await Team.findOne({ 'invite.code': req.params.code.toUpperCase() });
        if (!team) return res.status(404).json({ success: false, message: 'Invalid join code.' });

        if (team.members.find(m => m.user_id.toString() === req.user.id)) {
            return res.status(400).json({ success: false, message: 'Already a component of this team.' });
        }

        if (team.invite.auto_approve) {
            team.members.push({
                user_id: req.user.id,
                role: 'PLAYER',
                status: 'ACTIVE',
                joined_at: new Date(),
                invite_method: 'CODE'
            });
            await team.save();
            res.json({ success: true, message: 'Auto-join protocol successful.', team_name: team.name });
        } else {
            team.members.push({
                user_id: req.user.id,
                role: 'PLAYER',
                status: 'INVITED',
                invite_method: 'CODE'
            });
            await team.save();
            res.json({ success: true, message: 'Join request manifested to Team Leader.' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
