// controllers/finance.controller.js
const supabase = require("../utils/supabaseClient.js");
const { parsePagination, paginatedResponse } = require("../utils/pagination.js");
const { resolveActiveTerm } = require('../utils/resolveActiveTerm');
const { buildReceiptHtml } = require('../utils/receiptTemplate.js');
const { logRecordChange } = require('../utils/auditLogger.js');
const LedgerService = require('../services/ledger.service.js');
const ReceiptService = require('../services/receipt.service.js');
const {
    computeStudentFinancialAssessment,
    resolveApplicableFeeStructure,
    resolveFeeComponents,
    applyDiscountsAndWaivers
} = require('../utils/feePrecedenceEngine.js');
const { runFeeDeadlineReminderSweepWithRetry } = require('../services/feeDeadlineReminder.service.js');
const { compilePdfBuffer } = require('../services/pdfCompiler.service.js');
const {
    roundCurrency,
    roundDecimal,
    formatCurrencyAmount,
    calculateRunningBalance,
    normalizeCurrency,
} = require('../utils/numericStandards.js');

const FEE_STRUCTURE_STATUS = {
    DRAFT: 'Draft',
    RELEASED: 'Released',
    COMPLETED: 'Completed',
};

const REVENUE_DEDUCTION_TYPE = 'revenue_deduction';

const PAYMENT_MIN_RETENTION_DAYS = 365;
const PAYMENT_MIN_RETENTION_MS = PAYMENT_MIN_RETENTION_DAYS * 24 * 60 * 60 * 1000;
const DEFAULT_RECORDED_BY_LABEL = 'Unknown';
const ANNUAL_TERM_NAME = 'Annual';
const FINANCE_ADMIN_ROLES = ['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin', 'finance_administrator', 'finance_admin'];

const getDefaultCurrencyMeta = async () => {
    const { data } = await supabase
        .from('currencies')
        .select('code, symbol, decimal_places')
        .eq('is_default', true)
        .eq('is_active', true)
        .maybeSingle();

    if (data?.code) return data;
    return { code: 'KES', symbol: 'KSh', decimal_places: 2 };
};

const normalizeRoleForAccess = (value) => {
    const role = String(value || '').trim().toLowerCase();
    if (!role) return null;
    if (role === 'bursar') return 'bursary';
    return role;
};

const expandRoleAliases = (role) => {
    const normalized = normalizeRoleForAccess(role);
    if (!normalized) return [];

    const expanded = new Set([normalized]);

    if (normalized === 'admin') expanded.add('school_admin');
    if (normalized === 'school_admin') expanded.add('admin');

    if (normalized === 'master_admin') expanded.add('platform_admin');
    if (normalized === 'platform_admin') expanded.add('master_admin');

    return Array.from(expanded);
};

const hasRequiredFinanceRole = (req, allowedRoles = FINANCE_ADMIN_ROLES) => {
    const allowed = new Set();
    allowedRoles.forEach((role) => {
        expandRoleAliases(role).forEach((alias) => allowed.add(alias));
    });

    const userRoles = new Set();
    const addRole = (role) => {
        expandRoleAliases(role).forEach((alias) => userRoles.add(alias));
    };

    addRole(req.userRole);
    addRole(req?.user?.active_role);
    addRole(req?.user?.role);

    if (Array.isArray(req?.user?.available_roles)) {
        req.user.available_roles.forEach(addRole);
    }

    if (Array.isArray(req?.user?.roles)) {
        req.user.roles.forEach(addRole);
    }

    for (const role of userRoles) {
        if (allowed.has(role)) return true;
    }

    return false;
};

const normalizeNumeric = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeText = (value) => {
    if (typeof value !== 'string') return '';
    return value.trim().toLowerCase();
};

const normalizeDateOrNull = (value) => {
    if (value === undefined) return { ok: true, value: undefined };
    if (value === null) return { ok: true, value: null };
    if (typeof value === 'string' && value.trim() === '') return { ok: true, value: null };

    const asDate = new Date(value);
    if (!Number.isFinite(asDate.getTime())) {
        return { ok: false, error: 'due_date must be a valid date' };
    }

    return { ok: true, value: asDate.toISOString().slice(0, 10) };
};

/**
 * Scoped access authorization helper:
 * - Finance Admins / Super Admins / Bursars have full access.
 * - Students can only access their own student records.
 * - Parents can only access records of their linked children.
 * - Non-finance staff/teachers are strictly excluded.
 */
const resolveAuthorizedStudentAccess = async (req, targetStudentId) => {
    if (hasRequiredFinanceRole(req, FINANCE_ADMIN_ROLES)) {
        return { authorized: true, role: 'admin' };
    }

    const institution_id = req.institution_id || req.user?.institution_id;
    const userId = req.userId || req.user?.id;
    const userRole = normalizeRoleForAccess(req.userRole || req.user?.role || req.user?.active_role);

    if (!userId || !institution_id || !targetStudentId) {
        return { authorized: false, reason: 'Missing authentication context or student identifier' };
    }

    if (userRole === 'student') {
        const { data: student } = await supabase
            .from('students')
            .select('id, user_id')
            .eq('id', targetStudentId)
            .eq('institution_id', institution_id)
            .maybeSingle();

        if (student && student.user_id === userId) {
            return { authorized: true, role: 'student', studentId: student.id };
        }
        return { authorized: false, reason: 'Students may only access their own financial records' };
    }

    if (userRole === 'parent' || userRole === 'guardian') {
        const { data: parent } = await supabase
            .from('parents')
            .select('id')
            .eq('user_id', userId)
            .eq('institution_id', institution_id)
            .maybeSingle();

        if (parent) {
            const { data: link } = await supabase
                .from('parent_students')
                .select('id')
                .eq('parent_id', parent.id)
                .eq('student_id', targetStudentId)
                .maybeSingle();

            if (link) {
                return { authorized: true, role: 'parent' };
            }
        }
        return { authorized: false, reason: 'Parents may only access financial records for their linked children' };
    }

    return { authorized: false, reason: 'Unauthorized access: Teachers and staff without finance designation cannot access student fee records' };
};

const resolveAcademicYearById = async ({ institution_id, academic_year_id }) => {
    if (!academic_year_id) return null;

    const { data, error } = await supabase
        .from('academic_years')
        .select('id, name')
        .eq('id', academic_year_id)
        .eq('institution_id', institution_id)
        .maybeSingle();

    if (error || !data) return null;
    return data;
};

const resolveAcademicYearByName = async ({ institution_id, academic_year }) => {
    const normalized = normalizeText(academic_year);
    if (!normalized) return null;

    const { data, error } = await supabase
        .from('academic_years')
        .select('id, name')
        .eq('institution_id', institution_id);

    if (error || !Array.isArray(data)) return null;
    return data.find((row) => normalizeText(row.name) === normalized) || null;
};

const resolveTermById = async ({ institution_id, term_id }) => {
    if (!term_id) return null;

    const { data, error } = await supabase
        .from('terms')
        .select('id, name, academic_year_id')
        .eq('id', term_id)
        .eq('institution_id', institution_id)
        .maybeSingle();

    if (error || !data) return null;
    return data;
};

const resolveTermByName = async ({ institution_id, academic_year_id, term }) => {
    const normalized = normalizeText(term);
    if (!normalized) return null;

    let query = supabase
        .from('terms')
        .select('id, name, academic_year_id')
        .eq('institution_id', institution_id);

    if (academic_year_id) {
        query = query.eq('academic_year_id', academic_year_id);
    }

    const { data, error } = await query;
    if (error || !Array.isArray(data)) return null;
    return data.find((row) => normalizeText(row.name) === normalized) || null;
};

const normalizeFeeStructurePeriod = async ({
    institution_id,
    academic_year_id,
    academic_year,
    term_id,
    term,
}) => {
    let resolvedYear = null;

    if (academic_year_id) {
        resolvedYear = await resolveAcademicYearById({ institution_id, academic_year_id });
        if (!resolvedYear) {
            return { ok: false, status: 400, error: 'Invalid academic_year_id for this institution' };
        }
    } else {
        resolvedYear = await resolveAcademicYearByName({ institution_id, academic_year });
        if (!resolvedYear) {
            return { ok: false, status: 400, error: 'academic_year_id is required and must resolve to an institution academic year' };
        }
    }

    if (isAnnualTermSelection(term, term_id)) {
        return {
            ok: true,
            academic_year_id: resolvedYear.id,
            academic_year: resolvedYear.name,
            term_id: null,
            term: ANNUAL_TERM_NAME,
        };
    }

    let resolvedTerm = null;
    if (term_id) {
        resolvedTerm = await resolveTermById({ institution_id, term_id });
    } else {
        resolvedTerm = await resolveTermByName({ institution_id, academic_year_id: resolvedYear.id, term });
    }

    if (!resolvedTerm) {
        return { ok: false, status: 400, error: 'term_id is required (unless annual) and must resolve to an institution term' };
    }

    if (resolvedTerm.academic_year_id && resolvedTerm.academic_year_id !== resolvedYear.id) {
        return { ok: false, status: 400, error: 'term_id does not belong to the selected academic_year_id' };
    }

    return {
        ok: true,
        academic_year_id: resolvedYear.id,
        academic_year: resolvedYear.name,
        term_id: resolvedTerm.id,
        term: resolvedTerm.name,
    };
};

const isAnnualTermSelection = (termName, termId) => {
    if (termId) return false;
    const normalized = normalizeText(termName);
    return !normalized || normalized === 'annual';
};

const resolveFeeStructureCurrentPair = async ({ institution_id, term_id, academic_year_id, termName, academicYearName }) => {
    const activeTerm = await resolveActiveTerm(institution_id);
    if (!activeTerm) return false;

    const activeYearId = activeTerm.academic_year_id;
    const activeYearName = normalizeText(activeTerm.academic_years?.name);
    const requestedYearName = normalizeText(academicYearName);
    const hasYearSelection = !!academic_year_id || !!requestedYearName;

    const yearMatches =
        !hasYearSelection ||
        ((!!academic_year_id && !!activeYearId && academic_year_id === activeYearId) ||
        (!!requestedYearName && !!activeYearName && requestedYearName === activeYearName));

    if (!yearMatches) return false;

    if (isAnnualTermSelection(termName, term_id)) {
        return true;
    }

    const requestedTermName = normalizeText(termName);
    const activeTermName = normalizeText(activeTerm.name);
    const termMatches =
        (!!term_id && term_id === activeTerm.id) ||
        (!!requestedTermName && !!activeTermName && requestedTermName === activeTermName);

    return termMatches;
};

/**
 * Create a new Fund
 */
exports.createFund = async (req, res) => {
    try {
        const { userRole, institution_id } = req;
        if (!hasRequiredFinanceRole(req, FINANCE_ADMIN_ROLES)) return res.status(403).json({ error: "Unauthorized" });

        const { name, description, total_amount } = req.body;
        if (!name) return res.status(400).json({ error: "Fund name is required" });

        const { data, error } = await supabase
            .from("funds")
            .insert([{ name, description, total_amount: total_amount || 0, institution_id }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error("Create fund error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * List all funds
 */
exports.getFunds = async (req, res) => {
    try {
        const { institution_id } = req;
        const { data, error } = await supabase
            .from("funds")
            .select("*")
            .eq("institution_id", institution_id)
            .order("created_at", { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error("Get funds error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Create an Allocation from a Fund
 */
exports.createAllocation = async (req, res) => {
    try {
        const { userRole, institution_id } = req;
        if (!hasRequiredFinanceRole(req, FINANCE_ADMIN_ROLES)) return res.status(403).json({ error: "Unauthorized" });

        const { fund_id, title, description, amount, category, status } = req.body;
        if (!fund_id || !title || !amount) {
            return res.status(400).json({ error: "fund_id, title, and amount are required" });
        }

        // 1. Check fund balance (logic check)
        const { data: fund } = await supabase.from('funds').select('total_amount, allocated_amount')
            .eq('id', fund_id)
            .eq('institution_id', institution_id)
            .single();
        if (!fund) return res.status(404).json({ error: "Fund not found" });

        // Simple check: current allocated + new amount <= total? 
        // Or is 'allocated_amount' a stored sum? 
        // We should allow over-allocation with a warning, or block it. 
        // For now, let's just insert. We can add a trigger to update 'allocated_amount' in funds table.
        // Ideally, we sum up allocations to show 'used'.

        const { data, error } = await supabase
            .from("fund_allocations")
            .insert([{
                fund_id,
                title,
                description,
                amount,
                category,
                institution_id,
                status: status || 'planned'
            }])
            .select()
            .single();

        if (error) throw error;

        // Manually update parent fund allocated amount
        // (Concurrency issue potential, but acceptable for this scale)
        const newAllocated = Number(fund.allocated_amount || 0) + Number(amount);
        await supabase.from('funds').update({ allocated_amount: newAllocated }).eq('id', fund_id);

        res.status(201).json(data);
    } catch (err) {
        console.error("Create allocation error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * List allocations for a fund
 */
exports.getAllocations = async (req, res) => {
    try {
        const { fund_id } = req.params;
        const { data, error } = await supabase
            .from("fund_allocations")
            .select("*, funds!inner(institution_id)")
            .eq("fund_id", fund_id)
            .eq("funds.institution_id", req.institution_id)
            .order("allocation_date", { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error("Get allocations error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get Financial Transactions (Unified)
 */
exports.getTransactions = async (req, res) => {
    try {
        const { institution_id, userRole, userId } = req;
        const { type, distinct_user_id } = req.query; // optional filters

        let query = supabase
            .from("financial_transactions")
            .select(`
                *,
                users (
                    id,
                    first_name,
                    last_name,
                    full_name,
                    role,
                    students (
                        id
                    ),
                    teachers (
                        id
                    )
                )
            `)
            .eq("institution_id", institution_id)
            .order("date", { ascending: false });

        if (!hasRequiredFinanceRole(req, FINANCE_ADMIN_ROLES)) {
            // Non-finance admins can only see their own transactions
            query = query.eq("user_id", userId);
        } else if (distinct_user_id) {
            // Admin filtering by specific user
            query = query.eq("user_id", distinct_user_id);
        }

        if (type) {
            query = query.eq("type", type);
        }

        const { data, error } = await query;
        if (error) throw error;

        const rows = data || [];
        const userIds = [...new Set(rows.map((tx) => tx.user_id).filter(Boolean))];

        let studentByUserId = new Map();
        let teacherByUserId = new Map();

        if (userIds.length > 0) {
            const [{ data: studentRows }, { data: teacherRows }] = await Promise.all([
                supabase
                    .from("students")
                    .select("id, user_id")
                    .eq("institution_id", institution_id)
                    .in("user_id", userIds),
                supabase
                    .from("teachers")
                    .select("id, user_id")
                    .eq("institution_id", institution_id)
                    .in("user_id", userIds),
            ]);

            studentByUserId = new Map((studentRows || []).map((s) => [s.user_id, s.id]));
            teacherByUserId = new Map((teacherRows || []).map((t) => [t.user_id, t.id]));
        }

        const enriched = rows.map((tx) => ({
            ...tx,
            student_display_id: studentByUserId.get(tx.user_id) || null,
            teacher_display_id: teacherByUserId.get(tx.user_id) || null,
        }));

        res.json(enriched);
    } catch (err) {
        console.error("Get transactions error:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.getRevenueOverview = async (req, res) => {
    try {
        const { institution_id } = req;
        if (!hasRequiredFinanceRole(req, FINANCE_ADMIN_ROLES)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const revenue = await calculateInstitutionRevenue(institution_id);
        return res.json(revenue);
    } catch (err) {
        console.error('Get revenue overview error:', err);
        return res.status(500).json({ error: err.message });
    }
};

exports.getRevenueDeductions = async (req, res) => {
    try {
        const { institution_id } = req;
        if (!hasRequiredFinanceRole(req, FINANCE_ADMIN_ROLES)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const search = String(req.query?.search || '').trim().toLowerCase();
        const limit = Math.min(Math.max(Number(req.query?.limit || 50), 1), 200);
        const offset = Math.max(Number(req.query?.offset || 0), 0);

        const query = supabase
            .from('financial_transactions')
            .select('id, amount, date, created_at, status, user_id, origin_type, origin_id, origin_label, target_type, target_id, target_label, recorded_by_user_id, recorded_by_label, meta')
            .eq('institution_id', institution_id)
            .eq('type', REVENUE_DEDUCTION_TYPE)
            .eq('direction', 'outflow')
            .order('created_at', { ascending: false });

        if (search) {
            query.or(`meta->>reason.ilike.%${search}%,target_label.ilike.%${search}%,recorded_by_label.ilike.%${search}%`);
        }

        const { data, error } = await query.range(offset, offset + limit - 1);

        if (error) throw error;

        const rows = (data || []).map((row) => {
            const reason = row?.meta?.reason || '';
            const target = row?.target_label || row?.meta?.target || '';
            const recordedBy = row?.recorded_by_label || row?.meta?.recorded_by_name || row?.meta?.recorded_by || row?.user_id || DEFAULT_RECORDED_BY_LABEL;
            return {
                id: row.id,
                amount: Number(row.amount || 0),
                date: row.date,
                created_at: row.created_at,
                status: row.status,
                reason,
                target,
                recorded_by: recordedBy,
                origin_type: row?.origin_type || null,
                origin_id: row?.origin_id || null,
                origin_label: row?.origin_label || null,
                target_type: row?.target_type || null,
                target_id: row?.target_id || null,
                target_label: row?.target_label || null,
                recorded_by_user_id: row?.recorded_by_user_id || null,
                recorded_by_label: row?.recorded_by_label || recordedBy,
                retention_until: row?.meta?.retention_until || null,
            };
        });

        return res.json(rows);
    } catch (err) {
        console.error('Get revenue deductions error:', err);
        return res.status(500).json({ error: err.message });
    }
};

exports.createRevenueDeduction = async (req, res) => {
    try {
        const { institution_id, userId } = req;
        if (!hasRequiredFinanceRole(req, FINANCE_ADMIN_ROLES)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const amount = Number(req.body?.amount || 0);
        const reason = String(req.body?.reason || '').trim();
        const target = String(req.body?.target || '').trim();

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ error: 'Amount must be greater than zero' });
        }
        if (!reason) {
            return res.status(400).json({ error: 'Reason is required' });
        }
        if (!target) {
            return res.status(400).json({ error: 'Target is required' });
        }

        const revenue = await calculateInstitutionRevenue(institution_id);
        if (amount > revenue.net_revenue) {
            return res.status(409).json({ error: 'Deduction amount cannot exceed available net revenue' });
        }

        const recorder = await getRecordedByIdentity(userId);

        const nowIso = new Date().toISOString();
        const retentionUntil = new Date(Date.now() + PAYMENT_MIN_RETENTION_MS).toISOString();
        const { data, error } = await supabase
            .from('financial_transactions')
            .insert([{
                institution_id,
                user_id: userId,
                type: REVENUE_DEDUCTION_TYPE,
                direction: 'outflow',
                amount,
                date: nowIso.slice(0, 10),
                method: 'usage_deduction',
                status: 'completed',
                origin_type: 'revenue_pool',
                origin_id: institution_id,
                origin_label: 'Revenue',
                target_type: 'custom',
                target_id: null,
                target_label: target,
                recorded_by_user_id: recorder.recorded_by_user_id,
                recorded_by_label: recorder.recorded_by_label,
                meta: {
                    reason,
                    target,
                    recorded_by: recorder.recorded_by_user_id,
                    recorded_by_name: recorder.recorded_by_label,
                    retention_until: retentionUntil,
                    immutable: true,
                },
            }])
            .select('id, amount, date, created_at, status, user_id, origin_type, origin_id, origin_label, target_type, target_id, target_label, recorded_by_user_id, recorded_by_label, meta')
            .single();

        if (error) throw error;

        return res.status(201).json({
            id: data.id,
            amount: Number(data.amount || 0),
            date: data.date,
            created_at: data.created_at,
            status: data.status,
            reason: data?.meta?.reason || reason,
            target: data?.target_label || data?.meta?.target || target,
            recorded_by: data?.recorded_by_label || data?.meta?.recorded_by_name || recorder.recorded_by_label,
            origin_type: data?.origin_type || 'revenue_pool',
            origin_id: data?.origin_id || institution_id,
            origin_label: data?.origin_label || 'Revenue',
            target_type: data?.target_type || 'custom',
            target_id: data?.target_id || null,
            target_label: data?.target_label || target,
            recorded_by_user_id: data?.recorded_by_user_id || recorder.recorded_by_user_id,
            recorded_by_label: data?.recorded_by_label || recorder.recorded_by_label,
            retention_until: data?.meta?.retention_until || retentionUntil,
        });
    } catch (err) {
        console.error('Create revenue deduction error:', err);
        return res.status(500).json({ error: err.message });
    }
};

exports.getPayments = async (req, res) => {
    try {
        const { institution_id } = req;
        if (!hasRequiredFinanceRole(req, FINANCE_ADMIN_ROLES)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { data, error } = await supabase
            .from('payments')
            .select('id, institution_id, student_id, amount, payment_method, status, reference_number, payment_date, admin_notes, fee_structure_snapshot, reviewed_at, confirmed_at, status_updated_at, retention_until, origin_type, origin_id, origin_label, target_type, target_id, target_label, recorded_by_user_id, recorded_by_label, created_at, updated_at, students(id, users(first_name, last_name, full_name))')
            .eq('institution_id', institution_id)
            .order('payment_date', { ascending: false });

        if (error) throw error;

        const mapped = (data || []).map((payment) => {
            const studentUser = payment?.students?.users;
            const studentName = studentUser?.first_name
                ? `${studentUser.first_name} ${studentUser.last_name || ''}`.trim()
                : (studentUser?.full_name || `Student ${payment?.students?.id || ''}`.trim());

            return {
                ...payment,
                student_name: studentName,
                student_display_id: payment?.students?.id || payment?.student_id,
            };
        });

        return res.json(mapped);
    } catch (err) {
        console.error('Get payments error:', err);
        return res.status(500).json({ error: err.message });
    }
};

const toIsoString = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return null;
    return date.toISOString();
};

const deriveFeeStructureLifecycle = (feeStructure = {}) => {
    const totalExpected = Number(feeStructure.total_expected_amount);
    const totalPaid = Number(feeStructure.total_paid_amount);
    const completedAt = toIsoString(feeStructure.completed_at || feeStructure.status_completed_at);
    const releasedAt = toIsoString(feeStructure.released_at);
    const statusUpdatedAt =
        toIsoString(feeStructure.status_updated_at) ||
        completedAt ||
        releasedAt ||
        toIsoString(feeStructure.updated_at) ||
        toIsoString(feeStructure.created_at);

    const isCompletedByAmount =
        Number.isFinite(totalExpected) &&
        Number.isFinite(totalPaid) &&
        totalExpected > 0 &&
        totalPaid >= totalExpected;

    const isCompleted = !!completedAt || isCompletedByAmount;
    if (isCompleted) {
        return {
            status: FEE_STRUCTURE_STATUS.COMPLETED,
            completed_at: completedAt || statusUpdatedAt,
            released_at: releasedAt,
            status_updated_at: statusUpdatedAt,
            is_completed: true,
        };
    }

    if (feeStructure.is_active) {
        return {
            status: FEE_STRUCTURE_STATUS.RELEASED,
            completed_at: null,
            released_at: releasedAt || statusUpdatedAt,
            status_updated_at: statusUpdatedAt,
            is_completed: false,
        };
    }

    return {
        status: FEE_STRUCTURE_STATUS.DRAFT,
        completed_at: null,
        released_at: releasedAt,
        status_updated_at: statusUpdatedAt,
        is_completed: false,
    };
};

const withFeeStructureLifecycle = (feeStructure = {}) => {
    const lifecycle = deriveFeeStructureLifecycle(feeStructure);
    return {
        ...feeStructure,
        lifecycle_status: lifecycle.status,
        is_completed: lifecycle.is_completed,
        completed_at: lifecycle.completed_at,
        released_at: lifecycle.released_at,
        status_updated_at: lifecycle.status_updated_at,
    };
};

const getScopedFeeStructure = async ({ institution_id, id }) => {
    const { data, error } = await supabase
        .from('fee_structures')
        .select('*')
        .eq('id', id)
        .eq('institution_id', institution_id)
        .single();

    if (error || !data) return null;
    return withFeeStructureLifecycle(data);
};

const assertFeeStructureMutable = async ({ institution_id, id, action }) => {
    const feeStructure = await getScopedFeeStructure({ institution_id, id });

    if (!feeStructure) {
        return {
            ok: false,
            status: 404,
            error: 'Fee structure not found',
        };
    }

    if (feeStructure.is_completed) {
        return {
            ok: false,
            status: 409,
            error: `Cannot ${action} a completed fee structure`,
            fee_structure: feeStructure,
        };
    }

    return { ok: true, fee_structure: feeStructure };
};

const buildFeeStructureSnapshot = (feeStructure = null) => {
    if (!feeStructure) return null;

    return {
        id: feeStructure.id,
        title: feeStructure.title || null,
        amount: Number(feeStructure.amount || 0),
        academic_year: feeStructure.academic_year || null,
        academic_year_id: feeStructure.academic_year_id || null,
        term: feeStructure.term || null,
        term_id: feeStructure.term_id || null,
        due_date: feeStructure.due_date || null,
        level_scope: feeStructure.level_scope || null,
        level_value: feeStructure.level_value ?? null,
        level_from: feeStructure.level_from ?? null,
        level_to: feeStructure.level_to ?? null,
        lifecycle_status: feeStructure.lifecycle_status || FEE_STRUCTURE_STATUS.DRAFT,
        released_at: feeStructure.released_at || null,
        completed_at: feeStructure.completed_at || null,
        captured_at: new Date().toISOString(),
    };
};

const resolveFeeStructureSnapshot = async ({ institution_id, fee_structure_id }) => {
    if (!fee_structure_id) return null;
    const feeStructure = await getScopedFeeStructure({ institution_id, id: fee_structure_id });
    return buildFeeStructureSnapshot(feeStructure);
};

const enforceMinimumPaymentRetention = (paymentDate) => {
    const paidAtMs = new Date(paymentDate || '').getTime();
    if (!Number.isFinite(paidAtMs)) {
        return {
            ok: false,
            status: 400,
            error: 'Cannot process deletion: invalid payment timestamp',
        };
    }

    const ageMs = Date.now() - paidAtMs;
    if (ageMs < PAYMENT_MIN_RETENTION_MS) {
        return {
            ok: false,
            status: 409,
            error: `Payments must be retained for at least ${PAYMENT_MIN_RETENTION_DAYS} days`,
        };
    }

    return { ok: true };
};

const toIsoDateString = (value) => {
    const date = new Date(value || '');
    if (!Number.isFinite(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
};

const getRecordedByIdentity = async (userId) => {
    if (!userId) {
        return {
            recorded_by_user_id: null,
            recorded_by_label: DEFAULT_RECORDED_BY_LABEL,
        };
    }

    const { data: userData } = await supabase
        .from('users')
        .select('first_name, last_name, full_name, email')
        .eq('id', userId)
        .maybeSingle();

    const recordedByLabel = userData?.first_name
        ? `${userData.first_name} ${userData.last_name || ''}`.trim()
        : (userData?.full_name || userData?.email || DEFAULT_RECORDED_BY_LABEL);

    return {
        recorded_by_user_id: userId,
        recorded_by_label: recordedByLabel,
    };
};

const buildLast7DaysSkeleton = () => {
    const days = [];
    for (let i = 6; i >= 0; i -= 1) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        days.push({
            date: iso,
            day: iso.split('-').slice(1).reverse().join('/'),
            gross: 0,
            deductions: 0,
            net: 0,
        });
    }
    return days;
};

const calculateInstitutionRevenue = async (institution_id) => {
    const [{ data: payments, error: paymentsError }, { data: deductions, error: deductionsError }] = await Promise.all([
        supabase
            .from('payments')
            .select('amount, payment_date, status')
            .eq('institution_id', institution_id)
            .eq('status', 'completed'),
        supabase
            .from('financial_transactions')
            .select('amount, date, created_at, type, direction, status')
            .eq('institution_id', institution_id)
            .eq('type', REVENUE_DEDUCTION_TYPE)
            .eq('direction', 'outflow')
            .eq('status', 'completed'),
    ]);

    if (paymentsError) throw paymentsError;
    if (deductionsError) throw deductionsError;

    const grossRevenue = (payments || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const totalDeductions = (deductions || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const netRevenue = grossRevenue - totalDeductions;

    const last7 = buildLast7DaysSkeleton();
    const byDate = new Map(last7.map((item) => [item.date, item]));

    (payments || []).forEach((row) => {
        const key = toIsoDateString(row.payment_date);
        if (!key || !byDate.has(key)) return;
        const bucket = byDate.get(key);
        bucket.gross += Number(row.amount || 0);
    });

    (deductions || []).forEach((row) => {
        const key = toIsoDateString(row.date || row.created_at);
        if (!key || !byDate.has(key)) return;
        const bucket = byDate.get(key);
        bucket.deductions += Number(row.amount || 0);
    });

    const last7Days = last7.map((row) => ({
        ...row,
        net: row.gross - row.deductions,
    }));

    return {
        gross_revenue: grossRevenue,
        total_deductions: totalDeductions,
        net_revenue: netRevenue,
        payment_count: (payments || []).length,
        deduction_count: (deductions || []).length,
        last_7_days: last7Days,
    };
};

const getInstitutionCurrency = async (institutionId) => {
    if (!institutionId) return getDefaultCurrencyMeta();

    const { data } = await supabase
        .from('institutions')
        .select('currency:currency_id(code, symbol, decimal_places)')
        .eq('id', institutionId)
        .maybeSingle();

    return data?.currency || getDefaultCurrencyMeta();
};

/**
 * Process Transaction
 */
exports.processTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const { userRole, institution_id } = req;

        if (!hasRequiredFinanceRole(req, FINANCE_ADMIN_ROLES)) return res.status(403).json({ error: "Unauthorized" });

        const { data: tx, error: fetchError } = await supabase
            .from("financial_transactions")
            .select("*")
            .eq("id", id)
            .eq("institution_id", institution_id)
            .single();

        if (fetchError || !tx) {
            return res.status(404).json({ error: "Transaction not found" });
        }

        const { data, error } = await supabase
            .from("financial_transactions")
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq("id", id)
            .eq("institution_id", institution_id)
            .select()
            .single();

        if (error) throw error;

        res.json(data);
    } catch (err) {
        console.error("Process transaction error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Record a generic transaction (Admin)
 */
exports.createTransaction = async (req, res) => {
    try {
        const { userRole, institution_id, userId } = req;
        if (!hasRequiredFinanceRole(req, FINANCE_ADMIN_ROLES)) return res.status(403).json({ error: "Unauthorized" });

        const { user_id, type, direction, amount, date, method, status, reference_id, meta, origin_type, origin_id, origin_label, target_type, target_id, target_label } = req.body;
        const recorder = await getRecordedByIdentity(userId);

        const { data, error } = await supabase
            .from("financial_transactions")
            .insert([{
                institution_id,
                user_id,
                type,
                direction,
                amount,
                date: date || new Date(),
                method,
                status: status || 'completed',
                reference_id,
                origin_type: origin_type || null,
                origin_id: origin_id || null,
                origin_label: origin_label || null,
                target_type: target_type || null,
                target_id: target_id || null,
                target_label: target_label || null,
                recorded_by_user_id: recorder.recorded_by_user_id,
                recorded_by_label: recorder.recorded_by_label,
                meta: {
                    ...(meta || {}),
                    recorded_by: recorder.recorded_by_user_id,
                    recorded_by_name: recorder.recorded_by_label,
                }
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error("Create transaction error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Record Fee Payment (Specific helper)
 */
exports.recordFeePayment = async (req, res) => {
    try {
        const { userRole, institution_id, userId } = req;
        if (!hasRequiredFinanceRole(req, FINANCE_ADMIN_ROLES)) return res.status(403).json({ error: "Unauthorized" });
        const { student_id, fee_structure_id, amount, payment_method, reference_number, notes } = req.body;
        // Verify student exists and get details including institution_id
        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('id, user_id, institution_id, fee_balance')
            .eq('id', student_id)
            .single();

        if (studentError) {
            console.error("Student lookup error:", studentError);
            return res.status(500).json({ error: "Internal server error" });
        }

        if (!student) return res.status(404).json({ error: "Student not found" });
        if (student.institution_id !== institution_id) return res.status(403).json({ error: "Access denied: Student belongs to another institution" });

        const recorder = await getRecordedByIdentity(userId);

        const feeStructureSnapshot = await resolveFeeStructureSnapshot({ institution_id, fee_structure_id });
        const nowIso = new Date().toISOString();
        const targetLabel = `Student ${student_id}`;
        const { data, error } = await supabase
            .from("payments")
            .insert([{
                institution_id,
                student_id,
                fee_structure_id: fee_structure_id || null,
                amount,
                payment_method,
                reference_number,
                payment_date: nowIso,
                status: 'completed',
                is_evidence_confirmed: true,
                admin_notes: notes,
                fee_structure_snapshot: feeStructureSnapshot,
                status_updated_at: nowIso,
                confirmed_at: nowIso,
                retention_until: new Date(Date.now() + PAYMENT_MIN_RETENTION_MS).toISOString(),
                origin_type: fee_structure_id ? 'fee_structure' : 'manual_payment',
                origin_id: fee_structure_id || null,
                origin_label: feeStructureSnapshot?.title || (fee_structure_id ? `Fee Structure ${fee_structure_id}` : 'Manual Payment'),
                target_type: 'student',
                target_id: student_id,
                target_label: targetLabel,
                recorded_by_user_id: recorder.recorded_by_user_id,
                recorded_by_label: recorder.recorded_by_label,
            }])
            .select(`
                *,
                students (
                    users (
                        first_name,
                        last_name,
                        full_name
                    )
                )
            `)
            .single();
        
        if (error) throw error;
        
        const userObj = data?.students?.users;
        const student_name = userObj?.first_name 
            ? `${userObj.first_name} ${userObj.last_name || ''}`.trim() 
            : (userObj?.full_name || "");
            
        const response = {
            ...data,
            student_name
        };
        res.status(201).json(response);
    } catch (err) {
        console.error("Record fee payment error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get Fee Structures
 */
exports.getFeeStructures = async (req, res) => {
    try {
        const { institution_id } = req;
        const { page, limit, from, to } = parsePagination(req.query, { defaultLimit: 25 });

        const { data, error, count } = await supabase
            .from("fee_structures")
            .select("*", { count: "exact" })
            .eq("institution_id", institution_id)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        const transformed = await Promise.all((data || []).map(async (row) => {
            const withLifecycle = withFeeStructureLifecycle(row);
            const isCurrentPeriod = await resolveFeeStructureCurrentPair({
                institution_id,
                term_id: row.term_id,
                academic_year_id: row.academic_year_id,
                termName: row.term,
                academicYearName: row.academic_year,
            });

            return {
                ...withLifecycle,
                is_current_period: isCurrentPeriod,
            };
        }));

        res.json(paginatedResponse(transformed, count, page, limit));
    } catch (err) {
        console.error("Get fee structures error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Update Fee Structure
 */
exports.updateFeeStructure = async (req, res) => {
    try {
        const { userRole, institution_id } = req;
        if (!hasRequiredFinanceRole(req, FINANCE_ADMIN_ROLES)) return res.status(403).json({ error: "Unauthorized" });

        const id = req.params.id || req.body.id;
        if (!id) return res.status(400).json({ error: 'Fee structure id is required' });

        const mutableCheck = await assertFeeStructureMutable({
            institution_id,
            id,
            action: 'update',
        });

        if (!mutableCheck.ok) {
            return res.status(mutableCheck.status).json({ error: mutableCheck.error });
        }

        const {
            title,
            amount,
            academic_year,
            term,
            due_date,
            academic_year_id,
            term_id,
            level_scope,
            level_value,
            level_from,
            level_to,
            scope_type,
            class_id,
            student_id,
            level_type,
            is_override,
            components,
        } = req.body;

        const normalizedDueDate = normalizeDateOrNull(due_date);
        if (!normalizedDueDate.ok) {
            return res.status(400).json({ error: normalizedDueDate.error });
        }

        const normalizedPeriod = await normalizeFeeStructurePeriod({
            institution_id,
            academic_year_id,
            academic_year,
            term_id,
            term,
        });
        if (!normalizedPeriod.ok) {
            return res.status(normalizedPeriod.status).json({ error: normalizedPeriod.error });
        }

        const updates = {
            title,
            amount: normalizeNumeric(amount, 0),
            academic_year: normalizedPeriod.academic_year,
            academic_year_id: normalizedPeriod.academic_year_id,
            term: normalizedPeriod.term,
            term_id: normalizedPeriod.term_id,
            due_date: normalizedDueDate.value,
            level_scope,
            level_value,
            level_from,
            level_to,
            scope_type: scope_type || (class_id ? 'class' : (student_id ? 'student' : (level_type ? 'level' : 'institution'))),
            class_id: class_id || null,
            student_id: student_id || null,
            level_type: level_type || null,
            is_override: is_override !== undefined ? !!is_override : false,
            status_updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from("fee_structures")
            .update(updates)
            .eq("id", id)
            .eq("institution_id", institution_id)
            .select()
            .single();

        if (error) throw error;
        res.json(withFeeStructureLifecycle(data));
    } catch (err) {
        console.error("Update fee structure error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Create Fee Structure
 */
exports.createFeeStructure = async (req, res) => {
    try {
        const { userRole, institution_id } = req;
        if (!hasRequiredFinanceRole(req, FINANCE_ADMIN_ROLES)) return res.status(403).json({ error: "Unauthorized" });

        const {
            title,
            amount,
            academic_year,
            term,
            due_date,
            academic_year_id,
            term_id,
            level_scope,
            level_value,
            level_from,
            level_to,
            scope_type,
            class_id,
            student_id,
            level_type,
            is_override,
            components,
        } = req.body;

        // If components are provided, total amount can be derived from components
        let effectiveAmount = amount;
        if (Array.isArray(components) && components.length > 0) {
            const compSum = components.reduce((sum, c) => sum + Number(c.amount || 0), 0);
            if (effectiveAmount === undefined || effectiveAmount === null || Number(effectiveAmount) === 0) {
                effectiveAmount = compSum;
            }
        }

        if (!title || effectiveAmount === undefined || effectiveAmount === null || Number.isNaN(Number(effectiveAmount))) {
            return res.status(400).json({ error: 'title and valid amount are required' });
        }

        const normalizedDueDate = normalizeDateOrNull(due_date);
        if (!normalizedDueDate.ok) {
            return res.status(400).json({ error: normalizedDueDate.error });
        }

        const normalizedPeriod = await normalizeFeeStructurePeriod({
            institution_id,
            academic_year_id,
            academic_year,
            term_id,
            term,
        });
        if (!normalizedPeriod.ok) {
            return res.status(normalizedPeriod.status).json({ error: normalizedPeriod.error });
        }

        const resolvedScope = scope_type || (class_id ? 'class' : (student_id ? 'student' : (level_type || (level_scope && level_scope !== 'all') ? 'level' : 'institution')));

        const { data, error } = await supabase
            .from("fee_structures")
            .insert([{
                institution_id,
                title,
                amount: normalizeNumeric(effectiveAmount, 0),
                academic_year: normalizedPeriod.academic_year,
                academic_year_id: normalizedPeriod.academic_year_id,
                term: normalizedPeriod.term,
                term_id: normalizedPeriod.term_id,
                due_date: normalizedDueDate.value,
                level_scope: level_scope || 'all',
                level_value,
                level_from,
                level_to,
                scope_type: resolvedScope,
                class_id: class_id || null,
                student_id: student_id || null,
                level_type: level_type || null,
                is_override: is_override !== undefined ? !!is_override : (resolvedScope === 'student' || resolvedScope === 'class'),
                is_active: false,
                status_updated_at: new Date().toISOString(),
            }])
            .select()
            .single();

        if (error) throw error;

        // If components were provided, insert them linked to this fee structure
        if (Array.isArray(components) && components.length > 0 && data?.id) {
            const compInserts = components.map(c => ({
                institution_id,
                fee_structure_id: data.id,
                name: String(c.name || '').trim() || 'Core Component',
                code: c.code ? String(c.code).trim().toUpperCase() : null,
                amount: Number(c.amount || 0),
                is_mandatory: c.is_mandatory !== false,
                category: c.category || 'core',
                frequency: c.frequency || 'term',
                description: c.description ? String(c.description).trim() : null,
                is_active: true,
            }));

            await supabase.from('fee_components').insert(compInserts);
        }

        res.status(201).json(withFeeStructureLifecycle(data));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.releaseFeeStructure = async (req, res) => {
    try {
        const { userRole, institution_id } = req;
        const { id } = req.params;
        const strictCurrentPair =
            req.query?.strict_current_pair === undefined
                ? true
                : (
                    req.query?.strict_current_pair === 'true' ||
                    req.query?.strict_current_pair === '1' ||
                    req.body?.strict_current_pair === true
                );
        if (!hasRequiredFinanceRole(req, FINANCE_ADMIN_ROLES)) return res.status(403).json({ error: 'Unauthorized' });
        if (!id) return res.status(400).json({ error: 'Fee structure id is required' });

        const canOverrideStrictRelease = hasRequiredFinanceRole(req, ['admin', 'school_admin', 'platform_admin', 'master_admin']);
        if (!strictCurrentPair && !canOverrideStrictRelease) {
            return res.status(403).json({ error: 'Only institution admins can override strict current pair release policy' });
        }

        const mutableCheck = await assertFeeStructureMutable({
            institution_id,
            id,
            action: 'release',
        });
        if (!mutableCheck.ok) {
            return res.status(mutableCheck.status).json({ error: mutableCheck.error });
        }

        const feeStructure = mutableCheck.fee_structure;

        if (strictCurrentPair) {

            if (!feeStructure.term || !feeStructure.academic_year) {
                return res.status(409).json({
                    error: 'Cannot strictly release fee structure without both term and academic year',
                });
            }

            const isCurrentPair = await resolveFeeStructureCurrentPair({
                institution_id,
                term_id: feeStructure.term_id,
                academic_year_id: feeStructure.academic_year_id,
                termName: feeStructure.term,
                academicYearName: feeStructure.academic_year,
            });

            if (!isCurrentPair) {
                return res.status(409).json({
                    error: 'Selected academic year and term are not current; strict release blocked',
                });
            }
        }

        const { data, error } = await supabase
            .from('fee_structures')
            .update({
                is_active: true,
                released_at: feeStructure.released_at || new Date().toISOString(),
                status_updated_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('institution_id', institution_id)
            .select()
            .single();

        if (error) throw error;
        res.json(withFeeStructureLifecycle(data));
    } catch (err) {
        console.error('Release fee structure error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.deleteFeeStructure = async (req, res) => {
    try {
        const { userRole, institution_id } = req;
        const { id } = req.params;
        if (!hasRequiredFinanceRole(req, FINANCE_ADMIN_ROLES)) return res.status(403).json({ error: 'Unauthorized' });
        if (!id) return res.status(400).json({ error: 'Fee structure id is required' });

        const mutableCheck = await assertFeeStructureMutable({
            institution_id,
            id,
            action: 'delete',
        });
        if (!mutableCheck.ok) {
            return res.status(mutableCheck.status).json({ error: mutableCheck.error });
        }

        const { data: linkedPayments, error: linkedPaymentsError } = await supabase
            .from('payments')
            .select('id')
            .eq('institution_id', institution_id)
            .eq('fee_structure_id', id)
            .limit(1);

        if (linkedPaymentsError) throw linkedPaymentsError;
        if ((linkedPayments || []).length > 0) {
            return res.status(409).json({
                error: 'Cannot delete fee structure with recorded payments. Keep for retention and audit history.',
            });
        }

        const { data, error } = await supabase
            .from('fee_structures')
            .update({
                is_active: false,
                status_updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('institution_id', institution_id)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, id, fee_structure: withFeeStructureLifecycle(data) });
    } catch (err) {
        console.error('Delete fee structure error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.revertReleaseFeeStructure = async (req, res) => {
    try {
        const { userRole, institution_id } = req;
        const { id } = req.params;
        if (!hasRequiredFinanceRole(req, FINANCE_ADMIN_ROLES)) return res.status(403).json({ error: 'Unauthorized' });
        if (!id) return res.status(400).json({ error: 'Fee structure id is required' });

        const mutableCheck = await assertFeeStructureMutable({
            institution_id,
            id,
            action: 'revert release for',
        });
        if (!mutableCheck.ok) {
            return res.status(mutableCheck.status).json({ error: mutableCheck.error });
        }

        const { data, error } = await supabase
            .from('fee_structures')
            .update({
                is_active: false,
                status_updated_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('institution_id', institution_id)
            .select()
            .single();

        if (error) throw error;
        res.json(withFeeStructureLifecycle(data));
    } catch (err) {
        console.error('Revert release fee structure error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Parent: Submit Payment Evidence
 */
exports.submitPaymentEvidence = async (req, res) => {
    try {
        const { institution_id, userId } = req;
        const { student_id, fee_structure_id, amount, payment_method, reference_number, proof_url, notes } = req.body;
        const recorder = await getRecordedByIdentity(userId);
        const feeStructureSnapshot = await resolveFeeStructureSnapshot({ institution_id, fee_structure_id });
        const nowIso = new Date().toISOString();

        const { data, error } = await supabase
            .from("payments")
            .insert([{
                institution_id,
                student_id,
                fee_structure_id,
                amount,
                payment_method,
                reference_number,
                proof_url,
                admin_notes: notes,
                status: 'pending',
                is_evidence_confirmed: false,
                fee_structure_snapshot: feeStructureSnapshot,
                status_updated_at: nowIso,
                retention_until: new Date(Date.now() + PAYMENT_MIN_RETENTION_MS).toISOString(),
                origin_type: fee_structure_id ? 'fee_structure' : 'manual_submission',
                origin_id: fee_structure_id || null,
                origin_label: feeStructureSnapshot?.title || (fee_structure_id ? `Fee Structure ${fee_structure_id}` : 'Manual Submission'),
                target_type: 'student',
                target_id: student_id,
                target_label: `Student ${student_id}`,
                recorded_by_user_id: recorder.recorded_by_user_id,
                recorded_by_label: recorder.recorded_by_label,
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error("Submit evidence error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Admin: Get Pending Payments
 */
exports.getPendingPayments = async (req, res) => {
    try {
        const { institution_id, userRole } = req;
        if (!hasRequiredFinanceRole(req, FINANCE_ADMIN_ROLES)) return res.status(403).json({ error: "Unauthorized" });

        const { data, error } = await supabase
            .from("payments")
            .select("*, students(user_id, users(full_name))")
            .eq("institution_id", institution_id)
            .eq("status", "pending")
            .order("created_at", { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error("Get pending payments error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Admin: Confirm/Reject Payment Evidence
 */
exports.confirmPaymentEvidence = async (req, res) => {
    try {
        const { userRole, institution_id, userId } = req;
        if (!hasRequiredFinanceRole(req, FINANCE_ADMIN_ROLES)) return res.status(403).json({ error: "Unauthorized" });

        const { payment_id, action, admin_notes } = req.body;
        const isApproved = action === 'approve';

        // Get payment first to check current status and prevent double approvals
        const { data: payment, error: fetchPaymentError } = await supabase
            .from("payments")
            .select("status, recorded_by_user_id, recorded_by_label")
            .eq("id", payment_id)
            .eq("institution_id", institution_id)
            .single();

        if (fetchPaymentError || !payment) {
            return res.status(404).json({ error: "Payment not found" });
        }

        if (payment.status === 'completed') {
            return res.status(400).json({ error: "Payment has already been approved" });
        }

        // Get admin ID
        const { data: admin } = await supabase.from('admins').select('id').eq('user_id', userId).single();
        const recorder = await getRecordedByIdentity(userId);

        const { data, error } = await supabase
            .from("payments")
            .update({
                status: isApproved ? 'completed' : 'failed',
                is_evidence_confirmed: isApproved,
                admin_notes,
                reviewed_by: admin?.id,
                reviewed_at: new Date().toISOString(),
                status_updated_at: new Date().toISOString(),
                confirmed_at: isApproved ? new Date().toISOString() : null,
                recorded_by_user_id: payment.recorded_by_user_id || recorder.recorded_by_user_id,
                recorded_by_label: payment.recorded_by_label || recorder.recorded_by_label,
            })
            .eq("id", payment_id)
            .eq("institution_id", institution_id)
            .select()
            .single();

        if (error) throw error;
        
        res.json(data);
    } catch (err) {
        console.error("Confirm evidence error:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.getPaymentReceipt = async (req, res) => {
    try {
        const { id } = req.params;
        const { institution_id } = req;

        if (!id) return res.status(400).json({ error: 'Payment id is required' });

        const { data: payment, error } = await supabase
            .from('payments')
            .select('id, institution_id, student_id, fee_structure_id, fee_structure_snapshot, amount, payment_method, status, reference_number, payment_date, admin_notes, proof_url, created_at, updated_at, reviewed_at, confirmed_at, status_updated_at, retention_until, origin_type, origin_id, origin_label, target_type, target_id, target_label, recorded_by_user_id, recorded_by_label, students(id, users(first_name, last_name, full_name)), institutions:institution_id(name)')
            .eq('id', id)
            .eq('institution_id', institution_id)
            .single();

        if (error || !payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        const authCheck = await resolveAuthorizedStudentAccess(req, payment.student_id || payment?.students?.id);
        if (!authCheck.authorized) {
            return res.status(403).json({ error: authCheck.reason || 'Unauthorized' });
        }

        const studentUser = payment?.students?.users;
        const studentName = studentUser?.first_name
            ? `${studentUser.first_name} ${studentUser.last_name || ''}`.trim()
            : (studentUser?.full_name || `Student ${payment?.students?.id || ''}`.trim());

        const currency = await getInstitutionCurrency(payment?.institution_id || institution_id);
        const snapshotText = payment?.fee_structure_snapshot
            ? JSON.stringify(payment.fee_structure_snapshot)
            : 'N/A';

        const html = buildReceiptHtml({
            receiptTitle: 'Institution Payment Receipt',
            currency,
            generatedAt: new Date().toISOString(),
            rows: [
                { label: 'Institution', value: payment?.institutions?.name || 'Unknown Institution' },
                { label: 'Student', value: studentName || 'N/A' },
                { label: 'Amount', value: roundCurrency(payment?.amount || 0), isAmount: true },
                { label: 'Method', value: payment?.payment_method || 'N/A' },
                { label: 'Status', value: payment?.status || 'N/A' },
                { label: 'Reference', value: payment?.reference_number || 'N/A' },
                { label: 'Payment Date', value: payment?.payment_date || 'N/A' },
                { label: 'Reviewed At', value: payment?.reviewed_at || 'N/A' },
                { label: 'Confirmed At', value: payment?.confirmed_at || 'N/A' },
                { label: 'Status Updated At', value: payment?.status_updated_at || 'N/A' },
                { label: 'Record Created At', value: payment?.created_at || 'N/A' },
                { label: 'Record Updated At', value: payment?.updated_at || 'N/A' },
                { label: 'Retention Until', value: payment?.retention_until || 'N/A' },
                { label: 'Origin', value: payment?.origin_label || payment?.origin_type || 'N/A' },
                { label: 'Target', value: payment?.target_label || payment?.target_id || 'N/A' },
                { label: 'Recorded By', value: payment?.recorded_by_label || payment?.recorded_by_user_id || 'N/A' },
            ],
            notes: [
                { label: 'Admin Notes', value: payment?.admin_notes || 'N/A' },
                { label: 'Evidence URL', value: payment?.proof_url || 'N/A' },
                { label: 'Fee Structure Snapshot', value: snapshotText },
            ],
        });

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(html);
    } catch (err) {
        console.error('Get payment receipt error:', err);
        return res.status(500).json({ error: err.message || 'Failed to generate payment receipt' });
    }
};

/**
 * Prepares reconciled vector payment receipt data with running balance calculations.
 */
const preparePaymentReceiptData = async (req, paymentId) => {
    const institutionId = req.institution_id || req.user?.institution_id;
    const { data: payment, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .eq('institution_id', institutionId)
        .single();

    if (error || !payment) {
        const err = new Error('Payment record not found');
        err.status = 404;
        throw err;
    }

    const authCheck = await resolveAuthorizedStudentAccess(req, payment.student_id);
    if (!authCheck.authorized) {
        const err = new Error(authCheck.reason || 'Access denied');
        err.status = 403;
        throw err;
    }

    const [studentRes, institutionRes, currency] = await Promise.all([
        supabase
            .from('students')
            .select('id, admission_number, grade_level, form_level, users:user_id(first_name, last_name, full_name), classes:class_id(display_name)')
            .eq('id', payment.student_id)
            .maybeSingle(),
        supabase
            .from('institutions')
            .select('name, logo_url, address, contact_email, phone')
            .eq('id', institutionId)
            .maybeSingle(),
        getInstitutionCurrency(institutionId)
    ]);

    const student = studentRes.data;
    const institution = institutionRes.data;

    // Confirmed payments to date to compute running ledger and total paid
    const { data: allPayments } = await supabase
        .from('payments')
        .select('id, amount, payment_date, created_at, status, reference_number, payment_method')
        .eq('institution_id', institutionId)
        .eq('student_id', payment.student_id)
        .order('payment_date', { ascending: true });

    const confirmedPayments = (allPayments || []).filter(p =>
        ['confirmed', 'completed', 'approved', 'paid', 'successful'].includes(String(p.status || '').toLowerCase())
    );

    const thisDate = new Date(payment.payment_date || payment.created_at || Date.now()).getTime();
    let paidUpToNow = 0;
    const ledger = [];
    for (const p of confirmedPayments) {
        const pDate = new Date(p.payment_date || p.created_at || Date.now()).getTime();
        if (pDate <= thisDate || p.id === payment.id) {
            paidUpToNow = roundCurrency(paidUpToNow + Number(p.amount || 0));
            ledger.push({
                date: (p.payment_date || p.created_at)?.slice(0, 10),
                reference: p.reference_number || 'N/A',
                method: p.payment_method || 'Payment',
                amount: roundCurrency(p.amount)
            });
        }
    }

    // Invoices for student to determine total billed obligation
    const { data: invoices } = await supabase
        .from('student_fee_invoices')
        .select('id, invoice_number, net_amount, gross_amount, paid_amount, balance_due')
        .eq('institution_id', institutionId)
        .eq('student_id', payment.student_id)
        .order('created_at', { ascending: false });

    let billedObligation = 0;
    let invoiceNumber = 'N/A';
    if (invoices && invoices.length > 0) {
        billedObligation = roundCurrency(invoices.reduce((acc, inv) => acc + Number(inv.net_amount || 0), 0));
        invoiceNumber = invoices[0].invoice_number || 'N/A';
    } else {
        billedObligation = roundCurrency(payment.amount || 0);
    }

    const balanceRemaining = calculateRunningBalance(billedObligation, paidUpToNow);

    const studentUser = student?.users;
    const studentName = studentUser?.first_name
        ? `${studentUser.first_name} ${studentUser.last_name || ''}`.trim()
        : (studentUser?.full_name || `Student ${student?.admission_number || student?.id || ''}`.trim());

    return {
        institution: {
            name: institution?.name || 'SuiteIvy Institution',
            logo_url: institution?.logo_url || null,
            address: institution?.address || 'P.O. Box Nairobi, Kenya',
            contact_email: institution?.contact_email || 'bursar@suiteivy.edu',
            phone: institution?.phone || '+254 700 000 000'
        },
        receipt: {
            receipt_number: `RCP-${(payment.payment_date || new Date().toISOString()).slice(0, 4)}-${(payment.reference_number || payment.id.slice(0, 8)).toUpperCase()}`,
            payment_date: payment.payment_date || payment.created_at?.slice(0, 10),
            payment_method: payment.payment_method || 'Electronic Transfer',
            reference_number: payment.reference_number || 'N/A',
            notes: payment.admin_notes || 'Fee payment received with thanks'
        },
        student: {
            full_name: studentName,
            admission_number: student?.admission_number || 'N/A',
            grade_level: student?.grade_level || student?.form_level || 'N/A',
            form_level: student?.form_level || null,
            class_name: student?.classes?.name || 'N/A'
        },
        currency: {
            symbol: currency?.symbol || 'KSh',
            code: currency?.code || 'KES',
            decimal_places: currency?.decimal_places ?? 2
        },
        payment: {
            amount: roundCurrency(payment.amount)
        },
        reconciliation: {
            billed_obligation: billedObligation,
            total_paid_to_date: paidUpToNow,
            balance_remaining: balanceRemaining,
            invoice_number: invoiceNumber
        },
        ledger
    };
};

/**
 * Compiles and downloads a genuine ReportLab vector Payment Receipt PDF.
 */
exports.compilePaymentReceiptPdf = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ error: 'Payment id is required' });

        const receiptData = await preparePaymentReceiptData(req, id);
        const pdfBuffer = await compilePdfBuffer({
            document_type: 'payment_receipt',
            data: receiptData
        });

        const filename = `Receipt-${receiptData.receipt.receipt_number || id}`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
        return res.status(200).send(pdfBuffer);
    } catch (err) {
        console.error('compilePaymentReceiptPdf error:', err);
        return res.status(err.status || 500).json({ error: err.message || 'Failed to compile payment receipt PDF' });
    }
};

/**
 * Compiles a base64 ReportLab vector Payment Receipt PDF for in-app preview modal.
 */
exports.compilePaymentReceiptBase64 = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ error: 'Payment id is required' });

        const receiptData = await preparePaymentReceiptData(req, id);
        const pdfBuffer = await compilePdfBuffer({
            document_type: 'payment_receipt',
            data: receiptData
        });

        const filename = `Receipt-${receiptData.receipt.receipt_number || id}.pdf`;
        return res.status(200).json({
            success: true,
            base64: pdfBuffer.toString('base64'),
            filename
        });
    } catch (err) {
        console.error('compilePaymentReceiptBase64 error:', err);
        return res.status(err.status || 500).json({ error: err.message || 'Failed to preview payment receipt PDF' });
    }
};

exports.getTransactionReceipt = async (req, res) => {
    try {
        const { id } = req.params;
        const { institution_id, userRole } = req;

        if (!id) return res.status(400).json({ error: 'Transaction id is required' });
        if (!hasRequiredFinanceRole(req, FINANCE_ADMIN_ROLES)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { data: tx, error } = await supabase
            .from('financial_transactions')
            .select('id, institution_id, amount, method, status, reference_id, date, meta, created_at, updated_at, origin_type, origin_id, origin_label, target_type, target_id, target_label, recorded_by_user_id, recorded_by_label, institutions:institution_id(name), users:user_id(first_name, last_name, full_name, email)')
            .eq('id', id)
            .eq('institution_id', institution_id)
            .single();

        if (error || !tx) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const payer = tx?.users?.first_name
            ? `${tx.users.first_name} ${tx.users.last_name || ''}`.trim()
            : (tx?.users?.full_name || tx?.users?.email || 'System');

        const currency = await getInstitutionCurrency(tx?.institution_id || institution_id);
        const html = buildReceiptHtml({
            receiptTitle: 'Institution Transaction Receipt',
            currency,
            generatedAt: new Date().toISOString(),
            rows: [
                { label: 'Institution', value: tx?.institutions?.name || 'Unknown Institution' },
                { label: 'Payer', value: payer },
                { label: 'Amount', value: tx?.amount || 0, isAmount: true },
                { label: 'Method', value: tx?.method || 'N/A' },
                { label: 'Status', value: tx?.status || 'N/A' },
                { label: 'Reference', value: tx?.reference_id || 'N/A' },
                { label: 'Date', value: tx?.date || 'N/A' },
                { label: 'Record Created At', value: tx?.created_at || 'N/A' },
                { label: 'Record Updated At', value: tx?.updated_at || 'N/A' },
                { label: 'Origin', value: tx?.origin_label || tx?.origin_type || 'N/A' },
                { label: 'Target', value: tx?.target_label || tx?.target_id || 'N/A' },
                { label: 'Recorded By', value: tx?.recorded_by_label || tx?.recorded_by_user_id || 'N/A' },
            ],
            notes: [
                { label: 'Notes', value: tx?.meta?.notes || 'N/A' },
            ],
        });

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(html);
    } catch (err) {
        console.error('Get transaction receipt error:', err);
        return res.status(500).json({ error: err.message || 'Failed to generate transaction receipt' });
    }
};

/**
 * List designated Finance Administrators and eligible candidates
 */
exports.getFinanceAdminsList = async (req, res) => {
    try {
        const institution_id = req.institution_id || req.user?.institution_id;
        if (!institution_id) {
            return res.status(400).json({ error: "Institution ID required" });
        }

        const { data: designations, error: desErr } = await supabase
            .from('finance_admin_designations')
            .select('id, user_id, assigned_by, assigned_at, is_active, notes')
            .eq('institution_id', institution_id)
            .eq('is_active', true);

        if (desErr) throw desErr;

        const userIds = (designations || []).map(d => d.user_id);
        let usersMap = {};
        if (userIds.length > 0) {
            const { data: users } = await supabase
                .from('users')
                .select('id, first_name, last_name, full_name, email, role, avatar_url')
                .in('id', userIds);
            (users || []).forEach(u => { usersMap[u.id] = u; });
        }

        const results = (designations || []).map(d => ({
            ...d,
            user: usersMap[d.user_id] || { id: d.user_id, full_name: 'Unknown User' },
        }));

        return res.status(200).json({ data: results });
    } catch (err) {
        console.error('getFinanceAdminsList error:', err);
        return res.status(500).json({ error: err.message || 'Failed to list finance administrators' });
    }
};

/**
 * Grant or revoke Finance Administrator designation
 */
exports.toggleFinanceAdminDesignation = async (req, res) => {
    try {
        const institution_id = req.institution_id || req.user?.institution_id;
        const adminUserId = req.userId || req.user?.id;
        const { userId, designate, reason } = req.body || {};

        if (!userId) {
            return res.status(400).json({ error: "userId is required" });
        }

        // Verify target user belongs to institution and has teacher or admin role
        const { data: targetUser, error: uErr } = await supabase
            .from('users')
            .select('id, role, full_name, institution_id')
            .eq('id', userId)
            .maybeSingle();

        if (uErr || !targetUser) {
            return res.status(404).json({ error: "User not found" });
        }

        if (institution_id && targetUser.institution_id && targetUser.institution_id !== institution_id) {
            return res.status(403).json({ error: "User does not belong to this institution" });
        }

        let designationRecord = null;
        if (designate) {
            const { data: existing } = await supabase
                .from('finance_admin_designations')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            if (existing) {
                const { data: updated } = await supabase
                    .from('finance_admin_designations')
                    .update({ is_active: true, notes: reason || null })
                    .eq('id', existing.id);
                designationRecord = updated || existing;
            } else {
                const { data: inserted } = await supabase
                    .from('finance_admin_designations')
                    .insert({
                        institution_id: institution_id || targetUser.institution_id,
                        user_id: userId,
                        assigned_by: adminUserId,
                        assigned_at: new Date().toISOString(),
                        is_active: true,
                        notes: reason || null,
                    });
                designationRecord = inserted;
            }
        } else {
            await supabase
                .from('finance_admin_designations')
                .delete()
                .eq('user_id', userId);
        }

        // Audit log
        await supabase
            .from('finance_admin_audit_logs')
            .insert({
                institution_id: institution_id || targetUser.institution_id,
                actor_id: adminUserId,
                target_user_id: userId,
                action: designate ? 'assigned' : 'revoked',
                reason: reason || null,
                meta: { designate, target_role: targetUser.role },
                created_at: new Date().toISOString(),
            });

        try {
            const { clearUserCache } = require("../middleware/auth.middleware.js");
            clearUserCache(userId);
        } catch (cErr) {
            // cache clear fallback
        }

        return res.status(200).json({
            success: true,
            message: designate ? "Finance Administrator role designated successfully" : "Finance Administrator role revoked successfully",
            is_designated: !!designate,
            designation: designationRecord,
        });
    } catch (err) {
        console.error('toggleFinanceAdminDesignation error:', err);
        return res.status(500).json({ error: err.message || 'Failed to toggle finance administrator designation' });
    }
};

/**
 * Get audit logs for finance administrator role assignments
 */
exports.getFinanceAdminAuditLogs = async (req, res) => {
    try {
        const institution_id = req.institution_id || req.user?.institution_id;
        if (!institution_id) {
            return res.status(400).json({ error: "Institution ID required" });
        }

        const { data: logs, error } = await supabase
            .from('finance_admin_audit_logs')
            .select('*')
            .eq('institution_id', institution_id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return res.status(200).json({ data: logs || [] });
    } catch (err) {
        console.error('getFinanceAdminAuditLogs error:', err);
        return res.status(500).json({ error: err.message || 'Failed to get audit logs' });
    }
};

/**
 * Get Individual Financial Record (Student ledger or Staff payout history)
 */
exports.getIndividualFinancialRecord = async (req, res) => {
    try {
        const institution_id = req.institution_id || req.user?.institution_id;
        const { personType, personId } = req.params;

        if (!personType || !personId) {
            return res.status(400).json({ error: "personType and personId are required" });
        }

        const normalizedType = String(personType).toLowerCase();
        const currency = await getInstitutionCurrency(institution_id);

        if (normalizedType === 'student') {
            const { data: student, error: stuErr } = await supabase
                .from('students')
                .select('id, user_id, admission_number, enrollment_status, grade_level, class_id, users(id, first_name, last_name, full_name, email, is_active)')
                .or(`id.eq.${personId},user_id.eq.${personId}`)
                .eq('institution_id', institution_id)
                .maybeSingle();

            if (stuErr || !student) {
                return res.status(404).json({ error: "Student record not found in this institution" });
            }

            const studentId = student.id;

            const { data: payments, error: payErr } = await supabase
                .from('payments')
                .select('*')
                .eq('institution_id', institution_id)
                .eq('student_id', studentId)
                .order('payment_date', { ascending: false });

            if (payErr) throw payErr;

            const { data: fees } = await supabase
                .from('fee_structures')
                .select('*')
                .eq('institution_id', institution_id)
                .order('created_at', { ascending: false });

            const feeStructures = fees || [];

            let discounts = [];
            try {
                const { data: waiverData } = await supabase
                    .from('fee_discounts_waivers')
                    .select('*, fee_components(id, name, amount)')
                    .eq('institution_id', institution_id)
                    .eq('student_id', studentId)
                    .eq('status', 'active');
                discounts = waiverData || [];
            } catch (wErr) {
                discounts = [];
            }

            const activeTerm = await resolveActiveTerm(institution_id);

            const assessment = await computeStudentFinancialAssessment({
                institution_id,
                student,
                activeTerm,
                feeStructures,
                payments: payments || [],
                discounts
            });

            return res.status(200).json({
                personType: 'student',
                person: student,
                currency,
                metrics: {
                    totalAssessed: assessment.netAssessed,
                    grossAssessed: assessment.grossAmount,
                    totalDiscount: assessment.totalDiscount,
                    totalPaid: assessment.totalPaid,
                    netBalance: assessment.netBalance,
                    matchedTier: assessment.matchedTier,
                    status: assessment.status,
                },
                feeStructures: assessment.feeStructure ? [assessment.feeStructure] : feeStructures,
                applicableFeeStructure: assessment.feeStructure,
                components: assessment.components || [],
                discounts: assessment.appliedDiscounts || [],
                payments: payments || [],
            });
        } else if (['staff', 'teacher', 'employee'].includes(normalizedType)) {
            const { data: teacher, error: teachErr } = await supabase
                .from('teachers')
                .select('id, user_id, employment_status, employee_id, users(id, first_name, last_name, full_name, email, role, is_active)')
                .or(`id.eq.${personId},user_id.eq.${personId}`)
                .eq('institution_id', institution_id)
                .maybeSingle();

            const userTargetId = teacher?.user_id || personId;

            let payouts = [];
            try {
                const { data: payoutRows } = await supabase
                    .from('teacher_payouts')
                    .select('*')
                    .or(`teacher_id.eq.${personId},user_id.eq.${userTargetId}`)
                    .order('created_at', { ascending: false });
                payouts = payoutRows || [];
            } catch (pErr) {
                payouts = [];
            }

            let transactions = [];
            try {
                const { data: txRows } = await supabase
                    .from('financial_transactions')
                    .select('*')
                    .eq('institution_id', institution_id)
                    .or(`target_id.eq.${userTargetId},origin_id.eq.${userTargetId},user_id.eq.${userTargetId}`)
                    .order('date', { ascending: false });
                transactions = txRows || [];
            } catch (tErr) {
                transactions = [];
            }

            const totalPaidOut = payouts
                .filter(p => p.status === 'completed' || p.status === 'paid')
                .reduce((sum, p) => sum + Number(p.amount || 0), 0);

            return res.status(200).json({
                personType: 'staff',
                person: teacher || { id: personId, user_id: userTargetId },
                currency,
                metrics: {
                    totalPaidOut,
                    payoutCount: payouts.length,
                    transactionCount: transactions.length,
                },
                payouts,
                transactions,
            });
        } else {
            return res.status(400).json({ error: `Unsupported personType: ${personType}` });
        }
    } catch (err) {
        console.error('getIndividualFinancialRecord error:', err);
        return res.status(500).json({ error: err.message || 'Failed to get financial record' });
    }
};

/**
 * Adjust individual balance with mandatory reason and forensic logging
 */
exports.adjustIndividualBalance = async (req, res) => {
    try {
        const institution_id = req.institution_id || req.user?.institution_id;
        const actor_id = req.userId || req.user?.id;
        const { personType, personId, amount, adjustmentType, reason, term_id, academic_year_id } = req.body || {};

        if (!personId || amount === undefined || amount === null) {
            return res.status(400).json({ error: "personId and amount are required" });
        }

        if (!reason || !String(reason).trim()) {
            return res.status(400).json({ error: "A descriptive reason is required for balance adjustments" });
        }

        const numericAmount = Number(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({ error: "Adjustment amount must be a positive number" });
        }

        const refId = `ADJ-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        const { data: newPayment, error: payErr } = await supabase
            .from('payments')
            .insert({
                institution_id,
                student_id: personId,
                amount: adjustmentType === 'debit' ? -numericAmount : numericAmount,
                payment_method: 'adjustment',
                reference_id: refId,
                payment_date: new Date().toISOString().split('T')[0],
                status: 'completed',
                term_id: term_id || null,
                academic_year_id: academic_year_id || null,
                meta: {
                    is_adjustment: true,
                    adjustment_type: adjustmentType || 'credit',
                    reason: reason.trim(),
                    adjusted_by: actor_id,
                },
            })
            .select()
            .maybeSingle();

        if (payErr) {
            console.warn("Payment table insert warning on adjustIndividualBalance:", payErr.message);
        }

        await logRecordChange({
            institution_id,
            table_name: 'payments',
            record_id: newPayment?.id || refId,
            changed_by: actor_id,
            change_type: 'BALANCE_ADJUSTMENT',
            action: 'balance_adjustment',
            actor_id,
            new_values: {
                personType,
                personId,
                adjustmentType,
                amount: numericAmount,
                referenceId: refId,
            },
            reason: reason.trim(),
        });

        try {
            await supabase.from('finance_admin_audit_logs').insert({
                institution_id,
                actor_id,
                target_user_id: personId,
                action: 'balance_adjustment',
                reason: reason.trim(),
                meta: { personType, adjustmentType, amount: numericAmount, referenceId: refId },
                created_at: new Date().toISOString(),
            });
        } catch (aErr) {
            // non-fatal
        }

        return res.status(200).json({
            success: true,
            message: "Individual balance adjustment recorded successfully",
            payment: newPayment || { reference_id: refId, amount: numericAmount },
        });
    } catch (err) {
        console.error('adjustIndividualBalance error:', err);
        return res.status(500).json({ error: err.message || 'Failed to adjust balance' });
    }
};

/**
 * Fee Components Management
 */
exports.getFeeComponents = async (req, res) => {
    try {
        const institution_id = req.institution_id || req.user?.institution_id;
        const { feeStructureId } = req.params;

        if (!feeStructureId) {
            return res.status(400).json({ error: "feeStructureId is required" });
        }

        const { data, error } = await supabase
            .from('fee_components')
            .select('*')
            .eq('institution_id', institution_id)
            .eq('fee_structure_id', feeStructureId)
            .eq('is_active', true)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return res.json(data || []);
    } catch (err) {
        console.error('getFeeComponents error:', err);
        return res.status(500).json({ error: err.message });
    }
};

exports.createFeeComponent = async (req, res) => {
    try {
        const institution_id = req.institution_id || req.user?.institution_id;
        const userId = req.userId || req.user?.id;
        if (!hasRequiredFinanceRole(req, FINANCE_ADMIN_ROLES)) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const { fee_structure_id, name, code, amount, is_mandatory, category, frequency, description } = req.body;

        if (!fee_structure_id || !name || amount === undefined || Number.isNaN(Number(amount))) {
            return res.status(400).json({ error: "fee_structure_id, name, and valid amount are required" });
        }

        const numericAmount = Number(amount);
        if (numericAmount < 0) {
            return res.status(400).json({ error: "Component amount cannot be negative" });
        }

        const { data, error } = await supabase
            .from('fee_components')
            .insert([{
                institution_id,
                fee_structure_id,
                name: name.trim(),
                code: code ? code.trim().toUpperCase() : null,
                amount: numericAmount,
                is_mandatory: is_mandatory !== false,
                category: category || 'core',
                frequency: frequency || 'term',
                description: description ? description.trim() : null,
                is_active: true,
            }])
            .select()
            .single();

        if (error) throw error;

        // Recalculate the parent fee structure total
        try {
            const { data: allComps } = await supabase
                .from('fee_components')
                .select('amount, is_mandatory')
                .eq('fee_structure_id', fee_structure_id)
                .eq('institution_id', institution_id)
                .eq('is_active', true);

            if (Array.isArray(allComps) && allComps.length > 0) {
                const newTotal = allComps.filter(c => c.is_mandatory !== false).reduce((sum, c) => sum + Number(c.amount || 0), 0);
                await supabase
                    .from('fee_structures')
                    .update({ amount: newTotal, status_updated_at: new Date().toISOString() })
                    .eq('id', fee_structure_id)
                    .eq('institution_id', institution_id);
            }
        } catch (cErr) {
            // non-fatal
        }

        await logRecordChange({
            institution_id,
            table_name: 'fee_components',
            record_id: data.id,
            changed_by: userId,
            change_type: 'CREATE',
            new_values: data,
            reason: 'Fee component added'
        });

        return res.status(201).json(data);
    } catch (err) {
        console.error('createFeeComponent error:', err);
        return res.status(500).json({ error: err.message });
    }
};

exports.updateFeeComponent = async (req, res) => {
    try {
        const institution_id = req.institution_id || req.user?.institution_id;
        if (!hasRequiredFinanceRole(req, FINANCE_ADMIN_ROLES)) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const { id } = req.params;
        if (!id) return res.status(400).json({ error: "Component id is required" });

        const { name, code, amount, is_mandatory, category, frequency, description, is_active } = req.body;

        const updates = { updated_at: new Date().toISOString() };
        if (name !== undefined) updates.name = name.trim();
        if (code !== undefined) updates.code = code ? code.trim().toUpperCase() : null;
        if (amount !== undefined) updates.amount = Number(amount);
        if (is_mandatory !== undefined) updates.is_mandatory = !!is_mandatory;
        if (category !== undefined) updates.category = category;
        if (frequency !== undefined) updates.frequency = frequency;
        if (description !== undefined) updates.description = description ? description.trim() : null;
        if (is_active !== undefined) updates.is_active = !!is_active;

        const { data, error } = await supabase
            .from('fee_components')
            .update(updates)
            .eq('id', id)
            .eq('institution_id', institution_id)
            .select()
            .single();

        if (error) throw error;

        if (data?.fee_structure_id) {
            try {
                const { data: allComps } = await supabase
                    .from('fee_components')
                    .select('amount, is_mandatory')
                    .eq('fee_structure_id', data.fee_structure_id)
                    .eq('institution_id', institution_id)
                    .eq('is_active', true);

                if (Array.isArray(allComps)) {
                    const newTotal = allComps.filter(c => c.is_mandatory !== false).reduce((sum, c) => sum + Number(c.amount || 0), 0);
                    await supabase
                        .from('fee_structures')
                        .update({ amount: newTotal, status_updated_at: new Date().toISOString() })
                        .eq('id', data.fee_structure_id)
                        .eq('institution_id', institution_id);
                }
            } catch (cErr) {
                // non-fatal
            }
        }

        return res.json(data);
    } catch (err) {
        console.error('updateFeeComponent error:', err);
        return res.status(500).json({ error: err.message });
    }
};

exports.deleteFeeComponent = async (req, res) => {
    try {
        const institution_id = req.institution_id || req.user?.institution_id;
        if (!hasRequiredFinanceRole(req, FINANCE_ADMIN_ROLES)) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const { id } = req.params;
        if (!id) return res.status(400).json({ error: "Component id is required" });

        const { data: existing } = await supabase
            .from('fee_components')
            .select('fee_structure_id')
            .eq('id', id)
            .eq('institution_id', institution_id)
            .maybeSingle();

        const { error } = await supabase
            .from('fee_components')
            .delete()
            .eq('id', id)
            .eq('institution_id', institution_id);

        if (error) throw error;

        if (existing?.fee_structure_id) {
            try {
                const { data: allComps } = await supabase
                    .from('fee_components')
                    .select('amount, is_mandatory')
                    .eq('fee_structure_id', existing.fee_structure_id)
                    .eq('institution_id', institution_id)
                    .eq('is_active', true);

                const newTotal = (allComps || []).filter(c => c.is_mandatory !== false).reduce((sum, c) => sum + Number(c.amount || 0), 0);
                await supabase
                    .from('fee_structures')
                    .update({ amount: newTotal, status_updated_at: new Date().toISOString() })
                    .eq('id', existing.fee_structure_id)
                    .eq('institution_id', institution_id);
            } catch (cErr) {
                // non-fatal
            }
        }

        return res.json({ success: true, message: "Fee component deleted successfully" });
    } catch (err) {
        console.error('deleteFeeComponent error:', err);
        return res.status(500).json({ error: err.message });
    }
};

/**
 * Fee Discounts, Scholarships, and Waivers
 */
exports.getStudentDiscountsAndWaivers = async (req, res) => {
    try {
        const institution_id = req.institution_id || req.user?.institution_id;
        const { studentId } = req.params;

        if (!studentId) return res.status(400).json({ error: "studentId is required" });

        const { data, error } = await supabase
            .from('fee_discounts_waivers')
            .select('*, fee_components(id, name, amount)')
            .eq('institution_id', institution_id)
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return res.json(data || []);
    } catch (err) {
        console.error('getStudentDiscountsAndWaivers error:', err);
        return res.status(500).json({ error: err.message });
    }
};

exports.createFeeDiscountOrWaiver = async (req, res) => {
    try {
        const institution_id = req.institution_id || req.user?.institution_id;
        const userId = req.userId || req.user?.id;
        if (!hasRequiredFinanceRole(req, FINANCE_ADMIN_ROLES)) {
            return res.status(403).json({ error: "Unauthorized: Finance Admin permission required" });
        }

        const {
            student_id,
            academic_year_id,
            term_id,
            fee_component_id,
            type,
            discount_type,
            value,
            reason
        } = req.body;

        if (!student_id || value === undefined || !reason) {
            return res.status(400).json({ error: "student_id, value, and reason are required" });
        }

        const numericValue = Number(value);
        if (numericValue <= 0) {
            return res.status(400).json({ error: "Discount value must be greater than zero" });
        }

        if (discount_type === 'percentage' && numericValue > 100) {
            return res.status(400).json({ error: "Percentage discount cannot exceed 100%" });
        }

        const { data, error } = await supabase
            .from('fee_discounts_waivers')
            .insert([{
                institution_id,
                student_id,
                academic_year_id: academic_year_id || null,
                term_id: term_id || null,
                fee_component_id: fee_component_id || null,
                type: type || 'discount',
                discount_type: discount_type || 'fixed',
                value: numericValue,
                reason: reason.trim(),
                approved_by: userId,
                status: 'active'
            }])
            .select()
            .single();

        if (error) throw error;

        await logRecordChange({
            institution_id,
            table_name: 'fee_discounts_waivers',
            record_id: data.id,
            changed_by: userId,
            change_type: 'CREATE',
            new_values: data,
            reason: `Fee discount/waiver granted: ${reason.trim()}`
        });

        return res.status(201).json(data);
    } catch (err) {
        console.error('createFeeDiscountOrWaiver error:', err);
        return res.status(500).json({ error: err.message });
    }
};

exports.revokeFeeDiscountOrWaiver = async (req, res) => {
    try {
        const institution_id = req.institution_id || req.user?.institution_id;
        const userId = req.userId || req.user?.id;
        if (!hasRequiredFinanceRole(req, FINANCE_ADMIN_ROLES)) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const { id } = req.params;
        if (!id) return res.status(400).json({ error: "Discount id is required" });

        const { data, error } = await supabase
            .from('fee_discounts_waivers')
            .update({ status: 'revoked', updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('institution_id', institution_id)
            .select()
            .single();

        if (error) throw error;

        await logRecordChange({
            institution_id,
            table_name: 'fee_discounts_waivers',
            record_id: id,
            changed_by: userId,
            change_type: 'UPDATE',
            new_values: { status: 'revoked' },
            reason: 'Fee discount/waiver revoked'
        });

        return res.json({ success: true, message: "Discount/waiver revoked successfully", data });
    } catch (err) {
        console.error('revokeFeeDiscountOrWaiver error:', err);
        return res.status(500).json({ error: err.message });
    }
};

/**
 * Billing Statements & Invoices
 */
exports.generateStudentInvoice = async (req, res) => {
    try {
        const institution_id = req.institution_id || req.user?.institution_id;
        if (!hasRequiredFinanceRole(req, FINANCE_ADMIN_ROLES)) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const { student_id, academic_year_id, term_id, due_date, notes } = req.body;
        if (!student_id) return res.status(400).json({ error: "student_id is required" });

        const { data: student, error: stuErr } = await supabase
            .from('students')
            .select('id, user_id, admission_number, grade_level, form_level, class_id')
            .eq('id', student_id)
            .eq('institution_id', institution_id)
            .single();

        if (stuErr || !student) return res.status(404).json({ error: "Student not found" });

        const activeTerm = await resolveActiveTerm(institution_id);
        const targetTermId = term_id || activeTerm?.id;
        const targetYearId = academic_year_id || activeTerm?.academic_year_id;

        const { data: fees } = await supabase
            .from('fee_structures')
            .select('*')
            .eq('institution_id', institution_id)
            .order('created_at', { ascending: false });

        const { data: payments } = await supabase
            .from('payments')
            .select('*')
            .eq('institution_id', institution_id)
            .eq('student_id', student_id);

        let discounts = [];
        try {
            const { data: waiverData } = await supabase
                .from('fee_discounts_waivers')
                .select('*')
                .eq('institution_id', institution_id)
                .eq('student_id', student_id)
                .eq('status', 'active');
            discounts = waiverData || [];
        } catch (wErr) {
            discounts = [];
        }

        const assessment = await computeStudentFinancialAssessment({
            institution_id,
            student,
            activeTerm,
            feeStructures: fees || [],
            payments: payments || [],
            discounts
        });

        const invoiceNumber = `INV-${new Date().getFullYear()}-${student.admission_number || student.id.slice(0, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;

        const invoicePayload = {
            institution_id,
            student_id,
            academic_year_id: targetYearId || null,
            term_id: targetTermId || null,
            fee_structure_id: assessment.feeStructure?.id || null,
            invoice_number: invoiceNumber,
            issue_date: new Date().toISOString().slice(0, 10),
            due_date: due_date || assessment.feeStructure?.due_date || null,
            gross_amount: roundCurrency(assessment.grossAmount),
            discount_amount: roundCurrency(assessment.totalDiscount),
            net_amount: roundCurrency(assessment.netAssessed),
            paid_amount: roundCurrency(assessment.totalPaid),
            balance_due: roundCurrency(assessment.netBalance),
            status: roundCurrency(assessment.netBalance) <= 0 ? (roundCurrency(assessment.grossAmount) > 0 ? 'paid' : 'cleared') : (roundCurrency(assessment.totalPaid) > 0 ? 'partial' : 'unpaid'),
            itemized_breakdown: assessment.components,
            notes: notes || `Statement generated for ${assessment.feeStructure?.title || 'Academic Term'}`
        };

        const { data: invoice, error: invErr } = await supabase
            .from('student_fee_invoices')
            .insert([invoicePayload])
            .select()
            .single();

        if (invErr) throw invErr;

        return res.status(201).json(invoice);
    } catch (err) {
        console.error('generateStudentInvoice error:', err);
        return res.status(500).json({ error: err.message });
    }
};

exports.getStudentInvoices = async (req, res) => {
    try {
        const institution_id = req.institution_id || req.user?.institution_id;
        const { studentId } = req.params;

        if (!studentId) return res.status(400).json({ error: "studentId is required" });

        const authCheck = await resolveAuthorizedStudentAccess(req, studentId);
        if (!authCheck.authorized) {
            return res.status(403).json({ error: authCheck.reason || 'Access denied' });
        }

        const { data, error } = await supabase
            .from('student_fee_invoices')
            .select('*, fee_structures(id, title, due_date)')
            .eq('institution_id', institution_id)
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const formatted = (data || []).map(inv => ({
            ...inv,
            gross_amount: roundCurrency(inv.gross_amount),
            discount_amount: roundCurrency(inv.discount_amount),
            net_amount: roundCurrency(inv.net_amount),
            paid_amount: roundCurrency(inv.paid_amount),
            balance_due: roundCurrency(inv.balance_due),
        }));

        return res.json(formatted);
    } catch (err) {
        console.error('getStudentInvoices error:', err);
        return res.status(500).json({ error: err.message });
    }
};

/**
 * Prepares reconciled vector fee invoice data.
 */
const prepareInvoiceData = async (req, invoiceId) => {
    const institutionId = req.institution_id || req.user?.institution_id;
    const { data: invoice, error: invErr } = await supabase
        .from('student_fee_invoices')
        .select('*, fee_structures(id, title, due_date)')
        .eq('id', invoiceId)
        .eq('institution_id', institutionId)
        .single();

    if (invErr || !invoice) {
        const err = new Error('Fee invoice record not found');
        err.status = 404;
        throw err;
    }

    const authCheck = await resolveAuthorizedStudentAccess(req, invoice.student_id);
    if (!authCheck.authorized) {
        const err = new Error(authCheck.reason || 'Access denied');
        err.status = 403;
        throw err;
    }

    const [studentRes, institutionRes, currency] = await Promise.all([
        supabase
            .from('students')
            .select('id, admission_number, grade_level, form_level, users:user_id(first_name, last_name, full_name), classes:class_id(display_name)')
            .eq('id', invoice.student_id)
            .maybeSingle(),
        supabase
            .from('institutions')
            .select('name, logo_url, address, contact_email, phone, settings')
            .eq('id', institutionId)
            .maybeSingle(),
        getInstitutionCurrency(institutionId)
    ]);

    const student = studentRes.data;
    const institution = institutionRes.data;

    const studentUser = student?.users;
    const studentName = studentUser?.first_name
        ? `${studentUser.first_name} ${studentUser.last_name || ''}`.trim()
        : (studentUser?.full_name || `Student ${student?.admission_number || student?.id || ''}`.trim());

    let breakdown = [];
    if (Array.isArray(invoice.itemized_breakdown) && invoice.itemized_breakdown.length > 0) {
        breakdown = invoice.itemized_breakdown.map(item => ({
            fee_component_name: item.fee_component_name || item.name || item.title || 'Tuition & Academic Fees',
            original_amount: roundCurrency(item.original_amount ?? item.amount ?? item.gross_amount ?? 0),
            discount_amount: roundCurrency(item.discount_amount ?? item.discount ?? 0),
            net_amount: roundCurrency(item.net_amount ?? item.amount ?? 0),
            due_date: item.due_date || invoice.due_date || null
        }));
    } else {
        breakdown = [
            {
                fee_component_name: invoice.fee_structures?.title || 'Tuition Fee Assessment',
                original_amount: roundCurrency(invoice.gross_amount),
                discount_amount: roundCurrency(invoice.discount_amount),
                net_amount: roundCurrency(invoice.net_amount),
                due_date: invoice.due_date || null
            }
        ];
    }

    const instSettings = institution?.settings || {};
    const bankDetails = instSettings?.payment_details || instSettings?.banking || {};

    return {
        institution: {
            name: institution?.name || 'SuiteIvy Institution',
            logo_url: institution?.logo_url || null,
            address: institution?.address || 'P.O. Box Nairobi, Kenya',
            contact_email: institution?.contact_email || 'bursar@suiteivy.edu',
            phone: institution?.phone || '+254 700 000 000'
        },
        invoice: {
            invoice_number: invoice.invoice_number || `INV-${invoice.id.slice(0, 8).toUpperCase()}`,
            issue_date: invoice.issue_date || invoice.created_at?.slice(0, 10),
            due_date: invoice.due_date || invoice.fee_structures?.due_date || null,
            status: invoice.status || 'issued',
            notes: invoice.notes || 'Please remit payment by the indicated due date.'
        },
        student: {
            full_name: studentName,
            admission_number: student?.admission_number || 'N/A',
            grade_level: student?.grade_level || student?.form_level || 'N/A',
            form_level: student?.form_level || null,
            class_name: student?.classes?.name || 'N/A'
        },
        currency: {
            symbol: currency?.symbol || 'KSh',
            code: currency?.code || 'KES',
            decimal_places: currency?.decimal_places ?? 2
        },
        breakdown,
        summary: {
            gross_amount: roundCurrency(invoice.gross_amount),
            discount_amount: roundCurrency(invoice.discount_amount),
            net_amount: roundCurrency(invoice.net_amount),
            paid_amount: roundCurrency(invoice.paid_amount),
            balance_due: roundCurrency(invoice.balance_due)
        },
        payment_instructions: {
            bank_name: bankDetails?.bank_name || 'Standard Chartered Bank',
            account_number: bankDetails?.account_number || '010203040506',
            account_name: bankDetails?.account_name || institution?.name || 'SuiteIvy Academy',
            paybill_number: bankDetails?.paybill_number || '247247'
        }
    };
};

/**
 * Compiles and downloads a genuine ReportLab vector Fee Invoice PDF.
 */
exports.compileInvoicePdf = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ error: 'Invoice id is required' });

        const invoiceData = await prepareInvoiceData(req, id);
        const pdfBuffer = await compilePdfBuffer({
            document_type: 'fee_invoice',
            data: invoiceData
        });

        const filename = `Invoice-${invoiceData.invoice.invoice_number || id}`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
        return res.status(200).send(pdfBuffer);
    } catch (err) {
        console.error('compileInvoicePdf error:', err);
        return res.status(err.status || 500).json({ error: err.message || 'Failed to compile fee invoice PDF' });
    }
};

/**
 * Compiles a base64 ReportLab vector Fee Invoice PDF for in-app preview modal.
 */
exports.compileInvoicePdfBase64 = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ error: 'Invoice id is required' });

        const invoiceData = await prepareInvoiceData(req, id);
        const pdfBuffer = await compilePdfBuffer({
            document_type: 'fee_invoice',
            data: invoiceData
        });

        const filename = `Invoice-${invoiceData.invoice.invoice_number || id}.pdf`;
        return res.status(200).json({
            success: true,
            base64: pdfBuffer.toString('base64'),
            filename
        });
    } catch (err) {
        console.error('compileInvoicePdfBase64 error:', err);
        return res.status(err.status || 500).json({ error: err.message || 'Failed to preview fee invoice PDF' });
    }
};

/**
 * Automated Overdue Reminders
 */
exports.sendOverdueFeeReminders = async (req, res) => {
    try {
        const institution_id = req.institution_id || req.user?.institution_id;
        if (!hasRequiredFinanceRole(req, FINANCE_ADMIN_ROLES)) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const result = await runFeeDeadlineReminderSweepWithRetry({ institutionId: institution_id });
        return res.json({
            success: true,
            message: "Fee reminder notifications dispatched successfully",
            details: result
        });
    } catch (err) {
        console.error('sendOverdueFeeReminders error:', err);
        return res.status(500).json({ error: err.message });
    }
};

/**
 * =========================================================================
 * RECONSTRUCTED FINANCE CONTROLLER METHODS (Section 1-15 Architecture)
 * =========================================================================
 */

const getSignedProofUrl = async (storagePath) => {
    if (!storagePath) return null;
    if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
        return storagePath;
    }
    const cleanPath = storagePath.replace(/^payment_proofs\//, '');
    const { data } = await supabase.storage
        .from('payment_proofs')
        .createSignedUrl(cleanPath, 3600);
    return data?.signedUrl || storagePath;
};

const getParentLinkedStudents = async (userId, institutionId) => {
    const { data: parent } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', userId)
        .eq('institution_id', institutionId)
        .maybeSingle();

    if (!parent?.id) return [];

    const { data: links } = await supabase
        .from('parent_students')
        .select('student_id, students(id, class_id, admission_number, grade_level, users(first_name, last_name, full_name))')
        .eq('parent_id', parent.id)
        .eq('institution_id', institutionId);

    return (links || []).map(l => ({
        id: l.student_id,
        class_id: l.students?.class_id,
        admission_number: l.students?.admission_number,
        grade_level: l.students?.grade_level,
        users: l.students?.users,
    }));
};

// 1. Fee Categories
exports.getFeeCategories = async (req, res) => {
    try {
        const { institution_id } = req;
        const { data, error } = await supabase
            .from('fee_categories')
            .select('*')
            .eq('institution_id', institution_id)
            .eq('is_active', true)
            .order('display_order', { ascending: true })
            .order('name', { ascending: true });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error('getFeeCategories error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.createFeeCategory = async (req, res) => {
    try {
        const { institution_id } = req;
        const { name, description, display_order } = req.body;
        if (!name?.trim()) return res.status(400).json({ error: 'Category name is required' });

        const { data, error } = await supabase
            .from('fee_categories')
            .insert([{
                institution_id,
                name: name.trim(),
                description: description?.trim() || null,
                display_order: Number(display_order) || 0
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error('createFeeCategory error:', err);
        res.status(500).json({ error: err.message });
    }
};

// 2. Fee Types & Applicability
exports.getFeeTypes = async (req, res) => {
    try {
        const { institution_id } = req;
        const { category_id, status = 'active', term_id } = req.query;

        let query = supabase
            .from('fee_types')
            .select('*, fee_categories(id, name), fee_type_applicability(*)')
            .eq('institution_id', institution_id);

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }
        if (category_id) {
            query = query.eq('category_id', category_id);
        }
        if (term_id) {
            query = query.eq('term_id', term_id);
        }

        query = query.order('display_order', { ascending: true }).order('created_at', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error('getFeeTypes error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.createFeeType = async (req, res) => {
    try {
        const { institution_id, userId } = req;
        const {
            name,
            description,
            category_id,
            amount,
            billing_frequency = 'term',
            academic_year_id,
            term_id,
            due_date,
            is_mandatory = true,
            partial_payment_allowed = true,
            min_installment_amount = 0,
            display_order = 0,
            parent_notes,
            applicability = [] // Array of { scope_type: 'school'|'level'|'class'|'student', scope_id, amount_override }
        } = req.body;

        if (!name?.trim()) return res.status(400).json({ error: 'Fee name is required' });
        const numAmount = Number(amount);
        if (!Number.isFinite(numAmount) || numAmount < 0) {
            return res.status(400).json({ error: 'Valid fee amount is required' });
        }

        // 1. Insert fee type
        const { data: feeType, error: feeError } = await supabase
            .from('fee_types')
            .insert([{
                institution_id,
                category_id: category_id || null,
                name: name.trim(),
                description: description?.trim() || null,
                amount: numAmount,
                billing_frequency,
                academic_year_id: academic_year_id || null,
                term_id: term_id || null,
                due_date: due_date || null,
                is_mandatory: !!is_mandatory,
                partial_payment_allowed: !!partial_payment_allowed,
                min_installment_amount: Number(min_installment_amount) || 0,
                display_order: Number(display_order) || 0,
                status: 'active',
                parent_notes: parent_notes?.trim() || null
            }])
            .select()
            .single();

        if (feeError) throw feeError;

        // 2. Insert applicability rules
        const rules = (applicability.length > 0 ? applicability : [{ scope_type: 'school' }]).map(rule => ({
            institution_id,
            fee_type_id: feeType.id,
            scope_type: rule.scope_type || 'school',
            scope_id: rule.scope_id || null,
            amount_override: rule.amount_override !== undefined && rule.amount_override !== null ? Number(rule.amount_override) : null
        }));

        const { error: appError } = await supabase
            .from('fee_type_applicability')
            .insert(rules);

        if (appError) console.error('Applicability insert warning:', appError);

        res.status(201).json(feeType);
    } catch (err) {
        console.error('createFeeType error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.updateFeeType = async (req, res) => {
    try {
        const { id } = req.params;
        const { institution_id } = req;
        const {
            name,
            description,
            category_id,
            amount,
            billing_frequency,
            due_date,
            is_mandatory,
            partial_payment_allowed,
            min_installment_amount,
            status,
            parent_notes,
            applicability
        } = req.body;

        const updatePayload = {
            updated_at: new Date().toISOString()
        };
        if (name !== undefined) updatePayload.name = name.trim();
        if (description !== undefined) updatePayload.description = description?.trim() || null;
        if (category_id !== undefined) updatePayload.category_id = category_id || null;
        if (amount !== undefined) updatePayload.amount = Number(amount);
        if (billing_frequency !== undefined) updatePayload.billing_frequency = billing_frequency;
        if (due_date !== undefined) updatePayload.due_date = due_date || null;
        if (is_mandatory !== undefined) updatePayload.is_mandatory = !!is_mandatory;
        if (partial_payment_allowed !== undefined) updatePayload.partial_payment_allowed = !!partial_payment_allowed;
        if (min_installment_amount !== undefined) updatePayload.min_installment_amount = Number(min_installment_amount);
        if (status !== undefined) updatePayload.status = status;
        if (parent_notes !== undefined) updatePayload.parent_notes = parent_notes?.trim() || null;

        const { data: updated, error } = await supabase
            .from('fee_types')
            .update(updatePayload)
            .eq('id', id)
            .eq('institution_id', institution_id)
            .select()
            .single();

        if (error) throw error;

        if (Array.isArray(applicability)) {
            await supabase.from('fee_type_applicability').delete().eq('fee_type_id', id);
            const newRules = applicability.map(rule => ({
                institution_id,
                fee_type_id: id,
                scope_type: rule.scope_type || 'school',
                scope_id: rule.scope_id || null,
                amount_override: rule.amount_override ? Number(rule.amount_override) : null
            }));
            await supabase.from('fee_type_applicability').insert(newRules);
        }

        res.json(updated);
    } catch (err) {
        console.error('updateFeeType error:', err);
        res.status(500).json({ error: err.message });
    }
};

// 3. Payments Inbox (Admin Verification Workflow)
exports.getPaymentsInbox = async (req, res) => {
    try {
        const { institution_id } = req;
        const { tab = 'needs_review', search, method, page = 1, limit = 20 } = req.query;

        let query = supabase
            .from('payments')
            .select(`
                *,
                submitted_user:submitted_by(id, full_name, email, phone),
                student:student_id(id, admission_number, grade_level, users(first_name, last_name, full_name)),
                payment_allocations(*, fee_types(id, name)),
                payment_proofs(*),
                payment_flags(*, flag_reasons(reason_code, label))
            `, { count: 'exact' })
            .eq('institution_id', institution_id);

        if (tab === 'needs_review') {
            query = query.in('status', ['submitted', 'under_review', 'pending']);
        } else if (tab === 'confirmed') {
            query = query.in('status', ['confirmed', 'completed']);
        } else if (tab === 'flagged') {
            query = query.in('status', ['flagged', 'failed']);
        }

        if (method && method !== 'all') {
            query = query.eq('payment_method', method);
        }

        query = query.order('created_at', { ascending: false });

        const from = (Number(page) - 1) * Number(limit);
        const to = from + Number(limit) - 1;
        query = query.range(from, to);

        const { data, count, error } = await query;
        if (error) throw error;

        // Sign proof URLs for private bucket
        const enriched = await Promise.all((data || []).map(async (p) => {
            let signedProof = null;
            if (p.proof_url) {
                signedProof = await getSignedProofUrl(p.proof_url);
            }
            const proofs = await Promise.all((p.payment_proofs || []).map(async (pr) => ({
                ...pr,
                signed_url: await getSignedProofUrl(pr.storage_path)
            })));

            return {
                ...p,
                signed_proof_url: signedProof,
                signed_proofs: proofs,
                waiting_ms: Date.now() - new Date(p.created_at).getTime()
            };
        }));

        res.json({
            data: enriched,
            total: count || 0,
            page: Number(page),
            limit: Number(limit)
        });
    } catch (err) {
        console.error('getPaymentsInbox error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Confirm payment (Single row or detail modal with amount/allocation adjustments)
exports.confirmPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { institution_id, userId } = req;
        const { confirmed_amount, admin_notes, allocation_adjustments } = req.body;

        const { data: payment, error: pErr } = await supabase
            .from('payments')
            .select('*, payment_allocations(*)')
            .eq('id', id)
            .eq('institution_id', institution_id)
            .single();

        if (pErr || !payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        if (payment.status === 'confirmed' || payment.status === 'completed') {
            return res.status(400).json({ error: 'Payment is already confirmed' });
        }

        const finalAmount = confirmed_amount !== undefined ? Number(confirmed_amount) : Number(payment.total_amount || payment.amount || 0);

        // 1. Issue official sequential receipt
        const receipt = await ReceiptService.issueOfficialReceipt({
            institutionId: institution_id,
            paymentId: payment.id,
            studentId: payment.student_id,
            amount: finalAmount,
            issuedBy: userId,
            allocations: payment.payment_allocations || []
        });

        // 2. Update payment status to confirmed
        const { data: updatedPayment, error: uErr } = await supabase
            .from('payments')
            .update({
                status: 'confirmed',
                confirmed_amount: finalAmount,
                confirmed_at: new Date().toISOString(),
                reviewed_by: userId,
                reviewed_at: new Date().toISOString(),
                admin_notes: admin_notes || payment.admin_notes || null,
                is_evidence_confirmed: true,
                status_updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (uErr) throw uErr;

        // 3. Record in ledger for each allocation
        const allocations = payment.payment_allocations || [];
        if (allocations.length > 0) {
            for (const alloc of allocations) {
                await LedgerService.recordPaymentAllocation({
                    institutionId: institution_id,
                    studentId: alloc.student_id,
                    paymentId: payment.id,
                    allocationId: alloc.id,
                    receiptId: receipt.id,
                    amount: alloc.amount,
                    referenceNumber: payment.reference_number,
                    description: `Payment confirmed (${payment.payment_method || 'Official'}) - Ref: ${payment.reference_number || receipt.receipt_number}`,
                    recordedBy: userId
                });
            }
        } else if (payment.student_id) {
            await LedgerService.recordPaymentAllocation({
                institutionId: institution_id,
                studentId: payment.student_id,
                paymentId: payment.id,
                allocationId: null,
                receiptId: receipt.id,
                amount: finalAmount,
                referenceNumber: payment.reference_number,
                description: `Payment confirmed (${payment.payment_method || 'Official'}) - Ref: ${payment.reference_number || receipt.receipt_number}`,
                recordedBy: userId
            });
        }

        res.json({
            success: true,
            payment: updatedPayment,
            receipt
        });
    } catch (err) {
        console.error('confirmPayment error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Flag payment
exports.flagPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { institution_id, userId } = req;
        const { reason_code, reason_id, admin_notes } = req.body;

        if (!reason_code && !reason_id) {
            return res.status(400).json({ error: 'A valid flag reason is required' });
        }

        const { data: payment, error: pErr } = await supabase
            .from('payments')
            .select('id, status')
            .eq('id', id)
            .eq('institution_id', institution_id)
            .single();

        if (pErr || !payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        // 1. Insert flag log
        await supabase
            .from('payment_flags')
            .insert([{
                institution_id,
                payment_id: id,
                reason_id: reason_id || null,
                reason_code: reason_code || null,
                admin_notes: admin_notes?.trim() || null,
                flagged_by: userId,
                flagged_at: new Date().toISOString()
            }]);

        // 2. Update payment status to flagged
        const { data: updated, error: uErr } = await supabase
            .from('payments')
            .update({
                status: 'flagged',
                flag_reason_id: reason_id || null,
                admin_notes: admin_notes?.trim() || null,
                reviewed_by: userId,
                reviewed_at: new Date().toISOString(),
                status_updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (uErr) throw uErr;

        res.json({
            success: true,
            payment: updated
        });
    } catch (err) {
        console.error('flagPayment error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Bulk confirm payments
exports.bulkConfirmPayments = async (req, res) => {
    try {
        const { institution_id, userId } = req;
        const { payment_ids } = req.body;

        if (!Array.isArray(payment_ids) || payment_ids.length === 0) {
            return res.status(400).json({ error: 'Array of payment_ids is required' });
        }

        const confirmedResults = [];
        for (const paymentId of payment_ids) {
            try {
                const { data: payment } = await supabase
                    .from('payments')
                    .select('*, payment_allocations(*)')
                    .eq('id', paymentId)
                    .eq('institution_id', institution_id)
                    .single();

                if (!payment || payment.status === 'confirmed' || payment.status === 'completed') {
                    continue;
                }

                const finalAmount = Number(payment.total_amount || payment.amount || 0);
                const receipt = await ReceiptService.issueOfficialReceipt({
                    institutionId: institution_id,
                    paymentId: payment.id,
                    studentId: payment.student_id,
                    amount: finalAmount,
                    issuedBy: userId,
                    allocations: payment.payment_allocations || []
                });

                await supabase
                    .from('payments')
                    .update({
                        status: 'confirmed',
                        confirmed_amount: finalAmount,
                        confirmed_at: new Date().toISOString(),
                        reviewed_by: userId,
                        reviewed_at: new Date().toISOString(),
                        is_evidence_confirmed: true,
                        status_updated_at: new Date().toISOString()
                    })
                    .eq('id', paymentId);

                const allocations = payment.payment_allocations || [];
                if (allocations.length > 0) {
                    for (const alloc of allocations) {
                        await LedgerService.recordPaymentAllocation({
                            institutionId: institution_id,
                            studentId: alloc.student_id,
                            paymentId: payment.id,
                            allocationId: alloc.id,
                            receiptId: receipt.id,
                            amount: alloc.amount,
                            referenceNumber: payment.reference_number,
                            description: `Bulk confirmed payment - Ref: ${payment.reference_number || receipt.receipt_number}`,
                            recordedBy: userId
                        });
                    }
                }

                confirmedResults.push({ paymentId, receipt_number: receipt.receipt_number });
            } catch (pErr) {
                console.error(`Bulk confirm error on payment ${paymentId}:`, pErr);
            }
        }

        res.json({
            success: true,
            confirmed_count: confirmedResults.length,
            details: confirmedResults
        });
    } catch (err) {
        console.error('bulkConfirmPayments error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Reverse payment
exports.reversePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { institution_id, userId } = req;
        const { reason } = req.body;

        if (!reason?.trim()) {
            return res.status(400).json({ error: 'A cancellation/reversal reason is required' });
        }

        const { data: payment, error: pErr } = await supabase
            .from('payments')
            .select('*, receipts(*)')
            .eq('id', id)
            .eq('institution_id', institution_id)
            .single();

        if (pErr || !payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        const receipt = (payment.receipts || [])[0];
        const reverseAmount = Number(payment.confirmed_amount || payment.total_amount || payment.amount || 0);

        // 1. Void receipt if exists
        if (receipt?.id) {
            await supabase
                .from('receipts')
                .update({
                    status: 'voided',
                    voided_at: new Date().toISOString(),
                    voided_by: userId,
                    void_reason: reason.trim()
                })
                .eq('id', receipt.id);
        }

        // 2. Record reversal in ledger
        await LedgerService.recordReversal({
            institutionId: institution_id,
            studentId: payment.student_id,
            paymentId: payment.id,
            receiptId: receipt?.id || null,
            amount: reverseAmount,
            reason: reason.trim(),
            authorizedBy: userId
        });

        // 3. Log into reversals table
        await supabase
            .from('reversals')
            .insert([{
                institution_id,
                payment_id: payment.id,
                receipt_id: receipt?.id || null,
                amount: reverseAmount,
                reason: reason.trim(),
                authorized_by: userId
            }]);

        // 4. Update payment status to reversed
        const { data: updated, error: uErr } = await supabase
            .from('payments')
            .update({
                status: 'reversed',
                admin_notes: `REVERSED: ${reason.trim()}`,
                status_updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (uErr) throw uErr;

        res.json({
            success: true,
            payment: updated
        });
    } catch (err) {
        console.error('reversePayment error:', err);
        res.status(500).json({ error: err.message });
    }
};

// 4. Finance Settings & Config
exports.getFinanceSettings = async (req, res) => {
    try {
        const { institution_id } = req;
        const { data: settings } = await supabase
            .from('finance_settings')
            .select('*')
            .eq('institution_id', institution_id)
            .maybeSingle();

        const { data: methods } = await supabase
            .from('payment_methods')
            .select('*')
            .eq('institution_id', institution_id)
            .order('display_order', { ascending: true });

        const { data: flagReasons } = await supabase
            .from('flag_reasons')
            .select('*')
            .eq('institution_id', institution_id)
            .order('display_order', { ascending: true });

        res.json({
            settings: settings || { currency_code: 'KES', receipt_prefix: 'REC-', receipt_padding: 5 },
            payment_methods: methods || [],
            flag_reasons: flagReasons || []
        });
    } catch (err) {
        console.error('getFinanceSettings error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.updateFinanceSettings = async (req, res) => {
    try {
        const { institution_id } = req;
        const {
            currency_code,
            receipt_prefix,
            receipt_padding,
            receipt_footer_text,
            allow_overpayment_credit,
            allow_partial_payments,
            grace_period_days,
            late_penalty_percent,
            max_upload_size_mb
        } = req.body;

        const updatePayload = {
            updated_at: new Date().toISOString()
        };
        if (currency_code !== undefined) updatePayload.currency_code = currency_code;
        if (receipt_prefix !== undefined) updatePayload.receipt_prefix = receipt_prefix;
        if (receipt_padding !== undefined) updatePayload.receipt_padding = Number(receipt_padding);
        if (receipt_footer_text !== undefined) updatePayload.receipt_footer_text = receipt_footer_text;
        if (allow_overpayment_credit !== undefined) updatePayload.allow_overpayment_credit = !!allow_overpayment_credit;
        if (allow_partial_payments !== undefined) updatePayload.allow_partial_payments = !!allow_partial_payments;
        if (grace_period_days !== undefined) updatePayload.grace_period_days = Number(grace_period_days);
        if (late_penalty_percent !== undefined) updatePayload.late_penalty_percent = Number(late_penalty_percent);
        if (max_upload_size_mb !== undefined) updatePayload.max_upload_size_mb = Number(max_upload_size_mb);

        const { data, error } = await supabase
            .from('finance_settings')
            .upsert({ institution_id, ...updatePayload })
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('updateFinanceSettings error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.createPaymentMethod = async (req, res) => {
    try {
        const { institution_id } = req;
        const { name, code, description, requires_reference, requires_proof, instructions, is_active, display_order } = req.body;
        if (!name || !code) {
            return res.status(400).json({ error: 'Name and code are required' });
        }
        const { data, error } = await supabase
            .from('payment_methods')
            .insert({
                institution_id,
                name,
                code: code.toLowerCase().trim().replace(/\s+/g, '_'),
                description: description || null,
                requires_reference: requires_reference !== false,
                requires_proof: !!requires_proof,
                instructions: instructions || null,
                is_active: is_active !== false,
                display_order: Number(display_order || 0)
            })
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error('createPaymentMethod error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.updatePaymentMethod = async (req, res) => {
    try {
        const { institution_id } = req;
        const { id } = req.params;
        const { name, description, requires_reference, requires_proof, instructions, is_active, display_order } = req.body;
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (requires_reference !== undefined) updates.requires_reference = !!requires_reference;
        if (requires_proof !== undefined) updates.requires_proof = !!requires_proof;
        if (instructions !== undefined) updates.instructions = instructions;
        if (is_active !== undefined) updates.is_active = !!is_active;
        if (display_order !== undefined) updates.display_order = Number(display_order);

        const { data, error } = await supabase
            .from('payment_methods')
            .update(updates)
            .eq('id', id)
            .eq('institution_id', institution_id)
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('updatePaymentMethod error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.createFlagReason = async (req, res) => {
    try {
        const { institution_id } = req;
        const { code, label, description, requires_note, is_active, display_order } = req.body;
        if (!label || !code) {
            return res.status(400).json({ error: 'Label and code are required' });
        }
        const { data, error } = await supabase
            .from('flag_reasons')
            .insert({
                institution_id,
                code: code.toLowerCase().trim().replace(/\s+/g, '_'),
                label,
                description: description || null,
                requires_note: !!requires_note,
                is_active: is_active !== false,
                display_order: Number(display_order || 0)
            })
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error('createFlagReason error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.updateFlagReason = async (req, res) => {
    try {
        const { institution_id } = req;
        const { id } = req.params;
        const { label, description, requires_note, is_active, display_order } = req.body;
        const updates = {};
        if (label !== undefined) updates.label = label;
        if (description !== undefined) updates.description = description;
        if (requires_note !== undefined) updates.requires_note = !!requires_note;
        if (is_active !== undefined) updates.is_active = !!is_active;
        if (display_order !== undefined) updates.display_order = Number(display_order);

        const { data, error } = await supabase
            .from('flag_reasons')
            .update(updates)
            .eq('id', id)
            .eq('institution_id', institution_id)
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('updateFlagReason error:', err);
        res.status(500).json({ error: err.message });
    }
};

// 5. Parent Experience & Payment Recording
exports.getParentFinanceOverview = async (req, res) => {
    try {
        const { institution_id, userId } = req;
        const linkedStudents = await getParentLinkedStudents(userId, institution_id);

        if (!linkedStudents.length) {
            return res.json({
                total_balance: 0,
                total_billed: 0,
                total_paid: 0,
                total_pending: 0,
                total_credit: 0,
                children: []
            });
        }

        const studentIds = linkedStudents.map(s => s.id);
        const familySummary = await LedgerService.getFamilySummary(studentIds, institution_id);

        const childrenWithSummary = linkedStudents.map(student => {
            const summary = familySummary.children.find(c => c.student_id === student.id) || {};
            return {
                student_id: student.id,
                student_name: student.users?.full_name || `${student.users?.first_name || ''} ${student.users?.last_name || ''}`.trim() || 'Student',
                admission_number: student.admission_number,
                grade_level: student.grade_level,
                ...summary
            };
        });

        res.json({
            total_balance: familySummary.total_balance,
            total_billed: familySummary.total_billed,
            total_paid: familySummary.total_paid,
            total_pending: familySummary.total_pending,
            total_credit: familySummary.total_credit,
            children: childrenWithSummary
        });
    } catch (err) {
        console.error('getParentFinanceOverview error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getChildPayableItems = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { institution_id, userId } = req;

        // Verify student belongs to parent
        const linkedStudents = await getParentLinkedStudents(userId, institution_id);
        const isLinked = linkedStudents.some(s => s.id === studentId);
        if (!isLinked && !hasRequiredFinanceRole(req, FINANCE_ADMIN_ROLES)) {
            return res.status(403).json({ error: 'You are not authorized to view this student' });
        }

        // Fetch active fee types for institution
        const { data: feeTypes, error: ftErr } = await supabase
            .from('fee_types')
            .select('*, fee_categories(id, name), fee_type_applicability(*)')
            .eq('institution_id', institution_id)
            .eq('status', 'active');

        if (ftErr) throw ftErr;

        // Fetch existing ledger entries for student to calculate outstanding amount per fee item
        const { data: ledgerEntries } = await supabase
            .from('ledger_entries')
            .select('fee_type_id, entry_type, amount')
            .eq('student_id', studentId)
            .eq('institution_id', institution_id);

        const paidByFeeType = new Map();
        (ledgerEntries || []).forEach(e => {
            if (e.fee_type_id && (e.entry_type === 'payment' || Number(e.amount) < 0)) {
                const current = paidByFeeType.get(e.fee_type_id) || 0;
                paidByFeeType.set(e.fee_type_id, current + Math.abs(Number(e.amount)));
            }
        });

        const student = linkedStudents.find(s => s.id === studentId);
        const classId = student?.class_id;

        const payableItems = (feeTypes || []).filter(ft => {
            const rules = ft.fee_type_applicability || [];
            if (!rules.length) return true; // Whole school default
            return rules.some(r => {
                if (r.scope_type === 'school') return true;
                if (r.scope_type === 'class' && r.scope_id === classId) return true;
                if (r.scope_type === 'student' && r.scope_id === studentId) return true;
                return false;
            });
        }).map(ft => {
            const fullAmount = Number(ft.amount) || 0;
            const alreadyPaid = paidByFeeType.get(ft.id) || 0;
            const outstanding = Math.max(0, fullAmount - alreadyPaid);

            return {
                id: ft.id,
                name: ft.name,
                category: ft.fee_categories?.name || 'General Fees',
                total_amount: fullAmount,
                already_paid: alreadyPaid,
                outstanding_balance: outstanding,
                is_mandatory: ft.is_mandatory,
                partial_payment_allowed: ft.partial_payment_allowed,
                min_installment: ft.min_installment_amount || 0,
                due_date: ft.due_date,
                notes: ft.parent_notes
            };
        });

        res.json(payableItems);
    } catch (err) {
        console.error('getChildPayableItems error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.recordParentPayment = async (req, res) => {
    try {
        const { institution_id, userId } = req;
        const {
            student_id,
            total_amount,
            payment_method,
            payment_method_id,
            reference_number,
            payer_name,
            payer_phone,
            paid_date,
            proof_urls = [],
            allocations = [],
            idempotency_key
        } = req.body;

        const numTotal = Number(total_amount);
        if (!Number.isFinite(numTotal) || numTotal <= 0) {
            return res.status(400).json({ error: 'Please enter a valid payment amount greater than zero' });
        }

        if (!reference_number?.trim()) {
            return res.status(400).json({ error: 'Transaction reference code is required' });
        }

        const trimmedRef = reference_number.trim().toUpperCase();

        // Check duplicate reference in this institution
        const { data: existingRef } = await supabase
            .from('payments')
            .select('id, reference_number, status, created_at')
            .eq('institution_id', institution_id)
            .ilike('reference_number', trimmedRef)
            .maybeSingle();

        if (existingRef) {
            return res.status(409).json({
                error: 'This transaction reference code has already been submitted to the school.',
                existing_payment_id: existingRef.id,
                existing_status: existingRef.status
            });
        }

        // Idempotency check
        if (idempotency_key) {
            const { data: existingKey } = await supabase
                .from('payments')
                .select('id, status, total_amount')
                .eq('institution_id', institution_id)
                .eq('idempotency_key', idempotency_key)
                .maybeSingle();

            if (existingKey) {
                return res.status(200).json(existingKey);
            }
        }

        // Validate allocations
        let finalAllocations = allocations;
        if (!finalAllocations.length && student_id) {
            finalAllocations = [{
                student_id,
                amount: numTotal,
                notes: 'Standard fee payment'
            }];
        }

        const allocatedSum = finalAllocations.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
        if (Math.abs(allocatedSum - numTotal) > 0.01) {
            return res.status(400).json({
                error: `Total payment (${numTotal}) does not match the sum of child allocations (${allocatedSum}). Please adjust before submitting.`
            });
        }

        // 1. Insert Payment root record
        const { data: payment, error: pErr } = await supabase
            .from('payments')
            .insert([{
                institution_id,
                submitted_by: userId,
                student_id: student_id || (finalAllocations[0]?.student_id),
                total_amount: numTotal,
                amount: numTotal,
                payment_method: payment_method || 'mpesa',
                payment_method_id: payment_method_id || null,
                reference_number: trimmedRef,
                payer_name: payer_name?.trim() || null,
                payer_phone: payer_phone?.trim() || null,
                payment_date: paid_date ? new Date(paid_date).toISOString() : new Date().toISOString(),
                status: 'submitted',
                is_evidence_confirmed: false,
                is_split: finalAllocations.length > 1,
                idempotency_key: idempotency_key || null,
                proof_url: proof_urls[0] || null,
                status_updated_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (pErr) throw pErr;

        // 2. Insert Payment Allocations
        const allocRecords = finalAllocations.map(a => ({
            institution_id,
            payment_id: payment.id,
            student_id: a.student_id,
            fee_type_id: a.fee_type_id || null,
            bill_item_id: a.bill_item_id || null,
            amount: Number(a.amount),
            notes: a.notes || null
        }));

        await supabase.from('payment_allocations').insert(allocRecords);

        // 3. Insert Payment Proofs
        if (proof_urls.length > 0) {
            const proofRecords = proof_urls.map(path => ({
                institution_id,
                payment_id: payment.id,
                storage_path: path,
                file_name: path.split('/').pop() || 'proof',
                uploaded_by: userId
            }));
            await supabase.from('payment_proofs').insert(proofRecords);
        }

        res.status(201).json({
            success: true,
            payment_id: payment.id,
            reference_number: payment.reference_number,
            status: payment.status,
            message: 'Your payment submission has been received. Our accounts team will review and confirm your receipt shortly.'
        });
    } catch (err) {
        console.error('recordParentPayment error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getParentPaymentHistory = async (req, res) => {
    try {
        const { institution_id, userId } = req;
        const { studentId } = req.query;

        let query = supabase
            .from('payments')
            .select(`
                *,
                payment_allocations(*, fee_types(id, name), students(id, users(full_name, first_name, last_name))),
                payment_proofs(*),
                receipts(*),
                payment_flags(*, flag_reasons(label))
            `)
            .eq('institution_id', institution_id)
            .eq('submitted_by', userId)
            .order('created_at', { ascending: false });

        if (studentId) {
            query = query.eq('student_id', studentId);
        }

        const { data, error } = await query;
        if (error) throw error;

        const enriched = await Promise.all((data || []).map(async (p) => {
            const signedProof = p.proof_url ? await getSignedProofUrl(p.proof_url) : null;
            return {
                ...p,
                signed_proof_url: signedProof,
                receipt: (p.receipts || [])[0] || null
            };
        }));

        res.json(enriched);
    } catch (err) {
        console.error('getParentPaymentHistory error:', err);
        res.status(500).json({ error: err.message });
    }
};

// 6. Official Branded PDF Receipt
exports.getOfficialReceiptPdf = async (req, res) => {
    try {
        const { id } = req.params;
        const { institution_id } = req;

        const { data: receipt, error: rErr } = await supabase
            .from('receipts')
            .select(`
                *,
                payments(*),
                students(id, admission_number, grade_level, users(first_name, last_name, full_name)),
                institutions:institution_id(name, email, phone)
            `)
            .eq('id', id)
            .eq('institution_id', institution_id)
            .single();

        if (rErr || !receipt) {
            return res.status(404).json({ error: 'Receipt not found' });
        }

        // Fetch allocations
        const { data: allocations } = await supabase
            .from('payment_allocations')
            .select('*, fee_types(name)')
            .eq('payment_id', receipt.payment_id);

        const { data: settings } = await supabase
            .from('finance_settings')
            .select('*')
            .eq('institution_id', institution_id)
            .maybeSingle();

        const html = ReceiptService.renderReceiptHtml({
            receipt,
            payment: receipt.payments,
            student: receipt.students,
            institution: receipt.institutions,
            allocations: allocations || [],
            settings: settings || {}
        });

        const pdfBuffer = await compilePdfBuffer(html);
        const filename = `Receipt-${receipt.receipt_number}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(pdfBuffer);
    } catch (err) {
        console.error('getOfficialReceiptPdf error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getOfficialReceiptBase64 = async (req, res) => {
    try {
        const { id } = req.params;
        const { institution_id } = req;

        const { data: receipt, error: rErr } = await supabase
            .from('receipts')
            .select(`
                *,
                payments(*),
                students(id, admission_number, grade_level, users(first_name, last_name, full_name)),
                institutions:institution_id(name, email, phone)
            `)
            .eq('id', id)
            .eq('institution_id', institution_id)
            .single();

        if (rErr || !receipt) {
            return res.status(404).json({ error: 'Receipt not found' });
        }

        const { data: allocations } = await supabase
            .from('payment_allocations')
            .select('*, fee_types(name)')
            .eq('payment_id', receipt.payment_id);

        const { data: settings } = await supabase
            .from('finance_settings')
            .select('*')
            .eq('institution_id', institution_id)
            .maybeSingle();

        const html = ReceiptService.renderReceiptHtml({
            receipt,
            payment: receipt.payments,
            student: receipt.students,
            institution: receipt.institutions,
            allocations: allocations || [],
            settings: settings || {}
        });

        const pdfBuffer = await compilePdfBuffer(html);
        const filename = `Receipt-${receipt.receipt_number}.pdf`;

        res.json({
            base64: pdfBuffer.toString('base64'),
            filename
        });
    } catch (err) {
        console.error('getOfficialReceiptBase64 error:', err);
        res.status(500).json({ error: err.message });
    }
};

