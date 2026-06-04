const mongoose = require('mongoose');

const ballEventSchema = new mongoose.Schema({
    match_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
    innings_num: { type: Number, required: true },
    over_num: { type: Number, required: true },
    ball_num: { type: Number, required: true },
    absolute_ball: { type: Number },
    
    // Core Event Data
    batter_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bowler_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    runs_off_bat: { type: Number, default: 0 },
    extra_runs: { type: Number, default: 0 },
    extra_type: { type: String, enum: ['wide', 'noball', 'bye', 'legbye', null], default: null },
    is_wicket: { type: Boolean, default: false },
    wicket_type: { type: String },
    
    // ML Features (Snapshot at this ball)
    features: {
        score_at_ball: { type: Number },
        wickets_at_ball: { type: Number },
        crr: { type: Number },
        rrr: { type: Number },
        balls_left: { type: Number },
        batter_runs: { type: Number },
        batter_balls: { type: Number },
        bowler_runs: { type: Number },
        bowler_balls: { type: Number },
        last_6_balls_runs: { type: Number }
    },
    
    // AI Output
    predictions: {
        win_prob: { type: Number },
        projected_score: { type: Number },
        momentum_score: { type: Number }
    },
    
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

ballEventSchema.index({ match_id: 1, innings_num: 1, absolute_ball: 1 });

module.exports = mongoose.model('BallEvent', ballEventSchema);
