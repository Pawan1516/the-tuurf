const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Turf = require('../models/Turf');

const TURFS = [
  {
    name: 'The Turf Miyapur',
    slug: 'the-turf-miyapur',
    location: 'Plot no 491, Madhavapuri Hills, PJR Enclave, PJR Layout, Miyapur, Hyderabad',
    city: 'Hyderabad',
    mapLink: 'https://maps.google.com/?q=The+Turf+Miyapur+Hyderabad',
    images: [
      'https://lh3.googleusercontent.com/p/AF1QipNPrYKn27LUcosUUL_CKc_0kJAwvZidmXHu1fQI=w426-h240-k-no',
      'https://lh3.googleusercontent.com/p/AF1QipMsbwyFcmcNneeEsp6NfnXw27Ovyk38W3LqHRk_=w203-h114-k-no',
      'https://lh3.googleusercontent.com/gps-cs-s/AHVAwepkoP29RPlPNGboLneeOgvbhpHEwA99AxCpM55ViIdwNpOmphYvagNoffmNoh8g6xJ52bLQCmpLWMh1MxvnOZixgrwC8qCtHVvW5STmUmO_pWnP3Tem2-ceTSUzPnUxUazvfe1NBw=w203-h152-k-no',
      'https://lh3.googleusercontent.com/p/AF1QipOn7CkSrcWUs8IeOSKZFX0MT1NMp37Evqr1sSPZ=w203-h152-k-no'
    ],
    coverImage: 'https://lh3.googleusercontent.com/p/AF1QipNPrYKn27LUcosUUL_CKc_0kJAwvZidmXHu1fQI=w426-h240-k-no',
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
    rating: 4.5,
    reviewCount: 36,
    isActive: true,
    isFeatured: true,
    contact: {
      phone: '+919177xxxxxx',
      whatsapp: '+919177xxxxxx'
    },
    description: 'Experience the future of sports at The Turf Miyapur, a high-performance 90ft x 60ft arena in Hyderabad. Tailored for intense 5-a-side football and box cricket, our facility merges world-class synthetic turf with a state-of-the-art digital ecosystem. Experience seamless access via QR-based verification, real-time AI-assisted booking, and instant WhatsApp notifications. Whether you’re a corporate squad or a local team, our integrated Live Scoring and Player Statistics keep you on the leaderboard, while on-site amenities like a cafeteria and dedicated parking ensure a pro-tier experience from 6 AM to 11 PM.',
    tags: ['Smart Arena', 'AI Booking', 'Live Scoring', 'QR Check-in', 'Pro Stats', 'Box Cricket Hub'],
    
    // Real Analysis Data
    aiAnalysis: {
      bestTime: '06:00 PM – 09:00 PM',
      idealGroupSize: '5 vs 5 / 6 vs 6',
      targetAudience: 'Corporate & Friends',
      playStyle: 'High-Tempo Tactical',
      surfaceCondition: 'Premium Hybrid Synthetic'
    },
    businessAnalysis: {
      revenueStatus: 'Peak Demand Phase',
      occupancyRate: 88,
      popularDays: ['Friday', 'Saturday', 'Sunday'],
      averageSessionLength: 90,
      matchIntensity: 'Competitive Semi-Pro'
    }
  },
  {
    name: 'The Turf Kondapur',
    slug: 'the-turf-kondapur',
    location: 'Kondapur, HITEC City, Hyderabad',
    city: 'Hyderabad',
    sports: ['Football', 'Cricket'],
    groundSize: '100x70 ft',
    capacity: 22,
    amenities: ['Washroom', 'Parking', 'Changing Room', 'Lighting'],
    openingHour: 5,
    closingHour: 23,
    pricing: {
      weekdayDay: 1200,
      weekdayNight: 1400,
      weekendDay: 1500,
      weekendNight: 1800,
      transitionHour: 17
    },
    rating: 4.2,
    reviewCount: 24,
    isActive: true,
    isFeatured: false,
    description: 'Spacious turf near HITEC City, popular with IT professionals for evening matches.',
    tags: ['hitec', 'kondapur', 'football', 'cricket']
  },
  {
    name: 'The Turf Gachibowli',
    slug: 'the-turf-gachibowli',
    location: 'Financial District, Gachibowli, Hyderabad',
    city: 'Hyderabad',
    sports: ['Football', 'Box Cricket', 'Basketball'],
    groundSize: '120x80 ft',
    capacity: 30,
    amenities: ['Washroom', 'Parking', 'Cafeteria', 'Equipment', 'Lighting', 'First Aid'],
    openingHour: 6,
    closingHour: 23,
    pricing: {
      weekdayDay: 1500,
      weekdayNight: 1800,
      weekendDay: 2000,
      weekendNight: 2500,
      transitionHour: 17
    },
    rating: 4.8,
    reviewCount: 89,
    isActive: true,
    isFeatured: true,
    description: 'The largest and most premium turf in Hyderabad. Multiple ground options with FIFA-standard artificial grass.',
    tags: ['premium', 'large', 'gachibowli', 'financial-district', 'football']
  }
];

async function seedTurfs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
    console.log('✅ Connected to MongoDB');

    for (const data of TURFS) {
      await Turf.findOneAndUpdate({ slug: data.slug }, data, { upsert: true, new: true });
      console.log(`✅ Seeded/Updated: ${data.name}`);
    }

    console.log('🎉 Turf seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err.message);
    process.exit(1);
  }
}

seedTurfs();
