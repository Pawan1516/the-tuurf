import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import SlotCalendar from '../components/SlotCalendar';
import SlotDetails from '../components/SlotDetails';
import BookingCart from '../components/BookingCart';
import { api } from '../services/api';

const SlotBookingPage: React.FC = () => {
  const { turfId } = useParams();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<any[]>([]);
  const [turfDetails, setTurfDetails] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState({
    slots: [],
    addOns: [],
    totalCost: 0
  });

  useEffect(() => {
    fetchTurfDetails();
  }, [turfId]);

  useEffect(() => {
    if (selectedDate) {
      fetchSlots(selectedDate);
    }
  }, [selectedDate]);

  const fetchTurfDetails = async () => {
    try {
      const res = await api.get(`/turfs/${turfId}`);
      setTurfDetails(res.data.data);
    } catch (error) {
      console.error('Failed to fetch turf details:', error);
    }
  };

  const fetchSlots = async (date: Date) => {
    try {
      setLoading(true);
      const dateStr = date.toISOString().split('T')[0];
      const res = await api.get(`/turfs/${turfId}/slots?date=${dateStr}`);
      setSlots(res.data.data);
    } catch (error) {
      console.error('Failed to fetch slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSlotSelect = (slot: any) => {
    setSelectedSlots(prev => {
      const isSelected = prev.find(s => s.id === slot.id);
      if (isSelected) {
        return prev.filter(s => s.id !== slot.id);
      }
      return [...prev, slot];
    });

    // Update cart
    const newTotal = [...selectedSlots, slot].reduce((sum, s) => sum + s.price, 0);
    setCart(prev => ({
      ...prev,
      slots: [...selectedSlots, slot],
      totalCost: newTotal
    }));
  };

  const handleAddOns = (addOn: any) => {
    setCart(prev => ({
      ...prev,
      addOns: [...prev.addOns, addOn],
      totalCost: prev.totalCost + addOn.cost
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-8">Book a Slot</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Turf & Slots */}
          <div className="lg:col-span-2">
            {turfDetails && <SlotDetails turf={turfDetails} />}
            
            {/* Calendar & Slots Selection */}
            <div className="bg-white rounded-lg shadow mt-6 p-6">
              <h2 className="text-xl font-semibold mb-4">Select Date & Slots</h2>
              <SlotCalendar 
                onDateSelect={setSelectedDate}
                selectedDate={selectedDate}
              />
              
              {selectedDate && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">Available Slots</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {slots.map(slot => (
                      <button
                        key={slot.id}
                        onClick={() => handleSlotSelect(slot)}
                        disabled={slot.status === 'booked'}
                        className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                          selectedSlots.find(s => s.id === slot.id)
                            ? 'bg-green-600 text-white'
                            : slot.status === 'booked'
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                        }`}
                      >
                        {slot.startTime} - {slot.endTime}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Cart */}
          <div className="lg:col-span-1">
            <BookingCart 
              cart={cart}
              onAddOns={handleAddOns}
              onProceed={() => {/* Navigate to payment */}}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlotBookingPage;
