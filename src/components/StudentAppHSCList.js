import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
  message, Modal, Descriptions, Form, Input,
  Select, Button, Checkbox, Dropdown, Tooltip, DatePicker
} from "antd";
import Layout from "./Layout";
import {
  EyeOutlined, EditOutlined, DeleteOutlined, PrinterOutlined,
  ExclamationCircleOutlined, SettingOutlined, FileTextOutlined,
  SwapOutlined, ArrowDownOutlined,
  LeftOutlined, RightOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useFilter } from "./FilterContext";
import * as XLSX from "xlsx";

// ── Design tokens ────────────────────────────────────────────────────────────
const COLOR = {
  blue: "#1e40af",
  blueLt: "#3b82f6",
  text: "#1e293b",
  textMid: "#475569",
  textSoft: "#64748b",
  border: "#e2e8f0",
  rowOdd: "#ffffff",
  rowEven: "#f8fafc",
  rowHover: "#eff6ff",
  rowSel: "#eef2ff",
  rowLocked: "#f9f9f9",
  headBg: "#1a2236",
  headText: "#ffffff",
  danger: "#e21216",
  dangerBg: "rgba(226,18,22,0.08)",
  viewBg: "rgba(30,64,175,0.08)",
  editColor: "#0891b2",
  editBg: "rgba(8,145,178,0.08)",
  printColor: "#c2580a",
  printBg: "rgba(194,88,10,0.08)",
  tcColor: "#722ed1",
  tcBg: "rgba(114,46,209,0.08)",
  filterBg: "#eff6ff",
  filterText: "#1a3c6e",
  promoColor: "#1a7a4a",
  promoBg: "rgba(26,122,74,0.08)",
  demoteColor: "#b45309",
  demoteBg: "rgba(180,83,9,0.08)",
};
const FF = "'Segoe UI', system-ui, sans-serif";
const FS = "13.5px";
const PAGE_SIZE = 25;

// ── Group / Subject name map ──────────────────────────────────────────────────
// NOTE: Subject names are resolved dynamically at view-time from the API.
// The static map below is only a last-resort fallback and should NOT be relied upon.
// Subject IDs are assigned by your database and will differ per installation.
const GROUP_SUBJECT_FALLBACK_MAP = {};

/**
 * Resolves group_subjects (may be an array of IDs, names, a JSON string, or
 * double-encoded JSON like ['["11"]']) into a comma-separated list of subject
 * names using a dynamically fetched subjectMap (id → name).
 */
const resolveGroupSubjects = (raw, subjectMap = {}, fallback = "N/A") => {
  if (!raw) return fallback;

  // ── Deep-unwrap all known storage shapes ──────────────────────────────────
  let arr = raw;
  if (typeof arr === "string") {
    try { arr = JSON.parse(arr); } catch { return raw; }
    if (typeof arr === "string") { try { arr = JSON.parse(arr); } catch { return raw; } }
  }
  if (!Array.isArray(arr) || arr.length === 0) return fallback;

  // Each element might itself be a JSON-encoded array: '["11"]'
  const flat = [];
  arr.forEach((item) => {
    const s = String(item).trim();
    if (s.startsWith("[")) {
      try {
        const inner = JSON.parse(s);
        if (Array.isArray(inner)) inner.forEach((x) => flat.push(String(x)));
        else flat.push(String(inner));
      } catch { flat.push(s); }
    } else {
      flat.push(s);
    }
  });

  if (flat.length === 0) return fallback;

  const names = flat.map(item => {
    const id = Number(item);
    if (!isNaN(id) && subjectMap[id]) return subjectMap[id];          // matched by numeric ID
    if (!isNaN(id) && GROUP_SUBJECT_FALLBACK_MAP[id]) return GROUP_SUBJECT_FALLBACK_MAP[id];
    // If the item is already a name string (not a pure number), return it as-is
    if (isNaN(id)) return item;
    return null;                                                        // unresolvable numeric ID
  }).filter(Boolean);

  return names.length ? names.join(", ") : fallback;
};

// ── Reusable icon button ─────────────────────────────────────────────────────
const IconBtn = ({ icon, title, color, bg, onClick, disabled }) => {
  const [hov, setHov] = React.useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => !disabled && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        all: "unset", width: 32, height: 32, borderRadius: 7,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer", fontSize: 16,
        transition: "all 0.15s",
        color: disabled ? "#c0c0c0" : hov ? color : COLOR.textMid,
        background: disabled ? "transparent" : hov ? bg : "transparent",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon}
    </button>
  );
};

const { Option } = Select;

// ════════════════════════════════════════════════════════════════════════════
const StudentHSCList = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isViewModal, setIsViewModal] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  // Dynamic map of subject id → subject name, populated when a student is viewed
  const [subjectMap, setSubjectMap] = useState({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Grade / Section filters
  const [filterGrade, setFilterGrade] = useState("");
  const [filterSection, setFilterSection] = useState("");

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Bulk withdraw
  const [isBulkWithdrawModal, setIsBulkWithdrawModal] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  // TC modal
  const [tcForm] = Form.useForm();
  const [isTcModal, setIsTcModal] = useState(false);
  const [tcLoading, setTcLoading] = useState(false);
  const [pendingTcIds, setPendingTcIds] = useState([]);
  const [tcDateValue, setTcDateValue] = useState(dayjs().format("YYYY-MM-DD"));

  // ── Fee dues check state ─────────────────────────────────────────────────
  const [feeDueCheckLoading, setFeeDueCheckLoading] = useState(false);
  const [isFeeDueModalVisible, setIsFeeDueModalVisible] = useState(false);
  const [studentsWithDues, setStudentsWithDues] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const schoolId = user?.school?.id;
  const isSuperAdmin = role === "superadmin";
  const isAdminRole = role === "superadmin" || role === "schooladmin";

  const { selectedSchool, selectedYear, selectedSchoolName } = useFilter();

  useEffect(() => { fetchStudents(); }, [selectedSchool, selectedYear, location.pathname]);

  // Reset page to 1 whenever students list changes
  useEffect(() => { setCurrentPage(1); }, [students]);

  // Reset search when students list refreshes
  useEffect(() => { setSearchQuery(""); }, [students]);

  // Reset section filter when grade changes; reset page on any filter change
  useEffect(() => { setFilterSection(""); }, [filterGrade]);
  useEffect(() => { setCurrentPage(1); }, [filterGrade, filterSection]);

  // ── Helpers ──────────────────────────────────────────────────────────────
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

  // ── Fetch list ───────────────────────────────────────────────────────────
  const fetchStudents = async () => {
    try {
      let res;
      const effectiveSchoolId = isSuperAdmin
        ? selectedSchool === "all" ? null : selectedSchool
        : schoolId;

      if (isSuperAdmin && selectedSchool === "all" && selectedYear) {
        res = await axios.get(
          `${process.env.REACT_APP_API_URL}/studenthsc/getAllStudenthscByYear/${selectedYear}`
        );
      } else if (effectiveSchoolId && selectedYear) {
        res = await axios.get(
          `${process.env.REACT_APP_API_URL}/studenthsc/getStudenthscsBySchoolAndYear/${effectiveSchoolId}/${selectedYear}`
        );
      } else if (effectiveSchoolId) {
        res = await axios.get(
          `${process.env.REACT_APP_API_URL}/studenthsc/getStudenthscsBySchool/${effectiveSchoolId}`
        );
      } else {
        res = await axios.get(
          `${process.env.REACT_APP_API_URL}/studenthsc/getAllStudenthsc`
        );
      }

      const raw = res.data.studenthscs || res.data.students || [];
      const data = raw
        .filter(s => s.status !== "Removed" && s.status !== "Withdrawn" && s.status !== "TC Issued")
        .map(s => ({
          ...s,
          Grade: s.Grade || { grade: "N/A" },
          Section: s.Section || { sectionName: "N/A" },
          isPromoted: s.isPromoted ?? false,
          isDemoted: s.isDemoted ?? false,
          isLocked: s.isLocked ?? false,
        }));

      setStudents(data.sort((a, b) => b.id - a.id));
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.details || "Failed to fetch students");
    }
  };

  // ── View ─────────────────────────────────────────────────────────────────
  const handleView = async (id) => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/studenthsc/getStudenthscById/${id}`
      );
      const student = res.data.student;
      setSelectedStudent(student);
      setIsViewModal(true);

      // Build id→name map using year-scoped endpoint so IDs match exactly what's stored
      if (student?.school_id && student?.grade_id) {
        try {
          // Primary: fetch by school + academicYear (IDs are year-specific in your schema)
          const year = student.academicYear;
          let subjectList = [];
          if (year) {
            const subRes = await axios.get(
              `${process.env.REACT_APP_API_URL}/subject/getSubjectsBySchoolAndYear/${student.school_id}/${year}`
            );
            subjectList = subRes.data.subjects || [];
          }
          // If year fetch returned nothing, fall back to grade endpoint
          if (subjectList.length === 0) {
            const subRes2 = await axios.get(
              `${process.env.REACT_APP_API_URL}/subject/getSubjectsBySchoolAndGrade/${student.school_id}/${student.grade_id}`
            );
            subjectList = subRes2.data.subjects || [];
          }
          const map = {};
          subjectList.forEach(s => { map[s.id] = s.subjectName; });
          setSubjectMap(map);
        } catch {
          setSubjectMap({});
        }
      } else {
        setSubjectMap({});
      }
    } catch {
      message.error("Failed to fetch student details");
    }
  };

  // ── Edit ─────────────────────────────────────────────────────────────────
  const handleEdit = (student) => {
    if (student.isLocked) {
      if (student.isPromoted) {
        message.warning("This student was promoted from this academic year. Switch to the promoted-to year to edit.");
      } else if (student.isDemoted) {
        message.warning("This student was demoted from this academic year. Switch to the demoted-to year to edit.");
      } else {
        message.warning("This student's record is locked for this academic year and cannot be edited here.");
      }
      return;
    }
    navigate(`/edit-studenthsc/${student.id}`);
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id, name, student) => {
    if (student?.isLocked) {
      if (student.isPromoted) {
        message.warning("This student was promoted from this academic year. Switch to the promoted-to year to delete.");
      } else if (student.isDemoted) {
        message.warning("This student was demoted from this academic year. Switch to the demoted-to year to delete.");
      } else {
        message.warning("This student's record is locked for this academic year and cannot be deleted here.");
      }
      return;
    }
    if (!window.confirm(`Are you sure you want to remove application of ${name}?`)) return;
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/studenthsc/updateStatus/${id}`);
      message.success("Application removed successfully");
      fetchStudents();
    } catch { message.error("Failed to remove application"); }
  };

  // ── Checkbox helpers ─────────────────────────────────────────────────────
  const selectableStudents = students.filter(s => !s.isLocked);
  const toggleSelectAll = e => setSelectedRowKeys(e.target.checked ? selectableStudents.map(s => s.id) : []);
  const toggleSelectRow = id => setSelectedRowKeys(prev => prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]);
  const allSelected = selectableStudents.length > 0 && selectedRowKeys.length === selectableStudents.length;
  const someSelected = selectedRowKeys.length > 0 && selectedRowKeys.length < selectableStudents.length;

  // ── Bulk withdraw ────────────────────────────────────────────────────────
  const confirmBulkWithdraw = async () => {
    setWithdrawing(true);
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/studenthsc/withdrawStudents`, {
        studentIds: selectedRowKeys,
        reason: withdrawReason,
        school_id: isSuperAdmin ? (selectedSchool === "all" ? students.find(s => selectedRowKeys.includes(s.id))?.school_id : selectedSchool) : schoolId,
        academic_year: selectedYear || undefined,
      });
      message.success(`${selectedRowKeys.length} student(s) moved to TC successfully.`);
      setSelectedRowKeys([]); setWithdrawReason(""); setIsBulkWithdrawModal(false);
      fetchStudents();
    } catch (err) {
      message.error(err.response?.data?.error || "Failed to withdraw students. Please try again.");
    }
    finally { setWithdrawing(false); }
  };

  // ── TC modal — with fee-dues pre-check ──────────────────────────────────
  const openTcModal = async (ids) => {
    if (!ids || ids.length === 0) {
      message.warning("Please select at least one student first.");
      return;
    }

    // Determine effective school_id and academic_year for the check
    const effectiveSchoolId = isSuperAdmin
      ? selectedSchool === "all"
        ? students.find((s) => ids.includes(s.id))?.school_id
        : selectedSchool
      : schoolId;

    const effectiveYear = selectedYear || students.find((s) => ids.includes(s.id))?.academicYear;

    setFeeDueCheckLoading(true);
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/studenthsc/checkFeeDuesBeforeTc`,
        {
          studentIds: ids,
          school_id: effectiveSchoolId,
          academic_year: effectiveYear,
        }
      );

      if (res.data.hasDues) {
        // Block TC — show detailed modal listing students with dues
        setStudentsWithDues(res.data.studentsWithDues);
        setIsFeeDueModalVisible(true);
        return;
      }

      // No dues — proceed to TC form modal as normal
      setPendingTcIds(ids);
      const today = dayjs().format("YYYY-MM-DD");
      setTcDateValue(today);
      tcForm.resetFields();
      tcForm.setFieldsValue({ tcDate: today, conductCertificate: "Good" });
      setIsTcModal(true);
    } catch (err) {
      message.error(err.response?.data?.error || "Failed to check fee dues. Please try again.");
    } finally {
      setFeeDueCheckLoading(false);
    }
  };

  const handleBulkTcSubmit = async () => {
    try {
      const values = await tcForm.validateFields();
      setTcLoading(true);
      await axios.post(`${process.env.REACT_APP_API_URL}/tchsc/bulkIssueTc`, {
        studentIds: pendingTcIds,
        tcDate: values.tcDate || null,
        reason: values.reason,
        conductCertificate: values.conductCertificate,
        remarks: values.remarks,
      });
      message.success(`TC issued for ${pendingTcIds.length} student(s) successfully`);
      setIsTcModal(false); setSelectedRowKeys([]); setPendingTcIds([]);
      fetchStudents();
    } catch (err) { message.error(err.response?.data?.error || "Failed to issue TC"); }
    finally { setTcLoading(false); }
  };

  // ── Print ─────────────────────────────────────────────────────────────────
const handlePrint = async (id) => {
  try {
    const res = await axios.get(
      `${process.env.REACT_APP_API_URL}/studenthsc/getStudenthscById/${id}`
    );
    const app = res.data.student;
    if (!app) { message.error("No data for printing"); return; }

    // Build subject map so group names resolve correctly in print
    let printSubjectMap = {};
    if (app.school_id && app.grade_id) {
      try {
        const year = app.academicYear;
        let subjectList = [];
        if (year) {
          const subRes = await axios.get(
            `${process.env.REACT_APP_API_URL}/subject/getSubjectsBySchoolAndYear/${app.school_id}/${year}`
          );
          subjectList = subRes.data.subjects || [];
        }
        if (subjectList.length === 0) {
          const subRes2 = await axios.get(
            `${process.env.REACT_APP_API_URL}/subject/getSubjectsBySchoolAndGrade/${app.school_id}/${app.grade_id}`
          );
          subjectList = subRes2.data.subjects || [];
        }
        subjectList.forEach(s => { printSubjectMap[s.id] = s.subjectName; });
      } catch { /* fallback to empty map */ }
    }

    const pw = window.open("", "_blank", "width=900,height=700");
    pw.document.write(preparePrintContent(app, printSubjectMap));
    pw.document.close();
    pw.onload = () => { pw.focus(); pw.print(); };
  } catch { message.error("Failed to fetch student data for print"); }
};

  const preparePrintContent = (app, subjectMap = {}) => {
    const school = app.School || {};
    const fmtAge = (age) => {
      if (!age) return "N/A";
      if (typeof age === "string") {
        try { age = JSON.parse(age); } catch { return "N/A"; }
        if (typeof age === "string") { try { age = JSON.parse(age); } catch { return "N/A"; } }
      }
      if (typeof age !== "object") return "N/A";
      const { years = 0, months = 0, days = 0 } = age;
      return `${years} yr${years !== 1 ? "s" : ""}, ${months} mo${months !== 1 ? "s" : ""}, ${days} day${days !== 1 ? "s" : ""}`;
    };
    const val = (v) => v || "\u2014";
    const field = (label, value) =>
      `<div class="field-box"><div class="field-label">${label}</div><div class="field-value">${val(value)}</div></div>`;
    const sec = (title) =>
      `<div class="section-title">${title}</div>`;
    const historyRows = (() => {
      let h = app?.academicHistory;
      if (!h || h === "") return `<tr><td colspan="3" style="color:#64748b;font-style:italic">No Academic History</td></tr>`;
      if (typeof h === "string") { try { h = JSON.parse(h); } catch { return `<tr><td colspan="3">Invalid Data</td></tr>`; } }
      if (!Array.isArray(h) || h.length === 0) return `<tr><td colspan="3" style="color:#64748b;font-style:italic">No Academic History</td></tr>`;
      return h.map(item => `<tr><td>${item?.schoolName || ""}</td><td>${item?.standard || ""}</td><td>${item?.duration || ""}</td></tr>`).join("");
    })();

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Student Profile \u2013 ${app.name || ""}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1e293b; background: #fff; }
  @page { size: A4; margin: 15mm 12mm; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none; } }

  /* ── Header ── */
  .header { display: flex; align-items: center; gap: 18px; padding-bottom: 14px; border-bottom: 2.5px solid #15803d; margin-bottom: 16px; }
  .logo-wrap { width: 150px; height: 150px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .logo-wrap img { width: 100%; height: 100%; object-fit: contain; }
  .logo-placeholder { font-size: 30px; }
  .school-info { flex: 1; }
  .school-name { font-size: 17px; font-weight: 700; color: #1a2236; letter-spacing: -0.3px; line-height: 1.3; }
  .school-meta { margin-top: 2px; display: flex; flex-direction: column; gap: 3px; }
  .school-meta-row { font-size: 11.5px; color: #475569; }
  .badge-wrap { text-align: right; flex-shrink: 0; }
  .active-badge { display: inline-block; background: #dcfce7; color: #15803d; border: 1px solid #86efac; border-radius: 20px; padding: 3px 12px; font-size: 11px; font-weight: 700; letter-spacing: 0.4px; margin-bottom: 6px; }
  .adm-label { font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px; }
  .adm-value { font-size: 15px; font-weight: 700; color: #15803d; margin-top: 2px; }
  .adm-year  { font-size: 11px; color: #64748b; margin-top: 2px; }

  /* ── Enrollment strip ── */
  .enroll-strip { display: flex; gap: 0; background: #f0fdf4; border: 1px solid #86efac; border-radius: 7px; overflow: hidden; margin-bottom: 14px; }
  .enroll-cell  { flex: 1; padding: 7px 12px; border-right: 1px solid #86efac; }
  .enroll-cell:last-child { border-right: none; }
  .enroll-cell .el { font-size: 10px; font-weight: 600; color: #15803d; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 2px; }
  .enroll-cell .ev { font-size: 12px; font-weight: 600; color: #1e293b; }

  /* ── Section title ── */
  .section-title { font-size: 11px; font-weight: 700; color: #fff; background: #166534; padding: 5px 12px; border-radius: 5px; margin: 14px 0 8px; text-transform: uppercase; letter-spacing: 0.6px; }

  /* ── Fields grid ── */
  .fields-grid   { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: #e2e8f0; border: 1px solid #e2e8f0; border-radius: 7px; overflow: hidden; }
  .fields-grid-2 { grid-template-columns: repeat(2, 1fr); }
  .field-box     { background: #fff; padding: 7px 11px; }
  .field-box:nth-child(even) { background: #f8fafc; }
  .field-label   { font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 2px; }
  .field-value   { font-size: 12px; color: #1e293b; font-weight: 500; word-break: break-word; }
  .field-full    { grid-column: 1 / -1; }

  /* ── Academic history table ── */
  .hist-table { width: 100%; border-collapse: collapse; border-radius: 7px; overflow: hidden; border: 1px solid #e2e8f0; }
  .hist-table th { background: #f0fdf4; color: #166534; font-size: 10.5px; font-weight: 700; padding: 6px 10px; text-align: left; border-bottom: 1px solid #d1fae5; }
  .hist-table td { font-size: 11.5px; padding: 6px 10px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
  .hist-table tr:last-child td { border-bottom: none; }

  /* ── Footer ── */
  .footer { margin-top: 22px; border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; align-items: flex-end; }
  .footer-sig .sig-line { width: 120px; border-top: 1px solid #1e293b; margin: 0 auto 4px; padding-top: 4px; font-size: 10.5px; color: #475569; text-align: center; }
</style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div class="logo-wrap">
      ${school.logo ? `<img src="${school.logo}" alt="logo"/>` : `<span class="logo-placeholder">\uD83C\uDFEB</span>`}
    </div>
    <div class="school-info">
      <div class="school-name">${val(school.name)}</div>
      <div class="school-meta">
        ${school.address || school.city ? `<div class="school-meta-row">${[school.address, school.city, school.state, school.pincode].filter(Boolean).join(", ")}</div>` : ""}
        ${school.phoneNumber ? `<div class="school-meta-row">${school.phoneNumber}</div>` : ""}
        ${school.email ? `<div class="school-meta-row">${school.email}</div>` : ""}
      </div>
    </div>
    <div class="badge-wrap">
      <div class="adm-label">Admission No</div>
      <div class="adm-value">${val(app.admissionNumber)}</div>
      <div class="adm-year">${val(app.academicYear)}</div>
    </div>
  </div>

  <!-- Enrollment strip -->
  <div class="enroll-strip">
    <div class="enroll-cell"><div class="el">Date of Join</div><div class="ev">${val(app.dateofjoin)}</div></div>
    <div class="enroll-cell"><div class="el">Grade</div><div class="ev">${val(app.Grade?.grade)}</div></div>
    <div class="enroll-cell"><div class="el">Section</div><div class="ev">${val(app.Section?.sectionName)}</div></div>
    <div class="enroll-cell"><div class="el">Group</div><div class="ev">${resolveGroupSubjects(app.group_subjects, subjectMap, "\u2014")}</div></div>
    <div class="enroll-cell"><div class="el">EMIS Number</div><div class="ev">${val(app.emisNum)}</div></div>
  </div>

  <!-- Personal Details -->
  ${sec("Personal Details")}
  <div class="fields-grid">
    ${field("Full Name", app.name)}
    ${field("Gender", app.gender)}
    ${field("Aadhar Number", app.aadharNumber)}
    ${field("Age", fmtAge(app.age))}
     ${field("Previous Medium", app.previousmedium)}
    ${field("Preferred Medium", app.preferredmedium)}
    ${field("Nationality", app.nationality)}
    ${field("State", app.state)}
    ${field("Birth District", app.birthdistrict)}
    ${field("Mother Tongue", app.motherTongue)}
    ${field("Religion", app.religion)}
    ${field("Community", app.community)}
    ${field("Caste", app.caste)}
    ${field("Is the student from scheduled caste / tribe community?", app.scheduledcasteOrtribecommunity)}
    ${field("Is the student from backward caste?", app.backwardcaste)}
    ${field("Is the student a convert from tribe to other religion?", app.tribeTootherreligion)}
    ${field("Living With", app.living)}
    ${field("Current Living Address", app.currentlivingaddress)}
    ${field("Identification Marks", app.identificationmarks)}
    ${field("Blood Group", app.bloodGroup)}
    <div class="field-box field-full"><div class="field-label">Current Living Address</div><div class="field-value">${val(app.currentlivingaddress)}</div></div>
  </div>

  <!-- Family & Contact -->
  ${sec("Family & Contact Details")}
  <div class="fields-grid">
    ${field("Father's Name", app.fatherName)}
    ${field("Mother's Name", app.motherName)}
    ${field("Father's Occupation", app.fatherOccupation)}
    ${field("Mother's Occupation", app.motherOccupation)}
    ${field("Father's Annual Income", app.fatherIncome)}
    ${field("Mother's Annual Income", app.motherIncome)}
    ${field("Mobile Number", app.mobileNumber)}
    ${field("Parent's Email ID", app.parentEmail)}
    ${field("Address", app.address)}
    ${field("Pincode", app.pincode)}
    <div class="field-box field-full"><div class="field-label">Address</div><div class="field-value">${val(app.address)}</div></div>
  </div>

  <!-- Guardian -->
  ${sec("Guardian Details")}
  <div class="fields-grid">
    ${field("Guardian Name", app.guardianName)}
    ${field("Guardian Occupation", app.guardianOccupation)}
    ${field("Guardian Phone Number", app.guardianNumber)}
    ${field("Guardian Address", app.guardianAddress)}
    <div class="field-box field-full"><div class="field-label">Guardian Address</div><div class="field-value">${val(app.guardianAddress)}</div></div>
  </div>

  <!-- SSLC Academic / Exam Details -->
  ${sec("SSLC Exam Details")}
  <div class="fields-grid">
    ${field("Exam Year", app.examYear)}
    ${field("Registration Number", app.registrationNumber || app.registrationnumber)}
    ${field("Tamil", app.tamil)}
    ${field("English", app.english)}
    ${field("Mathematics", app.maths)}
    ${field("Science", app.science)}
    ${field("Social Science", app.social)}
    ${field("Total", app.total)}
    ${field("Percentage", app.percentage)}
  </div>

  <!-- Academic History -->
  ${sec("Academic History")}
  <table class="hist-table" style="margin-bottom:8px">
    <thead><tr><th>Previous School Name</th><th>Standard</th><th>Duration</th></tr></thead>
    <tbody>${historyRows}</tbody>
  </table>

  <!-- Academic Details -->
  ${sec("Academic Details")}
  <div class="fields-grid">
    ${field("Termination Reason", app.terminationreason)}
    ${field("TC Photocopy Submitted?", app.photocopyofTC)}
  </div>

  <!-- Bank Details -->
  ${sec("Bank Details")}
  <div class="fields-grid">
    ${field("Bank Name", app.bankName)}
    ${field("Branch Name", app.branchName)}
    ${field("Account Number", app.accountNumber)}
    ${field("IFSC Code", app.ifsccode)}
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-sig"><div class="sig-line">Parent / Guardian Signature</div></div>
    <div class="footer-sig"><div class="sig-line">Student Signature</div></div>
    <div class="footer-sig"><div class="sig-line">Class Teacher Signature</div></div>
    <div class="footer-sig"><div class="sig-line">Principal Signature</div></div>
  </div>

</body>
</html>`;
  };
  // ── Excel Download ────────────────────────────────────────────────────────
  const handleDownloadExcel = () => {
    if (filteredStudents.length === 0) { message.warning("No data to export."); return; }
    const rows = filteredStudents.map((s, i) => ({
      "S.No": i + 1,
      "Admission Number": s.admissionNumber || "",
      "School": s.School?.name || "",
      "Academic Year": s.academicYear || "",
      "Date Of Join": s.dateofjoin || "",
      "EMIS Number": s.emisNum || "",
      "Aadhar Number": s.aadharNumber || "",
      "Name": s.name || "",
      "Gender": s.gender || "",
      "Grade": s.Grade?.grade || "",
      "Section": s.Section?.sectionName || "",
      "Group": resolveGroupSubjects(s.group_subjects, ""),
      "Date of Birth": s.dob || "",
      "Age": s.age || "",
      "Previous Medium": s.previousmedium || "",
      "Preferred Medium": s.preferredmedium || "",
      "Nationality": s.nationality || "",
      "State": s.state || "",
      "Birth District": s.birthdistrict || "",
      "Religion": s.religion || "",
      "Community": s.community || "",
      "Caste": s.caste || "",
      "Mother Tongue": s.motherTongue || "",
      "Is the student from scheduled caste / tribe community?": s.scheduledcasteOrtribecommunity || "",
      "Is the student from backward caste?": s.backwardcaste || "",
      "Is the student a convert from tribe to other religion?": s.tribeTootherreligion || "",
      "Living With": s.living || "",
      "Current Living Address": s.currentlivingaddress || "",
      "Identification Marks": s.identificationmarks || "",
      "Blood Group": s.bloodGroup || "",
      "Father Name": s.fatherName || "",
      "Mother Name": s.motherName || "",
      "Father Occupation": s.fatherOccupation || "",
      "Mother Occupation": s.motherOccupation || "",
      "Father Annual Income": s.fatherIncome || "",
      "Mother Annual Income": s.motherIncome || "",
      "Address": s.address || "",
      "Pincode": s.pincode || "",
      "Parent's Email ID": s.parentEmail || "",
      "Mobile Number": s.mobileNumber || "",
      "Guardian Name": s.guardianName || "",
      "Guardian Occupation": s.guardianOccupation || "",
      "Guardian Address": s.guardianAddress || "",
      "Guardian Phone Number": s.guardianNumber || "",
      "Academic History": (() => {
        let h = s.academicHistory;
        if (!h) return "";
        if (typeof h === "string") {
          try { h = JSON.parse(h); } catch { return ""; }
          if (typeof h === "string") { try { h = JSON.parse(h); } catch { return ""; } }
        }
        if (!Array.isArray(h) || h.length === 0) return "";
        return h.map((r, i) => `${i + 1}. ${r.schoolName || ""} | Std: ${r.standard || ""} | Year: ${r.duration || ""}`).join("; ");
      })(),
      "Exam Year": s.examYear || "",
      "Registration Number": s.registrationNumber || "",
      "Tamil": s.tamil || "",
      "English": s.english || "",
      "Maths": s.maths || "",
      "Science": s.science || "",
      "Social": s.social || "",
      "Total": s.total || "",
      "Percentage": s.percentage || "",
      "Termination Reason": s.terminationreason || "",
      "Photocopy of TC": s.photocopyofTC || "",
      "Bank Name": s.bankName || "",
      "Branch Name": s.branchName || "",
      "Account Number": s.accountNumber || "",
      "IFSC Code": s.ifsccode || "",
      "Status": s.status || "",
      "Is Promoted": s.isPromoted ? "Yes" : "No",
      "Is Demoted": s.isDemoted ? "Yes" : "No",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Auto column widths
    const colWidths = Object.keys(rows[0] || {}).map(key => ({
      wch: Math.max(key.length, ...rows.map(r => String(r[key] || "").length), 10)
    }));
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HSC Students");
    const fileName = `HSC_Students${selectedYear ? `_${selectedYear}` : ""}_${dayjs().format("YYYY-MM-DD")}.xlsx`;
    XLSX.writeFile(wb, fileName);
    message.success(`Exported ${filteredStudents.length} records to Excel`);
  };

  // ── Promote navigation ────────────────────────────────────────────────────
  const handlePromoteNavigate = () => {
    if (selectedRowKeys.length === 0) {
      navigate("/StudentPromotionHSC", { state: { source: "hsc", mode: "promote" } });
      return;
    }
    const sel = students.filter(s => selectedRowKeys.includes(s.id));
    if ([...new Set(sel.map(s => s.school_id))].length > 1) { message.error("Selected students belong to different schools."); return; }
    if ([...new Set(sel.map(s => s.grade_id))].length > 1) { message.error("Selected students belong to different classes."); return; }
    if ([...new Set(sel.map(s => s.section_id))].length > 1) { message.error("Selected students belong to different sections."); return; }
    navigate("/StudentPromotionHSC", { state: { source: "hsc", mode: "promote", selectedStudents: sel } });
  };

  // ── Demote navigation ─────────────────────────────────────────────────────
  const handleDemoteNavigate = () => {
    if (selectedRowKeys.length === 0) {
      navigate("/StudentPromotionHSC", { state: { source: "hsc", mode: "demote" } });
      return;
    }
    const sel = students.filter(s => selectedRowKeys.includes(s.id));
    if ([...new Set(sel.map(s => s.school_id))].length > 1) { message.error("Selected students belong to different schools."); return; }
    if ([...new Set(sel.map(s => s.grade_id))].length > 1) { message.error("Selected students belong to different classes."); return; }
    if ([...new Set(sel.map(s => s.section_id))].length > 1) { message.error("Selected students belong to different sections."); return; }
    navigate("/StudentPromotionHSC", { state: { source: "hsc", mode: "demote", selectedStudents: sel } });
  };

  // ── Settings dropdown ─────────────────────────────────────────────────────
  const cornerDropdownItems = [
    {
      key: "issuetc",
      label: (
        <span style={{ color: COLOR.tcColor, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
          <FileTextOutlined />
          {feeDueCheckLoading ? "Checking fees…" : "Issue TC"}
          {!feeDueCheckLoading && selectedRowKeys.length > 0 && (
            <span style={{ marginLeft: 4, background: COLOR.tcColor, color: "#fff", borderRadius: 10, padding: "0 7px", fontSize: 11, fontWeight: 700 }}>
              {selectedRowKeys.length}
            </span>
          )}
        </span>
      ),
      onClick: () => !feeDueCheckLoading && openTcModal(selectedRowKeys),
      disabled: feeDueCheckLoading,
    },
    {
      key: "promote",
      label: (
        <span style={{ color: COLOR.promoColor, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
          <SwapOutlined /> Promote Students
          {selectedRowKeys.length > 0 && (
            <span style={{ marginLeft: 4, background: COLOR.promoColor, color: "#fff", borderRadius: 10, padding: "0 7px", fontSize: 11, fontWeight: 700 }}>
              {selectedRowKeys.length}
            </span>
          )}
        </span>
      ),
      onClick: handlePromoteNavigate,
    },
    {
      key: "demote",
      label: (
        <span style={{ color: COLOR.demoteColor, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
          <ArrowDownOutlined /> Demote Students
          {selectedRowKeys.length > 0 && (
            <span style={{ marginLeft: 4, background: COLOR.demoteColor, color: "#fff", borderRadius: 10, padding: "0 7px", fontSize: 11, fontWeight: 700 }}>
              {selectedRowKeys.length}
            </span>
          )}
        </span>
      ),
      onClick: handleDemoteNavigate,
    },
  ];

  // ── Grade / Section options derived from data ─────────────────────────────
  const gradeOptions = React.useMemo(() => {
    const map = new Map();
    students.forEach(s => {
      const id = s.Grade?.id || s.grade_id;
      const name = s.Grade?.grade;
      if (id && name && name !== "N/A") map.set(id, name);
    });
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [students]);

  const sectionOptions = React.useMemo(() => {
    const map = new Map();
    students
      .filter(s => !filterGrade || String(s.Grade?.id || s.grade_id) === String(filterGrade))
      .forEach(s => {
        const id = s.Section?.id || s.section_id;
        const name = s.Section?.sectionName;
        if (id && name && name !== "N/A") map.set(id, name);
      });
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [students, filterGrade]);

  const filteredStudents = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter(s => {
      const gradeMatch = !filterGrade || String(s.Grade?.id || s.grade_id) === String(filterGrade);
      const sectionMatch = !filterSection || String(s.Section?.id || s.section_id) === String(filterSection);
      const searchMatch = !q ||
        (s.name || "").toLowerCase().includes(q) ||
        (s.admissionNumber || "").toLowerCase().includes(q);
      return gradeMatch && sectionMatch && searchMatch;
    });
  }, [students, filterGrade, filterSection, searchQuery]);

  // ── Pagination helpers ────────────────────────────────────────────────────
  const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE);
  const pagedStudents = filteredStudents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const getPaginationPages = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════
  return (
    <Layout>
      <div className="app-page" style={{ fontFamily: FF }}>

        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLOR.text, margin: 0, letterSpacing: "-0.3px", fontFamily: FF }}>
            Student List for HSC
          </h1>
          <div style={{ width: 40, height: 3, background: COLOR.blueLt, borderRadius: 2, marginTop: 6 }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {(selectedSchool !== "all" || selectedYear) && (
              <div style={{ fontSize: "13px", color: COLOR.filterText, background: COLOR.filterBg, padding: "6px 14px", borderRadius: 6, fontWeight: 500 }}>
                Showing: {selectedSchool !== "all" ? selectedSchoolName : "All Schools"}{selectedYear ? ` | ${selectedYear}` : ""}
              </div>
            )}
            {isAdminRole && (
              <button
                onClick={() => navigate("/create-studenthsc")}
                onMouseEnter={e => { e.currentTarget.style.background = COLOR.blue; e.currentTarget.style.boxShadow = "0 4px 14px rgba(30,64,175,0.35)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = COLOR.blueLt; e.currentTarget.style.boxShadow = "0 2px 8px rgba(59,130,246,0.28)"; }}
                style={{ all: "unset", display: "inline-flex", alignItems: "center", gap: 7, background: COLOR.blueLt, color: "#fff", padding: "9px 20px", borderRadius: 8, fontSize: FS, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(59,130,246,0.28)", transition: "all 0.18s", fontFamily: FF }}
              >
                Allocate HSC Student
              </button>
            )}
            {/* ── Grade Filter ── */}
            <Select
              allowClear
              placeholder="All Grades"
              value={filterGrade || undefined}
              onChange={val => setFilterGrade(val || "")}
              style={{ width: 140, fontFamily: FF, fontSize: FS }}
              size="middle"
            >
              {gradeOptions.map(g => <Option key={g.id} value={g.id}>{g.name}</Option>)}
            </Select>
            {/* ── Section Filter ── */}
            <Select
              allowClear
              placeholder="All Sections"
              value={filterSection || undefined}
              onChange={val => setFilterSection(val || "")}
              style={{ width: 150, fontFamily: FF, fontSize: FS }}
              size="middle"
              disabled={!filterGrade}
            >
              {sectionOptions.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
            </Select>
            {/* ── Search ── */}
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search by name or admission no..."
              style={{
                height: 36, padding: "0 12px", borderRadius: 8,
                border: "1px solid #e2e8f0", fontSize: "13.5px",
                fontFamily: "'Segoe UI', system-ui, sans-serif",
                outline: "none", width: 240, color: "#1e293b",
                background: "#fff", boxSizing: "border-box",
                transition: "border-color 0.18s",
              }}
              onFocus={e => { e.target.style.borderColor = "#3b82f6"; }}
              onBlur={e => { e.target.style.borderColor = "#e2e8f0"; }}
            />
            {/* ── Excel Download Icon ── */}
            <Tooltip title="Download Excel">
              <button
                onClick={handleDownloadExcel}
                onMouseEnter={e => { e.currentTarget.style.background = "#15803d"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(21,128,61,0.35)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#16a34a"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(21,128,61,0.22)"; }}
                style={{ all: "unset", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, background: "#16a34a", color: "#fff", borderRadius: 8, cursor: "pointer", boxShadow: "0 2px 8px rgba(21,128,61,0.22)", transition: "all 0.18s", flexShrink: 0 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8.5 19l-1.75-3.08L5 19H3.27l2.6-4.08L3.27 11H5l1.75 3.08L8.5 11h1.73l-2.6 3.92L10.23 19H8.5zm5.5 0h-1.5l-1.5-2.4-1.5 2.4H8l2.25-3.5L8 12h1.5l1.5 2.4 1.5-2.4H14l-2.25 3.5L14 19z" />
                </svg>
              </button>
            </Tooltip>
            {selectedRowKeys.length > 0 && (
              <span style={{ fontSize: 13, fontWeight: 600, color: COLOR.tcColor, background: COLOR.tcBg, border: `1px solid ${COLOR.tcColor}`, borderRadius: 6, padding: "4px 12px" }}>
                {selectedRowKeys.length} student{selectedRowKeys.length > 1 ? "s" : ""} selected
              </span>
            )}
          </div>
          {isAdminRole && (
            <Dropdown menu={{ items: cornerDropdownItems }} trigger={["click"]} placement="bottomRight">
              <Tooltip title={selectedRowKeys.length === 0 ? "Select students or click to perform actions" : `Actions for ${selectedRowKeys.length} selected student(s)`}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: selectedRowKeys.length > 0 ? COLOR.tcColor : "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: selectedRowKeys.length > 0 ? `2px solid ${COLOR.tcColor}` : "2px solid #d9d9d9", transition: "all 0.2s", boxShadow: selectedRowKeys.length > 0 ? "0 2px 8px rgba(114,46,209,0.35)" : "none" }}>
                  <SettingOutlined style={{ fontSize: 18, color: selectedRowKeys.length > 0 ? "#fff" : "#888" }} />
                </div>
              </Tooltip>
            </Dropdown>
          )}
        </div>

        {/* ── Table ───────────────────────────────────────────────────── */}
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", overflow: "hidden", border: `1px solid ${COLOR.border}` }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FF, fontSize: FS }}>
              <thead>
                <tr style={{ background: COLOR.headBg }}>
                  {isAdminRole && (
                    <th style={{ padding: "13px 16px", width: 44, textAlign: "center" }}>
                      <Checkbox checked={allSelected} indeterminate={someSelected} onChange={toggleSelectAll} />
                    </th>
                  )}
                  {["S.No", "Admission No", "School", "Academic Year", "Date Of Join", "Name", "Gender", "Grade", "Section", "Action"].map((h, i) => (
                    <th key={h} style={{ padding: "13px 16px", fontWeight: 600, fontSize: "13px", color: COLOR.headText, textAlign: i === 9 ? "center" : "left", whiteSpace: "nowrap", letterSpacing: "0.2px" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedStudents.length > 0 ? (
                  pagedStudents.map((student, index) => {
                    const globalIndex = (currentPage - 1) * PAGE_SIZE + index;
                    const isSelected = selectedRowKeys.includes(student.id);
                    const baseBg = student.isLocked ? COLOR.rowLocked : index % 2 === 0 ? COLOR.rowOdd : COLOR.rowEven;
                    const activeBg = isSelected ? COLOR.rowSel : baseBg;
                    return (
                      <tr
                        key={student.id}
                        onMouseEnter={e => e.currentTarget.style.background = student.isLocked ? COLOR.rowLocked : COLOR.rowHover}
                        onMouseLeave={e => e.currentTarget.style.background = activeBg}
                        style={{ background: activeBg, transition: "background 0.12s", borderBottom: `1px solid ${COLOR.border}`, opacity: student.isLocked ? 0.82 : 1 }}
                      >
                        {isAdminRole && (
                          <td style={{ padding: "10px 16px", textAlign: "center" }}>
                            <Checkbox
                              checked={isSelected}
                              disabled={student.isLocked}
                              onChange={() => !student.isLocked && toggleSelectRow(student.id)}
                            />
                          </td>
                        )}

                        <td style={{ padding: "11px 16px", color: COLOR.text, fontWeight: 600 }}>{globalIndex + 1}</td>
                        <td style={{ padding: "11px 16px", color: COLOR.blueLt, fontWeight: 600, whiteSpace: "nowrap" }}>{student.admissionNumber}</td>
                        <td style={{ padding: "11px 16px", color: COLOR.textMid, whiteSpace: "nowrap" }}>
                          {isSuperAdmin ? (student.School?.name || selectedSchoolName || "N/A") : (user.school?.name || "N/A")}
                        </td>
                        <td style={{ padding: "11px 16px", color: COLOR.textMid, whiteSpace: "nowrap" }}>{student.academicYear}</td>
                        <td style={{ padding: "11px 16px", color: COLOR.textMid, whiteSpace: "nowrap" }}>{student.dateofjoin}</td>

                        <td style={{ padding: "11px 16px", color: COLOR.text, fontWeight: 500 }}>
                          {student.name}
                          {student.isPromoted && (
                            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, background: "#e6f4ff", color: "#1677ff", border: "1px solid #91caff", borderRadius: 4, padding: "1px 6px", verticalAlign: "middle" }}>
                              Promoted
                            </span>
                          )}
                          {student.isDemoted && (
                            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, background: "#fffbeb", color: COLOR.demoteColor, border: `1px solid #fcd34d`, borderRadius: 4, padding: "1px 6px", verticalAlign: "middle" }}>
                              Demoted
                            </span>
                          )}
                        </td>

                        <td style={{ padding: "11px 16px", color: COLOR.textMid }}>{student.gender}</td>
                        <td style={{ padding: "11px 16px", color: COLOR.textMid }}>{student.Grade?.grade || "N/A"}</td>
                        <td style={{ padding: "11px 16px", color: COLOR.textMid }}>{student.Section?.sectionName || "N/A"}</td>

                        <td style={{ padding: "8px 16px", textAlign: "center" }}>
                          <div style={{ display: "flex", justifyContent: "center", gap: 2 }}>
                            <IconBtn
                              icon={<EyeOutlined />}
                              title="View Student"
                              color={COLOR.blue} bg={COLOR.viewBg}
                              onClick={() => handleView(student.id)}
                            />
                            {isAdminRole && (
                              <IconBtn
                                icon={<EditOutlined />}
                                title={
                                  student.isLocked
                                    ? student.isPromoted
                                      ? "Cannot edit — student was promoted from this year."
                                      : student.isDemoted
                                        ? "Cannot edit — student was demoted from this year."
                                        : "Record is locked for this academic year."
                                    : "Edit Application"
                                }
                                color={COLOR.editColor} bg={COLOR.editBg}
                                disabled={student.isLocked}
                                onClick={() => handleEdit(student)}
                              />
                            )}
                            <IconBtn
                              icon={<PrinterOutlined />}
                              title="Print Student"
                              color={COLOR.printColor} bg={COLOR.printBg}
                              onClick={() => handlePrint(student.id)}
                            />
                            {isAdminRole && (
                              <IconBtn
                                icon={<FileTextOutlined />}
                                title={
                                  student.isLocked
                                    ? "Cannot issue TC — student record is locked for this year"
                                    : feeDueCheckLoading
                                      ? "Checking fee dues…"
                                      : "Issue TC"
                                }
                                color={COLOR.tcColor} bg={COLOR.tcBg}
                                disabled={student.isLocked || feeDueCheckLoading}
                                onClick={() => {
                                  if (student.isLocked) { message.warning("TC cannot be issued for past year data."); return; }
                                  openTcModal([student.id]);
                                }}
                              />
                            )}
                            <div style={{ width: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {isSuperAdmin && (
                                <IconBtn
                                  icon={<DeleteOutlined />}
                                  title={
                                    student.isLocked
                                      ? student.isPromoted
                                        ? "Cannot delete — student was promoted from this year."
                                        : student.isDemoted
                                          ? "Cannot delete — student was demoted from this year."
                                          : "Record is locked for this academic year."
                                      : "Remove Application"
                                  }
                                  color={COLOR.danger} bg={COLOR.dangerBg}
                                  disabled={student.isLocked}
                                  onClick={() => handleDelete(student.id, student.name, student)}
                                />
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={isAdminRole ? 11 : 10} style={{ textAlign: "center", padding: "40px 16px", color: COLOR.textSoft, fontSize: FS }}>
                      No Students found{filterGrade || filterSection ? " for the selected grade/section" : selectedYear ? ` for ${selectedYear}` : ""}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ───────────────────────────────────────────── */}
          {students.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderTop: `1px solid ${COLOR.border}`, background: "#fafbfc", flexWrap: "wrap", gap: 10 }}>
              <span style={{ fontSize: 13, color: COLOR.textSoft, fontFamily: FF }}>
                Showing <strong>{filteredStudents.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}</strong>–<strong>{Math.min(currentPage * PAGE_SIZE, filteredStudents.length)}</strong> of <strong>{filteredStudents.length}</strong> students
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {/* Prev */}
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{ all: "unset", width: 32, height: 32, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", cursor: currentPage === 1 ? "not-allowed" : "pointer", background: currentPage === 1 ? "#f0f0f0" : "#fff", border: `1px solid ${COLOR.border}`, color: currentPage === 1 ? "#c0c0c0" : COLOR.textMid, fontSize: 13 }}
                >
                  <LeftOutlined />
                </button>

                {/* Page numbers */}
                {getPaginationPages().map((page, i) =>
                  page === "..." ? (
                    <span key={`dots-${i}`} style={{ padding: "0 4px", color: COLOR.textSoft, fontSize: 13 }}>…</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      style={{ all: "unset", width: 32, height: 32, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 13, fontWeight: currentPage === page ? 700 : 400, background: currentPage === page ? "#1a2236" : "#fff", color: currentPage === page ? "#fff" : COLOR.textMid, border: `1px solid ${currentPage === page ? "#1a2236" : COLOR.border}`, transition: "all 0.15s" }}
                    >
                      {page}
                    </button>
                  )
                )}

                {/* Next */}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{ all: "unset", width: 32, height: 32, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", cursor: currentPage === totalPages ? "not-allowed" : "pointer", background: currentPage === totalPages ? "#f0f0f0" : "#fff", border: `1px solid ${COLOR.border}`, color: currentPage === totalPages ? "#c0c0c0" : COLOR.textMid, fontSize: 13 }}
                >
                  <RightOutlined />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ════ BULK WITHDRAW MODAL ════════════════════════════════════════ */}
        <Modal
          title={<span style={{ color: "#d4380d", fontFamily: FF }}><ExclamationCircleOutlined style={{ marginRight: 8 }} />Withdraw {selectedRowKeys.length} Student{selectedRowKeys.length > 1 ? "s" : ""} to TC</span>}
          open={isBulkWithdrawModal}
          onCancel={() => { setIsBulkWithdrawModal(false); setWithdrawReason(""); }}
          footer={[
            <Button key="cancel" onClick={() => { setIsBulkWithdrawModal(false); setWithdrawReason(""); }}>Cancel</Button>,
            <Button key="confirm" type="primary" danger loading={withdrawing} onClick={confirmBulkWithdraw}>Yes, Withdraw All</Button>,
          ]}
          width={480}
        >
          <div style={{ background: "#fff7f0", border: "1px solid #ffbb96", borderRadius: 8, padding: "10px 14px", marginBottom: 14, maxHeight: 160, overflowY: "auto" }}>
            <p style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Selected Students ({selectedRowKeys.length}):</p>
            {students.filter(s => selectedRowKeys.includes(s.id)).map(s => (
              <div key={s.id} style={{ fontSize: 13, marginBottom: 3 }}>
                • <strong>{s.name}</strong> — {s.Grade?.grade || "N/A"} / {s.Section?.sectionName || "N/A"} ({s.admissionNumber})
              </div>
            ))}
          </div>
          <p style={{ marginBottom: 6, fontWeight: 500 }}>Reason for Withdrawal</p>
          <Input.TextArea rows={3} placeholder="Enter reason for withdrawal..." value={withdrawReason} onChange={e => setWithdrawReason(e.target.value)} />
          <p style={{ marginTop: 10, color: "#8f6104", fontSize: 13 }}>⚠️ These students will be transferred to the TC Students list.</p>
        </Modal>

        {/* ════ FEE DUES BLOCKING MODAL ════════════════════════════════════
            Shown when one or more selected students still have unpaid /
            partial fee demands. TC is NOT allowed until dues are cleared.
        ═════════════════════════════════════════════════════════════════ */}
        <Modal
          title={
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ExclamationCircleOutlined style={{ color: "#e21216", fontSize: 20 }} />
              <span style={{ fontFamily: FF, fontWeight: 700, fontSize: 16, color: "#1e293b" }}>
                TC Blocked — Pending Fee Dues
              </span>
            </div>
          }
          open={isFeeDueModalVisible}
          onCancel={() => { setIsFeeDueModalVisible(false); setStudentsWithDues([]); }}
          footer={[
            <Button
              key="close"
              onClick={() => { setIsFeeDueModalVisible(false); setStudentsWithDues([]); }}
              style={{ fontFamily: FF }}
            >
              Close
            </Button>,
          ]}
          width={640}
        >
          {/* Alert banner */}
          <div style={{
            background: "rgba(226,18,22,0.07)",
            border: "1px solid rgba(226,18,22,0.25)",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 16,
            fontFamily: FF,
            fontSize: 13.5,
            color: "#7f1d1d",
            lineHeight: 1.6,
          }}>
            ⚠️ The following student(s) have <strong>pending fee dues</strong>.
            TC cannot be issued until all outstanding balances are cleared.
            Please visit the <strong>Fee Collection</strong> page and collect
            the pending amounts before proceeding.
          </div>

          {/* Table of students with dues */}
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
            {/* Table header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "2fr 1.6fr 1.2fr 2fr",
              background: "#1a2236",
              padding: "8px 14px",
              gap: 8,
            }}>
              {["Student Name", "Admission No", "Balance (₹)", "Pending Fee Types"].map((h) => (
                <span key={h} style={{ fontFamily: FF, fontSize: 12, fontWeight: 600, color: "#fff", letterSpacing: "0.2px" }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Table rows */}
            <div style={{ maxHeight: 280, overflowY: "auto" }}>
              {studentsWithDues.map((s, idx) => (
                <div
                  key={s.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1.6fr 1.2fr 2fr",
                    padding: "10px 14px",
                    gap: 8,
                    background: idx % 2 === 0 ? "#fff" : "#fef2f2",
                    borderBottom: "1px solid #e2e8f0",
                    alignItems: "center",
                  }}
                >
                  {/* Name */}
                  <span style={{ fontFamily: FF, fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                    {s.name || "—"}
                  </span>

                  {/* Admission No */}
                  <span style={{
                    fontFamily: FF, fontSize: 12.5, fontWeight: 600,
                    color: "#2563eb", background: "#eff6ff",
                    padding: "2px 8px", borderRadius: 5,
                    display: "inline-block", whiteSpace: "nowrap",
                  }}>
                    {s.admissionNumber || "—"}
                  </span>

                  {/* Balance amount */}
                  <span style={{
                    fontFamily: FF, fontSize: 13, fontWeight: 700,
                    color: "#dc2626", background: "rgba(220,38,38,0.08)",
                    padding: "2px 8px", borderRadius: 5,
                    display: "inline-block", whiteSpace: "nowrap",
                  }}>
                    ₹{s.balance_amount?.toLocaleString("en-IN", { minimumFractionDigits: 2 }) || "0.00"}
                  </span>

                  {/* Pending fee types */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {(s.pendingFeeTypes || []).length > 0
                      ? s.pendingFeeTypes.map((ft) => (
                        <span
                          key={ft}
                          style={{
                            fontFamily: FF, fontSize: 11, fontWeight: 600,
                            background: "rgba(234,88,12,0.09)", color: "#c2580a",
                            border: "1px solid rgba(194,88,10,0.25)",
                            padding: "1px 7px", borderRadius: 10,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {ft}
                        </span>
                      ))
                      : <span style={{ fontFamily: FF, fontSize: 12, color: "#94a3b8" }}>—</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer note */}
          <p style={{ marginTop: 14, fontFamily: FF, fontSize: 12.5, color: "#64748b", lineHeight: 1.6 }}>
            Total student(s) with dues: <strong style={{ color: "#dc2626" }}>{studentsWithDues.length}</strong>.
            Once all dues are paid, you can re-select the student(s) and issue the TC.
          </p>
        </Modal>

        {/* ════ ISSUE TC MODAL ═════════════════════════════════════════════ */}
        <Modal
          title={<span style={{ color: COLOR.tcColor, fontFamily: FF }}><FileTextOutlined style={{ marginRight: 8 }} />Issue Transfer Certificate — {pendingTcIds.length} Student{pendingTcIds.length !== 1 ? "s" : ""}</span>}
          open={isTcModal}
          onCancel={() => { setIsTcModal(false); setPendingTcIds([]); }}
          footer={
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Button key="cancel" onClick={() => { setIsTcModal(false); setPendingTcIds([]); }}>Cancel</Button>
              <Button key="confirm" type="primary" loading={tcLoading} onClick={handleBulkTcSubmit} style={{ background: COLOR.tcColor, borderColor: COLOR.tcColor }}>Issue TC</Button>
            </div>
          }
          width={560}
        >
          <div style={{ background: "#f9f0ff", border: "1px solid #d3adf7", borderRadius: 8, padding: "10px 14px", marginBottom: 16, maxHeight: 150, overflowY: "auto" }}>
            <p style={{ fontWeight: 600, marginBottom: 6, fontSize: 13, color: "#531dab" }}>Issuing TC for ({pendingTcIds.length}) student{pendingTcIds.length !== 1 ? "s" : ""}:</p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, fontFamily: FF }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["S.No", "Name", "Admission No", "Grade", "Section"].map(h => (
                    <th key={h} style={{ padding: "5px 10px", fontWeight: 600, color: COLOR.textMid, borderBottom: `1px solid ${COLOR.border}`, textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.filter(s => pendingTcIds.includes(s.id)).map((s, i) => (
                  <tr key={s.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc", borderBottom: `1px solid ${COLOR.border}` }}>
                    <td style={{ padding: "5px 10px", color: COLOR.textSoft }}>{i + 1}</td>
                    <td style={{ padding: "5px 10px", color: COLOR.text, fontWeight: 500 }}>{s.name || "—"}</td>
                    <td style={{ padding: "5px 10px", color: COLOR.blueLt, fontWeight: 600, whiteSpace: "nowrap" }}>{s.admissionNumber || "—"}</td>
                    <td style={{ padding: "5px 10px", color: COLOR.textMid }}>{s.Grade?.grade || "N/A"}</td>
                    <td style={{ padding: "5px 10px", color: COLOR.textMid }}>{s.Section?.sectionName || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Form form={tcForm} layout="vertical" requiredMark={false}>
            <Form.Item
              name="tcDate"
              label={<span>TC Date <span style={{ color: "#ff4d4f" }}>*</span></span>}
              rules={[{ required: true, message: "TC date is required" }]}
            >
              <input
                type="date"
                value={tcDateValue}
                max={dayjs().format("YYYY-MM-DD")}
                onChange={e => {
                  setTcDateValue(e.target.value);
                  tcForm.setFieldsValue({ tcDate: e.target.value });
                  tcForm.validateFields(["tcDate"]);
                }}
                style={{
                  width: "100%", padding: "6px 11px",
                  border: "1px solid #d9d9d9", borderRadius: 6,
                  fontSize: 14, fontFamily: FF, outline: "none",
                  color: COLOR.text, background: "#fff",
                }}
              />
            </Form.Item>
            <Form.Item
              name="reason"
              label={<span>Reason for Transfer <span style={{ color: "#ff4d4f" }}>*</span></span>}
              rules={[{ required: true, message: "Please select a reason" }]}
            >
              <Select placeholder="Select reason">
                <Option value="Parent Transfer">Parent Transfer</Option>
                <Option value="Change of School">Change of School</Option>
                <Option value="Higher Studies">Higher Studies (Passed Out)</Option>
                <Option value="Migration">Migration</Option>
                <Option value="Personal Reasons">Personal Reasons</Option>
                <Option value="Other">Other</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="conductCertificate"
              label={<span>Conduct Certificate <span style={{ color: "#ff4d4f" }}>*</span></span>}
              rules={[{ required: true, message: "Conduct certificate is required" }]}
            >
              <Select placeholder="Select conduct">
                <Option value="Good">Good</Option>
                <Option value="Excellent">Excellent</Option>
                <Option value="Satisfactory">Satisfactory</Option>
              </Select>
            </Form.Item>
            <Form.Item name="remarks" label="Remarks (optional)">
              <Input.TextArea rows={3} placeholder="Any additional remarks..." />
            </Form.Item>
          </Form>
          <p style={{ marginTop: 4, color: "#8f6104", fontSize: 13 }}>⚠️ Once TC is issued, the student(s) will be removed from this list.</p>
        </Modal>

        {/* ════ VIEW MODAL ═════════════════════════════════════════════════ */}
        {isViewModal && selectedStudent && (
          <Modal
            title={<span style={{ fontFamily: FF, fontWeight: 700, fontSize: 16, color: COLOR.text }}>HSC Student Details</span>}
            open={isViewModal}
            onCancel={() => setIsViewModal(false)}
            footer={
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "4px 0" }}>
                <button onClick={() => { const w = window.open("", "_blank", "width=900,height=700"); w.document.write(preparePrintContent(selectedStudent)); w.document.close(); w.onload = () => { w.focus(); w.print(); }; }}
                  style={{ all: "unset", display: "inline-flex", alignItems: "center", gap: 7, background: "#15803d", color: "#fff", padding: "8px 20px", borderRadius: 8, fontSize: "13.5px", fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(21,128,61,0.28)", transition: "all 0.18s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#166534"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#15803d"; }}>
                  <PrinterOutlined style={{ fontSize: 15 }} /> Print Profile
                </button>
                <button onClick={() => setIsViewModal(false)}
                  style={{ all: "unset", display: "inline-flex", alignItems: "center", padding: "8px 20px", borderRadius: 8, fontSize: "13.5px", fontWeight: 600, cursor: "pointer", background: "#f1f5f9", color: COLOR.textMid, border: `1px solid ${COLOR.border}`, transition: "all 0.18s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#e2e8f0"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#f1f5f9"; }}>
                  Close
                </button>
              </div>
            }
            width={1200}
          >
            <Descriptions bordered column={2} size="small"
              labelStyle={{ fontWeight: 600, color: COLOR.textMid, fontFamily: FF, fontSize: "12.5px", background: "#f8fafc" }}
              contentStyle={{ fontFamily: FF, fontSize: "12.5px", color: COLOR.text }}
            >
              <Descriptions.Item label="Admission Number">{selectedStudent.admissionNumber}</Descriptions.Item>
              <Descriptions.Item label="School Name">{selectedStudent.School?.name || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Date Of Join">{selectedStudent.dateofjoin}</Descriptions.Item>
              <Descriptions.Item label="Academic Year">{selectedStudent.academicYear}</Descriptions.Item>
              <Descriptions.Item label="EMIS Number">{selectedStudent.emisNum}</Descriptions.Item>
              <Descriptions.Item label="Aadhar Number">{selectedStudent.aadharNumber}</Descriptions.Item>
              <Descriptions.Item label="Name">{selectedStudent.name}</Descriptions.Item>
              <Descriptions.Item label="Gender">{selectedStudent.gender}</Descriptions.Item>
              <Descriptions.Item label="Grade">{selectedStudent.Grade?.grade || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Section">{selectedStudent.Section?.sectionName || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Group" span={2}>
                {resolveGroupSubjects(selectedStudent.group_subjects, subjectMap)}
              </Descriptions.Item>
              <Descriptions.Item label="Date of Birth">{selectedStudent.dob}</Descriptions.Item>
              <Descriptions.Item label="Age">{formatAge(selectedStudent.age)}</Descriptions.Item>
              <Descriptions.Item label="Previous Medium">{selectedStudent.previousmedium}</Descriptions.Item>
              <Descriptions.Item label="Preferred Medium">{selectedStudent.preferredmedium}</Descriptions.Item>
              <Descriptions.Item label="Nationality">{selectedStudent.nationality}</Descriptions.Item>
              <Descriptions.Item label="State">{selectedStudent.state}</Descriptions.Item>
              <Descriptions.Item label="Mother Tongue">{selectedStudent.motherTongue}</Descriptions.Item>
              <Descriptions.Item label="Birth District">{selectedStudent.birthdistrict}</Descriptions.Item>
              <Descriptions.Item label="Religion">{selectedStudent.religion}</Descriptions.Item>
              <Descriptions.Item label="Community">{selectedStudent.community}</Descriptions.Item>
              <Descriptions.Item label="Caste">{selectedStudent.caste}</Descriptions.Item>
              <Descriptions.Item label="Is the student from scheduled caste / tribe community?">{selectedStudent.scheduledcasteOrtribecommunity}</Descriptions.Item>
              <Descriptions.Item label="Is the student from backward caste?">{selectedStudent.backwardcaste}</Descriptions.Item>
              <Descriptions.Item label="Is the student a convert from tribe to other religion?">{selectedStudent.tribeTootherreligion}</Descriptions.Item>
              <Descriptions.Item label="Living with whom">{selectedStudent.living}</Descriptions.Item>
              <Descriptions.Item label="Current Living Address" span={2}>{selectedStudent.currentlivingaddress}</Descriptions.Item>
              <Descriptions.Item label="Identification Marks">{selectedStudent.identificationmarks}</Descriptions.Item>
              <Descriptions.Item label="Blood Group">{selectedStudent.bloodGroup}</Descriptions.Item>
              <Descriptions.Item label="Father Name">{selectedStudent.fatherName}</Descriptions.Item>
              <Descriptions.Item label="Mother's Name">{selectedStudent.motherName}</Descriptions.Item>
              <Descriptions.Item label="Father's Occupation">{selectedStudent.fatherOccupation}</Descriptions.Item>
              <Descriptions.Item label="Mother's Occupation">{selectedStudent.motherOccupation}</Descriptions.Item>
              <Descriptions.Item label="Father's Annual Income">{selectedStudent.fatherIncome}</Descriptions.Item>
              <Descriptions.Item label="Mother's Annual Income">{selectedStudent.motherIncome}</Descriptions.Item>
              <Descriptions.Item label="Address" span={2}>{selectedStudent.address}</Descriptions.Item>
              <Descriptions.Item label="Pincode">{selectedStudent.pincode}</Descriptions.Item>
              <Descriptions.Item label="Parent's Email ID">{selectedStudent.parentEmail}</Descriptions.Item>
              <Descriptions.Item label="Mobile Number">{selectedStudent.mobileNumber}</Descriptions.Item>
              <Descriptions.Item label="Guardian's Name">{selectedStudent.guardianName}</Descriptions.Item>
              <Descriptions.Item label="Guardian's Occupation">{selectedStudent.guardianOccupation}</Descriptions.Item>
              <Descriptions.Item label="Guardian Address">{selectedStudent.guardianAddress}</Descriptions.Item>
              <Descriptions.Item label="Guardian Phone Number">{selectedStudent.guardianNumber}</Descriptions.Item>
              <Descriptions.Item label="Student's Academic History" span={2}>
                {(() => {
                  let history = selectedStudent?.academicHistory;
                  if (!history) return "No Academic History";
                  if (typeof history === "string") { try { history = JSON.parse(history); } catch { return "Invalid Academic History Data"; } }
                  if (typeof history === "string") { try { history = JSON.parse(history); } catch { return "Invalid Academic History Data"; } }
                  if (!Array.isArray(history)) { history = [history]; }
                  return history.map((item, i) => (
                    <div key={i} style={{ marginBottom: 10 }}>
                      <b>School Name:</b> {item?.schoolName || "N/A"} <br />
                      <b>Standard:</b> {item?.standard || "N/A"} <br />
                      <b>Duration:</b> {item?.duration || "N/A"}
                      <hr />
                    </div>
                  ));
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="Exam Year">{selectedStudent.examYear}</Descriptions.Item>
              <Descriptions.Item label="Registration Number">{selectedStudent.registrationNumber}</Descriptions.Item>
              <Descriptions.Item label="Tamil">{selectedStudent.tamil}</Descriptions.Item>
              <Descriptions.Item label="English">{selectedStudent.english}</Descriptions.Item>
              <Descriptions.Item label="Maths">{selectedStudent.maths}</Descriptions.Item>
              <Descriptions.Item label="Science">{selectedStudent.science}</Descriptions.Item>
              <Descriptions.Item label="Social">{selectedStudent.social}</Descriptions.Item>
              <Descriptions.Item label="Total">{selectedStudent.total}</Descriptions.Item>
              <Descriptions.Item label="Percentage">{selectedStudent.percentage}</Descriptions.Item>
              <Descriptions.Item label="Termination Reason">{selectedStudent.terminationreason}</Descriptions.Item>
              <Descriptions.Item label="Photocopy of TC">{selectedStudent.photocopyofTC}</Descriptions.Item>
              <Descriptions.Item label="Bank Name">{selectedStudent.bankName}</Descriptions.Item>
              <Descriptions.Item label="Branch Name">{selectedStudent.branchName}</Descriptions.Item>
              <Descriptions.Item label="Bank Account Number">{selectedStudent.accountNumber}</Descriptions.Item>
              <Descriptions.Item label="IFSC Code">{selectedStudent.ifsccode}</Descriptions.Item>
            </Descriptions>
          </Modal>
        )}

      </div>
    </Layout>
  );
};

export default StudentHSCList;