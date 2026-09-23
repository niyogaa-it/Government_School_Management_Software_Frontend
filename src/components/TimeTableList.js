import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import moment from "moment";
import Layout from "./Layout";
import { message, Modal, Descriptions, Empty } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useFilter } from "./FilterContext";
import TimeTableEntries from "./TimeTableEntries";

const COLOR = {
  blue: "#1e40af", blueLt: "#3b82f6", text: "#1e293b", textMid: "#475569", textSoft: "#64748b",
  border: "#e2e8f0", rowOdd: "#ffffff", rowEven: "#f8fafc", rowHover: "#eff6ff",
  headBg: "#1a2236", headText: "#ffffff", danger: "#e21216", dangerBg: "rgba(226,18,22,0.08)",
  viewBg: "rgba(30,64,175,0.08)", editColor: "#0891b2", editBg: "rgba(8,145,178,0.08)",
  filterBg: "#eff6ff", filterText: "#1a3c6e", greenBg: "#ecfdf3", greenText: "#15803d",
};
const FF = "'Segoe UI', system-ui, sans-serif";
const FS = "13.5px";

const IconBtn = ({ icon, title, color, bg, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <button title={title} onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ all: "unset", width: 32, height: 32, borderRadius: 7, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16, transition: "all 0.15s", color: hov ? color : COLOR.textMid, background: hov ? bg : "transparent" }}>
      {icon}
    </button>
  );
};

const HeaderBtn = ({ icon, children, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        all: "unset", display: "inline-flex", alignItems: "center", gap: 7,
        background: hov ? COLOR.blue : COLOR.blueLt, color: "#fff", border: "none",
        padding: "9px 20px", borderRadius: 8, fontSize: FS, fontWeight: 600, cursor: "pointer",
        boxShadow: hov ? "0 4px 14px rgba(30,64,175,0.35)" : "0 2px 8px rgba(59,130,246,0.28)", transition: "all 0.18s",
      }}>
      {icon}{children}
    </button>
  );
};

const fmtDate = (d) => {
  if (!d) return "N/A";
  const m = moment(d);
  return m.isValid() ? m.format("DD/MM/YYYY") : d;
};

// A timetable is "active" while today falls inside its start/end range —
// surfaced as a small status pill so the list makes it obvious at a glance
// which timetable is currently in effect for a school.
const statusOf = (t) => {
  const today = moment().startOf("day");
  const start = moment(t.start_date);
  const end = moment(t.end_date);
  if (today.isBefore(start, "day")) return { label: "Upcoming", bg: "#fff7ed", text: "#9a3412" };
  if (today.isAfter(end, "day")) return { label: "Expired", bg: "#f1f5f9", text: "#475569" };
  return { label: "Active", bg: COLOR.greenBg, text: COLOR.greenText };
};

const TimeTableList = () => {
  const [timeTables, setTimeTables] = useState([]);
  const [selected, setSelected] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);

  // { schoolId, schoolName, academicYear, timeTableId, readOnly } | null
  const [entriesModal, setEntriesModal] = useState(null);

  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const isSuperAdmin = role === "superadmin";
  const { selectedSchool, selectedYear, selectedSchoolName } = useFilter();

  useEffect(() => { fetchTimeTables(); }, [selectedSchool, selectedYear, location.pathname]);

  const fetchTimeTables = async () => {
    try {
      let res;
      const schoolId = isSuperAdmin ? (selectedSchool === "all" ? null : selectedSchool) : user?.school?.id;
      if (schoolId && selectedYear) {
        // No dedicated by-school+year list endpoint exists yet — reuse the
        // header lookup and filter client-side, same shape as the others.
        res = await axios.get(`${process.env.REACT_APP_API_URL}/timetable/getTimeTablesForSchool/${schoolId}/${selectedYear}`);
      } else if (schoolId) {
        res = await axios.get(`${process.env.REACT_APP_API_URL}/timetable/getTimeTablesBySchool/${schoolId}`);
      } else {
        res = await axios.get(`${process.env.REACT_APP_API_URL}/timetable/getAllTimeTables`);
      }
      let data = res.data.timeTables || [];
      if (isSuperAdmin && selectedSchool === "all" && selectedYear) data = data.filter(t => t.academic_year === selectedYear);
      setTimeTables(data);
    } catch { message.error("Failed to fetch timetables"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this timetable? All periods assigned under it will be removed too.")) return;
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/timetable/deleteTimeTable/${id}`);
      message.success("Timetable deleted successfully"); fetchTimeTables();
    } catch { message.error("Failed to delete timetable"); }
  };

  const schoolNameFor = (t) => (isSuperAdmin ? (t.School?.name || selectedSchoolName || "N/A") : (user.school?.name || "N/A"));

  const openNew = () => {
    // Pre-fill from whatever's already chosen in the top filter (or the
    // user's own school), but School/Academic Year are pickable right
    // inside the modal too — this is just a convenience default now.
    const schoolId = isSuperAdmin ? (selectedSchool !== "all" ? selectedSchool : null) : user?.school?.id;
    const schoolName = isSuperAdmin ? (selectedSchool !== "all" ? selectedSchoolName : null) : user?.school?.name;
    setEntriesModal({ schoolId, schoolName, academicYear: selectedYear || "", timeTableId: null, readOnly: false, lockSchool: !isSuperAdmin });
  };

  const openEdit = (t) => {
    setEntriesModal({ schoolId: t.school_id, schoolName: schoolNameFor(t), academicYear: t.academic_year, timeTableId: t.id, readOnly: false, lockSchool: true });
  };

  const openView = (t) => {
    setEntriesModal({ schoolId: t.school_id, schoolName: schoolNameFor(t), academicYear: t.academic_year, timeTableId: t.id, readOnly: true, lockSchool: true });
  };

  const showFilter = selectedSchool !== "all" || selectedYear;
  const cols = ["S.No", "School", "Academic Year", "Period", "Status", "Actions"];

  return (
    <Layout>
      <div className="app-page" style={{ fontFamily: FF }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLOR.text, margin: 0, letterSpacing: "-0.3px" }}>Time Table</h1>
          <div style={{ width: 40, height: 3, background: COLOR.blueLt, borderRadius: 2, marginTop: 6 }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          {showFilter && (
            <div style={{ fontSize: "13px", color: COLOR.filterText, background: COLOR.filterBg, padding: "6px 14px", borderRadius: 6, fontWeight: 500 }}>
              Showing: {selectedSchool !== "all" ? selectedSchoolName : "All Schools"}{selectedYear ? ` | ${selectedYear}` : ""}
            </div>
          )}
          <div style={{ marginLeft: "auto" }}>
            <HeaderBtn icon={<PlusOutlined />} onClick={openNew}>New Timetable</HeaderBtn>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", overflow: "hidden", border: `1px solid ${COLOR.border}` }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FF, fontSize: FS }}>
              <thead>
                <tr style={{ background: COLOR.headBg }}>
                  {cols.map((h, i) => <th key={h} style={{ padding: "13px 16px", fontWeight: 600, fontSize: "13px", color: COLOR.headText, textAlign: i === cols.length - 1 ? "center" : "left", whiteSpace: "nowrap", letterSpacing: "0.2px" }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {timeTables.length > 0 ? timeTables.map((t, index) => {
                  const st = statusOf(t);
                  return (
                    <tr key={t.id} onMouseEnter={() => setHoveredRow(t.id)} onMouseLeave={() => setHoveredRow(null)}
                      style={{ background: hoveredRow === t.id ? COLOR.rowHover : index % 2 === 0 ? COLOR.rowOdd : COLOR.rowEven, transition: "background 0.12s", borderBottom: `1px solid ${COLOR.border}` }}>
                      <td style={{ padding: "11px 16px", color: COLOR.text, fontWeight: 600 }}>{index + 1}</td>
                      <td style={{ padding: "11px 16px", color: COLOR.textMid }}>{schoolNameFor(t)}</td>
                      <td style={{ padding: "11px 16px", color: COLOR.textMid }}>{t.academic_year || "N/A"}</td>
                      <td style={{ padding: "11px 16px", color: COLOR.text, fontWeight: 500 }}>{fmtDate(t.start_date)} — {fmtDate(t.end_date)}</td>
                      <td style={{ padding: "11px 16px" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: st.text, background: st.bg, padding: "3px 10px", borderRadius: 10 }}>{st.label}</span>
                      </td>
                      <td style={{ padding: "8px 16px", textAlign: "center" }}>
                        <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
                          <IconBtn icon={<EyeOutlined />} title="View Timetable" color={COLOR.blue} bg={COLOR.viewBg} onClick={() => { setSelected(t); setIsModalVisible(true); }} />
                          <IconBtn icon={<EditOutlined />} title="Edit Timetable" color={COLOR.editColor} bg={COLOR.editBg} onClick={() => openEdit(t)} />
                          {isSuperAdmin && <IconBtn icon={<DeleteOutlined />} title="Delete Timetable" color={COLOR.danger} bg={COLOR.dangerBg} onClick={() => handleDelete(t.id)} />}
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={cols.length} style={{ textAlign: "center", padding: "40px 16px", color: COLOR.textSoft, fontSize: FS }}>
                    <Empty description={`No timetables found${selectedYear ? ` for ${selectedYear}` : ""}.`} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selected && (
          <Modal title={<span style={{ fontFamily: FF, fontWeight: 700, fontSize: 16, color: COLOR.text }}>Timetable Summary</span>}
            open={isModalVisible} onCancel={() => setIsModalVisible(false)} footer={null}>
            <Descriptions bordered column={1} size="small"
              labelStyle={{ fontWeight: 600, color: COLOR.textMid, fontFamily: FF, fontSize: FS, background: "#f8fafc" }}
              contentStyle={{ fontFamily: FF, fontSize: FS, color: COLOR.text }}>
              <Descriptions.Item label="School">{schoolNameFor(selected)}</Descriptions.Item>
              <Descriptions.Item label="Academic Year">{selected.academic_year || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Period">{fmtDate(selected.start_date)} — {fmtDate(selected.end_date)}</Descriptions.Item>
              <Descriptions.Item label="Status">{statusOf(selected).label}</Descriptions.Item>
            </Descriptions>
            <div style={{ textAlign: "right", marginTop: 14 }}>
              <button onClick={() => { setIsModalVisible(false); openView(selected); }}
                style={{ all: "unset", cursor: "pointer", color: COLOR.blue, fontWeight: 600, fontSize: FS }}>
                Open full timetable →
              </button>
            </div>
          </Modal>
        )}

        {entriesModal && (
          <TimeTableEntries
            schoolId={entriesModal.schoolId}
            schoolName={entriesModal.schoolName}
            academicYear={entriesModal.academicYear}
            initialTimeTableId={entriesModal.timeTableId}
            readOnly={entriesModal.readOnly}
            lockSchool={entriesModal.lockSchool}
            onClose={() => { setEntriesModal(null); fetchTimeTables(); }}
          />
        )}
      </div>
    </Layout>
  );
};

export default TimeTableList;