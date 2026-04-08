const mongoose = require('mongoose');
const Match = require('./models/Match');
const User = require('./models/User');
require('dotenv').config();

async function createLiveMatch() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    let user = await User.findOne(); 
    if (!user) {
        user = await User.create({
            name: 'Pavan',
            phone: '7702715890',
            password: 'password123',
            role: 'PLAYER'
        });
    }

    const now = new Date();
    
    const match = new Match({
        title: 'Miyapur Arena Live Scorers Test', // No "Quick Match" in title to avoid auto-purge logic
        format: 'T10',
        status: 'In Progress',
        start_time: now,
        match_mode: 'QUICK',
        quick_teams: {
            team_a: {
                name: 'Hyderabad Lions',
                players: [{ display_name: user.name, user_id: user._id, batting_position: 1 }]
            },
            team_b: {
                name: 'Bengaluru Bulls',
                players: []
            }
        },
        team_a: { score: 104, wickets: 4, overs_played: 8.2 },
        team_b: { score: 0, wickets: 0, overs_played: 0 },
        live_data: {
            runs: 104,
            wickets: 4,
            overNum: 8,
            ballInOver: 2,
            batters: [
                { name: user.name, r: 52, b: 24, batting: true },
                { name: 'Karthik', r: 12, b: 8, batting: true }
            ],
            bowlers: [
                { name: 'Suresh', balls: 14, r: 35, w: 2, current: true }
            ]
        },
        verification: { status: 'VERIFIED' }
    });

    await match.save();
    console.log(`✅ Live Match Created: ${match._id} | Title: ${match.title}`);
    await mongoose.disconnect();
}

createLiveMatch();
