const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Worker = require('./models/Worker');
const connectDB = require('./config/db');

dotenv.config();

const check = async () => {
    await connectDB();
    const workers = await Worker.find();
    console.log(`Found ${workers.length} workers.`);
    workers.forEach(w => console.log(`${w.name} (${w._id})`));
    process.exit(0);
};

check();
