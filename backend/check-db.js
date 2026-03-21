const mongoose = require('mongoose');
require('dotenv').config();

const checkDatabase = async () => {
  try {
    console.log('🔍 Connecting to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
    });
    
    console.log('✅ Connected to MongoDB');
    
    const db = conn.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log('\n📊 Collections in database:');
    collections.forEach(col => console.log(`  - ${col.name}`));
    
    // Check each collection for document count
    console.log('\n📈 Document counts:');
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`  ${col.name}: ${count} documents`);
    }
    
    // Show sample data from users collection if it exists
    const userCollection = collections.find(c => c.name === 'users');
    if (userCollection) {
      console.log('\n👥 Sample users:');
      const users = await db.collection('users').find({}).limit(3).toArray();
      console.log(JSON.stringify(users, null, 2));
    }
    
    // Show sample slots if they exist
    const slotCollection = collections.find(c => c.name === 'slots');
    if (slotCollection) {
      console.log('\n🎯 Sample slots:');
      const slots = await db.collection('slots').find({}).limit(2).toArray();
      console.log(JSON.stringify(slots, null, 2));
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

checkDatabase();
