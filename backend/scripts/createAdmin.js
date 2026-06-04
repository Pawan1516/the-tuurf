/*
 * createAdmin.js – run with `node createAdmin.js`
 * Generates a default admin account if none exists.
 */
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/theturf';

async function main() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('🔗 Connected to MongoDB');
    const existing = await Admin.findOne({ email: 'admin@theturf.com' });
    if (existing) {
      console.log('✅ Admin already exists:', existing.email);
      process.exit(0);
    }
    const admin = new Admin({
      name: 'Super Admin',
      email: 'admin@theturf.com',
      password: 'AdminPass123!', // will be hashed by pre-save hook
      role: 'admin'
    });
    await admin.save();
    console.log('🛡️ Created default admin:', admin.email);
  } catch (err) {
    console.error('❌ Error creating admin:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
