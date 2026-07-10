/* eslint-disable no-console */
const process = require('node:process');
const fetch = global.fetch;

if (!fetch) {
  console.error('Global fetch is not available in this Node runtime.');
  process.exit(1);
}

const BASE_URL = process.env.HOURS_VERIFY_BASE_URL || 'http://localhost:4001';

const TOKENS = {
  admin: process.env.HOURS_TOKEN_ADMIN || '',
  teacher: process.env.HOURS_TOKEN_TEACHER || '',
  student: process.env.HOURS_TOKEN_STUDENT || '',
  parent: process.env.HOURS_TOKEN_PARENT || '',
};

const IDS = {
  teacherId: process.env.HOURS_TEACHER_ID || '',
  studentId: process.env.HOURS_STUDENT_ID || '',
  linkedStudentId: process.env.HOURS_PARENT_LINKED_STUDENT_ID || '',
  unlinkedStudentId: process.env.HOURS_PARENT_UNLINKED_STUDENT_ID || '',
};

const EXPECT = {
  date: process.env.HOURS_RECOMPUTE_DATE || new Date(Date.now() - 86400000).toISOString().split('T')[0],
};

const request = async ({ method = 'GET', path, token, body }) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try { payload = await res.json(); } catch (_e) { payload = null; }

  return { status: res.status, ok: res.ok, payload };
};

const assertStatus = (label, got, expected) => {
  const pass = Array.isArray(expected) ? expected.includes(got) : got === expected;
  console.log(`${pass ? 'PASS' : 'FAIL'} :: ${label} -> status=${got} expected=${Array.isArray(expected) ? expected.join('/') : expected}`);
  return pass;
};

const run = async () => {
  const results = [];

  if (TOKENS.admin) {
    const recompute = await request({
      method: 'POST',
      path: '/api/hours/recompute',
      token: TOKENS.admin,
      body: { date: EXPECT.date },
    });
    results.push(assertStatus('admin recompute', recompute.status, [200]));
  }

  if (TOKENS.teacher) {
    const me = await request({ path: '/api/hours/me', token: TOKENS.teacher });
    results.push(assertStatus('teacher /me', me.status, [200]));

    if (IDS.teacherId) {
      const own = await request({ path: `/api/hours/teachers/${IDS.teacherId}`, token: TOKENS.teacher });
      results.push(assertStatus('teacher own teacherId', own.status, [200]));
    }
  }

  if (TOKENS.student) {
    const me = await request({ path: '/api/hours/me', token: TOKENS.student });
    results.push(assertStatus('student /me', me.status, [200]));

    if (IDS.studentId) {
      const own = await request({ path: `/api/hours/students/${IDS.studentId}`, token: TOKENS.student });
      results.push(assertStatus('student own studentId', own.status, [200]));
    }
  }

  if (TOKENS.parent) {
    if (IDS.linkedStudentId) {
      const linked = await request({ path: `/api/hours/students/${IDS.linkedStudentId}`, token: TOKENS.parent });
      results.push(assertStatus('parent linked student', linked.status, [200]));
    }

    if (IDS.unlinkedStudentId) {
      const unlinked = await request({ path: `/api/hours/students/${IDS.unlinkedStudentId}`, token: TOKENS.parent });
      results.push(assertStatus('parent unlinked student blocked', unlinked.status, [403]));
    }
  }

  const failed = results.some((r) => !r);
  if (failed) {
    console.error('Hours endpoint verification finished with failures.');
    process.exit(2);
  }
  console.log('Hours endpoint verification passed.');
};

run().catch((err) => {
  console.error('Verification script crashed:', err?.message || err);
  process.exit(1);
});
