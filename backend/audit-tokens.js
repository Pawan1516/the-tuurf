const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Admin = require('./models/Admin');
const Worker = require('./models/Worker');

dotenv.config();

async function checkTokens() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const users = await User.countDocuments({ fcmToken: { $ne: null } });
        const admins = await Admin.countDocuments({ fcmToken: { $ne: null } });
        const workers = await Worker.countDocuments({ fcmToken: { $ne: null } });
        
        console.log('--- FCM TOKEN AUDIT ---');
        console.log(`Users with tokens: ${users}`);
        console.log(`Admins with tokens: ${admins}`);
        console.log(`Workers with tokens: ${workers}`);
        console.log('------------------------');
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkTokens();
