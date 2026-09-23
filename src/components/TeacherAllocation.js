import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import Layout from "./Layout";
import { Select, message, Empty, Spin, Tag } from "antd";
import { LockOutlined, InfoCircleOutlined } from "@ant-design/icons";

const { Option } = Select;

const COLOR = {
  blue: "#1e40af", blueLt: "#3b82f6", text: "#1e293b", textMid: "#475569", textSoft: "#64748b",
  border: "#e2e8f0", bg: "#f8fafc", danger: "#e21216", dangerBg: "rgba(226,18,22,0.08)",
  green: "#166534", greenBg: "#dcfce7", orange: "#9a3412", orangeBg: "#ffedd5",
  infoBg: "#eff6ff", infoText: "#1a3c6e",
};
const FF = "'Segoe UI', system-ui, sans-serif";
const FS = "13.5px";
const inp = { fontFamily: FF, fontSize: FS };

// ── Academic year helpers (self-contained — adjust if you already have a shared util) ──
const getCurrentAcademicYear = () => {
  const now = new Date();
  const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1; // school year starts ~April
  return `${y}-${y + 1}`;
};
const generateAcademicYears = () => {
  const startY = Number(getCurrentAcademicYear().split("-")[0]) - 2;
  return Array.from({ length: 6 }, (_, i) => `${startY + i}-${startY + i + 1}`);
};

const btnStyle = (color, bg) => ({
  all: "unset", cursor: "pointer", padding: "9px 22px", borderRadius: 8,
  fontSize: FS, fontWeight: 600, color, background: bg, transition: "opacity 0.15s",
});

const TeacherAllocation = () => {
  const API = process.env.REACT_APP_API_URL;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const isSuperAdmin = role === "superadmin";

  // If we arrived via Edit/View from the list, every selector is pinned by
  // the URL. In "create" mode only academic_year defaults; school/grade/
  // section are picked live, and the moment a section with existing data
  // is picked, we lock the pickers and fall into the same edit experience.
  const urlSectionId = searchParams.get("section_id");
  const urlSchoolId = searchParams.get("school_id");
  const urlGradeId = searchParams.get("grade_id");
  const urlAcademicYear = searchParams.get("academic_year");
  const isViewMode = searchParams.get("mode") === "view";
  const arrivedViaLink = Boolean(urlSectionId && urlSchoolId && urlGradeId && urlAcademicYear);

  const [academicYear, setAcademicYear] = useState(urlAcademicYear || getCurrentAcademicYear());
  const [schools, setSchools] = useState([]);
  const [schoolId, setSchoolId] = useState(urlSchoolId ? Number(urlSchoolId) : (isSuperAdmin ? "" : (user?.school?.id || "")));
  const [grades, setGrades] = useState([]);
  const [gradeId, setGradeId] = useState(urlGradeId ? Number(urlGradeId) : "");
  const [sections, setSections] = useState([]);
  const [sectionId, setSectionId] = useState(urlSectionId ? Number(urlSectionId) : "");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sectionInfo, setSectionInfo] = useState(null); // { sectionName, School, Grade, academic_year }
  const [subjectRows, setSubjectRows] = useState([]); // editable working copy
  const [locked, setLocked] = useState(arrivedViaLink); // selectors disabled once pointed at a real, saved plan

  // ── Load dropdown data (schools, grades, sections) for the "create" picker flow ──
  useEffect(() => {
    if (!isSuperAdmin) return;
    axios.get(`${API}/school/getAllSchools`).then(r => setSchools(r.data.schools || [])).catch(() => { });
  }, [API, isSuperAdmin]);

  useEffect(() => {
    if (!schoolId) { setGrades([]); return; }
    axios.get(`${API}/grade/getGradesBySchool/${schoolId}`)
      .then(r => setGrades((r.data.grades || []).filter(g => g.academic_year === academicYear)))
      .catch(() => setGrades([]));
  }, [API, schoolId, academicYear]);

  useEffect(() => {
    if (!schoolId || !gradeId) { setSections([]); return; }
    axios.get(`${API}/section/getSectionsBySchoolAndGrade/${schoolId}/${gradeId}`)
      .then(r => setSections((r.data.sections || []).filter(s => s.status !== 0 && s.academic_year === academicYear)))
      .catch(() => setSections([]));
  }, [API, schoolId, gradeId, academicYear]);

  // ── Load the allocation form once we have a complete (school, grade, section, year) ──
  const loadFormData = useCallback(async (sId, gId, secId, year) => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/teacherAllocation/getFormData/${sId}/${gId}/${secId}/${year}`);
      setSectionInfo(r.data.section);
      setSubjectRows((r.data.subjects || []).map(s => {
        const primaryIds = (s.primaryInstructorIds || []).map(Number);
        // If old bad data has the same teacher saved as both, keep them as
        // Primary only and drop the duplicate from Secondary.
        const secondaryIds = (s.secondaryInstructorIds || []).map(Number).filter(id => !primaryIds.includes(id));
        return {
          ...s,
          primaryInstructorIds: primaryIds,
          secondaryInstructorIds: secondaryIds,
          eligibleInstructors: (s.eligibleInstructors || []).map(ins => ({ ...ins, id: Number(ins.id) })),
        };
      }));
      // Not arriving via an explicit Edit link, but this class/section
      // already has saved teachers — switch into edit mode automatically
      // instead of letting them "create" a duplicate.
      if (!arrivedViaLink && r.data.hasExistingAllocation) setLocked(true);
    } catch (err) {
      setSectionInfo(null);
      setSubjectRows([]);
      message.error(err.response?.data?.error || "Failed to load subjects for this class & section");
    } finally { setLoading(false); }
  }, [API, arrivedViaLink]);

  useEffect(() => {
    if (schoolId && gradeId && sectionId && academicYear) {
      loadFormData(schoolId, gradeId, sectionId, academicYear);
    } else {
      setSectionInfo(null);
      setSubjectRows([]);
    }
  }, [schoolId, gradeId, sectionId, academicYear, loadFormData]);

  // ── Editing helpers ──
  const updateRow = (subjectId, field, values) => {
    setSubjectRows(prev => prev.map(r => {
      if (r.subject_id !== subjectId) return r;
      if (field === "primaryInstructorIds") {
        return {
          ...r,
          primaryInstructorIds: values,
          secondaryInstructorIds: r.secondaryInstructorIds.filter(id => !values.includes(id)),
        };
      }
      if (field === "secondaryInstructorIds") {
        return {
          ...r,
          secondaryInstructorIds: values,
          primaryInstructorIds: r.primaryInstructorIds.filter(id => !values.includes(id)),
        };
      }
      return { ...r, [field]: values };
    }));
  };
  const clearRow = (subjectId) => {
    setSubjectRows(prev => prev.map(r => r.subject_id === subjectId ? { ...r, primaryInstructorIds: [], secondaryInstructorIds: [] } : r));
  };

  const handleSave = async () => {
    if (subjectRows.length === 0) return;
    setSaving(true);
    try {
      const allocations = subjectRows.map(r => ({
        subject_id: r.subject_id,
        primary_instructor_ids: r.primaryInstructorIds,
        secondary_instructor_ids: r.secondaryInstructorIds,
      }));
      await axios.post(`${API}/teacherAllocation/save/${sectionId}`, { allocations });
      message.success("Teacher allocation saved successfully");
      navigate("/section-subject-teachermapped");
    } catch (err) {
      message.error(err.response?.data?.error || "Failed to save teacher allocation");
    } finally { setSaving(false); }
  };

  const readyToPick = !locked;
  const hasSection = Boolean(sectionInfo);

  return (
    <Layout>
      <div className="app-page" style={{ fontFamily: FF }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLOR.text, margin: 0, letterSpacing: "-0.3px" }}>
            {isViewMode ? "Teacher Allocation — View" : "Teacher Allocation"}
          </h1>
          <div style={{ width: 40, height: 3, background: COLOR.blueLt, borderRadius: 2, marginTop: 6 }} />
        </div>

        {locked && !arrivedViaLink && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: COLOR.infoBg, color: COLOR.infoText, padding: "10px 16px", borderRadius: 8, marginBottom: 18, fontSize: FS }}>
            <InfoCircleOutlined />
            This class & section already has a saved teacher allocation — you're editing it now. Class & section can't be changed once an allocation exists.
          </div>
        )}

        {/* ── Selectors ── */}
        <div style={{ display: "flex", gap: 40, alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap" }}>
          <div>
            <label style={{ display: "block", fontSize: FS, fontWeight: 600, color: COLOR.textMid, marginBottom: 5 }}>
              Academic Year <span style={{ color: COLOR.danger }}>*</span>
              {locked && <LockOutlined style={{ marginLeft: 6, fontSize: 11, color: COLOR.textSoft }} />}
            </label>
            <Select value={academicYear} onChange={setAcademicYear} disabled={locked} style={{ width: 200, ...inp }}>
              {generateAcademicYears().map(y => <Option key={y} value={y}>{y.replace("-", " - ")}</Option>)}
            </Select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: FS, fontWeight: 600, color: COLOR.textMid, marginBottom: 5 }}>
              Institute Name <span style={{ color: COLOR.danger }}>*</span>
              {locked && <LockOutlined style={{ marginLeft: 6, fontSize: 11, color: COLOR.textSoft }} />}
            </label>
            {isSuperAdmin ? (
              <Select
                value={schoolId || undefined}
                placeholder="Select school"
                onChange={v => { setSchoolId(v); setGradeId(""); setSectionId(""); }}
                disabled={locked}
                style={{ width: 220, ...inp }}
                showSearch
                optionFilterProp="children"
              >
                {schools.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
              </Select>
            ) : (
              <div style={{ padding: "6px 12px", background: COLOR.bg, borderRadius: 6, fontSize: FS, color: COLOR.textMid, minWidth: 180 }}>
                {user?.school?.name || "—"}
              </div>
            )}
          </div>

          <div>
            <label style={{ display: "block", fontSize: FS, fontWeight: 600, color: COLOR.textMid, marginBottom: 5 }}>
              Class <span style={{ color: COLOR.danger }}>*</span>
              {locked && <LockOutlined style={{ marginLeft: 6, fontSize: 11, color: COLOR.textSoft }} />}
            </label>
            <Select
              value={gradeId || undefined}
              placeholder="Select class"
              onChange={v => { setGradeId(v); setSectionId(""); }}
              disabled={locked || !schoolId}
              style={{ width: 180, ...inp }}
            >
              {grades.map(g => <Option key={g.id} value={g.id}>{g.grade}</Option>)}
            </Select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: FS, fontWeight: 600, color: COLOR.textMid, marginBottom: 5 }}>
              Section <span style={{ color: COLOR.danger }}>*</span>
              {locked && <LockOutlined style={{ marginLeft: 6, fontSize: 11, color: COLOR.textSoft }} />}
            </label>
            <Select
              value={sectionId || undefined}
              placeholder="Select section"
              onChange={setSectionId}
              disabled={locked || !gradeId}
              style={{ width: 180, ...inp }}
            >
              {sections.map(s => <Option key={s.id} value={s.id}>{s.sectionName}</Option>)}
            </Select>
          </div>
        </div>

        {/* ── Body ── */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}><Spin size="large" /></div>
        ) : !hasSection ? (
          <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${COLOR.border}`, padding: 40 }}>
            <Empty description={readyToPick
              ? "Pick an Academic Year, Institute, Class and Section to allocate teachers."
              : "Nothing to show yet."} />
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", overflow: "hidden", border: `1px solid ${COLOR.border}` }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FF, fontSize: FS }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: COLOR.textMid, fontWeight: 600, fontSize: 13 }}>Subject</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: COLOR.textMid, fontWeight: 600, fontSize: 13, width: "36%" }}>Primary Teachers</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: COLOR.textMid, fontWeight: 600, fontSize: 13, width: "36%" }}>Secondary Teachers</th>
                  {!isViewMode && <th style={{ padding: "12px 16px", width: 60 }} />}
                </tr>
              </thead>
              <tbody>
                {subjectRows.map((row, i) => {
                  const noEligible = row.eligibleInstructors.length === 0;
                  return (
                    <tr key={row.subject_id} style={{ borderTop: `1px solid ${COLOR.border}`, background: i % 2 === 0 ? "#fff" : COLOR.bg }}>
                      <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                        <div style={{ fontWeight: 600, color: COLOR.text }}>{row.subjectName}</div>
                        {row.shortCode && <div style={{ fontSize: 11.5, color: COLOR.textSoft }}>{row.shortCode}</div>}
                        <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
                          <Tag style={{ margin: 0, fontFamily: FF, fontSize: 11, color: COLOR.green, background: COLOR.greenBg, border: "none" }}>
                            {row.primaryInstructorIds.length} Primary
                          </Tag>
                          <Tag style={{ margin: 0, fontFamily: FF, fontSize: 11, color: COLOR.orange, background: COLOR.orangeBg, border: "none" }}>
                            {row.secondaryInstructorIds.length} Secondary
                          </Tag>
                        </div>
                        {noEligible && (
                          <div style={{ marginTop: 6, fontSize: 11, color: COLOR.danger, maxWidth: 200 }}>
                            No instructors are mapped to this Grade + Subject yet.
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                        <Select
                          mode="multiple"
                          allowClear
                          value={row.primaryInstructorIds}
                          onChange={v => updateRow(row.subject_id, "primaryInstructorIds", v.map(Number))}
                          disabled={isViewMode || noEligible}
                          placeholder="Select primary teacher(s)"
                          style={{ width: "100%", ...inp }}
                          optionFilterProp="children"
                          maxTagCount="responsive"
                        >
                          {row.eligibleInstructors
                            .filter(ins => !row.secondaryInstructorIds.includes(ins.id))
                            .map(ins => <Option key={ins.id} value={ins.id}>{ins.name}</Option>)}
                        </Select>
                      </td>
                      <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                        <Select
                          mode="multiple"
                          allowClear
                          value={row.secondaryInstructorIds}
                          onChange={v => updateRow(row.subject_id, "secondaryInstructorIds", v.map(Number))}
                          disabled={isViewMode || noEligible}
                          placeholder="Select secondary teacher(s)"
                          style={{ width: "100%", ...inp }}
                          optionFilterProp="children"
                          maxTagCount="responsive"
                        >
                          {row.eligibleInstructors
                            .filter(ins => !row.primaryInstructorIds.includes(ins.id))
                            .map(ins => <Option key={ins.id} value={ins.id}>{ins.name}</Option>)}
                        </Select>
                      </td>
                      {!isViewMode && (
                        <td style={{ padding: "14px 16px", textAlign: "center", verticalAlign: "top" }}>
                          <button title="Clear this subject's teachers" onClick={() => clearRow(row.subject_id)}
                            style={{ all: "unset", cursor: "pointer", color: COLOR.danger, fontSize: 12 }}>
                            Clear
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!isViewMode && (
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px" }}>
                <button onClick={() => navigate("/section-subject-teachermapped")} style={btnStyle(COLOR.textMid, "#f1f5f9")}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={{ ...btnStyle("#fff", COLOR.blue), opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default TeacherAllocation;
