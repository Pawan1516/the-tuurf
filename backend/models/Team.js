const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const PlayerInTeamSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String },
    mobile: { type: String },
    role: { type: String, enum: ['Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper'], default: 'All-rounder' },
    jerseyNumber: { type: Number },
    battingStyle: { type: String, enum: ['Right-handed', 'Left-handed'], default: 'Right-handed' },
    bowlingStyle: { type: String },
    joinedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' }
}, { _id: false });

const PendingRequestSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String },
    mobile: { type: String },
    requestedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
});

const TeamSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    shortName: { type: String },
    
    // Location & Branding
    city: { type: String },
    logo: { type: String },
    jersey: { type: String }, // jersey image URL
    primaryColor: { type: String, default: '#10b981' },
    
    // Leadership
    captain: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    viceCaptain: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    // Contact
    contactNumber: { type: String },
    contactEmail: { type: String },

    // Join System
    teamCode: { type: String, unique: true, sparse: true }, // e.g. TEAM-1025
    joinCode: { type: String, unique: true, sparse: true }, // e.g. TEAM_JOIN_1025
    qrCode: { type: String }, // base64 data URL of QR code (URL-based, Google Lens compatible)
    qrUpdatedAt: { type: Date }, // when QR was last generated/refreshed
    
    // Squad (max 25)
    players: [PlayerInTeamSchema],
    pendingRequests: [PendingRequestSchema],

    // Stats
    stats: {
        matches: { type: Number, default: 0 },
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        ties: { type: Number, default: 0 },
        titles: { type: Number, default: 0 },
        runsScored: { type: Number, default: 0 },
        wicketsTaken: { type: Number, default: 0 }
    },

    // Metadata
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    visibility: { type: String, enum: ['public', 'private'], default: 'public' }
}, { timestamps: true });

// Generate team code and join code before first save
TeamSchema.pre('save', function(next) {
    if (!this.teamCode) {
        const id = Math.floor(1000 + Math.random() * 9000);
        this.teamCode = `TEAM-ID-${id}`;
        this.joinCode = `TEAM_JOIN_${id}`;
    }
    next();
});

// Validation: max 25 players
TeamSchema.path('players').validate(function(value) {
    return value.length <= 25;
}, 'Team cannot have more than 25 players.');

// Validation: unique players within team
TeamSchema.path('players').validate(function(value) {
    const ids = value.filter(p => p.user_id).map(p => p.user_id.toString());
    return new Set(ids).size === ids.length;
}, 'Duplicate players in same team not allowed.');

module.exports = mongoose.model('Team', TeamSchema);
