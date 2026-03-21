const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide tournament name'],
        trim: true
    },
    format: {
        type: String,
        enum: ['League', 'Knockout', 'Group+Knockout'],
        required: true
    },
    status: {
        type: String,
        enum: ['Upcoming', 'Registration Open', 'In Progress', 'Completed', 'Cancelled'],
        default: 'Upcoming'
    },
    start_date: {
        type: Date,
        required: true
    },
    end_date: {
        type: Date
    },
    max_teams: {
        type: Number,
        required: true
    },
    registered_teams: [{
        team_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Team'
        },
        payment_status: {
            type: String,
            enum: ['Pending', 'Completed', 'Failed'],
            default: 'Pending'
        },
        registration_date: {
            type: Date,
            default: Date.now
        }
    }],
    fixtures: [{
        match_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Match'
        },
        stage: { // e.g. "Group A", "Quarter-Final", "Final"
            type: String
        }
    }],
    points_table: [{
        team_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Team'
        },
        matches_played: { type: Number, default: 0 },
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        ties: { type: Number, default: 0 },
        no_results: { type: Number, default: 0 },
        points: { type: Number, default: 0 },
        net_run_rate: { type: Number, default: 0.0 }
    }],
    financials: {
        registration_fee: { type: Number, default: 0 },
        prize_money: {
            winner: { type: Number, default: 0 },
            runner_up: { type: Number, default: 0 },
            third_place: { type: Number, default: 0 },
            man_of_series: { type: Number, default: 0 }
        }
    }
}, { timestamps: true });

const Tournament = mongoose.model('Tournament', tournamentSchema);
module.exports = Tournament;
