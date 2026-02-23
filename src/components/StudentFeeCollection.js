import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {Input,InputNumber,Table,Typography,DatePicker,Checkbox,Button,message,Radio,Form,Space,Spin} from "antd";
const BASE = "http://localhost:8080";

const StudentFeeCollection = () => {
  const currentYear = new Date().getFullYear();
  const todayStr = new Date().toISOString().split("T")[0];

  const user = JSON.parse(localStorage.getItem("user") || "{}");
 const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState("SSLC");
  const [startYear, setStartYear] = useState(currentYear);
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filters
  const [pta, setPta] = useState(false);
  const [management, setManagement] = useState(false);
  const [medium, setMedium] = useState("");
  const [studentType, setStudentType] = useState("");

  // Matched fees
  const [matchedFees, setMatchedFees] = useState([]);
  const [noFeeMessage, setNoFeeMessage] = useState("");

  // Payment fields
  const [collectionDate, setCollectionDate] = useState(todayStr);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [paidAmount, setPaidAmount] = useState("");
  const [remarks, setRemarks] = useState("");

  // Receipt
  const [receiptNo, setReceiptNo] = useState("");

  const academicYear = `${startYear}-${startYear + 1}`;

  const totalAmount = matchedFees.reduce(
    (sum, fee) => sum + parseFloat(fee.amount || 0),
    0
  );
  const balance = paidAmount !== "" ? parseFloat(paidAmount) - totalAmount : 0;

  /* ====================================================
     RESET full form
  ==================================================== */
  const resetForm = () => {
    setAdmissionNumber("");
    setStudentData(null);
    setMatchedFees([]);
    setNoFeeMessage("");
    setPta(false);
    setManagement(false);
    setMedium("");
    setStudentType("");
    setPaidAmount("");
    setRemarks("");
    setReceiptNo("");
    setCollectionDate(todayStr);
    setPaymentMode("Cash");
  };

  /* ====================================================
     FETCH NEXT RECEIPT PREVIEW
  ==================================================== */
  const fetchReceiptPreview = async (schoolId) => {
    try {
      const res = await axios.get(
        `${BASE}/feeCollection/nextReceipt?school_id=${schoolId}&academicYear=${academicYear}`
      );
      setReceiptNo(res.data.receiptNo || "");
    } catch (err) {
      console.error("Receipt preview error:", err);
      setReceiptNo(""); // silently fail – will be generated on save
    }
  };

  /* ====================================================
     SEARCH STUDENT
  ==================================================== */
  const handleSearch = async () => {
    if (!admissionNumber.trim()) return alert("Please enter an Admission Number");

    try {
      setStudentData(null);
      setMatchedFees([]);
      setNoFeeMessage("");
      setReceiptNo("");
      setPaidAmount("");
      setLoading(true);

      const url =
        selectedType === "SSLC"
          ? `${BASE}/studentsslc/getByAdmission/${admissionNumber.trim()}?academicYear=${academicYear}`
          : `${BASE}/studenthsc/getByAdmission/${admissionNumber.trim()}?academicYear=${academicYear}`;

      const res = await axios.get(url);

      if (res.data.student) {
        const student = res.data.student;
        setStudentData(student);
        // Pre-fill medium/student type from student record if available
        setStudentType(student.studenttype || student.studentType || "");
        setMedium(student.preferredmedium || student.medium || "");
        // Fetch receipt preview
        await fetchReceiptPreview(student.school_id);
      } else {
        alert("Student Not Found");
      }
    } catch {
      alert("Student Not Found");
    } finally {
      setLoading(false);
    }
  };

  /* ====================================================
     APPLY FILTERS
  ==================================================== */
  const handleSelectFilters = async () => {
    if (!studentData) return alert("Search student first");
    if (!pta && !management) return alert("Select at least one Bill Type (PTA or Management)");
    if (!medium) return alert("Select a Medium");
    if (!studentType) return alert("Select a Student Type");

    setNoFeeMessage("");
    setMatchedFees([]);

    try {
      const res = await axios.get(`${BASE}/raiseFeeDemand/getAllFeeDemand`);
      const allDemands = res.data.data || [];

      // Match by school + academic year
      const matchingDemands = allDemands.filter(
        (d) =>
          d.academic_year === academicYear &&
          String(d.school_id) === String(studentData.school_id)
      );

      if (!matchingDemands.length) {
        setNoFeeMessage(`No fee structure found for Academic Year: ${academicYear}`);
        return;
      }

      // Flatten all fee_details from all matching demands
      let allFeeDetails = [];
      matchingDemands.forEach((demand) => {
        let details = demand.fee_details;
        if (typeof details === "string") {
          try { details = JSON.parse(details); } catch { details = []; }
        }
        if (Array.isArray(details)) {
          allFeeDetails = [...allFeeDetails, ...details];
        }
      });

      const studentGrade = studentData?.Grade?.grade;
      const selectedTypes = [];
      if (pta) selectedTypes.push("PTA");
      if (management) selectedTypes.push("Management");

      const filtered = allFeeDetails.filter(
        (fee) =>
          fee.grade === studentGrade &&
          fee.medium === medium &&
          (fee.studentType === studentType || fee.studentType === "Both") &&
          selectedTypes.includes(fee.type)
      );

      if (!filtered.length) {
        setNoFeeMessage(
          `No fee found for Grade: ${studentGrade}, Medium: ${medium}, Student Type: ${studentType}, Bill Type: ${selectedTypes.join(", ")}`
        );
      } else {
        setMatchedFees(filtered);
        // Auto-fill paid amount with total
        const autoTotal = filtered.reduce((s, f) => s + parseFloat(f.amount || 0), 0);
        setPaidAmount(String(autoTotal));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to fetch fee structure. Please try again.");
    }
  };

  /* ====================================================
     SAVE FEE COLLECTION
  ==================================================== */
  const handleGenerateFee = async () => {
    if (!studentData) return alert("Search student first");
    if (!matchedFees.length) return alert("Apply filters to load fee details first");
    if (!collectionDate) return alert("Select a collection date");
    if (!paidAmount || parseFloat(paidAmount) <= 0) return alert("Enter a valid paid amount");

    try {
      setSaving(true);

      const payload = {
        school_id: studentData.school_id,
        academic_year: academicYear,
        student_id: studentData.id,
        admission_number: studentData.admissionNumber,
        student_name: studentData.name,
        grade: studentData?.Grade?.grade || "",
        section: studentData?.Section?.sectionName || "",
        course: selectedType,
        fee_items: matchedFees,
        medium,
        student_type: studentType,
        total_amount: totalAmount,
        paid_amount: parseFloat(paidAmount),
        payment_mode: paymentMode,
        collection_date: collectionDate,
        collected_by: user?.name || user?.username || "Admin",
        remarks,
      };

      const res = await axios.post(`${BASE}/feeCollection/saveFeeCollection`, payload);

      // Show the saved receipt number
      const savedReceipt = res.data.receipt_no;
      setReceiptNo(savedReceipt);

      alert(`✅ Fee collected successfully!\nReceipt No: ${savedReceipt}`);
      resetForm();

    } catch (err) {
      console.error("Save error:", err);
      const msg = err?.response?.data?.message || "Failed to save fee collection. Please try again.";
      alert(`❌ Error: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  /* ====================================================
     UI
  ==================================================== */
  return (
    <div className="container mt-4">
      <div className="card shadow">
        <div className="card-header bg-primary text-white text-center">
          <h5 className="mb-0">Student Fee Collection</h5>
        </div>

        <div className="card-body">

          {/* ── ROW 1: Course / Academic Year / Admission / Receipt ── */}
          <div className="row mb-3 align-items-end">

            <div className="col-md-2">
              <label className="form-label fw-semibold">Course</label>
              <select
                className="form-control"
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  resetForm();
                }}
              >
                <option value="SSLC">SSLC</option>
                <option value="HSC">HSC</option>
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label fw-semibold">Academic Year</label>
              <div className="d-flex gap-2">
                <input
                  type="number"
                  className="form-control"
                  value={startYear}
                  onChange={(e) => {
                    setStartYear(Number(e.target.value));
                    resetForm();
                  }}
                />
                <input className="form-control" readOnly value={startYear + 1} />
              </div>
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold">Admission No</label>
              <div className="d-flex gap-2">
                <input
                  type="text"
                  className="form-control"
                  value={admissionNumber}
                  onChange={(e) => setAdmissionNumber(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Enter Admission Number"
                />
                <button onClick={handleSearch} className="btn btn-success px-3">
                  {loading
                    ? <span className="spinner-border spinner-border-sm" />
                    : "Search"
                  }
                </button>
              </div>
            </div>

            <div className="col-md-3">
              <label className="form-label fw-semibold">Receipt No</label>
              <input
                className="form-control fw-bold"
                style={{
                  backgroundColor: receiptNo ? "#e8f5e9" : "#f5f5f5",
                  color: receiptNo ? "#2e7d32" : "#999",
                  border: receiptNo ? "1.5px solid #2e7d32" : "1px solid #ccc"
                }}
                readOnly
                value={receiptNo || ""}
                placeholder="Auto-generated after save"
              />
            </div>

          </div>

          {/* ── STUDENT DETAILS ── */}
          {studentData && (
            <div className="border rounded p-3 mb-3" style={{ background: "#f0f7ff" }}>
              <h6 className="text-primary mb-2">📋 Student Details</h6>
              <div className="row">
                <div className="col-md-3"><strong>Name:</strong> {studentData.name}</div>
                <div className="col-md-2"><strong>Grade:</strong> {studentData?.Grade?.grade || "—"}</div>
                <div className="col-md-2"><strong>Section:</strong> {studentData?.Section?.sectionName || "—"}</div>
                <div className="col-md-3"><strong>Admission:</strong> {studentData.admissionNumber}</div>
                <div className="col-md-2"><strong>School ID:</strong> {studentData.school_id}</div>
              </div>
            </div>
          )}

          {/* ── FILTERS ── */}
          <div className="row mb-3 align-items-end">

            <div className="col-md-3">
              <label className="form-label fw-semibold">Bill Type</label>
              <div className="border rounded p-2 bg-white">
                <div className="form-check">
                  <input
                    type="checkbox" className="form-check-input" id="ptaChk"
                    checked={pta}
                    onChange={(e) => { setPta(e.target.checked); setMatchedFees([]); setNoFeeMessage(""); }}
                  />
                  <label className="form-check-label" htmlFor="ptaChk">PTA</label>
                </div>
                <div className="form-check">
                  <input
                    type="checkbox" className="form-check-input" id="mgmtChk"
                    checked={management}
                    onChange={(e) => { setManagement(e.target.checked); setMatchedFees([]); setNoFeeMessage(""); }}
                  />
                  <label className="form-check-label" htmlFor="mgmtChk">Management</label>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <label className="form-label fw-semibold">Medium</label>
              <select
                className="form-control"
                value={medium}
                onChange={(e) => { setMedium(e.target.value); setMatchedFees([]); setNoFeeMessage(""); }}
              >
                <option value="">Select Medium</option>
                <option value="English">English</option>
                <option value="Tamil">Tamil</option>
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label fw-semibold">Student Type</label>
              <select
                className="form-control"
                value={studentType}
                onChange={(e) => { setStudentType(e.target.value); setMatchedFees([]); setNoFeeMessage(""); }}
              >
                <option value="">Select Type</option>
                <option value="Old">Old</option>
                <option value="New">New</option>
              </select>
            </div>

            <div className="col-md-3">
              <button className="btn btn-info w-100 fw-semibold" onClick={handleSelectFilters}>
                Apply Filters
              </button>
            </div>

          </div>

          {/* ── NO FEE MESSAGE ── */}
          {noFeeMessage && (
            <div className="alert alert-warning text-center">{noFeeMessage}</div>
          )}

          {/* ── MATCHED FEE TABLE ── */}
          {matchedFees.length > 0 && (
            <>
              <h6 className="text-success mb-2">
                ✅ Fee Structure Matched ({matchedFees.length} item{matchedFees.length > 1 ? "s" : ""})
              </h6>

              <table className="table table-bordered table-hover mb-3">
                <thead className="table-dark">
                  <tr>
                    <th>#</th>
                    <th>Fee Type</th>
                    <th>Description</th>
                    <th>Grade</th>
                    <th>Student Type</th>
                    <th>Medium</th>
                    <th className="text-end">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {matchedFees.map((fee, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>
                        <span className={`badge ${fee.type === "PTA" ? "bg-info" : "bg-warning text-dark"}`}>
                          {fee.type}
                        </span>
                      </td>
                      <td>{fee.description}</td>
                      <td>{fee.grade}</td>
                      <td>{fee.studentType}</td>
                      <td>{fee.medium}</td>
                      <td className="text-end fw-bold">₹ {parseFloat(fee.amount).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="table-success">
                    <td colSpan={6} className="text-end fw-bold">Total Amount</td>
                    <td className="text-end fw-bold fs-6">₹ {totalAmount.toLocaleString("en-IN")}</td>
                  </tr>
                </tfoot>
              </table>

              {/* ── PAYMENT DETAILS ── */}
              <div className="card border-primary mb-3">
                <div className="card-header bg-primary text-white fw-semibold">
                  💳 Payment Details
                </div>
                <div className="card-body">
                  <div className="row g-3">

                    <div className="col-md-3">
                      <label className="form-label fw-semibold">
                        Collection Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        value={collectionDate}
                        max={todayStr}
                        onChange={(e) => setCollectionDate(e.target.value)}
                      />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Payment Mode</label>
                      <select
                        className="form-control"
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                      >
                        <option value="Cash">Cash</option>
                        <option value="Online">Online</option>
                        <option value="Cheque">Cheque</option>
                        <option value="DD">DD</option>
                      </select>
                    </div>

                    <div className="col-md-3">
                      <label className="form-label fw-semibold">
                        Paid Amount <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        value={paidAmount}
                        min={0}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        placeholder="Enter paid amount"
                      />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Balance</label>
                      <input
                        className={`form-control fw-bold ${balance < 0 ? "text-danger" : "text-success"}`}
                        readOnly
                        value={paidAmount !== "" ? `₹ ${balance.toLocaleString("en-IN")}` : "—"}
                      />
                    </div>

                    <div className="col-md-12">
                      <label className="form-label fw-semibold">Remarks</label>
                      <input
                        type="text"
                        className="form-control"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Optional remarks"
                      />
                    </div>

                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── GENERATE BUTTON ── */}
         <Form.Item>
  <Space style={{ width: "100%", justifyContent: "space-between" }}>
    
    {/* Cancel Button */}
    <Button
     onClick={() => navigate("/annualfee")}
      disabled={saving}
      style={{
        width: "100%",
        backgroundColor: "#faad14",
        color: "#fff",
        border: "none",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#d48806")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#faad14")}
    >
      Cancel
    </Button>

    {/* Generate Button */}
    <Button
      type="primary"
      onClick={handleGenerateFee}
      disabled={!matchedFees.length || saving}
      style={{ width: "100%" }}
    >
      {saving ? <Spin size="small" /> : "Generate Fee & Save"}
    </Button>

  </Space>
</Form.Item>
        </div>
      </div>
    </div>
  );
};

export default StudentFeeCollection;