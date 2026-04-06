const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const matches = await mongoose.connection.db.collection('matches').find({
            updatedAt: { $gte: twentyFourHoursAgo }
        }).toArray();
        console.log(`Recent Matches (24h): ${matches.length}`);
        matches.forEach(m => {
            console.log(`ID: ${m._id} | Title: ${m.title} | Status: ${m.status} | UpdatedAt: ${m.updatedAt}`);
        });
    } finally {
        process.exit(0);
    }
}
check();
