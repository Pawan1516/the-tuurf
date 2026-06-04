import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: 'player' | 'owner' | 'admin';
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: { lat: number; lng: number };
  };
  isVerified: boolean;
  isPhoneVerified: boolean;
  isKYCVerified: boolean;
  kycDocuments?: Array<{
    documentType: 'aadhar' | 'passport' | 'license';
    documentNumber: string;
    uploadedAt: Date;
    isVerified: boolean;
  }>;
  bankAccount?: {
    accountNumber: string;
    ifscCode: string;
    accountHolder: string;
    bankName: string;
  };
  wallet: {
    balance: number;
    transactions: Schema.Types.ObjectId[];
  };
  preferences: {
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };
  isActive: boolean;
  isBlocked: boolean;
  blockReason?: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    avatar: String,
    role: { type: String, enum: ['player', 'owner', 'admin'], default: 'player' },
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
        coordinates: [Number] // [longitude, latitude]
      }
    },
    isVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    isKYCVerified: { type: Boolean, default: false },
    kycDocuments: [
      {
        documentType: String,
        documentNumber: String,
        uploadedAt: Date,
        isVerified: Boolean
      }
    ],
    bankAccount: {
      accountNumber: String,
      ifscCode: String,
      accountHolder: String,
      bankName: String
    },
    wallet: {
      balance: { type: Number, default: 0 },
      transactions: [{ type: Schema.Types.ObjectId, ref: 'Transaction' }]
    },
    preferences: {
      language: { type: String, default: 'en' },
      timezone: { type: String, default: 'UTC' },
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: true },
        push: { type: Boolean, default: true }
      }
    },
    isActive: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false },
    blockReason: String,
    lastLogin: Date
  },
  { timestamps: true }
);

// Index for geospatial queries
UserSchema.index({ 'address.coordinates': '2dsphere' });
UserSchema.index({ email: 1 });
UserSchema.index({ phone: 1 });

export default mongoose.model<IUser>('User', UserSchema);
