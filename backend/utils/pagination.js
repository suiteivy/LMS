/**
 * Shared pagination helpers.
 *
 * Usage in a controller:
 *   const { page, limit, from, to } = parsePagination(req.query);
 *   const { data, count } = await supabase.from('table').select('*', { count: 'exact' }).range(from, to);
 *   return res.json(paginatedResponse(data, count, page, limit));
 */

/**
 * Extract page & limit from query string, with sane defaults + upper bound.
 * @param {object} query  – req.query
 * @param {{ defaultLimit?: number, maxLimit?: number }} opts
 * @returns {{ page: number, limit: number, from: number, to: number }}
 */
function parsePagination(query, opts = {}) {
  const { defaultLimit = 25, maxLimit = 100 } = opts;
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return { page, limit, from, to };
}

/**
 * Build a standard paginated envelope.
 * @param {Array} data     – rows for this page
 * @param {number} total   – total matching rows (from count: 'exact')
 * @param {number} page
 * @param {number} limit
 */
function paginatedResponse(data, total, page, limit) {
  return {
    data,
    pagination: {
      page,
      limit,
      total: total ?? data.length,
      totalPages: total != null ? Math.ceil(total / limit) : 1,
      hasMore: total != null ? page * limit < total : false,
    },
  };
}

module.exports = { parsePagination, paginatedResponse };
