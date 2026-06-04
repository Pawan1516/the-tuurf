const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../logs');
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR);
}

const securityLogger = (event, details) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${event}] ${JSON.stringify(details)}\n`;
    
    // Log to console
    console.log(`🛡️ [SECURITY_LOG] ${event}:`, details);
    
    // Log to file
    fs.appendFile(path.join(LOG_DIR, 'security.log'), logEntry, (err) => {
        if (err) console.error('Failed to write to security log:', err);
    });
};

module.exports = securityLogger;
