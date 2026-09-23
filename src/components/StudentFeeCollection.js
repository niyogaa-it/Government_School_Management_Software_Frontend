import React, { useState } from "react";
import Layout from "./Layout";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Spin } from "antd";
import {
  SearchOutlined,
  FilterOutlined,
  SaveOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";

const BASE = `${process.env.REACT_APP_API_URL}`;

/* ── Sidebar colour tokens ── */
const C = {
  primary:      "#1d2a4d",
  accent:       "#4f8ef7",
  accentLight:  "#e8f0fe",
  success:      "#22c55e",
  successLight: "#dcfce7",
  warning:      "#f59e0b",
  danger:       "#ef4444",
  border:       "#d1dae8",
  bg:           "#f4f6fb",
  card:         "#ffffff",
  text:         "#1d2a4d",
  muted:        "#6b7a99",
};

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: C.muted,
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const inputStyle = {
  width: "100%",
  padding: "7px 11px",
  border: `1.5px solid ${C.border}`,
  borderRadius: 7,
  fontSize: 13.5,
  color: C.text,
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
};

const readonlyStyle = {
  ...inputStyle,
  background: C.bg,
  color: C.muted,
  cursor: "default",
};

const sectionCard = {
  background: C.card,
  border: `1.5px solid ${C.border}`,
  borderRadius: 10,
  padding: "16px 20px",
  marginBottom: 18,
};

const sectionHeader = {
  fontSize: 13,
  fontWeight: 700,
  color: C.primary,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 14,
  paddingBottom: 8,
  borderBottom: `2px solid ${C.accentLight}`,
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const btnBase = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "7px 18px",
  borderRadius: 7,
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
  transition: "opacity 0.15s, background 0.15s",
};

const Accent = () => (
  <span style={{ width: 4, height: 16, background: C.accent, borderRadius: 2, display: "inline-block" }} />
);

const StudentFeeCollection = () => {
  const currentYear = new Date().getFullYear();
  const todayStr    = new Date().toISOString().split("T")[0];

  const user     = JSON.parse(localStorage.getItem("user") || "{}");
  const navigate = useNavigate();

  const [selectedType,   setSelectedType]   = useState("SSLC");
  const [startYear,      setStartYear]      = useState(currentYear);
  const [admissionNumber,setAdmissionNumber]= useState("");
  const [studentData,    setStudentData]    = useState(null);
  const [loading,        setLoading]        = useState(false);
  const [saving,         setSaving]         = useState(false);

  // Filters
  const [selectedFeeTypes,     setSelectedFeeTypes]     = useState([]);   // checked fee types (non-special)
  const [selectedSpecialFee,   setSelectedSpecialFee]   = useState("");   // radio — "Special Fee - Art Fee" | "Special Fee - Science Fee" | ""
  const [availableFeeTypes,    setAvailableFeeTypes]    = useState([]);   // loaded from demand
  const [allFeeDetails,        setAllFeeDetails]        = useState([]);   // flat fee details from demand
  const [medium,      setMedium]      = useState("");
  const [studentType, setStudentType] = useState("");

  // Matched fees
  const [matchedFees,  setMatchedFees]  = useState([]);
  const [noFeeMessage, setNoFeeMessage] = useState("");

  // Payment
  const [collectionDate, setCollectionDate] = useState(todayStr);
  const [paymentMode,    setPaymentMode]    = useState("Cash");
  const [transactionId,  setTransactionId]  = useState("");
  const [paidAmount,     setPaidAmount]     = useState("");
  const [remarks,        setRemarks]        = useState("");

  // Receipt
  const [receiptNo, setReceiptNo] = useState("");

  const academicYear       = `${startYear}-${startYear + 1}`;
  const totalAmount        = matchedFees.reduce((sum, fee) => sum + parseFloat(fee.amount || 0), 0);
  const balance            = paidAmount !== "" ? parseFloat(paidAmount) - totalAmount : 0;
  const needsTransactionId = ["Online", "Cheque", "DD"].includes(paymentMode);

  /* ── GRADE-BASED FEE TYPE VISIBILITY ──────────────────────────────────────
     • Grades up to X  → PTA only
     • Grades XI & XII → all fee heads (PTA + Management + Special)
     Special Fee types are always rendered as a radio group (mutually exclusive).
  ─────────────────────────────────────────────────────────────────────────── */
  const SENIOR_GRADES  = ["xi", "xii", "11", "12"];
  const studentGrade   = (studentData?.Grade?.grade || studentData?.grade || "").trim().toLowerCase();
  const isSeniorGrade  = SENIOR_GRADES.includes(studentGrade);
  const visibleFeeTypes = isSeniorGrade
    ? availableFeeTypes
    : availableFeeTypes.filter(t => t === "PTA");

  /* ── RESET ── */
  const resetForm = () => {
    setAdmissionNumber(""); setStudentData(null); setMatchedFees([]);
    setNoFeeMessage(""); setSelectedFeeTypes([]); setSelectedSpecialFee(""); setAvailableFeeTypes([]);
    setAllFeeDetails([]); setMedium(""); setStudentType("");
    setPaidAmount(""); setRemarks(""); setReceiptNo(""); setTransactionId("");
    setCollectionDate(todayStr); setPaymentMode("Cash");
  };

  /* ── RECEIPT PREVIEW ── */
  const fetchReceiptPreview = async (schoolId) => {
    try {
      const res = await axios.get(
        `${BASE}/feeCollection/nextReceipt?school_id=${schoolId}&academicYear=${academicYear}`
      );
      setReceiptNo(res.data.receiptNo || "");
    } catch { setReceiptNo(""); }
  };

  /* ── LOAD FEE TYPES BY SCHOOL + YEAR + GRADE ──────────────────────────────
     Passes the student's grade to the backend so it can enforce:
       • Grades up to X  → PTA only
       • Grades XI & XII → all fee heads
     The frontend visibleFeeTypes derived value is kept as a safety net but
     the server-side filter is the authoritative gate.
  ─────────────────────────────────────────────────────────────────────────── */
  const fetchAvailableFeeTypes = async (schoolId, year, grade = "") => {
    try {
      const gradeParam = grade ? `?grade=${encodeURIComponent(grade)}` : "";
      const url = `${BASE}/raiseFeeDemand/getBySchoolAndYear/${schoolId}/${year}${gradeParam}`;
      console.log("[FeeTypes] calling:", url);
      const res = await axios.get(url);
      console.log("[FeeTypes] response:", JSON.stringify(res.data));
      const types   = res.data.feeTypes   || [];
      const details = res.data.feeDetails || [];
      console.log("[FeeTypes] types found:", types);
      setAvailableFeeTypes(types);
      setAllFeeDetails(details);
      if (types.length === 0) {
        setNoFeeMessage(`No fee structure raised for school ID ${schoolId} in ${year}. Please raise a fee demand first.`);
      } else {
        setNoFeeMessage(""); // clear any old message
      }
    } catch (err) {
      console.error("[FeeTypes] fetch error:", err?.response?.status, err?.response?.data || err.message);
      setAvailableFeeTypes([]);
      setAllFeeDetails([]);
      setNoFeeMessage(
        err?.response?.status === 404
          ? `No fee demand raised for this school in ${year}.`
          : `Error loading fee types: ${err?.response?.data?.message || err.message}`
      );
    }
  };

  /* ── SEARCH ── */
  const handleSearch = async () => {
    if (!admissionNumber.trim()) return alert("Please enter an Admission Number");
    try {
      setStudentData(null); setMatchedFees([]); setNoFeeMessage("");
      setReceiptNo(""); setPaidAmount(""); setLoading(true);
      const url =
        selectedType === "SSLC"
          ? `${BASE}/studentsslc/getByAdmission/${admissionNumber.trim()}?academicYear=${academicYear}`
          : `${BASE}/studenthsc/getByAdmission/${admissionNumber.trim()}?academicYear=${academicYear}`;
      const res = await axios.get(url);
      console.log("=== STUDENT SEARCH RESPONSE ===");
      console.log("URL:", url);
      console.log("res.data:", JSON.stringify(res.data, null, 2));
      console.log("================================");

      // Handle different response shapes: { student } or { data } or direct object
      const s = res.data.student || res.data.data || res.data;
      if (s && (s.admissionNumber || s.admission_number || s.id)) {
        setStudentData(s);
        setStudentType(s.studenttype || s.studentType || s.student_type || "");
        setMedium(s.preferredmedium || s.preferredMedium || s.medium || "");
        const yr = `${startYear}-${startYear + 1}`;
        // Extract grade so backend can enforce grade-based fee type rules
        const studentGradeLabel = s?.Grade?.grade || s?.grade || "";
        await fetchReceiptPreview(s.school_id);
        await fetchAvailableFeeTypes(s.school_id, yr, studentGradeLabel);
      } else { alert("Student Not Found"); }
    } catch { alert("Student Not Found"); }
    finally { setLoading(false); }
  };

  /* ── APPLY FILTERS ── */
  const handleSelectFilters = async () => {
    if (!studentData) return alert("Search student first");

    // Build the full list of selected types: checkboxes + the radio-selected special fee (if any)
    const allSelectedTypes = [...selectedFeeTypes, ...(selectedSpecialFee ? [selectedSpecialFee] : [])];

    if (!allSelectedTypes.length) return alert("Select at least one Bill Type");
    if (!medium)                  return alert("Select a Medium");
    if (!studentType)             return alert("Select a Student Type");

    setNoFeeMessage(""); setMatchedFees([]);
    try {
      if (!allFeeDetails.length) {
        setNoFeeMessage(`No fee structure for Academic Year: ${academicYear}. Please raise a fee demand first.`);
        return;
      }

      const grade    = studentData?.Grade?.grade || studentData?.grade || "";
      const schoolId = String(studentData.school_id);

      const filtered = allFeeDetails.filter(
        (fee) =>
          // Match by school_id first — ensures only THIS school's fees show
          String(fee.school_id) === schoolId &&
          fee.grade === grade &&
          fee.medium === medium &&
          (fee.studentType === studentType || fee.studentType === "Both") &&
          allSelectedTypes.includes(fee.type)
      );

      // Deduplicate: same type+grade+medium+studentType → keep only one (latest demand wins)
      // Backend already deduplicates, this is a safety net for old data
      const seenFee = new Set();
      const uniqueFiltered = filtered.filter((fee) => {
        const key = `${fee.type}|${fee.grade}|${fee.medium}|${fee.studentType}`;
        if (seenFee.has(key)) return false;
        seenFee.add(key);
        return true;
      });

      if (!uniqueFiltered.length) {
        setNoFeeMessage(`No fee found for Grade: ${grade}, Medium: ${medium}, Student Type: ${studentType}, Bill Type: ${allSelectedTypes.join(", ")}`);
      } else {
        setMatchedFees(uniqueFiltered);
        setPaidAmount(String(uniqueFiltered.reduce((s, f) => s + parseFloat(f.amount || 0), 0)));
      }
    } catch (err) { console.error(err); alert("Failed to apply filters."); }
  };

  /* ── SAVE ── */
  const handleGenerateFee = async () => {
    if (!studentData)        return alert("Search student first");
    if (!matchedFees.length) return alert("Apply filters to load fee details first");
    if (!collectionDate)     return alert("Select a collection date");
    if (!paidAmount || parseFloat(paidAmount) <= 0) return alert("Enter a valid paid amount");
    if (needsTransactionId && !transactionId.trim()) return alert("Enter a Transaction ID");

    try {
      setSaving(true);
      const payload = {
        school_id:        studentData.school_id,
        academic_year:    academicYear,
        student_id:       studentData.id,
        admission_number: studentData.admissionNumber || studentData.admission_number || "",
        student_name:     studentData.name || studentData.student_name || "",
        grade:            studentData?.Grade?.grade || studentData?.grade || "",
        section:          studentData?.Section?.sectionName || studentData?.section || "",
        course:           selectedType,
        fee_items:        matchedFees,
        medium,
        student_type:     studentType,
        total_amount:     totalAmount,
        paid_amount:      parseFloat(paidAmount),
        payment_mode:     paymentMode,
        transaction_id:   needsTransactionId ? transactionId : "",
        collection_date:  collectionDate,
        collected_by:     user?.name || user?.username || "Admin",
        remarks,
      };
      const res          = await axios.post(`${BASE}/feeCollection/saveFeeCollection`, payload);
      const savedReceipt = res.data.receipt_no;
      setReceiptNo(savedReceipt);
      alert(`✅ Fee collected successfully!\nReceipt No: ${savedReceipt}`);
      resetForm();
    } catch (err) {
      console.error("Save error:", err);
      alert(`❌ Error: ${err?.response?.data?.message || "Failed to save fee collection."}`);
    } finally { setSaving(false); }
  };

  /* ════════════════════════════════════════
     UI
  ════════════════════════════════════════ */
  return (
    <Layout>
      <div className="app-page" style={{ background: C.bg, minHeight: "100vh", padding: "20px 24px" }}>

        {/* PAGE HEADER */}
        <div style={{
          background: `linear-gradient(135deg, ${C.primary} 0%, #2d4073 100%)`,
          borderRadius: 12, padding: "16px 24px", marginBottom: 20, color: "#fff",
        }}>
          <h5 style={{ margin: 0, fontWeight: 700, fontSize: 17 }}>Student Fee Collection</h5>
          <p style={{ margin: "2px 0 0", fontSize: 12, opacity: 0.7 }}>Collect and record student fee payments</p>
        </div>

        {/* ── SEARCH ── */}
        <div style={sectionCard}>
          <div style={sectionHeader}><Accent /> Search Student</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 2fr 1.4fr", gap: 14 }}>

            <div>
              <label style={labelStyle}>Course</label>
              <select style={inputStyle} value={selectedType}
                onChange={(e) => { setSelectedType(e.target.value); resetForm(); }}>
                <option value="SSLC">SSLC</option>
                <option value="HSC">HSC</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Academic Year</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input style={inputStyle} type="number" value={startYear}
                  onChange={(e) => { setStartYear(Number(e.target.value)); resetForm(); }} />
                <input style={readonlyStyle} readOnly value={startYear + 1} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Admission No</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input style={inputStyle} type="text" value={admissionNumber}
                  onChange={(e) => setAdmissionNumber(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Enter Admission Number" />
                <button onClick={handleSearch}
                  style={{ ...btnBase, background: C.accent, color: "#fff", minWidth: 32, width: 36, height: 34, padding: "0", flexShrink: 0, borderRadius: 7 }}>
                  {loading
                    ? <span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14 }} />
                    : <SearchOutlined style={{ fontSize: 13 }} />}
                </button>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Receipt No</label>
              <input readOnly value={receiptNo || ""} placeholder="Auto-generated after save"
                style={{
                  ...inputStyle,
                  background: receiptNo ? C.successLight : C.bg,
                  color:      receiptNo ? "#166534" : C.muted,
                  border:     receiptNo ? `1.5px solid ${C.success}` : `1.5px solid ${C.border}`,
                  fontWeight: 700,
                }} />
            </div>

          </div>
        </div>

        {/* ── STUDENT DETAILS ── */}
        {studentData && (
          <div style={{ ...sectionCard, background: C.accentLight, border: `1.5px solid ${C.accent}` }}>
            <div style={sectionHeader}><Accent /> Student Details</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
              {[
                ["Name",         studentData.name || studentData.student_name || "—"],
                ["Father Name",  studentData.fatherName || studentData.father_name || studentData.fathername || "—"],
                ["Grade",        studentData?.Grade?.grade || studentData?.grade || "—"],
                ["Section",      studentData?.Section?.sectionName || studentData?.section || studentData?.Section?.name || "—"],
                ["Admission No", studentData.admissionNumber || studentData.admission_number || "—"],
              ].map(([lbl, val]) => (
                <div key={lbl}>
                  <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>
                    {lbl}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.primary }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FILTERS ── */}
        <div style={sectionCard}>
          <div style={sectionHeader}><Accent /> Fee Filters</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 14, alignItems: "end" }}>

            {/* Bill Type — checkboxes for regular types, radio group for Special Fee */}
            <div>
              <label style={labelStyle}>
                Bill Type
                {studentData && (
                  <span style={{
                    marginLeft: 8, fontSize: 10, fontWeight: 700,
                    padding: "1px 8px", borderRadius: 20,
                    background: isSeniorGrade ? "#eff6ff" : "#fef9c3",
                    color:      isSeniorGrade ? C.accent   : "#854d0e",
                    border:     isSeniorGrade ? "1px solid #bfdbfe" : "1px solid #fde68a",
                    letterSpacing: "0.02em", textTransform: "none",
                  }}>
                    {isSeniorGrade ? "All fee heads (XI / XII)" : "PTA only (up to Grade X)"}
                  </span>
                )}
              </label>

              <div style={{
                border: `1.5px solid ${C.border}`, borderRadius: 7,
                padding: "10px 14px", background: "#fff", minHeight: 38,
              }}>
                {visibleFeeTypes.length === 0 ? (
                  <span style={{ fontSize: 12.5, color: C.muted, fontStyle: "italic" }}>
                    {studentData
                      ? isSeniorGrade
                        ? "No fee demand raised for this school/year"
                        : "No PTA fee demand found for this school/year"
                      : "Search a student first"}
                  </span>
                ) : (() => {
                  const regularTypes = visibleFeeTypes.filter(t => !t.startsWith("Special Fee"));
                  const specialTypes = visibleFeeTypes.filter(t =>  t.startsWith("Special Fee"));
                  const hasSpecial   = specialTypes.length > 0;

                  return (
                    <>
                      {/* Regular types → Checkboxes */}
                      {regularTypes.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 18px", marginBottom: hasSpecial ? 10 : 0 }}>
                          {regularTypes.map((feeType) => (
                            <label key={feeType} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", margin: 0 }}>
                              <input
                                type="checkbox"
                                checked={selectedFeeTypes.includes(feeType)}
                                onChange={(e) => {
                                  setMatchedFees([]); setNoFeeMessage("");
                                  setSelectedFeeTypes(prev =>
                                    e.target.checked ? [...prev, feeType] : prev.filter(t => t !== feeType)
                                  );
                                }}
                                style={{ accentColor: C.accent, width: 15, height: 15 }}
                              />
                              <span style={{ fontSize: 13, fontWeight: 600, color: C.text, whiteSpace: "nowrap" }}>{feeType}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Special Fee → Radio group (mutually exclusive) */}
                      {hasSpecial && (
                        <div style={{
                          borderTop: regularTypes.length > 0 ? `1px dashed ${C.border}` : "none",
                          paddingTop: regularTypes.length > 0 ? 10 : 0,
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 7 }}>
                            Special Fee &nbsp;<span style={{ fontSize: 10, fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>(select one)</span>
                          </div>
                          <div style={{ display: "flex", gap: "6px 22px", flexWrap: "wrap", alignItems: "center" }}>
                            {/* None option — clears radio selection */}
                            <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", margin: 0 }}>
                              <input type="radio" name="specialFee" value=""
                                checked={selectedSpecialFee === ""}
                                onChange={() => { setSelectedSpecialFee(""); setMatchedFees([]); setNoFeeMessage(""); }}
                                style={{ accentColor: C.accent, width: 15, height: 15 }} />
                              <span style={{ fontSize: 13, fontWeight: 500, color: C.muted, whiteSpace: "nowrap" }}>None</span>
                            </label>
                            {specialTypes.map((feeType) => (
                              <label key={feeType} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", margin: 0 }}>
                                <input type="radio" name="specialFee" value={feeType}
                                  checked={selectedSpecialFee === feeType}
                                  onChange={() => { setSelectedSpecialFee(feeType); setMatchedFees([]); setNoFeeMessage(""); }}
                                  style={{ accentColor: C.accent, width: 15, height: 15 }} />
                                <span style={{ fontSize: 13, fontWeight: 600, color: C.text, whiteSpace: "nowrap" }}>{feeType}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Medium</label>
              <select style={inputStyle} value={medium}
                onChange={(e) => { setMedium(e.target.value); setMatchedFees([]); setNoFeeMessage(""); }}>
                <option value="">Select Medium</option>
                <option value="English">English</option>
                <option value="Tamil">Tamil</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Student Type</label>
              <select style={inputStyle} value={studentType}
                onChange={(e) => { setStudentType(e.target.value); setMatchedFees([]); setNoFeeMessage(""); }}>
                <option value="">Select Type</option>
                <option value="Old">Old</option>
                <option value="New">New</option>
              </select>
            </div>

            <div>
              <button onClick={handleSelectFilters}
                style={{ ...btnBase, background: C.primary, color: "#fff", padding: "9px 20px" }}>
                <FilterOutlined style={{ fontSize: 14 }} />
                Apply
              </button>
            </div>

          </div>
        </div>

        {/* ── NO FEE MESSAGE ── */}
        {noFeeMessage && (
          <div style={{
            background: "#fffbeb", border: `1.5px solid ${C.warning}`,
            borderRadius: 8, padding: "10px 16px", marginBottom: 16,
            color: "#92400e", fontSize: 13, fontWeight: 500,
          }}>⚠️ {noFeeMessage}</div>
        )}

        {/* ── FEE TABLE ── */}
        {matchedFees.length > 0 && (
          <>
            <div style={{ ...sectionCard, padding: 0, overflow: "hidden" }}>
              <div style={{ ...sectionHeader, margin: 0, padding: "14px 20px", borderBottom: `1.5px solid ${C.border}`, borderRadius: 0 }}>
                <span style={{ width: 4, height: 16, background: C.success, borderRadius: 2, display: "inline-block" }} />
                Fee Structure — {matchedFees.length} item{matchedFees.length > 1 ? "s" : ""} matched
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
                <thead>
                  <tr style={{ background: C.primary, color: "#fff" }}>
                    {["#","Fee Type","Description","Grade","Student Type","Medium","Amount (₹)"].map((h, i) => (
                      <th key={h} style={{ padding: "10px 14px", fontWeight: 600, textAlign: i === 6 ? "right" : "left", fontSize: 12, letterSpacing: "0.04em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matchedFees.map((fee, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : C.bg, borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "9px 14px", color: C.muted }}>{i + 1}</td>
                      <td style={{ padding: "9px 14px" }}>
                        <span style={{
                          background: fee.type === "PTA" ? C.accentLight : "#fef3c7",
                          color:      fee.type === "PTA" ? C.accent      : "#92400e",
                          padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 700,
                        }}>{fee.type}</span>
                      </td>
                      <td style={{ padding: "9px 14px" }}>{fee.description}</td>
                      <td style={{ padding: "9px 14px" }}>{fee.grade}</td>
                      <td style={{ padding: "9px 14px" }}>{fee.studentType}</td>
                      <td style={{ padding: "9px 14px" }}>{fee.medium}</td>
                      <td style={{ padding: "9px 14px", textAlign: "right", fontWeight: 700 }}>
                        ₹ {parseFloat(fee.amount).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: C.successLight }}>
                    <td colSpan={6} style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "#166534" }}>Total Amount</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 800, fontSize: 15, color: "#166534" }}>
                      ₹ {totalAmount.toLocaleString("en-IN")}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ── PAYMENT DETAILS ── */}
            <div style={sectionCard}>
              <div style={sectionHeader}><Accent /> Payment Details</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>

                {/* Collection Date */}
                <div>
                  <label style={labelStyle}>Collection Date <span style={{ color: C.danger }}>*</span></label>
                  <input type="date" style={inputStyle} value={collectionDate}
                    max={todayStr} onChange={(e) => setCollectionDate(e.target.value)} />
                </div>

                {/* Payment Mode */}
                <div>
                  <label style={labelStyle}>Payment Mode</label>
                  <select style={inputStyle} value={paymentMode}
                    onChange={(e) => { setPaymentMode(e.target.value); setTransactionId(""); }}>
                    <option value="Cash">Cash</option>
                    <option value="Online">Online</option>
                    <option value="Cheque">Cheque</option>
                    <option value="DD">DD</option>
                  </select>
                </div>

                {/* Transaction ID — only for Online / Cheque / DD */}
                {needsTransactionId ? (
                  <div>
                    <label style={labelStyle}>
                      Transaction ID <span style={{ color: C.danger }}>*</span>
                    </label>
                    <input type="text"
                      style={{ ...inputStyle, border: `1.5px solid ${C.accent}`, background: C.accentLight }}
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder={
                        paymentMode === "Online" ? "Enter UTR / Ref No" :
                        paymentMode === "Cheque" ? "Enter Cheque No"    :
                        "Enter DD Number"
                      }
                    />
                  </div>
                ) : (
                  <div /> /* spacer — keeps grid 4-col */
                )}

                {/* Paid Amount */}
                <div>
                  <label style={labelStyle}>Paid Amount <span style={{ color: C.danger }}>*</span></label>
                  <input type="number" style={inputStyle} value={paidAmount} min={0}
                    onChange={(e) => setPaidAmount(e.target.value)} placeholder="Enter paid amount" />
                </div>

                {/* Balance */}
                <div>
                  <label style={labelStyle}>Balance</label>
                  <input readOnly
                    style={{
                      ...readonlyStyle, fontWeight: 700,
                      color:  paidAmount === "" ? C.muted : balance < 0 ? C.danger : "#166534",
                      border: paidAmount === "" ? `1.5px solid ${C.border}` : balance < 0 ? `1.5px solid ${C.danger}` : `1.5px solid ${C.success}`,
                    }}
                    value={paidAmount !== "" ? `₹ ${balance.toLocaleString("en-IN")}` : "—"} />
                </div>

                {/* Remarks — spans remaining cols */}
                <div style={{ gridColumn: "span 3" }}>
                  <label style={labelStyle}>Remarks</label>
                  <input type="text" style={inputStyle} value={remarks}
                    onChange={(e) => setRemarks(e.target.value)} placeholder="Optional remarks" />
                </div>

              </div>
            </div>
          </>
        )}

        {/* ── ACTION BUTTONS ── */}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 4, marginBottom: 24 }}>
          <button onClick={() => navigate("/annualfee")} disabled={saving}
            style={{ ...btnBase, background: "#fff", color: C.primary, border: `1.5px solid ${C.border}`, padding: "9px 22px" }}>
            <CloseCircleOutlined style={{ fontSize: 15 }} />
            Cancel
          </button>
          <button onClick={handleGenerateFee}
            disabled={!matchedFees.length || saving}
            style={{
              ...btnBase,
              background: !matchedFees.length || saving ? C.border : C.accent,
              color:      !matchedFees.length || saving ? C.muted  : "#fff",
              padding: "9px 22px",
              cursor:  !matchedFees.length || saving ? "not-allowed" : "pointer",
            }}>
            {saving
              ? <><Spin size="small" /> Saving…</>
              : <><SaveOutlined style={{ fontSize: 15 }} /> Save &amp; Generate</>}
          </button>
        </div>

      </div>
    </Layout>
  );
};

export default StudentFeeCollection;
