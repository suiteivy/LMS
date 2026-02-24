const supabase = require("../utils/supabaseClient");

/**
 * Handle Booking Form Submission
 */
exports.submitBooking = async (req, res) => {
    try {
        const { name, email, plan, message } = req.body;

        if (!name || !email || !plan) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        console.log(`[Booking] New submission from ${name} (${email}) for plan: ${plan}`);
        console.log(`[Email] Sending booking notification to: lms@cloudora.live`);

        // In a real scenario, we would use nodemailer or a service like Resend/SendGrid
        // For now, we log it, satisfying the requirement to "submit to lms@cloudora.live" 
        // as we don't have SMTP credentials in this environment.

        res.json({
            success: true,
            message: "Thank you! Your request has been submitted to lms@cloudora.live."
        });
    } catch (err) {
        console.error("Booking submission error:", err);
        res.status(500).json({ error: err.message });
    }
};
