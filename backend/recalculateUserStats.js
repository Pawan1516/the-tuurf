const mongoose = require('mongoose');
const User = require('./models/User');
const Match = require('./models/Match');
require('dotenv').config({ path: 'c:/Users/Pawan/OneDrive/Desktop/The Turf/backend/.env' });

async function recalculate() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to Registry.');

        const user = await User.findOne({ phone: '7993962018' });
        if (!user) {
            console.log('User Pavan not found.');
            return;
        }

        console.log(`Recalculating Career for Operative: ${user.name} (${user._id})`);

        const stats = {
            batting: { matches: 0, innings: 0, runs: 0, balls_faced: 0, fours: 0, sixes: 0, not_outs: 0, fifties: 0, hundreds: 0, high_score: 0, average: 0, strike_rate: 0 },
            bowling: { matches: 0, wickets: 0, overs: 0, balls_bowled: 0, runs_conceded: 0, economy: 0, best_bowling: { wickets: 0, runs: 0 }, five_wicket_hauls: 0, three_wicket_hauls: 0 },
            fielding: { catches: 0, run_outs: 0, stumpings: 0 }
        };

        // Find matches by ID OR by Phone in quick teams
        const matches = await Match.find({
            status: 'Completed',
            $or: [
                { 'team_a.squad': user._id },
                { 'team_b.squad': user._id },
                { 'quick_teams.team_a.players.user_id': user._id },
                { 'quick_teams.team_b.players.user_id': user._id },
                { 'quick_teams.team_a.players.input': user.phone },
                { 'quick_teams.team_b.players.input': user.phone }
            ]
        });

        console.log(`Found ${matches.length} completed matches in manifests.`);

        matches.forEach(m => {
            let played = false;
            let batted = false;
            let bowled = false;

            m.innings.forEach(inn => {
                // Check batting
                const b = inn.batsmen.find(b => 
                    (b.user_id && b.user_id.toString() === user._id.toString()) || 
                    (b.name && b.name.toLowerCase().includes('pavan'))
                );
                if (b && (b.runs > 0 || b.balls > 0 || b.out_type !== 'Not Out')) {
                    played = true; batted = true;
                    stats.batting.innings++;
                    stats.batting.runs += (b.runs || 0);
                    stats.batting.balls_faced += (b.balls || 0);
                    stats.batting.fours += (b.fours || 0);
                    stats.batting.sixes += (b.sixes || 0);
                    if (b.out_type === 'Not Out') stats.batting.not_outs++;
                    if (b.runs >= 100) stats.batting.hundreds++;
                    else if (b.runs >= 50) stats.batting.fifties++;
                    if (b.runs > stats.batting.high_score) stats.batting.high_score = b.runs;
                }

                // Check bowling
                const bw = inn.bowlers.find(bw => 
                    (bw.user_id && bw.user_id.toString() === user._id.toString()) ||
                    (bw.name && bw.name.toLowerCase().includes('pavan'))
                );
                if (bw && (bw.balls > 0 || bw.wickets > 0)) {
                    played = true; bowled = true;
                    stats.bowling.wickets += (bw.wickets || 0);
                    stats.bowling.runs_conceded += (bw.runs || 0);
                    stats.bowling.balls_bowled += (bw.balls || 0);
                    if (bw.wickets >= 5) stats.bowling.five_wicket_hauls++;
                    else if (bw.wickets >= 3) stats.bowling.three_wicket_hauls++;
                    if (bw.wickets > stats.bowling.best_bowling.wickets || (bw.wickets === stats.bowling.best_bowling.wickets && bw.runs < stats.bowling.best_bowling.runs) || stats.bowling.best_bowling.wickets === 0) {
                        stats.bowling.best_bowling = { wickets: bw.wickets, runs: bw.runs };
                    }
                }
            });

            if (played) {
                stats.batting.matches++;
                if (bowled) stats.bowling.matches++;
            }
        });

        // Calculations
        const dismissals = stats.batting.innings - stats.batting.not_outs;
        stats.batting.average = dismissals > 0 ? parseFloat((stats.batting.runs / dismissals).toFixed(2)) : stats.batting.runs;
        stats.batting.strike_rate = stats.batting.balls_faced > 0 ? parseFloat(((stats.batting.runs / stats.batting.balls_faced) * 100).toFixed(2)) : 0;
        stats.bowling.economy = stats.bowling.balls_bowled > 0 ? parseFloat(((stats.bowling.runs_conceded / stats.bowling.balls_bowled) * 6).toFixed(2)) : 0;
        stats.bowling.overs = parseFloat(`${Math.floor(stats.bowling.balls_bowled / 6)}.${stats.bowling.balls_bowled % 6}`);

        user.stats = stats;
        user.markModified('stats');
        await user.save({ validateBeforeSave: false });

        console.log('--- RECALCULATION COMPLETE ---');
        console.log(`Runs: ${stats.batting.runs}, Wickets: ${stats.bowling.wickets}`);
        process.exit();
    } catch (err) {
        console.error('Fatal Error:', err);
        process.exit(1);
    }
}
recalculate();
