const supabase = require("../utils/supabaseClient");
const { createClient } = require("@supabase/supabase-js");

// We MUST use the service role key for platform-wide operations to bypass RLS,
// since normal user tokens are strictly scoped to their institution.
const getServiceSupabase = () => {
    return createClient(
        process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
};

exports.getDashboardStats = async (req, res) => {
    try {
        const adminClient = getServiceSupabase();

        const [
            { count: totalInstitutions },
            { count: activeSubscriptions },
            { count: totalUsers },
            { data: revenueData }
        ] = await Promise.all([
            adminClient.from('institutions').select('*', { count: 'exact', head: true }),
            adminClient.from('institutions').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active'),
            adminClient.from('users').select('*', { count: 'exact', head: true }),
            // Proxy revenue logic: sum all completed subscription payments if tracked, 
            // or just sum all completed payments globally
            adminClient.from('payments').select('amount').eq('status', 'completed')
        ]);

        const totalRevenue = revenueData ? revenueData.reduce((acc, curr) => acc + Number(curr.amount), 0) : 0;

        res.status(200).json({
            totalInstitutions,
            activeSubscriptions,
            totalUsers,
            totalRevenue
        });
    } catch (error) {
        console.error("Error fetching platform stats:", error);
        res.status(500).json({ error: "Failed to fetch dashboard statistics" });
    }
};

exports.getAllInstitutions = async (req, res) => {
    try {
        const adminClient = getServiceSupabase();
        const { data, error } = await adminClient
            .from('institutions')
            .select(`
                *,
                users!institution_id(count)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.status(200).json({ institutions: data });
    } catch (error) {
        console.error("Error fetching institutions:", error);
        res.status(500).json({ error: "Failed to fetch institutions" });
    }
};

exports.getInstitutionDetails = async (req, res) => {
    const { id } = req.params;
    try {
        const adminClient = getServiceSupabase();
        const { data: institution, error: getErr } = await adminClient
            .from('institutions')
            .select('*')
            .eq('id', id)
            .single();

        if (getErr) throw getErr;

        // Fetch administrators for this institution
        const { data: admins } = await adminClient
            .from('users')
            .select('id, full_name, email, phone')
            .eq('institution_id', id)
            .eq('role', 'admin');

        res.status(200).json({
            institution,
            admins: admins || []
        });
    } catch (error) {
        console.error("Error fetching institution details:", error);
        res.status(500).json({ error: "Failed to fetch institution details" });
    }
};

exports.updateSubscriptionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            subscription_status, 
            subscription_plan, 
            trial_end_date, 
            addon_library, 
            addon_messaging, 
            addon_diary,
            addon_bursary, 
            addon_finance, 
            addon_analytics,
            custom_student_limit
        } = req.body;

        if (
            subscription_status === undefined && 
            subscription_plan === undefined && 
            trial_end_date === undefined && 
            addon_library === undefined && 
            addon_messaging === undefined && 
            addon_diary === undefined &&
            addon_bursary === undefined && 
            addon_finance === undefined && 
            addon_analytics === undefined &&
            custom_student_limit === undefined
        ) {
            return res.status(400).json({ error: "No update fields provided." });
        }

        const adminClient = getServiceSupabase();
        const updates = {};
        if (subscription_status !== undefined) updates.subscription_status = subscription_status;
        if (subscription_plan !== undefined) updates.subscription_plan = subscription_plan;
        if (trial_end_date !== undefined) updates.trial_end_date = trial_end_date;
        if (addon_library !== undefined) updates.addon_library = addon_library;
        if (addon_messaging !== undefined) updates.addon_messaging = addon_messaging;
        if (addon_diary !== undefined) updates.addon_diary = addon_diary;
        if (addon_bursary !== undefined) updates.addon_bursary = addon_bursary;
        if (addon_finance !== undefined) updates.addon_finance = addon_finance;
        if (addon_analytics !== undefined) updates.addon_analytics = addon_analytics;
        if (custom_student_limit !== undefined) updates.custom_student_limit = custom_student_limit;
        updates.updated_at = new Date().toISOString();

        const { data: updatedInst, error } = await adminClient
            .from('institutions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.status(200).json({ message: "Subscription updated successfully", institution: updatedInst });
    } catch (error) {
        console.error("Error updating subscription:", error);
        res.status(500).json({ error: "Failed to update subscription" });
    }
};

exports.notifyTarget = async (req, res) => {
    const { title, message, target } = req.body;
    // Target could be 'all_admins' or a specific institution array
    try {
        const adminClient = getServiceSupabase();

        let query = adminClient.from('users').select('id').eq('role', 'admin');
        if (target && target !== 'all_admins') {
            // Assuming target is an institution_id
            query = query.eq('institution_id', target);
        }

        const { data: admins, error: fetchErr } = await query;
        if (fetchErr) throw fetchErr;

        if (admins && admins.length > 0) {
            const notifications = admins.map(admin => ({
                user_id: admin.id,
                title,
                message,
                type: 'info',
                is_read: false
            }));

            const { error: insertErr } = await adminClient.from('notifications').insert(notifications);
            if (insertErr) throw insertErr;
        }

        return res.status(200).json({ message: "Notifications dispatched successfully", count: admins?.length || 0 });
    } catch (error) {
        console.error("Error sending notifications:", error);
        return res.status(500).json({ error: "Failed to send notifications" });
    }
};

/**
 * Enroll a new institution and create its main admin user
 */
exports.enrollInstitution = async (req, res) => {
    try {
        const {
            institution_name,
            location,
            admin_full_name,
            admin_email,
            admin_password
        } = req.body;

        if (!institution_name || !admin_full_name || !admin_email || !admin_password) {
            return res.status(400).json({ error: "Missing required fields for enrollment." });
        }

        const adminClient = getServiceSupabase();

        // 1. Create the institution record
        const { data: newInst, error: instError } = await adminClient
            .from('institutions')
            .insert([{
                name: institution_name,
                location: location || '',
                type: 'secondary', // Generic default
                subscription_status: req.body.subscription_status || 'trial',
                subscription_plan: req.body.subscription_plan || 'trial',
                has_used_trial: req.body.subscription_plan === 'trial' ? false : true,
                trial_start_date: new Date().toISOString(),
                trial_end_date: req.body.trial_end_date || null,
                addon_library: req.body.addon_library || false,
                addon_messaging: req.body.addon_messaging || false,
                addon_diary: req.body.addon_diary || false,
                addon_bursary: req.body.addon_bursary || false,     // Bursary add-on (separate from finance)
                addon_finance: req.body.addon_finance || false,
                addon_analytics: req.body.addon_analytics || false,
                custom_student_limit: req.body.custom_student_limit || null
            }])
            .select('id')
            .single();

        if (instError || !newInst) {
            console.error("Error creating institution:", instError);
            return res.status(500).json({ error: "Failed to create institution record." });
        }

        // 2. Create the admin user in Supabase Auth
        const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
            email: admin_email,
            password: admin_password,
            email_confirm: true,
            user_metadata: { full_name: admin_full_name }
        });

        if (authError || !authUser.user) {
            console.error("Error creating auth user:", authError);
            // Clean up the institution if user creation fails
            await adminClient.from('institutions').delete().eq('id', newInst.id);
            return res.status(400).json({ error: authError?.message || "Failed to create admin user." });
        }

        // 3. Upsert the user profile into the public.users table linking them to the institution
        const { error: profileError } = await adminClient
            .from('users')
            .update({
                role: 'admin',
                institution_id: newInst.id,
                status: 'approved',
                full_name: admin_full_name
            })
            .eq('id', authUser.user.id);

        if (profileError) {
            console.error("Error updating user profile:", profileError);
            // Clean up the institution and auth user if mapping fails
            await adminClient.from('institutions').delete().eq('id', newInst.id);
            await adminClient.auth.admin.deleteUser(authUser.user.id);
            return res.status(500).json({ error: "Failed to map new user profile." });
        }

        return res.status(201).json({
            message: "Institution and Admin User created successfully.",
            institution_id: newInst.id,
            user_id: authUser.user.id
        });

    } catch (error) {
        console.error("Platform Admin Enroll Error:", error);
        return res.status(500).json({ error: "Server error during enrollment." });
    }
};

/**
 * Enroll a new Master Admin
 */
exports.enrollMasterAdmin = async (req, res) => {
    try {
        const { full_name, email, password } = req.body;

        if (!full_name || !email || !password) {
            return res.status(400).json({ error: "Missing required fields for master admin enrollment." });
        }

        const adminClient = getServiceSupabase();

        // Create the user in Supabase Auth
        const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: { full_name }
        });

        if (authError || !authUser.user) {
            console.error("Error creating auth user:", authError);
            return res.status(400).json({ error: authError?.message || "Failed to create user." });
        }

        // Update the user profile
        const { error: profileError } = await adminClient
            .from('users')
            .update({
                role: 'master_admin',
                institution_id: null,
                status: 'approved',
                full_name: full_name
            })
            .eq('id', authUser.user.id);

        if (profileError) {
            console.error("Error updating user profile for master admin:", profileError);
            await adminClient.auth.admin.deleteUser(authUser.user.id);
            return res.status(500).json({ error: "Failed to map new master admin profile." });
        }

        // Insert into platform_admins
        const { error: paError } = await adminClient
            .from('platform_admins')
            .insert([{
                id: authUser.user.id,
                user_id: authUser.user.id,
                full_name: full_name,
                email: email
            }]);

        if (paError) {
            console.error("Error inserting into platform_admins:", paError);
            // Attempt to gracefully continue
        }

        return res.status(201).json({
            message: "Master Admin created successfully."
        });

    } catch (error) {
        console.error("Master Admin Enroll Error:", error);
        return res.status(500).json({ error: "Server error during master admin enrollment." });
    }
};

/**
 * Get all support requests
 */
exports.getSupportRequests = async (req, res) => {
    try {
        const adminClient = getServiceSupabase();
        const { data, error } = await adminClient
            .from('support_requests')
            .select(`
                *,
                users:user_id(full_name, email),
                institutions:institution_id(name)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Map to include inst field easily
        const mappedData = data.map(req => ({
            ...req,
            inst: req.institutions?.name || 'Unknown',
            user_name: req.users?.full_name || 'Unknown',
            title: req.subject,
            date: req.created_at.split('T')[0]
        }));

        res.status(200).json({ requests: mappedData });
    } catch (error) {
        console.error("Error fetching support requests:", error);
        res.status(500).json({ error: "Failed to fetch support requests" });
    }
};

/**
 * Update support request status
 */
exports.updateSupportRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) return res.status(400).json({ error: "Status is required." });

        const adminClient = getServiceSupabase();
        const { data, error } = await adminClient
            .from('support_requests')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.status(200).json({ message: "Request updated", request: data });
    } catch (error) {
        console.error("Error updating support request:", error);
        res.status(500).json({ error: "Failed to update support request" });
    }
};


/**
 * Updates the authenticated Platform Admin's own profile.
 */
exports.updatePlatformProfile = async (req, res) => {
    try {
        const userId = req.userId;
        const { full_name, phone } = req.body;

        if (!full_name) {
            return res.status(400).json({ error: "full_name is required" });
        }

        const adminClient = getServiceSupabase();

        // 1. Update public.users table (which cascades UI changes locally)
        const { error: dbError } = await adminClient
            .from('users')
            .update({ full_name, phone: phone || null })
            .eq('id', userId);

        if (dbError) throw dbError;

        // 2. Update Auth User Metadata
        const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
            user_metadata: { full_name }
        });

        if (authError) throw authError;

        res.status(200).json({ message: "Profile updated successfully.", full_name, phone });
    } catch (err) {
        console.error("updatePlatformProfile error:", err);
        res.status(500).json({ error: "Failed to update profile." });
    }
};

