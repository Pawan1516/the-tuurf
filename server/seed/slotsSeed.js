const mongoose = require('mongoose');
const Slot = require('../models/Slot');
require('dotenv').config();

const slotsSeed = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✓ MongoDB connected');

        // Delete existing slots for clean slate
        await Slot.deleteMany({});
        console.log('✓ Cleared existing slots');

        const slots = [];
        
        // Create slots for next 7 days
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
            const slotDate = new Date();
            slotDate.setDate(slotDate.getDate() + dayOffset);
            const dateString = slotDate.toISOString().split('T')[0]; // YYYY-MM-DD format

            // Create hourly slots from 7 AM to 11 PM (16 slots per day)
            for (let hour = 7; hour < 23; hour++) {
                const startTime = `${hour.toString().padStart(2, '0')}:00`;
                const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;

                const slot = {
                    date: dateString,
                    startTime: startTime,
                    endTime: endTime,
                    status: 'free', // free, booked, or hold
                    assignedWorker: null,
                    createdAt: new Date()
                };

                slots.push(slot);
            }
        }

        // Insert all slots
        await Slot.insertMany(slots);
        console.log(`✓ Created ${slots.length} hourly slots (7 AM to 11 PM)`);
        console.log(`✓ Slots created for next 7 days`);
        console.log(`✓ Each day has 16 hourly slots`);

        process.exit(0);
    } catch (error) {
        console.error('✗ Error seeding slots:', error.message);
        process.exit(1);
    }
};

// Run seed if this file is executed directly
if (require.main === module) {
    slotsSeed();
}

module.exports = slotsSeed;
