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

        // 1. Process Batting Statistics from Summaries
        for (const inning of match.innings) {
            for (const b of inning.batsmen) {
                if (!b.user_id) continue;
                const pid = b.user_id.toString();
                
                if (!playerStats.has(pid)) playerStats.set(pid, this.initStats());
                const stats = playerStats.get(pid);

                stats.batting.innings += 1;
                stats.batting.runs += (b.runs || 0);
                stats.batting.balls_faced += (b.balls || 0);
                stats.batting.fours += (b.fours || 0);
                stats.batting.sixes += (b.sixes || 0);
                
                if (b.out_type === 'Not Out') stats.batting.not_outs += 1;
                if (b.runs >= 50 && b.runs < 100) stats.batting.fifties += 1;
                if (b.runs >= 100) stats.batting.hundreds += 1;
            }

            // 2. Process Bowling Statistics from Summaries
            for (const bw of inning.bowlers) {
                if (!bw.user_id) continue;
                const pid = bw.user_id.toString();

                if (!playerStats.has(pid)) playerStats.set(pid, this.initStats());
                const stats = playerStats.get(pid);

                stats.bowling.innings_bowled += 1;
                stats.bowling.runs_conceded += (bw.runs || 0);
                stats.bowling.wickets += (bw.wickets || 0);
                stats.bowling.balls_bowled += (bw.balls || 0);
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
