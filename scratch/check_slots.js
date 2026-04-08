const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const Slot = require('../backend/models/Slot');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setUTCHours(23, 59, 59, 999);
        
        console.log('Range:', startOfDay.toISOString(), 'to', endOfDay.toISOString());
        
        const slots = await Slot.find({ 
            date: { $gte: startOfDay, $lte: endOfDay } 
        });
        
        console.log('Today slots count:', slots.length);
        if (slots.length > 0) {
            console.log('Example slot:', JSON.stringify(slots[0], null, 2));
        }
        
        const allSlots = await Slot.find({}).limit(5);
        console.log('All slots count (first 5):', allSlots.length);
        allSlots.forEach(s => console.log(`Slot ID: ${s._id}, Date: ${s.date.toISOString()}, Status: ${s.status}`));
        
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

check();
