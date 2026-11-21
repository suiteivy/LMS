/**
 * Data Quality Quarantine Service
 * Complies with Ground Rule 5 & Task Section 3.3:
 * Questionable or orphaned rows are preserved in quarantine instead of being silently deleted.
 */

const supabase = require('../utils/supabaseClient.js');
const logger = require('../utils/logger.js');

const inMemoryQuarantine = new Map();

class QuarantineService {
  /**
   * Quarantines an invalid or orphaned record for administrative review
   */
  async quarantineRecord({
    institutionId,
    tableName,
    entityId,
    originalRecord,
    quarantineReason,
    severity = 'warning',
    quarantinedBy = null,
  }) {
    const quarantineId = `quar_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
    const record = {
      id: quarantineId,
      institution_id: institutionId,
      table_name: tableName,
      entity_id: String(entityId || ''),
      original_record: originalRecord || {},
      quarantine_reason: quarantineReason,
      severity,
      status: 'pending_review',
      created_at: new Date().toISOString(),
    };

    inMemoryQuarantine.set(quarantineId, record);

    try {
      const { data, error } = await supabase
        .from('data_quality_quarantine')
        .insert({
          institution_id: institutionId,
          table_name: tableName,
          entity_id: String(entityId || ''),
          original_record: originalRecord || {},
          quarantine_reason: quarantineReason,
          severity,
          status: 'pending_review',
        })
        .select()
        .maybeSingle();

      if (!error && data) {
        return data;
      }
    } catch (err) {
      logger.warn('Failed to persist quarantine record to DB, stored in-memory', { error: err.message });
    }

    return record;
  }

  /**
   * List pending quarantine records
   */
  async getQuarantinedRecords(institutionId) {
    try {
      let query = supabase.from('data_quality_quarantine').select('*').order('created_at', { ascending: false });
      if (institutionId) query = query.eq('institution_id', institutionId);
      const { data, error } = await query;
      if (!error && data) return data;
    } catch (_err) {}

    // Fallback in-memory
    const records = Array.from(inMemoryQuarantine.values());
    if (institutionId) {
      return records.filter(r => r.institution_id === institutionId);
    }
    return records;
  }
}

module.exports = new QuarantineService();
