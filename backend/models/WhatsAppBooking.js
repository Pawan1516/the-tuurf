const mongoose = require('mongoose');

const whatsAppBookingSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userPhone: { type: String, required: true },
    userName: { type: String, required: true },
    sport: { type: String, required: true },
    slot: { type: String, required: true },
    amount: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'rejected', 'hold'],
        default: 'pending'
    },
    timestamp: { type: Date, default: Date.now },
    log: [{
        time: { type: Date, default: Date.now },
        msg: String
    }]
});

module.exports = mongoose.model('WhatsAppBooking', whatsAppBookingSchema);
