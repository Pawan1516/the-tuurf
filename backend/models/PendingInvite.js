const mongoose = require('mongoose');

const pendingInviteSchema = new mongoose.Schema({
    team_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    invited_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // Target: Either user_id (found) OR mobile (invite to join)
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    mobile: { type: String, default: null },
    
    role: { 
        type: String, 
        enum: ['PLAYER', 'SCORER', 'VICE_CAPTAIN'], 
        default: 'PLAYER' 
    },
    status: { 
        type: String, 
        enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED'], 
        default: 'PENDING' 
    },
    method: { 
        type: String, 
        enum: ['USERNAME', 'MOBILE', 'LINK', 'QR', 'CODE', 'BULK'],
        default: 'USERNAME'
    },
    sent_at: { type: Date, default: Date.now },
    expires_at: { 
        type: Date, 
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    },
    responded_at: { type: Date, default: null }
}, { timestamps: true });

// Ensure uniqueness per team-user or team-mobile
pendingInviteSchema.index({ team_id: 1, user_id: 1 }, { unique: true, sparse: true });
pendingInviteSchema.index({ team_id: 1, mobile: 1 }, { unique: true, sparse: true });

const PendingInvite = mongoose.model('PendingInvite', pendingInviteSchema);
module.exports = PendingInvite;
