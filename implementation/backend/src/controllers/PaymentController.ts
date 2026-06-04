import { Request, Response } from 'express';
import { paymentService } from '../services/PaymentService';
import Booking from '../models/Booking';

export class PaymentController {
  async createOrder(req: Request, res: Response) {
    try {
      const { bookingId, amount } = req.body;
      const userId = (req as any).userId;

      const result = await paymentService.createOrder(amount, bookingId, userId);

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Failed to create payment order' }
      });
    }
  }

  async verifyPayment(req: Request, res: Response) {
    try {
      const { orderId, paymentId, signature } = req.body;

      const isSignatureValid = paymentService.verifyPaymentSignature(orderId, paymentId, signature);

      if (!isSignatureValid) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid payment signature' }
        });
      }

      // Update booking payment status
      const booking = await Booking.findOne({ paymentId: orderId });
      if (booking) {
        booking.paymentStatus = 'completed';
        booking.bookingStatus = 'confirmed';
        booking.transactionId = paymentId;
        await booking.save();
      }

      res.json({
        success: true,
        message: 'Payment verified successfully',
        data: { orderId, paymentId }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Failed to verify payment' }
      });
    }
  }

  async getPaymentStatus(req: Request, res: Response) {
    try {
      const { orderId } = req.params;

      const result = await paymentService.fetchPayment(orderId);

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Failed to fetch payment status' }
      });
    }
  }

  async refundPayment(req: Request, res: Response) {
    try {
      const { paymentId } = req.params;
      const { amount, reason } = req.body;

      const result = await paymentService.refundPayment(paymentId, amount, reason);

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Failed to refund payment' }
      });
    }
  }

  async handleWebhook(req: Request, res: Response) {
    try {
      const event = req.body;

      // Verify webhook signature
      const signature = req.headers['x-razorpay-signature'] as string;
      // TODO: Verify webhook signature

      switch (event.event) {
        case 'payment.authorized':
          console.log('Payment authorized:', event.payload);
          break;
        case 'payment.failed':
          console.log('Payment failed:', event.payload);
          break;
        case 'payment.captured':
          console.log('Payment captured:', event.payload);
          break;
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Webhook processing failed' }
      });
    }
  }
}

export const paymentController = new PaymentController();
