import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { message, Select } from "antd";
import Layout from "./Layout";
import { useFilter } from "./FilterContext";

const { Option } = Select;

/* ── Design tokens (matches CreateStudentHSC) ── */
const COLOR = {
  blue: "#1e40af", blueLt: "#3b82f6", text: "#1e293b", textMid: "#475569",
  textSoft: "#64748b", border: "#e2e8f0", headBg: "#1a2236",
  danger: "#e21216", success: "#16a34a", bg: "#f8fafc",
};
const FF = "'Segoe UI', system-ui, sans-serif";
const FS = "13.5px";

const labelStyle = { fontSize: FS, fontWeight: 600, color: COLOR.textMid, marginBottom: 5, display: "block" };
const inputStyle = { width: "100%", padding: "9px 12px", borderRadius: 7, border: `1px solid ${COLOR.border}`, fontFamily: FF, fontSize: FS, color: COLOR.text, outline: "none", boxSizing: "border-box" };
const selectStyle = { width: "100%" };
const fieldWrap = { marginBottom: 16 };

const Field = ({ label, required, children }) => (
  <div style={fieldWrap}>
    <label style={labelStyle}>{label}{required && <span style={{ color: COLOR.danger }}> *</span>}</label>
    {children}
  </div>
);

/* ── Section header bar (matches CreateStudentHSC) ── */
const SectionHead = ({ title }) => (
  <div style={{
    fontSize: 13, fontWeight: 700, color: COLOR.headBg,
    padding: "7px 12px", background: COLOR.bg,
    borderLeft: `4px solid ${COLOR.blue}`,
    borderRadius: 5, marginBottom: 14, marginTop: 6, letterSpacing: "0.3px",
  }}>{title}</div>
);

/* ── Reusable pill button (matches CreateStudentHSC) ── */
const ActionBtn = ({ children, onClick, type = "button", variant = "default", disabled = false }) => {
  const [hov, setHov] = useState(false);
  const S = {
    default: { bg: "#f1f5f9", col: COLOR.textMid, border: `1px solid ${COLOR.border}`, hov: "#e2e8f0" },
    primary: { bg: COLOR.blue, col: "#fff", border: "none", hov: "#1a3580" },
    danger: { bg: COLOR.danger, col: "#fff", border: "none", hov: "#b91c1c" },
    success: { bg: COLOR.success, col: "#fff", border: "none", hov: "#15803d" },
    light: { bg: COLOR.blueLt, col: "#fff", border: "none", hov: COLOR.blue },
  };
  const s = S[variant] || S.default;
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      onMouseEnter={() => !disabled && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        all: "unset", display: "inline-flex", alignItems: "center", gap: 6,
        padding: "9px 20px", borderRadius: 8, fontSize: FS, fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        background: disabled ? "#e2e8f0" : hov ? s.hov : s.bg,
        color: disabled ? "#94a3b8" : s.col,
        border: s.border, transition: "all 0.15s", whiteSpace: "nowrap",
      }}>
      {children}
    </button>
  );
};

const generateAcademicYears = () => { const y = new Date().getFullYear(); return Array.from({ length: 3 }, (_, i) => `${y - 2 + i}-${y - 1 + i}`); };

// Empty row for the Grade/Subject table — academic year is picked first,
// which then scopes which grades (and subjects) are selectable.
const emptyRow = () => ({ academic_year: "", grade_id: "", subject_id: "" });

// Where Save / Cancel should always land
const LIST_ROUTE = "/instructorlist";

const CreateInstructor = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // present when editing
  const isEdit = !!id;
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const isSuperAdmin = role === "superadmin";
  const { selectedSchool } = useFilter();

  const [schools, setSchools] = useState([]);
  const [schoolId, setSchoolId] = useState(isSuperAdmin ? (selectedSchool !== "all" ? selectedSchool : "") : (user?.school?.id || ""));
  const [gradesByYear, setGradesByYear] = useState({}); // { [academic_year]: [grades...] }
  const [subjectsByGrade, setSubjectsByGrade] = useState({}); // { [grade_id]: [subjects...] } (each subject carries its own academic_year)

  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [instructorType, setInstructorType] = useState("Academic");
  const [designation, setDesignation] = useState("");
  const [dateOfJoining, setDateOfJoining] = useState("");
  const [qualification, setQualification] = useState("");
  const [workExperience, setWorkExperience] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [rows, setRows] = useState([emptyRow()]);
  const [saving, setSaving] = useState(false);

  // ── Fetch schools (superadmin only) ──
  useEffect(() => {
    if (!isSuperAdmin) return;
    axios.get(`${process.env.REACT_APP_API_URL}/school/getAllSchools`)
      .then(res => setSchools(res.data.schools || res.data || []))
      .catch(() => message.error("Failed to fetch schools"));
  }, [isSuperAdmin]);

  // Grades/subjects are scoped to a school — if the school changes, cached options no longer apply
  useEffect(() => {
    setGradesByYear({});
    setSubjectsByGrade({});
  }, [schoolId]);

  // ── Load existing instructor when editing ──
  useEffect(() => {
    if (!isEdit) return;
    axios.get(`${process.env.REACT_APP_API_URL}/instructor/getInstructorById/${id}`)
      .then(res => {
        const ins = res.data.instructor;
        setSchoolId(ins.school_id);
        setName(ins.name || "");
        setGender(ins.gender || "");
        setInstructorType(ins.instructorType || "Academic");
        setDesignation(ins.designation || "");
        setDateOfJoining(ins.dateOfJoining ? ins.dateOfJoining.split("T")[0] : "");
        setQualification(ins.qualification || "");
        setWorkExperience(ins.workExperience || "");
        setEmail(ins.email || "");
        setPhone(ins.phone || "");
        const existingRows = (ins.Subjects || []).map(s => ({ academic_year: s.academic_year || "", grade_id: s.grade_id, subject_id: s.subject_id }));
        setRows(existingRows.length > 0 ? existingRows : [emptyRow()]);
        // Pre-warm grade + subject options for each row already in use
        existingRows.forEach(r => {
          if (r.academic_year) fetchGradesForYear(r.academic_year, ins.school_id);
          if (r.grade_id) fetchSubjectsForGrade(r.grade_id, ins.school_id);
        });
      })
      .catch(() => message.error("Failed to load instructor"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, id]);

  const fetchGradesForYear = async (year, schoolOverride) => {
    const sid = schoolOverride || schoolId;
    if (!year || !sid || gradesByYear[year]) return;
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/grade/getGradesBySchoolAndYear/${sid}/${year}`);
      setGradesByYear(prev => ({ ...prev, [year]: res.data.grades || [] }));
    } catch {
      setGradesByYear(prev => ({ ...prev, [year]: [] }));
    }
  };

  const fetchSubjectsForGrade = async (gradeId, schoolOverride) => {
    const sid = schoolOverride || schoolId;
    if (!gradeId || !sid || subjectsByGrade[gradeId]) return;
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/subject/getSubjectsBySchoolAndGrade/${sid}/${gradeId}`);
      setSubjectsByGrade(prev => ({ ...prev, [gradeId]: res.data.subjects || [] }));
    } catch {
      setSubjectsByGrade(prev => ({ ...prev, [gradeId]: [] }));
    }
  };

  const handleRowYearChange = (index, year) => {
    setRows(prev => prev.map((r, i) => i === index ? { academic_year: year, grade_id: "", subject_id: "" } : r));
    if (year) fetchGradesForYear(year);
  };

  const handleRowGradeChange = (index, gradeId) => {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, grade_id: gradeId, subject_id: "" } : r));
    if (gradeId) fetchSubjectsForGrade(gradeId);
  };

  const handleRowSubjectChange = (index, subjectId) => {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, subject_id: subjectId } : r));
  };

  const addRow = () => setRows(prev => [...prev, emptyRow()]);
  const removeRow = (index) => setRows(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!schoolId) return message.warning("Please select a school.");
    if (!name.trim()) return message.warning("Please enter the instructor's name.");

    const validRows = rows.filter(r => r.academic_year && r.grade_id && r.subject_id);

    const payload = {
      school_id: schoolId,
      name: name.trim(),
      gender: gender || null,
      instructorType,
      designation: designation || null,
      dateOfJoining: dateOfJoining || null,
      qualification: qualification || null,
      workExperience: workExperience || null,
      email: email || null,
      phone: phone || null,
      subjects: validRows,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await axios.put(`${process.env.REACT_APP_API_URL}/instructor/updateInstructor/${id}`, payload);
        message.success("Instructor updated successfully");
      } else {
        await axios.post(`${process.env.REACT_APP_API_URL}/instructor/createInstructor`, payload);
        message.success("Instructor created successfully");
      }
      navigate(LIST_ROUTE);
    } catch (err) {
      message.error(err?.response?.data?.error || "Failed to save instructor");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => navigate(LIST_ROUTE);

  return (
    <Layout>
      <div className="app-page" style={{ fontFamily: FF, maxWidth: 900, margin: "0 auto", paddingBottom: 40 }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLOR.text, margin: 0, letterSpacing: "-0.3px" }}>
            {isEdit ? "Edit Instructor" : "Create Instructor"}
          </h1>
          <div style={{ width: 40, height: 3, background: COLOR.blueLt, borderRadius: 2, marginTop: 6 }} />
        </div>

        <div style={{
          background: "#fff", borderRadius: 12,
          boxShadow: "0 2px 16px rgba(0,0,0,0.09)",
          border: `1px solid ${COLOR.border}`, overflow: "hidden",
          marginTop: 8, marginBottom: 24,
        }}>
          {/* Dark header bar (matches CreateStudentHSC) */}
          <div style={{ background: COLOR.headBg, padding: "18px 32px" }}>
            <span style={{ color: "#fff", fontSize: 14, fontWeight: 700, letterSpacing: "0.3px" }}>
              {isEdit ? "Update Instructor Details" : "New Instructor Details"}
            </span>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: "24px 32px 0 32px" }}>

            <SectionHead title="General" />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0 24px" }}>
              <Field label="School" required>
                {isSuperAdmin ? (
                  <Select
                    value={schoolId || undefined}
                    onChange={(val) => setSchoolId(val)}
                    placeholder="Select school"
                    showSearch
                    optionFilterProp="children"
                    style={selectStyle}
                  >
                    {schools.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                  </Select>
                ) : (
                  <input value={user?.school?.name || ""} disabled style={{ ...inputStyle, background: COLOR.bg }} />
                )}
              </Field>

              <Field label="Name" required>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Instructor name" style={inputStyle} required />
              </Field>

              <Field label="Gender" required>
                <Select
                  value={gender || undefined}
                  onChange={(val) => setGender(val)}
                  placeholder="Select gender"
                  style={selectStyle}
                >
                  <Option value="Male">Male</Option>
                  <Option value="Female">Female</Option>
                  <Option value="Other">Other</Option>
                </Select>
              </Field>

              <Field label="Instructor Type" required>
                <Select
                  value={instructorType}
                  onChange={(val) => setInstructorType(val)}
                  style={selectStyle}
                >
                  <Option value="Academic">Academic</Option>
                  <Option value="Non Academic">Non Academic</Option>
                </Select>
              </Field>

              <Field label="Designation" required>
                <input value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. Senior Teacher" style={inputStyle} />
              </Field>

              <Field label="Date of Joining" required>
                <input type="date" value={dateOfJoining} onChange={e => setDateOfJoining(e.target.value)} style={inputStyle} />
              </Field>

              <Field label="Qualification" required>
                <input value={qualification} onChange={e => setQualification(e.target.value)} placeholder="e.g. M.Sc, B.Ed" style={inputStyle} />
              </Field>

              <Field label="Work Experience">
                <input value={workExperience} onChange={e => setWorkExperience(e.target.value)} placeholder="e.g. 5 years" style={inputStyle} />
              </Field>

              <Field label="Email" required>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@school.org" style={inputStyle} />
              </Field>

              <Field label="Mobile" required>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="10-digit mobile number"
                  style={inputStyle}
                  maxLength={10}
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  title="Enter a valid 10-digit mobile number"
                />
              </Field>
            </div>

            {/* ── Grade / Subject assignment table ── */}
            <SectionHead title="Grades & Subjects Taught" />

            <div style={{ border: `1px solid ${COLOR.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FF, fontSize: FS }}>
                <thead>
                  <tr style={{ background: COLOR.bg }}>
                    <th style={{ padding: "10px 14px", textAlign: "left", width: 60, color: COLOR.textMid, fontWeight: 600 }}>S.No</th>
                    <th style={{ padding: "10px 14px", textAlign: "left", color: COLOR.textMid, fontWeight: 600 }}>Academic Year</th>
                    <th style={{ padding: "10px 14px", textAlign: "left", color: COLOR.textMid, fontWeight: 600 }}>Grade</th>
                    <th style={{ padding: "10px 14px", textAlign: "left", color: COLOR.textMid, fontWeight: 600 }}>Subject</th>
                    <th style={{ padding: "10px 14px", textAlign: "center", width: 70, color: COLOR.textMid, fontWeight: 600 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={index} style={{ borderTop: `1px solid ${COLOR.border}` }}>
                      <td style={{ padding: "8px 14px", color: COLOR.text }}>{index + 1}</td>
                      <td style={{ padding: "8px 14px" }}>
                        <Select
                          value={row.academic_year || undefined}
                          onChange={(val) => handleRowYearChange(index, val)}
                          placeholder="Select year"
                          style={selectStyle}
                        >
                          {generateAcademicYears().map(y => <Option key={y} value={y}>{y}</Option>)}
                        </Select>
                      </td>
                      <td style={{ padding: "8px 14px" }}>
                        <Select
                          value={row.grade_id || undefined}
                          onChange={(val) => handleRowGradeChange(index, val)}
                          placeholder={row.academic_year ? "Select grade" : "Select year first"}
                          style={selectStyle}
                          disabled={!row.academic_year}
                        >
                          {(gradesByYear[row.academic_year] || []).map(g => <Option key={g.id} value={g.id}>{g.grade}</Option>)}
                        </Select>
                      </td>
                      <td style={{ padding: "8px 14px" }}>
                        <Select
                          value={row.subject_id || undefined}
                          onChange={(val) => handleRowSubjectChange(index, val)}
                          placeholder={row.grade_id ? "Select subject" : "Select grade first"}
                          style={selectStyle}
                          disabled={!row.grade_id}
                        >
                          {(subjectsByGrade[row.grade_id] || [])
                            .filter(s => s.academic_year === row.academic_year)
                            .map(s => <Option key={s.id} value={s.id}>{s.subjectName}</Option>)}
                        </Select>
                      </td>
                      <td style={{ padding: "8px 14px", textAlign: "center" }}>
                        <button type="button" onClick={() => removeRow(index)} title="Remove row"
                          style={{ all: "unset", cursor: "pointer", color: COLOR.danger, fontWeight: 700, fontSize: 16, padding: "0 8px" }}>
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginBottom: 26 }}>
              <ActionBtn variant="light" onClick={addRow}>+ Add Row</ActionBtn>
            </div>

            {/* ── Actions ── */}
            <div style={{ display: "flex", gap: 10, borderTop: `1px solid ${COLOR.border}`, padding: "20px 0 24px" }}>
              <ActionBtn type="submit" variant="success" disabled={saving}>
                {saving ? "Saving..." : (isEdit ? "✓ Update" : "Save")}
              </ActionBtn>
              <ActionBtn variant="danger" onClick={handleCancel}>
                ✕ Cancel
              </ActionBtn>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default CreateInstructor;