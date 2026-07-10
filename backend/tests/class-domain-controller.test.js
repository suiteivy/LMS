const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

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

function hasFilter(state, op, column, value) {
  return state.filters.some(
    (f) => f.op === op && f.column === column && JSON.stringify(f.value) === JSON.stringify(value),
  );
}

test('getClassDomainCatalog returns 503 when domain tables unavailable', async () => {
  const supabase = createSupabaseMock((state) => {
    if (state.table === 'institution_categories' && state.select?.columns === 'category_id') {
      return { data: [], error: null };
    }

    if (state.table === 'class_categories' && state.select?.columns === 'id' && state.limit === 1) {
      return { data: null, error: { code: '42P01', message: 'relation does not exist' } };
    }
    throw new Error(`Unexpected query: ${JSON.stringify(state)}`);
  });

  const controller = loadControllerWithSupabaseMock(supabase);
  const req = { institution_id: 'inst-1' };
  const res = createRes();

  await controller.getClassDomainCatalog(req, res);

  assert.equal(res.state.statusCode, 503);
  assert.deepEqual(res.state.body, { error: 'Class domain tables are not available yet' });
});

test('archiveClassDomainStream rejects when stream is referenced by classes', async () => {
  const supabase = createSupabaseMock((state) => {
    if (state.table === 'classes' && state.select?.options?.head === true) {
      return { data: null, count: 2, error: null };
    }
    throw new Error(`Unexpected query: ${JSON.stringify(state)}`);
  });

  const controller = loadControllerWithSupabaseMock(supabase);
  const req = { institution_id: 'inst-1', params: { id: 'stream-1' } };
  const res = createRes();

  await controller.archiveClassDomainStream(req, res);

  assert.equal(res.state.statusCode, 400);
  assert.deepEqual(res.state.body, { error: 'Cannot archive stream that is referenced by classes' });
});

test('createClass resolves level_id to legacy level fields and persists domain ids', async () => {
  let insertedClass = null;

  const supabase = createSupabaseMock((state) => {
    if (state.table === 'classes' && state.select?.columns === 'class_type' && state.limit === 1) {
      return { data: null, error: { code: '42703', message: 'column class_type does not exist' } };
    }

    if (state.table === 'institutions') {
      return {
        data: { name: 'North Campus' },
        error: null,
      };
    }

    if (state.table === 'institution_categories') {
      return { data: [], error: null };
    }

    if (state.table === 'class_categories' && state.select?.columns === 'id' && state.limit === 1) {
      return { data: [{ id: 'cat-seed' }], error: null };
    }

    if (state.table === 'class_levels') {
      return {
        data: {
          id: 'lvl-3',
          category_id: 'cat-1',
          level_number: 3,
          type_id: null,
          category_types: null,
        },
        error: null,
      };
    }

    if (state.table === 'class_categories' && state.terminal === 'single' && state.limit === undefined) {
      return { data: { id: 'cat-1' }, error: null };
    }

    if (state.table === 'classes' && state.insert) {
      insertedClass = state.insert;
      return {
        data: {
          id: 'class-1',
          institution_id: state.insert.institution_id,
          category_id: state.insert.category_id,
          level_id: state.insert.level_id,
          stream_id: state.insert.stream_id || null,
          grade_level: state.insert.grade_level,
          form_level: state.insert.form_level || null,
          stream: state.insert.stream || null,
          teacher_id: state.insert.teacher_id,
          display_name: null,
        },
        error: null,
      };
    }

    throw new Error(`Unexpected query: ${JSON.stringify(state)}`);
  });

  const controller = loadControllerWithSupabaseMock(supabase);
  const req = {
    institution_id: 'inst-1',
    body: {
      level_id: 'lvl-3',
      teacher_id: 'teacher-7',
    },
  };
  const res = createRes();

  await controller.createClass(req, res);

  assert.equal(res.state.statusCode, 201);
  assert.deepEqual(insertedClass, {
    institution_id: 'inst-1',
    category_id: 'cat-1',
    level_id: 'lvl-3',
    stream_id: null,
    grade_level: 3,
    teacher_id: 'teacher-7',
  });
  assert.equal(res.state.body.level_id, 'lvl-3');
  assert.equal(res.state.body.category_id, 'cat-1');
  assert.equal(res.state.body.grade_level, 3);
  assert.equal(res.state.body.name, 'Grade 3');
});

test('archiveClassDomainCategory rejects when category levels are referenced by classes', async () => {
  const supabase = createSupabaseMock((state) => {
    if (state.table === 'class_levels' && state.select?.columns === 'id') {
      return { data: [{ id: 'lvl-1' }, { id: 'lvl-2' }], error: null };
    }

    if (state.table === 'classes' && state.select?.options?.head === true && hasFilter(state, 'in', 'level_id', ['lvl-1', 'lvl-2'])) {
      return { data: null, count: 1, error: null };
    }

    throw new Error(`Unexpected query: ${JSON.stringify(state)}`);
  });

  const controller = loadControllerWithSupabaseMock(supabase);
  const req = { institution_id: 'inst-1', params: { id: 'cat-1' } };
  const res = createRes();

  await controller.archiveClassDomainCategory(req, res);

  assert.equal(res.state.statusCode, 400);
  assert.deepEqual(res.state.body, { error: 'Cannot archive category that is referenced by classes' });
});

test('archiveClassDomainLevel rejects when level is referenced by classes', async () => {
  const supabase = createSupabaseMock((state) => {
    if (state.table === 'classes' && state.select?.options?.head === true && hasFilter(state, 'eq', 'level_id', 'lvl-9')) {
      return { data: null, count: 3, error: null };
    }

    throw new Error(`Unexpected query: ${JSON.stringify(state)}`);
  });

  const controller = loadControllerWithSupabaseMock(supabase);
  const req = { institution_id: 'inst-1', params: { id: 'lvl-9' } };
  const res = createRes();

  await controller.archiveClassDomainLevel(req, res);

  assert.equal(res.state.statusCode, 400);
  assert.deepEqual(res.state.body, { error: 'Cannot archive level that is referenced by classes' });
});

test('updateClass resolves domain IDs and legacy fields via level_id', async () => {
  let updatePayload = null;

  const supabase = createSupabaseMock((state) => {
    if (state.table === 'classes' && state.select?.columns === 'class_type' && state.limit === 1) {
      return { data: null, error: { code: '42703', message: 'column class_type does not exist' } };
    }

    if (state.table === 'classes' && state.select?.columns?.includes('institution_id') && state.update === undefined) {
      return {
        data: {
          id: 'class-44',
          institution_id: 'inst-1',
          grade_level: 2,
          form_level: null,
          category_id: null,
          level_id: null,
          stream_id: null,
        },
        error: null,
      };
    }

    if (state.table === 'institutions') {
      return {
        data: { name: 'North Campus' },
        error: null,
      };
    }

    if (state.table === 'institution_categories') {
      return { data: [], error: null };
    }

    if (state.table === 'class_categories' && state.select?.columns === 'id' && state.limit === 1) {
      return { data: [{ id: 'cat-seed' }], error: null };
    }

    if (state.table === 'class_levels' && state.select?.columns === 'id, category_id, level_number, type_id, category_types:type_id(name)') {
      return {
        data: {
          id: 'lvl-4',
          category_id: 'cat-4',
          level_number: 4,
          type_id: null,
          category_types: null,
        },
        error: null,
      };
    }

    if (state.table === 'class_categories' && state.select?.columns === 'id' && state.terminal === 'single' && state.limit === undefined && hasFilter(state, 'eq', 'id', 'cat-4')) {
      return { data: { id: 'cat-4' }, error: null };
    }

    if (state.table === 'classes' && state.update) {
      updatePayload = state.update;
      return {
        data: {
          id: 'class-44',
          institution_id: 'inst-1',
          category_id: state.update.category_id,
          level_id: state.update.level_id,
          stream_id: state.update.stream_id,
          grade_level: state.update.grade_level,
          form_level: state.update.form_level,
          stream: state.update.stream,
          display_name: null,
        },
        error: null,
      };
    }

    throw new Error(`Unexpected query: ${JSON.stringify(state)}`);
  });

  const controller = loadControllerWithSupabaseMock(supabase);
  const req = {
    params: { id: 'class-44' },
    body: {
      level_id: 'lvl-4',
    },
  };
  const res = createRes();

  await controller.updateClass(req, res);

  assert.equal(res.state.statusCode, 200);
  assert.deepEqual(updatePayload, {
    category_id: 'cat-4',
    level_id: 'lvl-4',
    stream_id: null,
    grade_level: 4,
    form_level: null,
    stream: null,
  });
  assert.equal(res.state.body.level_id, 'lvl-4');
  assert.equal(res.state.body.category_id, 'cat-4');
  assert.equal(res.state.body.grade_level, 4);
  assert.equal(res.state.body.name, 'Grade 4');
});
