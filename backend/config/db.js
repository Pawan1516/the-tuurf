const mongoose = require('mongoose');
const dns = require('dns');

// Force Node.js to use IPv4 first — fixes most Atlas connection issues
dns.setDefaultResultOrder('ipv4first');

const connectDB = async (retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI is not defined in environment variables.');
      }
      const maskedUri = process.env.MONGODB_URI.replace(/\/\/.*@/, '//****:****@');
      console.log(`⏳ Connection attempt ${attempt}/${retries} to: ${maskedUri}`);

      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        family: 4  // Force IPv4
      });

      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return; // Success — exit the retry loop
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed: ${error.message}`);
      if (attempt < retries) {
        console.log(`🔄 Retrying in 3 seconds...`);
        await new Promise(r => setTimeout(r, 3000));
      } else {
        console.error('❌ All connection attempts failed.');
        console.log('⚠️ Server will continue running, but DB operations will fail.');
        console.log('💡 Fix: Go to MongoDB Atlas → Network Access → Add your current IP address');
      }
    }
  }
};

module.exports = connectDB;
