const express = require('express');
const router = express.Router();
const { findMatchPlayers, rebookSameTeam, analyzePeakHours } = require('../services/matchmakingAgent');
const verifyToken = require('../middleware/verifyToken');
const Booking = require('../models/Booking');

// POST /api/matchmaking/find — Find compatible players for a new match
router.post('/find', verifyToken, async (req, res) => {
  try {
    const { sport, teamSize } = req.body;
    const result = await findMatchPlayers(req.user.id, sport || 'Cricket', teamSize || 11);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/matchmaking/rebook — Re-book the same team from a past match
router.post('/rebook', verifyToken, async (req, res) => {
  try {
    const { matchId } = req.body;
    if (!matchId) return res.status(400).json({ success: false, message: 'matchId is required' });
    const result = await rebookSameTeam(matchId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/matchmaking/analytics — Peak hours & booking analytics (admin)
router.get('/analytics', verifyToken, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const Slot = require('../models/Slot');
    const recentBookings = await Booking.find({ createdAt: { $gte: thirtyDaysAgo } })
      .populate('slot', 'startTime endTime')
      .lean();

    const bookingsWithTime = recentBookings.map(b => ({
      ...b,
      startTime: b.slot?.startTime || '12:00'
    }));

    const peakAnalysis = analyzePeakHours(bookingsWithTime);
    const totalRevenue = recentBookings.filter(b => b.bookingStatus === 'confirmed')
      .reduce((sum, b) => sum + (b.amount || 0), 0);

    // Day of week distribution
    const dayCount = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    recentBookings.forEach(b => {
      const day = days[new Date(b.createdAt).getDay()];
      if (day) dayCount[day]++;
    });

    res.json({
      success: true,
      peakAnalysis,
      dayDistribution: dayCount,
      totalRevenue,
      totalBookings: recentBookings.length,
      period: 'Last 30 Days'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/matchmaking/post-match — Handle post-match team choice
router.post('/post-match', verifyToken, async (req, res) => {
  try {
    const { matchId, choice } = req.body; // choice: 'same' | 'different'

    if (choice === 'same') {
      const result = await rebookSameTeam(matchId);
      return res.json({ ...result, action: 'rebook_same', message: '✅ Your team is ready to rebook!' });
    }

    if (choice === 'different') {
      const result = await findMatchPlayers(req.user.id, 'Cricket', 11);
      return res.json({ ...result, action: 'find_new', message: '🔍 Found new players for you to challenge!' });
    }

    res.status(400).json({ success: false, message: 'choice must be "same" or "different"' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
