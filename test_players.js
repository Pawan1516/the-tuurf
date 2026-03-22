
const mongoose = require('mongoose');
require('dotenv').config({path: './backend/.env'});
const User = require('./backend/models/User');

async function test() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const users = await User.find({ role: 'PLAYER' }).limit(10).select('name stats.batting.runs stats.bowling.wickets');
        console.log('--- DATABASE PLAYERS ---');
        console.log(JSON.stringify(users, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        mongoose.disconnect();
    }
}

test();
