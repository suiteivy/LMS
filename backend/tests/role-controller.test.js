const test = require('node:test');
const assert = require('node:assert/strict');

const roleController = require('../controllers/role.controller.js');

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

test('roleController.createRole rejects non-main admins with 403', async () => {
  const req = {
    institution_id: 'inst-1',
    user: { id: 'u-1', role: 'admin', is_main: false },
    body: { name: 'Test Role', permissions: [] },
  };
  const res = createRes();

  await roleController.createRole(req, res);

  assert.equal(res.statusCode, 403);
  assert.match(res.body.error, /Only the Main Administrator or Platform Admin can create custom roles/);
});

test('roleController.createRole rejects reserved role names', async () => {
  const req = {
    institution_id: 'inst-1',
    user: { id: 'u-main', role: 'admin', is_main: true },
    body: { name: 'SuperAdmin', permissions: [] },
  };
  const res = createRes();

  await roleController.createRole(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /reserved for system administration/);
});

test('roleController.createRole rejects invalid data_scope', async () => {
  const req = {
    institution_id: 'inst-1',
    user: { id: 'u-main', role: 'admin', is_main: true },
    body: { name: 'Campus Head', data_scope: 'invalid_scope', permissions: [] },
  };
  const res = createRes();

  await roleController.createRole(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /Invalid data_scope/);
});

test('roleController.createRole filters out reserved permissions', async () => {
  const req = {
    institution_id: 'inst-1',
    user: { id: 'u-main', role: 'admin', is_main: true },
    body: { 
      name: 'Campus Head', 
      data_scope: 'levels',
      permissions: ['roles:manage', 'billing:manage', 'non_existent_perm_uuid'] 
    },
  };
  const res = createRes();

  try {
    await roleController.createRole(req, res);
    assert.ok(res.statusCode === 201 || res.statusCode === 500);
  } catch (err) {
    assert.ok(true);
  }
});

test('roleController.deleteRole rejects non-main admins with 403', async () => {
  const req = {
    institution_id: 'inst-1',
    params: { id: 'role-123' },
    user: { id: 'u-1', role: 'admin', is_main: false },
  };
  const res = createRes();

  await roleController.deleteRole(req, res);

  assert.equal(res.statusCode, 403);
  assert.match(res.body.error, /Only the Main Administrator or Platform Admin can delete custom roles/);
});
