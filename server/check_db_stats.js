const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const Worker = require('./models/Worker');
const User = require('./models/User');
require('dotenv').config();

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const adminCount = await Admin.countDocuments();
        const workerCount = await Worker.countDocuments();
        const userCount = await User.countDocuments();

        console.log('--- Database Stats ---');
        console.log(`Admins: ${adminCount}`);
        console.log(`Workers: ${workerCount}`);
        console.log(`Users: ${userCount}`);

        if (adminCount > 0) {
            const admins = await Admin.find({}, 'email name');
            console.log('Admins found:', admins);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkUsers();
