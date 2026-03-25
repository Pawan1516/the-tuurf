const mongoose = require('mongoose');
const Match = require('./models/Match');
require('dotenv').config();

async function introspect() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Find all completed matches
    const matches = await Match.find({ 
        status: 'Completed',
        'innings.0.balls.0': { $exists: true }
    }).limit(5);

    console.log(`Analyzing ${matches.length} ball-by-ball matches...`);

    for (const m of matches) {
        processMatch(m);
    }
    process.exit(0);
}

function processMatch(m) {
    console.log(`\nMatch ${m._id}: ${m.title}`);
    const b = m.innings[0].balls[0];
    console.log(`- BatterID Type: ${typeof b.batter_id}, Value: ${b.batter_id}`);
    
    // Check if it matches a player name or UserId
    const linkedInQuick = m.quick_teams?.team_a?.players?.filter(p => p.user_id) || [];
    console.log(`- Linked Players in QuickTeam (Team A): ${linkedInQuick.map(p => p.display_name).join(', ')}`);
}

introspect();
