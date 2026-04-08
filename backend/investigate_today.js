const mongoose = require('mongoose');
const Booking = require('./models/Booking');
const Match = require('./models/Match');
require('dotenv').config();

async function checkToday() {
    await mongoose.connect(process.env.MONGODB_URI);
    const now = new Date();
    const start = new Date(now.setUTCHours(0,0,0,0));
    const end = new Date(now.setUTCHours(23,59,59,999));
    
    console.log(`Checking for bookings between ${start.toISOString()} and ${end.toISOString()}`);
    const b = await Booking.find({ date: { $gte: start, $lte: end } });
    console.log(`Common bookings for today: ${b.length}`);
    b.forEach(x => console.log(`- Booking ${x._id} at ${x.startTime}`));
    
    const m = await Match.find({ status: { $ne: 'Completed' } });
    console.log(`Active matches in the entire DB: ${m.length}`);
    
    await mongoose.disconnect();
}

checkToday();
