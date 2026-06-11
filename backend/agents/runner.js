const { v4: uuidv4 } = require('uuid');
const llmClient = require('../services/llmClient');
const aiService = require('../services/aiService');

// Simple in-memory job store for demo. Replace with Redis/Mongo in production.
const jobs = new Map();

async function executeAgent({ agentName = 'executive', promptName = 'strategy-hub', input = '' } = {}) {
    const jobId = uuidv4();
    jobs.set(jobId, { id: jobId, status: 'pending', agentName, promptName, input, result: null, error: null, createdAt: new Date() });

    // Run asynchronously
    (async () => {
        try {
            jobs.get(jobId).status = 'running';

            // Fetch master prompt
            const systemPrompt = await aiService.getMasterPromptByName(promptName);
            const messages = [
                { role: 'system', content: systemPrompt || `You are an expert ${agentName} agent.` },
                { role: 'user', content: input || `Please provide a briefing for ${agentName}.` }
            ];

            const output = await llmClient.generateChat(messages);
            jobs.get(jobId).result = output;
            jobs.get(jobId).status = 'completed';
            jobs.get(jobId).completedAt = new Date();
        } catch (err) {
            jobs.get(jobId).error = err.message || String(err);
            jobs.get(jobId).status = 'failed';
            jobs.get(jobId).completedAt = new Date();
        }
    })();

    return jobId;
}

function getJob(jobId) {
    return jobs.get(jobId) || null;
}

module.exports = { executeAgent, getJob };
