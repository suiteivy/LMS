const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const uploadService = require('../services/upload.service');

// Helper to mock res
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

// -----------------------------------------------------------------------------
// 1. Upload Service Whitelist, Video Blocking & Tenant Scoping Tests
// -----------------------------------------------------------------------------
test('Upload Service: Whitelist allows standard document extensions and MIME types', () => {
    const validDocs = [
        { name: 'syllabus.pdf', mime: 'application/pdf' },
        { name: 'exam_review.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
        { name: 'old_notes.doc', mime: 'application/msword' },
        { name: 'gradebook.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
        { name: 'budget.xls', mime: 'application/vnd.ms-excel' },
        { name: 'slides.pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
        { name: 'presentation.ppt', mime: 'application/vnd.ms-powerpoint' },
        { name: 'readme.txt', mime: 'text/plain' },
        { name: 'data.csv', mime: 'text/csv' },
        { name: 'doc.rtf', mime: 'application/rtf' },
    ];

    for (const doc of validDocs) {
        assert.equal(uploadService.isAllowedDocument(doc.name, doc.mime), true, `Should allow ${doc.name}`);
        assert.equal(uploadService.isVideo(doc.name, doc.mime), false, `Should not flag ${doc.name} as video`);
    }
});

test('Upload Service: Video detection catches video MIME types and file extensions', () => {
    const videoFiles = [
        { name: 'lecture.mp4', mime: 'video/mp4' },
        { name: 'recording.mov', mime: 'video/quicktime' },
        { name: 'screencast.webm', mime: 'video/webm' },
        { name: 'clip.avi', mime: 'video/x-msvideo' },
        { name: 'lesson.mkv', mime: 'video/x-matroska' },
        { name: 'stream.m4v', mime: 'video/x-m4v' },
        { name: 'disguised_video.pdf', mime: 'video/mp4' },
        { name: 'video_file.mp4', mime: 'application/octet-stream' },
    ];

    for (const vid of videoFiles) {
        assert.equal(uploadService.isVideo(vid.name, vid.mime), true, `Should detect video for ${vid.name}`);
        assert.equal(uploadService.isAllowedDocument(vid.name, vid.mime), false, `Should reject video as document: ${vid.name}`);
    }
});

test('Upload Service: Video rejection returns exact plain-language guidance message', () => {
    const expectedMessage = "Video uploads are not supported yet. For video materials, please share an external web link (e.g. YouTube or Google Drive) or upload documents (PDF, Word, etc.).";
    assert.equal(uploadService.VIDEO_REJECTION_MESSAGE, expectedMessage);
});

test('Upload Service: File size limit enforces 10MB maximum', () => {
    const TEN_MB = 10 * 1024 * 1024;
    assert.equal(uploadService.MAX_FILE_SIZE_BYTES, TEN_MB);
    assert.equal(uploadService.isAllowedFileSize(TEN_MB), true);
    assert.equal(uploadService.isAllowedFileSize(TEN_MB - 1), true);
    assert.equal(uploadService.isAllowedFileSize(TEN_MB + 1), false);
    assert.equal(uploadService.isAllowedFileSize(15 * 1024 * 1024), false);
});

test('Upload Service: Tenant path generation scopes by institution_id', () => {
    const institutionId = 'inst-uuid-12345';
    const filePath = uploadService.generateTenantPath(institutionId, 'course_materials', 'vault', 'Math Notes.pdf');
    assert.ok(filePath.startsWith(`${institutionId}/course_materials/vault/`), `Path must start with institution_id: ${filePath}`);
    assert.ok(filePath.endsWith('_Math_Notes.pdf'), `Path must sanitize filename: ${filePath}`);
});

// -----------------------------------------------------------------------------
// 2. Upload Controller HTTP Contract Tests
// -----------------------------------------------------------------------------
test('Upload Controller: Rejects missing institution_id, file, and video uploads', async () => {
    const uploadController = require('../controllers/upload.controller');

    // Missing institution_id
    {
        const req = { institution_id: null, body: { fileName: 'test.pdf', fileData: 'abc' } };
        const res = createRes();
        await uploadController.uploadFile(req, res);
        assert.equal(res.state.statusCode, 400);
        assert.match(res.state.body.error, /Institution ID is required/i);
    }

    // Missing file data
    {
        const req = { institution_id: 'inst-1', body: { fileName: 'test.pdf' } };
        const res = createRes();
        await uploadController.uploadFile(req, res);
        assert.equal(res.state.statusCode, 400);
        assert.match(res.state.body.error, /File name and data are required/i);
    }

    // Video rejection
    {
        const req = {
            institution_id: 'inst-1',
            body: { fileName: 'lecture.mp4', mimeType: 'video/mp4', fileData: 'AAAA' }
        };
        const res = createRes();
        await uploadController.uploadFile(req, res);
        assert.equal(res.state.statusCode, 400);
        assert.equal(res.state.body.code, 'VIDEO_NOT_SUPPORTED');
        assert.equal(res.state.body.error, uploadService.VIDEO_REJECTION_MESSAGE);
    }

    // Size limit rejection
    {
        const req = {
            institution_id: 'inst-1',
            body: { fileName: 'large_book.pdf', fileSize: 15 * 1024 * 1024, fileData: 'AAAA' }
        };
        const res = createRes();
        await uploadController.uploadFile(req, res);
        assert.equal(res.state.statusCode, 400);
        assert.match(res.state.body.error, /exceeds.*maximum allowed size/i);
    }
});

// -----------------------------------------------------------------------------
// 3. Resource Controller: Scope Restriction, Retrieval & Download Validation
// -----------------------------------------------------------------------------
function loadResourceControllerWithMock(mockSupabase) {
    const controllerPath = path.resolve(__dirname, '../controllers/resources.controller.js');
    const supabasePath = path.resolve(__dirname, '../utils/supabaseClient.js');

    delete require.cache[controllerPath];
    delete require.cache[supabasePath];

    require.cache[supabasePath] = {
        id: supabasePath,
        filename: supabasePath,
        loaded: true,
        exports: mockSupabase,
    };

    return require(controllerPath);
}

test('Resource Controller: createResource blocks video uploads with plain-language message', async () => {
    const resourcesController = loadResourceControllerWithMock({});

    // Direct type = 'video' with file URL
    {
        const req = {
            userId: 'admin-1',
            userRole: 'admin',
            institution_id: 'inst-1',
            body: {
                title: 'Physics Lab Video',
                type: 'video',
                url: 'https://example.com/vault/inst-1/lab.mp4'
            }
        };
        const res = createRes();
        await resourcesController.createResource(req, res);
        assert.equal(res.state.statusCode, 400);
        assert.equal(res.state.body.code, 'VIDEO_NOT_SUPPORTED');
        assert.equal(res.state.body.error, uploadService.VIDEO_REJECTION_MESSAGE);
    }

    // Video extension in URL even if type is sent as 'file'
    {
        const req = {
            userId: 'admin-1',
            userRole: 'admin',
            institution_id: 'inst-1',
            body: {
                title: 'Physics Lab',
                type: 'file',
                url: 'https://supabase.co/storage/v1/object/public/course_materials/inst-1/lab.mov'
            }
        };
        const res = createRes();
        await resourcesController.createResource(req, res);
        assert.equal(res.state.statusCode, 400);
        assert.equal(res.state.body.code, 'VIDEO_NOT_SUPPORTED');
    }
});

test('Resource Controller: createResource allows external link URLs and valid documents', async () => {
    let insertedRecord = null;
    const mockSupabase = {
        from(table) {
            if (table === 'resources') {
                return {
                    insert(rows) {
                        insertedRecord = rows[0];
                        return {
                            select() {
                                return {
                                    single: async () => ({ data: { id: 'res-1', ...insertedRecord }, error: null })
                                };
                            }
                        };
                    }
                };
            }
            return {
                select() {
                    return {
                        eq() {
                            return {
                                maybeSingle: async () => ({ data: null, error: null })
                            };
                        }
                    };
                }
            };
        }
    };

    const resourcesController = loadResourceControllerWithMock(mockSupabase);

    // Valid external link
    {
        const req = {
            userId: 'admin-1',
            userRole: 'admin',
            institution_id: 'inst-1',
            body: {
                title: 'Khan Academy Calculus',
                type: 'link',
                url: 'https://www.khanacademy.org/math/calculus-1',
                subject_id: 'sub-1'
            }
        };
        const res = createRes();
        await resourcesController.createResource(req, res);
        assert.equal(res.state.statusCode, 201);
        assert.equal(insertedRecord.type, 'link');
        assert.equal(insertedRecord.url, 'https://www.khanacademy.org/math/calculus-1');
    }

    // Valid PDF document
    {
        const req = {
            userId: 'admin-1',
            userRole: 'admin',
            institution_id: 'inst-1',
            body: {
                title: 'Biology Notes',
                type: 'pdf',
                url: 'https://yqvtsjxgvtzshabkmegm.supabase.co/storage/v1/object/public/course_materials/inst-1/resources/notes.pdf',
                subject_id: 'sub-1',
                size: 204800
            }
        };
        const res = createRes();
        await resourcesController.createResource(req, res);
        assert.equal(res.state.statusCode, 201);
        assert.equal(insertedRecord.type, 'pdf');
        assert.equal(insertedRecord.size, 204800);
    }
});

test('Resource Controller: downloadResource verifies retrieval, original format preservation and tenant isolation', async () => {
    const mockDbResource = {
        id: 'res-pdf-100',
        title: 'Chemistry Formulas',
        type: 'pdf',
        size: 512000,
        url: 'https://yqvtsjxgvtzshabkmegm.supabase.co/storage/v1/object/public/course_materials/inst-1/resources/formulas.pdf',
        institution_id: 'inst-1',
        target_audience: 'everyone',
        status: 'approved'
    };

    const mockSupabase = {
        from(table) {
            if (table === 'resources') {
                return {
                    select() {
                        return {
                            eq(field, val) {
                                return {
                                    eq(field2, val2) {
                                        return {
                                            maybeSingle: async () => {
                                                if (val === 'res-pdf-100' && val2 === 'inst-1') {
                                                    return { data: mockDbResource, error: null };
                                                }
                                                return { data: null, error: null };
                                            }
                                        };
                                    }
                                };
                            }
                        };
                    }
                };
            }
            return {};
        }
    };

    const resourcesController = loadResourceControllerWithMock(mockSupabase);

    // Tenant mismatch check
    {
        const req = {
            params: { id: 'res-pdf-100' },
            institution_id: 'wrong-inst-999',
            userId: 'student-1',
            userRole: 'student'
        };
        const res = createRes();
        await resourcesController.downloadResource(req, res);
        assert.equal(res.state.statusCode, 404);
        assert.match(res.state.body.error, /Resource not found/i);
    }

    // Successful download and format preservation check
    {
        const req = {
            params: { id: 'res-pdf-100' },
            institution_id: 'inst-1',
            userId: 'student-1',
            userRole: 'student'
        };
        const res = createRes();
        await resourcesController.downloadResource(req, res);
        assert.equal(res.state.statusCode, 200);
        assert.equal(res.state.body.id, 'res-pdf-100');
        assert.equal(res.state.body.type, 'pdf');
        assert.equal(res.state.body.original_format_preserved, true);
        assert.equal(res.state.body.download_url, mockDbResource.url);
    }
});

// -----------------------------------------------------------------------------
// 4. Academic Controller: Assignment & Submission Scope & Download Verification
// -----------------------------------------------------------------------------
function loadAcademicControllerWithMock(mockSupabase) {
    const controllerPath = path.resolve(__dirname, '../controllers/academic.controller.js');
    const supabasePath = path.resolve(__dirname, '../utils/supabaseClient.js');

    delete require.cache[controllerPath];
    delete require.cache[supabasePath];

    require.cache[supabasePath] = {
        id: supabasePath,
        filename: supabasePath,
        loaded: true,
        exports: mockSupabase,
    };

    return require(controllerPath);
}

test('Academic Controller: createAssignment rejects video attachments', async () => {
    const academicController = loadAcademicControllerWithMock({});
    const req = {
        institution_id: 'inst-1',
        teacherId: 'teacher-1',
        userRole: 'admin',
        body: {
            title: 'Week 1 Assignment',
            attachment_url: 'https://example.com/assignments/inst-1/video_lecture.mp4'
        }
    };
    const res = createRes();
    await academicController.createAssignment(req, res);
    assert.equal(res.state.statusCode, 400);
    assert.equal(res.state.body.code, 'VIDEO_NOT_SUPPORTED');
    assert.equal(res.state.body.error, uploadService.VIDEO_REJECTION_MESSAGE);
});

test('Academic Controller: submitAssignment rejects video submission file', async () => {
    const mockSupabase = {
        from(table) {
            if (table === 'assignments') {
                return {
                    select() {
                        return {
                            eq() {
                                return {
                                    single: async () => ({
                                        data: { id: 'asgn-1', subject_id: 'sub-1', subject: { id: 'sub-1' } },
                                        error: null
                                    })
                                };
                            }
                        };
                    }
                };
            }
            return {};
        }
    };

    const academicController = loadAcademicControllerWithMock(mockSupabase);
    const req = {
        institution_id: 'inst-1',
        userId: 'admin-1',
        userRole: 'admin',
        body: {
            assignment_id: 'asgn-1',
            student_id: 'stud-1',
            file_url: 'https://example.com/submissions/inst-1/my_speech.mov'
        }
    };
    const res = createRes();
    await academicController.submitAssignment(req, res);
    assert.equal(res.state.statusCode, 400);
    assert.equal(res.state.body.code, 'VIDEO_NOT_SUPPORTED');
    assert.equal(res.state.body.error, uploadService.VIDEO_REJECTION_MESSAGE);
});

test('Academic Controller: downloadAssignmentAttachment & downloadSubmission verify original format download', async () => {
    const mockAssignment = {
        id: 'asgn-1',
        title: 'History Essay Prompt',
        attachment_url: 'https://yqvtsjxgvtzshabkmegm.supabase.co/storage/v1/object/public/assignments/inst-1/assignments/prompt.docx',
        attachment_name: 'prompt.docx',
        institution_id: 'inst-1'
    };

    const mockSubmission = {
        id: 'sub-1',
        assignment_id: 'asgn-1',
        student_id: 'stud-1',
        file_url: 'https://yqvtsjxgvtzshabkmegm.supabase.co/storage/v1/object/public/assignments/inst-1/submissions/stud-1_essay.docx',
        student: { id: 'stud-1', user_id: 'user-stud-1' },
        assignment: { institution_id: 'inst-1', teacher_id: 'teacher-1', title: 'History Essay Prompt' }
    };

    const mockSupabase = {
        from(table) {
            if (table === 'assignments') {
                return {
                    select() {
                        return {
                            eq() {
                                return {
                                    eq() {
                                        return {
                                            maybeSingle: async () => ({ data: mockAssignment, error: null })
                                        };
                                    }
                                };
                            }
                        };
                    }
                };
            }
            if (table === 'submissions') {
                return {
                    select() {
                        return {
                            eq() {
                                return {
                                    eq() {
                                        return {
                                            maybeSingle: async () => ({ data: mockSubmission, error: null })
                                        };
                                    }
                                };
                            }
                        };
                    }
                };
            }
            if (table === 'students') {
                return {
                    select() {
                        return {
                            eq(field, val) {
                                return {
                                    maybeSingle: async () => {
                                        if (val === 'user-stud-1') {
                                            return { data: { id: 'stud-1' }, error: null };
                                        }
                                        return { data: { id: 'other-student-id' }, error: null };
                                    }
                                };
                            }
                        };
                    }
                };
            }
            return {};
        }
    };

    const academicController = loadAcademicControllerWithMock(mockSupabase);

    // Assignment attachment download
    {
        const req = {
            params: { id: 'asgn-1' },
            institution_id: 'inst-1',
            userRole: 'admin'
        };
        const res = createRes();
        await academicController.downloadAssignmentAttachment(req, res);
        assert.equal(res.state.statusCode, 200);
        assert.equal(res.state.body.attachment_url, mockAssignment.attachment_url);
        assert.equal(res.state.body.original_format_preserved, true);
    }

    // Submission download by admin
    {
        const req = {
            params: { id: 'sub-1' },
            institution_id: 'inst-1',
            userId: 'admin-1',
            userRole: 'admin'
        };
        const res = createRes();
        await academicController.downloadSubmission(req, res);
        assert.equal(res.state.statusCode, 200);
        assert.equal(res.state.body.file_url, mockSubmission.file_url);
        assert.equal(res.state.body.original_format_preserved, true);
    }

    // Submission download by unauthorized student
    {
        const req = {
            params: { id: 'sub-1' },
            institution_id: 'inst-1',
            userId: 'other-student-user-999',
            userRole: 'student'
        };
        const res = createRes();
        await academicController.downloadSubmission(req, res);
        assert.equal(res.state.statusCode, 403);
        assert.match(res.state.body.error, /Access denied/i);
    }
});
