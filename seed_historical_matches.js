const mongoose = require('mongoose');
const Match = require('./backend/models/Match');
const User = require('./backend/models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend/.env') });

async function seedHistory() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const user = await User.findOne().sort({ 'stats.runs': -1 });
        if (!user) {
            console.log('No user found to seed history for.');
            process.exit(1);
        }

        console.log(`Seeding history for: ${user.name} (${user._id})`);

        // Create 5 fake completed matches
        const matches = [];
        for (let i = 1; i <= 5; i++) {
            const runs = Math.floor(Math.random() * 60) + 10;
            const balls = Math.floor(Math.random() * 30) + 15;
            const wickets = Math.random() > 0.6 ? Math.floor(Math.random() * 3) : 0;
            
            const match = new Match({
                title: `Demo Match ${i} vs Challengers`,
                format: 'T20',
                start_time: new Date(Date.now() - (6 - i) * 86400000),
                status: 'Completed',
                location: 'The Turf Miyapur',
                innings: [{
                    number: 1,
                    batsmen: [{
                        user_id: user._id,
                        name: user.name,
                        runs: runs,
                        balls: balls,
                        fours: Math.floor(runs / 8),
                        sixes: Math.floor(runs / 12),
                        out_type: 'Caught'
                    }],
                    bowlers: [{
                        user_id: user._id,
                        name: user.name,
                        overs: 4,
                        wickets: wickets,
                        runs: 24 + Math.floor(Math.random() * 10)
                    }]
                }],
                result: { won_by: 'Runs', margin: 20 }
            });
            matches.push(match);
        }

        await Match.insertMany(matches);
        console.log(`✅ Seeded 5 historical matches for ${user.name}!`);
        console.log(`👉 Refresh your profile now to see the Batting/Bowling form graphs DRAWING.`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seedHistory();
