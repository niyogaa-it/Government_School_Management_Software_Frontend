import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { message, Modal, Descriptions, Tooltip, Select, Input } from "antd";
import Layout from "./Layout";
import {
  EyeOutlined, PrinterOutlined, RollbackOutlined,
  FileTextOutlined, SearchOutlined,
} from "@ant-design/icons";
import { useFilter } from "./FilterContext";

const { Option } = Select;

// ── Design tokens ────────────────────────────────────────────────────────────
const COLOR = {
  blue:       "#1e40af",
  blueLt:     "#3b82f6",
  text:       "#1e293b",
  textMid:    "#475569",
  textSoft:   "#64748b",
  border:     "#e2e8f0",
  rowOdd:     "#ffffff",
  rowEven:    "#f8fafc",
  rowHover:   "#eff6ff",
  headBg:     "#1a2236",
  headText:   "#ffffff",
  purple:     "#722ed1",
  purpleBg:   "rgba(114,46,209,0.08)",
  green:      "#16a34a",
  greenBg:    "rgba(22,163,74,0.08)",
  danger:     "#e21216",
  dangerBg:   "rgba(226,18,22,0.08)",
  filterBg:   "#eff6ff",
  filterText: "#1a3c6e",
};
const FF = "'Segoe UI', system-ui, sans-serif";
const FS = "13.5px";

// ── Reusable icon button ─────────────────────────────────────────────────────
const IconBtn = ({ icon, title, color, bg, onClick }) => {
  const [hov, setHov] = React.useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        all: "unset", width: 32, height: 32, borderRadius: 7,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", fontSize: 16, transition: "all 0.15s",
        color:      hov ? color : COLOR.textMid,
        background: hov ? bg    : "transparent",
      }}
    >
      {icon}
    </button>
  );
};

// ════════════════════════════════════════════════════════════════════════════
const TcStudentsList = () => {
  const [tcList,        setTcList]        = useState([]);
  const [filtered,      setFiltered]      = useState([]);
  const [selectedTc,    setSelectedTc]    = useState(null);
  const [isViewModal,   setIsViewModal]   = useState(false);
  const [searchText,    setSearchText]    = useState("");
  const [filterStatus,  setFilterStatus]  = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const location     = useLocation();
  const user         = JSON.parse(localStorage.getItem("user"));
  const role         = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const schoolId     = user?.school?.id;
  const isSuperAdmin = role === "superadmin";

  // ── Global filter from Dashboard ─────────────────────────────────────────
  const { selectedSchool, selectedYear, selectedSchoolName } = useFilter();

  // ── Re-fetch on filter/route change ─────────────────────────────────────
  useEffect(() => { fetchTcList(); }, [selectedSchool, selectedYear, location.pathname]);

  // ── Fetch list ───────────────────────────────────────────────────────────
  const fetchTcList = async () => {
    try {
      let res;
      const effectiveSchoolId = isSuperAdmin ? (selectedSchool === "all" ? null : selectedSchool) : schoolId;

      if (isSuperAdmin && selectedSchool === "all" && selectedYear) {
        // All schools + specific year
        res = await axios.get(`${process.env.REACT_APP_API_URL}/tc/getTcsByYear/${selectedYear}`);
      } else if (effectiveSchoolId && selectedYear) {
        // Specific school + specific year
        res = await axios.get(`${process.env.REACT_APP_API_URL}/tc/getTcsBySchoolAndYear/${effectiveSchoolId}/${selectedYear}`);
      } else if (effectiveSchoolId) {
        // Specific school, no year filter
        res = await axios.get(`${process.env.REACT_APP_API_URL}/tc/getTcsBySchool/${effectiveSchoolId}`);
      } else {
        // Superadmin — all schools, no year filter
        res = await axios.get(`${process.env.REACT_APP_API_URL}/tc/getAllTcs`);
      }

      const data = res.data.tcs || [];
      setTcList(data);
      setFiltered(data);
    } catch (err) {
      console.error(err);
      message.error("Failed to fetch TC students");
    }
  };

  // ── Search / status filter ───────────────────────────────────────────────
  useEffect(() => {
    let data = [...tcList];
    if (searchText) {
      const q = searchText.toLowerCase();
      data = data.filter(tc =>
        tc.studentName?.toLowerCase().includes(q) ||
        tc.admissionNumber?.toLowerCase().includes(q) ||
        tc.tcNumber?.toLowerCase().includes(q)
      );
    }
    if (filterStatus) data = data.filter(tc => tc.status === filterStatus);
    setFiltered(data);
  }, [searchText, filterStatus, tcList]);

  // ── View ─────────────────────────────────────────────────────────────────
  const handleView = async (id) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/tc/getTcById/${id}`);
      setSelectedTc(res.data.tc);
      setIsViewModal(true);
    } catch { message.error("Failed to fetch TC details"); }
  };

  // ── Cancel TC ────────────────────────────────────────────────────────────
  const handleCancelTc = async (id, name) => {
    if (!window.confirm(`Cancel TC for ${name}? This will restore the student to the active list.`)) return;
    setCancelLoading(true);
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/tc/cancelTc/${id}`);
      message.success("TC cancelled and student restored to active list");
      fetchTcList();
    } catch (err) {
      message.error(err.response?.data?.error || "Failed to cancel TC");
    } finally { setCancelLoading(false); }
  };

  // ── Print ────────────────────────────────────────────────────────────────
  const handlePrint = (tc) => {
    if (!tc) { message.error("No TC data found"); return; }
    const pw = window.open("", "_blank");
    pw.document.title = `TC - ${tc.tcNumber}`;
    pw.document.write(prepareTcPrint(tc));
    pw.document.close();
    pw.print();
  };

  const prepareTcPrint = (tc) => {
    const school = tc.School || {};
    const val = (v) => v || "\u2014";
    const field = (label, value) =>
      `<div class="field-box"><div class="field-label">${label}</div><div class="field-value">${val(value)}</div></div>`;
    const sec = (title) =>
      `<div class="section-title">${title}</div>`;
    const isIssued = tc.status === "Issued";

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Transfer Certificate \u2013 ${tc.tcNumber || ""}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1e293b; background: #fff; }
  @page { size: A4; margin: 15mm 12mm; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none; } }

  /* ── Header ── */
  .header { display: flex; align-items: center; gap: 18px; padding-bottom: 14px; border-bottom: 2.5px solid #6d28d9; margin-bottom: 16px; }
  .logo-wrap { width: 150px; height: 150px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .logo-wrap img { width: 100%; height: 100%; object-fit: contain; }
  .logo-placeholder { font-size: 30px; }
  .school-info { flex: 1; }
  .school-name { font-size: 17px; font-weight: 700; color: #1a2236; letter-spacing: -0.3px; line-height: 1.3; }
  .school-meta { margin-top: 2px; display: flex; flex-direction: column; gap: 3px; }
  .school-meta-row { font-size: 11.5px; color: #475569; }
  .badge-wrap { text-align: right; flex-shrink: 0; }
  .tc-badge { display: inline-block; background: #f5f3ff; color: #6d28d9; border: 1px solid #c4b5fd; border-radius: 20px; padding: 3px 12px; font-size: 11px; font-weight: 700; letter-spacing: 0.4px; margin-bottom: 6px; }
  .tcnum-label { font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px; }
  .tcnum-value { font-size: 15px; font-weight: 700; color: #6d28d9; margin-top: 2px; }
  .tcnum-year  { font-size: 11px; color: #64748b; margin-top: 2px; }

  /* ── TC info strip ── */
  .tc-strip { display: flex; gap: 0; background: #faf5ff; border: 1px solid #c4b5fd; border-radius: 7px; overflow: hidden; margin-bottom: 14px; }
  .tc-cell  { flex: 1; padding: 7px 12px; border-right: 1px solid #c4b5fd; }
  .tc-cell:last-child { border-right: none; }
  .tc-cell .tl { font-size: 10px; font-weight: 600; color: #6d28d9; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 2px; }
  .tc-cell .tv { font-size: 12px; font-weight: 600; color: #1e293b; }

  /* ── Status badge ── */
  // .status-issued    { display:inline-block; padding:3px 12px; border-radius:20px; font-size:12px; font-weight:700; background:#f0fdf4; color:#15803d; border:1px solid #86efac; }
  // .status-cancelled { display:inline-block; padding:3px 12px; border-radius:20px; font-size:12px; font-weight:700; background:#fff1f2; color:#be123c; border:1px solid #fda4af; }

  /* ── Section title ── */
  .section-title { font-size: 11px; font-weight: 700; color: #fff; background: #4c1d95; padding: 5px 12px; border-radius: 5px; margin: 14px 0 8px; text-transform: uppercase; letter-spacing: 0.6px; }

  /* ── Fields grid ── */
  .fields-grid   { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: #e2e8f0; border: 1px solid #e2e8f0; border-radius: 7px; overflow: hidden; }
  .fields-grid-2 { grid-template-columns: repeat(2, 1fr); }
  .field-box     { background: #fff; padding: 7px 11px; }
  .field-box:nth-child(even) { background: #f8fafc; }
  .field-label   { font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 2px; }
  .field-value   { font-size: 12px; color: #1e293b; font-weight: 500; word-break: break-word; }
  .field-full    { grid-column: 1 / -1; }

  /* ── Footer ── */
  .footer { margin-top: 28px; border-top: 1px solid #e2e8f0; padding-top: 14px; display: flex; justify-content: space-between; align-items: flex-end; }
  .footer-sig .sig-line { width: 140px; border-top: 1px solid #1e293b; margin: 0 auto 4px; padding-top: 4px; font-size: 10.5px; color: #475569; text-align: center; }
</style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div class="logo-wrap">
      ${school.logo ? `<img src="${school.logo}" alt="logo"/>` : `<span class="logo-placeholder">\uD83C\uDFEB</span>`}
    </div>
    <div class="school-info">
      <div class="school-name">${val(school.name || user?.school?.name)}</div>
      <div class="school-meta">
        ${school.address||school.city ? `<div class="school-meta-row">${[school.address,school.city,school.state,school.pincode].filter(Boolean).join(", ")}</div>` : ""}
        ${school.phoneNumber ? `<div class="school-meta-row">${school.phoneNumber}</div>` : ""}
        ${school.email ? `<div class="school-meta-row">${school.email}</div>` : ""}
      </div>
    </div>
    <div class="badge-wrap">
      <div class="tcnum-label">TC Number</div>
      <div class="tcnum-value">${val(tc.tcNumber)}</div>
      <div class="tcnum-year">${val(tc.academicYear)}</div>
    </div>
  </div>

  <!-- TC info strip -->
  <div class="tc-strip">
    <div class="tc-cell"><div class="tl">TC Date</div><div class="tv">${val(tc.tcDate)}</div></div>
    <div class="tc-cell"><div class="tl">Withdrawn No</div><div class="tv">${val(tc.withdrawnNumber)}</div></div>
    <div class="tc-cell"><div class="tl">Grade</div><div class="tv">${val(tc.grade)}</div></div>
    <div class="tc-cell"><div class="tl">Section</div><div class="tv">${val(tc.section)}</div></div>
    <div class="tc-cell"><div class="tl">Status</div><div class="tv"><span class="${isIssued ? "status-issued" : "status-cancelled"}">${val(tc.status)}</span></div></div>
  </div>

  <!-- Student Details -->
  ${sec("Student Details")}
  <div class="fields-grid fields-grid-2">
    ${field("Student Name", tc.studentName)}
    ${field("Admission Number", tc.admissionNumber)}
    ${field("Academic Year", tc.academicYear)}
    ${field("Grade &amp; Section", `${tc.grade || "\u2014"} / ${tc.section || "\u2014"}`)}
  </div>

  <!-- TC Details -->
  ${sec("Transfer Certificate Details")}
  <div class="fields-grid fields-grid-2">
    ${field("TC Number", tc.tcNumber)}
    ${field("Withdrawn Number", tc.withdrawnNumber)}
    ${field("TC Date", tc.tcDate)}
    ${field("Conduct Certificate", tc.conductCertificate)}
  </div>
  <div class="fields-grid" style="margin-top:1px">
    <div class="field-box field-full"><div class="field-label">Reason for Transfer</div><div class="field-value">${val(tc.reason)}</div></div>
    <div class="field-box field-full"><div class="field-label">Remarks</div><div class="field-value">${val(tc.remarks)}</div></div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-sig"><div class="sig-line">Parent / Guardian Signature</div></div>
    <div class="footer-sig"><div class="sig-line">Class Teacher Signature</div></div>
    <div class="footer-sig"><div class="sig-line">Principal Signature</div></div>
  </div>

</body>
</html>`;
  };

  // ── Columns ──────────────────────────────────────────────────────────────
  const columns = [
    { key: "sno",      label: "S.No"         },
    { key: "tcNumber", label: "TC Number"     },
    { key: "wdNum",    label: "Withdrawn No"  },
    ...(isSuperAdmin ? [{ key: "school", label: "School" }] : []),
    { key: "name",     label: "Student Name"  },
    { key: "admNo",    label: "Admission No"  },
    { key: "year",     label: "Academic Year" },
    { key: "grade",    label: "Grade"         },
    { key: "section",  label: "Section"       },
    { key: "tcDate",   label: "TC Date"       },
    { key: "reason",   label: "Reason"        },
    { key: "status",   label: "Status"        },
    { key: "action",   label: "Action"        },
  ];

  const cards = [
    { label: "Total Issued", value: tcList.length,                                      color: COLOR.purple, bg: COLOR.purpleBg },
    { label: "Active",       value: tcList.filter(t => t.status === "Issued").length,    color: COLOR.green,  bg: COLOR.greenBg  },
    { label: "Cancelled",    value: tcList.filter(t => t.status === "Cancelled").length, color: COLOR.danger, bg: COLOR.dangerBg },
  ];

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════
  return (
    <Layout>
      <div className="app-page" style={{ fontFamily: FF }}>

        {/* ── Page title ───────────────────────────────────────────────── */}
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLOR.text, margin: 0, letterSpacing: "-0.3px", fontFamily: FF }}>
           TC Students List (SSLC)
          </h1>
          <div style={{ width: 40, height: 3, background: COLOR.blueLt, borderRadius: 2, marginTop: 6 }} />
        </div>

        {/* ── Summary cards ────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          {cards.map(c => (
            <div key={c.label} style={{
              background: c.bg, border: `1.5px solid ${c.color}25`,
              borderRadius: 8, padding: "10px 20px",
              display: "flex", flexDirection: "column", gap: 2, minWidth: 110,
            }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: c.color, lineHeight: 1.2 }}>{c.value}</span>
              <span style={{ fontSize: 11.5, fontWeight: 500, color: COLOR.textMid, whiteSpace: "nowrap" }}>{c.label}</span>
            </div>
          ))}
        </div>

        {/* ── Filter row ───────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>

          {/* Global filter badge */}
          {(selectedSchool !== "all" || selectedYear) && (
            <div style={{ fontSize: "13px", color: COLOR.filterText, background: COLOR.filterBg, padding: "6px 14px", borderRadius: 6, fontWeight: 500, fontFamily: FF }}>
              Showing: {selectedSchool !== "all" ? selectedSchoolName : "All Schools"}{selectedYear ? ` | ${selectedYear}` : ""}
            </div>
          )}

          {/* Search */}
          <div style={{ flex: "1 1 200px", minWidth: 0, maxWidth: 340 }}>
            <Input
              placeholder="Search name, admission no, TC no..."
              prefix={<SearchOutlined style={{ color: COLOR.textSoft }} />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: "100%", borderRadius: 7 }}
              allowClear
            />
          </div>

          {/* Status filter */}
          <div style={{ flex: "0 0 150px" }}>
            <Select placeholder="Status" allowClear value={filterStatus} onChange={val => setFilterStatus(val)} style={{ width: "100%" }}>
              <Option value="Issued">Issued</Option>
              <Option value="Cancelled">Cancelled</Option>
            </Select>
          </div>

          {/* Clear */}
          {(searchText || filterStatus) && (
            <button
              onClick={() => { setSearchText(""); setFilterStatus(null); }}
              style={{
                all: "unset", padding: "6px 13px", borderRadius: 7,
                border: `1px solid ${COLOR.border}`, cursor: "pointer",
                fontSize: 12.5, color: COLOR.textMid, background: "#fff",
                whiteSpace: "nowrap", flexShrink: 0,
              }}
            >
              Clear
            </button>
          )}

          {/* Record count */}
          <span style={{ marginLeft: "auto", fontSize: 12.5, color: COLOR.textSoft, whiteSpace: "nowrap", flexShrink: 0 }}>
            {filtered.length} / {tcList.length} records
          </span>
        </div>

        {/* ── Table card ──────────────────────────────────────────────── */}
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", overflow: "hidden", border: `1px solid ${COLOR.border}` }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FF, fontSize: FS, minWidth: 800 }}>
              <thead>
                <tr style={{ background: COLOR.headBg }}>
                  {columns.map(col => (
                    <th key={col.key} style={{
                      padding: "13px 14px", fontWeight: 600, fontSize: 13,
                      color: COLOR.headText, whiteSpace: "nowrap", letterSpacing: "0.2px",
                      textAlign: col.key === "action" ? "center" : "left",
                    }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((tc, idx) => (
                    <tr
                      key={tc.id}
                      onMouseEnter={e => e.currentTarget.style.background = COLOR.rowHover}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? COLOR.rowOdd : COLOR.rowEven}
                      style={{ background: idx % 2 === 0 ? COLOR.rowOdd : COLOR.rowEven, transition: "background 0.12s", borderBottom: `1px solid ${COLOR.border}` }}
                    >
                      {/* S.No */}
                      <td style={{ padding: "11px 14px", color: COLOR.text, fontWeight: 600 }}>{idx + 1}</td>

                      {/* TC Number */}
                      <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                        <span style={{ background: COLOR.purpleBg, color: COLOR.purple, fontWeight: 700, padding: "3px 10px", borderRadius: 6, fontSize: 13, border: `1px solid ${COLOR.purple}30` }}>
                          {tc.tcNumber}
                        </span>
                      </td>

                      {/* Withdrawn No */}
                      <td style={{ padding: "11px 14px", textAlign: "center" }}>
                        <span style={{ display: "inline-block", minWidth: 32, textAlign: "center", background: "#f0f5ff", color: "#2f54eb", fontWeight: 700, padding: "3px 10px", borderRadius: 6, fontSize: 13, border: "1px solid #adc6ff" }}>
                          {tc.withdrawnNumber}
                        </span>
                      </td>

                      {/* School — superadmin only */}
                      {isSuperAdmin && (
                        <td style={{ padding: "11px 14px", color: COLOR.textMid, whiteSpace: "nowrap" }}>
                          {tc.School?.name || "N/A"}
                        </td>
                      )}

                      <td style={{ padding: "11px 14px", color: COLOR.text, fontWeight: 500 }}>{tc.studentName || "N/A"}</td>
                      <td style={{ padding: "11px 14px", color: COLOR.blueLt, fontWeight: 600, whiteSpace: "nowrap" }}>{tc.admissionNumber || "N/A"}</td>
                      <td style={{ padding: "11px 14px", color: COLOR.textMid, whiteSpace: "nowrap" }}>{tc.academicYear || "N/A"}</td>
                      <td style={{ padding: "11px 14px", color: COLOR.textMid }}>{tc.grade || "N/A"}</td>
                      <td style={{ padding: "11px 14px", color: COLOR.textMid }}>{tc.section || "N/A"}</td>
                      <td style={{ padding: "11px 14px", color: COLOR.textMid, whiteSpace: "nowrap" }}>{tc.tcDate || "N/A"}</td>

                      {/* Reason */}
                      <td style={{ padding: "11px 14px", color: COLOR.textMid, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <Tooltip title={tc.reason}>{tc.reason || "N/A"}</Tooltip>
                      </td>

                      {/* Status */}
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{
                          padding: "3px 11px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                          background: tc.status === "Issued" ? COLOR.greenBg  : COLOR.dangerBg,
                          color:      tc.status === "Issued" ? COLOR.green    : COLOR.danger,
                          border: `1px solid ${tc.status === "Issued" ? COLOR.green : COLOR.danger}30`,
                        }}>
                          {tc.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "8px 14px", textAlign: "center" }}>
                        <div style={{ display: "flex", justifyContent: "center", gap: 2 }}>
                          <IconBtn icon={<EyeOutlined />}     title="View TC"  color={COLOR.purple} bg={COLOR.purpleBg}       onClick={() => handleView(tc.id)} />
                          <IconBtn icon={<PrinterOutlined />} title="Print TC" color="#c2580a"      bg="rgba(194,88,10,0.08)" onClick={() => handlePrint(tc)} />
                          {isSuperAdmin && tc.status === "Issued" && (
                            <IconBtn icon={<RollbackOutlined />} title="Cancel TC & Restore Student" color={COLOR.danger} bg={COLOR.dangerBg} onClick={() => handleCancelTc(tc.id, tc.studentName)} />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length} style={{ textAlign: "center", padding: "48px 16px", color: COLOR.textSoft, fontSize: FS }}>
                      <FileTextOutlined style={{ fontSize: 32, marginBottom: 8, display: "block", color: "#d9d9d9" }} />
                      No TC records found{selectedYear ? ` for ${selectedYear}` : ""}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            VIEW MODAL
        ════════════════════════════════════════════════════════════════ */}
        {isViewModal && selectedTc && (
          <Modal
            title={
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FileTextOutlined style={{ color: COLOR.purple, fontSize: 18 }} />
                <span style={{ fontFamily: FF, fontWeight: 700, fontSize: 16, color: COLOR.text }}>
                  TC Details — {selectedTc.tcNumber}
                </span>
              </div>
            }
            open={isViewModal}
            onCancel={() => setIsViewModal(false)}
            width="min(700px, 96vw)"
            footer={[
              <button key="print" onClick={() => handlePrint(selectedTc)}
                style={{ all: "unset", padding: "8px 20px", borderRadius: 7, background: "#c2580a", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 13, marginRight: 8, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <PrinterOutlined /> Print TC
              </button>,
              <button key="close" onClick={() => setIsViewModal(false)}
                style={{ all: "unset", padding: "8px 20px", borderRadius: 7, border: `1px solid ${COLOR.border}`, background: "#fff", color: COLOR.textMid, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
                Close
              </button>,
            ]}
          >
            <Descriptions bordered
              column={{ xxl: 2, xl: 2, lg: 2, md: 2, sm: 1, xs: 1 }}
              size="small"
              labelStyle={{ fontWeight: 600, color: COLOR.textMid, background: "#f8fafc", fontFamily: FF, fontSize: "12.5px" }}
              contentStyle={{ fontFamily: FF, fontSize: "12.5px", color: COLOR.text }}
            >
              <Descriptions.Item label="TC Number" span={2}>
                <span style={{ background: COLOR.purpleBg, color: COLOR.purple, fontWeight: 700, padding: "3px 14px", borderRadius: 6, fontSize: 14, border: `1px solid ${COLOR.purple}30` }}>
                  {selectedTc.tcNumber}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Withdrawn Number">
                <span style={{ background: "#f0f5ff", color: "#2f54eb", fontWeight: 700, padding: "3px 12px", borderRadius: 6, border: "1px solid #adc6ff" }}>
                  {selectedTc.withdrawnNumber}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <span style={{
                  padding: "3px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                  background: selectedTc.status === "Issued" ? COLOR.greenBg  : COLOR.dangerBg,
                  color:      selectedTc.status === "Issued" ? COLOR.green    : COLOR.danger,
                  border: `1px solid ${selectedTc.status === "Issued" ? COLOR.green : COLOR.danger}30`,
                }}>
                  {selectedTc.status}
                </span>
              </Descriptions.Item>
              {isSuperAdmin && (
                <Descriptions.Item label="School" span={2}>{selectedTc.School?.name || "N/A"}</Descriptions.Item>
              )}
              <Descriptions.Item label="Student Name">{selectedTc.studentName || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Admission Number">{selectedTc.admissionNumber || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Academic Year">{selectedTc.academicYear || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="TC Date">{selectedTc.tcDate || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Grade">{selectedTc.grade || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Section">{selectedTc.section || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Reason for Transfer" span={2}>{selectedTc.reason || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Conduct Certificate">{selectedTc.conductCertificate || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Remarks">{selectedTc.remarks || "—"}</Descriptions.Item>
            </Descriptions>
          </Modal>
        )}

      </div>
    </Layout>
  );
};

export default TcStudentsList;