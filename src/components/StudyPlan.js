import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import Layout from "./Layout";
import {
  Select, Modal, Drawer, Checkbox, Dropdown, message, notification,
  Spin, Input, Empty,
} from "antd";
import {
  PaperClipOutlined, MoreOutlined, CaretDownOutlined,
  DeleteOutlined, EditOutlined, LockOutlined,
} from "@ant-design/icons";

const { Option } = Select;

const COLOR = {
  blue: "#1e40af", blueLt: "#3b82f6", text: "#1e293b", textMid: "#475569",
  textSoft: "#64748b", border: "#e2e8f0", bg: "#f8fafc",
  green: "#16a34a", greenBg: "#dcfce7", orange: "#c2410c", orangeBg: "#ffedd5",
  danger: "#e21216",
};
const FF = "'Segoe UI', system-ui, sans-serif";
const FS = "13.5px";
// Cycled by card index so consecutive section cards are easy to tell apart at a glance.
const SECTION_ACCENTS = ["#1e40af", "#059669", "#c2410c", "#7c3aed", "#0891b2", "#be185d"];

// School year runs June–May, so before June "today" still belongs to the
// previous session — this is what makes the default match what a class
// teacher would actually call "this year".
const getCurrentAcademicYear = () => {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 5 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
};
const generateAcademicYears = () => {
  const [startYear] = getCurrentAcademicYear().split("-").map(Number);
  return Array.from({ length: 3 }, (_, i) => `${startYear - 1 + i}-${startYear + i}`);
};

const StudyPlan = () => {
  const API = process.env.REACT_APP_API_URL;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const isSuperAdmin = role === "superadmin";

  const [api, contextHolder] = notification.useNotification();

  // If we arrived here via "Edit" from the Study Plan List, the school +
  // academic year are passed as query params (?school_id=...&academic_year=...)
  // so the editor opens already pointed at the right study plan, while every
  // other class/section under it stays fully editable via the grade list.
  const urlSchoolId = searchParams.get("school_id");
  const urlAcademicYear = searchParams.get("academic_year");
  // A study plan's identity IS its (school, academic_year) pair — there's no
  // separate id to hold onto if that pair changes. So once we're editing an
  // existing plan (arrived here via the Edit link, both params present), the
  // academic year is locked; changing it would silently start a different
  // plan instead of editing this one.
  const isEditingExisting = Boolean(urlSchoolId && urlAcademicYear);

  const [academicYear, setAcademicYear] = useState(urlAcademicYear || getCurrentAcademicYear());
  const [schools, setSchools] = useState([]);
  const [schoolId, setSchoolId] = useState(urlSchoolId ? Number(urlSchoolId) : (isSuperAdmin ? "" : (user?.school?.id || "")));

  const [grades, setGrades] = useState([]);
  const [selectedGradeId, setSelectedGradeId] = useState(null);
  const [loadingGrades, setLoadingGrades] = useState(false);

  const [sections, setSections] = useState([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [expanded, setExpanded] = useState({}); // { [sectionId]: bool }

  const [attachDrawer, setAttachDrawer] = useState({ open: false, sectionId: null });
  const [attachOptions, setAttachOptions] = useState([]); // [{id, subjectName, shortCode}]
  const [checkedSubjectIds, setCheckedSubjectIds] = useState([]);
  const [alreadyAttachedIds, setAlreadyAttachedIds] = useState([]); // subjects this section already has
  const [loadingAttachOptions, setLoadingAttachOptions] = useState(false);
  const [saving, setSaving] = useState(false);

  const [teacherModal, setTeacherModal] = useState({ open: false, sectionId: null });
  const [instructors, setInstructors] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState(null);

  const [cloneModal, setCloneModal] = useState({ open: false, sourceSectionId: null });
  const [cloneTargetIds, setCloneTargetIds] = useState([]);

  // ── Properties (edit) modal for a single Section-Subject row ──
  const emptyPropertiesForm = {
    name_as_in_report_card: "", max_mark: "", min_mark: "", passing_mark: "", grade_period: "",
  };
  const [propertiesModal, setPropertiesModal] = useState({ open: false, row: null, sectionShortCode: "" });
  const [propertiesForm, setPropertiesForm] = useState(emptyPropertiesForm);

  const selectedGrade = grades.find(g => g.id === selectedGradeId);
  const cloneSourceSection = sections.find(s => s.id === cloneModal.sourceSectionId);
  const cloneTargets = sections.filter(s => s.id !== cloneModal.sourceSectionId);

  // ── Schools (superadmin only) ──
  useEffect(() => {
    if (!isSuperAdmin) return;
    axios.get(`${API}/school/getAllSchools`)
      .then(r => setSchools(r.data.schools || []))
      .catch(() => api.error({ message: "Failed to fetch schools", placement: "topRight" }));
  }, [isSuperAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Grades for school + year (existing endpoint) ──
  const fetchGrades = useCallback(async () => {
    if (!schoolId || !academicYear) return;
    setLoadingGrades(true);
    try {
      const r = await axios.get(`${API}/grade/getGradesBySchoolAndYear/${schoolId}/${academicYear}`);
      const list = r.data.grades || [];
      setGrades(list);
      setSelectedGradeId(prev => (list.some(g => g.id === prev) ? prev : (list[0]?.id ?? null)));
    } catch {
      setGrades([]);
      setSelectedGradeId(null);
    } finally {
      setLoadingGrades(false);
    }
  }, [API, schoolId, academicYear]);

  useEffect(() => { fetchGrades(); }, [fetchGrades]);

  // ── Sections for the selected grade + year (new endpoint) ──
  const fetchSections = useCallback(async () => {
    if (!schoolId || !selectedGradeId || !academicYear) { setSections([]); return; }
    setLoadingSections(true);
    try {
      const r = await axios.get(`${API}/section/getSectionsForStudyPlan/${schoolId}/${selectedGradeId}/${academicYear}`);
      setSections(r.data.sections || []);
    } catch {
      setSections([]);
      api.error({ message: "Failed to fetch sections", placement: "topRight" });
    } finally {
      setLoadingSections(false);
    }
  }, [API, schoolId, selectedGradeId, academicYear]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchSections(); }, [fetchSections]);

  const handleSchoolChange = (val) => { setSchoolId(val); setSelectedGradeId(null); setSections([]); };
  const handleYearChange = (val) => { setAcademicYear(val); setSelectedGradeId(null); setSections([]); };
  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  // ── Remove Section (existing /section/updateStatus endpoint) ──
  const removeSection = async (sectionId) => {
    if (!window.confirm("Remove this section?")) return;
    try {
      await axios.put(`${API}/section/updateStatus/${sectionId}`, { status: 0 });
      message.success("Section removed");
      fetchSections();
    } catch { message.error("Failed to remove section"); }
  };

  // ── Attach Subject drawer ──
  const openAttachDrawer = async (sectionId) => {
    // section.Subjects is already in state (fetched by getSectionsForStudyPlan),
    // so subjects already attached to this section can be pre-ticked immediately —
    // no need to wait on the subjects-list request below.
    const section = sections.find(s => s.id === sectionId);
    const attachedIds = (section?.Subjects || []).map(row => row.Subject?.id).filter(Boolean);

    setAttachDrawer({ open: true, sectionId });
    setAlreadyAttachedIds(attachedIds);
    setCheckedSubjectIds(attachedIds); // show them as ticked from the start
    setLoadingAttachOptions(true);
    try {
      // Existing endpoint — subjects are already scoped to this grade
      // (and therefore this academic year, since each Grade row belongs to one year).
      const r = await axios.get(`${API}/subject/getSubjectsBySchoolAndGrade/${schoolId}/${selectedGradeId}`);
      setAttachOptions(r.data.subjects || []);
    } catch {
      setAttachOptions([]);
      message.error("Failed to load subjects for this grade");
    } finally { setLoadingAttachOptions(false); }
  };
  const closeAttachDrawer = () => {
    setAttachDrawer({ open: false, sectionId: null });
    setAlreadyAttachedIds([]);
    setCheckedSubjectIds([]);
  };

  const toggleSubjectChecked = (id) => {
    if (alreadyAttachedIds.includes(id)) return; // already attached — locked, detach from the subject table instead
    setCheckedSubjectIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const submitAttachSubjects = async () => {
    const newSubjectIds = checkedSubjectIds.filter(id => !alreadyAttachedIds.includes(id));
    if (newSubjectIds.length === 0) return message.warning("Select at least one new subject.");
    setSaving(true);
    try {
      await axios.post(`${API}/section/attachSubjects/${attachDrawer.sectionId}`, { subject_ids: newSubjectIds });
      message.success("Subjects attached");
      closeAttachDrawer();
      fetchSections();
    } catch (err) {
      message.error(err?.response?.data?.error || "Failed to attach subjects");
    } finally { setSaving(false); }
  };

  const detachSubject = async (sectionId, subjectId) => {
    try {
      await axios.delete(`${API}/section/detachSubject/${sectionId}/${subjectId}`);
      message.success("Subject removed");
      fetchSections();
    } catch { message.error("Failed to remove subject"); }
  };

  // ── Class teacher allocation ──
  const openTeacherModal = async (sectionId) => {
    setTeacherModal({ open: true, sectionId });
    setSelectedTeacherId(sections.find(s => s.id === sectionId)?.ClassTeacher?.id || null);
    try {
      const r = await axios.get(`${API}/instructor/getInstructorsBySchool/${schoolId}`);
      setInstructors(r.data.instructors || []);
    } catch { setInstructors([]); }
  };
  const submitAllocateTeacher = async () => {
    if (!selectedTeacherId) return message.warning("Select a class teacher.");
    setSaving(true);
    try {
      await axios.put(`${API}/section/allocateClassTeacher/${teacherModal.sectionId}`, { instructor_id: selectedTeacherId });
      message.success("Class teacher allocated");
      setTeacherModal({ open: false, sectionId: null });
      fetchSections();
    } catch (err) {
      message.error(err?.response?.data?.error || "Failed to allocate class teacher");
    } finally { setSaving(false); }
  };

  // ── Clone subjects to other sections of the same grade ──
  const openCloneModal = (sectionId) => {
    setCloneModal({ open: true, sourceSectionId: sectionId });
    setCloneTargetIds([]);
  };
  const submitClone = async () => {
    if (cloneTargetIds.length === 0) return message.warning("Select at least one section to clone into.");
    setSaving(true);
    try {
      await axios.post(`${API}/section/cloneSubjects`, {
        source_section_id: cloneModal.sourceSectionId,
        target_section_ids: cloneTargetIds,
      });
      message.success("Subjects cloned");
      setCloneModal({ open: false, sourceSectionId: null });
      fetchSections();
    } catch (err) {
      message.error(err?.response?.data?.error || "Failed to clone subjects");
    } finally { setSaving(false); }
  };

  // ── Properties modal for a Section-Subject row (pencil icon) ──
  const openPropertiesModal = (section, row) => {
    setPropertiesModal({ open: true, row, sectionShortCode: section.shortCode || section.sectionName });
    setPropertiesForm({
      name_as_in_report_card: row.name_as_in_report_card ?? row.Subject?.subjectName ?? "",
      max_mark: row.max_mark ?? "",
      min_mark: row.min_mark ?? "",
      passing_mark: row.passing_mark ?? "",
      grade_period: row.grade_period ?? "",
    });
  };
  const closePropertiesModal = () => {
    setPropertiesModal({ open: false, row: null, sectionShortCode: "" });
    setPropertiesForm(emptyPropertiesForm);
  };
  const submitProperties = async () => {
    const { name_as_in_report_card, max_mark, min_mark, passing_mark, grade_period } = propertiesForm;
    if (!name_as_in_report_card.trim()) return message.warning("Enter the name as it should appear in report card.");
    if (max_mark !== "" && min_mark !== "" && Number(min_mark) > Number(max_mark)) {
      return message.warning("Min Mark cannot be greater than Max Mark.");
    }
    setSaving(true);
    try {
      await axios.put(`${API}/section/updateSectionSubject/${propertiesModal.row.id}`, {
        name_as_in_report_card: name_as_in_report_card.trim(),
        max_mark: max_mark === "" ? null : Number(max_mark),
        min_mark: min_mark === "" ? null : Number(min_mark),
        passing_mark: passing_mark === "" ? null : Number(passing_mark),
        grade_period: grade_period || null,
      });
      message.success("Subject properties updated");
      closePropertiesModal();
      fetchSections();
    } catch (err) {
      message.error(err?.response?.data?.error || "Failed to update subject properties");
    } finally { setSaving(false); }
  };

  // ── Page-level Save / Cancel ──
  // Every action here (attach subject, allocate teacher, edit properties, clone,
  // remove) already persists immediately via its own API call — there's nothing
  // "pending" to batch-save. Save just confirms and returns to the list; Cancel
  // discards nothing and does the same.
  const handleSavePage = () => {
    message.success("Study plan saved");
    navigate(-1);
  };
  const handleCancelPage = () => navigate(-1);

  const sectionMenuItems = (section) => ([
    { key: "teacher", label: "Allocate Class Teacher", onClick: () => openTeacherModal(section.id) },
    { key: "clone", label: "Clone Subjects To...", onClick: () => openCloneModal(section.id) },
  ]);

  const inp = { fontFamily: FF, fontSize: FS };

  return (
    <Layout>
      {contextHolder}
      <div className="app-page" style={{ fontFamily: FF }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLOR.text, margin: 0, letterSpacing: "-0.3px" }}>Study Plan</h1>
          <div style={{ width: 40, height: 3, background: COLOR.blueLt, borderRadius: 2, marginTop: 6 }} />
        </div>

        {/* ── Academic Year / Institute selectors ── */}
        <div style={{ display: "flex", gap: 40, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
          <div>
            <label style={{ display: "block", fontSize: FS, fontWeight: 600, color: COLOR.textMid, marginBottom: 5 }}>
              Academic Year <span style={{ color: COLOR.danger }}>*</span>
              {isEditingExisting && (
                <LockOutlined style={{ marginLeft: 6, fontSize: 11, color: COLOR.textSoft }} title="Fixed once the study plan is created" />
              )}
            </label>
            <Select
              value={academicYear}
              onChange={handleYearChange}
              disabled={isEditingExisting}
              style={{ width: 220, ...inp }}
            >
              {generateAcademicYears().map(y => <Option key={y} value={y}>{y.replace("-", " - ")}</Option>)}
            </Select>
            {isEditingExisting && (
              <div style={{ fontSize: 11.5, color: COLOR.textSoft, marginTop: 4 }}>
                Academic year can't be changed once a study plan is saved.
              </div>
            )}
          </div>
          <div>
            <label style={{ display: "block", fontSize: FS, fontWeight: 600, color: COLOR.textMid, marginBottom: 5 }}>
              Institute Name <span style={{ color: COLOR.danger }}>*</span>
            </label>
            {isSuperAdmin ? (
              <Select value={schoolId || undefined} onChange={handleSchoolChange} placeholder="Select school"
                showSearch optionFilterProp="children" style={{ width: 280, ...inp }}>
                {schools.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
              </Select>
            ) : (
              <Input value={user?.school?.name || ""} disabled style={{ width: 280, ...inp }} />
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          {/* ── Left: Grade list ── */}
          <div style={{ width: 160, flexShrink: 0, background: "#fff", borderRadius: 10, border: `1px solid ${COLOR.border}`, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${COLOR.border}`, fontWeight: 700, color: COLOR.text }}>
              Select Class
            </div>
            {loadingGrades ? (
              <div style={{ textAlign: "center", padding: 24 }}><Spin /></div>
            ) : grades.length === 0 ? (
              <div style={{ padding: 20 }}><Empty description="No grades for this year" /></div>
            ) : grades.map(g => (
              <div key={g.id} onClick={() => setSelectedGradeId(g.id)}
                style={{
                  padding: "11px 16px", cursor: "pointer", fontSize: FS,
                  color: selectedGradeId === g.id ? "#fff" : COLOR.text,
                  background: selectedGradeId === g.id ? COLOR.blue : "#fff",
                  borderBottom: `1px solid ${COLOR.border}`, fontWeight: selectedGradeId === g.id ? 600 : 500,
                }}>
                {g.grade}
              </div>
            ))}
          </div>

          {/* ── Right: Sections for selected grade ── */}
          <div style={{ flex: 1, background: "#fff", borderRadius: 10, border: `1px solid ${COLOR.border}`, padding: "16px 20px", minHeight: 300 }}>
            {!selectedGrade ? (
              <Empty description="Select a grade" style={{ margin: "60px 0" }} />
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: COLOR.blue }}>{selectedGrade.grade}</span>
                  <Pill value={`${sections.length} Section's`} color={COLOR.orange} bg={COLOR.orangeBg} />
                </div>

                {loadingSections ? (
                  <div style={{ textAlign: "center", padding: 40 }}><Spin /></div>
                ) : sections.length === 0 ? (
                  <Empty description="No sections yet" style={{ margin: "40px 0" }} />
                ) : sections.map((section, index) => (
                  <div key={section.id} style={{
                    border: `1px solid ${COLOR.border}`, borderLeft: `4px solid ${SECTION_ACCENTS[index % SECTION_ACCENTS.length]}`,
                    borderRadius: 8, marginBottom: 14, background: "#fff",
                    boxShadow: "0 2px 10px rgba(15, 23, 42, 0.08)",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <span style={{ fontWeight: 700, color: COLOR.blue }}>{section.sectionName}</span>
                        <Pill value={`${(section.Subjects || []).length} Subject's`} color={COLOR.orange} bg={COLOR.orangeBg} />
                        <Pill value={`${section.activeStudentCount ?? 0} Student's`} color={COLOR.green} bg={COLOR.greenBg} />
                        {section.ClassTeacher && (
                          <span style={{ fontSize: 12, color: COLOR.textSoft }}>Class Teacher: <b style={{ color: COLOR.text }}>{section.ClassTeacher.name}</b></span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <LinkBtn label="Remove" color={COLOR.danger} onClick={() => removeSection(section.id)} />
                        <LinkBtn label="Attach Subject" icon={<PaperClipOutlined />} color={COLOR.blue} onClick={() => openAttachDrawer(section.id)} />
                        <Dropdown menu={{ items: sectionMenuItems(section) }} trigger={["click"]}>
                          <MoreOutlined style={{ cursor: "pointer", fontSize: 16, color: COLOR.textMid }} />
                        </Dropdown>
                        <ExpandToggle expanded={!!expanded[section.id]} onClick={() => toggleExpand(section.id)} />
                      </div>
                    </div>

                    {expanded[section.id] && (
                      <SubjectTable section={section}
                        onRemoveSubject={(subjId) => detachSubject(section.id, subjId)}
                        onEditSubject={(row) => openPropertiesModal(section, row)} />
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* ── Page-level Save / Cancel ── */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button onClick={handleCancelPage} style={btnStyle(COLOR.textMid, "#f1f5f9")}>Cancel</button>
          <button onClick={handleSavePage} style={btnStyle("#fff", COLOR.blueLt)}>Save</button>
        </div>
      </div>

      {/* ── Attach Subject drawer ── */}
      <Drawer title="Attach Subject" open={attachDrawer.open} onClose={closeAttachDrawer} width={380}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={closeAttachDrawer} style={btnStyle(COLOR.textMid, "#f1f5f9")}>Cancel</button>
            <button onClick={submitAttachSubjects} disabled={saving} style={btnStyle("#fff", COLOR.blue)}>{saving ? "Saving..." : "Save"}</button>
          </div>
        }>
        {loadingAttachOptions ? <Spin /> : attachOptions.length === 0 ? (
          <Empty description="No subjects created for this grade yet" />
        ) : (
          <div>
            <div style={{ fontWeight: 700, color: COLOR.text, marginBottom: 8 }}>Core</div>
            {attachOptions.map(s => {
              const isAttached = alreadyAttachedIds.includes(s.id);
              return (
                <div key={s.id} style={{ padding: "6px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Checkbox
                    checked={checkedSubjectIds.includes(s.id)}
                    disabled={isAttached}
                    onChange={() => toggleSubjectChecked(s.id)}
                    style={isAttached ? { color: COLOR.textSoft } : undefined}
                  >
                    {s.subjectName}{s.shortCode ? ` - ${s.shortCode}` : ""}
                  </Checkbox>
                  {isAttached && <Pill value="Added" color={COLOR.green} bg={COLOR.greenBg} />}
                </div>
              );
            })}
          </div>
        )}
      </Drawer>

      {/* ── Allocate Class Teacher modal ── */}
      <Modal title="Allocate Class Teacher" open={teacherModal.open}
        onCancel={() => setTeacherModal({ open: false, sectionId: null })}
        onOk={submitAllocateTeacher} confirmLoading={saving} okText="Allocate">
        <Select value={selectedTeacherId || undefined} onChange={setSelectedTeacherId}
          placeholder="Select instructor" showSearch optionFilterProp="children" style={{ width: "100%" }}>
          {instructors.map(i => <Option key={i.id} value={i.id}>{i.name}</Option>)}
        </Select>
      </Modal>

      {/* ── Clone Subjects modal ── */}
      <Modal
        title="Clone Subjects To Other Sections"
        open={cloneModal.open}
        onCancel={() => setCloneModal({ open: false, sourceSectionId: null })}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={() => setCloneModal({ open: false, sourceSectionId: null })} style={btnStyle(COLOR.textMid, "#f1f5f9")}>Cancel</button>
            <button
              onClick={submitClone}
              disabled={saving || cloneTargetIds.length === 0}
              style={{
                ...btnStyle("#fff", COLOR.blue),
                opacity: cloneTargetIds.length === 0 ? 0.5 : 1,
                cursor: cloneTargetIds.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Cloning..." : "Clone"}
            </button>
          </div>
        }
      >
        <p style={{ fontSize: FS, color: COLOR.textMid, margin: "0 0 14px" }}>
          Copies every subject from <b style={{ color: COLOR.text }}>{cloneSourceSection?.sectionName}</b> into the sections you pick below.
          Subjects a section already has are left untouched.
        </p>
        {cloneTargets.length === 0 ? (
          <Empty description="No other sections in this grade" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div style={{ border: `1px solid ${COLOR.border}`, borderRadius: 8, overflow: "hidden" }}>
            {cloneTargets.map((s, i) => {
              const sourceSubjects = (cloneSourceSection?.Subjects || []).map(row => row.Subject).filter(Boolean);
              const targetSubjectIds = new Set((s.Subjects || []).map(row => row.Subject?.id));
              const toAdd = sourceSubjects.filter(sub => !targetSubjectIds.has(sub.id));
              const alreadyHas = sourceSubjects.filter(sub => targetSubjectIds.has(sub.id));
              const nothingToAdd = sourceSubjects.length > 0 && toAdd.length === 0;

              return (
                <div key={s.id} style={{
                  padding: "10px 14px", cursor: nothingToAdd ? "not-allowed" : "pointer",
                  borderBottom: i === cloneTargets.length - 1 ? "none" : `1px solid ${COLOR.border}`,
                  background: cloneTargetIds.includes(s.id) ? COLOR.bg : "#fff",
                  opacity: nothingToAdd ? 0.65 : 1,
                }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "inherit" }}>
                    <Checkbox
                      checked={cloneTargetIds.includes(s.id)}
                      disabled={nothingToAdd}
                      onChange={() => setCloneTargetIds(prev =>
                        prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])}
                    />
                    <span style={{ fontSize: FS, fontWeight: 600, color: COLOR.text }}>{s.sectionName}</span>
                    <span style={{ marginLeft: "auto" }}>
                      <Pill value={`${(s.Subjects || []).length} Subject's`} color={COLOR.orange} bg={COLOR.orangeBg} />
                    </span>
                  </label>

                  {sourceSubjects.length > 0 && (
                    <div style={{ marginLeft: 28, marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {toAdd.map(sub => (
                        <Pill key={`add-${sub.id}`} value={`+ ${sub.subjectName}`} color={COLOR.blue} bg="#dbeafe" />
                      ))}
                      {alreadyHas.map(sub => (
                        <Pill key={`have-${sub.id}`} value={`${sub.subjectName} — already added`} color={COLOR.textSoft} bg={COLOR.bg} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      {/* ── Subject Properties modal (pencil icon in the subject table) ── */}
      <Modal
        title={`Properties - ${propertiesModal.row?.Subject?.subjectName || ""}${propertiesModal.sectionShortCode ? ` - ${propertiesModal.sectionShortCode}` : ""}`}
        open={propertiesModal.open}
        onCancel={closePropertiesModal}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={closePropertiesModal} style={btnStyle(COLOR.textMid, "#f1f5f9")}>Cancel</button>
            <button onClick={submitProperties} disabled={saving} style={btnStyle("#fff", COLOR.blue)}>{saving ? "Saving..." : "Save"}</button>
          </div>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px" }}>
          <div>
            <label style={{ display: "block", fontSize: FS, fontWeight: 600, color: COLOR.textMid, marginBottom: 5 }}>
              Name as in report card <span style={{ color: COLOR.danger }}>*</span>
            </label>
            <Input value={propertiesForm.name_as_in_report_card}
              onChange={e => setPropertiesForm(f => ({ ...f, name_as_in_report_card: e.target.value }))}
              style={inp} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: FS, fontWeight: 600, color: COLOR.textMid, marginBottom: 5 }}>
              Max Mark
            </label>
            <Input type="number" value={propertiesForm.max_mark}
              onChange={e => setPropertiesForm(f => ({ ...f, max_mark: e.target.value }))}
              style={inp} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: FS, fontWeight: 600, color: COLOR.textMid, marginBottom: 5 }}>
              Min Mark
            </label>
            <Input type="number" value={propertiesForm.min_mark}
              onChange={e => setPropertiesForm(f => ({ ...f, min_mark: e.target.value }))}
              style={inp} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: FS, fontWeight: 600, color: COLOR.textMid, marginBottom: 5 }}>
              Passing Mark
            </label>
            <Input type="number" value={propertiesForm.passing_mark}
              onChange={e => setPropertiesForm(f => ({ ...f, passing_mark: e.target.value }))}
              style={inp} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: FS, fontWeight: 600, color: COLOR.textMid, marginBottom: 5 }}>
              Grade Period
            </label>
            <Input placeholder="e.g. Term 1" value={propertiesForm.grade_period}
              onChange={e => setPropertiesForm(f => ({ ...f, grade_period: e.target.value }))}
              style={inp} />
          </div>
        </div>
      </Modal>
    </Layout>
  );
};

// ── Small presentational helpers ──

const Pill = ({ value, color, bg }) => (
  <span style={{ fontSize: 11.5, fontWeight: 700, color, background: bg, padding: "2px 10px", borderRadius: 10 }}>{value}</span>
);

const LinkBtn = ({ label, icon, color, onClick }) => (
  <span onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer", color, fontSize: 12.5, fontWeight: 600 }}>
    {icon}{label}
  </span>
);

// Single caret that rotates 180° on expand/collapse, in a circular hover target —
// replaces the old two-icon (Up/Down) swap for a smoother, more modern feel.
const ExpandToggle = ({ expanded, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <span onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        width: 26, height: 26, borderRadius: "50%", display: "inline-flex", alignItems: "center",
        justifyContent: "center", cursor: "pointer", background: hov ? COLOR.bg : "transparent",
        transition: "background 0.15s",
      }}>
      <CaretDownOutlined style={{
        fontSize: 14, color: COLOR.textMid, transition: "transform 0.2s ease",
        transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
      }} />
    </span>
  );
};

const btnStyle = (color, bg) => ({
  all: "unset", padding: "8px 20px", borderRadius: 7, background: bg, color, fontSize: FS,
  fontWeight: 600, cursor: "pointer",
});

// Subject Name / Code table under an expanded section.
const SubjectTable = ({ section, onRemoveSubject, onEditSubject }) => {
  const rows = section.Subjects || [];

  if (rows.length === 0) {
    return (
      <div style={{ padding: "14px 14px 18px", borderTop: `1px solid ${COLOR.border}` }}>
        <Empty description="No subjects attached" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );
  }

  return (
    <div style={{ borderTop: `1px solid ${COLOR.border}`, padding: "14px" }}>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontWeight: 700, color: COLOR.text }}>Core</span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", fontSize: FS }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${COLOR.border}` }}>
            <th style={{ textAlign: "left", padding: "8px 12px", color: COLOR.blue }}>Subject Name</th>
            <th style={{ textAlign: "left", padding: "8px 12px", color: COLOR.blue }}>Subject Code</th>
            <th style={{ textAlign: "center", padding: "8px 12px", color: COLOR.blue, width: 80 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} style={{ borderBottom: `1px solid ${COLOR.border}` }}>
              <td style={{ padding: "8px 12px", color: COLOR.text }}>{row.Subject?.subjectName}</td>
              <td style={{ padding: "8px 12px", color: COLOR.textMid }}>{row.Subject?.shortCode}</td>
              <td style={{ padding: "8px 12px", textAlign: "center" }}>
                <span style={{ display: "inline-flex", gap: 14, alignItems: "center", justifyContent: "center" }}>
                  <EditOutlined style={{ color: COLOR.blue, cursor: "pointer" }} onClick={() => onEditSubject(row)} />
                  <DeleteOutlined style={{ color: COLOR.danger, cursor: "pointer" }} onClick={() => onRemoveSubject(row.Subject?.id)} />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StudyPlan;