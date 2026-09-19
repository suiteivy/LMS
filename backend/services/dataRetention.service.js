/**
 * Data Retention Service
 * Enforces scheduled retention and archival policies:
 * - 2-Year Retention: Daily attendance records (students and teachers)
 * - 7-Year Retention: Academic reports and exam records
 * - Soft-delete / Archive for inactive students and teachers (departed > 7 years)
 * 
 * Tenant-Isolated: Executes strictly within institution context boundaries.
 */

const supabase = require('../utils/supabaseClient');
const logger = require('../utils/logger');
const { runWithTenantContext } = require('../utils/tenantContext');

const runSingleTenantRetention = async (institutionId) => {
    const results = {
        student_attendance_purged: 0,
        teacher_attendance_purged: 0,
        academic_reports_archived: 0,
        exam_results_archived: 0,
        departed_records_archived: 0,
    };

    return runWithTenantContext({ institution_id: institutionId }, async () => {
        try {
            // 1. Purge attendance records older than 2 years (daily operational data)
            const twoYearsAgo = new Date();
            twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
            const attendanceCutoffStr = twoYearsAgo.toISOString().split('T')[0];

            const { data: sAtt, error: sErr } = await supabase
                .from('attendance')
                .delete()
                .lt('date', attendanceCutoffStr)
                .select('id');

            if (sErr) {
                logger.error(`[DataRetention][${institutionId}] Student attendance purge error:`, sErr);
            } else {
                results.student_attendance_purged = sAtt?.length || 0;
            }

            const { data: tAtt, error: tErr } = await supabase
                .from('teacher_attendance')
                .delete()
                .lt('date', attendanceCutoffStr)
                .select('id');

            if (tErr) {
                logger.error(`[DataRetention][${institutionId}] Teacher attendance purge error:`, tErr);
            } else {
                results.teacher_attendance_purged = tAtt?.length || 0;
            }

            // 2. Academic records archive (records past 7-year retention_until)
            const nowIso = new Date().toISOString();

            const { data: repData, error: repErr } = await supabase
                .from('academic_reports')
                .update({ archived_at: nowIso })
                .lt('retention_until', nowIso)
                .is('archived_at', null)
                .select('id');

            if (repErr) {
                logger.error(`[DataRetention][${institutionId}] Academic reports archival error:`, repErr);
            } else {
                results.academic_reports_archived = repData?.length || 0;
            }

            const { data: exData, error: exErr } = await supabase
                .from('exam_results')
                .update({ archived_at: nowIso })
                .lt('retention_until', nowIso)
                .is('archived_at', null)
                .select('id');

            if (exErr) {
                logger.error(`[DataRetention][${institutionId}] Exam results archival error:`, exErr);
            } else {
                results.exam_results_archived = exData?.length || 0;
            }

            // 3. Mark inactive leavers (graduated/withdrawn/departed > 7 years ago) as archived
            const sevenYearsAgo = new Date();
            sevenYearsAgo.setFullYear(sevenYearsAgo.getFullYear() - 7);
            const sevenYearsAgoIso = sevenYearsAgo.toISOString();

            const { data: stuData, error: stuErr } = await supabase
                .from('students')
                .update({ archived_at: nowIso })
                .not('departed_at', 'is', null)
                .lt('departed_at', sevenYearsAgoIso)
                .is('archived_at', null)
                .select('id');

            if (!stuErr && stuData) {
                results.departed_records_archived += stuData.length;
            }

            const { data: teaData, error: teaErr } = await supabase
                .from('teachers')
                .update({ archived_at: nowIso })
                .not('departed_at', 'is', null)
                .lt('departed_at', sevenYearsAgoIso)
                .is('archived_at', null)
                .select('id');

            if (!teaErr && teaData) {
                results.departed_records_archived += teaData.length;
            }

            return results;
        } catch (err) {
            logger.error(`[DataRetention][${institutionId}] Unexpected error during retention run:`, err);
            return results;
        }
    });
};

const runDataRetentionCleanup = async (targetInstitutionId = null) => {
    if (targetInstitutionId) {
        return runSingleTenantRetention(targetInstitutionId);
    }

    // Global background cleanup: iterate per institution with isolated tenant contexts
    const totalResults = {
        student_attendance_purged: 0,
        teacher_attendance_purged: 0,
        academic_reports_archived: 0,
        exam_results_archived: 0,
        departed_records_archived: 0,
    };

    try {
        const { data: institutions, error } = await supabase
            .from('institutions')
            .select('id');

        if (error || !institutions) {
            logger.error('[DataRetention] Failed to fetch institutions for retention job:', error);
            return totalResults;
        }

        for (const inst of institutions) {
            const instRes = await runSingleTenantRetention(inst.id);
            totalResults.student_attendance_purged += instRes.student_attendance_purged;
            totalResults.teacher_attendance_purged += instRes.teacher_attendance_purged;
            totalResults.academic_reports_archived += instRes.academic_reports_archived;
            totalResults.exam_results_archived += instRes.exam_results_archived;
            totalResults.departed_records_archived += instRes.departed_records_archived;
        }

        return totalResults;
    } catch (err) {
        logger.error('[DataRetention] Unexpected error during global retention run:', err);
        return totalResults;
    }
};

module.exports = {
    runDataRetentionCleanup,
    runSingleTenantRetention
};
