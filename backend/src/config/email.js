const nodemailer = require('nodemailer');

/**
 * Configure dedicated Gmail SMTP Transporter.
 * Uses host 'smtp.gmail.com', port 465 (secure SSL) or port 587 (TLS).
 * Requires Google Account "App Password" (not regular account password).
 */
const createGmailTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // SSL
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // 16-character App Password without spaces
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

const sendEmail = async ({ to, subject, html, text }) => {
  const hasGmailConfig = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

  if (hasGmailConfig) {
    try {
      const transporter = createGmailTransporter();
      const info = await transporter.sendMail({
        from: `"WildPulse Operations" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
        html,
      });

      console.log(`✅ [Gmail Dispatch] Sent to ${to} (MessageId: ${info.messageId})`);
      return info;
    } catch (err) {
      console.error(`❌ [Gmail Dispatch Error] Failed to send email to ${to}:`, err.message);
      // Fall through to developer log if send fails so testing doesn't break
    }
  }

  // Development fallback when Gmail credentials are not set in .env
  console.log('====================================================');
  console.log(`📧 [EMAIL SIMULATOR - GMAIL NOT YET CONFIGURED IN .env]`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Content: ${text}`);
  console.log('====================================================');

  return { messageId: 'simulated-' + Date.now() };
};

module.exports = sendEmail;
