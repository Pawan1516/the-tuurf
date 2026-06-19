const mongoose = require('mongoose');
const Team = require('./models/Team');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const team = await Team.findById('6a2c939bafab3cc0b988d83d');
    if (!team) {
        console.log("Team not found");
    } else {
        console.log(JSON.stringify(team, null, 2));
    }
    await mongoose.disconnect();
}
run();
