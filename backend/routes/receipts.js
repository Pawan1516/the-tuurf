const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Slot = require('../models/Slot');
const User = require('../models/User');
const verifyToken = require('../middleware/verifyToken');
const jwt = require('jsonwebtoken');

// GET /api/receipts/:id
router.get('/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('slot')
      .populate('user', 'name phone email');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    // Prepare complete receipt object
    const receipt = {
      receipt_id: booking.receiptId || `TRF-${new Date().getFullYear()}-${booking._id.toString().slice(-4).toUpperCase()}`,
      booking_id: booking._id,
      player: {
        player_id: booking.user?._id,
        name: booking.userName,
        phone: booking.userPhone
      },
      venue: {
        name: 'The Turf',
        location: booking.turfLocation,
        ground_size: '90ft x 60ft'
      },
      slot: {
        date: booking.slot ? booking.slot.date : 'N/A',
        start_time: booking.slot ? booking.slot.startTime : 'N/A',
        end_time: booking.slot ? booking.slot.endTime : 'N/A',
        duration_hours: 1,
        sport: (booking.slot && booking.slot.sports && booking.slot.sports[0]) || 'Cricket'
      },
      payment: {
        amount: booking.amount,
        totalAmount: booking.totalAmount,
        payment_id: booking.paymentId,
        order_id: booking.razorpayOrderId,
        status: booking.paymentStatus,
        mode: booking.paymentMode || 'UPI / Card',
        timestamp: booking.confirmedAt || booking.updatedAt
      },
      qr: {
        token: booking.qrToken,
        valid_until: booking.slot ? new Date(booking.slot.date).setHours(23, 59, 59) : null
      },
      player_stats: booking.playerStatsAtBooking || {
        career_points: 0,
        leaderboard_rank: 'N/A',
        total_bookings: 0
      },
      status: booking.bookingStatus
    };

    res.json({ success: true, receipt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
