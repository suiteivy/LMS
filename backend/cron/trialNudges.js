const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Initializes the automated trial nudges cron job.
 * Runs daily at midnight (0 0 * * *)
 */
const startTrialNudgesCron = () => {
    console.log('⏳ Initializing Trial Nudges Cron Job...');

    // Run every day at 00:00
    cron.schedule('0 0 * * *', async () => {
        console.log('🔄 Running Daily Trial Nudge Check...');
        try {
            // Fetch all institutions currently on trial
            const { data: trials, error } = await supabase
                .from('institutions')
                .select('id, name, trial_start_date, trial_end_date, subscription_status')
                .eq('subscription_plan', 'trial')
                .eq('subscription_status', 'active');

            if (error) throw error;
            if (!trials || trials.length === 0) return;

            const now = new Date();

            trials.forEach(trial => {
                const startDate = new Date(trial.trial_start_date);
                const endDate = new Date(trial.trial_end_date);

                // Calculate difference in days safely
                const daysElapsed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                const daysRemaining = Math.max(0, Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

                // Nudge 1: How is your first week? (Day 7)
                if (daysElapsed === 7) {
                    sendSimulatedEmail(trial.name, "How is your first week going?", "We noticed you've been on the platform for a week. Can we schedule a quick demo to help your teachers get started?");
                }

                // Nudge 2: 5 Days Left Warning
                if (daysRemaining === 5) {
                    sendSimulatedEmail(trial.name, "Your trial expires in 5 days!", "Don't lose your premium features! Add your billing info to avoid any disruption to your classes.");
                }

                // Nudge 3: Passed Expiry Warning
                if (daysRemaining === 0 && now > endDate) {
                    sendSimulatedEmail(trial.name, "Your trial has expired", "Your core features are now read-only. Please upgrade to continue adding new students or classes.");

                    // Auto-update to expired
                    supabase.from('institutions').update({ subscription_status: 'expired' }).eq('id', trial.id).then();
                }
            });

        } catch (err) {
            console.error('❌ Failed to run trial nudges cron:', err);
        }
    });
};

/**
 * Simulates sending an email
 */
function sendSimulatedEmail(institutionName, subject, body) {
    console.log(`\n================== EMAIL NUDGE ==================`);
    console.log(`To: Admin @ ${institutionName}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body}`);
    console.log(`=================================================\n`);
}

module.exports = { startTrialNudgesCron };
