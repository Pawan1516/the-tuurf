const mongoose = require('mongoose');
const Match = require('c:\\Users\\Pawan\\OneDrive\\Desktop\\The Turf\\backend\\models\\Match');
const User = require('c:\\Users\\Pawan\\OneDrive\\Desktop\\The Turf\\backend\\models\\User');
require('dotenv').config({ path: 'c:\\Users\\Pawan\\OneDrive\\Desktop\\The Turf\\backend\\.env' });

async function inspectMatch() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    let pavan = await User.findOne({ phone: '7993962018' });
    if (!pavan) pavan = await User.findOne({ name: /Pawan/i });

    console.log(`Checking stats for ${pavan.name} (${pavan._id})`);

    const matches = await Match.find({
        status: 'Completed',
        $or: [
            { 'team_a.squad': pavan._id },
            { 'team_b.squad': pavan._id },
            { 'quick_teams.team_a.players.user_id': pavan._id },
            { 'quick_teams.team_b.players.user_id': pavan._id }
        ]
    }).limit(3);

    console.log(`Found ${matches.length} matches to check balls...`);

    for (const m of matches) {
        console.log(`- Match ${m._id}: Title: ${m.title}`);
        let batterFound = false;
        m.innings.forEach((inn, i) => {
             inn.balls.forEach(b => {
                 if (String(b.batter_id) === String(pavan._id)) {
                     batterFound = true;
                     console.log(`  - Ball Found: Batter: ${b.batter_id}, Runs: ${b.runs_off_bat}`);
                 }
             });
        });
        if (!batterFound) console.log(`  - NO BALLS FOUND FOR THIS USER IN THIS MATCH!`);
    }

    process.exit(0);
}

inspectMatch();
