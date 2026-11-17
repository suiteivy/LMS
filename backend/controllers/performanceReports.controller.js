const PerformanceReportService = require('../services/performanceReport.service.js');
const { compilePdfBuffer } = require('../services/pdfCompiler.service.js');
const supabase = require('../utils/supabaseClient.js');

/**
 * Controller handling academic performance summary reporting, rankings, leaderboards, and PDF exports
 */
exports.getSummary = async (req, res) => {
    try {
        const institutionId = req.institution_id || req.user?.institution_id;
        const userRole = req.userRole || req.user?.role || 'admin';
        const userId = req.userId || req.user?.id;

        if (!institutionId) {
            return res.status(400).json({ error: 'Institution context is required.' });
        }

        const {
            scope = 'class',
            class_id = null,
            grade_level = null,
            subject_id = null,
            term_id = null,
            academic_year = '2026'
        } = req.query;

        // Role-based scope checks
        if (userRole === 'teacher' && class_id) {
            // Verify teacher has access to requested class
            const { data: teacher } = await supabase
                .from('teachers')
                .select('id')
                .eq('user_id', userId)
                .maybeSingle();

            if (teacher) {
                const { data: link } = await supabase
                    .from('subject_teachers')
                    .select('id')
                    .eq('teacher_id', teacher.id)
                    .eq('class_id', class_id)
                    .maybeSingle();

                const { data: cls } = await supabase
                    .from('classes')
                    .select('teacher_id')
                    .eq('id', class_id)
                    .maybeSingle();

                if (!link && cls?.teacher_id !== teacher.id) {
                    // Out-of-scope read returns empty results gracefully
                    return res.json({
                        scope,
                        stats: { count: 0, average: 0, median: 0, highest: 0, lowest: 0, pass_rate: 0 },
                        distribution: {},
                        subject_analysis: [],
                        leaderboard: [],
                        rankings: [],
                        insights: ['No records within your assigned instructional scope.']
                    });
                }
            }
        }

        const reportData = await PerformanceReportService.generateReport({
            institutionId,
            scope,
            classId: class_id,
            gradeLevel: grade_level,
            subjectId: subject_id,
            termId: term_id,
            academicYear: academic_year,
            userRole,
            userId
        });

        return res.json(reportData);
    } catch (err) {
        console.error('getSummary error:', err);
        return res.status(500).json({ error: 'Failed to generate performance summary report.' });
    }
};

exports.getRankings = async (req, res) => {
    try {
        const institutionId = req.institution_id || req.user?.institution_id;
        const userRole = req.userRole || req.user?.role || 'admin';
        const userId = req.userId || req.user?.id;

        if (!institutionId) {
            return res.status(400).json({ error: 'Institution context is required.' });
        }

        const {
            class_id = null,
            subject_id = null,
            academic_year = '2026'
        } = req.query;

        const reportData = await PerformanceReportService.generateReport({
            institutionId,
            scope: class_id ? 'class' : 'institution',
            classId: class_id,
            subjectId: subject_id,
            academicYear: academic_year,
            userRole,
            userId
        });

        return res.json({
            leaderboard: reportData.leaderboard,
            rankings: reportData.rankings,
            total_students: reportData.stats.count,
            distribution: reportData.distribution
        });
    } catch (err) {
        console.error('getRankings error:', err);
        return res.status(500).json({ error: 'Failed to generate student rankings.' });
    }
};

exports.downloadReportPdf = async (req, res) => {
    try {
        const institutionId = req.institution_id || req.user?.institution_id;
        const userRole = req.userRole || req.user?.role || 'admin';
        const userId = req.userId || req.user?.id;

        if (!institutionId) {
            return res.status(400).json({ error: 'Institution context is required.' });
        }

        const {
            scope = 'class',
            class_id = null,
            subject_id = null,
            academic_year = '2026'
        } = req.query;

        const reportData = await PerformanceReportService.generateReport({
            institutionId,
            scope,
            classId: class_id,
            subjectId: subject_id,
            academicYear: academic_year,
            userRole,
            userId
        });

        // Compile vector PDF
        const pdfPayload = {
            document_type: 'performance_summary_report',
            data: reportData
        };

        const pdfBuffer = await compilePdfBuffer(pdfPayload);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Performance_Report_${reportData.class_name || 'Academic'}.pdf"`);
        return res.send(pdfBuffer);
    } catch (err) {
        console.error('downloadReportPdf error:', err);
        return res.status(500).json({ error: 'Failed to compile performance report PDF.' });
    }
};
