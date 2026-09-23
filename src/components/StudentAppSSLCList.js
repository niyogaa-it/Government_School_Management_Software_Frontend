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
const StudentSSLCList = () => {
  const [studentsslcs, setStudentsslcs] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [grades, setGrades] = useState([]);
  const [selectedGradeName, setSelectedGradeName] = useState("");
  const [editingStudentPageData, setEditingStudentPageData] = useState({ age: { years: 0, months: 0, days: 0 } });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const schoolId = user?.school?.id;
  const [editForm] = Form.useForm();
  const [editFormData, setEditFormData] = useState({});
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [sections, setSections] = useState([]);
  const isAdminRole = role === "superadmin" || role === "schooladmin";
  const isSuperAdmin = role === "superadmin";

  // ── Global filter from Dashboard ─────────────────────────────────────────
  const { selectedSchool, selectedYear, selectedSchoolName } = useFilter();

  // ── TC / Withdraw state ──────────────────────────────────────────────────
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [isBulkWithdrawModalVisible, setIsBulkWithdrawModalVisible] = useState(false);
  const [bulkWithdrawReason, setBulkWithdrawReason] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  // ── Issue TC state ───────────────────────────────────────────────────────
  const [tcForm] = Form.useForm();
  const [isTcModalVisible, setIsTcModalVisible] = useState(false);
  const [tcLoading, setTcLoading] = useState(false);
  const [pendingTcIds, setPendingTcIds] = useState([]);

  // ── Fee dues check state ─────────────────────────────────────────────────
  const [feeDueCheckLoading, setFeeDueCheckLoading]   = useState(false);
  const [isFeeDueModalVisible, setIsFeeDueModalVisible] = useState(false);
  const [studentsWithDues, setStudentsWithDues]         = useState([]);

  // ── Grade / Section filters ──────────────────────────────────────────────
  const [filterGrade, setFilterGrade] = useState("");
  const [filterSection, setFilterSection] = useState("");

  // ── Pagination ───────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);

  // ── Re-fetch on filter/route change ─────────────────────────────────────
  useEffect(() => { fetchStudentsslcs(); }, [selectedSchool, selectedYear, location.pathname]);

  // Reset to page 1 when data changes
  useEffect(() => { setCurrentPage(1); }, [studentsslcs]);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

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
    if (days < 0) { months--; days += new Date(t.getFullYear(), t.getMonth(), 0).getDate(); }
    if (months < 0) { years--; months += 12; }
    return { years, months, days };
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

  const fetchSectionsBySchoolAndGrade = async (sId, gId) => {
    if (!sId || !gId) return;
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/section/getSectionsBySchoolAndGrade/${sId}/${gId}`);
      setSections(res.data.sections || []);
    } catch (e) { console.error("Error fetching sections:", e); setSections([]); }
  };

  const validateDOB = (_, v) => { if (!v) return Promise.reject("DOB is required!"); if (new Date(v) >= new Date()) return Promise.reject("DOB cannot be in the future!"); return Promise.resolve(); };
  const validateAccountNumber = (_, v) => { if (!v || !/^\d{9,17}$/.test(v)) return Promise.reject("Account number must be 9 to 17 digits!"); return Promise.resolve(); };
  const validateIFSCCode = (_, v) => { if (!v || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(v)) return Promise.reject("Enter a valid IFSC Code (e.g., SBIN0001234)!"); return Promise.resolve(); };

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
          Grade: s.Grade || { grade: "N/A" },
          Section: s.Section || { sectionName: "N/A" },
          isPromoted: s.isPromoted ?? false,
          isDemoted: s.isDemoted ?? false,
          isLocked: s.isLocked ?? false,
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
    } catch { }
  };

  // ── Print ────────────────────────────────────────────────────────────────
  const handlePrintClick = async (id) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/studentsslc/getStudentsslcById/${id}`);
      const application = res.data.application;
      if (!application) { message.error("No application data found for printing."); return; }
      const printWindow = window.open("", "_blank", "width=900,height=700");
      printWindow.document.write(preparePrintContent(application));
      printWindow.document.close();
      printWindow.onload = () => { printWindow.focus(); printWindow.print(); };
    } catch { message.error("Failed to fetch student data for print"); }
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
      await axios.put(`${process.env.REACT_APP_API_URL}/studentsslc/updateStatus/${id}`);
      message.success("Application removed successfully");
      fetchStudentsslcs();
    } catch { message.error("Failed to remove application"); }
  };

  // ── Checkbox helpers ─────────────────────────────────────────────────────
  const selectableStudents = studentsslcs.filter((s) => !s.isLocked);
  const toggleSelectAll = (e) => setSelectedRowKeys(e.target.checked ? selectableStudents.map((s) => s.id) : []);
  const toggleSelectRow = (id) => setSelectedRowKeys((prev) => prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]);
  const allSelected = selectableStudents.length > 0 && selectedRowKeys.length === selectableStudents.length;
  const someSelected = selectedRowKeys.length > 0 && selectedRowKeys.length < selectableStudents.length;

  // ── Bulk withdraw ────────────────────────────────────────────────────────
  const confirmBulkWithdraw = async () => {
    setWithdrawing(true);
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/studentsslc/withdrawStudents`, {
        ids: selectedRowKeys, reason: bulkWithdrawReason, school_id: schoolId,
        academic_year: selectedYear || undefined,
      });
      message.success(`${selectedRowKeys.length} student(s) moved to TC successfully.`);
      setSelectedRowKeys([]); setBulkWithdrawReason(""); setIsBulkWithdrawModalVisible(false);
      fetchStudentsslcs();
    } catch { message.error("Failed to withdraw students. Please try again."); }
    finally { setWithdrawing(false); }
  };

  // ── TC modal — with fee-dues pre-check ──────────────────────────────────
  const openTcModal = async (ids) => {
    if (!ids || ids.length === 0) {
      message.warning("Please select at least one student first.");
      return;
    }

    // Determine the effective school id and academic year for the check
    const effectiveSchoolId = isSuperAdmin
      ? selectedSchool === "all"
        ? studentsslcs.find((s) => ids.includes(s.id))?.school_id
        : selectedSchool
      : schoolId;

    const effectiveYear = selectedYear || studentsslcs.find((s) => ids.includes(s.id))?.academicYear;

    setFeeDueCheckLoading(true);
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/studentsslc/checkFeeDuesBeforeTc`,
        {
          studentIds:    ids,
          school_id:     effectiveSchoolId,
          academic_year: effectiveYear,
        }
      );

      if (res.data.hasDues) {
        // Block TC – show a detailed modal listing which students still owe fees
        setStudentsWithDues(res.data.studentsWithDues);
        setIsFeeDueModalVisible(true);
        return;
      }

      // No dues – proceed to the TC form modal as before
      setPendingTcIds(ids);
      tcForm.resetFields();
      tcForm.setFieldsValue({ tcDate: dayjs().format("YYYY-MM-DD"), conductCertificate: "Good" });
      setIsTcModalVisible(true);
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
      await axios.post(`${process.env.REACT_APP_API_URL}/tc/bulkIssueTc`, {
        studentIds: pendingTcIds,
        tcDate: values.tcDate || null,
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
    if ([...new Set(sel.map((s) => s.school_id))].length > 1) { message.error("Selected students belong to different schools. Please select students from the same school only."); return; }
    if ([...new Set(sel.map((s) => s.grade_id))].length > 1) { message.error("Selected students belong to different classes. Please select students from the same class only."); return; }
    if ([...new Set(sel.map((s) => s.section_id))].length > 1) { message.error("Selected students belong to different sections. Please select students from the same section only."); return; }
    navigate("/studentpromotion", { state: { selectedStudents: sel, mode: "promote" } });
  };

  // ── Demote ───────────────────────────────────────────────────────────────
  const handleDemoteNavigate = () => {
    if (selectedRowKeys.length === 0) { navigate("/studentpromotion", { state: { mode: "demote" } }); return; }
    const sel = studentsslcs.filter((s) => selectedRowKeys.includes(s.id));
    if ([...new Set(sel.map((s) => s.school_id))].length > 1) { message.error("Selected students belong to different schools. Please select students from the same school only."); return; }
    if ([...new Set(sel.map((s) => s.grade_id))].length > 1) { message.error("Selected students belong to different classes. Please select students from the same class only."); return; }
    if ([...new Set(sel.map((s) => s.section_id))].length > 1) { message.error("Selected students belong to different sections. Please select students from the same section only."); return; }
    navigate("/studentpromotion", { state: { selectedStudents: sel, mode: "demote" } });
  };

  // ── Settings dropdown items ──────────────────────────────────────────────
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
  const preparePrintContent = (a) => {
    const school = a.School || {};
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
      let h = a?.academicHistory;
      if (!h || h === "") return `<tr><td colspan="3" style="color:#64748b;font-style:italic">No Academic History</td></tr>`;
      if (typeof h === "string") { try { h = JSON.parse(h); } catch { return `<tr><td colspan="3">Invalid Data</td></tr>`; } }
      if (!Array.isArray(h) || h.length === 0) return `<tr><td colspan="3" style="color:#64748b;font-style:italic">No Academic History</td></tr>`;
      return h.map(item => `<tr><td>${item?.schoolName || ""}</td><td>${item?.standard || ""}</td><td>${item?.duration || ""}</td></tr>`).join("");
    })();

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Student Profile \u2013 ${a.name || ""}</title>
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
      <div class="adm-value">${val(a.admissionNumber)}</div>
      <div class="adm-year">${val(a.academicYear)}</div>
    </div>
  </div>

  <!-- Enrollment strip -->
  <div class="enroll-strip">
    <div class="enroll-cell"><div class="el">Date of Join</div><div class="ev">${val(a.dateofjoin)}</div></div>
    <div class="enroll-cell"><div class="el">Grade</div><div class="ev">${val(a.Grade?.grade)}</div></div>
    <div class="enroll-cell"><div class="el">Section</div><div class="ev">${val(a.Section?.sectionName)}</div></div>
    <div class="enroll-cell"><div class="el">EMIS Number</div><div class="ev">${val(a.emisNum)}</div></div>
    <div class="enroll-cell"><div class="el">Aadhar Number</div><div class="ev">${val(a.aadharNumber)}</div></div>
  </div>

  <!-- Personal Details -->
  ${sec("Personal Details")}
  <div class="fields-grid">
    ${field("Full Name", a.name)}
    ${field("Gender", a.gender)}
    ${field("Date of Birth", a.dob)}
    ${field("Age", fmtAge(a.age))}
    ${field("medium", a.medium)}
    ${field("Nationality", a.nationality)}
    ${field("State", a.state)}
    ${field("Mother Tongue", a.motherTongue)}
    ${field("Home Town", a.hometown)}
    ${field("Religion", a.religion)}
    ${field("Community", a.community)}
    ${field("Caste", a.caste)}
    ${field("Blood Group", a.bloodGroup)}
    ${field("Identification Marks", a.identificationmarks)}
    ${field("Living With", a.living)}
    ${field("Scheduled Tribe?", a.tribecommunity)}
    ${field("Ex-Gratia Salary Entitled?", a.exgratiasalary)}
    ${field("Convert from Hinduism?", a.religionchanging)}
    ${field("Chicken Pox Vaccinated?", a.vaccinated)}
    ${field("Physically Challenged?", a.physical)}
    ${field("Physical Details", a.physicalDetails)}
  </div>

  <!-- Family & Contact -->
  ${sec("Family & Contact Details")}
  <div class="fields-grid">
    ${field("Father's Name", a.fatherName)}
    ${field("Mother's Name", a.motherName)}
    ${field("Father's Occupation", a.fatherOccupation)}
    ${field("Mother's Occupation", a.motherOccupation)}
    ${field("Father's Annual Income", a.fatherIncome)}
    ${field("Mother's Annual Income", a.motherIncome)}
    ${field("Mobile Number", a.mobileNumber)}
    ${field("Parent's Email ID", a.parentEmail)}
    ${field("Pincode", a.pincode)}
    <div class="field-box field-full"><div class="field-label">Address</div><div class="field-value">${val(a.address)}</div></div>
  </div>

  <!-- Guardian -->
  ${sec("Guardian Details")}
  <div class="fields-grid">
    ${field("Guardian Name", a.guardianName)}
    ${field("Guardian Occupation", a.guardianOccupation)}
    ${field("Guardian Phone", a.guardianNumber)}
    <div class="field-box field-full"><div class="field-label">Guardian Address</div><div class="field-value">${val(a.guardianAddress)}</div></div>
  </div>

  <!-- Academic Details -->
  ${sec("Academic Details")}
  <table class="hist-table" style="margin-bottom:8px">
    <thead><tr><th>Previous School Name</th><th>Standard</th><th>Duration</th></tr></thead>
    <tbody>${historyRows}</tbody>
  </table>
  <div class="fields-grid">
  ${field("Is parent consent hardcopy attached?", a.parentconsentform)}
    ${field("Passed Last Class?", a.passorfail)}
    ${field("T.C/E.S.L.C Submitted?", a.tceslc)}
  </div>

  <!-- Bank Details -->
  ${sec("Bank Details")}
  <div class="fields-grid">
    ${field("Bank Name", a.bankName)}
    ${field("Branch Name", a.branchName)}
    ${field("Account Number", a.accountNumber)}
    ${field("IFSC Code", a.ifsccode)}
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

  // ── Lock tooltip helper ──────────────────────────────────────────────────
  const getLockTooltip = (student) => {
    if (!student.isLocked) return "";
    if (student.isPromoted) return "Cannot edit — student already promoted";
    if (student.isDemoted) return "Cannot edit — student already demoted";
    return "Cannot edit — student record is locked";
  };

  const getLockEditTitle = (student) => {
    if (!student.isLocked) return "Edit Application";
    if (student.isPromoted) return "Cannot edit — student already promoted";
    if (student.isDemoted) return "Cannot edit — student already demoted";
    return "Cannot edit — student record is locked";
  };

  const getLockEditWarning = (student) => {
    if (student.isPromoted) return "This student has already been promoted. Past year data cannot be edited.";
    if (student.isDemoted) return "This student has already been demoted. Past year data cannot be edited.";
    return "This student record is locked and cannot be edited.";
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
      "Date of Birth": s.dob || "",
      "Age": s.age || "",
      "Medium": s.medium || "",
      "Nationality": s.nationality || "",
      "State": s.state || "",
      "Mother Tongue": s.motherTongue || "",
      "Religion": s.religion || "",
      "Home Town": s.hometown || "",
      "Community": s.community || "",
      "Caste": s.caste || "",
      "Scheduled Tribe Community": s.tribecommunity || "",
      "Ex-Gratia Salary": s.exgratiasalary || "",
      "Convert from Hinduism to Christianity": s.religionchanging || "",
      "Living With": s.living || "",
      "Chicken Pox Vaccinated": s.vaccinated || "",
      "Identification Marks": s.identificationmarks || "",
      "Blood Group": s.bloodGroup || "",
      "Physically Challenged": s.physical || "",
      "Physical Challenge Details": s.physicalDetails || "",
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
      "Guardian Phone": s.guardianNumber || "",
      "Parent Consent Form": s.parentconsentform || "",
      "Pass or Fail": s.passorfail || "",
      "TC/ESLC/Record Sheet Submitted": s.tceslc || "",
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
    const q = searchQuery.trim().toLowerCase();
    return studentsslcs.filter(s => {
      const gradeMatch = !filterGrade || String(s.Grade?.id || s.grade_id) === String(filterGrade);
      const sectionMatch = !filterSection || String(s.Section?.id || s.section_id) === String(filterSection);
      const searchMatch = !q ||
        (s.name || "").toLowerCase().includes(q) ||
        (s.admissionNumber || "").toLowerCase().includes(q);
      return gradeMatch && sectionMatch && searchMatch;
    });
  }, [studentsslcs, filterGrade, filterSection, searchQuery]);

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

        {/* ── Page title ───────────────────────────────────────────────── */}
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLOR.text, margin: 0, letterSpacing: "-0.3px", fontFamily: FF }}>
            Student List for SSLC
          </h1>
          <div style={{ width: 40, height: 3, background: COLOR.blueLt, borderRadius: 2, marginTop: 6 }} />
        </div>

        {/* ── Top bar ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>

          {/* Left group: create, filters, excel, selection count */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>

            {/* Filter badge */}
            {(selectedSchool !== "all" || selectedYear) && (
              <div style={{ fontSize: "13px", color: COLOR.filterText, background: COLOR.filterBg, padding: "6px 14px", borderRadius: 6, fontWeight: 500, fontFamily: FF, flexShrink: 0 }}>
                Showing: {selectedSchool !== "all" ? selectedSchoolName : "All Schools"}{selectedYear ? ` | ${selectedYear}` : ""}
              </div>
            )}

            {/* Create button */}
            {isAdminRole && (
              <button
                onClick={() => navigate("/create-studentsslc")}
                onMouseEnter={e => { e.currentTarget.style.background = COLOR.blue; e.currentTarget.style.boxShadow = "0 4px 14px rgba(30,64,175,0.35)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = COLOR.blueLt; e.currentTarget.style.boxShadow = "0 2px 8px rgba(59,130,246,0.28)"; }}
                style={{ all: "unset", display: "inline-flex", alignItems: "center", gap: 7, background: COLOR.blueLt, color: "#fff", padding: "9px 20px", borderRadius: 8, fontSize: FS, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(59,130,246,0.28)", transition: "all 0.18s", fontFamily: FF, flexShrink: 0 }}
              >
                Allocate SSLC Student
              </button>
            )}

            {/* ── Grade Filter ── */}
            <Select
              allowClear
              placeholder="All Grades"
              value={filterGrade || undefined}
              onChange={val => setFilterGrade(val || "")}
              style={{ width: 140, fontFamily: FF, fontSize: FS, flexShrink: 0 }}
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
              style={{ width: 150, fontFamily: FF, fontSize: FS, flexShrink: 0 }}
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

            {/* Selection count */}
            {selectedRowKeys.length > 0 && (
              <span style={{ fontSize: 13, fontWeight: 600, color: COLOR.tcColor, background: COLOR.tcBg, border: `1px solid ${COLOR.tcColor}`, borderRadius: 6, padding: "4px 12px", flexShrink: 0 }}>
                {selectedRowKeys.length} student{selectedRowKeys.length > 1 ? "s" : ""} selected
              </span>
            )}
          </div>

          {/* Right: Gear / bulk-actions dropdown */}
          {isAdminRole && (
            <Dropdown menu={{ items: cornerDropdownItems }} trigger={["click"]} placement="bottomRight">
              <Tooltip title={selectedRowKeys.length === 0 ? "Select students or click to perform actions" : `Actions for ${selectedRowKeys.length} selected student(s)`}>
                <div style={{
                  width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
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
                    const baseBg = student.isLocked ? COLOR.rowLocked : index % 2 === 0 ? COLOR.rowOdd : COLOR.rowEven;
                    const activeBg = isSelected ? COLOR.rowSel : baseBg;
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
                                title={
                                  student.isLocked
                                    ? "Cannot issue TC — student record is locked"
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

                            {/* Delete — superadmin only */}
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
            FEE DUES BLOCKING MODAL
            Shown when one or more selected students still have unpaid/
            partial fee demands. TC is NOT allowed until dues are cleared.
        ════════════════════════════════════════════════════════════════ */}
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
          <div style={{ border: `1px solid #e2e8f0`, borderRadius: 8, overflow: "hidden" }}>
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

        {/* ════════════════════════════════════════════════════════════════
            TC ISSUE MODAL
        ════════════════════════════════════════════════════════════════ */}
        <Modal
          title={<span style={{ fontFamily: FF, fontWeight: 700, color: COLOR.tcColor }}>Issue TC for {pendingTcIds.length} Student{pendingTcIds.length > 1 ? "s" : ""}</span>}
          open={isTcModalVisible}
          onCancel={() => { setIsTcModalVisible(false); setPendingTcIds([]); }}
          footer={
            /* ── Straight-line footer: Cancel on left, Issue TC on right ── */
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <Button
                onClick={() => { setIsTcModalVisible(false); setPendingTcIds([]); }}
                style={{ minWidth: 90 }}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                loading={tcLoading}
                onClick={handleBulkTcSubmit}
                style={{ background: COLOR.tcColor, borderColor: COLOR.tcColor, minWidth: 110 }}
              >
                Issue TC
              </Button>
            </div>
          }
          width={600}
        >
          {/* ── Selected students summary ── */}
          {pendingTcIds.length > 0 && (() => {
            const sel = studentsslcs.filter(s => pendingTcIds.includes(s.id));
            return (
              <div style={{
                marginBottom: 16, border: `1px solid ${COLOR.border}`,
                borderRadius: 8, overflow: "hidden",
              }}>
                <div style={{
                  background: COLOR.headBg, padding: "7px 14px",
                  fontSize: 12, fontWeight: 600, color: "#fff", letterSpacing: "0.2px",
                }}>
                  Student{sel.length > 1 ? "s" : ""} Selected ({sel.length})
                </div>
                <div style={{ maxHeight: 160, overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, fontFamily: FF }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        {["S.No", "Name", "Admission No", "Grade", "Section"].map(h => (
                          <th key={h} style={{
                            padding: "6px 10px", fontWeight: 600, color: COLOR.textMid,
                            borderBottom: `1px solid ${COLOR.border}`, textAlign: "left", whiteSpace: "nowrap",
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sel.map((s, i) => (
                        <tr key={s.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc", borderBottom: `1px solid ${COLOR.border}` }}>
                          <td style={{ padding: "6px 10px", color: COLOR.textSoft }}>{i + 1}</td>
                          <td style={{ padding: "6px 10px", color: COLOR.text, fontWeight: 500 }}>{s.name || "—"}</td>
                          <td style={{ padding: "6px 10px", color: COLOR.blueLt, fontWeight: 600, whiteSpace: "nowrap" }}>{s.admissionNumber || "—"}</td>
                          <td style={{ padding: "6px 10px", color: COLOR.textMid }}>{s.Grade?.grade || "N/A"}</td>
                          <td style={{ padding: "6px 10px", color: COLOR.textMid }}>{s.Section?.sectionName || "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          <Form form={tcForm} layout="vertical" style={{ fontFamily: FF }}>
            <Form.Item name="tcDate" label="TC Date" rules={[{ required: true, message: "TC Date is required" }]}>
              <input
                type="date"
                max={dayjs().format("YYYY-MM-DD")}
                style={{
                  width: "100%", padding: "6px 11px", border: "1px solid #d9d9d9",
                  borderRadius: 6, fontSize: 14, color: "#1e293b",
                  outline: "none", boxSizing: "border-box", height: 32,
                  fontFamily: FF,
                }}
                onChange={(e) => tcForm.setFieldsValue({ tcDate: e.target.value })}
                value={tcForm.getFieldValue("tcDate") || ""}
              />
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
              <Input.TextArea rows={3} placeholder="Any additional remarks..." autoSize={{ minRows: 3, maxRows: 6 }} />
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
            footer={
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "4px 0" }}>
                <button onClick={() => { const w = window.open("", "_blank", "width=900,height=700"); w.document.write(preparePrintContent(selectedApplication)); w.document.close(); w.onload = () => { w.focus(); w.print(); }; }}
                  style={{ all: "unset", display: "inline-flex", alignItems: "center", gap: 7, background: "#15803d", color: "#fff", padding: "8px 20px", borderRadius: 8, fontSize: "13.5px", fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(21,128,61,0.28)", transition: "all 0.18s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#166534"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#15803d"; }}>
                  <PrinterOutlined style={{ fontSize: 15 }} /> Print Profile
                </button>
                <button onClick={() => setIsModalVisible(false)}
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
              <Descriptions.Item label="Medium">{selectedApplication.medium}</Descriptions.Item>
              <Descriptions.Item label="Nationality">{selectedApplication.nationality}</Descriptions.Item>
              <Descriptions.Item label="State">{selectedApplication.state}</Descriptions.Item>
              <Descriptions.Item label="Mother Tongue">{selectedApplication.motherTongue}</Descriptions.Item>
              <Descriptions.Item label="Religion">{selectedApplication.religion}</Descriptions.Item>
              <Descriptions.Item label="Home Town">{selectedApplication.hometown}</Descriptions.Item>
              <Descriptions.Item label="Community">{selectedApplication.community}</Descriptions.Item>
              <Descriptions.Item label="Caste">{selectedApplication.caste}</Descriptions.Item>
              <Descriptions.Item label="Identification Marks">{selectedApplication.identificationmarks}</Descriptions.Item>
              <Descriptions.Item label="Blood Group">{selectedApplication.bloodGroup}</Descriptions.Item>
              <Descriptions.Item label="Living with whom">{selectedApplication.living}</Descriptions.Item>
              <Descriptions.Item label="Is the student from scheduled tribe community?">{selectedApplication.tribecommunity}</Descriptions.Item>
              <Descriptions.Item label="Is the caste entitled to get ex-gratia salary?">{selectedApplication.exgratiasalary}</Descriptions.Item>
              <Descriptions.Item label="Is the student a convert from Hinduism to Christianity?">{selectedApplication.religionchanging}</Descriptions.Item>
              <Descriptions.Item label="Is the student for chicken pox? Is scar Available?">{selectedApplication.vaccinated}</Descriptions.Item>
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
              <Descriptions.Item label="Parent's Email ID">{selectedApplication.parentEmail}</Descriptions.Item>
              <Descriptions.Item label="Mobile Number">{selectedApplication.mobileNumber}</Descriptions.Item>
              <Descriptions.Item label="Guardian's Name">{selectedApplication.guardianName}</Descriptions.Item>
              <Descriptions.Item label="Guardian's Occupation">{selectedApplication.guardianOccupation}</Descriptions.Item>
              <Descriptions.Item label="Guardian Address">{selectedApplication.guardianAddress}</Descriptions.Item>
              <Descriptions.Item label="Guardian Phone Number">{selectedApplication.guardianNumber}</Descriptions.Item>
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
              <Descriptions.Item label="Is parent consent Hardcopy attached?">{selectedApplication.parentconsentform}</Descriptions.Item>
              <Descriptions.Item label="Has He/She passed in the last class studied?">{selectedApplication.passorfail}</Descriptions.Item>
              <Descriptions.Item label="Is T.C/E.S.L.C/Record sheet submitted?">{selectedApplication.tceslc}</Descriptions.Item>
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