require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const Match = require('./backend/models/Match');
const User = require('./backend/models/User');

async function fixStats() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('--- Career Stats Repair Tool ---');
        
        const players = await User.find({ role: { $in: ['PLAYER', 'CAPTAIN'] } });
        console.log(`Analyzing ${players.length} players...`);

        for (const player of players) {
            let totalFours = 0;
            let totalSixes = 0;
            let total3W = 0;
            let total5W = 0;

            const matches = await Match.find({
                status: 'Completed',
                $or: [
                    { 'innings.balls.batter_id': player._id },
                    { 'innings.balls.bowler_id': player._id }
                ]
            });

            if (matches.length === 0) continue;

            for (const match of matches) {
                let matchWickets = 0;
                for (const inning of match.innings) {
                    for (const ball of inning.balls || []) {
                        if (String(ball.batter_id) === String(player._id)) {
                            if (ball.is_four || ball.runs_off_bat == 4) totalFours++;
                            if (ball.is_six || ball.runs_off_bat == 6) totalSixes++;
                        }
                        if (String(ball.bowler_id) === String(player._id)) {
                            if (ball.is_wicket && ball.wicket?.is_bowler_wicket) {
                                matchWickets++;
                            }
                        }
                    }
                }
                if (matchWickets >= 5) total5W++;
                else if (matchWickets >= 3) total3W++;
            }

            console.log(`Player: ${player.name} | Fixed Fours: ${totalFours}, Sixes: ${totalSixes}, 3W: ${total3W}, 5W: ${total5W}`);

            player.stats.batting.fours = totalFours;
            player.stats.batting.sixes = totalSixes;
            player.stats.bowling.three_wicket_hauls = total3W;
            player.stats.bowling.five_wicket_hauls = total5W;
            
            player.markModified('stats');
            await player.save();
        }

        console.log('--- Repair Complete ---');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixStats();
