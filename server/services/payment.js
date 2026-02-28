const Razorpay = require('razorpay');
const crypto = require('crypto');

// Only initialize Razorpay if credentials are provided
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

const createOrder = async (amount, currency = 'INR', receipt = '') => {
  try {
    if (!razorpay) {
      // Return mock order for development without Razorpay keys
      return {
        success: true,
        order: {
          id: `order_${Date.now()}`,
          amount: amount * 100,
          currency,
          receipt: receipt || `receipt_${Date.now()}`
        }
      };
    }

    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency,
      receipt: receipt || `receipt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);
    return {
      success: true,
      order
    };
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

const verifyPaymentSignature = (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  try {
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    return expectedSignature === razorpaySignature;
  } catch (error) {
    console.error('Payment verification error:', error);
    return false;
  }
};

const fetchPaymentDetails = async (paymentId) => {
  try {
    if (!razorpay) {
      // Return mock payment for development without Razorpay keys
      return {
        success: true,
        payment: {
          id: paymentId,
          status: 'captured'
        }
      };
    }

    const payment = await razorpay.payments.fetch(paymentId);
    return {
      success: true,
      payment
    };
  } catch (error) {
    console.error('Fetch payment error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

const QRCode = require('qrcode');

const generateUPIQRCode = async (amount, bookingId) => {
  try {
    const upiId = process.env.UPI_ID || '7993962018@ybl';
    const name = process.env.UPI_NAME || process.env.TURF_LOCATION || 'The Turf Stadium';
    const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent('Booking ' + bookingId)}`;

    // Generate base64 QR code
    const qrCodeDataUrl = await QRCode.toDataURL(upiLink);
    return {
      success: true,
      upiLink,
      qrCodeDataUrl
    };
  } catch (error) {
    console.error('QR Code generation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  createOrder,
  verifyPaymentSignature,
  fetchPaymentDetails,
  generateUPIQRCode
};
