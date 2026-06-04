const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV !== 'production';

// 1. Helmet Security Headers Configuration
const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://api.razorpay.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
            connectSrc: ["'self'", "https://api.razorpay.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginEmbedderPolicy: false, // Required for some external scripts
});

// 2. Global Rate Limiter (Prevent DDoS)
// Dev: 5000 req / 15min — relaxed for hot-reload + polling + scoring dashboard
// Prod: 500 req / 15min
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDev ? 5000 : 500,
    // Skip OPTIONS preflight requests — they must never be rate-limited
    skip: (req) => req.method === 'OPTIONS',
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// 3. Auth Rate Limiter (Safety Valve)
// Dev: relaxed; Prod: 50 attempts per 15 minutes per IP
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDev ? 500 : 50,
    skip: (req) => req.method === 'OPTIONS',
    message: {
        success: false,
        message: 'Network-level security triggered: Excessive authentication attempts. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    securityHeaders,
    globalLimiter,
    authLimiter
};
