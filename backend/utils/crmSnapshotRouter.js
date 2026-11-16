// Copy this file into an Express product backend, then mount the router as shown
// in docs/integrations/product-connection.md. Node 18+ and Express are required.
const crypto = require('node:crypto');
const express = require('express');

function matchesKey(supplied, expected) {
  if (!supplied || !expected) return false;
  // Hash before comparing so different key lengths do not leak through timing.
  const left = crypto.createHash('sha256').update(supplied).digest();
  const right = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(left, right);
}

function validDate(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function validMoney(value) {
  return value === null || (
    value && Number.isFinite(value.amount) && value.amount >= 0 &&
    typeof value.currency === 'string' && /^[A-Z]{3}$/.test(value.currency)
  );
}

function validAccount(account) {
  return account && typeof account.external_id === 'string' && account.external_id.length > 0 &&
    typeof account.name === 'string' && account.name.length > 0 &&
    (account.location === null || typeof account.location === 'string') &&
    (account.admin_name === null || typeof account.admin_name === 'string') &&
    account.subscription && (account.subscription.plan === null || typeof account.subscription.plan === 'string') &&
    (account.subscription.status === null || typeof account.subscription.status === 'string') &&
    (account.subscription.cycle === null || typeof account.subscription.cycle === 'string') &&
    (account.last_payment === null || (
      validMoney(account.last_payment) &&
      typeof account.last_payment.status === 'string' &&
      (account.last_payment.paid_at === null || validDate(account.last_payment.paid_at)) &&
      (account.last_payment.reference === null || typeof account.last_payment.reference === 'string')
    )) &&
    Number.isSafeInteger(account.open_tickets) && account.open_tickets >= 0 &&
    (account.updated_at === null || validDate(account.updated_at));
}

function validSnapshot(snapshot) {
  if (!snapshot || !snapshot.product || !snapshot.summary || !Array.isArray(snapshot.accounts)) return false;
  const { product, summary, accounts, next_cursor } = snapshot;
  return typeof product.external_id === 'string' && product.external_id.length > 0 &&
    typeof product.name === 'string' && product.name.length > 0 &&
    Number.isSafeInteger(summary.customer_count) && summary.customer_count >= 0 &&
    Number.isSafeInteger(summary.active_customer_count) && summary.active_customer_count >= 0 &&
    Number.isSafeInteger(summary.open_tickets) && summary.open_tickets >= 0 &&
    Array.isArray(summary.subscription_revenue) && summary.subscription_revenue.every((value) => value !== null && validMoney(value)) &&
    accounts.every(validAccount) &&
    (next_cursor === null || typeof next_cursor === 'string');
}

/**
 * The adapter MUST query this product's live database. It receives { limit,
 * cursor } and returns the contract documented in product-connection.md.
 * Do not fill missing data with invented values; use null for optional fields.
 */
function createCrmSnapshotRouter(adapter, options = {}) {
  if (!adapter || typeof adapter.getSnapshot !== 'function') {
    throw new TypeError('An adapter with getSnapshot({ limit, cursor }) is required');
  }
  const router = express.Router();
  const readKey = options.readKey || process.env.CRM_READ_API_KEY;
  if (!readKey || readKey.length < 32) {
    throw new Error('CRM_READ_API_KEY must be a dedicated random secret of at least 32 characters');
  }

  router.get('/snapshot', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!matchesKey(token, readKey)) return res.status(401).json({ error: 'Unauthorized' });

    const limit = Number(req.query.limit ?? 50);
    const cursor = req.query.cursor ?? null;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100 ||
        (cursor !== null && (typeof cursor !== 'string' || cursor.length > 512))) {
      return res.status(400).json({ error: 'Invalid pagination parameters' });
    }

    try {
      // Read current records on every request. The adapter should page accounts
      // with a stable cursor and use indexed queries; never load all customers.
      const snapshot = await adapter.getSnapshot({ limit, cursor });
      if (!validSnapshot(snapshot) || snapshot.accounts.length > limit) {
        return res.status(502).json({ error: 'Product adapter returned an invalid snapshot' });
      }
      return res.json({ ...snapshot, schema_version: 1, generated_at: new Date().toISOString() });
    } catch (error) {
      // Log details server-side only; database errors must not reach the CRM.
      console.error('[CRM snapshot]', error);
      return res.status(503).json({ error: 'Snapshot temporarily unavailable' });
    }
  });

  return router;
}

module.exports = { createCrmSnapshotRouter };
