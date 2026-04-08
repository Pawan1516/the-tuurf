const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function list() {
    await mongoose.connect(process.env.MONGODB_URI);
    const users = await User.find().limit(5);
    console.log(JSON.stringify(users, null, 2));
    await mongoose.disconnect();
}
list();
