const mongoose = require('mongoose');
const Match = require('./models/Match');
require('dotenv').config();

async function checkMatchData() {
    await mongoose.connect(process.env.MONGODB_URI);
    const m = await Match.findOne({ 'quick_teams.team_a.players.user_id': { $ne: null } }); 
    if (m) {
        console.log(`Match ${m._id} balls length:`, m.innings?.[0]?.balls?.length || 0);
        if (m.innings?.[0]?.balls?.[0]) {
             console.log('Sample ball:', JSON.stringify(m.innings[0].balls[0], null, 2));
        }
    } else {
        console.log('No matches with linked user IDs found');
    }
    await mongoose.disconnect();
}

checkMatchData();
