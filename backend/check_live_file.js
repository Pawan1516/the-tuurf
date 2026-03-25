require('dotenv').config();
const mongoose = require('mongoose');
const Match = require('./models/Match');
const fs = require('fs');

async function checkLive() {
    await mongoose.connect(process.env.MONGODB_URI);
    const matches = await Match.find({ status: { $ne: 'Completed' } });
    fs.writeFileSync('live_matches.json', JSON.stringify(matches, null, 2));
    console.log(`Saved ${matches.length} live matches to live_matches.json`);
    process.exit(0);
}
checkLive();
