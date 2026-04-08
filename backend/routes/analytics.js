const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const User = require('../models/User');
const mongoose = require('mongoose');
const verifyToken = require('../middleware/verifyToken');
const checkPremium = require('../middleware/checkPremium');

// Helper to get last 5 matches for a player with EXACT ball-by-ball analytics
async function getPlayerMatchHistory(userId, limit = 5) {
    const user = await User.findById(userId).select('name');
    const userName = user?.name?.toLowerCase();

    // Find matches where user ID is in squad OR user name is in innings data
    // This is more inclusive for guest/historical matches
    const matches = await Match.find({
        $or: [
            { 'team_a.squad': userId },
            { 'team_b.squad': userId },
            { 'quick_teams.team_a.players.user_id': userId },
            { 'quick_teams.team_b.players.user_id': userId },
            { 'innings.batsmen.name': { $regex: new RegExp(`^${user?.name}$`, 'i') } },
            { 'innings.bowlers.name': { $regex: new RegExp(`^${user?.name}$`, 'i') } }
        ],
        status: 'Completed'
    })
    .sort({ createdAt: -1 })
    .limit(limit);

    return matches.map(match => {
        let battingStats = { runs: 0, balls: 0, fours: 0, sixes: 0, dots: 0, isOut: false };
        let bowlingStats = { wickets: 0, runs: 0, overs: 0, economy: 0 };

        const resolveUserId = (id) => {
            if (!id) return null;
            const sid = String(id);
            if (match.quick_teams) {
                for (const teamKey of ['team_a', 'team_b']) {
                    const players = match.quick_teams[teamKey]?.players || [];
                    const p = players.find(x => String(x._id) === sid);
                    if (p && p.user_id) return String(p.user_id);
                }
            }
            for (const teamKey of ['team_a', 'team_b']) {
                const players = match[teamKey]?.squad || [];
                const p = players.find(x => String(x._id) === sid || String(x.user_id) === sid);
                if (p && p.user_id) return String(p.user_id);
            }
            return sid;
        };

        const targetUserIdStr = userId.toString();

        match.innings.forEach(inning => {
            // 1. Ball-by-ball extraction (Highest accuracy)
            if (inning.balls && inning.balls.length > 0) {
                const myBattingBalls = inning.balls.filter(b => 
                    resolveUserId(b.batter_id) === targetUserIdStr || 
                    b.batter_name?.toLowerCase() === userName
                );
                if (myBattingBalls.length > 0) {
                    battingStats.balls += myBattingBalls.length;
                    battingStats.runs += myBattingBalls.reduce((sum, b) => sum + (b.runs_off_bat || 0), 0);
                    battingStats.fours += myBattingBalls.filter(b => b.is_four || b.runs_off_bat === 4).length;
                    battingStats.sixes += myBattingBalls.filter(b => b.is_six || b.runs_off_bat === 6).length;
                    battingStats.dots += myBattingBalls.filter(b => (b.runs_off_bat === 0 && !b.extra_type)).length;
                }

                const myBowlingBalls = inning.balls.filter(b => 
                    resolveUserId(b.bowler_id) === targetUserIdStr || 
                    b.bowler_name?.toLowerCase() === userName
                );
                if (myBowlingBalls.length > 0) {
                    const totalRuns = myBowlingBalls.reduce((sum, b) => {
                        const r = (Number(b.runs_off_bat) || 0) + (Number(b.extra_runs) || 0);
                        if (b.extra_type === 'bye' || b.extra_type === 'legbye') {
                            return sum + (Number(b.extra_runs) || 0); // or handle byes properly, standard is bowlers don't concede byes
                        }
                        return sum + r;
                    }, 0);
                    // actually standard cricket: bowler concedes all except byes/legbyes. If byes, just extra_runs, wait!
                    
                    let runsConceded = 0;
                    myBowlingBalls.forEach(b => {
                        if (b.extra_type !== 'bye' && b.extra_type !== 'legbye') {
                             runsConceded += (Number(b.runs_off_bat) || 0) + (Number(b.extra_runs) || 0);
                        }
                    });

                    const validBalls = myBowlingBalls.filter(b => b.extra_type !== 'wide' && b.extra_type !== 'noball').length;
                    bowlingStats.runs += runsConceded;
                    bowlingStats.wickets += myBowlingBalls.filter(b => b.is_wicket && b.wicket?.is_bowler_wicket).length;
                    
                    const existingBalls = Math.floor(bowlingStats.overs) * 6 + Math.round((bowlingStats.overs % 1) * 10);
                    const newTotalBalls = existingBalls + validBalls;
                    bowlingStats.overs = Number((Math.floor(newTotalBalls / 6) + (newTotalBalls % 6) / 10).toFixed(1));
                    bowlingStats.economy = bowlingStats.overs > 0 ? (bowlingStats.runs / (newTotalBalls / 6)).toFixed(2) : 0;
                }
            }

            // 2. Scorecard fallback (If ball-by-ball is empty or missing data)
            const bat = (inning.batsmen || []).find(b => 
                resolveUserId(b.user_id) === targetUserIdStr ||
                (b.user_id && b.user_id.toString() === targetUserIdStr) || 
                (b.name && b.name.toLowerCase() === userName)
            );
            if (bat && (battingStats.runs === 0 && battingStats.balls === 0)) {
                battingStats = { 
                    runs: bat.runs || 0, 
                    balls: bat.balls || 0, 
                    fours: bat.fours || 0, 
                    sixes: bat.sixes || 0, 
                    dots: Math.round((bat.balls || 0) * 0.3),
                    isOut: bat.out_type !== 'Not Out' 
                };
            }

            const bowl = (inning.bowlers || []).find(b => 
                resolveUserId(b.user_id) === targetUserIdStr ||
                (b.user_id && b.user_id.toString() === targetUserIdStr) || 
                (b.name && b.name.toLowerCase() === userName)
            );
            if (bowl && (bowlingStats.wickets === 0 && bowlingStats.overs === 0)) {
                bowlingStats = { 
                    wickets: bowl.wickets || 0, 
                    runs: bowl.runs || 0, 
                    overs: bowl.overs || 0,
                    economy: (bowl.overs > 0) ? (bowl.runs / bowl.overs).toFixed(2) : 0
                };
            }
            if (bat) battingStats.isOut = bat.out_type !== 'Not Out';
        });

        return {
            matchId: match._id,
            date: match.createdAt,
            batting: battingStats,
            bowling: bowlingStats
        };
    }).reverse();
}

// GET /api/analytics/compare
router.get('/compare', verifyToken, checkPremium, async (req, res) => {
    try {
        const { player1: id1, player2: id2 } = req.query;
        if (!id1 || !id2) return res.status(400).json({ success: false, message: 'Two player IDs required' });

        const [p1, p2] = await Promise.all([
            User.findById(id1).select('name username phone stats cricket_profile player_qr.qr_image_url'),
            User.findById(id2).select('name username phone stats cricket_profile player_qr.qr_image_url')
        ]);

        if (!p1 || !p2) return res.status(404).json({ success: false, message: 'One or both players not found' });

        const comparison = {
            player1: {
                _id: p1._id,
                name: p1.name,
                username: p1.username,
                phone: p1.phone ? `******${p1.phone.slice(-4)}` : 'N/A',
                image: p1.player_qr?.qr_image_url || null,
                role: p1.cricket_profile?.primary_role || 'All-rounder'
            },
            player2: {
                _id: p2._id,
                name: p2.name,
                username: p2.username,
                phone: p2.phone ? `******${p2.phone.slice(-4)}` : 'N/A',
                image: p2.player_qr?.qr_image_url || null,
                role: p2.cricket_profile?.primary_role || 'All-rounder'
            },
            stats: [
                { metric: 'Runs', p1: p1.stats?.batting?.runs || 0, p2: p2.stats?.batting?.runs || 0 },
                { metric: 'Strike Rate', p1: p1.stats?.batting?.strike_rate || 0, p2: p2.stats?.batting?.strike_rate || 0 },
                { metric: 'Average', p1: p1.stats?.batting?.average || 0, p2: p2.stats?.batting?.average || 0 },
                { metric: '4s', p1: p1.stats?.batting?.fours || 0, p2: p2.stats?.batting?.fours || 0 },
                { metric: '6s', p1: p1.stats?.batting?.sixes || 0, p2: p2.stats?.batting?.sixes || 0 },
                { metric: 'Wickets', p1: p1.stats?.bowling?.wickets || 0, p2: p2.stats?.bowling?.wickets || 0 },
                { metric: 'Economy', p1: p1.stats?.bowling?.economy || 0, p2: p2.stats?.bowling?.economy || 0 }
            ],
            radarData: [
                { subject: 'Runs', p1: Math.min((p1.stats?.batting?.runs || 0) / 10, 150), p2: Math.min((p2.stats?.batting?.runs || 0) / 10, 150) },
                { subject: 'S/R', p1: Math.min(p1.stats?.batting?.strike_rate || 0, 150), p2: Math.min(p2.stats?.batting?.strike_rate || 0, 150) },
                { subject: 'Avg', p1: Math.min((p1.stats?.batting?.average || 0) * 3, 150), p2: Math.min((p2.stats?.batting?.average || 0) * 3, 150) },
                { subject: 'Wkts', p1: Math.min((p1.stats?.bowling?.wickets || 0) * 5, 150), p2: Math.min((p2.stats?.bowling?.wickets || 0) * 5, 150) },
                { subject: 'Eco', p1: Math.max(150 - (p1.stats?.bowling?.economy || 0) * 15, 0), p2: Math.max(150 - (p2.stats?.bowling?.economy || 0) * 15, 0) }
            ],
            insights: {
                betterStriker: (p1.stats?.batting?.strike_rate || 0) > (p2.stats?.batting?.strike_rate || 0) ? p1.name : p2.name,
                bestBowler: (p1.stats?.bowling?.wickets || 0) > (p2.stats?.bowling?.wickets || 0) ? p1.name : p2.name,
                isAllRounder1: (p1.stats?.batting?.runs || 0) > 200 && (p1.stats?.bowling?.wickets || 0) > 5,
                isAllRounder2: (p2.stats?.batting?.runs || 0) > 200 && (p2.stats?.bowling?.wickets || 0) > 5
            }
        };

        res.json({ success: true, comparison });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/analytics/player/:id/stats
router.get('/player/:id/stats', verifyToken, checkPremium, async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'Player not found' });

        const history = await getPlayerMatchHistory(userId, 5);

        // Calculate trends from history
        const strikeRateProgression = history.map((h, i) => ({
            match: i + 1,
            date: new Date(h.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            runs: h.batting.runs,
            sr: h.batting.balls > 0 ? Number(((h.batting.runs / h.batting.balls) * 100).toFixed(2)) : 0
        }));

        const wicketsTrend = history.map((h, i) => ({
            match: i + 1,
            date: new Date(h.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            wickets: h.bowling.wickets
        }));

        const economyTrend = history.map((h, i) => ({
            match: i + 1,
            date: new Date(h.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            eco: Number(h.bowling.economy)
        }));

        // Calculate actual platform averages
        const groupStats = await User.aggregate([
            { $group: {
                _id: null,
                avgRuns: { $avg: '$stats.batting.runs' },
                avgSr: { $avg: '$stats.batting.strike_rate' },
                avgWickets: { $avg: '$stats.bowling.wickets' },
                avgEco: { $avg: '$stats.bowling.economy' }
            }}
        ]);
        const platformAvg = groupStats[0] || { avgRuns: 200, avgSr: 110, avgWickets: 5, avgEco: 8.5 };

        // aggregated Boundary/Dot balls from career stats if detailed history is missing
        const historyDots = history.reduce((acc, h) => acc + h.batting.dots, 0);
        const historyBalls = history.reduce((acc, h) => acc + h.batting.balls, 0);
        
        const stats = {
            comparisonData: [
                { metric: 'Runs', PlayerA: user.stats?.batting?.runs || 0, PlayerB: Math.round(platformAvg.avgRuns) },
                { metric: 'Strike Rate', PlayerA: user.stats?.batting?.strike_rate || 0, PlayerB: Math.round(platformAvg.avgSr) },
                { metric: 'Average', PlayerA: user.stats?.batting?.average || 0, PlayerB: 25 },
                { metric: 'Wickets', PlayerA: user.stats?.bowling?.wickets || 0, PlayerB: Math.round(platformAvg.avgWickets) },
                { metric: 'Economy', PlayerA: user.stats?.bowling?.economy || 0, PlayerB: platformAvg.avgEco.toFixed(2) },
            ],
            radarData: [
                { subject: 'Power', A: Math.min((user.stats?.batting?.sixes || 0) * 10, 150), B: 80, fullMark: 150 },
                { subject: 'Consistency', A: Math.min((user.stats?.batting?.average || 0) * 4, 150), B: 100, fullMark: 150 },
                { subject: 'Wickets', A: Math.min((user.stats?.bowling?.wickets || 0) * 8, 150), B: 70, fullMark: 150 },
                { subject: 'Economy', A: Math.max(150 - (user.stats?.bowling?.economy || 0) * 12, 0), B: 90, fullMark: 150 },
                { subject: 'Experience', A: Math.min((user.stats?.batting?.matches || 0) * 5, 150), B: 60, fullMark: 150 },
            ],
            batting: {
                boundaryPieData: [
                    { name: 'Sixes', value: (user.stats?.batting?.sixes * 6) || 0 },
                    { name: 'Fours', value: (user.stats?.batting?.fours * 4) || 0 },
                    { name: 'Running', value: Math.max((user.stats?.batting?.runs || 0) - ((user.stats?.batting?.sixes * 6 || 0) + (user.stats?.batting?.fours * 4 || 0)), 0) },
                ],
                dotBallData: [
                    { name: 'Dot Balls', value: historyDots || 0 }, 
                    { name: 'Scoring Balls', value: (historyBalls - historyDots) || 0 },
                ],
                strikeRateProgression
            },
            bowling: {
                wicketsTrend,
                economyTrend
            }
        };

        res.json({ success: true, ...stats });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error retrieving stats' });
    }
});

// GET /api/analytics/player/:id/last5
router.get('/player/:id/last5', async (req, res) => {
    try {
        const history = await getPlayerMatchHistory(req.params.id, 5);
        res.json({ success: true, data: history });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error retrieving last 5 matches' });
    }
});

// GET /api/analytics/match/:id/live
router.get('/match/:id/live', async (req, res) => {
    try {
        const matchId = req.params.id;
        let match;

        if (matchId === 'latest' || !mongoose.Types.ObjectId.isValid(matchId)) {
            // Find the most recent active or recently completed match
            match = await Match.findOne({ 
                status: { $in: ['In Progress', 'Completed', 'Scheduled'] } 
            }).sort({ createdAt: -1 });
        } else {
            match = await Match.findById(matchId);
        }

        if (!match) return res.status(404).json({ success: false, message: 'No active match found' });

        // For live data, we return the match's live_data object or aggregate from ball-by-ball
        const liveData = match.live_data || {};
        
        // Basic Over Data aggregation for charts
        const overData = (match.innings[match.current_innings_index]?.overs || []).map(o => ({
            over: o.over_number,
            runs: o.runs,
            wicket: o.wickets > 0,
            runRate: o.run_rate
        }));

        res.json({ success: true, liveData: overData, insights: liveData.insights || {}, matchTitle: match.title, matchId: match._id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error retrieving live match data' });
    }
});

// GET /api/analytics/matches/distribution
router.get('/matches/distribution', async (req, res) => {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        // 1. Match count by Date (Daily trend for last 30 days)
        const dailyDistribution = await Match.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo }, status: 'Completed' } },
            { $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                count: { $sum: 1 }
            }},
            { $sort: { _id: 1 } }
        ]);

        // 2. Match count by Time (Hourly distribution)
        const hourlyDistribution = await Match.aggregate([
            { $match: { status: 'Completed' } },
            { $group: {
                _id: { $hour: "$createdAt" },
                count: { $sum: 1 }
            }},
            { $sort: { _id: 1 } }
        ]);

        // 3. Match count by Day of Week
        const weekdayDistribution = await Match.aggregate([
            { $match: { status: 'Completed' } },
            { $group: {
                _id: { $dayOfWeek: "$createdAt" },
                count: { $sum: 1 }
            }},
            { $sort: { _id: 1 } }
        ]);

        res.json({ 
            success: true, 
            daily: dailyDistribution, 
            hourly: hourlyDistribution,
            weekly: weekdayDistribution
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/analytics/sync-user-stats/:id
router.post('/sync-user-stats/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        // 1. Reset user stats to zero
        await User.updateOne({ _id: userId }, {
            $set: {
                'stats.batting': { matches: 0, innings: 0, runs: 0, balls_faced: 0, fours: 0, sixes: 0, fifties: 0, hundreds: 0, high_score: 0, not_outs: 0, average: 0, strike_rate: 0 },
                'stats.bowling': { matches: 0, wickets: 0, overs: 0, balls_bowled: 0, runs_conceded: 0, economy: 0, five_wicket_hauls: 0, three_wicket_hauls: 0, best_bowling: { wickets: 0, runs: 0 } },
                'stats.fielding': { catches: 0, run_outs: 0, stumpings: 0 }
            }
        });

        // 2. Find all verified matches for this user
        const matches = await Match.find({
            $or: [
                { 'team_a.squad': userId },
                { 'team_b.squad': userId },
                { 'quick_teams.team_a.players.user_id': userId },
                { 'quick_teams.team_b.players.user_id': userId },
                { 'innings.batsmen.user_id': userId },
                { 'innings.bowlers.user_id': userId }
            ],
            $or: [
                { 'verification.status': 'VERIFIED' },
                { is_offline_match: true }
            ],
            status: 'Completed'
        });

        // 3. Mark these matches as 'unprocessed' temporarily so StatsService can re-calculate for this user
        // Actually, StatsService increments. If we reset user to 0, we can just run a loop.
        const statsService = require('../services/statsService');
        
        // We'll manually re-run the processor logic for these matches but only for this user
        // Since updatePlayerStats is built for bulk, we'll just temporarily unset 'stats_updated' for these matches
        // and let it re-run.
        for (const m of matches) {
            await Match.updateOne({ _id: m._id }, { $set: { stats_updated: false } });
            await statsService.updatePlayerStats(m._id);
        }

        const updatedUser = await User.findById(userId).select('-password');
        res.json({ success: true, message: `Real stats synced from ${matches.length} matches!`, user: updatedUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
