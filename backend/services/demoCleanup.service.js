const supabase = require('../utils/supabaseClient');

const TEMPLATE_INSTITUTION_ID = process.env.TEMPLATE_INSTITUTION_ID || 'b5bd788c-8297-4a96-b8b3-157814504fba';

async function cleanupExpiredDemoSessions() {
    try {
        const now = new Date().toISOString();

        const { data: expiredSessions, error: fetchError } = await supabase
            .from('trial_sessions')
            .select('id, demo_user_id, role')
            .lt('expires_at', now);

        if (fetchError) {
            // Table may not exist yet — not a fatal error
            if (fetchError.message?.includes('does not exist') || fetchError.code === '42P01') {
                return;
            }
            throw fetchError;
        }
        if (!expiredSessions || expiredSessions.length === 0) {
            return;
        }

        console.log(`[DemoCleanup] Found ${expiredSessions.length} expired session(s)`);

        for (const session of expiredSessions) {
            try {
                const { demo_user_id: userId, role } = session;
                if (!userId) continue;

                // Delete role-specific profile
                if (role === 'teacher') {
                    await supabase.from('teachers').delete().eq('user_id', userId);

                } else if (role === 'student') {
                    const { data: stu } = await supabase
                        .from('students')
                        .select('id')
                        .eq('user_id', userId)
                        .single();

                    if (stu) {
                        await supabase.from('enrollments').delete()
                            .eq('student_id', stu.id)
                            .eq('institution_id', TEMPLATE_INSTITUTION_ID);
                        await supabase.from('students').delete().eq('id', stu.id);
                    }

                } else if (role === 'admin') {
                    await supabase.from('admins').delete().eq('user_id', userId);

                } else if (role === 'parent') {
                    const { data: parent } = await supabase
                        .from('parents')
                        .select('id')
                        .eq('user_id', userId)
                        .single();

                    if (parent) {
                        await supabase.from('parent_students').delete()
                            .eq('parent_id', parent.id);
                        await supabase.from('parents').delete().eq('id', parent.id);
                    }
                }

                // Clean up user records
                await supabase.from('trial_sessions').delete().eq('id', session.id);
                await supabase.from('users').delete().eq('id', userId);
                await supabase.auth.admin.deleteUser(userId)
                    .catch(e => console.warn(`Auth delete failed for ${userId}:`, e.message));

                console.log(`[DemoCleanup] Cleaned up ${role} session for user ${userId}`);

            } catch (innerErr) {
                console.error(`[DemoCleanup] Error cleaning session ${session.id}:`, innerErr);
            }
        }

    } catch (err) {
        console.error('[DemoCleanup] Failed to run:', err);
    }
}

module.exports = { cleanupExpiredDemoSessions };