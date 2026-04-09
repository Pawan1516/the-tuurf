const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
    booking_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking'
    },
    title: { type: String }, // e.g. "Team A vs Team B"
    format: { type: String, enum: ['T3', 'T5', 'T6', 'T7', 'T8', 'T10', 'T12', 'T15', 'T20', '30-over', '50-over', 'Custom'] },
    start_time: { type: Date, required: true },
    end_time: { type: Date },
    location: { type: String, default: 'The Turf' },
    
    // Team Info
    team_a: {
        team_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
        squad: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        captain: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        score: { type: Number, default: 0 },
        wickets: { type: Number, default: 0 },
        overs_played: { type: Number, default: 0 }
    },
    team_b: {
        team_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
        squad: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        captain: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        score: { type: Number, default: 0 },
        wickets: { type: Number, default: 0 },
        overs_played: { type: Number, default: 0 }
    },

    // Officials
    toss: {
        won_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
        decision: { type: String, enum: ['Bat', 'Bowl', 'Pending'], default: 'Pending' }
    },
    officials: {
        scorer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        umpire_1: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        umpire_2: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },

    // QR & Verification (CRITICAL)
    verification: {
        qr_code: {
            code: { type: String, unique: true, sparse: true }, // Base64 encoded payload string
            qr_image: { type: String }, // Full data:image/png;base64,... for display
            generated_at: { type: Date },
            expires_at: { type: Date },
            scanned_at: { type: Date },
            scanned_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
            scan_attempts: { type: Number, default: 0 }
        },
        status: { type: String, enum: ['PENDING', 'VERIFIED', 'EXPIRED', 'OFFLINE'], default: 'PENDING' },
        verification_token: { type: String } // security check token
    },
    start_control: {
        can_start: { type: Boolean, default: false }, // false until QR scan
        start_method: { type: String, enum: ['QR_SCAN', 'ADMIN_OVERRIDE', 'OFFLINE', 'PENDING'], default: 'PENDING' }
    },
    is_offline_match: { type: Boolean, default: false },
    match_mode: { 
        type: String, 
        enum: ['QUICK', 'REGISTERED'], 
        default: 'REGISTERED' 
    },
    quick_teams: {
        team_a: {
            name: { type: String },
            short_name: { type: String },
            colour: { type: String, default: '#3b82f6' },
            players: [{
                input: String,
                input_type: { type: String, enum: ['NAME', 'USERNAME', 'MOBILE'] },
                user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
                display_name: String,
                role: { type: String, default: 'Batsman' },
                is_captain: { type: Boolean, default: false },
                is_wk: { type: Boolean, default: false },
                is_linked: { type: Boolean, default: false },
                sms_invite_sent: { type: Boolean, default: false },
                claim_token: { type: String },
                batting_position: Number
            }]
        },
        team_b: {
            name: { type: String },
            short_name: { type: String },
            colour: { type: String, default: '#ef4444' },
            players: [{
                input: String,
                input_type: { type: String, enum: ['NAME', 'USERNAME', 'MOBILE'] },
                user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
                display_name: String,
                role: { type: String, default: 'Batsman' },
                is_captain: { type: Boolean, default: false },
                is_wk: { type: Boolean, default: false },
                is_linked: { type: Boolean, default: false },
                sms_invite_sent: { type: Boolean, default: false },
                claim_token: { type: String },
                batting_position: Number
            }]
        }
    },
    converted_to_teams: {
        done: { type: Boolean, default: false },
        team_a_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
        team_b_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
        converted_at: { type: Date, default: null }
    },

    // Stats & Scoring (Workflow 4 & 5)
    innings: [{
        number: { type: Number, enum: [1, 2] },
        batting_team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
        bowling_team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
        score: { type: Number, default: 0 },
        wickets: { type: Number, default: 0 },
        overs_completed: { type: Number, default: 0 }, // Renamed from 'overs' for clarity
        is_complete: { type: Boolean, default: false },
        overs: [{ // This is the new 'overs' array for phase-by-phase summaries
            over_number: Number,
            bowler_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            balls: Number, // Balls bowled in this over
            runs: Number, // Runs conceded in this over
            extras: Number, // Extras conceded in this over
            wickets: Number, // Wickets taken in this over
            maidens: { type: Boolean, default: false },
            dots: { type: Number, default: 0 },
            fours: { type: Number, default: 0 },
            sixes: { type: Number, default: 0 },
            run_rate: Number, // Run rate for this over
            phase: { type: String, enum: ['powerplay', 'middle', 'death'] }
        }],
        balls: [{ // Spec v4.0 Granular Ball-by-Ball
            ball_number: String, // '5.3'
            over_number: Number, // 0-indexed
            ball_in_over: Number, // 1-6
            absolute_ball: Number,
            batter_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            non_striker_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            bowler_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            runs_off_bat: { type: Number, default: 0 },
            is_four: { type: Boolean, default: false },
            is_six: { type: Boolean, default: false },
            extra_type: { type: String, enum: ['wide', 'noball', 'bye', 'legbye', null], default: null },
            extra_runs: { type: Number, default: 0 },
            is_free_hit: { type: Boolean, default: false },
            is_wicket: { type: Boolean, default: false },
            wicket: {
                dismissal_type: { type: String },
                player_out_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                fielder_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                is_bowler_wicket: { type: Boolean, default: true }
            },
            commentary: String,
            timestamp: { type: Date, default: Date.now }
        }],
        batsmen: [{
            user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            name: { type: String },
            runs: { type: Number, default: 0 },
            balls: { type: Number, default: 0 },
            fours: { type: Number, default: 0 },
            sixes: { type: Number, default: 0 },
            out_type: { type: String, default: 'Not Out' },
            is_on_strike: { type: Boolean, default: false }
        }],
        bowlers: [{
            user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            name: { type: String },
            overs: { type: Number, default: 0 },
            balls: { type: Number, default: 0 },
            runs: { type: Number, default: 0 },
            wickets: { type: Number, default: 0 },
            maidens: { type: Number, default: 0 }
        }],
        ball_history: [{
            over: Number,
            ball: Number,
            runs: Number,
            is_wicket: { type: Boolean, default: false },
            extra: String, // 'wd', 'nb', 'lb', 'b'
            batsman_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            bowler_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            dismissal_type: { type: String },
            fielder_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            score_at_ball: Number,
            wickets_at_ball: Number,
            timestamp: { type: Date, default: Date.now }
        }],
        fall_of_wickets: [{
            player_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            score: Number,
            wickets: Number,
            over: Number,
            ball: Number
        }],
        partnership_log: [{
            batsman1_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            batsman2_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            runs: { type: Number, default: 0 },
            balls: { type: Number, default: 0 },
            is_active: { type: Boolean, default: true }
        }]
    }],
    current_innings_index: { type: Number, default: 0 },
    live_active_team: { type: String, enum: ['A', 'B'], default: 'A' },
    
    // Awards and Completion
    status: { type: String, enum: ['Scheduled', 'In Progress', 'Completed', 'Abandoned', 'Cancelled'], default: 'Scheduled' },
    result: {
        winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
        won_by: { type: String, enum: ['Runs', 'Wickets', 'Tie', 'Super Over', 'Pending'] },
        margin: { type: Number }
    },
    awards: {
        man_of_the_match: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        best_batsman: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        best_bowler: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    match_creation: {
        created_via: { type: String, enum: ['BOOKING', 'DIRECT'], default: 'DIRECT' },
        linked_booking_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
        invite_code: { type: String, unique: true, sparse: true },
        invite_link: { type: String },
        opponent_status: {
            type: String,
            enum: ['PENDING', 'ACCEPTED', 'DECLINED'],
            default: 'PENDING'
        }
    },
    player_checkin: [{
        player_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        team_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
        checked_in_at: { type: Date, default: Date.now },
        method: { type: String, enum: ['QR_SCAN', 'MANUAL'], default: 'QR_SCAN' },
        scanned_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
    }],
    stats_updated: { type: Boolean, default: false },
    live_data: { type: mongoose.Schema.Types.Mixed, default: {} },
    commentary_log: [{
        text: String,
        ball: String,
        runs: Number,
        wickets: Number,
        overs: String,
        timestamp: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

// Indexes for fast lookup
matchSchema.index({ 'verification.qr_code.code': 1 });
matchSchema.index({ 'verification.status': 1 });
matchSchema.index({ 'start_control.can_start': 1 });
matchSchema.index({ start_time: 1 });

matchSchema.methods.canBeScored = function() {
    return this.verification.status === 'VERIFIED' || this.is_offline_match;
};

const Match = mongoose.model('Match', matchSchema);
module.exports = Match;
