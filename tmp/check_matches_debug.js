const mongoose = require('mongoose');
const Match = require('c:\\Users\\Pawan\\OneDrive\\Desktop\\The Turf\\backend\\models\\Match');
require('dotenv').config({ path: 'c:\\Users\\Pawan\\OneDrive\\Desktop\\The Turf\\backend\\.env' });

async function checkMatches() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const total = await Match.countDocuments();
    const completed = await Match.countDocuments({ status: 'Completed' });
    const verified = await Match.countDocuments({ 'verification.status': 'VERIFIED' });
    const offline = await Match.countDocuments({ is_offline_match: true });
    const quick = await Match.countDocuments({ match_mode: 'QUICK' });

    console.log(`Total Matches: ${total}`);
    console.log(`Completed Matches: ${completed}`);
    console.log(`Verified Matches: ${verified}`);
    console.log(`Offline Matches: ${offline}`);
    console.log(`Quick Matches: ${quick}`);

    const finishedUnverified = await Match.countDocuments({ 
        status: 'Completed', 
        'verification.status': { $ne: 'VERIFIED' },
        is_offline_match: false
    });
    console.log(`Completed but Unverified Matches: ${finishedUnverified}`);

    if (finishedUnverified > 0) {
        const sample = await Match.find({ 
            status: 'Completed', 
            'verification.status': { $ne: 'VERIFIED' },
            is_offline_match: false
        }).limit(5);
        sample.forEach(m => console.log(`Sample Match ID: ${m._id}, Status: ${m.status}, Mode: ${m.match_mode}`));
    }

    process.exit(0);
}

checkMatches();
