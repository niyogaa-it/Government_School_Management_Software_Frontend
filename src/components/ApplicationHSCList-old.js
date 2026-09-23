// import React, { useEffect, useState } from "react";
// import { useNavigate, useLocation } from "react-router-dom";
// import axios from "axios";
// import { message, Modal, Descriptions, Select, Tooltip } from "antd";
// import Layout from "./Layout";
// import { EyeOutlined, EditOutlined, CheckCircleOutlined, DeleteOutlined, LeftOutlined, RightOutlined, PrinterOutlined } from "@ant-design/icons";
// import { useFilter } from "./FilterContext";
// import * as XLSX from "xlsx";
// import dayjs from "dayjs";

// const { Option } = Select;
// const PAGE_SIZE = 25;

// const COLOR = { blue:"#1e40af", blueLt:"#3b82f6", text:"#1e293b", textMid:"#475569", textSoft:"#64748b", border:"#e2e8f0", rowOdd:"#ffffff", rowEven:"#f8fafc", rowHover:"#eff6ff", headBg:"#1a2236", headText:"#ffffff", danger:"#e21216", dangerBg:"rgba(226,18,22,0.08)", viewBg:"rgba(30,64,175,0.08)", editColor:"#0891b2", editBg:"rgba(8,145,178,0.08)", admitColor:"#16a34a", admitBg:"rgba(22,163,74,0.1)", filterBg:"#eff6ff", filterText:"#1a3c6e" };
// const FF = "'Segoe UI', system-ui, sans-serif";
// const FS = "13.5px";

// const IconBtn = ({ icon, title, color, bg, onClick }) => {
//   const [hov, setHov] = useState(false);
//   return (
//     <button title={title} onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
//       style={{ all:"unset", width:32, height:32, borderRadius:7, display:"inline-flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:16, transition:"all 0.15s", color:hov?color:COLOR.textMid, background:hov?bg:"transparent" }}>
//       {icon}
//     </button>
//   );
// };

// const ProgressBar = ({ value }) => {
//   const color = value===100?"#16a34a":value>=80?"#7de24a":value>=60?"#f7de40":value>=40?"#ff9b31":"#f86b6e";
//   return (
//     <div style={{ display:"flex", alignItems:"center", gap:8 }}>
//       <div style={{ width:90, height:7, background:"#e2e8f0", borderRadius:4, overflow:"hidden" }}>
//         <div style={{ width:`${value}%`, height:"100%", background:color, borderRadius:4, transition:"width 0.3s" }} />
//       </div>
//       <span style={{ fontSize:"12px", fontWeight:600, color:value===100?COLOR.admitColor:COLOR.textMid, minWidth:32 }}>{value}%</span>
//     </div>
//   );
// };

// const ApplicationHSCList = () => {
//   const [applicationhscs, setApplicationhscs] = useState([]);
//   const [selectedApplication, setSelectedApplication] = useState(null);
//   const [isModalVisible, setIsModalVisible] = useState(false);
//   const [hoveredRow, setHoveredRow] = useState(null);
//   const [filterGrade, setFilterGrade] = useState("");
//   const [currentPage, setCurrentPage] = useState(1);
//   const navigate = useNavigate();
//   const location = useLocation();
//   const user = JSON.parse(localStorage.getItem("user"));
//   const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
//   const isSuperAdmin = role === "superadmin";
//   const { selectedSchool, selectedYear, selectedSchoolName } = useFilter();

//   useEffect(() => { fetchApplicationhsc(); }, [selectedSchool, selectedYear, location.pathname]);
//   useEffect(() => { setCurrentPage(1); }, [applicationhscs, filterGrade]);

//   const fetchApplicationhsc = async () => {
//     try {
//       let response;
//       const schoolId = isSuperAdmin ? (selectedSchool === "all" ? null : selectedSchool) : user?.school?.id;
//       if (schoolId) {
//         response = await axios.get(`${process.env.REACT_APP_API_URL}/applicationhsc/getApplicationhscsBySchool/${schoolId}`);
//       } else {
//         response = await axios.get(`${process.env.REACT_APP_API_URL}/applicationhsc/getAllApplicationhsc`);
//       }
//       let data = (response.data.applicationhscs || []);
//       if (selectedYear) data = data.filter(app => app.academicYear === selectedYear);
//       const formatted = data.filter(app => app.studentStatus === "Applied").sort((a,b) => b.id-a.id).map(app => ({ ...app, Grade: app.Grade || { grade:"N/A" } }));
//       setApplicationhscs(formatted);
//     } catch (error) { message.error(error.response?.data?.details || "Failed to fetch applications"); }
//   };

//   const calculateProgress = (application) => {
//     const fieldsByStep = [
//       ["academicYear","school_id","emisNum","aadharNumber"],
//       ["name","gender","grade_id","dob","age","nationality","state","motherTongue","community","bloodGroup"],
//       ["fatherName","motherName","fatherOccupation","motherOccupation","fatherIncome","motherIncome","address","pincode","mobileNumber"],
//       ["photocopyofTC","previousmedium"],
//       ["bankName","branchName","accountNumber","ifsccode"]
//     ];
//     let completedSteps = 0;
//     for (let step of fieldsByStep) { if (step.every(f => application[f])) completedSteps++; }
//     return completedSteps * 20;
//   };

//   const handleAdmit = async (application) => {
//     if (!window.confirm(`Are you sure you want to admit ${application.name}?`)) return;
//     try {
//       const res = await axios.post(`${process.env.REACT_APP_API_URL}/applicationhsc/admit/${application.id}`);
//       message.success(`Admitted successfully. Admission No: ${res.data.admissionNumber}`);
//       fetchApplicationhsc();
//     } catch (error) { message.error(error.response?.data?.error || "Failed to admit student"); }
//   };

//   const handleView = async (id) => {
//     try {
//       const res = await axios.get(`${process.env.REACT_APP_API_URL}/applicationhsc/getApplicationhscById/${id}`);
//       setSelectedApplication(res.data.application); setIsModalVisible(true);
//     } catch { message.error("Failed to fetch application details"); }
//   };

//   const handlePrint = (application) => {
//     const app = application || selectedApplication;
//     if (!app) return;
//     const school = app.School || {};
//     const formatAgeLocal = (age) => {
//       if (!age || typeof age !== "object") return "N/A";
//       const { years=0, months=0, days=0 } = age;
//       return `${years} yr${years!==1?"s":""}, ${months} mo${months!==1?"s":""}, ${days} day${days!==1?"s":""}`;
//     };
//     const val = (v) => v || "—";
//     const field = (label, value) =>
//       `<div class="field-box"><div class="field-label">${label}</div><div class="field-value">${val(value)}</div></div>`;
//     const sectionTitle = (title) =>
//       `<div class="section-title">${title}</div>`;

//     const html = `<!DOCTYPE html>
// <html>
// <head>
// <meta charset="UTF-8"/>
// <title>Application \u2013 ${app.name || ""}</title>
// <style>
//   * { box-sizing: border-box; margin: 0; padding: 0; }
//   body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1e293b; background: #fff; }
//   @page { size: A4; margin: 15mm 12mm; }
//   @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none; } }
//   .header { display: flex; align-items: center; gap: 18px; padding-bottom: 14px; border-bottom: 2.5px solid #1e40af; margin-bottom: 16px; }
//   .logo-wrap { width: 150px; height: 150px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
//   .logo-wrap img { width: 100%; height: 100%; object-fit: contain; }
//   .logo-placeholder { font-size: 30px; }
//   .school-info { flex: 1; }
//   .school-name { font-size: 17px; font-weight: 700; color: #1a2236; letter-spacing: -0.3px; line-height: 1.3; }
//   .school-meta { margin-top: 2px; display: flex; flex-direction: column; gap: 3px; }
//   .school-meta-row { font-size: 11.5px; color: #475569; }
//   .app-number-badge { text-align: right; flex-shrink: 0; }
//   .app-number-badge .label { font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px; }
//   .app-number-badge .value { font-size: 15px; font-weight: 700; color: #1e40af; margin-top: 2px; }
//   .app-number-badge .year { font-size: 11px; color: #64748b; margin-top: 2px; }
//   .section-title { font-size: 11px; font-weight: 700; color: #fff; background: #1a2236; padding: 5px 12px; border-radius: 5px; margin: 14px 0 8px; text-transform: uppercase; letter-spacing: 0.6px; }
//   .fields-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: #e2e8f0; border: 1px solid #e2e8f0; border-radius: 7px; overflow: hidden; }
//   .fields-grid-2 { grid-template-columns: repeat(2, 1fr); }
//   .field-box { background: #fff; padding: 7px 11px; }
//   .field-box:nth-child(even) { background: #f8fafc; }
//   .field-label { font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 2px; }
//   .field-value { font-size: 12px; color: #1e293b; font-weight: 500; word-break: break-word; }
//   .field-full { grid-column: 1 / -1; }
//   .footer { margin-top: 22px; border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; align-items: flex-end; }
//   .footer-sig { text-align: center; }
//   .footer-sig .sig-line { width: 120px; border-top: 1px solid #1e293b; margin: 0 auto 4px; padding-top: 4px; font-size: 10.5px; color: #475569; }
// </style>
// </head>
// <body>
//   <div class="header">
//     <div class="logo-wrap">
//       ${school.logo ? `<img src="${school.logo}" alt="logo"/>` : `<span class="logo-placeholder">\uD83C\uDFEB</span>`}
//     </div>
//     <div class="school-info">
//       <div class="school-name">${val(school.name)}</div>
//       <div class="school-meta">
//         ${school.address || school.city ? `<div class="school-meta-row">${[school.address, school.city, school.state, school.pincode].filter(Boolean).join(", ")}</div>` : ""}
//         ${school.phoneNumber ? `<div class="school-meta-row">${school.phoneNumber}</div>` : ""}
//         ${school.email ? `<div class="school-meta-row">${school.email}</div>` : ""}
//       </div>
//     </div>
//     <div class="app-number-badge">
//       <div class="label">Application No</div>
//       <div class="value">${val(app.applicationNumber)}</div>
//       <div class="year">${val(app.academicYear)}</div>
//     </div>
//   </div>
//   ${sectionTitle("Basic Information")}
//   <div class="fields-grid">
//     ${field("EMIS Number", app.emisNum)}
//     ${field("Aadhar Number", app.aadharNumber)}
//     ${field("Grade", app.Grade?.grade)}
//   </div>
//   ${sectionTitle("Personal Details")}
//   <div class="fields-grid">
//     ${field("Full Name", app.name)}
//     ${field("Gender", app.gender)}
//     ${field("Date of Birth", app.dob)}
//     ${field("Age", formatAgeLocal(app.age))}
//     ${field("Nationality", app.nationality)}
//     ${field("State", app.state)}
//     ${field("Mother Tongue", app.motherTongue)}
//     ${field("Religion", app.religion)}
//     ${field("Community", app.community)}
//     ${field("Caste", app.caste)}
//     ${field("Blood Group", app.bloodGroup)}
//     ${field("Living With", app.living)}
//     ${field("Identification Marks", app.identificationmarks)}
//     ${field("Scheduled Caste/Tribe?", app.scheduledcasteOrtribecommunity)}
//     ${field("Backward Caste?", app.backwardcaste)}
//     ${field("Tribe to Other Religion?", app.tribeTootherreligion)}
//     ${field("Birth District", app.birthdistrict)}
//   </div>
//   ${sectionTitle("Family & Contact Details")}
//   <div class="fields-grid">
//     ${field("Father's Name", app.fatherName)}
//     ${field("Mother's Name", app.motherName)}
//     ${field("Father's Occupation", app.fatherOccupation)}
//     ${field("Mother's Occupation", app.motherOccupation)}
//     ${field("Father's Income", app.fatherIncome)}
//     ${field("Mother's Income", app.motherIncome)}
//     ${field("Mobile Number", app.mobileNumber)}
//     ${field("Telephone Number", app.telephoneNumber)}
//     ${field("Pincode", app.pincode)}
//     <div class="field-box field-full"><div class="field-label">Address</div><div class="field-value">${val(app.address)}</div></div>
//   </div>
//   ${sectionTitle("Guardian Details")}
//   <div class="fields-grid">
//     ${field("Guardian Name", app.guardianName)}
//     ${field("Guardian Occupation", app.guardianOccupation)}
//     ${field("Guardian Phone", app.guardianNumber)}
//     <div class="field-box field-full"><div class="field-label">Guardian Address</div><div class="field-value">${val(app.guardianAddress)}</div></div>
//   </div>
//   ${sectionTitle("SSLC Academic Details")}
//   <div class="fields-grid">
//     ${field("Exam Year", app.examYear)}
//     ${field("Registration Number", app.registrationnumber)}
//     ${field("Tamil", app.tamil)}
//     ${field("English", app.english)}
//     ${field("Mathematics", app.maths)}
//     ${field("Science", app.science)}
//     ${field("Social Science", app.social)}
//     ${field("Total", app.total)}
//     ${field("Percentage", app.percentage)}
//   </div>
//   ${sectionTitle("Academic Details")}
//   <div class="fields-grid">
//     ${field("TC Photocopy Submitted?", app.photocopyofTC)}
//     ${field("Previous Medium", app.previousmedium)}
//     ${field("Preferred Medium", app.preferredmedium)}
//   </div>
//   ${sectionTitle("Bank Details")}
//   <div class="fields-grid">
//     ${field("Bank Name", app.bankName)}
//     ${field("Branch Name", app.branchName)}
//     ${field("Account Number", app.accountNumber)}
//     ${field("IFSC Code", app.ifsccode)}
//   </div>
//   <div class="footer">
//     <div class="footer-sig"><div class="sig-line">Parent / Guardian Signature</div></div>
//     <div class="footer-sig"><div class="sig-line">Applicant Signature</div></div>
//     <div class="footer-sig"><div class="sig-line">Principal Signature</div></div>
//   </div>
// </body>
// </html>`;

//     const win = window.open("", "_blank", "width=900,height=700");
//     win.document.write(html);
//     win.document.close();
//     win.onload = () => { win.focus(); win.print(); };
//   };

//   const handleDelete = async (id, name) => {
//     if (!window.confirm(`Are you sure you want to remove application of ${name}?`)) return;
//     try {
//       await axios.put(`${process.env.REACT_APP_API_URL}/applicationhsc/updateStatus/${id}`);
//       message.success("Application removed successfully"); fetchApplicationhsc();
//     } catch { message.error("Failed to remove application"); }
//   };

//   const formatAge = (age) => {
//     if (!age || typeof age !== "object") return "N/A";
//     const { years=0, months=0, days=0 } = age;
//     return `${years} year${years!==1?"s":""}, ${months} month${months!==1?"s":""}, ${days} day${days!==1?"s":""}`;
//   };

//   // const formatAge = (age) => {
//   //   if (!age || typeof age !== "object") return "N/A";
//   //   const { years=0, months=0, days=0 } = age;
//   //   return `${years} year${years!==1?"s":""}, ${months} month${months!==1?"s":""}, ${days} day${days!==1?"s":""}`;
//   // };

//   // ── Grade options derived from data ──────────────────────────────────────
//   const gradeOptions = React.useMemo(() => {
//     const map = new Map();
//     applicationhscs.forEach(a => {
//       const id = a.Grade?.id || a.grade_id;
//       const name = a.Grade?.grade;
//       if (id && name && name !== "N/A") map.set(id, name);
//     });
//     return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
//   }, [applicationhscs]);

//   const filteredApps = React.useMemo(() => {
//     return applicationhscs.filter(a =>
//       !filterGrade || String(a.Grade?.id || a.grade_id) === String(filterGrade)
//     );
//   }, [applicationhscs, filterGrade]);

//   const totalPages  = Math.ceil(filteredApps.length / PAGE_SIZE);
//   const pagedApps   = filteredApps.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

//   const getPaginationPages = () => {
//     const pages = [];
//     if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
//     else {
//       pages.push(1);
//       if (currentPage > 3) pages.push("...");
//       for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
//       if (currentPage < totalPages - 2) pages.push("...");
//       pages.push(totalPages);
//     }
//     return pages;
//   };

//   // ── Excel Download ────────────────────────────────────────────────────────
//   const handleDownloadExcel = () => {
//     if (filteredApps.length === 0) { message.warning("No data to export."); return; }
//     const rows = filteredApps.map((a, i) => ({
//       "S.No":               i + 1,
//       "Application Number": a.applicationNumber || "",
//       "School":             a.School?.name || "",
//       "Academic Year":      a.academicYear || "",
//       "EMIS Number":        a.emisNum || "",
//       "Aadhar Number":      a.aadharNumber || "",
//       "Name":               a.name || "",
//       "Gender":             a.gender || "",
//       "Grade":              a.Grade?.grade || "",
//       "Date of Birth":      a.dob || "",
//       "Nationality":        a.nationality || "",
//       "State":              a.state || "",
//       "Mother Tongue":      a.motherTongue || "",
//       "Religion":           a.religion || "",
//       "Community":          a.community || "",
//       "Caste":              a.caste || "",
//       "Blood Group":        a.bloodGroup || "",
//       "Living With":        a.living || "",
//       "Scheduled Caste/Tribe": a.scheduledcasteOrtribecommunity || "",
//       "Backward Caste":     a.backwardcaste || "",
//       "Convert from Hinduism": a.tribeTootherreligion || "",
//       "Birth District":     a.birthdistrict || "",
//       "Father Name":        a.fatherName || "",
//       "Mother Name":        a.motherName || "",
//       "Father Occupation":  a.fatherOccupation || "",
//       "Mother Occupation":  a.motherOccupation || "",
//       "Father Income":      a.fatherIncome || "",
//       "Mother Income":      a.motherIncome || "",
//       "Address":            a.address || "",
//       "Pincode":            a.pincode || "",
//       "Mobile Number":      a.mobileNumber || "",
//       "Telephone Number":   a.telephoneNumber || "",
//       "Guardian Name":      a.guardianName || "",
//       "Guardian Occupation":a.guardianOccupation || "",
//       "Guardian Address":   a.guardianAddress || "",
//       "Guardian Phone":     a.guardianNumber || "",
//       "Exam Year":          a.examYear || "",
//       "Registration Number":a.registrationnumber || "",
//       "Tamil":              a.tamil || "",
//       "English":            a.english || "",
//       "Mathematics":        a.maths || "",
//       "Science":            a.science || "",
//       "Social Science":     a.social || "",
//       "Total":              a.total || "",
//       "Percentage":         a.percentage || "",
//       "TC Photocopy":       a.photocopyofTC || "",
//       "Previous Medium":    a.previousmedium || "",
//       "Preferred Medium":   a.preferredmedium || "",
//       "Bank Name":          a.bankName || "",
//       "Branch Name":        a.branchName || "",
//       "Account Number":     a.accountNumber || "",
//       "IFSC Code":          a.ifsccode || "",
//       "Status":             a.studentStatus || "",
//     }));
//     const ws = XLSX.utils.json_to_sheet(rows);
//     const colWidths = Object.keys(rows[0] || {}).map(key => ({
//       wch: Math.max(key.length, ...rows.map(r => String(r[key] || "").length), 10)
//     }));
//     ws["!cols"] = colWidths;
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, "HSC Applications");
//     XLSX.writeFile(wb, `HSC_Applications${selectedYear ? `_${selectedYear}` : ""}_${dayjs().format("YYYY-MM-DD")}.xlsx`);
//     message.success(`Exported ${filteredApps.length} records to Excel`);
//   };

//   const cols = ["S.No","Application No","School","Academic Year","Name","Gender","Grade","Progress","Action"];

//   return (
//     <Layout>
//       <div className="app-page" style={{ fontFamily:FF }}>
//         <div style={{ marginBottom:22 }}>
//           <h1 style={{ fontSize:22, fontWeight:700, color:COLOR.text, margin:0, letterSpacing:"-0.3px" }}>Application List for HSC</h1>
//           <div style={{ width:40, height:3, background:COLOR.blueLt, borderRadius:2, marginTop:6 }} />
//         </div>

//         <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20, flexWrap:"wrap" }}>
//           {(selectedSchool !== "all" || selectedYear) && (
//             <div style={{ fontSize:"13px", color:COLOR.filterText, background:COLOR.filterBg, padding:"6px 14px", borderRadius:6, fontWeight:500 }}>
//               Showing: {selectedSchool !== "all" ? selectedSchoolName : "All Schools"}{selectedYear ? ` | ${selectedYear}` : ""}
//             </div>
//           )}
//           {/* Grade filter */}
//           <Select
//             allowClear
//             placeholder="All Grades"
//             value={filterGrade || undefined}
//             onChange={val => setFilterGrade(val || "")}
//             style={{ width: 140, fontFamily: FF, fontSize: FS }}
//             size="middle"
//           >
//             {gradeOptions.map(g => <Option key={g.id} value={g.id}>{g.name}</Option>)}
//           </Select>
//           <button onClick={() => navigate("/create-applicationhsc")}
//             onMouseEnter={e => { e.currentTarget.style.background=COLOR.blue; e.currentTarget.style.boxShadow="0 4px 14px rgba(30,64,175,0.35)"; }}
//             onMouseLeave={e => { e.currentTarget.style.background=COLOR.blueLt; e.currentTarget.style.boxShadow="0 2px 8px rgba(59,130,246,0.28)"; }}
//             style={{ all:"unset", display:"inline-flex", alignItems:"center", gap:7, background:COLOR.blueLt, color:"#fff", padding:"9px 20px", borderRadius:8, fontSize:FS, fontWeight:600, cursor:"pointer", boxShadow:"0 2px 8px rgba(59,130,246,0.28)", transition:"all 0.18s" }}>
//             Create HSC Application
//           </button>
//           {/* Excel icon */}
//           <Tooltip title="Download Excel">
//             <button onClick={handleDownloadExcel}
//               onMouseEnter={e => { e.currentTarget.style.background="#15803d"; e.currentTarget.style.boxShadow="0 4px 14px rgba(21,128,61,0.35)"; }}
//               onMouseLeave={e => { e.currentTarget.style.background="#16a34a"; e.currentTarget.style.boxShadow="0 2px 8px rgba(21,128,61,0.22)"; }}
//               style={{ all:"unset", display:"inline-flex", alignItems:"center", justifyContent:"center", width:38, height:38, background:"#16a34a", color:"#fff", borderRadius:8, cursor:"pointer", boxShadow:"0 2px 8px rgba(21,128,61,0.22)", transition:"all 0.18s", flexShrink:0 }}>
//               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
//                 <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8.5 19l-1.75-3.08L5 19H3.27l2.6-4.08L3.27 11H5l1.75 3.08L8.5 11h1.73l-2.6 3.92L10.23 19H8.5zm5.5 0h-1.5l-1.5-2.4-1.5 2.4H8l2.25-3.5L8 12h1.5l1.5 2.4 1.5-2.4H14l-2.25 3.5L14 19z"/>
//               </svg>
//             </button>
//           </Tooltip>
//         </div>

//         <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 2px 12px rgba(0,0,0,0.07)", overflow:"hidden", border:`1px solid ${COLOR.border}` }}>
//           <div style={{ overflowX:"auto" }}>
//             <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:FF, fontSize:FS }}>
//               <thead>
//                 <tr style={{ background:COLOR.headBg }}>
//                   {cols.map((h,i) => <th key={h} style={{ padding:"13px 16px", fontWeight:600, fontSize:"13px", color:COLOR.headText, textAlign:i===cols.length-1?"center":"left", whiteSpace:"nowrap", letterSpacing:"0.2px" }}>{h}</th>)}
//                 </tr>
//               </thead>
//               <tbody>
//                 {pagedApps.length > 0 ? pagedApps.map((app, index) => {
//                   const globalIndex = (currentPage - 1) * PAGE_SIZE + index;
//                   const progress = calculateProgress(app);
//                   return (
//                     <tr key={app.id} onMouseEnter={() => setHoveredRow(app.id)} onMouseLeave={() => setHoveredRow(null)}
//                       style={{ background:hoveredRow===app.id?COLOR.rowHover:index%2===0?COLOR.rowOdd:COLOR.rowEven, transition:"background 0.12s", borderBottom:`1px solid ${COLOR.border}` }}>
//                       <td style={{ padding:"11px 16px", color:COLOR.text, fontWeight:600 }}>{globalIndex+1}</td>
//                       <td style={{ padding:"11px 16px", color:COLOR.blueLt, fontWeight:600, whiteSpace:"nowrap" }}>{app.applicationNumber}</td>
//                       <td style={{ padding:"11px 16px", color:COLOR.textMid, whiteSpace:"nowrap" }}>{isSuperAdmin ? (app.School?.name||selectedSchoolName||"N/A") : (user.school?.name||"N/A")}</td>
//                       <td style={{ padding:"11px 16px", color:COLOR.textMid, whiteSpace:"nowrap" }}>{app.academicYear}</td>
//                       <td style={{ padding:"11px 16px", color:COLOR.text, fontWeight:500 }}>{app.name}</td>
//                       <td style={{ padding:"11px 16px", color:COLOR.textMid }}>{app.gender}</td>
//                       <td style={{ padding:"11px 16px", color:COLOR.textMid }}>{app.Grade?.grade||"N/A"}</td>
//                       <td style={{ padding:"11px 16px", minWidth:140 }}><ProgressBar value={progress} /></td>
//                       <td style={{ padding:"8px 16px", textAlign:"center" }}>
//                         <div style={{ display:"flex", justifyContent:"center", gap:2 }}>
//                           <div style={{ width:32, display:"flex", alignItems:"center", justifyContent:"center" }}>
//                             {progress===100 && (role==="superadmin"||role==="schooladmin") && (
//                               <IconBtn icon={<CheckCircleOutlined />} title="Admit Student" color={COLOR.admitColor} bg={COLOR.admitBg} onClick={() => handleAdmit(app)} />
//                             )}
//                           </div>
//                           <IconBtn icon={<EyeOutlined />}  title="View Application" color={COLOR.blue}      bg={COLOR.viewBg}   onClick={() => handleView(app.id)} />
//                           <IconBtn icon={<PrinterOutlined />} title="Print Application" color="#7c3aed" bg="rgba(124,58,237,0.09)" onClick={async () => { try { const res = await axios.get(`${process.env.REACT_APP_API_URL}/applicationhsc/getApplicationhscById/${app.id}`); handlePrint(res.data.application); } catch { message.error("Failed to fetch application"); } }} />
//                           <IconBtn icon={<EditOutlined />} title="Edit Application" color={COLOR.editColor} bg={COLOR.editBg}   onClick={() => navigate(`/edit-applicationhsc/${app.id}`)} />
//                           <div style={{ width:32, display:"flex", alignItems:"center", justifyContent:"center" }}>
//                             {isSuperAdmin && <IconBtn icon={<DeleteOutlined />} title="Remove Application" color={COLOR.danger} bg={COLOR.dangerBg} onClick={() => handleDelete(app.id, app.name)} />}
//                           </div>
//                         </div>
//                       </td>
//                     </tr>
//                   );
//                 }) : (
//                   <tr><td colSpan={9} style={{ textAlign:"center", padding:"40px 16px", color:COLOR.textSoft, fontSize:FS }}>No Applications found{filterGrade ? " for the selected grade" : ""}.</td></tr>
//                 )}
//               </tbody>
//             </table>
//           </div>

//           {/* Pagination */}
//           {filteredApps.length > 0 && (
//             <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderTop:`1px solid ${COLOR.border}`, background:"#fafbfc", flexWrap:"wrap", gap:10 }}>
//               <span style={{ fontSize:13, color:COLOR.textSoft, fontFamily:FF }}>
//                 Showing <strong>{filteredApps.length === 0 ? 0 : (currentPage-1)*PAGE_SIZE+1}</strong>–<strong>{Math.min(currentPage*PAGE_SIZE, filteredApps.length)}</strong> of <strong>{filteredApps.length}</strong> applications
//               </span>
//               <div style={{ display:"flex", alignItems:"center", gap:4 }}>
//                 <button onClick={() => setCurrentPage(p => Math.max(1,p-1))} disabled={currentPage===1}
//                   style={{ all:"unset", width:32, height:32, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", cursor:currentPage===1?"not-allowed":"pointer", background:currentPage===1?"#f0f0f0":"#fff", border:`1px solid ${COLOR.border}`, color:currentPage===1?"#c0c0c0":COLOR.textMid, fontSize:13 }}>
//                   <LeftOutlined />
//                 </button>
//                 {getPaginationPages().map((page, i) =>
//                   page==="..." ? (
//                     <span key={`dots-${i}`} style={{ padding:"0 4px", color:COLOR.textSoft, fontSize:13 }}>…</span>
//                   ) : (
//                     <button key={page} onClick={() => setCurrentPage(page)}
//                       style={{ all:"unset", width:32, height:32, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:13, fontWeight:currentPage===page?700:400, background:currentPage===page?"#1a2236":"#fff", color:currentPage===page?"#fff":COLOR.textMid, border:`1px solid ${currentPage===page?"#1a2236":COLOR.border}`, transition:"all 0.15s" }}>
//                       {page}
//                     </button>
//                   )
//                 )}
//                 <button onClick={() => setCurrentPage(p => Math.min(totalPages,p+1))} disabled={currentPage===totalPages}
//                   style={{ all:"unset", width:32, height:32, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", cursor:currentPage===totalPages?"not-allowed":"pointer", background:currentPage===totalPages?"#f0f0f0":"#fff", border:`1px solid ${COLOR.border}`, color:currentPage===totalPages?"#c0c0c0":COLOR.textMid, fontSize:13 }}>
//                   <RightOutlined />
//                 </button>
//               </div>
//             </div>
//           )}
//         </div>

//         {isModalVisible && selectedApplication && (
//           <Modal title={<span style={{ fontFamily:FF, fontWeight:700, fontSize:16, color:COLOR.text }}>Application Details</span>}
//             open={isModalVisible} onCancel={() => setIsModalVisible(false)}
//             footer={
//               <div style={{ display:"flex", justifyContent:"flex-end", gap:8, padding:"4px 0" }}>
//                 <button onClick={() => handlePrint(selectedApplication)}
//                   style={{ all:"unset", display:"inline-flex", alignItems:"center", gap:7, background:"#7c3aed", color:"#fff", padding:"8px 20px", borderRadius:8, fontSize:"13.5px", fontWeight:600, cursor:"pointer", boxShadow:"0 2px 8px rgba(124,58,237,0.28)", transition:"all 0.18s" }}
//                   onMouseEnter={e => { e.currentTarget.style.background="#6d28d9"; }}
//                   onMouseLeave={e => { e.currentTarget.style.background="#7c3aed"; }}>
//                   <PrinterOutlined style={{ fontSize:15 }} /> Print Application
//                 </button>
//                 <button onClick={() => setIsModalVisible(false)}
//                   style={{ all:"unset", display:"inline-flex", alignItems:"center", padding:"8px 20px", borderRadius:8, fontSize:"13.5px", fontWeight:600, cursor:"pointer", background:"#f1f5f9", color:COLOR.textMid, border:`1px solid ${COLOR.border}`, transition:"all 0.18s" }}
//                   onMouseEnter={e => { e.currentTarget.style.background="#e2e8f0"; }}
//                   onMouseLeave={e => { e.currentTarget.style.background="#f1f5f9"; }}>
//                   Close
//                 </button>
//               </div>
//             }
//             width={1100}>
//             <Descriptions bordered column={2} size="small"
//               labelStyle={{ fontWeight:600, color:COLOR.textMid, fontFamily:FF, fontSize:"12.5px", background:"#f8fafc" }}
//               contentStyle={{ fontFamily:FF, fontSize:"12.5px", color:COLOR.text }}>
//               <Descriptions.Item label="Application Number">{selectedApplication.applicationNumber}</Descriptions.Item>
//               <Descriptions.Item label="School Name">{selectedApplication.School?.name||"N/A"}</Descriptions.Item>
//               <Descriptions.Item label="Academic Year">{selectedApplication.academicYear}</Descriptions.Item>
//               <Descriptions.Item label="EMIS Number">{selectedApplication.emisNum}</Descriptions.Item>
//               <Descriptions.Item label="Aadhar Number">{selectedApplication.aadharNumber}</Descriptions.Item>
//               <Descriptions.Item label="Name">{selectedApplication.name}</Descriptions.Item>
//               <Descriptions.Item label="Gender">{selectedApplication.gender}</Descriptions.Item>
//               <Descriptions.Item label="Grade">{selectedApplication.Grade?.grade||"N/A"}</Descriptions.Item>
//               <Descriptions.Item label="Date of Birth">{selectedApplication.dob}</Descriptions.Item>
//               <Descriptions.Item label="Age">{formatAge(selectedApplication.age)}</Descriptions.Item>
//               <Descriptions.Item label="Nationality">{selectedApplication.nationality}</Descriptions.Item>
//               <Descriptions.Item label="State">{selectedApplication.state}</Descriptions.Item>
//               <Descriptions.Item label="Mother Tongue">{selectedApplication.motherTongue}</Descriptions.Item>
//               <Descriptions.Item label="Religion">{selectedApplication.religion}</Descriptions.Item>
//               <Descriptions.Item label="Community">{selectedApplication.community}</Descriptions.Item>
//               <Descriptions.Item label="Caste">{selectedApplication.caste}</Descriptions.Item>
//               <Descriptions.Item label="Blood Group">{selectedApplication.bloodGroup}</Descriptions.Item>
//               <Descriptions.Item label="Identification Marks">{selectedApplication.identificationmarks}</Descriptions.Item>
//               <Descriptions.Item label="Living with">{selectedApplication.living}</Descriptions.Item>
//               <Descriptions.Item label="Scheduled Caste/Tribe?">{selectedApplication.scheduledcasteOrtribecommunity}</Descriptions.Item>
//               <Descriptions.Item label="Backward Caste?">{selectedApplication.backwardcaste}</Descriptions.Item>
//               <Descriptions.Item label="Tribe to Other Religion">{selectedApplication.tribeTootherreligion}</Descriptions.Item>
//               <Descriptions.Item label="Birth District">{selectedApplication.birthdistrict}</Descriptions.Item>
//               <Descriptions.Item label="Father's Name">{selectedApplication.fatherName}</Descriptions.Item>
//               <Descriptions.Item label="Mother's Name">{selectedApplication.motherName}</Descriptions.Item>
//               <Descriptions.Item label="Father's Occupation">{selectedApplication.fatherOccupation}</Descriptions.Item>
//               <Descriptions.Item label="Mother's Occupation">{selectedApplication.motherOccupation}</Descriptions.Item>
//               <Descriptions.Item label="Father's Income">{selectedApplication.fatherIncome}</Descriptions.Item>
//               <Descriptions.Item label="Mother's Income">{selectedApplication.motherIncome}</Descriptions.Item>
//               <Descriptions.Item label="Address">{selectedApplication.address}</Descriptions.Item>
//               <Descriptions.Item label="Pincode">{selectedApplication.pincode}</Descriptions.Item>
//               <Descriptions.Item label="Mobile Number">{selectedApplication.mobileNumber}</Descriptions.Item>
//               <Descriptions.Item label="Telephone Number">{selectedApplication.telephoneNumber}</Descriptions.Item>
//               <Descriptions.Item label="Guardian Name">{selectedApplication.guardianName}</Descriptions.Item>
//               <Descriptions.Item label="Guardian Occupation">{selectedApplication.guardianOccupation}</Descriptions.Item>
//               <Descriptions.Item label="Guardian Address">{selectedApplication.guardianAddress}</Descriptions.Item>
//               <Descriptions.Item label="Guardian Phone">{selectedApplication.guardianNumber}</Descriptions.Item>
//               <Descriptions.Item label="Exam Year">{selectedApplication.examYear}</Descriptions.Item>
//               <Descriptions.Item label="Registration Number">{selectedApplication.registrationnumber}</Descriptions.Item>
//               <Descriptions.Item label="Tamil">{selectedApplication.tamil}</Descriptions.Item>
//               <Descriptions.Item label="English">{selectedApplication.english}</Descriptions.Item>
//               <Descriptions.Item label="Mathematics">{selectedApplication.maths}</Descriptions.Item>
//               <Descriptions.Item label="Science">{selectedApplication.science}</Descriptions.Item>
//               <Descriptions.Item label="Social Science">{selectedApplication.social}</Descriptions.Item>
//               <Descriptions.Item label="Total">{selectedApplication.total}</Descriptions.Item>
//               <Descriptions.Item label="Percentage">{selectedApplication.percentage}</Descriptions.Item>
//               <Descriptions.Item label="Termination Reason">{selectedApplication.terminationreason}</Descriptions.Item>
//               <Descriptions.Item label="Photocopy of TC">{selectedApplication.photocopyofTC}</Descriptions.Item>
//               <Descriptions.Item label="Previous Medium">{selectedApplication.previousmedium}</Descriptions.Item>
//               <Descriptions.Item label="Preferred Medium">{selectedApplication.preferredmedium}</Descriptions.Item>
//               <Descriptions.Item label="Bank Name">{selectedApplication.bankName}</Descriptions.Item>
//               <Descriptions.Item label="Branch Name">{selectedApplication.branchName}</Descriptions.Item>
//               <Descriptions.Item label="Account Number">{selectedApplication.accountNumber}</Descriptions.Item>
//               <Descriptions.Item label="IFSC Code">{selectedApplication.ifsccode}</Descriptions.Item>
//             </Descriptions>
//           </Modal>
//         )}
//       </div>
//     </Layout>
//   );
// };

// export default ApplicationHSCList;

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { Button, Form, Input, Spin, Typography, message, Select, Radio, InputNumber, Steps, Card, Row, Col, Progress } from 'antd';
import { useNavigate } from "react-router-dom";

const { Title } = Typography;
const { Step } = Steps;
const { Option } = Select;

const CreateApplicationhsc = ({ isEdit = false }) => {

    const { id } = useParams();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [grades, setGrades] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [progressColor, setProgressColor] = useState("#ff4d4f");
    const user = JSON.parse(localStorage.getItem("user"));
    const schoolId = user?.school?.id;
    const [schools, setSchools] = useState([]);
    const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");

    const navigate = useNavigate();
    const steps = [
        'Academic Details',
        'Student Information',
        'Parent Information',
        'General Information',
        'Bank Details'
    ];
    const [dob, setDOB] = useState('');
    const [age, setAge] = useState({ years: 0, months: 0, days: 0 });
    const [selectedGradeName, setSelectedGradeName] = useState('');
    const [selectedAcademicYear, setSelectedAcademicYear] = useState('');


    const stepFields = [
        ['school_id', 'academicYear', 'emisNum', 'aadharNumber'], // Step 0
        ['name', 'gender', 'grade_id', 'dob', 'age', 'nationality', 'state', 'birthdistrict', 'community', 'caste', 'identificationmarks',
            'religion', 'scheduledcasteOrtribecommunity', 'backwardcaste', 'tribeTootherreligion', 'living', 'currentlivingaddress', 'motherTongue', 'bloodGroup'], // Step 1
        ['fatherName', 'motherName', 'fatherOccupation', 'motherOccupation', 'fatherIncome', 'motherIncome', 'address', 'pincode', 'telephoneNumber',
            'mobileNumber', 'guardianName', 'guardianOccupation', 'guardianAddress', 'guardianNumber', 'parentconsentform'],  // Step 2
        ['examYear', 'registrationnumber', 'tamil', 'english', 'maths', 'science', 'social', 'total', 'percentage', 'terminationreason', 'photocopyofTC', 'previousmedium', 'preferredmedium'], // Step 3
        ['bankName', 'branchName', 'accountNumber', 'ifsccode'] // Step 4
    ];

    useEffect(() => {
        if (role === "superadmin") {
            fetchAllSchools();
        }
        // Grades are fetched only after academic year is selected
    }, [role, schoolId]);

    useEffect(() => {
        if (id) {
            loadApplicationForEdit(id);
        }
    }, [id]);

    const loadApplicationForEdit = async (id) => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/applicationhsc/getApplicationhscById/${id}`);
            const application = response.data.application;

            const year = application.academicYear || '';
            setSelectedAcademicYear(year);

            if (role === "superadmin") {
                await fetchAllSchools();
                await fetchGrades(application.school_id, year);
            } else {
                await fetchGrades(schoolId, year);
            }

            const parsedAge = typeof application.age === 'string' ? JSON.parse(application.age) : application.age;

            form.setFieldsValue({
                ...application,
                age: parsedAge
            });

            setDOB(application.dob);
            setAge(parsedAge);
            setSelectedGradeName(application.Grade?.grade || '');

        } catch (error) {
            message.error("Failed to load application for editing");
        }
    };

    const fetchAllSchools = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/school/getAllSchools`);
            setSchools(response.data.schools || []);
        } catch (error) {
            message.error("Failed to fetch schools");
        }
    };

    const handleSchoolChange = (selectedId) => {
        form.setFieldsValue({ grade_id: undefined });
        setGrades([]);
        if (selectedAcademicYear) {
            fetchGrades(selectedId, selectedAcademicYear);
        }
    };

    const handleAcademicYearChange = (year) => {
        setSelectedAcademicYear(year);
        form.setFieldsValue({ grade_id: undefined });
        setGrades([]);
        const sid = role === "superadmin" ? form.getFieldValue('school_id') : schoolId;
        if (sid && year) {
            fetchGrades(sid, year);
        }
    };

    useEffect(() => {
        const colors = ["#ff4d4f", "#ffa940", "#faad14", "#52c41a"];
        setProgressColor(colors[currentStep]);
    }, [currentStep]);

    const handleNext = async () => {
        try {
            await form.validateFields();
            setCurrentStep(currentStep + 1);
        } catch (err) {
            console.error("Validation failed:", err);
            const failedField = err?.errorFields?.[0]?.name?.[0];
            if (failedField) {
                message.error(`Please check the field: "${failedField}"`);
            } else {
                message.error("Please correct the highlighted fields.");
            }
        }
    };
    const handlePrev = () => {
        setCurrentStep(currentStep - 1);
    };

    const fetchGrades = async (selectedSchoolId, year) => {
        try {
            const url = year
                ? `${process.env.REACT_APP_API_URL}/grade/getGradesBySchoolAndYear/${selectedSchoolId}/${year}`
                : `${process.env.REACT_APP_API_URL}/grade/getGradesBySchool/${selectedSchoolId}`;
            const response = await axios.get(url);
            setGrades(response.data.grades || []);
        } catch (error) {
            message.error("Failed to fetch grades");
        }
    };

    const validateDOB = (rule, value) => {
        const currentYear = new Date().getFullYear();
        let minYear, maxYear;

        switch (selectedGradeName) {
            case 'XI':
                minYear = currentYear - 18;
                maxYear = currentYear - 15;
                break;
            case 'XII':
                minYear = currentYear - 19;
                maxYear = currentYear - 16;
                break;
            default:
                return Promise.reject('Invalid grade selected!');
        }

        const selectedYear = new Date(value).getFullYear();
        if (selectedYear < minYear || selectedYear > maxYear) {
            return Promise.reject(
                `DOB doesn't match the selected grade (${selectedGradeName})`
            );
        }

        return Promise.resolve();
    };

    const calculateAge = (dob) => {
        if (!dob) return { years: 0, months: 0, days: 0 };

        const today = new Date();
        const birthDate = new Date(dob);

        let years = today.getFullYear() - birthDate.getFullYear();
        let months = today.getMonth() - birthDate.getMonth();
        let days = today.getDate() - birthDate.getDate();

        if (months < 0 || (months === 0 && days < 0)) {
            years--;
            months += 12;
        }

        if (days < 0) {
            months--;
            const prevMonthDate = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
            days += prevMonthDate;
        }

        return { years, months, days };
    };

    const formatAge = ({ years, months, days }) => {
        let ageString = '';
        if (years > 0) ageString += `${years} year${years > 1 ? 's' : ''}`;
        if (months > 0) ageString += `${ageString ? ', ' : ''}${months} month${months > 1 ? 's' : ''}`;
        if (days > 0) ageString += `${ageString ? ', ' : ''}${days} day${days > 1 ? 's' : ''}`;
        return ageString || '0 days';
    };

    const statesinindia = [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
        "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
        "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
        "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
        "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Others"
    ];

    const validateMarks = (_, value) => {
        if (value > 100) {
            return Promise.reject(new Error('Marks cannot exceed 100'));
        }
        return Promise.resolve();
    };

    const calculateTotalAndPercentage = (values) => {
        const total = ['tamil', 'english', 'maths', 'science', 'social']
            .map(subject => parseInt(values[subject], 10) || 0)
            .reduce((a, b) => a + b, 0);

        const percentage = total / 5;

        form.setFieldsValue({
            total,
            percentage: percentage.toFixed(2)
        });
    };

    const validateAccountNumber = (_, value) => {
        if (!value || value.length < 9) {
            return Promise.reject('Account number must be at least 9 digits');
        }
        return Promise.resolve();
    };

    const validateIFSCCode = (_, value) => {
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        if (!value || !ifscRegex.test(value)) {
            return Promise.reject('Enter a valid IFSC code (e.g., SBIN0001234)');
        }
        return Promise.resolve();
    };

    const handleDraft = async () => {
        setLoading(true);
        const currentStepFields = stepFields.slice(0, currentStep + 1).flat();
        let values;
        try {
            values = await form.validateFields(currentStepFields);
        } catch (validationError) {
            const failedField = validationError?.errorFields?.[0]?.name?.[0];
            if (failedField) {
                message.error(`Please check the field: "${failedField}"`);
            } else {
                message.error("Please correct the highlighted fields.");
            }
            setLoading(false);
            return;
        }

        try {
            const selectedDOB = values.dob;
            const ageObj = calculateAge(selectedDOB);
            const payload = {
                ...values,
                dob: selectedDOB,
                age: JSON.stringify(ageObj),
                school_id: role === "superadmin" ? values.school_id : schoolId,
                emisNum: values.emisNum ? String(values.emisNum).trim() : "",
                aadharNumber: values.aadharNumber ? String(values.aadharNumber).trim() : ""
            };

            const existing = await axios.get(`${process.env.REACT_APP_API_URL}/applicationhsc/getApplicationhscsBySchool/${schoolId}`);
            const existingApps = existing.data.applicationhscs || [];

            const isDuplicateEmis = existingApps.some(app => app.emisNum === payload.emisNum && app.id !== id);
            const isDuplicateAadhar = existingApps.some(app => app.aadharNumber === payload.aadharNumber && app.id !== id);

            if (isDuplicateEmis) {
                message.error("An application with this EMIS number already exists.");
                setLoading(false);
                return;
            }

            if (isDuplicateAadhar) {
                message.error("An application with this Aadhar number already exists.");
                setLoading(false);
                return;
            }

            const url = isEdit
                ? `${process.env.REACT_APP_API_URL}/applicationhsc/updateApplicationhsc/${id}`
                : `${process.env.REACT_APP_API_URL}/applicationhsc/createApplicationhsc`;

            await axios[isEdit ? 'put' : 'post'](url, payload);
            message.success("Application saved successfully!");
            navigate("/applicationhsc");

        } catch (error) {
            console.error("Draft save error:", error);
            message.error(error.response?.data?.error || "Failed to save application");
        }
        setLoading(false);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const values = await form.validateFields();
            const selectedDOB = values.dob;
            const ageObj = calculateAge(selectedDOB);
            const payload = {
                ...values,
                dob: selectedDOB,
                age: JSON.stringify(ageObj),
                school_id: role === "superadmin" ? values.school_id : schoolId
            };

            // Duplicate check only for new application
            if (!isEdit) {
                const existing = await axios.get(`${process.env.REACT_APP_API_URL}/applicationhsc/getApplicationhscsBySchool/${schoolId}`);
                const existingApps = existing.data.applicationhscs || [];

                const isDuplicateEmis = existingApps.some(app => app.emisNum === payload.emisNum);
                const isDuplicateAadhar = existingApps.some(app => app.aadharNumber === payload.aadharNumber);

                if (isDuplicateEmis) {
                    message.error("An application with this EMIS number already exists.");
                    setLoading(false);
                    return;
                }

                if (isDuplicateAadhar) {
                    message.error("An application with this Aadhar number already exists.");
                    setLoading(false);
                    return;
                }
            }

            const url = isEdit
                ? `${process.env.REACT_APP_API_URL}/applicationhsc/updateApplicationhsc/${id}`
                : `${process.env.REACT_APP_API_URL}/applicationhsc/createApplicationhsc`;

            const response = await axios[isEdit ? 'put' : 'post'](url, payload);

            message.success(
                isEdit
                    ? "Application updated successfully!"
                    : `Application created! Number: ${response.data.application.applicationNumber}`
            );

            if (isEdit) {
                navigate("/applicationhsc");
            } else {
                form.resetFields();
            }

        } catch (error) {
            console.error("Submit error:", error);
            message.error(error.response?.data?.error || "Failed to submit application");
        }
        setLoading(false);
    };

    const stepContent = [
        // Step 1: Academic Details
        <>
            {role === "superadmin" ? (
                <Form.Item name="school_id" label="School" rules={[{ required: true }]}>
                    <Select placeholder="Select school" onChange={handleSchoolChange}>
                        {schools.map((school) => (
                            <Option key={school.id} value={school.id}>{school.name}</Option>
                        ))}
                    </Select>
                </Form.Item>
            ) : (
                <>
                    <Form.Item name="school_id" hidden initialValue={schoolId}>
                        <Input type="hidden" />
                    </Form.Item>
                    <Form.Item label="School Name">
                        <Input value={user?.school?.name || "N/A"} disabled />
                    </Form.Item>
                </>
            )}

            <Form.Item
                label="Academic Year"
                name="academicYear"
                rules={[{ required: true, message: 'Select something!' }]}
            >
                <Select
                    placeholder="Select"
                    id="academicYear"
                    onChange={handleAcademicYearChange}
                >
                    <Option value="2025-2026">2025-2026</Option>
                    <Option value="2026-2027">2026-2027</Option>
                </Select>
            </Form.Item>
            <Form.Item label="EMIS Number" name="emisNum" rules={[
                { required: true, message: "Enter EMIS Number!" },
                { pattern: /^[0-9]{10,15}$/, message: "Enter a valid 10 to 15 digit number!" }
            ]}>
                <Input />
            </Form.Item>
            <Form.Item label="Aadhar Number" name="aadharNumber" rules={[
                { required: true, message: "Enter aadharnumber!" },
                { pattern: /^[0-9]{12}$/, message: "Enter a valid 12-digit number!" }
            ]}>
                <Input />
            </Form.Item>
        </>,

        //step2: Student Information
        <>
            <Form.Item label="Full Name" name="name" rules={[{ required: true, message: "Please enter student name!" }]}>
                <Input />
            </Form.Item>

            <Form.Item name="gender" label="Gender" rules={[{ required: true, message: 'Select something!' }]}>
                <Radio.Group>
                    <Radio value="Male">Male</Radio>
                    <Radio value="Female">Female</Radio>
                    <Radio value="Others">Others</Radio>
                </Radio.Group>
            </Form.Item>

            <Form.Item label="Grade" name="grade_id" rules={[{ required: true, message: 'Please select a grade!' }]}
                extra={!selectedAcademicYear ? "Please select an Academic Year first (Step 1) to load grades." : ""}
            >
                <Select
                    placeholder={selectedAcademicYear ? "Select grade" : "Select Academic Year first"}
                    disabled={!selectedAcademicYear}
                    onChange={(value) => {
                        const selected = grades.find(g => g.id === value);
                        setSelectedGradeName(selected?.grade || '');
                    }}
                >
                    {grades
                        .filter(grade => ["XI", "XII"].includes(grade.grade.toUpperCase()))
                        .map(grade => (
                            <Option key={grade.id} value={grade.id}>
                                {grade.grade}
                            </Option>
                        ))}
                </Select>
            </Form.Item>
            <Form.Item
                label="Date of Birth"
                name="dob"
                rules={[
                    { required: true, message: "Please select date of birth!" },
                    { validator: validateDOB }
                ]}
            >
                <Input
                    type="date"
                    value={dob}
                    onChange={(e) => {
                        const selectedDOB = e.target.value;
                        setDOB(selectedDOB);
                        const newAge = calculateAge(selectedDOB);
                        setAge(newAge);
                        form.setFieldValue('dob', selectedDOB);
                    }}
                />
            </Form.Item>

            <Form.Item label="Age">
                <Input value={formatAge(age)} disabled />
            </Form.Item>
            <Form.Item
                name="nationality"
                label="Nationality"
                rules={[{ required: true, message: 'Required!' }]}
            >
                <Select placeholder="Select your Nationality">
                    <Option value="India">India</Option>
                    <Option value="Non-Indian">Non-Indian</Option>
                </Select>
            </Form.Item>

            <Form.Item
                name="state"
                label="State"
                rules={[{ required: true, message: 'Required!' }]}
            >
                <Select placeholder="Select your State">
                    {statesinindia.map(state => (
                        <Option key={state} value={state}>{state}</Option>
                    ))}
                </Select>
            </Form.Item>
            <Form.Item
                name="motherTongue"
                label="Mother Tongue"
                rules={[{ required: true, message: 'Required!' }]}
            >
                <Select placeholder="Select your Mother Tongue">
                    <Option value="Tamil">Tamil</Option>
                    <Option value="English">English</Option>
                    <Option value="Hindi">Hindi</Option>
                    <Option value="Bengali">Bengali</Option>
                    <Option value="Telugu">Telugu</Option>
                    <Option value="Marathi">Marathi</Option>
                    <Option value="Gujarati">Gujarati</Option>
                    <Option value="Urdu">Urdu</Option>
                    <Option value="Kannada">Kannada</Option>
                    <Option value="Odia">Odia</Option>
                    <Option value="Malayalam">Malayalam</Option>
                    <Option value="Punjabi">Punjabi</Option>
                    <Option value="Assamese">Assamese</Option>
                    <Option value="Others">Others</Option>
                </Select>
            </Form.Item>
            <Form.Item label="Birth District" name="birthdistrict" rules={[{ required: true, message: 'Required!' }]}>
                <Input />
            </Form.Item>
            <Form.Item
                name="religion"
                label="Religion"
                rules={[{ required: true, message: 'Required!' }]}
            >
                <Select placeholder="Select Religion">
                    <Option value="Hindu">Hindu</Option>
                    <Option value="Muslim">Muslim</Option>
                    <Option value="Christian">Christian</Option>
                    <Option value="Jainism">Jainism</Option>
                    <Option value="Others">Others</Option>
                </Select>
            </Form.Item>
            <Form.Item
                label="Community"
                name="community"
                rules={[{ required: true, message: 'Select something!' }]}
            >
                <Select
                    placeholder="Select"
                    id="community"
                >
                    <Option value="BC">BC</Option>
                    <Option value="MBC">MBC</Option>
                    <Option value="SC">SC</Option>
                    <Option value="ST">ST</Option>
                    <Option value="OC">OC</Option>
                    <Option value="OBC">OBC</Option>
                    <Option value="Others">Others</Option>
                </Select>
            </Form.Item>
            <Form.Item label="Caste" name="caste">
                <Input />
            </Form.Item>
            <Form.Item
                name="scheduledcasteOrtribecommunity"
                label="Scheduled Caste / Tribe Community"
            >
                <Radio.Group >
                    <Radio value="Yes">Yes</Radio>
                    <Radio value="No" >No</Radio>
                </Radio.Group>
            </Form.Item>
            <Form.Item
                name="backwardcaste"
                label="Backward Caste"
            >
                <Radio.Group >
                    <Radio value="Yes">Yes</Radio>
                    <Radio value="No" >No</Radio>
                </Radio.Group>
            </Form.Item>
            <Form.Item
                name="tribeTootherreligion"
                label="Tribe to Other Religion"
            >
                <Radio.Group >
                    <Radio value="Yes">Yes</Radio>
                    <Radio value="No" >No</Radio>
                </Radio.Group>
            </Form.Item>
            <Form.Item
                label="Living with"
                name="living"
            >
                <Select
                    placeholder="Select"
                    id="living"
                >
                    <Option value="Parents">Parents</Option>
                    <Option value="Guardian">Guardian</Option>
                    <Option value="Others">Others</Option>
                </Select>
            </Form.Item>
            <Form.Item
                name="currentlivingaddress"
                label="Current Living Address">
                <Input.TextArea
                    autoSize={{ minRows: 3, maxRows: 3 }}
                    placeholder="Enter Your Reason"
                    maxLength={500} />
            </Form.Item>
            <Form.Item label="Identification Marks"
                name="identificationmarks"
                rules={[{ required: true, message: "Required!" }]}>
                <Input />
            </Form.Item>
            <Form.Item
                name="bloodGroup"
                label="Blood Group"
                rules={[{ required: true, message: "Required!" }]}
            >
                <Select
                    placeholder="Select"
                    id="bloodGroup"
                >
                    <Option value="A+">A+</Option>
                    <Option value="A-">A-</Option>
                    <Option value="B+">B+</Option>
                    <Option value="B-">B-</Option>
                    <Option value="O+">O+</Option>
                    <Option value="O-">O-</Option>
                    <Option value="AB+">AB+</Option>
                    <Option value="AB-">AB-</Option>
                </Select>
            </Form.Item>
        </>,

        // Step 3: Parent Information
        <>
            <Form.Item
                label="Father's Name"
                name="fatherName"
                rules={[{ required: true, message: "Please enter father's name!" }]}
            >
                <Input />
            </Form.Item>

            <Form.Item
                label="Mother's Name"
                name="motherName"
                rules={[{ required: true, message: "Please enter mother's name!" }]}
            >
                <Input />
            </Form.Item>
            <Form.Item
                label="Father's Occupation"
                name="fatherOccupation"
                rules={[{ required: true, message: "Required!" }]}
            >
                <Input />
            </Form.Item>
            <Form.Item
                label="Mother's Occupation"
                name="motherOccupation"
                rules={[{ required: true, message: "Required!" }]}
            >
                <Input />
            </Form.Item>
            <Form.Item
                name="fatherIncome"
                label="Father's Annual Income"
                rules={[
                    {
                        required: true,
                        message: 'Required!',
                    },
                ]} >
                <Input
                    placeholder="Enter Father's Income"
                    maxLength={10}
                    onInput={(e) => {
                        e.target.value = e.target.value.replace(/[^0-9]/g, ',');
                    }} />
            </Form.Item>
            <Form.Item
                name="motherIncome"
                label="Mother's Annual Income"
                rules={[
                    {
                        required: true,
                        message: 'Required!',
                    },
                ]} >
                <Input
                    placeholder="Enter Mother's Income"
                    maxLength={10}
                    onInput={(e) => {
                        e.target.value = e.target.value.replace(/[^0-9]/g, ',');
                    }} />
            </Form.Item>
            <Form.Item
                label="Address"
                name="address"
                rules={[{ required: true, message: "Required!" }]}
            >
                <Input />
            </Form.Item>
            <Form.Item
                label="Pincode"
                name="pincode"
                rules={[{ pattern: /^[0-9]{6}$/, message: "Invalid!" }]}
            >
                <Input />
            </Form.Item>
            <Form.Item
                label="Telephone Number"
                name="telephoneNumber"
                rules={[{ pattern: /^[0-9]{10}$/, message: "Invalid Telephone number!" }]}
            >
                <Input />
            </Form.Item>
            <Form.Item
                label="Mobile Number"
                name="mobileNumber"
                rules={[
                    { required: true, message: "Mobile number is required!" },
                    { pattern: /^[0-9]{10}$/, message: "Enter a valid 10-digit mobile number!" }
                ]}
            >
                <Input />
            </Form.Item>
            <h2>Guardian Information</h2>
            <Form.Item
                label="Guardian's Name"
                name="guardianName"
            >
                <Input />
            </Form.Item>
            <Form.Item
                label="Guardian's Occupation"
                name="guardianOccupation"
            >
                <Input />
            </Form.Item>
            <Form.Item
                label="Guardian Address"
                name="guardianAddress"
            >
                <Input.TextArea />
            </Form.Item>

            <Form.Item
                label="Guardian Phone Number"
                name="guardianNumber"
                rules={[{ pattern: /^[0-9]{10}$/, message: "Invalid phone number!" }]}
            >
                <Input />
            </Form.Item>

        </>,

        // Step 3: Academic Details
        <>
            <Form.Item
                label="Examination Passed Year"
                name="examYear"
                style={{ marginRight: '15px' }}
                rules={[
                    {
                        required: true,
                        message: 'Required',
                    },
                ]}>
                <InputNumber
                    min={1995}
                    max={new Date().getFullYear()}
                    placeholder="Select Year"
                    style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
                name="registrationnumber"
                label="Registration Number"
            >
                <Input
                    placeholder="Enter"
                    maxLength={15}
                    onInput={(e) => {
                        e.target.value = e.target.value
                            .replace(/[^0-9]/g, "")
                            .slice(0, 15);
                    }}
                />
            </Form.Item>
            <Form.Item
                label="Tamil"
                name="tamil"
                rules={[{ validator: validateMarks }]}
            >
                <Input
                    maxLength={3}
                    onInput={(e) => {
                        e.target.value = e.target.value
                            .replace(/[^0-9]/g, "")
                            .slice(0, 3);
                    }} />
            </Form.Item>
            <Form.Item
                label="English"
                name="english"
                rules={[{ validator: validateMarks }]}
            >
                <Input
                    maxLength={3}
                    onInput={(e) => {
                        e.target.value = e.target.value
                            .replace(/[^0-9]/g, "")
                            .slice(0, 3);
                    }} />
            </Form.Item>
            <Form.Item
                label="Mathematics"
                name="maths"
                rules={[{ validator: validateMarks }]}
            >
                <Input
                    maxLength={3}
                    onInput={(e) => {
                        e.target.value = e.target.value
                            .replace(/[^0-9]/g, "")
                            .slice(0, 3);
                    }} />
            </Form.Item>
            <Form.Item
                label="Science"
                name="science"
                rules={[{ validator: validateMarks }]}
            >
                <Input
                    maxLength={3}
                    onInput={(e) => {
                        e.target.value = e.target.value
                            .replace(/[^0-9]/g, "")
                            .slice(0, 3);
                    }} />
            </Form.Item>
            <Form.Item
                label="Social Science"
                name="social"
                rules={[{ validator: validateMarks }]}
            >
                <Input
                    maxLength={3}
                    onInput={(e) => {
                        e.target.value = e.target.value
                            .replace(/[^0-9]/g, "")
                            .slice(0, 3);
                    }} />
            </Form.Item>
            <Form.Item
                label="Total"
                name="total"
            >
                <Input readOnly />
            </Form.Item>
            <Form.Item
                label="Percentage"
                name="percentage"
            >
                <Input readOnly />
            </Form.Item>
            <Form.Item
                name="terminationreason"
                label="Reason for Discontinuation/ Termination">
                <Input.TextArea
                    autoSize={{ minRows: 3, maxRows: 3 }}
                    placeholder="Enter Your Reason"
                    maxLength={500} />
            </Form.Item>
            <Form.Item
                name="photocopyofTC"
                label="Is the photocopy of TC submitted? Submit Original copy during admission"
                rules={[{ required: true, message: 'Select something!' }]}
            >
                <Radio.Group >
                    <Radio value="Yes">Yes</Radio>
                    <Radio value="No" >No</Radio>
                </Radio.Group>
            </Form.Item>
            <Form.Item
                label="Previous Medium"
                name="previousmedium"
                rules={[{ required: true, message: 'Select something!' }]}
            >
                <Select
                    placeholder="Select"
                    id="previousmedium"
                >
                    <Option value="Tamil">Tamil</Option>
                    <Option value="English">English</Option>
                </Select>
            </Form.Item>
            <Form.Item
                label="Preferred Medium of Study"
                name="preferredmedium"
                rules={[{ required: true, message: 'Select something!' }]}
            >
                <Select
                    placeholder="Select"
                    id="preferredmedium"
                >
                    <Option value="Tamil">Tamil</Option>
                    <Option value="English">English</Option>
                </Select>
            </Form.Item>
        </>,

        // Step 4: Bank Details
        <>
            <Form.Item
                label="Bank Name"
                name="bankName"
                rules={[{ required: true, message: "Please enter bank name!" }]}
            >
                <Input />
            </Form.Item>
            <Form.Item
                style={{ width: '100%' }}
                name="branchName"
                label="Branch Name"
                rules={[{ required: true, message: "Please enter branch name!" }]}
            >
                <Input
                    placeholder="Enter Branch Name"
                    maxLength={50}
                    onInput={(e) => {
                        e.target.value = e.target.value
                            .replace(/[^a-zA-Z\s]/g, '')
                            .slice(0, 50);
                    }}
                />
            </Form.Item>
            <Form.Item
                style={{ width: '100%' }}
                name="accountNumber"
                label="Bank Account Number"
                rules={[{ validator: validateAccountNumber }]}
            >
                <Input
                    placeholder="Enter Account Number"
                    maxLength={17}
                    onInput={(e) => {
                        e.target.value = e.target.value
                            .replace(/[^0-9]/g, '')
                            .slice(0, 17);
                    }}
                />
            </Form.Item>
            <Form.Item
                style={{ width: '100%' }}
                name="ifsccode"
                label="IFSC Code"
                rules={[
                    { required: true, message: 'Please enter IFSC Code!' },
                    { validator: validateIFSCCode }
                ]}
            >
                <Input
                    placeholder="Enter IFSC Code"
                    maxLength={11}
                    onInput={(e) => {
                        e.target.value = e.target.value
                            .toUpperCase() // Ensure all characters are uppercase
                            .replace(/[^A-Z0-9]/g, '') // Only allow A-Z and 0-9
                            .slice(0, 11); // Limit to 11 characters
                    }}
                />
            </Form.Item>
        </>
    ];

    return (
        <div className="container" style={{ maxWidth: "1400px", margin: "0 auto", padding: "40px" }}>
            <Card title={
                <div style={{ textAlign: 'center' }}>
                    <Title level={3}>Create HSC Application</Title>
                    <Progress
                        percent={(currentStep + 1) * 25}
                        strokeColor={progressColor}
                        style={{ width: '80%', margin: '0 auto' }}
                    />
                    <Steps current={currentStep} style={{ marginTop: 20 }}>
                        {steps.map((title) => (
                            <Step key={title} title={title} />
                        ))}
                    </Steps>
                </div>
            }>
                <Form
                    form={form}
                    onFinish={handleSubmit}
                    layout="vertical"
                    onValuesChange={(changedValues, allValues) => {
                        const markFields = ['tamil', 'english', 'maths', 'science', 'social'];
                        if (markFields.some(field => field in changedValues)) {
                            calculateTotalAndPercentage(allValues);
                        }
                    }}
                >
                    {stepContent[currentStep]}

                    <Row justify="space-between" style={{ marginTop: 24 }}>
                        <Col>
                            {currentStep > 0 && (
                                <Button onClick={handlePrev}>
                                    Previous
                                </Button>
                            )}
                        </Col>
                        <Col>
                            <Button onClick={handleDraft} style={{ marginRight: 8 }}>
                                Save Draft
                            </Button>
                            {currentStep < steps.length - 1 ? (
                                <Button type="primary" onClick={handleNext}>
                                    Next
                                </Button>
                            ) : (

                                <Button onClick={handleDraft} style={{ marginRight: 8 }}>
                                    Submit
                                </Button>
                            )}
                        </Col>
                    </Row>
                </Form>
            </Card>
        </div>
    );
};

export default CreateApplicationhsc;