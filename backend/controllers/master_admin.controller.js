const process = require("node:process");
const _supabase = require("../utils/supabaseClient.js");
const { createClient } = require("@supabase/supabase-js");

// We MUST use the service role key for platform-wide operations to bypass RLS,
// since normal user tokens are strictly scoped to their institution.
const getServiceSupabase = () => {
    return createClient(
        process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
};

exports.getDashboardStats = async (_req, res) => {
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
            // Fix: Platform revenue is tracked in financial_transactions with type = 'subscription'
            adminClient.from('financial_transactions').select('amount').eq('type', 'subscription').eq('status', 'completed')
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

exports.getAllInstitutions = async (_req, res) => {
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
            .select('id, first_name, last_name, full_name, email, phone')
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

/**
 * Update general institution details, including subscription metadata
 */
exports.updateInstitutionDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            name,
            location,
            phone,
            email,
            principal_name,
            email_domain,
            category_id,
            subscription_status, 
            subscription_plan, 
            subscription_cycle,
            trial_end_date, 
            addon_library, 
            addon_messaging, 
            addon_diary,
            addon_bursary, 
            addon_finance, 
            addon_analytics,
            addon_attendance,
            custom_student_limit
        } = req.body;

        const adminClient = getServiceSupabase();
        
        // Build update object dynamically to only update provided fields
        const updates = { updated_at: new Date().toISOString() };
        
        // Metadata fields
        if (name !== undefined) updates.name = name;
        if (location !== undefined) updates.location = location;
        if (phone !== undefined) updates.phone = phone;
        if (email !== undefined) updates.email = email;
        if (principal_name !== undefined) updates.principal_name = principal_name;
        if (email_domain !== undefined) updates.email_domain = email_domain;
        if (category_id !== undefined) updates.category_id = category_id;
        
        // Subscription fields
        if (subscription_status !== undefined) updates.subscription_status = subscription_status;
        if (subscription_plan !== undefined) updates.subscription_plan = subscription_plan;
        if (subscription_cycle !== undefined) updates.subscription_cycle = subscription_cycle;
        if (trial_end_date !== undefined) updates.trial_end_date = trial_end_date;
        
        // Add-ons (Ensure boolean casting for consistency)
        if (addon_library !== undefined) updates.addon_library = !!addon_library;
        if (addon_messaging !== undefined) updates.addon_messaging = !!addon_messaging;
        if (addon_diary !== undefined) updates.addon_diary = !!addon_diary;
        if (addon_bursary !== undefined) updates.addon_bursary = !!addon_bursary;
        if (addon_finance !== undefined) updates.addon_finance = !!addon_finance;
        if (addon_analytics !== undefined) updates.addon_analytics = !!addon_analytics;
        if (addon_attendance !== undefined) updates.addon_attendance = !!addon_attendance;
        if (custom_student_limit !== undefined) updates.custom_student_limit = custom_student_limit;

        const { data: updatedInst, error } = await adminClient
            .from('institutions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.status(200).json({ message: "Institution updated successfully", institution: updatedInst });
    } catch (error) {
        console.error("Error updating institution details:", error);
        res.status(500).json({ error: "Failed to update institution details" });
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
            admin_first_name,
            admin_last_name,
            admin_email,
            admin_password,
            email_domain
        } = req.body;

        const fName = admin_first_name || admin_full_name?.split(' ')[0] || '';
        const lName = admin_last_name || admin_full_name?.split(' ').slice(1).join(' ') || '';
        const finalFullName = admin_full_name || `${fName} ${lName}`.trim();

        if (!institution_name || !fName || !admin_email || !admin_password) {
            return res.status(400).json({ error: "Missing required fields for enrollment (Institution Name, Admin First Name, Email, Password)." });
        }

        const adminClient = getServiceSupabase();

        // 1. Create the institution record
        const { data: newInst, error: instError } = await adminClient
            .from('institutions')
            .insert([{
                name: institution_name,
                location: location || '',
                email_domain: email_domain || (institution_name.toLowerCase().replace(/\s+/g, '') + '.edu'),
                type: req.body.type || 'secondary', 
                category_id: req.body.category_id || null,
                subscription_status: req.body.subscription_status || 'trial',
                subscription_plan: req.body.subscription_plan || 'trial',
                subscription_cycle: req.body.subscription_cycle || 'monthly',
                has_used_trial: (req.body.subscription_plan === 'trial' || !req.body.subscription_plan) ? false : true,
                trial_start_date: new Date().toISOString(),
                trial_end_date: req.body.trial_end_date || null,
                addon_library: !!req.body.addon_library,
                addon_messaging: !!req.body.addon_messaging,
                addon_diary: req.body.subscription_plan === 'beta' ? true : !!req.body.addon_diary,
                addon_bursary: !!req.body.addon_bursary,
                addon_finance: !!req.body.addon_finance,
                addon_analytics: !!req.body.addon_analytics,
                addon_attendance: !!req.body.addon_attendance,
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
            user_metadata: { 
                full_name: finalFullName,
                first_name: fName,
                last_name: lName
            }
        });

        if (authError || !authUser.user) {
            console.error("Error creating auth user:", authError);
            // Clean up the institution if user creation fails
            await adminClient.from('institutions').delete().eq('id', newInst.id);
            return res.status(400).json({ error: authError?.message || "Failed to create admin user." });
        }

        // 3. INSERT the user profile into public.users — NOT update, there is no row yet.
        //    This INSERT fires the `handle_user_role_entry` trigger which auto-creates the admins row.
        const { error: profileError } = await adminClient
            .from('users')
            .insert({
                id: authUser.user.id,
                email: admin_email,
                full_name: finalFullName,
                first_name: fName,
                last_name: lName,
                role: 'admin',
                institution_id: newInst.id,
                status: 'approved',
            });

        if (profileError) {
            console.error("Error inserting user profile:", profileError);
            await adminClient.from('institutions').delete().eq('id', newInst.id);
            await adminClient.auth.admin.deleteUser(authUser.user.id);
            return res.status(500).json({ error: "Failed to create user profile: " + profileError.message });
        }

        return res.status(201).json({
            message: "Institution and Admin User created successfully.",
            institution_id: newInst.id,
            user_id: authUser.user.id,
            admin_email
        });

    } catch (error) {
        console.error("Platform Admin Enroll Error:", error);
        return res.status(500).json({ error: "Server error during enrollment." });
    }
};

/**
 * Delete an institution and all its associated users
 */
exports.deleteInstitution = async (req, res) => {
    const { id } = req.params;
    try {
        const adminClient = getServiceSupabase();

        // 1. Fetch all users in this institution
        const { data: instUsers } = await adminClient
            .from('users')
            .select('id')
            .eq('institution_id', id);

        // 2. Delete each user from auth (cascade will handle DB rows)
        if (instUsers && instUsers.length > 0) {
            for (const u of instUsers) {
                await adminClient.auth.admin.deleteUser(u.id);
            }
        }

        // 3. Delete the institution
        const { error: instErr } = await adminClient
            .from('institutions')
            .delete()
            .eq('id', id);

        if (instErr) throw instErr;

        return res.status(200).json({ message: "Institution deleted successfully." });
    } catch (error) {
        console.error("Error deleting institution:", error);
        return res.status(500).json({ error: "Failed to delete institution." });
    }
};

/**
 * Enroll a new Master Admin
 */
exports.enrollMasterAdmin = async (req, res) => {
    try {
        const { full_name, first_name, last_name, email, password } = req.body;

        const fName = first_name || full_name?.split(' ')[0] || '';
        const lName = last_name || full_name?.split(' ').slice(1).join(' ') || '';
        const finalFullName = full_name || `${fName} ${lName}`.trim();

        if (!fName || !email || !password) {
            return res.status(400).json({ error: "Missing required fields for master admin enrollment (First Name, Email, Password)." });
        }

        const adminClient = getServiceSupabase();

        // Create the user in Supabase Auth
        const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
            email: email,
            password: admin_password,
            email_confirm: true,
            user_metadata: { 
                full_name: finalFullName,
                first_name: fName,
                last_name: lName
            }
        });

        if (authError || !authUser.user) {
            console.error("Error creating auth user:", authError);
            return res.status(400).json({ error: authError?.message || "Failed to create user." });
        }

        // INSERT into public.users (triggers handle_user_role_entry for master_admin role)
        const { error: profileError } = await adminClient
            .from('users')
            .insert({
                id: authUser.user.id,
                email: email,
                full_name: finalFullName,
                first_name: fName,
                last_name: lName,
                role: 'master_admin',
                institution_id: null,
                status: 'approved',
            });

        if (profileError) {
            console.error("Error inserting user profile for master admin:", profileError);
            await adminClient.auth.admin.deleteUser(authUser.user.id);
            return res.status(500).json({ error: "Failed to create master admin profile." });
        }

        // Insert into platform_admins — only columns that exist in the table
        const { error: paError } = await adminClient
            .from('platform_admins')
            .insert([{
                id: authUser.user.id,
                user_id: authUser.user.id,
                full_name: finalFullName,
                email: email
            }]);

        if (paError) {
            console.error("Error inserting into platform_admins:", paError);
            // Non-fatal — user is still functional
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
 * Get all support tickets
 */
exports.getSupportRequests = async (_req, res) => {
    try {
        const adminClient = getServiceSupabase();
        const { data, error } = await adminClient
            .from('support_tickets')
            .select(`
                *,
                users:user_id(first_name, last_name, full_name, email),
                institutions:institution_id(name),
                assigned_to:assigned_to_id(first_name, last_name, full_name)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Map to include inst field easily
        const mappedData = data.map(ticket => ({
            ...ticket,
            inst: ticket.institutions?.name || 'Unknown',
            user_name: ticket.users?.full_name || 
                       (ticket.users?.first_name ? `${ticket.users.first_name} ${ticket.users.last_name || ''}`.trim() : 'Unknown'),
            title: ticket.subject,
            date: ticket.created_at.split('T')[0],
            assigned_name: ticket.assigned_to?.full_name || 
                           (ticket.assigned_to?.first_name ? `${ticket.assigned_to.first_name} ${ticket.assigned_to.last_name || ''}`.trim() : 'Unassigned')
        }));

        res.status(200).json({ requests: mappedData });
    } catch (error) {
        console.error("Error fetching support tickets:", error);
        res.status(500).json({ error: "Failed to fetch support tickets" });
    }
};

/**
 * Update support ticket
 */
exports.updateSupportRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, priority, assigned_to_id, escalation_level } = req.body;

        const updates = { updated_at: new Date().toISOString() };
        if (status) updates.status = status;
        if (priority) updates.priority = priority;
        if (assigned_to_id !== undefined) updates.assigned_to_id = assigned_to_id;
        if (escalation_level !== undefined) updates.escalation_level = escalation_level;
        if (status === 'resolved') updates.resolved_at = new Date().toISOString();

        const adminClient = getServiceSupabase();
        const { data, error } = await adminClient
            .from('support_tickets')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.status(200).json({ message: "Ticket updated", request: data });
    } catch (error) {
        console.error("Error updating support ticket:", error);
        res.status(500).json({ error: "Failed to update support ticket" });
    }
};

/**
 * Get ticket messages
 */
exports.getTicketMessages = async (req, res) => {
    try {
        const { id } = req.params;
        const adminClient = getServiceSupabase();
        
        const { data, error } = await adminClient
            .from('ticket_messages')
            .select('*, sender:sender_id(first_name, last_name, full_name, role)')
            .eq('ticket_id', id)
            .order('created_at', { ascending: true });

        if (error) throw error;
        res.status(200).json({ messages: data });
    } catch (error) {
        console.error("Error fetching ticket messages:", error);
        res.status(500).json({ error: "Failed to fetch ticket messages" });
    }
};

/**
 * Add a message to a ticket
 */
exports.addTicketMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { message, is_internal } = req.body;
        const sender_id = req.userId;

        if (!message) return res.status(400).json({ error: "Message is required" });

        const adminClient = getServiceSupabase();
        const { data, error } = await adminClient
            .from('ticket_messages')
            .insert([{
                ticket_id: id,
                sender_id,
                message,
                is_internal: !!is_internal
            }])
            .select()
            .single();

        if (error) throw error;

        // Auto-reply context: if status was 'pending', move to 'awaiting_customer' or 'in_progress'
        await adminClient.from('support_tickets')
            .update({ status: 'in_progress', updated_at: new Date().toISOString() })
            .eq('id', id);

        res.status(201).json({ message: "Message added", data });
    } catch (error) {
        console.error("Error adding ticket message:", error);
        res.status(500).json({ error: "Failed to add message" });
    }
};

/**
 * Updates the authenticated Platform Admin's own profile.
 */
exports.updatePlatformProfile = async (req, res) => {
    try {
        const userId = req.userId;
        const { full_name, first_name, last_name, phone } = req.body;

        const fName = first_name || full_name?.split(' ')[0] || '';
        const lName = last_name || full_name?.split(' ').slice(1).join(' ') || '';
        const finalFullName = full_name || `${fName} ${lName}`.trim();

        if (!fName && !finalFullName) {
            return res.status(400).json({ error: "first_name or full_name is required" });
        }

        const adminClient = getServiceSupabase();

        // 1. Update public.users table (which cascades UI changes locally)
        const updates = { 
            full_name: finalFullName,
            phone: phone || null 
        };
        if (fName) updates.first_name = fName;
        if (lName) updates.last_name = lName;

        const { error: dbError } = await adminClient
            .from('users')
            .update(updates)
            .eq('id', userId);

        if (dbError) throw dbError;

        // 2. Update Auth User Metadata
        const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
            user_metadata: { 
                full_name: finalFullName,
                first_name: fName,
                last_name: lName
            }
        });

        if (authError) throw authError;

        res.status(200).json({ 
            message: "Profile updated successfully.", 
            full_name: finalFullName,
            first_name: fName,
            last_name: lName,
            phone 
        });
    } catch (err) {
        console.error("updatePlatformProfile error:", err);
        res.status(500).json({ error: "Failed to update profile." });
    }
};

/**
 * Get all payments globally for Master Admin ledger
 */
exports.getAllPayments = async (_req, res) => {
    try {
        const adminClient = getServiceSupabase();
        const { data, error } = await adminClient
            .from('financial_transactions')
            .select(`
                *,
                institutions:institution_id(name),
                users:user_id(first_name, last_name, full_name, email)
            `)
            .order('date', { ascending: false });

        if (error) throw error;

        res.status(200).json({ payments: data });
    } catch (error) {
        console.error("Error fetching global payments:", error);
        res.status(500).json({ error: "Failed to fetch global payments ledger" });
    }
};

/**
 * Get detailed analytics for a specific institution
 */
exports.getInstitutionAnalytics = async (req, res) => {
    const { id } = req.params;
    try {
        const adminClient = getServiceSupabase();
        
        const [
            { count: studentCount },
            { count: teacherCount },
            { count: classCount },
            { data: revenueData }
        ] = await Promise.all([
            adminClient.from('users').select('*', { count: 'exact', head: true }).eq('institution_id', id).eq('role', 'student'),
            adminClient.from('users').select('*', { count: 'exact', head: true }).eq('institution_id', id).eq('role', 'teacher'),
            adminClient.from('classes').select('*', { count: 'exact', head: true }).eq('institution_id', id),
            adminClient.from('financial_transactions').select('amount').eq('institution_id', id).eq('status', 'completed').eq('type', 'fee_payment')
        ]);

        const totalRevenue = revenueData ? revenueData.reduce((acc, curr) => acc + Number(curr.amount), 0) : 0;

        res.status(200).json({
            students: studentCount || 0,
            teachers: teacherCount || 0,
            classes: classCount || 0,
            revenue: totalRevenue
        });
    } catch (error) {
        console.error("Error fetching institution analytics:", error);
        res.status(500).json({ error: "Failed to fetch institution analytics" });
    }
};

/**
 * Get all users across all institutions (platform-wide)
 * Supports: ?role=, &institution_id=, &search=, &page=, &limit=
 */
exports.getAllUsers = async (req, res) => {
    try {
        const adminClient = getServiceSupabase();
        const { role, institution_id, search, page = 1, limit = 30 } = req.query;

        const pageNum = Math.max(1, parseInt(page));
        const pageSize = Math.min(100, parseInt(limit) || 30);
        const offset = (pageNum - 1) * pageSize;

        let query = adminClient
            .from('users')
            .select(`
                id, first_name, last_name, full_name, email,
                role, status, created_at, institution_id,
                institutions:institution_id(name)
            `)
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1);

        if (role) query = query.eq('role', role);
        if (institution_id) query = query.eq('institution_id', institution_id);
        if (search && search.trim()) {
            query = query.or(`full_name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%,first_name.ilike.%${search.trim()}%,last_name.ilike.%${search.trim()}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        res.status(200).json({ users: data || [] });
    } catch (error) {
        console.error("Error fetching all users:", error);
        res.status(500).json({ error: "Failed to fetch users" });
    }
};

/**
 * School Category Management
 */

exports.getSchoolCategories = async (_req, res) => {
    try {
        const adminClient = getServiceSupabase();
        const { data, error } = await adminClient
            .from('school_categories')
            .select('*')
            .order('name');

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        console.error("Error fetching school categories:", error);
        res.status(500).json({ error: "Failed to fetch school categories" });
    }
};

exports.upsertSchoolCategory = async (req, res) => {
    try {
        const { id, name, level_label } = req.body;
        if (!name || !level_label) {
            return res.status(400).json({ error: "Name and Level Label are required" });
        }

        const adminClient = getServiceSupabase();
        const categoryData = { name, level_label, updated_at: new Date().toISOString() };
        
        let result;
        if (id) {
            result = await adminClient.from('school_categories').update(categoryData).eq('id', id).select().single();
        } else {
            result = await adminClient.from('school_categories').insert([categoryData]).select().single();
        }

        if (result.error) throw result.error;
        res.status(200).json({ message: "Category saved successfully", category: result.data });
    } catch (error) {
        console.error("Error upserting school category:", error);
        res.status(500).json({ error: "Failed to save school category" });
    }
};

exports.deleteSchoolCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const adminClient = getServiceSupabase();
        
        // Check if any institution uses this category
        const { count } = await adminClient
            .from('institutions')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', id);

        if (count > 0) {
            return res.status(400).json({ error: "Cannot delete category being used by institutions" });
        }

        const { error } = await adminClient.from('school_categories').delete().eq('id', id);
        if (error) throw error;

        res.status(200).json({ message: "Category deleted successfully" });
    } catch (error) {
        console.error("Error deleting school category:", error);
        res.status(500).json({ error: "Failed to delete school category" });
    }
};

/**
 * Record a manual platform-level payment (subscription revenue)
 */
exports.recordPlatformPayment = async (req, res) => {
    try {
        const { 
            institution_id, 
            amount, 
            method, 
            reference_id, 
            notes, 
            date 
        } = req.body;

        if (!institution_id || !amount) {
            return res.status(400).json({ error: "Institution and amount are required." });
        }

        const adminClient = getServiceSupabase();

        const { data, error } = await adminClient
            .from('financial_transactions')
            .insert([{
                institution_id,
                amount: Number(amount),
                type: 'subscription',
                direction: 'inflow',
                method: method || 'manual',
                reference_id: reference_id || `PLAT-${Date.now()}`,
                meta: { notes: notes || 'Manual platform entry' },
                date: date || new Date().toISOString().split('T')[0],
                status: 'completed'
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ message: "Platform payment recorded successfully", transaction: data });
    } catch (error) {
        console.error("Error recording platform payment:", error);
        res.status(500).json({ error: "Failed to record platform payment" });
    }
};
