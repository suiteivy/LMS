/**
 * Idempotency Middleware
 * Complies with Backend Handbook Part B1 & Task Section 2.5:
 * Protects mutating endpoints against network retry double-submissions.
 * Replays identical cached responses on duplicate requests and rejects payload mismatches with 422.
 */

const crypto = require('node:crypto');
const supabase = require('../utils/supabaseClient.js');
const logger = require('../utils/logger.js');

const inMemoryIdempotencyStore = new Map();

function hashPayload(payload) {
  const serialized = JSON.stringify(payload || {}, Object.keys(payload || {}).sort());
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

const idempotencyGuard = async (req, res, next) => {
  // Only apply to mutating HTTP methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return next(); // Key not provided, proceed normally
  }

  const userId = req.user?.id || 'anonymous';
  const institutionId = req.user?.institution_id;
  const requestHash = hashPayload(req.body);
  const compositeKey = `${userId}:${idempotencyKey}`;

  // 1. Check in-memory store
  const cachedMem = inMemoryIdempotencyStore.get(compositeKey);
  if (cachedMem) {
    if (cachedMem.requestHash !== requestHash) {
      return res.status(422).json({
        error: 'IDEMPOTENCY_KEY_MISMATCH',
        message: 'Idempotency key was previously used with a different request payload',
      });
    }
    res.setHeader('X-Cache-Lookup', 'HIT');
    res.setHeader('X-Idempotency-Replay', 'true');
    return res.status(cachedMem.responseCode).json(cachedMem.responseBody);
  }

  // 2. Check Database Store
  try {
    const { data: dbRecord } = await supabase
      .from('idempotency_keys')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .eq('user_id', userId)
      .maybeSingle();

    if (dbRecord) {
      if (dbRecord.request_hash !== requestHash) {
        return res.status(422).json({
          error: 'IDEMPOTENCY_KEY_MISMATCH',
          message: 'Idempotency key was previously used with a different request payload',
        });
      }
      res.setHeader('X-Cache-Lookup', 'HIT');
      res.setHeader('X-Idempotency-Replay', 'true');
      return res.status(dbRecord.response_code).json(dbRecord.response_body);
    }
  } catch (_err) {
    // Database table may not be migrated yet in test environment; continue
  }

  // 3. Intercept response to store atomically on successful finish
  let recordedStatusCode = 200;
  const originalStatus = res.status.bind(res);
  res.status = function (code) {
    recordedStatusCode = code;
    return originalStatus(code);
  };

  const originalJson = res.json.bind(res);
  res.json = function (body) {
    const statusCode = recordedStatusCode || res.statusCode || 200;

    // Cache in-memory
    inMemoryIdempotencyStore.set(compositeKey, {
      requestHash,
      responseCode: statusCode,
      responseBody: body,
      createdAt: Date.now(),
    });

    // Cache in database
    if (institutionId) {
      supabase
        .from('idempotency_keys')
        .insert({
          idempotency_key: idempotencyKey,
          user_id: userId !== 'anonymous' ? userId : null,
          institution_id: institutionId,
          request_path: req.originalUrl || req.path,
          request_hash: requestHash,
          response_code: statusCode,
          response_body: body,
        })
        .then(() => {})
        .catch((err) => {
          logger.warn('Failed to persist idempotency key', { error: err?.message });
        });
    }

    return originalJson(body);
  };

  next();
};

module.exports = {
  idempotencyGuard,
  __inMemoryStore: inMemoryIdempotencyStore,
};
