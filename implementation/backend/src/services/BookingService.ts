import User from '../models/User';
import Booking from '../models/Booking';

export class BookingService {
  // Create booking
  async createBooking(bookingData: any) {
    try {
      const booking = new Booking({
        ...bookingData,
        bookingNumber: `BK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        bookingStatus: 'pending'
      });

      await booking.save();
      return {
        success: true,
        data: booking
      };
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }

  // Confirm booking after payment
  async confirmBooking(bookingId: string, paymentId: string) {
    try {
      const booking = await Booking.findByIdAndUpdate(
        bookingId,
        {
          $set: {
            paymentStatus: 'completed',
            paymentId,
            bookingStatus: 'confirmed'
          }
        },
        { new: true }
      );

      return {
        success: true,
        message: 'Booking confirmed',
        data: booking
      };
    } catch (error) {
      console.error('Error confirming booking:', error);
      throw error;
    }
  }

  // Get user bookings
  async getUserBookings(userId: string) {
    try {
      const bookings = await Booking.find({ userId })
        .populate('turfId')
        .sort({ date: -1 });

      return {
        success: true,
        data: bookings
      };
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      throw error;
    }
  }

  // Cancel booking
  async cancelBooking(bookingId: string, reason: string) {
    try {
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Calculate refund based on cancellation policy
      const hoursUntilBooking = (new Date(booking.date).getTime() - Date.now()) / (1000 * 60 * 60);
      let refundAmount = booking.finalAmount;

      if (hoursUntilBooking < 24) {
        refundAmount = 0; // No refund within 24 hours
      } else if (hoursUntilBooking < 48) {
        refundAmount = booking.finalAmount * 0.5; // 50% refund
      }

      const updated = await Booking.findByIdAndUpdate(
        bookingId,
        {
          $set: {
            bookingStatus: 'cancelled',
            cancellation: {
              isCancelled: true,
              cancelledAt: new Date(),
              reason,
              refundAmount
            }
          }
        },
        { new: true }
      );

      return {
        success: true,
        message: `Booking cancelled. Refund amount: ₹${refundAmount}`,
        data: updated
      };
    } catch (error) {
      console.error('Error cancelling booking:', error);
      throw error;
    }
  }

  // Check slot availability
  async checkAvailability(turfId: string, date: Date, startTime: string, endTime: string) {
    try {
      const existingBooking = await Booking.findOne({
        turfId,
        date: {
          $gte: new Date(date),
          $lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)
        },
        startTime,
        endTime,
        bookingStatus: { $ne: 'cancelled' },
        paymentStatus: 'completed'
      });

      return {
        success: true,
        data: {
          available: !existingBooking
        }
      };
    } catch (error) {
      console.error('Error checking availability:', error);
      throw error;
    }
  }
}

export const bookingService = new BookingService();
