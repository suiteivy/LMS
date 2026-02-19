const { createClient } = require('@supabase/supabase-js');
const supabase = require('../utils/supabaseClient'); // Default client (Service Role if configured, or just client)

// We need a client that can sign in (Public Anon Key) to get a session for the demo user
// But we also need Service Role to log to trial_sessions (if RLS blocks anon insert)
// The existing utils/supabaseClient seems to use SERVICE_ROLE_KEY based on backend/.env content I saw earlier?
// Wait, backend/.env has SUPABASE_SERVICE_ROLE_KEY.
// util definition: `const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);`?
// I need to check `backend/utils/supabaseClient.js` content. 
// Standard pattern: if I need to sign in *as* a user, I should use the Anon Key client, OR verify credentials and then mint a token? 
// Supabase `signInWithPassword` returns a session.

const DEMO_PASSWORD = 'DemoUser123!';

const DEMO_EMAILS = {
    student: 'demo.student@lms.com',
    teacher: 'demo.teacher@lms.com',
    parent: 'demo.parent@lms.com',
    admin: 'demo.admin@lms.com'
};

exports.startTrial = async (req, res) => {
    const { role } = req.body;

    if (!role || !DEMO_EMAILS[role]) {
        return res.status(400).json({ error: 'Invalid or missing role' });
    }

    const email = DEMO_EMAILS[role];

    try {
        // 1. Sign in as the demo user to get a fresh session
        // We use a temporary client with ANON key for this, to act like a client
        const { createClient: createClientJs } = require('@supabase/supabase-js');
        const authClient = createClientJs(
            process.env.EXPO_PUBLIC_SUPABASE_URL,
            process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
        );

        const { data: authData, error: loginError } = await authClient.auth.signInWithPassword({
            email,
            password: DEMO_PASSWORD
        });

        if (loginError) {
            console.error('Demo login error:', loginError);
            return res.status(500).json({ error: 'Failed to start demo session' });
        }

        const session = authData.session;
        const user = authData.user;

        // 2. Log the session start in trial_sessions (using Service Role client)
        // We assume global `supabase` is the Service Role client from utils
        const { error: logError } = await supabase.from('trial_sessions').insert({
            role,
            demo_user_id: user.id,
            session_token: session.access_token, // Store specifically related to this request?
            ip_address: req.ip || req.connection.remoteAddress
        });

        if (logError) {
            console.warn('Failed to log trial session:', logError);
            // Continue anyway, not critical for user experience
        }

        // 3. Fetch user profile data to return same structure as normal login
        const { data: userData, error: userError } = await supabase
            .from("users")
            .select("full_name, role, institution_id")
            .eq("id", user.id)
            .single();

        let customId = null;
        if (role === 'student') {
            const { data } = await supabase.from('students').select('id').eq('user_id', user.id).single();
            customId = data?.id;
        } else if (role === 'teacher') {
            const { data } = await supabase.from('teachers').select('id').eq('user_id', user.id).single();
            customId = data?.id;
        } else if (role === 'parent') {
            const { data } = await supabase.from('parents').select('id').eq('user_id', user.id).single();
            customId = data?.id;
        } else if (role === 'admin') {
            const { data } = await supabase.from('admins').select('id').eq('user_id', user.id).single();
            customId = data?.id;
        }

        // 4. Return existing session data
        res.status(200).json({
            message: "Trial started successfully",
            token: session.access_token,
            refreshToken: session.refresh_token,
            user: {
                uid: user.id,
                email: user.email,
                ...userData,
                customId
            },
            isTrial: true,
            expiresIn: 15 * 60 // 15 minutes in seconds
        });

    } catch (err) {
        console.error('Start trial error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
