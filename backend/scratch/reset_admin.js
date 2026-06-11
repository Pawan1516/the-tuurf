// Quick admin credential reset script
// Resets or creates admin@theturf.com with password admin@123
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  let admin = await Admin.findOne({ email: 'admin@theturf.com' });
  if (admin) {
    // Reset password — update and trigger pre-save hash
    admin.password = 'admin@123';
    admin.loginAttempts = 0;
    admin.lockUntil = undefined;
    await admin.save();
    console.log('✅ Admin password reset to: admin@123');
  } else {
    admin = new Admin({
      name: 'The Turf Admin',
      email: 'admin@theturf.com',
      password: 'admin@123',
      role: 'admin'
    });
    await admin.save();
    console.log('✅ Admin created: admin@theturf.com / admin@123');
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
