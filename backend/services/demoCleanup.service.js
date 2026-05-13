const supabase = require('../utils/supabaseClient');

/**
 * Cleanup service for demo sessions.
 * Finds expired trial sessions and deletes associated institutions and ephemeral auth users.
 */
async function cleanupExpiredDemoSessions() {
    try {
        const now = new Date().toISOString();

        // 1. Fetch expired sessions
        const { data: expiredSessions, error: fetchError } = await supabase
            .from('trial_sessions')
            .select('id, demo_user_id, institution_id')
            .lt('expires_at', now);

        if (fetchError) throw fetchError;
        if (!expiredSessions || expiredSessions.length === 0) {
            return;
        }


        for (const session of expiredSessions) {
            try {
                const institutionId = session.institution_id;
                const demoUserId = session.demo_user_id;


                // 1. Delete users linked to this institution (to clear NO ACTION constraints)
                if (institutionId) {
                    // Collect all user IDs in this institution to delete them from Auth as well
                    const { data: users } = await supabase.from('users').select('id').eq('institution_id', institutionId);
                    
                    if (users && users.length > 0) {
                        for (const u of users) {
                            // Only delete if it's NOT the main admin (though in clones, everyone is ephemeral)
                            await supabase.auth.admin.deleteUser(u.id).catch(e => console.warn(`Auth delete failed for ${u.id}:`, e.message));
                        }
                        // Delete from public.users
                        await supabase.from('users').delete().eq('institution_id', institutionId);
                    }

                    // 2. Delete Institution (Cascade should handle the rest now)
                    const { error: instDelError } = await supabase
                        .from('institutions')
                        .delete()
                        .eq('id', institutionId);
                    if (instDelError) console.warn(`Failed to delete institution ${institutionId}:`, instDelError.message);
                }

                // 3. Delete the session record itself
                await supabase.from('trial_sessions').delete().eq('id', session.id);

            } catch (innerErr) {
                console.error(`Error cleaning up session ${session.id}:`, innerErr);
            }
        }

    } catch (err) {
        console.error('❌ Failed to run demo cleanup:', err);
    }
}

module.exports = { cleanupExpiredDemoSessions };
