const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
    isFeeStructureActiveForTerm,
    matchesLevelCriteria,
    resolveApplicableFeeStructure,
    resolveFeeComponents,
    applyDiscountsAndWaivers,
    computeStudentFinancialAssessment
} = require('../utils/feePrecedenceEngine.js');

test('matchesLevelCriteria matches grades, forms, education levels, and ranges', () => {
    const studentGrade4 = { grade_level: 4, education_level: 'primary', cbc_band: 'primary' };
    const studentForm2 = { form_level: 2, education_level: 'secondary' };

    // Grade match
    assert.equal(matchesLevelCriteria({ level_scope: 'grade', level_value: 4 }, studentGrade4), true);
    assert.equal(matchesLevelCriteria({ level_scope: 'grade', level_value: 5 }, studentGrade4), false);

    // Form match
    assert.equal(matchesLevelCriteria({ level_scope: 'form', level_value: 2 }, studentForm2), true);
    assert.equal(matchesLevelCriteria({ level_scope: 'form', level_value: 3 }, studentForm2), false);

    // Range match
    assert.equal(matchesLevelCriteria({ level_from: 1, level_to: 6 }, studentGrade4), true);
    assert.equal(matchesLevelCriteria({ level_from: 7, level_to: 9 }, studentGrade4), false);

    // Level type match
    assert.equal(matchesLevelCriteria({ level_type: 'primary' }, studentGrade4), true);
    assert.equal(matchesLevelCriteria({ level_type: 'junior_secondary' }, studentGrade4), false);
});

test('resolveApplicableFeeStructure enforces strict 4-tier precedence', () => {
    const student = {
        id: 'stu-alice',
        grade_level: 7,
        class_id: 'cls-grade7-east',
        education_level: 'junior_secondary',
    };

    const instDefault = {
        id: 'fee-inst-default',
        title: 'Standard Tuition',
        scope_type: 'institution',
        amount: 25000,
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
    };

    const levelOverride = {
        id: 'fee-level-jss',
        title: 'Junior Secondary Tuition',
        scope_type: 'level',
        level_type: 'junior_secondary',
        amount: 32000,
        is_active: true,
        created_at: '2026-01-02T00:00:00Z',
    };

    const classOverride = {
        id: 'fee-class-7e',
        title: 'Grade 7 East Activity Fee',
        scope_type: 'class',
        class_id: 'cls-grade7-east',
        amount: 35000,
        is_active: true,
        created_at: '2026-01-03T00:00:00Z',
    };

    const studentOverride = {
        id: 'fee-student-alice',
        title: 'Alice Bursary Subsidized Fee',
        scope_type: 'student',
        student_id: 'stu-alice',
        amount: 15000,
        is_active: true,
        created_at: '2026-01-04T00:00:00Z',
    };

    // 1. Only inst default available
    let res = resolveApplicableFeeStructure(student, [instDefault]);
    assert.equal(res.matchedTier, 'institution');
    assert.equal(res.feeStructure.id, 'fee-inst-default');

    // 2. Inst default + Level override available -> Level wins
    res = resolveApplicableFeeStructure(student, [instDefault, levelOverride]);
    assert.equal(res.matchedTier, 'level');
    assert.equal(res.feeStructure.id, 'fee-level-jss');

    // 3. Inst default + Level + Class override available -> Class wins
    res = resolveApplicableFeeStructure(student, [instDefault, levelOverride, classOverride]);
    assert.equal(res.matchedTier, 'class');
    assert.equal(res.feeStructure.id, 'fee-class-7e');

    // 4. All four tiers available -> Student override wins
    res = resolveApplicableFeeStructure(student, [instDefault, levelOverride, classOverride, studentOverride]);
    assert.equal(res.matchedTier, 'student');
    assert.equal(res.feeStructure.id, 'fee-student-alice');
});

test('applyDiscountsAndWaivers calculates component-specific and whole-fee discounts', () => {
    const components = [
        { id: 'comp-tui', name: 'Tuition', amount: 30000 },
        { id: 'comp-trn', name: 'Transport', amount: 8000 },
        { id: 'comp-act', name: 'Activity', amount: 2000 },
    ];
    const grossAmount = 40000;

    // Fixed discount on Transport (5000 off 8000)
    const discounts = [
        {
            id: 'disc-1',
            fee_component_id: 'comp-trn',
            type: 'discount',
            discount_type: 'fixed',
            value: 5000,
            status: 'active',
        },
        // 50% scholarship on Tuition (50% of 30000 = 15000)
        {
            id: 'disc-2',
            fee_component_id: 'comp-tui',
            type: 'scholarship',
            discount_type: 'percentage',
            value: 50,
            status: 'active',
        },
    ];

    const result = applyDiscountsAndWaivers(discounts, components, grossAmount);
    // Total discount = 5000 (transport) + 15000 (tuition) = 20000
    assert.equal(result.totalDiscount, 20000);
    assert.equal(result.netAssessed, 20000);
    assert.equal(result.appliedDiscounts.length, 2);
});

test('computeStudentFinancialAssessment reconciles gross, discounts, payments, and balance', async () => {
    const student = {
        id: 'stu-bob',
        grade_level: 5,
        class_id: 'cls-5b',
        education_level: 'primary',
    };

    const feeStructures = [
        {
            id: 'fee-primary',
            title: 'Primary School Fees',
            scope_type: 'level',
            level_type: 'primary',
            amount: 25000,
            is_active: true,
        }
    ];

    const payments = [
        { id: 'pay-1', amount: 10000, status: 'completed' },
        { id: 'pay-2', amount: 5000, status: 'success' },
        { id: 'pay-3', amount: 3000, status: 'pending' }, // Pending shouldn't count towards paid
    ];

    const discounts = [
        {
            id: 'disc-sibling',
            type: 'sibling_discount',
            discount_type: 'fixed',
            value: 2000,
            status: 'active',
        }
    ];

    const assessment = await computeStudentFinancialAssessment({
        institution_id: 'inst-1',
        student,
        activeTerm: null,
        feeStructures,
        payments,
        discounts,
    });

    assert.equal(assessment.matchedTier, 'level');
    assert.equal(assessment.grossAmount, 25000);
    assert.equal(assessment.totalDiscount, 2000);
    assert.equal(assessment.netAssessed, 23000);
    assert.equal(assessment.totalPaid, 15000);
    assert.equal(assessment.netBalance, 8000);
    assert.equal(assessment.status, 'partial');
});
