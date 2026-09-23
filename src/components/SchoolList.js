import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Modal, Descriptions, message } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import Layout from "./Layout";

const COLOR = {
  blue:      "#1e40af",
  blueLt:    "#3b82f6",
  text:      "#1e293b",
  textMid:   "#475569",
  textSoft:  "#64748b",
  border:    "#e2e8f0",
  rowOdd:    "#ffffff",
  rowEven:   "#f8fafc",
  rowHover:  "#eff6ff",
  headBg:    "#1a2236",
  headText:  "#ffffff",
  danger:    "#e21216",
  dangerBg:  "rgba(226,18,22,0.08)",
  viewBg:    "rgba(30,64,175,0.08)",
  editColor: "#0891b2",
  editBg:    "rgba(8,145,178,0.08)",
};
const FF = "'Segoe UI', system-ui, sans-serif";
const FS = "13.5px";

const IconBtn = ({ icon, title, color, bg, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <button title={title} onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        all: "unset", width: 32, height: 32, borderRadius: 7,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", fontSize: 16, transition: "all 0.15s",
        color: hov ? color : COLOR.textMid,
        background: hov ? bg : "transparent",
      }}>
      {icon}
    </button>
  );
};

const SchoolList = () => {
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { fetchSchools(); }, []);

  const fetchSchools = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/school/getAllSchools`);
      setSchools(res.data.schools || []);
    } catch { message.error("Failed to fetch schools"); }
  };

  const handleView = (s) => { setSelectedSchool(s); setIsModalVisible(true); };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this school?")) return;
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/school/deleteSchool/${id}`);
      message.success("School deleted successfully");
      fetchSchools();
    } catch { message.error("Failed to delete school"); }
  };

  return (
    <Layout>
      <div className="app-page" style={{ fontFamily: FF }}>

        {/* Heading */}
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLOR.text, margin: 0, letterSpacing: "-0.3px" }}>
            School List
          </h1>
          <div style={{ width: 40, height: 3, background: COLOR.blueLt, borderRadius: 2, marginTop: 6 }} />
        </div>

        {/* Create button */}
        <button
          onClick={() => navigate("/create-school")}
          onMouseEnter={e => { e.currentTarget.style.background = COLOR.blue; e.currentTarget.style.boxShadow = "0 4px 14px rgba(30,64,175,0.35)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = COLOR.blueLt; e.currentTarget.style.boxShadow = "0 2px 8px rgba(59,130,246,0.28)"; }}
          style={{
            all: "unset", display: "inline-flex", alignItems: "center", gap: 7,
            background: COLOR.blueLt, color: "#fff", padding: "9px 20px",
            borderRadius: 8, fontSize: FS, fontWeight: 600, cursor: "pointer",
            marginBottom: 20, boxShadow: "0 2px 8px rgba(59,130,246,0.28)", transition: "all 0.18s",
          }}>
          {/* <PlusOutlined style={{ fontSize: 13 }} /> */}
          Create School
        </button>

        {/* Table card */}
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", overflow: "hidden", border: `1px solid ${COLOR.border}` }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FF, fontSize: FS }}>
              <thead>
                <tr style={{ background: COLOR.headBg }}>
                  {["S.No", "Logo", "Name", "Short Code", "Phone Number", "Email", "City", "Actions"].map((h, i) => (
                    <th key={h} style={{
                      padding: "13px 16px", fontWeight: 600, fontSize: "13px",
                      color: COLOR.headText, textAlign: i === 6 ? "center" : "left",
                      whiteSpace: "nowrap", letterSpacing: "0.2px",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {schools.length > 0 ? schools.map((school, index) => (
                  <tr key={school.id}
                    onMouseEnter={() => setHoveredRow(school.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      background: hoveredRow === school.id ? COLOR.rowHover : index % 2 === 0 ? COLOR.rowOdd : COLOR.rowEven,
                      transition: "background 0.12s",
                      borderBottom: `1px solid ${COLOR.border}`,
                    }}>
                    <td style={{ padding: "11px 16px", color: COLOR.text, fontWeight: 600, whiteSpace: "nowrap" }}>{index + 1}</td>
                    <td style={{ padding: "8px 16px", textAlign: "center" }}>
                      {school.logo
                        ? <img src={school.logo} alt="logo" style={{ width:36, height:36, objectFit:"contain", borderRadius:6, border:`1px solid ${COLOR.border}` }} />
                        : <span style={{ fontSize:11, color:COLOR.textSoft }}>—</span>}
                    </td>
                    <td style={{ padding: "11px 16px", color: COLOR.text, fontWeight: 600, whiteSpace: "nowrap" }}>{school.name || "—"}</td>
                    <td style={{ padding: "11px 16px", color: COLOR.textMid, whiteSpace: "nowrap" }}>{school.shortcode || "—"}</td>
                    <td style={{ padding: "11px 16px", color: COLOR.textMid, whiteSpace: "nowrap" }}>{school.phoneNumber || "—"}</td>
                    <td style={{ padding: "11px 16px", color: COLOR.textMid, whiteSpace: "nowrap" }}>{school.email || "—"}</td>
                    <td style={{ padding: "11px 16px", color: COLOR.textMid, whiteSpace: "nowrap" }}>{school.city || "—"}</td>
                    <td style={{ padding: "8px 16px", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
                        <IconBtn icon={<EyeOutlined />}    title="View School"   color={COLOR.blue}      bg={COLOR.viewBg}   onClick={() => handleView(school)} />
                        <IconBtn icon={<EditOutlined />}   title="Edit School"   color={COLOR.editColor} bg={COLOR.editBg}   onClick={() => navigate(`/edit-school/${school.id}`)} />
                        <IconBtn icon={<DeleteOutlined />} title="Delete School" color={COLOR.danger}    bg={COLOR.dangerBg} onClick={() => handleDelete(school.id)} />
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "40px 16px", color: COLOR.textSoft, fontSize: FS }}>
                      No schools found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* View Modal */}
        {selectedSchool && (
          <Modal
            title={<span style={{ fontFamily: FF, fontWeight: 700, fontSize: 16, color: COLOR.text }}>School Details</span>}
            open={isModalVisible}
            onCancel={() => setIsModalVisible(false)}
            footer={null}
          >
            <Descriptions bordered column={1} size="small"
              labelStyle={{ fontWeight: 600, color: COLOR.textMid, fontFamily: FF, fontSize: FS, background: "#f8fafc" }}
              contentStyle={{ fontFamily: FF, fontSize: FS, color: COLOR.text }}
            >
              <Descriptions.Item label="Name">{selectedSchool.name}</Descriptions.Item>
              <Descriptions.Item label="Short Code">{selectedSchool.shortcode}</Descriptions.Item>
              <Descriptions.Item label="Phone Number">{selectedSchool.phoneNumber}</Descriptions.Item>
              <Descriptions.Item label="Email">{selectedSchool.email}</Descriptions.Item>
              <Descriptions.Item label="Address">{selectedSchool.address}</Descriptions.Item>
              <Descriptions.Item label="City">{selectedSchool.city}</Descriptions.Item>
              <Descriptions.Item label="State">{selectedSchool.state}</Descriptions.Item>
              <Descriptions.Item label="Pincode">{selectedSchool.pincode}</Descriptions.Item>
            </Descriptions>
          </Modal>
        )}

      </div>
    </Layout>
  );
};

export default SchoolList;
