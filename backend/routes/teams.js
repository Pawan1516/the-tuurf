const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const User = require('../models/User');
const qrService = require('../services/qrService');
const llmClient = require('../services/llmClient');

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

        // Generate URL-based QR code for team (Google Lens compatible)
        const qrDataURL = await qrService.generateTeamQR(team._id.toString(), team.joinCode, null);
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
        const digits = (phone || '').replace(/\D/g, '');
        const cleanPhone = (digits.length === 12 && digits.startsWith('91')) 
            ? digits.slice(2) 
            : (digits.length === 11 && digits.startsWith('0')) 
                ? digits.slice(1) 
                : digits.slice(-10);
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

// ─── GET TEAM BY JOIN CODE (or teamCode) ────────────────────────────
// GET /api/teams/by-code/:joinCode
// Public endpoint used by QR landing page - no auth required
router.get('/by-code/:joinCode', async (req, res) => {
    try {
        // Support both joinCode (TEAM_JOIN_1025) and teamCode (TEAM-ID-1025)
        const code = req.params.joinCode;
        const team = await Team.findOne({ $or: [{ joinCode: code }, { teamCode: code }] })
            .populate('captain', 'name avatar phone')
            .select('-qrCode -pendingRequests');
        if (!team) return res.status(404).json({ success: false, message: 'Invalid join code' });
        res.json({ success: true, team });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── PUBLIC QR JOIN INFO ─────────────────────────────────────────────
// GET /api/teams/qr-info/:joinCode
// Used by the public QR landing page - returns team info + AI welcome message
router.get('/qr-info/:joinCode', async (req, res) => {
    try {
        const code = req.params.joinCode;
        const team = await Team.findOne({ $or: [{ joinCode: code }, { teamCode: code }] })
            .populate('captain', 'name avatar')
            .select('name shortName city logo primaryColor captain players stats joinCode teamCode qrCode');
        if (!team) return res.status(404).json({ success: false, message: 'Team not found. Check your QR code.' });

        // Self-heal: generate QR code if missing
        if (!team.qrCode) {
            team.qrCode = await qrService.generateTeamQR(team._id.toString(), team.joinCode, null);
            await team.save();
        }

        // Return team info with AI-powered welcome context
        const playerCount = team.players?.length || 0;
        const spotsLeft = 25 - playerCount;
        const winRate = team.stats?.matches > 0
            ? Math.round((team.stats.wins / team.stats.matches) * 100)
            : 0;

        const aiMessage = await generateAIWelcome(team, playerCount, spotsLeft, winRate);

        res.json({
            success: true,
            team: {
                _id: team._id,
                name: team.name,
                shortName: team.shortName,
                city: team.city,
                logo: team.logo,
                primaryColor: team.primaryColor,
                captain: team.captain,
                playerCount,
                spotsLeft,
                joinCode: team.joinCode,
                teamCode: team.teamCode,
                stats: team.stats,
                winRate
            },
            aiMessage
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Helper: AI-powered welcome message for QR join landing
async function generateAIWelcome(team, playerCount, spotsLeft, winRate) {
    const prompt = `You are a charismatic cricket club manager and team recruiter for "The Turf" platform.
Generate a short, engaging, 1-2 sentence welcome message inviting players to join the team "${team.name}" (based in ${team.city || 'local city'}).
Context:
- Team Name: ${team.name}
- Captain: ${team.captain?.name || 'our captain'}
- Players in squad: ${playerCount}/25
- Spots remaining: ${spotsLeft}
- Team Win Rate: ${winRate}%
Make it sound premium, competitive, and welcoming. Do not use generic placeholders. Keep it under 180 characters.`;

    try {
        const reply = await llmClient.generateChat([
            { role: 'user', content: prompt }
        ], { maxTokens: 80 });
        if (reply) return reply.trim();
    } catch (err) {
        console.warn('AI welcome generation failed, using fallback:', err.message);
    }

    const msgs = [
        `🏏 Welcome to ${team.name}! We're ${playerCount} strong with ${spotsLeft} spots remaining.`,
        `⚡ ${team.name} is on fire! Win rate: ${winRate}%. Join the winning squad!`,
        `🌟 ${team.name} is looking for elite players. ${spotsLeft} spots left — claim yours now!`,
        `🔥 The ${team.name} squad needs you! ${playerCount} warriors. ${spotsLeft} spots open.`
    ];
    if (winRate >= 70) return `🏆 ${team.name} is a powerhouse with ${winRate}% win rate! ${spotsLeft} spots left. Don't miss out!`;
    if (playerCount >= 20) return `⚡ ${team.name} is almost full! Only ${spotsLeft} spots remaining. Join now!`;
    return msgs[Math.floor(Math.random() * msgs.length)];
}

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
// Generates URL-based QR that Google Lens can scan and directly open the site
router.post('/:id/regenerate-qr', verifyToken, async (req, res) => {
    try {
        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ success: false, message: 'Not found' });

        const { tournamentId } = req.query;
        const qrDataURL = await qrService.generateTeamQR(team._id.toString(), team.joinCode, tournamentId || null);
        team.qrCode = qrDataURL;
        team.qrUpdatedAt = new Date();
        await team.save();

        res.json({
            success: true,
            qrCode: qrDataURL,
            joinCode: team.joinCode,
            teamCode: team.teamCode,
            joinUrl: `${qrService.FRONTEND_URL}/join/team/${team.joinCode}`,
            updatedAt: team.qrUpdatedAt
        });
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
        if (!mobile) return res.status(400).json({ success: false, message: 'Identifier is required' });

        let user;
        let cleanMobile = '';

        if (mobile.startsWith('@')) {
            const searchName = mobile.slice(1).trim();
            user = await User.findOne({ name: { $regex: new RegExp(`^${searchName}$`, 'i') } })
                .select('name phone mobileNumber avatar cricket_profile');
            
            if (!user) {
                return res.status(404).json({ success: false, message: `No player found with username @${searchName}.` });
            }
            cleanMobile = user.phone || user.mobileNumber || '';
        } else {
            // Clean mobile to 10 digits robustly
            const digits = (mobile || '').replace(/\D/g, '');
            cleanMobile = (digits.length === 12 && digits.startsWith('91')) 
                ? digits.slice(2) 
                : (digits.length === 11 && digits.startsWith('0')) 
                    ? digits.slice(1) 
                    : digits.slice(-10);
            if (cleanMobile.length !== 10) {
                return res.status(400).json({ success: false, message: 'Enter a valid 10-digit mobile number or @username' });
            }

            user = await User.findOne({ $or: [{ phone: cleanMobile }, { mobileNumber: cleanMobile }] })
                .select('name phone mobileNumber avatar cricket_profile');

            if (!user) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'No player found with this mobile number. Ask them to register on the app first.' 
                });
            }
        }

        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

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
    try {
        const { mobile, role, jerseyNumber } = req.body;
        if (!mobile) return res.status(400).json({ success: false, message: 'Identifier is required' });

        let user;
        let cleanMobile = '';

        if (mobile.startsWith('@')) {
            const searchName = mobile.slice(1).trim();
            user = await User.findOne({ name: { $regex: new RegExp(`^${searchName}$`, 'i') } })
                .select('name phone mobileNumber avatar cricket_profile');
            
            if (!user) {
                return res.status(404).json({ success: false, message: `No player found with username @${searchName}.` });
            }
            cleanMobile = user.phone || user.mobileNumber || '';
        } else {
            const digits = (mobile || '').replace(/\D/g, '');
            cleanMobile = (digits.length === 12 && digits.startsWith('91')) 
                ? digits.slice(2) 
                : (digits.length === 11 && digits.startsWith('0')) 
                    ? digits.slice(1) 
                    : digits.slice(-10);
            if (cleanMobile.length !== 10) {
                return res.status(400).json({ success: false, message: 'Enter a valid 10-digit mobile number or @username' });
            }

            user = await User.findOne({ $or: [{ phone: cleanMobile }, { mobileNumber: cleanMobile }] })
                .select('name phone mobileNumber avatar cricket_profile');

            if (!user) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'No player found with this mobile number. Ask them to register on the app first.' 
                });
            }
        }

        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

        if (team.players.length >= 25) {
            return res.status(400).json({ success: false, message: 'Team is full (max 25 players)' });
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
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


// ─── MIDDLEWARE: require ADMIN role ──────────────────────────────────
const requireAdmin = (req, res, next) => {
    const role = (req.user?.role || '').toUpperCase();
    if (role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Admin access required.' });
    }
    next();
};

// ─── MIDDLEWARE: require team OWNER or ADMIN ─────────────────────────
const requireOwnerOrAdmin = async (req, res, next) => {
    try {
        const role = (req.user?.role || '').toUpperCase();
        if (role === 'ADMIN') return next(); // Admins bypass ownership check

        const team = await Team.findById(req.params.id).select('captain createdBy');
        if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

        const userId = req.user?.id;
        const isOwner =
            team.captain?.toString() === userId ||
            team.createdBy?.toString() === userId;

        if (!isOwner) {
            return res.status(403).json({ success: false, message: 'Only the team owner or admin can perform this action.' });
        }
        next();
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── ADMIN: LIST ALL TEAMS ───────────────────────────────────────────
// GET /api/teams/admin/all
router.get('/admin/all', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { search, limit = 50, page = 1 } = req.query;
        const filter = {};
        if (search) filter.name = new RegExp(search, 'i');

        const teams = await Team.find(filter)
            .populate('captain', 'name phone avatar')
            .populate('createdBy', 'name phone')
            .select('name shortName city logo primaryColor captain createdBy players stats teamCode joinCode createdAt')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Team.countDocuments(filter);
        const totalPlayers = teams.reduce((sum, t) => sum + (t.players?.length || 0), 0);

        res.json({ success: true, teams, total, totalPlayers });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── ADMIN: DELETE ANY TEAM ──────────────────────────────────────────
// DELETE /api/teams/admin/:id
router.delete('/admin/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

        const teamName = team.name;
        await Team.findByIdAndDelete(req.params.id);

        console.log(`[ADMIN] Team "${teamName}" deleted by admin ${req.user?.id}`);
        res.json({ success: true, message: `Team "${teamName}" has been permanently deleted.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── ADMIN: DELETE ANY PLAYER FROM ANY TEAM ─────────────────────────
// DELETE /api/teams/admin/:id/players/:userId
router.delete('/admin/:id/players/:userId', verifyToken, requireAdmin, async (req, res) => {
    try {
        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

        const before = team.players.length;
        team.players = team.players.filter(p => p.user_id?.toString() !== req.params.userId);

        if (team.players.length === before) {
            return res.status(404).json({ success: false, message: 'Player not found in this team' });
        }

        await team.save();
        console.log(`[ADMIN] Player ${req.params.userId} removed from team ${req.params.id} by admin ${req.user?.id}`);
        res.json({ success: true, message: 'Player removed from squad by admin.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── OWNER OR ADMIN: REMOVE PLAYER (enhanced existing) ───────────────
// DELETE /api/teams/:id/players/remove/:userId
// This is an enhanced version that enforces owner or admin check
router.delete('/:id/players/remove/:userId', verifyToken, requireOwnerOrAdmin, async (req, res) => {
    try {
        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

        const before = team.players.length;
        team.players = team.players.filter(p => p.user_id?.toString() !== req.params.userId);

        if (team.players.length === before) {
            return res.status(404).json({ success: false, message: 'Player not found in this team' });
        }

        await team.save();
        res.json({ success: true, message: 'Player removed from squad.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── OWNER: GET TEAM QR CODE ──────────────────────────────────────────
// GET /api/teams/:id/qr-code
router.get('/:id/qr-code', verifyToken, async (req, res) => {
    try {
        const team = await Team.findById(req.params.id).select('captain createdBy qrCode joinCode teamCode name');
        if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

        // Allow owner or admin
        const role = (req.user?.role || '').toUpperCase();
        const userId = req.user?.id;
        const isOwner = team.captain?.toString() === userId || team.createdBy?.toString() === userId;

        if (role !== 'ADMIN' && !isOwner) {
            return res.status(403).json({ success: false, message: 'Only the team owner or admin can view the QR code.' });
        }

        // Self-heal: generate QR if missing
        if (!team.qrCode) {
            const qrDataURL = await qrService.generateTeamQR(team._id.toString(), team.joinCode, null);
            team.qrCode = qrDataURL;
            team.qrUpdatedAt = new Date();
            await team.save();
        }

        res.json({
            success: true,
            qrCode: team.qrCode,
            joinCode: team.joinCode,
            teamCode: team.teamCode,
            joinUrl: `${qrService.FRONTEND_URL}/join/team/${team.joinCode}`
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;

