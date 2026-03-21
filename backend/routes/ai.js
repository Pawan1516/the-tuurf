const express = require('express');
const router = express.Router();
const AIService = require('../services/aiService');
const Match = require('../models/Match');
const User = require('../models/User');
const verifyToken = require('../middleware/verifyToken');

// @route   POST /api/ai/commentary
// @desc    Generate ball commentary
// @access  Private (Scorer/Admin)
router.post('/commentary', verifyToken, async (req, res) => {
    try {
        const { ball, batsman, bowler, match, situation } = req.body;
        const commentary = await AIService.generateCommentary({ ball, batsman, bowler, match, situation });
        res.json({ success: true, commentary });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/ai/chat
// @desc    TurfBot chat interaction
// @access  Private
router.post('/chat', verifyToken, async (req, res) => {
    try {
        const { message, conversationHistory = [] } = req.body;
        
        const user = await User.findById(req.user.id);
        const userContext = {
            name: user.name,
            stats: user.stats,
            cricket_profile: user.cricket_profile,
            teams_count: user.teams.length
        };

        const reply = await AIService.turfBotChat(message, conversationHistory, userContext);
        res.json({ success: true, reply });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   GET /api/ai/post-match/:matchId/:uid
// @desc    Individual post-match report
// @access  Private
router.get('/post-match/:matchId/:uid', verifyToken, async (req, res) => {
    try {
        const match = await Match.findById(req.params.matchId);
        const player = await User.findById(req.params.uid);
        
        if (!match || !player) return res.status(404).json({ success: false, message: 'Entity not found.' });

        // Extract player specific stats for this match (Placeholder logic)
        const playerMatchData = {
            runs: 34,
            balls: 21,
            wickets: 2,
            moment: 'Stumped at over 15'
        };

        const report = await AIService.generatePostMatchReport(match, playerMatchData);
        res.json({ success: true, report });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
