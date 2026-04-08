const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const Booking = require('../backend/models/Booking');
const User = require('../backend/models/User');

async function diag() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        const bookings = await Booking.find({ 
            $or: [
                { userName: { $regex: 'PAVAN', $options: 'i' } },
                { userPhone: { $regex: '7993962018' } }
            ]
        }).sort({ createdAt: -1 });

        console.log(`--- Bookings Found: ${bookings.length} ---`);
        bookings.forEach(b => {
            console.log(`ID: ${b._id}, Status: ${b.bookingStatus}, UserID: ${b.userId}, mobileNumber: ${b.mobileNumber}, userPhone: ${b.userPhone}`);
        });

        const users = await User.find({
            $or: [
                { name: { $regex: 'PAVAN', $options: 'i' } },
                { phone: { $regex: '7993962018' } }
            ]
        });

        console.log(`--- Users Found: ${users.length} ---`);
        users.forEach(u => {
            console.log(`ID: ${u._id}, Name: ${u.name}, Phone: ${u.phone}, mobileNumber: ${u.mobileNumber}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

diag();
