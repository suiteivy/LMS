/**
 * Notification & Message Deduplication Service
 * 
 * Complies with Backend Handbook Part C3:
 * - Deduplicates messages by message ID or idempotency key
 * - Maintains a rolling TTL deduplication window (e.g. 5 minutes)
 * - Safely absorbs network re-transmissions and client retries
 */

class NotificationDeduplicationService {
  constructor(ttlMs = 5 * 60 * 1000) {
    this.ttlMs = ttlMs;
    this.seenKeys = new Map(); // key -> expiresAt
    // Periodic sweep every 60s
    this.sweepInterval = setInterval(() => this.sweep(), 60 * 1000);
    if (this.sweepInterval.unref) {
      this.sweepInterval.unref();
    }
  }

  /**
   * Check whether a key is duplicate. If not duplicate, record it.
   * @param {string} key 
   * @returns {boolean} true if already seen, false if new
   */
  isDuplicate(key) {
    if (!key) return false;
    const now = Date.now();
    const expiresAt = this.seenKeys.get(key);
    if (expiresAt && expiresAt > now) {
      return true;
    }
    this.seenKeys.set(key, now + this.ttlMs);
    return false;
  }

  /**
   * Derive a deduplication key from notification attributes
   */
  deriveKey({ messageId, idempotencyKey, userId, title, message, institutionId }) {
    if (idempotencyKey) return `idemp:${idempotencyKey}`;
    if (messageId) return `msg:${messageId}`;
    if (userId && title) {
      return `hash:${institutionId || 'inst'}:${userId}:${title}:${message || ''}`;
    }
    return null;
  }

  sweep() {
    const now = Date.now();
    for (const [key, expiresAt] of this.seenKeys.entries()) {
      if (expiresAt <= now) {
        this.seenKeys.delete(key);
      }
    }
  }

  clear() {
    this.seenKeys.clear();
  }
}

const notificationDeduplication = new NotificationDeduplicationService();
module.exports = notificationDeduplication;
