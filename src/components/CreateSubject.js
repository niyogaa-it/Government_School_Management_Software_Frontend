import React, { useEffect, useState } from "react";
import { Form, Input, Select, notification } from "antd";
import { CheckCircleOutlined, ExclamationCircleOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Layout from "./Layout";

const { Option } = Select;

const COLOR = {
  blue: "#1e40af", blueLt: "#3b82f6", text: "#1e293b", textMid: "#475569",
  border: "#e2e8f0", warn: "#92400e", warnBg: "#fef3c7", warnBorder: "#fde68a",
  success: "#166534", successBg: "#dcfce7", successBorder: "#bbf7d0",
  rowBg: "#f8fafc", rowBorder: "#e2e8f0", accent: "#0ea5e9",
};
const FF = "'Segoe UI', system-ui, sans-serif";
const FS = "13.5px";

const generateAcademicYears = () => Array.from({length:2},(_,i)=>`${2025+i}-${2026+i}`);

const CreateSubject = () => {
  const [form] = Form.useForm();
  const [schools, setSchools] = useState([]);
  const [grades, setGrades] = useState([]);
  const [selectedGrades, setSelectedGrades] = useState([]);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [gradesWarning, setGradesWarning] = useState("");
  const [loading, setLoading] = useState(false);
  const [subjectEntries, setSubjectEntries] = useState([]); // [{gradeId, gradeName, subjectName, shortCode}]
  const [results, setResults] = useState([]); // per-grade success/error after submit
  const [api, contextHolder] = notification.useNotification();
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const isSuperAdmin = user?.roleName?.toLowerCase().replace(/\s+/g, "") === "superadmin";
  const schoolId = user?.school?.id;

  useEffect(() => {
    if (isSuperAdmin) {
      axios
        .get(`${process.env.REACT_APP_API_URL}/school/getAllSchools`)
        .then((r) => setSchools(r.data.schools || []))
        .catch(() => {});
    }
  }, []);

  const fetchGrades = async (selectedSchoolId, year) => {
    if (!selectedSchoolId || !year) return;
    setGradesLoading(true);
    setGrades([]);
    setGradesWarning("");
    setSelectedGrades([]);
    setSubjectEntries([]);
    setResults([]);
    form.setFieldsValue({ grade_ids: undefined });
    try {
      const r = await axios.get(
        `${process.env.REACT_APP_API_URL}/grade/getGradesBySchoolAndYear/${selectedSchoolId}/${year}`
      );
      const list = r.data.grades || [];
      if (list.length === 0)
        setGradesWarning(`No grades created for this school with academic year ${year}.`);
      setGrades(list);
    } catch {
      setGradesWarning("Failed to fetch grades.");
    } finally {
      setGradesLoading(false);
    }
  };

  const handleSchoolChange = () => {
    form.setFieldsValue({ academic_year: undefined, grade_ids: undefined });
    setGrades([]);
    setGradesWarning("");
    setSelectedGrades([]);
    setSubjectEntries([]);
    setResults([]);
  };

  const handleAcademicYearChange = (year) => {
    const sid = isSuperAdmin ? form.getFieldValue("school_id") : schoolId;
    if (!sid && isSuperAdmin) {
      api.warning({ message: "Please select a school first", placement: "topRight" });
      form.setFieldsValue({ academic_year: undefined });
      return;
    }
    setSelectedGrades([]);
    setSubjectEntries([]);
    setResults([]);
    form.setFieldsValue({ grade_ids: undefined });
    fetchGrades(sid, year);
  };

  // When grades are selected/deselected, sync subjectEntries
  const handleGradeChange = (gradeIds) => {
    setSelectedGrades(gradeIds);
    setResults([]);

    // Keep existing entries for already-selected grades, add new ones, remove deselected
    setSubjectEntries((prev) => {
      const existing = {};
      prev.forEach((e) => { existing[e.gradeId] = e; });

      return gradeIds.map((gid) => {
        const gradeObj = grades.find((g) => g.id === gid);
        return existing[gid] || { gradeId: gid, gradeName: gradeObj?.grade || gid, subjectName: "", shortCode: "" };
      });
    });
  };

  const updateEntry = (gradeId, field, value) => {
    setSubjectEntries((prev) =>
      prev.map((e) => (e.gradeId === gradeId ? { ...e, [field]: value } : e))
    );
  };

  const removeEntry = (gradeId) => {
    const updated = selectedGrades.filter((id) => id !== gradeId);
    setSelectedGrades(updated);
    setSubjectEntries((prev) => prev.filter((e) => e.gradeId !== gradeId));
    form.setFieldsValue({ grade_ids: updated });
    setResults((prev) => prev.filter((r) => r.gradeId !== gradeId));
  };

  const handleSubmit = async () => {
    // Validate top-level fields
    try {
      await form.validateFields(["school_id", "academic_year", "grade_ids"]);
    } catch {
      return;
    }

    if (subjectEntries.length === 0) {
      api.warning({ message: "Please select at least one grade", placement: "topRight" });
      return;
    }

    // Validate all entries
    const invalid = subjectEntries.filter((e) => !e.subjectName.trim() || !e.shortCode.trim());
    if (invalid.length > 0) {
      api.warning({
        message: "Incomplete entries",
        description: "Please fill Subject Name and Short Code for all selected grades.",
        placement: "topRight",
      });
      return;
    }

    setLoading(true);
    setResults([]);

    const sid = isSuperAdmin ? form.getFieldValue("school_id") : schoolId;
    const year = form.getFieldValue("academic_year");

    const resultsArr = await Promise.all(
      subjectEntries.map(async (entry) => {
        try {
          const r = await axios.post(`${process.env.REACT_APP_API_URL}/subject/createSubject`, {
            subjectName: entry.subjectName.trim(),
            shortCode: entry.shortCode.trim(),
            school_id: sid,
            academic_year: year,
            grade_id: entry.gradeId,
          });
          if (r.status === 201) {
            return { gradeId: entry.gradeId, gradeName: entry.gradeName, status: "success" };
          }
        } catch (err) {
          const status = err.response?.status;
          return {
            gradeId: entry.gradeId,
            gradeName: entry.gradeName,
            status: status === 409 || status === 400 ? "duplicate" : "error",
            message: err.response?.data?.error || "Something went wrong.",
          };
        }
      })
    );

    setResults(resultsArr);
    setLoading(false);

    const successCount = resultsArr.filter((r) => r.status === "success").length;
    const failCount = resultsArr.length - successCount;

    if (successCount > 0 && failCount === 0) {
      api.success({
        message: "All Subjects Created!",
        description: `${successCount} subject(s) created successfully.`,
        icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
        placement: "topRight",
        duration: 3,
      });
      form.resetFields();
      setGrades([]);
      setSelectedGrades([]);
      setSubjectEntries([]);
      setResults([]);
    } else if (successCount > 0) {
      api.warning({
        message: `${successCount} created, ${failCount} failed`,
        description: "Some subjects could not be created. See details below.",
        icon: <ExclamationCircleOutlined style={{ color: "#faad14" }} />,
        placement: "topRight",
        duration: 5,
      });
    } else {
      api.error({
        message: "Failed to Create Subjects",
        description: "None of the subjects could be created.",
        placement: "topRight",
        duration: 4,
      });
    }
  };

  const inp = { fontFamily: FF, fontSize: FS };

  const getResultForGrade = (gradeId) => results.find((r) => r.gradeId === gradeId);

  return (
    <Layout>
      {contextHolder}
      <div className="app-page" style={{ fontFamily: FF }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLOR.text, margin: 0, letterSpacing: "-0.3px" }}>
            Create Subject
          </h1>
          <div style={{ width: 40, height: 3, background: COLOR.blueLt, borderRadius: 2, marginTop: 6 }} />
        </div>

        <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Top Form Card */}
          <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: `1px solid ${COLOR.border}`, padding: "28px 32px" }}>
            <Form form={form} layout="vertical" style={{ fontFamily: FF }}>

              {/* School */}
              {isSuperAdmin ? (
                <Form.Item name="school_id" label="School" rules={[{ required: true, message: "Select a school" }]}>
                  <Select showSearch placeholder="Select school" onChange={handleSchoolChange} style={inp}>
                    {schools.map((s) => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                  </Select>
                </Form.Item>
              ) : (
                <>
                  <Form.Item name="school_id" hidden initialValue={schoolId}><Input type="hidden" /></Form.Item>
                  <Form.Item label="School"><Input value={user?.school?.name || "N/A"} disabled style={inp} /></Form.Item>
                </>
              )}

              {/* Academic Year */}
              <Form.Item name="academic_year" label="Academic Year" rules={[{ required: true, message: "Select academic year" }]}>
                <Select placeholder="Select academic year" onChange={handleAcademicYearChange} style={inp}>
                  {generateAcademicYears().map((y) => <Option key={y} value={y}>{y}</Option>)}
                </Select>
              </Form.Item>

              {/* Grade (Multi-select) */}
              <Form.Item
                name="grade_ids"
                label={
                  <span style={{ fontFamily: FF }}>
                    Grade
                    <span style={{ marginLeft: 8, fontSize: 12, color: COLOR.textMid, fontWeight: 400 }}>
                      (select multiple)
                    </span>
                  </span>
                }
                rules={[{ required: true, message: "Select at least one grade" }]}
                style={{ marginBottom: 0 }}
              >
                {gradesWarning ? (
                  <div style={{ background: COLOR.warnBg, border: `1px solid ${COLOR.warnBorder}`, borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, fontSize: "13px", color: COLOR.warn, fontWeight: 500 }}>
                    <span style={{ fontSize: 16 }}>⚠️</span>{gradesWarning}
                  </div>
                ) : (
                  <Select
                    mode="multiple"
                    placeholder={grades.length === 0 ? "Select school & academic year first" : "Select one or more grades"}
                    disabled={grades.length === 0 || gradesLoading}
                    loading={gradesLoading}
                    onChange={handleGradeChange}
                    value={selectedGrades}
                    style={inp}
                    maxTagCount="responsive"
                  >
                    {grades.map((g) => <Option key={g.id} value={g.id}>{g.grade}</Option>)}
                  </Select>
                )}
              </Form.Item>

            </Form>
          </div>

          {/* Per-Grade Subject Entries */}
          {subjectEntries.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: `1px solid ${COLOR.border}`, overflow: "hidden" }}>
              {/* Table Header */}
              <div style={{ background: "#1a2236", padding: "12px 20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 40px", gap: 12, alignItems: "center" }}>
                <div style={{ color: "#fff", fontWeight: 600, fontSize: "13px", letterSpacing: "0.2px" }}>Grade</div>
                <div style={{ color: "#fff", fontWeight: 600, fontSize: "13px", letterSpacing: "0.2px" }}>Subject Name <span style={{ color: "#f87171" }}>*</span></div>
                <div style={{ color: "#fff", fontWeight: 600, fontSize: "13px", letterSpacing: "0.2px" }}>Short Code <span style={{ color: "#f87171" }}>*</span></div>
                <div />
              </div>

              {/* Entries */}
              {subjectEntries.map((entry, idx) => {
                const result = getResultForGrade(entry.gradeId);
                const isSuccess = result?.status === "success";
                const isDuplicate = result?.status === "duplicate";
                const isError = result?.status === "error";

                let rowBg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
                if (isSuccess) rowBg = "#f0fdf4";
                if (isDuplicate || isError) rowBg = "#fff7f7";

                return (
                  <div key={entry.gradeId}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr 40px",
                        gap: 12,
                        alignItems: "center",
                        padding: "12px 20px",
                        background: rowBg,
                        borderBottom: `1px solid ${COLOR.border}`,
                        transition: "background 0.15s",
                      }}
                    >
                      {/* Grade Name */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLOR.blueLt, flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, color: COLOR.text, fontSize: FS }}>{entry.gradeName}</span>
                      </div>

                      {/* Subject Name Input */}
                      <Input
                        placeholder="Enter subject name"
                        value={entry.subjectName}
                        onChange={(e) => updateEntry(entry.gradeId, "subjectName", e.target.value)}
                        disabled={isSuccess}
                        style={{
                          ...inp,
                          borderColor: (!entry.subjectName.trim() && results.length > 0) ? "#f87171" : undefined,
                        }}
                      />

                      {/* Short Code Input */}
                      <Input
                        placeholder="Enter short code"
                        value={entry.shortCode}
                        onChange={(e) => updateEntry(entry.gradeId, "shortCode", e.target.value)}
                        disabled={isSuccess}
                        style={{
                          ...inp,
                          borderColor: (!entry.shortCode.trim() && results.length > 0) ? "#f87171" : undefined,
                        }}
                      />

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => removeEntry(entry.gradeId)}
                        title="Remove this grade"
                        style={{
                          all: "unset",
                          width: 32,
                          height: 32,
                          borderRadius: 7,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          color: "#ef4444",
                          background: "rgba(239,68,68,0.08)",
                          fontSize: 15,
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.18)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
                      >
                        <DeleteOutlined />
                      </button>
                    </div>

                    {/* Result message row */}
                    {result && (
                      <div style={{
                        padding: "6px 20px 8px 42px",
                        fontSize: "12px",
                        fontWeight: 500,
                        background: isSuccess ? "#f0fdf4" : "#fff7f7",
                        borderBottom: `1px solid ${COLOR.border}`,
                        color: isSuccess ? "#166534" : "#b91c1c",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}>
                        {isSuccess ? (
                          <><CheckCircleOutlined style={{ color: "#16a34a" }} /> Subject created successfully</>
                        ) : isDuplicate ? (
                          <><ExclamationCircleOutlined style={{ color: "#dc2626" }} /> Duplicate: already exists for this grade</>
                        ) : (
                          <><ExclamationCircleOutlined style={{ color: "#dc2626" }} /> {result.message}</>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Summary Bar */}
              {subjectEntries.length > 1 && (
                <div style={{ padding: "10px 20px", background: "#f1f5f9", borderTop: `1px solid ${COLOR.border}`, display: "flex", alignItems: "center", gap: 8, fontSize: "12.5px", color: COLOR.textMid }}>
                  <PlusOutlined style={{ fontSize: 11 }} />
                  <span><strong>{subjectEntries.length}</strong> grade(s) selected — fill Subject Name & Short Code for each</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", paddingBottom: 32 }}>
            <button
              type="button"
              onClick={() => navigate("/subject")}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
              style={{ all: "unset", padding: "9px 28px", borderRadius: 8, border: `1px solid ${COLOR.border}`, fontSize: FS, fontWeight: 600, color: COLOR.textMid, cursor: "pointer", background: "#fff", transition: "background 0.15s" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = COLOR.blue; }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = COLOR.blueLt; }}
              style={{ all: "unset", padding: "9px 28px", borderRadius: 8, background: loading ? "#93c5fd" : COLOR.blueLt, color: "#fff", fontSize: FS, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 2px 8px rgba(59,130,246,0.28)", transition: "all 0.18s" }}
            >
              {loading ? "Creating..." : `Create Subject${subjectEntries.length > 1 ? `s (${subjectEntries.length})` : ""}`}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CreateSubject;