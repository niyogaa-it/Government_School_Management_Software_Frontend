import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { Form, Input, message, Select, Radio, InputNumber, Steps, Progress } from "antd";
import Layout from "./Layout";

const { Option } = Select;

/* ── Design tokens ── */
const COLOR = {
    blue: "#1e40af", blueLt: "#3b82f6", text: "#1e293b", textMid: "#475569",
    textSoft: "#64748b", border: "#e2e8f0", headBg: "#1a2236",
    danger: "#e21216", success: "#16a34a", draft: "#d97706",
    draftBg: "#fff7ed", draftBorder: "#fde68a", bg: "#f8fafc",
};
const FF = "'Segoe UI', system-ui, sans-serif";

const STEPS = [
    "Academic Details",
    "Student Information",
    "Parent Information",
    "General Information",
    "Bank Details",
];

/* ── Helper: always return a safe array from academicHistory ── */
const safeHistory = (raw) => {
    if (!raw) return [{ id: 1, schoolName: "", standard: "", duration: "" }];
    if (Array.isArray(raw)) return raw.length ? raw : [{ id: 1, schoolName: "", standard: "", duration: "" }];
    if (typeof raw === "string") {
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) && parsed.length ? parsed : [{ id: 1, schoolName: "", standard: "", duration: "" }];
        } catch { return [{ id: 1, schoolName: "", standard: "", duration: "" }]; }
    }
    return [{ id: 1, schoolName: "", standard: "", duration: "" }];
};

/* ── Reusable small button ── */
const ActionBtn = ({ children, onClick, variant = "default", disabled = false }) => {
    const [hov, setHov] = React.useState(false);
    const S = {
        default: { bg: "#f1f5f9", col: COLOR.textMid, border: `1px solid ${COLOR.border}`, hov: "#e2e8f0" },
        primary: { bg: COLOR.blue, col: "#fff", border: "none", hov: "#1a3580" },
        danger: { bg: COLOR.danger, col: "#fff", border: "none", hov: "#b91c1c" },
        draft: { bg: COLOR.draftBg, col: COLOR.draft, border: `1px solid ${COLOR.draftBorder}`, hov: "#fef3c7" },
        success: { bg: COLOR.success, col: "#fff", border: "none", hov: "#15803d" },
    };
    const s = S[variant] || S.default;
    return (
        <button type="button" onClick={onClick} disabled={disabled}
            onMouseEnter={() => !disabled && setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                all: "unset", display: "inline-flex", alignItems: "center", gap: 5,
                padding: "6px 14px", borderRadius: 7, fontSize: "12.5px", fontWeight: 600,
                cursor: disabled ? "not-allowed" : "pointer",
                background: disabled ? "#e2e8f0" : hov ? s.hov : s.bg,
                color: disabled ? "#94a3b8" : s.col,
                border: s.border, transition: "all 0.15s", whiteSpace: "nowrap",
            }}>
            {children}
        </button>
    );
};

/* ── Full-width Form.Item ── */
const FI = ({ label, name, rules, children, extra, hidden }) => (
    <Form.Item label={label} name={name} rules={rules} extra={extra} hidden={hidden}
        style={{ width: "100%", marginBottom: 16 }}
        labelCol={{ style: { fontWeight: 600, fontSize: "13px", color: COLOR.textMid, paddingBottom: 3 } }}>
        {children}
    </Form.Item>
);

/* ── Section header bar ── */
const SectionHead = ({ title }) => (
    <div style={{
        fontSize: 13, fontWeight: 700, color: COLOR.headBg,
        padding: "7px 12px", background: COLOR.bg,
        borderLeft: `4px solid ${COLOR.blue}`,
        borderRadius: 5, marginBottom: 14, marginTop: 6, letterSpacing: "0.3px",
    }}>{title}</div>
);

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
const CreateApplicationhsc = ({ isEdit = false }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [form] = Form.useForm();

    const [loading, setLoading] = useState(false);
    const [grades, setGrades] = useState([]);
    const [schools, setSchools] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [progressColor, setProgressColor] = useState("#ff4d4f");

    const user = JSON.parse(localStorage.getItem("user"));
    const schoolId = user?.school?.id;
    const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
    const isSuperAdmin = role === "superadmin";

    const [dob, setDOB] = useState("");
    const [age, setAge] = useState({ years: 0, months: 0, days: 0 });
    const [selectedGradeName, setSelectedGradeName] = useState("");
    const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
    const [academicHistory, setAcademicHistory] = useState([
        { id: 1, schoolName: "", standard: "", duration: "" }
    ]);

    const stepColors = ["#ff4d4f", "#ffa940", "#faad14", "#52c41a", "#1e40af"];

    useEffect(() => { setProgressColor(stepColors[currentStep] || "#1e40af"); }, [currentStep]);
    useEffect(() => { if (isSuperAdmin) fetchAllSchools(); }, [isSuperAdmin]);
    useEffect(() => { if (isEdit && id) loadEditData(); }, [isEdit, id]);

    /* ── Load edit data ── */
    const loadEditData = async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/applicationhsc/getApplicationhscById/${id}`);
            const data = res.data.application;
            const year = data.academicYear || "";
            setSelectedAcademicYear(year);

            if (isSuperAdmin) {
                await fetchAllSchools();
                if (data.school_id) await fetchGrades(data.school_id, year);
            } else {
                await fetchGrades(schoolId, year);
            }

            const ageParsed = (() => {
                if (!data.age) return { years: 0, months: 0, days: 0 };
                if (typeof data.age === "object" && !Array.isArray(data.age)) return data.age;
                try { return JSON.parse(data.age); } catch { return { years: 0, months: 0, days: 0 }; }
            })();

            const historyParsed = safeHistory(data.academicHistory);

            form.setFieldsValue({
                ...data,
                age: ageParsed,
                emisNum: data.emisNum ? String(data.emisNum) : "",
                aadharNumber: data.aadharNumber ? String(data.aadharNumber) : "",
            });
            setDOB(data.dob || "");
            setAge(ageParsed);
            setAcademicHistory(historyParsed);

            if (data.grade_id && grades.length) {
                const g = grades.find(g => g.id === data.grade_id);
                if (g) setSelectedGradeName(g.grade);
            }
        } catch (err) {
            console.error(err);
            message.error("Failed to load application");
        }
    };

    const fetchAllSchools = async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/school/getAllSchools`);
            setSchools(res.data.schools || []);
        } catch { message.error("Failed to fetch schools"); }
    };

    const fetchGrades = async (sid, year) => {
        try {
            const url = year
                ? `${process.env.REACT_APP_API_URL}/grade/getGradesBySchoolAndYear/${sid}/${year}`
                : `${process.env.REACT_APP_API_URL}/grade/getGradesBySchool/${sid}`;
            const res = await axios.get(url);
            setGrades(res.data.grades || []);
        } catch { message.error("Failed to fetch grades"); }
    };

    const handleSchoolChange = (sid) => {
        form.setFieldsValue({ grade_id: undefined }); setGrades([]);
        if (selectedAcademicYear) fetchGrades(sid, selectedAcademicYear);
    };

    const handleAcademicYearChange = (year) => {
        setSelectedAcademicYear(year);
        form.setFieldsValue({ grade_id: undefined }); setGrades([]);
        const sid = isSuperAdmin ? form.getFieldValue("school_id") : schoolId;
        if (sid && year) fetchGrades(sid, year);
    };

    /* ── Age helpers ── */
    const calculateAge = (dobVal) => {
        if (!dobVal) return { years: 0, months: 0, days: 0 };
        const today = new Date(), birth = new Date(dobVal);
        let years = today.getFullYear() - birth.getFullYear(),
            months = today.getMonth() - birth.getMonth(),
            days = today.getDate() - birth.getDate();
        if (months < 0 || (months === 0 && days < 0)) { years--; months += 12; }
        if (days < 0) { months--; days += new Date(today.getFullYear(), today.getMonth(), 0).getDate(); }
        return { years, months, days };
    };
    const formatAge = ({ years, months, days }) => {
        let s = "";
        if (years > 0) s += `${years} year${years > 1 ? "s" : ""}`;
        if (months > 0) s += `${s ? ", " : ""}${months} month${months > 1 ? "s" : ""}`;
        if (days > 0) s += `${s ? ", " : ""}${days} day${days > 1 ? "s" : ""}`;
        return s || "0 days";
    };

    /* ── Validators ── */
    const validateDOB = (_, value) => {
        const cy = new Date().getFullYear();
        if (!selectedGradeName || !value) return Promise.resolve();
        const map = {
            "XI": [cy - 18, cy - 14],
            "XII": [cy - 19, cy - 15],
        };
        const range = map[selectedGradeName.toUpperCase()];
        if (!range) return Promise.resolve();
        const yr = new Date(value).getFullYear();
        if (yr < range[0] || yr > range[1]) return Promise.reject(`DOB doesn't match grade ${selectedGradeName}`);
        return Promise.resolve();
    };
    const validateMarks = (_, value) => {
        if (value === undefined || value === null || value === "") return Promise.resolve();
        if (Number(value) > 100) return Promise.reject("Marks cannot exceed 100");
        return Promise.resolve();
    };

    const validateAccountNumber = (_, value) => {
        if (!value || value.trim().length < 8) return Promise.reject("Account number must be at least 8 characters");
        return Promise.resolve();
    };

    const validateEmail = (_, v) => {
        if (!v) return Promise.resolve();
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
            ? Promise.resolve() : Promise.reject("Enter a valid email address");
    };

    /* ── Academic history helpers ── */
    const handleInputChange = (rowId, key, value) =>
        setAcademicHistory(prev => prev.map(r => r.id === rowId ? { ...r, [key]: value } : r));
    const handleAddRow = () => {
        if (academicHistory.length < 4)
            setAcademicHistory(prev => [...prev, { id: prev.length + 1, schoolName: "", standard: "", duration: "" }]);
    };
    const handleRemoveRow = (rowId) =>
        setAcademicHistory(prev => prev.filter(r => r.id !== rowId));

    /* ── Auto-calculate total & percentage ── */
    const calculateTotalAndPercentage = (values) => {
        const total = ["tamil", "english", "maths", "science", "social"]
            .map(s => parseInt(values[s], 10) || 0)
            .reduce((a, b) => a + b, 0);
        form.setFieldsValue({ total, percentage: (total / 5).toFixed(2) });
    };

    /* ── Navigation ── */
    const handleNext = () => form.validateFields().then(() => setCurrentStep(s => s + 1)).catch(() => { });
    const handlePrev = () => setCurrentStep(s => s - 1);
    const handleCancel = () => navigate("/applicationhsc");

    /* ── Build Payload ── */
    const buildPayload = (validatedValues) => {
        const allStored = form.getFieldsValue(true);
        const merged = { ...allStored, ...validatedValues };
        const ageObj = calculateAge(merged.dob || dob);
        return {
            ...merged,
            dob: merged.dob || dob,
            age: JSON.stringify(ageObj),
            school_id: isSuperAdmin ? merged.school_id : schoolId,
            academicHistory: JSON.stringify(academicHistory),
            emisNum: merged.emisNum ? String(merged.emisNum).trim() : undefined,
            aadharNumber: merged.aadharNumber ? String(merged.aadharNumber).trim() : undefined,
            pincode: merged.pincode ? String(merged.pincode).trim() : undefined,
            mobileNumber: merged.mobileNumber ? String(merged.mobileNumber).trim() : undefined,
            telephoneNumber: merged.telephoneNumber ? String(merged.telephoneNumber).trim() : undefined,
            guardianNumber: merged.guardianNumber ? String(merged.guardianNumber).trim() : undefined,
            accountNumber: merged.accountNumber ? String(merged.accountNumber).trim() : undefined,
        };
    };

    /* ── Step required fields (for draft per-step validation) ── */
    const stepFieldNames = [
        ["school_id", "academicYear", "emisNum", "aadharNumber"],
        ["name", "gender", "grade_id", "dob", "mobileNumber", "nationality", "state", "motherTongue", "birthdistrict",
            "religion", "community", "identificationmarks", "previousmedium", "preferredmedium", "bloodGroup"],
        ["fatherName", "motherName", "fatherOccupation", "motherOccupation",
            "fatherIncome", "motherIncome", "address"],
        ["examYear", "photocopyofTC"],
        ["bankName", "branchName", "accountNumber", "ifsccode"],
    ];

    /* ── Save Draft ── */
    const handleDraft = async () => {
        setLoading(true);
        try {
            const stepValues = await form.validateFields(stepFieldNames[currentStep]);
            const sid = isSuperAdmin ? (form.getFieldValue("school_id") || stepValues.school_id) : schoolId;
            const acYear = form.getFieldValue("academicYear") || stepValues.academicYear || selectedAcademicYear;

            if (!sid) { message.error("Please select a school first."); setLoading(false); return; }
            if (!acYear) { message.error("Please select an academic year first."); setLoading(false); return; }

            const payload = buildPayload({ school_id: sid, academicYear: acYear });

            const url = isEdit
                ? `${process.env.REACT_APP_API_URL}/applicationhsc/updateApplicationhsc/${id}`
                : `${process.env.REACT_APP_API_URL}/applicationhsc/createApplicationhsc`;
            await axios[isEdit ? "put" : "post"](url, payload);
            message.success("Application saved as draft!");
            navigate("/applicationhsc");
        } catch (err) {
            if (err?.errorFields) message.error("Please fix the highlighted fields on this step before saving.");
            else message.error(err.response?.data?.error || "Failed to save draft");
        }
        setLoading(false);
    };

    /* ── Submit (Final) ── */
    const handleSubmit = async () => {
        setLoading(true);
        try {
            await form.validateFields(stepFieldNames[currentStep]);

            const sid = isSuperAdmin ? form.getFieldValue("school_id") : schoolId;
            const acYear = form.getFieldValue("academicYear") || selectedAcademicYear;

            if (!sid) { message.error("School is missing. Please go back to Step 1."); setLoading(false); return; }
            if (!acYear) { message.error("Academic year is missing. Please go back to Step 1."); setLoading(false); return; }

            const payload = buildPayload({ school_id: sid, academicYear: acYear });

            if (!isEdit) {
                const existing = await axios.get(`${process.env.REACT_APP_API_URL}/applicationhsc/getApplicationhscsBySchool/${sid}`);
                const apps = existing.data.applicationhscs || [];
                if (apps.some(a => String(a.emisNum) === String(payload.emisNum))) {
                    message.error("EMIS number already exists."); setLoading(false); return;
                }
                if (apps.some(a => String(a.aadharNumber) === String(payload.aadharNumber))) {
                    message.error("Aadhar number already exists."); setLoading(false); return;
                }
            }

            const url = isEdit
                ? `${process.env.REACT_APP_API_URL}/applicationhsc/updateApplicationhsc/${id}`
                : `${process.env.REACT_APP_API_URL}/applicationhsc/createApplicationhsc`;
            const res = await axios[isEdit ? "put" : "post"](url, payload);
            message.success(isEdit
                ? "Application updated successfully!"
                : `Application created! No: ${res.data.application?.applicationNumber}`);
            navigate("/applicationhsc");
        } catch (err) {
            if (err?.errorFields) message.error("Please complete all required fields.");
            else message.error(err.response?.data?.error || "Failed to submit application");
        }
        setLoading(false);
    };

    /* ── Indian states ── */
    const statesInIndia = [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
        "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
        "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
        "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
        "Uttarakhand", "West Bengal", "Others",
    ];

    /* ═══════════════════════════════════════════════
       STEP CONTENT
    ═══════════════════════════════════════════════ */
    const stepContent = [

        /* ── Step 0: Academic Details ── */
        <>
            <SectionHead title="School & Academic Year" />
            {isSuperAdmin ? (
                <FI name="school_id" label="School" rules={[{ required: true, message: "Please select a school" }]}>
                    <Select placeholder="Select school" onChange={handleSchoolChange} showSearch style={{ width: "100%" }}>
                        {schools.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                    </Select>
                </FI>
            ) : (
                <>
                    <Form.Item name="school_id" hidden initialValue={schoolId}><Input type="hidden" /></Form.Item>
                    <FI label="School Name">
                        <Input value={user?.school?.name || "N/A"} disabled style={{ width: "100%" }} />
                    </FI>
                </>
            )}
            <FI name="academicYear" label="Academic Year" rules={[{ required: true, message: "Required!" }]}>
                <Select placeholder="Select academic year" onChange={handleAcademicYearChange} style={{ width: "100%" }}>
                    <Option value="2025-2026">2025-2026</Option>
                    <Option value="2026-2027">2026-2027</Option>
                </Select>
            </FI>

            <SectionHead title="Identification Numbers" />
            <FI name="emisNum" label="EMIS Number" rules={[
                { pattern: /^[0-9]{10,15}$/, message: "Enter a valid 10–15 digit number!" },
            ]}>
                <Input placeholder="Enter EMIS Number" style={{ width: "100%" }}
                    onInput={e => { e.target.value = e.target.value.replace(/[^0-9]/g, "").slice(0, 15); }} />
            </FI>
            <FI name="aadharNumber" label="Aadhar Number" rules={[
                { required: true, message: "Enter Aadhar number!" },
                { pattern: /^[0-9]{12}$/, message: "Enter a valid 12-digit number!" },
            ]}>
                <Input placeholder="Enter Aadhar Number" style={{ width: "100%" }}
                    onInput={e => { e.target.value = e.target.value.replace(/[^0-9]/g, "").slice(0, 12); }} />
            </FI>
        </>,

        /* ── Step 1: Student Information ── */
        <>
            <SectionHead title="Student Details" />
            <FI name="name" label="Full Name" rules={[{ required: true, message: "Please enter student name!" }]}>
                <Input placeholder="Enter full name" style={{ width: "100%" }} />
            </FI>
            <FI name="gender" label="Gender" rules={[{ required: true, message: "Please select gender!" }]}>
                <Radio.Group>
                    <Radio value="Male">Male</Radio>
                    <Radio value="Female">Female</Radio>
                    <Radio value="Others">Others</Radio>
                </Radio.Group>
            </FI>
            <FI name="grade_id" label="Grade"
                rules={[{ required: true, message: "Please select a grade!" }]}
                extra={!selectedAcademicYear ? "Please select Academic Year first (Step 1) to load grades." : ""}>
                <Select
                    placeholder={selectedAcademicYear ? "Select grade" : "Select Academic Year first"}
                    disabled={!selectedAcademicYear} style={{ width: "100%" }}
                    onChange={v => { const g = grades.find(g => g.id === v); setSelectedGradeName(g?.grade || ""); }}>
                    {grades.filter(g => ["XI", "XII"].includes(g.grade.toUpperCase()))
                        .map(g => <Option key={g.id} value={g.id}>{g.grade}</Option>)}
                </Select>
            </FI>
            <FI name="dob" label="Date of Birth"
                rules={[{ required: true, message: "Please select date of birth!" }, { validator: validateDOB }]}>
                <Input type="date" value={dob} style={{ width: "100%" }}
                    onChange={e => { const d = e.target.value; setDOB(d); setAge(calculateAge(d)); form.setFieldValue("dob", d); }} />
            </FI>
            <FI label="Age">
                <Input value={formatAge(age)} disabled style={{ width: "100%", color: COLOR.text }} />
            </FI>
                        <FI name="mobileNumber" label="Mobile Number" rules={[
                { required: true, message: "Mobile number is required!" },
                { pattern: /^[0-9]{10}$/, message: "Enter a valid 10-digit mobile number!" },
            ]}>
                <Input placeholder="Enter mobile number" style={{ width: "100%" }}
                    onInput={e => { e.target.value = e.target.value.replace(/[^0-9]/g, "").slice(0, 10); }} />
            </FI>
            <FI name="previousmedium" label="Previous Medium" rules={[{ required: true, message: "Required!" }]}>
                <Select placeholder="Select Medium" style={{ width: "100%" }}>
                    <Option value="Tamil">Tamil</Option>
                    <Option value="English">English</Option>
                </Select>
            </FI>
            <FI name="preferredmedium" label="Preferred Medium of Study" rules={[{ required: true, message: "Required!" }]}>
                <Select placeholder="Select Medium" style={{ width: "100%" }}>
                    <Option value="Tamil">Tamil</Option>
                    <Option value="English">English</Option>
                </Select>
            </FI>
            <SectionHead title="Personal Details" />
            <FI name="nationality" label="Nationality" rules={[{ required: true, message: "Required!" }]}>
                <Select placeholder="Select Nationality" style={{ width: "100%" }}>
                    <Option value="India">India</Option>
                    <Option value="Non-Indian">Non-Indian</Option>
                </Select>
            </FI>
            <FI name="state" label="State" rules={[{ required: true, message: "Required!" }]}>
                <Select placeholder="Select State" style={{ width: "100%" }}>
                    {statesInIndia.map(s => <Option key={s} value={s}>{s}</Option>)}
                </Select>
            </FI>
            <FI name="motherTongue" label="Mother Tongue" rules={[{ required: true, message: "Required!" }]}>
                <Select placeholder="Select Mother Tongue" style={{ width: "100%" }}>
                    {["Tamil", "English", "Hindi", "Bengali", "Telugu", "Marathi", "Gujarati", "Urdu",
                        "Kannada", "Odia", "Malayalam", "Punjabi", "Assamese", "Others"]
                        .map(t => <Option key={t} value={t}>{t}</Option>)}
                </Select>
            </FI>
            <FI name="birthdistrict" label="Birth District" rules={[{ required: true, message: "Required!" }]}>
                <Input placeholder="Enter birth district" style={{ width: "100%" }} />
            </FI>
            <FI name="religion" label="Religion" rules={[{ required: true, message: "Required!" }]}>
                <Select placeholder="Select Religion" style={{ width: "100%" }}>
                    {["Hindu", "Muslim", "Christian", "Jainism", "Others"].map(r => <Option key={r} value={r}>{r}</Option>)}
                </Select>
            </FI>
            <FI name="community" label="Community" rules={[{ required: true, message: "Required!" }]}>
                <Select placeholder="Select Community" style={{ width: "100%" }}>
                    {["BC", "MBC", "SC", "ST", "OC", "OBC", "Others"].map(c => <Option key={c} value={c}>{c}</Option>)}
                </Select>
            </FI>
            <FI name="caste" label="Caste">
                <Input placeholder="Enter caste" style={{ width: "100%" }} />
            </FI>

            <SectionHead title="Additional Information" />
            <FI name="scheduledcasteOrtribecommunity" label="Is the student from scheduled caste / tribe community?">
                <Radio.Group><Radio value="Yes">Yes</Radio><Radio value="No">No</Radio></Radio.Group>
            </FI>
            <FI name="backwardcaste" label="Is the student from backward caste?">
                <Radio.Group><Radio value="Yes">Yes</Radio><Radio value="No">No</Radio></Radio.Group>
            </FI>
            <FI name="tribeTootherreligion" label="Is the student a convert from tribe to other religion?">
                <Radio.Group><Radio value="Yes">Yes</Radio><Radio value="No">No</Radio></Radio.Group>
            </FI>
            <FI name="living" label="Living with">
                <Select placeholder="Select" style={{ width: "100%" }}>
                    <Option value="Parents">Parents</Option>
                    <Option value="Guardian">Guardian</Option>
                    <Option value="Others">Others</Option>
                </Select>
            </FI>
            <FI name="currentlivingaddress" label="Current Living Address" >
                <Input.TextArea autoSize={{ minRows: 3, maxRows: 5 }} placeholder="Enter current living address" maxLength={500} style={{ width: "100%" }} />
            </FI>
            <FI name="identificationmarks" label="Identification Marks" rules={[{ required: true, message: "Required!" }]}>
                <Input placeholder="Enter identification marks" style={{ width: "100%" }} />
            </FI>
            <FI name="bloodGroup" label="Blood Group" rules={[{ required: true, message: "Required!" }]}>
                <Select placeholder="Select Blood Group" style={{ width: "100%" }}>
                    {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-", "A1B+ve", "A1+ve", "A1-ve", "A2+ve", "RH"].map(b => <Option key={b} value={b}>{b}</Option>)}
                </Select>
            </FI>
        </>,

        /* ── Step 2: Parent Information ── */
        <>
            <SectionHead title="Father's Details" />
            <FI name="fatherName" label="Father's Name" rules={[{ required: true, message: "Please enter father's name!" }]}>
                <Input placeholder="Enter father's name" style={{ width: "100%" }} />
            </FI>
            <FI name="fatherOccupation" label="Father's Occupation" rules={[{ required: true, message: "Required!" }]}>
                <Input placeholder="Enter father's occupation" style={{ width: "100%" }} />
            </FI>
            <FI name="fatherIncome" label="Father's Annual Income" rules={[{ required: true, message: "Required!" }]}>
                <Input placeholder="Enter father's income" maxLength={10} style={{ width: "100%" }}
                    onInput={e => { e.target.value = e.target.value.replace(/[^0-9,]/g, ""); }} />
            </FI>

            <SectionHead title="Mother's Details" />
            <FI name="motherName" label="Mother's Name" rules={[{ required: true, message: "Please enter mother's name!" }]}>
                <Input placeholder="Enter mother's name" style={{ width: "100%" }} />
            </FI>
            <FI name="motherOccupation" label="Mother's Occupation" rules={[{ required: true, message: "Required!" }]}>
                <Input placeholder="Enter mother's occupation" style={{ width: "100%" }} />
            </FI>
            <FI name="motherIncome" label="Mother's Annual Income" rules={[{ required: true, message: "Required!" }]}>
                <Input placeholder="Enter mother's income" maxLength={10} style={{ width: "100%" }}
                    onInput={e => { e.target.value = e.target.value.replace(/[^0-9,]/g, ""); }} />
            </FI>

            <SectionHead title="Contact & Address" />
            <FI name="address" label="Address" rules={[{ required: true, message: "Required!" }]}>
                <Input placeholder="Enter address" style={{ width: "100%" }} />
            </FI>
            <FI name="pincode" label="Pincode" rules={[{ pattern: /^[0-9]{6}$/, message: "Invalid pincode!" }]}>
                <Input placeholder="Enter 6-digit pincode" style={{ width: "100%" }}
                    onInput={e => { e.target.value = e.target.value.replace(/[^0-9]/g, "").slice(0, 6); }} />
            </FI>
            <FI name="parentEmail" label="Parent's Email ID" rules={[{ validator: validateEmail }]}>
                <Input placeholder="Enter parent's email address" type="email" style={{ width: "100%" }} />
            </FI>
            <SectionHead title="Guardian Details" />
            <FI name="guardianName" label="Guardian's Name">
                <Input placeholder="Enter guardian's name" style={{ width: "100%" }} />
            </FI>
            <FI name="guardianOccupation" label="Guardian's Occupation">
                <Input placeholder="Enter guardian's occupation" style={{ width: "100%" }} />
            </FI>
            <FI name="guardianAddress" label="Guardian Address">
                <Input.TextArea autoSize={{ minRows: 3 }} placeholder="Enter guardian address" style={{ width: "100%" }} />
            </FI>
            <FI name="guardianNumber" label="Guardian Phone Number" rules={[{ pattern: /^[0-9]{10}$/, message: "Invalid phone number!" }]}>
                <Input placeholder="Enter guardian phone number" style={{ width: "100%" }}
                    onInput={e => { e.target.value = e.target.value.replace(/[^0-9]/g, "").slice(0, 10); }} />
            </FI>
        </>,

        /* ── Step 3: General Information (Academic History + SSLC Marks + TC Details) ── */
        <>
            {/* ── Academic History (same as SSLC) ── */}
            <SectionHead title="Student's Academic History" />
            <Form.Item label="Previous School Records" style={{ marginBottom: 16 }}
                labelCol={{ style: { fontWeight: 600, fontSize: "13px", color: COLOR.textMid, paddingBottom: 3 } }}>
                <div style={{
                    display: "flex", gap: 8, marginBottom: 8, padding: "7px 10px",
                    background: COLOR.bg, borderRadius: 6, border: `1px solid ${COLOR.border}`
                }}>
                    <div style={{ flex: 2, fontSize: 12, fontWeight: 600, color: COLOR.textSoft }}>School Name</div>
                    <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: COLOR.textSoft }}>Standard</div>
                    <div style={{ flex: 1.5, fontSize: 12, fontWeight: 600, color: COLOR.textSoft }}>Year (From – To)</div>
                    <div style={{ width: 50 }} />
                </div>
                {academicHistory.map((item, idx) => (
                    <div key={item.id} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <Input style={{ flex: 2 }} placeholder={`School Name ${idx + 1}`}
                            value={item.schoolName} onChange={e => handleInputChange(item.id, "schoolName", e.target.value)} />
                        <Input style={{ flex: 1 }} placeholder="Standard"
                            value={item.standard} onChange={e => handleInputChange(item.id, "standard", e.target.value)} />
                        <Input style={{ flex: 1.5 }} placeholder="e.g. 2022–2023"
                            value={item.duration} onChange={e => handleInputChange(item.id, "duration", e.target.value)} />
                        <div style={{ width: 50, display: "flex", alignItems: "center" }}>
                            {academicHistory.length > 1 && (
                                <button type="button" onClick={() => handleRemoveRow(item.id)}
                                    style={{
                                        all: "unset", cursor: "pointer", color: COLOR.danger, fontSize: 13,
                                        fontWeight: 600, padding: "3px 7px", borderRadius: 5,
                                        background: "rgba(226,18,22,0.07)"
                                    }}>✕</button>
                            )}
                        </div>
                    </div>
                ))}
                <button type="button" onClick={handleAddRow} disabled={academicHistory.length >= 4}
                    style={{
                        all: "unset", cursor: academicHistory.length >= 4 ? "not-allowed" : "pointer",
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "6px 14px", border: `1px dashed ${COLOR.border}`,
                        borderRadius: 6, fontSize: 13, color: COLOR.textMid,
                        background: COLOR.bg, marginTop: 4, opacity: academicHistory.length >= 4 ? 0.5 : 1
                    }}>
                    + Add Row
                </button>
            </Form.Item>

            {/* ── SSLC Examination Details ── */}
            <SectionHead title="SSLC Examination Details" />
            <FI name="examYear" label="Exam Year" rules={[{ required: true, message: "Required!" }]}>
                <Input
                    placeholder="e.g. 2024"
                    maxLength={4}
                    style={{ width: "100%" }}
                />
            </FI>
            <FI name="registrationNumber" label="Registration Number" rules={[{ required: true, message: "Required!" }]}>
                <Input
                    placeholder="Enter registration number"
                    maxLength={15}
                    style={{ width: "100%" }}
                    onInput={e => { e.target.value = e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 15); }}
                />
            </FI>

            <SectionHead title="SSLC Marks" />
            <Form.Item
                style={{ marginBottom: 16 }}
                labelCol={{ style: { fontWeight: 600, fontSize: "13px", color: COLOR.textMid, paddingBottom: 3 } }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" }}>
                    {[
                        { name: "tamil", label: "Tamil" },
                        { name: "english", label: "English" },
                        { name: "maths", label: "Mathematics" },
                        { name: "science", label: "Science" },
                        { name: "social", label: "Social Science" },
                    ].map(({ name, label }) => (
                        <Form.Item key={name} name={name} label={label}
                            rules={[{ validator: validateMarks }]}
                            style={{ marginBottom: 0 }}
                            labelCol={{ style: { fontWeight: 600, fontSize: "13px", color: COLOR.textMid, paddingBottom: 3 } }}>
                            <Input maxLength={3} style={{ width: "100%" }}
                                onInput={e => { e.target.value = e.target.value.replace(/[^0-9]/g, "").slice(0, 3); }}
                                onChange={() => {
                                    const vals = form.getFieldsValue(["tamil", "english", "maths", "science", "social"]);
                                    const tot = ["tamil", "english", "maths", "science", "social"]
                                        .map(s => parseInt(vals[s], 10) || 0).reduce((a, b) => a + b, 0);
                                    form.setFieldsValue({ total: tot, percentage: (tot / 5).toFixed(2) });
                                }} />
                        </Form.Item>
                    ))}
                    <Form.Item name="total" label="Total"
                        style={{ marginBottom: 0 }}
                        labelCol={{ style: { fontWeight: 600, fontSize: "13px", color: COLOR.textMid, paddingBottom: 3 } }}>
                        <Input readOnly disabled style={{ width: "100%", background: "#f8fafc" }} />
                    </Form.Item>
                    <Form.Item name="percentage" label="Percentage"
                        style={{ marginBottom: 0 }}
                        labelCol={{ style: { fontWeight: 600, fontSize: "13px", color: COLOR.textMid, paddingBottom: 3 } }}>
                        <Input readOnly disabled style={{ width: "100%", background: "#f8fafc" }} />
                    </Form.Item>
                </div>
            </Form.Item>

            <SectionHead title="TC Details" />
            <FI name="terminationreason" label="Reason for Discontinuation / Termination">
                <Input.TextArea autoSize={{ minRows: 3, maxRows: 5 }} placeholder="Enter reason" maxLength={500} style={{ width: "100%" }} />
            </FI>
            <FI name="photocopyofTC" label="Is the photocopy of TC submitted?"
                rules={[{ required: true, message: "Required!" }]}>
                <Radio.Group><Radio value="Yes">Yes</Radio><Radio value="No">No</Radio></Radio.Group>
            </FI>

        </>,

        /* ── Step 4: Bank Details ── */
        <>
            <SectionHead title="Bank Account Information" />
            <FI name="bankName" label="Bank Name" rules={[{ required: true, message: "Please enter bank name!" }]}>
                <Input placeholder="Enter bank name" style={{ width: "100%" }} />
            </FI>
            <FI name="branchName" label="Branch Name" rules={[{ required: true, message: "Please enter branch name!" }]}>
                <Input placeholder="Enter branch name" maxLength={50} style={{ width: "100%" }}
                    onInput={e => { e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, "").slice(0, 50); }} />
            </FI>
            <FI name="accountNumber" label="Bank Account Number" rules={[{ validator: validateAccountNumber }]}>
                <Input placeholder="Enter account number (min 8 characters)" maxLength={20} style={{ width: "100%" }} />
            </FI>
            <FI name="ifsccode" label="IFSC Code"
                rules={[{ required: true, message: "Please enter IFSC Code!" }]}>
                <Input placeholder="Enter IFSC Code" style={{ width: "100%" }} />
            </FI>
        </>,
    ];

    /* ═══════════════════════════════════════════════
       RENDER
    ═══════════════════════════════════════════════ */
    return (
        <Layout>
            <div style={{ fontFamily: FF, maxWidth: 860, margin: "0 auto", paddingBottom: 40 }}>

                <div style={{ marginBottom: 22 }}>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: COLOR.text, margin: 0, letterSpacing: "-0.3px" }}>
                        {isEdit ? "Edit HSC Application" : "Create HSC Application"}
                    </h1>
                    <div style={{ width: 40, height: 3, background: COLOR.blueLt, borderRadius: 2, marginTop: 6 }} />
                </div>

                <div style={{
                    background: "#fff", borderRadius: 12,
                    boxShadow: "0 2px 16px rgba(0,0,0,0.09)",
                    border: `1px solid ${COLOR.border}`, overflow: "hidden",
                    marginTop: 8, marginBottom: 24,
                }}>
                    {/* Dark header: progress bar + stepper */}
                    <div style={{ background: COLOR.headBg, padding: "20px 32px 0" }}>
                        <div style={{ marginBottom: 14 }}>
                            <Progress
                                percent={Math.round(((currentStep + 1) / STEPS.length) * 100)}
                                strokeColor={progressColor}
                                trailColor="rgba(255,255,255,0.15)"
                                showInfo={false}
                            />
                        </div>
                        <Steps current={currentStep} size="small"
                            style={{ marginBottom: 0, paddingBottom: 20 }}
                            items={STEPS.map(t => ({
                                title: <span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{t}</span>
                            }))}
                        />
                    </div>

                    {/* Step badge */}
                    <div style={{
                        background: COLOR.bg, padding: "9px 32px",
                        borderBottom: `1px solid ${COLOR.border}`,
                        display: "flex", alignItems: "center", gap: 8,
                    }}>
                        <span style={{
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            width: 22, height: 22, borderRadius: "50%",
                            background: progressColor, color: "#fff", fontSize: 11, fontWeight: 700,
                        }}>{currentStep + 1}</span>
                        <span style={{ fontWeight: 700, color: COLOR.text, fontSize: 13 }}>{STEPS[currentStep]}</span>
                        <span style={{ fontSize: 12, color: COLOR.textSoft, marginLeft: "auto" }}>
                            Step {currentStep + 1} of {STEPS.length}
                        </span>
                    </div>

                    {/* Form body */}
                    <div style={{ padding: "24px 32px 0 32px" }}>
                        <Form form={form} layout="vertical" onFinish={handleSubmit} preserve={true}>
                            <div style={{ minHeight: 280 }}>
                                {stepContent[currentStep]}
                            </div>

                            {/* Action bar */}
                            <div style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                padding: "16px 0 24px",
                                borderTop: `1px solid ${COLOR.border}`,
                                marginTop: 20, gap: 10, flexWrap: "wrap",
                            }}>
                                {/* Left: Cancel + Previous */}
                                <div style={{ display: "flex", gap: 8 }}>
                                    <ActionBtn variant="danger" onClick={handleCancel}>✕ Cancel</ActionBtn>
                                    {currentStep > 0 && (
                                        <ActionBtn variant="default" onClick={handlePrev}>← Previous</ActionBtn>
                                    )}
                                </div>

                                {/* Right: Draft (steps 1–3) + Next / Submit */}
                                <div style={{ display: "flex", gap: 8 }}>
                                    {currentStep >= 1 && currentStep <= 3 && (
                                        <ActionBtn variant="draft" onClick={handleDraft} disabled={loading}>
                                            Save Draft
                                        </ActionBtn>
                                    )}
                                    {currentStep < STEPS.length - 1 ? (
                                        <ActionBtn variant="primary" onClick={handleNext}>Next →</ActionBtn>
                                    ) : (
                                        <ActionBtn variant="success" onClick={handleSubmit} disabled={loading}>
                                            {loading ? "Submitting…" : "✓ Submit Application"}
                                        </ActionBtn>
                                    )}
                                </div>
                            </div>
                        </Form>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default CreateApplicationhsc;