/**
 * Universal Semantic Data Catalog Service
 * Enforces section context, role permissions, sensitivity rules, and prevents indirect data leaks.
 */

const supabase = require('../utils/supabaseClient.js');
const logger = require('../utils/logger.js');

// Standard in-memory fallback catalog matching the seeded database registry
const DEFAULT_DATASETS = [
  {
    code: 'students',
    label: 'Students',
    description: 'Enrolled student profiles and identifiers',
    tableName: 'students',
    grain: 'one row per student',
    owningSections: ['students', 'academics', 'results', 'management', 'users'],
    requiredPermissions: ['students:view'],
    sensitivityLevel: 'standard',
    historyBehavior: 'effective_dated',
  },
  {
    code: 'staff',
    label: 'Staff & Teachers',
    description: 'Teaching and administrative personnel',
    tableName: 'teachers',
    grain: 'one row per staff member',
    owningSections: ['users', 'management', 'academics'],
    requiredPermissions: ['teachers:view'],
    sensitivityLevel: 'sensitive',
    historyBehavior: 'effective_dated',
  },
  {
    code: 'parents',
    label: 'Parents & Guardians',
    description: 'Linked family contacts and guardian profiles',
    tableName: 'parents',
    grain: 'one row per parent/guardian',
    owningSections: ['students', 'communication', 'management'],
    requiredPermissions: ['parents:view'],
    sensitivityLevel: 'standard',
    historyBehavior: 'current_only',
  },
  {
    code: 'classes',
    label: 'Classes & Streams',
    description: 'Academic grade levels and classroom divisions',
    tableName: 'classes',
    grain: 'one row per class stream',
    owningSections: ['academics', 'classes', 'timetable', 'students'],
    requiredPermissions: ['classes:view'],
    sensitivityLevel: 'standard',
    historyBehavior: 'effective_dated',
  },
  {
    code: 'attendance',
    label: 'Attendance Records',
    description: 'Daily student presence and absence logs',
    tableName: 'attendance',
    grain: 'one row per student attendance record',
    owningSections: ['attendance', 'academics', 'students'],
    requiredPermissions: ['attendance:view'],
    sensitivityLevel: 'standard',
    historyBehavior: 'immutable_log',
  },
  {
    code: 'results',
    label: 'Exam & Assessment Results',
    description: 'Recorded student subject marks and grades',
    tableName: 'exam_results',
    grain: 'one row per student assessment item',
    owningSections: ['results', 'academics', 'management'],
    requiredPermissions: ['results:view'],
    sensitivityLevel: 'standard',
    historyBehavior: 'immutable_log',
  },
  {
    code: 'fees_ledger',
    label: 'Fee Invoices & Payments',
    description: 'Student billing ledger, payments and balances',
    tableName: 'student_bills',
    grain: 'one row per fee invoice item',
    owningSections: ['finance', 'management'],
    requiredPermissions: ['finance:view'],
    sensitivityLevel: 'sensitive',
    historyBehavior: 'immutable_log',
  },
  {
    code: 'library',
    label: 'Library Loans',
    description: 'Book borrowing and return tracking',
    tableName: 'library_loans',
    grain: 'one row per loan transaction',
    owningSections: ['library', 'students'],
    requiredPermissions: ['library:view'],
    sensitivityLevel: 'standard',
    historyBehavior: 'immutable_log',
  },
  {
    code: 'documents',
    label: 'Published Documents',
    description: 'Official issued letters and administrative records',
    tableName: 'published_documents',
    grain: 'one row per issued document',
    owningSections: ['documents', 'management'],
    requiredPermissions: ['documents:view'],
    sensitivityLevel: 'standard',
    historyBehavior: 'immutable_log',
  },
];

const DEFAULT_FIELDS = [
  // Students
  { datasetCode: 'students', fieldName: 'full_name', label: 'Student Name', columnName: 'full_name', dataType: 'text', allowedOperators: ['eq', 'neq', 'contains', 'starts_with', 'ends_with', 'in'], isFilterable: true, isSortable: true, isGroupable: false, isAggregatable: false, isSelectable: true, sensitivityLevel: 'standard', displayFormat: 'plain' },
  { datasetCode: 'students', fieldName: 'admission_number', label: 'Admission Number', columnName: 'admission_number', dataType: 'text', allowedOperators: ['eq', 'neq', 'contains', 'in'], isFilterable: true, isSortable: true, isGroupable: false, isAggregatable: false, isSelectable: true, sensitivityLevel: 'standard', displayFormat: 'code' },
  { datasetCode: 'students', fieldName: 'up_id', label: 'UPI / National Identifier', columnName: 'upi', dataType: 'text', allowedOperators: ['eq', 'neq', 'contains'], isFilterable: true, isSortable: true, isGroupable: false, isAggregatable: false, isSelectable: true, sensitivityLevel: 'standard', displayFormat: 'code' },
  { datasetCode: 'students', fieldName: 'class_id', label: 'Class ID', columnName: 'class_id', dataType: 'text', allowedOperators: ['eq', 'neq', 'in'], isFilterable: true, isSortable: true, isGroupable: true, isAggregatable: false, isSelectable: true, sensitivityLevel: 'standard', displayFormat: 'uuid' },
  { datasetCode: 'students', fieldName: 'status', label: 'Status', columnName: 'status', dataType: 'enum', allowedOperators: ['eq', 'neq', 'in'], isFilterable: true, isSortable: true, isGroupable: true, isAggregatable: false, isSelectable: true, sensitivityLevel: 'standard', displayFormat: 'badge' },
  { datasetCode: 'students', fieldName: 'gender', label: 'Gender', columnName: 'gender', dataType: 'enum', allowedOperators: ['eq', 'neq', 'in'], isFilterable: true, isSortable: true, isGroupable: true, isAggregatable: false, isSelectable: true, sensitivityLevel: 'standard', displayFormat: 'badge' },
  { datasetCode: 'students', fieldName: 'date_of_birth', label: 'Date of Birth', columnName: 'date_of_birth', dataType: 'date', allowedOperators: ['eq', 'neq', 'gt', 'lt', 'between'], isFilterable: true, isSortable: true, isGroupable: false, isAggregatable: false, isSelectable: true, sensitivityLevel: 'sensitive', displayFormat: 'date_short' },
  { datasetCode: 'students', fieldName: 'created_at', label: 'Enrollment Date', columnName: 'created_at', dataType: 'date', allowedOperators: ['eq', 'gt', 'lt', 'between'], isFilterable: true, isSortable: true, isGroupable: true, isAggregatable: false, isSelectable: true, sensitivityLevel: 'standard', displayFormat: 'date_short' },

  // Results
  { datasetCode: 'results', fieldName: 'score', label: 'Score / Marks', columnName: 'score', dataType: 'number', allowedOperators: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between'], isFilterable: true, isSortable: true, isGroupable: false, isAggregatable: true, isSelectable: true, sensitivityLevel: 'standard', displayFormat: 'number' },
  { datasetCode: 'results', fieldName: 'grade', label: 'Grade / Level', columnName: 'grade', dataType: 'text', allowedOperators: ['eq', 'neq', 'in'], isFilterable: true, isSortable: true, isGroupable: true, isAggregatable: false, isSelectable: true, sensitivityLevel: 'standard', displayFormat: 'badge' },
  { datasetCode: 'results', fieldName: 'subject_id', label: 'Subject ID', columnName: 'subject_id', dataType: 'text', allowedOperators: ['eq', 'neq', 'in'], isFilterable: true, isSortable: true, isGroupable: true, isAggregatable: false, isSelectable: true, sensitivityLevel: 'standard', displayFormat: 'uuid' },
  { datasetCode: 'results', fieldName: 'term', label: 'Academic Term', columnName: 'term', dataType: 'text', allowedOperators: ['eq', 'neq', 'in'], isFilterable: true, isSortable: true, isGroupable: true, isAggregatable: false, isSelectable: true, sensitivityLevel: 'standard', displayFormat: 'plain' },
  { datasetCode: 'results', fieldName: 'academic_year', label: 'Academic Year', columnName: 'academic_year', dataType: 'text', allowedOperators: ['eq', 'neq', 'in'], isFilterable: true, isSortable: true, isGroupable: true, isAggregatable: false, isSelectable: true, sensitivityLevel: 'standard', displayFormat: 'plain' },

  // Fees Ledger
  { datasetCode: 'fees_ledger', fieldName: 'item_name', label: 'Fee Item', columnName: 'item_name', dataType: 'text', allowedOperators: ['eq', 'neq', 'contains', 'in'], isFilterable: true, isSortable: true, isGroupable: true, isAggregatable: false, isSelectable: true, sensitivityLevel: 'standard', displayFormat: 'plain' },
  { datasetCode: 'fees_ledger', fieldName: 'amount_due', label: 'Amount Billed', columnName: 'amount_due', dataType: 'money', allowedOperators: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'], isFilterable: true, isSortable: true, isGroupable: false, isAggregatable: true, isSelectable: true, sensitivityLevel: 'standard', displayFormat: 'currency_kes' },
  { datasetCode: 'fees_ledger', fieldName: 'amount_paid', label: 'Amount Paid', columnName: 'amount_paid', dataType: 'money', allowedOperators: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'], isFilterable: true, isSortable: true, isGroupable: false, isAggregatable: true, isSelectable: true, sensitivityLevel: 'standard', displayFormat: 'currency_kes' },
  { datasetCode: 'fees_ledger', fieldName: 'balance', label: 'Outstanding Balance', columnName: 'balance', dataType: 'money', allowedOperators: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'], isFilterable: true, isSortable: true, isGroupable: false, isAggregatable: true, isSelectable: true, sensitivityLevel: 'standard', displayFormat: 'currency_kes' },
  { datasetCode: 'fees_ledger', fieldName: 'term', label: 'Term', columnName: 'term', dataType: 'text', allowedOperators: ['eq', 'neq', 'in'], isFilterable: true, isSortable: true, isGroupable: true, isAggregatable: false, isSelectable: true, sensitivityLevel: 'standard', displayFormat: 'plain' },
  { datasetCode: 'fees_ledger', fieldName: 'year', label: 'Year', columnName: 'year', dataType: 'text', allowedOperators: ['eq', 'neq', 'in'], isFilterable: true, isSortable: true, isGroupable: true, isAggregatable: false, isSelectable: true, sensitivityLevel: 'standard', displayFormat: 'plain' },

  // Attendance
  { datasetCode: 'attendance', fieldName: 'status', label: 'Attendance Status', columnName: 'status', dataType: 'enum', allowedOperators: ['eq', 'neq', 'in'], isFilterable: true, isSortable: true, isGroupable: true, isAggregatable: false, isSelectable: true, sensitivityLevel: 'standard', displayFormat: 'badge' },
  { datasetCode: 'attendance', fieldName: 'date', label: 'Attendance Date', columnName: 'date', dataType: 'date', allowedOperators: ['eq', 'gt', 'lt', 'between'], isFilterable: true, isSortable: true, isGroupable: true, isAggregatable: false, isSelectable: true, sensitivityLevel: 'standard', displayFormat: 'date_short' },
];

const DEFAULT_CONTEXTS = [
  { contextName: 'students_context', sectionKey: 'students', allowedDatasets: ['students', 'classes', 'attendance', 'parents', 'documents'], allowedCrossSections: ['results', 'fees_ledger'] },
  { contextName: 'finance_context', sectionKey: 'finance', allowedDatasets: ['fees_ledger', 'students', 'classes'], allowedCrossSections: ['attendance'] },
  { contextName: 'results_context', sectionKey: 'results', allowedDatasets: ['results', 'students', 'classes'], allowedCrossSections: ['attendance'] },
  { contextName: 'academics_context', sectionKey: 'academics', allowedDatasets: ['classes', 'students', 'results', 'attendance', 'staff'], allowedCrossSections: ['finance'] },
  { contextName: 'attendance_context', sectionKey: 'attendance', allowedDatasets: ['attendance', 'students', 'classes'], allowedCrossSections: ['results'] },
  { contextName: 'library_context', sectionKey: 'library', allowedDatasets: ['library', 'students', 'staff'], allowedCrossSections: [] },
  { contextName: 'users_context', sectionKey: 'users', allowedDatasets: ['students', 'staff', 'parents'], allowedCrossSections: [] },
  { contextName: 'management_context', sectionKey: 'management', allowedDatasets: ['students', 'staff', 'classes', 'attendance', 'results', 'fees_ledger', 'documents', 'library'], allowedCrossSections: ['students', 'finance', 'results', 'academics'] },
];

const DEFAULT_PRESETS = [
  {
    code: 'class_list_by_grade',
    title: 'Class List by Grade Level',
    description: 'Full alphabetical roster of enrolled students grouped by grade level.',
    contextSection: 'students',
    querySpec: {
      dataset: 'students',
      columns: ['full_name', 'admission_number', 'gender', 'status'],
      filters: [{ field: 'status', operator: 'eq', value: 'active' }],
      orderBy: [{ field: 'full_name', direction: 'ASC' }],
    },
  },
  {
    code: 'missing_fee_payments',
    title: 'Unpaid Tuition & Missing Payments',
    description: 'Students with unpaid tuition balances for the active academic term.',
    contextSection: 'finance',
    querySpec: {
      dataset: 'fees_ledger',
      columns: ['item_name', 'amount_due', 'amount_paid', 'balance'],
      filters: [{ field: 'balance', operator: 'gt', value: 0 }],
      orderBy: [{ field: 'balance', direction: 'DESC' }],
    },
  },
  {
    code: 'transport_only_payers',
    title: 'Transport Only Payers',
    description: 'Students who have paid for transport with no payments for other optional items.',
    contextSection: 'finance',
    querySpec: {
      dataset: 'fees_ledger',
      columns: ['item_name', 'amount_paid'],
      filters: [
        { field: 'item_name', operator: 'contains', value: 'transport' },
        { field: 'amount_paid', operator: 'gt', value: 0 }
      ],
      logicModifier: 'only_transport',
    },
  },
  {
    code: 'top_performers_per_class',
    title: 'Top Performers by Class (Top 3)',
    description: 'Highest achieving students per class rank based on assessment scores with tie handling.',
    contextSection: 'results',
    querySpec: {
      dataset: 'results',
      columns: ['score', 'grade'],
      ranking: { topN: 3, groupBy: 'class_id', tieHandling: 'shared_rank' },
    },
  },
];

class DataCatalogService {
  /**
   * Retrieves datasets, fields, and presets allowed for a given section context and role
   */
  async getCatalogForContext({ institutionId, userRole, permissions = [], sectionContext = 'management' }) {
    const isMasterAdmin = userRole === 'master_admin';
    const isAdmin = userRole === 'admin' || isMasterAdmin;

    // 1. Resolve section context
    const contextConfig = DEFAULT_CONTEXTS.find(c => c.sectionKey === sectionContext) ||
      DEFAULT_CONTEXTS.find(c => c.sectionKey === 'management');

    const allowedDatasetCodes = new Set(contextConfig.allowedDatasets);
    if (isAdmin || permissions.includes('reports:cross_section')) {
      contextConfig.allowedCrossSections.forEach(ds => allowedDatasetCodes.add(ds));
    }

    // 2. Filter datasets by user role and permissions
    const permittedDatasets = DEFAULT_DATASETS.filter(ds => {
      if (!allowedDatasetCodes.has(ds.code)) return false;
      if (isMasterAdmin || isAdmin) return true;
      if (ds.sensitivityLevel === 'restricted' && !permissions.includes(`${ds.code}:restricted`)) return false;
      return ds.requiredPermissions.some(rp => permissions.includes(rp) || permissions.includes('*'));
    });

    const permittedDatasetCodes = new Set(permittedDatasets.map(d => d.code));

    // 3. Filter fields and exclude sensitive fields without clearance (Preventing Indirect Data Leaks)
    const permittedFields = DEFAULT_FIELDS.filter(f => {
      if (!permittedDatasetCodes.has(f.datasetCode)) return false;
      if (f.sensitivityLevel === 'sensitive' && !isAdmin && !permissions.includes('sensitive_data:view')) {
        return false;
      }
      if (f.sensitivityLevel === 'restricted' && !isMasterAdmin && !permissions.includes('restricted_data:view')) {
        return false;
      }
      return true;
    });

    // 4. Presets matching this section
    const presets = DEFAULT_PRESETS.filter(p => p.contextSection === sectionContext || sectionContext === 'management');

    return {
      sectionContext,
      datasets: permittedDatasets,
      fields: permittedFields,
      presets,
      canExport: isAdmin || permissions.includes('reports:export'),
      canSchedule: isAdmin || permissions.includes('reports:schedule'),
    };
  }

  /**
   * Validates a Query Specification against the Data Catalog and User Permissions
   * Ground Rule: Reject any query attempting to filter, sort, group, or select hidden fields.
   */
  async validateQuerySpec({ spec, userRole, permissions = [], sectionContext, institutionId }) {
    if (!spec || typeof spec !== 'object') {
      return { isValid: false, errors: ['Query specification must be an object'] };
    }

    const { datasets, fields } = await this.getCatalogForContext({
      institutionId,
      userRole,
      permissions,
      sectionContext,
    });

    const allowedDatasetCodes = new Set(datasets.map(d => d.code));
    const allowedFieldsMap = new Map();
    fields.forEach(f => {
      allowedFieldsMap.set(`${f.datasetCode}.${f.fieldName}`, f);
      allowedFieldsMap.set(f.fieldName, f); // short lookup
    });

    const errors = [];

    // 1. Primary dataset validation
    if (!spec.dataset || !allowedDatasetCodes.has(spec.dataset)) {
      errors.push(`Dataset '${spec.dataset}' is not allowed in section context '${sectionContext}' for this user`);
    }

    // 2. Selected columns validation
    const requestedColumns = Array.isArray(spec.columns) ? spec.columns : [];
    if (requestedColumns.length === 0) {
      errors.push('At least one column must be selected');
    } else {
      for (const col of requestedColumns) {
        const fieldMeta = allowedFieldsMap.get(`${spec.dataset}.${col}`) || allowedFieldsMap.get(col);
        if (!fieldMeta || !fieldMeta.isSelectable) {
          errors.push(`Column '${col}' is not allowed or does not exist on dataset '${spec.dataset}'`);
        }
      }
    }

    // 3. Filter validation (Indirect leak guard: cannot filter by hidden fields!)
    const filters = Array.isArray(spec.filters) ? spec.filters : [];
    for (const f of filters) {
      if (!f.field) {
        errors.push('Filter missing field property');
        continue;
      }
      const fieldMeta = allowedFieldsMap.get(`${spec.dataset}.${f.field}`) || allowedFieldsMap.get(f.field);
      if (!fieldMeta) {
        // Important: Return generic unavailable message rather than leaking field existence
        errors.push(`Field '${f.field}' is not available for filtering in this context`);
        continue;
      }
      if (!fieldMeta.isFilterable) {
        errors.push(`Field '${fieldMeta.label}' is not marked as filterable`);
      }
      if (f.operator && !fieldMeta.allowedOperators.includes(f.operator)) {
        errors.push(`Operator '${f.operator}' is not supported for field '${fieldMeta.label}'`);
      }
    }

    // 4. Sort validation (Cannot sort by hidden fields!)
    const orderBy = Array.isArray(spec.orderBy) ? spec.orderBy : [];
    for (const ob of orderBy) {
      if (!ob.field) continue;
      const fieldMeta = allowedFieldsMap.get(`${spec.dataset}.${ob.field}`) || allowedFieldsMap.get(ob.field);
      if (!fieldMeta || !fieldMeta.isSortable) {
        errors.push(`Field '${ob.field}' is not sortable or not available`);
      }
    }

    // 5. Ranking validation
    if (spec.ranking) {
      if (typeof spec.ranking.topN !== 'number' || spec.ranking.topN < 1) {
        errors.push('Ranking topN must be a positive integer');
      }
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    return {
      isValid: true,
      sanitizedSpec: {
        ...spec,
        institution_id: institutionId,
        sectionContext,
      },
      errors: [],
    };
  }
}

module.exports = new DataCatalogService();
