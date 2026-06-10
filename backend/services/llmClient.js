const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const DEFAULT_MODEL = process.env.LLM_MODEL || 'gpt-4o-mini';

module.exports = {
    async generateChat(messages, options = {}) {
        const model = options.model || DEFAULT_MODEL;
        try {
            const resp = await openai.chat.completions.create({
                model,
                messages,
                max_tokens: options.maxTokens || 800,
            });
            // Attempt to return the message content
            const choice = resp.choices && resp.choices[0];
            if (choice && choice.message) return choice.message.content;
            return resp;
        } catch (err) {
            console.error('LLM generate error:', err.message || err);
            throw err;
        }
    }
};
