import mongoose from 'mongoose';
import { config } from './environment';

export async function connectDatabase() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('MongoDB connected successfully');

    // Create indexes
    await createIndexes();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

async function createIndexes() {
  try {
    // User indexes
    const User = require('../models/User').default;
    await User.collection.createIndex({ email: 1 });
    await User.collection.createIndex({ phone: 1 });
    await User.collection.createIndex({ 'address.coordinates': '2dsphere' });

    // Turf indexes
    const Turf = require('../models/Turf').default;
    await Turf.collection.createIndex({ ownerId: 1 });
    await Turf.collection.createIndex({ 'address.coordinates': '2dsphere' });

    // Booking indexes
    const Booking = require('../models/Booking').default;
    await Booking.collection.createIndex({ userId: 1, date: -1 });
    await Booking.collection.createIndex({ turfId: 1, date: -1 });
    await Booking.collection.createIndex({ date: 1 });

    // Match indexes
    const Match = require('../models/Match').default;
    await Match.collection.createIndex({ matchDate: -1 });
    await Match.collection.createIndex({ status: 1 });

    console.log('Database indexes created');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
}

export async function disconnectDatabase() {
  try {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
  }
}
