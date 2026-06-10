const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.join(logsDir, 'app.log');
const errorLogFile = path.join(logsDir, 'error.log');

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
};

// Format timestamp
const getTimestamp = () => {
  const now = new Date();
  return now.toISOString();
};

// Format log message
const formatLogMessage = (level, message, data = null) => {
  const timestamp = getTimestamp();
  const dataStr = data ? `\n${JSON.stringify(data, null, 2)}` : '';
  return `[${timestamp}] [${level}] ${message}${dataStr}\n`;
};

// Write to log file
const writeToFile = (filePath, message) => {
  try {
    fs.appendFileSync(filePath, message);
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
};

// Console output with colors
const consoleOutput = (level, message, data = null) => {
  const colors = {
    ERROR: '\x1b[31m', // Red
    WARN: '\x1b[33m', // Yellow
    INFO: '\x1b[36m', // Cyan
    DEBUG: '\x1b[35m', // Magenta
    RESET: '\x1b[0m',
  };

  const color = colors[level] || colors.INFO;
  const timestamp = getTimestamp();
  
  console.log(`${color}[${timestamp}] [${level}]${colors.RESET} ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

const logger = {
  error: (message, data = null) => {
    const formatted = formatLogMessage(LOG_LEVELS.ERROR, message, data);
    consoleOutput(LOG_LEVELS.ERROR, message, data);
    writeToFile(errorLogFile, formatted);
    writeToFile(logFile, formatted);
  },

  warn: (message, data = null) => {
    const formatted = formatLogMessage(LOG_LEVELS.WARN, message, data);
    if (process.env.LOG_LEVEL !== 'error') {
      consoleOutput(LOG_LEVELS.WARN, message, data);
    }
    writeToFile(logFile, formatted);
  },

  info: (message, data = null) => {
    const formatted = formatLogMessage(LOG_LEVELS.INFO, message, data);
    if (process.env.LOG_LEVEL === 'info' || process.env.LOG_LEVEL === 'debug') {
      consoleOutput(LOG_LEVELS.INFO, message, data);
    }
    writeToFile(logFile, formatted);
  },

  debug: (message, data = null) => {
    const formatted = formatLogMessage(LOG_LEVELS.DEBUG, message, data);
    if (process.env.LOG_LEVEL === 'debug') {
      consoleOutput(LOG_LEVELS.DEBUG, message, data);
    }
    writeToFile(logFile, formatted);
  },

  // HTTP request logging
  http: (method, path, statusCode, duration) => {
    const timestamp = getTimestamp();
    const color = statusCode >= 400 ? '\x1b[31m' : '\x1b[36m';
    const reset = '\x1b[0m';
    
    const message = `${color}${method} ${path} - ${statusCode} (${duration}ms)${reset}`;
    console.log(`[${timestamp}] ${message}`);
    
    const logMessage = `[${timestamp}] ${method} ${path} - ${statusCode} (${duration}ms)\n`;
    writeToFile(logFile, logMessage);
  },
};

module.exports = logger;
