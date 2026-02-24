import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode.react';
import { paymentsAPI } from '../../api/client';
import { Download, Copy } from 'lucide-react';

const Payment = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bookingId = localStorage.getItem('bookingId');
  const amount = localStorage.getItem('bookingAmount');

  useEffect(() => {
    if (!bookingId || !amount) {
      setError('No booking found. Please book a slot first.');
      return;
    }

    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, [bookingId, amount]);

  const handlePayment = async () => {
    setLoading(true);
    setError('');

    try {
      // Create order
      const orderResponse = await paymentsAPI.createOrder(
        parseFloat(amount),
        bookingId
      );

      if (!orderResponse.data.success) {
        throw new Error('Failed to create payment order');
      }

      const options = {
        key: orderResponse.data.keyId,
        amount: parseFloat(amount) * 100, // Convert to paise
        currency: 'INR',
        name: 'The Turf',
        description: 'Turf Booking Payment',
        order_id: orderResponse.data.order.id,
        handler: async (response) => {
          try {
            // Verify payment
            const verifyResponse = await paymentsAPI.verify({
              bookingId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            });

            if (verifyResponse.data.success) {
              // Clear localStorage
              localStorage.removeItem('bookingId');
              localStorage.removeItem('bookingAmount');
              // Redirect to success page
              navigate('/booking-success');
            } else {
              setError('Payment verification failed');
            }
          } catch (error) {
            setError('Error verifying payment: ' + error.message);
          }
        },
        prefill: {
          name: '',
          email: '',
          contact: ''
        },
        theme: {
          color: '#2563eb'
        }
      };

      if (window.Razorpay) {
        const razorpay = new window.Razorpay(options);
        razorpay.open();
      } else {
        setError('Razorpay script not loaded');
      }
    } catch (error) {
      setError(error.message || 'Payment initialization failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    const qrElement = document.getElementById('payment-qr');
    if (qrElement) {
      const canvas = qrElement.querySelector('canvas');
      if (canvas) {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `booking-${bookingId}-qr.png`;
        link.click();
      }
    }
  };

  const copyUPILink = () => {
    const upiLink = `upi://pay?pa=bookingsupport@theturf&pn=TheTurf&am=${amount}&tn=Booking${bookingId.slice(-4)}`;
    navigator.clipboard.writeText(upiLink);
    alert('UPI link copied to clipboard!');
  };

  if (!bookingId || !amount) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
        <p className="text-xl text-gray-600 mb-4">
          {error || 'No booking found'}
        </p>
        <button
          onClick={() => navigate('/')}
          className="btn btn-primary"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-blue-600">Payment</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Complete Payment</h2>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
            <p className="text-gray-700 mb-2">
              <span className="font-medium">Booking ID:</span> {bookingId.slice(-6)}
            </p>
            <p className="text-2xl font-bold text-blue-600">₹{amount}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-lg mb-6 border border-purple-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Payment QR Code</h3>
            <div id="payment-qr" className="flex justify-center mb-4 bg-white p-4 rounded">
              <QRCode
                value={`booking|${bookingId}|${amount}|theturf`}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>
            <p className="text-xs text-gray-600 text-center mb-4">Scan this QR code to make payment</p>
            <div className="flex gap-2">
              <button
                onClick={downloadQRCode}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded transition"
              >
                <Download size={18} />
                Download QR
              </button>
              <button
                onClick={copyUPILink}
                className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded transition"
              >
                <Copy size={18} />
                Copy UPI
              </button>
            </div>
          </div>

          <button
            onClick={handlePayment}
            disabled={loading}
            className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {loading ? 'Processing...' : 'Pay with Razorpay'}
          </button>

          <button
            onClick={() => navigate('/')}
            className="w-full btn btn-secondary"
          >
            Cancel
          </button>

          <p className="text-center text-sm text-gray-600 mt-6">
            You will be redirected to Razorpay secure payment gateway
          </p>
        </div>
      </main>
    </div>
  );
};

export default Payment;
