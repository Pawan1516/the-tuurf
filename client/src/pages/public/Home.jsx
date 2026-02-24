import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { slotsAPI } from '../../api/client';
import { Calendar, Clock } from 'lucide-react';
import ImageCarousel from '../../components/ImageCarousel';

const Home = () => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    try {
      const response = await slotsAPI.getAll();
      // Handle both response structures
      const slotsData = Array.isArray(response.data) ? response.data : (response.data.slots || []);
      setSlots(slotsData);
    } catch (error) {
      console.error('Error fetching slots:', error);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const getSlotStatus = (slot) => {
    return slot.status || 'free';
  };

  const getSlotColor = (status) => {
    switch (status) {
      case 'booked':
        return 'bg-red-100 border-red-300 text-red-900';
      case 'hold':
        return 'bg-yellow-100 border-yellow-300 text-yellow-900';
      default:
        return 'bg-green-100 border-green-300 text-green-900 cursor-pointer hover:bg-green-200';
    }
  };

  const handleSlotClick = (slot) => {
    const status = getSlotStatus(slot);
    if (status === 'free') {
      navigate(`/book/${slot._id}`);
    }
  };

  const groupedSlots = slots.reduce((acc, slot) => {
    const date = new Date(slot.date).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(slot);
    return acc;
  }, {});

  // Get today's date in the same format
  const today = new Date().toLocaleDateString();
  const todaySlots = groupedSlots[today] || [];
  const sortedTodaySlots = todaySlots.sort((a, b) => a.startTime.localeCompare(b.startTime));

  const getTodayStats = () => {
    return {
      free: sortedTodaySlots.filter(s => s.status === 'free').length,
      booked: sortedTodaySlots.filter(s => s.status === 'booked').length,
      hold: sortedTodaySlots.filter(s => s.status === 'hold').length
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-4xl font-bold text-blue-600">🏟️ The Turf</h1>
          <p className="text-gray-600 mt-2">Book your perfect sports slot</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Today's Schedule Section */}
            {sortedTodaySlots.length > 0 && (
              <div className="mb-12 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg p-8">
                <div className="mb-6">
                  <h2 className="text-3xl font-bold mb-2">📅 Today's Booking Schedule</h2>
                  <p className="text-blue-100">{today} • {sortedTodaySlots.length} hourly slots available</p>
                </div>

                {/* Today's Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold">{getTodayStats().free}</div>
                    <div className="text-sm text-blue-100">Available</div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold">{getTodayStats().booked}</div>
                    <div className="text-sm text-blue-100">Booked</div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold">{getTodayStats().hold}</div>
                    <div className="text-sm text-blue-100">On Hold</div>
                  </div>
                </div>

                {/* Hourly Schedule Table */}
                <div className="bg-white bg-opacity-95 rounded-lg overflow-hidden">
                  <table className="w-full text-gray-800">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Time Slot</th>
                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                        <th className="px-4 py-3 text-center font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTodaySlots.map((slot, idx) => {
                        const status = getSlotStatus(slot);
                        const statusBadge = {
                          'free': { bg: 'bg-green-100', text: 'text-green-800', label: '✅ Available' },
                          'booked': { bg: 'bg-red-100', text: 'text-red-800', label: '❌ Booked' },
                          'hold': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '⏸️ On Hold' }
                        };
                        const badge = statusBadge[status];
                        return (
                          <tr key={slot._id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                            <td className="px-4 py-3 font-semibold">
                              <Clock className="inline mr-2" size={16} />
                              {slot.startTime} - {slot.endTime}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {status === 'free' ? (
                                <button
                                  onClick={() => navigate(`/book/${slot._id}`)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                                >
                                  Book Now
                                </button>
                              ) : (
                                <span className="text-gray-400 text-sm">Unavailable</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <div className="text-3xl font-bold text-green-600">
                  {slots.filter(s => s.status === 'free').length}
                </div>
                <p className="text-gray-600 mt-2">Available Slots</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <div className="text-3xl font-bold text-red-600">
                  {slots.filter(s => s.status === 'booked').length}
                </div>
                <p className="text-gray-600 mt-2">Booked Slots</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <div className="text-3xl font-bold text-yellow-600">
                  {slots.filter(s => s.status === 'hold').length}
                </div>
                <p className="text-gray-600 mt-2">On Hold</p>
              </div>
            </div>

            {/* Slots Grid */}
            <div className="space-y-8">
              {Object.entries(groupedSlots).map(([date, daySlots]) => (
                <div key={date} className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                    <Calendar className="mr-2 text-blue-600" />
                    {date}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {daySlots.map((slot) => {
                      const status = getSlotStatus(slot);
                      return (
                        <div
                          key={slot._id}
                          onClick={() => handleSlotClick(slot)}
                          className={`p-4 border-2 rounded-lg transition ${getSlotColor(status)}`}
                        >
                          <div className="flex items-center mb-2">
                            <Clock className="mr-2" size={18} />
                            <span className="font-semibold">
                              {slot.startTime} - {slot.endTime}
                            </span>
                          </div>
                          <div className="text-sm">
                            {status === 'booked' && 'Booked by someone'}
                            {status === 'hold' && 'On Hold'}
                            {status === 'free' && 'Available - Click to book'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {slots.length === 0 && (
              <div className="text-center py-12">
                <p className="text-xl text-gray-600">No slots available yet</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-12">
        <div className="container mx-auto px-4 py-6 text-center">
          <p>&copy; 2026 The Turf. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
