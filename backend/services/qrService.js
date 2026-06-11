/**
 * QR Service
 * Generates and verifies QR codes for teams and matches.
 */

const QRCode = require('qrcode');

/**
 * Generate a QR code data URL for a team join link.
 * @param {string} teamId
 * @param {string} joinCode - e.g. TEAM_JOIN_1025
 * @returns {Promise<string>} - base64 data URL
 */
async function generateTeamQR(teamId, joinCode) {
    const payload = JSON.stringify({
        type: 'TEAM_JOIN',
        teamId,
        joinCode,
        timestamp: Date.now()
    });
    const dataURL = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'M',
        margin: 2,
        color: {
            dark: '#064e3b',
            light: '#ffffff'
        },
        width: 300
    });
    return dataURL;
}

/**
 * Generate a QR code for match verification (scorer must scan before scoring).
 * @param {string} matchId
 * @param {string} matchCode - unique code for this match
 * @returns {Promise<string>} - base64 data URL
 */
async function generateMatchQR(matchId, matchCode) {
    const payload = JSON.stringify({
        type: 'MATCH_VERIFY',
        matchId,
        matchCode,
        timestamp: Date.now()
    });
    const dataURL = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'H',
        margin: 2,
        color: {
            dark: '#1e3a5f',
            light: '#ffffff'
        },
        width: 300
    });
    return dataURL;
}

/**
 * Verify a scanned match QR payload.
 */
function verifyMatchQR(qrData, expectedMatchId) {
    try {
        const parsed = JSON.parse(qrData);
        if (parsed.type !== 'MATCH_VERIFY') return { valid: false, reason: 'Not a match QR code' };
        if (parsed.matchId !== expectedMatchId) return { valid: false, reason: 'Match ID mismatch' };
        const age = Date.now() - parsed.timestamp;
        if (age > 86400000) return { valid: false, reason: 'QR code expired' };
        return { valid: true };
    } catch (e) {
        return { valid: false, reason: 'Invalid QR data' };
    }
}

/**
 * Parse a team join QR.
 */
function parseTeamQR(qrData) {
    try {
        const parsed = JSON.parse(qrData);
        if (parsed.type !== 'TEAM_JOIN') return { valid: false, reason: 'Not a team QR code' };
        return { valid: true, teamId: parsed.teamId, joinCode: parsed.joinCode };
    } catch (e) {
        return { valid: false, reason: 'Invalid QR data' };
    }
}

/**
 * Generate a unique match code.
 */
function generateMatchCode() {
    return 'MATCH_' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

module.exports = {
    generateTeamQR,
    generateMatchQR,
    verifyMatchQR,
    parseTeamQR,
    generateMatchCode
};
