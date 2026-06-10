'use strict';
/**
 * ─── WORKFLOW ENGINE ─────────────────────────────────────────────────────────
 * Trigger-based workflow execution engine with built-in actions
 */

const mongoose = require('mongoose');
const { sendWhatsAppNotification } = require('../../../services/whatsapp');

// ─── Built-In Actions ─────────────────────────────────────────────────────────
const ACTIONS = {
  SEND_WHATSAPP: 'send_whatsapp',
  SEND_EMAIL:    'send_email',
  CREATE_TICKET: 'create_ticket',
  HTTP_WEBHOOK:  'http_webhook',
  WAIT:          'wait',
  LOG:           'log',
};

// ─── In-memory workflow registry ─────────────────────────────────────────────
const workflowRegistry = new Map();

/**
 * Register a workflow definition
 * @param {object} workflow
 * @param {string} workflow.id
 * @param {string} workflow.name
 * @param {string} workflow.trigger  — 'manual'|'schedule'|'event'
 * @param {string} [workflow.event]  — event name if trigger='event'
 * @param {Array}  workflow.steps    — array of step definitions
 */
function registerWorkflow(workflow) {
  workflowRegistry.set(workflow.id, workflow);
}

/**
 * Execute a workflow by ID
 * @param {string} workflowId
 * @param {object} triggerData  — input data for the workflow
 * @param {string} triggeredBy  — 'manual'|'schedule'|'event'|'api'
 * @returns {Promise<object>}
 */
async function executeWorkflow(workflowId, triggerData = {}, triggeredBy = 'manual') {
  const workflow = workflowRegistry.get(workflowId);
  if (!workflow) throw new Error(`Workflow "${workflowId}" not found`);

  const WorkflowExecution = mongoose.model('WorkflowExecution');
  const startTime = Date.now();

  // Create execution record
  const execution = await new WorkflowExecution({
    workflowId,
    workflowName: workflow.name,
    triggeredBy,
    triggerData,
    status: 'running',
    steps: [],
  }).save();

  const stepLogs = [];
  let currentData = { ...triggerData };

  // Execute each step sequentially
  for (const step of workflow.steps) {
    const stepStart = Date.now();
    const stepLog = { step: step.name || step.action, status: 'running', timestamp: new Date() };

    try {
      const result = await executeStep(step, currentData, triggerData);
      stepLog.status   = 'success';
      stepLog.output   = result;
      stepLog.duration = Date.now() - stepStart;
      currentData      = { ...currentData, ...(result?.output || {}) };
    } catch (err) {
      stepLog.status   = 'failed';
      stepLog.error    = err.message;
      stepLog.duration = Date.now() - stepStart;

      // If step is critical, abort workflow
      if (step.critical !== false) {
        stepLogs.push(stepLog);
        await WorkflowExecution.findByIdAndUpdate(execution._id, {
          status: 'failed', steps: stepLogs, error: err.message, duration: Date.now() - startTime,
        });
        return { success: false, error: err.message, executionId: execution._id };
      }
    }

    stepLogs.push(stepLog);
  }

  await WorkflowExecution.findByIdAndUpdate(execution._id, {
    status: 'completed', steps: stepLogs, duration: Date.now() - startTime,
    output: currentData,
  });

  return { success: true, executionId: execution._id, output: currentData, duration: Date.now() - startTime };
}

/**
 * Execute a single workflow step
 */
async function executeStep(step, data, originalTrigger) {
  // Resolve template variables in step config
  const config = resolveTemplate(step.config || {}, { ...data, ...originalTrigger });

  switch (step.action) {
    case ACTIONS.SEND_WHATSAPP: {
      if (!config.to || !config.message) throw new Error('send_whatsapp: missing to/message');
      await sendWhatsAppNotification(config.to, config.message);
      return { output: { sent: true, to: config.to } };
    }

    case ACTIONS.SEND_EMAIL: {
      const emailService = require('../../../services/email');
      await emailService.sendEmail({
        to: config.to, subject: config.subject || 'Notification from The Turf',
        html: config.body || config.message,
      });
      return { output: { sent: true } };
    }

    case ACTIONS.CREATE_TICKET: {
      const SupportTicket = mongoose.model('SupportTicket');
      const ticket = await new SupportTicket({
        userId: config.userId,
        type: config.type || 'general',
        message: config.message || 'Auto-created by workflow',
        channel: config.channel || 'api',
        priority: config.priority || 'medium',
      }).save();
      return { output: { ticketId: ticket._id, ticketRef: ticket.ticketRef } };
    }

    case ACTIONS.HTTP_WEBHOOK: {
      const nodeFetch = require('node-fetch');
      const res = await nodeFetch(config.url, {
        method: config.method || 'POST',
        headers: { 'Content-Type': 'application/json', ...(config.headers || {}) },
        body: JSON.stringify(config.body || data),
      });
      const responseData = await res.json().catch(() => ({}));
      return { output: { statusCode: res.status, response: responseData } };
    }

    case ACTIONS.WAIT: {
      const ms = (config.seconds || 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, Math.min(ms, 30000)));
      return { output: { waited: config.seconds } };
    }

    case ACTIONS.LOG: {
      console.log(`[Workflow Log] ${config.message}`, data);
      return { output: { logged: true } };
    }

    default:
      throw new Error(`Unknown action: ${step.action}`);
  }
}

/**
 * Resolve {{variable}} templates in config objects
 */
function resolveTemplate(config, data) {
  const resolved = {};
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string') {
      resolved[key] = value.replace(/\{\{(\w+)\}\}/g, (_, name) => data[name] ?? `{{${name}}}`);
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

/**
 * Get all registered workflows
 */
function getWorkflows() {
  return Array.from(workflowRegistry.values());
}

/**
 * Get execution history
 */
async function getExecutionHistory(workflowId, limit = 20) {
  const WorkflowExecution = mongoose.model('WorkflowExecution');
  return WorkflowExecution.find(workflowId ? { workflowId } : {})
    .sort({ createdAt: -1 }).limit(limit).lean();
}

module.exports = {
  registerWorkflow,
  executeWorkflow,
  getWorkflows,
  getExecutionHistory,
  ACTIONS,
};
