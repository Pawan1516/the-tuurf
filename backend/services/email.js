const nodemailer = require('nodemailer');

// ─── Production Brevo SMTP Transporter ────────────────────────────────────────
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false, // TLS
    auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASS
    }
});

// ─── Startup Connection Verify ─────────────────────────────────────────────────
transporter.verify((error) => {
    if (error) {
        console.error('❌ [BREVO SMTP] Connection failed:', error.message);
    } else {
        console.log('✅ [BREVO SMTP] Gateway Ready — Production email delivery active.');
    }
});

// ─── Send OTP Email ────────────────────────────────────────────────────────────
const sendOTPEmail = async (toEmail, otp) => {
    try {
        const from = process.env.EMAIL_FROM || 'The Turf <a76c8f001@smtp-brevo.com>';

        const mailOptions = {
            from,
            to: toEmail,
            subject: 'Your OTP Code - The Turf',
            text: `Your OTP code is: ${otp}. It expires in 5 minutes. Do not share this code.`,
            html: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
            <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
                <tr><td align="center">
                  <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
                    
                    <!-- Header -->
                    <tr>
                      <td style="background:#10b981;padding:32px 40px;text-align:center;">
                        <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">The Turf</h1>
                        <p style="margin:6px 0 0;color:#a7f3d0;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Miyapur Smart Arena</p>
                      </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                      <td style="padding:40px 40px 30px;">
                        <p style="margin:0 0 20px;color:#374151;font-size:16px;line-height:1.6;">
                          Hello! Use the code below to verify your identity and access The Turf player portal.
                        </p>

                        <!-- OTP Box -->
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr><td align="center" style="padding:20px 0;">
                            <div style="display:inline-block;background:#f9fafb;border:2px dashed #d1d5db;border-radius:12px;padding:24px 40px;">
                              <p style="margin:0 0 6px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:2px;">Your Access Code</p>
                              <span style="font-size:40px;font-weight:900;color:#111827;letter-spacing:10px;font-family:monospace;">${otp}</span>
                            </div>
                          </td></tr>
                        </table>

                        <p style="margin:20px 0 0;color:#6b7280;font-size:13px;text-align:center;">
                          This code expires in <strong>5 minutes</strong>. Do not share it with anyone.
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                        <p style="margin:0;color:#9ca3af;font-size:11px;">
                          This is an automated message from The Turf Stadium, Miyapur, Hyderabad.<br>
                          If you did not request this code, please ignore this email.
                        </p>
                      </td>
                    </tr>

                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ [BREVO] OTP sent to ${toEmail} — MessageID: ${info.messageId}`);
        return { success: true };

    } catch (error) {
        console.error(`❌ [BREVO] Delivery failed to ${toEmail}:`, error.message);
        return { success: false, error: error.message };
    }
};

module.exports = { sendOTPEmail };
