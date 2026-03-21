const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Slot = require('./models/Slot');
const connectDB = require('./config/db');

dotenv.config();

const list = async () => {
    await connectDB();
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setDate(end.getDate() + 1);

    const slots = await Slot.find({ date: { $gte: now, $lt: end } }).sort({ startTime: 1 });
    console.log(`Frequency for ${now.toDateString()}: ${slots.length}`);
    slots.forEach(s => console.log(`${s.startTime} - ${s.endTime}`));
    process.exit(0);
};

list();
