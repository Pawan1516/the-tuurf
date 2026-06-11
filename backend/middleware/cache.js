const NodeCache = require('node-cache');

// Standard cache time: 5 minutes (300 seconds)
// Check period: 60 seconds
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

const cacheMiddleware = (duration) => {
    return (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        const key = req.originalUrl || req.url;
        const cachedResponse = cache.get(key);

        if (cachedResponse) {
            console.log(`[CACHE HIT] ${key}`);
            return res.json(cachedResponse);
        } else {
            console.log(`[CACHE MISS] ${key}`);
            // Overwrite res.json to intercept the response and cache it
            const originalJson = res.json;
            res.json = (body) => {
                // Only cache successful responses
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    cache.set(key, body, duration);
                }
                originalJson.call(res, body);
            };
            next();
        }
    };
};

const clearCache = (prefix) => {
    const keys = cache.keys();
    keys.forEach(key => {
        if (key.startsWith(prefix)) {
            cache.del(key);
        }
    });
};

module.exports = {
    cacheMiddleware,
    clearCache
};
