const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const result = await User.updateMany({}, { $set: { isVerified: true } });
        console.log('Successfully verified all users:', result.modifiedCount);
        process.exit(0);
    } catch (err) {
        console.error('Error verifying users:', err);
        process.exit(1);
    }
}

run();
