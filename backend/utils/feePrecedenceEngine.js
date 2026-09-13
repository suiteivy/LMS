// backend/utils/feePrecedenceEngine.js
const supabase = require('./supabaseClient.js');

const normalizeText = (value) => {
    if (typeof value !== 'string') return '';
    return value.trim().toLowerCase();
};

const isAnnualTermSelection = (termName, termId) => {
    if (termId) return false;
    const normalized = normalizeText(termName);
    return !normalized || normalized === 'annual';
};

const isFeeStructureActiveForTerm = (feeStructure, activeTerm) => {
    if (!activeTerm) return true; // if no active term resolved, consider active

    const activeYearId = activeTerm.academic_year_id;
    const activeYearName = normalizeText(activeTerm.academic_years?.name);
    const requestedYearId = feeStructure?.academic_year_id;
    const requestedYearName = normalizeText(feeStructure?.academic_year);
    const hasYearSelection = !!requestedYearId || !!requestedYearName;

    const yearMatches =
        !hasYearSelection ||
        ((!!requestedYearId && !!activeYearId && requestedYearId === activeYearId) ||
            (!!requestedYearName && !!activeYearName && requestedYearName === activeYearName));

    if (!yearMatches) return false;

    if (isAnnualTermSelection(feeStructure?.term, feeStructure?.term_id)) {
        return true;
    }

    const requestedTermName = normalizeText(feeStructure?.term);
    const activeTermName = normalizeText(activeTerm?.name);

    return (
        (!!feeStructure?.term_id && feeStructure.term_id === activeTerm.id) ||
        (!!requestedTermName && !!activeTermName && requestedTermName === activeTermName)
    );
};

/**
 * Matches a fee structure to a student by level criteria (Grade, Form, CBC Band, Education Level)
 */
const matchesLevelCriteria = (feeStructure, student) => {
    const scopeType = normalizeText(feeStructure?.scope_type);
    const levelScope = normalizeText(feeStructure?.level_scope);
    const levelType = normalizeText(feeStructure?.level_type);

    const gradeLevel = Number(student?.grade_level);
    const formLevel = Number(student?.form_level);
    const educationLevel = normalizeText(student?.education_level || student?.classes?.education_level);
    const cbcBand = normalizeText(student?.cbc_band || student?.classes?.cbc_band);

    // 1. Explicit level_type match (e.g. 'primary', 'junior_secondary', 'senior_secondary')
    if (levelType && (levelType === educationLevel || levelType === cbcBand)) {
        return true;
    }

    // 2. Grade-specific scope
    if (levelScope === 'grade' || scopeType === 'grade') {
        const target = Number(feeStructure?.level_value);
        return Number.isFinite(target) && Number.isFinite(gradeLevel) && target === gradeLevel;
    }

    // 3. Form-specific scope
    if (levelScope === 'form' || scopeType === 'form') {
        const target = Number(feeStructure?.level_value);
        return Number.isFinite(target) && Number.isFinite(formLevel) && target === formLevel;
    }

    // 4. Level range (level_from to level_to)
    if (Number.isFinite(Number(feeStructure?.level_from)) && Number.isFinite(Number(feeStructure?.level_to))) {
        const effectiveLevel = Number.isFinite(gradeLevel) ? gradeLevel : formLevel;
        if (Number.isFinite(effectiveLevel)) {
            return effectiveLevel >= Number(feeStructure.level_from) && effectiveLevel <= Number(feeStructure.level_to);
        }
    }

    // 5. Broad education level match in level_scope
    if (levelScope && ['primary', 'junior_secondary', 'senior_secondary', 'pre_primary', 'secondary'].includes(levelScope)) {
        return levelScope === educationLevel || levelScope === cbcBand;
    }

    return false;
};

/**
 * Resolves which fee structure applies to a student according to the strict precedence hierarchy:
 * Priority 1: Individual Student Override (scope_type = 'student')
 * Priority 2: Class Override (scope_type = 'class')
 * Priority 3: Education / Grade Level Override (scope_type = 'level')
 * Priority 4: Institution-Wide Default (scope_type = 'institution' or level_scope = 'all')
 */
function resolveApplicableFeeStructure(student, feeStructures, activeTerm) {
    if (!student || !Array.isArray(feeStructures) || feeStructures.length === 0) {
        return { feeStructure: null, matchedTier: 'none' };
    }

    // Filter by active status and active term/year compatibility
    const candidates = feeStructures.filter((f) => {
        const isActive = f.is_active !== false && normalizeText(f.status) !== 'draft';
        if (!isActive) return false;
        return isFeeStructureActiveForTerm(f, activeTerm);
    });

    const studentId = student.id;
    const studentUserId = student.user_id;
    const classId = student.class_id || student.class_enrollments?.[0]?.class_id;

    // Priority 1: Individual Student Override
    const studentOverrides = candidates.filter((f) => {
        const scope = normalizeText(f.scope_type);
        if (scope !== 'student') return false;
        return (f.student_id && (f.student_id === studentId || f.student_id === studentUserId));
    });
    if (studentOverrides.length > 0) {
        // Pick most recently created override
        studentOverrides.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        return { feeStructure: studentOverrides[0], matchedTier: 'student' };
    }

    // Priority 2: Class Override
    if (classId) {
        const classOverrides = candidates.filter((f) => {
            const scope = normalizeText(f.scope_type);
            return scope === 'class' && f.class_id === classId;
        });
        if (classOverrides.length > 0) {
            classOverrides.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
            return { feeStructure: classOverrides[0], matchedTier: 'class' };
        }
    }

    // Priority 3: Education / Grade Level Override
    const levelOverrides = candidates.filter((f) => {
        const scope = normalizeText(f.scope_type);
        const levelScope = normalizeText(f.level_scope);
        const isLevelScoped = scope === 'level' || (levelScope && levelScope !== 'all');
        if (!isLevelScoped) return false;
        return matchesLevelCriteria(f, student);
    });
    if (levelOverrides.length > 0) {
        levelOverrides.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        return { feeStructure: levelOverrides[0], matchedTier: 'level' };
    }

    // Priority 4: Institution-Wide Default
    const institutionDefaults = candidates.filter((f) => {
        const scope = normalizeText(f.scope_type) || 'institution';
        const levelScope = normalizeText(f.level_scope) || 'all';
        return (scope === 'institution' && levelScope === 'all') || (!f.scope_type && !f.level_scope);
    });
    if (institutionDefaults.length > 0) {
        institutionDefaults.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        return { feeStructure: institutionDefaults[0], matchedTier: 'institution' };
    }

    // Fallback: If any candidates remain, pick the most general one
    return { feeStructure: candidates[0] || null, matchedTier: candidates.length > 0 ? 'fallback' : 'none' };
}

/**
 * Resolves discrete fee components for a fee structure, or falls back to lump-sum
 */
async function resolveFeeComponents(feeStructureId, institutionId, fallbackAmount = 0, fallbackTitle = 'Tuition / Core Fee') {
    if (!feeStructureId) {
        return {
            components: [],
            grossAmount: 0,
            hasComponents: false
        };
    }

    try {
        const { data: dbComponents, error } = await supabase
            .from('fee_components')
            .select('*')
            .eq('fee_structure_id', feeStructureId)
            .eq('institution_id', institutionId)
            .eq('is_active', true)
            .order('created_at', { ascending: true });

        if (!error && Array.isArray(dbComponents) && dbComponents.length > 0) {
            const grossAmount = dbComponents
                .filter(c => c.is_mandatory !== false)
                .reduce((sum, c) => sum + Number(c.amount || 0), 0);

            return {
                components: dbComponents,
                grossAmount: Number(grossAmount.toFixed(2)),
                hasComponents: true
            };
        }
    } catch (err) {
        console.warn('resolveFeeComponents query fallback:', err.message);
    }

    // Lump sum fallback
    const numericFallback = Number(fallbackAmount || 0);
    const fallbackComponents = [
        {
            id: `fallback-${feeStructureId}`,
            fee_structure_id: feeStructureId,
            name: fallbackTitle || 'Tuition / Core Fee',
            code: 'TUI',
            amount: numericFallback,
            is_mandatory: true,
            category: 'core',
            frequency: 'term',
        }
    ];

    return {
        components: fallbackComponents,
        grossAmount: numericFallback,
        hasComponents: false
    };
}

/**
 * Calculates discounts, scholarships, and waivers for a student
 */
function applyDiscountsAndWaivers(discounts, components, grossAmount) {
    if (!Array.isArray(discounts) || discounts.length === 0 || grossAmount <= 0) {
        return {
            appliedDiscounts: [],
            totalDiscount: 0,
            netAssessed: grossAmount
        };
    }

    let runningGross = grossAmount;
    let totalDiscount = 0;
    const appliedDiscounts = [];

    for (const waiver of discounts) {
        if (waiver.status !== 'active') continue;

        let discountVal = 0;
        const rawValue = Number(waiver.value || 0);

        if (waiver.fee_component_id) {
            // Component-specific discount
            const targetComp = components.find(c => c.id === waiver.fee_component_id);
            const compAmount = targetComp ? Number(targetComp.amount || 0) : 0;
            if (waiver.discount_type === 'percentage') {
                discountVal = compAmount * (rawValue / 100);
            } else {
                discountVal = Math.min(compAmount, rawValue);
            }
        } else {
            // Whole-fee discount
            if (waiver.discount_type === 'percentage') {
                discountVal = runningGross * (rawValue / 100);
            } else {
                discountVal = Math.min(runningGross, rawValue);
            }
        }

        discountVal = Math.max(0, Number(discountVal.toFixed(2)));
        if (discountVal > 0) {
            totalDiscount += discountVal;
            runningGross = Math.max(0, runningGross - discountVal);
            appliedDiscounts.push({
                ...waiver,
                calculated_discount_amount: discountVal
            });
        }
    }

    totalDiscount = Math.min(grossAmount, Number(totalDiscount.toFixed(2)));
    const netAssessed = Math.max(0, Number((grossAmount - totalDiscount).toFixed(2)));

    return {
        appliedDiscounts,
        totalDiscount,
        netAssessed
    };
}

/**
 * Master method: Computes complete financial assessment for a student
 */
async function computeStudentFinancialAssessment({
    institution_id,
    student,
    activeTerm,
    feeStructures,
    payments = [],
    discounts = []
}) {
    // 1. Resolve applicable fee structure via precedence hierarchy
    const { feeStructure, matchedTier } = resolveApplicableFeeStructure(student, feeStructures, activeTerm);

    // 2. Resolve components or lump sum
    const fallbackAmount = feeStructure?.total_amount || feeStructure?.amount || 0;
    const fallbackTitle = feeStructure?.title || feeStructure?.name || 'Tuition / Core Fee';
    const { components, grossAmount, hasComponents } = await resolveFeeComponents(
        feeStructure?.id,
        institution_id,
        fallbackAmount,
        fallbackTitle
    );

    // 3. Apply discounts / waivers
    const { appliedDiscounts, totalDiscount, netAssessed } = applyDiscountsAndWaivers(
        discounts,
        components,
        grossAmount
    );

    // 4. Calculate total paid
    const totalPaid = (payments || [])
        .filter(p => p.status === 'completed' || p.status === 'success')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const netBalance = Number((netAssessed - totalPaid).toFixed(2));

    return {
        matchedTier,
        feeStructure,
        components,
        hasComponents,
        grossAmount,
        appliedDiscounts,
        totalDiscount,
        netAssessed,
        totalPaid: Number(totalPaid.toFixed(2)),
        netBalance,
        status: netBalance <= 0 ? (grossAmount > 0 ? 'paid' : 'cleared') : (totalPaid > 0 ? 'partial' : 'unpaid')
    };
}

module.exports = {
    isFeeStructureActiveForTerm,
    matchesLevelCriteria,
    resolveApplicableFeeStructure,
    resolveFeeComponents,
    applyDiscountsAndWaivers,
    computeStudentFinancialAssessment
};
