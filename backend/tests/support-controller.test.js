const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const supabaseModulePath = path.resolve(__dirname, '../utils/supabaseClient.js');
const notificationModulePath = path.resolve(__dirname, '../services/notificationDelivery.service.js');
const controllerPath = path.resolve(__dirname, '../controllers/support.controller.js');

function loadControllerWithMocks(mockSupabase, mockNotification = {}) {
  delete require.cache[controllerPath];
  delete require.cache[supabaseModulePath];
  delete require.cache[notificationModulePath];

  require.cache[supabaseModulePath] = {
    id: supabaseModulePath,
    filename: supabaseModulePath,
    loaded: true,
    exports: mockSupabase,
  };

  require.cache[notificationModulePath] = {
    id: notificationModulePath,
    filename: notificationModulePath,
    loaded: true,
    exports: {
      sendInAppNotificationWithHistory: async () => ({ success: true }),
      ...mockNotification,
    },
  };

  return require(controllerPath);
}

function createRes() {
  const res = {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };
  return res;
}

test('createTicket rejects missing or whitespace-only subject and description', async () => {
  const controller = loadControllerWithMocks({});
  const req = {
    userId: 'user-1',
    institution_id: 'inst-1',
    body: { subject: '   ', description: 'Valid description' },
  };
  const res = createRes();

  await controller.createTicket(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.error, 'Subject and Description are required');
});

test('createTicket trims inputs, inserts ticket, and returns dual payload format', async () => {
  let insertedData = null;
  const mockCreatedTicket = {
    id: 'ticket-123',
    user_id: 'user-1',
    institution_id: 'inst-1',
    subject: 'Issue with grading',
    description: 'Cannot enter marks for Form 2',
    category: 'academic',
    priority: 'normal',
    status: 'pending',
    created_at: '2026-09-11T10:00:00.000Z',
  };

  const mockSupabase = {
    from(table) {
      assert.equal(table, 'support_tickets');
      return {
        insert(rows) {
          insertedData = rows[0];
          return {
            select() {
              return {
                async single() {
                  return { data: mockCreatedTicket, error: null };
                },
              };
            },
          };
        },
      };
    },
  };

  let notificationCalled = false;
  const controller = loadControllerWithMocks(mockSupabase, {
    sendInAppNotificationWithHistory: async (payload) => {
      notificationCalled = true;
      assert.equal(payload.user_id, 'user-1');
      assert.equal(payload.data.support_ticket_id, 'ticket-123');
      return { success: true };
    },
  });

  const req = {
    userId: 'user-1',
    institution_id: 'inst-1',
    body: {
      subject: '  Issue with grading  ',
      description: '  Cannot enter marks for Form 2  ',
      category: 'academic',
      priority: 'normal',
    },
  };
  const res = createRes();

  await controller.createTicket(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(insertedData.subject, 'Issue with grading');
  assert.equal(insertedData.description, 'Cannot enter marks for Form 2');
  assert.ok(res.payload.ticket);
  assert.ok(res.payload.request);
  assert.equal(res.payload.ticket.id, 'ticket-123');
  assert.equal(res.payload.request.id, 'ticket-123');
  assert.equal(res.payload.ticket.workflow_status, 'pending');
  assert.equal(res.payload.ticket.can_edit, true);
  assert.equal(res.payload.ticket.can_delete, true);
  assert.equal(notificationCalled, true);
});

test('getMyTickets returns user tickets with workflow_status enrichment', async () => {
  const mockTickets = [
    {
      id: 't-1',
      user_id: 'user-1',
      status: 'pending',
      created_at: '2026-09-11T09:00:00.000Z',
    },
    {
      id: 't-2',
      user_id: 'user-1',
      status: 'open',
      created_at: '2026-09-11T08:00:00.000Z',
    },
  ];

  const mockSupabase = {
    from(table) {
      assert.equal(table, 'support_tickets');
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        order() {
          return Promise.resolve({ data: mockTickets, error: null });
        },
      };
    },
  };

  const controller = loadControllerWithMocks(mockSupabase);
  const req = { userId: 'user-1' };
  const res = createRes();

  await controller.getMyTickets(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.tickets.length, 2);
  assert.equal(res.payload.tickets[0].workflow_status, 'pending');
  assert.equal(res.payload.tickets[0].can_edit, true);
  assert.equal(res.payload.tickets[1].workflow_status, 'acknowledged');
  assert.equal(res.payload.tickets[1].can_edit, false);
});
