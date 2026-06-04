import mongoose, { Schema, Document } from 'mongoose';

export interface IBooking extends Document {
  bookingNumber: string;
  userId: Schema.Types.ObjectId;
  turfId: Schema.Types.ObjectId;
  courtId: string;
  date: Date;
  startTime: string;
  endTime: string;
  duration: number;
  totalCost: number;
  taxes: number;
  discountApplied: number;
  finalAmount: number;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentId: string;
  transactionId: string;
  bookingStatus: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  addOns?: Array<{ serviceName: string; quantity: number; cost: number }>;
  cancellation?: {
    isCancelled: boolean;
    cancelledBy: Schema.Types.ObjectId;
    cancelledAt: Date;
    reason: string;
    refundAmount: number;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    bookingNumber: { type: String, unique: true, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    turfId: { type: Schema.Types.ObjectId, ref: 'Turf', required: true },
    courtId: { type: String, required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    duration: { type: Number, required: true },
    totalCost: { type: Number, required: true },
    taxes: { type: Number, default: 0 },
    discountApplied: { type: Number, default: 0 },
    finalAmount: { type: Number, required: true },
    paymentStatus: { 
      type: String, 
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    paymentId: String,
    transactionId: String,
    bookingStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending'
    },
    addOns: [
      {
        serviceName: String,
        quantity: Number,
        cost: Number
      }
    ],
    cancellation: {
      isCancelled: Boolean,
      cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
      cancelledAt: Date,
      reason: String,
      refundAmount: Number
    },
    notes: String
  },
  { timestamps: true }
);

// Indexes
BookingSchema.index({ userId: 1, date: -1 });
BookingSchema.index({ turfId: 1, date: -1 });
BookingSchema.index({ bookingStatus: 1 });
BookingSchema.index({ date: 1 });
BookingSchema.index({ bookingNumber: 1 }, { unique: true });

export default mongoose.model<IBooking>('Booking', BookingSchema);
