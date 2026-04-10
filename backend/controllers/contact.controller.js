import process from "node:process";
const nodemailer = require("nodemailer");

/**
 * Handle Booking Form Submission
 */
exports.submitBooking = async (req, res) => {
    try {
        const { name, email, plan, message, addons, customFeatures, coreModules } = req.body;

        if (!name || !email || !plan) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        console.log(`[Booking] New submission from ${name} (${email}) for plan: ${plan}`);
        console.log(`[Email] Sending booking notification to: Support@cloudoraltd.live`);

        // Check if SMTP credentials exist
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.warn("[Email] Warning: SMTP credentials are not configured in .env. Skipping actual email delivery.");
            return res.json({
                success: true,
                message: "Thank you! Your request has been logged. (Email not sent due to missing SMTP config)"
            });
        }

        // Configure Nodemailer transporter
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const addonsList = Array.isArray(addons) && addons.length > 0 ? addons.join(", ") : "None";
        const customFeaturesList = Array.isArray(customFeatures) && customFeatures.length > 0 ? customFeatures.join(", ") : "None";
        const coreModulesList = Array.isArray(coreModules) && coreModules.length > 0 ? coreModules.join(", ") : "None";

        // Construct HTML email body
        const htmlBody = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #FF6B00; padding: 20px; text-align: center;">
                    <h2 style="color: white; margin: 0;">New Contact Form Submission</h2>
                </div>
                <div style="padding: 24px;">
                    <p style="font-size: 16px; font-weight: bold; margin-bottom: 24px;">A new request has been submitted for the <strong>${plan}</strong> plan.</p>
                    
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold; width: 35%;">Name / Institution:</td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Contact Email:</td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><a href="mailto:${email}" style="color: #3B82F6;">${email}</a></td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Selected Plan:</td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${plan}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Core Modules:</td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${coreModulesList}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Add-ons:</td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${addonsList}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Custom Features:</td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${customFeaturesList}</td>
                        </tr>
                    </table>

                    <div style="margin-top: 24px;">
                        <p style="font-weight: bold; margin-bottom: 8px;">Additional Message:</p>
                        <div style="background-color: #f9f9f9; padding: 16px; border-left: 4px solid #FF6B00; border-radius: 4px; white-space: pre-wrap;">${message || "No additional message provided."}</div>
                    </div>
                </div>
                <div style="background-color: #f0f0f0; padding: 16px; text-align: center; font-size: 12px; color: #777;">
                    This is an automated message from the Cloudora LMS platform.
                </div>
            </div>
        `;

        const mailOptions = {
            from: `"Cloudora LMS Request" <${process.env.SMTP_USER}>`,
            to: 'Support@cloudoraltd.live',
            subject: `New Booking Request: ${plan} Plan (${name})`,
            replyTo: email,
            html: htmlBody,
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log(`[Email] Email sent successfully: ${info.messageId}`);

        res.json({
            success: true,
            message: "Thank you! Your request has been submitted to Support@cloudoraltd.live."
        });
    } catch (err) {
        console.error("Booking submission error:", err);
        res.status(500).json({ error: "Failed to send the request. Please try again later." });
    }
};

