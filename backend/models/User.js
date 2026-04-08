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
        unique: true,
        match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
    },
    mobileNumber: {
        type: String,
        unique: true,
        sparse: true,
        match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit mobile number']
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
        enum: ['PLAYER', 'CAPTAIN', 'SCORER', 'ADMIN', 'WORKER', 'USER', 'player', 'captain', 'scorer', 'admin', 'worker', 'user'],
    },
    admin_permissions: {
        can_scan_qr: { type: Boolean, default: false },
        can_override_matches: { type: Boolean, default: false },
        can_manage_users: { type: Boolean, default: false }
    },
    isPremium: {
        type: Boolean,
        default: true // Default to true for the initial trial
    },
    hasUsedTrial: {
        type: Boolean,
        default: true
    },
    trialStartDate: {
        type: Date,
        default: Date.now
    },
    trialEndDate: {
        type: Date,
        default: () => new Date(+new Date() + 7*24*60*60*1000)
    },
    premiumExpiry: {
        type: Date
    },
    otpCode: {
        type: String,
        select: false
    },
    otpExpires: {
        type: Date,
        select: false
    },
    isVerified: {
        type: Boolean,
        default: false
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
            fifties: { type: Number, default: 0 },
            hundreds: { type: Number, default: 0 },
            high_score: { type: Number, default: 0 },
            not_outs: { type: Number, default: 0 },
            average: { type: Number, default: 0 },
            strike_rate: { type: Number, default: 0 }
        },
        bowling: {
            matches: { type: Number, default: 0 },
            wickets: { type: Number, default: 0 },
            overs: { type: Number, default: 0 },
            balls_bowled: { type: Number, default: 0 },
            runs_conceded: { type: Number, default: 0 },
            economy: { type: Number, default: 0 },
            five_wicket_hauls: { type: Number, default: 0 },
            three_wicket_hauls: { type: Number, default: 0 },
            best_bowling: {
                wickets: { type: Number, default: 0 },
                runs: { type: Number, default: 0 }
            }
        },
        fielding: {
            catches: { type: Number, default: 0 },
            run_outs: { type: Number, default: 0 },
            stumpings: { type: Number, default: 0 }
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
    },
    fcmToken: {
        type: String,
        default: null
    },
    subscription: {
        isPremium: { type: Boolean, default: false },
        type: { type: String, enum: ['NONE', 'MONTHLY_PASS', 'YEAR_PASS'], default: 'NONE' },
        startDate: { type: Date },
        expiryDate: { type: Date }
    },
    paymentHistory: [{
        orderId: String,
        paymentId: String,
        amount: Number,
        status: String,
        date: { type: Date, default: Date.now }
    }]
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual score = runs×1 + wickets×20 + catches×10 + runOuts×15
userSchema.virtual('score').get(function() {
    const batRuns = this.stats?.batting?.runs || 0;
    const wickets = this.stats?.bowling?.wickets || 0;
    const catches = this.stats?.fielding?.catches || 0;
    const runOuts = this.stats?.fielding?.run_outs || 0;
    
    return (batRuns * 1) + (wickets * 20) + (catches * 10) + (runOuts * 15);
});

// Check if premium is active (Trial or Paid)
userSchema.methods.checkPremiumStatus = function() {
    const now = new Date();
    
    // 1. Check Paid Subscription
    if (this.premiumExpiry && this.premiumExpiry > now) {
        return true;
    }
    
    // 2. Check Trial
    if (this.trialEndDate && this.trialEndDate > now && this.isPremium) {
        return true;
    }

    return false;
};

// Normalize role to uppercase and sync mobileNumber before saving
userSchema.pre('save', function (next) {
    if (this.phone) {
        // Clean phone to 10 digits
        this.phone = this.phone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
        
        // Sync mobileNumber
        if (!this.mobileNumber) {
            this.mobileNumber = this.phone;
        } else {
            this.mobileNumber = this.mobileNumber.replace(/\D/g, '').replace(/^91/, '').slice(-10);
        }
    }

    if (this.role) {
        const roleMap = {
            'player': 'PLAYER', 'user': 'PLAYER',
            'captain': 'CAPTAIN', 'scorer': 'SCORER',
            'admin': 'ADMIN', 'worker': 'WORKER'
        };
        this.role = roleMap[this.role.toLowerCase()] || this.role.toUpperCase();
    }
    next();
});

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
