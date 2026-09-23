import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { message } from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import Layout from "./Layout";
import TimeSlotModal from "./TimeSlotModal";
import moment from "moment";

const COLOR = { blue: "#1e40af", blueLt: "#3b82f6", text: "#1e293b", textMid: "#475569", textSoft: "#64748b", border: "#e2e8f0", rowOdd: "#ffffff", rowEven: "#f8fafc", headBg: "#1a2236", headText: "#ffffff", danger: "#e21216", dangerBg: "rgba(226,18,22,0.08)", editColor: "#0891b2", editBg: "rgba(8,145,178,0.08)", breakBg: "#fff7ed", breakText: "#c2410c" };
const FF = "'Segoe UI', system-ui, sans-serif";
const FS = "13.5px";

const IconBtn = ({ icon, title, color, bg, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <button title={title} onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ all: "unset", width: 30, height: 30, borderRadius: 7, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 15, transition: "all 0.15s", color: hov ? color : COLOR.textMid, background: hov ? bg : "transparent" }}>
      {icon}
    </button>
  );
};

// Edit an EXISTING, already-saved Time Set: rename the header, and add /
// edit / delete individual Time Slots — each action calls the backend
// immediately (there's no separate batch "Save" for the slot table, since
// these rows already exist in the DB, unlike NewTimeSet.js which only
// holds slots locally until the whole set is first created).
const EditTimeSet = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [timeName, setTimeName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [slots, setSlots] = useState([]);
  const [nameError, setNameError] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);

  const fetchTimeSet = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${process.env.REACT_APP_API_URL}/timeset/getTimeSetById/${id}`);
      const ts = data.timeSet;
      setTimeName(ts.name || "");
      setSchoolName(ts.School?.name || "");
      setAcademicYear(ts.academic_year || "");
      const rawSlots = ts.TimeSlots || ts.timeSlots || ts.slots || [];
      setSlots([...rawSlots].sort((a, b) => (a.serial_no ?? 0) - (b.serial_no ?? 0)));
    } catch {
      message.error("Failed to load Time Set");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTimeSet(); }, [id]);

  const fmt = (t) => (t ? moment(t, "HH:mm").format("h:mm A") : "");

  const handleSaveName = async () => {
    if (!timeName.trim()) { setNameError("Name is required"); return; }
    setNameError("");
    setSavingName(true);
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/timeset/updateTimeSet/${id}`, { name: timeName.trim() });
      message.success("Time Set name updated");
    } catch (err) {
      message.error(err?.response?.data?.error || "Failed to update Time Set name");
    } finally {
      setSavingName(false);
    }
  };

  // Called by TimeSlotModal on Save — persists immediately (add or update)
  // then refreshes the list from the server so serial numbers / sort stay correct.
  const handleSlotSave = async (slot) => {
    try {
      if (slot.id) {
        await axios.put(`${process.env.REACT_APP_API_URL}/timeset/updateTimeSlot/${slot.id}`, {
          name: slot.name,
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_break: slot.is_break,
        });
        message.success("Time Slot updated successfully");
      } else {
        await axios.post(`${process.env.REACT_APP_API_URL}/timeset/addTimeSlot`, {
          time_set_id: id,
          name: slot.name,
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_break: slot.is_break,
        });
        message.success("Time Slot added successfully");
      }
      setModalOpen(false);
      setEditingSlot(null);
      fetchTimeSet();
    } catch (err) {
      message.error(err?.response?.data?.error || "Failed to save Time Slot");
    }
  };

  const handleDeleteSlot = async (slot) => {
    if (!window.confirm(`Delete "${slot.name}"?`)) return;
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/timeset/deleteTimeSlot/${slot.id}`);
      message.success("Time Slot deleted successfully");
      fetchTimeSet();
    } catch {
      message.error("Failed to delete Time Slot");
    }
  };

  const inputStyle = { width: "100%", maxWidth: 340, padding: "8px 12px", borderRadius: 6, border: `1px solid ${COLOR.border}`, fontSize: FS, fontFamily: FF, outline: "none" };
  const labelStyle = { fontSize: FS, color: COLOR.text, fontWeight: 500, minWidth: 110, display: "inline-block" };
  const errStyle = { color: COLOR.danger, fontSize: "12px", marginTop: 4 };
  const readOnlyStyle = { ...inputStyle, background: "#f1f5f9" };

  if (loading) {
    return <Layout><div style={{ textAlign: "center", padding: 80, fontFamily: FF, color: COLOR.textMid }}>Loading...</div></Layout>;
  }

  return (
    <Layout>
      <div className="app-page" style={{ fontFamily: FF }}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 13, color: COLOR.textSoft }}>Settings <span style={{ color: COLOR.blueLt }}>{" > Edit Time Set"}</span></div>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: `1px solid ${COLOR.border}`, padding: 24 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginBottom: 20, alignItems: "flex-start" }}>
            <div>
              <label style={labelStyle}>Time Name <span style={{ color: COLOR.danger }}>*</span></label>
              <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div>
                  <input style={inputStyle} value={timeName} onChange={e => setTimeName(e.target.value)} />
                  {nameError && <div style={errStyle}>{nameError}</div>}
                </div>
                <button onClick={handleSaveName} disabled={savingName}
                  style={{ all: "unset", padding: "8px 16px", borderRadius: 6, background: COLOR.blue, color: "#fff", fontSize: FS, fontWeight: 600, cursor: savingName ? "default" : "pointer", opacity: savingName ? 0.7 : 1, whiteSpace: "nowrap" }}>
                  {savingName ? "Saving..." : "Save Name"}
                </button>
              </div>
            </div>

            <div>
              <label style={labelStyle}>School</label>
              <div style={{ marginTop: 6 }}>
                <input style={readOnlyStyle} value={schoolName} disabled />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Academic Year</label>
              <div style={{ marginTop: 6 }}>
                <input style={readOnlyStyle} value={academicYear} disabled />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button onClick={() => { setEditingSlot(null); setModalOpen(true); }}
              style={{ all: "unset", display: "inline-flex", alignItems: "center", gap: 7, background: COLOR.blue, color: "#fff", padding: "9px 18px", borderRadius: 8, fontSize: FS, fontWeight: 600, cursor: "pointer" }}>
              <PlusOutlined /> New Time Slot
            </button>
          </div>

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
                  <tr key={slot.id} style={{ background: index % 2 === 0 ? COLOR.rowOdd : COLOR.rowEven, borderBottom: `1px solid ${COLOR.border}` }}>
                    <td style={{ padding: "11px 16px", fontWeight: 600 }}>{slot.serial_no ?? index + 1}</td>
                    <td style={{ padding: "11px 16px" }}>
                      {slot.name}
                      {slot.is_break && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: COLOR.breakText, background: COLOR.breakBg, padding: "2px 8px", borderRadius: 10 }}>BREAK</span>}
                    </td>
                    <td style={{ padding: "11px 16px", color: COLOR.textMid }}>{fmt(slot.start_time)}</td>
                    <td style={{ padding: "11px 16px", color: COLOR.textMid }}>{fmt(slot.end_time)}</td>
                    <td style={{ padding: "8px 16px", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
                        <IconBtn icon={<EditOutlined />} title="Edit" color={COLOR.editColor} bg={COLOR.editBg} onClick={() => { setEditingSlot(slot); setModalOpen(true); }} />
                        <IconBtn icon={<DeleteOutlined />} title="Delete" color={COLOR.danger} bg={COLOR.dangerBg} onClick={() => handleDeleteSlot(slot)} />
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
            <button onClick={() => navigate("/timesetlist")}
              style={{ all: "unset", background: "#fff", border: `1px solid ${COLOR.border}`, color: COLOR.textMid, padding: "9px 28px", borderRadius: 8, fontSize: FS, fontWeight: 600, cursor: "pointer" }}>
              Back to Time Set List
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

export default EditTimeSet;
