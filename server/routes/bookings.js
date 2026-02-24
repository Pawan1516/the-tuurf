const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Booking = require('../models/Booking');
const Slot = require('../models/Slot');
const verifyToken = require('../middleware/verifyToken');
const roleGuard = require('../middleware/roleGuard');
const {
  sendConfirmationMessage,
  sendRejectionMessage,
  sendHoldMessage,
  sendPendingMessage,
  sendAdminNotification,
  sendWorkerNotification,
  sendWhatsAppNotification
} = require('../services/whatsapp');
const Worker = require('../models/Worker');
const { generateBookingReport, createPDF } = require('../services/pdfReport');
const { analyzeBookingAndGenerateMessage } = require('../services/aiAgent');

// Create booking (PUBLIC or AUTHENTICATED)
router.post('/', async (req, res) => {
  console.log('--- DEBUG: Create Booking Request Received ---', req.body);
  try {
    let { userName, userPhone, turfLocation, slotId, amount, userId, date, startTime, endTime } = req.body;

    if (!userName || !userPhone || !amount) {
      return res.status(400).json({
        success: false,
        message: `Missing Registry Parameters: ${!userName ? 'Name ' : ''}${!userPhone ? 'Phone ' : ''}${!amount ? 'Fee' : ''}`.trim()
      });
    }

    if (!slotId && (!date || !startTime)) {
      return res.status(400).json({
        success: false,
        message: `Missing Temporal Identification: ${!date ? 'Date ' : ''}${!startTime ? 'StartTime' : ''}`.trim()
      });
    }

    // 2. Perform time calculations
    const timeToMinutes = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const startTimeClean = startTime;
    let endTimeClean = endTime;

    const startM = timeToMinutes(startTimeClean);
    let endM;

    if (endTimeClean) {
      endM = timeToMinutes(endTimeClean);
    } else {
      endM = startM + 60;
      const h = Math.floor(endM / 60);
      const m = endM % 60;
      endTimeClean = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    const duration = endM - startM;

    if (duration <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid window. Start must be before End.' });
    }

    if (startM < 7 * 60 || endM > 23 * 60) {
      return res.status(400).json({
        success: false,
        message: 'Operational window violation. The arena is only accessible between 07:00 AM and 11:00 PM.'
      });
    }

    // Check for overlaps (excluding the current slot if we are updating it)
    const overlapQuery = {
      date,
      $or: [
        {
          $and: [
            { startTime: { $lt: endTimeClean } },
            { endTime: { $gt: startTimeClean } }
          ]
        }
      ],
      status: { $in: ['booked', 'hold'] }
    };
    if (slotId && mongoose.Types.ObjectId.isValid(slotId)) overlapQuery._id = { $ne: slotId };

    const overlaps = await Slot.find(overlapQuery);
    if (overlaps.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This temporal segment overlaps with an existing reservation.'
      });
    }

    let slot;
    // 3. Try to take/update the slot
    if (slotId && mongoose.Types.ObjectId.isValid(slotId)) {
      // Find and update existing slot to match requested time
      slot = await Slot.findOneAndUpdate(
        { _id: slotId, status: { $in: ['free', 'hold'] } }, // Allow hold if it's the same flow
        {
          status: 'hold',
          startTime: startTimeClean,
          endTime: endTimeClean,
          holdExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
          updatedAt: new Date()
        },
        { new: true }
      );
    }

    if (!slot) {
      // Fallback: try to find a free slot at the same time or create new
      slot = await Slot.findOneAndUpdate(
        { date, startTime: startTimeClean, status: 'free' },
        {
          status: 'hold',
          endTime: endTimeClean,
          holdExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!slot) {
        slot = new Slot({
          date,
          startTime: startTimeClean,
          endTime: endTimeClean,
          status: 'hold',
          holdExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
          price: amount
        });
        await slot.save();
      }
    }

    if (!slot) {
      return res.status(400).json({
        success: false,
        message: 'This temporal window is unavailable. Please select a different time segment.'
      });
    }

    slotId = slot._id; // Ensure slotId is set for the rest of the logic

    // Create booking object
    const bookingData = {
      userName,
      userPhone,
      turfLocation: turfLocation || process.env.TURF_LOCATION || 'The Turf Stadium',
      slot: slotId,
      amount,
      bookingStatus: 'pending',
      paymentStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (userId) bookingData.user = userId;

    if (mongoose.connection.readyState !== 1) {
      // Rollback slot if DB is down (though findOneAndUpdate already happened)
      await Slot.findByIdAndUpdate(slotId, { status: 'free', holdExpiresAt: null });
      throw new Error('Database connection lost');
    }

    const booking = new Booking(bookingData);
    const savedBooking = await booking.save();

    const slotDate = new Date(slot.date).toLocaleDateString();

    const formatTime12h = (t) => {
      if (!t) return '';
      const [h, m] = t.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
    };

    const timeRange = `${formatTime12h(slot.startTime)} – ${formatTime12h(slot.endTime)}`;

    // AI AGENT: Analyze Risk and Generate Personalized Message
    let aiRecommendation = null;
    try {
      // Get user history based on phone number
      const historyData = await Booking.aggregate([
        { $match: { userPhone: userPhone, bookingStatus: 'confirmed' } },
        { $group: { _id: null, past_bookings: { $sum: 1 }, no_show_count: { $sum: 0 }, cancellations: { $sum: 0 } } }
      ]);

      const userHistory = historyData.length > 0 ? historyData[0] : { past_bookings: 0, no_show_count: 0, cancellations: 0 };

      aiRecommendation = await analyzeBookingAndGenerateMessage({
        userName,
        date: slotDate,
        time: timeRange,
        location: savedBooking.turfLocation,
        booking_id: savedBooking._id,
        tone: 'friendly'
      }, userHistory);

      if (aiRecommendation) {
        console.log(`[AI Agent] Risk Level: ${aiRecommendation.risk_level}`);
        savedBooking.aiRiskLevel = aiRecommendation.risk_level;
        await savedBooking.save();
      }
    } catch (aiError) {
      console.error('AI Agent integration error:', aiError);
    }

    // Send initial notification to User
    if (aiRecommendation && aiRecommendation.message) {
      await sendWhatsAppNotification(userPhone, aiRecommendation.message, savedBooking._id, 'user');
    } else {
      await sendPendingMessage(userPhone, userName, slotDate, timeRange, savedBooking._id, savedBooking.turfLocation);
    }

    // Send notification to Admin
    await sendAdminNotification(userName, userPhone, slotDate, timeRange, amount, savedBooking._id);

    // Send notification to Worker (if assigned)
    if (slot.assignedWorker) {
      const worker = await Worker.findById(slot.assignedWorker);
      if (worker && worker.phone) {
        await sendWorkerNotification(worker.phone, worker.name, userName, slotDate, timeRange, savedBooking._id);
      }
    }

    res.status(201).json({
      success: true,
      booking: savedBooking,
      message: 'Booking created. Please proceed to payment.'
    });
  } catch (error) {
    console.error('Booking Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all bookings (ADMIN ONLY)
router.get('/', verifyToken, roleGuard(['admin']), async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    const filter = {};

    if (status) filter.bookingStatus = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Database offline' });
    }

    const bookings = await Booking.find(filter)
      .populate('slot')
      .sort({ createdAt: -1 })
      .maxTimeMS(2000);

    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get bookings for current user
router.get('/my-bookings', verifyToken, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Database offline' });
    }

    const bookings = await Booking.find({ user: req.user.id })
      .populate('slot')
      .sort({ createdAt: -1 })
      .maxTimeMS(2000);

    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get bookings for worker's dashboard (all bookings visible)
router.get('/my-slots', verifyToken, roleGuard(['worker']), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Database offline' });
    }

    // Workers can see ALL bookings to manage confirm/reject/hold
    const bookings = await Booking.find({})
      .populate('slot')
      .sort({ createdAt: -1 })
      .maxTimeMS(2000);

    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get booking by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Database offline' });
    }

    const booking = await Booking.findById(id)
      .populate({
        path: 'slot',
        populate: { path: 'assignedWorker', select: 'name email phone' }
      })
      .maxTimeMS(2000);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update booking status (ADMIN or WORKER)
router.put('/:id/status', verifyToken, roleGuard(['admin', 'worker']), async (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'confirmed', 'rejected', 'hold', 'no-show', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Workers can only update bookings in their assigned slots
    if (req.user.role === 'worker') {
      const slotId = booking.slot._id || booking.slot;
      const slot = await Slot.findOne({
        _id: slotId,
        assignedWorker: req.user.id
      });

      if (!slot) {
        return res.status(403).json({ success: false, message: 'Not authorized to update this booking' });
      }
    }

    booking.bookingStatus = status;
    booking.updatedAt = Date.now();
    if (status === 'confirmed' && !booking.confirmedAt) {
      booking.confirmedAt = Date.now();
    }
    await booking.save();
    console.log(`[Status Change] Booking ${booking._id} set to ${status}`);

    // Send WhatsApp notification if status is confirmed, rejected, or hold
    if (['confirmed', 'rejected', 'hold'].includes(status)) {
      try {
        let slotDate = 'N/A';
        let slotTime = 'N/A';

        // Ensure slot is an object with the required properties
        console.log(`[Notification] Fetching slot details for booking ${booking._id}`);
        const populatedBooking = await Booking.findById(booking._id).populate('slot');
        if (populatedBooking.slot) {
          slotDate = new Date(populatedBooking.slot.date).toLocaleDateString();
          slotTime = `${formatTime12h(populatedBooking.slot.startTime)} – ${formatTime12h(populatedBooking.slot.endTime)}`;
          console.log(`[Notification] Slot Data: ${slotDate} at ${slotTime}`);
        }

        console.log(`[Notification] Attempting to send ${status} message to ${booking.userPhone}`);
        if (status === 'confirmed') {
          await sendConfirmationMessage(booking.userPhone, booking.userName, slotDate, slotTime, booking._id, populatedBooking.turfLocation);
          // Also notify worker that the booking is now officially confirmed
          if (populatedBooking.slot && populatedBooking.slot.assignedWorker) {
            const worker = await Worker.findById(populatedBooking.slot.assignedWorker);
            if (worker && worker.phone) {
              const workerMsg = `✅ CONFIRMED: The booking for ${booking.userName} at ${populatedBooking.turfLocation} (${slotDate} at ${slotTime}) is now confirmed. Please be ready!`;
              await sendWhatsAppNotification(worker.phone, workerMsg, booking._id, 'worker');
            }
          }
        } else if (status === 'rejected') {
          await sendRejectionMessage(booking.userPhone, booking.userName, slotDate, slotTime, booking._id, populatedBooking.turfLocation);
        } else if (status === 'hold') {
          await sendHoldMessage(booking.userPhone, booking.userName, slotDate, slotTime, booking._id, populatedBooking.turfLocation);
        }

        booking.whatsappNotified = true;
        await booking.save();
        console.log(`[Notification] WhatsApp block completed for ${status}`);
      } catch (notifyError) {
        console.error(`[Notification Error] Failed to send ${status} message:`, notifyError.message);
      }
    }

    // Sync slot status with booking status
    if (booking.slot) {
      const slotId = booking.slot._id || booking.slot;
      let newSlotStatus = null;
      let holdExpiresAt = undefined;

      if (status === 'confirmed') {
        newSlotStatus = 'booked';
        holdExpiresAt = null;
      } else if (status === 'rejected' || status === 'cancelled') {
        newSlotStatus = 'free';
        holdExpiresAt = null;
      } else if (status === 'hold') {
        newSlotStatus = 'hold';
      } else if (status === 'no-show') {
        // Keep as booked but maybe add a note? 
        // For now just keep it booked or free it if the admin wants to re-sell (rare for no-show)
        // Usually we keep it booked to preserve history of who took the slot
        newSlotStatus = 'booked';
      }

      if (newSlotStatus) {
        const updateData = { status: newSlotStatus };
        if (holdExpiresAt !== undefined) updateData.holdExpiresAt = holdExpiresAt;
        await Slot.findByIdAndUpdate(slotId, updateData);
      }
    }

    res.json({ success: true, booking, message: `Booking ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update booking user name
router.put('/:id/username', verifyToken, roleGuard(['worker', 'admin']), async (req, res) => {
  try {
    const { userName } = req.body;

    if (!userName) {
      return res.status(400).json({ success: false, message: 'Please provide user name' });
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { userName, updatedAt: Date.now() },
      { new: true }
    );

    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Verify payment
router.put('/:id/payment', verifyToken, roleGuard(['worker', 'admin']), async (req, res) => {
  try {
    const { paymentStatus, paymentId, transactionId } = req.body;

    if (!['verified', 'failed', 'submitted'].includes(paymentStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid payment status' });
    }

    const updateData = { paymentStatus, updatedAt: Date.now() };
    if (paymentId) updateData.paymentId = paymentId;
    if (transactionId) updateData.transactionId = transactionId;

    // If verifiying payment, automatically confirm the booking
    if (paymentStatus === 'verified') {
      updateData.bookingStatus = 'confirmed';
      updateData.confirmedAt = Date.now();
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Download report (WORKER)
router.get('/report/download', verifyToken, roleGuard(['worker']), async (req, res) => {
  try {
    // Get slots assigned to this worker
    const slots = await Slot.find({ assignedWorker: req.user.id });
    const slotIds = slots.map(s => s._id);

    // Get bookings for these slots
    const bookings = await Booking.find({ slot: { $in: slotIds } }).populate('slot').lean();

    // Convert to CSV
    const csv = [
      ['sl no', 'name', 'mobile number', 'slot', 'status', 'money']
    ];

    bookings.forEach((booking, index) => {
      const slotDate = booking.slot ? new Date(booking.slot.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) : '';
      const slotTime = booking.slot ? booking.slot.startTime : '';
      const slotInfo = slotDate ? `${slotDate} ${slotTime}` : 'N/A';

      csv.push([
        index + 1,
        booking.userName,
        booking.userPhone,
        slotInfo,
        booking.bookingStatus,
        booking.amount
      ]);
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="booking-report.csv"');
    res.send(csv.map(row => row.join(',')).join('\n'));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Download PDF report (WORKER)
router.get('/report/pdf', verifyToken, roleGuard(['worker']), async (req, res) => {
  try {
    const filters = {
      worker: req.user.id
    };

    const result = await generateBookingReport(filters);

    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error });
    }

    const doc = createPDF(result.bookings, result.stats);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="worker-report.pdf"');

    doc.pipe(res);
    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Submit manual payment (PUBLIC or AUTHENTICATED)
router.put('/:id/submit-payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'Transaction ID is required' });
    }

    const booking = await Booking.findByIdAndUpdate(
      id,
      { paymentStatus: 'submitted', transactionId, updatedAt: Date.now() },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({
      success: true,
      message: 'Payment details submitted for verification',
      booking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Manually re-send WhatsApp notification (ADMIN ONLY)
router.post('/:id/notify', verifyToken, roleGuard(['admin']), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('slot');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!['confirmed', 'rejected', 'hold'].includes(booking.bookingStatus)) {
      return res.status(400).json({ success: false, message: 'Booking must be in confirmed, rejected, or hold status to send notification' });
    }

    let slotDate = 'N/A';
    let slotTime = 'N/A';
    if (booking.slot) {
      slotDate = new Date(booking.slot.date).toLocaleDateString();
      const formatTime12hInner = (t) => {
        if (!t) return '';
        const [h, m] = t.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
      };
      slotTime = `${formatTime12hInner(booking.slot.startTime)} – ${formatTime12hInner(booking.slot.endTime)}`;
    }

    let result;
    if (booking.bookingStatus === 'confirmed') {
      result = await sendConfirmationMessage(booking.userPhone, booking.userName, slotDate, slotTime, booking._id, booking.turfLocation);
    } else if (booking.bookingStatus === 'rejected') {
      result = await sendRejectionMessage(booking.userPhone, booking.userName, slotDate, slotTime, booking._id, booking.turfLocation);
    } else if (booking.bookingStatus === 'hold') {
      result = await sendHoldMessage(booking.userPhone, booking.userName, slotDate, slotTime, booking._id, booking.turfLocation);
    }

    if (result && result.success) {
      booking.whatsappNotified = true;
      await booking.save();
      return res.json({ success: true, message: 'Notification sent successfully' });
    } else {
      return res.status(500).json({ success: false, message: result?.error || 'Failed to send notification' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get AI Insights for a booking (ADMIN/WORKER ONLY)
router.get('/:id/ai-insights', verifyToken, roleGuard(['admin', 'worker']), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const { getAIInsights } = require('../services/aiAgent');

    // Get user history based on phone number
    const historyData = await Booking.find({ userPhone: booking.userPhone }).lean();

    const stats = {
      total: historyData.length,
      confirmed: historyData.filter(b => b.bookingStatus === 'confirmed').length,
      noShow: historyData.filter(b => b.bookingStatus === 'no-show').length,
      cancelled: historyData.filter(b => b.bookingStatus === 'cancelled').length,
      lastStatus: historyData[historyData.length - 1]?.bookingStatus
    };

    const insights = await getAIInsights(stats);

    res.json({
      success: true,
      insights: insights || "AI Agent is currently unavailable or API key is missing.",
      stats
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
