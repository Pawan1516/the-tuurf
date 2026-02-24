const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide name'],
    },
    email: {
        type: String,
        required: [true, 'Please provide email'],
        unique: true,
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
    role: {
        type: String,
        default: 'user',
        enum: ['user'],
    },
    bookings: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
    }],
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
