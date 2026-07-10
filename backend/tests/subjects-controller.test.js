const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const controllerPath = path.resolve(__dirname, '../controllers/subject.controller.js');
const supabaseModulePath = path.resolve(__dirname, '../utils/supabaseClient.js');
const feeUtilsModulePath = path.resolve(__dirname, '../utils/feeUtils.js');

function loadControllerWithMocks({ mockSupabase, mockFeeUtils } = {}) {
  delete require.cache[controllerPath];
  delete require.cache[supabaseModulePath];
  delete require.cache[feeUtilsModulePath];

  require.cache[supabaseModulePath] = {
    id: supabaseModulePath,
    filename: supabaseModulePath,
    loaded: true,
    exports: mockSupabase || {},
  };

  require.cache[feeUtilsModulePath] = {
    id: feeUtilsModulePath,
    filename: feeUtilsModulePath,
    loaded: true,
    exports: mockFeeUtils || {
      hasPaidAtLeastHalf: async () => true,
    },
  };

  return require(controllerPath);
}

function createRes() {
  const state = { statusCode: 200, body: null };
  return {
    state,
    status(code) {
      state.statusCode = code;
      return this;
    },
    json(payload) {
      state.body = payload;
      return this;
    },
  };
}

test('getSubjects falls back cleanly when relationship metadata is unavailable', async () => {
  const mockSupabase = {
    from(table) {
      if (table === 'subjects') {
        const query = {
          _select: null,
          select(value) {
            this._select = value;
            return this;
          },
          eq() {
            return this;
          },
          async order() {
            if (String(this._select).includes('subject_teachers(')) {
              return {
                data: null,
                error: { code: 'PGRST200', message: 'Could not find a relationship in schema cache' },
              };
            }
            return {
              data: [
                {
                  id: 'sub-1',
                  title: 'Mathematics',
                  class_id: null,
                  metadata: { class_ids: ['class-a'] },
                },
              ],
              error: null,
            };
          },
        };
        return query;
      }

      if (table === 'subject_classes') {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          async in() {
            return {
              data: null,
              error: {
                code: 'PGRST205',
                message: "Could not find the table 'public.subject_classes' in the schema cache",
              },
            };
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };

  const controller = loadControllerWithMocks({ mockSupabase });
  const res = createRes();
  await controller.getSubjects({ institution_id: 'inst-1' }, res);

  assert.equal(res.state.statusCode, 200);
  assert.equal(Array.isArray(res.state.body), true);
  assert.equal(res.state.body.length, 1);
  assert.deepEqual(res.state.body[0].subject_teachers, []);
  assert.equal(res.state.body[0].teacher, null);
  assert.deepEqual(res.state.body[0].class_ids, ['class-a']);
});

test('updateSubject syncs teacher/class links and returns enriched subject', async () => {
  const calls = {
    subjectUpdatePayload: null,
    subjectTeachersInsert: null,
    subjectClassesInsert: null,
  };

  const mockSupabase = {
    from(table) {
      if (table === 'subjects') {
        const query = {
          _select: null,
          _updatePayload: null,
          select(value) {
            this._select = value;
            return this;
          },
          update(payload) {
            this._updatePayload = payload;
            calls.subjectUpdatePayload = payload;
            return this;
          },
          eq() {
            return this;
          },
          async single() {
            if (this._select === 'id, metadata') {
              return {
                data: { id: 'sub-1', metadata: { class_ids: ['class-old'] } },
                error: null,
              };
            }

            if (String(this._select).includes('subject_teachers(')) {
              return {
                data: {
                  id: 'sub-1',
                  title: 'Updated Subject',
                  class_id: 'class-a',
                  metadata: { class_ids: ['class-a', 'class-b'] },
                  subject_teachers: [
                    {
                      teacher_id: 'teach-1',
                      teachers: { users: { full_name: 'Teacher One' } },
                    },
                  ],
                },
                error: null,
              };
            }

            throw new Error(`Unexpected subjects single select: ${this._select}`);
          },
        };
        return query;
      }

      if (table === 'classes') {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          async in(_, values) {
            return { data: values.map((id) => ({ id })), error: null };
          },
        };
      }

      if (table === 'teachers') {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          async in(_, values) {
            return { data: values.map((id) => ({ id })), error: null };
          },
        };
      }

      if (table === 'subject_teachers') {
        return {
          delete() {
            return this;
          },
          eq() {
            return this;
          },
          async insert(rows) {
            calls.subjectTeachersInsert = rows;
            return { error: null };
          },
        };
      }

      if (table === 'subject_classes') {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          async in() {
            return {
              data: [
                { subject_id: 'sub-1', class_id: 'class-a' },
                { subject_id: 'sub-1', class_id: 'class-b' },
              ],
              error: null,
            };
          },
          delete() {
            return this;
          },
          async insert(rows) {
            calls.subjectClassesInsert = rows;
            return { error: null };
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };

  const controller = loadControllerWithMocks({ mockSupabase });

  const req = {
    params: { id: 'sub-1' },
    institution_id: 'inst-1',
    body: {
      title: 'Updated Subject',
      description: 'Updated description',
      teacher_ids: ['teach-1', 'teach-2'],
      class_ids: ['class-a', 'class-b'],
      metadata: { category: 'General' },
    },
  };

  const res = createRes();
  await controller.updateSubject(req, res);

  assert.equal(res.state.statusCode, 200);
  assert.ok(calls.subjectUpdatePayload);
  assert.equal(calls.subjectUpdatePayload.teacher_id, 'teach-1');
  assert.equal(calls.subjectUpdatePayload.class_id, 'class-a');
  assert.deepEqual(calls.subjectUpdatePayload.metadata.class_ids, ['class-a', 'class-b']);

  assert.deepEqual(calls.subjectTeachersInsert, [
    { subject_id: 'sub-1', teacher_id: 'teach-1', institution_id: 'inst-1' },
    { subject_id: 'sub-1', teacher_id: 'teach-2', institution_id: 'inst-1' },
  ]);

  assert.deepEqual(calls.subjectClassesInsert, [
    { subject_id: 'sub-1', class_id: 'class-a', institution_id: 'inst-1' },
    { subject_id: 'sub-1', class_id: 'class-b', institution_id: 'inst-1' },
  ]);

  assert.equal(res.state.body.id, 'sub-1');
  assert.deepEqual(res.state.body.class_ids.sort(), ['class-a', 'class-b']);
});
