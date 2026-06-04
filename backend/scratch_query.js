require('dotenv').config();
const mongoose = require('mongoose');
const Match = require('./models/Match');

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const match = await Match.findOne().sort({ createdAt: -1 }).lean();
        if (match) {
            console.log('Match Title:', match.title);
            console.log('Match ID:', match._id);
            console.log('Toss:', match.toss);
            console.log('Live Data:', JSON.stringify(match.live_data, null, 2));
        } else {
            console.log('No matches found.');
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
