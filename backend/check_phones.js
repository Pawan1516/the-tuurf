const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const users = await User.find({}, 'name phone mobileNumber');
    console.log("Total users:", users.length);
    for (const u of users) {
        console.log(`ID: ${u._id}, Name: ${u.name}, Phone: ${u.phone}, MobileNumber: ${u.mobileNumber}`);
    }
    await mongoose.disconnect();
}
run();
