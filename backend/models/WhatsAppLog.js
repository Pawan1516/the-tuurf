const mongoose = require('mongoose');

const WhatsAppLogSchema = new mongoose.Schema({
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking'
    },
    userPhone: {
        type: String,
        required: true
    },
    messageType: {
        type: String,
        enum: ['confirm', 'reject', 'hold', 'pending', 'admin', 'worker', 'custom'],
        required: true
    },
    status: {
        type: String,
        enum: ['sent', 'failed'],
        required: true
    },
    messageSid: String,
    error: String,
    body: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('WhatsAppLog', WhatsAppLogSchema);
