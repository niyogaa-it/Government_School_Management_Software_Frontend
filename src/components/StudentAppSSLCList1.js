import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
  message, Modal, Descriptions, Form, Input, Radio,
  Select, Button, Checkbox, Dropdown, Tooltip, DatePicker
} from "antd";
import Layout from "./Layout";
import {
  EyeOutlined, EditOutlined, DeleteOutlined, PrinterOutlined,
  ExclamationCircleOutlined, SettingOutlined, FileTextOutlined,
  SwapOutlined, DownloadOutlined, LeftOutlined, RightOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useFilter } from "./FilterContext";
import * as XLSX from "xlsx";

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
  rowSel:     "#eef2ff",
  rowLocked:  "#f9f9f9",
  headBg:     "#1a2236",
  headText:   "#ffffff",
  danger:     "#e21216",
  dangerBg:   "rgba(226,18,22,0.08)",
  viewBg:     "rgba(30,64,175,0.08)",
  editColor:  "#0891b2",
  editBg:     "rgba(8,145,178,0.08)",
  printColor: "#c2580a",
  printBg:    "rgba(194,88,10,0.08)",
  tcColor:    "#722ed1",
  tcBg:       "rgba(114,46,209,0.08)",
  filterBg:   "#eff6ff",
  filterText: "#1a3c6e",
  promoColor: "#1a7a4a",
  promoBg:    "rgba(26,122,74,0.08)",
  demoteColor:"#b45309",
  demoteBg:   "rgba(180,83,9,0.08)",
};
const FF = "'Segoe UI', system-ui, sans-serif";
const FS = "13.5px";
const PAGE_SIZE = 25;

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
        color:      disabled ? "#c0c0c0" : hov ? color : COLOR.textMid,
        background: disabled ? "transparent" : hov ? bg : "transparent",
        opacity:    disabled ? 0.5 : 1,
      }}
    >
      {icon}
    </button>
  );
};

const { Option } = Select;

// ════════════════════════════════════════════════════════════════════════════
const StudentSSLCList = () => {
  const [studentsslcs, setStudentsslcs]               = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [grades, setGrades]                           = useState([]);
  const [selectedGradeName, setSelectedGradeName]     = useState("");
  const [editingStudentPageData, setEditingStudentPageData] = useState({ age: { years: 0, months: 0, days: 0 } });
  const [isModalVisible, setIsModalVisible]           = useState(false);
  const navigate                                      = useNavigate();
  const location                                      = useLocation();
  const user                                          = JSON.parse(localStorage.getItem("user"));
  const role                                          = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const schoolId                                      = user?.school?.id;
  const [editForm]                                    = Form.useForm();
  const [editFormData, setEditFormData]               = useState({});
  const [isEditModalVisible, setIsEditModalVisible]   = useState(false);
  const [currentStep, setCurrentStep]                 = useState(0);
  const [sections, setSections]                       = useState([]);
  const isAdminRole  = role === "superadmin" || role === "schooladmin";
  const isSuperAdmin = role === "superadmin";

  // ── Global filter from Dashboard ─────────────────────────────────────────
  const { selectedSchool, selectedYear, selectedSchoolName } = useFilter();

  // ── TC / Withdraw state ──────────────────────────────────────────────────
  const [selectedRowKeys, setSelectedRowKeys]                       = useState([]);
  const [isBulkWithdrawModalVisible, setIsBulkWithdrawModalVisible] = useState(false);
  const [bulkWithdrawReason, setBulkWithdrawReason]                 = useState("");
  const [withdrawing, setWithdrawing]                               = useState(false);

  // ── Issue TC state ───────────────────────────────────────────────────────
  const [tcForm]                                = Form.useForm();
  const [isTcModalVisible, setIsTcModalVisible] = useState(false);
  const [tcLoading, setTcLoading]               = useState(false);
  const [pendingTcIds, setPendingTcIds]         = useState([]);

  // ── Grade / Section filters ──────────────────────────────────────────────
  const [filterGrade,   setFilterGrade]   = useState("");
  const [filterSection, setFilterSection] = useState("");

  // ── Pagination ───────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);

  // ── Re-fetch on filter/route change ─────────────────────────────────────
  useEffect(() => { fetchStudentsslcs(); }, [selectedSchool, selectedYear, location.pathname]);

  // Reset to page 1 when data changes
  useEffect(() => { setCurrentPage(1); }, [studentsslcs]);

  // Reset section filter when grade changes
  useEffect(() => { setFilterSection(""); }, [filterGrade]);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [filterGrade, filterSection]);

  // ── Fetch grades for edit modal ──────────────────────────────────────────
  const fetchGrades = async (id, year) => {
    if (!id || !year) return;
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/grade/getGradesBySchoolAndYear/${id}/${year}`);
      setGrades(res.data.grades || []);
    } catch (e) { console.error("Error fetching grades:", e); }
  };
  useEffect(() => {
    if (isSuperAdmin && selectedApplication?.school_id) fetchGrades(selectedApplication.school_id, selectedYear);
    else if (schoolId) fetchGrades(schoolId, selectedYear);
  }, [selectedApplication]);
  useEffect(() => { if (schoolId && selectedYear) fetchGrades(schoolId, selectedYear); }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const calculateAge = (dob) => {
    if (!dob) return { years: 0, months: 0, days: 0 };
    const b = new Date(dob), t = new Date();
    let years = t.getFullYear() - b.getFullYear();
    let months = t.getMonth() - b.getMonth();
    let days = t.getDate() - b.getDate();
    if (days < 0)   { months--; days  += new Date(t.getFullYear(), t.getMonth(), 0).getDate(); }
    if (months < 0) { years--;  months += 12; }
    return { years, months, days };
  };

  const formatAge = (age) => {
    if (!age || typeof age !== "object") return "N/A";
    const { years = 0, months = 0, days = 0 } = age;
    return `${years} year${years !== 1 ? "s" : ""}, ${months} month${months !== 1 ? "s" : ""}, ${days} day${days !== 1 ? "s" : ""}`;
  };

  const fetchSectionsBySchoolAndGrade = async (sId, gId) => {
    if (!sId || !gId) return;
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/section/getSectionsBySchoolAndGrade/${sId}/${gId}`);
      setSections(res.data.sections || []);
    } catch (e) { console.error("Error fetching sections:", e); setSections([]); }
  };

  const validateDOB           = (_, v) => { if (!v) return Promise.reject("DOB is required!"); if (new Date(v) >= new Date()) return Promise.reject("DOB cannot be in the future!"); return Promise.resolve(); };
  const validateAccountNumber = (_, v) => { if (!v || !/^\d{9,17}$/.test(v)) return Promise.reject("Account number must be 9 to 17 digits!"); return Promise.resolve(); };
  const validateIFSCCode      = (_, v) => { if (!v || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(v)) return Promise.reject("Enter a valid IFSC Code (e.g., SBIN0001234)!"); return Promise.resolve(); };

  // ── Fetch list ───────────────────────────────────────────────────────────
  const fetchStudentsslcs = async () => {
    try {
      let response;
      const effectiveSchoolId = isSuperAdmin ? (selectedSchool === "all" ? null : selectedSchool) : schoolId;

      if (isSuperAdmin && selectedSchool === "all" && selectedYear) {
        response = await axios.get(`${process.env.REACT_APP_API_URL}/studentsslc/getAllStudentsslcByYear/${selectedYear}`);
      } else if (effectiveSchoolId && selectedYear) {
        response = await axios.get(`${process.env.REACT_APP_API_URL}/studentsslc/getStudentsslcsBySchoolAndYear/${effectiveSchoolId}/${selectedYear}`);
      } else if (effectiveSchoolId) {
        response = await axios.get(`${process.env.REACT_APP_API_URL}/studentsslc/getStudentsslcsBySchool/${effectiveSchoolId}`);
      } else {
        response = await axios.get(`${process.env.REACT_APP_API_URL}/studentsslc/getAllStudentsslc`);
      }

      const raw = response.data.studentsslcs || response.data.students || [];
      const data = raw
        .filter((s) => s.status !== "Removed" && s.status !== "Withdrawn" && s.status !== "TC Issued")
        .map((s) => ({
          ...s,
          Grade:      s.Grade   || { grade: "N/A" },
          Section:    s.Section || { sectionName: "N/A" },
          isPromoted: s.isPromoted ?? false,
          isDemoted:  s.isDemoted  ?? false,
          isLocked:   s.isLocked   ?? false,
        }));

      setStudentsslcs(data.sort((a, b) => b.id - a.id));
    } catch (e) {
      console.error("Error fetching students:", e);
      message.error(e.response?.data?.details || "Failed to fetch students");
    }
  };

  // ── View ─────────────────────────────────────────────────────────────────
  const handleView = async (id) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/studentsslc/getStudentsslcById/${id}`);
      setSelectedApplication(res.data.application);
      setIsModalVisible(true);
    } catch { message.error("Failed to fetch application details"); }
  };

  // ── Update ───────────────────────────────────────────────────────────────
  const handleUpdate = async () => {
    try {
      const values = await editForm.validateFields();
      await axios.put(`${process.env.REACT_APP_API_URL}/studentsslc/updateStudentsslc/${editFormData.id}`, values);
      message.success("Student updated successfully");
      setIsEditModalVisible(false);
      fetchStudentsslcs();
    } catch { message.error("Update failed"); }
  };

  const handleNextStep = async () => {
    try {
      const stepFields = [["academicYear", "emisNum", "aadharNumber"], ["name", "gender", "dob"]];
      await editForm.validateFields(stepFields[currentStep]);
      setCurrentStep(currentStep + 1);
    } catch {}
  };

  // ── Print ────────────────────────────────────────────────────────────────
  const handlePrintClick = async (id) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/studentsslc/getStudentsslcById/${id}`);
      const application = res.data.application;
      if (!application) { message.error("No application data found for printing."); return; }
      const printWindow = window.open("", "_blank");
      printWindow.document.title = "Application Details";
      printWindow.document.write(preparePrintContent(application));
      printWindow.document.close();
      printWindow.print();
    } catch { message.error("Failed to fetch student data for print"); }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove application of ${name}?`)) return;
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/studentsslc/updateStatus/${id}`);
      message.success("Application removed successfully");
      fetchStudentsslcs();
    } catch { message.error("Failed to remove application"); }
  };

  // ── Checkbox helpers ─────────────────────────────────────────────────────
  const selectableStudents = studentsslcs.filter((s) => !s.isLocked);
  const toggleSelectAll    = (e) => setSelectedRowKeys(e.target.checked ? selectableStudents.map((s) => s.id) : []);
  const toggleSelectRow    = (id) => setSelectedRowKeys((prev) => prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]);
  const allSelected        = selectableStudents.length > 0 && selectedRowKeys.length === selectableStudents.length;
  const someSelected       = selectedRowKeys.length > 0 && selectedRowKeys.length < selectableStudents.length;

  // ── Bulk withdraw ────────────────────────────────────────────────────────
  const confirmBulkWithdraw = async () => {
    setWithdrawing(true);
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/studentsslc/withdrawStudents`, {
        ids: selectedRowKeys, reason: bulkWithdrawReason, school_id: schoolId,
      });
      message.success(`${selectedRowKeys.length} student(s) moved to TC successfully.`);
      setSelectedRowKeys([]); setBulkWithdrawReason(""); setIsBulkWithdrawModalVisible(false);
      fetchStudentsslcs();
    } catch { message.error("Failed to withdraw students. Please try again."); }
    finally { setWithdrawing(false); }
  };

  // ── TC modal ─────────────────────────────────────────────────────────────
  const openTcModal = (ids) => {
    if (!ids || ids.length === 0) { message.warning("Please select at least one student first."); return; }
    setPendingTcIds(ids); tcForm.resetFields();
    tcForm.setFieldsValue({ tcDate: dayjs(), conductCertificate: "Good" });
    setIsTcModalVisible(true);
  };

  const handleBulkTcSubmit = async () => {
    try {
      const values = await tcForm.validateFields();
      setTcLoading(true);
      await axios.post(`${process.env.REACT_APP_API_URL}/tc/bulkIssueTc`, {
        studentIds: pendingTcIds,
        tcDate: values.tcDate ? values.tcDate.format("YYYY-MM-DD") : null,
        reason: values.reason, conductCertificate: values.conductCertificate, remarks: values.remarks,
      });
      message.success(`TC issued for ${pendingTcIds.length} student(s) successfully`);
      setIsTcModalVisible(false); setSelectedRowKeys([]); setPendingTcIds([]);
      fetchStudentsslcs();
    } catch (err) { message.error(err.response?.data?.error || "Failed to issue TC"); }
    finally { setTcLoading(false); }
  };

  // ── Promote ──────────────────────────────────────────────────────────────
  const handlePromoteNavigate = () => {
    if (selectedRowKeys.length === 0) { navigate("/studentpromotion"); return; }
    const sel = studentsslcs.filter((s) => selectedRowKeys.includes(s.id));
    if ([...new Set(sel.map((s) => s.school_id))].length > 1)  { message.error("Selected students belong to different schools. Please select students from the same school only."); return; }
    if ([...new Set(sel.map((s) => s.grade_id))].length > 1)   { message.error("Selected students belong to different classes. Please select students from the same class only."); return; }
    if ([...new Set(sel.map((s) => s.section_id))].length > 1) { message.error("Selected students belong to different sections. Please select students from the same section only."); return; }
    navigate("/studentpromotion", { state: { selectedStudents: sel, mode: "promote" } });
  };

  // ── Demote ───────────────────────────────────────────────────────────────
  const handleDemoteNavigate = () => {
    if (selectedRowKeys.length === 0) { navigate("/studentpromotion", { state: { mode: "demote" } }); return; }
    const sel = studentsslcs.filter((s) => selectedRowKeys.includes(s.id));
    if ([...new Set(sel.map((s) => s.school_id))].length > 1)  { message.error("Selected students belong to different schools. Please select students from the same school only."); return; }
    if ([...new Set(sel.map((s) => s.grade_id))].length > 1)   { message.error("Selected students belong to different classes. Please select students from the same class only."); return; }
    if ([...new Set(sel.map((s) => s.section_id))].length > 1) { message.error("Selected students belong to different sections. Please select students from the same section only."); return; }
    navigate("/studentpromotion", { state: { selectedStudents: sel, mode: "demote" } });
  };

  // ── Settings dropdown items ──────────────────────────────────────────────
  const cornerDropdownItems = [
    {
      key: "issuetc",
      label: (
        <span style={{ color: COLOR.tcColor, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
          <FileTextOutlined /> Issue TC
          {selectedRowKeys.length > 0 && (
            <span style={{ marginLeft: 4, background: COLOR.tcColor, color: "#fff", borderRadius: 10, padding: "0 7px", fontSize: 11, fontWeight: 700 }}>
              {selectedRowKeys.length}
            </span>
          )}
        </span>
      ),
      onClick: () => openTcModal(selectedRowKeys),
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
          <SwapOutlined rotate={180} /> Demote Students
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

  // ── Print template ───────────────────────────────────────────────────────
  const preparePrintContent = (a) => `
    <style>table{width:100%;border-collapse:collapse}th,td{border:1px solid black;padding:8px;text-align:left}</style>
    <h2>General Information</h2>
    <table border="1" cellpadding="5" cellspacing="0">
      <tr><td><strong>Admission Number:</strong></td><td>${a.admissionNumber}</td></tr>
      <tr><td><strong>School Name:</strong></td><td>${a.School?.name}</td></tr>
      <tr><td><strong>Academic Year:</strong></td><td>${a.academicYear}</td></tr>
      <tr><td><strong>Date of Join:</strong></td><td>${a.dateofjoin}</td></tr>
      <tr><td><strong>Application Number:</strong></td><td>${a.applicationNumber || "N/A"}</td></tr>
      <tr><td><strong>EMIS Number:</strong></td><td>${a.emisNum}</td></tr>
      <tr><td><strong>Aadhaar Number:</strong></td><td>${a.aadharNumber}</td></tr>
    </table>
    <h2>Student Information</h2>
    <table border="1" cellpadding="5" cellspacing="0">
      <tr><td><strong>Name:</strong></td><td>${a.name}</td></tr>
      <tr><td><strong>Gender:</strong></td><td>${a.gender}</td></tr>
      <tr><td><strong>Grade:</strong></td><td>${a.Grade?.grade || "N/A"}</td></tr>
      <tr><td><strong>Section:</strong></td><td>${a.Section?.sectionName || "N/A"}</td></tr>
      <tr><td><strong>Date of Birth:</strong></td><td>${a.dob}</td></tr>
      <tr><td><strong>Age:</strong></td><td>${formatAge(a.age)}</td></tr>
      <tr><td><strong>Nationality:</strong></td><td>${a.nationality}</td></tr>
      <tr><td><strong>State:</strong></td><td>${a.state}</td></tr>
      <tr><td><strong>Mother Tongue:</strong></td><td>${a.motherTongue}</td></tr>
      <tr><td><strong>Religion:</strong></td><td>${a.religion}</td></tr>
      <tr><td><strong>Home Town:</strong></td><td>${a.hometown}</td></tr>
      <tr><td><strong>Community:</strong></td><td>${a.community}</td></tr>
      <tr><td><strong>Caste:</strong></td><td>${a.caste}</td></tr>
      <tr><td><strong>Is the student from scheduled tribe community?</strong></td><td>${a.tribecommunity}</td></tr>
      <tr><td><strong>Is the caste entitled to get ex-gratia salary?</strong></td><td>${a.exgratiasalary}</td></tr>
      <tr><td><strong>Is the student a convert from Hinduism to Christianity?</strong></td><td>${a.religionchanging}</td></tr>
      <tr><td><strong>Living with whom:</strong></td><td>${a.living}</td></tr>
      <tr><td><strong>Is the student for chicken pox? Is scar Available?</strong></td><td>${a.vaccinated}</td></tr>
      <tr><td><strong>Identification Marks:</strong></td><td>${a.identificationmarks}</td></tr>
      <tr><td><strong>Blood Group:</strong></td><td>${a.bloodGroup}</td></tr>
      <tr><td><strong>Is the student Physically challenged?</strong></td><td>${a.physical}</td></tr>
      <tr><td><strong>If Physically challenged, specify:</strong></td><td>${a.physicalDetails}</td></tr>
    </table>
    <h2>Parent Details</h2>
    <table border="1" cellpadding="5" cellspacing="0">
      <tr><td><strong>Father's Name:</strong></td><td>${a.fatherName}</td></tr>
      <tr><td><strong>Mother's Name:</strong></td><td>${a.motherName}</td></tr>
      <tr><td><strong>Father's Occupation:</strong></td><td>${a.fatherOccupation}</td></tr>
      <tr><td><strong>Mother's Occupation:</strong></td><td>${a.motherOccupation}</td></tr>
      <tr><td><strong>Father's Annual Income:</strong></td><td>${a.fatherIncome}</td></tr>
      <tr><td><strong>Mother's Annual Income:</strong></td><td>${a.motherIncome}</td></tr>
      <tr><td><strong>Address:</strong></td><td>${a.address}</td></tr>
      <tr><td><strong>Pincode:</strong></td><td>${a.pincode}</td></tr>
      <tr><td><strong>Telephone Number:</strong></td><td>${a.telephoneNumber}</td></tr>
      <tr><td><strong>Mobile Number:</strong></td><td>${a.mobileNumber}</td></tr>
      <tr><td><strong>Guardian's Name:</strong></td><td>${a.guardianName}</td></tr>
      <tr><td><strong>Guardian's Occupation:</strong></td><td>${a.guardianOccupation}</td></tr>
      <tr><td><strong>Guardian's Address:</strong></td><td>${a.guardianAddress}</td></tr>
      <tr><td><strong>Guardian Phone Number:</strong></td><td>${a.guardianNumber}</td></tr>
      <tr><td><strong>Is parent consent letter attached?</strong></td><td>${a.parentconsentform}</td></tr>
    </table>
    <h2>Academic Details</h2>
    <table border="1" cellpadding="5" cellspacing="0">
      <tr><td colspan="2"><strong>Student's Academic History</strong></td></tr>
      <tr><th>School Name</th><th>Standard</th><th>Duration</th></tr>
      ${(() => {
        let h = a?.academicHistory;
        if (!h || h === "") return `<tr><td colspan="3">No Academic History</td></tr>`;
        if (typeof h === "string") { try { h = JSON.parse(h); } catch { return `<tr><td colspan="3">Invalid Data</td></tr>`; } }
        if (!Array.isArray(h) || h.length === 0) return `<tr><td colspan="3">No Academic History</td></tr>`;
        return h.map(item => `<tr><td>${item?.schoolName||""}</td><td>${item?.standard||""}</td><td>${item?.duration||""}</td></tr>`).join("");
      })()}
      <tr><td><strong>Has He/She passed in the last class studied?</strong></td><td>${a.passorfail}</td></tr>
      <tr><td><strong>Is T.C/E.S.L.C/Record sheet submitted?</strong></td><td>${a.tceslc}</td></tr>
      <tr><td><strong>First Language Preference</strong></td><td>${a.firstLanguage}</td></tr>
    </table>
    <h2>Bank Details</h2>
    <table border="1" cellpadding="5" cellspacing="0">
      <tr><td><strong>Bank Name:</strong></td><td>${a.bankName}</td></tr>
      <tr><td><strong>Branch Name:</strong></td><td>${a.branchName}</td></tr>
      <tr><td><strong>Account Number:</strong></td><td>${a.accountNumber}</td></tr>
      <tr><td><strong>IFSC Code:</strong></td><td>${a.ifsccode}</td></tr>
    </table>
  `;

  // ── Lock tooltip helper ──────────────────────────────────────────────────
  const getLockTooltip = (student) => {
    if (!student.isLocked) return "";
    if (student.isPromoted) return "Cannot edit — student already promoted";
    if (student.isDemoted)  return "Cannot edit — student already demoted";
    return "Cannot edit — student record is locked";
  };

  const getLockEditTitle = (student) => {
    if (!student.isLocked) return "Edit Application";
    if (student.isPromoted) return "Cannot edit — student already promoted";
    if (student.isDemoted)  return "Cannot edit — student already demoted";
    return "Cannot edit — student record is locked";
  };

  const getLockEditWarning = (student) => {
    if (student.isPromoted) return "This student has already been promoted. Past year data cannot be edited.";
    if (student.isDemoted)  return "This student has already been demoted. Past year data cannot be edited.";
    return "This student record is locked and cannot be edited.";
  };

  // ── Excel Download ────────────────────────────────────────────────────────
  const handleDownloadExcel = () => {
    if (filteredStudents.length === 0) { message.warning("No data to export."); return; }
    const rows = filteredStudents.map((s, i) => ({
      "S.No":                                                   i + 1,
      "Admission Number":                                       s.admissionNumber || "",
      "School":                                                 s.School?.name || "",
      "Academic Year":                                          s.academicYear || "",
      "Date Of Join":                                           s.dateofjoin || "",
      "EMIS Number":                                            s.emisNum || "",
      "Aadhar Number":                                          s.aadharNumber || "",
      "Name":                                                   s.name || "",
      "Gender":                                                 s.gender || "",
      "Grade":                                                  s.Grade?.grade || "",
      "Section":                                                s.Section?.sectionName || "",
      "Date of Birth":                                          s.dob || "",
      "Nationality":                                            s.nationality || "",
      "State":                                                  s.state || "",
      "Mother Tongue":                                          s.motherTongue || "",
      "Religion":                                               s.religion || "",
      "Home Town":                                              s.hometown || "",
      "Community":                                              s.community || "",
      "Caste":                                                  s.caste || "",
      "Scheduled Tribe Community":                              s.tribecommunity || "",
      "Ex-Gratia Salary":                                       s.exgratiasalary || "",
      "Convert from Hinduism to Christianity":                  s.religionchanging || "",
      "Living With":                                            s.living || "",
      "Chicken Pox Vaccinated":                                 s.vaccinated || "",
      "Identification Marks":                                   s.identificationmarks || "",
      "Blood Group":                                            s.bloodGroup || "",
      "Physically Challenged":                                  s.physical || "",
      "Physical Challenge Details":                             s.physicalDetails || "",
      "Father Name":                                            s.fatherName || "",
      "Mother Name":                                            s.motherName || "",
      "Father Occupation":                                      s.fatherOccupation || "",
      "Mother Occupation":                                      s.motherOccupation || "",
      "Father Annual Income":                                   s.fatherIncome || "",
      "Mother Annual Income":                                   s.motherIncome || "",
      "Address":                                                s.address || "",
      "Pincode":                                                s.pincode || "",
      "Telephone Number":                                       s.telephoneNumber || "",
      "Mobile Number":                                          s.mobileNumber || "",
      "Guardian Name":                                          s.guardianName || "",
      "Guardian Occupation":                                    s.guardianOccupation || "",
      "Guardian Address":                                       s.guardianAddress || "",
      "Guardian Phone":                                         s.guardianNumber || "",
      "Parent Consent Form":                                    s.parentconsentform || "",
      "Pass or Fail":                                           s.passorfail || "",
      "TC/ESLC/Record Sheet Submitted":                         s.tceslc || "",
      "First Language Preference":                              s.firstLanguage || "",
      "Bank Name":                                              s.bankName || "",
      "Branch Name":                                            s.branchName || "",
      "Account Number":                                         s.accountNumber || "",
      "IFSC Code":                                              s.ifsccode || "",
      "Status":                                                 s.status || "",
      "Is Promoted":                                            s.isPromoted ? "Yes" : "No",
      "Is Demoted":                                             s.isDemoted  ? "Yes" : "No",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Auto column widths
    const colWidths = Object.keys(rows[0] || {}).map(key => ({
      wch: Math.max(key.length, ...rows.map(r => String(r[key] || "").length), 10)
    }));
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SSLC Students");
    const fileName = `SSLC_Students${selectedYear ? `_${selectedYear}` : ""}_${dayjs().format("YYYY-MM-DD")}.xlsx`;
    XLSX.writeFile(wb, fileName);
    message.success(`Exported ${filteredStudents.length} records to Excel`);
  };

  // ── Pagination helpers ────────────────────────────────────────────────────
  // Derived unique grades & sections for filter dropdowns
  const gradeOptions = React.useMemo(() => {
    const map = new Map();
    studentsslcs.forEach(s => {
      const id = s.Grade?.id || s.grade_id;
      const name = s.Grade?.grade;
      if (id && name && name !== "N/A") map.set(id, name);
    });
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [studentsslcs]);

  const sectionOptions = React.useMemo(() => {
    const map = new Map();
    studentsslcs
      .filter(s => !filterGrade || String(s.Grade?.id || s.grade_id) === String(filterGrade))
      .forEach(s => {
        const id = s.Section?.id || s.section_id;
        const name = s.Section?.sectionName;
        if (id && name && name !== "N/A") map.set(id, name);
      });
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [studentsslcs, filterGrade]);

  const filteredStudents = React.useMemo(() => {
    return studentsslcs.filter(s => {
      const gradeMatch   = !filterGrade   || String(s.Grade?.id   || s.grade_id)   === String(filterGrade);
      const sectionMatch = !filterSection || String(s.Section?.id || s.section_id) === String(filterSection);
      return gradeMatch && sectionMatch;
    });
  }, [studentsslcs, filterGrade, filterSection]);

  const totalPages    = Math.ceil(filteredStudents.length / PAGE_SIZE);
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

        {/* ── Page title ───────────────────────────────────────────────── */}
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLOR.text, margin: 0, letterSpacing: "-0.3px", fontFamily: FF }}>
            Student List for SSLC
          </h1>
          <div style={{ width: 40, height: 3, background: COLOR.blueLt, borderRadius: 2, marginTop: 6 }} />
        </div>

        {/* ── Top bar ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>

            {/* Filter badge */}
            {(selectedSchool !== "all" || selectedYear) && (
              <div style={{ fontSize: "13px", color: COLOR.filterText, background: COLOR.filterBg, padding: "6px 14px", borderRadius: 6, fontWeight: 500, fontFamily: FF }}>
                Showing: {selectedSchool !== "all" ? selectedSchoolName : "All Schools"}{selectedYear ? ` | ${selectedYear}` : ""}
              </div>
            )}

            {/* Create button */}
            {isAdminRole && (
              <button
                onClick={() => navigate("/create-studentsslc")}
                onMouseEnter={e => { e.currentTarget.style.background = COLOR.blue; e.currentTarget.style.boxShadow = "0 4px 14px rgba(30,64,175,0.35)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = COLOR.blueLt; e.currentTarget.style.boxShadow = "0 2px 8px rgba(59,130,246,0.28)"; }}
                style={{ all: "unset", display: "inline-flex", alignItems: "center", gap: 7, background: COLOR.blueLt, color: "#fff", padding: "9px 20px", borderRadius: 8, fontSize: FS, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(59,130,246,0.28)", transition: "all 0.18s", fontFamily: FF }}
              >
                Create SSLC Application
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

            {/* ── Excel Download Icon ── */}
            <Tooltip title="Download Excel">
              <button
                onClick={handleDownloadExcel}
                onMouseEnter={e => { e.currentTarget.style.background = "#15803d"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(21,128,61,0.35)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#16a34a"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(21,128,61,0.22)"; }}
                style={{ all: "unset", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, background: "#16a34a", color: "#fff", borderRadius: 8, cursor: "pointer", boxShadow: "0 2px 8px rgba(21,128,61,0.22)", transition: "all 0.18s", flexShrink: 0 }}
              >
                {/* Excel SVG icon */}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8.5 19l-1.75-3.08L5 19H3.27l2.6-4.08L3.27 11H5l1.75 3.08L8.5 11h1.73l-2.6 3.92L10.23 19H8.5zm5.5 0h-1.5l-1.5-2.4-1.5 2.4H8l2.25-3.5L8 12h1.5l1.5 2.4 1.5-2.4H14l-2.25 3.5L14 19z"/>
                </svg>
              </button>
            </Tooltip>

            {/* Selection count */}
            {selectedRowKeys.length > 0 && (
              <span style={{ fontSize: 13, fontWeight: 600, color: COLOR.tcColor, background: COLOR.tcBg, border: `1px solid ${COLOR.tcColor}`, borderRadius: 6, padding: "4px 12px" }}>
                {selectedRowKeys.length} student{selectedRowKeys.length > 1 ? "s" : ""} selected
              </span>
            )}
          </div>

          {/* Bulk actions dropdown */}
          {isAdminRole && (
            <Dropdown menu={{ items: cornerDropdownItems }} trigger={["click"]} placement="bottomRight">
              <Tooltip title={selectedRowKeys.length === 0 ? "Select students to perform bulk actions" : `Actions for ${selectedRowKeys.length} selected student(s)`}>
                <div style={{
                  width: 38, height: 38, borderRadius: "50%",
                  background: selectedRowKeys.length > 0 ? COLOR.tcColor : "#f0f0f0",
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                  border: selectedRowKeys.length > 0 ? `2px solid ${COLOR.tcColor}` : "2px solid #d9d9d9",
                  transition: "all 0.2s",
                  boxShadow: selectedRowKeys.length > 0 ? "0 2px 8px rgba(114,46,209,0.35)" : "none",
                }}>
                  <SettingOutlined style={{ fontSize: 18, color: selectedRowKeys.length > 0 ? "#fff" : "#888" }} />
                </div>
              </Tooltip>
            </Dropdown>
          )}
        </div>

        {/* ── Table card ──────────────────────────────────────────────── */}
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
                    const baseBg     = student.isLocked ? COLOR.rowLocked : index % 2 === 0 ? COLOR.rowOdd : COLOR.rowEven;
                    const activeBg   = isSelected ? COLOR.rowSel : baseBg;
                    return (
                      <tr
                        key={student.id}
                        onMouseEnter={e => e.currentTarget.style.background = student.isLocked ? COLOR.rowLocked : COLOR.rowHover}
                        onMouseLeave={e => e.currentTarget.style.background = activeBg}
                        style={{ background: activeBg, transition: "background 0.12s", borderBottom: `1px solid ${COLOR.border}`, opacity: student.isLocked ? 0.82 : 1 }}
                      >
                        {/* Checkbox cell */}
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

                        {/* Name + Promoted / Demoted badge */}
                        <td style={{ padding: "11px 16px", color: COLOR.text, fontWeight: 500 }}>
                          {student.name}
                          {student.isPromoted && (
                            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, background: "#e6f4ff", color: "#1677ff", border: "1px solid #91caff", borderRadius: 4, padding: "1px 6px", verticalAlign: "middle" }}>
                              Promoted
                            </span>
                          )}
                          {student.isDemoted && (
                            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, background: "#fff7e6", color: "#b45309", border: "1px solid #fcd34d", borderRadius: 4, padding: "1px 6px", verticalAlign: "middle" }}>
                              Demoted
                            </span>
                          )}
                        </td>

                        <td style={{ padding: "11px 16px", color: COLOR.textMid }}>{student.gender}</td>
                        <td style={{ padding: "11px 16px", color: COLOR.textMid }}>{student.Grade?.grade || "N/A"}</td>
                        <td style={{ padding: "11px 16px", color: COLOR.textMid }}>{student.Section?.sectionName || "N/A"}</td>

                        {/* Action icons */}
                        <td style={{ padding: "8px 16px", textAlign: "center" }}>
                          <div style={{ display: "flex", justifyContent: "center", gap: 2 }}>

                            {/* View — always */}
                            <IconBtn icon={<EyeOutlined />} title="View Student" color={COLOR.blue} bg={COLOR.viewBg} onClick={() => handleView(student.id)} />

                            {/* Edit — blocked if locked */}
                            {isAdminRole && (
                              <IconBtn
                                icon={<EditOutlined />}
                                title={getLockEditTitle(student)}
                                color={COLOR.editColor} bg={COLOR.editBg}
                                disabled={student.isLocked}
                                onClick={() => {
                                  if (student.isLocked) { message.warning(getLockEditWarning(student)); return; }
                                  navigate(`/edit-studentsslc/${student.id}`);
                                }}
                              />
                            )}

                            {/* Print — always */}
                            <IconBtn icon={<PrinterOutlined />} title="Print Student" color={COLOR.printColor} bg={COLOR.printBg} onClick={() => handlePrintClick(student.id)} />

                            {/* Issue TC — blocked if locked */}
                            {isAdminRole && (
                              <IconBtn
                                icon={<FileTextOutlined />}
                                title={student.isLocked ? "Cannot issue TC — student record is locked" : "Issue TC"}
                                color={COLOR.tcColor} bg={COLOR.tcBg}
                                disabled={student.isLocked}
                                onClick={() => {
                                  if (student.isLocked) { message.warning("TC cannot be issued for past year data."); return; }
                                  openTcModal([student.id]);
                                }}
                              />
                            )}

                            {/* Delete — superadmin only */}
                            <div style={{ width: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {isSuperAdmin && (
                                <IconBtn icon={<DeleteOutlined />} title="Remove Application" color={COLOR.danger} bg={COLOR.dangerBg} onClick={() => handleDelete(student.id, student.name)} />
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
          {studentsslcs.length > 0 && (
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

        {/* ════════════════════════════════════════════════════════════════
            BULK WITHDRAW MODAL
        ════════════════════════════════════════════════════════════════ */}
        <Modal
          title={<span style={{ color: "#d4380d", fontFamily: FF }}><ExclamationCircleOutlined style={{ marginRight: 8 }} />Withdraw {selectedRowKeys.length} Student{selectedRowKeys.length > 1 ? "s" : ""} to TC</span>}
          open={isBulkWithdrawModalVisible}
          onCancel={() => { setIsBulkWithdrawModalVisible(false); setBulkWithdrawReason(""); }}
          footer={[
            <Button key="cancel" onClick={() => { setIsBulkWithdrawModalVisible(false); setBulkWithdrawReason(""); }}>Cancel</Button>,
            <Button key="confirm" type="primary" danger loading={withdrawing} onClick={confirmBulkWithdraw}>Confirm Withdraw</Button>,
          ]}
        >
          <p>Are you sure you want to withdraw <strong>{selectedRowKeys.length}</strong> student(s) to TC?</p>
          <Select
            style={{ width: "100%", marginTop: 10 }}
            placeholder="Select reason (optional)"
            value={bulkWithdrawReason || undefined}
            onChange={(val) => setBulkWithdrawReason(val)}
            allowClear
          >
            <Option value="TC">TC</Option>
            <Option value="Left School">Left School</Option>
            <Option value="Passed Out">Passed Out</Option>
            <Option value="Other">Other</Option>
          </Select>
        </Modal>

        {/* ════════════════════════════════════════════════════════════════
            TC ISSUE MODAL
        ════════════════════════════════════════════════════════════════ */}
        <Modal
          title={<span style={{ fontFamily: FF, fontWeight: 700, color: COLOR.tcColor }}>Issue TC for {pendingTcIds.length} Student{pendingTcIds.length > 1 ? "s" : ""}</span>}
          open={isTcModalVisible}
          onCancel={() => { setIsTcModalVisible(false); setPendingTcIds([]); }}
          footer={[
            <Button key="cancel" onClick={() => { setIsTcModalVisible(false); setPendingTcIds([]); }}>Cancel</Button>,
            <Button key="submit" type="primary" loading={tcLoading} onClick={handleBulkTcSubmit} style={{ background: COLOR.tcColor, borderColor: COLOR.tcColor }}>Issue TC</Button>,
          ]}
          width={560}
        >
          <Form form={tcForm} layout="vertical" style={{ fontFamily: FF }}>
            <Form.Item name="tcDate" label="TC Date" rules={[{ required: true, message: "TC Date is required" }]}>
              <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
            </Form.Item>
            <Form.Item name="reason" label="Reason for Leaving" rules={[{ required: true, message: "Reason is required" }]}>
              <Select placeholder="Select reason">
                <Option value="Higher Studies">Higher Studies (Passed Out)</Option>
                <Option value="Migration">Migration</Option>
                <Option value="Personal Reasons">Personal Reasons</Option>
                <Option value="Other">Other</Option>
              </Select>
            </Form.Item>
            <Form.Item name="conductCertificate" label="Conduct Certificate" rules={[{ required: true, message: "Required" }]}>
              <Select>
                <Option value="Good">Good</Option>
                <Option value="Excellent">Excellent</Option>
                <Option value="Satisfactory">Satisfactory</Option>
              </Select>
            </Form.Item>
            <Form.Item name="remarks" label="Remarks (optional)">
              <Input.TextArea rows={3} placeholder="Any additional remarks..." />
            </Form.Item>
          </Form>
          <p style={{ marginTop: 4, color: "#8f6104", fontSize: 13 }}>⚠️ Once TC is issued, the student(s) will be removed from this list and a sequential withdrawn number will be assigned per school.</p>
        </Modal>

        {/* ════════════════════════════════════════════════════════════════
            VIEW MODAL
        ════════════════════════════════════════════════════════════════ */}
        {isModalVisible && selectedApplication && (
          <Modal
            title={<span style={{ fontFamily: FF, fontWeight: 700, fontSize: 16, color: COLOR.text }}>Student Details</span>}
            open={isModalVisible}
            onCancel={() => setIsModalVisible(false)}
            footer={null}
            width={1200}
          >
            <Descriptions bordered column={2} size="small"
              labelStyle={{ fontWeight: 600, color: COLOR.textMid, fontFamily: FF, fontSize: "12.5px", background: "#f8fafc" }}
              contentStyle={{ fontFamily: FF, fontSize: "12.5px", color: COLOR.text }}
            >
              <Descriptions.Item label="Admission Number">{selectedApplication.admissionNumber}</Descriptions.Item>
              <Descriptions.Item label="School Name">{selectedApplication.School?.name || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Date Of Join">{selectedApplication.dateofjoin}</Descriptions.Item>
              <Descriptions.Item label="Academic Year">{selectedApplication.academicYear}</Descriptions.Item>
              <Descriptions.Item label="EMIS Number">{selectedApplication.emisNum}</Descriptions.Item>
              <Descriptions.Item label="Aadhar Number">{selectedApplication.aadharNumber}</Descriptions.Item>
              <Descriptions.Item label="Name">{selectedApplication.name}</Descriptions.Item>
              <Descriptions.Item label="Gender">{selectedApplication.gender}</Descriptions.Item>
              <Descriptions.Item label="Grade">{selectedApplication.Grade?.grade || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Section">{selectedApplication.Section?.sectionName || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Date of Birth">{selectedApplication.dob}</Descriptions.Item>
              <Descriptions.Item label="Age">{formatAge(selectedApplication.age)}</Descriptions.Item>
              <Descriptions.Item label="Nationality">{selectedApplication.nationality}</Descriptions.Item>
              <Descriptions.Item label="State">{selectedApplication.state}</Descriptions.Item>
              <Descriptions.Item label="Mother Tongue">{selectedApplication.motherTongue}</Descriptions.Item>
              <Descriptions.Item label="Religion">{selectedApplication.religion}</Descriptions.Item>
              <Descriptions.Item label="Home Town">{selectedApplication.hometown}</Descriptions.Item>
              <Descriptions.Item label="Community">{selectedApplication.community}</Descriptions.Item>
              <Descriptions.Item label="Caste">{selectedApplication.caste}</Descriptions.Item>
              <Descriptions.Item label="Is the student from scheduled tribe community?">{selectedApplication.tribecommunity}</Descriptions.Item>
              <Descriptions.Item label="Is the caste entitled to get ex-gratia salary?">{selectedApplication.exgratiasalary}</Descriptions.Item>
              <Descriptions.Item label="Is the student a convert from Hinduism to Christianity?">{selectedApplication.religionchanging}</Descriptions.Item>
              <Descriptions.Item label="Living with whom">{selectedApplication.living}</Descriptions.Item>
              <Descriptions.Item label="Is the student for chicken pox? Is scar Available?">{selectedApplication.vaccinated}</Descriptions.Item>
              <Descriptions.Item label="Identification Marks">{selectedApplication.identificationmarks}</Descriptions.Item>
              <Descriptions.Item label="Blood Group">{selectedApplication.bloodGroup}</Descriptions.Item>
              <Descriptions.Item label="Is the student Physically challenged?">{selectedApplication.physical}</Descriptions.Item>
              <Descriptions.Item label="If He/She Physically challenged Specify, Otherwise Enter Null">{selectedApplication.physicalDetails}</Descriptions.Item>
              <Descriptions.Item label="Father Name">{selectedApplication.fatherName}</Descriptions.Item>
              <Descriptions.Item label="Mother's Name">{selectedApplication.motherName}</Descriptions.Item>
              <Descriptions.Item label="Father's Occupation">{selectedApplication.fatherOccupation}</Descriptions.Item>
              <Descriptions.Item label="Mother's Occupation">{selectedApplication.motherOccupation}</Descriptions.Item>
              <Descriptions.Item label="Father's Annual Income">{selectedApplication.fatherIncome}</Descriptions.Item>
              <Descriptions.Item label="Mother's Annual Income">{selectedApplication.motherIncome}</Descriptions.Item>
              <Descriptions.Item label="Address">{selectedApplication.address}</Descriptions.Item>
              <Descriptions.Item label="Pincode">{selectedApplication.pincode}</Descriptions.Item>
              <Descriptions.Item label="Telephone Number">{selectedApplication.telephoneNumber}</Descriptions.Item>
              <Descriptions.Item label="Mobile Number">{selectedApplication.mobileNumber}</Descriptions.Item>
              <Descriptions.Item label="Guardian's Name">{selectedApplication.guardianName}</Descriptions.Item>
              <Descriptions.Item label="Guardian's Occupation">{selectedApplication.guardianOccupation}</Descriptions.Item>
              <Descriptions.Item label="Guardian Address">{selectedApplication.guardianAddress}</Descriptions.Item>
              <Descriptions.Item label="Guardian Phone Number">{selectedApplication.guardianNumber}</Descriptions.Item>
              <Descriptions.Item label="Is parent consent Hardcopy attached?">{selectedApplication.parentconsentform}</Descriptions.Item>
              <Descriptions.Item label="Student's Academic History" span={2}>
                {(() => {
                  let history = selectedApplication?.academicHistory;
                  if (!history) return "No Academic History";
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
              <Descriptions.Item label="Has He/She passed in the last class studied?">{selectedApplication.passorfail}</Descriptions.Item>
              <Descriptions.Item label="Is T.C/E.S.L.C/Record sheet submitted?">{selectedApplication.tceslc}</Descriptions.Item>
              <Descriptions.Item label="First Language Preference">{selectedApplication.firstLanguage}</Descriptions.Item>
              <Descriptions.Item label="Bank Name">{selectedApplication.bankName}</Descriptions.Item>
              <Descriptions.Item label="Branch Name">{selectedApplication.branchName}</Descriptions.Item>
              <Descriptions.Item label="Bank Account Number">{selectedApplication.accountNumber}</Descriptions.Item>
              <Descriptions.Item label="IFSC Code">{selectedApplication.ifsccode}</Descriptions.Item>
            </Descriptions>
          </Modal>
        )}

      </div>
    </Layout>
  );
};

export default StudentSSLCList;