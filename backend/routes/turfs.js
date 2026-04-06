const express = require('express');
const router = express.Router();
const Turf = require('../models/Turf');
const verifyToken = require('../middleware/verifyToken');

// GET /api/turfs — List all turfs with filters
router.get('/', async (req, res) => {
  try {
    const { sport, city, minPrice, maxPrice, minRating, search, featured } = req.query;
    const query = { isActive: true };

    if (sport) query.sports = { $in: [sport] };
    if (city) query.city = { $regex: city, $options: 'i' };
    if (featured === 'true') query.isFeatured = true;
    if (minRating) query.rating = { $gte: parseFloat(minRating) };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    if (minPrice || maxPrice) {
      query['pricing.weekdayDay'] = {};
      if (minPrice) query['pricing.weekdayDay'].$gte = Number(minPrice);
      if (maxPrice) query['pricing.weekdayDay'].$lte = Number(maxPrice);
    }

    const turfs = await Turf.find(query)
      .select('-reviews')
      .sort({ isFeatured: -1, rating: -1, createdAt: -1 });

    res.json({ success: true, turfs, count: turfs.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/turfs/:id — Single turf details
router.get('/:id', async (req, res) => {
  try {
    const turf = await Turf.findById(req.params.id).populate('reviews.user', 'name');
    if (!turf) return res.status(404).json({ success: false, message: 'Turf not found' });
    res.json({ success: true, turf });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/turfs — Create turf (admin only)
router.post('/', verifyToken, async (req, res) => {
  try {
    const turf = await Turf.create(req.body);
    res.status(201).json({ success: true, turf });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/turfs/:id — Update turf (admin only)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const turf = await Turf.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!turf) return res.status(404).json({ success: false, message: 'Turf not found' });
    res.json({ success: true, turf });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/turfs/:id/review — Add a review
router.post('/:id/review', verifyToken, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const turf = await Turf.findById(req.params.id);
    if (!turf) return res.status(404).json({ success: false, message: 'Turf not found' });

    // Prevent duplicate reviews
    const existing = turf.reviews.find(r => String(r.user) === String(req.user.id));
    if (existing) return res.status(400).json({ success: false, message: 'Already reviewed' });

    const User = require('../models/User');
    const user = await User.findById(req.user.id);

    turf.reviews.push({ user: req.user.id, userName: user.name, rating, comment });

    // Recalculate aggregate rating
    const total = turf.reviews.reduce((sum, r) => sum + r.rating, 0);
    turf.rating = parseFloat((total / turf.reviews.length).toFixed(1));
    turf.reviewCount = turf.reviews.length;

    await turf.save();
    res.json({ success: true, rating: turf.rating, reviewCount: turf.reviewCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/turfs/:id/pricing — Get dynamic pricing for a date
router.get('/:id/pricing', async (req, res) => {
  try {
    const turf = await Turf.findById(req.params.id).select('pricing openingHour closingHour');
    if (!turf) return res.status(404).json({ success: false, message: 'Turf not found' });

    const { date } = req.query;
    const slots = [];
    const d = date ? new Date(date) : new Date();
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const transitionHour = turf.pricing.transitionHour || 18;

    for (let h = turf.openingHour; h < turf.closingHour; h++) {
      const isDay = h < transitionHour;
      const price = isWeekend
        ? (isDay ? turf.pricing.weekendDay : turf.pricing.weekendNight)
        : (isDay ? turf.pricing.weekdayDay : turf.pricing.weekdayNight);

      const isPeak = (h >= 17 && h <= 21);
      slots.push({
        hour: h,
        time: `${h.toString().padStart(2,'0')}:00`,
        price,
        isPeak,
        isDay,
        label: isPeak ? 'Peak' : isDay ? 'Day' : 'Night'
      });
    }

    res.json({ success: true, slots, isWeekend, pricing: turf.pricing });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/turfs/:id/analysis — Dynamic AI Analysis (Tactical & Business)
router.get('/:id/analysis', async (req, res) => {
  try {
    const turf = await Turf.findById(req.params.id);
    if (!turf) return res.status(404).json({ success: false, message: 'Turf not found' });

    const aiService = require('../services/aiService');
    const analysis = await aiService.generateTurfAnalysis(turf);

    res.json({ success: true, analysis });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
