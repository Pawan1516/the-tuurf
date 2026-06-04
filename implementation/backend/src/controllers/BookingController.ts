import { Request, Response } from 'express';
import { bookingService } from '../services/BookingService';
import { paymentService } from '../services/PaymentService';

export class BookingController {
  async createBooking(req: Request, res: Response) {
    try {
      const { turfId, courtId, date, startTime, endTime, addOns } = req.body;
      const userId = (req as any).userId;

      // Validate slot availability
      const availability = await bookingService.checkAvailability(
        turfId,
        new Date(date),
        startTime,
        endTime
      );

      if (!availability.data.available) {
        return res.status(400).json({
          success: false,
          error: { message: 'Slot is not available' }
        });
      }

      // Calculate total cost
      const turf = await require('../models/Turf').default.findById(turfId);
      const duration = calculateDuration(startTime, endTime);
      const totalCost = turf.pricing.pricePerHour * duration;

      // Create booking
      const result = await bookingService.createBooking({
        userId,
        turfId,
        courtId,
        date,
        startTime,
        endTime,
        duration,
        totalCost,
        taxes: totalCost * 0.18, // 18% GST
        addOns
      });

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Failed to create booking' }
      });
    }
  }

  async confirmBooking(req: Request, res: Response) {
    try {
      const { bookingId, paymentId } = req.body;
      
      const result = await bookingService.confirmBooking(bookingId, paymentId);
      
      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Failed to confirm booking' }
      });
    }
  }

  async getUserBookings(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      
      const result = await bookingService.getUserBookings(userId);
      
      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Failed to fetch bookings' }
      });
    }
  }

  async cancelBooking(req: Request, res: Response) {
    try {
      const { bookingId } = req.params;
      const { reason } = req.body;
      
      const result = await bookingService.cancelBooking(bookingId, reason);
      
      res.json({
        success: true,
        message: result.message,
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Failed to cancel booking' }
      });
    }
  }
}

function calculateDuration(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  return (endMinutes - startMinutes) / 60;
}

export const bookingController = new BookingController();
