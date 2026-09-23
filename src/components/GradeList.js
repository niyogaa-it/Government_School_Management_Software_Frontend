import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Layout from "./Layout";
import { message, Modal, Descriptions } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useFilter } from "./FilterContext";

const COLOR = { blue:"#1e40af", blueLt:"#3b82f6", text:"#1e293b", textMid:"#475569", textSoft:"#64748b", border:"#e2e8f0", rowOdd:"#ffffff", rowEven:"#f8fafc", rowHover:"#eff6ff", headBg:"#1a2236", headText:"#ffffff", danger:"#e21216", dangerBg:"rgba(226,18,22,0.08)", viewBg:"rgba(30,64,175,0.08)", editColor:"#0891b2", editBg:"rgba(8,145,178,0.08)", filterBg:"#eff6ff", filterText:"#1a3c6e" };
const FF = "'Segoe UI', system-ui, sans-serif";
const FS = "13.5px";

const IconBtn = ({ icon, title, color, bg, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <button title={title} onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ all:"unset", width:32, height:32, borderRadius:7, display:"inline-flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:16, transition:"all 0.15s", color: hov ? color : COLOR.textMid, background: hov ? bg : "transparent" }}>
      {icon}
    </button>
  );
};

const GradeList = () => {
  const [grades, setGrades] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const isSuperAdmin = role === "superadmin";
  const { selectedSchool, selectedYear, selectedSchoolName } = useFilter();

  useEffect(() => { fetchGrades(); }, [selectedSchool, selectedYear, location.pathname]);

  const fetchGrades = async () => {
    try {
      let response;
      const schoolId = isSuperAdmin ? (selectedSchool === "all" ? null : selectedSchool) : user?.school?.id;
      if (schoolId && selectedYear) {
        response = await axios.get(`${process.env.REACT_APP_API_URL}/grade/getGradesBySchoolAndYear/${schoolId}/${selectedYear}`);
      } else if (schoolId) {
        response = await axios.get(`${process.env.REACT_APP_API_URL}/grade/getGradesBySchool/${schoolId}`);
      } else {
        response = await axios.get(`${process.env.REACT_APP_API_URL}/grade/getAllGrades`);
      }
      let data = response.data.grades || [];
      if (isSuperAdmin && selectedSchool === "all" && selectedYear) data = data.filter(g => g.academic_year === selectedYear);
      setGrades(data);
    } catch { message.error("Failed to fetch grades"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this grade?")) return;
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/grade/deleteGrade/${id}`);
      message.success("Grade deleted successfully"); fetchGrades();
    } catch { message.error("Failed to delete grade"); }
  };

  const showFilter = selectedSchool !== "all" || selectedYear;
  const cols = ["S.No","School","Academic Year","Grade","Actions"];

  return (
    <Layout>
      <div className="app-page" style={{ fontFamily:FF }}>
        <div style={{ marginBottom:22 }}>
          <h1 style={{ fontSize:22, fontWeight:700, color:COLOR.text, margin:0, letterSpacing:"-0.3px" }}>Grade List</h1>
          <div style={{ width:40, height:3, background:COLOR.blueLt, borderRadius:2, marginTop:6 }} />
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20, flexWrap:"wrap" }}>
          {showFilter && (
            <div style={{ fontSize:"13px", color:COLOR.filterText, background:COLOR.filterBg, padding:"6px 14px", borderRadius:6, fontWeight:500 }}>
              Showing: {selectedSchool !== "all" ? selectedSchoolName : "All Schools"}{selectedYear ? ` | ${selectedYear}` : ""}
            </div>
          )}
          <button onClick={() => navigate("/create-grade")}
            onMouseEnter={e => { e.currentTarget.style.background=COLOR.blue; e.currentTarget.style.boxShadow="0 4px 14px rgba(30,64,175,0.35)"; }}
            onMouseLeave={e => { e.currentTarget.style.background=COLOR.blueLt; e.currentTarget.style.boxShadow="0 2px 8px rgba(59,130,246,0.28)"; }}
            style={{ all:"unset", display:"inline-flex", alignItems:"center", gap:7, background:COLOR.blueLt, color:"#fff", padding:"9px 20px", borderRadius:8, fontSize:FS, fontWeight:600, cursor:"pointer", boxShadow:"0 2px 8px rgba(59,130,246,0.28)", transition:"all 0.18s" }}>
            Create Grade
          </button>
        </div>

        <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 2px 12px rgba(0,0,0,0.07)", overflow:"hidden", border:`1px solid ${COLOR.border}` }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:FF, fontSize:FS }}>
              <thead>
                <tr style={{ background:COLOR.headBg }}>
                  {cols.map((h,i) => <th key={h} style={{ padding:"13px 16px", fontWeight:600, fontSize:"13px", color:COLOR.headText, textAlign:i===cols.length-1?"center":"left", whiteSpace:"nowrap", letterSpacing:"0.2px" }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {grades.length > 0 ? grades.map((grade, index) => (
                  <tr key={grade.id} onMouseEnter={() => setHoveredRow(grade.id)} onMouseLeave={() => setHoveredRow(null)}
                    style={{ background: hoveredRow===grade.id ? COLOR.rowHover : index%2===0 ? COLOR.rowOdd : COLOR.rowEven, transition:"background 0.12s", borderBottom:`1px solid ${COLOR.border}` }}>
                    <td style={{ padding:"11px 16px", color:COLOR.text, fontWeight:600 }}>{index+1}</td>
                    <td style={{ padding:"11px 16px", color:COLOR.textMid }}>{isSuperAdmin ? (grade.School?.name||selectedSchoolName||"N/A") : (user.school?.name||"N/A")}</td>
                    <td style={{ padding:"11px 16px", color:COLOR.textMid }}>{grade.academic_year||"N/A"}</td>
                    <td style={{ padding:"11px 16px", color:COLOR.text, fontWeight:500 }}>{grade.grade}</td>
                    <td style={{ padding:"8px 16px", textAlign:"center" }}>
                      <div style={{ display:"flex", justifyContent:"center", gap:4 }}>
                        <IconBtn icon={<EyeOutlined />}  title="View Grade"   color={COLOR.blue}       bg={COLOR.viewBg}   onClick={() => { setSelectedGrade(grade); setIsModalVisible(true); }} />
                        <IconBtn icon={<EditOutlined />} title="Edit Grade"   color={COLOR.editColor}  bg={COLOR.editBg}   onClick={() => navigate(`/edit-grade/${grade.id}`)} />
                        {isSuperAdmin && <IconBtn icon={<DeleteOutlined />} title="Delete Grade" color={COLOR.danger} bg={COLOR.dangerBg} onClick={() => handleDelete(grade.id)} />}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} style={{ textAlign:"center", padding:"40px 16px", color:COLOR.textSoft, fontSize:FS }}>No grades found{selectedYear ? ` for ${selectedYear}` : ""}.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedGrade && (
          <Modal title={<span style={{ fontFamily:FF, fontWeight:700, fontSize:16, color:COLOR.text }}>Grade Details</span>}
            open={isModalVisible} onCancel={() => setIsModalVisible(false)} footer={null}>
            <Descriptions bordered column={1} size="small"
              labelStyle={{ fontWeight:600, color:COLOR.textMid, fontFamily:FF, fontSize:FS, background:"#f8fafc" }}
              contentStyle={{ fontFamily:FF, fontSize:FS, color:COLOR.text }}>
              <Descriptions.Item label="School">{isSuperAdmin ? (selectedGrade.School?.name||selectedSchoolName||"N/A") : (user.school?.name||"N/A")}</Descriptions.Item>
              <Descriptions.Item label="Academic Year">{selectedGrade.academic_year||"N/A"}</Descriptions.Item>
              <Descriptions.Item label="Grade">{selectedGrade.grade}</Descriptions.Item>
            </Descriptions>
          </Modal>
        )}
      </div>
    </Layout>
  );
};

export default GradeList;