const {
    validateUpload,
    generateStoragePath,
    uploadToStorage,
    VIDEO_ERROR_MESSAGE,
    SIZE_ERROR_MESSAGE,
    TYPE_ERROR_MESSAGE
} = require("../services/upload.service.js");

/**
 * Handle authenticated file uploads
 * Accepts base64 encoded payload: { fileName, mimeType, fileData, category, subfolder }
 */
exports.handleUpload = async (req, res) => {
    try {
        const { fileName, mimeType, fileData, category = 'resources', subfolder = '' } = req.body;
        const { userRole, institution_id, userId } = req;

        if (!institution_id) {
            return res.status(400).json({ error: "Institution ID is required" });
        }

        if (!fileName || !fileData) {
            return res.status(400).json({ error: "File name and data are required" });
        }

        // Authorization checks on upload categories
        if (userRole === 'student' && category !== 'submissions') {
            return res.status(403).json({ error: "Students are only permitted to upload assignment submissions" });
        }

        if (userRole === 'parent') {
            return res.status(403).json({ error: "Parents are not permitted to upload files" });
        }

        // Decode base64 buffer
        let fileBuffer;
        try {
            // Strip data URL prefix if present (e.g. data:application/pdf;base64,...)
            const cleanBase64 = fileData.replace(/^data:[^;]+;base64,/, '');
            fileBuffer = Buffer.from(cleanBase64, 'base64');
        } catch (decErr) {
            return res.status(400).json({ error: "Invalid base64 encoding for fileData" });
        }

        // Validate MIME type, file size limit (10MB), and reject video files
        const declaredOrActualSize = req.body.fileSize ? Math.max(Number(req.body.fileSize), fileBuffer.length) : fileBuffer.length;
        validateUpload({
            mimeType,
            fileName,
            sizeBytes: declaredOrActualSize
        });

        // Determine destination bucket
        let bucket = 'course_materials';
        if (category === 'assignments' || category === 'submissions') {
            bucket = 'assignments';
        }

        // Generate tenant-scoped storage path: /{institution_id}/{category}/...
        const storagePath = generateStoragePath({
            institutionId: institution_id,
            category,
            subfolder: subfolder || (category === 'submissions' ? userId : ''),
            fileName
        });

        // Store into Supabase Storage
        const result = await uploadToStorage({
            bucket,
            storagePath,
            fileBuffer,
            mimeType: mimeType || 'application/octet-stream'
        });

        return res.status(201).json({
            success: true,
            url: result.publicUrl,
            path: result.storagePath,
            bucket: result.bucket,
            fileName,
            size: result.size,
            mimeType
        });
    } catch (err) {
        console.error("handleUpload error:", err);
        const status = err.statusCode || 500;
        return res.status(status).json({
            error: err.message,
            code: err.code || 'UPLOAD_FAILED'
        });
    }
};

exports.uploadFile = exports.handleUpload;
