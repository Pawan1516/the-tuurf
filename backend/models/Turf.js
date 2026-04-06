const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now }
});

const turfSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, lowercase: true },
  location: { type: String, required: true },
  city: { type: String, default: 'Hyderabad' },
  mapLink: { type: String },
  images: [{ type: String }],
  coverImage: { type: String },
  
  sports: [{
    type: String,
    enum: ['Football', 'Box Cricket', 'Cricket', 'Basketball', 'Badminton', 'Tennis']
  }],
  
  groundSize: { type: String, default: '90x60 ft' },
  capacity: { type: Number, default: 22 },
  
  amenities: [{
    type: String,
    enum: ['Washroom', 'Parking', 'Cafeteria', 'Equipment', 'Lighting', 'Changing Room', 'First Aid', 'WiFi']
  }],
  
  openingHour: { type: Number, default: 6 },   // 6 AM
  closingHour: { type: Number, default: 23 },  // 11 PM
  
  pricing: {
    weekdayDay: { type: Number, default: 1000 },
    weekdayNight: { type: Number, default: 1200 },
    weekendDay: { type: Number, default: 1200 },
    weekendNight: { type: Number, default: 1500 },
    transitionHour: { type: Number, default: 18 } // 6 PM transition
  },
  
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  reviews: [reviewSchema],
  
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  
  contact: {
    phone: String,
    email: String,
    whatsapp: String
  },
  
  description: { type: String, trim: true },
  tags: [String],

  // Advanced Analysis Fields
  aiAnalysis: {
    bestTime: { type: String, default: '18:00 - 20:00' },
    idealGroupSize: { type: String, default: '5 vs 5' },
    targetAudience: { type: String, default: 'Corporate & Friends' },
    playStyle: { type: String, default: 'Tactical' },
    surfaceCondition: { type: String, default: 'Peak' }
  },
  businessAnalysis: {
    revenueStatus: { type: String, default: 'High Demand' },
    occupancyRate: { type: Number, default: 85 },
    popularDays: [String],
    averageSessionLength: { type: Number, default: 90 }, // In minutes
    matchIntensity: { type: String, default: 'Competitive' }
  }
  
}, { timestamps: true });

// Auto-generate slug from name
turfSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  next();
});

module.exports = mongoose.model('Turf', turfSchema);
