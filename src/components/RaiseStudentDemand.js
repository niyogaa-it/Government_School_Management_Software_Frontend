/**
 * RaiseStudentDemand.js  (v2)
 *
 * Full workflow:
 *  1. Admin picks School / Academic Year / Course
 *  2. Admin picks Grade → Section → Medium → Student Type
 *  3. System fetches matching Annual Fee Structure → shows fee items with checkboxes
 *  4. System fetches matching active students → shows student list with checkboxes
 *  5. Admin selects students (individual or select-all)
 *  6. Click "Raise Demand" → POST /studentFeeDemand/raiseBulk (or raiseForStudent for single)
 *
 * Individual mode: search by admission number → find one student → pick fee items → save.
 * Bulk mode: filter grid → student list → select subset → raise.
 */

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Layout from "./Layout";
import { useNavigate } from "react-router-dom";
import { useFilter } from "./FilterContext";
import { notification, Select } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  TeamOutlined,
  FilterOutlined,
  RiseOutlined,
} from "@ant-design/icons";

const BASE = process.env.REACT_APP_API_URL;

/* ─── Design tokens — matches FeeCollectionList ──────────────────────────── */
const C = {
  primary:      "#1d2a4d",
  accent:       "#4f8ef7",
  accentLight:  "#e8f0fe",
  accentDark:   "#1e40af",
  success:      "#22c55e",
  successLight: "#dcfce7",
  danger:       "#ef4444",
  dangerLight:  "#fee2e2",
  warning:      "#f59e0b",
  warningLight: "#fef3c7",
  border:       "#d1dae8",
  bg:           "#f4f6fb",
  card:         "#ffffff",
  text:         "#1d2a4d",
  muted:        "#6b7a99",
  tableHead:    "#1d2a4d",
  tableOdd:     "#ffffff",
  tableEven:    "#f4f6fb",
};
const FF  = "'Segoe UI', system-ui, sans-serif";
const FS  = "13px";

/* ─── Shared style helpers ───────────────────────────────────────────────────── */
const inputStyle = {
  width: "100%", padding: "8px 11px",
  border: `1.5px solid ${C.border}`, borderRadius: 7,
  fontSize: FS, color: C.text, background: "#fff",
  outline: "none", boxSizing: "border-box", fontFamily: FF,
};
const selectStyle = { ...inputStyle };
const labelStyle  = {
  display: "block", fontSize: 11, fontWeight: 700,
  color: C.muted, marginBottom: 5,
  textTransform: "uppercase", letterSpacing: "0.05em",
};
const cardStyle = {
  background: C.card, border: `1px solid ${C.border}`,
  borderRadius: 12, padding: "20px 24px", marginBottom: 20,
  boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
};
const sectionTitleStyle = {
  fontSize: 12, fontWeight: 700, color: C.primary,
  textTransform: "uppercase", letterSpacing: "0.07em",
  marginBottom: 16, paddingBottom: 10,
  borderBottom: `2px solid ${C.accentLight}`,
};
const btnPrimary = {
  padding: "9px 22px", background: C.accent, color: "#fff",
  border: "none", borderRadius: 7, fontWeight: 700,
  fontSize: 14, cursor: "pointer", transition: "all 0.15s", fontFamily: FF,
};
const btnSecondary = {
  padding: "9px 20px", background: C.bg, color: C.primary,
  border: `1.5px solid ${C.border}`, borderRadius: 7,
  fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: FF,
};
const badgeStyle = (color, bg) => ({
  display: "inline-block", padding: "2px 9px", borderRadius: 20,
  fontSize: 11, fontWeight: 700, color, background: bg,
});

/* ─── Static options ─────────────────────────────────────────────────────────── */
const COURSE_OPTIONS       = ["SSLC", "HSC"];
const MEDIUM_OPTIONS       = ["Tamil", "English"];
const STUDENT_TYPE_OPTIONS = ["new", "old"];

const { Option } = Select;

/* ════════════════════════════════════════════════════════════════════════════ */
export default function RaiseStudentDemand() {
  const navigate = useNavigate();
  const { selectedSchool, selectedYear } = useFilter();
  const user     = JSON.parse(localStorage.getItem("user") || "{}");
  const rawRole  = (user?.roleName || "").toLowerCase().replace(/\s+/g, "");
  const isAdmin  = rawRole === "superadmin";

  const schoolId = isAdmin
    ? (selectedSchool && selectedSchool !== "all" ? String(selectedSchool) : null)
    : String(user?.school?.id || "");

  const academicYear = selectedYear || "2025-2026";

  /* ── always bulk mode — individual option removed ── */
  const [course, setCourse] = useState("SSLC");

  /* ── filter dropdowns ── */
  const [gradeOptions,        setGradeOptions]        = useState([]);
  const [selectedGradeId,     setSelectedGradeId]     = useState("");
  const [sectionOptions,      setSectionOptions]      = useState([]);
  const [selectedSectionId,   setSelectedSectionId]   = useState("");
  const [selectedMedium,      setSelectedMedium]      = useState("");
  const [selectedStudentType, setSelectedStudentType] = useState("");
  const [admissionFilter,     setAdmissionFilter]     = useState(""); // admission number search

  /* ── fee structure ── */
  const [templateFeeItems, setTemplateFeeItems] = useState([]);
  const [checkedFees,      setCheckedFees]      = useState({}); // index → bool
  const [feeLoading,       setFeeLoading]       = useState(false);

  /* ── student list (bulk) ── */
  const [studentList,    setStudentList]    = useState([]);
  const [selectedStdIds, setSelectedStdIds] = useState(new Set()); // admissionNumber set
  const [studLoading,    setStudLoading]    = useState(false);
  const [studError,      setStudError]      = useState("");
  const [existingDemandAdmNums, setExistingDemandAdmNums] = useState(new Set());
  // Map of admissionNumber -> Set of already-raised fee type strings (lowercase)
  const [raisedFeeTypesMap, setRaisedFeeTypesMap] = useState({});

  /* ── submission ── */
  const [saving,    setSaving]    = useState(false);
  const [resultMsg, setResultMsg] = useState(null);

  /* ── antd notification ── */
  const [notifApi, notifContextHolder] = notification.useNotification();

  /* ─── derived helpers ─────────────────────────────────────────────────────── */
  const selectedGradeLabel = gradeOptions.find(
    (g) => g.id === parseInt(selectedGradeId)
  )?.grade || "";

  const selectedSectionLabel = sectionOptions.find(
    (s) => s.id === parseInt(selectedSectionId)
  )?.sectionName || "";

  /* Filter grades by course */
  const filteredGradeOptions = gradeOptions.filter((g) => {
    const gn = g.grade?.trim().toUpperCase();
    if (course === "HSC")  return gn === "XI" || gn === "XII" || gn === "11" || gn === "12";
    if (course === "SSLC") return gn !== "XI" && gn !== "XII" && gn !== "11" && gn !== "12";
    return true;
  });

  /* ─── Load grades ────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!schoolId || !academicYear) return;
    axios
      .get(`${BASE}/grade/getGradesBySchoolAndYear/${schoolId}/${academicYear}`)
      .then((r) => setGradeOptions(r.data.grades || []))
      .catch(() => setGradeOptions([]));
  }, [schoolId, academicYear]);

  /* Reset grade when course changes */
  useEffect(() => {
    setSelectedGradeId("");
    setSelectedSectionId("");
    setStudentList([]);
    setSelectedStdIds(new Set());
    setTemplateFeeItems([]);
    setCheckedFees({});
  }, [course]);

  /* ─── Load sections when grade changes ───────────────────────────────────── */
  useEffect(() => {
    if (!schoolId || !selectedGradeId) {
      setSectionOptions([]);
      setSelectedSectionId("");
      return;
    }
    axios
      .get(`${BASE}/section/getSectionsBySchoolAndGrade/${schoolId}/${selectedGradeId}`)
      .then((r) => setSectionOptions(r.data.sections || []))
      .catch(() => setSectionOptions([]));
  }, [schoolId, selectedGradeId]);

  /* ─── Load fee structure template ────────────────────────────────────────── */
  const fetchFeeStructure = useCallback(
    (gradeLabel, mediumVal, studentTypeVal) => {
      if (!schoolId || !academicYear) return;

      setFeeLoading(true);
      const params = new URLSearchParams();
      if (course)         params.set("course",       course);
      if (gradeLabel)     params.set("grade",        gradeLabel);
      if (mediumVal)      params.set("medium",       mediumVal);
      if (studentTypeVal) params.set("student_type", studentTypeVal);

      axios
        .get(`${BASE}/raiseFeeDemand/getBySchoolAndYear/${schoolId}/${academicYear}?${params}`)
        .then((r) => {
          const allItems = r.data.feeDetails || [];
          const norm = (v) => (v || "").toString().trim().toLowerCase();

          /* client-side strict filter */
          const items = allItems.filter((f) => {
            if (norm(String(f.school_id)) !== norm(schoolId)) return false;
            if (f.course && norm(f.course) !== norm(course))  return false;
            if (gradeLabel && norm(f.grade) !== norm(gradeLabel)) return false;
            if (mediumVal  && f.medium && norm(f.medium) !== norm(mediumVal)) return false;
            if (studentTypeVal && f.studentType && norm(f.studentType) !== norm(studentTypeVal)) return false;
            return true;
          });

          setTemplateFeeItems(items);
          const init = {};
          items.forEach((_, i) => { init[i] = true; });
          setCheckedFees(init);
        })
        .catch(() => {
          setTemplateFeeItems([]);
          setCheckedFees({});
        })
        .finally(() => setFeeLoading(false));
    },
    [schoolId, academicYear, course]
  );

  /* Trigger fee structure load */
  useEffect(() => {
    if (!selectedGradeLabel) {
      setTemplateFeeItems([]);
      setCheckedFees({});
      return;
    }
    fetchFeeStructure(selectedGradeLabel, selectedMedium, selectedStudentType);
  }, [selectedGradeLabel, selectedMedium, selectedStudentType, fetchFeeStructure]);

  /* ─── Load student list for BULK mode ────────────────────────────────────── */
  const fetchStudents = useCallback(async () => {
    if (!schoolId || !academicYear || !selectedGradeLabel) return;

    setStudLoading(true);
    setStudError("");
    setStudentList([]);
    setSelectedStdIds(new Set());
    setExistingDemandAdmNums(new Set());
    setRaisedFeeTypesMap({});

    try {
      let raw = [];

      if (course === "HSC") {
        const r = await axios.get(
          `${BASE}/studenthsc/getStudenthscsBySchool/${schoolId}`
        );
        raw = (r.data.studenthscs || []).filter(
          (s) => s.academicYear === academicYear && s.status !== "DELETED" && s.status !== "Removed"
        );
      } else {
        const r = await axios.get(
          `${BASE}/studentsslc/getStudentsslcsBySchoolAndYear/${schoolId}/${academicYear}`
        );
        raw = (r.data.studentsslcs || r.data.students || []).filter(
          (s) => s.status !== "Removed" && s.status !== "Withdrawn" && s.status !== "TC Issued"
        );
      }

      /* Normalise Grade / Section */
      const normalised = raw.map((s) => ({
        ...s,
        Grade:   s.Grade   || { grade: "N/A" },
        Section: s.Section || { sectionName: "N/A" },
      }));

      const norm = (v) => (v || "").toString().trim().toLowerCase();

      const filtered = normalised.filter((s) => {
        if (norm(s.Grade?.grade) !== norm(selectedGradeLabel)) return false;
        if (selectedSectionLabel && norm(s.Section?.sectionName) !== norm(selectedSectionLabel)) return false;
        if (selectedMedium) {
          const stuMedium = s.medium || s.preferredmedium || "";
          if (norm(stuMedium) !== norm(selectedMedium)) return false;
        }
        if (selectedStudentType && norm(s.studentType) !== norm(selectedStudentType)) return false;
        return true;
      });

      /* Fetch existing demands to detect already-raised students */
      let raisedSet = new Set();
      try {
        const params = new URLSearchParams({
          school_id:     schoolId,
          academic_year: academicYear,
        });
        if (course)              params.set("course",  course);
        if (selectedGradeLabel)  params.set("grade",   selectedGradeLabel);
        if (selectedSectionLabel) params.set("section", selectedSectionLabel);

        const dr = await axios.get(`${BASE}/studentFeeDemand/list?${params}`);
        const demands = dr.data.data || [];
        demands.forEach((d) => {
          const admNum = d.admission_number || d.admissionNumber || d.admNo || d.adm_no;
          if (admNum) raisedSet.add(String(admNum).trim());
        });
      } catch { /* ignore — proceed without demand info */ }

      setExistingDemandAdmNums(raisedSet);

      /* Fetch per-student raised fee types so we can show which items are already raised */
      const typesMap = {};
      await Promise.all(
        filtered.map(async (s) => {
          try {
            const tr = await axios.get(`${BASE}/studentFeeDemand/raisedTypes`, {
              params: {
                school_id:        schoolId,
                academic_year:    academicYear,
                admission_number: s.admissionNumber,
              },
            });
            typesMap[s.admissionNumber] = new Set(tr.data.raised_types || []);
          } catch { typesMap[s.admissionNumber] = new Set(); }
        })
      );
      setRaisedFeeTypesMap(typesMap);

      setStudentList(filtered);

      /* Pre-select only students who don't already have a demand raised.
         Already-raised students must NOT be counted as selected, since the
         UI shows them as locked (green check) rather than a checkbox. */
      setSelectedStdIds(new Set(
        filtered
          .filter((s) => !raisedSet.has(String(s.admissionNumber).trim()))
          .map((s) => s.admissionNumber)
      ));

      if (filtered.length === 0) {
        setStudError("No active students found for the selected filters.");
      }
    } catch (err) {
      console.error("fetchStudents error:", err);
      setStudError("Failed to fetch students. Please check your filters.");
    } finally {
      setStudLoading(false);
    }
  }, [
    schoolId, academicYear, course,
    selectedGradeLabel, selectedSectionLabel,
    selectedMedium, selectedStudentType,
  ]);

  /* ─── Fee item helpers ────────────────────────────────────────────────────── */
  const toggleFee = (i) =>
    setCheckedFees((prev) => ({ ...prev, [i]: !prev[i] }));

  const selectAllFees = () => {
    const init = {};
    templateFeeItems.forEach((_, i) => { init[i] = true; });
    setCheckedFees(init);
  };

  const clearAllFees = () => {
    const init = {};
    templateFeeItems.forEach((_, i) => { init[i] = false; });
    setCheckedFees(init);
  };

  const getSelectedFeeItems = () =>
    templateFeeItems
      .filter((_, i) => checkedFees[i])
      .map((f) => ({
        type:        f.type,
        description: f.description || f.type,
        amount:      parseFloat(f.amount || 0),
      }));

  const selectedFeeTotal = getSelectedFeeItems().reduce((s, f) => s + f.amount, 0);

  /* ─── Student selection helpers ───────────────────────────────────────────── */
  const toggleStudent = (admNum) => {
    setSelectedStdIds((prev) => {
      const next = new Set(prev);
      next.has(admNum) ? next.delete(admNum) : next.add(admNum);
      return next;
    });
  };

  /**
   * A student is eligible to be selected if at least one of the currently
   * checked fee items has NOT yet been raised for them.
   * Falls back to "no demands at all" when no fee items are checked yet.
   */
  const isStudentEligible = (s) => {
    const admNum = String(s.admissionNumber || "").trim();
    const studentRaisedTypes = raisedFeeTypesMap[admNum] || new Set();
    const selectedFeeItems = getSelectedFeeItems();
    // If no fee items are selected yet, use the old broad check so the list
    // still renders normally before the admin picks fees.
    if (selectedFeeItems.length === 0) {
      return !existingDemandAdmNums.has(admNum);
    }
    // Eligible if at least one selected fee type is not yet raised for this student.
    return selectedFeeItems.some(
      (f) => !studentRaisedTypes.has((f.type || "").trim().toLowerCase())
    );
  };

  const selectAllStudents = () =>
    setSelectedStdIds(new Set(
      studentList
        .filter((s) => isStudentEligible(s))
        .map((s) => s.admissionNumber)
    ));

  const clearAllStudents = () => setSelectedStdIds(new Set());

  const eligibleStudents = studentList.filter((s) => isStudentEligible(s));
  const allStudentsSelected =
    eligibleStudents.length > 0 && selectedStdIds.size === eligibleStudents.length;

  /* ─── Submit ──────────────────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    const feeItems = getSelectedFeeItems();
    if (!feeItems.length) {
      notifApi.warning({
        message: "No Fee Item Selected",
        description: "Please select at least one fee item before raising a demand.",
        icon: <ExclamationCircleOutlined style={{ color: "#faad14" }} />,
        placement: "topRight",
        duration: 4,
      });
      return;
    }

    const selected = studentList.filter((s) => selectedStdIds.has(s.admissionNumber));
    if (!selected.length) {
      notifApi.warning({
        message: "No Students Selected",
        description: "Please select at least one student from the list.",
        icon: <ExclamationCircleOutlined style={{ color: "#faad14" }} />,
        placement: "topRight",
        duration: 4,
      });
      return;
    }

    setSaving(true);
    try {
      const raiseOne = async (payload) => {
        try {
          await axios.post(`${BASE}/studentFeeDemand/raiseForStudent`, payload);
          return "created";
        } catch (e) {
          if (e.response?.status === 409) return "skipped";
          return "failed";
        }
      };

        let created = 0, skipped = 0, failed = 0;
        for (const s of selected) {
          // Filter out fee items already raised for THIS specific student
          const studentRaisedTypes = raisedFeeTypesMap[s.admissionNumber] || new Set();
          const newFeeItems = feeItems.filter(
            (f) => !studentRaisedTypes.has((f.type || "").trim().toLowerCase())
          );

          // If all chosen fee items are already raised for this student, count as skipped
          if (newFeeItems.length === 0) {
            skipped++;
            continue;
          }

          const payload = {
            school_id:        schoolId,
            academic_year:    academicYear,
            admission_number: s.admissionNumber,
            emis_number:      String(s.emisNum || ""),
            student_name:     s.name,
            grade:            s.Grade?.grade || selectedGradeLabel,
            section:          s.Section?.sectionName || selectedSectionLabel,
            course,
            medium:           s.medium || s.preferredmedium || selectedMedium,
            student_type:     s.studentType || selectedStudentType,
            fee_items:        newFeeItems, // only un-raised fee items for this student
          };
          const result = await raiseOne(payload);
          if (result === "created") created++;
          else if (result === "skipped") skipped++;
          else failed++;
        }

        if (created > 0) {
          const desc = [
            `${created} demand(s) raised successfully.`,
            skipped > 0 ? `${skipped} skipped (duplicate fee types).` : "",
            failed  > 0 ? `${failed} failed.` : "",
          ].filter(Boolean).join(" ");

          notifApi.success({
            message: "Demands Raised Successfully!",
            description: desc,
            icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
            placement: "topRight",
            duration: 3,
          });
          setTimeout(() => navigate("/feedemandlist"), 1800);
        } else if (skipped > 0) {
          notifApi.warning({
            message: "All Demands Already Exist",
            description: `${skipped} student(s) already have unpaid demands for these fee types. No new demands were created.`,
            icon: <ExclamationCircleOutlined style={{ color: "#faad14" }} />,
            placement: "topRight",
            duration: 5,
          });
        } else {
          notifApi.error({
            message: "Failed to Raise Demands",
            description: `${failed} demand(s) failed. Please try again.`,
            icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
            placement: "topRight",
            duration: 5,
          });
        }
    } catch (e) {
      console.error("handleSubmit unexpected error:", e);
      notifApi.error({
        message: "Unexpected Error",
        description: "Something went wrong. Please try again.",
        icon: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
        placement: "topRight",
        duration: 5,
      });
    } finally {
      setSaving(false);
    }
  };

  /* ─── Admission number filter for student list ──────────────────────────── */
  const visibleStudents = admissionFilter.trim()
    ? studentList.filter((s) =>
        s.admissionNumber?.toLowerCase().includes(admissionFilter.trim().toLowerCase()) ||
        s.name?.toLowerCase().includes(admissionFilter.trim().toLowerCase())
      )
    : studentList;

  const filtersFilled = !!selectedGradeId;

  /* ─── Check if a fee type has been raised for ALL currently selected students ── */
  const isFeeTypeRaisedForAll = (feeType) => {
    if (!feeType || studentList.length === 0) return false;
    const norm = feeType.trim().toLowerCase();
    return studentList.every((s) => {
      const raised = raisedFeeTypesMap[s.admissionNumber] || new Set();
      return raised.has(norm);
    });
  };

  /* ════════════════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════════════════ */
  return (
    <Layout>
      {notifContextHolder}
      <style>{`
        .rsd-tbl { width: 100%; border-collapse: collapse; }
        .rsd-tbl thead tr { background: ${C.primary}; }
        .rsd-tbl thead th { color: #fff; font-weight: 600; font-size: 12px; padding: 11px 13px; white-space: nowrap; text-align: left; }
        .rsd-tbl tbody tr { border-bottom: 1px solid ${C.border}; transition: background 0.12s; cursor: pointer; }
        .rsd-tbl tbody tr:nth-child(even) { background: ${C.bg}; }
        .rsd-tbl tbody tr:hover { background: ${C.accentLight} !important; }
        .rsd-tbl tbody tr.rsd-selected { background: #e0edff !important; }
        .rsd-tbl tbody td { padding: 10px 13px; font-size: 13px; vertical-align: middle; color: ${C.text}; }
        .rsd-tbl tfoot tr { background: ${C.successLight}; }
        .rsd-tbl tfoot td { padding: 11px 13px; font-weight: 700; color: #166534; }
      `}</style>

      <div style={{ background: C.bg, minHeight: "100vh", padding: "20px 24px", fontFamily: FF }}>

        {/* ── GRADIENT HEADER ── */}
        <div style={{
          background: `linear-gradient(135deg, ${C.primary} 0%, #2d4073 100%)`,
          borderRadius: 12, padding: "16px 24px", marginBottom: 20,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <h5 style={{ margin: 0, fontWeight: 700, fontSize: 17, color: "#fff" }}>
              Raise a Demand
            </h5>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
              Select grade, section, and fee items to raise demands for students.
            </p>
          </div>

        </div>

        {/* ─────────────────────── CARD 1: Settings (Course + Year only) ──────── */}
        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Settings</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, maxWidth: 500 }}>
            {/* Academic Year (read-only) */}
            <div>
              <span style={labelStyle}>Academic Year</span>
              <div style={{
                ...inputStyle, background: "#f8fafc", color: C.primary,
                fontWeight: 400, cursor: "not-allowed", display: "flex", alignItems: "center",
              }}>
                {academicYear}
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>
                Change from the top-bar year selector
              </div>
            </div>
            {/* Student Application Category */}
            <div>
              <span style={labelStyle}>Student Application Category</span>
              <Select
                value={course}
                onChange={(val) => {
                  setCourse(val);
                  setSelectedGradeId("");
                  setSelectedSectionId("");
                  setStudentList([]);
                  setSelectedStdIds(new Set());
                  setTemplateFeeItems([]);
                  setCheckedFees({});
                }}
                style={{ width: "100%", fontFamily: FF }}
              >
                {COURSE_OPTIONS.map((c) => (
                  <Option key={c} value={c}>{c}</Option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {/* ─────────────────────── CARD 2: Raise a Demand (Filters) ───────────── */}
        <div style={cardStyle}>
          <div style={sectionTitleStyle}>
            <FilterOutlined style={{ marginRight: 8 }} />
            Filter Students
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>

            {/* Grade */}
            <div>
              <span style={labelStyle}>Grade *</span>
              <Select
                placeholder="— Select grade —"
                value={selectedGradeId || undefined}
                onChange={(val) => {
                  setSelectedGradeId(val || "");
                  setSelectedSectionId("");
                  setStudentList([]);
                  setSelectedStdIds(new Set());
                  setAdmissionFilter("");
                }}
                style={{ width: "100%", fontFamily: FF }}
                allowClear
              >
                {filteredGradeOptions.map((g) => (
                  <Option key={g.id} value={g.id}>{g.grade}</Option>
                ))}
              </Select>
            </div>

            {/* Section */}
            <div>
              <span style={labelStyle}>Section</span>
              <Select
                placeholder="— All sections —"
                value={selectedSectionId || undefined}
                disabled={!selectedGradeId}
                onChange={(val) => {
                  setSelectedSectionId(val || "");
                  setStudentList([]);
                  setSelectedStdIds(new Set());
                  setAdmissionFilter("");
                }}
                style={{ width: "100%", fontFamily: FF }}
                allowClear
              >
                {sectionOptions.map((s) => (
                  <Option key={s.id} value={s.id}>{s.sectionName}</Option>
                ))}
              </Select>
            </div>

            {/* Medium */}
            <div>
              <span style={labelStyle}>Medium</span>
              <Select
                placeholder="— All mediums —"
                value={selectedMedium || undefined}
                onChange={(val) => {
                  setSelectedMedium(val || "");
                  setStudentList([]);
                  setSelectedStdIds(new Set());
                  setAdmissionFilter("");
                }}
                style={{ width: "100%", fontFamily: FF }}
                allowClear
              >
                {MEDIUM_OPTIONS.map((m) => (
                  <Option key={m} value={m}>{m}</Option>
                ))}
              </Select>
            </div>

            {/* Student Type */}
            <div>
              <span style={labelStyle}>Student Type</span>
              <Select
                placeholder="— All types —"
                value={selectedStudentType || undefined}
                onChange={(val) => {
                  setSelectedStudentType(val || "");
                  setStudentList([]);
                  setSelectedStdIds(new Set());
                  setAdmissionFilter("");
                }}
                style={{ width: "100%", fontFamily: FF }}
                allowClear
              >
                {STUDENT_TYPE_OPTIONS.map((t) => (
                  <Option key={t} value={t} style={{ textTransform: "capitalize" }}>{t}</Option>
                ))}
              </Select>
            </div>

            {/* Admission Number search */}
            <div>
              <span style={labelStyle}>Admission / Name</span>
              <div style={{ position: "relative" }}>
                <input
                  style={{ ...inputStyle, paddingLeft: 30 }}
                  placeholder="Filter by admission no. or name…"
                  value={admissionFilter}
                  onChange={(e) => setAdmissionFilter(e.target.value)}
                />
                <SearchOutlined style={{
                  position: "absolute", left: 9, top: "50%",
                  transform: "translateY(-50%)", color: C.muted, fontSize: 13,
                }} />
              </div>
            </div>
          </div>

          {/* Fetch Students button */}
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <button
              title={studLoading ? "Fetching…" : "Fetch Students"}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                gap: 6, height: 34, padding: "0 18px",
                width: "auto", flexShrink: 0, flexGrow: 0,
                background: filtersFilled && !studLoading ? C.accentDark : C.muted,
                color: "#fff", border: "none", borderRadius: 7,
                cursor: filtersFilled && !studLoading ? "pointer" : "not-allowed",
                opacity: !filtersFilled || studLoading ? 0.65 : 1,
                fontSize: 13, fontWeight: 600, fontFamily: FF,
              }}
              disabled={!filtersFilled || studLoading}
              onClick={fetchStudents}
            >
              <SearchOutlined style={{ fontSize: 14 }} />
              Filter Students
            </button>
            {studentList.length > 0 && (
              <span style={{ fontSize: 13, color: C.muted }}>
                {visibleStudents.length} of {studentList.length} student(s) shown
                {selectedStdIds.size > 0 && <strong style={{ color: C.accent }}> · {selectedStdIds.size} selected</strong>}
              </span>
            )}
            {studError && (
              <span style={{ fontSize: 13, color: C.danger }}>⚠ {studError}</span>
            )}
          </div>
        </div>

        {/* ─────────────────────── CARD 3: Fee Items ─────────────────────────── */}
        {!!selectedGradeId && (
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>Annual Fee Structure</div>

            {feeLoading ? (
              <div style={{ color: C.muted, fontSize: 13, padding: "12px 0" }}>Loading fee structure…</div>
            ) : templateFeeItems.length > 0 ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  {templateFeeItems.map((f, i) => (
                    <label
                      key={i}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "12px 14px", borderRadius: 9, cursor: "pointer",
                        background: checkedFees[i] ? C.accentLight : C.bg,
                        border: `1.5px solid ${checkedFees[i] ? C.accent : C.border}`,
                        transition: "all 0.12s",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!checkedFees[i]}
                        onChange={() => !isFeeTypeRaisedForAll(f.type) && toggleFee(i)}
                        disabled={isFeeTypeRaisedForAll(f.type)}
                        style={{ width: 15, height: 15, cursor: isFeeTypeRaisedForAll(f.type) ? "not-allowed" : "pointer" }}
                        title={isFeeTypeRaisedForAll(f.type) ? "Already raised for all selected students" : ""}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.primary }}>{f.type}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{f.description}</div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", color: checkedFees[i] ? C.accent : C.muted }}>
                        ₹ {parseFloat(f.amount || 0).toLocaleString("en-IN")}
                      </div>
                    </label>
                  ))}
                </div>
                <div style={{
                  marginTop: 14, padding: "12px 16px", background: C.bg, borderRadius: 8,
                  display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 16,
                }}>
                  <span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>Selected total:</span>
                  <span style={{ fontSize: 19, fontWeight: 700, color: C.primary }}>
                    ₹ {selectedFeeTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            ) : (
              <div style={{ color: C.warning, fontSize: 13, padding: "10px 0" }}>
                ⚠ No fee structure found for the selected filters.{" "}
                <span style={{ color: C.accent, cursor: "pointer", fontWeight: 600 }} onClick={() => navigate("/feedemandlist")}>
                  Create a fee structure first.
                </span>
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────── CARD 4: Student List Table ────────────────── */}
        {studentList.length > 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 20, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
            {/* Table card header */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "13px 18px", borderBottom: `1.5px solid ${C.border}`, background: C.bg,
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.primary }}>
                Students
                <span style={{
                  marginLeft: 8, fontSize: 11, fontWeight: 600, color: C.accent,
                  background: C.accentLight, padding: "2px 10px", borderRadius: 20,
                }}>
                  {selectedStdIds.size} / {eligibleStudents.length} selected
                </span>
                {(() => {
                  // Count total raised fee-type demands across all visible students
                  const totalRaised = studentList.reduce((sum, s) => {
                    const raised = raisedFeeTypesMap[s.admissionNumber];
                    return sum + (raised ? raised.size : 0);
                  }, 0);
                  return totalRaised > 0 ? (
                    <span style={{
                      marginLeft: 6, fontSize: 11, fontWeight: 600,
                      color: "#92400e", background: "#fef3c7",
                      padding: "2px 10px", borderRadius: 20,
                    }}>
                      {totalRaised} demand{totalRaised !== 1 ? "s" : ""} already raised
                    </span>
                  ) : null;
                })()}
              </span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="rsd-tbl">
                <thead>
                  <tr>
                    <th style={{ width: 44, textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={allStudentsSelected}
                        onChange={allStudentsSelected ? clearAllStudents : selectAllStudents}
                        style={{ width: 15, height: 15, cursor: "pointer" }}
                        title={allStudentsSelected ? "Deselect all" : "Select all eligible"}
                      />
                    </th>
                    <th style={{ width: 44 }}>S.No</th>
                    <th>Admission No.</th>
                    <th>EMIS No.</th>
                    <th>Student Name</th>
                    <th style={{ width: 54 }}>Grade</th>
                    <th style={{ width: 90 }}>Section</th>
                    <th style={{ width: 80 }}>Medium</th>
                    <th style={{ width: 80 }}>Type</th>
                    <th style={{ width: 120 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStudents.map((s, idx) => {
                    const studentRaisedTypes = raisedFeeTypesMap[s.admissionNumber] || new Set();
                    // Only consider the fee items the admin has currently checked
                    const checkedFeeTypes = getSelectedFeeItems().map(f => (f.type || "").trim().toLowerCase());
                    // Row is blocked only if every *checked* fee item is already raised for this student
                    const alreadyRaised = checkedFeeTypes.length > 0 &&
                      checkedFeeTypes.every(t => studentRaisedTypes.has(t));
                    const isSelected = selectedStdIds.has(s.admissionNumber);
                    return (
                      <tr
                        key={s.admissionNumber}
                        className={isSelected ? "rsd-selected" : ""}
                        onClick={() => !alreadyRaised && toggleStudent(s.admissionNumber)}
                        style={{ opacity: alreadyRaised ? 0.7 : 1, cursor: alreadyRaised ? "default" : "pointer" }}
                      >
                        <td style={{ textAlign: "center" }}>
                          {alreadyRaised ? (
                            <span style={{ fontSize: 16, color: C.success }}>✓</span>
                          ) : (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleStudent(s.admissionNumber)}
                              onClick={(e) => e.stopPropagation()}
                              style={{ width: 15, height: 15, cursor: "pointer" }}
                            />
                          )}
                        </td>
                        <td style={{ color: C.muted, fontWeight: 600 }}>{idx + 1}</td>
                        <td style={{ fontFamily: "monospace", fontSize: 12, color: C.muted }}>
                          {s.admissionNumber}
                        </td>
                        <td style={{ color: C.muted, fontSize: 12 }}>{s.emisNum || "—"}</td>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        <td style={{ textAlign: "center" }}>{s.Grade?.grade || selectedGradeLabel}</td>
                        <td style={{ textAlign: "center" }}>{s.Section?.sectionName || "—"}</td>
                        <td>{s.medium || s.preferredmedium || "—"}</td>
                        <td>
                          {s.studentType ? (
                            <span style={{
                              display: "inline-block", padding: "2px 9px", borderRadius: 12,
                              fontSize: 11, fontWeight: 700,
                              color:      s.studentType === "new" ? C.success : C.accent,
                              background: s.studentType === "new" ? C.successLight : C.accentLight,
                            }}>
                              {s.studentType}
                            </span>
                          ) : "—"}
                        </td>
                        <td>
                          {alreadyRaised ? (
                            <span style={{
                              display: "inline-block", padding: "3px 10px", borderRadius: 12,
                              fontSize: 11, fontWeight: 700,
                              color: "#92400e", background: "#fef3c7",
                              border: "1px solid #fde68a",
                            }}>
                              Demand Raised
                            </span>
                          ) : (
                            <span style={{
                              display: "inline-block", padding: "3px 10px", borderRadius: 12,
                              fontSize: 11, fontWeight: 700,
                              color: "#166534", background: C.successLight,
                              border: `1px solid ${C.success}`,
                            }}>
                              Eligible
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─────────────────────── Action Buttons ─────────────────────────────── */}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 4 }}>
          <button style={btnSecondary} onClick={() => navigate("/feedemandlist")}>
            Cancel
          </button>
          <button
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "9px 24px", background: templateFeeItems.length && !saving ? C.accentDark : C.muted,
              color: "#fff", border: "none", borderRadius: 7,
              fontWeight: 700, fontSize: 14,
              cursor: saving || !templateFeeItems.length ? "not-allowed" : "pointer",
              opacity: saving || !templateFeeItems.length ? 0.6 : 1, fontFamily: FF,
            }}
            onClick={handleSubmit}
            disabled={saving || !templateFeeItems.length}
          >
            <RiseOutlined style={{ fontSize: 14 }} />
            {saving ? "Saving…" : `Raise Demand for ${selectedStdIds.size} Student(s)`}
          </button>
        </div>

      </div>
    </Layout>
  );
}


