const express = require('express');
const router = express.Router();
const { createOrder, verifyPaymentSignature } = require('../services/payment');
const Booking = require('../models/Booking');

// Create Razorpay order (PUBLIC)
router.post('/create-order', async (req, res) => {
  try {
    const { amount, bookingId } = req.body;

    if (!amount || !bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Amount and booking ID are required'
      });
    }

    const result = await createOrder(amount, 'INR', bookingId);

    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      order: result.order,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Verify payment (PUBLIC)
router.post('/verify', async (req, res) => {
  try {
    const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!bookingId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment details'
      });
    }

    // Verify signature
    const isSignatureValid = verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isSignatureValid) {
      return res.status(400).json({
        success: false,
        message: 'Payment signature verification failed'
      });
    }

    // Update booking with payment details
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        paymentStatus: 'verified',
        paymentId: razorpayPaymentId,
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      message: 'Payment verified successfully',
      booking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
