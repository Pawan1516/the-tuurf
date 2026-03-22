require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const sampleStats = {
    batting: {
        runs: 5420,
        average: 45.2,
        strike_rate: 135.5,
        high_score: 112,
        fours: 450,
        sixes: 120,
        not_outs: 12,
        fifties: 35,
        hundreds: 5,
        innings: 120,
        matches: 125
    },
    bowling: {
        wickets: 85,
        economy: 6.8,
        overs: 320.4,
        balls_bowled: 1924,
        runs_conceded: 2150,
        three_wicket_hauls: 4,
        five_wicket_hauls: 1,
        best_bowling: { wickets: 5, runs: 24 },
        matches: 100
    },
    fielding: {
        catches: 45,
        run_outs: 12,
        stumpings: 0
    }
};

const seedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to Main Database');

        // Update the current user (if one exists) or create a test pro user
        const users = await User.find({ role: 'PLAYER' }).limit(5);
        
        if (users.length > 0) {
            for (const user of users) {
                user.stats = sampleStats;
                user.cricket_profile = {
                    primary_role: 'All-rounder',
                    batting_style: 'Right-hand bat',
                    bowling_style: 'Right-arm medium'
                };
                await user.save();
                console.log(`📊 Updated stats for player: ${user.name}`);
            }
        } else {
            console.log('⚠️ No players found to update. Seed manually or register first.');
        }

        console.log('🚀 Main Profile Sync Complete!');
        process.exit();
    } catch (err) {
        console.error('❌ Sync Error:', err);
        process.exit(1);
    }
};

seedUsers();
