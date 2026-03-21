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
                        batting: { runs: 0, balls_faced: 0, fours: 0, sixes: 0, innings: 0, not_outs: 0, fifties: 0, hundreds: 0, high_score: 0 },
                        bowling: { wickets: 0, runs_conceded: 0, balls_bowled: 0, five_wickets: 0, matches: 0 }
                    };
                }
                return playerStats[sid];
            };

            // ── Step 4: Aggregate data from live score data ──────────────
            if (!match.live_data) {
                console.warn(`Match ${matchId}: No live data found for stats update`);
                return { updated: false, reason: 'No live data' };
            }

            const { 
                batters = [], 
                bowlers = [], 
                inn1Batters = [], 
                inn1Bowlers = [] 
            } = match.live_data;

            // Helper to merge stats from both innings
            const processBatter = (b) => {
                if (!b.user_id) return;
                const ps = getPlayerStat(b.user_id);
                ps.batting.runs += (Number(b.r) || 0);
                ps.batting.balls_faced += (Number(b.b) || 0);
                ps.batting.fours += (Number(b.fours || b.f) || 0);
                ps.batting.sixes += (Number(b.sixes || b.s) || 0);
                ps.batting.innings += 1;
                if (!b.out) ps.batting.not_outs += 1;
                if (b.r >= 100) ps.batting.hundreds += 1;
                else if (b.r >= 50) ps.batting.fifties += 1;
                ps.batting.high_score = Math.max(ps.batting.high_score, Number(b.r) || 0);
            };

            const processBowler = (bw) => {
                if (!bw.user_id) return;
                const ps = getPlayerStat(bw.user_id);
                ps.bowling.wickets += (Number(bw.w) || 0);
                ps.bowling.runs_conceded += (Number(bw.r) || 0);
                ps.bowling.balls_bowled += (Number(bw.balls) || 0);
                ps.bowling.matches += 1;
                if (bw.w >= 5) ps.bowling.five_wickets += 1;
            };

            // Process current and previous innings
            batters.forEach(processBatter);
            bowlers.forEach(processBowler);
            inn1Batters.forEach(processBatter);
            inn1Bowlers.forEach(processBowler);

            // ── Step 5: Write to MongoDB Atomic updates ──────────────────
            const updatePromises = Object.entries(playerStats).map(async ([playerId, stats]) => {
                try {
                    const user = await User.findByIdAndUpdate(playerId, {
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
                            'stats.bowling.five_wicket_hauls': stats.bowling.five_wickets
                        },
                        $max: {
                            'stats.batting.high_score': stats.batting.high_score
                        }
                    }, { new: true });

                    if (user) {
                        const b_innings = user.stats.batting.innings || 0;
                        const b_notouts = user.stats.batting.not_outs || 0;
                        const b_divisor = b_innings - b_notouts;
                        const average = b_divisor > 0 ? (user.stats.batting.runs / b_divisor) : user.stats.batting.runs;
                        const sr = user.stats.batting.balls_faced > 0 ? (user.stats.batting.runs / user.stats.batting.balls_faced) * 100 : 0;
                        const b_balls = user.stats.bowling.balls_bowled || 0;
                        const economy = b_balls > 0 ? (user.stats.bowling.runs_conceded / (b_balls / 6)) : 0;
                        const overs = Number(`${Math.floor(b_balls / 6)}.${b_balls % 6}`);

                        await User.findByIdAndUpdate(playerId, {
                            $set: {
                                'stats.batting.average': parseFloat(average.toFixed(2)),
                                'stats.batting.strike_rate': parseFloat(sr.toFixed(2)),
                                'stats.bowling.economy': parseFloat(economy.toFixed(2)),
                                'stats.bowling.overs': overs
                            }
                        });

                        // ── Step 6: Emit Socket.io update to profile room ──────────
                        if (io) {
                            io.to(`profile:${playerId}`).emit('stats:updated', {
                                player_id: playerId,
                                match_id: matchId,
                                message: 'Career stats updated after match completion!'
                            });
                        }
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
