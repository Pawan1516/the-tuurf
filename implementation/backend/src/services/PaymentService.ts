import Razorpay from 'razorpay';
import crypto from 'crypto';

export class PaymentService {
  private razorpay: Razorpay;

  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!
    });
  }

  // Create order
  async createOrder(amount: number, bookingId: string, customerId: string) {
    try {
      const order = await this.razorpay.orders.create({
        amount: amount * 100, // Convert to paise
        currency: 'INR',
        receipt: bookingId,
        notes: {
          bookingId,
          customerId,
          timestamp: new Date().toISOString()
        }
      });

      return {
        success: true,
        data: {
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          status: order.status
        }
      };
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      throw error;
    }
  }

  // Verify payment signature
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex');

    return signature === expectedSignature;
  }

  // Fetch payment details
  async fetchPayment(paymentId: string) {
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return {
        success: true,
        data: payment
      };
    } catch (error) {
      console.error('Error fetching payment:', error);
      throw error;
    }
  }

  // Refund payment
  async refundPayment(paymentId: string, amount?: number, reason?: string) {
    try {
      const refund = await this.razorpay.payments.refund(paymentId, {
        amount: amount ? amount * 100 : undefined,
        notes: {
          reason: reason || 'Refund issued'
        }
      });

      return {
        success: true,
        data: {
          refundId: refund.id,
          amount: refund.amount,
          status: refund.status
        }
      };
    } catch (error) {
      console.error('Error refunding payment:', error);
      throw error;
    }
  }

  // Capture payment
  async capturePayment(paymentId: string, amount: number) {
    try {
      const payment = await this.razorpay.payments.capture(paymentId, amount * 100);
      return {
        success: true,
        data: payment
      };
    } catch (error) {
      console.error('Error capturing payment:', error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();
