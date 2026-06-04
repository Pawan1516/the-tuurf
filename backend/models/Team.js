const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    shortName: { type: String },
    captain: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    logo: { type: String },
    players: [{
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: { type: String },
        mobile: { type: String },
        role: { type: String, enum: ['Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper'], default: 'All-rounder' }
    }],
    stats: {
        matches: { type: Number, default: 0 },
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        titles: { type: Number, default: 0 }
    }
}, { timestamps: true });

// Validation to ensure players are unique within the team
TeamSchema.path('players').validate(function(value) {
    const ids = value.map(p => p.user_id.toString());
    return new Set(ids).size === ids.length;
}, 'Duplicate players in same team not allowed.');

module.exports = mongoose.model('Team', TeamSchema);
