const Match = require('../models/Match');
const User = require('../models/User');

class StatsService {
    async updatePlayerStats(matchId, io = null) {
        try {
            const match = await Match.findById(matchId);
            if (!match) throw new Error('Match not found');

            if (match.stats_updated) {
                console.log(`Match ${matchId}: stats already updated, skipping`);
                return { skipped: true };
            }

            if (match.verification?.status !== 'VERIFIED' && !match.is_offline_match) {
                console.log(`Match ${matchId}: not verified, stats skipped`);
                return { updated: false, reason: 'Not verified' };
            }

            match.stats_updated = true;
            await match.save();

            const resolveUserId = (id) => {
                if (!id) return null;
                const sid = String(id);
                if (match.quick_teams) {
                    for (const teamKey of ['team_a', 'team_b']) {
                        const players = match.quick_teams[teamKey]?.players || [];
                        const p = players.find(x => String(x._id) === sid);
                        if (p && p.user_id) return String(p.user_id);
                    }
                }
                for (const teamKey of ['team_a', 'team_b']) {
                    const players = match[teamKey]?.squad || [];
                    const p = players.find(x => String(x._id) === sid || String(x.user_id) === sid);
                    if (p && p.user_id) return String(p.user_id);
                }
                return sid;
            };

            const playerStats = {}; 
            const getPlayerStat = (id) => {
                let sid = resolveUserId(id);
                if (!sid) sid = String(id);
                if (!playerStats[sid]) {
                    playerStats[sid] = {
                        batting: { runs: 0, balls_faced: 0, fours: 0, sixes: 0, innings: 1, not_outs: 0, fifties: 0, hundreds: 0, high_score: 0 },
                        bowling: { wickets: 0, runs_conceded: 0, balls_bowled: 0, five_wickets: 0, three_wickets: 0, matches: 1 },
                        fielding: { catches: 0, run_outs: 0, stumpings: 0 }
                    };
                }
                return playerStats[sid];
            };

            for (const innings of match.innings) {
                const outPlayers = new Set();
                
                for (const ball of innings.balls || []) {
                    if (ball.batter_id) {
                        const ps = getPlayerStat(ball.batter_id);
                        const runs = Number(ball.runs_off_bat) || 0;
                        ps.batting.runs += runs;
                        if (ball.extra_type !== 'wide') ps.batting.balls_faced += 1;
                        if (ball.is_four || runs === 4) ps.batting.fours += 1;
                        if (ball.is_six || runs === 6) ps.batting.sixes += 1;
                        if (ball.is_wicket && String(ball.wicket?.player_out_id) === String(ball.batter_id)) {
                           outPlayers.add(String(ball.batter_id));
                        }
                    }

                    if (ball.bowler_id) {
                        const ps = getPlayerStat(ball.bowler_id);
                        const runsThisBall = (Number(ball.runs_off_bat) || 0) + (Number(ball.extra_runs) || 0);
                        if (ball.extra_type !== 'bye' && ball.extra_type !== 'legbye') {
                            ps.bowling.runs_conceded += runsThisBall;
                        }
                        if (ball.extra_type !== 'wide' && ball.extra_type !== 'noball') {
                            ps.bowling.balls_bowled += 1;
                        }
                        if (ball.is_wicket && ball.wicket?.is_bowler_wicket) {
                            ps.bowling.wickets += 1;
                        }
                    }

                    if (ball.is_wicket && ball.wicket?.fielder_id) {
                        const ps = getPlayerStat(ball.wicket.fielder_id);
                        const dType = ball.wicket.dismissal_type;
                        if (dType === 'caught') ps.fielding.catches += 1;
                        else if (dType === 'runout') ps.fielding.run_outs += 1;
                        else if (dType === 'stumped') ps.fielding.stumpings += 1;
                    }
                }

                const batteredThisInnings = new Set((innings.balls || []).map(b => String(b.batter_id)));
                batteredThisInnings.forEach(pid => {
                    if (!outPlayers.has(pid)) {
                        getPlayerStat(pid).batting.not_outs += 1;
                    }
                });
            }

            const playerIds = Object.keys(playerStats);
            const users = await User.find({ _id: { $in: playerIds } });
            const userMap = new Map(users.map(u => [u._id.toString(), u]));

            const bulkOps = [];

            for (const [playerId, stats] of Object.entries(playerStats)) {
                const user = userMap.get(playerId);
                if (!user) continue;

                if (stats.batting.runs >= 100) stats.batting.hundreds = 1;
                else if (stats.batting.runs >= 50) stats.batting.fifties = 1;
                stats.batting.high_score = stats.batting.runs;
                
                if (stats.bowling.wickets >= 5) stats.bowling.five_wickets = 1;
                else if (stats.bowling.wickets >= 3) stats.bowling.three_wickets = 1;

                const updates = {
                    $inc: {
                        'stats.batting.matches': 1,
                        'stats.batting.innings': stats.batting.innings,
                        'stats.batting.runs': stats.batting.runs,
                        'stats.batting.balls_faced': stats.batting.balls_faced,
                        'stats.batting.fours': stats.batting.fours,
                        'stats.batting.sixes': stats.batting.sixes,
                        'stats.batting.not_outs': stats.batting.not_outs,
                        'stats.batting.fifties': stats.batting.fifties,
                        'stats.batting.hundreds': stats.batting.hundreds,
                        'stats.bowling.matches': stats.bowling.balls_bowled > 0 ? 1 : 0,
                        'stats.bowling.wickets': stats.bowling.wickets,
                        'stats.bowling.runs_conceded': stats.bowling.runs_conceded,
                        'stats.bowling.balls_bowled': stats.bowling.balls_bowled,
                        'stats.bowling.five_wicket_hauls': stats.bowling.five_wickets || 0,
                        'stats.bowling.three_wicket_hauls': stats.bowling.three_wickets || 0,
                        'stats.fielding.catches': stats.fielding.catches,
                        'stats.fielding.run_outs': stats.fielding.run_outs,
                        'stats.fielding.stumpings': stats.fielding.stumpings
                    },
                    $max: {
                        'stats.batting.high_score': stats.batting.high_score
                    },
                    $set: {}
                };

                const currentBestWickets = user.stats?.bowling?.best_bowling?.wickets || 0;
                const currentBestRuns = user.stats?.bowling?.best_bowling?.runs || 0;
                
                if (stats.bowling.wickets > currentBestWickets || 
                   (stats.bowling.wickets === currentBestWickets && stats.bowling.runs_conceded < currentBestRuns && stats.bowling.wickets > 0)) {
                    updates.$set['stats.bowling.best_bowling.wickets'] = stats.bowling.wickets;
                    updates.$set['stats.bowling.best_bowling.runs'] = stats.bowling.runs_conceded;
                }

                const b_innings = (user.stats?.batting?.innings || 0) + stats.batting.innings;
                const b_notouts = (user.stats?.batting?.not_outs || 0) + stats.batting.not_outs;
                const b_divisor = b_innings - b_notouts;
                const totalRuns = (user.stats?.batting?.runs || 0) + stats.batting.runs;
                const totalBalls = (user.stats?.batting?.balls_faced || 0) + stats.batting.balls_faced;
                
                const average = b_divisor > 0 ? (totalRuns / b_divisor) : totalRuns;
                const sr = totalBalls > 0 ? (totalRuns / totalBalls) * 100 : 0;
                
                const totalBowledBalls = (user.stats?.bowling?.balls_bowled || 0) + stats.bowling.balls_bowled;
                const totalRunsConceded = (user.stats?.bowling?.runs_conceded || 0) + stats.bowling.runs_conceded;
                const economy = totalBowledBalls > 0 ? (totalRunsConceded / (totalBowledBalls / 6)) : 0;
                const overs = Number(`${Math.floor(totalBowledBalls / 6)}.${totalBowledBalls % 6}`);

                updates.$set['stats.batting.average'] = parseFloat(average.toFixed(2));
                updates.$set['stats.batting.strike_rate'] = parseFloat(sr.toFixed(2));
                updates.$set['stats.bowling.economy'] = parseFloat(economy.toFixed(2));
                updates.$set['stats.bowling.overs'] = overs;

                bulkOps.push({
                    updateOne: {
                        filter: { _id: playerId },
                        update: updates
                    }
                });

                if (io) {
                    io.to(`profile:${playerId}`).emit('stats:updated', {
                        player_id: playerId,
                        match_id: matchId,
                        message: 'Career stats updated!'
                    });
                }
            }

            if (bulkOps.length > 0) {
                await User.bulkWrite(bulkOps);
            }

            console.log(`🚀 Match ${matchId}: Bulk updated ${bulkOps.length} career profiles.`);
            return { success: true };
        } catch (error) {
            console.error('Stats Update Error:', error);
        }
    }

    async recalculateAllStats() {
        try {
            console.log("🛠️ Starting complete stats recalculation...");
            
            // 1. Reset all users to baseline
            await User.updateMany({}, {
                $set: {
                    'stats.batting': { matches: 0, innings: 0, runs: 0, balls_faced: 0, fours: 0, sixes: 0, fifties: 0, hundreds: 0, high_score: 0, not_outs: 0, average: 0, strike_rate: 0 },
                    'stats.bowling': { matches: 0, wickets: 0, overs: 0, balls_bowled: 0, runs_conceded: 0, economy: 0, five_wicket_hauls: 0, three_wicket_hauls: 0, best_bowling: { wickets: 0, runs: 0 } },
                    'stats.fielding': { catches: 0, run_outs: 0, stumpings: 0 }
                }
            });

            // 2. Clear stats_updated flags on matches to allow full re-processing
            await Match.updateMany({}, { $set: { stats_updated: false } });

            // 3. Find all verified matches
            const matches = await Match.find({ 
                $or: [
                    { 'verification.status': 'VERIFIED' },
                    { is_offline_match: true }
                ]
            });

            console.log(`📂 Found ${matches.length} verified matches to process.`);

            // 4. Process each match sequentially to ensure accuracy
            for (const m of matches) {
                console.log(`Processing match ${m._id}...`);
                await this.updatePlayerStats(m._id);
            }

            console.log("✅ Stats Recalculation Complete!");
            return { success: true, processed: matches.length };
        } catch (error) {
            console.error('Recalculation Error:', error);
            throw error;
        }
    }
}

module.exports = new StatsService();


