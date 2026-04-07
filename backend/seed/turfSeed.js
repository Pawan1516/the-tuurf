const mongoose = require('mongoose');
const Turf = require('../models/Turf');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const sampleTurf = {
  name: 'The Turf Miyapur',
  isFeatured: true,
  isActive: true,
  location: 'Plot no 491, Madhavapuri Hills, PJR Enclave, Miyapur, Hyderabad',
  city: 'Hyderabad',
  sports: ['Football', 'Box Cricket'],
  groundSize: '90x60 ft',
  capacity: 22,
  amenities: ['Washroom', 'Parking', 'Cafeteria', 'Equipment', 'Lighting'],
  openingHour: 6,
  closingHour: 23,
  pricing: {
    weekdayDay: 1000,
    weekdayNight: 1200,
    weekendDay: 1200,
    weekendNight: 1500,
    transitionHour: 18
  },
  rating: 4.8,
  reviewCount: 156,
  coverImage: 'https://lh3.googleusercontent.com/p/AF1QipNPrYKn27LUcosUUL_CKc_0kJAwvZidmXHu1fQI=w426-h240-k-no',
  images: [
    'https://lh3.googleusercontent.com/p/AF1QipNPrYKn27LUcosUUL_CKc_0kJAwvZidmXHu1fQI=w426-h240-k-no',
    'https://lh3.googleusercontent.com/p/AF1QipMsbwyFcmcNneeEsp6NfnXw27Ovyk38W3LqHRk_=w203-h114-k-no',
    'https://lh3.googleusercontent.com/p/AF1QipOn7CkSrcWUs8IeOSKZFX0MT1NMp37Evqr1sSPZ=w203-h152-k-no'
  ],
  description: 'Hyderabad’s premier tech-enabled sports arena featuring a high-performance hybrid synthetic surface. Optimized for professional box cricket and 5-a-side football.',
  tags: ['#SmartArena', '#TechTurf', '#MiyapurSports'],
  aiAnalysis: {
    bestTime: '06:00 PM – 10:00 PM',
    idealGroupSize: '6 vs 6 / 5 vs 5',
    targetAudience: 'Semi-Pro & Corporate',
    playStyle: 'Tactical High-Tempo',
    surfaceCondition: 'Premium Hybrid Synthetic'
  },
  businessAnalysis: {
    revenueStatus: 'High Yield Phase',
    occupancyRate: 92,
    popularDays: ['Friday', 'Saturday', 'Sunday'],
    averageSessionLength: 90,
    matchIntensity: 'Competitive Tournament Grade'
  }
};

async function seedTurf() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const existing = await Turf.findOne({ name: sampleTurf.name });
    if (existing) {
      console.log('ℹ️ Turf already exists, updating...');
      await Turf.updateOne({ _id: existing._id }, sampleTurf);
    } else {
      await Turf.create(sampleTurf);
      console.log('✅ Turf seeded successfully!');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

seedTurf();
