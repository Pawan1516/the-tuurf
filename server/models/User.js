const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide name'],
    },
    email: {
        type: String,
        unique: true,
        sparse: true
    },
    phone: {
        type: String,
        required: [true, 'Please provide phone'],
        match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
    },
    password: {
        type: String,
        required: [true, 'Please provide password'],
    },
    realPassword: {
        type: String,
    },
    role: {
        type: String,
        default: 'PLAYER',
        enum: ['PLAYER', 'CAPTAIN', 'SCORER', 'ADMIN', 'WORKER'],
    },
    admin_permissions: {
        can_scan_qr: { type: Boolean, default: false },
        can_override_matches: { type: Boolean, default: false },
        can_manage_users: { type: Boolean, default: false }
    },
    isPhoneVerified: {
        type: Boolean,
        default: false
    },
    otpCode: {
        type: String,
        select: false
    },
    otpExpires: {
        type: Date,
        select: false
    },
    cricket_profile: {
        batting_style: { type: String, enum: ['Right-hand bat', 'Left-hand bat'], default: 'Right-hand bat' },
        bowling_style: { type: String, enum: ['Right-arm fast', 'Right-arm medium', 'Right-arm offbreak', 'Right-arm legbreak', 'Left-arm fast', 'Left-arm medium', 'Left-arm orthodox', 'Left-arm chinaman', 'None'], default: 'None' },
        primary_role: { type: String, enum: ['Batsman', 'Bowler', 'All-rounder', 'Wicketkeeper'], default: 'Batsman' },
        batting_position: { type: String, enum: ['Top Order', 'Middle Order', 'Lower Order'], default: 'Middle Order' }
    },
    stats: {
        batting: {
            matches: { type: Number, default: 0 },
            innings: { type: Number, default: 0 },
            runs: { type: Number, default: 0 },
            balls_faced: { type: Number, default: 0 },
            fours: { type: Number, default: 0 },
            sixes: { type: Number, default: 0 },
            average: { type: Number, default: 0 },
            strike_rate: { type: Number, default: 0 }
        },
        bowling: {
            matches: { type: Number, default: 0 },
            wickets: { type: Number, default: 0 },
            overs: { type: Number, default: 0 },
            runs_conceded: { type: Number, default: 0 },
            economy: { type: Number, default: 0 },
            five_wicket_hauls: { type: Number, default: 0 }
        }
    },
    player_qr: {
        code: { type: String, unique: true, index: true, sparse: true },
        qr_image_url: { type: String },
        generated_at: { type: Date, default: Date.now },
        last_reset_at: { type: Date, default: null },
        reset_count: { type: Number, default: 0 },
        is_active: { type: Boolean, default: true }
    },
    teams: [{
        team_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
        role: { type: String, enum: ['Player', 'Captain', 'Vice-Captain'], default: 'Player' },
        status: { type: String, enum: ['Active', 'Inactive', 'Pending'], default: 'Active' }
    }],
    bookings: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
    }],
    personal: {
        photo: String,
        date_of_birth: Date,
        gender: { type: String, enum: ['Male', 'Female', 'Other'] }
    }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    
    // Store real password for admin visibility
    this.realPassword = this.password;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
