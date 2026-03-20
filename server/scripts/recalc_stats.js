const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Relative paths inside server directory
const Match = require('../models/Match');
const User = require('../models/User');
const StatsService = require('../services/statsService');

// Load env (from server/.env)
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function run() {
    try {
        console.log('URI:', process.env.MONGODB_URI ? 'FOUND' : 'MISSING');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Reset all user stats to 0 before recalculating
        console.log('Resetting all user stats to zero...');
        await User.updateMany({}, {
            $set: {
                'stats.batting.matches': 0,
                'stats.batting.innings': 0,
                'stats.batting.not_outs': 0,
                'stats.batting.runs': 0,
                'stats.batting.balls_faced': 0,
                'stats.batting.fours': 0,
                'stats.batting.sixes': 0,
                'stats.batting.fifties': 0,
                'stats.batting.hundreds': 0,
                
                'stats.bowling.matches_bowled': 0,
                'stats.bowling.wickets': 0,
                'stats.bowling.runs_conceded': 0,
                'stats.bowling.balls_bowled': 0
            }
        });

        const completedMatches = await Match.find({ status: { $in: ['Completed', 'COMPLETED'] } });
        console.log(`Found ${completedMatches.length} completed matches.`);

        for (const match of completedMatches) {
            console.log(`Processing Match: ${match._id}`);
            // Force VERIFIED for script purposes
            match.verification.status = 'VERIFIED'; 
            await match.save();
            
            await StatsService.updateCareerStats(match);
        }

        console.log('RECALCULATION COMPLETE.');
        process.exit(0);
    } catch (err) {
        console.error('CRITICAL ERROR:', err);
        process.exit(1);
    }
}

run();
