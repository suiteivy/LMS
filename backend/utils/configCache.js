/**
 * In-Memory Configuration & Semi-Static Data Cache
 * 
 * Complies with Backend Handbook Part E1:
 * - In-memory caching for grading scales, terms, institution settings
 * - 5-minute TTL fallback
 * - Explicit invalidation functions for admin mutations
 */

class ConfigCache {
  constructor(defaultTtlSeconds = 300) {
    this.defaultTtlMs = defaultTtlSeconds * 1000;
    this.cache = new Map(); // key -> { value, expiresAt }
  }

  set(key, value, ttlSeconds = 300) {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expiresAt });
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  /**
   * Delete specific key or all keys matching prefix
   * @param {string} pattern E.g. "inst-1:grading_scales" or "inst-1:*"
   */
  invalidate(pattern) {
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.delete(pattern);
    }
  }

  invalidateInstitution(institutionId) {
    if (!institutionId) return;
    this.invalidate(`${institutionId}:*`);
  }

  invalidateSettings(institutionId) {
    this.invalidate(`${institutionId}:settings`);
  }

  invalidateGradingScales(institutionId) {
    this.invalidate(`${institutionId}:grading_scales`);
  }

  invalidateTerms(institutionId) {
    this.invalidate(`${institutionId}:terms`);
    this.invalidate(`${institutionId}:active_term`);
  }

  clear() {
    this.cache.clear();
  }
}

const configCache = new ConfigCache();
module.exports = configCache;
