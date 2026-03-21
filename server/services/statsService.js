const Match = require('../models/Match');
const User = require('../models/User');

class StatsService {
    async updatePlayerStats(matchId, io = null) {
        try {
            const Match = require('../models/Match');
            const User = require('../models/User');

            const match = await Match.findById(matchId);
            if (!match) throw new Error('Match not found');

            // ── Step 1: Guard against double-run ──────────────────
            if (match.stats_updated) {
                console.log(`Match ${matchId}: stats already updated, skipping`);
                return { skipped: true };
            }

            // ── Step 2: Verification gate ─────────────────────────
            if (match.verification?.status !== 'VERIFIED' && !match.is_offline_match) {
                console.log(`Match ${matchId}: not verified, stats skipped`);
                return { updated: false, reason: 'Not verified' };
            }

            // ── Step 3: Mark as processing ────────────────────────
            match.stats_updated = true;
            await match.save();

            const playerStats = {}; // keyed by player_id
            const getPlayerStat = (id) => {
                const sid = id.toString();
                if (!playerStats[sid]) {
                    playerStats[sid] = {
                        batting: { runs: 0, balls_faced: 0, fours: 0, sixes: 0, innings: 1, not_outs: 0, fifties: 0, hundreds: 0, high_score: 0 },
                        bowling: { wickets: 0, runs_conceded: 0, balls_bowled: 0, five_wickets: 0, matches: 1 },
                        fielding: { catches: 0, run_outs: 0, stumpings: 0 }
                    };
                }
                return playerStats[sid];
            };

            // ── Step 4: Aggregate stats from granular balls array ──────────────

            for (const innings of match.innings) {
                // Determine if player got out in this innings to calculate not_outs
                const outPlayers = new Set();
                
                for (const ball of innings.balls || []) {
                    // Batter Stats
                    if (ball.batter_id) {
                        const ps = getPlayerStat(ball.batter_id);
                        ps.batting.runs += (Number(ball.runs_off_bat) || 0);
                        // Legal ball counted for strike rate (not wides)
                        if (ball.extra_type !== 'wide') ps.batting.balls_faced += 1;
                        if (ball.is_four) ps.batting.fours += 1;
                        if (ball.is_six) ps.batting.sixes += 1;
                        if (ball.is_wicket && String(ball.wicket?.player_out_id) === String(ball.batter_id)) {
                           outPlayers.add(String(ball.batter_id));
                        }
                    }

                    // Bowler Stats
                    if (ball.bowler_id) {
                        const ps = getPlayerStat(ball.bowler_id);
                        const runsThisBall = (Number(ball.runs_off_bat) || 0) + (Number(ball.extra_runs) || 0);
                        // Byes and Leg Byes don't count against bowler in most formats, but for simplicity we follow runsConceded
                        if (ball.extra_type !== 'bye' && ball.extra_type !== 'legbye') {
                            ps.bowling.runs_conceded += runsThisBall;
                        }
                        // Legal delivery for over count (not wides or no-balls usually)
                        if (ball.extra_type !== 'wide' && ball.extra_type !== 'noball') {
                            ps.bowling.balls_bowled += 1;
                        }
                        // Wickets
                        if (ball.is_wicket && ball.wicket?.is_bowler_wicket) {
                            ps.bowling.wickets += 1;
                        }
                    }

                    // Fielding Stats
                    if (ball.is_wicket && ball.wicket?.fielder_id) {
                        const dType = ball.wicket.dismissal_type;
                        const ps = getPlayerStat(ball.wicket.fielder_id);
                        if (dType === 'caught') ps.fielding.catches += 1;
                        else if (dType === 'runout') ps.fielding.run_outs += 1;
                        else if (dType === 'stumped') ps.fielding.stumpings += 1;
                    }
                }

                // Check Not-Outs (if they batted but never got out in balls array)
                const batteredThisInnings = new Set((innings.balls || []).map(b => String(b.batter_id)));
                batteredThisInnings.forEach(pid => {
                    if (!outPlayers.has(pid)) {
                        getPlayerStat(pid).batting.not_outs += 1;
                    }
                });
            }

            // High Score & Milestone Checks
            Object.values(playerStats).forEach(ps => {
                if (ps.batting.runs >= 100) ps.batting.hundreds = 1;
                else if (ps.batting.runs >= 50) ps.batting.fifties = 1;
                ps.batting.high_score = ps.batting.runs;
                
                if (ps.bowling.wickets >= 5) ps.bowling.five_wickets = 1;
                else if (ps.bowling.wickets >= 3) ps.bowling.three_wickets = 1;
            });

            // ── Step 5: Write to MongoDB Atomic updates ──────────────────
            const updatePromises = Object.entries(playerStats).map(async ([playerId, stats]) => {
                try {
                    // We must fetch the user to check best bowling figure before strictly updating
                    const user = await User.findById(playerId);
                    if (!user) return;
                    
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
                            'stats.bowling.matches': stats.bowling.matches > 0 ? 1 : 0,
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

                    // Check for best bowling figure
                    const currentBestWickets = user.stats?.bowling?.best_bowling?.wickets || 0;
                    const currentBestRuns = user.stats?.bowling?.best_bowling?.runs || 0;
                    
                    if (stats.bowling.wickets > currentBestWickets || 
                       (stats.bowling.wickets === currentBestWickets && stats.bowling.runs_conceded < currentBestRuns && stats.bowling.wickets > 0)) {
                        updates.$set['stats.bowling.best_bowling.wickets'] = stats.bowling.wickets;
                        updates.$set['stats.bowling.best_bowling.runs'] = stats.bowling.runs_conceded;
                    }

                    // Derived stats
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

                    const updatedUser = await User.findByIdAndUpdate(playerId, updates, { new: true });

                    // ── Step 6: Emit Socket.io update to profile room ──────────
                    if (io && updatedUser) {
                        io.to(`profile:${playerId}`).emit('stats:updated', {
                            player_id: playerId,
                            match_id: matchId,
                            message: 'Career stats updated after match completion!'
                        });
                    }
                } catch (err) {
                    console.error(`Error updating stats for player ${playerId}:`, err);
                }
            });

            await Promise.all(updatePromises);
            console.log(`🚀 Match ${matchId}: Updated ${Object.keys(playerStats).length} career profiles.`);
            return { success: true };
        } catch (error) {
            console.error('Stats Update Error:', error);
            throw error;
        }
    }
}

module.exports = new StatsService();
