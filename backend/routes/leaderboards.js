const express = require('express');
const router = express.Router();
const User = require('../models/User');
const verifyToken = require('../middleware/verifyToken');

// @route   GET /api/leaderboards/runs
// @desc    Get top run-scorers
// @access  Public
router.get('/runs', async (req, res) => {
    try {
        const { period = 'all', format = 'all' } = req.query;
        
        let sortField = "stats.batting.runs";
        let matchQuery = { "stats.batting.runs": { $gt: 0 } };

        const players = await User.find(matchQuery)
            .sort({ [sortField]: -1 })
            .limit(20)
            .select('name username stats.batting teams');

        res.json({ success: true, players });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   GET /api/leaderboards/wickets
// @desc    Get top wicket-takers
// @access  Public
router.get('/wickets', async (req, res) => {
    try {
        const { period = 'all', format = 'all' } = req.query;

        const players = await User.find({ "stats.bowling.wickets": { $gt: 0 } })
            .sort({ "stats.bowling.wickets": -1 })
            .limit(20)
            .select('name username stats.bowling teams');

        res.json({ success: true, players });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   GET /api/leaderboards/economy
// @desc    Best economy rates (min 10 overs)
// @access  Public
router.get('/economy', async (req, res) => {
    try {
        const players = await User.find({ "stats.bowling.overs": { $gte: 10 } })
            .sort({ "stats.bowling.economy": 1 })
            .limit(20)
            .select('name username stats.bowling teams');

        res.json({ success: true, players });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   GET /api/leaderboards/overall
// @desc    Get top players based on Career Score (Points)
// @access  Public
router.get('/overall', async (req, res) => {
    try {
        const players = await User.aggregate([
            {
                $addFields: {
                    careerScore: {
                        $add: [
                            { $multiply: [{ $ifNull: ["$stats.batting.runs", 0] }, 1] },
                            { $multiply: [{ $ifNull: ["$stats.bowling.wickets", 0] }, 20] },
                            { $multiply: [{ $ifNull: ["$stats.fielding.catches", 0] }, 10] },
                            { $multiply: [{ $ifNull: ["$stats.fielding.run_outs", 0] }, 15] }
                        ]
                    }
                }
            },
            { $match: { careerScore: { $gt: 0 } } },
            { $sort: { careerScore: -1 } },
            { $limit: 25 },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    careerScore: 1,
                    stats: 1,
                    cricket_profile: 1
                }
            }
        ]);

        res.json({ success: true, players });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
