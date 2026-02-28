import { useState, useEffect } from 'react';
import axios from 'axios';

const SlotGrid = () => {
    const [slots, setSlots] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSlots = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`http://localhost:5000/api/slots?date=${selectedDate}`);
                setSlots(res.data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching slots:', err);
                setLoading(false);
            }
        };

        fetchSlots();
    }, [selectedDate]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'free': return 'bg-green-100 border-green-500 text-green-700 hover:bg-green-200 cursor-pointer shadow-sm';
            case 'booked': return 'bg-red-100 border-red-500 text-red-700 opacity-75 cursor-not-allowed';
            case 'hold': return 'bg-yellow-100 border-yellow-500 text-yellow-700 opacity-75 cursor-not-allowed';
            default: return 'bg-gray-100 border-gray-300';
        }
    };

    const handleSlotClick = (slot) => {
        if (slot.status === 'free') {
            alert(`Booking ${slot.startTime} - ${slot.endTime} on ${slot.date}`);
            // TODO: Open booking modal
        }
    };

    return (
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <h3 className="text-2xl font-bold text-gray-800">Available Slots</h3>
                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-6 py-3 border border-gray-200 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold text-gray-700"
                />
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : slots.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 italic">
                    No slots available for this date.
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {slots.map((slot) => (
                        <div
                            key={slot._id}
                            onClick={() => handleSlotClick(slot)}
                            className={`p-6 border-2 rounded-2xl transition-all font-bold flex flex-col items-center justify-center text-center gap-2 ${getStatusColor(slot.status)}`}
                        >
                            <span className="text-lg tracking-tight">{slot.startTime} - {slot.endTime}</span>
                            <span className="text-[10px] uppercase tracking-widest opacity-60">
                                {slot.status === 'booked' ? `Booked by ${slot.bookedBy || 'User'}` : slot.status}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SlotGrid;
