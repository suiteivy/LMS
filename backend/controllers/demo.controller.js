const process = require("node:process");
const supabase = require('../utils/supabaseClient.js');
const crypto = require('crypto');
const { clearUserCache } = require("../middleware/auth.middleware.js");
const SITE_CONFIG = require("../config/siteConfig.js");

const TEMPLATE_INSTITUTION_ID = process.env.TEMPLATE_INSTITUTION_ID || 'b5bd788c-8297-4a96-b8b3-157814504fba';
const TEMPLATE_TEACHER_ID = process.env.TEMPLATE_TEACHER_ID || 'TCH-DEMO-001';

const FULL_NAME_MAP = {
    teacher: 'Sarah Chemutai',
    student: 'Kelson Otieno',
    parent: 'James Mwangi',
    admin: 'Cloudora Admin',
    readonly_admin: 'Grace Wanjiku'
};

exports.startDemo = async (req, res) => {
    const { role } = req.body;

    if (!role || !['student', 'teacher', 'parent', 'admin', 'readonly_admin'].includes(role)) {
        return res.status(400).json({ error: 'Invalid or missing role' });
    }

    const isReadOnly = role === 'readonly_admin' || (role === 'admin' && req.body.access_level === 'read_only');
    const dbRole = role === 'readonly_admin' ? 'admin' : role;
    let userId = null;

    try {
        const sessionId = crypto.randomBytes(4).toString('hex');
        const email = `demo.${role}.${sessionId}@lms.demo`;
        const password = crypto.randomUUID();
        const fullName = FULL_NAME_MAP[role];
        const [firstName, ...rest] = fullName.split(' ');
        const lastName = rest.join(' ');

        // 1. Create auth user
        const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: `${fullName} (Demo)`,
                is_demo: true,
                role: dbRole,
                access_level: isReadOnly ? 'read_only' : 'read_write',
                session_id: sessionId
            }
        });
        if (authErr) throw authErr;
        userId = authData.user.id;

        // 2. Create public.users row (note: access_level belongs to role tables like admins, not users)
        const { error: userErr } = await supabase.from('users').insert({
            id: userId,
            email,
            full_name: `${fullName} (Demo)`,
            first_name: firstName,
            last_name: lastName,
            role: dbRole,
            institution_id: TEMPLATE_INSTITUTION_ID,
            status: 'approved',
            is_demo: true
        });
        if (userErr) throw userErr;

        // 3. Create role-specific profile
        if (role === 'teacher') {
            const teacherId = `TEA-DEMO-${sessionId}`;
            const { error: e } = await supabase.from('teachers').insert({
                id: teacherId,
                user_id: userId,
                institution_id: TEMPLATE_INSTITUTION_ID,
                department: 'Mathematics & Sciences',
                position: 'class_teacher',
                qualification: 'B.Ed Science (Mathematics)'
            });
            if (e) throw new Error(`Teacher insert failed: ${e.message}`);

            // Link demo teacher as subject teacher so their portal has active subjects and class access
            await supabase.from('subject_teachers').insert([
                { subject_id: 'a9aca035-bf32-4876-85ec-ea0b7bc972fb', teacher_id: teacherId, institution_id: TEMPLATE_INSTITUTION_ID, class_id: '417561a5-48c5-4c45-b736-97d49e74bd35' },
                { subject_id: 'db224c36-093b-4d92-9bed-61b720a991c8', teacher_id: teacherId, institution_id: TEMPLATE_INSTITUTION_ID, class_id: '417561a5-48c5-4c45-b736-97d49e74bd35' }
            ]);

            // Clone sample assignments for the demo teacher
            const templateTeacherId = 'TCH-MOMENTUM-001';
            try {
                const { data: tplAssignments } = await supabase
                    .from('assignments')
                    .select('title, description, subject_id, class_id, due_date, max_score, status, release_grades')
                    .eq('teacher_id', templateTeacherId);
                if (tplAssignments && tplAssignments.length > 0) {
                    await supabase.from('assignments').insert(
                        tplAssignments.map(a => ({ ...a, teacher_id: teacherId, institution_id: TEMPLATE_INSTITUTION_ID }))
                    );
                }
            } catch (aErr) {
                console.warn('Could not copy template assignments for demo teacher:', aErr.message);
            }

        } else if (role === 'student') {
            const { data: stu, error: e } = await supabase.from('students').insert({
                user_id: userId,
                institution_id: TEMPLATE_INSTITUTION_ID,
                class_id: '417561a5-48c5-4c45-b736-97d49e74bd35',
                form_level: 3,
                academic_year: '2026',
                admission_number: `STU-DEMO-${sessionId}`
            }).select('id').single();
            if (e) throw new Error(`Student insert failed: ${e.message}`);

            const { data: dbSubjects } = await supabase
                .from('subjects')
                .select('id')
                .eq('institution_id', TEMPLATE_INSTITUTION_ID);

            const activeSubjects = (dbSubjects && dbSubjects.length > 0)
                ? dbSubjects.map(s => s.id)
                : [
                    'a9aca035-bf32-4876-85ec-ea0b7bc972fb',
                    'db224c36-093b-4d92-9bed-61b720a991c8',
                    '51000000-0000-4000-8000-000000000001',
                    '51000000-0000-4000-8000-000000000002',
                    '51000000-0000-4000-8000-000000000003',
                    '51000000-0000-4000-8000-000000000004',
                    '51000000-0000-4000-8000-000000000005',
                    '51000000-0000-4000-8000-000000000006',
                    '51000000-0000-4000-8000-000000000007',
                    '51000000-0000-4000-8000-000000000008'
                ];

            const enrollments = activeSubjects.map(subId => ({
                student_id: stu.id,
                subject_id: subId,
                class_id: '417561a5-48c5-4c45-b736-97d49e74bd35',
                institution_id: TEMPLATE_INSTITUTION_ID,
                status: 'enrolled',
                enrollment_date: new Date().toISOString().split('T')[0]
            }));
            await supabase.from('enrollments').insert(enrollments);

            // Enroll demo student in the class for diary, attendance, and exam visibility
            await supabase.from('class_enrollments').insert({
                student_id: stu.id,
                class_id: '417561a5-48c5-4c45-b736-97d49e74bd35',
                institution_id: TEMPLATE_INSTITUTION_ID,
                enrolled_at: new Date().toISOString()
            });

            // Seed student submissions, exam results, and attendance records so student portal is full
            const templateStudentId = 'c6306d7b-ad5e-4f5b-8118-47fcd462bd25';
            try {
                const { data: tplResults } = await supabase
                    .from('exam_results')
                    .select('exam_id, subject_id, marks_obtained, grade, remarks')
                    .eq('student_id', templateStudentId);
                if (tplResults && tplResults.length > 0) {
                    await supabase.from('exam_results').insert(
                        tplResults.map(r => ({ ...r, student_id: stu.id, institution_id: TEMPLATE_INSTITUTION_ID }))
                    );
                }

                const { data: tplSubs } = await supabase
                    .from('submissions')
                    .select('assignment_id, content, grade, feedback, status, submitted_at')
                    .eq('student_id', templateStudentId);
                if (tplSubs && tplSubs.length > 0) {
                    await supabase.from('submissions').insert(
                        tplSubs.map(s => ({ ...s, student_id: stu.id, institution_id: TEMPLATE_INSTITUTION_ID }))
                    );
                }

                const { data: tplAtt } = await supabase
                    .from('attendance')
                    .select('class_id, date, status, remarks')
                    .eq('student_id', templateStudentId);
                if (tplAtt && tplAtt.length > 0) {
                    await supabase.from('attendance').insert(
                        tplAtt.map(a => ({ ...a, student_id: stu.id, institution_id: TEMPLATE_INSTITUTION_ID }))
                    );
                }
            } catch (copyErr) {
                console.warn('Could not copy template records to demo student:', copyErr.message);
            }

        } else if (dbRole === 'admin') {
            const { error: e } = await supabase.from('admins').insert({
                id: `ADM-DEMO-${sessionId}`,
                user_id: userId,
                institution_id: TEMPLATE_INSTITUTION_ID,
                is_main: !isReadOnly,
                access_level: isReadOnly ? 'read_only' : 'read_write'
            });
            if (e) throw new Error(`Admin insert failed: ${e.message}`);

        } else if (role === 'parent') {
            const parentId = `PAR-DEMO-${sessionId}`;
            const { error: e } = await supabase.from('parents').insert({
                id: parentId,
                user_id: userId,
                institution_id: TEMPLATE_INSTITUTION_ID
            });
            if (e) throw new Error(`Parent insert failed: ${e.message}`);

            const { error: linkErr } = await supabase.from('parent_students').upsert([
                {
                    parent_id: parentId,
                    student_id: 'c6306d7b-ad5e-4f5b-8118-47fcd462bd25',
                    institution_id: TEMPLATE_INSTITUTION_ID,
                    relationship: 'Father'
                },
                {
                    parent_id: parentId,
                    student_id: 'c6300000-0000-4000-8000-000000000012',
                    institution_id: TEMPLATE_INSTITUTION_ID,
                    relationship: 'Father'
                }
            ], { onConflict: 'parent_id,student_id' });
            if (linkErr) throw new Error(`Parent-student link failed: ${linkErr.message}`);
        }

        // 4. Record trial session
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        const { error: trialErr } = await supabase.from('trial_sessions').insert({
            role: dbRole,
            demo_user_id: userId,
            institution_id: TEMPLATE_INSTITUTION_ID,
            ip_address: req.ip || req.connection?.remoteAddress,
            expires_at: expiresAt
        });
        if (trialErr) console.warn('Failed to log trial session:', trialErr.message);

        // 5. Sign in to get token
        const { createClient } = require('@supabase/supabase-js');
        const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
        const authClient = createClient(supabaseUrl, supabaseAnonKey);
        const { data: signInData, error: signInErr } = await authClient.auth.signInWithPassword({
            email,
            password
        });
        if (signInErr) throw signInErr;

        clearUserCache(userId);

        res.status(200).json({
            message: 'Demo session started',
            token: signInData.session.access_token,
            refreshToken: signInData.session.refresh_token,
            user: {
                uid: userId,
                email,
                full_name: `${fullName} (Demo)`,
                role,
                institution_id: TEMPLATE_INSTITUTION_ID
            },
            isDemo: true,
            expiresIn: 15 * 60
        });

    } catch (err) {
        console.error('Critical Error starting demo session:', err);
        if (userId) {
            try {
                await supabase.auth.admin.deleteUser(userId);
            } catch (cleanupErr) {
                console.warn('Failed to delete auth user during demo rollback:', cleanupErr.message);
            }
        }
        res.status(500).json({
            error: 'Failed to start demo session. Please try again.',
            details: err.message || undefined
        });
    }
};

exports.endDemo = async (req, res) => {
    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' });
    }

    try {
        const { data: user } = await supabase
            .from('users')
            .select('role')
            .eq('id', user_id)
            .maybeSingle();

        if (!user) {
            // Already cleaned up or deleted
            return res.status(200).json({ message: 'Demo session ended' });
        }

        // Delete role-specific profile
        if (user.role === 'teacher') {
            const { data: teacher } = await supabase
                .from('teachers')
                .select('id')
                .eq('user_id', user_id)
                .maybeSingle();
            if (teacher) {
                await supabase.from('assignments').delete().eq('teacher_id', teacher.id);
                await supabase.from('subject_teachers').delete().eq('teacher_id', teacher.id);
                await supabase.from('teachers').delete().eq('id', teacher.id);
            }

        } else if (user.role === 'student') {
            const { data: stu } = await supabase
                .from('students')
                .select('id')
                .eq('user_id', user_id)
                .maybeSingle();

            if (stu) {
                await supabase.from('exam_results').delete().eq('student_id', stu.id);
                await supabase.from('submissions').delete().eq('student_id', stu.id);
                await supabase.from('attendance').delete().eq('student_id', stu.id);
                await supabase.from('enrollments').delete()
                    .eq('student_id', stu.id)
                    .eq('institution_id', TEMPLATE_INSTITUTION_ID);
                await supabase.from('class_enrollments').delete()
                    .eq('student_id', stu.id)
                    .eq('institution_id', TEMPLATE_INSTITUTION_ID);
                await supabase.from('students').delete().eq('id', stu.id);
            }

        } else if (user.role === 'admin') {
            await supabase.from('admins').delete().eq('user_id', user_id);

        } else if (user.role === 'parent') {
            const { data: parent } = await supabase
                .from('parents')
                .select('id')
                .eq('user_id', user_id)
                .maybeSingle();

            if (parent) {
                await supabase.from('parent_students').delete()
                    .eq('parent_id', parent.id);
                await supabase.from('parents').delete().eq('id', parent.id);
            }
        }

        // Always clean up
        await supabase.from('trial_sessions').delete().eq('demo_user_id', user_id);
        await supabase.from('users').delete().eq('id', user_id);

        const { error: authErr } = await supabase.auth.admin.deleteUser(user_id);
        if (authErr) console.warn(`Auth delete warning: ${authErr.message}`);

        clearUserCache(user_id);

        res.status(200).json({ message: 'Demo session ended' });

    } catch (err) {
        console.error('Demo cleanup error:', err);
        res.status(500).json({ error: 'Cleanup error' });
    }
};

/**
 * Submit Demo Feedback (Public / Anonymous)
 * Complies with Section 2 of LMS Landing Page Changes
 */
exports.submitFeedback = async (req, res) => {
    try {
        const {
            rating,
            module_ratings,
            liked,
            improve,
            role,
            contact_requested,
            contact_name,
            contact_email,
            contact_phone,
            consent,
            engaged_modules,
            session_ref,
            // Bot honeypot fields
            website,
            fax_number
        } = req.body;

        // 1. Invisible Honeypot Spam Protection
        if (website || fax_number) {
            console.warn('[DemoFeedback] Spam bot detected via honeypot.');
            return res.status(200).json({
                success: true,
                message: "Thank you, your feedback has been received."
            });
        }

        // 2. Validate Rating (optional, but if provided must be 1-5)
        const parsedRating = rating ? parseInt(rating, 10) : null;
        if (parsedRating !== null && (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5)) {
            return res.status(400).json({ error: "Rating must be between 1 and 5 stars" });
        }

        // 3. Length validations
        const cleanLiked = liked ? String(liked).trim().substring(0, 1000) : null;
        const cleanImprove = improve ? String(improve).trim().substring(0, 1000) : null;
        const cleanRole = role ? String(role).trim().substring(0, 100) : null;

        // 4. Contact Request Validation
        const isContactRequested = Boolean(contact_requested);
        let validEmail = null;
        let validName = null;
        let validPhone = null;

        if (isContactRequested) {
            if (!contact_email || !String(contact_email).includes('@')) {
                return res.status(400).json({ error: "A valid email address is required when requesting contact." });
            }
            if (!consent) {
                return res.status(400).json({ error: "Consent is required to store contact information." });
            }
            validEmail = String(contact_email).trim().toLowerCase().substring(0, 255);
            validName = contact_name ? String(contact_name).trim().substring(0, 150) : null;
            validPhone = contact_phone ? String(contact_phone).trim().substring(0, 50) : null;
        }

        const userAgent = req.headers['user-agent'] ? String(req.headers['user-agent']).substring(0, 300) : null;

        // 5. Insert feedback into database
        const { data, error } = await supabase
            .from('demo_feedback')
            .insert({
                rating: parsedRating,
                module_ratings: module_ratings && typeof module_ratings === 'object' ? module_ratings : {},
                liked: cleanLiked,
                improve: cleanImprove,
                role: cleanRole,
                contact_requested: isContactRequested,
                contact_name: validName,
                contact_email: validEmail,
                contact_phone: validPhone,
                consent: Boolean(consent),
                engaged_modules: Array.isArray(engaged_modules) ? engaged_modules : [],
                session_ref: session_ref ? String(session_ref).substring(0, 100) : null,
                user_agent: userAgent,
                status: 'unread'
            })
            .select()
            .single();

        if (error) {
            console.error('[DemoFeedback] Database insertion error:', error);
            return res.status(500).json({ error: "Failed to record feedback. Please try again." });
        }

        console.log(`[DemoFeedback] New feedback recorded (Rating: ${parsedRating || 'N/A'}, Contact: ${isContactRequested ? 'YES' : 'NO'}, Role: ${cleanRole || 'N/A'})`);

        if (isContactRequested) {
            console.log(`[DemoFeedback] Contact requested by ${validName || 'User'} (${validEmail}). Notification targeted to: ${SITE_CONFIG.supportEmail}`);
        }

        return res.status(200).json({
            success: true,
            message: "Thank you, your feedback has been received.",
            feedback_id: data.id
        });
    } catch (err) {
        console.error('[DemoFeedback] Unexpected error:', err);
        return res.status(500).json({ error: "An unexpected error occurred while saving feedback." });
    }
};

/**
 * Get Feedback for Master / Platform Admin
 */
exports.getFeedback = async (req, res) => {
    try {
        const { status, rating, contact_requested, search, page = 1, limit = 20 } = req.query;

        let query = supabase
            .from('demo_feedback')
            .select('*', { count: 'exact' });

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }
        if (rating && rating !== 'all') {
            query = query.eq('rating', parseInt(rating, 10));
        }
        if (contact_requested === 'true') {
            query = query.eq('contact_requested', true);
        }
        if (search) {
            query = query.or(`liked.ilike.%${search}%,improve.ilike.%${search}%,contact_name.ilike.%${search}%,contact_email.ilike.%${search}%,role.ilike.%${search}%`);
        }

        const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
        query = query.order('created_at', { ascending: false }).range(offset, offset + parseInt(limit, 10) - 1);

        const { data, count, error } = await query;
        if (error) throw error;

        // Fetch stats summary
        const { data: allStats, error: statsErr } = await supabase
            .from('demo_feedback')
            .select('rating, contact_requested, status');

        let avgRating = 0;
        let totalRatingsCount = 0;
        let unreadCount = 0;
        let contactRequestsCount = 0;

        if (!statsErr && Array.isArray(allStats)) {
            let ratingSum = 0;
            allStats.forEach((item) => {
                if (item.rating) {
                    ratingSum += item.rating;
                    totalRatingsCount += 1;
                }
                if (item.status === 'unread') unreadCount += 1;
                if (item.contact_requested) contactRequestsCount += 1;
            });
            if (totalRatingsCount > 0) {
                avgRating = Math.round((ratingSum / totalRatingsCount) * 10) / 10;
            }
        }

        return res.status(200).json({
            feedback: data || [],
            total: count || 0,
            page: parseInt(page, 10),
            totalPages: Math.ceil((count || 0) / parseInt(limit, 10)),
            stats: {
                totalCount: allStats?.length || count || 0,
                avgRating,
                unreadCount,
                contactRequestsCount,
            }
        });
    } catch (err) {
        console.error('[DemoFeedback] getFeedback error:', err);
        return res.status(500).json({ error: "Failed to retrieve feedback list." });
    }
};

/**
 * Update Feedback Status (Master / Platform Admin)
 */
exports.updateFeedbackStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status || !['unread', 'read', 'handled', 'archived'].includes(status)) {
            return res.status(400).json({ error: "Invalid status value" });
        }

        const { data, error } = await supabase
            .from('demo_feedback')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return res.status(200).json({
            success: true,
            feedback: data
        });
    } catch (err) {
        console.error('[DemoFeedback] updateFeedbackStatus error:', err);
        return res.status(500).json({ error: "Failed to update feedback status." });
    }
};