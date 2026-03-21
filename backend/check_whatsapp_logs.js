const mongoose = require('mongoose');
require('dotenv').config();
const WhatsAppLog = require('./models/WhatsAppLog');

const checkLogs = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const recentLogs = await WhatsAppLog.find().sort({ createdAt: -1 }).limit(5);
        console.log('--- RECENT WHATSAPP LOGS ---');
        recentLogs.forEach(log => {
            console.log(`Time: ${log.createdAt}`);
            console.log(`To: ${log.userPhone}`);
            console.log(`Type: ${log.messageType}`);
            console.log(`Status: ${log.status}`);
            if (log.error) console.log(`Error: ${log.error}`);
            console.log(`Message SID: ${log.messageSid}`);
            console.log('---------------------------');
        });

        process.exit(0);
    } catch (err) {
        console.error('Check failed:', err);
        process.exit(1);
    }
};

checkLogs();
