import mongoose, { Schema, Document } from 'mongoose';

export interface ITurf extends Document {
  ownerId: Schema.Types.ObjectId;
  name: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates: { lat: number; lng: number };
  };
  photos: string[];
  amenities: string[];
  courts: Array<{
    courtId: string;
    courtName: string;
    surface: 'grass' | 'artificial' | 'concrete';
    length: number;
    width: number;
    capacity: number;
  }>;
  pricing: {
    pricePerHour: number;
    discounts?: {
      weekday: number;
      weekend: number;
      bulk: { units: number; discount: number };
    };
  };
  operatingHours: {
    [day: string]: { open: string; close: string };
  };
  cancellationPolicy: {
    hoursRequired: number;
    refundPercentage: number;
  };
  rating: number;
  reviews: Schema.Types.ObjectId[];
  isActive: boolean;
  isVerified: boolean;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TurfSchema = new Schema<ITurf>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    description: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point'
        },
        coordinates: [Number]
      }
    },
    photos: [String],
    amenities: [String],
    courts: [
      {
        courtId: String,
        courtName: String,
        surface: { type: String, enum: ['grass', 'artificial', 'concrete'] },
        length: Number,
        width: Number,
        capacity: Number
      }
    ],
    pricing: {
      pricePerHour: { type: Number, required: true },
      discounts: {
        weekday: Number,
        weekend: Number,
        bulk: { units: Number, discount: Number }
      }
    },
    operatingHours: Schema.Types.Mixed,
    cancellationPolicy: {
      hoursRequired: { type: Number, default: 24 },
      refundPercentage: { type: Number, default: 100 }
    },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviews: [{ type: Schema.Types.ObjectId, ref: 'Review' }],
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Indexes
TurfSchema.index({ ownerId: 1 });
TurfSchema.index({ 'address.coordinates': '2dsphere' });
TurfSchema.index({ isActive: 1, isVerified: 1 });

export default mongoose.model<ITurf>('Turf', TurfSchema);
