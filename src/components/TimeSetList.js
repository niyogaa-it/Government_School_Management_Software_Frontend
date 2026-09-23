import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Layout from "./Layout";
import { message, Modal, Descriptions, Spin } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined, ScheduleOutlined, PlusOutlined } from "@ant-design/icons";
import { useFilter } from "./FilterContext";

const COLOR = { blue: "#1e40af", blueLt: "#3b82f6", text: "#1e293b", textMid: "#475569", textSoft: "#64748b", border: "#e2e8f0", rowOdd: "#ffffff", rowEven: "#f8fafc", rowHover: "#eff6ff", headBg: "#1a2236", headText: "#ffffff", danger: "#e21216", dangerBg: "rgba(226,18,22,0.08)", viewBg: "rgba(30,64,175,0.08)", editColor: "#0891b2", editBg: "rgba(8,145,178,0.08)", filterBg: "#eff6ff", filterText: "#1a3c6e", breakBg: "#fff7ed", breakText: "#c2410c" };
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

// Header-bar action button (matches the "New Time Set" pill, reused for "Manage Time Set")
const HeaderBtn = ({ icon, children, onClick, variant = "solid" }) => {
  const [hov, setHov] = useState(false);
  const solid = { bg: COLOR.blueLt, hoverBg: COLOR.blue, color: "#fff", border: "none", shadow: "0 2px 8px rgba(59,130,246,0.28)", hoverShadow: "0 4px 14px rgba(30,64,175,0.35)" };
  const outline = { bg: "#fff", hoverBg: COLOR.editBg, color: COLOR.editColor, border: `1px solid ${COLOR.editColor}`, shadow: "none", hoverShadow: "none" };
  const s = variant === "outline" ? outline : solid;
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        all: "unset", display: "inline-flex", alignItems: "center", gap: 7,
        background: hov ? s.hoverBg : s.bg, color: s.color, border: s.border,
        padding: "9px 20px", borderRadius: 8, fontSize: FS, fontWeight: 600, cursor: "pointer",
        boxShadow: hov ? s.hoverShadow : s.shadow, transition: "all 0.18s",
      }}>
      {icon}{children}
    </button>
  );
};

const TimeSetList = () => {
  const [timeSets, setTimeSets] = useState([]);
  const [selectedTimeSet, setSelectedTimeSet] = useState(null);
  const [selectedTimeSetDetail, setSelectedTimeSetDetail] = useState(null); // includes slots, fetched on view
  const [detailLoading, setDetailLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const isSuperAdmin = role === "superadmin";
  const { selectedSchool, selectedYear, selectedSchoolName } = useFilter();

  useEffect(() => { fetchTimeSets(); }, [selectedSchool, selectedYear, location.pathname]);

  const fetchTimeSets = async () => {
    try {
      let response;
      const schoolId = isSuperAdmin ? (selectedSchool === "all" ? null : selectedSchool) : user?.school?.id;
      if (schoolId && selectedYear) {
        response = await axios.get(`${process.env.REACT_APP_API_URL}/timeset/getTimeSetsBySchoolAndYear/${schoolId}/${selectedYear}`);
      } else if (schoolId) {
        response = await axios.get(`${process.env.REACT_APP_API_URL}/timeset/getTimeSetsBySchool/${schoolId}`);
      } else {
        response = await axios.get(`${process.env.REACT_APP_API_URL}/timeset/getAllTimeSets`);
      }
      let data = response.data.timeSets || [];
      if (isSuperAdmin && selectedSchool === "all" && selectedYear) {
        const normalizedSelected = selectedYear.replace(/\s+/g, "");
        data = data.filter(t => (t.academic_year || "").replace(/\s+/g, "") === normalizedSelected);
      }
      setTimeSets(data);
    } catch { message.error("Failed to fetch time sets"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this time set?")) return;
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/timeset/deleteTimeSet/${id}`);
      message.success("Time Set deleted successfully"); fetchTimeSets();
    } catch { message.error("Failed to delete time set"); }
  };

  // Pulls slot details for the "view" modal. Some endpoints wrap the payload as
  // { timeSet: {...} }, others return the object directly, and the slot array
  // itself can come back under a couple of different keys depending on the
  // endpoint version — so we normalize all of that here instead of assuming
  // one exact shape (this is what was causing the slots to not show up).
  const handleView = async (timeSet) => {
    setSelectedTimeSet(timeSet);
    setSelectedTimeSetDetail(null);
    setIsModalVisible(true);
    setDetailLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/timeset/getTimeSetById/${timeSet.id}`);
      const detail = res.data?.timeSet || res.data || null;
      setSelectedTimeSetDetail(detail);
    } catch {
      setSelectedTimeSetDetail(null);
      message.error("Failed to load time slot details");
    } finally {
      setDetailLoading(false);
    }
  };

  const getSlots = () => {
    const detailSlots =
      selectedTimeSetDetail?.TimeSlots ||
      selectedTimeSetDetail?.timeSlots ||
      selectedTimeSetDetail?.slots ||
      [];
    // Fall back to whatever the list row already carried, in case the detail
    // endpoint came back empty for some reason.
    const fallbackSlots = selectedTimeSet?.TimeSlots || selectedTimeSet?.timeSlots || [];
    const slots = detailSlots.length > 0 ? detailSlots : fallbackSlots;
    return [...slots].sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
  };

  const fmt = (t) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
  };

  const showFilter = selectedSchool !== "all" || selectedYear;
  const cols = ["S.No", "School", "Academic Year", "Time Name", "Actions"];
  const slotsToShow = getSlots();

  return (
    <Layout>
      <div className="app-page" style={{ fontFamily: FF }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLOR.text, margin: 0, letterSpacing: "-0.3px" }}>Time Set List</h1>
          <div style={{ width: 40, height: 3, background: COLOR.blueLt, borderRadius: 2, marginTop: 6 }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          {showFilter && (
            <div style={{ fontSize: "13px", color: COLOR.filterText, background: COLOR.filterBg, padding: "6px 14px", borderRadius: 6, fontWeight: 500 }}>
              Showing: {selectedSchool !== "all" ? selectedSchoolName : "All Schools"}{selectedYear ? ` | ${selectedYear}` : ""}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
            <HeaderBtn icon={<ScheduleOutlined />} variant="outline" onClick={() => navigate("/manage-time-set")}>
              Manage Time Set
            </HeaderBtn>
            <HeaderBtn icon={<PlusOutlined />} onClick={() => navigate("/new-time-set")}>
              New Time Set
            </HeaderBtn>
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
                {timeSets.length > 0 ? timeSets.map((ts, index) => (
                  <tr key={ts.id} onMouseEnter={() => setHoveredRow(ts.id)} onMouseLeave={() => setHoveredRow(null)}
                    style={{ background: hoveredRow === ts.id ? COLOR.rowHover : index % 2 === 0 ? COLOR.rowOdd : COLOR.rowEven, transition: "background 0.12s", borderBottom: `1px solid ${COLOR.border}` }}>
                    <td style={{ padding: "11px 16px", color: COLOR.text, fontWeight: 600 }}>{index + 1}</td>
                    <td style={{ padding: "11px 16px", color: COLOR.textMid }}>{isSuperAdmin ? (ts.School?.name || selectedSchoolName || "N/A") : (user.school?.name || "N/A")}</td>
                    <td style={{ padding: "11px 16px", color: COLOR.textMid }}>{ts.academic_year || "N/A"}</td>
                    <td style={{ padding: "11px 16px", color: COLOR.text, fontWeight: 500 }}>{ts.name}</td>
                    <td style={{ padding: "8px 16px", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
                        <IconBtn icon={<EyeOutlined />} title="View Time Set" color={COLOR.blue} bg={COLOR.viewBg} onClick={() => handleView(ts)} />
                        <IconBtn icon={<EditOutlined />} title="Edit Time Set" color={COLOR.editColor} bg={COLOR.editBg} onClick={() => navigate(`/edit-time-set/${ts.id}`)} />
                        {isSuperAdmin && <IconBtn icon={<DeleteOutlined />} title="Delete Time Set" color={COLOR.danger} bg={COLOR.dangerBg} onClick={() => handleDelete(ts.id)} />}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: "40px 16px", color: COLOR.textSoft, fontSize: FS }}>No time sets found{selectedYear ? ` for ${selectedYear}` : ""}.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedTimeSet && (
          <Modal title={<span style={{ fontFamily: FF, fontWeight: 700, fontSize: 16, color: COLOR.text }}>Time Set Details</span>}
            open={isModalVisible} onCancel={() => { setIsModalVisible(false); setSelectedTimeSet(null); setSelectedTimeSetDetail(null); }} footer={null} width={560}>
            <Descriptions bordered column={1} size="small"
              labelStyle={{ fontWeight: 600, color: COLOR.textMid, fontFamily: FF, fontSize: FS, background: "#f8fafc" }}
              contentStyle={{ fontFamily: FF, fontSize: FS, color: COLOR.text }}>
              <Descriptions.Item label="School">{isSuperAdmin ? (selectedTimeSetDetail?.School?.name || selectedSchoolName || "N/A") : (user.school?.name || "N/A")}</Descriptions.Item>
              <Descriptions.Item label="Academic Year">{selectedTimeSet.academic_year || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Time Name">{selectedTimeSet.name}</Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 16, fontWeight: 600, fontFamily: FF, fontSize: FS, color: COLOR.text }}>Time Slots</div>
            <div style={{ marginTop: 8, border: `1px solid ${COLOR.border}`, borderRadius: 8, overflow: "hidden" }}>
              {detailLoading ? (
                <div style={{ padding: "24px 12px", textAlign: "center" }}><Spin /></div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FF, fontSize: FS }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th style={{ padding: "8px 12px", textAlign: "left", color: COLOR.textMid, fontWeight: 600 }}>Name</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", color: COLOR.textMid, fontWeight: 600 }}>Start</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", color: COLOR.textMid, fontWeight: 600 }}>End</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slotsToShow.length > 0 ? slotsToShow.map((slot, i) => (
                      <tr key={slot.id || i} style={{ borderTop: `1px solid ${COLOR.border}` }}>
                        <td style={{ padding: "8px 12px" }}>
                          {slot.name}
                          {slot.is_break && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: COLOR.breakText, background: COLOR.breakBg, padding: "2px 8px", borderRadius: 10 }}>BREAK</span>}
                        </td>
                        <td style={{ padding: "8px 12px", color: COLOR.textMid }}>{fmt(slot.start_time)}</td>
                        <td style={{ padding: "8px 12px", color: COLOR.textMid }}>{fmt(slot.end_time)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={3} style={{ padding: "14px 12px", textAlign: "center", color: COLOR.textSoft }}>No time slots.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </Modal>
        )}
      </div>
    </Layout>
  );
};

export default TimeSetList;