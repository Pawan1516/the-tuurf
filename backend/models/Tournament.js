const mongoose = require('mongoose');

const TournamentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    location: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    totalTeams: { type: Number },
    oversPerMatch: { type: Number, default: 20 },
    matchType: { type: String, enum: ['league', 'knockout', 'hybrid'], default: 'league' },
    status: { type: String, enum: ['upcoming', 'ongoing', 'completed'], default: 'upcoming' },
    
    registeredTeams: [{
        team_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
        points: { type: Number, default: 0 },
        played: { type: Number, default: 0 },
        won: { type: Number, default: 0 },
        lost: { type: Number, default: 0 },
        tied: { type: Number, default: 0 },
        nrr: { type: Number, default: 0 },
        runsFor: { type: Number, default: 0 },
        oversFor: { type: Number, default: 0 },
        runsAgainst: { type: Number, default: 0 },
        oversAgainst: { type: Number, default: 0 }
    }],
    
    matches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }],
    
    awards: {
        manOfTheTournament: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        bestBatsman: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        bestBowler: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }
}, { timestamps: true });

module.exports = mongoose.model('Tournament', TournamentSchema);
