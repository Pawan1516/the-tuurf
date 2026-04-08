const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const Booking = require('../backend/models/Booking');

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for migration.');

        const bookings = await Booking.find({ 
            $or: [
                { mobileNumber: { $exists: false } },
                { mobileNumber: null },
                { mobileNumber: "" }
            ]
        });

        console.log(`Found ${bookings.length} bookings to migrate.`);

        let updatedCount = 0;
        for (const booking of bookings) {
            const phone = booking.userPhone || booking.phone;
            if (phone) {
                const clean = phone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
                if (clean.length === 10) {
                    booking.mobileNumber = clean;
                    // Also sync other missing fields if possible
                    if (!booking.name) booking.name = booking.userName;
                    if (!booking.status) booking.status = booking.bookingStatus;
                    
                    await booking.save();
                    updatedCount++;
                }
            }
        }

        console.log(`Migration complete. Updated ${updatedCount} bookings.`);
        
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await mongoose.disconnect();
    }
}

migrate();
