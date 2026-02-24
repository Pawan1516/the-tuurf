const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Slot = require('./models/Slot');
const connectDB = require('./config/db');

dotenv.config();

const check = async () => {
    try {
        await connectDB();
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setDate(end.getDate() + 1);

        const count = await Slot.countDocuments({
            date: { $gte: now, $lt: end }
        });

        console.log(`Slots for today (${now.toDateString()}): ${count}`);

        if (count > 0) {
            const slots = await Slot.find({
                date: { $gte: now, $lt: end }
            }).sort({ startTime: 1 });
            console.log('Sample slots:');
            slots.slice(0, 3).forEach(s => console.log(`${s.startTime} - ${s.status}`));
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

check();
