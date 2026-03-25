const mongoose = require('mongoose');
const Match = require('./models/Match');
require('dotenv').config();

async function trace() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Find all completed matches
    const matches = await Match.find({ status: 'Completed' }).limit(10);
    console.log(`Found ${matches.length} completed matches.`);

    for (const m of matches) {
        console.log(`\n--- Match ${m._id} (${m.title}) ---`);
        console.log(`Balls Count: ${m.innings[0]?.balls?.length || 0}`);
        
        let linkedPlayers = 0;
        ['team_a', 'team_b'].forEach(tk => {
            m.quick_teams?.[tk]?.players?.forEach(p => {
                if (p.user_id) linkedPlayers++;
                if (p.user_id) console.log(`  - Linked Player: ${p.display_name} -> ${p.user_id}`);
            });
        });
        console.log(`Total Linked Players in QuickTeams: ${linkedPlayers}`);

        if (m.innings[0]?.balls?.length > 0) {
            const sampleBall = m.innings[0].balls[0];
            console.log(`Sample Ball Batter ID: ${sampleBall.batter_id || 'NULL'}`);
        }
    }
    process.exit(0);
}

trace();
