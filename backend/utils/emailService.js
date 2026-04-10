import process from "node:process";
const nodemailer = require("nodemailer");

/**
 * Send an email using SMTP configuration from environment variables.
 * @param {Object} options - Email options (to, subject, html, text)
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn("[EmailService] Warning: SMTP credentials not configured. Skipping email to:", to);
      return { success: false, error: "SMTP_CONFIG_MISSING" };
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"Cloudora LMS" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EmailService] Error sending email to ${to}:`, err);
    return { success: false, error: err.message };
  }
};

module.exports = { sendEmail };
