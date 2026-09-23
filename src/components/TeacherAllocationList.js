import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { message, Modal, Descriptions, Tag, Empty } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import Layout from "./Layout";
import { useFilter } from "./FilterContext";

const COLOR = {
  blue: "#1e40af", blueLt: "#3b82f6", text: "#1e293b", textMid: "#475569", textSoft: "#64748b",
  border: "#e2e8f0", rowOdd: "#ffffff", rowEven: "#f8fafc", rowHover: "#eff6ff",
  headBg: "#1a2236", headText: "#ffffff", danger: "#e21216", dangerBg: "rgba(226,18,22,0.08)",
  viewBg: "rgba(30,64,175,0.08)", editColor: "#0891b2", editBg: "rgba(8,145,178,0.08)",
  filterBg: "#eff6ff", filterText: "#1a3c6e", orange: "#9a3412", orangeBg: "#ffedd5",
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

const TeacherAllocationList = () => {
  const [allocations, setAllocations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const isSuperAdmin = role === "superadmin";
  const { selectedSchool, selectedYear, selectedSchoolName } = useFilter();

  useEffect(() => { fetchAllocations(); }, [selectedSchool, selectedYear, location.pathname]);

  const fetchAllocations = async () => {
    try {
      let res;
      const schoolId = isSuperAdmin ? (selectedSchool === "all" ? null : selectedSchool) : user?.school?.id;
      if (schoolId && selectedYear) {
        res = await axios.get(`${process.env.REACT_APP_API_URL}/teacherAllocation/getAllocationsBySchoolAndYear/${schoolId}/${selectedYear}`);
      } else if (schoolId) {
        res = await axios.get(`${process.env.REACT_APP_API_URL}/teacherAllocation/getAllocationsBySchool/${schoolId}`);
      } else {
        res = await axios.get(`${process.env.REACT_APP_API_URL}/teacherAllocation/getAllAllocations`);
      }
      let data = res.data.allocations || [];
      if (isSuperAdmin && selectedSchool === "all" && selectedYear) data = data.filter(a => a.academic_year === selectedYear);
      setAllocations(data);
    } catch { message.error("Failed to fetch teacher allocations"); }
  };

  const handleDelete = async (section_id) => {
    if (!window.confirm("Clear every Primary/Secondary teacher saved for this class & section?")) return;
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/teacherAllocation/deleteAllocation/${section_id}`);
      message.success("Teacher allocation cleared successfully"); fetchAllocations();
    } catch { message.error("Failed to clear teacher allocation"); }
  };

  const openEdit = (a) => {
    navigate(`/create-section-subject-teacher-map?section_id=${a.section_id}&school_id=${a.School?.id}&grade_id=${a.Grade?.id}&academic_year=${a.academic_year}&mode=edit`);
  };
  const openView = (a) => {
    navigate(`/create-section-subject-teacher-map?section_id=${a.section_id}&school_id=${a.School?.id}&grade_id=${a.Grade?.id}&academic_year=${a.academic_year}&mode=view`);
  };

  const showFilter = selectedSchool !== "all" || selectedYear;
  const cols = ["S.No", "School", "Academic Year", "Class", "Section", "Subjects", "Teachers Assigned", "Actions"];

  return (
    <Layout>
      <div className="app-page" style={{ fontFamily: FF }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLOR.text, margin: 0, letterSpacing: "-0.3px" }}>Teacher Allocation</h1>
          <div style={{ width: 40, height: 3, background: COLOR.blueLt, borderRadius: 2, marginTop: 6 }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          {showFilter && (
            <div style={{ fontSize: "13px", color: COLOR.filterText, background: COLOR.filterBg, padding: "6px 14px", borderRadius: 6, fontWeight: 500 }}>
              Showing: {selectedSchool !== "all" ? selectedSchoolName : "All Schools"}{selectedYear ? ` | ${selectedYear}` : ""}
            </div>
          )}
          <button onClick={() => navigate("/create-section-subject-teacher-map")}
            onMouseEnter={e => { e.currentTarget.style.background = COLOR.blue; e.currentTarget.style.boxShadow = "0 4px 14px rgba(30,64,175,0.35)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = COLOR.blueLt; e.currentTarget.style.boxShadow = "0 2px 8px rgba(59,130,246,0.28)"; }}
            style={{ all: "unset", display: "inline-flex", alignItems: "center", gap: 7, background: COLOR.blueLt, color: "#fff", padding: "9px 20px", borderRadius: 8, fontSize: FS, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(59,130,246,0.28)", transition: "all 0.18s" }}>
            <PlusOutlined /> Allocate Teachers
          </button>
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
                {allocations.length > 0 ? allocations.map((a, index) => (
                  <tr key={a.section_id} onMouseEnter={() => setHoveredRow(a.section_id)} onMouseLeave={() => setHoveredRow(null)}
                    style={{ background: hoveredRow === a.section_id ? COLOR.rowHover : index % 2 === 0 ? COLOR.rowOdd : COLOR.rowEven, transition: "background 0.12s", borderBottom: `1px solid ${COLOR.border}` }}>
                    <td style={{ padding: "11px 16px", color: COLOR.text, fontWeight: 600 }}>{index + 1}</td>
                    <td style={{ padding: "11px 16px", color: COLOR.textMid }}>{isSuperAdmin ? (a.School?.name || selectedSchoolName || "N/A") : (user.school?.name || "N/A")}</td>
                    <td style={{ padding: "11px 16px", color: COLOR.textMid }}>{a.academic_year || "N/A"}</td>
                    <td style={{ padding: "11px 16px", color: COLOR.textMid }}>{a.Grade?.grade || "N/A"}</td>
                    <td style={{ padding: "11px 16px", color: COLOR.text, fontWeight: 500 }}>{a.sectionName}</td>
                    <td style={{ padding: "11px 16px" }}><Tag style={{ fontFamily: FF, color: COLOR.orange, background: COLOR.orangeBg, border: "none" }}>{a.subjectCount} Subject{a.subjectCount === 1 ? "" : "s"}</Tag></td>
                    <td style={{ padding: "11px 16px" }}><Tag style={{ fontFamily: FF, color: COLOR.blue, background: COLOR.viewBg, border: "none" }}>{a.teacherCount} Teacher{a.teacherCount === 1 ? "" : "s"}</Tag></td>
                    <td style={{ padding: "8px 16px", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
                        <IconBtn icon={<EyeOutlined />} title="View Allocation" color={COLOR.blue} bg={COLOR.viewBg} onClick={() => { setSelected(a); setIsModalVisible(true); }} />
                        <IconBtn icon={<EditOutlined />} title="Edit Allocation" color={COLOR.editColor} bg={COLOR.editBg} onClick={() => openEdit(a)} />
                        {isSuperAdmin && <IconBtn icon={<DeleteOutlined />} title="Clear Allocation" color={COLOR.danger} bg={COLOR.dangerBg} onClick={() => handleDelete(a.section_id)} />}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={cols.length} style={{ textAlign: "center", padding: "40px 16px", color: COLOR.textSoft, fontSize: FS }}>
                    <Empty description={`No teacher allocations found${selectedYear ? ` for ${selectedYear}` : ""}.`} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selected && (
          <Modal title={<span style={{ fontFamily: FF, fontWeight: 700, fontSize: 16, color: COLOR.text }}>Allocation Summary</span>}
            open={isModalVisible} onCancel={() => setIsModalVisible(false)} footer={null}>
            <Descriptions bordered column={1} size="small"
              labelStyle={{ fontWeight: 600, color: COLOR.textMid, fontFamily: FF, fontSize: FS, background: "#f8fafc" }}
              contentStyle={{ fontFamily: FF, fontSize: FS, color: COLOR.text }}>
              <Descriptions.Item label="School">{isSuperAdmin ? (selected.School?.name || selectedSchoolName || "N/A") : (user.school?.name || "N/A")}</Descriptions.Item>
              <Descriptions.Item label="Academic Year">{selected.academic_year || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Class">{selected.Grade?.grade || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Section">{selected.sectionName}</Descriptions.Item>
              <Descriptions.Item label="Subjects Attached">{selected.subjectCount}</Descriptions.Item>
              <Descriptions.Item label="Teachers Assigned">{selected.teacherCount}</Descriptions.Item>
            </Descriptions>
            <div style={{ textAlign: "right", marginTop: 14 }}>
              <button onClick={() => { setIsModalVisible(false); openView(selected); }}
                style={{ all: "unset", cursor: "pointer", color: COLOR.blue, fontWeight: 600, fontSize: FS }}>
                Open full detail →
              </button>
            </div>
          </Modal>
        )}
      </div>
    </Layout>
  );
};

export default TeacherAllocationList;
