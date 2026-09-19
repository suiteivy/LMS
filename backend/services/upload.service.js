const path = require("node:path");
const supabase = require("../utils/supabaseClient.js");

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/rtf'
]);

const ALLOWED_DOCUMENT_EXTENSIONS = new Set([
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
    '.txt',
    '.csv',
    '.rtf'
]);

const VIDEO_EXTENSIONS = new Set([
    '.mp4',
    '.mov',
    '.avi',
    '.mkv',
    '.webm',
    '.wmv',
    '.flv',
    '.m4v',
    '.3gp',
    '.ts',
    '.mpeg',
    '.mpg'
]);

const VIDEO_ERROR_MESSAGE = "Video uploads are not supported yet. For video materials, please share an external web link (e.g. YouTube or Google Drive) or upload documents (PDF, Word, etc.).";
const SIZE_ERROR_MESSAGE = "File exceeds the maximum allowed size of 10 MB. Please choose a smaller document.";
const TYPE_ERROR_MESSAGE = "Unsupported file type. Allowed formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV.";

/**
 * Extracts clean filename from a path or URL
 */
function extractFileName(str) {
    if (!str || typeof str !== 'string') return '';
    if (str.startsWith('http://') || str.startsWith('https://')) {
        try {
            const parsed = new URL(str);
            return path.basename(parsed.pathname);
        } catch {
            return str.split('?')[0].split('/').pop() || '';
        }
    }
    return path.basename(str);
}

/**
 * Checks if a string looks like an HTTP/RFC MIME type rather than a filename or URL
 */
function isMimeType(str) {
    if (!str || typeof str !== 'string') return false;
    if (str.startsWith('http://') || str.startsWith('https://')) return false;
    return /^[a-zA-Z0-9_+.-]+\/[a-zA-Z0-9_+.-]+$/.test(str.trim());
}

/**
 * Checks if a MIME type, filename, or URL represents a video
 */
function isVideo(arg1, arg2) {
    let mimeType = '';
    let fileName = '';

    if (typeof arg1 === 'object' && arg1 !== null) {
        mimeType = arg1.mimeType || '';
        fileName = extractFileName(arg1.fileName || arg1.url || '');
    } else {
        const checkArg = (arg) => {
            if (!arg || typeof arg !== 'string') return;
            if (isMimeType(arg)) {
                mimeType = arg;
            } else {
                fileName = extractFileName(arg);
            }
        };
        checkArg(arg1);
        checkArg(arg2);
    }

    if (mimeType && (mimeType.toLowerCase().startsWith('video/') || mimeType.toLowerCase().includes('matroska'))) {
        return true;
    }
    if (fileName) {
        const ext = path.extname(fileName).toLowerCase();
        if (VIDEO_EXTENSIONS.has(ext)) {
            return true;
        }
    }
    return false;
}

/**
 * Validates file upload metadata & constraints
 */
function validateUpload({ mimeType, fileName, sizeBytes }) {
    const cleanFileName = extractFileName(fileName);

    // 1. Check video attempt first for clear plain-language messaging
    if (isVideo(mimeType, cleanFileName)) {
        const err = new Error(VIDEO_ERROR_MESSAGE);
        err.statusCode = 400;
        err.code = 'VIDEO_NOT_SUPPORTED';
        throw err;
    }

    // 2. Check file size limit (10MB)
    if (sizeBytes !== undefined && sizeBytes !== null) {
        const numericSize = Number(sizeBytes);
        if (numericSize > MAX_FILE_SIZE_BYTES) {
            const err = new Error(SIZE_ERROR_MESSAGE);
            err.statusCode = 400;
            err.code = 'FILE_TOO_LARGE';
            throw err;
        }
    }

    // 3. Check document format
    const ext = cleanFileName ? path.extname(cleanFileName).toLowerCase() : '';
    const normalizedMime = mimeType ? mimeType.toLowerCase().trim() : '';

    const extAllowed = ext ? ALLOWED_DOCUMENT_EXTENSIONS.has(ext) : false;
    const mimeAllowed = normalizedMime ? ALLOWED_DOCUMENT_MIME_TYPES.has(normalizedMime) : false;

    // Reject if neither extension nor MIME is in the allowed document set
    if (!extAllowed && !mimeAllowed) {
        const err = new Error(TYPE_ERROR_MESSAGE);
        err.statusCode = 400;
        err.code = 'INVALID_FILE_TYPE';
        throw err;
    }
}

/**
 * Sanitize a filename to prevent path traversal and odd characters
 */
function sanitizeFileName(fileName) {
    if (!fileName) return `file_${Date.now()}`;
    const base = path.basename(fileName);
    return base.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Generates an institution-scoped object storage path
 */
function generateStoragePath({ institutionId, category, subfolder, fileName }) {
    if (!institutionId) {
        throw new Error("institutionId is required to generate storage path");
    }
    const cleanCategory = (category || 'resources').replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanSubfolder = subfolder ? subfolder.replace(/[^a-zA-Z0-9/_-]/g, '').replace(/\/+/g, '/').replace(/^\/|\/$/g, '') : '';
    const safeName = sanitizeFileName(fileName);
    const uniqueName = `${Date.now()}_${safeName}`;

    if (cleanSubfolder) {
        return `${institutionId}/${cleanCategory}/${cleanSubfolder}/${uniqueName}`;
    }
    return `${institutionId}/${cleanCategory}/${uniqueName}`;
}

/**
 * Uploads a file buffer directly to Supabase storage
 */
async function uploadToStorage({ bucket, storagePath, fileBuffer, mimeType }) {
    const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(storagePath, fileBuffer, {
            contentType: mimeType || 'application/octet-stream',
            upsert: false // Prevent accidental overwriting to ensure durable linkage
        });

    if (uploadError) {
        console.error(`[uploadToStorage] Upload to ${bucket} failed:`, uploadError);
        const err = new Error(`Failed to store uploaded file: ${uploadError.message}`);
        err.statusCode = 500;
        throw err;
    }

    const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(storagePath);

    return {
        bucket,
        storagePath,
        publicUrl: urlData?.publicUrl || null,
        size: fileBuffer.length,
        mimeType
    };
}

function isAllowedDocument(fileName, mimeType) {
    try {
        validateUpload({ fileName, mimeType });
        return true;
    } catch {
        return false;
    }
}

function isAllowedFileSize(sizeBytes) {
    if (sizeBytes === undefined || sizeBytes === null) return true;
    return Number(sizeBytes) <= MAX_FILE_SIZE_BYTES;
}

function generateTenantPath(institutionId, category, subfolder, fileName) {
    return generateStoragePath({ institutionId, category, subfolder, fileName });
}

module.exports = {
    MAX_FILE_SIZE_BYTES,
    ALLOWED_DOCUMENT_MIME_TYPES,
    ALLOWED_DOCUMENT_EXTENSIONS,
    VIDEO_EXTENSIONS,
    VIDEO_ERROR_MESSAGE,
    VIDEO_REJECTION_MESSAGE: VIDEO_ERROR_MESSAGE,
    SIZE_ERROR_MESSAGE,
    TYPE_ERROR_MESSAGE,
    isVideo,
    isAllowedDocument,
    isAllowedFileSize,
    validateUpload,
    sanitizeFileName,
    generateStoragePath,
    generateTenantPath,
    uploadToStorage
};
