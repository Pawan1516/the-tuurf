require('dotenv').config();
const mongoose = require('mongoose');
const Match = require('./models/Match');
const User = require('./models/User');

async function fixStats() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('--- Career Stats Repair Tool (v3) ---');
        
        const players = await User.find({ role: { $in: ['PLAYER', 'CAPTAIN', 'user', 'player', 'captain'] } });
        const allMatches = await Match.find({ status: 'Completed' });
        console.log(`Analyzing ${players.length} players across ${allMatches.length} completed matches...`);

        for (const player of players) {
            let totalFours = 0;
            let totalSixes = 0;
            let total3W = 0;
            let total5W = 0;
            let matchedMatches = 0;

            const playerPhone = player.phone ? player.phone.slice(-10) : 'XXXXXXXXXX';
            const playerName = player.name ? player.name.toLowerCase() : 'XXXXXXXXXX';

            for (const match of allMatches) {
                let matchWickets = 0;
                let playerInvolved = false;

                // 1. Check GRANULAR BALLS
                for (const inning of match.innings) {
                    for (const ball of inning.balls || []) {
                        const b_id = ball.batter_id ? String(ball.batter_id) : null;
                        const bw_id = ball.bowler_id ? String(ball.bowler_id) : null;

                        if (b_id === String(player._id)) {
                            playerInvolved = true;
                            if (ball.is_four || ball.runs_off_bat == 4) totalFours++;
                            if (ball.is_six || ball.runs_off_bat == 6) totalSixes++;
                        }
                        if (bw_id === String(player._id)) {
                            playerInvolved = true;
                            if (ball.is_wicket && ball.wicket?.is_bowler_wicket) {
                                matchWickets++;
                            }
                        }
                    }
                }

                // 2. Check LIVE DATA SCORECARD (Fallback)
                if (match.live_data?.scorecard) {
                    const batStat = (match.live_data.scorecard.batsmen || []).find(b => 
                        (b.user_id && String(b.user_id) === String(player._id)) || 
                        (b.name && b.name.toLowerCase() === playerName) ||
                        (b.phone && b.phone.slice(-10) === playerPhone)
                    );
                    if (batStat) {
                        playerInvolved = true;
                        totalFours += (batStat.fours || batStat.f || 0);
                        totalSixes += (batStat.sixes || batStat.s || 0);
                    }
                    const bowlStat = (match.live_data.scorecard.bowlers || []).find(bw => 
                        (bw.user_id && String(bw.user_id) === String(player._id)) || 
                        (bw.name && bw.name.toLowerCase() === playerName) ||
                        (bw.phone && bw.phone.slice(-10) === playerPhone)
                    );
                    if (bowlStat) {
                        playerInvolved = true;
                        matchWickets += (bowlStat.wickets || bowlStat.w || 0);
                    }
                }
                
                if (playerInvolved) {
                    matchedMatches++;
                    if (matchWickets >= 5) total5W++;
                    else if (matchWickets >= 3) total3W++;
                }
            }

            if (matchedMatches > 0) {
                console.log(`Player: ${player.name} | Matches: ${matchedMatches} | Fixed 4s: ${totalFours}, 6s: ${totalSixes}, 3W: ${total3W}, 5W: ${total5W}`);
                
                player.stats.batting.fours = totalFours;
                player.stats.batting.sixes = totalSixes;
                player.stats.bowling.three_wicket_hauls = total3W;
                player.stats.bowling.five_wicket_hauls = total5W;
                
                player.markModified('stats');
                try {
                    await player.save();
                } catch (saveErr) {
                    console.error(`Failed to save ${player.name}:`, saveErr.message);
                }
            }
        }

        console.log('--- Repair Complete ---');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixStats();
