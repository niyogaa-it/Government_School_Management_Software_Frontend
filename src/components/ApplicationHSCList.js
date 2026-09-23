import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { message, Modal, Descriptions, Select, Tooltip } from "antd";
import Layout from "./Layout";
import { EyeOutlined, EditOutlined, CheckCircleOutlined, DeleteOutlined, LeftOutlined, RightOutlined, PrinterOutlined } from "@ant-design/icons";
import { useFilter } from "./FilterContext";
import * as XLSX from "xlsx";
import dayjs from "dayjs";

// ── Fee collection is ONLY available for Rani Lady Meyyammai HR Secondary School ──
const RLMHSS_SHORTCODE = "RLMHSS";
const FEE_AMOUNT = 250;  // ₹250 for HSC

const { Option } = Select;
const PAGE_SIZE = 25;

const COLOR = { blue: "#1e40af", blueLt: "#3b82f6", text: "#1e293b", textMid: "#475569", textSoft: "#64748b", border: "#e2e8f0", rowOdd: "#ffffff", rowEven: "#f8fafc", rowHover: "#eff6ff", headBg: "#1a2236", headText: "#ffffff", danger: "#e21216", dangerBg: "rgba(226,18,22,0.08)", viewBg: "rgba(30,64,175,0.08)", editColor: "#0891b2", editBg: "rgba(8,145,178,0.08)", admitColor: "#16a34a", admitBg: "rgba(22,163,74,0.1)", filterBg: "#eff6ff", filterText: "#1a3c6e" };
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

const ProgressBar = ({ value }) => {
  const color = value === 100 ? "#16a34a" : value >= 80 ? "#7de24a" : value >= 60 ? "#f7de40" : value >= 40 ? "#ff9b31" : "#f86b6e";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 90, height: 7, background: "#e2e8f0", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.3s" }} />
      </div>
      <span style={{ fontSize: "12px", fontWeight: 600, color: value === 100 ? COLOR.admitColor : COLOR.textMid, minWidth: 32 }}>{value}%</span>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const isAdmitted = status === "Admitted";
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: 10,
      fontSize: "11.5px",
      fontWeight: 700,
      letterSpacing: "0.2px",
      color: isAdmitted ? "#166534" : "#1e40af",
      background: isAdmitted ? "#dcfce7" : "#dbeafe",
      whiteSpace: "nowrap",
    }}>
      {status || "Applied"}
    </span>
  );
};

const ApplicationHSCList = () => {
  const [applicationhscs, setApplicationhscs] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [filterGrade, setFilterGrade] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // ── Admit popup state ──────────────────────────────────────────────────────
  const [admitModalVisible, setAdmitModalVisible] = useState(false);
  const [admitApplication, setAdmitApplication] = useState(null);
  const [admitSections, setAdmitSections] = useState([]);
  const [admitSectionId, setAdmitSectionId] = useState(null);
  const [admitLoading, setAdmitLoading] = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState(false);

  // ── Group subjects state ───────────────────────────────────────────────────
  const [groupSubjects, setGroupSubjects] = useState([]);
  const [selectedGroupSubjects, setSelectedGroupSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  // ── Fee Collection state ───────────────────────────────────────────────────
  const [feeModalVisible, setFeeModalVisible] = useState(false);
  const [feeApplication, setFeeApplication] = useState(null);
  const [feePaymentMode, setFeePaymentMode] = useState("cash");
  const [feeTransactionId, setFeeTransactionId] = useState("");
  const [feePaymentDate, setFeePaymentDate] = useState("");
  const [feeLoading, setFeeLoading] = useState(false);

  // ── Fee History state ──────────────────────────────────────────────────────
  const [feeHistoryVisible, setFeeHistoryVisible] = useState(false);
  const [feeHistoryFrom, setFeeHistoryFrom] = useState("");
  const [feeHistoryTo, setFeeHistoryTo] = useState("");

  // ── Search state ───────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");

  // ── Inline Remarks state ───────────────────────────────────────────────────
  const [editingRemarksId, setEditingRemarksId] = useState(null);
  const [remarksValue, setRemarksValue] = useState("");
  const [remarksSaving, setRemarksSaving] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const isSuperAdmin = role === "superadmin";
  const { selectedSchool, selectedYear, selectedSchoolName } = useFilter();

  useEffect(() => { fetchApplicationhsc(); }, [selectedSchool, selectedYear, location.pathname]);
  useEffect(() => { setCurrentPage(1); }, [applicationhscs, filterGrade, filterStatus]);

  // ── RLMHSS school detection ───────────────────────────────────────────────
  const isRLMHSSContext = (app) => {
    const shortcode = (app?.School?.shortcode || "").toUpperCase().trim();
    const schoolName = (app?.School?.name || "").toUpperCase().trim();
    const filterName = (selectedSchoolName || "").toUpperCase().trim();

    if (shortcode === RLMHSS_SHORTCODE) return true;
    if (schoolName.includes("RANI LADY") || schoolName.includes("RLMHSS") || schoolName.includes("MEYYAMMAI")) return true;
    if (filterName.includes("RANI LADY") || filterName.includes("RLMHSS") || filterName.includes("MEYYAMMAI")) return true;

    if (!isSuperAdmin) {
      const userSchoolName = (user?.school?.name || "").toUpperCase().trim();
      const userShortcode = (user?.school?.shortcode || "").toUpperCase().trim();
      if (userShortcode === RLMHSS_SHORTCODE) return true;
      if (userSchoolName.includes("RANI LADY") || userSchoolName.includes("RLMHSS") || userSchoolName.includes("MEYYAMMAI")) return true;
    }

    return false;
  };

  // ── Open Fee Collection Modal ─────────────────────────────────────────────
  const openFeeModal = (app) => {
    setFeeApplication(app);
    setFeePaymentMode("cash");
    setFeeTransactionId("");
    setFeePaymentDate(dayjs().format("YYYY-MM-DD"));
    setFeeModalVisible(true);
  };

  // ── Confirm Fee Collection ─────────────────────────────────────────────────
  const handleFeeConfirm = async () => {
    if (!feePaymentDate) {
      message.warning("Please select a payment date.");
      return;
    }
    if (feePaymentMode === "online" && !feeTransactionId.trim()) {
      message.warning("Please enter the transaction ID for online payment.");
      return;
    }
    setFeeLoading(true);
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/applicationhsc/collectFee/${feeApplication.id}`,
        { paymentMode: feePaymentMode, transactionId: feeTransactionId.trim() || null, paymentDate: feePaymentDate }
      );
      message.success(`Fee collected! Receipt: ${res.data.receiptNumber}`);
      // Update local state immediately with selected payment date so receipt shows correct date
      setApplicationhscs(prev => prev.map(a =>
        a.id === feeApplication.id
          ? { ...a, feeCollected: true, receiptNumber: res.data.receiptNumber, feePaidAt: feePaymentDate, paymentMode: feePaymentMode, transactionId: feeTransactionId.trim() || null }
          : a
      ));
      setFeeModalVisible(false);
      setFeeApplication(null);
      setFeePaymentDate("");
      fetchApplicationhsc();
    } catch (err) {
      message.error(err.response?.data?.error || "Failed to collect fee");
    } finally {
      setFeeLoading(false);
    }
  };

  // ── Print Fee Receipt (A4, two copies, cut line in between) ─────────────
  const handlePrintReceipt = async (app, overrideDate = null) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/applicationhsc/getApplicationhscById/${app.id}`);
      const application = res.data.application;
      const school = application.School || {};
      const val = (v) => v || "—";
      const receiptDate = overrideDate
        ? new Date(overrideDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : application.feePaidAt
          ? new Date(application.feePaidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
          : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      const printedOn = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

      const receiptBlock = () => `
  <div class="receipt">
    <div class="header">
      <div class="logo-wrap">
        ${school.logo ? `<img src="${school.logo}" alt="School Logo"/>` : `<span class="logo-placeholder">🏫</span>`}
      </div>
      <div class="school-block">
        <div class="school-name">${val(school.name)}</div>
        <div class="school-sub">
          ${[school.address, school.city, school.state, school.pincode].filter(Boolean).join(", ")}<br/>
          ${school.email ? `Email: ${school.email}` : ""}${school.email && school.phoneNumber ? " &nbsp;|&nbsp; " : ""}${school.phoneNumber ? `Ph: ${school.phoneNumber}` : ""}
        </div>
      </div>
    </div>
    <div class="receipt-title">Application Fee Receipt – HSC</div>
    <div class="meta-row">
      <span>Receipt No: <strong>${val(application.receiptNumber)}</strong></span>
      <span>Date: <strong>${receiptDate}</strong></span>
    </div>
    <div class="info-grid">
      <div class="info-cell"><div class="info-label">Student Name</div><div class="info-value">${val(application.name)}</div></div>
      <div class="info-cell"><div class="info-label">Application Number</div><div class="info-value">${val(application.applicationNumber)}</div></div>
      <div class="info-cell"><div class="info-label">Grade</div><div class="info-value">${val(application.Grade?.grade)}</div></div>
      <div class="info-cell"><div class="info-label">Date of Birth</div><div class="info-value">${val(application.dob)}</div></div>
      <div class="info-cell"><div class="info-label">Aadhar Number</div><div class="info-value">${val(application.aadharNumber)}</div></div>
      <div class="info-cell"><div class="info-label">Preferred Medium</div><div class="info-value">${val(application.preferredmedium)}</div></div>
      <div class="info-cell full"><div class="info-label">Academic Year</div><div class="info-value">${val(application.academicYear)}</div></div>
    </div>
    <div class="fee-box">
      <div class="fee-label">Application Fee</div>
      <div class="fee-amount">₹ ${application.feeAmount || FEE_AMOUNT}.00</div>
    </div>
    <div class="payment-row">
      Payment Mode: &nbsp;<span class="badge ${application.paymentMode === 'online' ? 'badge-online' : ''}">${(application.paymentMode || "Cash").toUpperCase()}</span>
      ${application.paymentMode === "online" && application.transactionId ? `&nbsp;&nbsp;Transaction ID: <strong>${application.transactionId}</strong>` : ""}
    </div>
    <div class="footer">
      <div class="sig-line">Parent / Guardian Signature</div>
      <div class="watermark">Printed on ${printedOn}</div>
      <div class="sig-line">Authorized Signatory</div>
    </div>
  </div>`;

      const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Fee Receipt – ${application.receiptNumber || ""}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11.5px; color: #1e293b; background: #fff; }
  @page { size: A4 portrait; margin: 8mm 12mm; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  .page { display: flex; flex-direction: column; height: 277mm; }
  .receipt { flex: 1; display: flex; flex-direction: column; padding: 10px 0; overflow: hidden; }
  .cut-line {
    display: flex; align-items: center; gap: 6px;
    padding: 4px 0; margin: 0;
    border-top: 1.5px dashed #94a3b8;
    color: #94a3b8; font-size: 10px; font-style: italic; letter-spacing: 0.4px;
    flex-shrink: 0;
  }
  .cut-line span { white-space: nowrap; }
  .cut-line::after { content: ''; flex: 1; height: 0; }
  .header { display: flex; align-items: flex-start; gap: 12px; padding-bottom: 10px; border-bottom: 2px solid #1e40af; margin-bottom: 10px; }
  .logo-wrap { width: 60px; height: 60px; flex-shrink: 0; }
  .logo-wrap img { width: 100%; height: 100%; object-fit: contain; }
  .logo-placeholder { font-size: 30px; line-height: 60px; }
  .school-block { flex: 1; text-align: center; }
  .school-name { font-size: 14px; font-weight: 700; color: #1a2236; line-height: 1.3; }
  .school-sub  { font-size: 10px; color: #475569; margin-top: 2px; line-height: 1.5; }
  .receipt-title { background: #1a2236; color: #fff; text-align: center; padding: 5px 0; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; border-radius: 4px; margin-bottom: 10px; }
  .meta-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 10.5px; color: #475569; }
  .meta-row strong { color: #1e293b; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: #e2e8f0; border: 1px solid #e2e8f0; border-radius: 5px; overflow: hidden; margin-bottom: 10px; }
  .info-cell { background: #fff; padding: 5px 9px; }
  .info-cell:nth-child(even) { background: #f8fafc; }
  .info-cell.full { grid-column: 1 / -1; background: #fff; }
  .info-label { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 1px; }
  .info-value { font-size: 11px; color: #1e293b; font-weight: 500; }
  .fee-box { background: #eff6ff; border: 1.5px solid #3b82f6; border-radius: 6px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .fee-label { font-size: 11.5px; font-weight: 600; color: #1e40af; }
  .fee-amount { font-size: 17px; font-weight: 800; color: #1e40af; }
  .payment-row { font-size: 10.5px; color: #475569; margin-bottom: 10px; }
  .payment-row strong { color: #1e293b; }
  .badge { display: inline-block; background: #dcfce7; color: #166534; border-radius: 10px; padding: 1px 9px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .badge-online { background: #dbeafe; color: #1e40af; }
  .footer { margin-top: auto; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; align-items: flex-end; }
  .sig-line { width: 100px; border-top: 1px solid #1e293b; margin-top: 24px; padding-top: 3px; font-size: 9.5px; color: #475569; text-align: center; }
  .watermark { font-size: 9.5px; color: #94a3b8; text-align: center; }
</style>
</head>
<body>
<div class="page">
  ${receiptBlock()}
  <div class="cut-line">
    <span>✂ &nbsp; Cut here</span>
  </div>
  ${receiptBlock()}
</div>
</body>
</html>`;

      const win = window.open("", "_blank", "width=800,height=650");
      win.document.write(html);
      win.document.close();
      win.onload = () => { win.focus(); win.print(); };
    } catch {
      message.error("Failed to fetch receipt details");
    }
  };

  const fetchApplicationhsc = async () => {
    try {
      let response;
      const schoolId = isSuperAdmin ? (selectedSchool === "all" ? null : selectedSchool) : user?.school?.id;
      if (schoolId) {
        response = await axios.get(`${process.env.REACT_APP_API_URL}/applicationhsc/getApplicationhscsBySchool/${schoolId}`);
      } else {
        response = await axios.get(`${process.env.REACT_APP_API_URL}/applicationhsc/getAllApplicationhsc`);
      }
      let data = (response.data.applicationhscs || []);
      if (selectedYear) data = data.filter(app => app.academicYear === selectedYear);
      const formatted = data
        .filter(app => app.studentStatus === "Applied" || app.studentStatus === "Admitted")
        .sort((a, b) => b.id - a.id)
        .map(app => ({ ...app, Grade: app.Grade || { grade: "N/A" } }));
      setApplicationhscs(formatted);
    } catch (error) {
      message.error(error.response?.data?.details || "Failed to fetch applications");
    }
  };

  // ── Save inline remarks ────────────────────────────────────────────────────
  const handleSaveRemarks = async (appId) => {
    setRemarksSaving(true);
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/applicationhsc/updateApplicationhsc/${appId}`, { remarks: remarksValue });
      setApplicationhscs(prev => prev.map(a => a.id === appId ? { ...a, remarks: remarksValue } : a));
      setEditingRemarksId(null);
      message.success("Remarks saved");
    } catch {
      message.error("Failed to save remarks");
    } finally {
      setRemarksSaving(false);
    }
  };

  const calculateProgress = (application) => {
    const fieldsByStep = [
      ["academicYear", "school_id", "emisNum", "aadharNumber"],
      ["name", "gender", "grade_id", "dob", "age", "mobileNumber", "nationality", "state", "motherTongue", "community", "bloodGroup"],
      ["fatherName", "motherName", "fatherOccupation", "motherOccupation", "fatherIncome", "motherIncome", "address", "pincode"],
      ["photocopyofTC", "previousmedium", "preferredmedium"],
      ["bankName", "branchName", "accountNumber", "ifsccode"]
    ];
    let completedSteps = 0;
    for (let step of fieldsByStep) { if (step.every(f => application[f])) completedSteps++; }
    return completedSteps * 20;
  };

  // ── Open Admit Popup ───────────────────────────────────────────────────────
  const openAdmitModal = async (application) => {
    if (isRLMHSSContext(application) && !application.feeCollected) {
      message.warning("Please collect the application fee before admitting this student.");
      return;
    }
    setAdmitApplication(application);
    setAdmitSectionId(null);
    setAdmitSections([]);
    setGroupSubjects([]);
    setSelectedGroupSubjects([]);
    setAdmitModalVisible(true);

    const schoolId = application.school_id;
    const gradeId = application.grade_id;
    const academicYear = application.academicYear;

    try {
      setSectionsLoading(true);
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/section/getSectionsBySchoolAndGrade/${schoolId}/${gradeId}`
      );
      const filtered = (res.data.sections || []).filter(
        s => s.academic_year === academicYear && s.status !== 0
      );
      setAdmitSections(filtered);
    } catch {
      message.error("Failed to fetch sections");
    } finally {
      setSectionsLoading(false);
    }

    try {
      setSubjectsLoading(true);
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/subject/getSubjectsBySchoolAndYear/${schoolId}/${academicYear}`
      );
      const subjects = (res.data.subjects || []).filter(
        s => s.grade_id === gradeId && s.status !== 0
      );
      setGroupSubjects(subjects);
    } catch {
      message.error("Failed to fetch subjects");
    } finally {
      setSubjectsLoading(false);
    }
  };

  const toggleSubject = (subjectId) => {
    setSelectedGroupSubjects(prev =>
      prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]
    );
  };

  const handleAdmitConfirm = async () => {
    if (!admitSectionId) {
      message.warning("Please select a section before admitting.");
      return;
    }
    if (isRLMHSSContext(admitApplication) && !admitApplication?.feeCollected) {
      message.warning("Please collect the application fee before admitting this student.");
      return;
    }
    setAdmitLoading(true);
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/applicationhsc/admit/${admitApplication.id}`,
        { section_id: admitSectionId, group_subjects: selectedGroupSubjects }
      );
      message.success(`Admitted successfully. Admission No: ${res.data.admissionNumber}`);
      setAdmitModalVisible(false);
      setAdmitApplication(null);
      setAdmitSectionId(null);
      setSelectedGroupSubjects([]);
      fetchApplicationhsc();
    } catch (error) {
      message.error(error.response?.data?.error || "Failed to admit student");
    } finally {
      setAdmitLoading(false);
    }
  };

  const closeAdmitModal = () => {
    setAdmitModalVisible(false);
    setAdmitApplication(null);
    setAdmitSectionId(null);
    setSelectedGroupSubjects([]);
    setGroupSubjects([]);
  };

  const handleView = async (id) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/applicationhsc/getApplicationhscById/${id}`);
      setSelectedApplication(res.data.application);
      setIsModalVisible(true);
    } catch {
      message.error("Failed to fetch application details");
    }
  };

  const handlePrint = (application) => {
    const app = application || selectedApplication;
    if (!app) return;
    const school = app.School || {};
    const formatAgeLocal = (age) => {
      if (!age) return "N/A";
      if (typeof age === "string") {
        try { age = JSON.parse(age); } catch { return "N/A"; }
        if (typeof age === "string") { try { age = JSON.parse(age); } catch { return "N/A"; } }
      }
      if (typeof age !== "object") return "N/A";
      const { years = 0, months = 0, days = 0 } = age;
      return `${years} yr${years !== 1 ? "s" : ""}, ${months} mo${months !== 1 ? "s" : ""}, ${days} day${days !== 1 ? "s" : ""}`;
    };
    const val = (v) => v || "—";
    const field = (label, value) =>
      `<div class="field-box"><div class="field-label">${label}</div><div class="field-value">${val(value)}</div></div>`;
    const sectionTitle = (title) =>
      `<div class="section-title">${title}</div>`;

    const renderAcademicHistoryTable = () => {
      let history = app.academicHistory;
      if (typeof history === "string") {
        try { history = JSON.parse(history); } catch { history = []; }
        if (typeof history === "string") { try { history = JSON.parse(history); } catch { history = []; } }
      }
      if (!Array.isArray(history) || history.length === 0)
        return `<div style="padding:7px 11px;font-size:12px;color:#64748b;">No academic history recorded.</div>`;
      return `<table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:7px;overflow:hidden;font-size:12px;">
      <thead><tr style="background:#1a2236;">
        <th style="padding:7px 11px;text-align:left;color:#fff;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;">School Name</th>
        <th style="padding:7px 11px;text-align:left;color:#fff;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;">Standard</th>
        <th style="padding:7px 11px;text-align:left;color:#fff;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;">Year (From – To)</th>
      </tr></thead>
      <tbody>${history.map((row, i) => `<tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'};">
        <td style="padding:7px 11px;color:#1e293b;font-weight:500;">${row.schoolName || '—'}</td>
        <td style="padding:7px 11px;color:#1e293b;">${row.standard || '—'}</td>
        <td style="padding:7px 11px;color:#1e293b;">${row.duration || '—'}</td>
      </tr>`).join('')}</tbody>
    </table>`;
    };

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Application – ${app.name || ""}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1e293b; background: #fff; }
  @page { size: A4; margin: 15mm 12mm; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none; } }
  .header { display: flex; align-items: center; gap: 18px; padding-bottom: 14px; border-bottom: 2.5px solid #1e40af; margin-bottom: 16px; }
  .logo-wrap { width: 150px; height: 150px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .logo-wrap img { width: 100%; height: 100%; object-fit: contain; }
  .logo-placeholder { font-size: 30px; }
  .school-info { flex: 1; }
  .school-name { font-size: 17px; font-weight: 700; color: #1a2236; letter-spacing: -0.3px; line-height: 1.3; }
  .school-meta { margin-top: 2px; display: flex; flex-direction: column; gap: 3px; }
  .school-meta-row { font-size: 11.5px; color: #475569; }
  .app-number-badge { text-align: right; flex-shrink: 0; }
  .app-number-badge .label { font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px; }
  .app-number-badge .value { font-size: 15px; font-weight: 700; color: #1e40af; margin-top: 2px; }
  .app-number-badge .year { font-size: 11px; color: #64748b; margin-top: 2px; }
  .section-title { font-size: 11px; font-weight: 700; color: #fff; background: #1a2236; padding: 5px 12px; border-radius: 5px; margin: 14px 0 8px; text-transform: uppercase; letter-spacing: 0.6px; }
  .fields-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: #e2e8f0; border: 1px solid #e2e8f0; border-radius: 7px; overflow: hidden; }
  .fields-grid-2 { grid-template-columns: repeat(2, 1fr); }
  .field-box { background: #fff; padding: 7px 11px; }
  .field-box:nth-child(even) { background: #f8fafc; }
  .field-label { font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 2px; }
  .field-value { font-size: 12px; color: #1e293b; font-weight: 500; word-break: break-word; }
  .field-full { grid-column: 1 / -1; }
  .footer { margin-top: 22px; border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; align-items: flex-end; }
  .footer-sig { text-align: center; }
  .footer-sig .sig-line { width: 120px; border-top: 1px solid #1e293b; margin: 0 auto 4px; padding-top: 4px; font-size: 10.5px; color: #475569; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo-wrap">
      ${school.logo ? `<img src="${school.logo}" alt="logo"/>` : `<span class="logo-placeholder">🏫</span>`}
    </div>
    <div class="school-info">
      <div class="school-name">${val(school.name)}</div>
      <div class="school-meta">
        ${school.address || school.city ? `<div class="school-meta-row">${[school.address, school.city, school.state, school.pincode].filter(Boolean).join(", ")}</div>` : ""}
        ${school.phoneNumber ? `<div class="school-meta-row">${school.phoneNumber}</div>` : ""}
        ${school.email ? `<div class="school-meta-row">${school.email}</div>` : ""}
      </div>
    </div>
    <div class="app-number-badge">
      <div class="label">Application No</div>
      <div class="value">${val(app.applicationNumber)}</div>
      <div class="year">${val(app.academicYear)}</div>
    </div>
  </div>
  ${sectionTitle("Basic Information")}
  <div class="fields-grid">
    ${field("EMIS Number", app.emisNum)}
    ${field("Aadhar Number", app.aadharNumber)}
    ${field("Grade", app.Grade?.grade)}
  </div>
  ${sectionTitle("Personal Details")}
  <div class="fields-grid">
    ${field("Full Name", app.name)}
    ${field("Gender", app.gender)}
    ${field("Date of Birth", app.dob)}
    ${field("Age", formatAgeLocal(app.age))}
    ${field("Mobile Number", app.mobileNumber)}
    ${field("Previous Medium", app.previousmedium)}
    ${field("Preferred Medium", app.preferredmedium)}
    ${field("Nationality", app.nationality)}
    ${field("State", app.state)}
    ${field("Mother Tongue", app.motherTongue)}
    ${field("Religion", app.religion)}
    ${field("Community", app.community)}
    ${field("Caste", app.caste)}
    ${field("Blood Group", app.bloodGroup)}
    ${field("Living With", app.living)}
    ${field("Identification Marks", app.identificationmarks)}
    ${field("Scheduled Caste/Tribe?", app.scheduledcasteOrtribecommunity)}
    ${field("Backward Caste?", app.backwardcaste)}
    ${field("Tribe to Other Religion?", app.tribeTootherreligion)}
    ${field("Birth District", app.birthdistrict)}
    <div class="field-box field-full"><div class="field-label">Current Living Address</div><div class="field-value">${val(app.currentlivingaddress)}</div></div>
  </div>
  ${sectionTitle("Family & Contact Details")}
  <div class="fields-grid">
    ${field("Father's Name", app.fatherName)}
    ${field("Mother's Name", app.motherName)}
    ${field("Father's Occupation", app.fatherOccupation)}
    ${field("Mother's Occupation", app.motherOccupation)}
    ${field("Father's Income", app.fatherIncome)}
    ${field("Mother's Income", app.motherIncome)}
    ${field("Parent's Email ID", app.parentEmail)}
    ${field("Pincode", app.pincode)}
    <div class="field-box field-full"><div class="field-label">Address</div><div class="field-value">${val(app.address)}</div></div>
  </div>
  ${sectionTitle("Guardian Details")}
  <div class="fields-grid">
    ${field("Guardian Name", app.guardianName)}
    ${field("Guardian Occupation", app.guardianOccupation)}
    ${field("Guardian Phone", app.guardianNumber)}
    <div class="field-box field-full"><div class="field-label">Guardian Address</div><div class="field-value">${val(app.guardianAddress)}</div></div>
  </div>
  ${sectionTitle("Academic History")}
  ${renderAcademicHistoryTable()}
  ${sectionTitle("SSLC Examination Details")}
  <div class="fields-grid">
    ${field("Exam Year", app.examYear)}
    ${field("Registration Number", app.registrationNumber)}
    ${field("Tamil", app.tamil)}
    ${field("English", app.english)}
    ${field("Mathematics", app.maths)}
    ${field("Science", app.science)}
    ${field("Social Science", app.social)}
    ${field("Total", app.total)}
    ${field("Percentage", app.percentage)}
  </div>
  ${sectionTitle("TC Details")}
  <div class="fields-grid">
    ${field("TC Photocopy Submitted?", app.photocopyofTC)}
    <div class="field-box field-full"><div class="field-label">Termination Reason</div><div class="field-value">${val(app.terminationreason)}</div></div>
  </div>
  ${sectionTitle("Bank Details")}
  <div class="fields-grid">
    ${field("Bank Name", app.bankName)}
    ${field("Branch Name", app.branchName)}
    ${field("Account Number", app.accountNumber)}
    ${field("IFSC Code", app.ifsccode)}
  </div>
  <div class="footer">
    <div class="footer-sig"><div class="sig-line">Parent / Guardian Signature</div></div>
    <div style="font-size:10px; color:#94a3b8; text-align:center;">
      Printed on ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
    </div>
    <div class="footer-sig"><div class="sig-line">Principal Signature</div></div>
  </div>
</body>
</html>`;

    const win = window.open("", "_blank", "width=900,height=700");
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove application of ${name}?`)) return;
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/applicationhsc/updateStatus/${id}`);
      message.success("Application removed successfully");
      fetchApplicationhsc();
    } catch {
      message.error("Failed to remove application");
    }
  };

  const formatAge = (age) => {
    if (!age) return "N/A";
    if (typeof age === "string") {
      try { age = JSON.parse(age); } catch { return "N/A"; }
      if (typeof age === "string") { try { age = JSON.parse(age); } catch { return "N/A"; } }
    }
    if (typeof age !== "object") return "N/A";
    const { years = 0, months = 0, days = 0 } = age;
    return `${years} year${years !== 1 ? "s" : ""}, ${months} month${months !== 1 ? "s" : ""}, ${days} day${days !== 1 ? "s" : ""}`;
  };

  // ── Grade options derived from data ──────────────────────────────────────
  const gradeOptions = React.useMemo(() => {
    const map = new Map();
    applicationhscs.forEach(a => {
      const id = a.Grade?.id || a.grade_id;
      const name = a.Grade?.grade;
      if (id && name && name !== "N/A") map.set(id, name);
    });
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [applicationhscs]);

  const filteredApps = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return applicationhscs.filter(a => {
      const gradeMatch = !filterGrade || String(a.Grade?.id || a.grade_id) === String(filterGrade);
      const statusMatch = !filterStatus || (a.studentStatus || "Applied") === filterStatus;
      const searchMatch = !q ||
        (a.name || "").toLowerCase().includes(q) ||
        (a.applicationNumber || "").toLowerCase().includes(q);
      return gradeMatch && statusMatch && searchMatch;
    });
  }, [applicationhscs, filterGrade, filterStatus, searchQuery]);

  // ── Fee History computed ───────────────────────────────────────────────────
  const feeHistoryApps = React.useMemo(() => {
    return applicationhscs.filter(a => {
      if (!a.feeCollected) return false;
      if (feeHistoryFrom) {
        const paidDate = a.feePaidAt ? new Date(a.feePaidAt) : null;
        if (!paidDate || paidDate < new Date(feeHistoryFrom)) return false;
      }
      if (feeHistoryTo) {
        const paidDate = a.feePaidAt ? new Date(a.feePaidAt) : null;
        const toEnd = new Date(feeHistoryTo); toEnd.setHours(23, 59, 59, 999);
        if (!paidDate || paidDate > toEnd) return false;
      }
      return true;
    });
  }, [applicationhscs, feeHistoryFrom, feeHistoryTo]);

  const feeHistoryTotal = feeHistoryApps.reduce((sum, a) => sum + (Number(a.feeAmount) || FEE_AMOUNT), 0);

  const totalPages = Math.ceil(filteredApps.length / PAGE_SIZE);
  const pagedApps = filteredApps.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const getPaginationPages = () => {
    const pages = [];
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  // ── Excel Download ────────────────────────────────────────────────────────
  const handleDownloadExcel = () => {
    if (filteredApps.length === 0) { message.warning("No data to export."); return; }
    const rows = filteredApps.map((a, i) => ({
      "S.No": i + 1,
      "Application Number": a.applicationNumber || "",
      "School": a.School?.name || "",
      "Academic Year": a.academicYear || "",
      "EMIS Number": a.emisNum || "",
      "Aadhar Number": a.aadharNumber || "",
      "Name": a.name || "",
      "Gender": a.gender || "",
      "Grade": a.Grade?.grade || "",
      "Date of Birth": a.dob || "",
      "Age": a.age || "",
      "Previous Medium": a.previousmedium || "",
      "Preferred Medium": a.preferredmedium || "",
      "Nationality": a.nationality || "",
      "State": a.state || "",
      "Mother Tongue": a.motherTongue || "",
      "Birth District": a.birthdistrict || "",
      "Religion": a.religion || "",
      "Community": a.community || "",
      "Caste": a.caste || "",
      "Blood Group": a.bloodGroup || "",
      "Living With": a.living || "",
      "Is the student from scheduled caste / tribe community?": a.scheduledcasteOrtribecommunity || "",
      "Is the student from backward caste?": a.backwardcaste || "",
      "Is the student a convert from tribe to other religion?": a.tribeTootherreligion || "",
      "Current Living Address": a.currentlivingaddress || "",
      "Identification Marks": a.identificationmarks || "",
      "Father Name": a.fatherName || "",
      "Mother Name": a.motherName || "",
      "Father Occupation": a.fatherOccupation || "",
      "Mother Occupation": a.motherOccupation || "",
      "Father Income": a.fatherIncome || "",
      "Mother Income": a.motherIncome || "",
      "Address": a.address || "",
      "Pincode": a.pincode || "",
      "Parent's Email ID": a.parentEmail || "",
      "Guardian Name": a.guardianName || "",
      "Guardian Occupation": a.guardianOccupation || "",
      "Guardian Address": a.guardianAddress || "",
      "Guardian Phone Number": a.guardianNumber || "",
      "Academic History": (() => {
        let h = a.academicHistory;
        if (!h) return "";
        if (typeof h === "string") {
          try { h = JSON.parse(h); } catch { return ""; }
          if (typeof h === "string") { try { h = JSON.parse(h); } catch { return ""; } }
        }
        if (!Array.isArray(h) || h.length === 0) return "";
        return h.map((r, i) => `${i + 1}. ${r.schoolName || ""} | Std: ${r.standard || ""} | Year: ${r.duration || ""}`).join("; ");
      })(),
      "Exam Year": a.examYear || "",
      "Registration Number": a.registrationnumber || "",
      "Tamil": a.tamil || "",
      "English": a.english || "",
      "Mathematics": a.maths || "",
      "Science": a.science || "",
      "Social Science": a.social || "",
      "Total": a.total || "",
      "Percentage": a.percentage || "",
      "TC Photocopy": a.photocopyofTC || "",
      "Termination Reason": a.terminationreason || "",
      "Bank Name": a.bankName || "",
      "Branch Name": a.branchName || "",
      "Account Number": a.accountNumber || "",
      "IFSC Code": a.ifsccode || "",
      "Remarks": a.remarks || "",
      "Status": a.studentStatus || "",
      "Fee Collected": a.feeCollected ? "Yes" : "No",
      "Receipt Number": a.receiptNumber || "",
      "Payment Mode": a.paymentMode || "",
      "Transaction ID": a.transactionId || "",
      "Fee Amount (₹)": a.feeCollected ? (a.feeAmount || FEE_AMOUNT) : "",
      "Fee Paid Date": a.feePaidAt ? new Date(a.feePaidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const colWidths = Object.keys(rows[0] || {}).map(key => ({
      wch: Math.max(key.length, ...rows.map(r => String(r[key] || "").length), 10)
    }));
    ws["!cols"] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HSC Applications");
    XLSX.writeFile(wb, `HSC_Applications${selectedYear ? `_${selectedYear}` : ""}_${dayjs().format("YYYY-MM-DD")}.xlsx`);
    message.success(`Exported ${filteredApps.length} records to Excel`);
  };

  // ── Fee History Excel Download ────────────────────────────────────────────
  const handleDownloadFeeHistoryExcel = () => {
    if (feeHistoryApps.length === 0) { message.warning("No fee collection records to export."); return; }
    const rows = feeHistoryApps.map((a, i) => ({
      "S.No": i + 1,
      "Student Name": a.name || "",
      "Application Number": a.applicationNumber || "",
      "Grade": a.Grade?.grade || "",
      "Status": a.studentStatus || "",
      "Academic Year": a.academicYear || "",
      "Receipt Number": a.receiptNumber || "",
      "Payment Mode": a.paymentMode ? a.paymentMode.charAt(0).toUpperCase() + a.paymentMode.slice(1) : "",
      "Transaction ID": a.transactionId || "",
      "Fee Amount (₹)": a.feeAmount || FEE_AMOUNT,
      "Fee Paid Date": a.feePaidAt ? new Date(a.feePaidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "",
    }));
    // Append total row
    rows.push({
      "S.No": "",
      "Student Name": `Total (${feeHistoryApps.length} records)`,
      "Application Number": "",
      "Grade": "",
      "Status": "",
      "Academic Year": "",
      "Receipt Number": "",
      "Payment Mode": "",
      "Transaction ID": "",
      "Fee Amount (₹)": feeHistoryTotal,
      "Fee Paid Date": "",
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const colWidths = Object.keys(rows[0] || {}).map(key => ({
      wch: Math.max(key.length, ...rows.map(r => String(r[key] || "").length), 10)
    }));
    ws["!cols"] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HSC Fee History");
    XLSX.writeFile(wb, `HSC_FeeHistory${selectedYear ? `_${selectedYear}` : ""}_${dayjs().format("YYYY-MM-DD")}.xlsx`);
    message.success(`Exported ${feeHistoryApps.length} records to Excel`);
  };

  const cols = ["S.No", "Application No", "School", "Academic Year", "Name", "Gender", "Grade", "Status", "Remarks", "Progress", "Action"];

  return (
    <Layout>
      <div className="app-page" style={{ fontFamily: FF }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLOR.text, margin: 0, letterSpacing: "-0.3px" }}>Application List for HSC</h1>
          <div style={{ width: 40, height: 3, background: COLOR.blueLt, borderRadius: 2, marginTop: 6 }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          {(selectedSchool !== "all" || selectedYear) && (
            <div style={{ fontSize: "13px", color: COLOR.filterText, background: COLOR.filterBg, padding: "6px 14px", borderRadius: 6, fontWeight: 500 }}>
              Showing: {selectedSchool !== "all" ? selectedSchoolName : "All Schools"}{selectedYear ? ` | ${selectedYear}` : ""}
            </div>
          )}
          <Select
            allowClear
            placeholder="All Grades"
            value={filterGrade || undefined}
            onChange={val => { setFilterGrade(val || ""); setCurrentPage(1); }}
            style={{ width: 140, fontFamily: FF, fontSize: FS }}
            size="middle"
          >
            {gradeOptions.map(g => <Option key={g.id} value={g.id}>{g.name}</Option>)}
          </Select>
          <Select
            allowClear
            placeholder="All Status"
            value={filterStatus || undefined}
            onChange={val => { setFilterStatus(val || ""); setCurrentPage(1); }}
            style={{ width: 140, fontFamily: FF, fontSize: FS }}
            size="middle"
          >
            <Option value="Applied">Applied</Option>
            <Option value="Admitted">Admitted</Option>
          </Select>
          <button onClick={() => navigate("/create-applicationhsc")}
            onMouseEnter={e => { e.currentTarget.style.background = COLOR.blue; e.currentTarget.style.boxShadow = "0 4px 14px rgba(30,64,175,0.35)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = COLOR.blueLt; e.currentTarget.style.boxShadow = "0 2px 8px rgba(59,130,246,0.28)"; }}
            style={{ all: "unset", display: "inline-flex", alignItems: "center", gap: 7, background: COLOR.blueLt, color: "#fff", padding: "9px 20px", borderRadius: 8, fontSize: FS, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(59,130,246,0.28)", transition: "all 0.18s" }}>
            Create HSC Application
          </button>

          <Tooltip title="Download Excel">
            <button onClick={handleDownloadExcel}
              onMouseEnter={e => { e.currentTarget.style.background = "#15803d"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(21,128,61,0.35)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#16a34a"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(21,128,61,0.22)"; }}
              style={{ all: "unset", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, background: "#16a34a", color: "#fff", borderRadius: 8, cursor: "pointer", boxShadow: "0 2px 8px rgba(21,128,61,0.22)", transition: "all 0.18s", flexShrink: 0 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8.5 19l-1.75-3.08L5 19H3.27l2.6-4.08L3.27 11H5l1.75 3.08L8.5 11h1.73l-2.6 3.92L10.23 19H8.5zm5.5 0h-1.5l-1.5-2.4-1.5 2.4H8l2.25-3.5L8 12h1.5l1.5 2.4 1.5-2.4H14l-2.25 3.5L14 19z" />
              </svg>
            </button>
          </Tooltip>

          {/* ── Search box ── */}
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <svg style={{ position: "absolute", left: 10, color: COLOR.textSoft, pointerEvents: "none" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or app no..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              style={{ paddingLeft: 32, paddingRight: searchQuery ? 30 : 12, paddingTop: 8, paddingBottom: 8, borderRadius: 8, border: `1.5px solid ${COLOR.border}`, fontSize: "13.5px", color: COLOR.text, fontFamily: FF, outline: "none", width: 260, transition: "border 0.15s" }}
              onFocus={e => { e.target.style.borderColor = COLOR.blueLt; }}
              onBlur={e => { e.target.style.borderColor = COLOR.border; }}
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
                style={{ all: "unset", position: "absolute", right: 8, cursor: "pointer", color: COLOR.textSoft, fontSize: 14, lineHeight: 1 }}>✕</button>
            )}
          </div>

          {/* ── Fee Collection History Button (RLMHSS context) ── */}
          <Tooltip title="Fee Collection History">
            <button onClick={() => setFeeHistoryVisible(v => !v)}
              onMouseEnter={e => { e.currentTarget.style.background = COLOR.blue; e.currentTarget.style.boxShadow = "0 4px 14px rgba(30,64,175,0.35)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = COLOR.blueLt; e.currentTarget.style.boxShadow = "0 2px 8px rgba(59,130,246,0.28)"; }}
              style={{ all: "unset", display: "inline-flex", alignItems: "center", gap: 6, background: COLOR.blueLt, color: "#fff", padding: "9px 20px", borderRadius: 8, cursor: "pointer", boxShadow: "0 2px 8px rgba(59,130,246,0.28)", transition: "all 0.18s", flexShrink: 0, fontSize: "13.5px", fontWeight: 600 }}>
              Fee History
            </button>
          </Tooltip>
        </div>

        {/* ── Fee Collection History Panel ── */}
        {feeHistoryVisible && (
          <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: `1px solid ${COLOR.border}`, marginBottom: 20, overflow: "hidden" }}>
            {/* Panel header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${COLOR.border}`, background: "#fffbeb" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "15px", fontWeight: 700, color: COLOR.text }}>Fee Collection History – HSC</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 8, padding: "6px 16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Collected</span>
                  <span style={{ fontSize: "20px", fontWeight: 800, color: "#15803d", lineHeight: 1.3 }}>₹ {Number(feeHistoryTotal).toLocaleString("en-IN")}.00</span>
                  <span style={{ fontSize: "10px", color: "#4ade80", fontWeight: 600 }}>{feeHistoryApps.length} student{feeHistoryApps.length !== 1 ? "s" : ""}</span>
                </div>
                <Tooltip title="Download Fee Report (Excel)">
                  <button onClick={handleDownloadFeeHistoryExcel}
                    onMouseEnter={e => { e.currentTarget.style.background = "#15803d"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#16a34a"; }}
                    style={{ all: "unset", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, background: "#16a34a", color: "#fff", borderRadius: 7, cursor: "pointer", transition: "all 0.15s", flexShrink: 0 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8.5 19l-1.75-3.08L5 19H3.27l2.6-4.08L3.27 11H5l1.75 3.08L8.5 11h1.73l-2.6 3.92L10.23 19H8.5zm5.5 0h-1.5l-1.5-2.4-1.5 2.4H8l2.25-3.5L8 12h1.5l1.5 2.4 1.5-2.4H14l-2.25 3.5L14 19z" />
                    </svg>
                  </button>
                </Tooltip>
                <button onClick={() => setFeeHistoryVisible(false)}
                  style={{ all: "unset", width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16, color: COLOR.textSoft, background: "#f1f5f9", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#e2e8f0"; e.currentTarget.style.color = COLOR.text; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = COLOR.textSoft; }}>✕</button>
              </div>
            </div>

            {/* Date range filter */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", background: "#fafbfc", borderBottom: `1px solid ${COLOR.border}`, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ fontSize: "12px", color: COLOR.textSoft, fontWeight: 600 }}>From</label>
                <input type="date" value={feeHistoryFrom} onChange={e => setFeeHistoryFrom(e.target.value)}
                  style={{ padding: "6px 10px", borderRadius: 7, border: `1.5px solid ${COLOR.border}`, fontSize: "13px", color: COLOR.text, fontFamily: FF, outline: "none", cursor: "pointer" }}
                  onFocus={e => { e.target.style.borderColor = "#f59e0b"; }}
                  onBlur={e => { e.target.style.borderColor = COLOR.border; }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ fontSize: "12px", color: COLOR.textSoft, fontWeight: 600 }}>To</label>
                <input type="date" value={feeHistoryTo} onChange={e => setFeeHistoryTo(e.target.value)}
                  style={{ padding: "6px 10px", borderRadius: 7, border: `1.5px solid ${COLOR.border}`, fontSize: "13px", color: COLOR.text, fontFamily: FF, outline: "none", cursor: "pointer" }}
                  onFocus={e => { e.target.style.borderColor = "#f59e0b"; }}
                  onBlur={e => { e.target.style.borderColor = COLOR.border; }}
                />
              </div>
              {(feeHistoryFrom || feeHistoryTo) && (
                <button onClick={() => { setFeeHistoryFrom(""); setFeeHistoryTo(""); }}
                  style={{ all: "unset", fontSize: "12px", fontWeight: 600, color: COLOR.danger, cursor: "pointer", padding: "5px 10px", borderRadius: 6, background: COLOR.dangerBg, transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(226,18,22,0.15)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = COLOR.dangerBg; }}>
                  ✕ Clear
                </button>
              )}
            </div>

            {/* History table */}
            <div style={{ overflowX: "auto", maxHeight: 320, overflowY: "auto" }}>
              {feeHistoryApps.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 16px", color: COLOR.textSoft, fontSize: FS }}>
                  No fee collection records found{(feeHistoryFrom || feeHistoryTo) ? " for the selected date range" : ""}.
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FF, fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "#1a2236", position: "sticky", top: 0, zIndex: 1 }}>
                      {["S.No", "Student Name", "Application No", "Grade", "Receipt No", "Payment Mode", "Transaction ID", "Amount", "Fee Paid Date"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", fontWeight: 600, fontSize: "12px", color: "#fff", textAlign: "left", whiteSpace: "nowrap", letterSpacing: "0.2px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {feeHistoryApps.map((a, i) => (
                      <tr key={a.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc", borderBottom: `1px solid ${COLOR.border}` }}>
                        <td style={{ padding: "9px 14px", color: COLOR.textMid, fontWeight: 600 }}>{i + 1}</td>
                        <td style={{ padding: "9px 14px", color: COLOR.text, fontWeight: 500, whiteSpace: "nowrap" }}>{a.name}</td>
                        <td style={{ padding: "9px 14px", color: COLOR.blueLt, fontWeight: 600, whiteSpace: "nowrap" }}>{a.applicationNumber}</td>
                        <td style={{ padding: "9px 14px", color: COLOR.textMid }}>{a.Grade?.grade || "N/A"}</td>
                        <td style={{ padding: "9px 14px", color: COLOR.textMid, fontWeight: 600 }}>{a.receiptNumber || "—"}</td>
                        <td style={{ padding: "9px 14px" }}>
                          <span style={{ display: "inline-block", background: a.paymentMode === "online" ? "#dbeafe" : "#dcfce7", color: a.paymentMode === "online" ? "#1e40af" : "#166534", borderRadius: 10, padding: "2px 10px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>
                            {a.paymentMode === "online" ? "Online" : "Cash"}
                          </span>
                        </td>
                        <td style={{ padding: "9px 14px", color: COLOR.textMid }}>{a.transactionId || "—"}</td>
                        <td style={{ padding: "9px 14px", color: "#15803d", fontWeight: 700 }}>₹ {a.feeAmount || FEE_AMOUNT}.00</td>
                        <td style={{ padding: "9px 14px", color: COLOR.textMid, whiteSpace: "nowrap" }}>
                          {a.feePaidAt ? new Date(a.feePaidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#fef9c3", borderTop: `2px solid #fde68a` }}>
                      <td colSpan={7} style={{ padding: "10px 14px", fontWeight: 700, color: COLOR.text, fontSize: "13px" }}>
                        Total ({feeHistoryApps.length} record{feeHistoryApps.length !== 1 ? "s" : ""})
                      </td>
                      <td style={{ padding: "10px 14px", fontWeight: 800, color: "#15803d", fontSize: "14px" }}>₹ {Number(feeHistoryTotal).toLocaleString("en-IN")}.00</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Table */}
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", overflow: "hidden", border: `1px solid ${COLOR.border}` }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FF, fontSize: FS }}>
              <thead>
                <tr style={{ background: COLOR.headBg }}>
                  {cols.map((h, i) => (
                    <th key={h} style={{ padding: "13px 16px", fontWeight: 600, fontSize: "13px", color: COLOR.headText, textAlign: i === cols.length - 1 ? "center" : "left", whiteSpace: "nowrap", letterSpacing: "0.2px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedApps.length > 0 ? pagedApps.map((app, index) => {
                  const globalIndex = (currentPage - 1) * PAGE_SIZE + index;
                  const progress = calculateProgress(app);
                  return (
                    <tr key={app.id} onMouseEnter={() => setHoveredRow(app.id)} onMouseLeave={() => setHoveredRow(null)}
                      style={{ background: hoveredRow === app.id ? COLOR.rowHover : index % 2 === 0 ? COLOR.rowOdd : COLOR.rowEven, transition: "background 0.12s", borderBottom: `1px solid ${COLOR.border}` }}>
                      <td style={{ padding: "11px 16px", color: COLOR.text, fontWeight: 600 }}>{globalIndex + 1}</td>
                      <td style={{ padding: "11px 16px", color: COLOR.blueLt, fontWeight: 600, whiteSpace: "nowrap" }}>{app.applicationNumber}</td>
                      <td style={{ padding: "11px 16px", color: COLOR.textMid, whiteSpace: "nowrap" }}>
                        {isSuperAdmin ? (app.School?.name || selectedSchoolName || "N/A") : (user.school?.name || "N/A")}
                      </td>
                      <td style={{ padding: "11px 16px", color: COLOR.textMid, whiteSpace: "nowrap" }}>{app.academicYear}</td>
                      <td style={{ padding: "11px 16px", color: COLOR.text, fontWeight: 500 }}>{app.name}</td>
                      <td style={{ padding: "11px 16px", color: COLOR.textMid }}>{app.gender}</td>
                      <td style={{ padding: "11px 16px", color: COLOR.textMid }}>{app.Grade?.grade || "N/A"}</td>
                      <td style={{ padding: "11px 16px" }}><StatusBadge status={app.studentStatus} /></td>
                      {/* ── Remarks inline edit cell ── */}
                      <td style={{ padding: "8px 10px", minWidth: 180, maxWidth: 220 }}>
                        {editingRemarksId === app.id ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                            <textarea
                              autoFocus
                              value={remarksValue}
                              onChange={e => setRemarksValue(e.target.value)}
                              rows={2}
                              style={{ width: "100%", fontSize: "12.5px", fontFamily: FF, padding: "5px 8px", borderRadius: 6, border: `1.5px solid ${COLOR.blueLt}`, resize: "vertical", outline: "none", color: COLOR.text }}
                            />
                            <div style={{ display: "flex", gap: 5 }}>
                              <button
                                onClick={() => handleSaveRemarks(app.id)}
                                disabled={remarksSaving}
                                style={{ all: "unset", padding: "3px 12px", background: COLOR.blueLt, color: "#fff", borderRadius: 5, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                                {remarksSaving ? "…" : "Save"}
                              </button>
                              <button
                                onClick={() => setEditingRemarksId(null)}
                                style={{ all: "unset", padding: "3px 10px", background: "#f1f5f9", color: COLOR.textMid, borderRadius: 5, fontSize: "12px", fontWeight: 600, cursor: "pointer", border: `1px solid ${COLOR.border}` }}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => { setEditingRemarksId(app.id); setRemarksValue(app.remarks || ""); }}
                            title="Click to add/edit remarks"
                            style={{ cursor: "pointer", fontSize: "12.5px", color: app.remarks ? COLOR.text : COLOR.textSoft, fontStyle: app.remarks ? "normal" : "italic", padding: "5px 7px", borderRadius: 6, border: `1.5px dashed ${app.remarks ? COLOR.border : "#cbd5e1"}`, minHeight: 34, background: app.remarks ? "#f8fafc" : "transparent", transition: "all 0.15s", wordBreak: "break-word" }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = COLOR.blueLt; e.currentTarget.style.background = "#eff6ff"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = app.remarks ? COLOR.border : "#cbd5e1"; e.currentTarget.style.background = app.remarks ? "#f8fafc" : "transparent"; }}>
                            {app.remarks || "Click to add remarks"}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "11px 16px", minWidth: 140 }}><ProgressBar value={progress} /></td>
                      <td style={{ padding: "8px 16px", textAlign: "center" }}>
                        <div style={{ display: "flex", justifyContent: "center", gap: 2 }}>
                          <div style={{ width: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {progress === 100 && app.studentStatus !== "Admitted" && (role === "superadmin" || role === "schooladmin") && (
                              isRLMHSSContext(app) && !app.feeCollected ? (
                                <Tooltip title="Collect the application fee before admitting this student">
                                  <span>
                                    <IconBtn
                                      icon={<CheckCircleOutlined />}
                                      title="Fee pending — cannot admit"
                                      color={COLOR.textSoft}
                                      bg="transparent"
                                      onClick={() => message.warning("Please collect the application fee before admitting this student.")}
                                    />
                                  </span>
                                </Tooltip>
                              ) : (
                                <IconBtn
                                  icon={<CheckCircleOutlined />}
                                  title="Admit Student"
                                  color={COLOR.admitColor}
                                  bg={COLOR.admitBg}
                                  onClick={() => openAdmitModal(app)}
                                />
                              )
                            )}
                          </div>

                          {/* ── Fee Collection Button (RLMHSS only, ₹250) ── */}
                          <div style={{ width: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {isRLMHSSContext(app) && (
                              app.feeCollected ? (
                                <Tooltip title={`Print Receipt: ${app.receiptNumber || ""}`}>
                                  <button
                                    onClick={() => handlePrintReceipt(app, app.feePaidAt)}
                                    title="Print Fee Receipt"
                                    style={{
                                      all: "unset", width: 32, height: 32, borderRadius: 7,
                                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                                      cursor: "pointer", transition: "all 0.15s", color: COLOR.textMid,
                                      background: "transparent"
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.color = COLOR.admitColor; e.currentTarget.style.background = COLOR.admitBg; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = COLOR.textMid; e.currentTarget.style.background = "transparent"; }}
                                  >
                                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M6 2h12a1 1 0 0 1 1 1v18l-3-2-2 2-2-2-2 2-2-2-3 2V3a1 1 0 0 1 1-1z" />
                                      <line x1="9" y1="7" x2="15" y2="7" />
                                      <line x1="9" y1="11" x2="15" y2="11" />
                                      <line x1="9" y1="15" x2="12" y2="15" />
                                    </svg>
                                  </button>
                                </Tooltip>
                              ) : (
                                (role === "superadmin" || role === "accounts") && (
                                  <Tooltip title="Collect Application Fee (₹250)">
                                    <button
                                      onClick={() => openFeeModal(app)}
                                      title="Collect Application Fee"
                                      style={{
                                        all: "unset", width: 32, height: 32, borderRadius: 7,
                                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                                        cursor: "pointer", transition: "all 0.15s", color: COLOR.textMid,
                                        background: "transparent"
                                      }}
                                      onMouseEnter={e => { e.currentTarget.style.color = "#f59e0b"; e.currentTarget.style.background = "rgba(245,158,11,0.10)"; }}
                                      onMouseLeave={e => { e.currentTarget.style.color = COLOR.textMid; e.currentTarget.style.background = "transparent"; }}
                                    >
                                      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="6" x2="12" y2="7.5" />
                                        <path d="M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.5-1 2-2.5 2.5S9.5 13 9.5 14.5a2.5 2.5 0 0 0 5 0" />
                                        <line x1="12" y1="17" x2="12" y2="18" />
                                      </svg>
                                    </button>
                                  </Tooltip>
                                )
                              )
                            )}
                          </div>

                          <IconBtn icon={<EyeOutlined />} title="View Application" color={COLOR.blue} bg={COLOR.viewBg} onClick={() => handleView(app.id)} />
                          <IconBtn icon={<PrinterOutlined />} title="Print Application" color="#7c3aed" bg="rgba(124,58,237,0.09)"
                            onClick={async () => {
                              try {
                                const res = await axios.get(`${process.env.REACT_APP_API_URL}/applicationhsc/getApplicationhscById/${app.id}`);
                                handlePrint(res.data.application);
                              } catch {
                                message.error("Failed to fetch application for print");
                              }
                            }}
                          />
                          {app.studentStatus !== "Admitted" && (
                            <IconBtn icon={<EditOutlined />} title="Edit Application" color={COLOR.editColor} bg={COLOR.editBg} onClick={() => navigate(`/edit-applicationhsc/${app.id}`)} />
                          )}
                          {isSuperAdmin && app.studentStatus !== "Admitted" && (
                            <IconBtn icon={<DeleteOutlined />} title="Delete Application" color={COLOR.danger} bg={COLOR.dangerBg} onClick={() => handleDelete(app.id, app.name)} />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={cols.length} style={{ textAlign: "center", padding: "40px 16px", color: COLOR.textSoft, fontSize: FS }}>No applications found{filterGrade ? " for the selected grade" : ""}{filterStatus ? ` with status "${filterStatus}"` : ""}{searchQuery ? ` matching "${searchQuery}"` : ""}.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, padding: "12px 16px", borderTop: `1px solid ${COLOR.border}` }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                style={{ all: "unset", width: 32, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 7, cursor: currentPage === 1 ? "not-allowed" : "pointer", color: currentPage === 1 ? COLOR.textSoft : COLOR.blue, background: currentPage === 1 ? "transparent" : COLOR.viewBg }}>
                <LeftOutlined />
              </button>
              {getPaginationPages().map((page, i) => (
                page === "..." ? (
                  <span key={`ellipsis-${i}`} style={{ fontSize: "13px", color: COLOR.textSoft, padding: "0 4px" }}>…</span>
                ) : (
                  <button key={page} onClick={() => setCurrentPage(page)}
                    style={{ all: "unset", width: 32, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 7, cursor: "pointer", fontSize: "13px", fontWeight: page === currentPage ? 700 : 400, color: page === currentPage ? "#fff" : COLOR.blue, background: page === currentPage ? COLOR.blue : COLOR.viewBg }}>
                    {page}
                  </button>
                )
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                style={{ all: "unset", width: 32, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 7, cursor: currentPage === totalPages ? "not-allowed" : "pointer", color: currentPage === totalPages ? COLOR.textSoft : COLOR.blue, background: currentPage === totalPages ? "transparent" : COLOR.viewBg }}>
                <RightOutlined />
              </button>
            </div>
          )}
        </div>

        {/* ── View Application Modal ── */}
        {isModalVisible && selectedApplication && (
          <Modal
            title={<span style={{ fontFamily: FF, fontWeight: 700, fontSize: 16, color: COLOR.text }}>Application Details</span>}
            open={isModalVisible}
            onCancel={() => setIsModalVisible(false)}
            footer={
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "4px 0" }}>
                <button onClick={() => handlePrint(selectedApplication)}
                  style={{ all: "unset", display: "inline-flex", alignItems: "center", gap: 7, background: "#7c3aed", color: "#fff", padding: "8px 20px", borderRadius: 8, fontSize: "13.5px", fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(124,58,237,0.28)", transition: "all 0.18s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#6d28d9"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#7c3aed"; }}>
                  <PrinterOutlined style={{ fontSize: 15 }} /> Print Application
                </button>
                <button onClick={() => setIsModalVisible(false)}
                  style={{ all: "unset", display: "inline-flex", alignItems: "center", padding: "8px 20px", borderRadius: 8, fontSize: "13.5px", fontWeight: 600, cursor: "pointer", background: "#f1f5f9", color: COLOR.textMid, border: `1px solid ${COLOR.border}`, transition: "all 0.18s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#e2e8f0"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#f1f5f9"; }}>
                  Close
                </button>
              </div>
            }
            width={1100}>
            <Descriptions bordered column={2} size="small"
              labelStyle={{ fontWeight: 600, color: COLOR.textMid, fontFamily: FF, fontSize: "12.5px", background: "#f8fafc" }}
              contentStyle={{ fontFamily: FF, fontSize: "12.5px", color: COLOR.text }}>
              <Descriptions.Item label="Application Number">{selectedApplication.applicationNumber}</Descriptions.Item>
              <Descriptions.Item label="School Name">{selectedApplication.School?.name || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Academic Year">{selectedApplication.academicYear}</Descriptions.Item>
              <Descriptions.Item label="EMIS Number">{selectedApplication.emisNum}</Descriptions.Item>
              <Descriptions.Item label="Aadhar Number">{selectedApplication.aadharNumber}</Descriptions.Item>
              <Descriptions.Item label="Name">{selectedApplication.name}</Descriptions.Item>
              <Descriptions.Item label="Gender">{selectedApplication.gender}</Descriptions.Item>
              <Descriptions.Item label="Grade">{selectedApplication.Grade?.grade || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Date of Birth">{selectedApplication.dob}</Descriptions.Item>
              <Descriptions.Item label="Age">{formatAge(selectedApplication.age)}</Descriptions.Item>
              <Descriptions.Item label="Mobile Number">{selectedApplication.mobileNumber}</Descriptions.Item>
              <Descriptions.Item label="Previous Medium">{selectedApplication.previousmedium}</Descriptions.Item>
              <Descriptions.Item label="Preferred Medium">{selectedApplication.preferredmedium}</Descriptions.Item>
              <Descriptions.Item label="Nationality">{selectedApplication.nationality}</Descriptions.Item>
              <Descriptions.Item label="State">{selectedApplication.state}</Descriptions.Item>
              <Descriptions.Item label="Mother Tongue">{selectedApplication.motherTongue}</Descriptions.Item>
              <Descriptions.Item label="Birth District">{selectedApplication.birthdistrict}</Descriptions.Item>
              <Descriptions.Item label="Religion">{selectedApplication.religion}</Descriptions.Item>
              <Descriptions.Item label="Community">{selectedApplication.community}</Descriptions.Item>
              <Descriptions.Item label="Caste">{selectedApplication.caste}</Descriptions.Item>
              <Descriptions.Item label="Is the student from scheduled caste / tribe community?">{selectedApplication.scheduledcasteOrtribecommunity}</Descriptions.Item>
              <Descriptions.Item label="Is the student from backward caste?">{selectedApplication.backwardcaste}</Descriptions.Item>
              <Descriptions.Item label="Is the student a convert from tribe to other religion?">{selectedApplication.tribeTootherreligion}</Descriptions.Item>
              <Descriptions.Item label="Living with">{selectedApplication.living}</Descriptions.Item>
              <Descriptions.Item label="Current Living Address" span={2}>{selectedApplication.currentlivingaddress}</Descriptions.Item>
              <Descriptions.Item label="Blood Group">{selectedApplication.bloodGroup}</Descriptions.Item>
              <Descriptions.Item label="Identification Marks">{selectedApplication.identificationmarks}</Descriptions.Item>
              <Descriptions.Item label="Father's Name">{selectedApplication.fatherName}</Descriptions.Item>
              <Descriptions.Item label="Mother's Name">{selectedApplication.motherName}</Descriptions.Item>
              <Descriptions.Item label="Father's Occupation">{selectedApplication.fatherOccupation}</Descriptions.Item>
              <Descriptions.Item label="Mother's Occupation">{selectedApplication.motherOccupation}</Descriptions.Item>
              <Descriptions.Item label="Father's Income">{selectedApplication.fatherIncome}</Descriptions.Item>
              <Descriptions.Item label="Mother's Income">{selectedApplication.motherIncome}</Descriptions.Item>
              <Descriptions.Item label="Address">{selectedApplication.address}</Descriptions.Item>
              <Descriptions.Item label="Pincode">{selectedApplication.pincode}</Descriptions.Item>
              <Descriptions.Item label="Parent's Email ID">{selectedApplication.parentEmail}</Descriptions.Item>
              <Descriptions.Item label="Guardian Name">{selectedApplication.guardianName}</Descriptions.Item>
              <Descriptions.Item label="Guardian Occupation">{selectedApplication.guardianOccupation}</Descriptions.Item>
              <Descriptions.Item label="Guardian Address">{selectedApplication.guardianAddress}</Descriptions.Item>
              <Descriptions.Item label="Guardian Phone">{selectedApplication.guardianNumber}</Descriptions.Item>
              <Descriptions.Item label="Exam Year">{selectedApplication.examYear}</Descriptions.Item>
              <Descriptions.Item label="Registration Number">{selectedApplication.registrationnumber}</Descriptions.Item>
              <Descriptions.Item label="Tamil">{selectedApplication.tamil}</Descriptions.Item>
              <Descriptions.Item label="English">{selectedApplication.english}</Descriptions.Item>
              <Descriptions.Item label="Mathematics">{selectedApplication.maths}</Descriptions.Item>
              <Descriptions.Item label="Science">{selectedApplication.science}</Descriptions.Item>
              <Descriptions.Item label="Social Science">{selectedApplication.social}</Descriptions.Item>
              <Descriptions.Item label="Total">{selectedApplication.total}</Descriptions.Item>
              <Descriptions.Item label="Percentage">{selectedApplication.percentage}</Descriptions.Item>
              <Descriptions.Item label="Termination Reason">{selectedApplication.terminationreason}</Descriptions.Item>
              <Descriptions.Item label="Photocopy of TC">{selectedApplication.photocopyofTC}</Descriptions.Item>
              <Descriptions.Item label="Bank Name">{selectedApplication.bankName}</Descriptions.Item>
              <Descriptions.Item label="Branch Name">{selectedApplication.branchName}</Descriptions.Item>
              <Descriptions.Item label="Account Number">{selectedApplication.accountNumber}</Descriptions.Item>
              <Descriptions.Item label="IFSC Code">{selectedApplication.ifsccode}</Descriptions.Item>
            </Descriptions>

            {/* ── Academic History ── */}
            {(() => {
              let history = selectedApplication.academicHistory;
              if (typeof history === "string") {
                try { history = JSON.parse(history); } catch { history = []; }
                if (typeof history === "string") { try { history = JSON.parse(history); } catch { history = []; } }
              }
              if (!Array.isArray(history)) history = [];
              return (
                <div style={{ marginTop: 16 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: "#fff",
                    background: COLOR.headBg, padding: "6px 12px",
                    borderRadius: 5, marginBottom: 0,
                    textTransform: "uppercase", letterSpacing: "0.6px",
                    display: "inline-block", width: "100%", boxSizing: "border-box"
                  }}>
                    Academic History
                  </div>
                  {history.length === 0 ? (
                    <div style={{
                      padding: "10px 12px", fontSize: "12.5px",
                      color: COLOR.textSoft, border: `1px solid ${COLOR.border}`,
                      borderTop: "none", background: "#fff", borderRadius: "0 0 5px 5px"
                    }}>
                      No academic history recorded.
                    </div>
                  ) : (
                    <div style={{ border: `1px solid ${COLOR.border}`, borderTop: "none", borderRadius: "0 0 5px 5px", overflow: "hidden" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr", background: "#f1f5f9", borderBottom: `1px solid ${COLOR.border}` }}>
                        <div style={{ padding: "7px 12px", fontSize: 11, fontWeight: 700, color: COLOR.textMid, textTransform: "uppercase", letterSpacing: "0.4px" }}>School Name</div>
                        <div style={{ padding: "7px 12px", fontSize: 11, fontWeight: 700, color: COLOR.textMid, textTransform: "uppercase", letterSpacing: "0.4px" }}>Standard</div>
                        <div style={{ padding: "7px 12px", fontSize: 11, fontWeight: 700, color: COLOR.textMid, textTransform: "uppercase", letterSpacing: "0.4px" }}>Year (From – To)</div>
                      </div>
                      {history.map((row, i) => (
                        <div key={i} style={{
                          display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr",
                          background: i % 2 === 0 ? "#fff" : "#f8fafc",
                          borderBottom: i < history.length - 1 ? `1px solid ${COLOR.border}` : "none"
                        }}>
                          <div style={{ padding: "8px 12px", fontSize: "12.5px", color: COLOR.text, fontWeight: 500 }}>{row.schoolName || "—"}</div>
                          <div style={{ padding: "8px 12px", fontSize: "12.5px", color: COLOR.textMid }}>{row.standard || "—"}</div>
                          <div style={{ padding: "8px 12px", fontSize: "12.5px", color: COLOR.textMid }}>{row.duration || "—"}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </Modal>
        )}

        {/* ── Fee Collection Modal ── */}
        {feeModalVisible && feeApplication && (
          <Modal
            title={
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

                <span style={{ fontFamily: FF, fontWeight: 700, fontSize: 16, color: COLOR.text }}>Collect Application Fee – HSC</span>
              </div>
            }
            open={feeModalVisible}
            onCancel={() => { setFeeModalVisible(false); setFeeApplication(null); setFeePaymentMode("cash"); setFeeTransactionId(""); setFeePaymentDate(""); }}
            footer={null}
            width={480}
            centered
          >
            {/* Student info card */}
            <div style={{ background: "#f8fafc", border: `1px solid ${COLOR.border}`, borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: COLOR.textSoft, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 10 }}>Student Information</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: COLOR.textSoft, fontWeight: 600, marginBottom: 1 }}>Student Name</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: COLOR.text }}>{feeApplication.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: COLOR.textSoft, fontWeight: 600, marginBottom: 1 }}>Application No</div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: COLOR.blueLt }}>{feeApplication.applicationNumber}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: COLOR.textSoft, fontWeight: 600, marginBottom: 1 }}>Grade</div>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: COLOR.textMid }}>{feeApplication.Grade?.grade || "N/A"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: COLOR.textSoft, fontWeight: 600, marginBottom: 1 }}>Academic Year</div>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: COLOR.textMid }}>{feeApplication.academicYear}</div>
                </div>
              </div>
            </div>

            {/* Fee amount */}
            <div style={{ background: "#eff6ff", border: "1.5px solid #3b82f6", borderRadius: 8, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontSize: "13.5px", fontWeight: 600, color: "#1e40af" }}>Application Fee Amount</span>
              <span style={{ fontSize: "20px", fontWeight: 800, color: "#1e40af" }}>₹ {FEE_AMOUNT}.00</span>
            </div>

            {/* Payment mode */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: "13.5px", fontWeight: 600, color: COLOR.text, marginBottom: 8 }}>Payment Mode <span style={{ color: COLOR.danger }}>*</span></div>
              <div style={{ display: "flex", gap: 10 }}>
                {["cash", "online"].map(mode => (
                  <button key={mode} onClick={() => setFeePaymentMode(mode)}
                    style={{
                      all: "unset", flex: 1, textAlign: "center", padding: "9px 0", borderRadius: 8, fontSize: "13.5px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                      background: feePaymentMode === mode ? "#1e40af" : "#f1f5f9",
                      color: feePaymentMode === mode ? "#fff" : COLOR.textMid,
                      border: `1.5px solid ${feePaymentMode === mode ? "#1e40af" : COLOR.border}`,
                      boxShadow: feePaymentMode === mode ? "0 2px 8px rgba(30,64,175,0.2)" : "none"
                    }}>
                    {mode === "cash" ? "Cash" : "Online"}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Date */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: "13.5px", fontWeight: 600, color: COLOR.text, marginBottom: 6 }}>
                Payment Date <span style={{ color: COLOR.danger }}>*</span>
              </div>
              <input
                type="date"
                value={feePaymentDate}
                max={dayjs().format("YYYY-MM-DD")}
                onChange={e => setFeePaymentDate(e.target.value)}
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 8,
                  border: `1.5px solid ${COLOR.border}`, fontSize: "13.5px",
                  fontFamily: FF, color: COLOR.text, outline: "none",
                  boxSizing: "border-box", cursor: "pointer"
                }}
                onFocus={e => { e.target.style.borderColor = "#3b82f6"; }}
                onBlur={e => { e.target.style.borderColor = COLOR.border; }}
              />
            </div>

            {/* Transaction ID (online only) */}
            {feePaymentMode === "online" && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: "13.5px", fontWeight: 600, color: COLOR.text, marginBottom: 6 }}>Transaction ID <span style={{ color: COLOR.danger }}>*</span></div>
                <input
                  type="text"
                  placeholder="Enter transaction / UPI reference ID"
                  value={feeTransactionId}
                  onChange={e => setFeeTransactionId(e.target.value)}
                  style={{
                    width: "100%", padding: "9px 12px", borderRadius: 8,
                    border: `1.5px solid ${COLOR.border}`, fontSize: "13.5px",
                    fontFamily: FF, color: COLOR.text, outline: "none", boxSizing: "border-box"
                  }}
                  onFocus={e => { e.target.style.borderColor = "#3b82f6"; }}
                  onBlur={e => { e.target.style.borderColor = COLOR.border; }}
                />
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => { setFeeModalVisible(false); setFeeApplication(null); setFeePaymentMode("cash"); setFeeTransactionId(""); setFeePaymentDate(""); }}
                style={{ all: "unset", display: "inline-flex", alignItems: "center", padding: "9px 22px", borderRadius: 8, fontSize: "13.5px", fontWeight: 600, cursor: "pointer", background: "#f1f5f9", color: COLOR.textMid, border: `1px solid ${COLOR.border}` }}
                onMouseEnter={e => { e.currentTarget.style.background = "#e2e8f0"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#f1f5f9"; }}>
                Cancel
              </button>
              <button
                onClick={handleFeeConfirm}
                disabled={feeLoading || !feePaymentDate || (feePaymentMode === "online" && !feeTransactionId.trim())}
                style={{
                  all: "unset", display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "9px 24px", borderRadius: 8, fontSize: "13.5px", fontWeight: 600,
                  cursor: (feeLoading || !feePaymentDate || (feePaymentMode === "online" && !feeTransactionId.trim())) ? "not-allowed" : "pointer",
                  background: (feeLoading || !feePaymentDate || (feePaymentMode === "online" && !feeTransactionId.trim())) ? "#93c5fd" : "#1e40af",
                  color: "#fff", boxShadow: "0 2px 8px rgba(30,64,175,0.25)", transition: "all 0.15s"
                }}
                onMouseEnter={e => { if (!feeLoading) e.currentTarget.style.background = "#1e3a8a"; }}
                onMouseLeave={e => { if (!feeLoading) e.currentTarget.style.background = "#1e40af"; }}>
                {feeLoading ? "Processing…" : "✓ Collect Fee"}
              </button>
            </div>
          </Modal>
        )}

        {/* ── Admit Student Modal ── */}
        {admitModalVisible && admitApplication && (
          <Modal
            title={
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CheckCircleOutlined style={{ color: COLOR.admitColor, fontSize: 20 }} />
                <span style={{ fontFamily: FF, fontWeight: 700, fontSize: 16, color: COLOR.text }}>Admit Student</span>
              </div>
            }
            open={admitModalVisible}
            onCancel={closeAdmitModal}
            footer={null}
            width={580}
            centered>

            {/* ── Student Info Card ── */}
            <div style={{ background: "#f8fafc", border: `1px solid ${COLOR.border}`, borderRadius: 10, padding: "16px 18px", marginBottom: 20 }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: COLOR.textSoft, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 12 }}>Student Information</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: COLOR.textSoft, fontWeight: 600, marginBottom: 2 }}>Student Name</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: COLOR.text }}>{admitApplication.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: COLOR.textSoft, fontWeight: 600, marginBottom: 2 }}>School</div>
                  <div style={{ fontSize: "13.5px", fontWeight: 500, color: COLOR.textMid }}>{isSuperAdmin ? (admitApplication.School?.name || selectedSchoolName || "N/A") : (user.school?.name || "N/A")}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: COLOR.textSoft, fontWeight: 600, marginBottom: 2 }}>Grade</div>
                  <div style={{ fontSize: "13.5px", fontWeight: 500, color: COLOR.textMid }}>{admitApplication.Grade?.grade || "N/A"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: COLOR.textSoft, fontWeight: 600, marginBottom: 2 }}>Academic Year</div>
                  <div style={{ fontSize: "13.5px", fontWeight: 500, color: COLOR.textMid }}>{admitApplication.academicYear}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: COLOR.textSoft, fontWeight: 600, marginBottom: 2 }}>EMIS Number</div>
                  <div style={{ fontSize: "13.5px", fontWeight: 500, color: COLOR.textMid }}>{admitApplication.emisNum || "N/A"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: COLOR.textSoft, fontWeight: 600, marginBottom: 2 }}>Application Number</div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: COLOR.blueLt }}>{admitApplication.applicationNumber}</div>
                </div>
              </div>
            </div>

            {/* ── Section Selection ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: "13.5px", fontWeight: 600, color: COLOR.text, marginBottom: 8 }}>
                Select Section <span style={{ color: COLOR.danger }}>*</span>
              </div>
              {sectionsLoading ? (
                <div style={{ padding: "12px 0", color: COLOR.textSoft, fontSize: 13 }}>Loading sections…</div>
              ) : admitSections.length === 0 ? (
                <div style={{ padding: "10px 14px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, color: "#c2410c", fontSize: "13px" }}>
                  No sections found for <strong>{admitApplication.Grade?.grade}</strong> in <strong>{admitApplication.academicYear}</strong>. Please create a section first.
                </div>
              ) : (
                <Select
                  placeholder="— Select Section —"
                  value={admitSectionId}
                  onChange={val => setAdmitSectionId(val)}
                  style={{ width: "100%", fontFamily: FF }}
                  size="large">
                  {admitSections.map(s => (
                    <Option key={s.id} value={s.id}>
                      {s.sectionName}{s.shortCode ? ` (${s.shortCode})` : ""}
                    </Option>
                  ))}
                </Select>
              )}
            </div>

            {/* ── Group Subjects Selection ── */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: "13.5px", fontWeight: 600, color: COLOR.text, marginBottom: 8 }}>
                Select Group Subjects
              </div>
              {subjectsLoading ? (
                <div style={{ padding: "12px 0", color: COLOR.textSoft, fontSize: 13 }}>Loading subjects…</div>
              ) : groupSubjects.length === 0 ? (
                <div style={{ padding: "10px 14px", background: "#f8fafc", border: `1px solid ${COLOR.border}`, borderRadius: 8, color: COLOR.textSoft, fontSize: "13px" }}>
                  No subjects found for <strong>{admitApplication.Grade?.grade}</strong> in <strong>{admitApplication.academicYear}</strong>.
                </div>
              ) : (
                <div style={{ border: `1px solid ${COLOR.border}`, borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "36px 1fr 1fr 100px", background: COLOR.headBg, padding: "9px 14px", gap: 8 }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: COLOR.headText, textTransform: "uppercase" }}>S.No</div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: COLOR.headText, textTransform: "uppercase" }}>Subject Name</div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: COLOR.headText, textTransform: "uppercase" }}>Short Code</div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: COLOR.headText, textTransform: "uppercase", textAlign: "center" }}>Select</div>
                  </div>
                  {groupSubjects.map((subj, idx) => {
                    const isChecked = selectedGroupSubjects.includes(subj.id);
                    return (
                      <div key={subj.id} onClick={() => toggleSubject(subj.id)}
                        style={{
                          display: "grid", gridTemplateColumns: "36px 1fr 1fr 100px",
                          padding: "10px 14px", gap: 8,
                          background: isChecked ? "rgba(22,163,74,0.06)" : idx % 2 === 0 ? COLOR.rowOdd : COLOR.rowEven,
                          borderTop: `1px solid ${COLOR.border}`,
                          cursor: "pointer", transition: "background 0.12s", alignItems: "center",
                        }}
                        onMouseEnter={e => { if (!isChecked) e.currentTarget.style.background = COLOR.rowHover; }}
                        onMouseLeave={e => { e.currentTarget.style.background = isChecked ? "rgba(22,163,74,0.06)" : idx % 2 === 0 ? COLOR.rowOdd : COLOR.rowEven; }}>
                        <div style={{ fontSize: "12px", color: COLOR.textSoft, fontWeight: 500 }}>{idx + 1}</div>
                        <div style={{ fontSize: "13.5px", color: COLOR.text, fontWeight: isChecked ? 600 : 400 }}>{subj.subjectName}</div>
                        <div style={{ fontSize: "13px", color: COLOR.textMid }}>{subj.shortCode || "—"}</div>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <input type="checkbox" checked={isChecked} onChange={() => toggleSubject(subj.id)}
                            onClick={e => e.stopPropagation()}
                            style={{ width: 17, height: 17, cursor: "pointer", accentColor: COLOR.admitColor }} />
                        </div>
                      </div>
                    );
                  })}
                  {selectedGroupSubjects.length > 0 && (
                    <div style={{ padding: "8px 14px", borderTop: `1px solid ${COLOR.border}`, background: "rgba(22,163,74,0.06)", fontSize: "12.5px", color: COLOR.admitColor, fontWeight: 600 }}>
                      ✓ {selectedGroupSubjects.length} subject{selectedGroupSubjects.length > 1 ? "s" : ""} selected
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Action Buttons ── */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={closeAdmitModal}
                style={{ all: "unset", display: "inline-flex", alignItems: "center", padding: "9px 22px", borderRadius: 8, fontSize: "13.5px", fontWeight: 600, cursor: "pointer", background: "#f1f5f9", color: COLOR.textMid, border: `1px solid ${COLOR.border}`, transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#e2e8f0"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#f1f5f9"; }}>
                Cancel
              </button>
              <button onClick={handleAdmitConfirm}
                disabled={admitLoading || !admitSectionId || admitSections.length === 0}
                style={{
                  all: "unset", display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "9px 24px", borderRadius: 8, fontSize: "13.5px", fontWeight: 600,
                  cursor: (admitLoading || !admitSectionId || admitSections.length === 0) ? "not-allowed" : "pointer",
                  background: (admitLoading || !admitSectionId || admitSections.length === 0) ? "#86efac" : COLOR.admitColor,
                  color: "#fff", transition: "all 0.15s",
                  boxShadow: (admitLoading || !admitSectionId || admitSections.length === 0) ? "none" : "0 2px 8px rgba(22,163,74,0.3)"
                }}
                onMouseEnter={e => { if (!admitLoading && admitSectionId) e.currentTarget.style.background = "#15803d"; }}
                onMouseLeave={e => { if (!admitLoading && admitSectionId) e.currentTarget.style.background = COLOR.admitColor; }}>
                <CheckCircleOutlined style={{ fontSize: 15 }} />
                {admitLoading ? "Admitting…" : "Confirm Admit"}
              </button>
            </div>
          </Modal>
        )}
      </div>
    </Layout>
  );
};

export default ApplicationHSCList;