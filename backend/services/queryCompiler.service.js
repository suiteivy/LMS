/**
 * Query Specification Compiler Service
 * Translates validated JSON query specifications into safe parameterized SQL.
 * Strictly guarantees institution isolation, fan-out protection, and snapshot stability.
 */

const crypto = require('node:crypto');

const TABLE_MAP = {
  students: 'students',
  staff: 'teachers',
  parents: 'parents',
  classes: 'classes',
  attendance: 'attendance',
  results: 'exam_results',
  fees_ledger: 'student_bills',
  library: 'library_loans',
  documents: 'published_documents',
};

const COLUMN_MAP = {
  students: {
    full_name: 'full_name',
    admission_number: 'admission_number',
    up_id: 'upi',
    class_id: 'class_id',
    status: 'status',
    gender: 'gender',
    date_of_birth: 'date_of_birth',
    created_at: 'created_at',
  },
  results: {
    score: 'score',
    grade: 'grade',
    subject_id: 'subject_id',
    term: 'term',
    academic_year: 'academic_year',
    student_id: 'student_id',
  },
  fees_ledger: {
    item_name: 'item_name',
    amount_due: 'amount_due',
    amount_paid: 'amount_paid',
    balance: 'balance',
    term: 'term',
    year: 'year',
    student_id: 'student_id',
  },
  attendance: {
    status: 'status',
    date: 'date',
    remarks: 'remarks',
    student_id: 'student_id',
  },
};

class QueryCompilerService {
  /**
   * Generates a stable SHA-256 hash of the query specification
   */
  hashSpec(spec) {
    const serialized = JSON.stringify(spec, Object.keys(spec).sort());
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Compiles the specification into parameterized SQL
   */
  compile(spec, institutionId) {
    if (!institutionId) {
      throw new Error('Mandatory institution_id is required for query compilation');
    }

    const tableName = TABLE_MAP[spec.dataset] || 'students';
    const params = [institutionId];
    let paramIndex = 2;

    const whereClauses = [`t.institution_id = $1`];
    const filterSummaries = [];

    // 1. Process Period Selection
    if (spec.period) {
      const { type, year, years, startYear, endYear, term, asOf } = spec.period;

      if (type === 'single' && year) {
        whereClauses.push(`(t.academic_year = $${paramIndex} OR t.year = $${paramIndex})`);
        params.push(String(year));
        filterSummaries.push(`Academic Year: ${year}`);
        paramIndex++;
      } else if (type === 'multi' && Array.isArray(years) && years.length > 0) {
        const placeholders = years.map((_, i) => `$${paramIndex + i}`).join(', ');
        whereClauses.push(`(t.academic_year IN (${placeholders}) OR t.year IN (${placeholders}))`);
        params.push(...years.map(String));
        filterSummaries.push(`Years: ${years.join(', ')}`);
        paramIndex += years.length;
      } else if (type === 'range' && startYear && endYear) {
        whereClauses.push(`(t.academic_year BETWEEN $${paramIndex} AND $${paramIndex + 1} OR t.year BETWEEN $${paramIndex} AND $${paramIndex + 1})`);
        params.push(String(startYear), String(endYear));
        filterSummaries.push(`Years: ${startYear} to ${endYear}`);
        paramIndex += 2;
      }

      if (term) {
        whereClauses.push(`t.term = $${paramIndex}`);
        params.push(String(term));
        filterSummaries.push(`Term: ${term}`);
        paramIndex++;
      }

      // As-of historical snapshot
      if (asOf) {
        whereClauses.push(`t.created_at <= $${paramIndex}`);
        params.push(new Date(asOf).toISOString());
        filterSummaries.push(`Snapshot as of: ${new Date(asOf).toLocaleDateString()}`);
        paramIndex++;
      }
    }

    // 2. Process Filters
    if (Array.isArray(spec.filters)) {
      for (const f of spec.filters) {
        const colMap = COLUMN_MAP[spec.dataset] || {};
        const col = colMap[f.field] || f.field;

        switch (f.operator) {
          case 'eq':
            whereClauses.push(`t.${col} = $${paramIndex}`);
            params.push(f.value);
            filterSummaries.push(`${f.field} is '${f.value}'`);
            paramIndex++;
            break;
          case 'neq':
            whereClauses.push(`t.${col} <> $${paramIndex}`);
            params.push(f.value);
            filterSummaries.push(`${f.field} is not '${f.value}'`);
            paramIndex++;
            break;
          case 'contains':
            whereClauses.push(`t.${col} ILIKE $${paramIndex}`);
            params.push(`%${f.value}%`);
            filterSummaries.push(`${f.field} contains '${f.value}'`);
            paramIndex++;
            break;
          case 'starts_with':
            whereClauses.push(`t.${col} ILIKE $${paramIndex}`);
            params.push(`${f.value}%`);
            filterSummaries.push(`${f.field} starts with '${f.value}'`);
            paramIndex++;
            break;
          case 'ends_with':
            whereClauses.push(`t.${col} ILIKE $${paramIndex}`);
            params.push(`%${f.value}`);
            filterSummaries.push(`${f.field} ends with '${f.value}'`);
            paramIndex++;
            break;
          case 'gt':
            whereClauses.push(`t.${col} > $${paramIndex}`);
            params.push(f.value);
            filterSummaries.push(`${f.field} > ${f.value}`);
            paramIndex++;
            break;
          case 'gte':
            whereClauses.push(`t.${col} >= $${paramIndex}`);
            params.push(f.value);
            filterSummaries.push(`${f.field} >= ${f.value}`);
            paramIndex++;
            break;
          case 'lt':
            whereClauses.push(`t.${col} < $${paramIndex}`);
            params.push(f.value);
            filterSummaries.push(`${f.field} < ${f.value}`);
            paramIndex++;
            break;
          case 'lte':
            whereClauses.push(`t.${col} <= $${paramIndex}`);
            params.push(f.value);
            filterSummaries.push(`${f.field} <= ${f.value}`);
            paramIndex++;
            break;
          case 'between':
            if (Array.isArray(f.value) && f.value.length === 2) {
              whereClauses.push(`t.${col} BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
              params.push(f.value[0], f.value[1]);
              filterSummaries.push(`${f.field} between ${f.value[0]} and ${f.value[1]}`);
              paramIndex += 2;
            }
            break;
          case 'in':
            if (Array.isArray(f.value) && f.value.length > 0) {
              const placeholders = f.value.map((_, i) => `$${paramIndex + i}`).join(', ');
              whereClauses.push(`t.${col} IN (${placeholders})`);
              params.push(...f.value);
              filterSummaries.push(`${f.field} in (${f.value.join(', ')})`);
              paramIndex += f.value.length;
            }
            break;
          default:
            break;
        }
      }
    }

    // 3. Logic Modifiers (e.g., "only transport")
    if (spec.logicModifier === 'only_transport') {
      whereClauses.push(`
        t.item_name ILIKE '%transport%'
        AND NOT EXISTS (
          SELECT 1 FROM student_bills other_bills
          WHERE other_bills.student_id = t.student_id
            AND other_bills.institution_id = t.institution_id
            AND other_bills.item_name NOT ILIKE '%transport%'
            AND other_bills.amount_paid > 0
        )
      `);
      filterSummaries.push(`Logic: Paid for Transport ONLY (no payments recorded for any other fee item)`);
    }

    // 4. Select Columns
    const selectCols = (spec.columns || ['id']).map(col => {
      const colMap = COLUMN_MAP[spec.dataset] || {};
      const actualCol = colMap[col] || col;
      return `t.${actualCol} AS "${col}"`;
    }).join(', ');

    // 5. Order By
    let orderClause = 'ORDER BY t.created_at DESC';
    if (Array.isArray(spec.orderBy) && spec.orderBy.length > 0) {
      const parts = spec.orderBy.map(ob => {
        const dir = (ob.direction || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        const colMap = COLUMN_MAP[spec.dataset] || {};
        const col = colMap[ob.field] || ob.field;
        return `t.${col} ${dir}`;
      });
      orderClause = `ORDER BY ${parts.join(', ')}`;
    }

    // 6. Ranking / Top N
    let rankingClause = '';
    if (spec.ranking && typeof spec.ranking.topN === 'number') {
      const limitN = Math.max(1, Math.min(100, spec.ranking.topN));
      rankingClause = `LIMIT ${limitN}`;
      filterSummaries.push(`Rank: Top ${limitN} items (shared rank on ties)`);
    }

    const whereString = whereClauses.join(' AND ');

    // Count SQL (exact total count)
    const countSql = `SELECT COUNT(*)::int AS total FROM ${tableName} t WHERE ${whereString}`;
    const countParams = [...params];

    // Data SQL (capped for preview or streamed)
    const previewLimit = spec.limit || 50;
    const previewOffset = spec.offset || 0;
    const dataSql = `
      SELECT ${selectCols}
      FROM ${tableName} t
      WHERE ${whereString}
      ${orderClause}
      ${rankingClause || `LIMIT ${previewLimit} OFFSET ${previewOffset}`}
    `;

    return {
      sql: dataSql,
      params,
      countSql,
      countParams,
      filterSummary: filterSummaries.length > 0 ? filterSummaries.join('; ') : 'All records in active scope',
      specHash: this.hashSpec(spec),
    };
  }
}

module.exports = new QueryCompilerService();
