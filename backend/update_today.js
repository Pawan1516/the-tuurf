const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { autoGenerateSlots } = require('./utils/slotGenerator');
const connectDB = require('./config/db');

dotenv.config();

const update = async () => {
    try {
        await connectDB();
        console.log('--- Manual Slot Generation Start ---');
        await autoGenerateSlots(30); // Generate for 30 days
        console.log('--- Manual Slot Generation Complete ---');
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

update();
