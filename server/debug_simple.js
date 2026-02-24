const mongoose = require('mongoose');
require('dotenv').config();
const Slot = mongoose.model('Slot', new mongoose.Schema({ status: String, date: Date, startTime: String }));

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const slots = await Slot.find({ status: { $ne: 'free' } });
        console.log(JSON.stringify(slots, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
