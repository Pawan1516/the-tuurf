const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });
const Match = require('./backend/models/Match');

async function checkMatches() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        const matches = await Match.find({}).sort({ updatedAt: -1 }).limit(10);
        console.log('--- RECENT MATCHES ---');
        matches.forEach(m => {
            console.log(`ID: ${m._id} | Title: ${m.title} | Status: ${m.status} | UpdatedAt: ${m.updatedAt} | StartTime: ${m.start_time}`);
        });
        
        // Re-check IST Logic in backend
        const istMidnight = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        istMidnight.setHours(0,0,0,0);
        const istNextMidnight = new Date(istMidnight);
        istNextMidnight.setDate(istNextMidnight.getDate() + 1);
        console.log(`IST Midnight: ${istMidnight}`);
        console.log(`IST Next Midnight: ${istNextMidnight}`);
        
        const activeToday = await Match.find({ 
            status: 'In Progress',
            start_time: { $gte: istMidnight, $lte: istNextMidnight }
        });
        console.log(`Live In Progress Today: ${activeToday.length}`);
        
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
        const finishedRecent = await Match.find({ 
            status: 'Completed',
            updatedAt: { $gte: twelveHoursAgo }
        });
        console.log(`Finished Last 12h: ${finishedRecent.length}`);
        
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

checkMatches();
