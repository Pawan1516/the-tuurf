const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected\n');

    const Booking = require('./models/Booking');
    const User = require('./models/User');

    // ── 1. Show ALL confirmed bookings ──────────────────────────────
    const confirmed = await Booking.find({ 
        $or: [{ status: 'confirmed' }, { bookingStatus: 'confirmed' }] 
    }).sort({ createdAt: -1 }).limit(10);

    console.log(`\n📦 Last 10 CONFIRMED bookings:`);
    confirmed.forEach(b => {
        console.log(`  | _id: ${b._id}`);
        console.log(`  | name: ${b.userName || b.name}`);
        console.log(`  | userPhone: ${b.userPhone}`);
        console.log(`  | mobileNumber: ${b.mobileNumber}`);
        console.log(`  | userId: ${b.userId}`);
        console.log(`  | user: ${b.user}`);
        console.log(`  └─────────────────────────────────`);
    });

    // ── 2. Show ALL registered users with phones ─────────────────────
    const users = await User.find({ phone: { $exists: true } }).select('_id name email phone mobileNumber role');
    console.log(`\n👤 Registered Users (${users.length}):`);
    users.forEach(u => {
        console.log(`  | _id: ${u._id}`);
        console.log(`  | name: ${u.name}`);
        console.log(`  | phone: ${u.phone}`);
        console.log(`  | mobileNumber: ${u.mobileNumber}`);
        console.log(`  | role: ${u.role}`);
        console.log(`  └─────────────────────────────────`);
    });

    // ── 3. Check if phones match ─────────────────────────────────────
    console.log('\n🔍 Cross-reference check:');
    for (const u of users) {
        const cleanPhone = (u.phone || u.mobileNumber || '').replace(/\D/g, '').replace(/^91/, '').slice(-10);
        if (!cleanPhone) continue;
        const matches = confirmed.filter(b => {
            const bPhone = (b.userPhone || b.mobileNumber || '').replace(/\D/g, '').replace(/^91/, '').slice(-10);
            return bPhone === cleanPhone;
        });
        if (matches.length > 0) {
            console.log(`  ✅ User ${u.name} (${cleanPhone}) has ${matches.length} confirmed booking(s)`);
            matches.forEach(b => {
                console.log(`     → Booking: ${b._id} | userId set? ${!!b.userId || !!b.user}`);
            });
        } else {
            console.log(`  ❌ User ${u.name} (${cleanPhone}) — NO matching confirmed bookings by phone`);
        }
    }

    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
