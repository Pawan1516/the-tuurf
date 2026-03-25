const mongoose = require('mongoose');
const Match = require('c:\\Users\\Pawan\\OneDrive\\Desktop\\The Turf\\backend\\models\\Match');
const User = require('c:\\Users\\Pawan\\OneDrive\\Desktop\\The Turf\\backend\\models\\User');
const statsService = require('c:\\Users\\Pawan\\OneDrive\\Desktop\\The Turf\\backend\\services\\statsService');
require('dotenv').config({ path: 'c:\\Users\\Pawan\\OneDrive\\Desktop\\The Turf\\backend\\.env' });

async function repairPavanStats() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to Database for Repair...');

        const pavan = await User.findOne({ phone: '7993962018' });
        if (!pavan) {
            console.error('User Pawan not found!');
            process.exit(1);
        }

        const pavanId = pavan._id.toString();
        const pavanPhone = pavan.phone;

        console.log(`Repairing stats for: ${pavan.name} (${pavanId})`);

        // 1. Find all matches where he is in quick_teams as a linked player OR matching mobile
        const matches = await Match.find({
            $or: [
                { 'quick_teams.team_a.players.user_id': pavan._id },
                { 'quick_teams.team_b.players.user_id': pavan._id },
                { 'quick_teams.team_a.players.input': pavanPhone },
                { 'quick_teams.team_b.players.input': pavanPhone }
            ]
        });

        console.log(`Found ${matches.length} matches to check for unlinked data...`);

        let updatedMatchesCount = 0;

        for (const m of matches) {
            let matchChanged = false;
            
            // Ensure he is marked as linked in quick_teams
            ['team_a', 'team_b'].forEach(teamKey => {
                m.quick_teams[teamKey].players.forEach(p => {
                    if (p.input === pavanPhone && (!p.user_id || !p.is_linked)) {
                        p.user_id = pavan._id;
                        p.is_linked = true;
                        matchChanged = true;
                        console.log(`- Linked player in Quick Match ${m._id} (${m.title})`);
                    }
                });
            });

            // Update balls array
            m.innings.forEach(inn => {
                inn.balls.forEach(ball => {
                    // We don't have mobile in balls, but we might have nothing in batter_id
                    // This is hard because we don't know which ball belongs to whom if ID is missing.
                    // BUT, in many cases, if it was a quick match, the batter_id might have been a name or something.
                    // Actually, let's look at the batsmen/bowlers arrays which might have names.
                });

                // Check batsmen array (often has names or user_ids)
                inn.batsmen.forEach(b => {
                    if (!b.user_id && (b.name === pavan.name || b.name === 'Pawan' || b.name === 'Pavan')) {
                        b.user_id = pavan._id;
                        matchChanged = true;
                    } else if (b.user_id && b.user_id.toString() === pavanId) {
                        // Already linked
                    }
                });

                inn.bowlers.forEach(bw => {
                    if (!bw.user_id && (bw.name === pavan.name || bw.name === 'Pawan' || bw.name === 'Pavan')) {
                        bw.user_id = pavan._id;
                        matchChanged = true;
                    }
                });
            });

            if (matchChanged) {
                m.stats_updated = false; // Force re-recalculation for this match
                await m.save();
                updatedMatchesCount++;
            }
        }

        console.log(`Repaired and reset stats_updated flag for ${updatedMatchesCount} matches.`);

        // 2. Trigger Full Recalculation
        console.log('Triggering full career stats recalculation...');
        await statsService.recalculateAllStats();

        console.log('✅ Stats Repair Complete!');
        process.exit(0);
    } catch (err) {
        console.error('Repair Error:', err);
        process.exit(1);
    }
}

repairPavanStats();
