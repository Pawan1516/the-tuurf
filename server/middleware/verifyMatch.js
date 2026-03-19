const Match = require('../models/Match');

const verifyMatch = async (req, res, next) => {
    try {
        const { id } = req.params;
        const match = await Match.findById(id);

        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }

        if (!match.canBeScored()) {
            return res.status(403).json({
                error: 'Match not verified',
                message: 'Admin must scan QR code before scoring can begin',
                requires_scan: true
            });
        }

        req.match = match; // Attach match to request for downstream handlers
        next();
    } catch (error) {
        console.error('verifyMatch Middleware Error:', error);
        res.status(500).json({ error: 'Internal server error while verifying match' });
    }
};

module.exports = verifyMatch;
