const test = require('node:test');
const assert = require('node:assert/strict');

const { authorizeRoles } = require('../middleware/authRole.js');

function createRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test('authorizeRoles allows school_admin alias for admin-protected routes', () => {
  const req = {
    user: {
      role: 'school_admin',
      active_role: 'school_admin',
      available_roles: ['school_admin'],
      roles: [],
    },
  };
  const res = createRes();
  let nextCalled = false;

  authorizeRoles(['admin'])(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});

test('authorizeRoles allows platform_admin alias for master_admin-protected routes', () => {
  const req = {
    user: {
      role: 'platform_admin',
      active_role: 'platform_admin',
      available_roles: ['platform_admin'],
      roles: [],
    },
  };
  const res = createRes();
  let nextCalled = false;

  authorizeRoles(['master_admin'])(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});

test('authorizeRoles allows bursar alias for bursary-protected routes', () => {
  const req = {
    user: {
      role: 'teacher',
      active_role: 'teacher',
      available_roles: ['teacher'],
      roles: ['bursar'],
    },
  };
  const res = createRes();
  let nextCalled = false;

  authorizeRoles(['bursary'])(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});

test('authorizeRoles rejects users without required roles', () => {
  const req = {
    user: {
      role: 'teacher',
      active_role: 'teacher',
      available_roles: ['teacher'],
      roles: [],
    },
  };
  const res = createRes();
  let nextCalled = false;

  authorizeRoles(['admin'])(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body?.error, 'Access denied: insufficient permissions');
});
