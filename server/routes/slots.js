const express = require('express');
const router = express.Router();
const Slot = require('../models/Slot');
const Worker = require('../models/Worker');
const verifyToken = require('../middleware/verifyToken');
const roleGuard = require('../middleware/roleGuard');

// Get all slots (PUBLIC with optional date filter)
router.get('/', async (req, res) => {
  try {
    if (require('mongoose').connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Database connection unstable' });
    }

    const { date } = req.query;
    let query = { status: { $ne: 'expired' } }; // Never show expired slots to public

    if (date) {
      console.log('Slots Query Date Parameter:', date);
      let startOfDay;
      if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        startOfDay = new Date(`${date}T00:00:00.000Z`);
      } else {
        startOfDay = new Date(date);
        startOfDay.setUTCHours(0, 0, 0, 0);
      }

      const endOfDay = new Date(startOfDay);
      endOfDay.setUTCHours(23, 59, 59, 999);

      query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    const slots = await Slot.find(query)
      .populate('assignedWorker', 'name email')
      .sort({ startTime: 1 })
      .maxTimeMS(2000);

    res.json(slots);
  } catch (error) {
    console.error('Error fetching slots:', error);
    res.status(500).json({ success: false, message: 'Failed to synchronize slots' });
  }
});


// Get slot by ID
router.get('/:id', async (req, res) => {
  try {
    const slotId = req.params.id;

    const slot = await Slot.findById(slotId).populate('assignedWorker').maxTimeMS(2000);

    if (!slot) {
      return res.status(404).json({ success: false, message: 'Slot not found' });
    }

    res.json({ success: true, slot });
  } catch (error) {
    console.error('Error fetching slot:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch slot' });
  }
});

// Create slot (ADMIN ONLY)
router.post('/', verifyToken, roleGuard(['admin']), async (req, res) => {
  try {
    const { date, startTime, endTime } = req.body;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: `Infrastructure Field Deficiency: ${!date ? 'Date ' : ''}${!startTime ? 'StartTime ' : ''}${!endTime ? 'EndTime' : ''}`.trim()
      });
    }

    const slot = new Slot({
      date,
      startTime,
      endTime,
      status: 'free'
    });

    await slot.save();
    res.status(201).json({ success: true, slot });
  } catch (error) {
    console.error('Error creating slot:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update slot status (ADMIN ONLY)
router.put('/:id/status', verifyToken, roleGuard(['admin']), async (req, res) => {
  try {
    const { status } = req.body;

    if (!['free', 'booked', 'hold', 'expired'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const slot = await Slot.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: Date.now() },
      { new: true }
    );

    if (!slot) {
      return res.status(404).json({ success: false, message: 'Slot not found' });
    }

    res.json({ success: true, slot });
  } catch (error) {
    console.error('Error updating slot status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Assign worker to slot (ADMIN ONLY)
router.put('/:id/assign', verifyToken, roleGuard(['admin']), async (req, res) => {
  try {
    const { workerId } = req.body;
    const slotId = req.params.id;

    // 1. Get the current slot to find old worker
    const currentSlot = await Slot.findById(slotId);
    if (!currentSlot) {
      return res.status(404).json({ success: false, message: 'Slot not found' });
    }

    const oldWorkerId = currentSlot.assignedWorker;

    // 2. Update the Slot
    const slot = await Slot.findByIdAndUpdate(
      slotId,
      { assignedWorker: workerId || null, updatedAt: Date.now() },
      { new: true }
    ).populate('assignedWorker');

    // 3. Update Workers for consistency
    // Remove slot from old worker if existed
    if (oldWorkerId) {
      await Worker.findByIdAndUpdate(oldWorkerId, {
        $pull: { assignedSlots: slotId }
      });
    }

    // Add slot to new worker if assigned
    if (workerId) {
      await Worker.findByIdAndUpdate(workerId, {
        $addToSet: { assignedSlots: slotId }
      });
    }

    res.json({ success: true, slot });
  } catch (error) {
    console.error('Error assigning worker:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete slot (ADMIN ONLY)
router.delete('/:id', verifyToken, roleGuard(['admin']), async (req, res) => {
  try {
    const slot = await Slot.findByIdAndDelete(req.params.id);

    if (!slot) {
      return res.status(404).json({ success: false, message: 'Slot not found' });
    }

    res.json({ success: true, message: 'Slot deleted' });
  } catch (error) {
    console.error('Error deleting slot:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
