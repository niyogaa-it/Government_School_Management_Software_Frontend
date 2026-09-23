import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { message, Select, Spin, Tooltip } from "antd";
import { useFilter } from "./FilterContext";
import {
  PlusOutlined, CalendarOutlined, AppstoreOutlined,
  EditOutlined, DeleteOutlined, PaperClipOutlined,
  LeftOutlined, RightOutlined, CloseOutlined, SaveOutlined,
} from "@ant-design/icons";
import Layout from "./Layout";

const { Option } = Select;

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  blue: "#1e40af",
  blueLt: "#3b82f6",
  text: "#1e293b",
  textMid: "#475569",
  textSoft: "#64748b",
  border: "#e2e8f0",
  headBg: "#1a2236",
  rowOdd: "#ffffff",
  rowEven: "#f8fafc",
  rowHover: "#eff6ff",
};
const FF = "'Segoe UI', system-ui, sans-serif";

// ── Constants ──────────────────────────────────────────────────────────────────
const ACADEMIC_YEARS = ["2022-2023", "2023-2024", "2024-2025", "2025-2026", "2026-2027"];
const MN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MN_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const EVENT_COLORS = [
  { bg: "#dbeafe", text: "#1e40af", dot: "#3b82f6" },
  { bg: "#dcfce7", text: "#166534", dot: "#16a34a" },
  { bg: "#fef9c3", text: "#854d0e", dot: "#ca8a04" },
  { bg: "#fce7f3", text: "#9d174d", dot: "#db2777" },
  { bg: "#ede9fe", text: "#5b21b6", dot: "#7c3aed" },
  { bg: "#ffedd5", text: "#9a3412", dot: "#ea580c" },
];
const getColor = (idx) => EVENT_COLORS[idx % EVENT_COLORS.length];

// ── Helpers ────────────────────────────────────────────────────────────────────
const getCurrentAcademicYear = () => {
  const now = new Date(); const m = now.getMonth() + 1; const y = now.getFullYear();
  return m >= 6 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
};
const toYMD = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const toDisplay = (ymd) => {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
};
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const firstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

// ── Shared styles ──────────────────────────────────────────────────────────────
const FF_l = "'Segoe UI', system-ui, sans-serif";
const labelStyle = {
  display: "block", fontSize: 12.5, fontWeight: 600,
  color: "#374151", marginBottom: 5, fontFamily: FF_l,
};
const inputStyle = {
  width: "100%", padding: "5px 10px", background: "#fff",
  border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13.5,
  color: "#1e293b", boxSizing: "border-box", height: 34,
  fontFamily: FF_l, outline: "none",
};
const Req = () => <span style={{ color: "#dc2626" }}>*</span>;

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const EventCalendar = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "") || "";
  const schoolId = user?.school?.id;
  const schoolName = user?.school?.name || "";
  const isSuperAdmin = role === "superadmin";
  const isAdmin = isSuperAdmin || role === "schooladmin";
  const todayYMD = toYMD(new Date());

  // ── Pull school + year from dashboard FilterContext ───────────────────────────
  const { selectedSchool: ctxSchool, selectedSchoolName: ctxSchoolName, selectedYear: ctxYear } = useFilter();

  // ── View ──────────────────────────────────────────────────────────────────────
  const [activeView, setActiveView] = useState("calendar");

  // ── Filter bar state ──────────────────────────────────────────────────────────
  const [schools, setSchools] = useState([]);
  const [selSchoolId, setSelSchoolId] = useState(() => {
    if (!isSuperAdmin) return schoolId || "";
    return (ctxSchool && ctxSchool !== "all") ? ctxSchool : "";
  });
  const [academicYear, setAcademicYear] = useState(ctxYear || getCurrentAcademicYear());
  const [grades, setGrades] = useState([]);
  const [selGradeIds, setSelGradeIds] = useState([]);

  // ── Calendar navigation ───────────────────────────────────────────────────────
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());

  // ── Events data ───────────────────────────────────────────────────────────────
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  // ── Modal / popup state ───────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [dayEventsModal, setDayEventsModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // ── Form state ────────────────────────────────────────────────────────────────
  const getEmptyForm = () => ({
    title: "", description: "", eventDate: todayYMD,
    academicYear: academicYear,
    school_id: isSuperAdmin ? (selSchoolId || "") : (schoolId || ""),
    grade_ids: [],
    attachment: null, attachmentName: "",
  });
  const [form, setForm] = useState(() => getEmptyForm());
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formGrades, setFormGrades] = useState([]);

  // ── Sync from FilterContext when dashboard filter changes ────────────────────
  useEffect(() => {
    if (isSuperAdmin && ctxSchool && ctxSchool !== "all") {
      setSelSchoolId(ctxSchool);
    }
  }, [ctxSchool, isSuperAdmin]);

  useEffect(() => {
    if (ctxYear) setAcademicYear(ctxYear);
  }, [ctxYear]);

  // ── Fetch schools ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSuperAdmin) return;
    axios.get(`${process.env.REACT_APP_API_URL}/school/getAllSchools`)
      .then(r => setSchools(r.data.schools || []))
      .catch(() => message.error("Failed to fetch schools"));
  }, [isSuperAdmin]);

  // ── Fetch grades for filter bar ───────────────────────────────────────────────
  useEffect(() => {
    if (!selSchoolId || !academicYear) { setGrades([]); setSelGradeIds([]); return; }
    axios.get(`${process.env.REACT_APP_API_URL}/grade/getGradesBySchoolAndYear/${selSchoolId}/${academicYear}`)
      .then(r => setGrades(r.data.grades || [])).catch(() => setGrades([]));
    setSelGradeIds([]);
  }, [selSchoolId, academicYear]);

  // ── Fetch grades for form — returns Promise<grades[]> so callers can await it ─
  const fetchFormGrades = useCallback((sid, yr) => {
    const resolvedSid = sid || (!isSuperAdmin ? schoolId : null);
    if (!resolvedSid || !yr) { setFormGrades([]); return Promise.resolve([]); }
    return axios
      .get(`${process.env.REACT_APP_API_URL}/grade/getGradesBySchoolAndYear/${resolvedSid}/${yr}`)
      .then(r => {
        const list = r.data.grades || [];
        setFormGrades(list);
        return list;
      })
      .catch(() => { setFormGrades([]); return []; });
  }, [isSuperAdmin, schoolId]);

  // Re-fetch whenever school or year changes inside the form
  useEffect(() => {
    fetchFormGrades(form.school_id, form.academicYear);
  }, [form.school_id, form.academicYear, fetchFormGrades]);

  // ── Fetch events ──────────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    if (!selSchoolId) { setEvents([]); return; }
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/event/getEvents`, {
        params: {
          school_id: selSchoolId,
          academicYear,
          grade_ids: selGradeIds.length ? selGradeIds.join(",") : undefined,
          month: calMonth + 1,
          year: calYear,
        },
      });
      setEvents(res.data.events || []);
    } catch {
      message.error("Failed to load events.");
    } finally {
      setLoading(false);
    }
  }, [selSchoolId, academicYear, selGradeIds, calMonth, calYear]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // ── Group events by date ──────────────────────────────────────────────────────
  const eventsByDate = {};
  events.forEach((ev, idx) => {
    const d = (ev.eventDate || "").split("T")[0];
    if (!eventsByDate[d]) eventsByDate[d] = [];
    eventsByDate[d].push({ ...ev, _colorIdx: idx });
  });

  // ── Calendar grid ─────────────────────────────────────────────────────────────
  const buildGrid = () => {
    const total = daysInMonth(calYear, calMonth);
    const first = firstDayOfMonth(calYear, calMonth);
    const cells = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  };
  const grid = buildGrid();

  // ── Navigation ────────────────────────────────────────────────────────────────
  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); };
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); };

  // ── Open Create Modal ─────────────────────────────────────────────────────────
  // FIX 1: Pre-populate grade_ids from the filter bar's selGradeIds so that
  //         whatever class is already selected in the filter shows up in the form.
  const openCreate = (dateStr) => {
    if (!isAdmin) return;

    if (isSuperAdmin && !selSchoolId) {
      message.warning("Please select a school first");
      return;
    }

    const defaultSchool = isSuperAdmin ? selSchoolId : schoolId;

    // Convert raw selGradeIds (string ids) → labelInValue objects using the
    // already-loaded filter-bar grades list so labels resolve immediately.
    const preselectedGrades = selGradeIds.map(id => {
      const found = grades.find(g => String(g.id) === String(id));
      return { value: String(id), label: found ? found.grade : String(id) };
    });

    setEditingEvent(null);
    setForm({
      ...getEmptyForm(),
      eventDate: dateStr || todayYMD,
      school_id: defaultSchool,
      academicYear,
      grade_ids: preselectedGrades,
    });

    // Fetch grades so the Class dropdown is ready when modal opens
    fetchFormGrades(defaultSchool, academicYear);

    setModalOpen(true);
  };

  // ── Open Edit Modal ───────────────────────────────────────────────────────────
  const openEdit = async (ev) => {
    if (!isAdmin) return;

    const sid = ev.school_id || selSchoolId;
    const yr = ev.academicYear || academicYear;

    // Await grades fetch so formGrades is populated BEFORE modal opens
    const loadedGrades = await fetchFormGrades(sid, yr);

    // Raw saved ids
    const rawIds = Array.isArray(ev.grade_ids)
      ? ev.grade_ids.map(String)
      : ev.grade_id ? [String(ev.grade_id)] : [];

    // Build labelInValue objects using the freshly loaded grades list
    const gids = rawIds.map(id => {
      const found = loadedGrades.find(g => String(g.id) === id);
      return { value: id, label: found ? found.grade : id };
    });

    setEditingEvent(ev);
    setForm({
      title: ev.title || "",
      description: ev.description || "",
      eventDate: (ev.eventDate || "").split("T")[0] || todayYMD,
      academicYear: yr,
      school_id: sid,
      grade_ids: gids,
      attachment: null,
      attachmentName: ev.attachmentName || ev.attachment || "",
    });
    setFormErrors({});
    setModalOpen(true);
  };

  // ── Validate ──────────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (!form.eventDate) errs.eventDate = "Event date is required";
    if (!form.academicYear) errs.academicYear = "Academic year is required";
    if (isSuperAdmin && !form.school_id) errs.school_id = "School is required";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Save ──────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title.trim());
      fd.append("description", form.description.trim());
      fd.append("eventDate", form.eventDate);
      fd.append("academicYear", form.academicYear);
      fd.append("school_id", form.school_id || selSchoolId);
      // grade_ids may be labelInValue objects { value, label } — extract raw ids for backend
      const gradeIdValues = form.grade_ids.map(g => typeof g === "object" ? g.value : g);
      fd.append("grade_ids", JSON.stringify(gradeIdValues));
      if (form.attachment) fd.append("attachment", form.attachment);
      // If editing and the user cleared the attachment, tell the backend
      if (editingEvent && !form.attachment && !form.attachmentName) {
        fd.append("clearAttachment", "true");
      }

      if (editingEvent) {
        await axios.put(
          `${process.env.REACT_APP_API_URL}/event/updateEvent/${editingEvent.id}`, fd,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        message.success("Event updated successfully!");
      } else {
        await axios.post(
          `${process.env.REACT_APP_API_URL}/event/createEvent`, fd,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        message.success("Event created successfully!");
      }
      setModalOpen(false);
      fetchEvents();
    } catch (err) {
      message.error(err.response?.data?.error || "Failed to save event.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────────
  const handleDelete = async (ev) => {
    setDeleting(true);
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/event/deleteEvent/${ev.id}`);
      message.success("Event deleted.");
      setDeleteConfirm(null);
      setDayEventsModal(null);
      fetchEvents();
    } catch {
      message.error("Failed to delete event.");
    } finally {
      setDeleting(false);
    }
  };

  // ── Grade label helper for display ────────────────────────────────────────────
  const gradeLabel = (ev) => {
    if (ev.grade_names && ev.grade_names.length > 0) {
      return ev.grade_names.join(", ");
    }
    if (!ev.grade_ids || ev.grade_ids.length === 0) {
      return grades.length > 0
        ? grades.map(g => g.grade).join(", ")
        : "All Classes";
    }
    const ids = ev.grade_ids.map(String);
    const resolved = ids.map(id => {
      const found = grades.find(g => String(g.id) === id);
      return found ? found.grade : `Grade ${id}`;
    });
    return resolved.length > 0 ? resolved.join(", ") : "All Classes";
  };

  // =============================================================================
  // RENDER
  // =============================================================================
  return (
    <Layout>
      <div className="app-page" style={{ fontFamily: FF }}>

        {/* ── Title + View Toggle ───────────────────────────────────────────── */}
        <div style={{ marginBottom: 22, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0, letterSpacing: "-0.3px" }}>Event Calendar</h1>
            <div style={{ width: 40, height: 3, background: C.blueLt, borderRadius: 2, marginTop: 6 }} />
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 10, padding: 4, gap: 4 }}>
              {[{ key: "calendar", icon: <CalendarOutlined />, label: "Calendar" }, { key: "list", icon: <AppstoreOutlined />, label: "List View" }]
                .map(({ key, icon, label }) => {
                  const active = activeView === key;
                  return (
                    <button key={key} onClick={() => setActiveView(key)} style={{
                      all: "unset", display: "flex", alignItems: "center", gap: 6,
                      padding: "7px 16px", borderRadius: 7, fontSize: 13, fontWeight: 600,
                      cursor: "pointer", transition: "all 0.18s", fontFamily: FF,
                      background: active ? C.blue : "transparent",
                      color: active ? "#fff" : C.textMid,
                      boxShadow: active ? `0 2px 8px ${C.blue}44` : "none",
                    }}>{icon}&nbsp;{label}</button>
                  );
                })}
            </div>
            {isAdmin && (
              <button onClick={() => openCreate(todayYMD)} style={{
                all: "unset", display: "flex", alignItems: "center", gap: 6,
                padding: "8px 18px", borderRadius: 8, fontFamily: FF,
                background: C.blue, color: "#fff", fontWeight: 700, fontSize: 13,
                cursor: "pointer", boxShadow: `0 2px 8px ${C.blue}44`,
              }}>
                <PlusOutlined /> Add Event
              </button>
            )}
          </div>
        </div>

        {/* ── Filter Bar ───────────────────────────────────────────────────── */}
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: `1px solid ${C.border}`, padding: "18px 24px", marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, alignItems: "end" }}>

            {isSuperAdmin && (
              <div>
                <label style={labelStyle}>School <Req /></label>
                <Select
                  style={{ width: "100%" }}
                  placeholder="Select School"
                  showSearch
                  labelInValue
                  value={
                    selSchoolId
                      ? {
                        value: selSchoolId,
                        label: schools.find(s => String(s.id) === String(selSchoolId))?.name
                          || ctxSchoolName
                          || String(selSchoolId),
                      }
                      : undefined
                  }
                  filterOption={(i, o) => o?.children?.toLowerCase().includes(i.toLowerCase())}
                  onChange={opt => { setSelSchoolId(opt.value); }}
                >
                  {schools.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                </Select>
              </div>
            )}

            <div>
              <label style={labelStyle}>Academic Year</label>
              <Select style={{ width: "100%" }} value={academicYear} onChange={setAcademicYear}>
                {ACADEMIC_YEARS.map(y => <Option key={y} value={y}>{y}</Option>)}
              </Select>
            </div>

            {/* Multi-select class filter */}
            <div>
              <label style={labelStyle}>Class</label>
              <Select
                mode="multiple"
                style={{ width: "100%" }}
                placeholder="All Classes"
                value={selGradeIds}
                disabled={!selSchoolId}
                allowClear
                maxTagCount="responsive"
                onChange={v => setSelGradeIds(v)}
              >
                {grades.map(g => <Option key={String(g.id)} value={String(g.id)}>{g.grade}</Option>)}
              </Select>
            </div>

          </div>
        </div>

        {/* ═══════════════ CALENDAR VIEW ═══════════════════════════════════ */}
        {activeView === "calendar" && (
          <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: `1px solid ${C.border}`, overflow: "hidden" }}>

            {/* Month nav */}
            <div style={{ background: C.headBg, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <button onClick={prevMonth} style={{ all: "unset", width: 34, height: 34, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 14 }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}><LeftOutlined /></button>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{MN[calMonth]} {calYear}</div>
                <div style={{ fontSize: 12, color: "#93c5fd", marginTop: 2 }}>
                  {events.filter(ev => {
                    const d = (ev.eventDate || "").split("T")[0];
                    return d.startsWith(`${calYear}-${String(calMonth + 1).padStart(2, "0")}`);
                  }).length} event{events.filter(ev => {
                    const d = (ev.eventDate || "").split("T")[0];
                    return d.startsWith(`${calYear}-${String(calMonth + 1).padStart(2, "0")}`);
                  }).length !== 1 ? "s" : ""} this month
                </div>
              </div>
              <button onClick={nextMonth} style={{ all: "unset", width: 34, height: 34, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 14 }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}><RightOutlined /></button>
            </div>

            {/* Day name headers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "#f1f5f9", borderBottom: `1px solid ${C.border}` }}>
              {DAY_NAMES.map(d => (
                <div key={d} style={{ padding: "10px 0", textAlign: "center", fontSize: 12, fontWeight: 700, color: d === "Sun" ? "#dc2626" : C.textMid, fontFamily: FF }}>{d}</div>
              ))}
            </div>

            {/* Grid cells */}
            <Spin spinning={loading}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                {grid.map((day, idx) => {
                  if (!day) return <div key={`e-${idx}`} style={{ minHeight: 110, background: "#fafafa", borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }} />;

                  const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isToday = dateStr === todayYMD;
                  const isSunday = new Date(dateStr).getDay() === 0;
                  const dayEvents = eventsByDate[dateStr] || [];

                  return (
                    <div key={day}
                      onClick={() => { if (dayEvents.length > 0) setDayEventsModal({ date: dateStr, events: dayEvents }); else if (isAdmin) openCreate(dateStr); }}
                      style={{
                        minHeight: 110, padding: "8px 6px", cursor: isAdmin || dayEvents.length > 0 ? "pointer" : "default", position: "relative",
                        background: isToday ? "#eff6ff" : isSunday ? "#fff5f5" : "#fff",
                        borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, transition: "background 0.12s"
                      }}
                      onMouseEnter={e => { if (!isToday) e.currentTarget.style.background = C.rowHover; }}
                      onMouseLeave={e => { e.currentTarget.style.background = isToday ? "#eff6ff" : isSunday ? "#fff5f5" : "#fff"; }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                        <span style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: isToday ? 700 : 500, background: isToday ? C.blue : "transparent", color: isToday ? "#fff" : isSunday ? "#dc2626" : C.text }}>{day}</span>
                        {isAdmin && (
                          <button onClick={e => { e.stopPropagation(); openCreate(dateStr); }}
                            style={{ all: "unset", width: 18, height: 18, borderRadius: 4, background: "#e2e8f0", color: C.textMid, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: 0.6 }}
                            onMouseEnter={e => { e.stopPropagation(); e.currentTarget.style.opacity = 1; e.currentTarget.style.background = C.blue; e.currentTarget.style.color = "#fff"; }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = 0.6; e.currentTarget.style.background = "#e2e8f0"; e.currentTarget.style.color = C.textMid; }}>+</button>
                        )}
                      </div>
                      {dayEvents.slice(0, 2).map((ev, i) => {
                        const col = getColor(ev._colorIdx);
                        return (
                          <div key={ev.id || i} title={ev.title} style={{ marginBottom: 2, padding: "2px 6px", borderRadius: 4, background: col.bg, color: col.text, fontSize: 11, fontWeight: 600, fontFamily: FF, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", borderLeft: `3px solid ${col.dot}` }}>{ev.title}</div>
                        );
                      })}
                      {dayEvents.length > 2 && <div style={{ fontSize: 10, color: C.blueLt, fontWeight: 600, marginTop: 2, paddingLeft: 2 }}>+{dayEvents.length - 2} more</div>}
                    </div>
                  );
                })}
              </div>
            </Spin>
          </div>
        )}

        {/* ═══════════════ LIST VIEW ═══════════════════════════════════════ */}
        {activeView === "list" && (
          <Spin spinning={loading}>
            {events.length === 0 && !loading ? (
              <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${C.border}`, padding: "60px 20px", textAlign: "center", color: C.textSoft, fontSize: 14 }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>📅</div>
                No events found for <strong>{MN[calMonth]} {calYear}</strong>.
                {isAdmin && (
                  <div style={{ marginTop: 12 }}>
                    <button onClick={() => openCreate(todayYMD)} style={{ all: "unset", padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", background: C.blue, color: "#fff", fontFamily: FF }}>
                      <PlusOutlined style={{ marginRight: 6 }} /> Create First Event
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button onClick={prevMonth} style={{ all: "unset", cursor: "pointer", padding: "6px 10px", borderRadius: 6, background: "#f1f5f9", color: C.textMid, fontWeight: 700 }}><LeftOutlined /></button>
                    <span style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{MN[calMonth]} {calYear}</span>
                    <button onClick={nextMonth} style={{ all: "unset", cursor: "pointer", padding: "6px 10px", borderRadius: 6, background: "#f1f5f9", color: C.textMid, fontWeight: 700 }}><RightOutlined /></button>
                  </div>
                  <span style={{ fontSize: 13, color: C.textSoft }}>{events.length} event{events.length !== 1 ? "s" : ""}</span>
                </div>

                {[...events].sort((a, b) => a.eventDate > b.eventDate ? 1 : -1).map((ev, idx) => {
                  const col = getColor(idx);
                  return (
                    <div key={ev.id} style={{ background: "#fff", borderRadius: 12, border: `1px solid ${C.border}`, padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", borderLeft: `4px solid ${col.dot}` }}>
                      <div style={{ minWidth: 52, textAlign: "center", background: col.bg, borderRadius: 8, padding: "6px 8px" }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: col.text, lineHeight: 1 }}>{(ev.eventDate || "").split("T")[0]?.split("-")[2] || "—"}</div>
                        <div style={{ fontSize: 11, color: col.text, fontWeight: 600 }}>{MN_SHORT[parseInt(((ev.eventDate || "").split("T")[0] || "").split("-")[1]) - 1] || ""}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 3 }}>{ev.title}</div>
                        {ev.description && <div style={{ fontSize: 12.5, color: C.textSoft, marginBottom: 4, lineHeight: 1.5 }}>{ev.description}</div>}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 11.5, color: C.textMid, marginTop: 4 }}>
                          {ev.academicYear && <span style={{ background: "#f1f5f9", padding: "1px 8px", borderRadius: 10, fontWeight: 600 }}>{ev.academicYear}</span>}
                          <span style={{ background: col.bg, padding: "1px 8px", borderRadius: 10, fontWeight: 600, color: col.text }}>{gradeLabel(ev)}</span>
                          {(ev.attachmentName || ev.hasAttachment) && (
                            <a href={`${process.env.REACT_APP_API_URL}/event/getAttachment/${ev.id}`} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 3, color: C.blueLt }}>
                              <PaperClipOutlined /> {ev.attachmentName || "Attachment"}
                            </a>
                          )}
                        </div>
                      </div>
                      {isAdmin && (
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <Tooltip title="Edit">
                            <button onClick={() => openEdit(ev)} style={{ all: "unset", width: 30, height: 30, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "#eff6ff", color: C.blueLt, fontSize: 13 }}><EditOutlined /></button>
                          </Tooltip>
                          {isSuperAdmin && (
                            <Tooltip title="Delete">
                              <button onClick={() => setDeleteConfirm(ev)} style={{ all: "unset", width: 30, height: 30, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "#fee2e2", color: "#dc2626", fontSize: 13 }}><DeleteOutlined /></button>
                            </Tooltip>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Spin>
        )}
      </div>

      {/* ═══════════════ DAY EVENTS POPUP ════════════════════════════════════ */}
      {dayEventsModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setDayEventsModal(null)}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
            <div style={{ background: C.headBg, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{toDisplay(dayEventsModal.date)}</div>
                <div style={{ color: "#93c5fd", fontSize: 12 }}>{dayEventsModal.events.length} event{dayEventsModal.events.length !== 1 ? "s" : ""}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {isAdmin && <button onClick={() => { setDayEventsModal(null); openCreate(dayEventsModal.date); }} style={{ all: "unset", padding: "5px 12px", borderRadius: 6, cursor: "pointer", background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 12, fontWeight: 600 }}><PlusOutlined /> Add</button>}
                <button onClick={() => setDayEventsModal(null)} style={{ all: "unset", width: 28, height: 28, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.1)", color: "#fff" }}><CloseOutlined /></button>
              </div>
            </div>
            <div style={{ padding: "14px 16px", maxHeight: 380, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
              {dayEventsModal.events.map((ev, idx) => {
                const col = getColor(ev._colorIdx ?? idx);
                return (
                  <div key={ev.id} style={{ padding: "12px 14px", borderRadius: 10, background: col.bg, borderLeft: `4px solid ${col.dot}` }}>
                    <div style={{ fontWeight: 700, color: col.text, fontSize: 13.5, marginBottom: ev.description ? 4 : 0 }}>{ev.title}</div>
                    {ev.description && <div style={{ fontSize: 12, color: C.textSoft, lineHeight: 1.5 }}>{ev.description}</div>}
                    <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {ev.academicYear && <span style={{ fontSize: 11, background: "#fff", padding: "1px 8px", borderRadius: 10, fontWeight: 600, color: C.textMid }}>{ev.academicYear}</span>}
                        <span style={{ fontSize: 11, background: "#fff", padding: "1px 8px", borderRadius: 10, fontWeight: 600, color: col.text }}>{gradeLabel(ev)}</span>
                        {(ev.attachmentName || ev.hasAttachment) && (
                          <a href={`${process.env.REACT_APP_API_URL}/event/getAttachment/${ev.id}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C.blueLt, display: "flex", alignItems: "center", gap: 3 }}><PaperClipOutlined /> {ev.attachmentName || "Attachment"}</a>
                        )}
                      </div>
                      {isAdmin && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => { setDayEventsModal(null); openEdit(ev); }} style={{ all: "unset", padding: "3px 10px", borderRadius: 5, cursor: "pointer", background: "#fff", color: C.blueLt, fontSize: 11, fontWeight: 600 }}>Edit</button>
                          {isSuperAdmin && (
                            <button onClick={() => { setDayEventsModal(null); setDeleteConfirm(ev); }} style={{ all: "unset", padding: "3px 10px", borderRadius: 5, cursor: "pointer", background: "#fff", color: "#dc2626", fontSize: 11, fontWeight: 600 }}>Delete</button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ CREATE / EDIT MODAL ════════════════════════════════ */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => !saving && setModalOpen(false)}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 560, boxShadow: "0 24px 64px rgba(0,0,0,0.22)", overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ background: C.headBg, padding: "16px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>{editingEvent ? "Edit Event" : "Create New Event"}</div>
                <div style={{ color: "#93c5fd", fontSize: 12, marginTop: 2 }}>{editingEvent ? `Editing: ${editingEvent.title}` : "Fill in the details below"}</div>
              </div>
              <button onClick={() => !saving && setModalOpen(false)} style={{ all: "unset", width: 30, height: 30, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 14 }}><CloseOutlined /></button>
            </div>

            {/* Body */}
            <div style={{ padding: "22px 24px", overflowY: "auto", flex: 1 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

                {/* School — superadmin only */}
                {isSuperAdmin && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>School <Req /></label>
                    <Select
                      style={{ width: "100%" }}
                      placeholder="Select School"
                      showSearch
                      labelInValue
                      value={
                        form.school_id
                          ? {
                            value: form.school_id,
                            label: schools.find(s => String(s.id) === String(form.school_id))?.name
                              || ctxSchoolName
                              || String(form.school_id),
                          }
                          : undefined
                      }
                      filterOption={(i, o) => o?.children?.toLowerCase().includes(i.toLowerCase())}
                      onChange={opt => setForm(f => ({ ...f, school_id: opt.value, grade_ids: [] }))}
                    >
                      {schools.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                    </Select>
                    {formErrors.school_id && <div style={{ fontSize: 11, color: "#dc2626", marginTop: 3 }}>{formErrors.school_id}</div>}
                  </div>
                )}

                {/* Title */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Title <Req /></label>
                  <input style={{ ...inputStyle, borderColor: formErrors.title ? "#dc2626" : "#d1d5db" }}
                    placeholder="e.g. Annual Sports Day" value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                  {formErrors.title && <div style={{ fontSize: 11, color: "#dc2626", marginTop: 3 }}>{formErrors.title}</div>}
                </div>

                {/* Event Date */}
                <div>
                  <label style={labelStyle}>Event Date <Req /></label>
                  <input type="date" style={{ ...inputStyle, borderColor: formErrors.eventDate ? "#dc2626" : "#d1d5db", colorScheme: "light" }}
                    value={form.eventDate} onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))} />
                  {formErrors.eventDate && <div style={{ fontSize: 11, color: "#dc2626", marginTop: 3 }}>{formErrors.eventDate}</div>}
                </div>

                {/* Academic Year */}
                {/* FIX 2: also reset grade_ids when academic year changes so stale
                    labels from the old year don't remain after the grade list reloads */}
                <div>
                  <label style={labelStyle}>Academic Year <Req /></label>
                  <Select
                    style={{ width: "100%" }}
                    value={form.academicYear}
                    onChange={v => setForm(f => ({ ...f, academicYear: v, grade_ids: [] }))}
                  >
                    {ACADEMIC_YEARS.map(y => <Option key={y} value={y}>{y}</Option>)}
                  </Select>
                </div>

                {/* Class — MULTI SELECT */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>
                    Class&nbsp;
                    <span style={{ color: C.textSoft, fontWeight: 400 }}>(optional — leave blank for all classes)</span>
                  </label>
                  <Select
                    mode="multiple"
                    style={{ width: "100%" }}
                    placeholder="Select one or more classes (blank = all)"
                    labelInValue
                    value={form.grade_ids}
                    allowClear
                    maxTagCount="responsive"
                    disabled={isSuperAdmin && !form.school_id}
                    onChange={v => setForm(f => ({ ...f, grade_ids: v }))}
                  >
                    {formGrades.map(g => (
                      <Option key={String(g.id)} value={String(g.id)}>{g.grade}</Option>
                    ))}
                  </Select>
                  {/* Selected tag preview */}
                  {form.grade_ids.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                      {form.grade_ids.map(item => {
                        const label = typeof item === "object" ? item.label : (formGrades.find(x => String(x.id) === String(item))?.grade || item);
                        const key = typeof item === "object" ? item.value : item;
                        return (
                          <span key={key} style={{ fontSize: 11, background: "#dbeafe", color: "#1e40af", padding: "2px 10px", borderRadius: 10, fontWeight: 600 }}>{label}</span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Description</label>
                  <textarea style={{ ...inputStyle, height: 80, resize: "vertical", paddingTop: 8, lineHeight: 1.5, fontFamily: FF_l }}
                    placeholder="Optional description or notes..."
                    value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>

                {/* Attachment */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Attachment <span style={{ color: C.textSoft, fontWeight: 400 }}>(Max 1.5 MB — PDF, DOC, JPG, PNG)</span></label>
                  <div style={{ border: "1.5px dashed #d1d5db", borderRadius: 8, padding: "12px 16px", background: "#f8fafc", display: "flex", alignItems: "center", gap: 12 }}>
                    <label style={{ cursor: "pointer" }}>
                      <input type="file" style={{ display: "none" }} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={e => {
                          const file = e.target.files[0];
                          if (!file) return;
                          if (file.size > 1.5 * 1024 * 1024) {
                            message.error("File size must be 1.5 MB or less.");
                            e.target.value = "";
                            return;
                          }
                          setForm(f => ({ ...f, attachment: file, attachmentName: file.name }));
                        }} />
                      <span style={{ padding: "5px 14px", borderRadius: 6, background: C.blue, color: "#fff", fontSize: 12, fontWeight: 600, fontFamily: FF_l }}>
                        <PaperClipOutlined style={{ marginRight: 5 }} />
                        {form.attachment || form.attachmentName ? "Change File" : "Attach File"}
                      </span>
                    </label>
                    {form.attachmentName
                      ? <span style={{ fontSize: 12.5, color: C.textMid, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{form.attachmentName}</span>
                      : <span style={{ fontSize: 12, color: C.textSoft }}>No file chosen</span>
                    }
                    {form.attachmentName && (
                      <button onClick={() => setForm(f => ({ ...f, attachment: null, attachmentName: "" }))} style={{ all: "unset", cursor: "pointer", color: "#dc2626", fontSize: 13 }}><CloseOutlined /></button>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 24px", borderTop: `1px solid ${C.border}`, background: "#f8fafc", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => !saving && setModalOpen(false)} style={{ all: "unset", padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", background: "#fff", color: C.textMid, border: `1.5px solid ${C.border}`, fontFamily: FF }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ all: "unset", padding: "8px 22px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", background: saving ? "#94a3b8" : C.blue, color: "#fff", fontFamily: FF, display: "flex", alignItems: "center", gap: 6, boxShadow: saving ? "none" : `0 2px 8px ${C.blue}44` }}>
                <SaveOutlined />
                {saving ? "Saving..." : editingEvent ? "Update Event" : "Save Event"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ DELETE CONFIRM ══════════════════════════════════════ */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1300, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => !deleting && setDeleteConfirm(null)}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "28px 28px 20px", textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 8 }}>Delete Event?</div>
              <div style={{ fontSize: 13.5, color: C.textSoft, lineHeight: 1.6 }}>
                Are you sure you want to delete <strong style={{ color: C.text }}>{deleteConfirm.title}</strong>? This action cannot be undone.
              </div>
            </div>
            <div style={{ padding: "0 28px 24px", display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => !deleting && setDeleteConfirm(null)} style={{ all: "unset", padding: "9px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: deleting ? "not-allowed" : "pointer", background: "#fff", color: C.textMid, border: `1.5px solid ${C.border}`, fontFamily: FF }}>Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} disabled={deleting} style={{ all: "unset", padding: "9px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: deleting ? "not-allowed" : "pointer", background: deleting ? "#94a3b8" : "#dc2626", color: "#fff", fontFamily: FF, display: "flex", alignItems: "center", gap: 6 }}>
                <DeleteOutlined /> {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
};

export default EventCalendar;