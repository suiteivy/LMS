const process = require("node:process");
const supabase = require('../utils/supabaseClient.js');
const { cloneInstitution } = require('../services/demoClone.service.js');
const crypto = require('crypto');

const DEMO_PASSWORD = 'DemoUser123!';
const TEMPLATE_INSTITUTION_ID = 'b5bd788c-8297-4a96-b8b3-157814504fba';

exports.startDemo = async (req, res) => {
    const { role } = req.body;

    if (!role || !['student', 'teacher', 'parent', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Invalid or missing role' });
    }

    try {
        console.log(`Starting dynamic demo session for role: ${role}`);
        
        // 1. Create a Unique Ephemeral User for this session
        const sessionSuffix = crypto.randomBytes(4).toString('hex');
        const ephemeralEmail = `demo.${role}.${sessionSuffix}@lms.demo`;
        const fullNameMap = {
            teacher: 'Sarah Chemutai (Demo)',
            student: 'Kelson Otieno (Demo)',
            parent: 'James Mwangi (Demo)',
            admin: 'Cloudora Admin (Demo)'
        };

        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: ephemeralEmail,
            password: DEMO_PASSWORD,
            email_confirm: true,
            user_metadata: { 
                full_name: fullNameMap[role],
                is_demo: true,
                session_id: sessionSuffix
            }
        });

        if (authError) throw authError;
        const user = authUser.user;

        // 2. Add to public.users (Initially orphaned, cloned later)
        const [firstName, ...lastNameParts] = fullNameMap[role].split(' ');
        const lastName = lastNameParts.join(' ').replace(' (Demo)', '');
        
        const { error: userTableError } = await supabase.from('users').insert({
            id: user.id,
            email: ephemeralEmail,
            full_name: fullNameMap[role],
            first_name: firstName,
            last_name: lastName,
            role: role
        });
        if (userTableError) throw userTableError;

        // 3. Clone the Template Institution for this session
        // We pass the new user ID to become the primary actor in the cloned data
        const newInstitutionId = await cloneInstitution(
            TEMPLATE_INSTITUTION_ID,
            role === 'teacher' ? user.id : null, 
            role === 'admin' ? user.id : null
        );

        // Update the user's institution mapping
        await supabase.from('users').update({ institution_id: newInstitutionId }).eq('id', user.id);

        // 4. Create Session for the new user
        const { createClient: createClientJs } = require('@supabase/supabase-js');
        const authClient = createClientJs(
            process.env.EXPO_PUBLIC_SUPABASE_URL,
            process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
        );

        const { data: authData, error: loginError } = await authClient.auth.signInWithPassword({
            email: ephemeralEmail,
            password: DEMO_PASSWORD
        });

        if (loginError) throw loginError;
        const session = authData.session;

        // 5. Log the session in trial_sessions for cleanup tracking
        const { error: logError } = await supabase.from('trial_sessions').insert({
            role,
            demo_user_id: user.id,
            institution_id: newInstitutionId,
            session_token: session.access_token,
            ip_address: req.ip || req.connection.remoteAddress,
            expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        });

        if (logError) console.warn('Failed to log trial session details:', logError);

        // 6. Return response
        res.status(200).json({
            message: "Isolated demo session started successfully",
            token: session.access_token,
            refreshToken: session.refresh_token,
            user: {
                uid: user.id,
                email: user.email,
                full_name: fullNameMap[role],
                role: role,
                institution_id: newInstitutionId
            },
            isDemo: true,
            expiresIn: 15 * 60
        });

    } catch (err) {
        console.error('Critical Error starting demo session:', err);
        
        // Specific error handling for JSON/Auth issues
        if (err.message && err.message.includes('JSON')) {
            console.error('JSON Parsing Error Detected. Checking request body...');
        }

        res.status(500).json({ 
            error: 'Failed to initialize private demo instance. Please try again.',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};
