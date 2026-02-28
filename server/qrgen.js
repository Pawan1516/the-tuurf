const { createCanvas, loadImage } = require('canvas');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

/**
 * 🎫 Generates a green-themed digital pass for THE TURF
 */
async function generateBookingPass(id, name, sport, slot) {
    const width = 420;
    const height = 420;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Background (Dark Green #1a6b3c)
    ctx.fillStyle = '#1a6b3c';
    ctx.fillRect(0, 0, width, height);

    // 2. Inner Rounded Card
    ctx.fillStyle = '#FFFFFF';
    const padding = 20;
    ctx.beginPath();
    ctx.roundRect(padding, padding, width - (padding * 2), height - (padding * 2), 20);
    ctx.fill();

    // 3. Header Text
    ctx.fillStyle = '#1a6b3c';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('THE TURF STADIUM', width / 2, 60);

    ctx.fillStyle = '#666666';
    ctx.font = '14px Arial';
    ctx.fillText('Official Booking Pass', width / 2, 80);

    // 4. Generate QR Code
    const qrBuffer = await QRCode.toBuffer(`BOOKING:${id}`, {
        margin: 1,
        width: 180,
        color: {
            dark: '#1a6b3c',
            light: '#FFFFFF'
        }
    });
    const qrImage = await loadImage(qrBuffer);
    ctx.drawImage(qrImage, (width - 180) / 2, 100);

    // 5. Booking Details
    ctx.fillStyle = '#1a6b3c';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(name.toUpperCase(), width / 2, 305);

    ctx.fillStyle = '#000000';
    ctx.font = '16px Arial';
    ctx.fillText(`${sport} | ${slot}`, width / 2, 330);

    ctx.fillStyle = '#1a6b3c';
    ctx.font = 'bold 20px Courier New';
    ctx.fillText(`ID: ${id}`, width / 2, 365);

    // 6. Security Seal
    ctx.strokeStyle = '#1a6b3c';
    ctx.lineWidth = 1;
    ctx.strokeRect(padding + 10, 310, width - (padding * 2) - 20, 1);

    // Save File
    const filename = `pass_${id}_${Date.now()}.png`;
    const publicDir = path.join(__dirname, 'public', 'qrs');

    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
    }

    const filePath = path.join(publicDir, filename);
    const out = fs.createWriteStream(filePath);
    const stream = canvas.createPNGStream();
    stream.pipe(out);

    return new Promise((resolve, reject) => {
        out.on('finish', () => resolve(filename));
        out.on('error', reject);
    });
}

module.exports = { generateBookingPass };
