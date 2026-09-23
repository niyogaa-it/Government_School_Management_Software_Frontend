import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { message } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import Layout from "./Layout";

const COLOR = { blue:"#1e40af", blueLt:"#3b82f6", text:"#1e293b", textMid:"#475569", textSoft:"#64748b", border:"#e2e8f0", rowOdd:"#ffffff", rowEven:"#f8fafc", rowHover:"#eff6ff", headBg:"#1a2236", headText:"#ffffff", danger:"#e21216", dangerBg:"rgba(226,18,22,0.08)" };
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

const RoleList = () => {
  const [roles, setRoles] = useState([]);
  const [hoveredRow, setHoveredRow] = useState(null);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const roleName = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const schoolId = user?.school?.id;

  useEffect(() => { fetchRoles(); }, [roleName, schoolId]);

  const fetchRoles = async () => {
    try {
      let response;
      if (roleName === "superadmin") {
        response = await axios.get(`${process.env.REACT_APP_API_URL}/role/getAllRoles`);
        setRoles(response.data.roles.filter(r => r.roleOfUser?.toLowerCase().replace(/\s+/g,"") !== "superadmin"));
      } else if (schoolId) {
        response = await axios.get(`${process.env.REACT_APP_API_URL}/role/getRolesBySchool/${schoolId}`);
        setRoles(response.data.roles || []);
      }
    } catch { message.error("Failed to fetch roles"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this role?")) return;
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/role/deleteRole/${id}`);
      message.success("Role deleted successfully");
      fetchRoles();
    } catch { message.error("Failed to delete role"); }
  };

  return (
    <Layout>
      <div className="app-page" style={{ fontFamily: FF }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLOR.text, margin: 0, letterSpacing: "-0.3px" }}>Role List</h1>
          <div style={{ width: 40, height: 3, background: COLOR.blueLt, borderRadius: 2, marginTop: 6 }} />
        </div>

        <button onClick={() => navigate("/create-role")}
          onMouseEnter={e => { e.currentTarget.style.background = COLOR.blue; e.currentTarget.style.boxShadow = "0 4px 14px rgba(30,64,175,0.35)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = COLOR.blueLt; e.currentTarget.style.boxShadow = "0 2px 8px rgba(59,130,246,0.28)"; }}
          style={{ all:"unset", display:"inline-flex", alignItems:"center", gap:7, background:COLOR.blueLt, color:"#fff", padding:"9px 20px", borderRadius:8, fontSize:FS, fontWeight:600, cursor:"pointer", marginBottom:20, boxShadow:"0 2px 8px rgba(59,130,246,0.28)", transition:"all 0.18s" }}>
          Create Role
        </button>

        <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 2px 12px rgba(0,0,0,0.07)", overflow:"hidden", border:`1px solid ${COLOR.border}` }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:FF, fontSize:FS }}>
              <thead>
                <tr style={{ background: COLOR.headBg }}>
                  {["S.No","School","Role Name","Action"].map((h,i) => (
                    <th key={h} style={{ padding:"13px 16px", fontWeight:600, fontSize:"13px", color:COLOR.headText, textAlign: i===3 ? "center" : "left", whiteSpace:"nowrap", letterSpacing:"0.2px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roles.length > 0 ? roles.map((role, index) => (
                  <tr key={role.id} onMouseEnter={() => setHoveredRow(role.id)} onMouseLeave={() => setHoveredRow(null)}
                    style={{ background: hoveredRow === role.id ? COLOR.rowHover : index % 2 === 0 ? COLOR.rowOdd : COLOR.rowEven, transition:"background 0.12s", borderBottom:`1px solid ${COLOR.border}` }}>
                    <td style={{ padding:"11px 16px", color:COLOR.text, fontWeight:600 }}>{index + 1}</td>
                    <td style={{ padding:"11px 16px", color:COLOR.textMid }}>{roleName === "superadmin" ? (role.School?.name || "N/A") : (user.school?.name || "N/A")}</td>
                    <td style={{ padding:"11px 16px", color:COLOR.text, fontWeight:500 }}>{role.roleOfUser}</td>
                    <td style={{ padding:"8px 16px", textAlign:"center" }}>
                      <IconBtn icon={<DeleteOutlined />} title="Delete Role" color={COLOR.danger} bg={COLOR.dangerBg} onClick={() => handleDelete(role.id)} />
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} style={{ textAlign:"center", padding:"40px 16px", color:COLOR.textSoft, fontSize:FS }}>No roles found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RoleList;