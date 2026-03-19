const crypto = require('crypto');
const QRCode = require('qrcode');
const Match = require('../models/Match');
const QRScanLog = require('../models/QRScanLog');

class QRService {
    static async generateMatchQR(matchId, bookingId, matchDate, matchTime) {
        const securityToken = crypto.randomBytes(16).toString('hex');
        
        let expiresAt;
        if (matchDate && matchTime) {
            const matchStartStr = `${matchDate}T${matchTime}:00`;
            const matchStartTime = new Date(matchStartStr);
            expiresAt = new Date(matchStartTime.getTime() + (3 * 60 * 60 * 1000)); 
        } else {
            // Default 3 hours from now for Quick Matches
            expiresAt = new Date(Date.now() + (3 * 60 * 60 * 1000));
        }

        const qrData = {
            v: '1.0',
            mid: matchId.toString(),
            bid: bookingId ? bookingId.toString() : 'NONE',
            t: Date.now(),
            s: securityToken,
            d: matchDate,
            tm: matchTime,
            exp: expiresAt.getTime()
        };

        const jsonString = JSON.stringify(qrData);
        const encodedData = Buffer.from(jsonString).toString('base64');
        const qrImage = await QRCode.toDataURL(encodedData, { errorCorrectionLevel: 'H' });

        return {
            qrImage,
            encodedData,
            securityToken,
            expiresAt
        };
    }

    static async verifyQR(base64Payload, adminId, ipAddress, deviceInfo) {
        let decodedPayload;
        try {
            const jsonString = Buffer.from(base64Payload, 'base64').toString('ascii');
            decodedPayload = JSON.parse(jsonString);
        } catch (e) {
            // Invalid QR
            return { success: false, reason: 'FAILED_INVALID' };
        }

        const { mid, exp, s } = decodedPayload;

        const logBase = {
            match_id: mid,
            scanned_by: adminId,
            ip_address: ipAddress || 'unknown',
            device_info: deviceInfo || 'unknown'
        };

        const match = await Match.findById(mid);
        if (!match) {
            return { success: false, reason: 'FAILED_MATCH_NOT_FOUND' };
        }

        if (match.verification.status === 'VERIFIED') {
            await this.logScan({ ...logBase, scan_result: 'FAILED_ALREADY_SCANNED' });
            return { success: false, reason: 'FAILED_ALREADY_SCANNED' };
        }

        if (Date.now() > exp) {
            match.verification.status = 'EXPIRED';
            await match.save();
            await this.logScan({ ...logBase, scan_result: 'FAILED_EXPIRED' });
            return { success: false, reason: 'FAILED_EXPIRED' };
        }

        if (match.verification.verification_token !== s) {
            await this.logScan({ ...logBase, scan_result: 'FAILED_INVALID' });
            return { success: false, reason: 'FAILED_INVALID' };
        }

        // Success!
        match.verification.status = 'VERIFIED';
        match.verification.scanned_at = new Date();
        match.verification.scanned_by = adminId;
        match.verification.scan_attempts += 1;
        match.start_control.can_start = true;
        match.start_control.start_method = 'QR_SCAN';
        
        await match.save();
        await this.logScan({ ...logBase, scan_result: 'SUCCESS' });

        return { success: true, match };
    }

    static async logScan(logData) {
        try {
            const log = new QRScanLog(logData);
            await log.save();
        } catch (error) {
            console.error('Error logging scan:', error);
        }
    }

    static async generatePlayerQR(user) {
        const phoneHash = crypto.createHash('sha256').update(user.phone).digest('hex');
        const generatedAt = Math.floor(Date.now() / 1000);
        
        const payload = {
            v: '2.0',
            pid: user._id.toString(),
            un: user.name,
            ph: phoneHash,
            r: user.role,
            ga: generatedAt
        };

        const secret = process.env.JWT_SECRET || 'the-turf-secret-node-2026';
        const signature = crypto.createHmac('sha256', secret)
            .update(`${payload.pid}${payload.un}${payload.ga}`)
            .digest('hex');
        
        payload.sig = signature;

        const jsonString = JSON.stringify(payload);
        const encodedData = Buffer.from(jsonString).toString('base64');
        const qrImage = await QRCode.toDataURL(encodedData, { 
            errorCorrectionLevel: 'H',
            width: 400,
            margin: 2
        });

        return {
            qrImage,
            encodedData,
            generatedAt: new Date(generatedAt * 1000)
        };
    }
}

module.exports = QRService;
