const mongoose = require('mongoose');
require('dotenv').config();
const Booking = require('./models/Booking');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0,0,0,0);
        
        const b = await Booking.find({ createdAt: { $gte: start } });
        console.log('--- MONTHLY BOOKINGS ---');
        console.log(JSON.stringify(b.map(x => ({
            id: x._id,
            status: x.bookingStatus,
            created: x.createdAt,
            amount: x.amount,
            total: x.totalAmount
        })), null, 2));
        
        const confirmed = b.filter(x => x.bookingStatus === 'confirmed');
        const revenue = confirmed.reduce((sum, x) => sum + (x.totalAmount || x.amount || 0), 0);
        console.log('--- STATS ---');
        console.log(`Total Bookings: ${b.length}`);
        console.log(`Confirmed: ${confirmed.length}`);
        console.log(`Calculated Revenue: ${revenue}`);
        
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
