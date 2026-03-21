/**
 *  THE TURF — WhatsApp Message Templates
 *  Branded, Emoji-rich content
 */

const header = "🏟️ *THE TURF — Sports Facility*";

const templates = {
    welcome: (name = '') =>
        `${header}\n\n` +
        `Welcome ${name}! I am your automated booking assistant. 🏏⚽🏀\n\n` +
        `*What would you like to do?*\n` +
        `1️⃣ *Book* a slot\n` +
        `2️⃣ View *Slots* & *Pricing*\n` +
        `3️⃣ Check *My Bookings*\n` +
        `4️⃣ Get *Help* or *Menu*\n\n` +
        `_Reply with a keyword (e.g. "Book") to start!_`,

    sportChoice: () =>
        `${header}\n\n` +
        `Choose your game! 🥅\n\n` +
        `🏏 *Cricket* — ₹1000/hr\n` +
        `⚽ *Football* — ₹800/hr\n` +
        `🏀 *Basketball* — ₹600/hr\n` +
        `🏸 *Badminton* — ₹400/hr\n\n` +
        `_Reply with the sport name!_`,

    slotChoice: (sportName, slotsList) => {
        let listText = slotsList.map(s => `${s.id}. ${s.time}${s.available ? '' : ' (FULL)'}`).join('\n');
        return `${header}\n\n` +
            `📅 *${sportName}* — Available Slots Today:\n\n` +
            `${listText}\n\n` +
            `_Reply with the slot number (e.g. "5")!_`;
    },

    askName: () =>
        `${header}\n\n` +
        `Almost done! Please enter your *Full Name* to complete the request. ✍️`,

    bookingConfirmed: (id, name, sport, slot, qrUrl) =>
        `${header}\n\n` +
        `✅ *BOOKING CONFIRMED!*\n\n` +
        `👤 Player: *${name}*\n` +
        `🥅 Game: *${sport}*\n` +
        `⏰ Time: *${slot}*\n` +
        `🆔 ID: *${id}*\n\n` +
        `Here is your Digital Pass below. 🎫\n` +
        `_See you on the turf!_`,

    bookingHold: (name) =>
        `${header}\n\n` +
        `⌛ *UNDER REVIEW*\n\n` +
        `Hi ${name}, your booking for a peak hour slot is being reviewed by the team. We will notify you in exactly 15 seconds! Stand by. 🕒`,

    bookingRejected: (name, reason) =>
        `${header}\n\n` +
        `❌ *BOOKING REJECTED*\n\n` +
        `Sorry ${name}, we couldn't confirm your slot.\n` +
        `Reason: ${reason}. \n\n` +
        `_Try another time or check pricing!_`,

    pricing: (sports) => {
        let list = Object.values(sports).map(s => `• ${s.emoji} ${s.name}: ₹${s.price}/hr`).join('\n');
        return `${header}\n\n` +
            `💰 *Pricing Info:*\n\n${list}\n\n` +
            `_Reply "Book" to lock your spot!_`;
    },

    help: () =>
        `${header}\n\n` +
        `💡 *Active Commands:*\n` +
        `- "Book" or "Slots"\n` +
        `- "My Bookings"\n` +
        `- "Pricing"\n` +
        `- "Menu" or "Hi"`,

    adminAlert: (id, name, sport, slot, status) =>
        `📢 *ADMIN NOTIFICATION: ${status}*\n\n` +
        `👤 User: ${name}\n` +
        `🥅 Sport: ${sport}\n` +
        `⏰ Slot: ${slot}\n` +
        `🆔 ID: ${id}\n` +
        `📌 Status: ${status.toUpperCase()}`
};

module.exports = templates;
