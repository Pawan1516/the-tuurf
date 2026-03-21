const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const workerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    phone: {
        type: String,
        required: [true, 'Please provide phone'],
        match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        default: 'worker',
        enum: ['worker'],
    },
    assignedSlots: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Slot',
    }],
}, { timestamps: true });

workerSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

workerSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const Worker = mongoose.model('Worker', workerSchema);

module.exports = Worker;
