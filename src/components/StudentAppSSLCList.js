import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { message, Modal, Descriptions, Form, Input, Radio, Steps, Select, Button } from "antd";
import Sidebar from "./Sidebar";
import { EyeOutlined, EditOutlined, DeleteOutlined, PrinterOutlined } from "@ant-design/icons";


const { Option } = Select;

const StudentSSLCList = () => {
  const [studentsslcs, setStudentsslcs] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [grades, setGrades] = useState([]);
  const [selectedGradeName, setSelectedGradeName] = useState('');
  const [editingStudentPageData, setEditingStudentPageData] = useState({
    age: { years: 0, months: 0, days: 0 }
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const schoolId = user?.school?.id;
  const [editForm] = Form.useForm();
  const [editFormData, setEditFormData] = useState({});
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [sections, setSections] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const iconSlotStyle = {
    width: "28px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  };

  useEffect(() => {
    fetchStudentsslcs();
  }, [role, schoolId]);

  const calculateAge = (dob) => {
    if (!dob) return { years: 0, months: 0, days: 0 };
    const birthDate = new Date(dob);
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();
    if (days < 0) {
      months--;
      days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    return { years, months, days };
  };

  const formatAge = (age) => {
    if (!age || typeof age !== "object") return "N/A";
    const { years = 0, months = 0, days = 0 } = age;
    return `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}, ${days} day${days !== 1 ? 's' : ''}`;
  };

  const statesinindia = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
    "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
    "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
    "Uttarakhand", "West Bengal", "Others"
  ];


  const fetchGrades = async (schoolId) => {
    try {
      const response = await axios.get(`http://localhost:8080/grade/getGradesBySchool/${schoolId}`);
      setGrades(response.data.grades || []);
    } catch (error) {
      console.error("Error fetching grades:", error);

    }
  };

  useEffect(() => {
    fetchStudentsslcs();

    if (role === "superadmin" && selectedApplication?.school_id) {
      fetchGrades(selectedApplication.school_id);
    } else if (schoolId) {
      fetchGrades(schoolId);
    }
  }, [role, schoolId, selectedApplication]);

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchSectionsBySchoolAndGrade = async (schoolId, gradeId) => {
    if (!schoolId || !gradeId) return;

    try {
      const response = await axios.get(
        `http://localhost:8080/section/getSectionsBySchoolAndGrade/${schoolId}/${gradeId}`
      );
      setSections(response.data.sections || []);
    } catch (error) {
      console.error("Error fetching sections:", error);
      setSections([]); // Clear if failed
    }
  };

  const validateDOB = (_, value) => {
    if (!value) return Promise.reject("DOB is required!");
    const dob = new Date(value);
    const today = new Date();
    if (dob >= today) {
      return Promise.reject("DOB cannot be in the future!");
    }
    return Promise.resolve();
  };

  const handleEdit = (id) => {
    navigate(`/createstudentsslc/${id}`);
  };

  const fetchStudentsslcs = async () => {
    try {
      let response;

      if (role === "superadmin") {
        response = await axios.get(
          "http://localhost:8080/studentsslc/getAllStudentsslc"
        );
      } else {
        if (!schoolId) {
          console.error("School ID is missing");
          return;
        }
        response = await axios.get(
          `http://localhost:8080/studentsslc/getStudentsslcsBySchool/${schoolId}`
        );
      }

      const formattedStudentsslcs = (response.data.studentsslcs || [])
        .filter(student => student.status !== "Removed")
        .map(studentsslc => ({
          ...studentsslc,
          Grade: studentsslc.Grade || { grade: "N/A" },
          Section: studentsslc.Section || { sectionName: "N/A" }
        }));

      setStudentsslcs(formattedStudentsslcs);
    } catch (error) {
      console.error("Error fetching Students:", error);
      message.error(
        error.response?.data?.details || "Failed to fetch students"
      );
    }
  };
  const validateAccountNumber = (_, value) => {
    if (!value || !/^\d{9,17}$/.test(value)) {
      return Promise.reject("Account number must be 9 to 17 digits!");
    }
    return Promise.resolve();
  };

  const validateIFSCCode = (_, value) => {
    if (!value || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value)) {
      return Promise.reject("Enter a valid IFSC Code (e.g., SBIN0001234)!");
    }
    return Promise.resolve();
  };

  const handleView = async (id) => {
    try {
      const response = await axios.get(
        `http://localhost:8080/studentsslc/getStudentsslcById/${id}`
      );
      setSelectedApplication(response.data.application);
      setIsModalVisible(true);
    } catch (error) {
      message.error("Failed to fetch application details");
    }
  };

  const handleUpdate = async () => {
    try {
      const values = await editForm.validateFields();

      await axios.put(
        `http://localhost:8080/studentsslc/updateStudentsslc/${editFormData.id}`,
        values
      );

      message.success("Student updated successfully");
      setIsEditModalVisible(false);
      fetchStudentsslcs();
    } catch (err) {
      message.error("Update failed");
    }
  };

  const handleNextStep = async () => {
    try {
      const stepFields = [
        ['academicYear', 'emisNum', 'aadharNumber'],
        ['name', 'gender', 'dob'],
        // ... add more step field keys
      ];
      await editForm.validateFields(stepFields[currentStep]);
      setCurrentStep(currentStep + 1);
    } catch (error) {
      // form validation will show error messages
    }
  };

  // Function to handle print click
  const handlePrintClick = (application) => {
    if (!application) {
      message.error("No application data found for printing.");
      return;
    }

    const printContent = preparePrintContent(application);
    const printWindow = window.open('', '_blank');
    printWindow.document.title = 'Application Details';
    printWindow.document.write(printContent);
    printWindow.print();
  };

  const handleDelete = async (id, name) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to remove application of ${name}?`
    );
    if (!confirmDelete) return;

    try {
      await axios.put(
        `http://localhost:8080/studentsslc/updateStatus/${id}`
      );

      message.success("Application removed successfully");

      // Refresh list → S.No auto reorders
      fetchStudentsslcs();
    } catch (error) {
      message.error("Failed to remove application");
    }
  };


  // Function to prepare the content for printing
  const preparePrintContent = (selectedApplication) => {
    // Here you format the selectedApplication data as per your print layout
    const printContent = `
		<style>
    table {
        width: 100%;
        border-collapse: collapse;
    }
    th, td {
        border: 1px solid black;
        padding: 8px;
        text-align: left;
    }
</style>
		<h2>General Information</h2>
		<table border="1" cellpadding="5" cellspacing="0">
		<tr>
			<td><strong>Admission Number:</strong></td>
			<td>${selectedApplication.admissionNumber}</td>
		</tr>
    <tr>
			<td><strong>School Name:</strong></td>
			<td>${selectedApplication.School?.name}</td>
		</tr>
		<tr>
			<td><strong>Academic Year:</strong></td>
			<td>${selectedApplication.academicYear}</td>
		</tr>
		<tr>
			<td><strong>EMIS Number:</strong></td>
			<td>${selectedApplication.emisNum}</td>
		</tr>
		<tr>
			<td><strong>Aadhaar Number:</strong></td>
			<td>${selectedApplication.aadharNumber}</td>
		</tr>
	</table>
	<h2>Student Information</h2>
	<table border="1" cellpadding="5" cellspacing="0">
		<tr>
			<td><strong>Name:</strong></td>
			<td>${selectedApplication.name}</td>
		</tr>
		<tr>
			<td><strong>Gender:</strong></td>
			<td>${selectedApplication.gender}</td>
		</tr>
		<tr>
			<td><strong>Grade:</strong></td>
			<td>${selectedApplication.grade}</td>
		</tr>
		<tr>
  <td><strong>Section:</strong></td>
  <td>${selectedApplication.Section?.sectionName || "N/A"}</td>
</tr>
		<tr>
        <td><strong>Date of Birth:</strong></td>
        <td>${selectedApplication.dob}</td>
    </tr>
		<tr>
        <td><strong>Age:</strong></td>
        <td>${selectedApplication.age}</td>
    </tr>
    <tr>
        <td><strong>Nationality:</strong></td>
        <td>${selectedApplication.nationality}</td>
    </tr>
    <tr>
        <td><strong>State:</strong></td>
        <td>${selectedApplication.state}</td>
    </tr>
    <tr>
        <td><strong>Mother Tongue:</strong></td>
        <td>${selectedApplication.motherTongue}</td>
    </tr>
        <tr>
        <td><strong>Religion:</strong></td>
        <td>${selectedApplication.religion}</td>
    </tr>
    <tr>
        <td><strong>Home Town:</strong></td>
        <td>${selectedApplication.hometown}</td>
    </tr>
    <tr>
        <td><strong>Community:</strong></td>
        <td>${selectedApplication.community}</td>
    </tr>
    <tr>
        <td><strong>Is the student from scheduled tribe community?</strong></td>
        <td>${selectedApplication.tribecommunity}</td>
    </tr>
    <tr>
        <td><strong>Is the caste entitled to get ex-gratia salary?</strong></td>
        <td>${selectedApplication.exgratiasalary}</td>
    </tr>
    <tr>
        <td><strong>Is the student a convert from Hinduism to Christianity?</strong></td>
        <td>${selectedApplication.religionchanging}</td>
    </tr>
    <tr>
        <td><strong>Living with whom:</strong></td>
        <td>${selectedApplication.living}</td>
    </tr>
    <tr>
        <td><strong>Is the student for chicken pox? Is scar Available?</strong></td>
        <td>${selectedApplication.vaccinated}</td>
    </tr>
	<tr>
	<td><strong>Identification Marks:</strong></td>
	<td>${selectedApplication.identificationmarks}</td>
</tr>
<tr>
	<td><strong>Blood Group:</strong></td>
	<td>${selectedApplication.bloodGroup}</td>
</tr>
<tr>
	<td><strong>Is the student Physically challenged?</strong></td>
	<td>${selectedApplication.physical}</td>
</tr>
<tr>
	<td><strong>If Physically challenged, specify:</strong></td>
	<td>${selectedApplication.physicalDetails}</td>
</tr>
</table>
<h2>Parent Details</h2>
<table border="1" cellpadding="5" cellspacing="0">
    <tr>
        <td><strong>Father's Name:</strong></td>
        <td>${selectedApplication.fatherName}</td>
    </tr>
    <tr>
        <td><strong>Mother's Name:</strong></td>
        <td>${selectedApplication.motherName}</td>
    </tr>
        <tr>
        <td><strong>Father's Occupation:</strong></td>
        <td>${selectedApplication.fatherOccupation}</td>
    </tr>
        <tr>
        <td><strong>Mother's Occupation:</strong></td>
        <td>${selectedApplication.motherOccupation}</td>
    </tr>
    <tr>
        <td><strong>Father's Annual Income:</strong></td>
        <td>${selectedApplication.fatherIncome}</td>
    </tr>

    <tr>
        <td><strong>Mother's Annual Income:</strong></td>
        <td>${selectedApplication.motherIncome}</td>
    </tr>
    <tr>
        <td><strong>Address:</strong></td>
        <td>${selectedApplication.address}</td>
    </tr>
    <tr>
        <td><strong>Pincode:</strong></td>
        <td>${selectedApplication.pincode}</td>
    </tr>
    <tr>
        <td><strong>Telephone Number:</strong></td>
        <td>${selectedApplication.telephoneNumber}</td>
    </tr>
	<td><strong>Mobile Number:</strong></td>
	<td>${selectedApplication.mobileNumber}</td>
</tr>
<tr>
	<td><strong>Guardian's Name:</strong></td>
	<td>${selectedApplication.guardianName}</td>
</tr>
<tr>
	<td><strong>Guardian's Occupation:</strong></td>
	<td>${selectedApplication.guardianOccupation}</td>
</tr>
<tr>
	<td><strong>Guardian's Address:</strong></td>
	<td>${selectedApplication.guardianAddress}</td>
</tr>
<tr>
	<td><strong>Guardian Phone Number:</strong></td>
	<td>${selectedApplication.guardianNumber}</td>
</tr>
<tr>
	<td><strong>Is parent consent letter attached?</strong></td>
	<td>${selectedApplication.parentconsentform}</td>
</tr>
</table>
	<h2>Academic Details</h2>
<table border="1" cellpadding="5" cellspacing="0">
   <tr>
	<td><strong>Student's Academic History</strong></td>
	<td>${selectedApplication.academicHistory}</td>
</tr>
<tr>
	<td><strong>Has He/ She passed in the last class studied?</strong></td>
	<td>${selectedApplication.passorfail}</td>
</tr>
<tr>
	<td><strong>Is T.C/ E.S.L.C/ Record sheet submitted?</strong></td>
	<td>${selectedApplication.tceslc}</td>
</tr>
<tr>
	<td><strong>First Language Preference</strong></td>
	<td>${selectedApplication.firstLanguage}</td>
</tr>
</table>
	<h2>Bank Details</h2>
<table border="1" cellpadding="5" cellspacing="0">
<tr>
        <td><strong>Bank Name:</strong></td>
        <td>${selectedApplication.bankname}</td>
    </tr>
     <tr>
        <td><strong>Branch Name:</strong></td>
        <td>${selectedApplication.branchname}</td>
    </tr>
    <tr>
        <td><strong>Account Number:</strong></td>
        <td>${selectedApplication.accountnumber}</td>
    </tr>
    
    <tr>
        <td><strong>IFSC Code:</strong></td>
        <td>${selectedApplication.ifsccode}</td>
    </tr>
</table>
	`;

    return printContent;
  }



  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div className="container mt-4" style={{ marginLeft: "250px", flex: 1 }}>
        <h2 className="mb-4">Student List for SSLC</h2>
        <button
          onClick={() => navigate("/create-studentsslc")}
          className="btn btn-primary mb-3"
        >
          Create SSLC Application
        </button>
        <div className="table-responsive">
          <table className="table table-bordered table-striped">
            <thead className="table-dark">
              <tr>
                <th>S.No</th>
                <th>Admission No</th>
                <th>School</th>
                <th>Academic Year</th>
                <th>Date Of Join</th>
                <th>Name</th>
                <th>Gender</th>
                <th>Grade</th>
                <th>Section</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {studentsslcs.length > 0 ? (
                studentsslcs.map((student, index) => (
                  <tr key={student.id}>
                    <td>{index + 1}</td>
                    <td>{student.admissionNumber}</td>
                    <td>{role === "superadmin" ? student.School?.name : user.school?.name}</td>
                    <td>{student.academicYear}</td>
                    <td>{student.dateofjoin}</td>
                    <td>{student.name}</td>
                    <td>{student.gender}</td>
                    <td>{student.Grade?.grade || "N/A"}</td>
                    <td>{student.Section?.sectionName || "N/A"}</td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>

                        {/* VIEW */}
                        <div style={iconSlotStyle}>
                          <EyeOutlined
                            title="View Student"
                            style={{ fontSize: 18, color: "#003366", cursor: "pointer" }}
                            onClick={() => handleView(student.id)}
                          />
                        </div>

                        {/* EDIT */}
                        <div style={iconSlotStyle}>
                          <EditOutlined
                            title="Edit Application"
                            style={{ fontSize: 18, color: "#1890ff", cursor: "pointer" }}
                            onClick={() => navigate(`/edit-studentsslc/${student.id}`)}
                          />
                        </div>

                        {/* PRINT */}
                        <div style={iconSlotStyle}>
                          <PrinterOutlined
                            title="Print Student Details"
                            style={{ fontSize: 18, color: "rgb(194, 92, 32)", cursor: "pointer" }}
                            onClick={() => handlePrintClick(student)}
                          />
                        </div>

                        {/* DELETE (superadmin only, but space always reserved) */}
                        <div style={iconSlotStyle}>
                          {role === "superadmin" && (
                            <DeleteOutlined
                              title="Remove Application"
                              style={{ fontSize: 18, color: "#e21216", cursor: "pointer" }}
                              onClick={() => handleDelete(student.id, student.name)}
                            />
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8">No Students found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {isModalVisible && selectedApplication && (
          <Modal
            title="Application Details"
            open={isModalVisible}
            onCancel={() => setIsModalVisible(false)}
            footer={null}
            width={1200}
          >
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Admission Number">
                {selectedApplication.admissionNumber}
              </Descriptions.Item>
              <Descriptions.Item label="School Name">
                {selectedApplication.School?.name || "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Academic Year">
                {selectedApplication.academicYear}
              </Descriptions.Item>
              <Descriptions.Item label="EMIS Number">
                {selectedApplication.emisNum}
              </Descriptions.Item>
              <Descriptions.Item label="Aadhar Number">
                {selectedApplication.aadharNumber}
              </Descriptions.Item>
              <Descriptions.Item label="Name">
                {selectedApplication.name}
              </Descriptions.Item>
              <Descriptions.Item label="Gender">
                {selectedApplication.gender}
              </Descriptions.Item>
              <Descriptions.Item label="Grade">
                {selectedApplication.Grade?.grade || "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Section">
                {selectedApplication.Section?.sectionName || "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Date of Birth">
                {selectedApplication.dob}
              </Descriptions.Item>
              <Descriptions.Item label="Age">
                {formatAge(selectedApplication.age)}
              </Descriptions.Item>
              <Descriptions.Item label="Nationality">
                {selectedApplication.nationality}
              </Descriptions.Item>
              <Descriptions.Item label="State">
                {selectedApplication.state}
              </Descriptions.Item>
              <Descriptions.Item label="Mother Tongue">
                {selectedApplication.motherTongue}
              </Descriptions.Item>
              <Descriptions.Item label="Religion">
                {selectedApplication.religion}
              </Descriptions.Item>
              <Descriptions.Item label="Home Town">
                {selectedApplication.hometown}
              </Descriptions.Item>
              <Descriptions.Item label="Community">
                {selectedApplication.community}
              </Descriptions.Item>
              <Descriptions.Item label="Is the student from scheduled tribe community?">
                {selectedApplication.tribecommunity}
              </Descriptions.Item>
              <Descriptions.Item label="Is the caste entitled to get ex-gratia salary?">
                {selectedApplication.exgratiasalary}
              </Descriptions.Item>
              <Descriptions.Item label="Is the student a convert from Hinduism to Christianity?">
                {selectedApplication.religionchanging}
              </Descriptions.Item>
              <Descriptions.Item label="Living with whom">
                {selectedApplication.living}
              </Descriptions.Item>
              <Descriptions.Item label="Is the student for chicken pox? Is scar Available?">
                {selectedApplication.vaccinated}
              </Descriptions.Item>
              <Descriptions.Item label="Identification Marks">
                {selectedApplication.identificationmarks}
              </Descriptions.Item>
              <Descriptions.Item label="Blood Group">
                {selectedApplication.bloodGroup}
              </Descriptions.Item>
              <Descriptions.Item label="Is the student Physically challenged?">
                {selectedApplication.physical}
              </Descriptions.Item>
              <Descriptions.Item label="If He/ She Physically challenged Specify, Otherwish Enter Null">
                {selectedApplication.physicalDetails}
              </Descriptions.Item>
              <Descriptions.Item label="Father Name">
                {selectedApplication.fatherName}
              </Descriptions.Item>
              <Descriptions.Item label="Mother's Name">
                {selectedApplication.motherName}
              </Descriptions.Item>
              <Descriptions.Item label="Father's Occupation">
                {selectedApplication.fatherOccupation}
              </Descriptions.Item>
              <Descriptions.Item label="Mother's Occupation">
                {selectedApplication.motherOccupation}
              </Descriptions.Item>
              <Descriptions.Item label="Father's Annual Income">
                {selectedApplication.fatherIncome}
              </Descriptions.Item>
              <Descriptions.Item label="Mother's Annual Income">
                {selectedApplication.motherIncome}
              </Descriptions.Item>
              <Descriptions.Item label="Address">
                {selectedApplication.address}
              </Descriptions.Item>
              <Descriptions.Item label="Pincode">
                {selectedApplication.pincode}
              </Descriptions.Item>
              <Descriptions.Item label="Telephone Number">
                {selectedApplication.telephoneNumber}
              </Descriptions.Item>
              <Descriptions.Item label="Mobile Number">
                {selectedApplication.mobileNumber}
              </Descriptions.Item>
              <Descriptions.Item label="Guardian's Name">
                {selectedApplication.guardianName}
              </Descriptions.Item>
              <Descriptions.Item label="Guardian's Occupation">
                {selectedApplication.guardianOccupation}
              </Descriptions.Item>
              <Descriptions.Item label="Guardian Address">
                {selectedApplication.guardianAddress}
              </Descriptions.Item>
              <Descriptions.Item label="Guardian Phone Number">
                {selectedApplication.guardianNumber}
              </Descriptions.Item>
              <Descriptions.Item label="Is parent consent Hardcopy is attached?">
                {selectedApplication.parentconsentform}
              </Descriptions.Item>
              <Descriptions.Item label="Student's Academic History">
                {selectedApplication.academicHistory}
              </Descriptions.Item>
              <Descriptions.Item label="Has He/ She passed in the last class studied?">
                {selectedApplication.passorfail}
              </Descriptions.Item>
              <Descriptions.Item label="Is T.C/ E.S.L.C/ Record sheet submitted?">
                {selectedApplication.tceslc}
              </Descriptions.Item>
              <Descriptions.Item label="First Language Preference">
                {selectedApplication.firstLanguage}
              </Descriptions.Item>
              <Descriptions.Item label="Bank Name">
                {selectedApplication.bankName}
              </Descriptions.Item>
              <Descriptions.Item label="Branch Name">
                {selectedApplication.branchName}
              </Descriptions.Item>
              <Descriptions.Item label="Bank Account Number">
                {selectedApplication.accountNumber}
              </Descriptions.Item>
              <Descriptions.Item label="IFSC Code">
                {selectedApplication.ifsccode}
              </Descriptions.Item>
            </Descriptions>
          </Modal>
        )}

        <Modal
          title="Edit SSLC Application"
          visible={isEditModalVisible}
          onCancel={() => setIsEditModalVisible(false)}
          footer={null}
          width={1250}
        >
          <Steps current={currentStep} style={{ marginBottom: 24 }}>
            <Steps.Step title="Academic Details" />
            <Steps.Step title="Student Information" />
            <Steps.Step title="Parent Information" />
            <Steps.Step title="General Information" />
            <Steps.Step title="Bank Details" />
          </Steps>

          <Form
            layout="vertical"
            form={editForm}
            initialValues={editFormData}
            onValuesChange={(changed, all) => setEditFormData({ ...editFormData, ...all })}
          >
            {currentStep === 0 && (
              <>
                {/* Academic Year (required) */}
                <Form.Item
                  label="Academic Year"
                  name="academicYear"
                  rules={[{ required: true, message: "Select Academic Year!" }]}
                >
                  <Select placeholder="Select Year">
                    <Select.Option value="2025-2026">2025-2026</Select.Option>
                  </Select>
                </Form.Item>

                {/* EMIS Number (required, 12-digit validation) */}
                <Form.Item
                  label="EMIS Number"
                  name="emisNum"
                  rules={[
                    { required: true, message: "Enter EMIS Number!" },
                    { pattern: /^[0-9]{12}$/, message: "Enter a valid 12-digit number!" }
                  ]}
                >
                  <Input />
                </Form.Item>

                {/* Aadhar Number (required, 12-digit validation) */}
                <Form.Item
                  label="Aadhar Number"
                  name="aadharNumber"
                  rules={[
                    { required: true, message: "Enter Aadhar Number!" },
                    { pattern: /^[0-9]{12}$/, message: "Enter a valid 12-digit number!" }
                  ]}
                >
                  <Input />
                </Form.Item>
              </>
            )}

            {currentStep === 1 && (
              <>
                <Form.Item
                  label="Full Name"
                  name="name"
                  rules={[{ required: true, message: "Please enter student name!" }]}
                >
                  <Input />
                </Form.Item>

                <Form.Item
                  label="Gender"
                  name="gender"
                  rules={[{ required: true, message: "Please select gender!" }]}
                >
                  <Radio.Group>
                    <Radio value="Male">Male</Radio>
                    <Radio value="Female">Female</Radio>
                    <Radio value="Others">Others</Radio>
                  </Radio.Group>
                </Form.Item>

                <Form.Item
                  label="Grade"
                  name="grade_id"
                  rules={[{ required: true }]}
                >
                  <Select
                    onChange={(value) => {
                      fetchSectionsBySchoolAndGrade(schoolId, value);
                      editForm.setFieldsValue({ section_id: null });
                    }}
                  >
                    {grades.map(g => (
                      <Select.Option key={g.id} value={g.id}>
                        {g.grade}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item
                  label="Section"
                  name="section_id"
                  rules={[{ required: true }]}
                >
                  <Select>
                    {sections.map(sec => (
                      <Select.Option key={sec.id} value={sec.id}>
                        {sec.sectionName}
                      </Select.Option>
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
                    onChange={(e) => {
                      const selectedDOB = e.target.value;
                      const newAge = calculateAge(selectedDOB);
                      setEditingStudentPageData((prev) => ({
                        ...prev,
                        dob: selectedDOB,
                        age: newAge
                      }));
                      editForm.setFieldsValue({ dob: selectedDOB });
                    }}
                  />
                </Form.Item>

                <Form.Item label="Age">
                  <Input value={formatAge(editingStudentPageData.age)} disabled />
                </Form.Item>

                <Form.Item
                  label="Nationality"
                  name="nationality"
                  rules={[{ required: true, message: "Please select nationality!" }]}
                >
                  <Select placeholder="Select your Nationality">
                    <Select.Option value="India">India</Select.Option>
                    <Select.Option value="Non-Indian">Non-Indian</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item
                  label="State"
                  name="state"
                  rules={[{ required: true, message: "Please select state!" }]}
                >
                  <Select placeholder="Select State">
                    {statesinindia.map(state => (
                      <Select.Option key={state} value={state}>{state}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item
                  label="Mother Tongue"
                  name="motherTongue"
                  rules={[{ required: true, message: "Please select mother tongue!" }]}
                >
                  <Select placeholder="Select Mother Tongue">
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

                <Form.Item
                  label="Home Town"
                  name="hometown"
                  rules={[{ required: true, message: "Please enter hometown!" }]}
                >
                  <Input />
                </Form.Item>

                <Form.Item label="Religion" name="religion">
                  <Input />
                </Form.Item>

                <Form.Item
                  label="Community"
                  name="community"
                  rules={[{ required: true, message: "Please select community!" }]}
                >
                  <Select placeholder="Select community">
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

                <Form.Item label="Is the student from scheduled tribe community?" name="tribecommunity">
                  <Radio.Group>
                    <Radio value="Yes">Yes</Radio>
                    <Radio value="No">No</Radio>
                  </Radio.Group>
                </Form.Item>

                <Form.Item label="Is the caste entitled to get ex-gratia salary?" name="exgratiasalary">
                  <Radio.Group>
                    <Radio value="Yes">Yes</Radio>
                    <Radio value="No">No</Radio>
                  </Radio.Group>
                </Form.Item>

                <Form.Item label="Is the student a convert from Hinduism to Christianity?" name="religionchanging">
                  <Radio.Group>
                    <Radio value="Yes">Yes</Radio>
                    <Radio value="No">No</Radio>
                  </Radio.Group>
                </Form.Item>

                <Form.Item label="Living with whom" name="living">
                  <Select placeholder="Select">
                    <Select.Option value="Parents">Parents</Select.Option>
                    <Select.Option value="Guardian">Guardian</Select.Option>
                    <Select.Option value="Others">Others</Select.Option>
                  </Select>
                </Form.Item>

                <Form.Item label="Is the student for chicken pox? Is scar Available?" name="vaccinated">
                  <Radio.Group>
                    <Radio value="Yes">Yes</Radio>
                    <Radio value="No">No</Radio>
                  </Radio.Group>
                </Form.Item>

                <Form.Item
                  label="Identification Marks"
                  name="identificationmarks"
                  rules={[{ required: true, message: "Please enter identification marks!" }]}
                >
                  <Input />
                </Form.Item>

                <Form.Item
                  label="Blood Group"
                  name="bloodGroup"
                  rules={[{ required: true, message: "Please select blood group!" }]}
                >
                  <Select placeholder="Select blood group" id="bloodGroup">
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

                <Form.Item label="Is the student Physically challenged?" name="physical">
                  <Radio.Group>
                    <Radio value="Yes">Yes</Radio>
                    <Radio value="No">No</Radio>
                  </Radio.Group>
                </Form.Item>

                <Form.Item
                  label="If He/ She Physically challenged Specify, Otherwish Enter Null"
                  name="physicalDetails"
                >
                  <Input.TextArea
                    placeholder="Specify condition or enter Null"
                    autoSize={{ minRows: 2, maxRows: 3 }}
                    maxLength={500}
                  />
                </Form.Item>
              </>
            )}

            {currentStep === 2 && (
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
                  rules={[{ required: true, message: "Please enter father's occupation!" }]}
                >
                  <Input />
                </Form.Item>

                <Form.Item
                  label="Mother's Occupation"
                  name="motherOccupation"
                  rules={[{ required: true, message: "Please enter mother's occupation!" }]}
                >
                  <Input />
                </Form.Item>

                <Form.Item
                  label="Father's Annual Income"
                  name="fatherIncome"
                  rules={[{ required: true, message: "Please enter father's income!" }]}
                >
                  <Input
                    maxLength={10}
                    onInput={(e) => {
                      e.target.value = e.target.value.replace(/[^0-9]/g, '');
                    }}
                  />
                </Form.Item>

                <Form.Item
                  label="Mother's Annual Income"
                  name="motherIncome"
                  rules={[{ required: true, message: "Please enter mother's income!" }]}
                >
                  <Input
                    maxLength={10}
                    onInput={(e) => {
                      e.target.value = e.target.value.replace(/[^0-9]/g, '');
                    }}
                  />
                </Form.Item>

                <Form.Item
                  label="Address"
                  name="address"
                  rules={[{ required: true, message: "Please enter address!" }]}
                >
                  <Input />
                </Form.Item>

                <Form.Item
                  label="Pincode"
                  name="pincode"
                  rules={[
                    { required: true, message: "Enter a valid 6-digit pincode!" },
                    { pattern: /^[0-9]{6}$/, message: "Invalid pincode!" }
                  ]}
                >
                  <Input />
                </Form.Item>

                <Form.Item
                  label="Telephone Number"
                  name="telephoneNumber"
                  rules={[{ pattern: /^[0-9]{10}$/, message: "Invalid telephone number!" }]}
                >
                  <Input />
                </Form.Item>

                <Form.Item
                  label="Mobile Number"
                  name="mobileNumber"
                  rules={[{ pattern: /^[0-9]{10}$/, message: "Invalid mobile number!" }]}
                >
                  <Input />
                </Form.Item>

                <h3>Guardian Information</h3>

                <Form.Item label="Guardian's Name" name="guardianName">
                  <Input />
                </Form.Item>

                <Form.Item label="Guardian's Occupation" name="guardianOccupation">
                  <Input />
                </Form.Item>

                <Form.Item label="Guardian Address" name="guardianAddress">
                  <Input.TextArea />
                </Form.Item>

                <Form.Item label="Guardian Phone Number" name="guardianNumber">
                  <Input />
                </Form.Item>

                <Form.Item
                  name="parentconsentform"
                  label="Is parent consent hardcopy attached?"
                  rules={[{ required: true, message: "Please select an option!" }]}
                >
                  <Radio.Group>
                    <Radio value="Yes">Yes</Radio>
                    <Radio value="No">No</Radio>
                  </Radio.Group>
                </Form.Item>
              </>
            )}
            {currentStep === 3 && (
              <>

                <Form.Item
                  name="passorfail"
                  label="Has He/ She passed in the last class studied?"
                  rules={[{ required: true, message: 'Please select Yes or No' }]}
                >
                  <Radio.Group>
                    <Radio value="Yes">Yes</Radio>
                    <Radio value="No">No</Radio>
                  </Radio.Group>
                </Form.Item>

                <Form.Item
                  name="tceslc"
                  label="Is T.C/ E.S.L.C/ Record sheet submitted?"
                  rules={[{ required: true, message: 'Please select Yes or No' }]}
                >
                  <Radio.Group>
                    <Radio value="Yes">Yes</Radio>
                    <Radio value="No">No</Radio>
                  </Radio.Group>
                </Form.Item>

                <Form.Item
                  label="First Language Preference"
                  name="firstLanguage"
                  rules={[{ required: true, message: 'Please enter first language' }]}
                >
                  <Input />
                </Form.Item>
              </>
            )}
            {currentStep === 4 && (
              <>
                <Form.Item
                  label="Bank Name"
                  name="bankName"
                  rules={[{ required: true, message: "Please enter bank name!" }]}
                >
                  <Input />
                </Form.Item>

                <Form.Item
                  name="branchName"
                  label="Branch Name"
                  rules={[{ required: true, message: "Please enter branch name!" }]}
                >
                  <Input
                    maxLength={50}
                    placeholder="Enter Branch Name"
                    onInput={(e) => {
                      e.target.value = e.target.value
                        .replace(/[^a-zA-Z\s]/g, '')
                        .slice(0, 50);
                    }}
                  />
                </Form.Item>

                <Form.Item
                  name="accountNumber"
                  label="Bank Account Number"
                  rules={[
                    { required: true, message: "Please enter account number!" },
                    { validator: validateAccountNumber }
                  ]}
                >
                  <Input
                    maxLength={17}
                    placeholder="Enter Account Number"
                    onInput={(e) => {
                      e.target.value = e.target.value
                        .replace(/[^0-9]/g, '')
                        .slice(0, 17);
                    }}
                  />
                </Form.Item>

                <Form.Item
                  name="ifsccode"
                  label="IFSC Code"
                  rules={[
                    { required: true, message: "Please enter IFSC Code!" },
                    { validator: validateIFSCCode }
                  ]}
                >
                  <Input
                    maxLength={11}
                    placeholder="Enter IFSC Code"
                    onInput={(e) => {
                      e.target.value = e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, '')
                        .slice(0, 11);
                    }}
                  />
                </Form.Item>
              </>
            )}

            <div style={{ marginTop: 24, textAlign: "right" }}>
              {currentStep > 0 && (
                <Button style={{ marginRight: 8 }} onClick={() => setCurrentStep(currentStep - 1)}>
                  Previous
                </Button>
              )}
              {currentStep < 4 && (
                <Button type="primary" onClick={() => setCurrentStep(currentStep + 1)}>
                  Next
                </Button>
              )}
              {currentStep === 4 && (
                <Button type="primary" onClick={handleUpdate}>
                  Submit
                </Button>
              )}
            </div>
          </Form>
        </Modal>
      </div>
    </div>
  );
};



export default StudentSSLCList;