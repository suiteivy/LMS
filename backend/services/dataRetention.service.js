/**
 * Data Retention Service
 * Enforces scheduled retention and archival policies:
 * - 2-Year Retention: Daily attendance records (students and teachers)
 * - 7-Year Retention: Academic reports and exam records
 * - Soft-delete / Archive for inactive students and teachers (departed > 7 years)
 */

const { supabase } = require('../libs/supabase');
const logger = require('../utils/logger');

const runDataRetentionCleanup = async () => {
    const results = {
        student_attendance_purged: 0,
        teacher_attendance_purged: 0,
        academic_reports_archived: 0,
        exam_results_archived: 0,
        departed_records_archived: 0,
    };

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
            logger.error('[DataRetention] Student attendance purge error:', sErr);
        } else {
            results.student_attendance_purged = sAtt?.length || 0;
        }

        const { data: tAtt, error: tErr } = await supabase
            .from('teacher_attendance')
            .delete()
            .lt('date', attendanceCutoffStr)
            .select('id');

        if (tErr) {
            logger.error('[DataRetention] Teacher attendance purge error:', tErr);
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
            logger.error('[DataRetention] Academic reports archival error:', repErr);
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
            logger.error('[DataRetention] Exam results archival error:', exErr);
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
        logger.error('[DataRetention] Unexpected error during retention run:', err);
        return results;
    }
};

module.exports = {
    runDataRetentionCleanup,
};
