const mongoose = require('mongoose');
require('dotenv').config();
const Slot = require('./models/Slot');

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const dateStr = '2026-04-09';
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCHours(23, 59, 59, 999);
    
    const slots = await Slot.find({ date: { $gte: startOfDay, $lte: endOfDay } });
    console.log(`Found ${slots.length} slots for ${dateStr}`);
    if (slots.length > 0) {
        console.log('First slot:', JSON.stringify(slots[0], null, 2));
    } else {
        // Just find ANY slots to see what dates we HAVE
        const anySlots = await Slot.find().limit(5).sort({ date: 1 });
        console.log('Available slots count:', await Slot.countDocuments());
        console.log('Sample dates:', anySlots.map(s => s.date.toISOString()));
    }
    process.exit(0);
}
check();
