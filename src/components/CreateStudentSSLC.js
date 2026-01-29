import { useNavigate, useParams } from "react-router-dom";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Button, Form, Input, Spin, Typography, message, Select, Radio, Steps, Card, Row, Col, Progress } from 'antd';


const { Title } = Typography;
const { Step } = Steps;
const { Option } = Select;

const CreateStudentsslc = () => {

    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [grades, setGrades] = useState([]);
    const [sections, setSections] = useState([]);
    const { id } = useParams();
    const isEdit = Boolean(id);
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
    const [academicHistory, setAcademicHistory] = useState([
        { id: 1, schoolName: '', standard: '', duration: '' },
    ]);

    const stepFields = [
        ['school_id', 'academicYear', 'dateofjoin', 'emisNum', 'aadharNumber'], // Step 0
        ['name', 'gender', 'grade_id', 'section_id', 'dob', 'age', 'nationality', 'state', 'motherTongue', 'hometown', 'religion', 'community',
            'tribecommunity', 'exgratiasalary', 'religionchanging', 'living', 'vaccinated', 'identificationmarks', 'bloodGroup', 'physical', 'physicalDetails'], // Step 1
        ['fatherName', 'motherName', 'fatherOccupation', 'motherOccupation', 'fatherIncome', 'motherIncome', 'address', 'pincode', 'telephoneNumber',
            'mobileNumber', 'guardianName', 'guardianOccupation', 'guardianAddress', 'guardianNumber', 'parentconsentform'],  // Step 2
        ['academicHistory', 'passorfail', 'tceslc', 'firstLanguage'], // Step 3
        ['bankName', 'branchName', 'accountNumber', 'ifsccode'] // Step 4
    ];

    useEffect(() => {
        if (role === "superadmin") {
            fetchAllSchools();
        } else if (schoolId) {
            fetchGrades(schoolId);
        }
        form.setFieldsValue({ academicHistory });
    }, [role, schoolId, academicHistory]);


    useEffect(() => {
        const colors = ["#ff4d4f", "#ffa940", "#faad14", "#52c41a"];
        setProgressColor(colors[currentStep]);
    }, [currentStep]);

    useEffect(() => {
        if (!id) return;

        const fetchStudentForEdit = async () => {
            try {
                const res = await axios.get(
                    `http://localhost:8080/studentsslc/getStudentsslcById/${id}`
                );

                const data = res.data.application;

                const dobValue = data.dob ? data.dob.split("T")[0] : "";
                const parsedAge =
                    typeof data.age === "string"
                        ? JSON.parse(data.age)
                        : calculateAge(dobValue);

                // ✅ set FORM values
                form.setFieldsValue({
                    ...data,
                    dob: dobValue,
                    grade_id: data.grade_id || data.Grade?.id,
                    section_id: data.section_id || data.Section?.id,
                    school_id: data.school_id
                });

                // ✅ set STATE values (THIS WAS MISSING)
                setDOB(dobValue);
                setAge(parsedAge);

                // Load dependent dropdowns
                if (data.school_id) {
                    await fetchGrades(data.school_id);
                }

                if (data.school_id && data.grade_id) {
                    fetchSectionsBySchoolAndGrade(data.school_id, data.grade_id);
                }

            } catch (error) {
                message.error("Failed to load student data");
            }
        };

        fetchStudentForEdit();
    }, [id]);


    const handleSchoolChange = (selectedSchoolId) => {
        // Reset grade and section fields
        form.setFieldsValue({ grade_id: undefined, section_id: undefined });

        // Clear previous state
        setGrades([]);
        setSections([]);

        // Fetch new grades for the selected school
        fetchGrades(selectedSchoolId);
    };

    const fetchAllSchools = async () => {
        try {
            const response = await axios.get("http://localhost:8080/school/getAllSchools");
            setSchools(response.data.schools || []);
        } catch (error) {
            message.error("Failed to fetch schools");
        }
    };

    const handleNext = () => {
        form.validateFields().then(() => {
            setCurrentStep(currentStep + 1);
        });
    };

    const handlePrev = () => {
        setCurrentStep(currentStep - 1);
    };

    const fetchGrades = async (selectedSchoolId) => {
        if (!selectedSchoolId) return;

        try {
            const res = await axios.get(
                `http://localhost:8080/grade/getGradesBySchool/${selectedSchoolId}`
            );
            setGrades(res.data.grades || []);
        } catch (error) {
            console.error("Error fetching grades:", error);
            message.error("Failed to fetch grades");
        }
    };

    const fetchSectionsBySchoolAndGrade = async (schoolId, gradeId) => {
        try {
            const response = await axios.get(
                `http://localhost:8080/section/getSectionsBySchoolAndGrade/${schoolId}/${gradeId}`
            );
            setSections(response.data.sections || []);
        } catch (error) {
            console.error("Error fetching sections:", error);
            message.error("Failed to fetch sections for this school and grade");
        }
    };

    const validateDOB = (_, value) => {
        const gradeId = form.getFieldValue("grade_id");

        if (!value || !gradeId) {
            return Promise.reject("Please select grade before DOB");
        }

        const grade = grades.find(g => g.id === gradeId);
        const gradeName = grade?.grade;

        if (!gradeName) return Promise.resolve();

        const currentYear = new Date().getFullYear();
        let minYear, maxYear;

        switch (gradeName) {
            case 'I': minYear = currentYear - 8; maxYear = currentYear - 5; break;
            case 'II': minYear = currentYear - 9; maxYear = currentYear - 6; break;
            case 'III': minYear = currentYear - 10; maxYear = currentYear - 7; break;
            case 'IV': minYear = currentYear - 11; maxYear = currentYear - 8; break;
            case 'V': minYear = currentYear - 12; maxYear = currentYear - 9; break;
            case 'VI': minYear = currentYear - 13; maxYear = currentYear - 10; break;
            case 'VII': minYear = currentYear - 14; maxYear = currentYear - 11; break;
            case 'VIII': minYear = currentYear - 15; maxYear = currentYear - 12; break;
            case 'IX': minYear = currentYear - 16; maxYear = currentYear - 13; break;
            case 'X': minYear = currentYear - 17; maxYear = currentYear - 14; break;
            default:
                return Promise.resolve();
        }

        const selectedYear = new Date(value).getFullYear();
        if (selectedYear < minYear || selectedYear > maxYear) {
            return Promise.reject(`DOB doesn't match Grade ${gradeName}`);
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


    const handleInputChange = (id, key, value) => {
        const updatedAcademicHistory = academicHistory.map((item) =>
            item.id === id ? { ...item, [key]: value } : item
        );
        setAcademicHistory(updatedAcademicHistory);
    };

    const handleAddRow = () => {
        if (academicHistory.length < 4) {
            const newRow = {
                id: academicHistory.length + 1,
                schoolName: '',
                standard: '',
                duration: '',
            };
            setAcademicHistory([...academicHistory, newRow]);
        }
    };

    const handleRemoveRow = (id) => {
        const updatedAcademicHistory = academicHistory.filter((item) => item.id !== id);
        setAcademicHistory(updatedAcademicHistory);
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

        try {
            const currentStepFields = stepFields.slice(0, currentStep + 1).flat();
            const values = await form.validateFields(currentStepFields);

            if (!values.dob) {
                message.error("Date of Birth is required");
                setLoading(false);
                return;
            }

            const ageObj = calculateAge(values.dob);

            const payload = {
                ...values,
                dob: values.dob,
                age: JSON.stringify(ageObj),
                school_id: role === "superadmin" ? values.school_id : schoolId
            };

            const url = isEdit
                ? `http://localhost:8080/studentsslc/updateStudentsslc/${id}`
                : "http://localhost:8080/studentsslc/createStudentsslc";

            await axios[isEdit ? "put" : "post"](url, payload);

            message.success(
                isEdit ? "Draft updated successfully!" : "Draft saved successfully!"
            );

            navigate("/studentsslc");

        } catch (error) {
            console.error("Draft save error:", error);
            message.error(error.response?.data?.error || "Failed to save draft");
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

            const url = isEdit
                ? `http://localhost:8080/studentsslc/updateStudentsslc/${id}`
                : "http://localhost:8080/studentsslc/createStudentsslc";

            const response = await axios[isEdit ? "put" : "post"](url, payload);

            message.success(
                isEdit
                    ? "Student updated successfully!"
                    : `Student created! Number: ${response.data.application.admissionNumber}`
            );

            if (isEdit) {
                navigate("/studentsslc");
            } else {
                form.resetFields();
            }

        } catch (error) {
            console.error("Submit error:", error);
            message.error(error.response?.data?.error || "Failed to submit student");
        }

        setLoading(false);
    };

    const stepContent = [
        // Step 1: Academic Details
        <>
            {role === "superadmin" ? (
                <Form.Item name="school_id" label="School" rules={[{ required: true }]}>
                    <Select placeholder="Select school" onChange={handleSchoolChange} showSearch>
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
                >
                    <Option value="2025-2026">2025-2026</Option>
                </Select>
            </Form.Item>
            <Form.Item
                name="dateofjoin"
                label="Date Of Join"
                rules={[{ required: true, message: 'Select Date of Joining!' }]}>
                <Input
                    type='date'
                />
            </Form.Item>
            <Form.Item label="EMIS Number" name="emisNum" rules={[
                { required: true, message: "Enter EMIS Number!" },
                { pattern: /^[0-9]{11}$/, message: "Enter a valid 11-digit number!" }
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

            <Form.Item
                label="Grade"
                name="grade_id"
                rules={[{ required: true, message: "Please select grade!" }]}
            >
                <Select
                    placeholder="Select grade"
                    onChange={(gradeId) => {
                        const selectedSchoolId =
                            role === "superadmin"
                                ? form.getFieldValue("school_id")
                                : user?.school?.id;

                        // keep this (optional)
                        const gradeObj = grades.find(g => g.id === gradeId);
                        setSelectedGradeName(gradeObj?.grade);

                        form.setFieldsValue({ section_id: undefined });
                        setSections([]);

                        if (selectedSchoolId && gradeId) {
                            fetchSectionsBySchoolAndGrade(selectedSchoolId, gradeId);
                        }
                    }}
                >
                    {grades.map((g) => (
                        <Option key={g.id} value={g.id}>
                            {g.grade}
                        </Option>
                    ))}
                </Select>
            </Form.Item>

            <Form.Item
                label="Section"
                name="section_id"
                rules={[{ required: true, message: "Please select section!" }]}
            >
                <Select placeholder="Select section" disabled={!sections.length}>
                    {sections.map((section) => (
                        <Option key={section.id} value={section.id}>
                            {section.sectionName}
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
                    value={dob}   // ✅ ADD THIS
                    onChange={(e) => {
                        const dobValue = e.target.value;
                        setDOB(dobValue);

                        const newAge = calculateAge(dobValue);
                        setAge(newAge);

                        form.setFieldValue("dob", dobValue);
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

            <Form.Item label="Home Town" name="hometown" rules={[{ required: true, message: 'Required!' }]}>
                <Input />
            </Form.Item>
            <Form.Item label="Religion" name="religion">
                <Input />
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
                    <Option value="DNC">DNC</Option>
                    <Option value="FC">FC</Option>
                    <Option value="OBC">OBC</Option>
                    <Option value="BCM">BCM</Option>
                    <Option value="Others">Others</Option>
                </Select>
            </Form.Item>
            <Form.Item
                name="tribecommunity"
                label="Is the student from scheduled tribe community?"
            >
                <Radio.Group >
                    <Radio value="Yes">Yes</Radio>
                    <Radio value="No" >No</Radio>
                </Radio.Group>
            </Form.Item>
            <Form.Item
                name="exgratiasalary"
                label="Is the caste entitled to get ex-gratia salary?"
            >
                <Radio.Group >
                    <Radio value="Yes">Yes</Radio>
                    <Radio value="No" >No</Radio>
                </Radio.Group>
            </Form.Item>
            <Form.Item
                name="religionchanging"
                label="Is the student a convert from Hinduism to Christianity?"
            >
                <Radio.Group >
                    <Radio value="Yes">Yes</Radio>
                    <Radio value="No" >No</Radio>
                </Radio.Group>
            </Form.Item>
            <Form.Item
                label="Living with whom"
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
                name="vaccinated"
                label="Is the student for chicken pox? Is scar Available?"
            >
                <Radio.Group >
                    <Radio value="Yes">Yes</Radio>
                    <Radio value="No" >No</Radio>
                </Radio.Group>
            </Form.Item>
            <Form.Item label="Identification Marks" name="identificationmarks" rules={[{ required: true, message: "Required!" }]}>
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
                    <Option value="O+ve">O+VE</Option>
                    <Option value="O-ve">O-VE</Option>
                    <Option value="A+ve">A+VE</Option>
                    <Option value="A-ve">A-VE</Option>
                    <Option value="B+ve">B+VE</Option>
                    <Option value="B-ve">B-VE</Option>
                    <Option value="AB+ve">AB+VE</Option>
                    <Option value="AB-ve">AB-VE</Option>
                    <Option value="A1+ve">A1+VE</Option>
                    <Option value="A1-ve">A1-VE</Option>
                    <Option value="A1B+ve">A1B+VE</Option>
                    <Option value="A1B-ve">A1B-VE</Option>
                    <Option value="A2B+ve">A2B+VE</Option>
                    <Option value="A2B-ve">A2B-VE</Option>
                </Select>
            </Form.Item>
            <Form.Item
                name="physical"
                label="Is the student Physically challenged?"
            >
                <Radio.Group >
                    <Radio value="Yes">Yes</Radio>
                    <Radio value="No" >No</Radio>
                </Radio.Group>
            </Form.Item>
            <Form.Item
                name="physicalDetails"
                label="If He/ She Physically challenged Specify, Otherwish Enter Null">
                <Input.TextArea
                    autoSize={{ minRows: 3, maxRows: 3 }}
                    placeholder="Enter Your Reason"
                    maxLength={500} />
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
                rules={[{ pattern: /^[0-9]{10}$/, message: "Invalid phone number!" }]}
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

            <Form.Item
                name="parentconsentform"
                label="Is parent consent Hardcopy is attached?"
            >
                <Radio.Group >
                    <Radio value="Yes">Yes</Radio>
                    <Radio value="No" >No</Radio>
                </Radio.Group>
            </Form.Item>
        </>,

        // Step 3: Academic Details
        <>
            <Form.Item label="Student's Academic History">
                {academicHistory.map((item) => (
                    <Row gutter={16} key={item.id} style={{ marginBottom: 8 }}>
                        <Col span={6}>
                            <Input
                                placeholder="Last School Name"
                                value={item.schoolName}
                                onChange={(e) =>
                                    handleInputChange(item.id, 'schoolName', e.target.value)
                                }
                            />
                        </Col>
                        <Col span={6}>
                            <Input
                                placeholder="Standard"
                                value={item.standard}
                                onChange={(e) =>
                                    handleInputChange(item.id, 'standard', e.target.value)} />
                        </Col>
                        <Col span={6}>
                            <Input
                                placeholder="Year (From & To)"
                                value={item.duration}
                                onChange={(e) =>
                                    handleInputChange(item.id, 'duration', e.target.value)} />
                        </Col>
                        <Col span={6}>
                            {academicHistory.length > 1 && (
                                <Button type="link" onClick={() => handleRemoveRow(item.id)}>
                                    Remove
                                </Button>
                            )}
                        </Col>
                    </Row>
                ))}
                <Button
                    type="dashed"
                    onClick={handleAddRow}
                    disabled={academicHistory.length >= 4}
                >
                    Add Row
                </Button>
            </Form.Item>
            <Form.Item
                name="passorfail"
                label="Has He/ She passed in the last class studied?"
                rules={[{ required: true, message: 'Select something!' }]}
            >
                <Radio.Group >
                    <Radio value="Yes">Yes</Radio>
                    <Radio value="No" >No</Radio>
                </Radio.Group>
            </Form.Item>
            <Form.Item
                name="tceslc"
                label="Is T.C/ E.S.L.C/ Record sheet submitted?"
                rules={[{ required: true, message: 'Required!' }]}>
                <Radio.Group >
                    <Radio value="Yes">Yes</Radio>
                    <Radio value="No" >No</Radio>
                </Radio.Group>
            </Form.Item>

            <Form.Item label="First Language Preference" name="firstLanguage" rules={[{ required: true, message: 'Required!' }]}>
                <Input />
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
                    <Title level={3}>Create SSLC Student ApplicationForm</Title>
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
                <Form form={form} onFinish={handleSubmit} layout="vertical">


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


export default CreateStudentsslc;