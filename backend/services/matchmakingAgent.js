/**
 * 🤖 Matchmaking Agent — Code-Based (No External API)
 * Matches players for turf games based on skill, availability, and past matches.
 */

const User = require('../models/User');

/**
 * Score a potential match between two players (0-100)
 */
function compatibilityScore(playerA, playerB) {
  let score = 50; // Base score

  // Skill level match (same level = bonus)
  const levels = { beginner: 1, intermediate: 2, advanced: 3, pro: 4 };
  const levelA = levels[playerA.cricket_profile?.skill_level] || 2;
  const levelB = levels[playerB.cricket_profile?.skill_level] || 2;
  const levelDiff = Math.abs(levelA - levelB);
  score += (2 - levelDiff) * 10; // max +20 for same level

  // Location proximity (same city = bonus)
  if (playerA.city && playerB.city && playerA.city === playerB.city) {
    score += 15;
  }

  // Mutual play history (played together before = slight penalty for variety)
  const sharedMatches = (playerA.matchIds || []).filter(id =>
    (playerB.matchIds || []).some(bid => String(bid) === String(id))
  ).length;

  if (sharedMatches === 0) score += 10; // fresh matchup bonus
  else if (sharedMatches > 5) score -= 10; // discourage recycling

  // Activity score — recently active players preferred
  const daysSinceActive = playerA.lastActive
    ? Math.floor((Date.now() - new Date(playerA.lastActive)) / 86400000)
    : 60;
  if (daysSinceActive < 7) score += 10;
  else if (daysSinceActive > 30) score -= 10;

  return Math.min(100, Math.max(0, score));
}

/**
 * Find the best team match for a given user
 * Returns a sorted list of suggested players
 */
async function findMatchPlayers(userId, sport = 'Cricket', teamSize = 11) {
  try {
    // Get the requesting player's profile
    const requester = await User.findById(userId).select('name cricket_profile city matchIds lastActive').lean();
    if (!requester) throw new Error('User not found');

    // Get all other active players excluding self
    const candidates = await User.find({
      _id: { $ne: userId },
      role: { $in: ['user', 'player'] }
    }).select('name phone cricket_profile city matchIds lastActive stats').lean();

    // Score each candidate
    const scored = candidates.map(player => ({
      player,
      score: compatibilityScore(requester, player),
      skillLevel: player.cricket_profile?.skill_level || 'intermediate',
      role: player.cricket_profile?.preferred_role || 'All-Rounder',
      stats: player.stats || {}
    }));

    // Sort by compatibility score
    scored.sort((a, b) => b.score - a.score);

    // Create a balanced team — try to get mix of roles
    const roleMap = {
      'Batsman': 0, 'Bowler': 0, 'All-Rounder': 0, 'Wicket-Keeper': 0
    };
    const team = [];

    for (const entry of scored) {
      if (team.length >= teamSize) break;
      const role = entry.role;
      // Prefer Wicket-Keeper first if none selected
      if (role === 'Wicket-Keeper' && roleMap['Wicket-Keeper'] === 0) {
        team.push(entry);
        roleMap[role]++;
        continue;
      }
      // Balance between batsman and bowlers
      if (role === 'Batsman' && roleMap['Batsman'] < Math.ceil(teamSize / 3)) {
        team.push(entry);
        roleMap[role]++;
        continue;
      }
      if (role === 'Bowler' && roleMap['Bowler'] < Math.ceil(teamSize / 3)) {
        team.push(entry);
        roleMap[role]++;
        continue;
      }
      if (role === 'All-Rounder') {
        team.push(entry);
        roleMap[role]++;
        continue;
      }
    }

    // Fill remaining spots from best scored
    for (const entry of scored) {
      if (team.length >= teamSize) break;
      if (!team.find(t => String(t.player._id) === String(entry.player._id))) {
        team.push(entry);
      }
    }

    return {
      success: true,
      requester: { id: requester._id, name: requester.name },
      suggestedTeam: team.slice(0, teamSize).map(t => ({
        id: t.player._id,
        name: t.player.name,
        phone: t.player.phone,
        skillLevel: t.skillLevel,
        role: t.role,
        compatibilityScore: t.score,
        stats: t.stats
      })),
      sport,
      teamSize,
      message: `Found ${team.length} compatible players for your ${sport} match!`
    };
  } catch (err) {
    console.error('Matchmaking agent error:', err.message);
    return { success: false, message: err.message, suggestedTeam: [] };
  }
}

/**
 * Re-book same team after a match
 */
async function rebookSameTeam(matchId) {
  try {
    const Match = require('../models/Match');
    const match = await Match.findById(matchId).lean();
    if (!match) return { success: false, message: 'Match not found' };

    // Extract all players from both teams
    const allPlayerIds = [
      ...(match.team_a?.players || []).map(p => p.player_id || p.user),
      ...(match.team_b?.players || []).map(p => p.player_id || p.user)
    ].filter(Boolean);

    const players = await User.find({ _id: { $in: allPlayerIds } })
      .select('name phone cricket_profile stats').lean();

    return {
      success: true,
      players,
      previousMatch: {
        id: match._id,
        format: match.format,
        overs: match.overs
      },
      message: `Found ${players.length} players from your last match. Ready to rebook!`
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Analytics: Get peak hour insights (code-based, no AI API)
 */
function analyzePeakHours(bookings) {
  const hourCount = {};
  for (const b of bookings) {
    const slot = b.startTime || '12:00';
    const hour = parseInt(slot.split(':')[0]);
    hourCount[hour] = (hourCount[hour] || 0) + 1;
  }
  const sorted = Object.entries(hourCount).sort((a, b) => b[1] - a[1]);
  const peakHour = sorted[0] ? `${sorted[0][0]}:00` : '18:00';
  const peakCount = sorted[0] ? sorted[0][1] : 0;

  return {
    peakHour,
    peakCount,
    hourBreakdown: hourCount,
    insight: `Most bookings happen at ${peakHour} with ${peakCount} reservations. Consider dynamic pricing during this window.`
  };
}

module.exports = { findMatchPlayers, rebookSameTeam, analyzePeakHours, compatibilityScore };
