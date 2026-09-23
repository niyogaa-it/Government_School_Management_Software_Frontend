import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { message, Select, Spin } from "antd";
import Layout from "./Layout";

const { Option } = Select;
const COLOR = { blue: "#1e40af", blueLt: "#3b82f6", text: "#1e293b", textMid: "#475569", textSoft: "#64748b", border: "#e2e8f0", headerBg: "#f8fafc", danger: "#e21216" };
const FF = "'Segoe UI', system-ui, sans-serif";
const FS = "13.5px";
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const EditWeekDays = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const isSuperAdmin = role === "superadmin";
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [sectionTimeSets, setSectionTimeSets] = useState([]);

  const [schoolId, setSchoolId] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [applicableDate, setApplicableDate] = useState("");

  // rowState[day] = { checked: bool, time_set_id: number|null }
  const [rowState, setRowState] = useState(
    Object.fromEntries(DAYS.map(d => [d, { checked: false, time_set_id: null }]))
  );
  const [saving, setSaving] = useState(false);

  // Track whether the user has actually touched Class/Section since the
  // page loaded — if they haven't, changing school/year alone shouldn't
  // wipe the grade/section/day selections that came from the saved record.
  const [userChangedGradeOrSection, setUserChangedGradeOrSection] = useState(false);

  // Initial load: fetch the schedule, then everything needed to populate
  // the dropdowns for its saved school/year/grade/section, in order.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await axios.get(`${process.env.REACT_APP_API_URL}/weekday/getWeekDayScheduleById/${id}`);
        const schedule = data?.schedule;
        if (!schedule) {
          if (!cancelled) setNotFound(true);
          return;
        }

        const schId = schedule.school_id;
        const year = schedule.academic_year;
        const gId = schedule.grade_id;
        const secId = schedule.section_id;

        const [gradesRes, sectionsRes, timeSetsRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_URL}/grade/getGradesBySchoolAndYear/${schId}/${year}`).catch(() => ({ data: {} })),
          axios.get(`${process.env.REACT_APP_API_URL}/section/getSectionsBySchoolAndGrade/${schId}/${gId}`).catch(() => ({ data: {} })),
          axios.get(`${process.env.REACT_APP_API_URL}/weekday/getTimeSetsForSection/${secId}`).catch(() => ({ data: {} })),
        ]);

        if (cancelled) return;

        // Make sure any Time Set already used by this schedule's saved days
        // shows up in the dropdown even if it's since been unassigned from
        // the section, so opening Edit doesn't silently blank a day out.
        const fetchedTimeSets = timeSetsRes.data.timeSets || [];
        const usedTimeSets = (schedule.days || [])
          .filter(d => d.TimeSet)
          .map(d => ({ id: d.TimeSet.id, name: d.TimeSet.name }));
        const mergedTimeSets = [...fetchedTimeSets];
        usedTimeSets.forEach(u => {
          if (!mergedTimeSets.some(t => String(t.id) === String(u.id))) mergedTimeSets.push(u);
        });

        const nextRowState = Object.fromEntries(DAYS.map(d => [d, { checked: false, time_set_id: null }]));
        (schedule.days || []).forEach(d => {
          if (DAYS.includes(d.day_of_week)) {
            nextRowState[d.day_of_week] = { checked: true, time_set_id: d.TimeSet?.id || d.time_set_id || null };
          }
        });

        setGrades(gradesRes.data.grades || []);
        setSections(sectionsRes.data.sections || []);
        setSectionTimeSets(mergedTimeSets);
        setRowState(nextRowState);

        setSchoolId(schId || "");
        setSchoolName(schedule.School?.name || user?.school?.name || "");
        setAcademicYear(year || "");
        setGradeId(gId || "");
        setSectionId(secId || "");
        setApplicableDate(schedule.applicable_date ? String(schedule.applicable_date).slice(0, 10) : "");
      } catch (err) {
        if (!cancelled) {
          setNotFound(true);
          message.error("Failed to load schedule for editing");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Once the user actively changes Class, refresh Sections and clear the
  // section/day selections — same cascading behavior as New Week Days,
  // just gated so it doesn't fire from the initial load above.
  useEffect(() => {
    if (!userChangedGradeOrSection) return;
    setSectionId(""); setSections([]);
    if (schoolId && gradeId) {
      axios.get(`${process.env.REACT_APP_API_URL}/section/getSectionsBySchoolAndGrade/${schoolId}/${gradeId}`)
        .then(res => setSections(res.data.sections || []))
        .catch(() => setSections([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradeId]);

  // Once the user actively changes Section, refresh the Time Set options
  // for the day dropdowns and clear day selections.
  useEffect(() => {
    if (!userChangedGradeOrSection) return;
    setSectionTimeSets([]);
    setRowState(Object.fromEntries(DAYS.map(d => [d, { checked: false, time_set_id: null }])));
    if (sectionId) {
      axios.get(`${process.env.REACT_APP_API_URL}/weekday/getTimeSetsForSection/${sectionId}`)
        .then(res => {
          const ts = res.data.timeSets || [];
          setSectionTimeSets(ts);
          if (ts.length === 1) {
            setRowState(prev => {
              const next = { ...prev };
              DAYS.forEach(d => { next[d] = { ...next[d], time_set_id: ts[0].id }; });
              return next;
            });
          }
        })
        .catch(() => message.error("Failed to fetch time sets for this section"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  const handleGradeChange = (val) => { setUserChangedGradeOrSection(true); setGradeId(val); };
  const handleSectionChange = (val) => { setUserChangedGradeOrSection(true); setSectionId(val); };

  const toggleDay = (day) => {
    setRowState(prev => ({ ...prev, [day]: { ...prev[day], checked: !prev[day].checked } }));
  };

  const toggleAll = () => {
    const allChecked = DAYS.every(d => rowState[d].checked);
    setRowState(prev => {
      const next = {};
      DAYS.forEach(d => { next[d] = { ...prev[d], checked: !allChecked }; });
      return next;
    });
  };

  const setDayTimeSet = (day, value) => {
    setRowState(prev => ({ ...prev, [day]: { ...prev[day], time_set_id: value } }));
  };

  const handleSave = async () => {
    if (!schoolId || !academicYear || !gradeId || !sectionId || !applicableDate) {
      message.error("Please fill School, Academic Year, Class, Section and Applicable Date");
      return;
    }
    const checkedDays = DAYS.filter(d => rowState[d].checked);
    if (checkedDays.length === 0) {
      message.error("Select at least one day");
      return;
    }
    const missing = checkedDays.find(d => !rowState[d].time_set_id);
    if (missing) {
      message.error(`Time Set is required for ${missing}`);
      return;
    }

    setSaving(true);
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/weekday/updateWeekDaySchedule/${id}`, {
        school_id: schoolId,
        academic_year: academicYear,
        grade_id: gradeId,
        section_id: sectionId,
        applicable_date: applicableDate,
        days: checkedDays.map(d => ({ day_of_week: d, time_set_id: rowState[d].time_set_id })),
      });
      message.success("Week Days schedule updated successfully");
      navigate("/weekdayslist");
    } catch (err) {
      message.error(err?.response?.data?.error || "Failed to update schedule");
    } finally {
      setSaving(false);
    }
  };

  const labelStyle = { fontSize: FS, color: COLOR.text, fontWeight: 500, display: "block", marginBottom: 6 };
  const allChecked = DAYS.every(d => rowState[d].checked);

  if (notFound) {
    return (
      <Layout>
        <div className="app-page" style={{ fontFamily: FF, textAlign: "center", padding: 60, color: COLOR.textSoft }}>
          Schedule not found.
          <div style={{ marginTop: 16 }}>
            <button onClick={() => navigate("/weekdayslist")}
              style={{ all: "unset", background: COLOR.blue, color: "#fff", padding: "9px 28px", borderRadius: 8, fontSize: FS, fontWeight: 600, cursor: "pointer" }}>
              Back to Week Days List
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="app-page" style={{ fontFamily: FF }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: COLOR.text, margin: 0 }}>
            Settings <span style={{ color: COLOR.textSoft, fontWeight: 400 }}>/ Edit Week Days</span>
          </h1>
        </div>

        {loading ? (
          <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: `1px solid ${COLOR.border}`, padding: 60, textAlign: "center" }}>
            <Spin />
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: `1px solid ${COLOR.border}`, padding: 24 }}>
            {/* Row 1: School + Academic Year + Class + Section + Date */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 24, alignItems: "flex-end" }}>
              <div>
                <label style={labelStyle}>School</label>
                <input style={{ width: 200, height: 32, padding: "0 11px", borderRadius: 6, border: `1px solid ${COLOR.border}`, fontSize: FS, fontFamily: FF, background: "#f1f5f9", color: COLOR.textMid }}
                  value={isSuperAdmin ? (schoolName || "N/A") : (user?.school?.name || "")} disabled />
              </div>

              <div>
                <label style={labelStyle}>Academic Year</label>
                <input style={{ width: 170, height: 32, padding: "0 11px", borderRadius: 6, border: `1px solid ${COLOR.border}`, fontSize: FS, fontFamily: FF, background: "#f1f5f9", color: COLOR.textMid }}
                  value={academicYear} disabled />
              </div>

              <div>
                <label style={labelStyle}>Class <span style={{ color: COLOR.danger }}>*</span></label>
                <Select placeholder="Select Class" style={{ width: 170 }} value={gradeId || undefined} onChange={handleGradeChange}>
                  {grades.map(g => <Option key={g.id} value={g.id}>{g.grade}</Option>)}
                </Select>
              </div>

              <div>
                <label style={labelStyle}>Section <span style={{ color: COLOR.danger }}>*</span></label>
                <Select placeholder={gradeId ? "Select Section" : "Select class first"} style={{ width: 170 }}
                  value={sectionId || undefined} onChange={handleSectionChange} disabled={!gradeId}>
                  {sections.map(s => <Option key={s.id} value={s.id}>{s.sectionName}</Option>)}
                </Select>
              </div>

              <div>
                <label style={labelStyle}>Applicable Date <span style={{ color: COLOR.danger }}>*</span></label>
                <input type="date" value={applicableDate} onChange={e => setApplicableDate(e.target.value)}
                  style={{ width: 160, height: 32, padding: "0 11px", borderRadius: 6, border: `1px solid ${COLOR.border}`, fontSize: FS, fontFamily: FF }} />
              </div>
            </div>

            {/* Days table */}
            <div style={{ border: `1px solid ${COLOR.border}`, borderRadius: 8, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FF, fontSize: FS }}>
                <thead>
                  <tr style={{ background: COLOR.headerBg }}>
                    <th style={{ width: 40, padding: "10px 12px", textAlign: "center" }}>
                      <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                    </th>
                    <th style={{ padding: "10px 12px", textAlign: "left", color: COLOR.textMid, fontWeight: 600 }}>Days</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", color: COLOR.textMid, fontWeight: 600 }}>Time Set</th>
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map(day => {
                    const row = rowState[day];
                    return (
                      <tr key={day} style={{ borderTop: `1px solid ${COLOR.border}` }}>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          <input type="checkbox" checked={row.checked} onChange={() => toggleDay(day)} disabled={!sectionId} />
                        </td>
                        <td style={{ padding: "10px 12px", color: row.checked ? COLOR.text : COLOR.textSoft }}>{day}</td>
                        <td style={{ padding: "8px 12px" }}>
                          <Select
                            placeholder={sectionId ? "Select Time Set" : "Select section first"}
                            style={{ width: 260 }}
                            value={row.time_set_id || undefined}
                            onChange={val => setDayTimeSet(day, val)}
                            disabled={!row.checked}
                            status={row.checked && !row.time_set_id ? "error" : ""}
                          >
                            {sectionTimeSets.map(ts => <Option key={ts.id} value={ts.id}>{ts.name}</Option>)}
                          </Select>
                          {row.checked && !row.time_set_id && (
                            <div style={{ color: COLOR.danger, fontSize: 12, marginTop: 4 }}>Time Set is required</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Save + Cancel */}
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 28 }}>
              <button disabled={saving} onClick={handleSave}
                style={{ all: "unset", background: COLOR.blue, color: "#fff", padding: "9px 28px", borderRadius: 8, fontSize: FS, fontWeight: 600, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => navigate("/weekdayslist")}
                style={{ all: "unset", background: COLOR.blue, color: "#fff", padding: "9px 28px", borderRadius: 8, fontSize: FS, fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default EditWeekDays;
