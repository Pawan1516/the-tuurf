const mongoose = require('mongoose');

const qrScanLogSchema = new mongoose.Schema({
    match_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Match',
        required: true
    },
    scanned_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin', // Reference to Admin scanning the QR
        required: true
    },
    scan_time: {
        type: Date,
        default: Date.now
    },
    ip_address: {
        type: String,
        default: 'unknown'
    },
    device_info: {
        type: String, // e.g. User-Agent string
        default: 'unknown'
    },
    scan_result: {
        type: String,
        enum: ['SUCCESS', 'FAILED_INVALID', 'FAILED_EXPIRED', 'FAILED_ALREADY_SCANNED', 'FAILED_MATCH_NOT_FOUND', 'MANUAL_OVERRIDE'],
        required: true
    },
    location: {
        lat: { type: Number },
        lng: { type: Number }
    },
    error_reason: { // If scan failed
        type: String
    }
}, { timestamps: true });

// Optional: Indexing for fast lookups per match and scan results
qrScanLogSchema.index({ match_id: 1, scan_time: -1 });
qrScanLogSchema.index({ scanned_by: 1 });
qrScanLogSchema.index({ scan_result: 1 });

const QRScanLog = mongoose.model('QRScanLog', qrScanLogSchema);
module.exports = QRScanLog;
