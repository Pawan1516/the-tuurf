const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const User = require('../models/User');
const qrService = require('../services/qrService');

// Middleware placeholder (use existing verifyToken if available)
let verifyToken;
try {
    verifyToken = require('../middleware/verifyToken');
} catch (e) {
    verifyToken = (req, res, next) => next(); // fallback
}

// ─── CREATE TEAM ─────────────────────────────────────────────────────
// POST /api/teams/create
router.post('/create', verifyToken, async (req, res) => {
    try {
        const {
            name, shortName, city, logo, jersey, contactNumber, contactEmail,
            primaryColor, captainId
        } = req.body;

        if (!name) return res.status(400).json({ success: false, message: 'Team name is required' });

        const existing = await Team.findOne({ name });
        if (existing) return res.status(400).json({ success: false, message: 'Team name already taken' });

        const captainUserId = captainId || req.user?.id;

        const team = new Team({
            name,
            shortName: shortName || name.substring(0, 3).toUpperCase(),
            city,
            logo,
            jersey,
            contactNumber,
            contactEmail,
            primaryColor,
            captain: captainUserId,
            createdBy: req.user?.id,
            players: captainUserId ? [{
                user_id: captainUserId,
                name: req.body.captainName || 'Captain',
                mobile: contactNumber,
                role: 'All-rounder',
                status: 'active'
            }] : []
        });

        await team.save();

        // Generate QR code for team
        const qrDataURL = await qrService.generateTeamQR(team._id.toString(), team.joinCode);
        team.qrCode = qrDataURL;
        await team.save();

        res.status(201).json({
            success: true,
            team: {
                ...team.toObject(),
                teamCode: team.teamCode,
                joinCode: team.joinCode,
                qrCode: team.qrCode
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── LIST ALL TEAMS ──────────────────────────────────────────────────
// GET /api/teams
router.get('/', async (req, res) => {
    try {
        const { city, search, limit = 20, page = 1 } = req.query;
        const filter = {};
        if (city) filter.city = new RegExp(city, 'i');
        if (search) filter.name = new RegExp(search, 'i');

        const teams = await Team.find(filter)
            .populate('captain', 'name avatar')
            .select('-qrCode -joinCode -pendingRequests')
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Team.countDocuments(filter);
        res.json({ success: true, teams, total });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── LOOKUP USER BY MOBILE ────────────────────────────────────────────
// GET /api/teams/lookup-mobile?phone=XXXXXXXXXX
router.get('/lookup-mobile', async (req, res) => {
    try {
        const { phone } = req.query;
        if (!phone) return res.status(400).json({ success: false, message: 'Phone is required' });
        const cleanPhone = phone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
        const user = await User.findOne({ $or: [{ phone: cleanPhone }, { mobileNumber: cleanPhone }] })
            .select('name phone mobileNumber avatar cricket_profile');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── GET TEAM BY ID ──────────────────────────────────────────────────
// GET /api/teams/:id
router.get('/:id', async (req, res) => {
    try {
        const team = await Team.findById(req.params.id)
            .populate('captain', 'name avatar phone')
            .populate('viceCaptain', 'name avatar')
            .populate('players.user_id', 'name avatar phone');

        if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
        res.json({ success: true, team });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── GET TEAM BY JOIN CODE ───────────────────────────────────────────
// GET /api/teams/by-code/:joinCode
router.get('/by-code/:joinCode', async (req, res) => {
    try {
        const team = await Team.findOne({ joinCode: req.params.joinCode })
            .populate('captain', 'name avatar')
            .select('-qrCode -pendingRequests');
        if (!team) return res.status(404).json({ success: false, message: 'Invalid join code' });
        res.json({ success: true, team });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── REQUEST TO JOIN TEAM (via QR or join code) ──────────────────────
// POST /api/teams/:id/request-join
router.post('/:id/request-join', verifyToken, async (req, res) => {
    try {
        const { joinCode, userName, userMobile, role } = req.body;
        const userId = req.user?.id;

        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

        // Validate join code
        if (joinCode && team.joinCode !== joinCode) {
            return res.status(400).json({ success: false, message: 'Invalid join code' });
        }

        // Check already a member
        const isMember = team.players.some(p => p.user_id?.toString() === userId);
        if (isMember) return res.status(400).json({ success: false, message: 'Already a team member' });

        // Check already has pending request
        const hasPending = team.pendingRequests.some(
            r => r.user_id?.toString() === userId && r.status === 'pending'
        );
        if (hasPending) return res.status(400).json({ success: false, message: 'Join request already pending' });

        // Check team capacity
        if (team.players.length >= 25) {
            return res.status(400).json({ success: false, message: 'Team is full (max 25 players)' });
        }

        team.pendingRequests.push({
            user_id: userId,
            name: userName,
            mobile: userMobile,
            status: 'pending',
            requestedAt: new Date()
        });

        await team.save();
        res.json({ success: true, message: 'Join request sent to captain' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── APPROVE PLAYER ──────────────────────────────────────────────────
// POST /api/teams/:id/approve-player
router.post('/:id/approve-player', verifyToken, async (req, res) => {
    try {
        const { requestId, role } = req.body;
        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

        const request = team.pendingRequests.id(requestId);
        if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

        if (team.players.length >= 25) {
            return res.status(400).json({ success: false, message: 'Team is full' });
        }

        request.status = 'approved';
        team.players.push({
            user_id: request.user_id,
            name: request.name,
            mobile: request.mobile,
            role: role || 'All-rounder',
            status: 'active',
            joinedAt: new Date()
        });

        await team.save();
        res.json({ success: true, message: 'Player approved and added to squad' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── REJECT PLAYER ───────────────────────────────────────────────────
// POST /api/teams/:id/reject-player
router.post('/:id/reject-player', verifyToken, async (req, res) => {
    try {
        const { requestId } = req.body;
        const team = await Team.findById(req.params.id);
        const request = team.pendingRequests.id(requestId);
        if (request) request.status = 'rejected';
        await team.save();
        res.json({ success: true, message: 'Player request rejected' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── GET PENDING JOIN REQUESTS (Captain only) ────────────────────────
// GET /api/teams/:id/requests
router.get('/:id/requests', verifyToken, async (req, res) => {
    try {
        const team = await Team.findById(req.params.id)
            .populate('pendingRequests.user_id', 'name avatar phone');
        if (!team) return res.status(404).json({ success: false, message: 'Not found' });

        const pending = team.pendingRequests.filter(r => r.status === 'pending');
        res.json({ success: true, requests: pending });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── UPDATE PLAYER ROLE ──────────────────────────────────────────────
// PUT /api/teams/:id/players/:playerId/role
router.put('/:id/players/role', verifyToken, async (req, res) => {
    try {
        const { userId, role, jerseyNumber, battingStyle, bowlingStyle } = req.body;
        const team = await Team.findById(req.params.id);
        const player = team.players.find(p => p.user_id?.toString() === userId);
        if (!player) return res.status(404).json({ success: false, message: 'Player not found in squad' });

        if (role) player.role = role;
        if (jerseyNumber !== undefined) player.jerseyNumber = jerseyNumber;
        if (battingStyle) player.battingStyle = battingStyle;
        if (bowlingStyle) player.bowlingStyle = bowlingStyle;

        await team.save();
        res.json({ success: true, message: 'Player role updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── SET CAPTAIN / VICE CAPTAIN ──────────────────────────────────────
// PUT /api/teams/:id/leadership
router.put('/:id/leadership', verifyToken, async (req, res) => {
    try {
        const { captainId, viceCaptainId } = req.body;
        const update = {};
        if (captainId) update.captain = captainId;
        if (viceCaptainId) update.viceCaptain = viceCaptainId;
        const team = await Team.findByIdAndUpdate(req.params.id, update, { new: true });
        res.json({ success: true, team });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── REMOVE PLAYER ───────────────────────────────────────────────────
// DELETE /api/teams/:id/players/:userId
router.delete('/:id/players/:userId', verifyToken, async (req, res) => {
    try {
        const team = await Team.findById(req.params.id);
        team.players = team.players.filter(p => p.user_id?.toString() !== req.params.userId);
        await team.save();
        res.json({ success: true, message: 'Player removed from squad' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── REGENERATE QR CODE ──────────────────────────────────────────────
// POST /api/teams/:id/regenerate-qr
router.post('/:id/regenerate-qr', verifyToken, async (req, res) => {
    try {
        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ success: false, message: 'Not found' });

        const qrDataURL = await qrService.generateTeamQR(team._id.toString(), team.joinCode);
        team.qrCode = qrDataURL;
        await team.save();

        res.json({ success: true, qrCode: qrDataURL, joinCode: team.joinCode });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── UPDATE TEAM ─────────────────────────────────────────────────────
// PUT /api/teams/:id
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const allowed = ['name', 'shortName', 'city', 'logo', 'jersey', 'primaryColor', 'contactNumber', 'contactEmail'];
        const update = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) update[key] = req.body[key];
        }
        const team = await Team.findByIdAndUpdate(req.params.id, update, { new: true });
        res.json({ success: true, team });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── ADD PLAYER BY MOBILE NUMBER ─────────────────────────────────────
// POST /api/teams/:id/add-by-mobile
router.post('/:id/add-by-mobile', verifyToken, async (req, res) => {
    try {
        const { mobile, role, jerseyNumber } = req.body;
        if (!mobile) return res.status(400).json({ success: false, message: 'Mobile number is required' });

        // Clean mobile to 10 digits
        const cleanMobile = mobile.replace(/\D/g, '').replace(/^91/, '').slice(-10);
        if (cleanMobile.length !== 10) {
            return res.status(400).json({ success: false, message: 'Enter a valid 10-digit mobile number' });
        }

        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

        if (team.players.length >= 25) {
            return res.status(400).json({ success: false, message: 'Team is full (max 25 players)' });
        }

        // Find user by phone or mobileNumber
        const user = await User.findOne({ $or: [{ phone: cleanMobile }, { mobileNumber: cleanMobile }] })
            .select('name phone mobileNumber avatar cricket_profile');

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'No player found with this mobile number. Ask them to register on the app first.' 
            });
        }

        // Check already a team member
        const isMember = team.players.some(p => p.user_id?.toString() === user._id.toString());
        if (isMember) return res.status(400).json({ success: false, message: 'Player is already in the squad' });

        // Add directly to squad
        team.players.push({
            user_id: user._id,
            name: user.name,
            mobile: cleanMobile,
            role: role || 'All-rounder',
            jerseyNumber: jerseyNumber || undefined,
            status: 'active',
            joinedAt: new Date()
        });

        await team.save();
        res.json({ success: true, message: `${user.name} added to squad!`, player: { name: user.name, mobile: cleanMobile, role } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── LEGACY: Join by invite code ────────────────────────────────────
router.post('/join/:code', verifyToken, async (req, res) => {
    try {
        const team = await Team.findOne({ joinCode: req.params.code.toUpperCase() });
        if (!team) return res.status(404).json({ success: false, message: 'Invalid join code.' });
        res.json({ success: true, team: { _id: team._id, name: team.name, logo: team.logo, city: team.city } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── ADD PLAYER (Legacy endpoint) ──────────────────────────────────────
// POST /api/teams/:id/players/add
router.post('/:id/players/add', verifyToken, async (req, res) => {
    // Reuse add-by-mobile logic
    const { mobile, role, jerseyNumber } = req.body;
    if (!mobile) return res.status(400).json({ success: false, message: 'Mobile number is required' });

    const cleanMobile = mobile.replace(/\D/g, '').replace(/^91/, '').slice(-10);
    if (cleanMobile.length !== 10) {
        return res.status(400).json({ success: false, message: 'Enter a valid 10-digit mobile number' });
    }

    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    if (team.players.length >= 25) {
        return res.status(400).json({ success: false, message: 'Team is full (max 25 players)' });
    }

    const user = await User.findOne({ $or: [{ phone: cleanMobile }, { mobileNumber: cleanMobile }] })
        .select('name phone mobileNumber avatar cricket_profile');

    if (!user) {
        return res.status(404).json({ success: false, message: 'No player found with this mobile number. Ask them to register on the app first.' });
    }

    const isMember = team.players.some(p => p.user_id?.toString() === user._id.toString());
    if (isMember) return res.status(400).json({ success: false, message: 'Player is already in the squad' });

    team.players.push({
        user_id: user._id,
        name: user.name,
        mobile: cleanMobile,
        role: role || 'All-rounder',
        jerseyNumber: jerseyNumber || undefined,
        status: 'active',
        joinedAt: new Date()
    });

    await team.save();
    res.json({ success: true, message: `${user.name} added to squad!`, player: { name: user.name, mobile: cleanMobile, role } });
});

module.exports = router;
