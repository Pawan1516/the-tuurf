/**
 * tournamentStatsService.js
 *
 * After a tournament match is completed, this service:
 * 1. Identifies every player who batted or bowled in the match
 * 2. Finds (or creates) their tournamentHistory entry for this tournament
 * 3. Increments their stats and updates bests (best score, best bowling)
 * 4. Stores team & tournament metadata on first upsert
 */

const User = require('../models/User');
const Match = require('../models/Match');
const Tournament = require('../models/Tournament');
const mongoose = require('mongoose');

/**
 * Update all players' tournament history stats after a match completes.
 * @param {string} matchId - The completed match _id
 */
async function syncMatchStatsToTournamentHistory(matchId) {
    try {
        const match = await Match.findById(matchId)
            .populate('team_a.team_id', 'name')
            .populate('team_b.team_id', 'name')
            .lean();

        if (!match || !match.tournament) {
            console.log('[TournamentStats] Match has no tournament reference, skipping.');
            return;
        }

        const tournament = await Tournament.findById(match.tournament).lean();
        if (!tournament) return;

        const tournamentId = tournament._id.toString();
        const tournamentName = tournament.name;
        const season = String(new Date(tournament.startDate || tournament.createdAt).getFullYear());

        // Collect per-player stats from both innings
        const playerStatsMap = {}; // userId → { ...stats, teamId, teamName }

        const processInnings = (innings, teamId, teamName) => {
            if (!innings) return;

            // Batsmen
            for (const b of innings.batsmen || []) {
                const uid = b.user_id?.toString();
                if (!uid || !mongoose.Types.ObjectId.isValid(uid)) continue;
                if (!playerStatsMap[uid]) {
                    playerStatsMap[uid] = { teamId, teamName, ...emptyStats() };
                }
                const s = playerStatsMap[uid];
                s.matches += 1;
                s.runs += b.runs || 0;
                s.balls_faced += b.balls || 0;
                if ((b.runs || 0) > s.best_score) s.best_score = b.runs;
                if ((b.runs || 0) >= 100) s.hundreds += 1;
                else if ((b.runs || 0) >= 50) s.fifties += 1;
                if (b.dismissal_type === 'not out' || b.dismissed === false) s.not_outs += 1;
            }

            // Bowlers
            for (const bw of innings.bowlers || []) {
                const uid = bw.user_id?.toString();
                if (!uid || !mongoose.Types.ObjectId.isValid(uid)) continue;
                if (!playerStatsMap[uid]) {
                    playerStatsMap[uid] = { teamId, teamName, ...emptyStats() };
                }
                const s = playerStatsMap[uid];
                // Don't double-count matches (batsmen already counted)
                if (s.matches === 0) s.matches += 1;
                s.wickets += bw.wickets || 0;
                s.overs_bowled += bw.overs || 0;
                s.runs_conceded += bw.runs || 0;
                // Best bowling: more wickets is better; equal wickets fewer runs is better
                if (
                    (bw.wickets || 0) > s.best_bowling_wickets ||
                    ((bw.wickets || 0) === s.best_bowling_wickets && (bw.runs || 999) < s.best_bowling_runs)
                ) {
                    s.best_bowling_wickets = bw.wickets || 0;
                    s.best_bowling_runs = bw.runs || 0;
                }
            }

            // Fielding (catches, run-outs, stumpings from ball_history)
            for (const ball of innings.ball_history || []) {
                if (ball.is_wicket && ball.fielder_id) {
                    const fid = ball.fielder_id?.toString();
                    if (!fid || !mongoose.Types.ObjectId.isValid(fid)) continue;
                    if (!playerStatsMap[fid]) {
                        playerStatsMap[fid] = { teamId, teamName, ...emptyStats() };
                    }
                    const wicketType = (ball.wicket_type || '').toLowerCase();
                    if (wicketType === 'caught') playerStatsMap[fid].catches += 1;
                    else if (wicketType === 'run out') playerStatsMap[fid].run_outs += 1;
                    else if (wicketType === 'stumped') playerStatsMap[fid].stumpings += 1;
                }
            }
        };

        // Process both teams' innings
        const teamAId = match.team_a?.team_id?._id?.toString() || match.team_a?.team_id?.toString();
        const teamBId = match.team_b?.team_id?._id?.toString() || match.team_b?.team_id?.toString();
        const teamAName = match.team_a?.team_id?.name || 'Team A';
        const teamBName = match.team_b?.team_id?.name || 'Team B';

        // innings[0] is the first team to bat (team_a usually, unless toss says otherwise)
        const innings = match.innings || [];
        if (innings[0]) processInnings(innings[0], teamAId, teamAName);
        if (innings[1]) processInnings(innings[1], teamBId, teamBName);

        // Also parse live_data scorecard format (alternate structure)
        if (match.live_data?.scorecard) {
            const sc = match.live_data.scorecard;
            for (const b of sc.batsmen || []) {
                const uid = b.user_id?.toString();
                if (!uid || !mongoose.Types.ObjectId.isValid(uid)) continue;
                if (!playerStatsMap[uid]) {
                    playerStatsMap[uid] = { teamId: teamAId, teamName: teamAName, ...emptyStats() };
                }
                const s = playerStatsMap[uid];
                if (s.matches === 0) s.matches += 1;
                s.runs = Math.max(s.runs, b.runs || 0);
                s.balls_faced = Math.max(s.balls_faced, b.balls || 0);
                if ((b.runs || 0) > s.best_score) s.best_score = b.runs;
                if ((b.runs || 0) >= 100) s.hundreds = Math.max(s.hundreds, 1);
                else if ((b.runs || 0) >= 50) s.fifties = Math.max(s.fifties, 1);
            }
        }

        // Now bulk-upsert into each user's tournamentHistory
        const updates = Object.entries(playerStatsMap).map(([userId, stats]) =>
            upsertTournamentHistoryEntry(userId, tournamentId, tournamentName, stats, season)
        );

        await Promise.allSettled(updates);
        console.log(`[TournamentStats] ✅ Synced ${Object.keys(playerStatsMap).length} players for tournament ${tournamentName}`);
    } catch (err) {
        console.error('[TournamentStats] Error syncing stats:', err.message);
    }
}

/**
 * Upsert a player's tournament history entry.
 * Uses MongoDB's positional operator to update the matching sub-doc or push a new one.
 */
async function upsertTournamentHistoryEntry(userId, tournamentId, tournamentName, stats, season) {
    const user = await User.findById(userId);
    if (!user) return;

    // Find existing entry for this tournament
    const existing = user.tournamentHistory?.find(
        th => th.tournament_id?.toString() === tournamentId
    );

    if (existing) {
        // Increment stats
        existing.stats.matches += stats.matches;
        existing.stats.runs += stats.runs;
        existing.stats.balls_faced += stats.balls_faced;
        existing.stats.wickets += stats.wickets;
        existing.stats.overs_bowled += stats.overs_bowled;
        existing.stats.runs_conceded += stats.runs_conceded;
        existing.stats.catches += stats.catches;
        existing.stats.run_outs += stats.run_outs;
        existing.stats.stumpings += stats.stumpings;
        existing.stats.fifties += stats.fifties;
        existing.stats.hundreds += stats.hundreds;
        existing.stats.not_outs += stats.not_outs;

        // Best score
        if (stats.best_score > existing.stats.best_score) {
            existing.stats.best_score = stats.best_score;
        }
        // Best bowling
        if (
            stats.best_bowling_wickets > existing.stats.best_bowling_wickets ||
            (stats.best_bowling_wickets === existing.stats.best_bowling_wickets &&
             stats.best_bowling_runs < existing.stats.best_bowling_runs)
        ) {
            existing.stats.best_bowling_wickets = stats.best_bowling_wickets;
            existing.stats.best_bowling_runs = stats.best_bowling_runs;
        }
    } else {
        // Create new entry
        user.tournamentHistory.push({
            tournament_id: tournamentId,
            tournament_name: tournamentName,
            team_id: stats.teamId,
            team_name: stats.teamName,
            season,
            status: 'active',
            result: 'participated',
            stats: {
                matches: stats.matches,
                runs: stats.runs,
                balls_faced: stats.balls_faced,
                wickets: stats.wickets,
                overs_bowled: stats.overs_bowled,
                runs_conceded: stats.runs_conceded,
                catches: stats.catches,
                run_outs: stats.run_outs,
                stumpings: stats.stumpings,
                fifties: stats.fifties,
                hundreds: stats.hundreds,
                best_score: stats.best_score,
                best_bowling_wickets: stats.best_bowling_wickets,
                best_bowling_runs: stats.best_bowling_runs,
                not_outs: stats.not_outs
            }
        });
    }

    await user.save();
}

/**
 * Mark a player's tournament entry as completed with a final result.
 * Called by finalize-awards or when tournament status → 'completed'.
 */
async function finalizePlayerTournamentResult(tournamentId, winnerTeamId, runnerUpTeamId) {
    try {
        const allUsers = await User.find({ 'tournamentHistory.tournament_id': tournamentId });
        const updates = allUsers.map(async user => {
            const entry = user.tournamentHistory.find(th => th.tournament_id?.toString() === tournamentId);
            if (!entry) return;
            entry.status = 'completed';
            entry.completedAt = new Date();
            const teamId = entry.team_id?.toString();
            if (teamId === winnerTeamId?.toString()) entry.result = 'winner';
            else if (teamId === runnerUpTeamId?.toString()) entry.result = 'runner_up';
            else entry.result = 'participated';
            await user.save();
        });
        await Promise.allSettled(updates);
        console.log(`[TournamentStats] ✅ Finalized results for tournament ${tournamentId}`);
    } catch (err) {
        console.error('[TournamentStats] Error finalizing results:', err.message);
    }
}

function emptyStats() {
    return {
        matches: 0, runs: 0, balls_faced: 0,
        wickets: 0, overs_bowled: 0, runs_conceded: 0,
        catches: 0, run_outs: 0, stumpings: 0,
        fifties: 0, hundreds: 0, not_outs: 0,
        best_score: 0, best_bowling_wickets: 0, best_bowling_runs: 999
    };
}

module.exports = {
    syncMatchStatsToTournamentHistory,
    finalizePlayerTournamentResult
};
