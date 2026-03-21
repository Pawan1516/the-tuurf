const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

const adminSeed = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB connected');

        // Check if admin already exists
        const adminExists = await Admin.findOne({ email: 'admin@theturf.com' });
        if (adminExists) {
            console.log('✓ Admin already exists');
            process.exit(0);
        }

        // Create admin
        const admin = new Admin({
            name: 'Admin',
            email: 'admin@theturf.com',
            password: process.env.ADMIN_PASSWORD || 'admin@123',
            role: 'admin'
        });

        await admin.save();
        console.log('✓ Admin created successfully');
        console.log(`Email: admin@theturf.com`);
        console.log(`Password: ${process.env.ADMIN_PASSWORD || 'admin@123'}`);

        process.exit(0);
    } catch (error) {
        console.error('✗ Error seeding admin:', error.message);
        process.exit(1);
    }
};

// Run seed if this file is executed directly
if (require.main === module) {
    adminSeed();
}

module.exports = adminSeed;
