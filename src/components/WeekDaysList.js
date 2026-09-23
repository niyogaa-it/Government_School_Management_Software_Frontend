import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Layout from "./Layout";
import { message, Modal, Descriptions, Spin } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useFilter } from "./FilterContext";

const COLOR = { blue: "#1e40af", blueLt: "#3b82f6", text: "#1e293b", textMid: "#475569", textSoft: "#64748b", border: "#e2e8f0", rowOdd: "#ffffff", rowEven: "#f8fafc", rowHover: "#eff6ff", headBg: "#1a2236", headText: "#ffffff", danger: "#e21216", dangerBg: "rgba(226,18,22,0.08)", viewBg: "rgba(30,64,175,0.08)", editColor: "#0891b2", editBg: "rgba(8,145,178,0.08)", filterBg: "#eff6ff", filterText: "#1a3c6e" };
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
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString("en-GB"); // dd/mm/yyyy, matches the "10/08/2026" style in the form
};

const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
};

const DAY_ORDER = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const WeekDaysList = () => {
  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const isSuperAdmin = role === "superadmin";
  const { selectedSchool, selectedYear, selectedSchoolName } = useFilter();

  useEffect(() => { fetchSchedules(); }, [selectedSchool, selectedYear, location.pathname]);

  const fetchSchedules = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/weekday/getAllWeekDaySchedules`);
      let data = res.data.schedules || [];

      const normalizedSelectedYear = selectedYear ? selectedYear.replace(/\s+/g, "") : null;
      if (!isSuperAdmin) {
        data = data.filter(s => String(s.school_id) === String(user?.school?.id));
      } else if (selectedSchool !== "all") {
        data = data.filter(s => String(s.school_id) === String(selectedSchool));
      }
      if (normalizedSelectedYear) {
        data = data.filter(s => (s.academic_year || "").replace(/\s+/g, "") === normalizedSelectedYear);
      }
      setSchedules(data);
    } catch { message.error("Failed to fetch week day schedules"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this schedule?")) return;
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/weekday/deleteWeekDaySchedule/${id}`);
      message.success("Schedule deleted successfully"); fetchSchedules();
    } catch { message.error("Failed to delete schedule"); }
  };

  const handleView = async (schedule) => {
    setSelectedSchedule(schedule);
    setSelectedDetail(null);
    setIsModalVisible(true);
    setDetailLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/weekday/getWeekDayScheduleById/${schedule.id}`);
      setSelectedDetail(res.data?.schedule || null);
    } catch {
      setSelectedDetail(null);
      message.error("Failed to load schedule details");
    } finally {
      setDetailLoading(false);
    }
  };

  const getDays = () => {
    const days = selectedDetail?.days || [];
    return [...days].sort((a, b) => DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week));
  };

  const showFilter = selectedSchool !== "all" || selectedYear;
  const cols = ["S.No", "School", "Academic Year", "Grade", "Section", "Applicable From", "Actions"];
  const daysToShow = getDays();

  return (
    <Layout>
      <div className="app-page" style={{ fontFamily: FF }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLOR.text, margin: 0, letterSpacing: "-0.3px" }}>Week Days List</h1>
          <div style={{ width: 40, height: 3, background: COLOR.blueLt, borderRadius: 2, marginTop: 6 }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          {showFilter && (
            <div style={{ fontSize: "13px", color: COLOR.filterText, background: COLOR.filterBg, padding: "6px 14px", borderRadius: 6, fontWeight: 500 }}>
              Showing: {selectedSchool !== "all" ? selectedSchoolName : "All Schools"}{selectedYear ? ` | ${selectedYear}` : ""}
            </div>
          )}
          <div style={{ marginLeft: "auto" }}>
            <HeaderBtn icon={<PlusOutlined />} onClick={() => navigate("/new-week-days")}>
              New Week Days
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
                {schedules.length > 0 ? schedules.map((s, index) => (
                  <tr key={s.id} onMouseEnter={() => setHoveredRow(s.id)} onMouseLeave={() => setHoveredRow(null)}
                    style={{ background: hoveredRow === s.id ? COLOR.rowHover : index % 2 === 0 ? COLOR.rowOdd : COLOR.rowEven, transition: "background 0.12s", borderBottom: `1px solid ${COLOR.border}` }}>
                    <td style={{ padding: "11px 16px", color: COLOR.text, fontWeight: 600 }}>{index + 1}</td>
                    <td style={{ padding: "11px 16px", color: COLOR.textMid }}>{isSuperAdmin ? (s.School?.name || "N/A") : (user.school?.name || "N/A")}</td>
                    <td style={{ padding: "11px 16px", color: COLOR.textMid }}>{s.academic_year || "N/A"}</td>
                    <td style={{ padding: "11px 16px", color: COLOR.textMid }}>{s.Grade?.grade || "N/A"}</td>
                    <td style={{ padding: "11px 16px", color: COLOR.text, fontWeight: 500 }}>{s.Section?.sectionName || "N/A"}</td>
                    <td style={{ padding: "11px 16px", color: COLOR.textMid }}>{fmtDate(s.applicable_date)}</td>
                    <td style={{ padding: "8px 16px", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
                        <IconBtn icon={<EyeOutlined />} title="View Schedule" color={COLOR.blue} bg={COLOR.viewBg} onClick={() => handleView(s)} />
                        <IconBtn icon={<EditOutlined />} title="Edit Schedule" color={COLOR.editColor} bg={COLOR.editBg} onClick={() => navigate(`/edit-week-days/${s.id}`)} />
                        {isSuperAdmin && <IconBtn icon={<DeleteOutlined />} title="Delete Schedule" color={COLOR.danger} bg={COLOR.dangerBg} onClick={() => handleDelete(s.id)} />}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: "40px 16px", color: COLOR.textSoft, fontSize: FS }}>No week day schedules found{selectedYear ? ` for ${selectedYear}` : ""}.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedSchedule && (
          <Modal title={<span style={{ fontFamily: FF, fontWeight: 700, fontSize: 16, color: COLOR.text }}>Week Days Schedule</span>}
            open={isModalVisible} onCancel={() => { setIsModalVisible(false); setSelectedSchedule(null); setSelectedDetail(null); }} footer={null} width={560}>
            <Descriptions bordered column={1} size="small"
              labelStyle={{ fontWeight: 600, color: COLOR.textMid, fontFamily: FF, fontSize: FS, background: "#f8fafc" }}
              contentStyle={{ fontFamily: FF, fontSize: FS, color: COLOR.text }}>
              <Descriptions.Item label="School">{isSuperAdmin ? (selectedDetail?.School?.name || "N/A") : (user.school?.name || "N/A")}</Descriptions.Item>
              <Descriptions.Item label="Academic Year">{selectedSchedule.academic_year || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Grade">{selectedDetail?.Grade?.grade || selectedSchedule.Grade?.grade || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Section">{selectedDetail?.Section?.sectionName || selectedSchedule.Section?.sectionName || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Applicable From">{fmtDate(selectedSchedule.applicable_date)}</Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 16, fontWeight: 600, fontFamily: FF, fontSize: FS, color: COLOR.text }}>Days & Time Sets</div>
            <div style={{ marginTop: 8, border: `1px solid ${COLOR.border}`, borderRadius: 8, overflow: "hidden" }}>
              {detailLoading ? (
                <div style={{ padding: "24px 12px", textAlign: "center" }}><Spin /></div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FF, fontSize: FS }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th style={{ padding: "8px 12px", textAlign: "left", color: COLOR.textMid, fontWeight: 600 }}>Day</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", color: COLOR.textMid, fontWeight: 600 }}>Time Set</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daysToShow.length > 0 ? daysToShow.map((d, i) => (
                      <tr key={d.id || i} style={{ borderTop: `1px solid ${COLOR.border}` }}>
                        <td style={{ padding: "8px 12px" }}>{d.day_of_week}</td>
                        <td style={{ padding: "8px 12px", color: COLOR.textMid }}>{d.TimeSet?.name || "N/A"}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={2} style={{ padding: "14px 12px", textAlign: "center", color: COLOR.textSoft }}>No days assigned.</td></tr>
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

export default WeekDaysList;