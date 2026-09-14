// FileName: src/utils/emisValidation.js
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Central EMIS validation utilities — missing fields, duplicates, age checks, orphaned records

// ═══════════════════════════════════════════════════════════
// MISSING FIELDS
// ═══════════════════════════════════════════════════════════

/**
 * Find records where a required field is missing or empty.
 * @param {Array} rows - Records to check
 * @param {string} field - Field name to check (e.g., 'date_of_birth', 'gender')
 * @returns {Array} Records where the field is missing or empty
 */
function findMissingField(rows, field) {
    return (rows || []).filter(r => {
        const v = r[field];
        return v === null || v === undefined || String(v).trim() === '';
    });
}

// ═══════════════════════════════════════════════════════════
// DUPLICATES
// ═══════════════════════════════════════════════════════════

/**
 * Find records with duplicate values in a specific field.
 * @param {Array} rows - Records to check
 * @param {string} field - Field name to check for duplicates (e.g., 'admission_number', 'nin')
 * @returns {Array} All records that have a duplicate value (excluding records with empty values)
 */
function findDuplicates(rows, field) {
    const map = new Map();

    (rows || []).forEach(r => {
        const key = r[field];
        if (!key || String(key).trim() === '') return; // Skip empty values
        const k = String(key).trim();
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(r);
    });

    const dups = [];
    for (const [, arr] of map.entries()) {
        if (arr.length > 1) dups.push(...arr);
    }
    return dups;
}

// ═══════════════════════════════════════════════════════════
// IMPLAUSIBLE AGES
// ═══════════════════════════════════════════════════════════

/**
 * Parse a date string safely.
 * @param {string} s - Date string (any format JS Date can parse)
 * @returns {Date|null} Date object or null if invalid
 */
function parseDateSafe(s) {
    if (!s || typeof s !== 'string') return null;
    try {
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
    } catch (e) {
        return null;
    }
}

/**
 * Find students with implausible ages (outside the expected school-age range).
 * @param {Array} rows - Student records with date_of_birth field
 * @param {Object} opts - { min: number, max: number } age range (defaults: 3-25)
 * @returns {Array} Records with implausible or missing ages (includes computed 'age' property)
 */
function findImplausibleAges(rows, opts) {
    const min = (opts && typeof opts.min === 'number') ? opts.min : 3;
    const max = (opts && typeof opts.max === 'number') ? opts.max : 25;
    const now = new Date();
    const bad = [];

    (rows || []).forEach(r => {
        const dob = parseDateSafe(r.date_of_birth || r.dob || r.dob_str || '');
        if (!dob) {
            // Missing or invalid DOB
            bad.push(Object.assign({}, r, { age: null }));
            return;
        }

        // Calculate age in years
        const ageMs = now.getTime() - dob.getTime();
        const ageYears = Math.floor(ageMs / (1000 * 60 * 60 * 24 * 365.25));

        if (ageYears < min || ageYears > max) {
            bad.push(Object.assign({}, r, { age: ageYears }));
        }
    });

    return bad;
}

// ═══════════════════════════════════════════════════════════
// ORPHANED RECORDS (FK integrity check)
// ═══════════════════════════════════════════════════════════

/**
 * Find records in childRows where the foreign key doesn't exist in parentRows.
 * FIXED: The original built a Set from childRows using parentKey (wrong!),
 * then checked parentRows against childKey. It should build a Set from
 * parentRows using parentKey, then check childRows against childKey.
 *
 * @param {Array} childRows - Records with foreign key (e.g., marks, payments)
 * @param {Array} parentRows - Records with primary key (e.g., students)
 * @param {string} childKey - FK field name in childRows (default: 'student_id')
 * @param {string} parentKey - PK field name in parentRows (default: 'id')
 * @returns {Array} Child records whose FK doesn't exist in parentRows
 */
function findOrphans(childRows, parentRows, childKey, parentKey) {
    childKey = childKey || 'student_id';
    parentKey = parentKey || 'id';

    // Build a Set of all parent primary keys
    const parentIds = new Set();
    (parentRows || []).forEach(p => {
        const id = p[parentKey];
        if (id !== null && id !== undefined) {
            parentIds.add(String(id));
        }
    });

    // Find child records whose FK is NOT in the parent set
    return (childRows || []).filter(c => {
        const fk = c[childKey];
        if (fk === null || fk === undefined) return true; // Orphaned: FK is null
        return !parentIds.has(String(fk));
    });
}

// ═══════════════════════════════════════════════════════════
// GENDER VALIDATION
// ═══════════════════════════════════════════════════════════

/**
 * Find students with invalid gender values (not 'M' or 'F').
 * @param {Array} rows - Student records
 * @returns {Array} Records with invalid gender
 */
function findInvalidGender(rows) {
    return (rows || []).filter(r => {
        const g = String(r.gender || '').trim().toUpperCase();
        return g !== 'M' && g !== 'F';
    });
}

// ═══════════════════════════════════════════════════════════
// ENROLLMENT VALIDATION
// ═══════════════════════════════════════════════════════════

/**
 * Find students who are marked Active but have no class_id assigned.
 * @param {Array} rows - Student records
 * @returns {Array} Active students without a class
 */
function findUnclassifiedStudents(rows) {
    return (rows || []).filter(r => {
        const status = String(r.status || '').toLowerCase();
        return status === 'active' && (!r.class_id || r.class_id === null);
    });
}

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = {
    findMissingField,
    findDuplicates,
    parseDateSafe,
    findImplausibleAges,
    findOrphans,
    findInvalidGender,
    findUnclassifiedStudents
};

// Support ESM default import interop for bundlers
module.exports.default = module.exports;