const mongoose = require('mongoose');
const User = require('c:\\Users\\Pawan\\OneDrive\\Desktop\\The Turf\\backend\\models\\User');
const Match = require('c:\\Users\\Pawan\\OneDrive\\Desktop\\The Turf\\backend\\models\\Match');
const env = require('dotenv').config({ path: 'c:\\Users\\Pawan\\OneDrive\\Desktop\\The Turf\\backend\\.env' });

async function inspectPavan() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    let pavan = await User.findOne({ phone: '7993962018' });
    if (!pavan) {
        console.log("Pavan not found by phone, searching by name...");
        pavan = await User.findOne({ name: /Pawan/i });
        if (!pavan) {
             console.log("Pavan not found by phone or name");
             process.exit(1);
        }
    }
    
    console.log("User Found:", pavan.name, pavan._id, pavan.phone);
    console.log("Current Stats:", JSON.stringify(pavan.stats, null, 2));

    // Find all matches where this user is linked
    const matchIds = await Match.find({
        $or: [
            { 'team_a.squad.user_id': pavan._id },
            { 'team_b.squad.user_id': pavan._id },
            { 'quick_teams.team_a.players.user_id': pavan._id },
            { 'quick_teams.team_b.players.user_id': pavan._id },
            { 'innings.balls.batter_id': pavan._id },
            { 'innings.balls.bowler_id': pavan._id }
        ]
    }).select('_id status verification is_offline_match');

    console.log(`\nTotal Matches linked to UserID: ${matchIds.length}`);
    matchIds.forEach(m => {
        console.log(`Match ${m._id}: Status: ${m.status}, Verified: ${m.verification?.status}, Offline: ${m.is_offline_match}`);
    });

    // Check ball by ball
    const allMatches = await Match.find({
        'innings.balls.batter_id': pavan._id 
    });
    
    let totalRuns = 0;
    allMatches.forEach(m => {
        m.innings.forEach(inn => {
            inn.balls.forEach(b => {
                if (String(b.batter_id) === String(pavan._id)) {
                    totalRuns += Number(b.runs_off_bat || 0);
                }
            });
        });
    });

    console.log(`\nRaw Calculated Runs from Balls for this UserID: ${totalRuns}`);

    process.exit(0);
}

inspectPavan();
