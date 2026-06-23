/**
 * resolveActiveTerm.js
 *
 * Date-driven active term resolution.
 * A term is active if and only if startDate <= today <= endDate.
 * The `is_current` flag is secondary — date check takes precedence.
 *
 * All dates are compared as UTC date boundaries (YYYY-MM-DD).
 * If the institution has a timezone offset, the current date is converted
 * to that timezone before comparison.
 */

const supabase = require('./supabaseClient');

/**
 * Get the current date in the institution's timezone.
 * Falls back to UTC if no timezone is configured.
 * @param {string|null} timezone - IANA timezone string (e.g. 'Africa/Nairobi')
 * @returns {Date} Current date in the institution's timezone
 */
function getCurrentDateInTimezone(timezone) {
  if (!timezone || timezone === 'UTC') {
    return new Date();
  }

  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(now);
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    return new Date(`${year}-${month}-${day}T00:00:00Z`);
  } catch {
    return new Date();
  }
}

/**
 * Compare two YYYY-MM-DD date strings (or Date objects) as calendar dates.
 * Returns -1, 0, or 1.
 */
function compareDates(a, b) {
  const dateA = new Date(a);
  const dateB = new Date(b);
  const aTime = Date.UTC(dateA.getUTCFullYear(), dateA.getUTCMonth(), dateA.getUTCDate());
  const bTime = Date.UTC(dateB.getUTCFullYear(), dateB.getUTCMonth(), dateB.getUTCDate());
  if (aTime < bTime) return -1;
  if (aTime > bTime) return 1;
  return 0;
}

function isMissingColumnError(error, columnName) {
  const message = error?.message || '';
  return /column/i.test(message) && message.includes(columnName);
}

async function isTermLocked(institutionId, termId) {
  const { data, error } = await supabase
    .from('terms')
    .select('id, locked_at')
    .eq('id', termId)
    .eq('institution_id', institutionId)
    .single();

  if (error) {
    if (isMissingColumnError(error, 'locked_at')) {
      return false;
    }
    throw error;
  }

  return !!data?.locked_at;
}

/**
 * Check if a given date falls within a term's date range (inclusive).
 * @param {Date} today - Current date (already timezone-adjusted)
 * @param {string} startDate - Term start date (YYYY-MM-DD)
 * @param {string} endDate - Term end date (YYYY-MM-DD)
 * @returns {boolean}
 */
function isDateInRange(today, startDate, endDate) {
  const todayStr = today.toISOString().split('T')[0];
  return compareDates(todayStr, startDate) >= 0 && compareDates(todayStr, endDate) <= 0;
}

/**
 * Resolve the active term for an institution based on the current date.
 *
 * Priority:
 * 1. Date-based: term where start_date <= today <= end_date
 * 2. If multiple terms overlap (shouldn't happen), return the one closest to today
 * 3. If no date match, return null — NO fallback to is_current flag
 *
 * @param {string} institutionId - Institution UUID
 * @param {Date} [now] - Optional override for current time (useful for testing)
 * @returns {Promise<Object|null>} The active term object, or null
 */
async function resolveActiveTerm(institutionId, now) {
  // Get institution timezone
  const { data: institution } = await supabase
    .from('institutions')
    .select('timezone')
    .eq('id', institutionId)
    .single();

  const timezone = institution?.timezone || null;
  const today = now || getCurrentDateInTimezone(timezone);

  // Fetch all terms for this institution with their academic year info
  const { data: terms, error } = await supabase
    .from('terms')
    .select('*, academic_years(name)')
    .eq('institution_id', institutionId);

  if (error || !terms || terms.length === 0) {
    return null;
  }

  // Find terms where today falls within their date range
  const todayStr = today.toISOString().split('T')[0];
  const activeTerms = terms.filter(term =>
    isDateInRange(today, term.start_date, term.end_date)
  );

  if (activeTerms.length === 0) {
    return null;
  }

  // If exactly one, return it
  if (activeTerms.length === 1) {
    return activeTerms[0];
  }

  // If multiple overlap (shouldn't happen, but defense in depth),
  // return the one whose start_date is closest to today
  activeTerms.sort((a, b) => {
    const aDiff = compareDates(todayStr, a.start_date);
    const bDiff = compareDates(todayStr, b.start_date);
    return Math.abs(aDiff) - Math.abs(bDiff);
  });

  return activeTerms[0];
}

/**
 * Resolve the next upcoming term (not yet started).
 * Used for "upcoming term" banners when no active term exists.
 *
 * @param {string} institutionId
 * @param {Date} [now]
 * @returns {Promise<Object|null>}
 */
async function resolveNextUpcomingTerm(institutionId, now) {
  const { data: institution } = await supabase
    .from('institutions')
    .select('timezone')
    .eq('id', institutionId)
    .single();

  const timezone = institution?.timezone || null;
  const today = now || getCurrentDateInTimezone(timezone);
  const todayStr = today.toISOString().split('T')[0];

  const { data: terms, error } = await supabase
    .from('terms')
    .select('*, academic_years(name)')
    .eq('institution_id', institutionId);

  if (error || !terms || terms.length === 0) {
    return null;
  }

  // Find terms that start after today
  const upcoming = terms
    .filter(term => compareDates(todayStr, term.start_date) < 0)
    .sort((a, b) => compareDates(a.start_date, b.start_date));

  return upcoming.length > 0 ? upcoming[0] : null;
}

/**
 * Validate that a new/updated term doesn't overlap with existing terms
 * in the same academic year.
 *
 * @param {string} academicYearId
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @param {string} [excludeTermId] - Term ID to exclude (for updates)
 * @param {string} institutionId
 * @returns {Promise<{valid: boolean, conflict?: Object}>}
 */
async function validateTermOverlap(academicYearId, startDate, endDate, excludeTermId, institutionId) {
  const { data: existingTerms, error } = await supabase
    .from('terms')
    .select('id, name, start_date, end_date')
    .eq('academic_year_id', academicYearId)
    .eq('institution_id', institutionId);

  if (error) {
    return { valid: true };
  }

  for (const term of (existingTerms || [])) {
    if (excludeTermId && term.id === excludeTermId) continue;

    // Overlap check: two ranges overlap if start1 <= end2 AND start2 <= end1
    const overlaps = compareDates(startDate, term.end_date) <= 0 &&
                     compareDates(term.start_date, endDate) <= 0;

    if (overlaps) {
      return {
        valid: false,
        conflict: {
          term_id: term.id,
          term_name: term.name,
          existing_start: term.start_date,
          existing_end: term.end_date,
        },
      };
    }
  }

  return { valid: true };
}

module.exports = {
  resolveActiveTerm,
  resolveNextUpcomingTerm,
  validateTermOverlap,
  isDateInRange,
  compareDates,
  getCurrentDateInTimezone,
  isTermLocked,
};
