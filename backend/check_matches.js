
require('dotenv').config();
const mongoose = require('mongoose');
const Match = require('./models/Match');

async function checkMatches() {
    await mongoose.connect(process.env.MONGODB_URI);
    const m = await Match.find({ status: { $in: ['In Progress', 'Scheduled'] } }).limit(5);
    console.log('Active Matches:', m.length);
    m.forEach(match => {
        console.log(`- ${match.title || 'Match'} (${match.status}) on ${match.start_time}`);
    });
    process.exit(0);
}

checkMatches();
