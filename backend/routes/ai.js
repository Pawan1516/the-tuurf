const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const Match = require('../models/Match');
const verifyToken = require('../middleware/verifyToken');
const roleGuard = require('../middleware/roleGuard');

// GET /api/ai/specialist?q=...&matchId=...
router.get('/specialist', verifyToken, async (req, res) => {
    try {
        const { q, matchId } = req.query;
        const answer = await aiService.getSpecialistInsight(q, matchId);
        res.json({ success: true, answer });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/ai/analysis/:matchId
router.get('/analysis/:matchId', verifyToken, async (req, res) => {
    try {
        const analysis = await aiService.getMatchAnalysis(req.params.matchId);
        res.json({ success: true, analysis });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/ai/prediction/:matchId
router.get('/prediction/:matchId', verifyToken, async (req, res) => {
    try {
        const prediction = await aiService.getWinPrediction(req.params.matchId);
        res.json({ success: true, prediction });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/ai/business (Admin only)
router.get('/business', verifyToken, roleGuard(['admin']), async (req, res) => {
    try {
        const insights = await aiService.getBusinessInsights();
        res.json({ success: true, insights });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/ai/expert-hub
// Aggregates specialist, analyst, prediction, and business insights into one payload
router.get('/expert-hub', verifyToken, async (req, res) => {
    try {
        // Prefer an in-progress match, otherwise the latest match
        let match = await Match.findOne({ status: 'In Progress' }).sort({ start_time: -1 });
        if (!match) match = await Match.findOne().sort({ start_time: -1 });

        const matchId = match ? String(match._id) : null;

        // Parallel fetch
        const [business, analyst, prediction, strategy] = await Promise.all([
            aiService.getBusinessInsights(),
            matchId ? aiService.getMatchAnalysis(matchId) : Promise.resolve(null),
            matchId ? aiService.getWinPrediction(matchId) : Promise.resolve(null),
            aiService.getStrategyRecommendations(matchId)
        ]);

        // Specialist quick Q&A
        let specialist = null;
        if (matchId) {
            const currentScore = await aiService.getSpecialistInsight('What is the current score?', matchId);
            const topScorer = await aiService.getSpecialistInsight('Who is the top scorer?', matchId);
            specialist = { currentScore, topScorer };
        }

        const report = {
            aiSpecialist: specialist,
            aiAnalyst: analyst,
            aiPrediction: prediction,
            businessAnalyst: business,
            strategyRecommendations: strategy
        };

        res.json({ success: true, report });
    } catch (error) {
        console.error('Expert Hub Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/ai/perspective
router.get('/perspective', verifyToken, async (req, res) => {
    try {
        const matchId = req.query.matchId || null;
        const node = await aiService.getPerspectiveNode(matchId);
        res.json({ success: true, node });
    } catch (error) {
        console.error('Perspective Node Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/ai/intelligence
router.get('/intelligence', verifyToken, async (req, res) => {
    try {
        const matchId = req.query.matchId || null;
        const intel = await aiService.getIntelligenceNode(matchId);
        res.json({ success: true, intelligence: intel });
    } catch (error) {
        console.error('Intelligence Node Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/ai/recommend-slot (Public/User)
router.post('/recommend-slot', async (req, res) => {
    try {
        const { date, preference } = req.body;
        // Basic AI recommendation logic (can be expanded in aiService)
        let recommendation = `Based on current weather and peak trends, the best time to play on ${date || 'your selected date'} is around 6:00 PM to 8:00 PM. Book early as these slots fill up fast! 🏏⚽`;
        
        if (preference === 'morning') {
            recommendation = `For a fresh morning game on ${date || 'your selected date'}, 6:00 AM to 8:00 AM offers the best temperature and lighting. 🌅`;
        }

        res.json({ success: true, recommendation });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;

