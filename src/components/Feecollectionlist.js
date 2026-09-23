import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Layout from "./Layout";
import { EditOutlined, PrinterOutlined, PlusOutlined } from "@ant-design/icons";
import { useFilter } from "./FilterContext";

const BASE = `${process.env.REACT_APP_API_URL}`;

const ACADEMIC_YEAR_OPTIONS = ["2024-2025", "2025-2026", "2026-2027"];
const GRADE_OPTIONS = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
const RECORDS_PER_PAGE = 10;

/* ── Sidebar colour tokens ── */
const C = {
  primary:      "#1d2a4d",
  accent:       "#4f8ef7",
  accentLight:  "#e8f0fe",
  success:      "#22c55e",
  successLight: "#dcfce7",
  warning:      "#f59e0b",
  warningLight: "#fef3c7",
  danger:       "#ef4444",
  border:       "#d1dae8",
  bg:           "#f4f6fb",
  card:         "#ffffff",
  text:         "#1d2a4d",
  muted:        "#6b7a99",
};

const inputStyle = {
  padding: "6px 10px", border: `1.5px solid ${C.border}`,
  borderRadius: 7, fontSize: 13, color: C.text,
  background: "#fff", outline: "none", width: "100%", boxSizing: "border-box",
};

const labelStyle = {
  fontSize: 11, fontWeight: 700, color: C.muted,
  textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3, display: "block",
};

const modeColor = (m) =>
  m === "Cash" ? C.success : m === "Online" ? C.accent : m === "Cheque" ? "#8b5cf6" : C.muted;

const FeeCollectionList = () => {
  const user     = JSON.parse(localStorage.getItem("user") || "{}");
  const rawRole  = (user?.roleName || "").toString().trim().toLowerCase().replace(/\s+/g, "");
  const isAdmin  = rawRole === "superadmin";
  const schoolId = user?.school?.id || null;
  const navigate = useNavigate();
  const { selectedSchool, selectedYear } = useFilter();

  const [allData,   setAllData]   = useState([]);
  const [filtered,  setFiltered]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [filterYear,      setFilterYear]      = useState("");
  const [filterCourse,    setFilterCourse]    = useState("");
  const [filterMedium,    setFilterMedium]    = useState("");
  const [filterGrade,     setFilterGrade]     = useState("");
  const [filterSection,   setFilterSection]   = useState("");
  const [filterAdmission, setFilterAdmission] = useState("");
  const [filterDate,      setFilterDate]      = useState("");
  const [sectionOptions,  setSectionOptions]  = useState([]);
  const [mediumOptions,   setMediumOptions]   = useState([]);

  const [editRecord, setEditRecord] = useState(null);
  const [editForm,   setEditForm]   = useState({});
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { applyFilters(); }, [allData, filterYear, filterCourse, filterMedium, filterGrade, filterSection, filterAdmission, filterDate, selectedSchool, selectedYear]);
  useEffect(() => { setCurrentPage(1); }, [filtered.length]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const url = isAdmin
        ? `${BASE}/feeCollection/getAllRecords`
        : schoolId ? `${BASE}/feeCollection/getAllBySchool/${schoolId}`
        : `${BASE}/feeCollection/getAllRecords`;
      const res  = await axios.get(url);
      const data = res.data.data || [];
      setAllData(data);
      setSectionOptions([...new Set(data.map((c) => c.section).filter(Boolean))].sort());
      setMediumOptions([...new Set(data.map((c) => c.medium).filter(Boolean))].sort());
    } catch { alert("Failed to fetch data"); }
    finally   { setLoading(false); }
  };


  const applyFilters = () => {
    let result = [...allData];
    const norm = (y) => y?.replace(/\s*-\s*/g, "-").trim();
    // Header-level filters (superadmin school & year selector)
    if (isAdmin && selectedSchool && selectedSchool !== "all")
      result = result.filter((c) => String(c.school_id) === String(selectedSchool));
    if (selectedYear)
      result = result.filter((c) => norm(c.academic_year) === norm(selectedYear));
    if (filterYear)      result = result.filter((c) => norm(c.academic_year) === norm(filterYear));
    if (filterCourse)    result = result.filter((c) => c.course === filterCourse);
    if (filterMedium)    result = result.filter((c) => c.medium?.toLowerCase() === filterMedium.toLowerCase());
    if (filterGrade)     result = result.filter((c) => c.grade === filterGrade);
    if (filterSection)   result = result.filter((c) => c.section === filterSection);
    if (filterAdmission) result = result.filter((c) => c.admission_number?.toLowerCase().includes(filterAdmission.toLowerCase()));
    if (filterDate)      result = result.filter((c) => c.collection_date === filterDate);
    setFiltered(result);
  };

  const handleReset = () => {
    setFilterYear(""); setFilterCourse(""); setFilterMedium("");
    setFilterGrade(""); setFilterSection(""); setFilterAdmission(""); setFilterDate("");
  };

  const formatDate = (d) => {
    if (!d) return "—";
    const str   = typeof d === "string" ? d.split("T")[0] : String(d);
    const parts = str.split("-");
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d;
  };

  const formatINR = (val) =>
    `${parseFloat(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  const totalPaid    = filtered.reduce((s, c) => s + parseFloat(c.paid_amount    || 0), 0);
  const totalBalance = filtered.reduce((s, c) => s + parseFloat(c.balance_amount || 0), 0);

  const totalPages = Math.ceil(filtered.length / RECORDS_PER_PAGE);
  const paginated  = filtered.slice((currentPage - 1) * RECORDS_PER_PAGE, currentPage * RECORDS_PER_PAGE);
  const goToPage   = (p) => { if (p >= 1 && p <= totalPages) setCurrentPage(p); };

  /* ── Edit ── */
  const openEdit = (record) => {
    setEditRecord(record);
    setEditForm({
      student_name:     record.student_name     || "",
      admission_number: record.admission_number || "",
      academic_year:    record.academic_year    || "",
      course:           record.course           || "",
      grade:            record.grade            || "",
      section:          record.section          || "",
      medium:           record.medium           || "",
      paid_amount:      record.paid_amount      || "",
      balance_amount:   record.balance_amount   || "",
      payment_mode:     record.payment_mode     || "Cash",
      collection_date:  record.collection_date  ? record.collection_date.split("T")[0] : "",
      receipt_no:       record.receipt_no       || "",
    });
  };
  const closeEdit        = () => { setEditRecord(null); setEditForm({}); };
  const handleEditChange = (e) => { const { name, value } = e.target; setEditForm((p) => ({ ...p, [name]: value })); };
  const handleEditSave   = async () => {
    try {
      setEditSaving(true);
      await axios.put(`${BASE}/feeCollection/update/${editRecord.id}`, editForm);
      setAllData((prev) => prev.map((item) => item.id === editRecord.id ? { ...item, ...editForm } : item));
      alert("Record updated successfully!");
      closeEdit();
    } catch { alert("Failed to update record."); }
    finally   { setEditSaving(false); }
  };

  /* ── Print Receipt ── */
  const handlePrintReceipt = async (record) => {
    let feeItemsArr = record.fee_items || [];
    if (typeof feeItemsArr === "string") { try { feeItemsArr = JSON.parse(feeItemsArr); } catch { feeItemsArr = []; } }
    if (!Array.isArray(feeItemsArr)) feeItemsArr = [];

    // Fetch school on-demand using school_id — works even if record.school is missing
    let recordSchool = record.school || null;
    if (!recordSchool?.name && record.school_id) {
      try {
        const sRes = await axios.get(`${BASE}/feeCollection/getSchool/${record.school_id}`);
        recordSchool = sRes.data?.data || sRes.data || null;
      } catch { /* silent fallback */ }
    }
    console.log("[Receipt] school_id:", record.school_id, "=> school:", recordSchool?.name);
    const schoolName    = recordSchool?.name    || record.school_name    || user?.school?.name    || "School Name";
    const schoolAddress = recordSchool?.address || record.school_address || user?.school?.address || "";
    const schoolLogo    = recordSchool?.logo    || record.school_logo    || user?.school?.logo    || "";
        const balanceAmt    = parseFloat(record.balance_amount || 0);
    const paidAmt       = parseFloat(record.paid_amount    || 0);

    const feeItemsRows = feeItemsArr.length > 0
      ? feeItemsArr.map((f, idx) => `<tr><td>${idx + 1}</td><td>${f.type || f.name || "—"}</td><td style="text-align:right">${parseFloat(f.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td></tr>`).join("")
      : `<tr><td colspan="3" style="text-align:center;color:#888;padding:12px">No fee items listed</td></tr>`;

    const balanceRow = balanceAmt > 0
      ? `<tr style="color:#c0392b"><td colspan="2" style="padding:8px 12px;font-weight:600">Balance Due</td><td style="text-align:right;padding:8px 12px;font-weight:700">${balanceAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td></tr>`
      : "";

    /* Stamp shown centered above Authorized Signature — nothing else beside it */
    const paidStamp = balanceAmt === 0
      ? `<div style="display:inline-block;border:3px solid #27ae60;color:#27ae60;font-weight:800;font-size:22px;padding:6px 20px;border-radius:6px;transform:rotate(-12deg);letter-spacing:3px;">PAID</div>`
      : `<div style="display:inline-block;border:3px solid #e67e22;color:#e67e22;font-weight:800;font-size:18px;padding:6px 16px;border-radius:6px;transform:rotate(-12deg);letter-spacing:2px;">PARTIAL</div>`;

    /* School logo HTML — shown only if logo URL exists */
    const logoHTML = schoolLogo
      ? `<img src="${schoolLogo}" alt="School Logo" style="height:70px;width:70px;object-fit:contain;flex-shrink:0;" />`
      : "";

    const receiptHTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Fee Receipt - ${record.receipt_no || "Receipt"}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',Tahoma,sans-serif;background:#f0f4f8;display:flex;justify-content:center;padding:30px 20px;min-height:100vh;}.rw{background:#fff;width:210mm;padding:0;box-shadow:0 4px 24px rgba(0,0,0,0.12);border-radius:4px;overflow:hidden;}.hd{background:linear-gradient(135deg,#1d2a4d 0%,#2d4073 100%);color:white;padding:22px 32px 18px;display:flex;align-items:center;gap:20px;position:relative;}.hd-logo{flex-shrink:0;display:flex;align-items:center;}.hd-info{flex:1;text-align:center;}.hd::after{content:'';position:absolute;bottom:-12px;left:0;right:0;height:24px;background:white;clip-path:ellipse(55% 100% at 50% 100%);z-index:1;}.sn{font-size:24px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;}.sa{font-size:12px;opacity:0.85;margin-bottom:10px;}.rb{display:inline-block;background:rgba(255,255,255,0.2);border:1.5px solid rgba(255,255,255,0.5);color:white;font-size:12px;font-weight:600;letter-spacing:3px;padding:4px 18px;border-radius:20px;text-transform:uppercase;}.bd{padding:28px 32px 24px;}.rm{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:14px;border-bottom:2px dashed #e0e0e0;}.rn{font-size:13px;color:#555;}.rn span{font-weight:700;color:#1d2a4d;font-size:15px;}.rd{font-size:13px;color:#555;text-align:right;}.rd span{font-weight:700;color:#333;}.ig{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin-bottom:20px;background:#f8f9ff;border-radius:8px;padding:16px;}.ir{display:flex;flex-direction:column;gap:2px;}.il{font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.8px;}.iv{font-size:13px;font-weight:600;color:#222;}table{width:100%;border-collapse:collapse;font-size:13px;}thead tr{background:#1d2a4d;color:white;}th{padding:10px 12px;text-align:left;font-weight:600;font-size:12px;}tbody tr:nth-child(even){background:#f5f7ff;}td{padding:9px 12px;border-bottom:1px solid #eee;color:#333;}.tr{background:#e8eaf6!important;font-weight:700;font-size:14px;}.tr td{color:#1d2a4d;border-bottom:none;padding:11px 12px;}.ft{margin-top:22px;padding-top:16px;border-top:1.5px dashed #ddd;display:flex;justify-content:space-between;align-items:flex-end;}.nt{font-size:10.5px;color:#999;line-height:1.8;}.sig-block{display:flex;flex-direction:column;align-items:center;gap:0;}.sl{width:130px;border-top:1.5px solid #555;padding-top:6px;font-size:11px;color:#666;font-weight:600;text-align:center;}@media print{body{background:white;padding:0;}.rw{box-shadow:none;width:100%;}@page{size:A5 landscape;margin:10mm;}}</style>
      </head><body><div class="rw">
      <div class="hd">${logoHTML ? `<div class="hd-logo">${logoHTML}</div>` : ""}<div class="hd-info"><div class="sn">${schoolName}</div>${schoolAddress ? `<div class="sa">${schoolAddress}</div>` : ""}<div class="rb">Fee Payment Receipt</div></div></div>
      <div class="bd"><div class="rm"><div class="rn">Receipt No: <span>${record.receipt_no || "—"}</span></div><div class="rd">Date: <span>${formatDate(record.collection_date)}</span></div></div>
      <div class="ig"><div class="ir"><span class="il">Student Name</span><span class="iv">${record.student_name || "—"}</span></div><div class="ir"><span class="il">Admission Number</span><span class="iv">${record.admission_number || "—"}</span></div><div class="ir"><span class="il">Academic Year</span><span class="iv">${record.academic_year || "—"}</span></div><div class="ir"><span class="il">Course</span><span class="iv">${record.course || "—"}</span></div><div class="ir"><span class="il">Grade &amp; Section</span><span class="iv">${record.grade || "—"} — ${record.section || "—"}</span></div><div class="ir"><span class="il">Medium</span><span class="iv">${record.medium || "—"}</span></div><div class="ir"><span class="il">Payment Mode</span><span class="iv">${record.payment_mode || "Cash"}</span></div></div>
      <table><thead><tr><th width="40">#</th><th>Fee Type</th><th style="text-align:right">Amount</th></tr></thead><tbody>${feeItemsRows}<tr class="tr"><td colspan="2">Total Paid</td><td style="text-align:right">${paidAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td></tr>${balanceRow}</tbody></table>
      <div style="margin-top:20px;padding-top:14px;border-top:1.5px dashed #ddd;display:flex;justify-content:space-between;align-items:flex-end;">
        <div style="font-size:10.5px;color:#999;line-height:1.9;flex:1;">* This is a computer-generated receipt.<br/>* Please retain this receipt for your records.<br/>* For queries, contact the school office.</div>
        <div style="flex:1;display:flex;justify-content:center;align-items:flex-end;">${paidStamp}</div>
        <div style="flex:1;display:flex;justify-content:flex-end;align-items:flex-end;">
          <div style="width:140px;border-top:1.5px solid #555;padding-top:6px;font-size:11px;color:#666;font-weight:600;text-align:center;">Authorized Signature</div>
        </div>
      </div>
      </div></div><script>window.onload=function(){setTimeout(function(){window.print();},400);};</script></body></html>`;

    const pw = window.open("", "_blank", "width=950,height=720");
    if (pw) { pw.document.write(receiptHTML); pw.document.close(); }
    else alert("Popup blocked. Please allow popups to print receipts.");
  };

  const activeFilters = [
    filterYear      && `Year: ${filterYear}`,
    filterMedium    && `Medium: ${filterMedium}`,
    filterGrade     && `Grade: ${filterGrade}`,
    filterSection   && `Section: ${filterSection}`,
    filterAdmission && `Admission: ${filterAdmission}`,
    filterDate      && `Date: ${formatDate(filterDate)}`,
  ].filter(Boolean);

  const hasActiveFilter = activeFilters.length > 0;

  /* ════════════════════════════════
     UI
  ════════════════════════════════ */
  return (
    <Layout>
      <style>{`
        /* ── PRINT ── */
        .fcl-print-only { display: none; }
        @media print {
          @page { size: A4 landscape; margin: 8mm 6mm; }
          html, body { width: 100%; margin: 0; padding: 0; }
          body * { visibility: hidden; }
          #fclPrintArea, #fclPrintArea * { visibility: visible; }
          #fclPrintArea { position: absolute; top: 0; left: 0; width: 100%; padding: 0; box-sizing: border-box; }
          .no-print { display: none !important; }
          /* show print header */
          .fcl-print-only { display: block !important; text-align: center; margin-bottom: 10px; border-bottom: 2px solid #1d2a4d; padding-bottom: 6px; }
          .fcl-print-only h2 { font-size: 14px; font-weight: bold; margin: 0 0 2px; color: #1d2a4d; }
          .fcl-print-only p  { font-size: 9px; color: #444; margin: 1px 0; }
          /* hide screen table, show print table */
          .fcl-screen-table { display: none !important; }
          .fcl-print-table  { display: table !important; }
          /* print table rules */
          .fcl-print-table {
            width: 100% !important; border-collapse: collapse !important;
            font-size: 8.5px !important; table-layout: auto !important;
          }
          .fcl-print-table thead { display: table-header-group; }
          .fcl-print-table tfoot { display: table-footer-group; }
          .fcl-print-table tbody { display: table-row-group; }
          .fcl-print-table tr   { page-break-inside: avoid; }
          .fcl-print-table th {
            background: #1d2a4d !important; color: #fff !important;
            padding: 5px 6px !important; font-size: 8px !important; font-weight: 700 !important;
            text-transform: uppercase; border: 1px solid #555 !important;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
            white-space: nowrap !important; text-align: left;
          }
          .fcl-print-table th.pr-amt { text-align: right !important; }
          .fcl-print-table td {
            padding: 4px 6px !important; font-size: 8.5px !important;
            color: #000 !important; border: 1px solid #ccc !important;
            white-space: nowrap !important;
          }
          .fcl-print-table td.pr-wrap { white-space: normal !important; word-break: break-word; }
          .fcl-print-table td.pr-amt  { text-align: right !important; font-variant-numeric: tabular-nums; font-weight: 700; }
          .fcl-print-table tbody tr:nth-child(even) td {
            background: #eef2ff !important;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
          .fcl-print-table tfoot td {
            background: #e8f0fe !important; font-weight: 700 !important;
            color: #1d2a4d !important; border: 1px solid #555 !important;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
            white-space: nowrap !important;
          }
          .fcl-print-table tfoot td.pr-amt { text-align: right !important; }
        }


        /* ── TABLE screen ── */
        .fcl-tbl thead tr { background: ${C.primary}; }
        .fcl-tbl thead th { color: #fff; font-weight: 600; font-size: 12px; padding: 11px 13px; white-space: nowrap; text-align: left; }
        .fcl-tbl tbody tr { border-bottom: 1px solid ${C.border}; transition: background 0.12s; }
        .fcl-tbl tbody tr:nth-child(even) { background: ${C.bg}; }
        .fcl-tbl tbody tr:hover { background: ${C.accentLight} !important; }
        .fcl-tbl tbody td { padding: 10px 13px; font-size: 13px; vertical-align: middle; color: ${C.text}; }
        .fcl-tbl tfoot tr { background: ${C.successLight}; }
        .fcl-tbl tfoot td { padding: 11px 13px; font-weight: 700; color: #166534; }

        /* ── PAGINATION ── */
        .pg-btn { border: 1.5px solid ${C.border}; background: #fff; color: ${C.text}; border-radius: 6px; padding: 5px 11px; font-size: 13px; cursor: pointer; font-weight: 500; transition: all 0.15s; min-width: 34px; }
        .pg-btn:hover:not(:disabled) { background: ${C.primary}; color: #fff; border-color: ${C.primary}; }
        .pg-btn.active { background: ${C.primary}; color: #fff; border-color: ${C.primary}; font-weight: 700; }
        .pg-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid #ccc; border-top-color: ${C.accent}; border-radius: 50%; animation: spin 0.7s linear infinite; vertical-align: middle; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="app-page" style={{ background: C.bg, minHeight: "100vh", padding: "20px 24px" }}>

        {/* ── PAGE HEADER ── */}
        <div className="no-print" style={{
          background: `linear-gradient(135deg, ${C.primary} 0%, #2d4073 100%)`,
          borderRadius: 12, padding: "16px 24px", marginBottom: 20,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <h5 style={{ margin: 0, fontWeight: 700, fontSize: 17, color: "#fff" }}>Fee Collection List</h5>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
              {filtered.length} of {allData.length} records
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => window.print()}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                height: 30, padding: "0 13px", borderRadius: 7,
                border: "1.5px solid rgba(255,255,255,0.22)",
                background: "rgba(255,255,255,0.12)", color: "#fff",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>
              <PrinterOutlined style={{ fontSize: 12 }} /> Print
            </button>
            <button
              onClick={() => navigate("/studentfee")}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                height: 30, padding: "0 16px", borderRadius: 7, border: "none",
                background: C.accent, color: "#fff", whiteSpace: "nowrap",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}> Create Demand
            </button>
          </div>
        </div>

        {/* ── FILTERS — single clean row ── */}
        <div className="no-print" style={{
          background: C.card, border: `1.5px solid ${C.border}`,
          borderRadius: 10, padding: "14px 18px", marginBottom: 18,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, alignItems: "end" }}>

            {/* <div>
              <label style={labelStyle}>Year</label>
              <select style={inputStyle} value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                <option value="">All Years</option>
                {ACADEMIC_YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div> */}

            <div>
              <label style={labelStyle}>Medium</label>
              <select style={inputStyle} value={filterMedium} onChange={(e) => setFilterMedium(e.target.value)}>
                <option value="">All</option>
                {mediumOptions.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Grade</label>
              <select style={inputStyle} value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}>
                <option value="">All</option>
                {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Section</label>
              <select style={inputStyle} value={filterSection} onChange={(e) => setFilterSection(e.target.value)}>
                <option value="">All</option>
                {sectionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Date</label>
              <input type="date" style={inputStyle} value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
            </div>

            <div>
              <label style={labelStyle}>Admission No</label>
              <input type="text" style={inputStyle} value={filterAdmission}
                onChange={(e) => setFilterAdmission(e.target.value)} placeholder="Search…" />
            </div>

          </div>

          {/* Active filter pills + reset */}
          {hasActiveFilter && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {activeFilters.map((f) => (
                <span key={f} style={{
                  background: C.accentLight, color: C.accent,
                  fontSize: 11, fontWeight: 600, padding: "2px 10px",
                  borderRadius: 20, border: `1px solid ${C.accent}33`,
                }}>{f}</span>
              ))}
              <button onClick={handleReset} style={{
                background: "none", border: "none", color: C.danger,
                fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "2px 6px",
              }}>✕ Clear</button>
            </div>
          )}
        </div>

        {/* ── SUMMARY STRIP ── */}
        <div className="no-print" style={{
          display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap",
        }}>
          {[
            { label: "Total Records",  value: filtered.length,        color: C.accent,   bg: C.accentLight   },
            { label: "Total Paid",     value: formatINR(totalPaid),   color: C.accent,   bg: C.accentLight   },
            ...(totalBalance > 0 ? [{ label: "Total Balance", value: formatINR(totalBalance), color: C.primary, bg: C.bg }] : []),
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{
              background: bg, border: `1.5px solid ${color}33`,
              borderRadius: 8, padding: "10px 18px",
              display: "flex", flexDirection: "column", gap: 2,
            }}>
              <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
              <span style={{ fontSize: 16, fontWeight: 800, color }}>{value}</span>
            </div>
          ))}
        </div>

        {/* ── PRINT AREA ── */}
        <div id="fclPrintArea">

          {/* Print-only header */}
          <div className="fcl-print-only">
            <h2>Fee Collection List</h2>
            <p>Printed on: {new Date().toLocaleDateString("en-IN")}{activeFilters.length > 0 && ` | Filters: ${activeFilters.join(" | ")}`}</p>
            <p style={{ fontWeight: 600 }}>
              Total Records: {filtered.length} | Total Paid: {formatINR(totalPaid)}
              {totalBalance > 0 && ` | Balance: ${formatINR(totalBalance)}`}
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: C.muted }}>
              <div className="spinner" style={{ width: 28, height: 28, border: `3px solid ${C.border}`, borderTopColor: C.accent }} />
              <div style={{ marginTop: 12, fontSize: 14 }}>Loading…</div>
            </div>
          ) : (
            <div className="fcl-screen-table" style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>

              {/* Table card header */}
              <div className="no-print" style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "13px 18px", borderBottom: `1.5px solid ${C.border}`, background: C.bg,
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.primary }}>Fee Collections</span>
                <span style={{ fontSize: 12, color: C.accent, background: C.accentLight, borderRadius: 20, padding: "3px 12px", fontWeight: 600 }}>
                  {filtered.length} record{filtered.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="tbl-wrap" style={{ overflowX: "auto" }}>
                <table className="fcl-tbl" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <colgroup>
                    {isAdmin && <col style={{ width: 70 }} />}
                    <col style={{ width: 44 }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "13%" }} />
                    <col style={{ width: 54 }} />
                    <col style={{ width: 70 }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "11%" }} />
                    <col style={{ width: "11%" }} />
                    <col style={{ width: 90 }} />
                    <col style={{ width: "11%" }} />
                    <col style={{ width: 90 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      {isAdmin && <th className="no-print">Action</th>}
                      <th>S.No</th>
                      <th>Receipt No</th>
                      <th>Admission No</th>
                      <th>Student Name</th>
                      <th>Grade</th>
                      <th>Section</th>
                      <th>Fee Type</th>
                      <th className="amt-r">Paid Amount</th>
                      <th className="amt-r">Balance</th>
                      <th>Payment Mode</th>
                      <th>Transaction ID</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 ? (
                      <tr className="no-print">
                        <td colSpan={isAdmin ? 15 : 14} style={{ textAlign: "center", padding: 40, color: C.muted, fontSize: 14 }}>
                          {allData.length === 0 ? "No fee collections found." : "No records match the selected filters."}
                        </td>
                      </tr>
                    ) : (
                      paginated.map((c, i) => {
                        let feeItemsArr = c.fee_items || [];
                        if (typeof feeItemsArr === "string") { try { feeItemsArr = JSON.parse(feeItemsArr); } catch { feeItemsArr = []; } }
                        if (!Array.isArray(feeItemsArr)) feeItemsArr = [];
                        const feeTypes    = [...new Set(feeItemsArr.map((f) => f.type).filter(Boolean))];
                        const globalIndex = (currentPage - 1) * RECORDS_PER_PAGE + i + 1;

                        return (
                          <tr key={c.id || i}>
                            {isAdmin && (
                              <td className="no-print" style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                                <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
                                  <EditOutlined title="Edit" style={{ fontSize: 16, color: C.accent, cursor: "pointer" }} onClick={() => openEdit(c)} />
                                  <PrinterOutlined title="Print Receipt" style={{ fontSize: 16, color: C.primary, cursor: "pointer" }} onClick={() => handlePrintReceipt(c)} />
                                </div>
                              </td>
                            )}
                            <td style={{ color: C.muted, fontWeight: 600 }}>{globalIndex}</td>
                            <td>
                              <span style={{ background: C.primary, color: "#fff", fontSize: 11, padding: "2px 7px", borderRadius: 4, fontFamily: "monospace", whiteSpace: "nowrap" }}>
                                {c.receipt_no}
                              </span>
                            </td>
                            <td style={{ fontFamily: "monospace", fontSize: 12, color: C.muted }}>{c.admission_number}</td>
                            <td style={{ fontWeight: 600 }}>{c.student_name}</td>
                            <td style={{ textAlign: "center" }}>{c.grade || "—"}</td>
                            <td style={{ textAlign: "center" }}>{c.section || "—"}</td>
                            <td>
                              {feeTypes.length === 0 ? "—" : feeTypes.map((t) => (
                                <span key={t} style={{
                                  display: "inline-block", padding: "2px 9px", borderRadius: 12,
                                  fontSize: 11, fontWeight: 700, marginRight: 3,
                                  background: C.accentLight,
                                  color:      C.accent,
                                }}>{t}</span>
                              ))}
                            </td>
                            <td className="amt-r" style={{ fontWeight: 700, color: "#166534", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                              {formatINR(c.paid_amount)}
                            </td>
                            <td className="amt-r" style={{ fontWeight: 700, textAlign: "right", fontVariantNumeric: "tabular-nums", color: parseFloat(c.balance_amount) > 0 ? C.danger : C.muted }}>
                              {formatINR(c.balance_amount)}
                            </td>
                            <td style={{ fontSize: 13, color: C.text }}>{c.payment_mode || "Cash"}</td>
                            <td style={{ fontSize: 12, color: C.muted, fontFamily: "monospace" }}>
                              {c.transaction_id || "—"}
                            </td>
                            <td style={{ color: C.muted, fontSize: 12 }}>{formatDate(c.collection_date)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>

                  {/* Tfoot — always spans correctly regardless of page */}
                  {filtered.length > 0 && (
                    <tfoot>
                      <tr>
                        <td colSpan={isAdmin ? 8 : 7} style={{ textAlign: "right", fontWeight: 700, color: "#166534", padding: "11px 13px" }}>
                          Total ({filtered.length} records)
                        </td>
                        <td className="amt-r" style={{ textAlign: "right", fontWeight: 800, fontSize: 14, color: "#166534", fontVariantNumeric: "tabular-nums", padding: "11px 13px" }}>
                          {formatINR(totalPaid)}
                        </td>
                        <td className="amt-r" style={{ textAlign: "right", fontWeight: 700, color: C.muted, fontVariantNumeric: "tabular-nums", padding: "11px 13px" }}>
                          {formatINR(totalBalance)}
                        </td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* PAGINATION */}
              {totalPages > 1 && (
                <div className="no-print" style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 18px", borderTop: `1.5px solid ${C.border}`, background: C.bg,
                }}>
                  <span style={{ fontSize: 13, color: C.muted }}>
                    Showing {(currentPage - 1) * RECORDS_PER_PAGE + 1}–{Math.min(currentPage * RECORDS_PER_PAGE, filtered.length)} of {filtered.length}
                  </span>
                  <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                    <button className="pg-btn" onClick={() => goToPage(1)}           disabled={currentPage === 1}>«</button>
                    <button className="pg-btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>‹</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push("..."); acc.push(p); return acc; }, [])
                      .map((p, idx) =>
                        p === "..." ? <span key={`e${idx}`} style={{ padding: "0 4px", color: C.muted }}>…</span>
                          : <button key={p} className={`pg-btn${currentPage === p ? " active" : ""}`} onClick={() => goToPage(p)}>{p}</button>
                      )}
                    <button className="pg-btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>›</button>
                    <button className="pg-btn" onClick={() => goToPage(totalPages)}       disabled={currentPage === totalPages}>»</button>
                  </div>
                </div>
              )}
            </div>
          )}
        {/* ── SEPARATE PRINT TABLE — always correct column count, no action col ── */}
        <table className="fcl-print-table" style={{ display: "none" }}>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Receipt No</th>
              <th>Admission No</th>
              <th>Student Name</th>
              <th>Grade</th>
              <th>Section</th>
              <th>Fee Type</th>
              <th className="pr-amt">Paid Amount</th>
              <th className="pr-amt">Balance</th>
              <th>Payment Mode</th>
              <th>Transaction ID</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => {
              let fi = c.fee_items || [];
              if (typeof fi === "string") { try { fi = JSON.parse(fi); } catch { fi = []; } }
              if (!Array.isArray(fi)) fi = [];
              const ft = [...new Set(fi.map((f) => f.type).filter(Boolean))];
              return (
                <tr key={`pr-${c.id || i}`}>
                  <td>{i + 1}</td>
                  <td style={{ fontFamily: "monospace" }}>{c.receipt_no}</td>
                  <td style={{ fontFamily: "monospace" }}>{c.admission_number}</td>
                  <td className="pr-wrap">{c.student_name}</td>
                  <td>{c.grade || "—"}</td>
                  <td>{c.section || "—"}</td>
                  <td className="pr-wrap">{ft.length === 0 ? "—" : ft.join(", ")}</td>
                  <td className="pr-amt">{formatINR(c.paid_amount)}</td>
                  <td className="pr-amt">{formatINR(c.balance_amount)}</td>
                  <td>{c.payment_mode || "Cash"}</td>
                  <td>{c.transaction_id || "—"}</td>
                  <td>{formatDate(c.collection_date)}</td>
                </tr>
              );
            })}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={7} style={{ textAlign: "right" }}>Total ({filtered.length} records)</td>
                <td className="pr-amt">{formatINR(totalPaid)}</td>
                <td className="pr-amt">{formatINR(totalBalance)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>

        </div>
        {/* END PRINT AREA */}

      </div>

      {/* ── EDIT MODAL ── */}
      {editRecord && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) closeEdit(); }}>
          <div style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", background: C.primary, borderRadius: "12px 12px 0 0" }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>Edit Fee Collection — {editRecord.receipt_no}</span>
              <button onClick={closeEdit} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", borderRadius: 6, padding: "2px 10px" }}>×</button>
            </div>
            <div style={{ padding: "22px 24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 20px" }}>
                {[
                  { label: "Receipt No",        name: "receipt_no",       readOnly: true },
                  { label: "Admission Number",  name: "admission_number" },
                ].map(({ label, name, readOnly }) => (
                  <div key={name} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={labelStyle}>{label}</label>
                    <input name={name} value={editForm[name] || ""} onChange={handleEditChange} readOnly={readOnly}
                      style={{ ...inputStyle, background: readOnly ? C.bg : "#fff", color: readOnly ? C.muted : C.text }} />
                  </div>
                ))}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: "span 2" }}>
                  <label style={labelStyle}>Student Name</label>
                  <input name="student_name" value={editForm.student_name} onChange={handleEditChange} style={inputStyle} />
                </div>
                {[
                  { label: "Academic Year", name: "academic_year", type: "select", options: ACADEMIC_YEAR_OPTIONS.map((y) => ({ v: y, l: y })) },
                  { label: "Course",        name: "course",        type: "select", options: [{ v:"SSLC",l:"SSLC"},{ v:"HSC",l:"HSC"}] },
                  { label: "Grade",         name: "grade",         type: "select", options: GRADE_OPTIONS.map((g) => ({ v: g, l: g })) },
                  { label: "Section",       name: "section",       type: "text" },
                  { label: "Medium",        name: "medium",        type: "select", options: mediumOptions.map((m) => ({ v: m, l: m })) },
                  { label: "Paid Amount",   name: "paid_amount",   type: "number" },
                  { label: "Balance",       name: "balance_amount",type: "number" },
                  { label: "Payment Mode",  name: "payment_mode",  type: "select", options: [{ v:"Cash",l:"Cash"},{ v:"Online",l:"Online"},{ v:"Cheque",l:"Cheque"},{ v:"DD",l:"DD"}] },
                  { label: "Collection Date",name:"collection_date",type: "date" },
                ].map(({ label, name, type, options }) => (
                  <div key={name} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={labelStyle}>{label}</label>
                    {type === "select" ? (
                      <select name={name} value={editForm[name]} onChange={handleEditChange} style={inputStyle}>
                        <option value="">Select</option>
                        {options.map(({ v, l }) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    ) : (
                      <input name={name} type={type} value={editForm[name]} onChange={handleEditChange} style={inputStyle} />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 24px", borderTop: `1px solid ${C.border}`, background: C.bg, borderRadius: "0 0 12px 12px" }}>
              <button onClick={closeEdit} style={{ padding: "7px 18px", borderRadius: 7, border: `1.5px solid ${C.border}`, background: "#fff", color: C.text, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
                Cancel
              </button>
              <button onClick={handleEditSave} disabled={editSaving}
                style={{ padding: "7px 18px", borderRadius: 7, border: "none", background: C.accent, color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
                {editSaving ? <><span className="spinner" /> Saving…</> : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default FeeCollectionList;
