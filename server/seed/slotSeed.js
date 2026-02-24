const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Slot = require('../models/Slot');

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected for seeding slots...');
    } catch (error) {
        console.error('Connection error:', error.message);
        process.exit(1);
    }
};

const seedSlots = async () => {
    await connectDB();

    try {
        await Slot.deleteMany();
        console.log('Old slots cleared.');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const generateSlots = (date) => {
            const slots = [];
            // Generate from 7 AM to 11 PM
            for (let hour = 7; hour < 23; hour++) {
                const hourStr = hour.toString().padStart(2, '0');
                const nextHourStr = (hour + 1).toString().padStart(2, '0');

                slots.push({
                    date: date,
                    startTime: `${hourStr}:00`,
                    endTime: `${nextHourStr}:00`,
                    status: Math.random() > 0.8 ? 'booked' : 'free',
                    price: 500
                });
            }
            return slots;
        };

        const allSlots = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            allSlots.push(...generateSlots(date));
        }

        await Slot.insertMany(allSlots);
        console.log(`✅ ${allSlots.length} hourly slots (7 AM - 11 PM) seeded for the next 7 days!`);
        process.exit();
    } catch (error) {
        console.error('Error seeding slots:', error);
        process.exit(1);
    }
};

seedSlots();
