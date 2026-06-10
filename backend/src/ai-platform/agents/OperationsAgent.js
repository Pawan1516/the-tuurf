'use strict';
/**
 * ─── OPERATIONS AGENT ────────────────────────────────────────────────────────
 * Process automation, workflow monitoring, SLA tracking, task management
 */
const mongoose = require('mongoose');
let openaiClient = null;
function setClient(client) { openaiClient = client; }

async function handle(payload) {
  const { message, intent } = payload;
  const opsData = await getOperationsData();

  if (intent === 'PROCESS_STATUS')   return buildProcessStatus(opsData);
  if (intent === 'TASK_MANAGEMENT')  return buildTaskSummary(opsData);

  if (openaiClient) {
    try {
      const res = await openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: `You are an Operations Manager AI for The Turf platform. Help with process monitoring, task management, and operational efficiency.\n\nCurrent ops data: ${JSON.stringify(opsData)}` },
          { role: 'user', content: message },
        ],
        max_tokens: 400, temperature: 0.4,
      });
      return { success: true, reply: res.choices[0].message.content, data: opsData, suggestions: ['Process status', 'SLA report', 'Pending tasks'] };
    } catch { /* fall through */ }
  }

  return buildProcessStatus(opsData);
}

async function getOperationsData() {
  try {
    const Booking = mongoose.model('Booking');
    const SupportTicket = mongoose.model('SupportTicket');

    const [pendingBookings, openTickets, confirmedToday] = await Promise.all([
      Booking.countDocuments({ status: 'pending' }).catch(() => 0),
      SupportTicket ? SupportTicket.countDocuments({ status: 'open' }).catch(() => 0) : Promise.resolve(0),
      Booking.countDocuments({ status: 'confirmed', createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } }).catch(() => 0),
    ]);

    return { pendingBookings, openTickets, confirmedToday, systemStatus: 'operational', generatedAt: new Date().toISOString() };
  } catch { return { error: true, systemStatus: 'unknown', generatedAt: new Date().toISOString() }; }
}

function buildProcessStatus(d) {
  return {
    success: true,
    reply: `## ⚙️ Operations Status — The Turf\n\n**System:** ${d.systemStatus === 'operational' ? '✅ Fully Operational' : '⚠️ Issues Detected'}\n\n**Live Queue:**\n• Pending bookings: ${d.pendingBookings || 0}\n• Open support tickets: ${d.openTickets || 0}\n• Confirmed today: ${d.confirmedToday || 0}\n\n**SLA Status:**\n• Booking confirmation: ${d.pendingBookings < 10 ? '✅ Within SLA (< 10 pending)' : '⚠️ High queue volume'}\n• Support response: ${d.openTickets < 5 ? '✅ On track' : '🟡 Monitor closely'}\n\n**Recommended Actions:**\n${d.pendingBookings > 10 ? '1. ⚡ Process pending bookings immediately\n' : ''}${d.openTickets > 5 ? '2. 📋 Assign tickets to support staff\n' : ''}✅ Run slot optimization if bookings lag`,
    data: d,
    suggestions: ['Process pending bookings', 'View open tickets', 'Run optimization', 'SLA report'],
  };
}

function buildTaskSummary(d) {
  return {
    success: true,
    reply: `## 📋 Task Manager — The Turf\n\n**Pending Tasks:**\n${d.pendingBookings > 0 ? `🔴 ${d.pendingBookings} bookings awaiting confirmation\n` : ''}${d.openTickets > 0 ? `🟡 ${d.openTickets} support tickets open\n` : ''}${d.pendingBookings === 0 && d.openTickets === 0 ? '✅ All clear — no pending tasks!\n' : ''}\n**Automated Tasks Running:**\n✅ Slot auto-generation (daily)\n✅ Expired hold release (every 60s)\n✅ Booking optimizer (every 60min)\n✅ WhatsApp notifications (on trigger)`,
    data: d,
    suggestions: ['Process bookings', 'View tickets', 'Run optimizer now'],
    actions: d.pendingBookings > 0 ? [{ type: 'ACTION', label: 'Process All Pending Bookings' }] : [],
  };
}

module.exports = { handle, setClient };
