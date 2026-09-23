import React, { useEffect, useState } from "react";
import Layout from "./Layout";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Form, Input, Checkbox, Select, message, InputNumber, Radio } from "antd";
import dayjs from "dayjs";

const { Option } = Select;

const COLOR = {
  blue:"#1e40af", blueLt:"#3b82f6", text:"#1e293b", textMid:"#475569",
  border:"#e2e8f0", warn:"#92400e", warnBg:"#fef3c7", warnBorder:"#fde68a",
};
const FF = "'Segoe UI', system-ui, sans-serif";
const FS = "13.5px";

/* ─────────────────────────────────────────────────────────────
   SCHOOL CLASSIFICATION

   THREE_SCHOOL_KEYWORDS → Management Fee + Special Fee shown
   for XI & XII (self-finance grades).

   RANI_ONLY_KEYWORDS    → Same as above, but ONLY for
   Rani Lady Meyyammai Higher Secondary School (subset).
───────────────────────────────────────────────────────────────*/
const THREE_SCHOOL_KEYWORDS = [
  "rani lady meyyammai",
  "kumararajah muthiah",
  "chettinad rani meyyammai",
];

/** Returns true if the school name matches any of the three special schools */
const isExtendedSchool = (name = "") =>
  THREE_SCHOOL_KEYWORDS.some(kw => name.toLowerCase().includes(kw));

/* Numeric grade value for comparison — handles "XI", "XII", "11", "12", etc. */
const SENIOR_GRADES = ["xi", "xii", "11", "12"];
const isSeniorGrade = (gradeLabel = "") =>
  SENIOR_GRADES.includes(gradeLabel.trim().toLowerCase());

/** Derive course from grade label: XI/XII → "HSC", everything else → "SSLC" */
const getCourse = (gradeLabel = "") => isSeniorGrade(gradeLabel) ? "HSC" : "SSLC";

/* ─────────────────────────────────────────────────────────────
   FEE HEAD DEFINITIONS
───────────────────────────────────────────────────────────────*/
const MANAGEMENT_FEE_HEADS = [
  { value: "Tuition Fee",     label: "Tuition Fee" },
  { value: "Other Fee",       label: "Other Fee" },
  { value: "Application Fee", label: "Application Fee" },
  { value: "Uniform Fee",     label: "Uniform Fee" },
];

/* Special Fee options — mutually exclusive (radio) */
const SPECIAL_FEE_OPTIONS = [
  { value: "Art Fee",     label: "Art Fee" },
  { value: "Science Fee", label: "Science Fee" },
];

/* ─────────────────────────────────────────────────────────────
   SimpleFeeSection — PTA (single amount / medium / studentType)
───────────────────────────────────────────────────────────────*/
const SimpleFeeSection = ({ label, checked, setChecked, descName, amountSetter, mediumSetter, studentTypeSetter }) => (
  <div style={{ background:"#f8fafc", border:`1px solid ${COLOR.border}`, borderRadius:10, padding:"16px 20px", marginBottom:16 }}>
    <Form.Item style={{ marginBottom: checked ? 16 : 0 }}>
      <Checkbox checked={checked} onChange={e => setChecked(e.target.checked)}
        style={{ fontFamily:FF, fontSize:FS, fontWeight:600, color:COLOR.text }}>
        {label} Fee
      </Checkbox>
    </Form.Item>
    {checked && (
      <>
        <Form.Item label={`${label} Description`} name={descName}
          rules={[{ required:true, message:"Enter description" }]} style={{ marginBottom:14 }}>
          <Input placeholder="Enter description" style={{ fontFamily:FF, fontSize:FS }} />
        </Form.Item>
        <Form.Item label="Student Type" required style={{ marginBottom:14 }}>
          <Select placeholder="Select student type" onChange={studentTypeSetter} style={{ fontFamily:FF }}>
            <Option value="New">New</Option>
            <Option value="Old">Old</Option>
          </Select>
        </Form.Item>
        <Form.Item label="Medium" required style={{ marginBottom:14 }}>
          <Select placeholder="Select medium" onChange={mediumSetter} style={{ fontFamily:FF }}>
            <Option value="Tamil">Tamil</Option>
            <Option value="English">English</Option>
          </Select>
        </Form.Item>
        <Form.Item label="Amount" required style={{ marginBottom:0 }}>
          <Input type="number" placeholder="Enter amount"
            onChange={e => amountSetter(e.target.value)}
            style={{ fontFamily:FF, fontSize:FS }} />
        </Form.Item>
      </>
    )}
  </div>
);

/* ─────────────────────────────────────────────────────────────
   MultiFeeSection — Management Fee
   Each head has its own description, amount, medium, studentType.
   Uses checkboxes (multiple heads can be selected).
───────────────────────────────────────────────────────────────*/
const MultiFeeSection = ({ sectionLabel, feeHeads, entries, setEntries }) => {
  const [expanded, setExpanded] = useState(false);

  const isChecked = (val) => entries.some(e => e.feeHead === val);

  const toggle = (val, on) => {
    if (on) {
      setEntries(prev => [...prev, { feeHead:val, description:"", amount:"", medium:"", studentType:"" }]);
    } else {
      setEntries(prev => prev.filter(e => e.feeHead !== val));
    }
  };

  const update = (val, field, value) =>
    setEntries(prev => prev.map(e => e.feeHead === val ? { ...e, [field]:value } : e));

  return (
    <div style={{ background:"#f8fafc", border:`1px solid ${COLOR.border}`, borderRadius:10, padding:"16px 20px", marginBottom:16 }}>
      <Checkbox
        checked={expanded}
        onChange={e => { setExpanded(e.target.checked); if (!e.target.checked) setEntries([]); }}
        style={{ fontFamily:FF, fontSize:FS, fontWeight:600, color:COLOR.text }}>
        {sectionLabel}
      </Checkbox>

      {expanded && (
        <div style={{ marginTop:16 }}>
          {feeHeads.map(head => (
            <div key={head.value} style={{ background:"#fff", border:`1px solid ${COLOR.border}`, borderRadius:8, padding:"12px 16px", marginBottom:12 }}>
              <Checkbox
                checked={isChecked(head.value)}
                onChange={e => toggle(head.value, e.target.checked)}
                style={{ fontFamily:FF, fontSize:"13px", fontWeight:600, color:COLOR.text }}>
                {head.label}
              </Checkbox>

              {isChecked(head.value) && (
                <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px 16px" }}>
                  <div>
                    <label style={{ fontSize:"12px", fontWeight:600, color:COLOR.textMid, display:"block", marginBottom:4 }}>Description</label>
                    <Input placeholder="Enter description"
                      value={entries.find(e => e.feeHead === head.value)?.description || ""}
                      onChange={ev => update(head.value, "description", ev.target.value)}
                      style={{ fontFamily:FF, fontSize:FS }} />
                  </div>
                  <div>
                    <label style={{ fontSize:"12px", fontWeight:600, color:COLOR.textMid, display:"block", marginBottom:4 }}>Amount (₹)</label>
                    <Input type="number" placeholder="Enter amount"
                      value={entries.find(e => e.feeHead === head.value)?.amount || ""}
                      onChange={ev => update(head.value, "amount", ev.target.value)}
                      style={{ fontFamily:FF, fontSize:FS }} />
                  </div>
                  <div>
                    <label style={{ fontSize:"12px", fontWeight:600, color:COLOR.textMid, display:"block", marginBottom:4 }}>Student Type</label>
                    <Select placeholder="Select"
                      value={entries.find(e => e.feeHead === head.value)?.studentType || undefined}
                      onChange={val => update(head.value, "studentType", val)}
                      style={{ width:"100%", fontFamily:FF }}>
                      <Option value="New">New</Option>
                      <Option value="Old">Old</Option>
                    </Select>
                  </div>
                  <div>
                    <label style={{ fontSize:"12px", fontWeight:600, color:COLOR.textMid, display:"block", marginBottom:4 }}>Medium</label>
                    <Select placeholder="Select"
                      value={entries.find(e => e.feeHead === head.value)?.medium || undefined}
                      onChange={val => update(head.value, "medium", val)}
                      style={{ width:"100%", fontFamily:FF }}>
                      <Option value="Tamil">Tamil</Option>
                      <Option value="English">English</Option>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   SpecialFeeSection — Radio-button selection: Art Fee OR Science Fee
   Only one option can be selected at a time.
───────────────────────────────────────────────────────────────*/
const SpecialFeeSection = ({ specialFee, setSpecialFee }) => {
  const [expanded, setExpanded] = useState(false);

  const handleExpand = (checked) => {
    setExpanded(checked);
    if (!checked) setSpecialFee({ feeHead:"", description:"", amount:"", medium:"", studentType:"" });
  };

  const update = (field, value) =>
    setSpecialFee(prev => ({ ...prev, [field]:value }));

  return (
    <div style={{ background:"#f8fafc", border:`1px solid ${COLOR.border}`, borderRadius:10, padding:"16px 20px", marginBottom:16 }}>
      <Checkbox
        checked={expanded}
        onChange={e => handleExpand(e.target.checked)}
        style={{ fontFamily:FF, fontSize:FS, fontWeight:600, color:COLOR.text }}>
        Special Fee
      </Checkbox>

      {expanded && (
        <div style={{ marginTop:16 }}>
          {/* Radio group — mutually exclusive */}
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:"12px", fontWeight:600, color:COLOR.textMid, display:"block", marginBottom:8 }}>
              Select Fee Type
            </label>
            <Radio.Group
              value={specialFee.feeHead}
              onChange={e => update("feeHead", e.target.value)}
              style={{ display:"flex", gap:20 }}>
              {SPECIAL_FEE_OPTIONS.map(opt => (
                <Radio key={opt.value} value={opt.value}
                  style={{ fontFamily:FF, fontSize:FS, fontWeight:600, color:COLOR.text }}>
                  {opt.label}
                </Radio>
              ))}
            </Radio.Group>
          </div>

          {/* Details — shown once a fee head is chosen */}
          {specialFee.feeHead && (
            <div style={{ background:"#fff", border:`1px solid ${COLOR.border}`, borderRadius:8, padding:"12px 16px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px 16px" }}>
                <div>
                  <label style={{ fontSize:"12px", fontWeight:600, color:COLOR.textMid, display:"block", marginBottom:4 }}>Description</label>
                  <Input placeholder="Enter description"
                    value={specialFee.description}
                    onChange={e => update("description", e.target.value)}
                    style={{ fontFamily:FF, fontSize:FS }} />
                </div>
                <div>
                  <label style={{ fontSize:"12px", fontWeight:600, color:COLOR.textMid, display:"block", marginBottom:4 }}>Amount (₹)</label>
                  <Input type="number" placeholder="Enter amount"
                    value={specialFee.amount}
                    onChange={e => update("amount", e.target.value)}
                    style={{ fontFamily:FF, fontSize:FS }} />
                </div>
                <div>
                  <label style={{ fontSize:"12px", fontWeight:600, color:COLOR.textMid, display:"block", marginBottom:4 }}>Student Type</label>
                  <Select placeholder="Select"
                    value={specialFee.studentType || undefined}
                    onChange={val => update("studentType", val)}
                    style={{ width:"100%", fontFamily:FF }}>
                    <Option value="New">New</Option>
                    <Option value="Old">Old</Option>
                  </Select>
                </div>
                <div>
                  <label style={{ fontSize:"12px", fontWeight:600, color:COLOR.textMid, display:"block", marginBottom:4 }}>Medium</label>
                  <Select placeholder="Select"
                    value={specialFee.medium || undefined}
                    onChange={val => update("medium", val)}
                    style={{ width:"100%", fontFamily:FF }}>
                    <Option value="Tamil">Tamil</Option>
                    <Option value="English">English</Option>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────*/
const RaiseFeeDemand = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const isSuperAdmin = role === "superadmin";

  const [schools, setSchools]               = useState([]);
  const [grades, setGrades]                 = useState([]);
  const [gradesLoading, setGradesLoading]   = useState(false);
  const [gradesWarning, setGradesWarning]   = useState("");
  const [selectedGrades, setSelectedGrades] = useState([]);

  const [selectedSchoolId, setSelectedSchoolId]     = useState(isSuperAdmin ? null : user?.school?.id || null);
  const [selectedSchoolName, setSelectedSchoolName] = useState(isSuperAdmin ? "" : user?.school?.name || "");

  const [startYear, setStartYear]       = useState(dayjs().year());
  const [academicYear, setAcademicYear] = useState(`${dayjs().year()}-${dayjs().year()+1}`);

  // PTA — all schools, all grades
  const [ptaChecked, setPtaChecked]         = useState(false);
  const [ptaAmount, setPtaAmount]           = useState(0);
  const [ptaMedium, setPtaMedium]           = useState(null);
  const [ptaStudentType, setPtaStudentType] = useState("Both");

  // Management Fee — extended schools, XI & XII only
  const [managementEntries, setManagementEntries] = useState([]);

  // Special Fee — extended schools, XI & XII only (radio — single selection)
  const [specialFee, setSpecialFee] = useState({
    feeHead:"", description:"", amount:"", medium:"", studentType:""
  });

  /* ── Derived flags ── */

  /** True if the selected school qualifies for extended fee heads */
  const extendedSchool = isExtendedSchool(selectedSchoolName);

  /**
   * True if AT LEAST ONE of the currently selected grades is XI or XII.
   * Management Fee + Special Fee sections are shown only when this is true
   * AND the school is an extended school.
   */
  const hasSeniorGradeSelected = selectedGrades.some(gid => {
    const g = grades.find(x => x.id === gid);
    return g ? isSeniorGrade(g.grade) : false;
  });

  const showExtendedFees = extendedSchool && hasSeniorGradeSelected;

  /* ── Totals ── */
  const ptaTotal        = ptaChecked ? parseFloat(ptaAmount || 0) : 0;
  const mgmtTotal       = managementEntries.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const specialTotal    = specialFee.feeHead && specialFee.amount ? parseFloat(specialFee.amount) : 0;
  const totalAmount     = ptaTotal + mgmtTotal + specialTotal;

  /* ── Effects ── */
  useEffect(() => { if (isSuperAdmin) fetchSchools(); }, [isSuperAdmin]);

  useEffect(() => {
    if (selectedSchoolId && academicYear) fetchGradesBySchoolAndYear(selectedSchoolId, academicYear);
    else { setGrades([]); setGradesWarning(""); setSelectedGrades([]); }
  }, [selectedSchoolId, academicYear]);

  // Reset ALL fee entries when school changes
  useEffect(() => {
    setManagementEntries([]);
    setSpecialFee({ feeHead:"", description:"", amount:"", medium:"", studentType:"" });
    setPtaChecked(false);
    setPtaAmount(0);
  }, [selectedSchoolId]);

  // Reset extended fee entries when no senior grade is selected anymore
  useEffect(() => {
    if (!hasSeniorGradeSelected) {
      setManagementEntries([]);
      setSpecialFee({ feeHead:"", description:"", amount:"", medium:"", studentType:"" });
    }
  }, [hasSeniorGradeSelected]);

  /* ── API calls ── */
  const fetchSchools = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/school/getAllSchools`);
      setSchools(res.data.schools || []);
    } catch { message.error("Failed to fetch schools"); }
  };

  const fetchGradesBySchoolAndYear = async (schoolId, year) => {
    setGradesLoading(true); setGrades([]); setGradesWarning(""); setSelectedGrades([]);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/grade/getGradesBySchoolAndYear/${schoolId}/${year}`
      );
      const gradeList = res.data.grades || [];
      if (gradeList.length === 0)
        setGradesWarning(`No grades created for this school with academic year ${year}.`);
      setGrades(gradeList);
    } catch {
      setGradesWarning("No Grades found for the above selection.");
    } finally {
      setGradesLoading(false);
    }
  };

  /* ── Handlers ── */
  const handleSchoolChange = (value) => {
    setSelectedSchoolId(value);
    const school = schools.find(s => s.id === value);
    setSelectedSchoolName(school?.name || "");
    setGrades([]); setSelectedGrades([]); setGradesWarning("");
  };

  const handleYearChange = (y) => {
    if (!y) return;
    setStartYear(y);
    setAcademicYear(`${y}-${y+1}`);
  };

  /* ── Submit ── */
  const handleSubmit = async (values) => {
    const schoolId = isSuperAdmin ? values.school_id : user.school.id;
    if (!academicYear || !selectedGrades.length || !schoolId) {
      message.error("Please fill all required fields");
      return;
    }

    const feeDetails = [];

    /* PTA — applies to ALL selected grades (all schools) */
    if (ptaChecked) {
      selectedGrades.forEach(gid => {
        const gradeLabel = grades.find(x => x.id === gid)?.grade;
        feeDetails.push({
          grade: gradeLabel,
          grade_id: gid,
          type: "PTA",
          description: values.ptaDescription,
          amount: ptaAmount,
          medium: ptaMedium,
          studentType: ptaStudentType || "Both",
          course: getCourse(gradeLabel),   // ✅ FIX: course field added
        });
      });
    }

    /* Management Fee — only for senior grades in extended schools */
    if (showExtendedFees) {
      const seniorGradeIds = selectedGrades.filter(gid => {
        const g = grades.find(x => x.id === gid);
        return g ? isSeniorGrade(g.grade) : false;
      });

      managementEntries.forEach(entry => {
        if (!entry.feeHead || !entry.amount) return;
        seniorGradeIds.forEach(gid => {
          feeDetails.push({
            grade: grades.find(x => x.id === gid)?.grade,
            grade_id: gid,
            type: `Management - ${entry.feeHead}`,
            description: entry.description || entry.feeHead,
            amount: entry.amount,
            medium: entry.medium,
            studentType: entry.studentType || "Both",
            course: "HSC",                 // ✅ FIX: Management fee is always HSC (XI/XII)
          });
        });
      });

      /* Special Fee — radio selection (single fee head) */
      if (specialFee.feeHead && specialFee.amount) {
        seniorGradeIds.forEach(gid => {
          feeDetails.push({
            grade: grades.find(x => x.id === gid)?.grade,
            grade_id: gid,
            type: `Special Fee - ${specialFee.feeHead}`,
            description: specialFee.description || specialFee.feeHead,
            amount: specialFee.amount,
            medium: specialFee.medium,
            studentType: specialFee.studentType || "Both",
            course: "HSC",                 // ✅ FIX: Special fee is always HSC (XI/XII)
          });
        });
      }
    }

    if (feeDetails.length === 0) {
      message.error("Please select at least one fee type and fill its details");
      return;
    }

    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/raiseFeeDemand/createraiseFeeDemand`,
        { school_id: schoolId, grade_ids: selectedGrades, academicYear, feeDetails }
      );
      message.success("Fee demand raised successfully");
      form.resetFields();
      setSelectedGrades([]);
      setPtaChecked(false); setPtaAmount(0);
      setManagementEntries([]);
      setSpecialFee({ feeHead:"", description:"", amount:"", medium:"", studentType:"" });
    } catch {
      message.error("Failed to raise fee demand");
    }
  };

  /* ── UI helpers ── */
  const inputStyle = { fontFamily:FF, fontSize:FS };

  const gradesStatus = () => {
    if (!selectedSchoolId && isSuperAdmin) return { type:"idle", msg:"Select a school and academic year to load grades." };
    if (!academicYear) return { type:"idle", msg:"Select an academic year to load grades." };
    if (gradesLoading) return { type:"loading", msg:"Loading grades..." };
    if (gradesWarning) return { type:"warn", msg: gradesWarning };
    return null;
  };
  const gradeStatus = gradesStatus();

  /* ── Render ── */
  return (
    <Layout>
      <div className="app-page" style={{ fontFamily:FF }}>
        <div style={{ marginBottom:28 }}>
          <h1 style={{ fontSize:22, fontWeight:700, color:COLOR.text, margin:0, letterSpacing:"-0.3px" }}>Raise Fee Demand</h1>
          <div style={{ width:40, height:3, background:COLOR.blueLt, borderRadius:2, marginTop:6 }} />
        </div>

        <div style={{ maxWidth:600, margin:"0 auto", background:"#fff", borderRadius:12, boxShadow:"0 2px 12px rgba(0,0,0,0.07)", border:`1px solid ${COLOR.border}`, padding:"28px 32px" }}>
          <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ fontFamily:FF }}>

            {/* School */}
            {isSuperAdmin ? (
              <Form.Item name="school_id" label="School" rules={[{ required:true, message:"Please select a school" }]}>
                <Select showSearch placeholder="Select school" onChange={handleSchoolChange} style={inputStyle}>
                  {schools.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                </Select>
              </Form.Item>
            ) : (
              <Form.Item label="School Name">
                <Input value={user?.school?.name || "N/A"} disabled style={inputStyle} />
              </Form.Item>
            )}

            {/* Academic Year */}
            <Form.Item label="Academic Year" required>
              <div style={{ display:"flex", gap:10 }}>
                <InputNumber min={2000} max={2100} value={startYear} onChange={handleYearChange} style={{ width:"50%", ...inputStyle }} />
                <Input value={startYear + 1} readOnly style={{ width:"50%", background:"#f8fafc", ...inputStyle }} />
              </div>
            </Form.Item>

            {/* Grades */}
            <Form.Item label="Grades" required>
              <div style={{ background:"#f8fafc", border:`1px solid ${gradeStatus?.type==="warn"?"#fde68a":COLOR.border}`, borderRadius:8, padding:"12px 16px", minHeight:48 }}>
                {gradeStatus ? (
                  <div style={{ display:"flex", alignItems:"center", gap:8, color: gradeStatus.type==="warn" ? COLOR.warn : COLOR.textMid, fontSize:"13px", fontWeight: gradeStatus.type==="warn" ? 500 : 400 }}>
                    {gradeStatus.type==="warn" && <span style={{ fontSize:16 }}>⚠️</span>}
                    {gradeStatus.msg}
                  </div>
                ) : (
                  <Checkbox.Group
                    options={grades.map(g => ({ label:g.grade, value:g.id }))}
                    value={selectedGrades} onChange={setSelectedGrades}
                    style={{ display:"flex", flexWrap:"wrap", gap:"10px 20px" }} />
                )}
              </div>
            </Form.Item>

            {/* ── FEE TYPES HEADER ── */}
            <div style={{ marginBottom:14, paddingBottom:10, borderBottom:`1px solid ${COLOR.border}`, display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:"13px", fontWeight:700, color:COLOR.textMid, textTransform:"uppercase", letterSpacing:"0.5px" }}>
                Fee Types
              </span>

              {/* Badge: shown for extended schools when senior grades are selected */}
              {showExtendedFees && (
                <span style={{ fontSize:"11px", background:"#eff6ff", color:COLOR.blue, border:"1px solid #bfdbfe", borderRadius:20, padding:"2px 10px", fontWeight:600 }}>
                  Extended — XI &amp; XII Fees Applicable
                </span>
              )}

              {/* Info nudge: extended school but no senior grade yet selected */}
              {extendedSchool && !hasSeniorGradeSelected && selectedGrades.length > 0 && (
                <span style={{ fontSize:"11px", background:"#fef9c3", color:"#854d0e", border:"1px solid #fde68a", borderRadius:20, padding:"2px 10px", fontWeight:600 }}>
                  Select XI / XII to enable Management &amp; Special fees
                </span>
              )}
            </div>

            {/* ── MANAGEMENT FEE — extended schools + XI/XII selected ── */}
            {showExtendedFees && (
              <MultiFeeSection
                sectionLabel="Management Fee"
                feeHeads={MANAGEMENT_FEE_HEADS}
                entries={managementEntries}
                setEntries={setManagementEntries}
              />
            )}

            {/* ── SPECIAL FEE — extended schools + XI/XII selected (radio) ── */}
            {showExtendedFees && (
              <SpecialFeeSection
                specialFee={specialFee}
                setSpecialFee={setSpecialFee}
              />
            )}

            {/* ── PTA FEE — all schools, all grades ── */}
            <SimpleFeeSection
              label="PTA" checked={ptaChecked} setChecked={setPtaChecked}
              descName="ptaDescription" amountSetter={setPtaAmount}
              mediumSetter={setPtaMedium} studentTypeSetter={setPtaStudentType}
            />

            {/* Total */}
            <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:8, padding:"12px 16px", marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:FS, fontWeight:600, color:COLOR.textMid }}>Total Amount</span>
              <span style={{ fontSize:18, fontWeight:700, color:COLOR.blue }}>₹ {totalAmount.toLocaleString()}</span>
            </div>

            {/* Buttons */}
            <Form.Item style={{ marginBottom:0 }}>
              <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
                <button type="button" onClick={() => navigate("/raiseFeeDemand")}
                  onMouseEnter={e => e.currentTarget.style.background="#f1f5f9"}
                  onMouseLeave={e => e.currentTarget.style.background="#fff"}
                  style={{ all:"unset", padding:"9px 24px", borderRadius:8, border:`1px solid ${COLOR.border}`, fontSize:FS, fontWeight:600, color:COLOR.textMid, cursor:"pointer", background:"#fff", transition:"background 0.15s" }}>
                  Cancel
                </button>
                <button type="submit"
                  onMouseEnter={e => { e.currentTarget.style.background=COLOR.blue; e.currentTarget.style.boxShadow="0 4px 14px rgba(30,64,175,0.35)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background=COLOR.blueLt; e.currentTarget.style.boxShadow="0 2px 8px rgba(59,130,246,0.28)"; }}
                  style={{ all:"unset", padding:"9px 28px", borderRadius:8, background:COLOR.blueLt, color:"#fff", fontSize:FS, fontWeight:600, cursor:"pointer", boxShadow:"0 2px 8px rgba(59,130,246,0.28)", transition:"all 0.18s" }}>
                  Raise Demand
                </button>
              </div>
            </Form.Item>
          </Form>
        </div>
      </div>
    </Layout>
  );
};

export default RaiseFeeDemand;