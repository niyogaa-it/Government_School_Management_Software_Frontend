import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { message, Select, Spin, Tooltip } from "antd";
import {
  CheckOutlined, CloseOutlined, SaveOutlined,
  UpOutlined, DownOutlined, CalendarOutlined, TableOutlined,
} from "@ant-design/icons";
import Layout from "./Layout";
import { useFilter } from "./FilterContext";

const { Option } = Select;

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  blue:       "#1e40af",
  blueLt:     "#3b82f6",
  text:       "#1e293b",
  textMid:    "#475569",
  textSoft:   "#64748b",
  border:     "#e2e8f0",
  headBg:     "#1a2236",
  rowOdd:     "#ffffff",
  rowEven:    "#f8fafc",
  rowHover:   "#eff6ff",
  present:    "#16a34a",
  presentBg:  "#dcfce7",
  presentBd:  "#86efac",
  absent:     "#dc2626",
  absentBg:   "#fee2e2",
  absentBd:   "#fca5a5",
};
const FF = "'Segoe UI', system-ui, sans-serif";
const FS = "13.5px";

// ── Constants ─────────────────────────────────────────────────────────────────
const ACADEMIC_YEARS = ["2025-2026","2026-2027"];
const MN = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ── Helpers ───────────────────────────────────────────────────────────────────
const toYMD = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
};
const toDisplay = (ymd) => { if (!ymd) return ""; const [y,m,d] = ymd.split("-"); return `${d}/${m}/${y}`; };
const buildDateColumns = (selectedDate) => {
  const cols = []; const base = new Date(selectedDate); base.setHours(0,0,0,0);
  for (let i = 0; i < 7; i++) { const d = new Date(base); d.setDate(base.getDate()-i); cols.push(toYMD(d)); }
  return cols;
};
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

// ── Fetch holiday dates from Events table ─────────────────────────────────────
const fetchEventHolidays = async ({ school_id, academicYear, grade_id, startDate, endDate }) => {
  try {
    const res = await axios.get(`${process.env.REACT_APP_API_URL}/event/getHolidayDates`, {
      params: { school_id, academicYear, grade_id, startDate, endDate },
    });
    return new Set(res.data.holidayDates || []);
  } catch {
    return new Set();
  }
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const SSLCAttendance = () => {
  const user         = JSON.parse(localStorage.getItem("user") || "{}");
  const role         = user?.roleName?.toLowerCase().replace(/\s+/g, "") || "";
  const schoolId     = user?.school?.id;
  const schoolName   = user?.school?.name || "";
  const isSuperAdmin = role === "superadmin";
  const isAdmin      = isSuperAdmin || role === "schooladmin";
  const todayYMD     = toYMD(new Date());

  // ── Pull school + year from dashboard FilterContext ───────────────────────
  const {
    selectedSchool:     ctxSchool,
    selectedSchoolName: ctxSchoolName,
    selectedYear:       ctxYear,
  } = useFilter();

  const [activeTab, setActiveTab] = useState("attendance");

  const [schools,       setSchools]       = useState([]);

  // ── Seed school from context (superadmin) or user object (others) ─────────
  const [selSchoolId,   setSelSchoolId]   = useState(() => {
    if (!isSuperAdmin) return schoolId || "";
    return (ctxSchool && ctxSchool !== "all") ? ctxSchool : "";
  });
  const [selSchoolName, setSelSchoolName] = useState(() => {
    if (!isSuperAdmin) return schoolName;
    return (ctxSchool && ctxSchool !== "all") ? (ctxSchoolName || "") : "";
  });

  // ── Seed academic year from context ───────────────────────────────────────
  const [academicYear,  setAcademicYear]  = useState(ctxYear || "2025-2026");

  const [grades,        setGrades]        = useState([]);
  const [selGradeId,    setSelGradeId]    = useState("");
  const [selGradeName,  setSelGradeName]  = useState("");
  const [sections,      setSections]      = useState([]);
  const [selSectionId,  setSelSectionId]  = useState("");
  const [session,       setSession]       = useState("Morning");
  const [selDate,       setSelDate]       = useState(todayYMD);

  const [students,      setStudents]      = useState([]);
  const [attendance,    setAttendance]    = useState({});
  const [dateCols,      setDateCols]      = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [submitting,    setSubmitting]    = useState(false);
  const [submitted,     setSubmitted]     = useState(false);
  const [loaded,        setLoaded]        = useState(false);
  const [attHolidaySet, setAttHolidaySet] = useState(new Set());

  const [monthlySession, setMonthlySession] = useState("Morning");
  const [monthlyMonth,   setMonthlyMonth]   = useState(new Date().getMonth());
  const [monthlyYear,    setMonthlyYear]    = useState(new Date().getFullYear());
  const [monthlyData,    setMonthlyData]    = useState(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [holidaySet,     setHolidaySet]     = useState(new Set());

  // ── Sync FilterContext → local state when dashboard filter changes ─────────
  useEffect(() => {
    if (isSuperAdmin && ctxSchool && ctxSchool !== "all") {
      setSelSchoolId(ctxSchool);
      setSelSchoolName(ctxSchoolName || "");
      // Reset downstream filters when school changes
      setSelGradeId(""); setSections([]); setSelSectionId("");
      setLoaded(false); setStudents([]); setAttendance({});
    }
  }, [ctxSchool, ctxSchoolName, isSuperAdmin]);

  useEffect(() => {
    if (ctxYear) {
      setAcademicYear(ctxYear);
      // Reset downstream filters when year changes
      setSelGradeId(""); setSections([]); setSelSectionId("");
      setLoaded(false); setStudents([]); setAttendance({});
    }
  }, [ctxYear]);

  // ── Load schools (superadmin) ──────────────────────────────────────────────
  useEffect(() => {
    if (!isSuperAdmin) return;
    axios.get(`${process.env.REACT_APP_API_URL}/school/getAllSchools`)
      .then(r => {
        const list = r.data.schools || [];
        setSchools(list);
        // Once the list is loaded, resolve the display name for the currently
        // selected school ID (which may have arrived from FilterContext before
        // this API call completed, leaving selSchoolName empty).
        setSelSchoolName(prev =>
          prev ? prev : (list.find(s => String(s.id) === String(selSchoolId))?.name || prev)
        );
      })
      .catch(() => message.error("Failed to fetch schools"));
  }, [isSuperAdmin]);

  // ── SSLC grade names: I to X ──────────────────────────────────────────────
  const SSLC_GRADES = ["I","II","III","IV","V","VI","VII","VIII","IX","X"];
  const isSslcGrade = (gradeName) => {
    if (!gradeName) return false;
    const n = String(gradeName).trim();
    return SSLC_GRADES.some(g => n === g || n === `Grade ${g}` || n === `Class ${g}` || n === `Std ${g}` || n.startsWith(`${g} `));
  };

  // ── Load grades when school + year changes (filtered I–X) ─────────────────
  useEffect(() => {
    if (!selSchoolId || !academicYear) { setGrades([]); setSelGradeId(""); setSections([]); setSelSectionId(""); return; }
    axios.get(`${process.env.REACT_APP_API_URL}/grade/getGradesBySchoolAndYear/${selSchoolId}/${academicYear}`)
      .then(r => {
        const all = r.data.grades || [];
        const filtered = all.filter(g => isSslcGrade(g.grade));
        setGrades(filtered);
      }).catch(() => setGrades([]));
    setSelGradeId(""); setSections([]); setSelSectionId("");
  }, [selSchoolId, academicYear]);

  // ── Load sections when grade changes ──────────────────────────────────────
  useEffect(() => {
    if (!selSchoolId || !selGradeId || !academicYear) { setSections([]); setSelSectionId(""); return; }
    axios.get(`${process.env.REACT_APP_API_URL}/section/getSectionsBySchoolAndYear/${selSchoolId}/${academicYear}`)
      .then(r => {
        const all = r.data.sections || [];
        setSections(all.filter(s => String(s.grade_id) === String(selGradeId) || String(s.Grade?.id) === String(selGradeId)));
      }).catch(() => setSections([]));
    setSelSectionId("");
  }, [selGradeId, selSchoolId, academicYear]);

  // ── Reset table on filter change ──────────────────────────────────────────
  useEffect(() => {
    setLoaded(false); setStudents([]); setAttendance({}); setSubmitted(false); setAttHolidaySet(new Set());
  }, [selSchoolId, academicYear, selGradeId, selSectionId, session]);

  const isAttHoliday = (col) => new Date(col).getDay() === 0 || attHolidaySet.has(col);

  // ── Go (load attendance) ───────────────────────────────────────────────────
  const handleGo = useCallback(async () => {
    if (!selSchoolId || !academicYear || !selGradeId || !selSectionId) {
      message.warning("Please fill all filters before clicking Go."); return;
    }
    setLoading(true); setLoaded(false); setStudents([]); setAttendance({}); setSubmitted(false);
    const cols = buildDateColumns(selDate);
    setDateCols(cols);
    const startDate = cols[cols.length - 1];
    const endDate   = cols[0];
    try {
      const [studRes, eventHolidays] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL}/attendance/getStudentsForAttendance`,
          { params: { school_id: selSchoolId, academicYear, grade_id: selGradeId, section_id: selSectionId } }),
        fetchEventHolidays({ school_id: selSchoolId, academicYear, grade_id: selGradeId, startDate, endDate }),
      ]);
      setAttHolidaySet(eventHolidays);
      const studs = studRes.data.students || [];
      setStudents(studs);
      if (studs.length === 0) { message.info("No active students found."); setLoading(false); setLoaded(true); return; }
      const attMap = {};
      await Promise.all(cols.map(async (col) => {
        if (new Date(col).getDay() === 0 || eventHolidays.has(col)) { attMap[col] = new Set(); return; }
        try {
          const r = await axios.get(`${process.env.REACT_APP_API_URL}/attendance/getAttendance`,
            { params: { school_id: selSchoolId, academicYear, grade_id: selGradeId, section_id: selSectionId, date: col, session } });
          attMap[col] = new Set((r.data.attendance || []).map(a => a.admissionNumber));
        } catch { attMap[col] = new Set(); }
      }));
      setAttendance(attMap);
      setSubmitted(attMap[selDate] instanceof Set);
      setLoaded(true);
    } catch { message.error("Failed to load attendance data."); }
    finally { setLoading(false); }
  }, [selSchoolId, academicYear, selGradeId, selSectionId, session, selDate]);

  // ── Session time window restriction ───────────────────────────────────────
  const SESSION_WINDOWS = {
    Morning:   { start: { h: 10, m: 0 }, end: { h: 11, m: 30 }, label: "10:00 AM – 11:30 AM" },
    Afternoon: { start: { h: 13, m: 0 }, end: { h: 14, m: 30 }, label: "1:00 PM – 2:30 PM" },
  };

  const isWithinSessionTime = (sess) => {
    if (isSuperAdmin) return true;
    const win = SESSION_WINDOWS[sess]; if (!win) return false;
    const now = new Date();
    const nowMins   = now.getHours() * 60 + now.getMinutes();
    const startMins = win.start.h * 60 + win.start.m;
    const endMins   = win.end.h   * 60 + win.end.m;
    return nowMins >= startMins && nowMins <= endMins;
  };

  const checkSessionTime = (sess) => {
    if (isSuperAdmin) return true;
    if (!isWithinSessionTime(sess)) {
      const win = SESSION_WINDOWS[sess] || {};
      message.warning({
        content: `Attendance time is over! ${sess} session can only be marked between ${win.label || ""}. Please contact the Super Admin.`,
        duration: 5,
      });
      return false;
    }
    return true;
  };

  const isColEditable = (col) => {
    if (!isAdmin) return false;
    if (isAttHoliday(col)) return false;
    if (isSuperAdmin) return true;
    if (col !== todayYMD) return false;
    return isWithinSessionTime(session);
  };

  const toggleAbsent = (admNo, col) => {
    if (!isColEditable(col)) {
      if (col === todayYMD && !isWithinSessionTime(session)) checkSessionTime(session);
      return;
    }
    setAttendance(prev => {
      const cur = new Set(prev[col] || []);
      if (cur.has(admNo)) cur.delete(admNo); else cur.add(admNo);
      return { ...prev, [col]: cur };
    });
  };

  const markAllForCol = (col, status) => {
    if (!isColEditable(col)) {
      if (col === todayYMD && !isWithinSessionTime(session)) checkSessionTime(session);
      return;
    }
    setAttendance(prev => ({
      ...prev,
      [col]: status === "absent" ? new Set(students.map(s => s.admissionNumber)) : new Set(),
    }));
  };

  const handleSubmit = async () => {
    if (!loaded || students.length === 0) return;
    if (!checkSessionTime(session)) return;
    if (isAttHoliday(selDate)) {
      message.warning("This date is marked as a Holiday. Attendance cannot be submitted."); return;
    }
    const absentSet = attendance[selDate] || new Set();
    const absentStudents = students
      .filter(s => absentSet.has(s.admissionNumber))
      .map(s => ({ admissionNumber: s.admissionNumber, studentName: s.name }));
    setSubmitting(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/attendance/submitAttendance`, {
        school_id: selSchoolId, academicYear, grade_id: selGradeId,
        section_id: selSectionId, date: selDate, session, absentStudents,
      });
      message.success(`Attendance submitted. ${absentStudents.length} absent.`);
      setSubmitted(true);
    } catch (err) { message.error(err.response?.data?.error || "Failed to submit."); }
    finally { setSubmitting(false); }
  };

  const handleDateChange = (e) => {
    const val = e.target.value;
    if (!isSuperAdmin && val !== todayYMD) { message.warning("Only Super Admin can view past dates."); return; }
    if (val > todayYMD) { message.warning("Future dates are not allowed."); return; }
    setSelDate(val);
  };

  // ── Monthly view ───────────────────────────────────────────────────────────
  const fetchMonthly = useCallback(async () => {
    if (!selSchoolId || !selGradeId || !selSectionId) {
      message.warning("Please select School, Class and Section first."); return;
    }
    setMonthlyLoading(true); setMonthlyData(null);
    try {
      const studRes = await axios.get(`${process.env.REACT_APP_API_URL}/attendance/getStudentsForAttendance`,
        { params: { school_id: selSchoolId, academicYear, grade_id: selGradeId, section_id: selSectionId } });
      const studs = studRes.data.students || [];
      if (studs.length === 0) { message.info("No students found."); setMonthlyLoading(false); return; }
      const totalDays = daysInMonth(monthlyYear, monthlyMonth);
      const mm = String(monthlyMonth + 1).padStart(2, "0");
      const dayKeys = Array.from({ length: totalDays }, (_, i) =>
        `${monthlyYear}-${mm}-${String(i + 1).padStart(2, "0")}`
      ).filter(d => d <= todayYMD);
      const startDate = `${monthlyYear}-${mm}-01`;
      const endDate   = `${monthlyYear}-${mm}-${String(totalDays).padStart(2, "0")}`;
      const eventHolidays = await fetchEventHolidays({
        school_id: selSchoolId, academicYear, grade_id: selGradeId, startDate, endDate,
      });
      const autoHolidays = new Set([
        ...dayKeys.filter(d => new Date(d).getDay() === 0),
        ...eventHolidays,
      ]);
      setHolidaySet(autoHolidays);
      const absentMap = {};
      const submittedDays = new Set();
      await Promise.all(dayKeys.map(async (day) => {
        if (autoHolidays.has(day)) return;
        try {
          const r = await axios.get(`${process.env.REACT_APP_API_URL}/attendance/getAttendance`,
            { params: { school_id: selSchoolId, academicYear, grade_id: selGradeId, section_id: selSectionId, date: day, session: monthlySession } });
          const recs = r.data.attendance || [];
          if (r.data.attendance !== undefined) submittedDays.add(day);
          if (recs.length > 0) absentMap[day] = new Set(recs.map(a => a.admissionNumber));
        } catch { /* no record */ }
      }));
      setMonthlyData({ students: studs, absentMap, dayKeys, submittedDays });
    } catch { message.error("Failed to load monthly data."); }
    finally { setMonthlyLoading(false); }
  }, [selSchoolId, academicYear, selGradeId, selSectionId, monthlySession, monthlyMonth, monthlyYear, todayYMD]);

  const todayAbsentCount  = attendance[selDate]?.size || 0;
  const todayPresentCount = students.length - todayAbsentCount;

  const monthOptions = (() => {
    const opts = [];
    const now = new Date();
    const curY = now.getFullYear(); const curM = now.getMonth();
    let y = 2024; let m = 0;
    while (y < curY || (y === curY && m <= curM)) {
      opts.push({ label: `${MN[m]} ${y}`, value: `${y}-${m}` });
      m++; if (m > 11) { m = 0; y++; }
    }
    return opts;
  })();

  // =============================================================================
  // RENDER
  // =============================================================================
  return (
    <Layout>
      <style>{`
        .att-filter-grid {
          display: grid;
          grid-template-columns: 2fr 1.2fr 1fr 1fr 1fr 1.4fr 0.6fr;
          gap: 14px;
          align-items: end;
        }
        @media (max-width: 1199px) {
          .att-filter-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 767px) {
          .att-filter-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 479px) {
          .att-filter-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div className="app-page" style={{ fontFamily: FF }}>

        {/* ── Title ─────────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0, letterSpacing: "-0.3px" }}>
            SSLC Student Attendance
          </h1>
          <div style={{ width: 40, height: 3, background: C.blueLt, borderRadius: 2, marginTop: 6 }} />
        </div>

        {/* ── Tab switcher ──────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 10, padding: 4, gap: 4 }}>
            {[
              { key: "attendance", icon: <TableOutlined />,   label: "Attendance" },
              { key: "monthly",   icon: <CalendarOutlined />, label: "Monthly View" },
            ].map(({ key, icon, label }) => {
              const active = activeTab === key;
              return (
                <button key={key} onClick={() => setActiveTab(key)} style={{
                  all: "unset", display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 18px", borderRadius: 7, fontSize: 13, fontWeight: 600,
                  cursor: "pointer", transition: "all 0.18s", fontFamily: FF,
                  background: active ? C.blue : "transparent",
                  color: active ? "#fff" : C.textMid,
                  boxShadow: active ? `0 2px 8px ${C.blue}44` : "none",
                }}>
                  {icon}&nbsp;{label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Filter bar ────────────────────────────────────────────────────── */}
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: `1px solid ${C.border}`, padding: "18px 24px", marginBottom: 20 }}>
          <div className="att-filter-grid">

            {/* School */}
            <div className="att-field-school">
              <label style={labelStyle}>School <Req /></label>
              {isSuperAdmin ? (
                <Select
                  style={{ width: "100%" }}
                  placeholder="Select School"
                  value={selSchoolId || undefined}
                  showSearch
                  optionFilterProp="label"
                  options={
                    schools.length > 0
                      ? schools.map(s => ({ label: s.name, value: s.id }))
                      : selSchoolId
                        ? [{ label: selSchoolName || String(selSchoolId), value: selSchoolId }]
                        : []
                  }
                  onChange={v => {
                    setSelSchoolId(v);
                    setSelSchoolName(schools.find(s => s.id === v)?.name || "");
                    setLoaded(false);
                  }}
                />
              ) : (
                <input style={readonlyStyle} value={schoolName} readOnly />
              )}
            </div>

            {/* Academic Year */}
            <div>
              <label style={labelStyle}>Academic Year <Req /></label>
              <Select style={{ width: "100%" }} value={academicYear}
                onChange={v => { setAcademicYear(v); setLoaded(false); }}
              >
                {ACADEMIC_YEARS.map(y => <Option key={y} value={y}>{y}</Option>)}
              </Select>
            </div>

            {/* Class */}
            <div>
              <label style={labelStyle}>Class <Req /></label>
              <Select style={{ width: "100%" }} placeholder="Select Class (I – X)"
                value={selGradeId || undefined}
                disabled={!selSchoolId || grades.length === 0}
                onChange={v => {
                  setSelGradeId(v);
                  setSelGradeName(grades.find(g => g.id === v)?.grade || "");
                  setLoaded(false);
                }}
              >
                {grades.map(g => <Option key={g.id} value={g.id}>{g.grade}</Option>)}
              </Select>
            </div>

            {/* Section */}
            <div>
              <label style={labelStyle}>Section <Req /></label>
              <Select style={{ width: "100%" }} placeholder="Select Section"
                value={selSectionId || undefined}
                disabled={!selGradeId || sections.length === 0}
                onChange={v => { setSelSectionId(v); setLoaded(false); }}
              >
                {sections.map(s => <Option key={s.id} value={s.id}>{s.sectionName}</Option>)}
              </Select>
            </div>

            {/* Session */}
            <div>
              <label style={labelStyle}>Session <Req /></label>
              {activeTab === "attendance" ? (
                <Select style={{ width: "100%" }} value={session}
                  onChange={v => { setSession(v); setLoaded(false); }}
                >
                  <Option value="Morning">Morning</Option>
                  <Option value="Afternoon">Afternoon</Option>
                </Select>
              ) : (
                <Select style={{ width: "100%" }} value={monthlySession}
                  onChange={v => { setMonthlySession(v); setMonthlyData(null); }}
                >
                  <Option value="Morning">Morning</Option>
                  <Option value="Afternoon">Afternoon</Option>
                </Select>
              )}
            </div>

            {/* Date (attendance) / Month picker (monthly) */}
            {activeTab === "attendance" ? (
              <div>
                <label style={labelStyle}>Date <Req /></label>
                <input type="date" value={selDate} max={todayYMD}
                  onChange={handleDateChange}
                  style={{ width: "100%", padding: "4px 10px", border: "1px solid #d9d9d9", borderRadius: 6, fontSize: 13.5, height: 32, boxSizing: "border-box", fontFamily: FF }}
                />
                {!isSuperAdmin && (
                  <div style={{ fontSize: 11, color: C.textSoft, marginTop: 3 }}>Today only · Superadmin can change</div>
                )}
              </div>
            ) : (
              <MonthCalendarPicker
                monthlyYear={monthlyYear} monthlyMonth={monthlyMonth}
                monthOptions={monthOptions} monthlyLoading={monthlyLoading}
                selSchoolId={selSchoolId} selGradeId={selGradeId} selSectionId={selSectionId}
                onSelect={(y, m) => { setMonthlyYear(y); setMonthlyMonth(m); setMonthlyData(null); }}
                onGo={fetchMonthly}
              />
            )}

            {/* Go button — always last cell, self-aligned to bottom */}
            {activeTab === "attendance" && (
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button onClick={handleGo}
                  disabled={!selSchoolId || !selGradeId || !selSectionId || loading}
                  style={{ width: "100%", height: 32, borderRadius: 7, fontFamily: FF, background: (!selSchoolId || !selGradeId || !selSectionId || loading) ? "#94a3b8" : C.blue, color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: (!selSchoolId || !selGradeId || !selSectionId || loading) ? "not-allowed" : "pointer" }}>
                  {loading ? "..." : "Go"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            ATTENDANCE TAB
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "attendance" && (
          <>
            {loaded && students.length > 0 && (
              <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                <Pill label="Total"   value={students.length}   color={C.blueLt} />
                <Pill label="Present" value={todayPresentCount} color={C.present} />
                <Pill label="Absent"  value={todayAbsentCount}  color={C.absent} />
                {isAttHoliday(selDate) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1.5px solid #e2e8f022", borderRadius: 10, padding: "6px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                    <span style={{ fontSize: 16 }}>🏖️</span>
                    <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>Holiday</span>
                  </div>
                )}
              </div>
            )}

            <Spin spinning={loading}>
              {loaded && (
                <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: `1px solid ${C.border}`, overflow: "hidden" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: FS, fontFamily: FF }}>
                      <thead>
                        <tr style={{ background: C.headBg }}>
                          <th style={thStyle({ width: 50 })}>S.No</th>
                          <th style={thStyle({ minWidth: 130 })}>Admission No</th>
                          <th style={thStyle({ minWidth: 180 })}>Student Name</th>
                          {dateCols.map((col) => {
                            const editable  = isColEditable(col);
                            const isSelDate = col === selDate;
                            const holiday   = isAttHoliday(col);
                            const isSunday  = new Date(col).getDay() === 0;
                            return (
                              <th key={col} style={thStyle({ minWidth: 120, textAlign: "center", background: holiday ? "#1e293b" : C.headBg })}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: holiday ? "#94a3b8" : "#fff" }}>{toDisplay(col)}</div>
                                {isSelDate && !holiday && (
                                  <div style={{ fontSize: 10, color: "#93c5fd", fontWeight: 500 }}>{col === todayYMD ? "Today" : "Selected"}</div>
                                )}
                                {holiday && (
                                  <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>{isSunday ? "Sunday" : "Holiday"}</div>
                                )}
                                {editable && (
                                  <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 5 }}>
                                    <Tooltip title="Mark All Present">
                                      <button onClick={() => markAllForCol(col, "present")} style={{ all: "unset", width: 22, height: 22, borderRadius: 4, background: C.presentBg, border: `1px solid ${C.presentBd}`, color: C.present, cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <UpOutlined />
                                      </button>
                                    </Tooltip>
                                    <Tooltip title="Mark All Absent">
                                      <button onClick={() => markAllForCol(col, "absent")} style={{ all: "unset", width: 22, height: 22, borderRadius: 4, background: C.absentBg, border: `1px solid ${C.absentBd}`, color: C.absent, cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <DownOutlined />
                                      </button>
                                    </Tooltip>
                                  </div>
                                )}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {students.length === 0 ? (
                          <tr>
                            <td colSpan={3 + dateCols.length} style={{ textAlign: "center", padding: "40px 16px", color: C.textSoft }}>
                              No active students found.
                            </td>
                          </tr>
                        ) : students.map((student, idx) => {
                          const rowBg = idx % 2 === 0 ? C.rowOdd : C.rowEven;
                          return (
                            <tr key={student.id}
                              onMouseEnter={e => e.currentTarget.style.background = C.rowHover}
                              onMouseLeave={e => e.currentTarget.style.background = rowBg}
                              style={{ background: rowBg, borderBottom: `1px solid ${C.border}`, transition: "background 0.12s" }}
                            >
                              <td style={tdStyle()}>{idx + 1}</td>
                              <td style={{ ...tdStyle(), color: C.blueLt, fontWeight: 600 }}>{student.admissionNumber}</td>
                              <td style={{ ...tdStyle(), fontWeight: 500, color: C.text }}>{student.name}</td>
                              {dateCols.map((col) => {
                                const holiday  = isAttHoliday(col);
                                const absent   = !holiday && !!(attendance[col]?.has(student.admissionNumber));
                                const editable = isColEditable(col);
                                return (
                                  <td key={col} style={{ ...tdStyle(), textAlign: "center", padding: "8px 10px", background: holiday ? "#f8fafc" : "inherit" }}>
                                    {holiday ? (
                                      <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, minWidth: 68, textAlign: "center", border: "1px solid #e2e8f0", background: "#f1f5f9", color: "#94a3b8" }}>H</span>
                                    ) : editable ? (
                                      <Tooltip title={absent ? "Click to mark Present" : "Click to mark Absent"}>
                                        <button onClick={() => toggleAbsent(student.admissionNumber, col)} style={{ all: "unset", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", minWidth: 82, border: `1.5px solid ${absent ? C.absentBd : C.presentBd}`, background: absent ? C.absentBg : C.presentBg, color: absent ? C.absent : C.present, transition: "all 0.15s" }}>
                                          {absent ? <><CloseOutlined style={{ fontSize: 11 }} /> Absent</> : <><CheckOutlined style={{ fontSize: 11 }} /> Present</>}
                                        </button>
                                      </Tooltip>
                                    ) : (
                                      <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, minWidth: 68, textAlign: "center", border: `1px solid ${absent ? C.absentBd : C.presentBd}`, background: absent ? C.absentBg : C.presentBg, color: absent ? C.absent : C.present }}>
                                        {absent ? "Absent" : "Present"}
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {students.length > 0 && (
                    <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.border}`, background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                      <span style={{ color: C.textSoft, fontSize: 13 }}>
                        Total Students : <strong style={{ color: C.blueLt }}>{students.length} Students</strong>
                      </span>
                      {isAdmin && !isAttHoliday(selDate) && (
                        <div style={{ display: "flex", gap: 10 }}>
                          <button onClick={handleSubmit} disabled={submitting} style={actionBtnStyle({ color: C.blue, disabled: submitting })}>
                            <SaveOutlined style={{ marginRight: 6 }} />
                            {submitting ? "Saving..." : submitted ? "Mark Attendance" : "Submit"}
                          </button>
                          <button onClick={() => { setLoaded(false); setStudents([]); setAttendance({}); setSubmitted(false); }} disabled={submitting}
                            style={{ all: "unset", padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer", background: "#fff", color: C.textMid, border: `1.5px solid ${C.border}`, fontFamily: FF }}>
                            Cancel
                          </button>
                        </div>
                      )}
                      {isAdmin && isAttHoliday(selDate) && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8", fontSize: 13, fontStyle: "italic" }}>
                          🏖️ This date is a holiday — attendance submission is disabled.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Spin>

            {!loaded && !loading && (
              <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${C.border}`, padding: "60px 20px", textAlign: "center", color: C.textSoft, fontSize: 14 }}>
                Select the filters above and click <strong>Go</strong> to load the attendance sheet.
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            MONTHLY VIEW TAB
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "monthly" && (
          <Spin spinning={monthlyLoading}>
            {monthlyData ? (
              <MonthlyTable data={monthlyData} month={monthlyMonth} year={monthlyYear}
                todayYMD={todayYMD} holidaySet={holidaySet} setHolidaySet={setHolidaySet} isAdmin={isAdmin} />
            ) : !monthlyLoading && (
              <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${C.border}`, padding: "60px 20px", textAlign: "center", color: C.textSoft, fontSize: 14 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
                Select School, Class, Section &amp; Month above then click <strong>Go</strong>.
              </div>
            )}
          </Spin>
        )}

      </div>
    </Layout>
  );
};

// =============================================================================
// MONTHLY TABLE
// =============================================================================
const MonthlyTable = ({ data, month, year, todayYMD, holidaySet, setHolidaySet, isAdmin }) => {
  const { students, absentMap, dayKeys, submittedDays } = data;

  const isHoliday    = (d) => holidaySet.has(d) || new Date(d).getDay() === 0;
  const isSubmitted  = (d) => submittedDays?.has(d);
  const getDayStatus = (d, admNo) => {
    if (isHoliday(d))    return "holiday";
    if (!isSubmitted(d)) return "nodata";
    return absentMap[d]?.has(admNo) ? "absent" : "present";
  };

  const toggleHoliday = (d) => {
    if (!isAdmin) return;
    setHolidaySet(prev => { const next = new Set(prev); if (next.has(d)) next.delete(d); else next.add(d); return next; });
  };

  const summary = students.map(s => {
    const schoolDays  = dayKeys.filter(d => !isHoliday(d) && isSubmitted(d));
    const absentDays  = schoolDays.filter(d => absentMap[d]?.has(s.admissionNumber)).length;
    const presentDays = schoolDays.length - absentDays;
    const pct = schoolDays.length > 0 ? Math.round((presentDays / schoolDays.length) * 100) : null;
    return { ...s, absentDays, presentDays, schoolDays: schoolDays.length, pct };
  });

  const schoolDayKeys = dayKeys.filter(d => !isHoliday(d) && isSubmitted(d));
  const statusStyle = {
    holiday: { bg: "#f1f5f9", color: "#94a3b8", border: "#e2e8f0", label: "H" },
    nodata:  { bg: "#fefce8", color: "#a16207", border: "#fde68a", label: "—" },
    present: { bg: "#dcfce7", color: "#16a34a", border: "#86efac", label: "P" },
    absent:  { bg: "#fee2e2", color: "#dc2626", border: "#fca5a5", label: "A" },
  };

  return (
    <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: `1px solid ${C.border}`, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{MN[month]} {year} — SSLC Attendance</span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Pill label="Total Students" value={students.length}      color={C.textMid} />
          <Pill label="School Days"    value={schoolDayKeys.length} color={C.blueLt} />
          {isAdmin && (
            <span style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>
              Check your attendance history here
            </span>
          )}
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px", fontFamily: FF }}>
          <thead>
            <tr style={{ background: C.headBg }}>
              <th style={thStyle({ width: 44, position: "sticky", left: 0, zIndex: 2, background: C.headBg })}>S.No</th>
              <th style={thStyle({ minWidth: 130, position: "sticky", left: 44, zIndex: 2, background: C.headBg })}>Adm. No</th>
              <th style={thStyle({ minWidth: 170, position: "sticky", left: 174, zIndex: 2, background: C.headBg })}>Student Name</th>
              {dayKeys.map(d => {
                const holiday = isHoliday(d);
                const isSunday = new Date(d).getDay() === 0;
                const manualHoliday = holidaySet.has(d) && !isSunday;
                return (
                  <th key={d} style={thStyle({ minWidth: 40, textAlign: "center", padding: "8px 3px", background: holiday ? "#1e293b" : C.headBg })}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: holiday ? "#94a3b8" : "#fff" }}>{d.split("-")[2]}</div>
                    <div style={{ fontSize: 9, color: holiday ? "#64748b" : "#93c5fd", marginBottom: 3 }}>
                      {["Su","Mo","Tu","We","Th","Fr","Sa"][new Date(d).getDay()]}
                    </div>
                    {isAdmin && !isSunday && (
                      <button title={manualHoliday ? "Unmark holiday" : "Mark as holiday"} onClick={() => toggleHoliday(d)}
                        style={{ all: "unset", cursor: "pointer", fontSize: 10, display: "block", margin: "2px auto 0", padding: "1px 4px", borderRadius: 3, background: manualHoliday ? "#dc2626" : "#334155", color: "#fff", fontWeight: 600, lineHeight: 1.4 }}>

                      </button>
                    )}
                    {isSunday && <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>Sun</div>}
                  </th>
                );
              })}
              <th style={thStyle({ minWidth: 62, textAlign: "center", background: "#0f172a" })}>Present</th>
              <th style={thStyle({ minWidth: 55, textAlign: "center", background: "#0f172a" })}>Absent</th>
              <th style={thStyle({ minWidth: 52, textAlign: "center", background: "#0f172a" })}>%</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((s, idx) => {
              const rowBg = idx % 2 === 0 ? C.rowOdd : C.rowEven;
              return (
                <tr key={s.id}
                  onMouseEnter={e => e.currentTarget.style.background = C.rowHover}
                  onMouseLeave={e => e.currentTarget.style.background = rowBg}
                  style={{ background: rowBg, borderBottom: `1px solid ${C.border}`, transition: "background 0.1s" }}
                >
                  <td style={{ ...tdStyle(), textAlign: "center", position: "sticky", left: 0, background: "inherit", zIndex: 1 }}>{idx + 1}</td>
                  <td style={{ ...tdStyle(), color: C.blueLt, fontWeight: 600, position: "sticky", left: 44, background: "inherit", zIndex: 1 }}>{s.admissionNumber}</td>
                  <td style={{ ...tdStyle(), fontWeight: 500, color: C.text, position: "sticky", left: 174, background: "inherit", zIndex: 1 }}>{s.name}</td>
                  {dayKeys.map(d => {
                    const st = getDayStatus(d, s.admissionNumber);
                    const ss = statusStyle[st];
                    return (
                      <td key={d} style={{ padding: "7px 3px", textAlign: "center", background: isHoliday(d) ? "#f8fafc" : "inherit" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 20, borderRadius: 4, fontSize: 11, fontWeight: 700, background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>
                          {ss.label}
                        </span>
                      </td>
                    );
                  })}
                  <td style={{ ...tdStyle(), textAlign: "center", fontWeight: 700, color: C.present }}>{s.presentDays}</td>
                  <td style={{ ...tdStyle(), textAlign: "center", fontWeight: 700, color: s.absentDays > 0 ? C.absent : C.textSoft }}>{s.absentDays}</td>
                  <td style={{ ...tdStyle(), textAlign: "center", fontWeight: 700 }}>
                    {s.pct !== null ? (
                      <span style={{ display: "inline-block", padding: "1px 7px", borderRadius: 10, fontSize: 11, background: s.pct >= 75 ? C.presentBg : C.absentBg, color: s.pct >= 75 ? C.present : C.absent, border: `1px solid ${s.pct >= 75 ? C.presentBd : C.absentBd}` }}>
                        {s.pct}%
                      </span>
                    ) : <span style={{ color: "#cbd5e1", fontSize: 11 }}>—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// =============================================================================
// MONTH CALENDAR PICKER
// =============================================================================
const MonthCalendarPicker = ({ monthlyYear, monthlyMonth, monthOptions, monthlyLoading, selSchoolId, selGradeId, selSectionId, onSelect, onGo }) => {
  const [open, setOpen] = useState(false);
  const [navYear, setNavYear] = useState(monthlyYear);
  const ref = React.useRef(null);

  React.useEffect(() => { setNavYear(monthlyYear); }, [monthlyYear]);
  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const validMonthsForYear = monthOptions.filter(o => o.value.startsWith(`${navYear}-`)).map(o => Number(o.value.split("-")[1]));
  const allYears = [...new Set(monthOptions.map(o => Number(o.value.split("-")[0])))];
  const canPrevYear = allYears.includes(navYear - 1);
  const canNextYear = allYears.includes(navYear + 1);
  const MONTH_NAMES_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const disabled = !selSchoolId || !selGradeId || !selSectionId || monthlyLoading;

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <label style={labelStyle}>Month <span style={{ color: "#dc2626" }}>*</span></label>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setOpen(v => !v)} style={{ flex: 1, height: 32, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 10px", background: "#fff", border: "1px solid #d9d9d9", borderRadius: 6, cursor: "pointer", fontFamily: FF, fontSize: 13.5, color: "#1e293b", boxShadow: open ? "0 0 0 2px #3b82f620" : "none" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CalendarOutlined style={{ color: "#3b82f6", fontSize: 14 }} />
            {MN[monthlyMonth]} {monthlyYear}
          </span>
          <span style={{ fontSize: 10, color: "#94a3b8" }}>&#9660;</span>
        </button>
        <button onClick={() => { onGo(); setOpen(false); }} disabled={disabled}
          style={{ all: "unset", padding: "0 18px", height: 32, borderRadius: 7, fontFamily: FF, background: disabled ? "#94a3b8" : "#1e40af", color: "#fff", fontWeight: 700, fontSize: 13, cursor: disabled ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
          {monthlyLoading ? "..." : "Go"}
        </button>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 999, background: "#fff", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", border: "1px solid #e2e8f0", padding: "14px 16px", width: 240 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <button onClick={() => canPrevYear && setNavYear(y => y - 1)} disabled={!canPrevYear} style={{ all: "unset", width: 28, height: 28, borderRadius: 6, cursor: canPrevYear ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", background: canPrevYear ? "#f1f5f9" : "transparent", color: canPrevYear ? "#1e293b" : "#cbd5e1", fontSize: 16, fontWeight: 700 }}>&#8249;</button>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>{navYear}</span>
            <button onClick={() => canNextYear && setNavYear(y => y + 1)} disabled={!canNextYear} style={{ all: "unset", width: 28, height: 28, borderRadius: 6, cursor: canNextYear ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", background: canNextYear ? "#f1f5f9" : "transparent", color: canNextYear ? "#1e293b" : "#cbd5e1", fontSize: 16, fontWeight: 700 }}>&#8250;</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {MONTH_NAMES_SHORT.map((name, idx) => {
              const isValid    = validMonthsForYear.includes(idx);
              const isSelected = monthlyYear === navYear && monthlyMonth === idx;
              return (
                <button key={idx} disabled={!isValid} onClick={() => { if (isValid) { onSelect(navYear, idx); setOpen(false); } }}
                  style={{ all: "unset", textAlign: "center", padding: "8px 4px", borderRadius: 8, fontSize: 12.5, fontWeight: isSelected ? 700 : 500, cursor: isValid ? "pointer" : "not-allowed", background: isSelected ? "#1e40af" : isValid ? "#f8fafc" : "transparent", color: isSelected ? "#fff" : isValid ? "#1e293b" : "#cbd5e1", border: isSelected ? "2px solid #1e40af" : "1.5px solid transparent" }}
                  onMouseEnter={e => { if (isValid && !isSelected) { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.borderColor = "#bfdbfe"; } }}
                  onMouseLeave={e => { if (isValid && !isSelected) { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "transparent"; } }}
                >{name}</button>
              );
            })}
          </div>
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #f1f5f9", fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
            Only months in the academic year are selectable
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// SHARED STYLES & SUB-COMPONENTS
// =============================================================================
const Req = () => <span style={{ color: "#dc2626" }}>*</span>;

const Pill = ({ label, value, color }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: `1.5px solid ${color}22`, borderRadius: 10, padding: "6px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
    <span style={{ fontSize: 20, fontWeight: 700, color }}>{value}</span>
    <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{label}</span>
  </div>
);

const labelStyle = { display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 5, fontFamily: FF };

const readonlyStyle = {
  width: "100%", padding: "4px 10px", background: "#f8fafc", border: "1px solid #e2e8f0",
  borderRadius: 6, fontSize: 13.5, color: "#64748b", boxSizing: "border-box", height: 32, fontFamily: FF,
};

const thStyle = (extra = {}) => ({
  padding: "12px 14px", fontWeight: 600, fontSize: 12.5, color: "#ffffff",
  textAlign: "left", whiteSpace: "nowrap", letterSpacing: "0.2px", fontFamily: FF, ...extra,
});

const tdStyle = () => ({ padding: "10px 14px", color: "#475569", whiteSpace: "nowrap", fontFamily: FF });

const actionBtnStyle = ({ color, disabled }) => ({
  all: "unset", display: "inline-flex", alignItems: "center",
  padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
  cursor: disabled ? "not-allowed" : "pointer",
  background: disabled ? "#94a3b8" : color, color: "#fff",
  fontFamily: FF, opacity: disabled ? 0.7 : 1, transition: "all 0.15s",
});

export default SSLCAttendance;