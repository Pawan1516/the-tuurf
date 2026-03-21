const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const Worker = require('../models/Worker');
const Slot = require('../models/Slot');
require('dotenv').config();

const seedData = async () => {
    try {
        console.log('⏳ Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Seed Admin
        console.log('⏳ Seeding Admin...');
        const adminEmail = 'admin@theturf.com';
        const adminExists = await Admin.findOne({ email: adminEmail });
        if (!adminExists) {
            await Admin.create({
                name: 'The Turf Admin',
                email: adminEmail,
                password: process.env.ADMIN_PASSWORD || 'admin@123',
                role: 'admin'
            });
            console.log('✅ Admin created: admin@theturf.com');
        } else {
            console.log('ℹ️ Admin already exists');
        }

        // 2. Seed Workers
        console.log('⏳ Seeding Workers...');
        const workers = [
            { name: 'Rahul Sharma', email: 'rahul@theturf.com', phone: '9876543210', password: 'worker@123' },
            { name: 'Amit Kumar', email: 'amit@theturf.com', phone: '9876543211', password: 'worker@123' }
        ];

        for (const workerData of workers) {
            const exists = await Worker.findOne({ email: workerData.email });
            if (!exists) {
                await Worker.create(workerData);
                console.log(`✅ Worker created: ${workerData.name}`);
            }
        }

        // 3. Seed Slots (Next 7 days, 07:00 - 23:00)
        console.log('⏳ Seeding Slots...');
        await Slot.deleteMany({}); // Start fresh
        const slots = [];
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
            const date = new Date();
            date.setDate(date.getDate() + dayOffset);
            date.setUTCHours(0, 0, 0, 0);

            for (let hour = 7; hour < 23; hour++) {
                slots.push({
                    date: date,
                    startTime: `${hour.toString().padStart(2, '0')}:00`,
                    endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
                    status: 'free',
                    price: 500
                });
            }
        }
        await Slot.insertMany(slots);
        console.log(`✅ Created ${slots.length} slots for the next 7 days`);

        console.log('🚀 Seeding complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
        process.exit(1);
    }
};

seedData();
