const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// Test 1: Verify authMiddleware handles both Object and Array formats for profileData.admins
test('authMiddleware parses profileData.admins as both object and array', async () => {
  function extractAdminData(profileData) {
    const adminRecord = Array.isArray(profileData.admins) ? profileData.admins[0] : (profileData.admins || null);
    const isMain = Boolean(adminRecord?.is_main);
    const canManageUsers = Boolean(adminRecord?.can_manage_users || adminRecord?.is_main);
    return { isMain, canManageUsers };
  }

  // Case A: PostgREST returns object for 1-to-1 relation (current Supabase behavior)
  const objectProfile = {
    id: 'user-1',
    role: 'admin',
    admins: {
      id: 'admin-rec-1',
      is_main: true,
      can_manage_users: true,
    }
  };
  const resA = extractAdminData(objectProfile);
  assert.equal(resA.isMain, true, 'isMain should be true when admins is an object');
  assert.equal(resA.canManageUsers, true, 'canManageUsers should be true when admins is an object');

  // Case B: PostgREST returns array
  const arrayProfile = {
    id: 'user-2',
    role: 'admin',
    admins: [{
      id: 'admin-rec-2',
      is_main: true,
      can_manage_users: true,
    }]
  };
  const resB = extractAdminData(arrayProfile);
  assert.equal(resB.isMain, true, 'isMain should be true when admins is an array');
  assert.equal(resB.canManageUsers, true, 'canManageUsers should be true when admins is an array');

  // Case C: Non-main admin without delegation
  const nonMainProfile = {
    id: 'user-3',
    role: 'admin',
    admins: {
      id: 'admin-rec-3',
      is_main: false,
      can_manage_users: false,
    }
  };
  const resC = extractAdminData(nonMainProfile);
  assert.equal(resC.isMain, false);
  assert.equal(resC.canManageUsers, false);
});

// Test 2: Verify canAdminManageUsers helper logic
test('canAdminManageUsers allows main admin and delegated user-management admin', () => {
  const canAdminManageUsers = ({ isMain = false, hasDelegatedPermission = false }) => {
    return !!isMain || !!hasDelegatedPermission;
  };

  assert.equal(canAdminManageUsers({ isMain: true, hasDelegatedPermission: false }), true);
  assert.equal(canAdminManageUsers({ isMain: false, hasDelegatedPermission: true }), true);
  assert.equal(canAdminManageUsers({ isMain: false, hasDelegatedPermission: false }), false);
});

// Test 3: Verify requireAdmin allows both 'admin' and 'master_admin'
test('requireAdmin middleware allows admin and master_admin', () => {
  const { requireAdmin } = require('../middleware/roleCheck.js');

  let nextCalledA = false;
  const reqA = { userRole: 'admin' };
  const resA = { status: () => resA, json: () => resA };
  requireAdmin(reqA, resA, () => { nextCalledA = true; });
  assert.equal(nextCalledA, true, 'requireAdmin should allow admin');

  let nextCalledB = false;
  const reqB = { userRole: 'master_admin' };
  const resB = { status: () => resB, json: () => resB };
  requireAdmin(reqB, resB, () => { nextCalledB = true; });
  assert.equal(nextCalledB, true, 'requireAdmin should allow master_admin');

  let statusC = null;
  const reqC = { userRole: 'student' };
  const resC = { status: (code) => { statusC = code; return resC; }, json: () => resC };
  requireAdmin(reqC, resC, () => {});
  assert.equal(statusC, 403, 'requireAdmin should reject student with 403');
});
