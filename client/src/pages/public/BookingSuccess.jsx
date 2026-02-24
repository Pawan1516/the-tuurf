import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const BookingSuccess = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    if (countdown === 0) {
      clearInterval(interval);
      navigate('/');
    }

    return () => clearInterval(interval);
  }, [countdown, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex flex-col items-center justify-center">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
        <CheckCircle size={80} className="mx-auto text-green-600 mb-6" />
        
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Booking Confirmed!</h1>
        
        <p className="text-gray-600 text-lg mb-6">
          Your payment has been verified successfully.
        </p>

        <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-6 text-left">
          <h3 className="font-semibold text-gray-800 mb-2">What's next?</h3>
          <ul className="space-y-2 text-gray-700 text-sm">
            <li>✓ Your booking is pending confirmation from admin</li>
            <li>✓ You will receive a WhatsApp notification once confirmed</li>
            <li>✓ Check your phone for updates</li>
          </ul>
        </div>

        <div className="mb-6">
          <p className="text-gray-600">
            Redirecting to home in <span className="font-bold text-blue-600">{countdown}</span> seconds...
          </p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="w-full btn btn-primary"
        >
          Back to Home
        </button>

        <p className="text-xs text-gray-500 mt-6">
          Questions? Contact us on WhatsApp for support
        </p>
      </div>
    </div>
  );
};

export default BookingSuccess;
