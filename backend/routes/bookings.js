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
const { analyzeBookingAndGenerateMessage, getAIInsights } = require('../services/aiService');
const Team = require('../models/Team');

const formatTime12h = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
};

// Create booking (PUBLIC or AUTHENTICATED)
router.post('/', async (req, res) => {
  console.log('--- DEBUG: Create Booking Request Received ---', req.body);
  try {
    let { userName, userPhone, mobileNumber, turfLocation, slotId, amount, userId, user, date, startTime, endTime, paymentType = 'advance' } = req.body;

    // Fallbacks for frontend compatibility
    const finalMobile = mobileNumber || userPhone;
    const finalUserId = userId || user;

    if (!userName || !finalMobile || !amount) {
      return res.status(400).json({
        success: false,
        message: `Missing Registry Parameters: ${!userName ? 'Name ' : ''}${!finalMobile ? 'Mobile ' : ''}${!amount ? 'Fee' : ''}`.trim()
      });
    }

    if (!slotId && (!date || !startTime)) {
      return res.status(400).json({
        success: false,
        message: `Missing Temporal Identification: ${!date ? 'Date ' : ''}${!startTime ? 'StartTime' : ''}`.trim()
      });
    }

    // Normalize date to UTC midnight across all timezones
    const d = new Date(date);
    const normalizedDate = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

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

    // Fetch settings for operation hours and hold duration
    const Setting = require('../models/Setting');
    const settings = await Setting.find();
    const config = settings.reduce((acc, s) => { acc[s.key] = s.value; return acc; }, {});
    
    const openHour = config.TURF_OPEN_HOUR || 7;
    const closeHour = config.TURF_CLOSE_HOUR || 23;
    const holdDuration = config.HOLD_DURATION_MINUTES || 5;

    if (startM < openHour * 60 || endM > closeHour * 60) {
      return res.status(400).json({
        success: false,
        message: `Operational window violation. The arena is only accessible between ${openHour.toString().padStart(2, '0')}:00 and ${closeHour.toString().padStart(2, '0')}:00.`
      });
    }

    // Check for overlaps (excluding the current slot if we are updating it)
    const overlapQuery = {
      date: normalizedDate,
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
      const conflict = overlaps[0];
      return res.status(400).json({
        success: false,
        message: `This temporal segment overlaps with an existing reservation (${conflict.startTime} to ${conflict.endTime}) and this slot is already booked.`
      });
    }

    let slot;
    // 3. Try to take/update the slot
    // If we have a slotId, prioritize it but ensure it matches the requested time/date
    if (slotId && mongoose.Types.ObjectId.isValid(slotId)) {
        slot = await Slot.findOneAndUpdate(
            { 
              _id: slotId, 
              date: normalizedDate, 
              startTime: startTimeClean, 
              status: { $in: ['free', 'hold'] } 
            },
            {
                status: 'hold',
                endTime: endTimeClean,
                holdExpiresAt: new Date(Date.now() + holdDuration * 60 * 1000),
                updatedAt: new Date()
            },
            { new: true }
        );
    }

    if (!slot) {
      // Fallback: try to find a free slot at the same time
      slot = await Slot.findOneAndUpdate(
        { date: normalizedDate, startTime: startTimeClean, status: 'free' },
        {
          status: 'hold',
          endTime: endTimeClean,
          holdExpiresAt: new Date(Date.now() + holdDuration * 60 * 1000),
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!slot) {
        // Finally check if it exists at all with different status
        const existingAnyStatus = await Slot.findOne({ date: normalizedDate, startTime: startTimeClean });
        if (existingAnyStatus) {
           return res.status(400).json({ success: false, message: 'This slot is already reserved or occupied.' });
        }

        slot = new Slot({
          date: normalizedDate,
          startTime: startTimeClean,
          endTime: endTimeClean,
          status: 'hold',
          holdExpiresAt: new Date(Date.now() + holdDuration * 60 * 1000),
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

    const slotPrice = amount;
    const confirmationAmount = paymentType === 'full' ? slotPrice : Math.ceil(slotPrice * 0.4);

    // Create booking object
    const finalMobileClean = finalMobile.replace(/\D/g, '').replace(/^91/, '').slice(-10);

    // Try to find Turf object for turfId linkage
    let turfId = null;
    try {
      const Turf = require('../models/Turf');
      const turf = await Turf.findOne({ location: new RegExp(turfLocation || 'The Turf Stadium', 'i') });
      if (turf) turfId = turf._id;
    } catch (turfErr) {
      console.warn('[Booking] Could not link turfId:', turfErr.message);
    }

    const bookingData = {
      userName,
      name: userName, // Requested field
      mobileNumber: finalMobileClean,
      userPhone: finalMobileClean, // Backwards compatibility
      turfLocation: turfLocation || process.env.TURF_LOCATION || 'The Turf Stadium',
      turfId, // Linked Turf ID
      date: normalizedDate,
      timeSlot: `${formatTime12h(startTimeClean)} - ${formatTime12h(endTimeClean)}`,
      slot: slotId,
      amount: confirmationAmount,
      totalAmount: slotPrice,
      paymentType,
      bookingStatus: 'pending',
      status: 'pending', // Requested field
      paymentStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (finalUserId) {
      bookingData.userId = finalUserId;
      bookingData.user = finalUserId; // Backwards compatibility
    }

    // Always fetch auth user if applicable via a secure token.
    // If not provided in body, we might not have it if it's public.
    // Ensure Auto-link logic if userId isn't provided.
    if (!bookingData.userId) {
      const User = require('../models/User');
      const matchedUser = await User.findOne({ phone: finalMobileClean });
      if (matchedUser) {
        console.log(`🔗 Auto-Linking booking to user: ${matchedUser.name} (${finalMobileClean})`);
        bookingData.userId = matchedUser._id;
        bookingData.user = matchedUser._id;
      }
    }

    let savedBooking;
    try {
      const booking = new Booking(bookingData);
      savedBooking = await booking.save();
    } catch (saveError) {
      console.error('CRITICAL: Booking Save Failed. Rolling back slot hold.', saveError);
      // Rollback slot if save fails
      await Slot.findByIdAndUpdate(slotId, { status: 'free', holdExpiresAt: null });
      throw new Error(`Data synchronization failed: ${saveError.message}`);
    }

    const slotDate = new Date(slot.date).toLocaleDateString();
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
    await sendAdminNotification(userName, userPhone, slotDate, timeRange, slotPrice, savedBooking._id, confirmationAmount);

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
    const authUserId = req.user.id || req.user._id;
    console.log(`[DEBUG] Fetching bookings for UserID: ${authUserId}`);

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Database offline' });
    }

    const User = require('../models/User');
    const user = await User.findById(authUserId);
    
    if (!user) {
      console.warn(`[DEBUG] User not found for ID: ${authUserId}`);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Use both identifiers: userId and mobileNumber
    const userMobile = user.mobileNumber || user.phone;
    const cleanMobile = userMobile ? userMobile.replace(/\D/g, '').replace(/^91/, '').slice(-10) : null;
    
    console.log(`[DEBUG] User Identifiers - ID: ${authUserId}, Mobile: ${cleanMobile}`);

    // Query for bookings using requested OR condition
    const findQuery = { 
      $or: [
        { userId: authUserId },
        { user: authUserId } // Legacy support
      ]
    };

    if (cleanMobile) {
      // Use regex to match the last 10 digits even with prefixes or spaces
      const mobileRegex = new RegExp(`${cleanMobile}$`);
      findQuery.$or.push({ mobileNumber: mobileRegex });
      findQuery.$or.push({ userPhone: mobileRegex });
      findQuery.$or.push({ mobileNumber: cleanMobile }); // Exact match fallback
    }

    console.log(`[DEBUG] Booking Query: ${JSON.stringify(findQuery)}`);

    // Proactive Linking: Before fetching, ensure all bookings with this mobile are linked to this userId
    if (cleanMobile && authUserId) {
      try {
        const mobileRegexLink = new RegExp(`${cleanMobile}`);
        const updateResult = await Booking.updateMany(
          { 
            $or: [
              { mobileNumber: cleanMobile },
              { mobileNumber: mobileRegexLink },
              { userPhone: cleanMobile },
              { userPhone: mobileRegexLink }
            ],
            $and: [
              { $or: [{ userId: { $exists: false } }, { userId: null }, { userId: { $ne: authUserId } }] }
            ]
          },
          { 
            $set: { userId: authUserId, user: authUserId, mobileNumber: cleanMobile }
          }
        );
        if (updateResult.modifiedCount > 0) {
          console.log(`[Auto-Link] Recovered ${updateResult.modifiedCount} historical bookings for User: ${authUserId}`);
        }
      } catch (linkErr) {
        console.error(`[Auto-Link] Failed to link historical data: ${linkErr.message}`);
      }
    }

    const bookings = await Booking.find(findQuery)
      .populate('slot')
      .sort({ createdAt: -1 })
      .maxTimeMS(5000);
    
    console.log(`[DEBUG] Found ${bookings.length} bookings for user`);

    // Fetch associated matches to enrich the response
    const Match = require('../models/Match');
    const bookingIds = bookings.map(b => b._id);
    const matches = await Match.find({ 
      $or: [
        { booking_id: { $in: bookingIds } },
        { 'match_creation.linked_booking_id': { $in: bookingIds } }
      ]
    }).populate('team_a.team_id team_b.team_id');

    // Attach matches and ensure 'status' field exists for all
    const bookingsWithMatches = bookings.map(b => {
      const bObj = b.toObject();
      // Ensure 'status' is populated from 'bookingStatus' if missing
      bObj.status = bObj.status || bObj.bookingStatus;
      
      const associatedMatches = matches.filter(m => 
        (m.booking_id && m.booking_id.toString() === b._id.toString()) || 
        (m.match_creation?.linked_booking_id && m.match_creation.linked_booking_id.toString() === b._id.toString())
      );
      return { ...bObj, matches: associatedMatches };
    });

    res.json({ 
      success: true, 
      count: bookingsWithMatches.length,
      bookings: bookingsWithMatches 
    });
  } catch (error) {
    console.error(`[DEBUG] Error in /my-bookings: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});


// Get bookings for worker's dashboard (all bookings visible)
router.get('/my-slots', verifyToken, roleGuard(['worker']), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Database offline' });
    }

    // Find slots assigned to this worker
    const assignedSlots = await Slot.find({ assignedWorker: req.user.id }).select('_id');
    const slotIds = assignedSlots.map(s => s._id);

    // Workers can see ONLY bookings assigned to them
    const bookings = await Booking.find({ slot: { $in: slotIds } })
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
    booking.status = status; // Keep in sync
    booking.updatedAt = Date.now();

    // Auto-link if needed
    if (!booking.userId || !booking.user) {
        try {
            const User = require('../models/User');
            const cleanPhone = booking.userPhone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
            const matchedUser = await User.findOne({ phone: cleanPhone });
            if (matchedUser) {
                booking.userId = matchedUser._id;
                booking.user = matchedUser._id;
            }
        } catch (linkError) {
            console.warn('[Auto-Link] Failed during status update:', linkError.message);
        }
    }

    if (status === 'confirmed' && !booking.confirmedAt) {
      booking.confirmedAt = Date.now();
      
      // Generate Receipt ID: TRF-YYYY-Last4BookingId
      const year = new Date().getFullYear();
      booking.receiptId = `TRF-${year}-${booking._id.toString().slice(-4).toUpperCase()}`;

      // Generate secure QR Token (JWT)
      const jwt = require('jsonwebtoken');
      booking.qrToken = jwt.sign(
        { bookingId: booking._id, receiptId: booking.receiptId, timestamp: Date.now() },
        process.env.JWT_SECRET || 'the-turf-secret-key',
        { expiresIn: '24h' }
      );

      // Capture Player Stats (demo/mock for now, or fetch from DB)
      booking.playerStatsAtBooking = {
        careerPoints: 608,
        leaderboardRank: 1,
        totalBookings: 10
      };
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

    const bookingRec = await Booking.findById(req.params.id);
    if (!bookingRec) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const updateData = { paymentStatus, updatedAt: Date.now() };
    if (paymentId) updateData.paymentId = paymentId;
    if (transactionId) updateData.transactionId = transactionId;

    let newSlotStatus = null;

    // If verifying payment, automatically confirm the booking
    if (paymentStatus === 'verified') {
      updateData.bookingStatus = 'confirmed';
      updateData.status = 'confirmed'; // Keep in sync
      updateData.confirmedAt = Date.now();
      newSlotStatus = 'booked';

      // Auto-link if needed
      if (!bookingRec.userId || !bookingRec.user) {
        try {
            const User = require('../models/User');
            const cleanPhone = bookingRec.userPhone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
            const matchedUser = await User.findOne({ phone: cleanPhone });
            if (matchedUser) {
                updateData.userId = matchedUser._id;
                updateData.user = matchedUser._id;
            }
        } catch (linkError) {
            console.warn('[Auto-Link] Failed during payment verify:', linkError.message);
        }
      }

      // Generate Receipt Data
      const year = new Date().getFullYear();
      updateData.receiptId = `TRF-${year}-${bookingRec._id.toString().slice(-4).toUpperCase()}`;
      
      const jwt = require('jsonwebtoken');
      updateData.qrToken = jwt.sign(
        { bookingId: bookingRec._id, receiptId: updateData.receiptId, timestamp: Date.now() },
        process.env.JWT_SECRET || 'the-turf-secret-key',
        { expiresIn: '24h' }
      );
      
      updateData.playerStatsAtBooking = {
        careerPoints: 608,
        leaderboardRank: 1,
        totalBookings: 10
      };
    } else if (paymentStatus === 'failed') {
      updateData.bookingStatus = 'rejected';
      updateData.status = 'rejected'; // Keep in sync
      newSlotStatus = 'free';
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (booking && booking.slot && newSlotStatus) {
      const slotId = booking.slot._id || booking.slot;
      const slotUpdate = { status: newSlotStatus };
      if (newSlotStatus === 'booked' || newSlotStatus === 'free') {
        slotUpdate.holdExpiresAt = null;
      }
      await Slot.findByIdAndUpdate(slotId, slotUpdate);
    }

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
      slotTime = `${formatTime12h(booking.slot.startTime)} – ${formatTime12h(booking.slot.endTime)}`;
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

    // getAIInsights is already imported at the top

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
