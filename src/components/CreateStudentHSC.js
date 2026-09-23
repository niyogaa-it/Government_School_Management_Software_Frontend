import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { Form, Input, message, Select, Radio, Steps, Progress, Checkbox } from "antd";
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
            return Array.isArray(parsed) && parsed.length
                ? parsed
                : [{ id: 1, schoolName: "", standard: "", duration: "" }];
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
const CreateStudenthsc = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const isEdit = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [grades, setGrades] = useState([]);
    const [sections, setSections] = useState([]);
    const [schools, setSchools] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [progressColor, setProgressColor] = useState("#ff4d4f");

    const user = JSON.parse(localStorage.getItem("user"));
    const schoolId = user?.school?.id;
    const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");

    const [dob, setDOB] = useState("");
    const [age, setAge] = useState({ years: 0, months: 0, days: 0 });
    const [selectedGradeName, setSelectedGradeName] = useState("");
    const [academicHistory, setAcademicHistory] = useState([
        { id: 1, schoolName: "", standard: "", duration: "" }
    ]);

    const stepColors = ["#ff4d4f", "#ffa940", "#faad14", "#52c41a", "#1e40af"];

    useEffect(() => { setProgressColor(stepColors[currentStep] || "#1e40af"); }, [currentStep]);

    // ── Sync selectedSubjects into form field whenever subjects list or selection changes
    // This ensures checkboxes are ticked correctly even after async state updates
    useEffect(() => {
        if (isEdit && selectedSubjects.length > 0 && subjects.length > 0) {
            form.setFieldsValue({ group_subjects: selectedSubjects });
        }
    }, [subjects, selectedSubjects]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (role === "superadmin") fetchAllSchools();
    }, [role, schoolId]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Load edit data ── */
    useEffect(() => {
        if (!id) return;
        const fetchStudentForEdit = async () => {
            try {
                const res = await axios.get(
                    `${process.env.REACT_APP_API_URL}/studenthsc/getStudenthscById/${id}`
                );
                const data = res.data.student;
                const dobValue = data.dob ? data.dob.split("T")[0] : "";
                const parsedAge = typeof data.age === "string" ? JSON.parse(data.age) : calculateAge(dobValue);
                // const rawSubjects = data.group_subjects
                //     ? (typeof data.group_subjects === "string" ? JSON.parse(data.group_subjects) : data.group_subjects)
                //     : [];
                let rawSubjects = [];
                if (data.group_subjects) {
                    if (Array.isArray(data.group_subjects)) {
                        rawSubjects = data.group_subjects;
                    } else if (typeof data.group_subjects === "string") {
                        // Handle comma-separated "12,14" from bulk upload
                        if (data.group_subjects.startsWith("[")) {
                            try { rawSubjects = JSON.parse(data.group_subjects); } catch { rawSubjects = []; }
                        } else {
                            rawSubjects = data.group_subjects.split(",").map(s => s.trim()).filter(Boolean);
                        }
                    }
                }
                const parsedSubjects = Array.isArray(rawSubjects) ? rawSubjects.map(s => String(s)) : [];

                if (data.school_id && data.academicYear) {
                    await fetchGradesBySchoolAndYear(data.school_id, data.academicYear);
                }

                let loadedSubjects = [];
                if (data.school_id && data.grade_id) {
                    await fetchSections(data.school_id, data.grade_id);
                    // Fetch subjects for the student's CURRENT grade AND year so IDs match stored values
                    loadedSubjects = await fetchSubjectsBySchoolAndGrade(data.school_id, data.grade_id, true, data.academicYear);
                    // Explicitly set subjects state so checkboxes exist before we tick them
                    setSubjects(loadedSubjects);
                }

                // ── FIX: Do NOT filter parsedSubjects against loadedSubjects.
                // After promotion the server already remapped group_subjects to the new
                // grade's IDs, so parsedSubjects already contains the correct XII IDs.
                // Filtering would discard them whenever the subject list loads slightly
                // later than the state update.  Trust the server-stored IDs directly.
                const validSubjectIds = parsedSubjects;

                // Set AFTER all awaits complete so nothing can overwrite these
                setSelectedSubjects(validSubjectIds);
                form.setFieldsValue({
                    ...data,
                    dob: dobValue,
                    grade_id: data.grade_id || data.Grade?.id,
                    section_id: data.section_id || data.Section?.id,
                    school_id: data.school_id,
                    group_subjects: validSubjectIds,
                    registrationNumber: data.registrationNumber || data.registrationnumber,
                });

                setDOB(dobValue);
                setAge(parsedAge);

                const historyParsed = safeHistory(data.academicHistory);
                setAcademicHistory(historyParsed);

                if (data.Grade?.grade) setSelectedGradeName(data.Grade.grade);
            } catch {
                message.error("Failed to load student data");
            }
        };
        fetchStudentForEdit();
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── API helpers ── */
    const fetchAllSchools = async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/school/getAllSchools`);
            setSchools(res.data.schools || []);
        } catch { message.error("Failed to fetch schools"); }
    };

    const fetchGradesBySchoolAndYear = async (sid, year) => {
        if (!sid || !year) return;
        try {
            const res = await axios.get(
                `${process.env.REACT_APP_API_URL}/grade/getGradesBySchoolAndYear/${sid}/${year}`
            );
            setGrades(res.data.grades || []);
        } catch (err) {
            setGrades([]);
            if (err.response?.status !== 404) message.error("Failed to fetch grades");
        }
    };

    const fetchSections = async (sid, gid) => {
        if (!sid || !gid) return;
        try {
            const res = await axios.get(
                `${process.env.REACT_APP_API_URL}/section/getSectionsBySchoolAndGrade/${sid}/${gid}`
            );
            setSections(res.data.sections || []);
        } catch { message.error("Failed to fetch sections"); }
    };

    const fetchSubjectsBySchoolAndGrade = async (sid, gid, preserveSelected = false, academicYear = null) => {
        if (!sid || !gid) return [];
        try {
            let list = [];
            // If we have an academicYear, prefer the year-scoped endpoint so IDs match stored values
            if (academicYear) {
                try {
                    const res = await axios.get(
                        `${process.env.REACT_APP_API_URL}/subject/getSubjectsBySchoolAndYear/${sid}/${academicYear}`
                    );
                    // Filter to the specific grade
                    const all = res.data.subjects || [];
                    list = all.filter(
                        (s) => String(s.grade_id) === String(gid) || String(s.Grade?.id) === String(gid)
                    );
                } catch { list = []; }
            }
            // Fallback to grade-only endpoint if year endpoint returned nothing
            if (list.length === 0) {
                const res = await axios.get(
                    `${process.env.REACT_APP_API_URL}/subject/getSubjectsBySchoolAndGrade/${sid}/${gid}`
                );
                list = res.data.subjects || [];
            }
            setSubjects(list);
            // preserveSelected=true during edit load → do NOT wipe selectedSubjects
            if (!preserveSelected) {
                setSelectedSubjects(prev => (Array.isArray(prev) ? prev : []).filter(id => list.some(s => String(s.id) === String(id))));
            }
            return list;
        } catch { message.error("Failed to fetch subjects"); return []; }
    };

    /* ── Event handlers ── */
    const handleSchoolChange = () => {
        form.setFieldsValue({ grade_id: undefined, section_id: undefined, academicYear: undefined });
        setGrades([]); setSections([]); setSubjects([]); setSelectedSubjects([]);
    };

    const handleAcademicYearChange = (year) => {
        form.setFieldsValue({ grade_id: undefined, section_id: undefined });
        setGrades([]); setSections([]); setSubjects([]); setSelectedSubjects([]);
        const sid = role === "superadmin" ? form.getFieldValue("school_id") : schoolId;
        if (sid && year) fetchGradesBySchoolAndYear(sid, year);
    };

    const handleNext = () => {
        form.validateFields().then(() => setCurrentStep(s => s + 1));
    };

    const handlePrev = () => setCurrentStep(s => s - 1);

    const handleCancel = () => navigate("/studenthsc");

    /* ── Utilities ── */
    const calculateAge = (d) => {
        if (!d) return { years: 0, months: 0, days: 0 };
        const today = new Date(), birth = new Date(d);
        let years = today.getFullYear() - birth.getFullYear();
        let months = today.getMonth() - birth.getMonth();
        let days = today.getDate() - birth.getDate();
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

    const validateDOB = (_, value) => {
        if (!selectedGradeName) return Promise.resolve();
        const cy = new Date().getFullYear();
        const ranges = { XI: [cy - 18, cy - 14], XII: [cy - 19, cy - 15] };
        const r = ranges[selectedGradeName.toUpperCase()];
        if (!r) return Promise.reject("Invalid grade selected!");
        const y = new Date(value).getFullYear();
        if (y < r[0] || y > r[1]) return Promise.reject(`DOB doesn't match selected grade (${selectedGradeName})`);
        return Promise.resolve();
    };

    const validateMarks = (_, value) => {
        if (value > 100) return Promise.reject(new Error("Marks cannot exceed 100"));
        return Promise.resolve();
    };

    const calculateTotalAndPercentage = (values) => {
        const total = ["tamil", "english", "maths", "science", "social"]
            .map(f => parseInt(values[f], 10) || 0).reduce((a, b) => a + b, 0);
        form.setFieldsValue({ total, percentage: (total / 5).toFixed(2) });
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
    const handleInputChange = (index, field, value) => {
        const updated = [...academicHistory];
        updated[index][field] = value;
        setAcademicHistory(updated);
    };
    const handleAddRow = () => {
        if (academicHistory.length < 4)
            setAcademicHistory(prev => [...prev, { id: Date.now(), schoolName: "", standard: "", duration: "" }]);
    };
    const handleRemoveRow = (index) =>
        setAcademicHistory(prev => prev.filter((_, i) => i !== index));

    const statesinindia = [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
        "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
        "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
        "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Others",
    ];

    /* ── Build payload (merges ALL steps including unmounted) ── */
    const buildPayload = (overrides = {}) => {
        const allStored = form.getFieldsValue(true); // includes unmounted step fields
        const merged = { ...allStored, ...overrides };
        const ageObj = calculateAge(merged.dob || dob);
        return {
            ...merged,
            dob: merged.dob || dob,
            age: JSON.stringify(ageObj),
            school_id: role === "superadmin"
                ? (merged.school_id || schoolId)
                : schoolId,
            academicHistory: JSON.stringify(academicHistory),
            group_subjects: merged.group_subjects || selectedSubjects || [],
            emisNum: merged.emisNum ? String(merged.emisNum).trim() : undefined,
            aadharNumber: merged.aadharNumber ? String(merged.aadharNumber).trim() : undefined,
            pincode: merged.pincode ? String(merged.pincode).trim() : undefined,
            mobileNumber: merged.mobileNumber ? String(merged.mobileNumber).trim() : undefined,
            guardianNumber: merged.guardianNumber ? String(merged.guardianNumber).trim() : undefined,
            accountNumber: merged.accountNumber ? String(merged.accountNumber).trim() : undefined,
        };
    };

    /* ── Draft ── */
    const handleDraft = async () => {
        setLoading(true);
        try {
            const payload = buildPayload();
            if (!payload.school_id) { message.error("School is required"); setLoading(false); return; }
            if (!payload.academicYear) { message.error("Academic Year is required"); setLoading(false); return; }
            const url = isEdit
                ? `${process.env.REACT_APP_API_URL}/studenthsc/updateStudenthsc/${id}`
                : `${process.env.REACT_APP_API_URL}/studenthsc/createStudenthsc`;
            await axios[isEdit ? "put" : "post"](url, payload);
            message.success(isEdit ? "Application updated!" : "Draft saved!");
            navigate("/studenthsc");
        } catch (err) {
            message.error(err?.response?.data?.error || "Failed to save draft");
        }
        setLoading(false);
    };

    /* ── Submit ── */
    const handleSubmit = async () => {
        setLoading(true);
        try {
            const validatedValues = await form.validateFields();
            const payload = buildPayload(validatedValues);
            const url = isEdit
                ? `${process.env.REACT_APP_API_URL}/studenthsc/updateStudenthsc/${id}`
                : `${process.env.REACT_APP_API_URL}/studenthsc/createStudenthsc`;
            const res = await axios[isEdit ? "put" : "post"](url, payload);
            message.success(
                isEdit ? "Student updated!" : `Student created! No: ${res.data.application?.admissionNumber}`
            );
            if (isEdit) { navigate("/studenthsc"); }
            else { form.resetFields(); setGrades([]); setSections([]); setSubjects([]); setSelectedSubjects([]); setAcademicHistory([{ id: 1, schoolName: "", standard: "", duration: "" }]); }
        } catch (err) {
            message.error(err?.response?.data?.error || "Failed to submit");
        }
        setLoading(false);
    };

    /* ════════════════════════════════════════
       STEP CONTENT
    ════════════════════════════════════════ */
    const stepContent = [

        /* ── Step 0: Academic Details ── */
        <>
            <SectionHead title="School & Academic Year" />
            {role === "superadmin" ? (
                <FI name="school_id" label="School" rules={[{ required: true, message: "Please select a school!" }]}>
                    <Select placeholder="Select school" onChange={handleSchoolChange} showSearch optionFilterProp="children">
                        {schools.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                    </Select>
                </FI>
            ) : (
                <>
                    <FI name="school_id" hidden><Input type="hidden" /></FI>
                    <FI label="School Name">
                        <Input value={user?.school?.name || "N/A"} disabled />
                    </FI>
                </>
            )}
            <FI name="academicYear" label="Academic Year" rules={[{ required: true, message: "Please select academic year!" }]}>
                <Select placeholder="Select" onChange={handleAcademicYearChange}>
                    <Option value="2025-2026">2025-2026</Option>
                    <Option value="2026-2027">2026-2027</Option>
                </Select>
            </FI>
            <FI name="dateofjoin" label="Date of Join" rules={[{ required: true, message: "Select Date of Joining!" }]}>
                <Input type="date" style={{ width: "100%" }} />
            </FI>
            <SectionHead title="Identification Numbers" />
            <FI name="emisNum" label="EMIS Number" rules={[
                { required: true, message: "Enter EMIS Number!" },
                { pattern: /^[0-9]{10,15}$/, message: "Enter a valid 10–15 digit number!" },
            ]}>
                <Input placeholder="Enter EMIS Number" style={{ width: "100%" }} />
            </FI>
            <FI name="aadharNumber" label="Aadhar Number" rules={[
                { required: true, message: "Enter Aadhar number!" },
                { pattern: /^[0-9]{12}$/, message: "Enter a valid 12-digit number!" },
            ]}>
                <Input placeholder="Enter 12-digit Aadhar number" maxLength={12} style={{ width: "100%" }}
                    onInput={e => { e.target.value = e.target.value.replace(/[^0-9]/g, "").slice(0, 12); }} />
            </FI>
        </>,

        /* ── Step 1: Student Information ── */
        <>
            <SectionHead title="Student Details" />
            <FI name="name" label="Full Name" rules={[{ required: true, message: "Please enter student name!" }]}>
                <Input placeholder="Enter full name" style={{ width: "100%" }} />
            </FI>
            <FI name="gender" label="Gender" rules={[{ required: true, message: "Select gender!" }]}>
                <Radio.Group>
                    <Radio value="Male">Male</Radio>
                    <Radio value="Female">Female</Radio>
                    <Radio value="Others">Others</Radio>
                </Radio.Group>
            </FI>
            <FI name="grade_id" label="Grade" rules={[{ required: true, message: "Please select a grade!" }]}>
                <Select
                    placeholder={grades.length === 0 ? "Select Academic Year first" : "Select grade"}
                    disabled={grades.length === 0}
                    onChange={(gid) => {
                        form.setFieldsValue({ section_id: undefined });
                        const g = grades.find(x => x.id === gid);
                        setSelectedGradeName(g?.grade || "");
                        const sid = role === "superadmin" ? form.getFieldValue("school_id") : schoolId;
                        const yr  = form.getFieldValue("academicYear");
                        if (sid && gid) { fetchSections(sid, gid); fetchSubjectsBySchoolAndGrade(sid, gid, false, yr || null); }
                    }}
                >
                    {grades.filter(g => ["XI", "XII"].includes(g.grade.toUpperCase())).map(g => (
                        <Option key={g.id} value={g.id}>{g.grade}</Option>
                    ))}
                </Select>
            </FI>
            <FI name="section_id" label="Section" rules={[{ required: true, message: "Please select section!" }]}>
                <Select placeholder="Select Section">
                    {sections.map(s => <Option key={s.id} value={s.id}>{s.sectionName}</Option>)}
                </Select>
            </FI>
            <FI name="group_subjects" label="Group / Subjects" rules={[{ required: true, message: "Please select at least one subject!" }]}>
                <Checkbox.Group
                    value={selectedSubjects.map(String)}
                    onChange={(vals) => { const strVals = vals.map(String); setSelectedSubjects(strVals); form.setFieldsValue({ group_subjects: strVals }); }}
                    style={{ width: "100%" }}
                >
                    <div style={{
                        border: `1px solid ${COLOR.border}`, padding: 10, borderRadius: 6,
                        maxHeight: 200, overflowY: "auto",
                    }}>
                        {subjects.length > 0
                            ? subjects.map(s => (
                                <div key={s.id}><Checkbox value={String(s.id)}>{s.subjectName}</Checkbox></div>
                            ))
                            : <p style={{ color: COLOR.textSoft, margin: 0 }}>No subjects available</p>
                        }
                    </div>
                </Checkbox.Group>
            </FI>
            <FI name="dob" label="Date of Birth" rules={[
                { required: true, message: "Please select date of birth!" },
                ...(isEdit ? [] : [{ validator: validateDOB }]),
            ]}>
                <Input type="date" value={dob} style={{ width: "100%" }}
                    onChange={(e) => {
                        const v = e.target.value;
                        setDOB(v); setAge(calculateAge(v));
                        form.setFieldValue("dob", v);
                    }} />
            </FI>
            <FI label="Age">
                <Input value={formatAge(age)} disabled style={{ width: "100%" }} />
            </FI>
            <FI name="previousmedium" label="Previous Medium" rules={[{ required: true, message: "Required!" }]}>
                <Select placeholder="Select">
                    <Option value="Tamil">Tamil</Option>
                    <Option value="English">English</Option>
                </Select>
            </FI>
            <FI name="preferredmedium" label="Preferred Medium of Study" rules={[{ required: true, message: "Required!" }]}>
                <Select placeholder="Select">
                    <Option value="Tamil">Tamil</Option>
                    <Option value="English">English</Option>
                </Select>
            </FI>
            <SectionHead title="Personal Details" />
            <FI name="nationality" label="Nationality" rules={[{ required: true, message: "Required!" }]}>
                <Select placeholder="Select Nationality">
                    <Option value="India">India</Option>
                    <Option value="Non-Indian">Non-Indian</Option>
                </Select>
            </FI>
            <FI name="state" label="State" rules={[{ required: true, message: "Required!" }]}>
                <Select placeholder="Select State">
                    {statesinindia.map(s => <Option key={s} value={s}>{s}</Option>)}
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
                <Input style={{ width: "100%" }} />
            </FI>
            <FI name="religion" label="Religion" rules={[{ required: true, message: "Required!" }]}>
                <Select placeholder="Select Religion">
                    {["Hindu", "Muslim", "Christian", "Jainism", "Others"].map(r => <Option key={r} value={r}>{r}</Option>)}
                </Select>
            </FI>
            <FI name="community" label="Community" rules={[{ required: true, message: "Required!" }]}>
                <Select placeholder="Select Community">
                    {["BC", "MBC", "SC", "ST", "OC", "OBC", "Others"].map(c => <Option key={c} value={c}>{c}</Option>)}
                </Select>
            </FI>
            <FI name="caste" label="Caste" >
                <Input style={{ width: "100%" }} />
            </FI>
            <SectionHead title="Additional Information" />
            <FI name="scheduledcasteOrtribecommunity" label="Is the student from scheduled caste / tribe community?">
                <Radio.Group>
                    <Radio value="Yes">Yes</Radio>
                    <Radio value="No">No</Radio>
                </Radio.Group>
            </FI>
            <FI name="backwardcaste" label="Is the student from backward caste?">
                <Radio.Group>
                    <Radio value="Yes">Yes</Radio>
                    <Radio value="No">No</Radio>
                </Radio.Group>
            </FI>
            <FI name="tribeTootherreligion" label="Is the student a convert from tribe to other religion?">
                <Radio.Group>
                    <Radio value="Yes">Yes</Radio>
                    <Radio value="No">No</Radio>
                </Radio.Group>
            </FI>
            <FI name="living" label="Living With">
                <Select placeholder="Select">
                    {["Parents", "Guardian", "Others"].map(l => <Option key={l} value={l}>{l}</Option>)}
                </Select>
            </FI>
            <FI name="currentlivingaddress" label="Current Living Address">
                <Input.TextArea autoSize={{ minRows: 3, maxRows: 5 }} style={{ width: "100%" }} />
            </FI>
            <FI name="identificationmarks" label="Identification Marks" rules={[{ required: true, message: "Required!" }]}>
                <Input style={{ width: "100%" }} />
            </FI>
            <FI name="bloodGroup" label="Blood Group" rules={[{ required: true, message: "Required!" }]}>
                <Select placeholder="Select Blood Group">
                    {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-", "A1B+ve", "A1+ve", "A1-ve", "A2+ve", "RH"].map(b => <Option key={b} value={b}>{b}</Option>)}
                </Select>
            </FI>
        </>,

        /* ── Step 2: Parent Information ── */
        <>
            <SectionHead title="Father's Details" />
            <FI name="fatherName" label="Father Name" rules={[{ required: true, message: "Required!" }]}>
                <Input style={{ width: "100%" }} />
            </FI>
            <FI name="fatherOccupation" label="Father Occupation" rules={[{ required: true, message: "Required!" }]}>
                <Input style={{ width: "100%" }} />
            </FI>
            <FI name="fatherIncome" label="Father Annual Income" rules={[{ required: true, message: "Required!" }]}>
                <Input style={{ width: "100%" }} />
            </FI>

            <SectionHead title="Mother's Details" />
            <FI name="motherName" label="Mother Name" rules={[{ required: true, message: "Required!" }]}>
                <Input style={{ width: "100%" }} />
            </FI>
            <FI name="motherOccupation" label="Mother Occupation" rules={[{ required: true, message: "Required!" }]}>
                <Input style={{ width: "100%" }} />
            </FI>
            <FI name="motherIncome" label="Mother Annual Income" rules={[{ required: true, message: "Required!" }]}>
                <Input style={{ width: "100%" }} />
            </FI>

            <SectionHead title="Contact & Address" />
            <FI name="address" label="Address" rules={[{ required: true, message: "Required!" }]}>
                <Input.TextArea autoSize={{ minRows: 3, maxRows: 5 }} style={{ width: "100%" }} />
            </FI>
            <FI name="pincode" label="Pincode" rules={[
                { required: true, message: "Required!" },
                { pattern: /^[0-9]{6}$/, message: "Enter valid 6-digit pincode!" },
            ]}>
                <Input maxLength={6} style={{ width: "100%" }}
                    onInput={e => { e.target.value = e.target.value.replace(/[^0-9]/g, "").slice(0, 6); }} />
            </FI>
            <FI name="parentEmail" label="Parent's Email ID" rules={[{ validator: validateEmail }]}>
                <Input placeholder="Enter parent's email address" type="email" style={{ width: "100%" }} />
            </FI>
           <FI
    name="mobileNumber"
    label="Mobile Number"
    validateTrigger={["onChange", "onBlur"]}
    rules={[
        { required: true, message: "Mobile number is required!" },
        {
            validator: (_, value) => {
                if (!value) return Promise.resolve(); // let `required` handle empty
                if (!/^[0-9]+$/.test(value)) {
                    return Promise.reject("Only digits are allowed!");
                }
                if (value.length < 10) {
                    return Promise.reject("Mobile number must be exactly 10 digits!");
                }
                if (value.length > 10) {
                    return Promise.reject("Mobile number cannot exceed 10 digits!");
                }
                if (!/^[6-9]/.test(value)) {
                    return Promise.reject("Mobile number must start with 6, 7, 8, or 9!");
                }
                return Promise.resolve();
            },
        },
    ]}
>
    <Input
        maxLength={10}
        style={{ width: "100%" }}
        onInput={(e) => {
            // Strip non-digits and hard-cap at 10 characters, even on paste
            e.target.value = e.target.value.replace(/[^0-9]/g, "").slice(0, 10);
        }}
        onPaste={(e) => {
            e.preventDefault();
            const pasted = (e.clipboardData || window.clipboardData)
                .getData("text")
                .replace(/[^0-9]/g, "")
                .slice(0, 10);
            e.target.value = pasted;
            // trigger onChange manually since we prevented default paste
            const event = new Event("input", { bubbles: true });
            e.target.dispatchEvent(event);
        }}
    />
</FI>

            <SectionHead title="Guardian Details" />
            <FI name="guardianName" label="Guardian Name">
                <Input style={{ width: "100%" }} />
            </FI>
            <FI name="guardianOccupation" label="Guardian Occupation">
                <Input style={{ width: "100%" }} />
            </FI>
            <FI name="guardianAddress" label="Guardian Address">
                <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} style={{ width: "100%" }} />
            </FI>
            <FI name="guardianNumber" label="Guardian Mobile">
                <Input maxLength={10} style={{ width: "100%" }}
                    onInput={e => { e.target.value = e.target.value.replace(/[^0-9]/g, "").slice(0, 10); }} />
            </FI>
        </>,

        /* ── Step 3: General Information (Previous Academics) ── */
        <>
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
                {(Array.isArray(academicHistory) ? academicHistory : []).map((item, index) => (
                    <div key={item.id || index} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <Input style={{ flex: 2 }} placeholder={`School Name ${index + 1}`}
                            value={item.schoolName || ""}
                            onChange={e => handleInputChange(index, "schoolName", e.target.value)} />
                        <Input style={{ flex: 1 }} placeholder="Standard"
                            value={item.standard || ""}
                            onChange={e => handleInputChange(index, "standard", e.target.value)} />
                        <Input style={{ flex: 1.5 }} placeholder="e.g. 2022–2023"
                            value={item.duration || ""}
                            onChange={e => handleInputChange(index, "duration", e.target.value)} />
                        <div style={{ width: 50, display: "flex", alignItems: "center" }}>
                            {academicHistory.length > 1 && (
                                <button type="button" onClick={() => handleRemoveRow(index)}
                                    style={{
                                        all: "unset", cursor: "pointer", color: COLOR.danger,
                                        fontSize: 13, fontWeight: 600, padding: "3px 7px",
                                        borderRadius: 5, background: "rgba(226,18,22,0.07)"
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
                <Input.TextArea autoSize={{ minRows: 3, maxRows: 3 }} placeholder="Enter reason" maxLength={500} />
            </FI>
            <FI name="photocopyofTC" label="Is photocopy of TC submitted?" rules={[{ required: true, message: "Required!" }]}>
                <Radio.Group>
                    <Radio value="Yes">Yes</Radio>
                    <Radio value="No">No</Radio>
                </Radio.Group>
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
                        {isEdit ? "Edit HSC Student Application" : "Create HSC Student Application"}
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
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={handleSubmit}
                            preserve={true}
                            onValuesChange={(changed, all) => {
                                const markFields = ["tamil", "english", "maths", "science", "social"];
                                if (markFields.some(f => f in changed)) calculateTotalAndPercentage(all);
                            }}
                        >
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

export default CreateStudenthsc;