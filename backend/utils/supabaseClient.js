const process = require("node:process");
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const { getTenantContext } = require("./tenantContext.js");

dotenv.config();

let supabaseInstance = null;

const TENANT_SCOPED_TABLES = new Set([
  'academic_reports',
  'academic_years',
  'addon_requests',
  'admins',
  'announcements',
  'assessment_types',
  'assignments',
  'attendance',
  'books',
  'borrowed_books',
  'bursaries',
  'bursars',
  'bursary_applications',
  'calendar_events',
  'class_categories',
  'class_enrollments',
  'class_levels',
  'class_streams',
  'classes',
  'clearance_processes',
  'content_evidence_entries',
  'conversation_participants',
  'conversations',
  'credential_change_requests',
  'daily_hours_logs',
  'diary_entries',
  'enrollments',
  'exam_results',
  'exams',
  'fee_components',
  'fee_discounts_waivers',
  'fee_structures',
  'finance_admin_audit_logs',
  'finance_admin_designations',
  'financial_transactions',
  'fund_allocations',
  'funds',
  'grade_audit_log',
  'grade_entries',
  'grades',
  'grading_scales',
  'institution_assessment_weights',
  'institution_categories',
  'institution_tracks',
  'lessons',
  'librarian_audit_logs',
  'librarian_designations',
  'library_config',
  'messages',
  'national_assessment_records',
  'notification_delivery_attempts',
  'notifications',
  'parent_students',
  'parents',
  'payments',
  'promotion_cycles',
  'promotion_decisions',
  'record_change_log',
  'record_of_work',
  'report_card_items',
  'report_cards',
  'resources',
  'roles',
  'student_class_transfers',
  'student_fee_invoices',
  'student_track_enrollments',
  'student_violations',
  'students',
  'subject_classes',
  'subject_coverage_plans',
  'subject_report_card_assessments',
  'subject_teachers',
  'subject_topic_areas',
  'subject_topics',
  'subject_weights',
  'subjects',
  'submissions',
  'support_tickets',
  'teacher_attendance',
  'teacher_payouts',
  'teachers',
  'terms',
  'ticket_messages',
  'timetables',
  'track_subjects',
  'trial_sessions',
  'user_preferences',
  'user_roles',
  'users',
]);

function getClient() {
    if (!supabaseInstance) {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
        let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseKey) {
            console.warn("WARNING: SUPABASE_SERVICE_ROLE_KEY not found. Using ANON key.");
            supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
        }

        if (!supabaseUrl || !supabaseKey) {
            console.warn("WARNING: Supabase URL or Key missing during initialization. Using placeholder fallback.");
        }
        supabaseInstance = createClient(
            supabaseUrl || 'https://placeholder-domain-for-testing.supabase.co',
            supabaseKey || 'placeholder-anon-key-for-testing',
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                }
            }
        );
    }
    return supabaseInstance;
}

/**
 * Creates a proxied filter builder that enforces tenant isolation.
 * Automatically injects the tenant filter and prevents cross-tenant overrides.
 */
function createScopedFilterBuilder(filterBuilder, tenantCol, tenantId) {
    if (!filterBuilder.url.searchParams.has(tenantCol)) {
        filterBuilder.eq(tenantCol, tenantId);
    }

    const proxiedFb = new Proxy(filterBuilder, {
        get(fbTarget, fbProp) {
            if (fbProp === 'eq') {
                return function (column, value) {
                    if (column === tenantCol) {
                        if (value !== tenantId) {
                            console.warn(`[TenantSecurity] Blocked cross-tenant query filter attempt! Column: ${tenantCol}, Attempted: ${value}, Enforced: ${tenantId}`);
                        }
                        // Already enforced, prevent duplicate params or overrides
                        return proxiedFb;
                    }
                    const res = fbTarget.eq(column, value);
                    return res === fbTarget ? proxiedFb : res;
                };
            }

            if (['in', 'neq', 'like', 'ilike', 'match'].includes(fbProp)) {
                return function (column, ...fArgs) {
                    if (column === tenantCol) {
                        console.warn(`[TenantSecurity] Blocked cross-tenant filter (${fbProp}) on ${tenantCol}`);
                        return proxiedFb;
                    }
                    const res = fbTarget[fbProp](column, ...fArgs);
                    return res === fbTarget ? proxiedFb : res;
                };
            }

            if (fbProp === 'filter') {
                return function (column, ...fArgs) {
                    if (column === tenantCol) {
                        console.warn(`[TenantSecurity] Blocked raw filter on ${tenantCol}`);
                        return proxiedFb;
                    }
                    const res = fbTarget.filter(column, ...fArgs);
                    return res === fbTarget ? proxiedFb : res;
                };
            }

            const val = fbTarget[fbProp];
            if (typeof val === 'function') {
                return function (...fnArgs) {
                    const res = val.apply(fbTarget, fnArgs);
                    return res === fbTarget ? proxiedFb : res;
                };
            }
            return val;
        }
    });

    return proxiedFb;
}

/**
 * Wraps a PostgrestQueryBuilder with automatic tenant scoping.
 */
function createScopedQueryBuilder(targetQb, tableName, tenantId) {
    const isInstitutionsTable = tableName === 'institutions';
    const isTenantTable = TENANT_SCOPED_TABLES.has(tableName);

    if (!isTenantTable && !isInstitutionsTable) {
        return targetQb;
    }

    const tenantCol = isInstitutionsTable ? 'id' : 'institution_id';

    return new Proxy(targetQb, {
        get(qbTarget, qbProp) {
            if (['select', 'update', 'delete'].includes(qbProp)) {
                return function (...args) {
                    // On update, sanitize payload to prevent tenant reassignment
                    if (qbProp === 'update' && isTenantTable && args[0] && typeof args[0] === 'object') {
                        if (Array.isArray(args[0])) {
                            args[0].forEach(item => {
                                if (item && typeof item === 'object') {
                                    if (item.institution_id && item.institution_id !== tenantId) {
                                        console.warn(`[TenantSecurity] Neutralized update attempt to reassign institution_id to ${item.institution_id}`);
                                    }
                                    item.institution_id = tenantId;
                                }
                            });
                        } else {
                            if (args[0].institution_id && args[0].institution_id !== tenantId) {
                                console.warn(`[TenantSecurity] Neutralized update attempt to reassign institution_id to ${args[0].institution_id}`);
                            }
                            args[0].institution_id = tenantId;
                        }
                    }

                    const filterBuilder = qbTarget[qbProp](...args);
                    return createScopedFilterBuilder(filterBuilder, tenantCol, tenantId);
                };
            }

            if (['insert', 'upsert'].includes(qbProp)) {
                return function (values, ...insertArgs) {
                    if (isTenantTable) {
                        if (Array.isArray(values)) {
                            values.forEach(item => {
                                if (item && typeof item === 'object') {
                                    if (item.institution_id && item.institution_id !== tenantId) {
                                        console.warn(`[TenantSecurity] Neutralized spoofed institution_id in insert: ${item.institution_id}`);
                                    }
                                    item.institution_id = tenantId;
                                }
                            });
                        } else if (values && typeof values === 'object') {
                            if (values.institution_id && values.institution_id !== tenantId) {
                                console.warn(`[TenantSecurity] Neutralized spoofed institution_id in insert: ${values.institution_id}`);
                            }
                            values.institution_id = tenantId;
                        }
                    }
                    return qbTarget[qbProp](values, ...insertArgs);
                };
            }

            const val = qbTarget[qbProp];
            if (typeof val === 'function') {
                return val.bind(qbTarget);
            }
            return val;
        }
    });
}

const supabaseProxy = new Proxy({}, {
    get: function (_target, prop) {
        const client = getClient();

        if (prop === 'from') {
            return function (tableName, ...rest) {
                const targetQb = client.from(tableName, ...rest);
                const tenantCtx = getTenantContext();

                // If no tenant context active, or explicitly bypassed, or no institution_id bound:
                if (!tenantCtx || tenantCtx.bypass || !tenantCtx.institution_id) {
                    return targetQb;
                }

                return createScopedQueryBuilder(targetQb, tableName, tenantCtx.institution_id);
            };
        }

        const value = client[prop];
        if (typeof value === 'function') {
            return value.bind(client);
        }
        return value;
    }
});

module.exports = supabaseProxy;
