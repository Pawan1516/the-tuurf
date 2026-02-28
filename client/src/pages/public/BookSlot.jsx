import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { slotsAPI, bookingsAPI } from '../../api/client';
import { ArrowLeft } from 'lucide-react';

const BookSlot = () => {
  const { slotId } = useParams();
  const navigate = useNavigate();
  const [slot, setSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    userName: '',
    userPhone: ''
  });
  const [error, setError] = useState('');
  const [amount] = useState(500); // Fixed amount for now

  useEffect(() => {
    const fetchSlot = async () => {
      try {
        const response = await slotsAPI.getById(slotId);
        setSlot(response.data.slot);
      } catch (error) {
        setError('Slot not found');
      } finally {
        setLoading(false);
      }
    };

    fetchSlot();
  }, [slotId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.userName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!formData.userPhone.trim() || formData.userPhone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setSubmitting(true);

    try {
      const response = await bookingsAPI.create({
        userName: formData.userName,
        userPhone: formData.userPhone,
        slotId: slotId,
        amount: amount
      });

      // Store booking ID and proceed to payment
      localStorage.setItem('bookingId', response.data.booking._id);
      localStorage.setItem('bookingAmount', amount);
      navigate('/payment');
    } catch (error) {
      setError(error.response?.data?.message || 'Error creating booking');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!slot) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
        <p className="text-xl text-gray-600 mb-4">{error || 'Slot not found'}</p>
        <button
          onClick={() => navigate('/')}
          className="btn btn-primary"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const slotDate = new Date(slot.date).toLocaleDateString();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Book Your Slot</h1>

          {/* Slot Info */}
          <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-2">Slot Details</h3>
            <p className="text-gray-700">
              <span className="font-medium">Date:</span> {slotDate}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Time:</span> {slot.startTime} - {slot.endTime}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Amount:</span> ₹{amount}
            </p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group">
              <label className="form-label">Your Name *</label>
              <input
                type="text"
                name="userName"
                value={formData.userName}
                onChange={handleChange}
                placeholder="Enter your full name"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <input
                type="tel"
                name="userPhone"
                value={formData.userPhone}
                onChange={handleChange}
                placeholder="Enter 10-digit phone number"
                className="form-input"
                maxLength="10"
                pattern="[0-9]{10}"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating Booking...' : 'Proceed to Payment'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            You will receive a WhatsApp confirmation after booking confirmation
          </p>
        </div>
      </main>
    </div>
  );
};

export default BookSlot;
