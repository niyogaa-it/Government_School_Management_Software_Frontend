import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";

const BASE = "http://localhost:8080";

const ACADEMIC_YEAR_OPTIONS = [
  
  "2024 - 2025",
  "2025 - 2026",
  "2026 - 2027",
];

const GRADE_OPTIONS = [
  "I", "II", "III", "IV", "V",
  "VI", "VII", "VIII", "IX", "X",
  "XI", "XII",
];

const FeeCollectionList = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const rawRole = (user?.roleName || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  const isAdmin = rawRole === "superadmin";
  const schoolId = user?.school?.id || null;

  const [allData, setAllData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filterYear, setFilterYear] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  const [filterMedium, setFilterMedium] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterAdmission, setFilterAdmission] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const [sectionOptions, setSectionOptions] = useState([]);
  const [mediumOptions, setMediumOptions] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [
    allData,
    filterYear,
    filterCourse,
    filterMedium,
    filterGrade,
    filterSection,
    filterAdmission,
    filterDate,
  ]);

  const fetchAll = async () => {
    try {
      setLoading(true);

      let url;
      if (isAdmin) {
        url = `${BASE}/feeCollection/getAllRecords`;
      } else if (schoolId) {
        url = `${BASE}/feeCollection/getAllBySchool/${schoolId}`;
      } else {
        url = `${BASE}/feeCollection/getAllRecords`;
      }

      const res = await axios.get(url);
      const data = res.data.data || [];

      setAllData(data);

      setSectionOptions(
        [...new Set(data.map((c) => c.section).filter(Boolean))].sort()
      );
      setMediumOptions(
        [...new Set(data.map((c) => c.medium).filter(Boolean))].sort()
      );
    } catch (err) {
      alert("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...allData];
    const norm = (y) => y?.replace(/\s*-\s*/g, "-").trim();

    if (filterYear)
      result = result.filter(
        (c) => norm(c.academic_year) === norm(filterYear)
      );

    if (filterCourse)
      result = result.filter((c) => c.course === filterCourse);

    if (filterMedium)
      result = result.filter(
        (c) =>
          c.medium?.toLowerCase() === filterMedium.toLowerCase()
      );

    if (filterGrade)
      result = result.filter((c) => c.grade === filterGrade);

    if (filterSection)
      result = result.filter((c) => c.section === filterSection);

    if (filterAdmission)
      result = result.filter((c) =>
        c.admission_number
          ?.toLowerCase()
          .includes(filterAdmission.toLowerCase())
      );

    if (filterDate)
      result = result.filter(
        (c) => c.collection_date === filterDate
      );

    setFiltered(result);
  };

  const handleReset = () => {
    setFilterYear("");
    setFilterCourse("");
    setFilterMedium("");
    setFilterGrade("");
    setFilterSection("");
    setFilterAdmission("");
    setFilterDate("");
  };

  const formatDate = (d) => {
    if (!d) return "—";
    const str =
      typeof d === "string" ? d.split("T")[0] : String(d);
    const parts = str.split("-");
    if (parts.length === 3)
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return d;
  };

  const formatINR = (val) =>
    `Rs. ${parseFloat(val || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
    })}`;

  const totalPaid = filtered.reduce(
    (sum, c) => sum + parseFloat(c.paid_amount || 0),
    0
  );

  const totalBalance = filtered.reduce(
    (sum, c) => sum + parseFloat(c.balance_amount || 0),
    0
  );

  return (
    <div style={{ display: "flex" }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div
        style={{
          marginLeft: "240px", // must match sidebar width
          width: "100%",
          padding: "20px",
        }}
      >

{/* Header */}
<div className="d-flex justify-content-between align-items-center mb-3">
  <h4 style={{ fontWeight: "bold", margin: 0 }}>
    Fee Collection List
  </h4>

 
</div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
         <button
    className="btn btn-primary btn-sm"
    onClick={() => navigate("/studentfee")}
  >
    Create Student Fee 
  </button>
        {/* <span style={{
          backgroundColor: isAdmin ? "#d1e7dd" : "#cfe2ff",
          color: isAdmin ? "#0a3622" : "#084298",
          padding: "3px 12px", borderRadius: "12px", fontSize: "13px", fontWeight: 600
        }}>
          {isAdmin
            ? `${user?.roleName || "superadmin"} — all schools`
            : `${user?.school?.name || `School ID: ${schoolId}`}`}
        </span> */}
      </div>

      {/* ── FILTER CARD ── */}
      <div className="card mb-4" style={{ border: "1px solid #dee2e6", borderRadius: "8px" }}>
        <div className="card-header"
          style={{ backgroundColor: "#1976d2", color: "#fff", fontWeight: 600 }}>
         Filter Records &nbsp;
          <small style={{ fontWeight: 400, opacity: 0.85 }}>
            — showing {filtered.length} of {allData.length} total records
          </small>
        </div>

        <div className="card-body">
          <div className="row g-3">

            {/* Academic Year */}
            <div className="col-md-2">
              <label className="form-label fw-semibold">Academic Year</label>
              <select className="form-control form-control-sm" value={filterYear}
                onChange={e => setFilterYear(e.target.value)}>
                <option value="">All Years</option>
                {ACADEMIC_YEAR_OPTIONS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Course */}
            <div className="col-md-2">
              <label className="form-label fw-semibold">Course</label>
              <select className="form-control form-control-sm" value={filterCourse}
                onChange={e => setFilterCourse(e.target.value)}>
                <option value="">All</option>
                <option value="SSLC">SSLC</option>
                <option value="HSC">HSC</option>
              </select>
            </div>

            {/* ✅ Medium — dynamic from DB (Tamil + English + whatever else is in DB) */}
            <div className="col-md-2">
              <label className="form-label fw-semibold">Medium</label>
              <select className="form-control form-control-sm" value={filterMedium}
                onChange={e => setFilterMedium(e.target.value)}>
                <option value="">All</option>
                {mediumOptions.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* ✅ Grade — full static list I to XII */}
            <div className="col-md-2">
              <label className="form-label fw-semibold">Grade</label>
              <select className="form-control form-control-sm" value={filterGrade}
                onChange={e => setFilterGrade(e.target.value)}>
                <option value="">All</option>
                {GRADE_OPTIONS.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* ✅ Section — dynamic from all DB records */}
            <div className="col-md-2">
              <label className="form-label fw-semibold">Section</label>
              <select className="form-control form-control-sm" value={filterSection}
                onChange={e => setFilterSection(e.target.value)}>
                <option value="">All</option>
                {sectionOptions.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Collection Date */}
            <div className="col-md-2">
              <label className="form-label fw-semibold">Collection Date</label>
              <input type="date" className="form-control form-control-sm" value={filterDate}
                onChange={e => setFilterDate(e.target.value)} />
            </div>

            {/* Admission Number */}
            <div className="col-md-3">
              <label className="form-label fw-semibold">Admission Number</label>
              <input type="text" className="form-control form-control-sm"
                placeholder="Search admission no..." value={filterAdmission}
                onChange={e => setFilterAdmission(e.target.value)} />
            </div>

            {/* Buttons */}
            <div className="col-md-3 d-flex align-items-end gap-2">
              <button className="btn btn-warning btn-sm w-50" onClick={handleReset}>
                Reset
              </button>
              <button className="btn btn-primary btn-sm w-50"
                onClick={fetchAll} disabled={loading}>
                {loading
                  ? <span className="spinner-border spinner-border-sm" />
                  : "Refresh"}
              </button>
            </div>

            {/* Summary */}
            <div className="col-md-6 d-flex align-items-end gap-2">
              <div className="flex-fill text-center rounded py-2"
                style={{ backgroundColor: "#e8f5e9", border: "1px solid #a5d6a7" }}>
                <small className="text-muted d-block">
                  {filtered.length} record{filtered.length !== 1 ? "s" : ""} | Total Paid
                </small>
                <span style={{ color: "#2e7d32", fontWeight: "bold", fontSize: "15px" }}>
                  {formatINR(totalPaid)}
                </span>
              </div>
              {totalBalance > 0 && (
                <div className="flex-fill text-center rounded py-2"
                  style={{ backgroundColor: "#fdecea", border: "1px solid #f5c6cb" }}>
                  <small className="text-muted d-block">Total Balance Due</small>
                  <span style={{ color: "#dc3545", fontWeight: "bold", fontSize: "15px" }}>
                    {formatINR(totalBalance)}
                  </span>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ── TABLE ── */}
      {loading ? (
        <div className="text-center py-5">
          <span className="spinner-border text-primary" />
          <div className="mt-2 text-muted">Loading...</div>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="table table-bordered"
            style={{ borderCollapse: "collapse", width: "100%", minWidth: "1050px" }}>
            <thead>
              <tr style={{ backgroundColor: "#212529", color: "#fff" }}>
                <th style={thStyle}>S.No</th>
                <th style={thStyle}>Receipt No</th>
                <th style={thStyle}>Admission No</th>
                <th style={thStyle}>Student Name</th>
                <th style={thStyle}>Academic Year</th>
                <th style={thStyle}>Course</th>
                <th style={thStyle}>Grade</th>
                <th style={thStyle}>Section</th>
                <th style={thStyle}>Medium</th>
                <th style={thStyle}>Fee Type</th>
                <th style={thStyle}>Paid Amount</th>
                <th style={thStyle}>Balance</th>
                <th style={thStyle}>Payment Mode</th>
                <th style={thStyle}>Collection Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={14} className="text-center text-muted py-4">
                    {allData.length === 0
                      ? "No fee collections found. Open browser console (F12) for debug info."
                      : "No records match the selected filters — click Reset to clear"}
                  </td>
                </tr>
              ) : (
                filtered.map((c, i) => {
                  let feeItemsArr = c.fee_items || [];
                  if (typeof feeItemsArr === "string") {
                    try { feeItemsArr = JSON.parse(feeItemsArr); } catch { feeItemsArr = []; }
                  }
                  if (!Array.isArray(feeItemsArr)) feeItemsArr = [];
                  const feeTypes = [...new Set(feeItemsArr.map(f => f.type).filter(Boolean))];

                  return (
                    <tr key={c.id} style={{ backgroundColor: "#fff" }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f0f4ff")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#fff")}>
                      <td style={tdStyle}>{i + 1}</td>
                      <td style={tdStyle}>
                        <span style={{
                          backgroundColor: "#343a40", color: "#fff",
                          padding: "2px 8px", borderRadius: "4px",
                          fontSize: "12px", whiteSpace: "nowrap"
                        }}>
                          {c.receipt_no}
                        </span>
                      </td>
                      <td style={tdStyle}>{c.admission_number}</td>
                      <td style={{ ...tdStyle, fontWeight: "600" }}>{c.student_name}</td>
                      <td style={tdStyle}>{c.academic_year}</td>
                      <td style={tdStyle}>{c.course || "—"}</td>
                      <td style={tdStyle}>{c.grade || "N/A"}</td>
                      <td style={tdStyle}>{c.section || "N/A"}</td>
                      <td style={tdStyle}>{c.medium || "—"}</td>
                      <td style={tdStyle}>
                        {feeTypes.length === 0 ? "—" : feeTypes.map(t => (
                          <span key={t} style={{
                            backgroundColor: t === "PTA" ? "#0dcaf0" : "#ffc107",
                            color: t === "PTA" ? "#fff" : "#000",
                            padding: "2px 8px", borderRadius: "4px",
                            fontSize: "12px", marginRight: "4px", whiteSpace: "nowrap"
                          }}>{t}</span>
                        ))}
                      </td>
                      <td style={{ ...tdStyle, color: "#198754", fontWeight: "bold" }}>
                        {formatINR(c.paid_amount)}
                      </td>
                      <td style={{
                        ...tdStyle,
                        color: parseFloat(c.balance_amount) > 0 ? "#dc3545" : "#6c757d",
                        fontWeight: parseFloat(c.balance_amount) > 0 ? "bold" : "normal"
                      }}>
                        {formatINR(c.balance_amount)}
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          backgroundColor:
                            c.payment_mode === "Cash"   ? "#198754" :
                            c.payment_mode === "Online" ? "#0d6efd" :
                            c.payment_mode === "Cheque" ? "#6f42c1" : "#6c757d",
                          color: "#fff", padding: "2px 8px",
                          borderRadius: "4px", fontSize: "12px"
                        }}>
                          {c.payment_mode || "Cash"}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                        {formatDate(c.collection_date)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr style={{ backgroundColor: "#d4edda", fontWeight: "bold" }}>
                  <td colSpan={10} style={{ ...tdStyle, textAlign: "right" }}>
                    Total ({filtered.length} records)
                  </td>
                  <td style={{ ...tdStyle, color: "#155724" }}>{formatINR(totalPaid)}</td>
                  <td style={{ ...tdStyle, color: totalBalance > 0 ? "#dc3545" : "#6c757d" }}>
                    {formatINR(totalBalance)}
                  </td>
                  <td colSpan={2} style={tdStyle} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ textAlign: "right", marginTop: "10px" }}>
          <button className="btn btn-outline-secondary btn-sm" onClick={() => window.print()}>
            🖨️ Print
          </button>
        </div>
      )}

    </div>
  
  </div>
  
  );
};
const thStyle = {
  padding: "12px 15px", textAlign: "left", fontWeight: "600",
  fontSize: "14px", borderBottom: "2px solid #444", whiteSpace: "nowrap",
};
const tdStyle = {
  padding: "10px 15px", fontSize: "14px",
  verticalAlign: "middle", borderBottom: "1px solid #dee2e6",
};

export default FeeCollectionList;