// FileName: electron/uploads.js
// Ssewasswa School ERP V10 - EMIS Uganda Compliant

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class UploadHandler {
    /**
     * @param {Object} db - sql.js database instance
     * @param {Function} saveDb - Function to persist database to disk
     */
    constructor(db, saveDb) {
        this.db = db;
        this.saveDb = saveDb;

        // Directory structure: userData/uploads/photos and userData/uploads/documents
        this.uploadsDir = path.join(app.getPath('userData'), 'uploads');
        this.photosDir = path.join(this.uploadsDir, 'photos');
        this.docsDir = path.join(this.uploadsDir, 'documents');

        this._ensureDirectories();
    }

    // ═════════════════════════════════════════════════════════
    // DIRECTORY SETUP
    // ═════════════════════════════════════════════════════════

    /** Create upload directories if they don't exist */
    _ensureDirectories() {
        const dirs = [this.uploadsDir, this.photosDir, this.docsDir];
        for (const dir of dirs) {
            if (!fs.existsSync(dir)) {
                try {
                    fs.mkdirSync(dir, { recursive: true });
                } catch (e) {
                    console.error('Failed to create directory:', dir, e.message);
                }
            }
        }
    }

    // ═════════════════════════════════════════════════════════
    // PHOTO SAVE / GET / DELETE
    // ═════════════════════════════════════════════════════════

    /**
     * Save a base64-encoded photo to the file system.
     * @param {string} base64Data - Data URL (data:image/png;base64,...) or raw base64
     * @param {string} category - Category prefix (e.g., 'student', 'staff', 'branding', 'logo', 'badge')
     * @param {string|number} id - Entity ID for the filename
     * @returns {{success: boolean, path?: string, filename?: string, error?: string}}
     */
    savePhoto(base64Data, category, id) {
        try {
            if (!base64Data) {
                return { success: false, error: 'No image data provided' };
            }

            // Parse base64 data URL: data:image/png;base64,XXXX
            const parts = base64Data.split(',');
            const header = parts.length > 1 ? parts[0] : '';
            const base64String = parts.length > 1 ? parts[1] : base64Data;
            const buffer = Buffer.from(base64String, 'base64');

            // Extract extension from header without regex to avoid linter warnings
            let ext = 'jpg';
            if (header.includes('image/')) {
                const slashIndex = header.indexOf('/');
                const semiIndex = header.indexOf(';');
                if (slashIndex !== -1 && semiIndex > slashIndex) {
                    ext = header.substring(slashIndex + 1, semiIndex);
                }
            }

            // Build safe filename: category_id_timestamp.ext
            const safeCategory = String(category || 'img').replace(/[^a-zA-Z0-9_-]/g, '_');
            const safeId = String(id || '0').replace(/[^a-zA-Z0-9_-]/g, '_');
            const filename = `${safeCategory}_${safeId}_${Date.now()}.${ext}`;
            const filepath = path.join(this.photosDir, filename);

            fs.writeFileSync(filepath, buffer);

            return { success: true, path: filepath, filename: filename };
        } catch (e) {
            console.error('savePhoto error:', e.message);
            return { success: false, error: e.message };
        }
    }

    /**
     * Get a photo as a base64 data URL for display in <img src="...">.
     * @param {string} filename - The filename stored in the database
     * @returns {{success: boolean, data: string|null}}
     */
    getPhoto(filename) {
        try {
            if (!filename) return { success: true, data: null };

            const filepath = path.join(this.photosDir, filename);
            if (!fs.existsSync(filepath)) return { success: true, data: null };

            const buffer = fs.readFileSync(filepath);
            const ext = path.extname(filename).replace('.', '').toLowerCase();
            const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

            return {
                success: true,
                data: `data:${mimeType};base64,${buffer.toString('base64')}`
            };
        } catch (e) {
            console.error('getPhoto error:', e.message);
            return { success: true, data: null };
        }
    }

    /**
     * Delete a photo from the file system.
     * @param {string} filename - The filename to delete
     * @returns {{success: boolean, error?: string}}
     */
    deletePhoto(filename) {
        try {
            if (!filename) return { success: true };
            const filepath = path.join(this.photosDir, filename);
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
            }
            return { success: true };
        } catch (e) {
            console.error('deletePhoto error:', e.message);
            return { success: false, error: e.message };
        }
    }

    // ═════════════════════════════════════════════════════════
    // DOCUMENT SAVE / GET / DELETE
    // ═════════════════════════════════════════════════════════

    /**
     * Save a document (PDF, image, etc.) to the file system.
     * Note: The database record is inserted by the calling IPC handler in main.js.
     * @param {string} base64Data - Data URL (data:application/pdf;base64,...)
     * @param {string} originalName - Original file name from the user's machine
     * @param {string} documentType - Type label (e.g., 'Birth Certificate')
     * @param {string|number} studentId - Student ID for the filename
     * @returns {{success: boolean, path?: string, filename?: string, error?: string}}
     */
    saveDocument(base64Data, originalName, documentType, studentId) {
        try {
            if (!base64Data) {
                return { success: false, error: 'No document data provided' };
            }

            // Strip data URL prefix without regex to avoid linter warnings
            const base64String = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
            const buffer = Buffer.from(base64String, 'base64');

            // Build safe filename: docType_studentId_timestamp_originalName
            const safeName = String(originalName || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
            const safeType = String(documentType || 'doc').replace(/[^a-zA-Z0-9_-]/g, '_');
            const safeId = String(studentId || '0').replace(/[^a-zA-Z0-9_-]/g, '_');
            const filename = `${safeType}_${safeId}_${Date.now()}_${safeName}`;
            const filepath = path.join(this.docsDir, filename);

            fs.writeFileSync(filepath, buffer);

            return { success: true, path: filepath, filename: filename };
        } catch (e) {
            console.error('saveDocument error:', e.message);
            return { success: false, error: e.message };
        }
    }

    /**
     * Get a document as base64 data URL for download or preview.
     * @param {string} filename - The filename stored in the database
     * @returns {{success: boolean, data: string|null, filename?: string, size?: number}}
     */
    getDocument(filename) {
        try {
            if (!filename) return { success: true, data: null };

            const filepath = path.join(this.docsDir, filename);
            if (!fs.existsSync(filepath)) return { success: true, data: null };

            const buffer = fs.readFileSync(filepath);
            const ext = path.extname(filename).replace('.', '').toLowerCase();

            // Map common extensions to MIME types
            const mimeTypes = {
                'pdf': 'application/pdf',
                'doc': 'application/msword',
                'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'txt': 'text/plain'
            };
            const mimeType = mimeTypes[ext] || 'application/octet-stream';

            return {
                success: true,
                data: `data:${mimeType};base64,${buffer.toString('base64')}`,
                filename: filename,
                size: buffer.length
            };
        } catch (e) {
            console.error('getDocument error:', e.message);
            return { success: true, data: null };
        }
    }

    /**
     * Delete a document from the file system.
     * Note: The database record is deleted by the calling IPC handler in main.js.
     * @param {string} filename - The filename to delete
     * @returns {{success: boolean, error?: string}}
     */
    deleteDocument(filename) {
        try {
            if (!filename) return { success: true };
            const filepath = path.join(this.docsDir, filename);
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
            }
            return { success: true };
        } catch (e) {
            console.error('deleteDocument error:', e.message);
            return { success: false, error: e.message };
        }
    }

    // ═════════════════════════════════════════════════════════
    // STUDENT DOCUMENTS QUERY (FIXED: uses prepare+bind, NOT exec with params)
    // ═════════════════════════════════════════════════════════

    /**
     * Get all documents for a student from the database.
     * FIXED: Uses db.prepare() + bind() instead of db.exec() with params
     * (sql.js db.exec() does NOT support parameter binding).
     * @param {number} studentId - Student ID
     * @returns {{success: boolean, data: Array}}
     */
    getStudentDocuments(studentId) {
        try {
            if (!studentId) return { success: true, data: [] };

            // Use prepare + bind (NOT exec with params — sql.js doesn't support it)
            const stmt = this.db.prepare(
                "SELECT id, student_id, document_type, filename, original_name, file_size, uploaded_at FROM student_documents WHERE student_id = ? ORDER BY uploaded_at DESC"
            );
            stmt.bind([studentId]);

            const rows = [];
            while (stmt.step()) {
                rows.push(stmt.getAsObject());
            }
            stmt.free();

            return { success: true, data: rows };
        } catch (e) {
            console.error('getStudentDocuments error:', e.message);
            return { success: true, data: [] };
        }
    }
}

module.exports = UploadHandler;