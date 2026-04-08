const mongoose = require('mongoose');
const Match = require('./models/Match');
const User = require('./models/User');
require('dotenv').config();

async function checkMatches() {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({ name: /SHEKAR/i });
    if (!user) {
        console.log('User SHEKAR not found');
        return;
    }
    const matches = await Match.find({
        $or: [
            { 'team_a.squad': user._id },
            { 'team_b.squad': user._id },
            { 'quick_teams.team_a.players.user_id': user._id },
            { 'quick_teams.team_b.players.user_id': user._id }
        ]
    });
    console.log(`Found ${matches.length} matches for SHEKAR:`);
    matches.forEach(m => console.log(`ID: ${m._id} Status: ${m.status} Verified: ${m.verification.status} Stats Updated: ${m.stats_updated}`));
    await mongoose.disconnect();
}

checkMatches();
