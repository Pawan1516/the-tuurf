'use strict';
/**
 * ─── WORKFLOW TEMPLATES ───────────────────────────────────────────────────────
 * 5 pre-built enterprise automation workflows
 */

const { ACTIONS } = require('./WorkflowEngine');

const TEMPLATES = [
  {
    id: 'booking-confirmation-flow',
    name: '📅 Booking Confirmed — Notify & Remind',
    description: 'When a booking is confirmed: send WhatsApp confirmation, then a reminder 1 hour before.',
    trigger: 'event',
    event: 'booking.confirmed',
    category: 'bookings',
    steps: [
      {
        name: 'Send Confirmation WhatsApp',
        action: ACTIONS.SEND_WHATSAPP,
        config: {
          to: '{{userPhone}}',
          message: '✅ Your booking at The Turf is confirmed!\n\n📋 Booking ID: {{bookingId}}\n🏟️ Sport: {{sport}}\n⏰ Slot: {{slot}}\n\nSee you on the field! 🏏',
        },
      },
      {
        name: 'Log Booking',
        action: ACTIONS.LOG,
        config: { message: 'Booking confirmation sent for {{bookingId}}' },
        critical: false,
      },
    ],
  },

  {
    id: 'new-user-onboarding',
    name: '👋 New User Onboarding Sequence',
    description: 'When a new user registers: welcome WhatsApp, then follow-up with features.',
    trigger: 'event',
    event: 'user.registered',
    category: 'users',
    steps: [
      {
        name: 'Send Welcome Message',
        action: ACTIONS.SEND_WHATSAPP,
        config: {
          to: '{{userPhone}}',
          message: '🏟️ Welcome to The Turf, {{userName}}!\n\nYou can now:\n✅ Book sports slots instantly\n🏏 Play live cricket matches\n📊 Track your stats\n\nBook your first slot: https://theturf.com/booking',
        },
      },
    ],
  },

  {
    id: 'support-ticket-flow',
    name: '🎧 Auto-Create Support Ticket',
    description: 'When a complaint is received: create a support ticket and notify the user.',
    trigger: 'event',
    event: 'support.complaint',
    category: 'support',
    steps: [
      {
        name: 'Create Support Ticket',
        action: ACTIONS.CREATE_TICKET,
        config: {
          userId: '{{userId}}',
          type: 'complaint',
          message: '{{message}}',
          channel: '{{channel}}',
          priority: 'high',
        },
      },
      {
        name: 'Notify User',
        action: ACTIONS.SEND_WHATSAPP,
        config: {
          to: '{{userPhone}}',
          message: '🙏 We\'ve received your complaint and created a support ticket.\n\nRef: {{ticketRef}}\n\nOur team will reach out within 2 hours. Thank you for your patience.',
        },
        critical: false,
      },
    ],
  },

  {
    id: 'payment-reminder-flow',
    name: '💳 Payment Reminder Sequence',
    description: 'Send payment reminders at 24h before, at due time, and 1 day after.',
    trigger: 'manual',
    category: 'payments',
    steps: [
      {
        name: 'Send First Reminder',
        action: ACTIONS.SEND_WHATSAPP,
        config: {
          to: '{{userPhone}}',
          message: '💳 Reminder: Your payment of ₹{{amount}} for booking {{bookingId}} is due tomorrow.\n\nPay now to confirm your slot!',
        },
      },
    ],
  },

  {
    id: 'lead-qualification-flow',
    name: '💼 Lead Qualification & Follow-Up',
    description: 'When a sales lead is detected: log lead, notify sales team, schedule follow-up.',
    trigger: 'event',
    event: 'lead.detected',
    category: 'sales',
    steps: [
      {
        name: 'Log Lead',
        action: ACTIONS.LOG,
        config: { message: 'New lead detected: {{userName}} interested in {{interest}}' },
      },
      {
        name: 'Notify via Webhook',
        action: ACTIONS.HTTP_WEBHOOK,
        config: {
          url: '{{webhookUrl}}',
          method: 'POST',
          body: { type: 'lead', user: '{{userName}}', phone: '{{userPhone}}', interest: '{{interest}}', timestamp: '{{timestamp}}' },
        },
        critical: false,
      },
    ],
  },
];

/**
 * Register all templates into the WorkflowEngine
 */
function registerAllTemplates(workflowEngine) {
  const { registerWorkflow } = workflowEngine;
  TEMPLATES.forEach(t => registerWorkflow(t));
  console.log(`✅ [WorkflowTemplates] Registered ${TEMPLATES.length} workflow templates`);
}

module.exports = { TEMPLATES, registerAllTemplates };
