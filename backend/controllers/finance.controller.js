// controllers/finance.controller.js
const supabase = require("../utils/supabaseClient.js");
const { resolveActiveTerm } = require('../utils/resolveActiveTerm');
const { buildReceiptHtml } = require('../utils/receiptTemplate.js');

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
        if (!['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin'].includes(userRole)) return res.status(403).json({ error: "Unauthorized" });

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
        if (!['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin'].includes(userRole)) return res.status(403).json({ error: "Unauthorized" });

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

        if (userRole !== "admin" && userRole !== "master_admin" && userRole !== "bursary") {
            // Non-admins/bursaries can only see their own transactions
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
        const { institution_id, userRole } = req;
        if (!['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin'].includes(userRole)) {
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
        const { institution_id, userRole } = req;
        if (!['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin'].includes(userRole)) {
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
        const { institution_id, userRole, userId } = req;
        if (!['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin'].includes(userRole)) {
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
        const { institution_id, userRole } = req;
        if (!['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin'].includes(userRole)) {
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
    const { data } = await supabase
        .from('institutions')
        .select('currency:currency_id(code, symbol, decimal_places)')
        .eq('id', institutionId)
        .maybeSingle();

    return data?.currency || { code: 'USD', symbol: '$', decimal_places: 2 };
};

/**
 * Process Transaction
 */
exports.processTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const { userRole, institution_id } = req;

        if (!['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin'].includes(userRole)) return res.status(403).json({ error: "Unauthorized" });

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
        if (!['admin', 'master_admin'].includes(userRole)) return res.status(403).json({ error: "Unauthorized" });

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
        if (!['admin', 'master_admin'].includes(userRole)) return res.status(403).json({ error: "Unauthorized" });
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

        const { data, error } = await supabase
            .from("fee_structures")
            .select("*")
            .eq("institution_id", institution_id)
            .order('created_at', { ascending: false });

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

        res.json(transformed);
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
        if (!['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin'].includes(userRole)) return res.status(403).json({ error: "Unauthorized" });

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
        if (!['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin'].includes(userRole)) return res.status(403).json({ error: "Unauthorized" });

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
        } = req.body;

        if (!title || amount === undefined || amount === null || Number.isNaN(Number(amount))) {
            return res.status(400).json({ error: 'title and amount are required' });
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

        const { data, error } = await supabase
            .from("fee_structures")
            .insert([{
                institution_id,
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
                is_active: false,
                status_updated_at: new Date().toISOString(),
            }])
            .select()
            .single();

        if (error) throw error;
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
        if (!['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin'].includes(userRole)) return res.status(403).json({ error: 'Unauthorized' });
        if (!id) return res.status(400).json({ error: 'Fee structure id is required' });

        const canOverrideStrictRelease = userRole === 'admin' || userRole === 'school_admin';
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
        if (!['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin'].includes(userRole)) return res.status(403).json({ error: 'Unauthorized' });
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
        if (!['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin'].includes(userRole)) return res.status(403).json({ error: 'Unauthorized' });
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
        if (!['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin'].includes(userRole)) return res.status(403).json({ error: "Unauthorized" });

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
        if (!['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin'].includes(userRole)) return res.status(403).json({ error: "Unauthorized" });

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
        const { institution_id, userRole } = req;

        if (!id) return res.status(400).json({ error: 'Payment id is required' });
        if (!['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin'].includes(userRole)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { data: payment, error } = await supabase
            .from('payments')
            .select('id, institution_id, fee_structure_id, fee_structure_snapshot, amount, payment_method, status, reference_number, payment_date, admin_notes, proof_url, created_at, updated_at, reviewed_at, confirmed_at, status_updated_at, retention_until, origin_type, origin_id, origin_label, target_type, target_id, target_label, recorded_by_user_id, recorded_by_label, students(id, users(first_name, last_name, full_name)), institutions:institution_id(name)')
            .eq('id', id)
            .eq('institution_id', institution_id)
            .single();

        if (error || !payment) {
            return res.status(404).json({ error: 'Payment not found' });
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
                { label: 'Amount', value: payment?.amount || 0, isAmount: true },
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

exports.getTransactionReceipt = async (req, res) => {
    try {
        const { id } = req.params;
        const { institution_id, userRole } = req;

        if (!id) return res.status(400).json({ error: 'Transaction id is required' });
        if (!['admin', 'school_admin', 'platform_admin', 'bursary', 'master_admin'].includes(userRole)) {
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

