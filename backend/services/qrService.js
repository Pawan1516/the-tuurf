/**
 * QR Service
 * Generates URL-based QR codes for teams and matches.
 * Google Lens scans these and directly opens the join/verify URL.
 */

const QRCode = require('qrcode');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

/**
 * Generate a QR code that encodes a direct URL for joining a team.
 * Google Lens will open: /join/team/:joinCode
 * @param {string} teamId
 * @param {string} joinCode - e.g. TEAM_JOIN_1025
 * @param {string} [tournamentId] - optional tournament context
 * @returns {Promise<string>} - base64 data URL
 */
async function generateTeamQR(teamId, joinCode, tournamentId = null) {
    const url = tournamentId
        ? `${FRONTEND_URL}/join/team/${joinCode}?tid=${tournamentId}`
        : `${FRONTEND_URL}/join/team/${joinCode}`;

    const dataURL = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'M',
        margin: 2,
        color: {
            dark: '#064e3b',
            light: '#ffffff'
        },
        width: 350
    });
    return dataURL;
}

/**
 * Generate a QR code for match verification.
 * Supports dual return type based on calling signature for backward compatibility.
 * @param {string} matchId
 * @param {string} [matchCode] - unique code for this match
 * @param {string} [matchDate] - optional date
 * @param {string} [matchTime] - optional time
 * @returns {Promise<string|object>} - base64 string or details object
 */
async function generateMatchQR(matchId, matchCode, matchDate, matchTime) {
    const isObjectExpected = (arguments.length === 1 || matchDate !== undefined);
    const code = matchCode || 'MATCH_' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const url = `${FRONTEND_URL}/join/match/${code}`;

    const dataURL = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'H',
        margin: 2,
        color: {
            dark: '#1e3a5f',
            light: '#ffffff'
        },
        width: 350
    });

    if (isObjectExpected) {
        return {
            encodedData: code,
            qrImage: dataURL,
            generatedAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            securityToken: 'TOKEN_' + Math.random().toString(36).substring(2, 12).toUpperCase()
        };
    }

    return dataURL;
}

/**
 * Generate a player identity QR code.
 * @param {object} user - the player user object
 * @returns {Promise<object>} - `{ encodedData, qrImage, generatedAt }`
 */
async function generatePlayerQR(user) {
    const encodedData = `PLAYER_${user._id.toString()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const url = `${FRONTEND_URL}/player/${user._id}`;

    const dataURL = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'M',
        margin: 2,
        color: {
            dark: '#10b981',
            light: '#ffffff'
        },
        width: 350
    });

    return {
        encodedData,
        qrImage: dataURL,
        generatedAt: new Date()
    };
}

/**
 * Generate a tournament registration QR code.
 * Google Lens will open: /tournaments/:tournamentId/register
 * @param {string} tournamentId
 * @param {string} tournamentCode - short code for the tournament
 * @returns {Promise<string>} - base64 data URL
 */
async function generateTournamentQR(tournamentId, tournamentCode) {
    const url = `${FRONTEND_URL}/tournaments/${tournamentId}/register?ref=${tournamentCode}`;

    const dataURL = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'M',
        margin: 2,
        color: {
            dark: '#7c3aed',
            light: '#ffffff'
        },
        width: 350
    });
    return dataURL;
}

/**
 * Verify a scanned match QR payload (for URL-based QR codes, just checks matchCode).
 */
function verifyMatchQR(matchCode, expectedMatchCode) {
    try {
        if (!matchCode || !expectedMatchCode) return { valid: false, reason: 'Missing match code' };
        if (matchCode !== expectedMatchCode) return { valid: false, reason: 'Match code mismatch' };
        return { valid: true };
    } catch (e) {
        return { valid: false, reason: 'Invalid QR data' };
    }
}

/**
 * Parse a team join QR (URL-based or legacy JSON).
 */
function parseTeamQR(qrData) {
    try {
        // URL-based QR: extract joinCode from URL path
        if (qrData.startsWith('http')) {
            const url = new URL(qrData);
            const pathParts = url.pathname.split('/');
            const joinIdx = pathParts.indexOf('team');
            if (joinIdx !== -1 && pathParts[joinIdx + 1]) {
                return { valid: true, joinCode: pathParts[joinIdx + 1] };
            }
            return { valid: false, reason: 'Cannot extract join code from URL' };
        }
        // Legacy JSON-based QR
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

/**
 * Generate a unique tournament code.
 */
function generateTournamentCode() {
    return 'TRN_' + Math.random().toString(36).substring(2, 7).toUpperCase();
}

module.exports = {
    generateTeamQR,
    generateMatchQR,
    generateTournamentQR,
    verifyMatchQR,
    parseTeamQR,
    generateMatchCode,
    generateTournamentCode,
    generatePlayerQR,
    FRONTEND_URL
};
