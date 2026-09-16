const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const examsControllerPath = path.resolve(__dirname, '../controllers/exams.controller.js');
const teacherControllerPath = path.resolve(__dirname, '../controllers/teacher.controller.js');
const institutionControllerPath = path.resolve(__dirname, '../controllers/institution.controller.js');
const subjectControllerPath = path.resolve(__dirname, '../controllers/subject.controller.js');
const supabaseModulePath = path.resolve(__dirname, '../utils/supabaseClient.js');
const resolveActiveTermPath = path.resolve(__dirname, '../utils/resolveActiveTerm.js');

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

function loadModuleWithMocks(modulePath, mockSupabase, extraMocks = {}) {
    delete require.cache[modulePath];
    delete require.cache[supabaseModulePath];

    require.cache[supabaseModulePath] = {
        id: supabaseModulePath,
        filename: supabaseModulePath,
        loaded: true,
        exports: mockSupabase,
    };

    for (const [mPath, exportsVal] of Object.entries(extraMocks)) {
        delete require.cache[mPath];
        require.cache[mPath] = {
            id: mPath,
            filename: mPath,
            loaded: true,
            exports: exportsVal,
        };
    }

    return require(modulePath);
}

// ─────────────────────────────────────────────────────────────
// 1. Exam Periods & Exam Module Gating Tests
// ─────────────────────────────────────────────────────────────

test('createExamPeriod rejects when required fields are missing', async () => {
    const examsController = loadModuleWithMocks(examsControllerPath, {});
    const req = {
        institution_id: 'inst-1',
        userId: 'admin-1',
        userRole: 'admin',
        body: {
            name: 'Term 1 Midterm',
            // Missing start_date and end_date
        }
    };
    const res = createRes();
    await examsController.createExamPeriod(req, res);
    assert.equal(res.state.statusCode, 400);
    assert.match(res.state.body.error, /required/i);
});

test('createExamPeriod inserts valid exam period with default active status', async () => {
    let insertedRecord = null;
    const mockSupabase = {
        from(table) {
            assert.equal(table, 'exam_periods');
            return {
                insert(data) {
                    insertedRecord = data[0];
                    return {
                        select() {
                            return {
                                single: async () => ({
                                    data: { id: 'period-123', ...insertedRecord },
                                    error: null
                                })
                            };
                        }
                    };
                }
            };
        }
    };

    const examsController = loadModuleWithMocks(examsControllerPath, mockSupabase);
    const req = {
        institution_id: 'inst-test-1',
        userId: 'admin-1',
        userRole: 'admin',
        body: {
            name: 'Term 2 Finals 2026',
            academic_year: '2026',
            term: 'Term 2',
            start_date: '2026-07-01',
            end_date: '2026-07-15',
            default_submission_deadline: '2026-07-20T23:59:59Z',
            applicable_classes: ['Grade 7', 'Grade 8']
        }
    };
    const res = createRes();
    await examsController.createExamPeriod(req, res);

    assert.equal(res.state.statusCode, 201);
    assert.equal(insertedRecord.institution_id, 'inst-test-1');
    assert.equal(insertedRecord.name, 'Term 2 Finals 2026');
    assert.equal(insertedRecord.status, 'active');
    assert.equal(res.state.body.id, 'period-123');
});

test('createExam validates exam_period_id and inherits submission deadline', async () => {
    let insertedExam = null;
    const mockSupabase = {
        from(table) {
            if (table === 'exam_periods') {
                return {
                    select() {
                        return {
                            eq() {
                                return {
                                    eq() {
                                        return {
                                            maybeSingle: async () => ({
                                                data: {
                                                    id: 'period-active-1',
                                                    institution_id: 'inst-1',
                                                    status: 'active',
                                                    submission_deadline: '2026-08-01T23:59:59Z'
                                                },
                                                error: null
                                            })
                                        };
                                    }
                                };
                            }
                        };
                    }
                };
            }
            if (table === 'exams') {
                return {
                    insert(data) {
                        insertedExam = data[0];
                        return {
                            select() {
                                return {
                                    single: async () => ({
                                        data: { id: 'exam-new-1', ...insertedExam },
                                        error: null
                                    })
                                };
                            }
                        };
                    }
                };
            }
            throw new Error(`Unexpected table in createExam test: ${table}`);
        }
    };

    const extraMocks = {
        [resolveActiveTermPath]: {
            resolveActiveTerm: async () => ({ name: 'Term 2', academic_year: '2026' })
        }
    };

    const examsController = loadModuleWithMocks(examsControllerPath, mockSupabase, extraMocks);
    const req = {
        institution_id: 'inst-1',
        userId: 'admin-1',
        userRole: 'admin',
        body: {
            title: 'Form 2 Mathematics Paper 1',
            subject_id: 'sub-math-1',
            exam_period_id: 'period-active-1',
            academic_year: '2026',
            term: 'Term 2',
            date: '2026-07-05',
            max_score: 100
        }
    };
    const res = createRes();
    await examsController.createExam(req, res);

    assert.equal(res.state.statusCode, 201);
    assert.equal(insertedExam.exam_period_id, 'period-active-1');
    assert.equal(insertedExam.submission_deadline, '2026-08-01T23:59:59Z');
});

test('deleteExamPeriod unlinks existing exams and removes period', async () => {
    let examsUnlinked = false;
    let periodDeleted = false;

    const mockSupabase = {
        from(table) {
            if (table === 'exams') {
                return {
                    update(data) {
                        assert.equal(data.exam_period_id, null);
                        return {
                            eq(field1, val1) {
                                assert.equal(field1, 'exam_period_id');
                                assert.equal(val1, 'period-del-1');
                                return {
                                    eq(field2, val2) {
                                        assert.equal(field2, 'institution_id');
                                        assert.equal(val2, 'inst-1');
                                        examsUnlinked = true;
                                        return Promise.resolve({ error: null });
                                    }
                                };
                            }
                        };
                    }
                };
            }
            if (table === 'exam_periods') {
                return {
                    delete() {
                        return {
                            eq(field1, val1) {
                                assert.equal(field1, 'id');
                                assert.equal(val1, 'period-del-1');
                                return {
                                    eq(field2, val2) {
                                        assert.equal(field2, 'institution_id');
                                        assert.equal(val2, 'inst-1');
                                        periodDeleted = true;
                                        return Promise.resolve({ error: null });
                                    }
                                };
                            }
                        };
                    }
                };
            }
            throw new Error(`Unexpected table: ${table}`);
        }
    };

    const examsController = loadModuleWithMocks(examsControllerPath, mockSupabase);
    const req = {
        institution_id: 'inst-1',
        userId: 'admin-1',
        userRole: 'admin',
        params: { id: 'period-del-1' }
    };
    const res = createRes();
    await examsController.deleteExamPeriod(req, res);

    assert.equal(res.state.statusCode, 200);
    assert.ok(examsUnlinked);
    assert.ok(periodDeleted);
});

// ─────────────────────────────────────────────────────────────
// 2. Coverage Planner Departmental Oversight
// ─────────────────────────────────────────────────────────────

test('getCoverageOversight aggregates departmental progress across subjects', async () => {
    const mockSubjects = [
        {
            id: 'sub-1',
            title: 'Mathematics',
            class_id: 'class-1',
            classes: { id: 'class-1', name: 'Grade 8 Alpha', grade_level: '8', form_level: null, stream: 'Alpha', class_type: 'Junior' },
            hod_teacher_id: 't-1',
            teachers: { id: 't-1', user_id: 'u-1', users: { full_name: 'Dr. John Doe', email: 'jdoe@test.com', avatar_url: null } }
        },
        {
            id: 'sub-2',
            title: 'English Language',
            class_id: 'class-2',
            classes: { id: 'class-2', name: 'Grade 8 Beta', grade_level: '8', form_level: null, stream: 'Beta', class_type: 'Junior' },
            hod_teacher_id: null,
            teachers: null
        }
    ];

    const mockPlans = [
        { id: 'plan-1', subject_id: 'sub-1', academic_year: '2026', term: 'Term 1', title: 'Algebra', status: 'approved' },
        { id: 'plan-2', subject_id: 'sub-1', academic_year: '2026', term: 'Term 1', title: 'Geometry', status: 'approved' }
    ];

    const mockRecords = [
        { id: 'rec-1', subject_id: 'sub-1', coverage_plan_id: 'plan-1', is_completed: true, status: 'completed', created_at: '2026-06-01' }
    ];

    const mockSupabase = {
        from(table) {
            if (table === 'subjects') {
                return {
                    select() {
                        return {
                            eq: async () => ({ data: mockSubjects, error: null })
                        };
                    }
                };
            }
            if (table === 'subject_coverage_plans') {
                const chain = {
                    select() { return chain; },
                    eq() { return chain; },
                    in() { return chain; },
                    then(onResolve) {
                        return Promise.resolve({ data: mockPlans, error: null }).then(onResolve);
                    }
                };
                return chain;
            }
            if (table === 'record_of_work') {
                const chain = {
                    select() { return chain; },
                    eq() { return chain; },
                    in() { return chain; },
                    then(onResolve) {
                        return Promise.resolve({ data: mockRecords, error: null }).then(onResolve);
                    }
                };
                return chain;
            }
            throw new Error(`Unexpected table: ${table}`);
        }
    };

    const teacherController = loadModuleWithMocks(teacherControllerPath, mockSupabase);
    const req = {
        institution_id: 'inst-1',
        userId: 'admin-1',
        userRole: 'admin',
        query: { academic_year: '2026', term: 'Term 1' }
    };
    const res = createRes();
    await teacherController.getCoverageOversight(req, res);

    assert.equal(res.state.statusCode, 200);
    const { total_subjects, subjects_with_plans, total_topics_planned, total_completed, overall_coverage_rate, subjects } = res.state.body;
    assert.equal(total_subjects, 2);
    assert.equal(subjects_with_plans, 1);
    assert.equal(total_topics_planned, 2);
    assert.equal(total_completed, 1);
    assert.equal(overall_coverage_rate, 50);

    const math = subjects.find(s => s.subject_id === 'sub-1');
    assert.ok(math);
    assert.equal(math.has_plan, true);
    assert.equal(math.total_topics, 2);
    assert.equal(math.completed_topics, 1);
    assert.equal(math.completion_rate, 50);
    assert.equal(math.hod.name, 'Dr. John Doe');

    const eng = subjects.find(s => s.subject_id === 'sub-2');
    assert.ok(eng);
    assert.equal(eng.has_plan, false);
    assert.equal(eng.completion_rate, 0);
});

// ─────────────────────────────────────────────────────────────
// 3. Institution Currency Setup & Propagation
// ─────────────────────────────────────────────────────────────

test('updateInstitution saves currency_id to institutions record', async () => {
    let updatedPayload = null;
    const mockSupabase = {
        from(table) {
            if (table === 'institutions') {
                return {
                    update(data) {
                        updatedPayload = data;
                        return {
                            eq() {
                                return {
                                    select() {
                                        return {
                                            single: async () => ({
                                                data: { id: 'inst-1', name: 'Alpha High', currency_id: data.currency_id },
                                                error: null
                                            })
                                        };
                                    }
                                };
                            }
                        };
                    }
                };
            }
            if (table === 'institution_categories') {
                return {
                    select() {
                        return {
                            in: async () => ({ data: [], error: null })
                        };
                    }
                };
            }
            throw new Error(`Unexpected table: ${table}`);
        }
    };

    const instController = loadModuleWithMocks(institutionControllerPath, mockSupabase);
    const req = {
        institution_id: 'inst-1',
        userId: 'admin-1',
        userRole: 'admin',
        params: {},
        body: {
            currency_id: 'curr-kes-uuid'
        }
    };
    const res = createRes();
    await instController.updateInstitution(req, res);

    assert.equal(res.state.statusCode, 200);
    assert.equal(updatedPayload.currency_id, 'curr-kes-uuid');
    assert.equal(res.state.body.institution.currency_id, 'curr-kes-uuid');
});

// ─────────────────────────────────────────────────────────────
// 4. HOD Assignment & Role Management Integration
// ─────────────────────────────────────────────────────────────

test('updateSubject sets hod_teacher_id and marks is_hod in subject_teachers', async () => {
    let subjectUpdated = null;
    let hodFlagCleared = false;
    let hodFlagAssigned = false;

    const mockSupabase = {
        from(table) {
            if (table === 'teachers') {
                return {
                    select() {
                        return {
                            eq() {
                                return {
                                    eq() {
                                        return {
                                            single: async () => ({
                                                data: { id: 'teacher-hod-1', institution_id: 'inst-1' },
                                                error: null
                                            })
                                        };
                                    }
                                };
                            }
                        };
                    }
                };
            }
            if (table === 'subjects') {
                return {
                    select() {
                        return {
                            eq() {
                                return {
                                    eq() {
                                        return {
                                            single: async () => ({
                                                data: {
                                                    id: 'sub-math-1',
                                                    title: 'Mathematics',
                                                    teacher_id: null,
                                                    hod_teacher_id: null,
                                                    institution_id: 'inst-1'
                                                },
                                                error: null
                                            })
                                        };
                                    }
                                };
                            }
                        };
                    },
                    update(data) {
                        subjectUpdated = data;
                        return {
                            eq() {
                                return {
                                    eq: async () => ({ error: null })
                                };
                            }
                        };
                    }
                };
            }
            if (table === 'subject_teachers') {
                return {
                    update(data) {
                        if (data.is_hod === false) hodFlagCleared = true;
                        if (data.is_hod === true) hodFlagAssigned = true;
                        return {
                            eq() {
                                return {
                                    eq: async () => ({ error: null })
                                };
                            }
                        };
                    },
                    select() {
                        return {
                            eq() {
                                return {
                                    eq() {
                                        return {
                                            maybeSingle: async () => ({
                                                data: { id: 'st-link-1' },
                                                error: null
                                            }),
                                            // for getSubjectById:
                                            then(onResolve) {
                                                return Promise.resolve({ data: [], error: null }).then(onResolve);
                                            }
                                        };
                                    }
                                };
                            }
                        };
                    },
                    insert: async () => ({ error: null })
                };
            }
            if (table === 'subject_classes') {
                const chain = {
                    select() { return chain; },
                    eq() { return chain; },
                    in() { return chain; },
                    then(onResolve) {
                        return Promise.resolve({ data: [], error: null }).then(onResolve);
                    }
                };
                return chain;
            }
            throw new Error(`Unexpected table: ${table}`);
        }
    };

    const subjectController = loadModuleWithMocks(subjectControllerPath, mockSupabase);
    const req = {
        institution_id: 'inst-1',
        userId: 'admin-1',
        userRole: 'admin',
        params: { id: 'sub-math-1' },
        body: {
            hod_teacher_id: 'teacher-hod-1'
        }
    };
    const res = createRes();
    await subjectController.updateSubject(req, res);

    assert.equal(res.state.statusCode, 200);
    assert.equal(subjectUpdated.hod_teacher_id, 'teacher-hod-1');
    assert.ok(hodFlagCleared, 'Cleared old is_hod flags');
    assert.ok(hodFlagAssigned, 'Updated is_hod = true flag on assigned HOD');
});
