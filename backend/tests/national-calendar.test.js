const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const supabaseModulePath = path.resolve(__dirname, '../utils/supabaseClient.js');
const auditLoggerModulePath = path.resolve(__dirname, '../utils/auditLogger.js');
const loggerModulePath = path.resolve(__dirname, '../utils/logger.js');
const outboxServiceModulePath = path.resolve(__dirname, '../services/outbox.service.js');
const retryModulePath = path.resolve(__dirname, '../utils/supabaseRetry.js');

function loadWithMocks(moduleRelativePath, mockSupabase) {
  const targetModulePath = path.resolve(__dirname, moduleRelativePath);
  // Clear caches for the module chain
  [targetModulePath, supabaseModulePath].forEach((p) => delete require.cache[p]);

  // Also clear holiday.service.js from cache when testing calendar controller
  const holidayServicePath = path.resolve(__dirname, '../services/holiday.service.js');
  delete require.cache[holidayServicePath];

  require.cache[supabaseModulePath] = {
    id: supabaseModulePath,
    filename: supabaseModulePath,
    loaded: true,
    exports: mockSupabase,
  };

  // Stub auditLogger
  if (!require.cache[auditLoggerModulePath]) {
    require.cache[auditLoggerModulePath] = {
      id: auditLoggerModulePath,
      filename: auditLoggerModulePath,
      loaded: true,
      exports: {
        logRecordChange: async () => {},
      },
    };
  }

  // Stub logger
  if (!require.cache[loggerModulePath]) {
    require.cache[loggerModulePath] = {
      id: loggerModulePath,
      filename: loggerModulePath,
      loaded: true,
      exports: {
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
        throttle: () => {},
      },
    };
  }

  // Stub outbox service
  if (!require.cache[outboxServiceModulePath]) {
    require.cache[outboxServiceModulePath] = {
      id: outboxServiceModulePath,
      filename: outboxServiceModulePath,
      loaded: true,
      exports: {
        enqueueOutboxNotification: async () => {},
        enqueue: async () => {},
      },
    };
  }

  // Stub supabaseRetry
  if (!require.cache[retryModulePath]) {
    require.cache[retryModulePath] = {
      id: retryModulePath,
      filename: retryModulePath,
      loaded: true,
      exports: {
        withSupabaseRetry: async (fn) => fn(),
        isTransientSupabaseError: () => false,
      },
    };
  }

  return require(targetModulePath);
}

function createRes() {
  let statusCode = 200;
  let payload = null;
  return {
    get statusCode() { return statusCode; },
    get payload() { return payload; },
    status(code) { statusCode = code; return this; },
    json(body) { payload = body; return this; },
  };
}

// ============================================================
// Holiday Service Unit Tests
// ============================================================

test('National Calendar - Holiday Service', async (t) => {
  await t.test('EAST_AFRICAN_COUNTRIES has all 8 countries', () => {
    const holidayService = loadWithMocks('../services/holiday.service.js', {
      from: () => ({ select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }) }),
    });
    assert.equal(holidayService.EAST_AFRICAN_COUNTRIES.length, 8);
    const codes = holidayService.EAST_AFRICAN_COUNTRIES.map(c => c.code);
    for (const expected of ['KE', 'UG', 'TZ', 'RW', 'BI', 'SS', 'ET', 'SO']) {
      assert.ok(codes.includes(expected), `Missing country code: ${expected}`);
    }
  });

  await t.test('VALID_COUNTRY_CODES validates correctly', () => {
    const holidayService = loadWithMocks('../services/holiday.service.js', {
      from: () => ({ select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }) }),
    });
    assert.ok(holidayService.VALID_COUNTRY_CODES.has('KE'));
    assert.ok(holidayService.VALID_COUNTRY_CODES.has('UG'));
    assert.ok(!holidayService.VALID_COUNTRY_CODES.has('US'));
    assert.ok(!holidayService.VALID_COUNTRY_CODES.has(''));
  });

  await t.test('REFERENCE_HOLIDAYS contains entries for all 8 countries', () => {
    const holidayService = loadWithMocks('../services/holiday.service.js', {
      from: () => ({ select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }) }),
    });

    const countryCodes = new Set(holidayService.REFERENCE_HOLIDAYS.map(h => h.country_code));
    for (const expected of ['KE', 'UG', 'TZ', 'RW', 'BI', 'SS', 'ET', 'SO']) {
      assert.ok(countryCodes.has(expected), `No holidays for: ${expected}`);
    }
    // Every entry has required fields
    for (const h of holidayService.REFERENCE_HOLIDAYS) {
      assert.ok(h.country_code, 'Missing country_code');
      assert.ok(h.holiday_date, 'Missing holiday_date');
      assert.ok(h.name, 'Missing name');
      assert.ok(h.type, 'Missing type');
      assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(h.holiday_date), `Invalid date format: ${h.holiday_date}`);
    }
  });

  await t.test('getHolidaysForInstitution returns holidays with default pending decisions', async () => {
    const mockHolidays = [
      { id: 'nh-1', country_code: 'KE', holiday_date: '2026-06-01', name: 'Madaraka Day', type: 'public', is_provisional: false },
      { id: 'nh-2', country_code: 'KE', holiday_date: '2026-12-25', name: 'Christmas Day', type: 'public', is_provisional: false },
    ];

    const mockSupabase = {
      from(table) {
        if (table === 'institutions') {
          return {
            select() { return this; },
            eq() { return this; },
            single: async () => ({ data: { country: 'KE' }, error: null }),
          };
        }
        if (table === 'national_holidays') {
          return {
            select() { return this; },
            eq() { return this; },
            order: async () => ({ data: mockHolidays, error: null }),
            upsert: async () => ({ error: null }),
          };
        }
        if (table === 'institution_holiday_decisions') {
          return {
            select() { return this; },
            eq() { return this; },
            then: undefined,
          };
        }
        return { select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }) };
      },
    };

    // Mock the decisions query properly
    mockSupabase.from = function (table) {
      if (table === 'institutions') {
        return {
          select() { return this; },
          eq() { return this; },
          single: async () => ({ data: { country: 'KE' }, error: null }),
        };
      }
      if (table === 'national_holidays') {
        return {
          select() { return this; },
          eq() { return this; },
          order: async () => ({ data: mockHolidays, error: null }),
          upsert: async () => ({ error: null }),
        };
      }
      if (table === 'institution_holiday_decisions') {
        return {
          select() { return this; },
          eq() {
            return {
              eq: async () => ({ data: [], error: null }),
              select() { return this; },
            };
          },
        };
      }
      return { select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }) };
    };

    const holidayService = loadWithMocks('../services/holiday.service.js', mockSupabase);
    const result = await holidayService.getHolidaysForInstitution('inst-1');

    assert.ok(Array.isArray(result));
    assert.equal(result.length, 2);
    assert.equal(result[0].name, 'Madaraka Day');
    assert.equal(result[0].decision, 'pending');
    assert.equal(result[0].cancels_classes, false);
    assert.equal(result[0].is_pending_decision, true);
    assert.equal(result[1].name, 'Christmas Day');
  });

  await t.test('setHolidayDecision rejects invalid decision values', async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'nh-1' }, error: null }) }) }),
      }),
    };

    const holidayService = loadWithMocks('../services/holiday.service.js', mockSupabase);

    await assert.rejects(
      () => holidayService.setHolidayDecision('inst-1', 'nh-1', 'invalid_value'),
      { message: "Invalid decision. Must be 'pending', 'cancel_classes', or 'run_classes'." }
    );
  });

  await t.test('syncHolidaysForInstitution rejects invalid country code', async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: { country: 'KE' }, error: null }) }) }),
      }),
    };

    const holidayService = loadWithMocks('../services/holiday.service.js', mockSupabase);

    await assert.rejects(
      () => holidayService.syncHolidaysForInstitution('inst-1', 'ZZ'),
      (err) => err.message.includes('Invalid country code')
    );
  });

  await t.test('getInstitutionCountry defaults to KE when no country set', async () => {
    const mockSupabase = {
      from(table) {
        if (table === 'institutions') {
          return {
            select() { return this; },
            eq() { return this; },
            single: async () => ({ data: { country: null }, error: null }),
          };
        }
        return { select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }) };
      },
    };

    const holidayService = loadWithMocks('../services/holiday.service.js', mockSupabase);
    const result = await holidayService.getInstitutionCountry('inst-1');
    assert.equal(result, 'KE');
  });

  await t.test('getInstitutionCountry returns configured country', async () => {
    const mockSupabase = {
      from(table) {
        if (table === 'institutions') {
          return {
            select() { return this; },
            eq() { return this; },
            single: async () => ({ data: { country: 'UG' }, error: null }),
          };
        }
        return { select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }) };
      },
    };

    const holidayService = loadWithMocks('../services/holiday.service.js', mockSupabase);
    const result = await holidayService.getInstitutionCountry('inst-1');
    assert.equal(result, 'UG');
  });
});

// ============================================================
// Calendar Controller - National Holidays Endpoint Tests
// ============================================================

test('National Calendar - Calendar Controller Endpoints', async (t) => {
  await t.test('getNationalHolidays returns 400 without institution context', async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }),
      }),
    };

    const controller = loadWithMocks('../controllers/calendar.controller.js', mockSupabase);
    const res = createRes();

    await controller.getNationalHolidays(
      { institution_id: null, query: {} },
      res
    );

    assert.equal(res.statusCode, 400);
    assert.ok(res.payload.error.includes('Institution context missing'));
  });

  await t.test('syncNationalHolidays returns 403 for non-admin', async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }),
      }),
    };

    const controller = loadWithMocks('../controllers/calendar.controller.js', mockSupabase);
    const res = createRes();

    await controller.syncNationalHolidays(
      { institution_id: 'inst-1', userRole: 'teacher', userId: 'u-1', body: {} },
      res
    );

    assert.equal(res.statusCode, 403);
    assert.ok(res.payload.error.includes('Only administrators'));
  });

  await t.test('setHolidayDecision returns 403 for non-admin', async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }),
      }),
    };

    const controller = loadWithMocks('../controllers/calendar.controller.js', mockSupabase);
    const res = createRes();

    await controller.setHolidayDecision(
      { institution_id: 'inst-1', userRole: 'student', userId: 'u-1', params: { id: 'nh-1' }, body: { decision: 'cancel_classes' } },
      res
    );

    assert.equal(res.statusCode, 403);
    assert.ok(res.payload.error.includes('Only administrators'));
  });

  await t.test('setHolidayDecision returns 400 for invalid decision', async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }),
      }),
    };

    const controller = loadWithMocks('../controllers/calendar.controller.js', mockSupabase);
    const res = createRes();

    await controller.setHolidayDecision(
      { institution_id: 'inst-1', userRole: 'admin', userId: 'u-1', params: { id: 'nh-1' }, body: { decision: 'skip_school' } },
      res
    );

    assert.equal(res.statusCode, 400);
    assert.ok(res.payload.error.includes('Invalid decision'));
  });

  await t.test('setHolidayDecision returns 400 when no holiday ID provided', async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }),
      }),
    };

    const controller = loadWithMocks('../controllers/calendar.controller.js', mockSupabase);
    const res = createRes();

    await controller.setHolidayDecision(
      { institution_id: 'inst-1', userRole: 'admin', userId: 'u-1', params: {}, body: { decision: 'cancel_classes' } },
      res
    );

    assert.equal(res.statusCode, 400);
    assert.ok(res.payload.error.includes('National holiday ID is required'));
  });

  await t.test('syncNationalHolidays returns 400 for invalid country_code', async () => {
    // Use a mock where getInstitutionCountry works but syncHolidaysForInstitution throws on bad country
    const mockSupabase = {
      from(table) {
        if (table === 'institutions') {
          return {
            select() { return this; },
            eq() { return this; },
            single: async () => ({ data: { country: 'KE' }, error: null }),
            update() {
              return { eq: async () => ({ error: null }) };
            },
          };
        }
        return {
          select() { return this; },
          eq() { return this; },
          order: async () => ({ data: [], error: null }),
          upsert: async () => ({ error: null }),
        };
      },
    };

    const controller = loadWithMocks('../controllers/calendar.controller.js', mockSupabase);
    const res = createRes();

    await controller.syncNationalHolidays(
      { institution_id: 'inst-1', userRole: 'admin', userId: 'u-1', body: { country_code: 'ZZ' } },
      res
    );

    assert.equal(res.statusCode, 400);
    assert.ok(res.payload.error.includes('Invalid country'));
  });
});

// ============================================================
// Institution Controller - Country field in updateInstitution
// ============================================================

test('National Calendar - Institution Country Update', async (t) => {
  await t.test('updateInstitution accepts valid country code', async () => {
    const updatedInstitution = { id: 'inst-1', name: 'Test School', country: 'UG' };

    const mockSupabase = {
      from(table) {
        if (table === 'institutions') {
          return {
            update() {
              return {
                eq() {
                  return {
                    select() {
                      return {
                        single: async () => ({ data: updatedInstitution, error: null }),
                      };
                    },
                  };
                },
              };
            },
            select() { return this; },
            eq() { return this; },
          };
        }
        if (table === 'institution_categories') {
          return {
            select() { return this; },
            eq() { return this; },
            in: async () => ({ data: [], error: null }),
          };
        }
        return { select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }) };
      },
    };

    // We need to also stub configCache
    const configCachePath = path.resolve(__dirname, '../utils/configCache.js');
    delete require.cache[configCachePath];
    require.cache[configCachePath] = {
      id: configCachePath,
      filename: configCachePath,
      loaded: true,
      exports: {
        get: () => null,
        set: () => {},
        invalidateInstitution: () => {},
        invalidateSettings: () => {},
      },
    };

    const controller = loadWithMocks('../controllers/institution.controller.js', mockSupabase);
    const res = createRes();

    await controller.updateInstitution(
      {
        institution_id: 'inst-1',
        userRole: 'admin',
        params: {},
        body: { country: 'UG' },
      },
      res
    );

    assert.equal(res.statusCode, 200);
    assert.ok(res.payload.institution);
    assert.equal(res.payload.institution.country, 'UG');
  });

  await t.test('updateInstitution rejects invalid country code', async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }),
      }),
    };

    const configCachePath = path.resolve(__dirname, '../utils/configCache.js');
    delete require.cache[configCachePath];
    require.cache[configCachePath] = {
      id: configCachePath,
      filename: configCachePath,
      loaded: true,
      exports: {
        get: () => null,
        set: () => {},
        invalidateInstitution: () => {},
        invalidateSettings: () => {},
      },
    };

    const controller = loadWithMocks('../controllers/institution.controller.js', mockSupabase);
    const res = createRes();

    await controller.updateInstitution(
      {
        institution_id: 'inst-1',
        userRole: 'admin',
        params: {},
        body: { country: 'ZZ' },
      },
      res
    );

    assert.equal(res.statusCode, 400);
    assert.ok(res.payload.error.includes('Invalid country code'));
  });
});
