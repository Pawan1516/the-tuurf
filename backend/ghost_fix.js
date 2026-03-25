const mongoose = require('mongoose');
const Match = require('./models/Match');
const User = require('./models/User');
const statsService = require('./services/statsService');
require('dotenv').config();

async function fixGhostIds() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected.");
    
    // 1. Get Pawan's ID
    const pavan = await User.findOne({ phone: '7993962018' });
    if (!pavan) { console.error("Pawan NOT FOUND!"); process.exit(1); }
    const REAL_PAWAN_ID = pavan._id;
    console.log(`REAL Pawan ID: ${REAL_PAWAN_ID} (Name: ${pavan.name})`);

    // 2. Find ALL Completed matches
    const matches = await Match.find({ status: 'Completed' });
    console.log(`Searching through ${matches.length} matches...`);

    let totalRepairCount = 0;
    for (const m of matches) {
        let changed = false;
        const ghostMap = new Map(); // Old ID -> Real ID

        // Step A: Build the Ghost Mapping by looking in quick_teams
        ['team_a', 'team_b'].forEach(tk => {
            m.quick_teams?.[tk]?.players?.forEach(p => {
                // If this player is linked (now), search for any existing Ghost ID they might have in this match
                if (p.user_id && String(p.user_id) === String(REAL_PAWAN_ID)) {
                    // Try to find if they are in batsmen/bowlers with a DIFFERENT ID but same name
                    m.innings.forEach(inn => {
                        inn.batsmen.forEach(b => {
                            if ( (String(b.name).toLowerCase().includes('pavan') || String(b.name).toLowerCase().includes('pawan')) && String(b.user_id) !== String(REAL_PAWAN_ID) ) {
                                 ghostMap.set(String(b.user_id), REAL_PAWAN_ID);
                                 console.log(`Mapping GhostID ${b.user_id} -> ${REAL_PAWAN_ID} (Pavan in Match ${m._id})`);
                            }
                        });
                        inn.bowlers.forEach(bw => {
                            if ( (String(bw.name).toLowerCase().includes('pavan') || String(bw.name).toLowerCase().includes('pawan')) && String(bw.user_id) !== String(REAL_PAWAN_ID) ) {
                                 ghostMap.set(String(bw.user_id), REAL_PAWAN_ID);
                            }
                        });
                    });
                }
            });
        });

        // Step B: Bulk Repair everything using the Ghost Map
        if (ghostMap.size > 0) {
            m.innings.forEach(inn => {
                // Fix summary arrays
                inn.batsmen.forEach(b => {
                    if (ghostMap.has(String(b.user_id))) {
                        b.user_id = ghostMap.get(String(b.user_id));
                        changed = true;
                    }
                });
                inn.bowlers.forEach(bw => {
                    if (ghostMap.has(String(bw.user_id))) {
                        bw.user_id = ghostMap.get(String(bw.user_id));
                        changed = true;
                    }
                });
                // Fix BALLS array (CRITICAL)
                inn.balls.forEach(ball => {
                    if (ghostMap.has(String(ball.batter_id))) {
                        ball.batter_id = ghostMap.get(String(ball.batter_id));
                        changed = true;
                    }
                    if (ghostMap.has(String(ball.bowler_id))) {
                        ball.bowler_id = ghostMap.get(String(ball.bowler_id));
                        changed = true;
                    }
                    if (ball.wicket && ghostMap.has(String(ball.wicket.player_out_id))) {
                        ball.wicket.player_out_id = ghostMap.get(String(ball.wicket.player_out_id));
                        changed = true;
                    }
                    if (ball.wicket && ghostMap.has(String(ball.wicket.fielder_id))) {
                        ball.wicket.fielder_id = ghostMap.get(String(ball.wicket.fielder_id));
                        changed = true;
                    }
                });
            });
        }

        // ADDITIONAL: Name Check Fallback (if they were never even assigned a Ghost ID, just a Name string)
        m.innings.forEach(inn => {
           inn.balls.forEach(ball => {
               if (ball.batter_id && (String(ball.batter_id).toLowerCase().includes('pavan') || String(ball.batter_id).toLowerCase().includes('pawan'))) {
                   ball.batter_id = REAL_PAWAN_ID;
                   changed = true;
               }
           });
        });

        if (changed) {
            m.stats_updated = false; // Reset to allow recalculation
            await m.save();
            totalRepairCount++;
            console.log(`RARE SUCCESS: Fixed Match ${m._id} for Pawan.`);
        }
    }

    console.log(`Repaired ${totalRepairCount} matches. Now running official recalculation...`);
    await statsService.recalculateAllStats();
    
    console.log("SUCCESS! Checking final score for Pawan...");
    const finalP = await User.findById(REAL_PAWAN_ID);
    console.log(`Final Career Score: ${finalP.stats.batting.runs}`);
    process.exit(0);
}

fixGhostIds();
