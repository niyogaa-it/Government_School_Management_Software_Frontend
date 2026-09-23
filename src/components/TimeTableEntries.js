import React, { useState, useEffect, useMemo, useCallback } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import { Modal, Select, DatePicker, Collapse, Radio, message, Button, Spin } from "antd";
import { CloseOutlined, PlusOutlined } from "@ant-design/icons";
import moment from "moment";

const { Option } = Select;
const { Panel } = Collapse;

// ─────────────────────────────────────────────────────────────────────────
// Design tokens — kept consistent with the rest of the app (NewTimeSet.js,
// NewWeekDays.js, etc.) rather than introducing a new palette.
// ─────────────────────────────────────────────────────────────────────────
const COLOR = {
  blue: "#1e40af", blueLt: "#3b82f6", text: "#1e293b", textMid: "#475569",
  textSoft: "#64748b", border: "#e2e8f0", headerBg: "#f8fafc", danger: "#e21216",
  disabledBg: "#f1f5f9",
};
const FF = "'Segoe UI', system-ui, sans-serif";
const FS = "13px";

// A cell can hold different subjects, or the same subject taught by
// different instructors, up to this many entries. Mirrors
// MAX_ENTRIES_PER_CELL in timeTable.controller.js.
const MAX_ENTRIES_PER_CELL = 16;

// Chip color cycles per subject so entries stay visually grouped by
// subject inside a crowded cell.
const SUBJECT_COLORS = [
  { bg: "#ecfdf3", border: "#86efac", text: "#15803d" },
  { bg: "#eff6ff", border: "#93c5fd", text: "#1e40af" },
  { bg: "#fff7ed", border: "#fdba74", text: "#c2410c" },
  { bg: "#fdf4ff", border: "#e9a3f0", text: "#a21caf" },
  { bg: "#fef2f2", border: "#fca5a5", text: "#b91c1c" },
  { bg: "#f0fdfa", border: "#5eead4", text: "#0f766e" },
];
const colorForSubject = (subjectId) => SUBJECT_COLORS[Number(subjectId) % SUBJECT_COLORS.length];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
};

const API = process.env.REACT_APP_API_URL;

// ─────────────────────────────────────────────────────────────────────────
// Props:
//   schoolId, schoolName, academicYear  — the scope this editor works in.
//   initialTimeTableId  — pass the id of an existing timetable to lock the
//     picker onto it (Edit / View from the list). Omit for "New Timetable",
//     which keeps the picker + "add new" affordance from the school/year.
//   readOnly — View mode: entries render but nothing can be added/removed.
//   onClose  — called when the editor is dismissed (list should re-fetch
//     here, since header dates or entries may have changed).
// ─────────────────────────────────────────────────────────────────────────
// A handful of nearby academic years to pick from when creating a timetable
// without a school/year already chosen elsewhere. "YYYY-YYYY" to match the
// format used across the app (e.g. "2026-2027").
const nearbyAcademicYears = () => {
  const y = new Date().getFullYear();
  const years = [];
  for (let i = -1; i <= 3; i++) years.push(`${y + i}-${y + i + 1}`);
  return years;
};

const TimeTableEntries = ({
  schoolId: initialSchoolId,
  schoolName: initialSchoolName,
  academicYear: initialAcademicYearProp,
  initialTimeTableId,
  readOnly,
  lockSchool, // true when the caller already knows the school and it shouldn't change (e.g. non-superadmin)
  onClose,
}) => {
  const isLocked = !!initialTimeTableId; // editing/viewing one specific timetable — school/year/timetable all fixed
  const isReadOnly = !!readOnly;
  const canPickSchool = !isLocked && !lockSchool;
  const canPickYear = !isLocked;

  // School and Academic Year live as local state now (not just display-only
  // props) so they can be picked right here instead of forcing a selection
  // from the page's top filter bar first.
  const [schoolId, setSchoolId] = useState(initialSchoolId || null);
  const [schoolName, setSchoolName] = useState(initialSchoolName || "");
  const [academicYear, setAcademicYear] = useState(initialAcademicYearProp || "");
  const [schools, setSchools] = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const academicYearOptions = useMemo(() => {
    const opts = nearbyAcademicYears();
    if (academicYear && !opts.includes(academicYear)) opts.unshift(academicYear);
    return opts;
  }, [academicYear]);

  const [timetables, setTimetables] = useState([]);
  const [timeTableId, setTimeTableId] = useState(initialTimeTableId || null);
  const [loadingTimetables, setLoadingTimetables] = useState(true);
  const [addingTimeTable, setAddingTimeTable] = useState(false);
  const [newRange, setNewRange] = useState({ start: null, end: null });

  const [sections, setSections] = useState([]); // flat list from the API, each carries Grade
  const [loadingGrades, setLoadingGrades] = useState(true);
  const [expandedGrade, setExpandedGrade] = useState(null);
  const [sectionId, setSectionId] = useState(null);

  // periodsByDay["Monday"] = { time_set_id, time_set_name, periods: [{id,name,start_time,end_time,is_break}] }
  // Each day can carry a different Time Set (e.g. a shorter Saturday), so
  // periods are no longer one flat list shared across every day.
  const [periodsByDay, setPeriodsByDay] = useState({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [periodsError, setPeriodsError] = useState("");

  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState(null);
  const [instructorsBySubject, setInstructorsBySubject] = useState({});
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // entries[`${day}|${slotId}`] = [{ id, subjectId, subjectName, instructorId, instructorName }]
  const [entries, setEntries] = useState({});
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [dragOverKey, setDragOverKey] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const openRemoveConfirm = (e, day, slot, entry) => {
    if (isReadOnly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setConfirmTarget({ day, slot, entry, x: rect.left, y: rect.bottom + 6 });
  };
  const closeRemoveConfirm = () => setConfirmTarget(null);
  const confirmRemove = async () => {
    if (!confirmTarget) return;
    await removeEntry(confirmTarget.day, confirmTarget.slot, confirmTarget.entry);
    closeRemoveConfirm();
  };

   // Dismiss the popup on outside click or Escape.
  useEffect(() => {
    if (!confirmTarget) return;
    const onKey = (e) => { if (e.key === "Escape") closeRemoveConfirm(); };
    const onClick = () => closeRemoveConfirm();
    document.addEventListener("keydown", onKey);
    // Delay so the click that opened it doesn't immediately close it.
    const t = setTimeout(() => document.addEventListener("click", onClick), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
      clearTimeout(t);
    };
  }, [confirmTarget]);

  const activeTimeTable = timetables.find(t => t.id === timeTableId);
  const instructors = instructorsBySubject[subjectId] || [];

  // Group the flat section list into { id, grade, sections: [...] } for the
  // Class & Section rail.
  const grades = useMemo(() => {
    const byGrade = new Map();
    for (const s of sections) {
      const g = s.Grade;
      if (!g) continue;
      if (!byGrade.has(g.id)) byGrade.set(g.id, { id: g.id, grade: g.grade, sections: [] });
      byGrade.get(g.id).sections.push({ id: s.id, sectionName: s.sectionName });
    }
    return Array.from(byGrade.values());
  }, [sections]);

  const gradeIdForSection = useCallback(
    (secId) => sections.find(s => s.id === secId)?.grade_id ?? sections.find(s => s.id === secId)?.Grade?.id,
    [sections]
  );

  // ---- Load the schools list, only when the field is actually pickable ----
  useEffect(() => {
    if (!canPickSchool) return;
    setLoadingSchools(true);
    axios.get(`${API}/school/getAllSchools`)
      .then(res => setSchools(res.data.schools || []))
      .catch(() => message.error("Failed to load schools"))
      .finally(() => setLoadingSchools(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canPickSchool]);

  // ---- Load timetables for this school + academic year -------------------
  useEffect(() => {
    if (!schoolId || !academicYear) return;
    setLoadingTimetables(true);
    axios.get(`${API}/timetable/getTimeTablesForSchool/${schoolId}/${academicYear}`)
      .then(res => {
        const list = res.data.timeTables || [];
        setTimetables(list);
        if (initialTimeTableId) {
          setTimeTableId(initialTimeTableId);
        } else if (!timeTableId && list.length > 0) {
          setTimeTableId(list[0].id);
        }
      })
      .catch(() => message.error("Failed to load timetables for this school & year"))
      .finally(() => setLoadingTimetables(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, academicYear]);

  // ---- Load Class & Section (grouped by grade) ----------------------------
  useEffect(() => {
    if (!schoolId || !academicYear) return;
    setLoadingGrades(true);
    axios.get(`${API}/section/getSectionsBySchoolAndYear/${schoolId}/${academicYear}`)
      .then(res => {
        const list = res.data.sections || [];
        setSections(list);
        const firstGrade = list.find(s => s.Grade)?.Grade;
        if (firstGrade) {
          setExpandedGrade(String(firstGrade.id));
          const firstSection = list.find(s => s.Grade?.id === firstGrade.id);
          if (firstSection) setSectionId(firstSection.id);
        }
      })
      .catch(() => message.error("Failed to load classes & sections"))
      .finally(() => setLoadingGrades(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, academicYear]);

  // ---- Load this section's periods, per day of week ------------------------
  // Pulled from Week Days (day_of_week -> Time Set -> Time Slots), so each
  // day shows exactly the periods defined for it, not one shared list.
  useEffect(() => {
    if (!sectionId) { setPeriodsByDay({}); setPeriodsError(""); return; }
    setLoadingSlots(true);
    setPeriodsError("");
    axios.get(`${API}/weekday/getPeriodsForSection/${sectionId}`)
      .then(res => setPeriodsByDay(res.data.periodsByDay || {}))
      .catch(err => {
        setPeriodsByDay({});
        setPeriodsError(err?.response?.data?.error || "Failed to load this section's periods");
      })
      .finally(() => setLoadingSlots(false));
  }, [sectionId]);

  // ---- Load subjects + eligible instructors for the selected section ------
  // Reuses Teacher Allocation's getFormData: it already returns, per subject
  // attached to the section, the instructors qualified to teach it (matched
  // on Grade + Subject via InstructorSubject) — exactly the pool this editor
  // needs, without a separate endpoint.
  useEffect(() => {
    if (!sectionId) { setSubjects([]); setInstructorsBySubject({}); setSubjectId(null); return; }
    const gradeId = gradeIdForSection(sectionId);
    if (!gradeId) return;
    setLoadingSubjects(true);
    axios.get(`${API}/teacherAllocation/getFormData/${schoolId}/${gradeId}/${sectionId}/${academicYear}`)
      .then(res => {
        const subs = res.data.subjects || [];
        setSubjects(subs.map(s => ({ id: s.subject_id, name: s.subjectName, board: s.shortCode })));
        const map = {};
        subs.forEach(s => { map[s.subject_id] = (s.eligibleInstructors || []).map(i => ({ id: i.id, name: i.name })); });
        setInstructorsBySubject(map);
        setSubjectId(subs[0]?.subject_id ?? null);
      })
      .catch(() => { setSubjects([]); setInstructorsBySubject({}); setSubjectId(null); })
      .finally(() => setLoadingSubjects(false));
  }, [sectionId, schoolId, academicYear, gradeIdForSection]);

  // ---- Load existing entries for this timetable + section -----------------
  useEffect(() => {
    if (!timeTableId || !sectionId) { setEntries({}); return; }
    setLoadingEntries(true);
    axios.get(`${API}/timetable/getEntriesForSection/${timeTableId}/${sectionId}`)
      .then(res => {
        const rows = res.data.entries || [];
        const grouped = {};
        for (const e of rows) {
          const key = `${e.day_of_week}|${e.time_slot_id}`;
          if (!grouped[key]) grouped[key] = [];
        grouped[key].push({
            id: e.id,
            subjectId: e.subject_id,
            subjectName: e.Subject?.subjectName || e.Subject?.name || "Subject",
            instructorId: e.instructor_id,
            instructorName: e.Instructor?.name || "Instructor",
            groupId: e.group_id || null,
          });
        }
        setEntries(grouped);
      })
      .catch(() => message.error("Failed to load assignments for this section"))
      .finally(() => setLoadingEntries(false));
  }, [timeTableId, sectionId]);

  // ---- Drag and drop -------------------------------------------------------

  const handleDragStart = (e, instructor) => {
    if (isReadOnly || !activeTimeTable) return;
    e.dataTransfer.setData("application/json", JSON.stringify({
      subjectId, subjectName: subjects.find(s => s.id === subjectId)?.name,
      instructorId: instructor.id, instructorName: instructor.name,
    }));
    e.dataTransfer.effectAllowed = "copy";
  };

  const cellKey = (day, slotId) => `${day}|${slotId}`;

  // ---- Combined classes -----------------------------------------------
  // { day, slot, payload, conflict } | null — shown when the server says
  // this teacher is already booked elsewhere in this period, but combining
  // is possible (same subject, different section).
  const [combineOffer, setCombineOffer] = useState(null);

  const closeCombineOffer = () => setCombineOffer(null);

  useEffect(() => {
    if (!combineOffer) return;
    const onKey = (e) => { if (e.key === "Escape") closeCombineOffer(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [combineOffer]);

  const postEntry = (day, slot, payload, combineWith) => {
    const body = {
      time_table_id: timeTableId,
      section_id: sectionId,
      day_of_week: day,
      time_slot_id: slot.id,
      subject_id: payload.subjectId,
      instructor_id: payload.instructorId,
    };
    if (combineWith) {
      body.combine = true;
      body.combine_with_group_id = combineWith.group_id || null;
      body.combine_with_entry_id = combineWith.entryId;
    }
    return axios.post(`${API}/timetable/addTimeTableEntry`, body);
  };

  const confirmCombine = async () => {
    if (!combineOffer) return;
    const { day, slot, payload, conflict } = combineOffer;
    const key = cellKey(day, slot.id);
    try {
      const { data } = await postEntry(day, slot, payload, conflict);
      const newEntry = { id: data.entry.id, ...payload, groupId: data.entry.group_id || null };
      setEntries(prev => ({ ...prev, [key]: [...(prev[key] || []), newEntry] }));
      message.success(`Combined with ${conflict.sectionName || "the other class"}`);
    } catch (err) {
      message.error(err?.response?.data?.error || "Failed to combine classes");
    } finally {
      closeCombineOffer();
    }
  };

  const handleDrop = async (e, day, slot) => {
    e.preventDefault();
    setDragOverKey(null);
    if (isReadOnly) return;
    if (!activeTimeTable) { message.error("Select a Timetable first"); return; }
    if (slot.is_break) { message.error("Can't assign an instructor to a break"); return; }

    let payload;
    try { payload = JSON.parse(e.dataTransfer.getData("application/json")); }
    catch { return; }
    if (!payload?.instructorId) return;

    const key = cellKey(day, slot.id);
    const existing = entries[key] || [];

    if (existing.length >= MAX_ENTRIES_PER_CELL) {
      message.warning(`This period already has the maximum of ${MAX_ENTRIES_PER_CELL} entries`);
      return;
    }
    if (existing.some(en => en.instructorId === payload.instructorId && en.subjectId === payload.subjectId)) {
      message.warning(`${payload.instructorName} is already assigned to ${payload.subjectName} in this period`);
      return;
    }
    if (existing.some(en => en.instructorId === payload.instructorId && en.subjectId !== payload.subjectId)) {
      message.warning(`${payload.instructorName} is already assigned to a different subject in this period — a teacher can't be in two places at once.`);
      return;
    }

    try {
      const { data } = await postEntry(day, slot, payload);
      const newEntry = { id: data.entry.id, ...payload, groupId: data.entry.group_id || null };
      setEntries(prev => ({ ...prev, [key]: [...existing, newEntry] }));
    } catch (err) {
      if (err?.response?.status === 409 && err.response.data?.conflict) {
        const conflict = err.response.data.conflict;
        if (err.response.data.canCombine) {
          setCombineOffer({ day, slot, payload, conflict });
        } else {
          message.error(
            `${payload.instructorName} is already teaching ${conflict.sectionName ? `Grade section ${conflict.sectionName}` : "another class"} — different subject, can't combine.`
          );
        }
        return;
      }
      message.error(err?.response?.data?.error || "Failed to save this assignment");
    }
  };

  const removeEntry = async (day, slot, entry) => {
    if (isReadOnly) return;
    const key = cellKey(day, slot.id);
    try {
      await axios.delete(`${API}/timetable/deleteTimeTableEntry/${entry.id}`);
      setEntries(prev => ({ ...prev, [key]: (prev[key] || []).filter(en => en.id !== entry.id) }));
    } catch {
      message.error("Failed to remove this assignment");
    }
  };

  // ---- New Timetable (start/end date) -------------------------------------

  const saveNewTimeTable = async () => {
    if (!newRange.start || !newRange.end) {
      message.error("Start Date and End Date are required");
      return;
    }
    if (newRange.end.isBefore(newRange.start)) {
      message.error("End Date must be after Start Date");
      return;
    }
    const payload = {
      school_id: schoolId,
      academic_year: academicYear,
      start_date: newRange.start.format("YYYY-MM-DD"),
      end_date: newRange.end.format("YYYY-MM-DD"),
    };
    try {
      const { data } = await axios.post(`${API}/timetable/createTimeTable`, payload);
      const created = data.timeTable;
      setTimetables(prev => [...prev, created]);
      setTimeTableId(created.id);
      setAddingTimeTable(false);
      setNewRange({ start: null, end: null });
      message.success("Timetable created — it's active for the dates you set");
    } catch (err) {
      message.error(err?.response?.data?.error || "Failed to create timetable");
    }
  };

  const inputStyle = { width: "100%", padding: "6px 10px", borderRadius: 6, border: `1px solid ${COLOR.border}`, fontSize: FS, fontFamily: FF };
  const labelStyle = { fontSize: FS, color: COLOR.textMid, fontWeight: 600, display: "block", marginBottom: 6 };

  return (
    <Modal
      open
      onCancel={onClose}
      footer={null}
      width={1180}
      closable={false}
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ fontFamily: FF }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${COLOR.border}` }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: COLOR.blueLt }}>
            {isReadOnly ? "TimeTable — View" : isLocked ? "TimeTable — Edit" : "TimeTable Entries"}
          </div>
          <CloseOutlined onClick={onClose} style={{ cursor: "pointer", color: COLOR.textSoft }} />
        </div>

        {/* Filters */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, padding: "18px 24px", borderBottom: `1px solid ${COLOR.border}` }}>
          <div style={{ width: 220 }}>
            <label style={labelStyle}>Academic Year <span style={{ color: COLOR.danger }}>*</span></label>
            {canPickYear ? (
              <Select
                style={{ width: "100%" }}
                value={academicYear || undefined}
                placeholder="Select Academic Year"
                onChange={setAcademicYear}
              >
                {academicYearOptions.map(y => <Option key={y} value={y}>{y}</Option>)}
              </Select>
            ) : (
              <input style={{ ...inputStyle, background: COLOR.disabledBg, color: COLOR.textMid }} value={academicYear} disabled />
            )}
          </div>
          <div style={{ width: 260 }}>
            <label style={labelStyle}>School <span style={{ color: COLOR.danger }}>*</span></label>
            {canPickSchool ? (
              <Select
                style={{ width: "100%" }}
                showSearch
                optionFilterProp="children"
                value={schoolId || undefined}
                placeholder={loadingSchools ? "Loading…" : "Select School"}
                loading={loadingSchools}
                onChange={(val, option) => { setSchoolId(val); setSchoolName(option?.children || ""); }}
              >
                {schools.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
              </Select>
            ) : (
              <input style={{ ...inputStyle, background: COLOR.disabledBg, color: COLOR.textMid }} value={schoolName} disabled />
            )}
          </div>
          <div style={{ width: 340 }}>
            <label style={labelStyle}>TimeTable <span style={{ color: COLOR.danger }}>*</span></label>
            {!schoolId || !academicYear ? (
              <div style={{ fontSize: 12, color: COLOR.textSoft, padding: "6px 0" }}>Select School and Academic Year first</div>
            ) : isLocked ? (
              // Editing/viewing one specific timetable — the picker stays put.
              loadingTimetables ? (
                <div style={{ fontSize: 12, color: COLOR.textSoft }}>Loading…</div>
              ) : activeTimeTable ? (
                <div style={{ fontSize: 12.5, color: COLOR.text, padding: "6px 0" }}>
                  {moment(activeTimeTable.start_date).format("DD MMM YYYY")} – {moment(activeTimeTable.end_date).format("DD MMM YYYY")}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: COLOR.danger }}>Timetable not found</div>
              )
            ) : !addingTimeTable ? (
              <div style={{ display: "flex", gap: 8 }}>
                <Select
                  style={{ flex: 1 }}
                  value={timeTableId || undefined}
                  placeholder={loadingTimetables ? "Loading…" : "Select TimeTable"}
                  loading={loadingTimetables}
                  onChange={setTimeTableId}
                >
                  {timetables.map(t => (
                    <Option key={t.id} value={t.id}>
                      {moment(t.start_date).format("DD/MM/YYYY")} to {moment(t.end_date).format("DD/MM/YYYY")}
                    </Option>
                  ))}
                </Select>
                <Button icon={<PlusOutlined />} onClick={() => setAddingTimeTable(true)} title="New Timetable" />
              </div>
            ) : (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <DatePicker
                  size="small" placeholder="Start Date"
                  value={newRange.start}
                  onChange={val => setNewRange(r => ({ ...r, start: val }))}
                />
                <DatePicker
                  size="small" placeholder="End Date"
                  value={newRange.end}
                  onChange={val => setNewRange(r => ({ ...r, end: val }))}
                  disabledDate={cur => newRange.start && cur && cur.isBefore(newRange.start, "day")}
                />
                <Button size="small" type="primary" onClick={saveNewTimeTable}>Save</Button>
                <Button size="small" onClick={() => { setAddingTimeTable(false); setNewRange({ start: null, end: null }); }}>Cancel</Button>
              </div>
            )}
            {activeTimeTable && !addingTimeTable && !isLocked && (
              <div style={{ fontSize: 11.5, color: COLOR.textSoft, marginTop: 4 }}>
                Active {moment(activeTimeTable.start_date).format("DD MMM YYYY")} – {moment(activeTimeTable.end_date).format("DD MMM YYYY")}
              </div>
            )}
          </div>
        </div>

        {/* Body: Class&Section | Grid | Subjects/Instructors */}
        {!schoolId || !academicYear ? (
          <div style={{ height: 560, display: "flex", alignItems: "center", justifyContent: "center", color: COLOR.textSoft, fontSize: FS }}>
            Select a School and Academic Year above to continue.
          </div>
        ) : (
        <div style={{ display: "flex", height: 560 }}>
          {/* Class & Section */}
          <div style={{ width: 210, borderRight: `1px solid ${COLOR.border}`, overflowY: "auto", padding: "14px 0" }}>
            <div style={{ padding: "0 16px", fontSize: 12.5, fontWeight: 700, color: COLOR.textMid, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 }}>
              Class &amp; Section
            </div>
            {loadingGrades ? (
              <div style={{ textAlign: "center", padding: 24 }}><Spin size="small" /></div>
            ) : grades.length === 0 ? (
              <div style={{ padding: "0 16px", fontSize: 12, color: COLOR.textSoft }}>No sections found for this school & year.</div>
            ) : (
              <Collapse
                activeKey={expandedGrade}
                onChange={(k) => setExpandedGrade(Array.isArray(k) ? k[k.length - 1] : k)}
                accordion
                ghost
                bordered={false}
              >
                {grades.map(g => (
                  <Panel header={g.grade} key={String(g.id)}>
                    {g.sections.map(s => (
                      <div
                        key={s.id}
                        onClick={() => setSectionId(s.id)}
                        style={{
                          padding: "8px 14px", margin: "2px 8px", borderRadius: 6, cursor: "pointer", fontSize: FS,
                          background: sectionId === s.id ? COLOR.blue : "transparent",
                          color: sectionId === s.id ? "#fff" : COLOR.text,
                          fontWeight: sectionId === s.id ? 600 : 400,
                        }}
                      >
                        {s.sectionName}
                      </div>
                    ))}
                  </Panel>
                ))}
              </Collapse>
            )}
          </div>

          {/* Grid — one card per day, each showing ONLY the periods Week Days
              actually assigned to that day for this section (via its Time
              Set). Days can carry different Time Sets (e.g. a shorter
              Saturday), so each day's row of periods can differ in count,
              timing, and names — this is what "the timetable should show
              with the timing I defined, per section" means in practice. */}
          <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
            {!sectionId ? (
              <div style={{ textAlign: "center", color: COLOR.textSoft, padding: 60 }}>Select a class and section.</div>
            ) : loadingSlots || loadingEntries ? (
              <div style={{ textAlign: "center", color: COLOR.textSoft, padding: 60 }}>Loading periods...</div>
            ) : periodsError ? (
              <div style={{ textAlign: "center", color: COLOR.danger, padding: 60, fontSize: FS }}>{periodsError}</div>
            ) : Object.keys(periodsByDay).length === 0 ? (
              <div style={{ textAlign: "center", color: COLOR.textSoft, padding: 60 }}>
                No Week Days schedule configured for this section. Set up Week Days (with a Time Set per day) first.
              </div>
            ) : (
              DAYS.filter(day => periodsByDay[day]).map(day => {
                const dayInfo = periodsByDay[day];
                const periods = dayInfo.periods || [];
                return (
                  <div key={day} style={{ marginBottom: 16, border: `1px solid ${COLOR.border}`, borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 14px", background: COLOR.headerBg, borderBottom: `1px solid ${COLOR.border}` }}>
                      <span style={{ fontWeight: 700, color: COLOR.blue, fontSize: FS }}>{day}</span>
                      <span style={{ fontSize: 11.5, color: COLOR.textSoft }}>{dayInfo.time_set_name}</span>
                    </div>
                    <div style={{ display: "flex", gap: 10, padding: 12, overflowX: "auto" }}>
                      {periods.length === 0 ? (
                        <div style={{ color: COLOR.textSoft, fontSize: 12, padding: "10px 4px" }}>No periods in this Time Set.</div>
                      ) : periods.map(slot => {
                        const key = cellKey(day, slot.id);
                        const cellEntries = entries[key] || [];
                        const isOver = dragOverKey === key;
                        return (
                          <div
                            key={slot.id}
                            onDragOver={(e) => { if (isReadOnly || slot.is_break) return; e.preventDefault(); setDragOverKey(key); }}
                            onDragLeave={() => setDragOverKey(prev => (prev === key ? null : prev))}
                            onDrop={(e) => handleDrop(e, day, slot)}
                            style={{
                              minWidth: 150, width: 150, flexShrink: 0, borderRadius: 8,
                              border: `1px solid ${isOver ? COLOR.blueLt : COLOR.border}`,
                              outline: isOver ? `2px dashed ${COLOR.blueLt}` : "none", outlineOffset: -2,
                              overflow: "hidden",
                            }}
                          >
                            <div style={{ padding: "6px 8px", background: slot.is_break ? "#fef3c7" : COLOR.headerBg, borderBottom: `1px solid ${COLOR.border}` }}>
                              <div style={{ fontWeight: 600, fontSize: 12, color: COLOR.textMid, whiteSpace: "nowrap" }}>
                                {fmtTime(slot.start_time)} - {fmtTime(slot.end_time)}
                              </div>
                              <div style={{ fontWeight: 400, fontSize: 11, color: COLOR.textSoft }}>{slot.name}</div>
                            </div>
                            <div style={{ padding: 6, minHeight: 70, background: slot.is_break ? "#fffbeb" : isOver ? "#e0f2fe" : "#f8fbff" }}>
                              {slot.is_break ? (
                                <div style={{ color: "#b45309", fontSize: 11.5, textAlign: "center", padding: "10px 0" }}>Break</div>
                              ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                {cellEntries.map(en => {
                                    const c = colorForSubject(en.subjectId);
                                    return (
                                       <div
                                        key={en.id}
                                        title={isReadOnly ? undefined : "Click to remove"}
                                        onClick={(e) => { e.stopPropagation(); openRemoveConfirm(e, day, slot, en); }}
                                        style={{
                                          background: c.bg, border: `1px solid ${c.border}`, color: c.text,
                                          borderRadius: 5, padding: "3px 7px", fontSize: 11.5, cursor: isReadOnly ? "default" : "pointer",
                                        }}
                                      >
                                        <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                                          {en.subjectName}
                                          {en.groupId && (
                                            <span title="Combined class" style={{ fontSize: 9, fontWeight: 700, background: "#fff", border: `1px solid ${c.border}`, borderRadius: 4, padding: "0 4px" }}>⇄</span>
                                          )}
                                        </div>
                                        <div>{en.instructorName}</div>
                                      </div>
                                    );
                                  })}
                                  {cellEntries.length === 0 && (
                                    <div style={{ color: "#c7d2e0", fontSize: 11, textAlign: "center", padding: "10px 0" }}>
                                      {isReadOnly ? "—" : "Drop here"}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Subjects + Instructors */}
          {!isReadOnly && (
            <div style={{ width: 230, borderLeft: `1px solid ${COLOR.border}`, padding: 14, overflowY: "auto" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: COLOR.textMid, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 }}>
                Subjects
              </div>
              {loadingSubjects ? (
                <div style={{ textAlign: "center", padding: 12 }}><Spin size="small" /></div>
              ) : subjects.length === 0 ? (
                <div style={{ fontSize: 12, color: COLOR.textSoft }}>
                  No subjects attached to this section yet. Attach subjects from the Study Plan screen first.
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 11.5, color: COLOR.textSoft, marginBottom: 6 }}>Select Subject</div>
                  <Radio.Group
                    value={subjectId}
                    onChange={e => setSubjectId(e.target.value)}
                    style={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}
                  >
                    {subjects.map(s => (
                      <Radio key={s.id} value={s.id} style={{ padding: "6px 4px" }}>
                        <div style={{ fontSize: FS, color: COLOR.text }}>{s.name} {s.board && <span style={{ color: COLOR.textSoft, fontSize: 11 }}>- {s.board}</span>}</div>
                      </Radio>
                    ))}
                  </Radio.Group>
                </>
              )}

              <div style={{ fontSize: 12.5, fontWeight: 700, color: COLOR.textMid, margin: "18px 0 8px", textTransform: "uppercase", letterSpacing: 0.4 }}>
                Instructor
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {instructors.length === 0 && (
                  <div style={{ fontSize: 12, color: COLOR.textSoft }}>No eligible instructors for this subject.</div>
                )}
                {instructors.map(ins => (
                  <div
                    key={ins.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, ins)}
                    title="Drag onto a period"
                    style={{
                      border: `1px solid ${COLOR.blueLt}55`, borderRadius: 6, padding: "7px 10px",
                      cursor: "grab", background: "#eff6ff",
                    }}
                  >
                    <div style={{ fontSize: FS, color: COLOR.blue, fontWeight: 600 }}>{ins.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        )}

         {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 24px", borderTop: `1px solid ${COLOR.border}` }}>
          <Button onClick={onClose}>Close</Button>
        </div>

        {confirmTarget && ReactDOM.createPortal(
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed", top: confirmTarget.y, left: confirmTarget.x, zIndex: 2000,
              background: "#fff", border: `1px solid ${COLOR.border}`, borderRadius: 8,
              boxShadow: "0 6px 20px rgba(0,0,0,0.18)", padding: 12, minWidth: 190,
              fontFamily: FF,
            }}
          >
            <div style={{ fontSize: 13, color: COLOR.text, marginBottom: 10 }}>
              Remove {confirmTarget.entry.instructorName} from {confirmTarget.entry.subjectName}?
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={closeRemoveConfirm}
                style={{ all: "unset", cursor: "pointer", padding: "5px 12px", borderRadius: 6, fontSize: 12.5, color: COLOR.textMid, border: `1px solid ${COLOR.border}` }}
              >
                Cancel
              </button>
              <button
                onClick={confirmRemove}
                style={{ all: "unset", cursor: "pointer", padding: "5px 12px", borderRadius: 6, fontSize: 12.5, color: "#fff", background: COLOR.danger }}
              >
                Remove
              </button>
            </div>
          </div>,
          document.body
        )}

        {combineOffer && ReactDOM.createPortal(
          <div
            onClick={closeCombineOffer}
            style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 20, width: 340, fontFamily: FF, boxShadow: "0 12px 32px rgba(0,0,0,0.25)" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: COLOR.text, marginBottom: 8 }}>Combine this class?</div>
              <div style={{ fontSize: 13, color: COLOR.textMid, lineHeight: 1.5, marginBottom: 16 }}>
                <b>{combineOffer.payload.instructorName}</b> is already teaching <b>{combineOffer.payload.subjectName}</b>
                {combineOffer.conflict.sectionName ? <> to <b>{combineOffer.conflict.sectionName}</b></> : null} in this period.
                <br /><br />
                Combine this section into that same class instead of blocking it?
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button onClick={closeCombineOffer} style={{ all: "unset", cursor: "pointer", padding: "7px 16px", borderRadius: 6, fontSize: 13, color: COLOR.textMid, border: `1px solid ${COLOR.border}` }}>Cancel</button>
                <button onClick={confirmCombine} style={{ all: "unset", cursor: "pointer", padding: "7px 16px", borderRadius: 6, fontSize: 13, color: "#fff", background: COLOR.blueLt, fontWeight: 600 }}>Combine Classes</button>
              </div>
            </div>
          </div>,
          document.body

          
        )}
      </div>
    </Modal>
  );
};

export default TimeTableEntries;