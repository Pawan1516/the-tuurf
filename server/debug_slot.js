const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const check = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const Slot = require('./models/Slot');
    const targetDate = new Date(1773964800000); // 2026-03-20 UTC
    const startTime = "07:00";
    
    console.log('Target Date:', targetDate.toISOString());
    const slot = await Slot.findOne({ date: targetDate, startTime });
    console.log('Slot Found:', slot ? JSON.stringify(slot, null, 2) : 'NOT FOUND');
    
    const allOnDate = await Slot.find({ startTime }).limit(5);
    console.log('First 5 slots with 07:00:', allOnDate.map(s => ({ date: s.date.toISOString(), status: s.status })));
    
    process.exit(0);
};

check();
