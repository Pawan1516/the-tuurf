const mongoose = require('mongoose');
const Booking = require('./server/models/Booking');
const Slot = require('./server/models/Slot');
const Worker = require('./server/models/Worker');
const User = require('./server/models/User');
const Admin = require('./server/models/Admin');

const MONGODB_URI = 'mongodb+srv://pvan_db_user:23951A66c0@cluster0.itzk1ia.mongodb.net/the-turf?retryWrites=true&w=majority';

async function cleanup() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✓ Connected to MongoDB');

        // 1. Remove any bookings with 'demo' or 'test' in userName
        const deletedBookings = await Booking.deleteMany({
            $or: [
                { userName: /demo/i },
                { userName: /test/i },
                { paymentStatus: 'pending' } // Optionally remove old pending bookings that might be from testing
            ]
        });
        console.log(`✓ Deleted ${deletedBookings.deletedCount} demo/test bookings`);

        // 2. Clear out any slots that were potentially from mock data if they have weird IDs or properties
        // Actually, our latest generator uses real dates, so we mostly want to ensure the states are clean.
        // Reset any slots currently on 'hold' back to 'free' to ensure a fresh start
        const updatedSlots = await Slot.updateMany({ status: 'hold' }, { status: 'free' });
        console.log(`✓ Reset ${updatedSlots.modifiedCount} held slots to free`);

        // 3. Optional: Remove test accounts if they exist (only if you are sure)
        // const deletedWorkers = await Worker.deleteMany({ email: /test\.com/i });
        // console.log(`✓ Deleted ${deletedWorkers.deletedCount} test workers`);

        console.log('✓ Database maintenance complete.');
        process.exit(0);
    } catch (err) {
        console.error('Cleanup error:', err);
        process.exit(1);
    }
}

cleanup();
