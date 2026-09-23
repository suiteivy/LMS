const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { buildClassLabel } = require('../utils/classLabel');
const controllerPath = path.resolve(__dirname, '../controllers/class.controller.js');
const supabaseModulePath = path.resolve(__dirname, '../utils/supabaseClient.js');

function createSupabaseMock(resolver) {
  return {
    from(table) {
      const state = {
        table,
        filters: [],
      };

      const builder = {
        select(columns, options) {
          state.select = { columns, options };
          return this;
        },
        insert(values) {
          state.insert = values;
          return this;
        },
        update(values) {
          state.update = values;
          return this;
        },
        delete() {
          state.delete = true;
          return this;
        },
        eq(column, value) {
          state.filters.push({ op: 'eq', column, value });
          return this;
        },
        is(column, value) {
          state.filters.push({ op: 'is', column, value });
          return this;
        },
        not(column, op, value) {
          state.filters.push({ op: 'not', column, op2: op, value });
          return this;
        },
        in(column, values) {
          state.filters.push({ op: 'in', column, value: values });
          return this;
        },
        order(column, options) {
          state.order = state.order || [];
          state.order.push({ column, options });
          return this;
        },
        limit(value) {
          state.limit = value;
          return this;
        },
        single() {
          state.terminal = 'single';
          return Promise.resolve(resolver(state));
        },
        maybeSingle() {
          state.terminal = 'maybeSingle';
          return Promise.resolve(resolver(state));
        },
        then(onFulfilled, onRejected) {
          state.terminal = state.terminal || 'query';
          return Promise.resolve(resolver(state)).then(onFulfilled, onRejected);
        },
      };

      return builder;
    },
  };
}

function loadControllerWithSupabaseMock(supabaseMock) {
  delete require.cache[controllerPath];
  delete require.cache[supabaseModulePath];

  require.cache[supabaseModulePath] = {
    id: supabaseModulePath,
    filename: supabaseModulePath,
    loaded: true,
    exports: supabaseMock,
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

test('buildClassLabel: correctly formats Early Years levels and streams', () => {
  // Playgroup (-2)
  assert.equal(buildClassLabel({ grade_level: -2 }), 'Playgroup');
  assert.equal(buildClassLabel({ grade_level: '-2' }), 'Playgroup');
  assert.equal(buildClassLabel({ grade_level: 'playgroup' }), 'Playgroup');
  assert.equal(buildClassLabel({ grade_level: -2, stream: 'Red' }), 'Playgroup Red');

  // PP1 (-1)
  assert.equal(buildClassLabel({ grade_level: -1 }), 'PP1');
  assert.equal(buildClassLabel({ grade_level: '-1' }), 'PP1');
  assert.equal(buildClassLabel({ grade_level: 'pp1' }), 'PP1');
  assert.equal(buildClassLabel({ grade_level: -1, stream: 'Blue' }), 'PP1 Blue');

  // PP2 (0) - numeric and string
  assert.equal(buildClassLabel({ grade_level: 0 }), 'PP2');
  assert.equal(buildClassLabel({ grade_level: '0' }), 'PP2');
  assert.equal(buildClassLabel({ grade_level: 'pp2' }), 'PP2');
  assert.equal(buildClassLabel({ grade_level: 0, stream: 'Yellow' }), 'PP2 Yellow');

  // Positive grades remain intact
  assert.equal(buildClassLabel({ grade_level: 1, stream: 'North' }), 'Grade 1 North');
});

test('buildClassLabel: sanitizes legacy buggy display names like Grade 0, Grade -1, Grade -2', () => {
  assert.equal(buildClassLabel({ display_name: 'Grade -2' }), 'Playgroup');
  assert.equal(buildClassLabel({ display_name: 'Grade -1 Simba' }), 'PP1 Simba');
  assert.equal(buildClassLabel({ display_name: 'Grade 0 Blue' }), 'PP2 Blue');
  assert.equal(buildClassLabel({ name: 'Grade 0' }), 'PP2');
});

test('createClassDomainLevel: rejects level numbers below -2', async () => {
  const controller = loadControllerWithSupabaseMock(createSupabaseMock(() => ({ data: null, error: null })));
  const req = {
    institution_id: 'inst-1',
    body: { level_number: -3 },
  };
  const res = createRes();

  await controller.createClassDomainLevel(req, res);
  assert.equal(res.state.statusCode, 400);
  assert.match(res.state.body.error, /greater than or equal to -2/);
});

test('createClassDomainLevel: allows Playgroup (-2) and defaults name to Playgroup', async () => {
  const controller = loadControllerWithSupabaseMock(
    createSupabaseMock((state) => {
      if (state.table === 'class_categories' && state.terminal === 'maybeSingle') {
        return { data: { id: 'cat-ey' }, error: null };
      }
      if (state.table === 'class_levels' && state.terminal === 'maybeSingle') {
        return { data: null, error: null }; // No existing level
      }
      if (state.table === 'class_levels' && state.insert) {
        return {
          data: {
            id: 'lvl-pg',
            category_id: state.insert.category_id,
            level_number: state.insert.level_number,
            name: state.insert.name,
            sort_order: state.insert.sort_order,
          },
          error: null,
        };
      }
      return { data: null, error: null };
    })
  );

  const req = {
    institution_id: 'inst-1',
    body: { level_number: -2 },
  };
  const res = createRes();

  await controller.createClassDomainLevel(req, res);
  assert.equal(res.state.statusCode, 201);
  assert.equal(res.state.body.level_number, -2);
  assert.equal(res.state.body.name, 'Playgroup');
});

test('createClassDomainLevel: allows PP1 (-1) and PP2 (0) with appropriate defaults', async () => {
  const levelsCreated = [];
  const controller = loadControllerWithSupabaseMock(
    createSupabaseMock((state) => {
      if (state.table === 'class_categories' && state.terminal === 'maybeSingle') {
        return { data: { id: 'cat-ey' }, error: null };
      }
      if (state.table === 'class_levels' && state.terminal === 'maybeSingle') {
        return { data: null, error: null };
      }
      if (state.table === 'class_levels' && state.insert) {
        levelsCreated.push(state.insert);
        return {
          data: {
            id: `lvl-${state.insert.level_number}`,
            ...state.insert,
          },
          error: null,
        };
      }
      return { data: null, error: null };
    })
  );

  // Test PP1 (-1)
  const reqPP1 = { institution_id: 'inst-1', body: { level_number: -1 } };
  const resPP1 = createRes();
  await controller.createClassDomainLevel(reqPP1, resPP1);
  assert.equal(resPP1.state.statusCode, 201);
  assert.equal(resPP1.state.body.name, 'PP1');

  // Test PP2 (0)
  const reqPP2 = { institution_id: 'inst-1', body: { level_number: 0 } };
  const resPP2 = createRes();
  await controller.createClassDomainLevel(reqPP2, resPP2);
  assert.equal(resPP2.state.statusCode, 201);
  assert.equal(resPP2.state.body.name, 'PP2');
});

test('createClassDomainLevel: creates standalone class for Early Years with grade_level and proper class_type', async () => {
  let createdClassPayload = null;

  const controller = loadControllerWithSupabaseMock(
    createSupabaseMock((state) => {
      if (state.table === 'class_categories' && state.terminal === 'maybeSingle') {
        return { data: { id: 'cat-ey' }, error: null };
      }
      if (state.table === 'class_levels' && state.terminal === 'maybeSingle') {
        return { data: null, error: null };
      }
      if (state.table === 'class_levels' && state.insert) {
        return {
          data: {
            id: 'lvl-pp2',
            category_id: state.insert.category_id,
            level_number: 0,
            name: 'PP2',
            sort_order: 0,
          },
          error: null,
        };
      }
      if (state.table === 'institutions') {
        return { data: { name: 'Test Academy' }, error: null };
      }
      if (state.table === 'institution_categories') {
        return { data: [], error: null };
      }
      if (state.table === 'classes' && state.insert) {
        createdClassPayload = state.insert;
        return {
          data: {
            id: 'class-pp2-single',
            ...state.insert,
          },
          error: null,
        };
      }
      if (state.table === 'classes') {
        return { data: [], error: null };
      }
      return { data: null, error: null };
    })
  );

  const req = {
    institution_id: 'inst-1',
    body: {
      level_number: 0,
      as_single_class: true,
      capacity: 25,
    },
  };
  const res = createRes();

  await controller.createClassDomainLevel(req, res);
  assert.equal(res.state.statusCode, 201);
  assert.equal(res.state.body.has_standalone_class, true);
  assert.ok(createdClassPayload);
  assert.equal(createdClassPayload.grade_level, 0);
  assert.equal(createdClassPayload.class_type, 'PP2');
  assert.equal(createdClassPayload.capacity, 25);
});

test('autoAssignStudents: handles Early Years levels by string or number', async () => {
  let capturedGradeFilter = null;

  const controller = loadControllerWithSupabaseMock(
    createSupabaseMock((state) => {
      if (state.table === 'institutions') return { data: { name: 'Test' }, error: null };
      if (state.table === 'institution_categories') return { data: [], error: null };
      if (state.table === 'classes') {
        // Record which grade_level was queried
        const gradeFilter = state.filters.find((f) => f.column === 'grade_level');
        if (gradeFilter) capturedGradeFilter = gradeFilter.value;

        return {
          data: [
            { id: 'c-1', institution_id: 'inst-1', grade_level: gradeFilter?.value, stream: 'East', capacity: 30 },
          ],
          error: null,
        };
      }
      if (state.table === 'class_enrollments') {
        return { count: 5, data: [], error: null };
      }
      if (state.table === 'students') {
        return { data: [], error: null }; // No unassigned students, fast completion
      }
      return { data: null, error: null };
    })
  );

  // String "PP1"
  const reqStr = { institution_id: 'inst-1', body: { grade_level: 'PP1' } };
  const resStr = createRes();
  await controller.autoAssignStudents(reqStr, resStr);
  assert.equal(resStr.state.statusCode, 200);
  assert.equal(capturedGradeFilter, -1);

  // String "PP2"
  const reqPP2 = { institution_id: 'inst-1', body: { grade_level: 'PP2' } };
  const resPP2 = createRes();
  await controller.autoAssignStudents(reqPP2, resPP2);
  assert.equal(resPP2.state.statusCode, 200);
  assert.equal(capturedGradeFilter, 0);

  // Numeric 0 (PP2)
  const reqZero = { institution_id: 'inst-1', body: { grade_level: 0 } };
  const resZero = createRes();
  await controller.autoAssignStudents(reqZero, resZero);
  assert.equal(resZero.state.statusCode, 200);
  assert.equal(capturedGradeFilter, 0);

  // String "Playgroup"
  const reqPG = { institution_id: 'inst-1', body: { grade_level: 'Playgroup' } };
  const resPG = createRes();
  await controller.autoAssignStudents(reqPG, resPG);
  assert.equal(resPG.state.statusCode, 200);
  assert.equal(capturedGradeFilter, -2);
});
