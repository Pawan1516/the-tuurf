const mongoose = require('mongoose');
const Match = require('./backend/models/Match');
const User = require('./backend/models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend/.env') });

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const userCount = await User.countDocuments();
        const matchCount = await Match.countDocuments({ status: 'Completed' });

        console.log(`Users: ${userCount}`);
        console.log(`Completed Matches: ${matchCount}`);

        if (userCount > 0) {
            const user = await User.findOne().sort({ 'stats.runs': -1 });
            console.log(`Top User: ${user.name} (${user._id}) - Runs: ${user.stats?.runs || 0}`);
            
            const matches = await Match.find({
                $or: [
                    { 'team_a.squad': user._id },
                    { 'team_b.squad': user._id },
                    { 'innings.batsmen.user_id': user._id }
                ],
                status: 'Completed'
            });
            console.log(`Matches for this user: ${matches.length}`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkData();
