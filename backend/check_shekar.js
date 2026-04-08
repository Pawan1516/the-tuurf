const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function checkUser() {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({ name: /SHEKAR/i });
    if (!user) {
        console.log('User SHEKAR not found');
    } else {
        console.log('User ID:', user._id);
        console.log('User stats:', JSON.stringify(user.stats, null, 2));
    }
    await mongoose.disconnect();
}

checkUser();
