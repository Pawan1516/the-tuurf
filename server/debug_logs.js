const mongoose = require('mongoose');
require('dotenv').config();
const WhatsAppLog = require('./models/WhatsAppLog');
const fs = require('fs');

async function debugLogs() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const logs = await WhatsAppLog.find().sort({ createdAt: -1 }).limit(10);
        let output = "--- WHATSAPP LOG DEBUG ---\n\n";
        logs.forEach(log => {
            output += `Date: ${log.createdAt}\n`;
            output += `To: ${log.userPhone}\n`;
            output += `Status: ${log.status}\n`;
            output += `SID: ${log.messageSid}\n`;
            output += `Error: ${log.error || 'None'}\n`;
            output += `Body: ${log.body}\n`;
            output += `--------------------------\n`;
        });
        fs.writeFileSync('whatsapp_debug_logs.txt', output);
        console.log('Logs written to whatsapp_debug_logs.txt');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
debugLogs();
