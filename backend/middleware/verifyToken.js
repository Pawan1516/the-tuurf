const jwt = require('jsonwebtoken');
const Session = require('../models/Session');
const crypto = require('crypto');

const verifyToken = async (req, res, next) => {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        // Log origin and UA to help debug mobile vs desktop differences
        console.warn('[verifyToken] Missing token for request', {
            path: req.originalUrl,
            origin: req.headers.origin || req.headers.host,
            ip: req.ip || req.connection.remoteAddress,
            ua: req.headers['user-agent']
        });
        return res.status(401).json({ 
            success: false, 
            message: 'Session missing. Please login again.',
            code: 'TOKEN_MISSING'
        });
    }

    if (!process.env.JWT_SECRET) {
        console.error('Critical: JWT_SECRET is not set. Cannot verify tokens.');
        return res.status(500).json({ success: false, message: 'Server misconfiguration: JWT_SECRET missing.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 🛡️ Enterprise Security: Check if session is still valid in DB
        // (Optional: You can skip this DB check for performance, but it's required for remote revocation)
        const session = await Session.findOne({ 
            userId: decoded.id, 
            isValid: true,
            expiresAt: { $gt: new Date() }
        });

        if (!session) {
            return res.status(401).json({ 
                success: false, 
                message: 'Session revoked or expired.',
                code: 'SESSION_REVOKED'
            });
        }

        // Detect IP hijacking
        const currentIp = req.ip || req.connection.remoteAddress;
        if (process.env.STRICT_SESSION_IP === 'true' && session.ipAddress !== currentIp) {
            session.isValid = false;
            await session.save();
            return res.status(401).json({ 
                success: false, 
                message: 'Security Alert: IP Mismatch detected.',
                code: 'SESSION_HIJACKED'
            });
        }

        // Update last activity
        session.lastActivity = new Date();
        await session.save();

        req.user = decoded;
        req.sessionId = session._id;
        next();
    } catch (err) {
        // Compute a fingerprint for the token (sha256) for safe comparison (do not log raw token)
        let tokenFingerprint = 'UNKNOWN';
        try {
            tokenFingerprint = crypto.createHash('sha256').update(token || '').digest('hex');
        } catch (e) {
            // ignore
        }

        console.error('verifyToken middleware error:', err && err.stack ? err.stack : err);
        console.warn('[verifyToken] token fingerprint:', tokenFingerprint, {
            path: req.originalUrl,
            origin: req.headers.origin || req.headers.host,
            ip: req.ip || req.connection.remoteAddress,
            ua: req.headers['user-agent']
        });
        let message = 'Invalid Session';
        let code = 'INVALID_TOKEN';

        if (err && err.name === 'TokenExpiredError') {
            message = 'Session expired. Please re-authenticate.';
            code = 'TOKEN_EXPIRED';
        }

        return res.status(401).json({ success: false, message, code });
    }
};

module.exports = verifyToken;
