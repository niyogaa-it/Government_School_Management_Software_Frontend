import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { message } from "antd";
import { EditOutlined, DeleteOutlined, PrinterOutlined } from "@ant-design/icons";
import Layout from "./Layout";

const BASE_URL = `${process.env.REACT_APP_API_URL}/raiseFeeDemand`;

const COLOR = { blue:"#1e40af", blueLt:"#3b82f6", text:"#1e293b", textMid:"#475569", textSoft:"#64748b", border:"#e2e8f0", rowOdd:"#ffffff", rowEven:"#f8fafc", rowHover:"#eff6ff", headBg:"#1a2236", headText:"#ffffff", danger:"#e21216", dangerBg:"rgba(226,18,22,0.08)", editColor:"#0891b2", editBg:"rgba(8,145,178,0.08)", printColor:"#c2580a", printBg:"rgba(194,88,10,0.08)" };
const FF = "'Segoe UI', system-ui, sans-serif";
const FS = "13.5px";

const IconBtn = ({ icon, title, color, bg, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <button title={title} onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ all:"unset", width:32, height:32, borderRadius:7, display:"inline-flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:16, transition:"all 0.15s", color:hov?color:COLOR.textMid, background:hov?bg:"transparent" }}>
      {icon}
    </button>
  );
};

const FeeStructure = () => {
  const [startYear, setStartYear] = useState(2024);
  const [feeData, setFeeData] = useState([]);
  const [hoveredRow, setHoveredRow] = useState(null);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const academicYear = `${startYear}-${startYear + 1}`;

  const fetchFeeDemands = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/getAllFeeDemand`);
      const demands = response.data?.data || response.data || [];
      const filtered = demands
        .filter((d) => d.academic_year === academicYear)
        .flatMap((d) => {
          let details = [];
          if (typeof d.fee_details === "string") {
            try { details = JSON.parse(d.fee_details); } catch { return []; }
          } else if (Array.isArray(d.fee_details)) {
            details = d.fee_details;
          }
          return details.map((fee, index) => ({
            id: d.id, feeIndex: index,
            grade: fee.grade || "—", type: fee.type || "—",
            description: fee.description || "—", studentType: fee.studentType || "—",
            medium: fee.medium || "—", amount: fee.amount || 0,
          }));
        });
      setFeeData(filtered);
    } catch (err) {
      message.error("Failed to load fee structure");
    }
  };

  useEffect(() => { fetchFeeDemands(); }, [startYear]);

  const handleEdit = (record) => {
    sessionStorage.setItem("editFeeData", JSON.stringify({ ...record, academicYear }));
    navigate(`/edit-fee/${record.id}`);
  };

  const handleDelete = async (record) => {
    if (!window.confirm("Are you sure you want to delete this fee entry?")) return;
    try {
      await axios.delete(`${BASE_URL}/deleteFeeEntry/${record.id}?feeIndex=${record.feeIndex}`);
      message.success("Fee entry deleted successfully");
      fetchFeeDemands();
    } catch { message.error("Failed to delete fee entry"); }
  };

  const handlePrint = () => {
    const tableRows = feeData.map((row, i) => `
      <tr>
        <td>${i+1}</td><td>${row.grade}</td><td>${row.type}</td>
        <td>${row.studentType}</td><td>${row.medium}</td>
        <td>${row.description}</td><td>${row.amount}</td>
      </tr>`).join("");
    const printContent = `
      <html><head><title>Annual Fee Structure</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; margin: 0; }
          h2 { margin-bottom: 6px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ccc; padding: 8px 12px; }
          th { background-color: #343a40; color: #fff; }
          tr:nth-child(even) { background-color: #f8f9fa; }
        </style>
      </head>
      <body>
        <h2>Annual Fee Structure</h2>
        <div><strong>Academic Year: ${academicYear}</strong></div>
        <table>
          <thead><tr>
            <th>S.No</th><th>Grade</th><th>Fee Type</th>
            <th>Student Type</th><th>Medium</th><th>Description</th><th>Amount</th>
          </tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body></html>`;
    const win = window.open("", "_blank", "width=900,height=650");
    win.document.open(); win.document.write(printContent); win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const cols = ["S.No","Grade","Fee Type","Student Type","Medium","Description","Amount","Action"];

  return (
    <Layout>
      <div className="app-page" style={{ fontFamily:FF }}>

        {/* Heading */}
        <div style={{ marginBottom:22 }}>
          <h1 style={{ fontSize:22, fontWeight:700, color:COLOR.text, margin:0, letterSpacing:"-0.3px" }}>Annual Fee Structure</h1>
          <div style={{ width:40, height:3, background:COLOR.blueLt, borderRadius:2, marginTop:6 }} />
        </div>

        {/* Top row: Create button + Year filter + Print */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
            {/* Create button */}
            <button onClick={() => navigate("/feeDemand")}
              onMouseEnter={e => { e.currentTarget.style.background=COLOR.blue; e.currentTarget.style.boxShadow="0 4px 14px rgba(30,64,175,0.35)"; }}
              onMouseLeave={e => { e.currentTarget.style.background=COLOR.blueLt; e.currentTarget.style.boxShadow="0 2px 8px rgba(59,130,246,0.28)"; }}
              style={{ all:"unset", display:"inline-flex", alignItems:"center", gap:7, background:COLOR.blueLt, color:"#fff", padding:"9px 20px", borderRadius:8, fontSize:FS, fontWeight:600, cursor:"pointer", boxShadow:"0 2px 8px rgba(59,130,246,0.28)", transition:"all 0.18s" }}>
              Create Fee Structure
            </button>

            {/* Year filter */}
            <div style={{ display:"flex", alignItems:"center", gap:8, background:"#fff", border:`1px solid ${COLOR.border}`, borderRadius:8, padding:"6px 14px" }}>
              <span style={{ fontSize:"13px", fontWeight:600, color:COLOR.textMid }}>Academic Year:</span>
              <input type="number" value={startYear}
                onChange={e => setStartYear(Number(e.target.value))}
                style={{ width:72, padding:"4px 8px", border:`1px solid ${COLOR.border}`, borderRadius:6, fontSize:FS, fontFamily:FF, color:COLOR.text, outline:"none" }} />
              <input type="number" value={startYear + 1} readOnly
                style={{ width:72, padding:"4px 8px", border:`1px solid ${COLOR.border}`, borderRadius:6, fontSize:FS, fontFamily:FF, color:COLOR.textMid, background:"#f8fafc", textAlign:"center", outline:"none" }} />
            </div>
          </div>

          {/* Print button */}
          <button onClick={handlePrint}
            onMouseEnter={e => { e.currentTarget.style.background="#f1f5f9"; e.currentTarget.style.color=COLOR.printColor; }}
            onMouseLeave={e => { e.currentTarget.style.background="#fff"; e.currentTarget.style.color=COLOR.textMid; }}
            style={{ all:"unset", width:40, height:40, borderRadius:8, border:`1px solid ${COLOR.border}`, display:"inline-flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:17, color:COLOR.textMid, background:"#fff", transition:"all 0.15s" }}
            title="Print Fee Structure">
            <PrinterOutlined />
          </button>
        </div>

        {/* Table card */}
        <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 2px 12px rgba(0,0,0,0.07)", overflow:"hidden", border:`1px solid ${COLOR.border}` }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:FF, fontSize:FS }}>
              <thead>
                <tr style={{ background:COLOR.headBg }}>
                  {cols.map((h,i) => (
                    <th key={h} style={{ padding:"13px 16px", fontWeight:600, fontSize:"13px", color:COLOR.headText, textAlign:i===cols.length-1?"center":"left", whiteSpace:"nowrap", letterSpacing:"0.2px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {feeData.length > 0 ? (
                  feeData.map((row, index) => (
                    <tr key={`${row.id}-${row.feeIndex}`}
                      onMouseEnter={() => setHoveredRow(`${row.id}-${row.feeIndex}`)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{ background:hoveredRow===`${row.id}-${row.feeIndex}`?COLOR.rowHover:index%2===0?COLOR.rowOdd:COLOR.rowEven, transition:"background 0.12s", borderBottom:`1px solid ${COLOR.border}` }}>
                      <td style={{ padding:"11px 16px", color:COLOR.text, fontWeight:600 }}>{index+1}</td>
                      <td style={{ padding:"11px 16px", color:COLOR.text, fontWeight:500 }}>{row.grade}</td>
                      <td style={{ padding:"11px 16px", color:COLOR.textMid }}>{row.type}</td>
                      <td style={{ padding:"11px 16px", color:COLOR.textMid }}>{row.studentType}</td>
                      <td style={{ padding:"11px 16px", color:COLOR.textMid }}>{row.medium}</td>
                      <td style={{ padding:"11px 16px", color:COLOR.textMid }}>{row.description}</td>
                      <td style={{ padding:"11px 16px", color:COLOR.text, fontWeight:500 }}>₹ {row.amount}</td>
                      <td style={{ padding:"8px 16px", textAlign:"center" }}>
                        <div style={{ display:"flex", justifyContent:"center", gap:4 }}>
                          <IconBtn icon={<EditOutlined />}   title="Edit Fee"   color={COLOR.editColor} bg={COLOR.editBg}   onClick={() => handleEdit(row)} />
                          {role === "superadmin" && (
                            <IconBtn icon={<DeleteOutlined />} title="Delete Fee" color={COLOR.danger}    bg={COLOR.dangerBg} onClick={() => handleDelete(row)} />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ textAlign:"center", padding:"40px 16px", color:COLOR.textSoft, fontSize:FS }}>
                      No fee entries found for {academicYear}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default FeeStructure;
