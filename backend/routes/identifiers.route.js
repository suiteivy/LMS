const express = require('express');
const router = express.Router();
const IdentifierService = require('../services/identifier.service.js');
const { authMiddleware } = require('../middleware/auth.middleware.js');
const { authorizeRoles } = require('../middleware/authRole.js');
const supabase = require('../utils/supabaseClient.js');

router.use(authMiddleware);

/**
 * GET /api/identifiers/resolve?identifier=0001
 * Resolve a person by either their new identifier (0001, ST0001, PA0001) or old legacy identifier.
 * Permitted for admin, teacher, and master_admin.
 */
router.get('/resolve', authorizeRoles(['admin', 'teacher', 'master_admin']), async (req, res) => {
    try {
        const institutionId = req.institution_id || req.user?.institution_id;
        const { identifier } = req.query;

        if (!identifier) {
            return res.status(400).json({ success: false, error: 'Identifier query parameter is required.' });
        }

        const resolved = await IdentifierService.resolvePerson(institutionId, identifier);
        if (!resolved) {
            return res.status(404).json({ success: false, message: 'Person not found for identifier.' });
        }

        return res.json({ success: true, person: resolved });
    } catch (err) {
        console.error('Identifier resolution error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/identifiers/crosswalk
 * Download or retrieve the legacy migration crosswalk for the institution.
 * Restricted to Main Admin and delegated admin.
 */
router.get('/crosswalk', authorizeRoles(['admin', 'master_admin']), async (req, res) => {
    try {
        const institutionId = req.institution_id || req.user?.institution_id;
        if (!institutionId) {
            return res.status(400).json({ success: false, error: 'Institution ID is required.' });
        }

        const records = await IdentifierService.getCrosswalkReport(institutionId);
        return res.json({
            success: true,
            total: records.length,
            records,
        });
    } catch (err) {
        console.error('Crosswalk report error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/identifiers/migration-status
 * Master Admin & Admin platform overview of identifier migration completeness.
 */
router.get('/migration-status', authorizeRoles(['admin', 'master_admin']), async (req, res) => {
    try {
        const user = req.user;
        let institutionId = req.institution_id || user.institution_id;

        if (user.role === 'master_admin' && req.query.institution_id) {
            institutionId = req.query.institution_id;
        }

        let query = supabase.from('institutions').select('id, name');
        if (institutionId) {
            query = query.eq('id', institutionId);
        }

        const { data: insts, error: instErr } = await query;
        if (instErr) throw instErr;

        const results = await Promise.all((insts || []).map(async (inst) => {
            const [stuRes, tchRes, admRes, parRes, legRes] = await Promise.all([
                supabase.from('students').select('id, admission_number', { count: 'exact', head: true }).eq('institution_id', inst.id).not('admission_number', 'is', null),
                supabase.from('teachers').select('id, staff_number', { count: 'exact', head: true }).eq('institution_id', inst.id).not('staff_number', 'is', null),
                supabase.from('admins').select('id, staff_number', { count: 'exact', head: true }).eq('institution_id', inst.id).not('staff_number', 'is', null),
                supabase.from('parents').select('id, parent_number', { count: 'exact', head: true }).eq('institution_id', inst.id).not('parent_number', 'is', null),
                supabase.from('legacy_identifiers').select('id', { count: 'exact', head: true }).eq('institution_id', inst.id)
            ]);

            return {
                institution_id: inst.id,
                institution_name: inst.name,
                students_migrated: stuRes.count || 0,
                staff_migrated: (tchRes.count || 0) + (admRes.count || 0),
                parents_migrated: parRes.count || 0,
                crosswalk_entries: legRes.count || 0,
                status: 'completed',
            };
        }));

        return res.json({
            success: true,
            data: user.role === 'master_admin' && !req.query.institution_id ? results : results[0] || null
        });
    } catch (err) {
        console.error('Migration status error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
