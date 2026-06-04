const mongoose = require('mongoose');
require('dotenv').config();
const Match = require('./models/Match');
const Team = require('./models/Team');
const User = require('./models/User');

const testLiveQuery = async () => {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Querying inProgressMatches...');
        const inProgressMatches = await Match.find({ status: 'In Progress' })
            .populate('team_a.team_id team_b.team_id team_a.captain team_b.captain result.winner')
            .sort({ updatedAt: -1 });
        console.log('inProgressMatches count:', inProgressMatches.length);
        
        console.log('Querying scheduledMatches...');
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const scheduledMatches = await Match.find({
            status: 'Scheduled',
            updatedAt: { $gte: sevenDaysAgo }
        })
        .populate('team_a.team_id team_b.team_id team_a.captain team_b.captain result.winner')
        .sort({ updatedAt: -1 })
        .limit(10);
        console.log('scheduledMatches count:', scheduledMatches.length);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

testLiveQuery();
