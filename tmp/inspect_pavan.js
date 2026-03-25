const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../backend/models/User');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const user = await User.findOne({ name: 'Pavan' });
        console.log("User Stats:", JSON.stringify(user.stats, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
