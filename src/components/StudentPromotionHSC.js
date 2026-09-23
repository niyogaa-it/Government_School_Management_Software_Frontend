import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { message, Select, Checkbox, Spin } from "antd";
import Layout from "./Layout";

const { Option } = Select;

// ── Design tokens ────────────────────────────────────────────────────────────
const COLOR = {
  blue:        "#1e40af",
  blueLt:      "#3b82f6",
  text:        "#1e293b",
  textMid:     "#475569",
  textSoft:    "#64748b",
  border:      "#e2e8f0",
  rowOdd:      "#ffffff",
  rowEven:     "#f8fafc",
  rowHover:    "#eff6ff",
  rowSel:      "#eef2ff",
  headBg:      "#1a2236",
  headText:    "#ffffff",
  danger:      "#e21216",
  demote:      "#b45309",
  demoteLt:    "#d97706",
  demoteBg:    "#fffbeb",
  demoteBorder:"#fcd34d",
};
const FF = "'Segoe UI', system-ui, sans-serif";
const FS = "13.5px";

// ── Grade order for Tamil Nadu / standard school grades ─────────────────────
// Used to compute "next" or "previous" grade automatically.
// The list is ordered from lowest to highest. Adjust if your school uses
// a different naming convention.
const GRADE_ORDER = [
  "LKG", "UKG",
  "I", "II", "III", "IV", "V",
  "VI", "VII", "VIII", "IX", "X",
  "XI", "XII",
];

// ── Only XI–XII are valid for HSC promotion / demotion ──────────────────────
// XI → promote → XII (auto-filled, available in toGrades → success)
// XII → promote → beyond XII (not in system → "not available" warning fires)
// XII → demote → XI (auto-filled, available in toGrades → success)
// XI  → demote → X  (not in HSC scope → "not available" warning fires)
const HSC_GRADES = new Set(["XI", "XII"]);

/** Filter a grades array to only those whose grade name is XI or XII */
const filterHscGrades = (grades) => {
  if (!Array.isArray(grades)) return [];
  return grades.filter((g) => HSC_GRADES.has(g?.grade?.trim().toUpperCase()));
};

/**
 * Given the FROM grade name and a list of TO-year grades, find the
 * auto-target grade for promotion (next) or demotion (previous).
 *
 * Returns the matching grade object from `toGrades`, or null if not found.
 */
const findAutoToGrade = (fromGradeName, toGrades, isPromote) => {
  if (!fromGradeName || !toGrades || toGrades.length === 0) return null;

  // Normalize: trim and uppercase for matching
  const normalize = (g) => g?.trim().toUpperCase();
  const fromNorm  = normalize(fromGradeName);

  // Try to find exact position in the ordered list
  const fromIdx = GRADE_ORDER.findIndex((g) => normalize(g) === fromNorm);

  let targetName = null;
  if (fromIdx !== -1) {
    const targetIdx = isPromote ? fromIdx + 1 : fromIdx - 1;
    if (targetIdx >= 0 && targetIdx < GRADE_ORDER.length) {
      targetName = GRADE_ORDER[targetIdx];
    }
  } else {
    // Fallback: try numeric suffix matching (e.g. "Class 6" → "Class 7")
    const numMatch = fromGradeName.match(/(\d+)/);
    if (numMatch) {
      const num        = parseInt(numMatch[1], 10);
      const targetNum  = isPromote ? num + 1 : num - 1;
      const re         = new RegExp(String(targetNum));
      const found      = toGrades.find((g) => re.test(g.grade));
      return found || null;
    }
    return null;
  }

  if (!targetName) return null;

  // Match against toGrades (case-insensitive, trimmed)
  return (
    toGrades.find((g) => normalize(g.grade) === normalize(targetName)) || null
  );
};

// Helper: "2025-2026" -> "2026-2027"
const getNextAcademicYear = (year) => {
  if (!year) return "";
  const parts = year.split("-");
  if (parts.length !== 2) return "";
  const start = parseInt(parts[0], 10);
  const end   = parseInt(parts[1], 10);
  if (isNaN(start) || isNaN(end)) return "";
  return `${start + 1}-${end + 1}`;
};

// Helper: "2025-2026" -> "2024-2025"
const getPrevAcademicYear = (year) => {
  if (!year) return "";
  const parts = year.split("-");
  if (parts.length !== 2) return "";
  const start = parseInt(parts[0], 10);
  const end   = parseInt(parts[1], 10);
  if (isNaN(start) || isNaN(end)) return "";
  return `${start - 1}-${end - 1}`;
};

const ACADEMIC_YEARS = [
  "2022-2023",
  "2023-2024",
  "2024-2025",
  "2025-2026",
  "2026-2027",
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const StudentPromotionHSC = () => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const user       = JSON.parse(localStorage.getItem("user"));
  const role       = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const schoolId   = user?.school?.id;
  const schoolName = user?.school?.name || "";

  const isSuperAdmin = role === "superadmin";

  const incomingStudents = location.state?.selectedStudents || location.state?.students || [];

  // Read mode from navigation state so that clicking "Demote Students"
  // in the settings dropdown opens this page already in demote mode.
  const [mode, setMode] = useState(location.state?.mode || "promote");

  // Schools list for superadmin dropdown
  const [schools, setSchools] = useState([]);

  // FROM fields
  const [fromAcademicYear, setFromAcademicYear] = useState("");
  const [fromGradeId,      setFromGradeId]      = useState(null);
  const [fromSectionId,    setFromSectionId]    = useState(null);
  const [fromSchoolId,     setFromSchoolId]     = useState(null);
  const [fromSchoolName,   setFromSchoolName]   = useState("");
  const [fromGradeName,    setFromGradeName]    = useState("");
  const [fromSectionName,  setFromSectionName]  = useState("");

  // TO fields
  const [toAcademicYear, setToAcademicYear] = useState("");
  const [toGradeId,      setToGradeId]      = useState(null);
  const [toSectionId,    setToSectionId]    = useState(null);

  // Dropdown data
  const [searchGrades,   setSearchGrades]   = useState([]);
  const [searchSections, setSearchSections] = useState([]);
  const [toGrades,       setToGrades]       = useState([]);
  const [toSections,     setToSections]     = useState([]);

  // Whether the auto-matched to-grade was not found in the to-year
  const [toGradeNotAvailable, setToGradeNotAvailable] = useState(false);

  // Group (subject group) selection for the TO side
  const [toGroups,          setToGroups]          = useState([]);   // [{id, subjectName, shortCode}]
  const [toGroupSubjectIds, setToGroupSubjectIds] = useState([]);   // selected subject IDs (strings)

  // FROM group display
  const [fromGroupSubjectNames, setFromGroupSubjectNames] = useState(""); // read-only display

  // Students
  const [students,    setStudents]    = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [submitted,   setSubmitted]   = useState(false);

  const studentsLoaded = students.length > 0;

  // Derived accent values
  const isPromote   = mode === "promote";
  const accentColor = isPromote ? COLOR.blueLt : COLOR.demoteLt;
  const accentDark  = isPromote ? COLOR.blue   : COLOR.demote;

  // ===========================================================================
  // Fetch all schools for superadmin
  // ===========================================================================
  useEffect(() => {
    if (!isSuperAdmin) return;
    axios
      .get(`${process.env.REACT_APP_API_URL}/school/getAllSchools`)
      .then((res) => setSchools(res.data.schools || []))
      .catch(() => message.error("Failed to fetch schools"));
  }, [isSuperAdmin]);

  // ===========================================================================
  // Incoming selected students — pre-fill FROM fields and compute TO year/grade
  // ===========================================================================
  useEffect(() => {
    if (incomingStudents.length === 0) return;

    const uniqueSchools  = [...new Set(incomingStudents.map((s) => s.school_id))];
    const uniqueGrades   = [...new Set(incomingStudents.map((s) => s.grade_id))];
    const uniqueSections = [...new Set(incomingStudents.map((s) => s.section_id))];

    if (uniqueSchools.length > 1) {
      message.error("Selected students belong to different schools. Please select students from the same school only.");
      return;
    }
    if (uniqueGrades.length > 1) {
      message.error("Selected students belong to different classes. Please select students from the same class only.");
      return;
    }
    if (uniqueSections.length > 1) {
      message.error("Selected students belong to different sections. Please select students from the same section only.");
      return;
    }

    const first        = incomingStudents[0];
    const year         = first.academicYear || "";
    const incomingMode = location.state?.mode || "promote";
    const targetYear   = incomingMode === "promote"
      ? getNextAcademicYear(year)
      : getPrevAcademicYear(year);

    setFromSchoolId(first.school_id);
    setFromSchoolName(first.School?.name || schoolName);
    setFromAcademicYear(year);
    setFromGradeId(first.grade_id);
    setFromSectionId(first.section_id);
    setFromGradeName(first.Grade?.grade || "");
    setFromSectionName(first.Section?.sectionName || "");
    setStudents(incomingStudents);
    setSelectedIds(incomingStudents.map((s) => s.id));
    setToAcademicYear(targetYear);
  }, []); // run once on mount

  // ===========================================================================
  // API helpers
  // ===========================================================================
  const fetchGradesByYear = useCallback(async (year, sId, setter) => {
    if (!sId || !year) { setter([]); return; }
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/grade/getGradesBySchoolAndYear/${sId}/${year}`
      );
      // Only show grades XI–XII for HSC promotion/demotion
      setter(filterHscGrades(res.data.grades || []));
    } catch (err) {
      if (err.response?.status !== 404) message.error("Failed to fetch grades");
      setter([]);
    }
  }, []);

  const fetchSectionsByGradeAndYear = useCallback(async (gradeId, year, sId, setter) => {
    if (!sId || !gradeId || !year) { setter([]); return; }
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/section/getSectionsBySchoolAndYear/${sId}/${year}`
      );
      const all      = res.data.sections || [];
      const filtered = all.filter(
        (s) => String(s.grade_id) === String(gradeId) || String(s.Grade?.id) === String(gradeId)
      );
      setter(filtered);
    } catch (err) {
      if (err.response?.status !== 404) message.error("Failed to fetch sections");
      setter([]);
    }
  }, []);

  const fetchGroupsByGradeAndYear = useCallback(async (gradeId, year, sId, setter) => {
    if (!sId || !gradeId || !year) { setter([]); return; }
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/subject/getSubjectsBySchoolAndYear/${sId}/${year}`
      );
      // subjects filtered to the selected grade
      const all = res.data.subjects || [];
      const filtered = all.filter(
        (s) => String(s.grade_id) === String(gradeId) || String(s.Grade?.id) === String(gradeId)
      );
      setter(filtered);
    } catch (err) {
      if (err.response?.status !== 404) message.error("Failed to fetch groups");
      setter([]);
    }
  }, []);

  const fetchStudents = useCallback(async (year, gradeId, sectionId, sId) => {
    if (!year || !gradeId || !sectionId || !sId) return;
    setLoading(true);
    setStudents([]);
    setSelectedIds([]);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/studenthsc/getStudentsByFilter`,
        { params: { school_id: sId, academicYear: year, grade_id: gradeId, section_id: sectionId } }
      );
      const list = res.data.students || [];
      setStudents(list);
      setSelectedIds(list.map((s) => s.id));
      if (list.length > 0) {
        setFromGradeName(list[0].Grade?.grade || "");
        setFromSectionName(list[0].Section?.sectionName || "");
      } else {
        message.info("No active students found for the selected criteria.");
      }
    } catch {
      message.error("Failed to fetch students");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ===========================================================================
  // EFFECTS
  // ===========================================================================

  // School change -> reset everything downstream
  useEffect(() => {
    if (incomingStudents.length > 0) return;
    setFromAcademicYear("");
    setFromGradeId(null);
    setFromSectionId(null);
    setSearchGrades([]);
    setSearchSections([]);
    setToAcademicYear("");
    setToGrades([]);
    setToSections([]);
    setToGradeId(null);
    setToSectionId(null);
    setToGradeNotAvailable(false);
    setStudents([]);
    setSelectedIds([]);
    setToGroups([]);
    setToGroupSubjectIds([]);
    setFromGroupSubjectNames("");
  }, [fromSchoolId]); // eslint-disable-line react-hooks/exhaustive-deps

  // fromAcademicYear + mode -> compute toYear and fetch from/to grades
  useEffect(() => {
    if (incomingStudents.length > 0) return;
    if (!fromAcademicYear || !fromSchoolId) {
      setSearchGrades([]);
      setSearchSections([]);
      setFromGradeId(null);
      setFromSectionId(null);
      setToAcademicYear("");
      setToGrades([]);
      setToSections([]);
      setToGradeId(null);
      setToSectionId(null);
      setToGradeNotAvailable(false);
      setToGroups([]);
      setToGroupSubjectIds([]);
      setFromGroupSubjectNames("");
      return;
    }
    fetchGradesByYear(fromAcademicYear, fromSchoolId, setSearchGrades);
    const targetYear = isPromote
      ? getNextAcademicYear(fromAcademicYear)
      : getPrevAcademicYear(fromAcademicYear);
    setToAcademicYear(targetYear);
    if (targetYear) fetchGradesByYear(targetYear, fromSchoolId, setToGrades);
  }, [fromAcademicYear, fromSchoolId, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // fromGradeId -> fetch FROM sections
  useEffect(() => {
    if (incomingStudents.length > 0) return;
    if (!fromGradeId || !fromAcademicYear || !fromSchoolId) {
      setSearchSections([]);
      setFromSectionId(null);
      return;
    }
    fetchSectionsByGradeAndYear(fromGradeId, fromAcademicYear, fromSchoolId, setSearchSections);
  }, [fromGradeId, fromAcademicYear, fromSchoolId]); // eslint-disable-line react-hooks/exhaustive-deps

  // fromSectionId -> fetch students (manual mode only)
  useEffect(() => {
    if (incomingStudents.length > 0) return;
    if (!fromAcademicYear || !fromGradeId || !fromSectionId || !fromSchoolId) return;
    fetchStudents(fromAcademicYear, fromGradeId, fromSectionId, fromSchoolId);
  }, [fromSectionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // toAcademicYear / fromSchoolId -> fetch TO grades
  useEffect(() => {
    if (!toAcademicYear || !fromSchoolId) {
      setToGrades([]);
      setToSections([]);
      setToGradeId(null);
      setToSectionId(null);
      setToGradeNotAvailable(false);
      return;
    }
    fetchGradesByYear(toAcademicYear, fromSchoolId, setToGrades);
  }, [toAcademicYear, fromSchoolId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── AUTO-SELECT TO GRADE when toGrades, fromGradeName, or mode changes ─────
  // When toGrades are loaded AND we know the fromGradeName, automatically
  // pick the next (promotion) or previous (demotion) grade from toGrades.
  // If that grade doesn't exist in toGrades, set toGradeNotAvailable = true.
  useEffect(() => {
    if (!fromGradeName || toGrades.length === 0) {
      setToGradeId(null);
      setToSectionId(null);
      setToSections([]);
      setToGradeNotAvailable(false);
      return;
    }

    const autoGrade = findAutoToGrade(fromGradeName, toGrades, isPromote);
    if (autoGrade) {
      setToGradeId(autoGrade.id);
      setToGradeNotAvailable(false);
    } else {
      setToGradeId(null);
      setToSectionId(null);
      setToSections([]);
      setToGradeNotAvailable(true);
    }
  }, [toGrades, fromGradeName, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // toGradeId -> fetch TO sections
  useEffect(() => {
    if (!toGradeId || !toAcademicYear || !fromSchoolId) {
      setToSections([]);
      setToSectionId(null);
      return;
    }
    setToGradeNotAvailable(false);
    fetchSectionsByGradeAndYear(toGradeId, toAcademicYear, fromSchoolId, setToSections);
  }, [toGradeId, toAcademicYear, fromSchoolId]); // eslint-disable-line react-hooks/exhaustive-deps

  // toGradeId -> fetch TO groups (subjects for that grade)
  useEffect(() => {
    if (!toGradeId || !toAcademicYear || !fromSchoolId) {
      setToGroups([]);
      setToGroupSubjectIds([]);
      return;
    }
    fetchGroupsByGradeAndYear(toGradeId, toAcademicYear, fromSchoolId, setToGroups);
    setToGroupSubjectIds([]);
  }, [toGradeId, toAcademicYear, fromSchoolId]); // eslint-disable-line react-hooks/exhaustive-deps

  // When students load, resolve FROM group subject names for display
  useEffect(() => {
    if (students.length === 0) { setFromGroupSubjectNames(""); return; }
    const first = students[0];
    const rawIds = first.group_subjects;
    if (!rawIds || (Array.isArray(rawIds) && rawIds.length === 0)) {
      setFromGroupSubjectNames("—");
      return;
    }

    // ── Deep-unwrap group_subjects ──────────────────────────────────────────
    // Handles all known storage shapes:
    //   [45, 46, 47]            → normal integer IDs
    //   ["45", "46"]            → string IDs
    //   ['["11"]']              → double-encoded JSON string inside array
    //   '["45","46"]'           → JSON string (Sequelize TEXT column)
    const deepParse = (val) => {
      if (!val) return [];
      let arr = val;
      // If it's a string, try parsing
      if (typeof arr === "string") {
        try { arr = JSON.parse(arr); } catch { return []; }
        if (typeof arr === "string") { try { arr = JSON.parse(arr); } catch { return []; } }
      }
      if (!Array.isArray(arr)) return [];
      // Each element might itself be a JSON string like '["11"]'
      const flat = [];
      arr.forEach((item) => {
        if (typeof item === "string" && item.trim().startsWith("[")) {
          try {
            const inner = JSON.parse(item);
            if (Array.isArray(inner)) inner.forEach((x) => flat.push(String(x)));
            else flat.push(String(inner));
          } catch { flat.push(String(item)); }
        } else {
          flat.push(String(item));
        }
      });
      return flat.filter(Boolean);
    };

    const ids = deepParse(rawIds);
    if (ids.length === 0) { setFromGroupSubjectNames("—"); return; }

    // Resolve names: use school+grade+year from either incomingStudents or state
    const resolveSchoolId = first.school_id  || fromSchoolId;
    const resolveGradeId  = first.grade_id   || fromGradeId;
    const resolveYear     = first.academicYear || fromAcademicYear;

    if (!resolveSchoolId || !resolveGradeId || !resolveYear) {
      setFromGroupSubjectNames(ids.join(", "));
      return;
    }

    // Build id→name map from year-scoped subjects (most accurate)
    axios
      .get(`${process.env.REACT_APP_API_URL}/subject/getSubjectsBySchoolAndYear/${resolveSchoolId}/${resolveYear}`)
      .then((res) => {
        const all = res.data.subjects || [];
        const idToName = {};
        all.forEach((s) => { idToName[String(s.id)] = s.subjectName; });

        // Also build name→name map so stored subject names pass through
        const nameSet = new Set(all.map((s) => s.subjectName?.toLowerCase()));

        const resolved = ids.map((id) => {
          if (idToName[id]) return idToName[id];                          // matched by ID ✓
          if (nameSet.has(id.toLowerCase())) return id;                   // already a name ✓
          return null;                                                     // unresolvable
        });

        const names = resolved.filter(Boolean);
        // If nothing resolved, show a dash instead of raw IDs (corrupted data)
        setFromGroupSubjectNames(names.length ? names.join(", ") : "—");
      })
      .catch(() => {
        // Fallback to grade-only endpoint
        axios
          .get(`${process.env.REACT_APP_API_URL}/subject/getSubjectsBySchoolAndGrade/${resolveSchoolId}/${resolveGradeId}`)
          .then((r2) => {
            const idToName2 = {};
            (r2.data.subjects || []).forEach((s) => { idToName2[String(s.id)] = s.subjectName; });
            const names2 = ids.map((id) => idToName2[id]).filter(Boolean);
            setFromGroupSubjectNames(names2.length ? names2.join(", ") : "—");
          })
          .catch(() => setFromGroupSubjectNames("—"));
      });
  }, [students, fromGradeId, fromAcademicYear, fromSchoolId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ===========================================================================
  // HANDLERS
  // ===========================================================================
  const handleSchoolChange = (val) => {
    const selected = schools.find((s) => s.id === val);
    setFromSchoolId(val);
    setFromSchoolName(selected?.name || "");
  };

  const handleFromYearChange = (val) => {
    setFromAcademicYear(val);
    setFromGradeId(null);
    setFromSectionId(null);
    setFromGradeName("");
    setFromSectionName("");
    setStudents([]);
    setSelectedIds([]);
    setToGradeId(null);
    setToSectionId(null);
    setToSections([]);
    setToGradeNotAvailable(false);
    setToGroups([]);
    setToGroupSubjectIds([]);
    setFromGroupSubjectNames("");
    setSubmitted(false);
  };

  const handleFromGradeChange = (val) => {
    const grade = searchGrades.find((g) => g.id === val);
    setFromGradeId(val);
    setFromGradeName(grade?.grade || "");
    setFromSectionId(null);
    setFromSectionName("");
    setStudents([]);
    setSelectedIds([]);
    // toGradeId will be auto-set by the effect above when fromGradeName updates
    setToGradeId(null);
    setToSectionId(null);
    setToSections([]);
    setToGradeNotAvailable(false);
    setToGroups([]);
    setToGroupSubjectIds([]);
    setFromGroupSubjectNames("");
    setSubmitted(false);
  };

  const handleFromSectionChange = (val) => {
    const sec = searchSections.find((s) => s.id === val);
    setFromSectionId(val);
    setFromSectionName(sec?.sectionName || "");
  };

  const handleToGradeChange = (val) => {
    setToGradeId(val);
    setToSectionId(null);
    setToSections([]);
    setToGradeNotAvailable(false);
    setToGroups([]);
    setToGroupSubjectIds([]);
  };

  // Mode toggle handler — resets all filter/student state, keeps school
  const handleModeChange = (newMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setFromAcademicYear("");
    setFromGradeId(null);
    setFromSectionId(null);
    setFromGradeName("");
    setFromSectionName("");
    setSearchGrades([]);
    setSearchSections([]);
    setToAcademicYear("");
    setToGradeId(null);
    setToSectionId(null);
    setToGrades([]);
    setToSections([]);
    setToGradeNotAvailable(false);
    setStudents([]);
    setSelectedIds([]);
    setToGroups([]);
    setToGroupSubjectIds([]);
    setFromGroupSubjectNames("");
    setSubmitted(false);
  };

  // Checkboxes
  const toggleAll = (e) =>
    setSelectedIds(e.target.checked ? students.map((s) => s.id) : []);
  const toggleOne = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]
    );
  const allChecked  = students.length > 0 && selectedIds.length === students.length;
  const someChecked = selectedIds.length > 0 && selectedIds.length < students.length;

  // ── Save: hits promote or demote endpoint based on mode ──────────────────
  const handleSave = async () => {
    setSubmitted(true);
    if (toGradeNotAvailable) { message.error(`The target grade is not available for ${toAcademicYear}. Please create the grade first.`); return; }
    if (!toGradeId)               { message.error("Please select To Class.");   return; }
    if (!toSectionId)             { message.error("Please select To Section."); return; }
    if (toGroups.length > 0 && toGroupSubjectIds.length === 0) { message.error("Please select at least one group subject."); return; }
    if (selectedIds.length === 0) { message.warning("Select at least one student."); return; }

    setSaving(true);
    try {
      const endpoint = isPromote
        ? `${process.env.REACT_APP_API_URL}/studenthsc/promoteStudents`
        : `${process.env.REACT_APP_API_URL}/studenthsc/demoteStudents`;

      const res = await axios.post(endpoint, {
        studentIds: selectedIds,
        toAcademicYear,
        toGradeId,
        toSectionId,
        toGroupSubjectIds: toGroupSubjectIds.length > 0 ? toGroupSubjectIds : undefined,
      });

      message.success(
        res.data.message ||
        (isPromote ? "Students promoted successfully!" : "Students demoted successfully!")
      );
      navigate("/studenthsc");
    } catch (err) {
      message.error(
        err.response?.data?.error ||
        (isPromote ? "Promotion failed." : "Demotion failed.")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => navigate("/studenthsc");

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  };

  // Derive the display name for the auto-selected to-grade
  const toGradeName = toGradeId
    ? (toGrades.find((g) => g.id === toGradeId)?.grade || "")
    : "";

  // Compute what the expected target grade name is (for the "not available" message)
  const expectedToGradeName = (() => {
    if (!fromGradeName) return "";
    const normalize = (g) => g?.trim().toUpperCase();
    const fromNorm  = normalize(fromGradeName);
    const fromIdx   = GRADE_ORDER.findIndex((g) => normalize(g) === fromNorm);
    if (fromIdx !== -1) {
      const targetIdx = isPromote ? fromIdx + 1 : fromIdx - 1;
      if (targetIdx >= 0 && targetIdx < GRADE_ORDER.length) return GRADE_ORDER[targetIdx];
    }
    return "";
  })();

  // To Class dropdown — only show grades XI–XII (HSC range)
  const toGradeOptions = filterHscGrades(toGrades);

  return (
    <Layout>
      <div className="app-page" style={{ fontFamily: FF }}>

        {/* ── Page title + Mode Toggle ────────────────────────────────────── */}
        <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: COLOR.text, margin: 0, letterSpacing: "-0.3px", fontFamily: FF }}>
              HSC Student {isPromote ? "Promotion" : "Demotion"}
            </h1>
            <div style={{ width: 40, height: 3, background: accentColor, borderRadius: 2, marginTop: 6 }} />
          </div>

          {/* Mode toggle — hidden when students arrive via navigation state */}
          {incomingStudents.length === 0 && (
            <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 10, padding: 4, gap: 4 }}>
              {[
                { key: "promote", label: "⬆ Promote", color: COLOR.blueLt },
                { key: "demote",  label: "⬇ Demote",  color: COLOR.demoteLt },
              ].map(({ key, label, color }) => {
                const active = mode === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleModeChange(key)}
                    style={{
                      all: "unset",
                      padding: "7px 22px",
                      borderRadius: 7,
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: FF,
                      cursor: "pointer",
                      transition: "all 0.18s",
                      background: active ? color : "transparent",
                      color: active ? "#fff" : COLOR.textMid,
                      boxShadow: active ? `0 2px 8px ${color}55` : "none",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Demotion warning banner ─────────────────────────────────── */}
        {!isPromote && (
          <div style={{
            background: COLOR.demoteBg,
            border: `1px solid ${COLOR.demoteBorder}`,
            borderRadius: 10,
            padding: "12px 18px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
            color: COLOR.demote,
            fontWeight: 500,
          }}>
            <span>You are in <strong>Demotion Mode</strong>. Students will be moved to the <strong>previous academic year</strong>. Please confirm this is intentional before saving.</span>
          </div>
        )}

        {/* ── Main card ──────────────────────────────────────────────────── */}
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: `1px solid ${COLOR.border}`, padding: "28px 32px" }}>

          {/* ================================================================
              SECTION 1 — FROM (Selection Criteria)
          ================================================================ */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ ...sectionHeaderStyle, borderBottomColor: accentColor, color: accentDark }}>
              Selection Criteria (From)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>

              {/* From Academic Year */}
              <div>
                <label style={labelStyle}>From Academic Year <span style={{ color: COLOR.danger }}>*</span></label>
                {incomingStudents.length > 0 ? (
                  <input style={readonlyInputStyle} value={fromAcademicYear || "—"} readOnly />
                ) : (
                  <Select
                    style={{ width: "100%" }}
                    placeholder="Select Year"
                    value={fromAcademicYear || undefined}
                    onChange={handleFromYearChange}
                    disabled={isSuperAdmin && !fromSchoolId}
                  >
                    {ACADEMIC_YEARS.map((y) => (
                      <Option key={y} value={y}>{y}</Option>
                    ))}
                  </Select>
                )}
                {isSuperAdmin && !fromSchoolId && incomingStudents.length === 0 && (
                  <div style={hintStyle}>Select a school first</div>
                )}
              </div>

              {/* From School */}
              <div>
                <label style={labelStyle}>From School <span style={{ color: COLOR.danger }}>*</span></label>
                {incomingStudents.length > 0 ? (
                  <input style={readonlyInputStyle} value={fromSchoolName} readOnly />
                ) : isSuperAdmin ? (
                  <Select
                    style={{ width: "100%" }}
                    placeholder="Select School"
                    value={fromSchoolId || undefined}
                    onChange={handleSchoolChange}
                    showSearch
                    filterOption={(input, option) =>
                      option?.children?.toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {schools.map((s) => (
                      <Option key={s.id} value={s.id}>{s.name}</Option>
                    ))}
                  </Select>
                ) : (
                  <Select
                    style={{ width: "100%" }}
                    placeholder="Select School"
                    value={fromSchoolId || undefined}
                    onChange={handleSchoolChange}
                  >
                    {schoolId && (
                      <Option key={schoolId} value={schoolId}>{schoolName}</Option>
                    )}
                  </Select>
                )}
              </div>

              {/* From Class */}
              <div>
                <label style={labelStyle}>From Class <span style={{ color: COLOR.danger }}>*</span></label>
                {studentsLoaded || incomingStudents.length > 0 ? (
                  <input style={readonlyInputStyle} value={fromGradeName || "—"} readOnly />
                ) : (
                  <Select
                    style={{ width: "100%" }}
                    placeholder="Select Class"
                    value={fromGradeId || undefined}
                    disabled={!fromAcademicYear || searchGrades.length === 0}
                    onChange={handleFromGradeChange}
                  >
                    {searchGrades.map((g) => (
                      <Option key={g.id} value={g.id}>{g.grade}</Option>
                    ))}
                  </Select>
                )}
                {incomingStudents.length === 0 && fromAcademicYear && searchGrades.length === 0 && !loading && (
                  <div style={hintStyle}>No classes found for {fromAcademicYear}</div>
                )}
              </div>

              {/* From Section */}
              <div>
                <label style={labelStyle}>From Section <span style={{ color: COLOR.danger }}>*</span></label>
                {studentsLoaded || incomingStudents.length > 0 ? (
                  <input style={readonlyInputStyle} value={fromSectionName || "—"} readOnly />
                ) : (
                  <Select
                    style={{ width: "100%" }}
                    placeholder="Select Section"
                    value={fromSectionId || undefined}
                    disabled={!fromGradeId || searchSections.length === 0}
                    onChange={handleFromSectionChange}
                  >
                    {searchSections.map((s) => (
                      <Option key={s.id} value={s.id}>{s.sectionName}</Option>
                    ))}
                  </Select>
                )}
                {incomingStudents.length === 0 && fromGradeId && searchSections.length === 0 && !loading && (
                  <div style={hintStyle}>No sections found for this class &amp; year</div>
                )}
              </div>

              {/* From Group (read-only display of student's current group subjects) */}
              {(studentsLoaded || incomingStudents.length > 0) && (
                <div>
                  <label style={labelStyle}>From Group</label>
                  <input
                    style={readonlyInputStyle}
                    value={fromGroupSubjectNames || (students.length > 0 ? "Loading…" : "—")}
                    readOnly
                    title={fromGroupSubjectNames}
                  />
                  <div style={{ fontSize: 11, color: COLOR.textSoft, marginTop: 3 }}>Current group subjects of selected students</div>
                </div>
              )}

            </div>
          </div>

          {/* ================================================================
              SECTION 2 — TO (Promote To / Demote To)
          ================================================================ */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ ...sectionHeaderStyle, borderBottomColor: accentColor, color: accentDark }}>
              {isPromote ? "Promote To" : "Demote To"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 20 }}>

              {/* To Academic Year — auto-computed, always read-only */}
              <div>
                <label style={labelStyle}>To Academic Year <span style={{ color: COLOR.danger }}>*</span></label>
                <input
                  style={readonlyInputStyle}
                  value={toAcademicYear || (fromAcademicYear ? "—" : "Select From Year first")}
                  readOnly
                />
              </div>

              {/* To School — always read-only */}
              <div>
                <label style={labelStyle}>To School <span style={{ color: COLOR.danger }}>*</span></label>
                <input
                  style={readonlyInputStyle}
                  value={fromSchoolName || (incomingStudents.length > 0 ? schoolName : "")}
                  placeholder="Auto-filled From School"
                  readOnly
                />
              </div>

              {/* To Class — auto-selected based on from grade; user can override */}
              <div>
                <label style={labelStyle}>To Class <span style={{ color: COLOR.danger }}>*</span></label>
                {toGradeNotAvailable ? (
                  <>
                    <input
                      style={{
                        ...readonlyInputStyle,
                        background: "#fff7e6",
                        border: "1px solid #ffc069",
                        color: "#d46b08",
                        cursor: "not-allowed",
                      }}
                      value={
                        expectedToGradeName
                          ? `Grade ${expectedToGradeName} not available`
                          : "Grade not available for this academic year"
                      }
                      readOnly
                    />
                    <div style={{ color: "#d46b08", fontSize: 12, marginTop: 4, fontWeight: 500 }}>
                      ⚠️ {expectedToGradeName
                        ? <>Grade <strong>{expectedToGradeName}</strong> is not available for {toAcademicYear}. Please create it first.</>
                        : <>The target grade is not available for {toAcademicYear}. Please create it first.</>
                      }
                    </div>
                  </>
                ) : (
                  <>
                    <Select
                      style={{ width: "100%" }}
                      placeholder={
                        !toAcademicYear
                          ? "Select From Year first"
                          : toGradeOptions.length === 0
                          ? `No classes for ${toAcademicYear}`
                          : "Select Class"
                      }
                      value={toGradeId || undefined}
                      disabled={!toAcademicYear || !studentsLoaded || toGradeOptions.length === 0}
                      onChange={handleToGradeChange}
                      status={submitted && !toGradeId ? "error" : ""}
                    >
                      {toGradeOptions.map((g) => (
                        <Option key={g.id} value={g.id}>{g.grade}</Option>
                      ))}
                    </Select>
                    {submitted && !toGradeId && (
                      <div style={errorStyle}>Class is required</div>
                    )}
                    {toAcademicYear && toGradeOptions.length === 0 && studentsLoaded && (
                      <div style={hintStyle}>No classes found for {toAcademicYear}. Create grades for this year first.</div>
                    )}
                  </>
                )}
              </div>

              {/* To Section — user must select */}
              <div>
                <label style={labelStyle}>To Section <span style={{ color: COLOR.danger }}>*</span></label>
                <Select
                  style={{ width: "100%" }}
                  placeholder={
                    toGradeNotAvailable
                      ? "Grade not available"
                      : !toGradeId
                      ? "Select Class first"
                      : toSections.length === 0
                      ? "No sections for selected class"
                      : "Select Section"
                  }
                  value={toSectionId || undefined}
                  disabled={!toGradeId || toSections.length === 0 || toGradeNotAvailable}
                  onChange={(val) => setToSectionId(val)}
                  status={submitted && !toSectionId && !toGradeNotAvailable ? "error" : ""}
                >
                  {toSections.map((s) => (
                    <Option key={s.id} value={s.id}>{s.sectionName}</Option>
                  ))}
                </Select>
                {submitted && !toSectionId && !toGradeNotAvailable && (
                  <div style={errorStyle}>Section is required</div>
                )}
                {toGradeId && toSections.length === 0 && !toGradeNotAvailable && (
                  <div style={hintStyle}>No sections found for this class in {toAcademicYear}. Create sections first.</div>
                )}
              </div>

              {/* To Group — multi-select with checkboxes */}
              <div style={{ gridColumn: "span 1" }}>
                <label style={labelStyle}>
                  To Group {toGroups.length > 0 && <span style={{ color: COLOR.danger }}>*</span>}
                </label>
                {!toGradeId || toGradeNotAvailable ? (
                  <input
                    style={readonlyInputStyle}
                    value={toGradeNotAvailable ? "Grade not available" : "Select Class first"}
                    readOnly
                  />
                ) : toGroups.length === 0 ? (
                  <div style={{ ...readonlyInputStyle, display: "flex", alignItems: "center", color: COLOR.textSoft }}>
                    No group subjects found for this class
                  </div>
                ) : (
                  <div
                    style={{
                      border: `1px solid ${submitted && toGroups.length > 0 && toGroupSubjectIds.length === 0 ? COLOR.danger : COLOR.border}`,
                      borderRadius: 6,
                      padding: "6px 10px",
                      background: "#fff",
                      maxHeight: 160,
                      overflowY: "auto",
                      fontSize: FS,
                      fontFamily: FF,
                    }}
                  >
                    {/* Select All row */}
                    <div
                      style={{
                        padding: "4px 0 6px",
                        borderBottom: `1px solid ${COLOR.border}`,
                        marginBottom: 4,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: "pointer",
                      }}
                      onClick={() =>
                        setToGroupSubjectIds(
                          toGroupSubjectIds.length === toGroups.length
                            ? []
                            : toGroups.map((s) => String(s.id))
                        )
                      }
                    >
                      <Checkbox
                        checked={toGroupSubjectIds.length === toGroups.length && toGroups.length > 0}
                        indeterminate={toGroupSubjectIds.length > 0 && toGroupSubjectIds.length < toGroups.length}
                        onChange={() => {}}
                      />
                      <span style={{ fontWeight: 600, color: COLOR.textMid, fontSize: 12.5 }}>
                        Select All ({toGroups.length})
                      </span>
                    </div>
                    {/* Individual subject checkboxes */}
                    {toGroups.map((subj) => {
                      const sid = String(subj.id);
                      const checked = toGroupSubjectIds.includes(sid);
                      return (
                        <div
                          key={subj.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "4px 0",
                            cursor: "pointer",
                            borderRadius: 4,
                            paddingLeft: 2,
                          }}
                          onClick={() =>
                            setToGroupSubjectIds((prev) =>
                              prev.includes(sid) ? prev.filter((id) => id !== sid) : [...prev, sid]
                            )
                          }
                        >
                          <Checkbox checked={checked} onChange={() => {}} />
                          <span style={{ color: COLOR.text, fontSize: FS }}>
                            {subj.subjectName}
                            {subj.shortCode && (
                              <span style={{ color: COLOR.textSoft, fontSize: 12, marginLeft: 5 }}>
                                ({subj.shortCode})
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {submitted && toGroups.length > 0 && toGroupSubjectIds.length === 0 && (
                  <div style={errorStyle}>Select at least one group subject</div>
                )}
                {toGroupSubjectIds.length > 0 && (
                  <div style={{ fontSize: 11, color: COLOR.blue, marginTop: 3 }}>
                    {toGroupSubjectIds.length} subject{toGroupSubjectIds.length > 1 ? "s" : ""} selected
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* ================================================================
              STUDENTS TABLE
          ================================================================ */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ ...sectionHeaderStyle, borderBottomColor: accentColor, color: accentDark }}>
              {isPromote ? "Students to Promote" : "Students to Demote"}
              {studentsLoaded && (
                <span style={{ fontSize: 13, fontWeight: 400, color: COLOR.textMid, marginLeft: 12 }}>
                  ({selectedIds.length} of {students.length} selected)
                </span>
              )}
            </div>
          </div>

          <Spin spinning={loading}>
            <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", overflow: "hidden", border: `1px solid ${COLOR.border}` }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FF, fontSize: FS }}>
                  <thead>
                    <tr style={{ background: COLOR.headBg }}>
                      <th style={{ padding: "13px 16px", width: 44, textAlign: "center" }}>
                        <Checkbox
                          checked={allChecked}
                          indeterminate={someChecked}
                          onChange={toggleAll}
                          disabled={!studentsLoaded}
                        />
                      </th>
                      {["Admission No.", "Student Name", "Gender", "Date of Birth", "Class", "Section"].map((h) => (
                        <th key={h} style={{ padding: "13px 16px", fontWeight: 600, fontSize: "13px", color: COLOR.headText, textAlign: "left", whiteSpace: "nowrap", letterSpacing: "0.2px" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {studentsLoaded ? (
                      students.map((student, index) => {
                        const isSelected = selectedIds.includes(student.id);
                        const baseBg     = index % 2 === 0 ? COLOR.rowOdd : COLOR.rowEven;
                        const activeBg   = isSelected ? COLOR.rowSel : baseBg;
                        return (
                          <tr
                            key={student.id}
                            onMouseEnter={e => e.currentTarget.style.background = COLOR.rowHover}
                            onMouseLeave={e => e.currentTarget.style.background = activeBg}
                            style={{ background: activeBg, transition: "background 0.12s", borderBottom: `1px solid ${COLOR.border}` }}
                          >
                            <td style={{ padding: "10px 16px", textAlign: "center" }}>
                              <Checkbox
                                checked={isSelected}
                                onChange={() => toggleOne(student.id)}
                              />
                            </td>
                            <td style={{ padding: "11px 16px", color: COLOR.blueLt, fontWeight: 600 }}>{student.admissionNumber || "N/A"}</td>
                            <td style={{ padding: "11px 16px", color: COLOR.text, fontWeight: 500 }}>{student.name}</td>
                            <td style={{ padding: "11px 16px", color: COLOR.textMid }}>{student.gender || "N/A"}</td>
                            <td style={{ padding: "11px 16px", color: COLOR.textMid, whiteSpace: "nowrap" }}>{formatDate(student.dob)}</td>
                            <td style={{ padding: "11px 16px", color: COLOR.textMid }}>{student.Grade?.grade || fromGradeName || "N/A"}</td>
                            <td style={{ padding: "11px 16px", color: COLOR.textMid }}>{student.Section?.sectionName || fromSectionName || "N/A"}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", padding: "40px 16px", color: COLOR.textSoft, fontSize: FS }}>
                          {loading
                            ? "Loading students..."
                            : isSuperAdmin && !fromSchoolId
                            ? "Select a school to begin."
                            : "Select Academic Year → Class → Section above to load students."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Spin>

          {/* ================================================================
              ACTION BUTTONS
          ================================================================ */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
            <button
              onClick={handleSave}
              disabled={!studentsLoaded || saving || toGradeNotAvailable}
              onMouseEnter={e => {
                if (studentsLoaded && !saving && !toGradeNotAvailable) {
                  e.currentTarget.style.background = accentDark;
                  e.currentTarget.style.boxShadow  = `0 4px 14px ${accentDark}55`;
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = accentColor;
                e.currentTarget.style.boxShadow  = `0 2px 8px ${accentColor}44`;
              }}
              style={{
                all: "unset", display: "inline-flex", alignItems: "center",
                padding: "9px 28px", borderRadius: 8, fontSize: FS, fontWeight: 600,
                cursor: !studentsLoaded || saving || toGradeNotAvailable ? "not-allowed" : "pointer",
                background: accentColor, color: "#fff",
                boxShadow: `0 2px 8px ${accentColor}44`,
                transition: "all 0.18s", fontFamily: FF,
                opacity: !studentsLoaded || saving || toGradeNotAvailable ? 0.6 : 1,
              }}
            >
              {saving
                ? (isPromote ? "Promoting..." : "Demoting...")
                : (isPromote ? "Promote Students" : "Demote Students")}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              style={{
                all: "unset", display: "inline-flex", alignItems: "center",
                padding: "9px 28px", borderRadius: 8, fontSize: FS, fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                background: "#fff", color: COLOR.textMid,
                border: `1.5px solid ${COLOR.border}`,
                transition: "all 0.18s", fontFamily: FF,
              }}
            >
              Cancel
            </button>
          </div>

        </div>
      </div>
    </Layout>
  );
};

// =============================================================================
// Styles
// =============================================================================
const FF_local = "'Segoe UI', system-ui, sans-serif";

const sectionHeaderStyle = {
  fontSize: 14,
  fontWeight: 700,
  color: "#1e40af",
  borderBottom: "2px solid #3b82f6",
  paddingBottom: 6,
  marginBottom: 20,
  fontFamily: FF_local,
};

const labelStyle = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#374151",
  marginBottom: 5,
  fontFamily: FF_local,
};

const readonlyInputStyle = {
  width: "100%",
  padding: "6px 11px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  fontSize: 13.5,
  color: "#64748b",
  cursor: "not-allowed",
  boxSizing: "border-box",
  height: 32,
  fontFamily: FF_local,
};

const errorStyle = {
  color: "#e21216",
  fontSize: 12,
  marginTop: 4,
};

const hintStyle = {
  color: "#f59e0b",
  fontSize: 11,
  marginTop: 4,
};

export default StudentPromotionHSC;