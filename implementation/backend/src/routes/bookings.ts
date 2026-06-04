import express, { Router } from 'express';
import { bookingController } from '../controllers/BookingController';
import { authMiddleware } from '../middleware/auth';

const router: Router = express.Router();

// Booking routes
router.post('/', authMiddleware, (req, res) => bookingController.createBooking(req, res));
router.get('/:bookingId', authMiddleware, async (req, res) => {
  try {
    const booking = await require('../models/Booking').default.findById(req.params.bookingId);
    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
});
router.get('/user/bookings', authMiddleware, (req, res) => bookingController.getUserBookings(req, res));
router.put('/:bookingId/cancel', authMiddleware, (req, res) => bookingController.cancelBooking(req, res));

export default router;
