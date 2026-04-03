require('dotenv').config();
const mongoose = require('mongoose');
const WhatsAppLog = require('./models/WhatsAppLog');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const logs = await WhatsAppLog.find().sort({ createdAt: -1 }).limit(10);
    console.log(JSON.stringify(logs, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
