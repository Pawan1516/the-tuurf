/**
 * Tournament Service
 * Handles: fixture generation, NRR calculation, points table, leaderboards, awards
 */

const Tournament = require('../models/Tournament');
const Team = require('../models/Team');
const Match = require('../models/Match');
const User = require('../models/User');

/**
 * Generate round-robin (league) fixtures for all registered & approved teams.
 * Each pair plays exactly once.
 */
async function generateLeagueFixtures(tournamentId, options = {}) {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    const approvedTeams = tournament.registeredTeams
        .filter(t => t.approvalStatus === 'approved')
        .map(t => t.team_id);

    if (approvedTeams.length < 2) throw new Error('Need at least 2 approved teams');

    const { startDate, venues = [], overs = tournament.oversPerMatch } = options;
    const matches = [];
    let matchNumber = 1;
    let dateOffset = 0;

    for (let i = 0; i < approvedTeams.length; i++) {
        for (let j = i + 1; j < approvedTeams.length; j++) {
            const scheduledDate = startDate ? new Date(startDate.getTime() + dateOffset * 86400000) : undefined;
            const venue = venues.length ? venues[dateOffset % venues.length] : tournament.venues[0];

            const match = new Match({
                title: `${tournament.name}: Match ${matchNumber}`,
                tournament: tournament._id,
                team_a: { team_id: approvedTeams[i] },
                team_b: { team_id: approvedTeams[j] },
                overs: overs,
                status: 'Pending',
                matchNumber: matchNumber,
                scheduledAt: scheduledDate,
                venue: venue?.name || ''
            });
            await match.save();
            matches.push(match._id);
            matchNumber++;
            dateOffset++;
        }
    }

    tournament.leagueMatches = matches;
    tournament.status = 'ongoing';
    await tournament.save();

    return { matchesCreated: matches.length, matches };
}

/**
 * Generate knockout bracket from seeded teams.
 * Seeds can come from league standings (points + NRR) or manual input.
 */
async function generateKnockoutBracket(tournamentId, seededTeamIds) {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    const teams = seededTeamIds || getTopTeamsFromPointsTable(tournament);
    
    // Build rounds based on team count
    const roundStructure = buildRoundStructure(teams.length);
    const knockoutRounds = [];

    let currentTeams = [...teams];
    
    for (const round of roundStructure) {
        const roundMatches = [];
        const nextRoundTeams = [];

        for (let i = 0; i < currentTeams.length; i += 2) {
            if (i + 1 < currentTeams.length) {
                const match = new Match({
                    title: `${tournament.name}: ${round} - Match ${i/2 + 1}`,
                    tournament: tournament._id,
                    team_a: { team_id: currentTeams[i] },
                    team_b: { team_id: currentTeams[i + 1] },
                    overs: tournament.oversPerMatch,
                    status: 'Pending',
                    knockoutRound: round,
                    isKnockout: true
                });
                await match.save();
                roundMatches.push(match._id);
            } else {
                // Bye — team advances automatically
                nextRoundTeams.push(currentTeams[i]);
            }
        }

        knockoutRounds.push({ round, matches: roundMatches });
        // Winners will populate next round as matches complete
        currentTeams = []; // Will be filled by match results
    }

    tournament.knockoutRounds = knockoutRounds;
    tournament.status = 'knockout';
    await tournament.save();

    return { rounds: knockoutRounds };
}

function buildRoundStructure(teamCount) {
    const rounds = [];
    if (teamCount >= 16) rounds.push('R16');
    if (teamCount >= 8) rounds.push('QF');
    if (teamCount >= 4) rounds.push('SF');
    rounds.push('F');
    return rounds;
}

function getTopTeamsFromPointsTable(tournament) {
    const n = tournament.leagueTopTeams || 4;
    return tournament.registeredTeams
        .filter(t => t.approvalStatus === 'approved')
        .sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            return b.nrr - a.nrr;
        })
        .slice(0, n)
        .map(t => t.team_id);
}

/**
 * Recalculate NRR for all teams in a tournament.
 * Called after every match result.
 * NRR = (total runs scored / overs faced) - (total runs conceded / overs bowled)
 */
async function calculateNRR(tournamentId) {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) return;

    for (const teamEntry of tournament.registeredTeams) {
        const { runsFor, oversFor, runsAgainst, oversAgainst } = teamEntry;
        
        const runRateFor = oversFor > 0 ? runsFor / oversFor : 0;
        const runRateAgainst = oversAgainst > 0 ? runsAgainst / oversAgainst : 0;
        
        teamEntry.nrr = parseFloat((runRateFor - runRateAgainst).toFixed(4));
    }

    await tournament.save();
    return tournament.registeredTeams;
}

/**
 * Update points table after a match result.
 * @param {string} tournamentId
 * @param {object} result { winnerTeamId, loserTeamId, isDraw, teamAId, teamBId, teamARuns, teamAOvers, teamBRuns, teamBOvers }
 */
async function updatePointsTable(tournamentId, result) {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) return;

    const { winnerTeamId, loserTeamId, isDraw, noResult,
            teamAId, teamBId, 
            teamARuns, teamAOvers, 
            teamBRuns, teamBOvers } = result;

    const findTeam = (id) => tournament.registeredTeams.find(
        t => t.team_id.toString() === id?.toString()
    );

    const teamA = findTeam(teamAId);
    const teamB = findTeam(teamBId);

    if (!teamA || !teamB) return;

    // Update stats for team A
    if (teamARuns !== undefined && teamAOvers !== undefined) {
        teamA.runsFor = (teamA.runsFor || 0) + teamARuns;
        teamA.oversFor = (teamA.oversFor || 0) + teamAOvers;
        teamA.runsAgainst = (teamA.runsAgainst || 0) + teamBRuns;
        teamA.oversAgainst = (teamA.oversAgainst || 0) + teamBOvers;
    }

    // Update stats for team B
    if (teamBRuns !== undefined && teamBOvers !== undefined) {
        teamB.runsFor = (teamB.runsFor || 0) + teamBRuns;
        teamB.oversFor = (teamB.oversFor || 0) + teamBOvers;
        teamB.runsAgainst = (teamB.runsAgainst || 0) + teamARuns;
        teamB.oversAgainst = (teamB.oversAgainst || 0) + teamAOvers;
    }

    // Update played counts
    teamA.played = (teamA.played || 0) + 1;
    teamB.played = (teamB.played || 0) + 1;

    if (noResult) {
        teamA.noResult = (teamA.noResult || 0) + 1;
        teamB.noResult = (teamB.noResult || 0) + 1;
        teamA.points = (teamA.points || 0) + 1;
        teamB.points = (teamB.points || 0) + 1;
    } else if (isDraw) {
        teamA.tied = (teamA.tied || 0) + 1;
        teamB.tied = (teamB.tied || 0) + 1;
        teamA.points = (teamA.points || 0) + 1;
        teamB.points = (teamB.points || 0) + 1;
    } else {
        const winner = findTeam(winnerTeamId);
        const loser = findTeam(loserTeamId);
        if (winner) {
            winner.won = (winner.won || 0) + 1;
            winner.points = (winner.points || 0) + 2;
        }
        if (loser) {
            loser.lost = (loser.lost || 0) + 1;
        }
    }

    await tournament.save();

    // Recalculate NRR
    await calculateNRR(tournamentId);

    return tournament.registeredTeams;
}

/**
 * Compute tournament leaderboards: Orange Cap, Purple Cap, MVP, etc.
 * Aggregates from all match ball events within this tournament.
 */
async function computeLeaderboards(tournamentId) {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) return null;

    const allMatchIds = [
        ...tournament.leagueMatches,
        ...tournament.knockoutRounds.flatMap(r => r.matches)
    ];

    // Aggregate from matches — use existing Match model stats
    const matches = await Match.find({ 
        _id: { $in: allMatchIds },
        status: { $in: ['Completed', 'completed'] }
    });

    // Aggregate player stats across all tournament matches
    const playerStats = {};

    for (const match of matches) {
        const innings = [match.first_innings, match.second_innings].filter(Boolean);
        
        for (const inning of innings) {
            // Batting stats
            if (inning.batsmen) {
                for (const b of inning.batsmen) {
                    const pid = b.player_id?.toString();
                    if (!pid) continue;
                    if (!playerStats[pid]) playerStats[pid] = initPlayerStats(b.player_id, b.name, inning.team_id);
                    playerStats[pid].runs += b.runs || 0;
                    playerStats[pid].ballsFaced += b.balls || 0;
                    playerStats[pid].fours += b.fours || 0;
                    playerStats[pid].sixes += b.sixes || 0;
                    if (b.runs >= 50 && b.runs < 100) playerStats[pid].fifties++;
                    if (b.runs >= 100) playerStats[pid].centuries++;
                    if ((b.runs || 0) > (playerStats[pid].highestScore || 0)) {
                        playerStats[pid].highestScore = b.runs;
                    }
                    playerStats[pid].matches.add(match._id.toString());
                }
            }

            // Bowling stats
            if (inning.bowlers) {
                for (const bwl of inning.bowlers) {
                    const pid = bwl.player_id?.toString();
                    if (!pid) continue;
                    if (!playerStats[pid]) playerStats[pid] = initPlayerStats(bwl.player_id, bwl.name, bwl.team_id);
                    playerStats[pid].wickets += bwl.wickets || 0;
                    playerStats[pid].runsConceded += bwl.runs || 0;
                    playerStats[pid].oversBowled += bwl.overs || 0;
                    playerStats[pid].maidens += bwl.maidens || 0;
                }
            }

            // Fielding stats
            if (inning.fielding) {
                for (const f of inning.fielding) {
                    const pid = f.player_id?.toString();
                    if (!pid) continue;
                    if (!playerStats[pid]) playerStats[pid] = initPlayerStats(f.player_id, f.name, f.team_id);
                    playerStats[pid].catches += f.catches || 0;
                    playerStats[pid].stumpings += f.stumpings || 0;
                    playerStats[pid].runOuts += f.runOuts || 0;
                }
            }
        }
    }

    // Convert to arrays and compute derived stats
    const players = Object.values(playerStats).map(p => {
        const matchCount = p.matches.size;
        return {
            ...p,
            matchCount,
            matches: undefined, // remove Set
            strikeRate: p.ballsFaced > 0 ? parseFloat(((p.runs / p.ballsFaced) * 100).toFixed(2)) : 0,
            average: matchCount > 0 ? parseFloat((p.runs / matchCount).toFixed(2)) : 0,
            economy: p.oversBowled > 0 ? parseFloat((p.runsConceded / p.oversBowled).toFixed(2)) : 0,
            bowlingAverage: p.wickets > 0 ? parseFloat((p.runsConceded / p.wickets).toFixed(2)) : 0,
            // MVP Formula: Runs × 1 + Wickets × 20 + Catches × 10 + Run Outs × 10
            mvpScore: p.runs * 1 + p.wickets * 20 + p.catches * 10 + p.runOuts * 10
        };
    });

    return {
        orangeCap: [...players].filter(p => p.runs > 0).sort((a, b) => b.runs - a.runs).slice(0, 10),
        purpleCap: [...players].filter(p => p.wickets > 0).sort((a, b) => b.wickets - a.wickets).slice(0, 10),
        mvp: [...players].sort((a, b) => b.mvpScore - a.mvpScore).slice(0, 10),
        mostSixes: [...players].filter(p => p.sixes > 0).sort((a, b) => b.sixes - a.sixes).slice(0, 10),
        mostFours: [...players].filter(p => p.fours > 0).sort((a, b) => b.fours - a.fours).slice(0, 10),
        bestStrikeRate: [...players].filter(p => p.ballsFaced >= 20).sort((a, b) => b.strikeRate - a.strikeRate).slice(0, 10),
        bestEconomy: [...players].filter(p => p.oversBowled >= 2).sort((a, b) => a.economy - b.economy).slice(0, 10),
        mostCatches: [...players].filter(p => p.catches > 0).sort((a, b) => b.catches - a.catches).slice(0, 10),
        mostStumpings: [...players].filter(p => p.stumpings > 0).sort((a, b) => b.stumpings - a.stumpings).slice(0, 10)
    };
}

function initPlayerStats(player_id, name, team_id) {
    return {
        player_id,
        name: name || 'Unknown',
        team_id,
        runs: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        highestScore: 0,
        fifties: 0,
        centuries: 0,
        wickets: 0,
        runsConceded: 0,
        oversBowled: 0,
        maidens: 0,
        catches: 0,
        stumpings: 0,
        runOuts: 0,
        matches: new Set()
    };
}

/**
 * Auto-assign tournament awards based on computed leaderboards.
 */
async function assignAwards(tournamentId) {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    const leaderboards = await computeLeaderboards(tournamentId);
    if (!leaderboards) return;

    tournament.awards = tournament.awards || {};

    if (leaderboards.orangeCap.length > 0) {
        tournament.awards.orangeCap = leaderboards.orangeCap[0].player_id;
        tournament.awards.bestBatsman = leaderboards.orangeCap[0].player_id;
    }
    if (leaderboards.purpleCap.length > 0) {
        tournament.awards.purpleCap = leaderboards.purpleCap[0].player_id;
        tournament.awards.bestBowler = leaderboards.purpleCap[0].player_id;
    }
    if (leaderboards.mvp.length > 0) {
        tournament.awards.mvp = leaderboards.mvp[0].player_id;
        tournament.awards.manOfTheTournament = leaderboards.mvp[0].player_id;
    }

    // Winner team from points table
    const winner = tournament.registeredTeams
        .filter(t => t.approvalStatus === 'approved')
        .sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            return b.nrr - a.nrr;
        });
    
    if (winner.length > 0) tournament.awards.winnerTeam = winner[0].team_id;
    if (winner.length > 1) tournament.awards.runnerUpTeam = winner[1].team_id;

    await tournament.save();
    return tournament.awards;
}

/**
 * Get sorted points table for a tournament.
 */
async function getPointsTable(tournamentId) {
    const tournament = await Tournament.findById(tournamentId)
        .populate('registeredTeams.team_id', 'name shortName logo city');
    
    if (!tournament) throw new Error('Tournament not found');

    // Fetch all completed matches to calculate head-to-head results
    const completedMatches = await Match.find({ tournament: tournamentId, status: 'Completed' });

    const table = tournament.registeredTeams
        .filter(t => t.approvalStatus === 'approved');

    table.sort((a, b) => {
        // 1. Points
        if (b.points !== a.points) return b.points - a.points;

        // 2. NRR
        if (b.nrr !== a.nrr) return b.nrr - a.nrr;

        // 3. Head-to-head
        const aIdStr = a.team_id?._id?.toString() || a.team_id?.toString();
        const bIdStr = b.team_id?._id?.toString() || b.team_id?.toString();
        const matchesBetween = completedMatches.filter(m => 
            (m.team_a?.team_id?.toString() === aIdStr && m.team_b?.team_id?.toString() === bIdStr) ||
            (m.team_a?.team_id?.toString() === bIdStr && m.team_b?.team_id?.toString() === aIdStr)
        );
        let aH2HWins = 0;
        let bH2HWins = 0;
        for (const m of matchesBetween) {
            if (m.winner?.toString() === aIdStr) aH2HWins++;
            else if (m.winner?.toString() === bIdStr) bH2HWins++;
        }
        if (bH2HWins !== aH2HWins) return bH2HWins - aH2HWins;

        // 4. Most Wins
        if (b.won !== a.won) return b.won - a.won;

        // 5. Coin toss / default fallback
        return aIdStr.localeCompare(bIdStr);
    });

    return table.map((t, idx) => ({
        position: idx + 1,
        team: t.team_id,
        played: t.played,
        won: t.won,
        lost: t.lost,
        tied: t.tied,
        noResult: t.noResult,
        points: t.points,
        nrr: t.nrr >= 0 ? `+${t.nrr.toFixed(3)}` : t.nrr.toFixed(3),
        nrrRaw: t.nrr
    }));
}

function jsonToCSV(array, headers) {
    const headerRow = headers.map(h => `"${h.label}"`).join(',');
    const rows = array.map(item => {
        return headers.map(h => {
            let val = item[h.key];
            if (val === undefined || val === null) val = '';
            // Escape double quotes
            val = String(val).replace(/"/g, '""');
            return `"${val}"`;
        }).join(',');
    });
    return [headerRow, ...rows].join('\n');
}

async function generateDoubleEliminationBracket(tournamentId, seededTeamIds) {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    const teams = seededTeamIds || tournament.registeredTeams
        .filter(t => t.approvalStatus === 'approved')
        .map(t => t.team_id);

    if (teams.length < 4) throw new Error('Double elimination requires at least 4 approved teams');

    const knockoutRounds = [];

    // WB Round 1
    const wbR1Matches = [];
    for (let i = 0; i < teams.length; i += 2) {
        if (i + 1 < teams.length) {
            const match = new Match({
                title: `${tournament.name}: WB R1 - Match ${i/2 + 1}`,
                tournament: tournament._id,
                team_a: { team_id: teams[i] },
                team_b: { team_id: teams[i + 1] },
                overs: tournament.oversPerMatch,
                status: 'Pending',
                knockoutRound: 'Winners Bracket Round 1',
                isKnockout: true,
                start_time: new Date()
            });
            await match.save();
            wbR1Matches.push(match._id);
        }
    }
    knockoutRounds.push({ round: 'Winners Bracket Round 1', matches: wbR1Matches });

    // LB Round 1 (placeholder teams, populated as WB matches finish)
    const lbR1Matches = [];
    const lbCount = Math.floor(teams.length / 4);
    for (let i = 0; i < lbCount; i++) {
        const match = new Match({
            title: `${tournament.name}: LB R1 - Match ${i + 1}`,
            tournament: tournament._id,
            overs: tournament.oversPerMatch,
            status: 'Pending',
            knockoutRound: 'Losers Bracket Round 1',
            isKnockout: true,
            start_time: new Date()
        });
        await match.save();
        lbR1Matches.push(match._id);
    }
    knockoutRounds.push({ round: 'Losers Bracket Round 1', matches: lbR1Matches });

    // Finals
    const wbFinalMatch = new Match({
        title: `${tournament.name}: WB Final`,
        tournament: tournament._id,
        overs: tournament.oversPerMatch,
        status: 'Pending',
        knockoutRound: 'Winners Bracket Final',
        isKnockout: true,
        start_time: new Date()
    });
    await wbFinalMatch.save();
    knockoutRounds.push({ round: 'Winners Bracket Final', matches: [wbFinalMatch._id] });

    const lbFinalMatch = new Match({
        title: `${tournament.name}: LB Final`,
        tournament: tournament._id,
        overs: tournament.oversPerMatch,
        status: 'Pending',
        knockoutRound: 'Losers Bracket Final',
        isKnockout: true,
        start_time: new Date()
    });
    await lbFinalMatch.save();
    knockoutRounds.push({ round: 'Losers Bracket Final', matches: [lbFinalMatch._id] });

    // Grand Final
    const grandFinalMatch = new Match({
        title: `${tournament.name}: Grand Final`,
        tournament: tournament._id,
        overs: tournament.oversPerMatch,
        status: 'Pending',
        knockoutRound: 'Grand Final',
        isKnockout: true,
        start_time: new Date()
    });
    await grandFinalMatch.save();
    knockoutRounds.push({ round: 'Grand Final', matches: [grandFinalMatch._id] });

    tournament.knockoutRounds = knockoutRounds;
    tournament.status = 'knockout';
    await tournament.save();

    return { rounds: knockoutRounds };
}

async function generateGroupPlayoffFixtures(tournamentId, options = {}) {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    const approvedTeams = tournament.registeredTeams
        .filter(t => t.approvalStatus === 'approved')
        .map(t => t.team_id);

    if (approvedTeams.length < 4) throw new Error('Group Playoff requires at least 4 approved teams');

    const groupA = [];
    const groupB = [];
    for (let i = 0; i < approvedTeams.length; i++) {
        if (i % 2 === 0) groupA.push(approvedTeams[i]);
        else groupB.push(approvedTeams[i]);
    }

    const { startDate, venues = [], overs = tournament.oversPerMatch } = options;
    const matches = [];
    let matchNumber = 1;
    let dateOffset = 0;

    const generateGroupMatches = async (groupTeams, groupName) => {
        for (let i = 0; i < groupTeams.length; i++) {
            for (let j = i + 1; j < groupTeams.length; j++) {
                const scheduledDate = startDate ? new Date(startDate.getTime() + dateOffset * 86400000) : undefined;
                const venue = venues.length ? venues[dateOffset % venues.length] : tournament.venues[0];

                const match = new Match({
                    title: `${tournament.name}: ${groupName} - Match ${matchNumber}`,
                    tournament: tournament._id,
                    team_a: { team_id: groupTeams[i] },
                    team_b: { team_id: groupTeams[j] },
                    overs: overs,
                    status: 'Pending',
                    matchNumber: matchNumber,
                    scheduledAt: scheduledDate,
                    venue: venue?.name || '',
                    start_time: scheduledDate || new Date()
                });
                await match.save();
                matches.push(match._id);
                matchNumber++;
                dateOffset++;
            }
        }
    };

    await generateGroupMatches(groupA, 'Group A');
    await generateGroupMatches(groupB, 'Group B');

    // Create placeholder knockout matches for playoffs (SF1, SF2, Final)
    const sf1 = new Match({
        title: `${tournament.name}: Semifinal 1 (Group A 1st vs Group B 2nd)`,
        tournament: tournament._id,
        overs: overs,
        status: 'Pending',
        knockoutRound: 'SF',
        isKnockout: true,
        start_time: new Date()
    });
    await sf1.save();

    const sf2 = new Match({
        title: `${tournament.name}: Semifinal 2 (Group B 1st vs Group A 2nd)`,
        tournament: tournament._id,
        overs: overs,
        status: 'Pending',
        knockoutRound: 'SF',
        isKnockout: true,
        start_time: new Date()
    });
    await sf2.save();

    const finalMatch = new Match({
        title: `${tournament.name}: Final`,
        tournament: tournament._id,
        overs: overs,
        status: 'Pending',
        knockoutRound: 'F',
        isKnockout: true,
        start_time: new Date()
    });
    await finalMatch.save();

    tournament.leagueMatches = matches;
    tournament.knockoutRounds = [
        { round: 'SF', matches: [sf1._id, sf2._id] },
        { round: 'F', matches: [finalMatch._id] }
    ];
    tournament.status = 'ongoing';
    await tournament.save();

    return { leagueMatchesCreated: matches.length, matches, playoffRounds: tournament.knockoutRounds };
}

async function exportPointsTableCSV(tournamentId) {
    const table = await getPointsTable(tournamentId);
    const headers = [
        { label: 'Position', key: 'position' },
        { label: 'TeamName', key: 'teamName' },
        { label: 'Played', key: 'played' },
        { label: 'Won', key: 'won' },
        { label: 'Lost', key: 'lost' },
        { label: 'Tied', key: 'tied' },
        { label: 'NoResult', key: 'noResult' },
        { label: 'Points', key: 'points' },
        { label: 'NRR', key: 'nrr' }
    ];
    const data = table.map(row => ({
        position: row.position,
        teamName: row.team?.name || 'Unknown',
        played: row.played,
        won: row.won,
        lost: row.lost,
        tied: row.tied,
        noResult: row.noResult,
        points: row.points,
        nrr: row.nrr
    }));
    return jsonToCSV(data, headers);
}

async function exportMatchResultsCSV(tournamentId) {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    const allMatchIds = [
        ...tournament.leagueMatches,
        ...tournament.knockoutRounds.flatMap(r => r.matches)
    ];

    const matches = await Match.find({ _id: { $in: allMatchIds } })
        .populate('team_a.team_id', 'name')
        .populate('team_b.team_id', 'name')
        .populate('result.winner', 'name')
        .sort({ matchNumber: 1, createdAt: 1 });

    const headers = [
        { label: 'Match No', key: 'matchNumber' },
        { label: 'Title', key: 'title' },
        { label: 'Team A', key: 'teamA' },
        { label: 'Team B', key: 'teamB' },
        { label: 'Team A Score', key: 'scoreA' },
        { label: 'Team B Score', key: 'scoreB' },
        { label: 'Status', key: 'status' },
        { label: 'Winner', key: 'winner' },
        { label: 'Won By', key: 'wonBy' },
        { label: 'Margin', key: 'margin' }
    ];

    const data = matches.map((m, idx) => ({
        matchNumber: m.matchNumber || idx + 1,
        title: m.title || '',
        teamA: m.team_a?.team_id?.name || 'Unknown',
        teamB: m.team_b?.team_id?.name || 'Unknown',
        scoreA: m.team_a?.score !== undefined ? `${m.team_a.score}/${m.team_a.wickets} (${m.team_a.overs_played} ov)` : '',
        scoreB: m.team_b?.score !== undefined ? `${m.team_b.score}/${m.team_b.wickets} (${m.team_b.overs_played} ov)` : '',
        status: m.status || 'Pending',
        winner: m.result?.winner?.name || 'N/A',
        wonBy: m.result?.won_by || 'N/A',
        margin: m.result?.margin || 'N/A'
    }));

    return jsonToCSV(data, headers);
}

async function exportPlayerStatsCSV(tournamentId) {
    const allMatchIds = [];
    const tournament = await Tournament.findById(tournamentId);
    if (tournament) {
        allMatchIds.push(...tournament.leagueMatches);
        allMatchIds.push(...tournament.knockoutRounds.flatMap(r => r.matches));
    }

    const matches = await Match.find({ 
        _id: { $in: allMatchIds },
        status: { $in: ['Completed', 'completed'] }
    }).populate('team_a.team_id', 'name').populate('team_b.team_id', 'name');

    const playerStats = {};
    for (const match of matches) {
        for (const inn of match.innings || []) {
            const teamId = inn.batting_team?.toString();
            const teamName = match.team_a?.team_id?._id?.toString() === teamId 
                ? (match.team_a?.team_id?.name || 'Team A')
                : (match.team_b?.team_id?.name || 'Team B');

            for (const b of inn.batsmen || []) {
                if (!b.user_id) continue;
                const pid = b.user_id.toString();
                if (!playerStats[pid]) {
                    playerStats[pid] = {
                        name: b.name,
                        team: teamName,
                        runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0, runsConceded: 0, oversBowled: 0, catches: 0
                    };
                }
                playerStats[pid].runs += (b.runs || 0);
                playerStats[pid].balls += (b.balls || 0);
                playerStats[pid].fours += (b.fours || 0);
                playerStats[pid].sixes += (b.sixes || 0);
            }

            for (const bowler of inn.bowlers || []) {
                if (!bowler.user_id) continue;
                const pid = bowler.user_id.toString();
                if (!playerStats[pid]) {
                    playerStats[pid] = {
                        name: bowler.name,
                        team: teamName,
                        runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0, runsConceded: 0, oversBowled: 0, catches: 0
                    };
                }
                playerStats[pid].wickets += (bowler.wickets || 0);
                playerStats[pid].runsConceded += (bowler.runs || 0);
                playerStats[pid].oversBowled += (bowler.overs || 0);
            }

            for (const ball of inn.balls || []) {
                if (ball.is_wicket && ball.wicket?.dismissal_type === 'Caught' && ball.wicket?.fielder_id) {
                    const fid = ball.wicket.fielder_id.toString();
                    if (playerStats[fid]) {
                        playerStats[fid].catches += 1;
                    }
                }
            }
        }
    }

    const playersArray = Object.values(playerStats);
    const headers = [
        { label: 'Player Name', key: 'name' },
        { label: 'Team', key: 'team' },
        { label: 'Runs Scored', key: 'runs' },
        { label: 'Balls Faced', key: 'balls' },
        { label: 'Fours', key: 'fours' },
        { label: 'Sixes', key: 'sixes' },
        { label: 'Wickets', key: 'wickets' },
        { label: 'Runs Conceded', key: 'runsConceded' },
        { label: 'Overs Bowled', key: 'oversBowled' },
        { label: 'Catches', key: 'catches' }
    ];

    return jsonToCSV(playersArray, headers);
}

module.exports = {
    generateLeagueFixtures,
    generateKnockoutBracket,
    calculateNRR,
    updatePointsTable,
    computeLeaderboards,
    assignAwards,
    getPointsTable,
    generateDoubleEliminationBracket,
    generateGroupPlayoffFixtures,
    exportPointsTableCSV,
    exportMatchResultsCSV,
    exportPlayerStatsCSV
};
