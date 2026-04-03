const Jimp = require('jimp');
const qr = require('qr-image');
const fs = require('fs');
const path = require('path');

/**
 * 🎫 Generates a green-themed digital pass for THE TURF (Pure JS version - no canvas required)
 */
async function generateBookingPass(id, name, sport, slot) {
    const width = 420;
    const height = 420;

    // 1. Create Background (Dark Green #1a6b3c = 0x1a6b3cFF)
    const image = new Jimp(width, height, 0x1a6b3cFF);
    
    // 2. Inner White Card (Simulate rounded rect with a simple rect or just a clean white block)
    const padding = 20;
    const cardWidth = width - (padding * 2);
    const cardHeight = height - (padding * 2);
    
    const card = new Jimp(cardWidth, cardHeight, 0xFFFFFFFF);
    // Mimic rounded corners by making a few pixels transparent at corners if we had masking,
    // but for now, simple clean card is better than a crashing server.
    
    image.composite(card, padding, padding);

    // 3. Generate QR Code using qr-image (Pure JS, returns buffer)
    const qrBuffer = qr.imageSync(`BOOKING:${id}`, { type: 'png', margin: 1, size: 7 });
    const qrImage = await Jimp.read(qrBuffer);
    
    // Resize QR to fit nicely
    qrImage.resize(180, 180);
    
    // Composite QR onto white card
    image.composite(qrImage, (width - 180) / 2, 100);

    // 4. Add Text using Jimp standard fonts
    try {
        const fontTitle = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
        const fontSubtitle = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
        
        // Header
        const title = "THE TURF STADIUM";
        const titleX = (width - Jimp.measureText(fontTitle, title)) / 2;
        image.print(fontTitle, titleX, 60, title);
        
        // User Info
        const userText = name.toUpperCase();
        const userX = (width - Jimp.measureText(fontSubtitle, userText)) / 2;
        image.print(fontSubtitle, userX, 305, userText);
        
        // Info
        const details = `${sport} | ${slot}`;
        const detailX = (width - Jimp.measureText(fontSubtitle, details)) / 2;
        image.print(fontSubtitle, detailX, 330, details);
        
        // ID
        const idText = `ID: ${id}`;
        const idX = (width - Jimp.measureText(fontSubtitle, idText)) / 2;
        image.print(fontSubtitle, idX, 365, idText);

    } catch (err) {
        console.warn('Text rendering skipped in pass:', err.message);
    }

    // Save File
    const filename = `pass_${id}_${Date.now()}.png`;
    const publicDir = path.join(__dirname, 'public', 'qrs');

    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
    }

    const filePath = path.join(publicDir, filename);
    await image.writeAsync(filePath);

    return filename;
}

module.exports = { generateBookingPass };
