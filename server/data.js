/**
 *  THE TURF — Booking Data Store
 *  Holds sports, slots, active user sessions, and bookings
 */

const sports = {
    football: { id: 'football', name: 'Football ⚽', price: 800, emoji: '⚽' },
    cricket: { id: 'cricket', name: 'Cricket 🏏', price: 1000, emoji: '🏏' },
    basketball: { id: 'basketball', name: 'Basketball 🏀', price: 600, emoji: '🏀' },
    badminton: { id: 'badminton', name: 'Badminton 🏸', price: 400, emoji: '🏸' }
};

// Generate 15 hourly slots (6:00 AM to 10:00 PM)
const slots = Array.from({ length: 15 }, (_, i) => {
    const hour = i + 6;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return {
        id: i + 1,
        time: `${h12}:00 ${ampm}`,
        hour: hour,
        available: true
    };
});

// Memory-based stores
const sessions = {}; // key: user phone, value: { step, sport, slot, name }
const bookings = []; // array of { id, userPhone, userName, sport, slot, status, amount, timestamp, log }

module.exports = {
    sports,
    slots,
    sessions,
    bookings
};
