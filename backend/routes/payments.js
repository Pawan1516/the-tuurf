const express = require('express');
const router = express.Router();
const { createOrder, verifyPaymentSignature } = require('../services/payment');
const Booking = require('../models/Booking');
const Slot = require('../models/Slot');
const User = require('../models/User');
const verifyToken = require('../middleware/verifyToken');

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
      keyId: process.env.RAZORPAY_KEY_ID || null
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
      // If signature is invalid, reject the booking and free the slot
      const failedBooking = await Booking.findByIdAndUpdate(bookingId, {
         paymentStatus: 'failed',
         bookingStatus: 'rejected',
         updatedAt: Date.now()
      });
      if (failedBooking && failedBooking.slot) {
         await Slot.findByIdAndUpdate(failedBooking.slot, { status: 'free', holdExpiresAt: null });
      }

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
        bookingStatus: 'confirmed', // Automatically confirm booking once payment is verified
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

    if (booking.slot) {
       await Slot.findByIdAndUpdate(booking.slot, { status: 'booked', holdExpiresAt: null });
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

// Verify Subscription Payment (SECURE)
router.post('/verify-subscription', verifyToken, async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const userId = req.user.id; // From verifyToken middleware

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ success: false, message: 'Missing payment details' });
    }

    // Verify signature
    const isSignatureValid = verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isSignatureValid) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // Activate subscription in user profile
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year access

    const user = await User.findByIdAndUpdate(userId, {
      $set: {
        isPremium: true,
        premiumExpiry: expiryDate,
        'subscription.isPremium': true,
        'subscription.type': 'YEAR_PASS',
        'subscription.startDate': new Date(),
        'subscription.expiryDate': expiryDate
      },
      $push: {
        paymentHistory: {
          orderId: razorpayOrderId,
          paymentId: razorpayPaymentId,
          amount: 49,
          status: 'success',
          date: new Date()
        }
      }
    }, { new: true });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Premium Intelligence Pass activated!',
      isPremium: true,
      expiryDate: user.premiumExpiry
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Razorpay Webhook (FOR PRODUCTION SECURITY)
router.post('/webhook', async (req, res) => {
  const crypto = require('crypto');
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'theturf_webhook_secret';
  
  const shasum = crypto.createHmac('sha256', secret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest('hex');

  if (digest === req.headers['x-razorpay-signature']) {
    console.log('✅ Webhook Signature Verified');
    const event = req.body.event;
    
    if (event === 'payment.captured') {
        const payload = req.body.payload.payment.entity;
        const phone = payload.contact ? payload.contact.replace('+91', '') : null;
        
        if (phone) {
            const expiryDate = new Date();
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
            
            await User.findOneAndUpdate({ phone }, {
                $set: {
                    isPremium: true,
                    premiumExpiry: expiryDate,
                    'subscription.isPremium': true,
                    'subscription.type': 'YEAR_PASS',
                    'subscription.startDate': new Date(),
                    'subscription.expiryDate': expiryDate
                },
                $push: {
                    paymentHistory: {
                        orderId: payload.order_id,
                        paymentId: payload.id,
                        amount: payload.amount / 100,
                        status: 'success_webhook',
                        date: new Date()
                    }
                }
            });
            console.log(`📡 User ${phone} upgraded via Webhook`);
        }
    }
    res.json({ status: 'ok' });
  } else {
    res.status(403).json({ status: 'invalid signature' });
  }
});

module.exports = router;
