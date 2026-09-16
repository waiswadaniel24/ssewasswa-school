// FileName: src/utils/deduplicate.js
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Student deduplication helpers — NIN, admission number, and fuzzy name+DOB matching

/**
 * Normalize a string for comparison: trim, lowercase, collapse spaces.
 * @param {*} s - Input value (any type, converted to string)
 * @returns {string}
 */
function normalizeStr(s) {
    if (!s && s !== 0) return '';
    return String(s).trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Find students with duplicate NIN (National Identification Number).
 * @param {Array} rows - Student records
 * @returns {Array<Array>} Array of groups (each group is an array of duplicates)
 */
function byNin(rows) {
    const map = new Map();
    (rows || []).forEach(r => {
        const k = normalizeStr(r.nin);
        if (!k) return; // Skip empty NINs
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(r);
    });
    return Array.from(map.values()).filter(g => g.length > 1);
}

/**
 * Find students with duplicate admission numbers.
 * @param {Array} rows - Student records
 * @returns {Array<Array>} Array of groups (each group is an array of duplicates)
 */
function byAdmission(rows) {
    const map = new Map();
    (rows || []).forEach(r => {
        const k = normalizeStr(r.admission_number);
        if (!k) return; // Skip empty admission numbers
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(r);
    });
    return Array.from(map.values()).filter(g => g.length > 1);
}

/**
 * Fuzzy name matching — checks if two students have the same or similar name.
 * Matches on: exact full name, same last name + first name prefix match, or substring.
 * @param {Object} a - First student record
 * @param {Object} b - Second student record
 * @returns {boolean} True if names are considered a match
 */
function fuzzyNameMatch(a, b) {
    const aFirst = normalizeStr(a.first_name || '');
    const aLast = normalizeStr(a.last_name || '');
    const bFirst = normalizeStr(b.first_name || '');
    const bLast = normalizeStr(b.last_name || '');

    if (!aFirst && !aLast) return false;
    if (!bFirst && !bLast) return false;

    const fullA = (aFirst + ' ' + aLast).trim();
    const fullB = (bFirst + ' ' + bLast).trim();

    // Exact full name match
    if (fullA && fullB && fullA === fullB) return true;

    // Same last name + first name prefix match (e.g., "John" vs "Johnny")
    if (aLast && bLast && aLast === bLast) {
        if (aFirst && bFirst) {
            if (aFirst === bFirst) return true;
            // Allow common three-letter short forms (e.g. "Sam"/"Samuel") while avoiding two-letter false positives.
            if (aFirst.length >= 3 && bFirst.length >= 3) {
                if (aFirst.startsWith(bFirst) || bFirst.startsWith(aFirst)) return true;
            }
        }
    }

    // Substring match (e.g., "John Smith" contains "John")
    if (fullA.length >= 5 && fullB.length >= 5) {
        if (fullA.includes(fullB) || fullB.includes(fullA)) return true;
    }

    return false;
}

/**
 * Find all potential duplicate students.
 * Combines NIN duplicates, admission number duplicates, and fuzzy name+DOB matches.
 * Uses optimized approach: groups by last name first to reduce O(n²) comparisons.
 * @param {Array} rows - Student records
 * @returns {Array} Unique list of student records that are potential duplicates
 */
function potentialDuplicates(rows) {
    if (!rows || rows.length === 0) return [];

    const candidates = new Map(); // Use Map to deduplicate by student ID

    // ─── NIN duplicates ─────────────────────────────────────
    byNin(rows).forEach(group => {
        group.forEach(r => {
            if (!candidates.has(r.id)) candidates.set(r.id, r);
        });
    });

    // ─── Admission number duplicates ────────────────────────
    byAdmission(rows).forEach(group => {
        group.forEach(r => {
            if (!candidates.has(r.id)) candidates.set(r.id, r);
        });
    });

    // ─── Fuzzy name + DOB matches (optimized) ────────────────
    // Group by last name to reduce comparisons from O(n²) to O(k²) where k = same last name
    const byLastName = new Map();
    for (const r of rows) {
        const ln = normalizeStr(r.last_name || '');
        if (!ln) continue;
        if (!byLastName.has(ln)) byLastName.set(ln, []);
        byLastName.get(ln).push(r);
    }

    // Only compare students within the same last name group
    for (const [, group] of byLastName) {
        if (group.length < 2) continue;

        for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
                const a = group[i];
                const b = group[j];

                // Check DOB match (both must have a DOB and they must be equal)
                const aDob = normalizeStr(a.date_of_birth || '');
                const bDob = normalizeStr(b.date_of_birth || '');
                const sameDob = aDob && bDob && aDob === bDob;

                if (fuzzyNameMatch(a, b) && sameDob) {
                    if (!candidates.has(a.id)) candidates.set(a.id, a);
                    if (!candidates.has(b.id)) candidates.set(b.id, b);
                }
            }
        }
    }

    return Array.from(candidates.values());
}

module.exports = {
    normalizeStr,
    byNin,
    byAdmission,
    fuzzyNameMatch,
    potentialDuplicates
};
