const User = require('../models/User');
const Team = require('../models/Team');

class StatsService {
    /**
     * @desc Update career statistics after a VERIFIED match completion
     * @param {Object} match - The Match document
     */
    static async updateCareerStats(match) {
        if (match.verification.status !== 'VERIFIED') {
            console.log(`[StatsService] Skipping stats update for Match ${match._id} (Status: ${match.verification.status})`);
            return { success: false, reason: 'NOT_VERIFIED' };
        }

        console.log(`[StatsService] Processing stats for Match ${match._id}...`);

        const playerStats = new Map(); // player_id -> { batting: {}, bowling: {} }

        // Iterate through all innings and balls
        for (const innings of match.innings) {
            for (const ball of innings.balls) {
                const { batsman_id, bowler_id, delivery } = ball;
                const { runs, is_wicket, wicket, extras } = delivery;

                // Batting Stats
                if (batsman_id) {
                    if (!playerStats.has(batsman_id.toString())) {
                        playerStats.set(batsman_id.toString(), this.initStats());
                    }
                    const stats = playerStats.get(batsman_id.toString());
                    stats.batting.runs += runs;
                    stats.batting.balls_faced += (extras.type === 'wide' ? 0 : 1);
                    if (runs === 4) stats.batting.fours += 1;
                    if (runs === 6) stats.batting.sixes += 1;
                }

                // Bowling Stats
                if (bowler_id) {
                    if (!playerStats.has(bowler_id.toString())) {
                        playerStats.set(bowler_id.toString(), this.initStats());
                    }
                    const stats = playerStats.get(bowler_id.toString());
                    stats.bowling.runs_conceded += (runs + extras.runs);
                    stats.bowling.balls_bowled += (extras.type === 'wide' || extras.type === 'noball' ? 0 : 1);
                    
                    if (is_wicket && wicket && !['runout', 'retired'].includes(wicket.type)) {
                        stats.bowling.wickets += 1;
                    }
                }
            }

            // At the end of innings, mark who batted and their dismissals
            for (const b of innings.batsmen) {
                if (!playerStats.has(b.user_id.toString())) {
                    playerStats.set(b.user_id.toString(), this.initStats());
                }
                const stats = playerStats.get(b.user_id.toString());
                stats.batting.innings += 1;
                if (b.out_type === 'Not Out') {
                    stats.batting.not_outs += 1;
                }
                if (b.runs >= 50 && b.runs < 100) stats.batting.fifties += 1;
                if (b.runs >= 100) stats.batting.hundreds += 1;
            }

            for (const br of innings.bowlers) {
                 if (!playerStats.has(br.user_id.toString())) {
                    playerStats.set(br.user_id.toString(), this.initStats());
                }
                const stats = playerStats.get(br.user_id.toString());
                stats.bowling.innings_bowled += 1;
            }
        }

        // Perform atomic updates to MongoDB (Users)
        const updatePromises = [];
        for (const [playerId, stats] of playerStats.entries()) {
            if (!playerId || playerId === 'null' || playerId === 'undefined') continue;
            
            updatePromises.push(User.findByIdAndUpdate(playerId, {
                $inc: {
                    'stats.batting.matches': 1,
                    'stats.batting.innings': stats.batting.innings,
                    'stats.batting.not_outs': stats.batting.not_outs,
                    'stats.batting.runs': stats.batting.runs,
                    'stats.batting.balls_faced': stats.batting.balls_faced,
                    'stats.batting.fours': stats.batting.fours,
                    'stats.batting.sixes': stats.batting.sixes,
                    'stats.batting.fifties': stats.batting.fifties,
                    'stats.batting.hundreds': stats.batting.hundreds,
                    
                    'stats.bowling.matches_bowled': stats.bowling.innings_bowled,
                    'stats.bowling.wickets': stats.bowling.wickets,
                    'stats.bowling.runs_conceded': stats.bowling.runs_conceded,
                    'stats.bowling.balls_bowled': stats.bowling.balls_bowled
                }
            }));
        }

        // Update Team Records (Skip for QUICK matches with no team IDs)
        if (match.match_mode === 'REGISTERED' && match.result.winner) {
            updatePromises.push(Team.findByIdAndUpdate(match.result.winner, { $inc: { 'stats.wins': 1, 'stats.matches_played': 1 } }));
            const loserId = match.team_a.team_id.toString() === match.result.winner.toString() ? match.team_b.team_id : match.team_a.team_id;
            if (loserId) {
                updatePromises.push(Team.findByIdAndUpdate(loserId, { $inc: { 'stats.losses': 1, 'stats.matches_played': 1 } }));
            }
        }

        await Promise.all(updatePromises);
        console.log(`[StatsService] Career stats updated successfully for ${playerStats.size} players.`);
        return { success: true };
    }

    static initStats() {
        return {
            batting: { innings: 0, not_outs: 0, runs: 0, balls_faced: 0, fours: 0, sixes: 0, fifties: 0, hundreds: 0 },
            bowling: { innings_bowled: 0, wickets: 0, runs_conceded: 0, balls_bowled: 0 }
        };
    }
}

module.exports = StatsService;
