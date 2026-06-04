const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const AgMatch = require('../models/AgMatch');
const AgBall = require('../models/AgBall');

// Helper for socket broadcast
const broadcastMatchUpdate = (req, matchId, eventType, payload) => {
    const io = req.app.get('socketio');
    if (io) {
        io.to(`ag_match_${matchId}`).emit(eventType, payload);
    }
};

// 1. Create Match
router.post('/create', async (req, res) => {
    try {
        const { name, maxOvers, ppOvers, teamA, teamB } = req.body;
        
        const matchId = `AG-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const token = crypto.randomBytes(4).toString('hex');
        const adminPin = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit PIN

        const match = new AgMatch({
            matchId,
            name: name || `${teamA} vs ${teamB}`,
            maxOvers: maxOvers || 20,
            ppOvers: ppOvers || 2,
            teamA: { name: teamA, players: [] },
            teamB: { name: teamB, players: [] },
            adminPin,
            token,
            status: 'CREATED'
        });

        await match.save();

        res.json({ success: true, matchId, token, adminPin });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2. Join Match
router.post('/:id/join', async (req, res) => {
    try {
        const { name, mobile, team, role } = req.body;
        const match = await AgMatch.findOne({ matchId: req.params.id });
        
        if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
        if (match.status !== 'CREATED') return res.status(400).json({ success: false, message: 'Match is already locked or started' });

        const playerObj = { name, mobile, role };
        
        if (team === 'A') {
            match.teamA.players.push(playerObj);
        } else if (team === 'B') {
            match.teamB.players.push(playerObj);
        } else {
            return res.status(400).json({ success: false, message: 'Invalid team selection' });
        }

        await match.save();
        
        broadcastMatchUpdate(req, match.matchId, 'player-joined', { teamA: match.teamA.players, teamB: match.teamB.players });

        res.json({ success: true, message: 'Joined successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. Lock Teams
router.post('/:id/lock', async (req, res) => {
    try {
        const match = await AgMatch.findOne({ matchId: req.params.id });
        if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
        
        match.status = 'LOCKED';
        await match.save();

        res.json({ success: true, matchUrl: `${process.env.PUBLIC_URL || 'http://localhost:3000'}/antigravity/match/${match.matchId}?token=${match.token}` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 4. Admin Unlock
router.post('/:id/unlock', async (req, res) => {
    try {
        const { adminPin } = req.body;
        const match = await AgMatch.findOne({ matchId: req.params.id });
        
        if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
        if (match.adminPin !== adminPin) return res.status(401).json({ success: false, message: 'Invalid PIN' });
        
        if (match.status === 'LOCKED') {
            match.status = 'UNLOCKED';
            await match.save();
            broadcastMatchUpdate(req, match.matchId, 'match-unlocked', { status: 'UNLOCKED' });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 5. Toss
router.post('/:id/toss', async (req, res) => {
    try {
        const { tossWinner, decision } = req.body; // tossWinner: 'teamA' or 'teamB', decision: 'Bat' or 'Bowl'
        const match = await AgMatch.findOne({ matchId: req.params.id });
        
        if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
        
        match.toss = { winner: tossWinner, decision };
        
        if ((tossWinner === 'teamA' && decision === 'Bat') || (tossWinner === 'teamB' && decision === 'Bowl')) {
            match.battingTeam = 'teamA';
            match.bowlingTeam = 'teamB';
        } else {
            match.battingTeam = 'teamB';
            match.bowlingTeam = 'teamA';
        }
        
        match.status = 'TOSS_DONE';
        await match.save();

        res.json({ success: true, battingTeam: match.battingTeam, bowlingTeam: match.bowlingTeam });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 6. Start Match (Select Openers)
router.post('/:id/start', async (req, res) => {
    try {
        const { striker, nonStriker, bowler } = req.body;
        const match = await AgMatch.findOne({ matchId: req.params.id });
        
        if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
        
        const innings1 = {
            number: 1,
            battingTeam: match.battingTeam,
            bowlingTeam: match.bowlingTeam,
            batters: [
                { id: striker.mobile, name: striker.name, isStriker: true },
                { id: nonStriker.mobile, name: nonStriker.name, isNonStriker: true }
            ],
            bowlers: [
                { id: bowler.mobile, name: bowler.name, isBowling: true }
            ]
        };
        
        match.innings.push(innings1);
        match.status = 'IN_PROGRESS';
        await match.save();

        broadcastMatchUpdate(req, match.matchId, 'match-start', { innings: match.innings[0] });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get Live Data
router.get('/:id/live', async (req, res) => {
    try {
        const match = await AgMatch.findOne({ matchId: req.params.id }).lean();
        if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
        
        const currentInnings = match.innings[match.innings.length - 1] || null;
        const ballHistory = await AgBall.find({ matchId: match.matchId }).sort({ createdAt: -1 }).limit(12).lean();

        res.json({ success: true, match, currentInnings, ballHistory });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// AGENTIC AI QR SCAN - AUTO START MATCH
router.post('/scan-qr', async (req, res) => {
    try {
        const { qrData } = req.body;
        // Assume qrData is JSON containing { matchId: "AG-XYZ123", token: "..." }
        let parsed;
        try {
            parsed = JSON.parse(qrData);
        } catch(e) {
            return res.status(400).json({ success: false, message: 'Invalid QR Format' });
        }

        const match = await AgMatch.findOne({ matchId: parsed.matchId });
        if (!match) return res.status(404).json({ success: false, message: 'Booking/Match not found' });

        if (match.status === 'IN_PROGRESS' || match.status === 'COMPLETED') {
            return res.status(400).json({ success: false, message: 'QR Already Used - Match is Live' });
        }

        // Agentic Action: Approve and Auto-Start
        match.status = 'IN_PROGRESS';
        
        // Auto-assign teams if empty
        if (match.innings.length === 0) {
            match.battingTeam = 'teamA';
            match.bowlingTeam = 'teamB';
            match.innings.push({
                number: 1,
                battingTeam: 'teamA',
                bowlingTeam: 'teamB',
                batters: [],
                bowlers: []
            });
        }
        
        await match.save();
        broadcastMatchUpdate(req, match.matchId, 'match-unlocked', { status: 'IN_PROGRESS' });

        res.json({ success: true, message: 'Match Started ✅', matchId: match.matchId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
