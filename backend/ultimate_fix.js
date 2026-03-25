const mongoose = require('mongoose');
const Match = require('./models/Match');
const User = require('./models/User');
const statsService = require('./services/statsService');
require('dotenv').config();

async function fix() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    let pavan = await User.findOne({ phone: '7993962018' });
    if (!pavan) pavan = await User.findOne({ name: /Pawan/i });
    
    if (!pavan) {
        console.log("No Pawan found in Registry.");
        process.exit(1);
    }
    
    const pId = pavan._id;
    const pPhone = pavan.phone;
    console.log(`Pawan Found: ${pId} (${pPhone})`);

    // 1. Find all matches where he might be present but unlinked
    const matches = await Match.find({
        status: 'Completed',
        $or: [
            { 'quick_teams.team_a.players.input': pPhone },
            { 'quick_teams.team_b.players.input': pPhone },
            { 'quick_teams.team_a.players.display_name': /Pawan/i },
            { 'quick_teams.team_b.players.display_name': /Pawan/i },
            { 'quick_teams.team_a.players.display_name': /Pavan/i },
            { 'quick_teams.team_b.players.display_name': /Pavan/i }
        ]
    });

    console.log(`Found ${matches.length} matches where Pawan appeared.`);

    let fixedCount = 0;
    for (const m of matches) {
        let changed = false;
        
        ['team_a', 'team_b'].forEach(tk => {
            m.quick_teams?.[tk]?.players?.forEach(p => {
                if ((p.input === pPhone || p.display_name?.match(/Pawan/i) || p.display_name?.match(/Pavan/i)) && !p.user_id) {
                    p.user_id = pId;
                    p.is_linked = true;
                    changed = true;
                }
            });
        });

        // CRITICAL: Update BALLS too!
        // If batter_id matches his name (unlikely to be a name string, usually null if unlinked)
        // We'll rely on the fact that if we link him in quick_teams, we should also link him in the innings.
        // Actually, many times the scoring app stores the index or the name.
        // If batter_id is null, we can't easily know it's him unless we look at the batsmen list.
        
        m.innings.forEach(inn => {
            inn.batsmen.forEach(b => {
                if ((b.name?.match(/Pawan/i) || b.name?.match(/Pavan/i)) && !b.user_id) {
                    b.user_id = pId;
                    changed = true;
                }
            });
            inn.bowlers.forEach(bw => {
                if ((bw.name?.match(/Pawan/i) || bw.name?.match(/Pavan/i)) && !bw.user_id) {
                    bw.user_id = pId;
                    changed = true;
                }
            });
            
            // If we found him in batsmen, let's try to link him in balls too
            // This is hard without knowing which ball is which. 
            // Most ball-by-ball matches in this project store the user_id or the name in batter_id.
            // If batter_id is a String (his name), we'll replace it.
            inn.balls.forEach(ball => {
                if (ball.batter_id && (String(ball.batter_id).match(/Pawan/i) || String(ball.batter_id).match(/Pavan/i))) {
                    ball.batter_id = pId;
                    changed = true;
                }
                if (ball.bowler_id && (String(ball.bowler_id).match(/Pawan/i) || String(ball.bowler_id).match(/Pavan/i))) {
                    ball.bowler_id = pId;
                    changed = true;
                }
            });
        });

        if (changed) {
            console.log(`- Fixed Match ${m._id}`);
            m.stats_updated = false; // Reset to allow recalculation
            await m.save();
            fixedCount++;
        }
    }

    console.log(`Finished fixing ${fixedCount} matches. Now running full recalculation...`);
    await statsService.recalculateAllStats();
    console.log("SUCCESS! Checking final score for Pawan...");
    const finalPawan = await User.findById(pId);
    console.log(`Final Career Score: ${finalPawan.stats.batting.runs}`);
    
    process.exit(0);
}

fix();
