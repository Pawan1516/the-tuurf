require('dotenv').config();
const mongoose = require('mongoose');
const Match = require('./models/Match');

async function checkLive() {
    await mongoose.connect(process.env.MONGODB_URI);
    const matches = await Match.find({ status: { $ne: 'Completed' } });
    console.log(JSON.stringify(matches, null, 2));
    process.exit(0);
}
checkLive();
