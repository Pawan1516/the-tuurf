const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: [true, 'Please provide user name']
  },
  name: { // Alias for userName to match request
    type: String
  },
  userPhone: { // Kept for backwards compatibility
    type: String
  },
  mobileNumber: {
    type: String,
    required: [true, 'Please provide mobile number'],
  },
  turfLocation: {
    type: String,
    required: [true, 'Please provide turf location']
  },
  turfId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Turf'
  },
  date: {
    type: Date
  },
  timeSlot: {
    type: String // e.g., "07:00 AM - 08:00 AM"
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
  userId: {
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
  totalAmount: {
    type: Number
  },
  paymentType: {
    type: String,
    enum: ['advance', 'full'],
    default: 'advance'
  },
  bookingStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'rejected', 'hold', 'no-show', 'cancelled'],
    default: 'pending'
  },
  status: { // Alias for bookingStatus to match request
    type: String
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
  receiptId: {
    type: String,
    unique: true,
    sparse: true
  },
  qrToken: {
    type: String
  },
  paymentMode: {
    type: String
  },
  playerStatsAtBooking: {
    careerPoints: Number,
    leaderboardRank: Number,
    totalBookings: Number
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
