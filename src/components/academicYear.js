// ─────────────────────────────────────────────────────────────────────────────
// Shared academic-year helpers.
// Import this from InstructorList.js, CreateInstructor.js and EditInstructor.js
// so all three screens agree on what "current" and "the rolling year window"
// mean. Previously each file computed years independently and only the
// Create/Edit form actually included the true current year by construction —
// the "default to most recent SAVED year" logic elsewhere made it look like
// the current academic year was being ignored.
//
// AY_START_MONTH = the calendar month (1-12) your academic year begins in.
// 4 = April (common in Indian schools). Change this one constant if your
// school's year starts in a different month (e.g. 6 for June).
// ─────────────────────────────────────────────────────────────────────────────

export const AY_START_MONTH = 4;

// Sentinel for rows saved before academic_year tracking existed (the column
// is nullable at the DB level for exactly this reason — see instructor
// subject model comments). These rows must never be silently invisible:
// the UI buckets them under this pseudo-year so an admin can find and fix
// them, rather than a null just falling out of every "current year" filter.
export const UNASSIGNED_YEAR = "__no_year_set__";

// e.g. if today is Aug 6 2026 -> "2026-2027"
//      if today is Feb 2 2026 -> "2025-2026"
export const getCurrentAcademicYear = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1; // 1-12
    return m >= AY_START_MONTH ? `${y}-${y + 1}` : `${y - 1}-${y}`;
};

// Rolling window of years for dropdowns: 2 years back, current, and 1 year ahead,
// anchored on the ACTUAL current academic year (not just "this calendar year").
export const generateAcademicYears = () => {
    const [startStr] = getCurrentAcademicYear().split("-");
    const start = parseInt(startStr, 10);
    return Array.from({ length: 4 }, (_, i) => {
        const y = start - 2 + i;
        return `${y}-${y + 1}`;
    });
};