const mongoose = require('mongoose');
const Match = require('./models/Match');
const User = require('./models/User');
require('dotenv').config();

async function checkShekarScorecard() {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({ name: /SHEKAR/i });
    if (!user) return;
    
    const sid = user._id.toString();
    const matches = await Match.find({
        $or: [
           { 'innings.batsmen.user_id': sid },
           { 'innings.bowlers.user_id': sid }
        ]
    });
    
    console.log(`Matched Scorecards for SHEKAR: ${matches.length}`);
    matches.forEach(m => {
        console.log(`Match ID: ${m._id}`);
        m.innings.forEach(inn => {
            const bat = (inn.batsmen || []).find(b => String(b.user_id) === sid);
            if (bat) console.log('Batting:', JSON.stringify(bat, null, 2));
            const bowl = (inn.bowlers || []).find(b => String(b.user_id) === sid);
            if (bowl) console.log('Bowling:', JSON.stringify(bowl, null, 2));
        });
    });
    
    await mongoose.disconnect();
}

checkShekarScorecard();
