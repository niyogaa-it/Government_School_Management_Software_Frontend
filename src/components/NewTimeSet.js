import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { message } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import Layout from "./Layout";
import TimeSlotModal from "./TimeSlotModal";
import moment from "moment";

const COLOR = { blue: "#1e40af", blueLt: "#3b82f6", text: "#1e293b", textMid: "#475569", textSoft: "#64748b", border: "#e2e8f0", rowOdd: "#ffffff", rowEven: "#f8fafc", headBg: "#1a2236", headText: "#ffffff", danger: "#e21216", dangerBg: "rgba(226,18,22,0.08)", editColor: "#0891b2", editBg: "rgba(8,145,178,0.08)", breakBg: "#fff7ed", breakText: "#c2410c" };
const FF = "'Segoe UI', system-ui, sans-serif";
const FS = "13.5px";

// Builds a rolling list of academic years, e.g. 2024-2025 .. 2028-2029
const buildAcademicYears = () => {
  const startYear = new Date().getFullYear() - 1;
  return Array.from({ length: 6 }, (_, i) => `${startYear + i} - ${startYear + i + 1}`);
};

const IconBtn = ({ icon, title, color, bg, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <button title={title} onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ all: "unset", width: 30, height: 30, borderRadius: 7, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 15, transition: "all 0.15s", color: hov ? color : COLOR.textMid, background: hov ? bg : "transparent" }}>
      {icon}
    </button>
  );
};

const NewTimeSet = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const isSuperAdmin = role === "superadmin";
  const academicYears = buildAcademicYears();

  const [timeName, setTimeName] = useState("");
  const [schools, setSchools] = useState([]);
  const [schoolId, setSchoolId] = useState(isSuperAdmin ? "" : user?.school?.id || "");
  const [academicYear, setAcademicYear] = useState("");
  const [slots, setSlots] = useState([]); // held locally until Save
  const [errors, setErrors] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isSuperAdmin) {
      axios.get(`${process.env.REACT_APP_API_URL}/school/getAllSchools`)
        .then(res => setSchools(res.data.schools || []))
        .catch(() => message.error("Failed to fetch schools"));
    }
  }, [isSuperAdmin]);

  const overlaps = (a, b) => a.start_time < b.end_time && b.start_time < a.end_time;

  const handleSlotSave = (slot) => {
    const clash = slots.some(s => s !== editingSlot && overlaps(s, slot));
    if (clash) {
      message.error("This time overlaps with an existing slot");
      return;
    }
    if (editingSlot) {
      setSlots(prev => prev.map(s => (s === editingSlot ? { ...slot } : s)));
    } else {
      setSlots(prev => [...prev, { ...slot, _tempId: Date.now() }]);
    }
    setModalOpen(false);
    setEditingSlot(null);
  };

  const removeSlot = (slot) => setSlots(prev => prev.filter(s => s !== slot));

  const fmt = (t) => (t ? moment(t, "HH:mm").format("h:mm A") : "");

  const handleSave = async () => {
    const nextErrors = {};
    if (!timeName.trim()) nextErrors.name = "Name is required";
    if (!schoolId) nextErrors.school = "School is required";
    if (!academicYear) nextErrors.year = "Academic Year is required";
    if (slots.length === 0) nextErrors.slots = "Add at least one time slot";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const { data } = await axios.post(`${process.env.REACT_APP_API_URL}/timeset/createTimeSet`, {
        name: timeName.trim(),
        school_id: schoolId,
        academic_year: academicYear,
      });
      const timeSetId = data.timeSet.id;

      for (const slot of slots) {
        await axios.post(`${process.env.REACT_APP_API_URL}/timeset/addTimeSlot`, {
          time_set_id: timeSetId,
          name: slot.name,
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_break: slot.is_break,
        });
      }

      message.success("Time Set created successfully");
      navigate("/manage-time-set");
    } catch (err) {
      message.error(err?.response?.data?.error || "Failed to create Time Set");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { width: "100%", maxWidth: 340, padding: "8px 12px", borderRadius: 6, border: `1px solid ${COLOR.border}`, fontSize: FS, fontFamily: FF, outline: "none" };
  const labelStyle = { fontSize: FS, color: COLOR.text, fontWeight: 500, minWidth: 110, display: "inline-block" };
  const errStyle = { color: COLOR.danger, fontSize: "12px", marginTop: 4 };

  return (
    <Layout>
      <div className="app-page" style={{ fontFamily: FF }}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 13, color: COLOR.textSoft }}>Settings <span style={{ color: COLOR.blueLt }}>{" > New Time Set"}</span></div>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: `1px solid ${COLOR.border}`, padding: 24 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Time Name <span style={{ color: COLOR.danger }}>*</span></label>
              <div style={{ marginTop: 6 }}>
                <input style={inputStyle} value={timeName} onChange={e => setTimeName(e.target.value)} />
                {errors.name && <div style={errStyle}>{errors.name}</div>}
              </div>
            </div>

            <div>
              <label style={labelStyle}>School <span style={{ color: COLOR.danger }}>*</span></label>
              <div style={{ marginTop: 6 }}>
                {isSuperAdmin ? (
                  <select style={inputStyle} value={schoolId} onChange={e => setSchoolId(e.target.value)}>
                    <option value="">Select School</option>
                    {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                ) : (
                  <input style={{ ...inputStyle, background: "#f1f5f9" }} value={user?.school?.name || ""} disabled />
                )}
                {errors.school && <div style={errStyle}>{errors.school}</div>}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Academic Year <span style={{ color: COLOR.danger }}>*</span></label>
              <div style={{ marginTop: 6 }}>
                <select style={inputStyle} value={academicYear} onChange={e => setAcademicYear(e.target.value)}>
                  <option value="">Select Year</option>
                  {academicYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                {errors.year && <div style={errStyle}>{errors.year}</div>}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button onClick={() => { setEditingSlot(null); setModalOpen(true); }}
              style={{ all: "unset", background: COLOR.blue, color: "#fff", padding: "9px 18px", borderRadius: 8, fontSize: FS, fontWeight: 600, cursor: "pointer" }}>
              New Time Slot
            </button>
          </div>
          {errors.slots && <div style={{ ...errStyle, textAlign: "right", marginBottom: 8 }}>{errors.slots}</div>}

          <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${COLOR.border}` }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FF, fontSize: FS }}>
              <thead>
                <tr style={{ background: COLOR.headBg }}>
                  {["Serial No", "Name", "Start Time", "End Time", "Action"].map((h, i) => (
                    <th key={h} style={{ padding: "12px 16px", fontWeight: 600, color: COLOR.headText, textAlign: i === 4 ? "center" : "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slots.length > 0 ? slots.map((slot, index) => (
                  <tr key={slot._tempId || slot.id} style={{ background: index % 2 === 0 ? COLOR.rowOdd : COLOR.rowEven, borderBottom: `1px solid ${COLOR.border}` }}>
                    <td style={{ padding: "11px 16px", fontWeight: 600 }}>{index + 1}</td>
                    <td style={{ padding: "11px 16px" }}>
                      {slot.name}
                      {slot.is_break && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: COLOR.breakText, background: COLOR.breakBg, padding: "2px 8px", borderRadius: 10 }}>BREAK</span>}
                    </td>
                    <td style={{ padding: "11px 16px", color: COLOR.textMid }}>{fmt(slot.start_time)}</td>
                    <td style={{ padding: "11px 16px", color: COLOR.textMid }}>{fmt(slot.end_time)}</td>
                    <td style={{ padding: "8px 16px", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
                        <IconBtn icon={<EditOutlined />} title="Edit" color={COLOR.editColor} bg={COLOR.editBg} onClick={() => { setEditingSlot(slot); setModalOpen(true); }} />
                        <IconBtn icon={<DeleteOutlined />} title="Remove" color={COLOR.danger} bg={COLOR.dangerBg} onClick={() => removeSlot(slot)} />
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: "32px 16px", color: COLOR.textSoft }}>No time slots added yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 24 }}>
            <button disabled={saving} onClick={handleSave}
              style={{ all: "unset", background: COLOR.blue, color: "#fff", padding: "9px 28px", borderRadius: 8, fontSize: FS, fontWeight: 600, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button onClick={() => navigate(-1)}
              style={{ all: "unset", background: "#fff", border: `1px solid ${COLOR.border}`, color: COLOR.textMid, padding: "9px 28px", borderRadius: 8, fontSize: FS, fontWeight: 600, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>

        <TimeSlotModal
          open={modalOpen}
          initialSlot={editingSlot}
          onClose={() => { setModalOpen(false); setEditingSlot(null); }}
          onSave={handleSlotSave}
        />
      </div>
    </Layout>
  );
};

export default NewTimeSet;
