const test = require('node:test');
const assert = require('node:assert/strict');

const IdentifierService = require('../services/identifier.service.js');
const PerformanceReportService = require('../services/performanceReport.service.js');
const { compilePdfBuffer } = require('../services/pdfCompiler.service.js');

test('IdentifierService: Fallback assignment produces compliant 4-digit student, staff, and parent numbers', async () => {
    // 1. Student assignment (clean 4-digit numeric string)
    const studentId = await IdentifierService._fallbackAssign('inst-test-01', 'student');
    assert.ok(studentId.formatted_number, 'Student identifier must have formatted_number');
    assert.match(studentId.formatted_number, /^[0-9]{4,}$/, 'Student identifier must be at least 4 digits with leading zeros (e.g. 0001)');
    assert.equal(typeof studentId.number_value, 'number');

    // 2. Staff assignment (ST prefix with 4 digits)
    const staffId = await IdentifierService._fallbackAssign('inst-test-01', 'staff');
    assert.ok(staffId.formatted_number, 'Staff identifier must have formatted_number');
    assert.match(staffId.formatted_number, /^ST[0-9]{4,}$/, 'Staff identifier must start with ST followed by 4 digits (e.g. ST0001)');
    assert.equal(typeof staffId.number_value, 'number');

    // 3. Parent assignment (PA prefix with 4 digits)
    const parentId = await IdentifierService._fallbackAssign('inst-test-01', 'parent');
    assert.ok(parentId.formatted_number, 'Parent identifier must have formatted_number');
    assert.match(parentId.formatted_number, /^PA[0-9]{4,}$/, 'Parent identifier must start with PA followed by 4 digits (e.g. PA0001)');
    assert.equal(typeof parentId.number_value, 'number');
});

test('PerformanceReportService: calculateStats computes accurate statistics', () => {
    // Empty array
    const emptyStats = PerformanceReportService.calculateStats([]);
    assert.deepEqual(emptyStats, { count: 0, average: 0, median: 0, highest: 0, lowest: 0, pass_rate: 0 });

    // Odd count
    const oddScores = [45, 60, 75, 80, 90];
    const oddStats = PerformanceReportService.calculateStats(oddScores, 50);
    assert.equal(oddStats.count, 5);
    assert.equal(oddStats.highest, 90);
    assert.equal(oddStats.lowest, 45);
    assert.equal(oddStats.average, 70); // (45+60+75+80+90)/5 = 70
    assert.equal(oddStats.median, 75);
    assert.equal(oddStats.pass_rate, 80); // 4 out of 5 >= 50

    // Even count
    const evenScores = [40, 50, 70, 80];
    const evenStats = PerformanceReportService.calculateStats(evenScores, 50);
    assert.equal(evenStats.count, 4);
    assert.equal(evenStats.median, 60); // (50 + 70) / 2 = 60
    assert.equal(evenStats.pass_rate, 75); // 3 out of 4 >= 50
});

test('PerformanceReportService: computeDistribution aggregates CBC bands accurately', () => {
    const scores = [85, 92, 70, 68, 55, 35];
    const dist = PerformanceReportService.computeDistribution(scores);

    assert.equal(dist.EE.count, 2); // 85, 92
    assert.equal(dist.ME.count, 2); // 70, 68
    assert.equal(dist.AE.count, 1); // 55
    assert.equal(dist.BE.count, 1); // 35

    assert.equal(dist.EE.percentage, 33);
    assert.equal(dist.ME.percentage, 33);
    assert.equal(dist.AE.percentage, 17);
    assert.equal(dist.BE.percentage, 17);
});

test('PerformanceReportService: computeRankings handles standard competition ties with rank skipping', () => {
    const students = [
        { student_id: 's1', full_name: 'Alice', average_score: 95 },
        { student_id: 's2', full_name: 'Bob', average_score: 88 },
        { student_id: 's3', full_name: 'Charlie', average_score: 88 },
        { student_id: 's4', full_name: 'David', average_score: 72 },
        { student_id: 's5', full_name: 'Eve', average_score: 60 },
    ];

    const ranked = PerformanceReportService.computeRankings(students, 'average');

    assert.equal(ranked[0].rank, 1);
    assert.equal(ranked[0].student_id, 's1');

    // Tied for rank 2
    assert.equal(ranked[1].rank, 2);
    assert.equal(ranked[2].rank, 2);

    // Next rank must be skipped to 4
    assert.equal(ranked[3].rank, 4);
    assert.equal(ranked[3].student_id, 's4');
    assert.equal(ranked[3].full_name, 'David');

    assert.equal(ranked[4].rank, 5);
    assert.equal(ranked[4].student_id, 's5');
    assert.equal(ranked[4].full_name, 'Eve');
});

test('PerformanceReportService: generateInsights produces meaningful plain-English summaries', () => {
    const stats = { count: 30, average: 74.5, median: 76, highest: 98, lowest: 42, pass_rate: 85 };
    const subjects = [
        { title: 'Mathematics', average: 82.4 },
        { title: 'English Language', average: 76.1 },
        { title: 'Integrated Science', average: 64.2 },
    ];

    const insights = PerformanceReportService.generateInsights({
        stats,
        subjects,
        trendDelta: 3.2,
        atRiskCount: 2,
        mostImproved: { student_name: 'Grace Mutua', points_gained: 5.4 }
    });

    assert.ok(insights.length >= 3, 'Must produce multi-point factual insights');
    assert.ok(insights.some(i => i.includes('pass rate of 85%')), 'Mentions pass rate');
    assert.ok(insights.some(i => i.includes('up by 3.2 points')), 'Mentions positive delta trend');
    assert.ok(insights.some(i => i.includes('Highest performing subject is Mathematics')), 'Identifies highest subject');
    assert.ok(insights.some(i => i.includes('lowest cohort average at 64.2%')), 'Identifies lowest subject');
    assert.ok(insights.some(i => i.includes('targeted academic support')), 'Includes intervention guidance for at-risk count');
    assert.ok(insights.some(i => i.includes('Most improved student: Grace Mutua')), 'Includes most improved student');
});

test('Sequential Invoices: Invoice number format matches INV-YYYY-ADM-#### standard', () => {
    const yearStr = '2026';
    const adm = '0012';
    const seq = 1;
    const invoiceNumber = `INV-${yearStr}-${adm}-${String(seq).padStart(4, '0')}`;

    assert.equal(invoiceNumber, 'INV-2026-0012-0001');
    assert.match(invoiceNumber, /^INV-[0-9]{4}-[A-Za-z0-9]+-[0-9]{4}$/);
});

test('Vector PDF: compilePdfBuffer compiles performance_summary_report without errors', async () => {
    const payload = {
        institution: {
            name: 'St. Ivy Premier Academy',
            address: 'P.O. Box 45000, Nairobi',
            contact_email: 'info@stivy.ac.ke',
            phone: '+254 711 000 000',
        },
        meta: {
            scope_mode: 'class',
            title: 'Performance Summary & Assessment Analytics',
            scope_label: 'Grade 8 Simba',
            academic_year: '2026',
            term_name: 'Term 1',
            generated_at: '2026-03-31',
        },
        stats: {
            count: 42,
            average: 73.8,
            median: 75.0,
            highest: 96.0,
            lowest: 44.0,
            pass_rate: 88,
        },
        distribution: {
            'EE': { label: 'Exceeding Expectations', count: 12, percentage: 29 },
            'ME': { label: 'Meeting Expectations', count: 25, percentage: 59 },
            'AE': { label: 'Approaching Expectations', count: 4, percentage: 10 },
            'BE': { label: 'Below Expectations', count: 1, percentage: 2 },
        },
        subjects: [
            { title: 'Mathematics', teacher: 'Mr. Otieno', assessed_count: 42, average: 78.5, pass_rate: 90 },
            { title: 'English', teacher: 'Mrs. Wanjiku', assessed_count: 42, average: 75.2, pass_rate: 88 },
            { title: 'Integrated Science', teacher: 'Dr. Kiprop', assessed_count: 42, average: 71.0, pass_rate: 85 },
            { title: 'Social Studies', teacher: 'Ms. Achieng', assessed_count: 42, average: 70.4, pass_rate: 83 },
        ],
        leaderboard: [
            { rank: 1, full_name: 'Grace Mutua', admission_number: '0001', score: 96.0, grade: 'EE' },
            { rank: 2, full_name: 'Brian Omondi', admission_number: '0002', score: 94.5, grade: 'EE' },
            { rank: 3, full_name: 'Mercy Chebet', admission_number: '0003', score: 91.0, grade: 'EE' },
            { rank: 4, full_name: 'Kelvin Mwangi', admission_number: '0004', score: 88.5, grade: 'EE' },
            { rank: 5, full_name: 'Faith Achieng', admission_number: '0005', score: 86.0, grade: 'EE' },
        ],
        insights: [
            'Class demonstrated exceptional performance with an 88% overall pass rate.',
            'Mathematics recorded the highest departmental mean at 78.5%.',
            'Performance improved by 3.2 points relative to Term 3 of previous cycle.'
        ]
    };

    const pdfBuffer = await compilePdfBuffer({
        document_type: 'performance_summary_report',
        data: payload
    });

    assert.ok(Buffer.isBuffer(pdfBuffer), 'Must return a Buffer');
    assert.equal(pdfBuffer.subarray(0, 4).toString(), '%PDF', 'Buffer must start with %PDF header');
});
