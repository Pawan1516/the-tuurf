
const mongoose = require('mongoose');
require('dotenv').config({path: './backend/.env'});
const User = require('./backend/models/User');

async function test() {
    try {
        console.log('Connecting to:', process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000
        });
        const count = await User.countDocuments({ role: 'PLAYER' });
        console.log('Total Players in DB:', count);
        const users = await User.find({ role: 'PLAYER' }).limit(5).select('name stats.batting.runs');
        console.log(JSON.stringify(users, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        mongoose.disconnect();
    }
}

test();
