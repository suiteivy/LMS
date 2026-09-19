const { AsyncLocalStorage } = require('node:async_hooks');

const tenantStorage = new AsyncLocalStorage();

/**
 * Runs a function within a specified tenant context.
 * @param {Object} context - { institution_id, userId, userRole, isPlatformAdmin, bypass }
 * @param {Function} fn - Function to run
 */
function runWithTenantContext(context, fn) {
  return tenantStorage.run(context, fn);
}

/**
 * Retrieves the current tenant context.
 * @returns {Object|undefined}
 */
function getTenantContext() {
  return tenantStorage.getStore();
}

/**
 * Runs a function with tenant scoping explicitly bypassed.
 * Used for platform-level operations (e.g. /api/master-admin/*) or system background maintenance.
 * @param {Function} fn - Function to run
 */
function runWithBypassTenantScope(fn) {
  const current = tenantStorage.getStore() || {};
  return tenantStorage.run({ ...current, bypass: true }, fn);
}

module.exports = {
  tenantStorage,
  runWithTenantContext,
  getTenantContext,
  runWithBypassTenantScope,
};
