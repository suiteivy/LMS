const test = require('node:test');
const assert = require('node:assert/strict');

const { formatClassLabel } = require('../utils/classLabel');
const contentController = require('../controllers/curriculumContent.controller');
const evidenceController = require('../controllers/evidenceAssessment.controller');
const trackController = require('../controllers/track.controller');
const checkpointController = require('../controllers/nationalCheckpoint.controller');

function createMockRes() {
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

test('formatClassLabel maps CBC bands and legacy forms correctly', () => {
  // Direct Grade and CBC band
  assert.equal(formatClassLabel({ grade_level: 4, stream: 'Blue' }), 'Grade 4 Blue');
  assert.equal(formatClassLabel({ cbc_band: 'pre_primary', grade_level: 1, stream: 'PP1' }), 'Grade 1 PP1');
  assert.equal(formatClassLabel({ class_type: 'Grade', grade_level: 7, stream: 'East' }), 'Grade 7 East');
  
  // Legacy Form 1-4 migration to Grade 9-12
  assert.equal(formatClassLabel({ form_level: 1, stream: 'Alpha' }), 'Grade 9 Alpha');
  assert.equal(formatClassLabel({ form_level: 4, stream: 'Simba' }), 'Grade 12 Simba');
});

test('evidenceAssessment controller validates 4 descriptor levels', async () => {
  const req = {
    institution_id: 'inst-1',
    user: { id: 'usr-1', institution_id: 'inst-1', role: 'teacher' },
    body: {
      student_id: 'stu-123',
      subject_id: 'sub-123',
      topic_area_id: 'ta-123',
      descriptor: 'invalid_descriptor',
      evidence_type: 'observation'
    }
  };
  const res = createMockRes();
  await evidenceController.recordEvidenceEntry(req, res);
  assert.equal(res.state.statusCode, 400);
  assert.match(res.state.body.error, /Invalid descriptor/i);
});

test('curriculumContent controller rejects topic area without title', async () => {
  const req = {
    params: { subjectId: 'sub-123' },
    body: { description: 'missing name' },
    institution_id: 'inst-1',
    user: { id: 'usr-1', institution_id: 'inst-1', role: 'admin' }
  };
  const res = createMockRes();
  await contentController.createTopicArea(req, res);
  assert.equal(res.state.statusCode, 400);
  assert.match(res.state.body.error, /Topic Area name/i);
});

test('track controller reports has_senior_secondary in response', async () => {
  const req = {
    user: { id: 'usr-admin', institution_id: 'inst-primary', role: 'admin' }
  };
  const res = createMockRes();
  await trackController.getTracks(req, res);
  assert.equal(res.state.statusCode, 200);
  assert.equal(typeof res.state.body.has_senior_secondary, 'boolean');
});

test('nationalCheckpoint controller verifies allowed checkpoints structure', async () => {
  const req = {
    params: { studentId: 'stu-1' },
    user: { id: 'usr-admin', institution_id: 'inst-all', role: 'admin' }
  };
  const res = createMockRes();
  await checkpointController.getStudentCheckpoints(req, res);
  assert.equal(res.state.statusCode, 200);
  assert.ok(Array.isArray(res.state.body.allowed_checkpoints));
  assert.ok(Array.isArray(res.state.body.data));
});
