const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: [true, 'Please provide user name']
  },
  userPhone: {
    type: String,
    required: [true, 'Please provide user phone'],
    match: [/^\d{10}$/, 'Please provide valid 10-digit phone number']
  },
  turfLocation: {
    type: String,
    required: [true, 'Please provide turf location']
  },
  slot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Slot',
    required: [true, 'Please provide slot']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'submitted', 'verified', 'failed'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    trim: true
  },
  paymentId: String,
  razorpayOrderId: String,
  amount: {
    type: Number,
    required: [true, 'Please provide amount']
  },
  bookingStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'rejected', 'hold', 'no-show', 'cancelled'],
    default: 'pending'
  },
  whatsappNotified: {
    type: Boolean,
    default: false
  },
  aiRiskLevel: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    default: 'LOW'
  },
  confirmedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Booking', bookingSchema);
