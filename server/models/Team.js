const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a team name'],
        unique: true,
        trim: true
    },
    short_name: {
        type: String,
        required: [true, 'Please provide a short name'],
        maxlength: 5,
        uppercase: true,
        trim: true
    },
    logo: {
        type: String,
        default: ''
    },
    primary_colour: {
        type: String,
        default: '#10b981'
    },
    home_ground: {
        type: String,
        default: 'The Turf'
    },
    leader_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    vice_captain_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    members: [{
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        role: {
            type: String,
            enum: ['PLAYER', 'VICE_CAPTAIN', 'SCORER', 'SUBSTITUTE'],
            default: 'PLAYER'
        },
        jersey_no: { type: Number },
        status: { 
            type: String, 
            enum: ['INVITED', 'ACTIVE', 'DECLINED', 'REMOVED'], 
            default: 'INVITED' 
        },
        joined_at: { type: Date, default: Date.now },
        invited_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        invite_method: { 
            type: String, 
            enum: ['USERNAME', 'MOBILE', 'LINK', 'QR', 'CODE'], 
            default: 'CODE' 
        }
    }],
    invite: {
        code: { type: String, unique: true, sparse: true },
        link: { type: String },
        auto_approve: { type: Boolean, default: false },
        expires_at: { type: Date },
        max_members: { type: Number, default: 20 }
    },
    stats: {
        matches_played: { type: Number, default: 0 },
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        ties: { type: Number, default: 0 },
        no_results: { type: Number, default: 0 },
        win_percentage: { type: Number, default: 0 }
    }
}, { timestamps: true });

// Pre-save hook to calculate win percentage
teamSchema.pre('save', function(next) {
    if (this.stats.matches_played > 0) {
        this.stats.win_percentage = ((this.stats.wins + (this.stats.ties * 0.5)) / this.stats.matches_played) * 100;
    } else {
        this.stats.win_percentage = 0;
    }
    next();
});

const Team = mongoose.model('Team', teamSchema);
module.exports = Team;
