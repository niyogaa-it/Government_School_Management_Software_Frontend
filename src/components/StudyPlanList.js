import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Layout from "./Layout";
import { message, Modal, Descriptions, Spin, Empty, Tag } from "antd";
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

const StudyPlanList = () => {
  const [studyPlans, setStudyPlans] = useState([]);
  const [selectedStudyPlan, setSelectedStudyPlan] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [planDetail, setPlanDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const isSuperAdmin = role === "superadmin";
  const { selectedSchool, selectedYear, selectedSchoolName } = useFilter();

  useEffect(() => { fetchStudyPlans(); }, [selectedSchool, selectedYear, location.pathname]);

  const fetchStudyPlans = async () => {
    try {
      let response;
      const schoolId = isSuperAdmin ? (selectedSchool === "all" ? null : selectedSchool) : user?.school?.id;
      if (schoolId && selectedYear) {
        response = await axios.get(`${process.env.REACT_APP_API_URL}/studyplan/getStudyPlansBySchoolAndYear/${schoolId}/${selectedYear}`);
      } else if (schoolId) {
        response = await axios.get(`${process.env.REACT_APP_API_URL}/studyplan/getStudyPlansBySchool/${schoolId}`);
      } else {
        response = await axios.get(`${process.env.REACT_APP_API_URL}/studyplan/getAllStudyPlans`);
      }
      let data = response.data.studyPlans || [];
      if (isSuperAdmin && selectedSchool === "all" && selectedYear) data = data.filter(sp => sp.academic_year === selectedYear);
      setStudyPlans(data);
    } catch { message.error("Failed to fetch study plans"); }
  };

  const handleView = async (plan) => {
    setSelectedStudyPlan(plan);
    setIsModalVisible(true);
    setPlanDetail(null);
    setLoadingDetail(true);
    try {
      const r = await axios.get(`${process.env.REACT_APP_API_URL}/studyplan/getStudyPlanDetail/${plan.school_id}/${plan.academic_year}`);
      setPlanDetail(r.data);
    } catch {
      message.error("Failed to load study plan details");
    } finally { setLoadingDetail(false); }
  };

  const handleEdit = (plan) => {
    navigate(`/create-studyplan?school_id=${plan.school_id}&academic_year=${encodeURIComponent(plan.academic_year)}`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this study plan? This detaches all subjects and clears class-teacher assignments for every section in it.")) return;
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/studyplan/deleteStudyPlan/${id}`);
      message.success("Study plan deleted successfully"); fetchStudyPlans();
    } catch { message.error("Failed to delete study plan"); }
  };

  const showFilter = selectedSchool !== "all" || selectedYear;
  const cols = ["S.No","School","Academic Year","Actions"];

  return (
    <Layout>
      <div className="app-page" style={{ fontFamily:FF }}>
        <div style={{ marginBottom:22 }}>
          <h1 style={{ fontSize:22, fontWeight:700, color:COLOR.text, margin:0, letterSpacing:"-0.3px" }}>Study Plan List</h1>
          <div style={{ width:40, height:3, background:COLOR.blueLt, borderRadius:2, marginTop:6 }} />
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20, flexWrap:"wrap" }}>
          {showFilter && (
            <div style={{ fontSize:"13px", color:COLOR.filterText, background:COLOR.filterBg, padding:"6px 14px", borderRadius:6, fontWeight:500 }}>
              Showing: {selectedSchool !== "all" ? selectedSchoolName : "All Schools"}{selectedYear ? ` | ${selectedYear}` : ""}
            </div>
          )}
          <button onClick={() => navigate("/create-studyplan")}
            onMouseEnter={e => { e.currentTarget.style.background=COLOR.blue; e.currentTarget.style.boxShadow="0 4px 14px rgba(30,64,175,0.35)"; }}
            onMouseLeave={e => { e.currentTarget.style.background=COLOR.blueLt; e.currentTarget.style.boxShadow="0 2px 8px rgba(59,130,246,0.28)"; }}
            style={{ all:"unset", display:"inline-flex", alignItems:"center", gap:7, background:COLOR.blueLt, color:"#fff", padding:"9px 20px", borderRadius:8, fontSize:FS, fontWeight:600, cursor:"pointer", boxShadow:"0 2px 8px rgba(59,130,246,0.28)", transition:"all 0.18s" }}>
            Create Study Plan
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
                {studyPlans.length > 0 ? studyPlans.map((plan, index) => (
                  <tr key={plan.id} onMouseEnter={() => setHoveredRow(plan.id)} onMouseLeave={() => setHoveredRow(null)}
                    style={{ background: hoveredRow===plan.id ? COLOR.rowHover : index%2===0 ? COLOR.rowOdd : COLOR.rowEven, transition:"background 0.12s", borderBottom:`1px solid ${COLOR.border}` }}>
                    <td style={{ padding:"11px 16px", color:COLOR.text, fontWeight:600 }}>{index+1}</td>
                    <td style={{ padding:"11px 16px", color:COLOR.textMid }}>{isSuperAdmin ? (plan.School?.name||selectedSchoolName||"N/A") : (user.school?.name||"N/A")}</td>
                    <td style={{ padding:"11px 16px", color:COLOR.textMid }}>{plan.academic_year||"N/A"}</td>
                    <td style={{ padding:"8px 16px", textAlign:"center" }}>
                      <div style={{ display:"flex", justifyContent:"center", gap:4 }}>
                        <IconBtn icon={<EyeOutlined />}  title="View Study Plan"   color={COLOR.blue}       bg={COLOR.viewBg}   onClick={() => handleView(plan)} />
                        <IconBtn icon={<EditOutlined />} title="Edit Study Plan"   color={COLOR.editColor}  bg={COLOR.editBg}   onClick={() => handleEdit(plan)} />
                        {isSuperAdmin && <IconBtn icon={<DeleteOutlined />} title="Delete Study Plan" color={COLOR.danger} bg={COLOR.dangerBg} onClick={() => handleDelete(plan.id)} />}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} style={{ textAlign:"center", padding:"40px 16px", color:COLOR.textSoft, fontSize:FS }}>No study plans found{selectedYear ? ` for ${selectedYear}` : ""}.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedStudyPlan && (
          <Modal title={<span style={{ fontFamily:FF, fontWeight:700, fontSize:16, color:COLOR.text }}>Study Plan Details</span>}
            open={isModalVisible} onCancel={() => { setIsModalVisible(false); setPlanDetail(null); }} footer={null} width={560}>
            <Descriptions bordered column={1} size="small"
              labelStyle={{ fontWeight:600, color:COLOR.textMid, fontFamily:FF, fontSize:FS, background:"#f8fafc" }}
              contentStyle={{ fontFamily:FF, fontSize:FS, color:COLOR.text }}>
              <Descriptions.Item label="School">{isSuperAdmin ? (selectedStudyPlan.School?.name||selectedSchoolName||"N/A") : (user.school?.name||"N/A")}</Descriptions.Item>
              <Descriptions.Item label="Academic Year">{selectedStudyPlan.academic_year||"N/A"}</Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 18 }}>
              {loadingDetail ? (
                <div style={{ textAlign: "center", padding: 24 }}><Spin /></div>
              ) : !planDetail || planDetail.grades.length === 0 ? (
                <Empty description="No grade data found" />
              ) : (
                planDetail.grades.map(g => (
                  <div key={g.gradeId} style={{ marginBottom: 14, border: `1px solid ${COLOR.border}`, borderRadius: 8, overflow: "hidden" }}>
                    <div style={{ background: "#f8fafc", padding: "8px 12px", fontWeight: 700, color: COLOR.text, fontSize: FS }}>
                      {g.gradeName}
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: FS }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${COLOR.border}` }}>
                          <th style={{ textAlign: "left", padding: "6px 12px", color: COLOR.textMid }}>Section</th>
                          <th style={{ textAlign: "center", padding: "6px 12px", color: COLOR.textMid }}>Subjects</th>
                          <th style={{ textAlign: "center", padding: "6px 12px", color: COLOR.textMid }}>Students</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.sections.map(s => (
                          <tr key={s.id} style={{ borderBottom: `1px solid ${COLOR.border}` }}>
                            <td style={{ padding: "6px 12px", color: COLOR.text }}>{s.sectionName}</td>
                            <td style={{ padding: "6px 12px", textAlign: "center" }}><Tag color="orange">{s.subjectCount}</Tag></td>
                            <td style={{ padding: "6px 12px", textAlign: "center" }}><Tag color="green">{s.activeStudentCount}</Tag></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
          </Modal>
        )}
      </div>
    </Layout>
  );
};

export default StudyPlanList;