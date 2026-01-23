import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { message, Modal, Descriptions, Input, Form, Radio, Steps, Select, Button, InputNumber } from "antd";
import Sidebar from "./Sidebar";

const { Option } = Select;
const StudentHSCList = () => {
  const [studenthscs, setStudenthscs] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const schoolId = user?.school?.id;
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editForm] = Form.useForm();
  const [editFormData, setEditFormData] = useState({});
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [groups, setGroups] = useState([]);
  const [age, setAge] = useState({ years: 0, months: 0, days: 0 });
  const [dob, setDOB] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedGradeName, setSelectedGradeName] = useState("");

  const statesinindia = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
    "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
    "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
    "Uttarakhand", "West Bengal", "Others"
  ];

  const validateMarks = (_, value) => {
    if (value > 100) {
      return Promise.reject(new Error('Marks cannot exceed 100'));
    }
    return Promise.resolve();
  };

const calculateTotalAndPercentage = () => {
  const values = editForm.getFieldsValue([
    'tamil', 'english', 'maths', 'science', 'social'
  ]);

  // Sum up all five subjects (parseInt → 0 if empty or invalid)
  const total = ['tamil', 'english', 'maths', 'science', 'social']
    .map((subject) => parseInt(values[subject], 10) || 0)
    .reduce((sum, curr) => sum + curr, 0);

  // Average across 5 subjects
  const percentage = total / 5;

  editForm.setFieldsValue({
    total,
    percentage: percentage.toFixed(2),
  });
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

  const fetchSections = async (gradeId) => {
    try {
      const response = await axios.get(`http://localhost:8080/section/getSectionsByGrade/${gradeId}`);
      setSections(response.data.sections || []);
    } catch (error) {
      console.error("Failed to fetch sections", error);
    }
  };

  const fetchGroups = async (gradeId) => {
    try {
      const response = await axios.get(`http://localhost:8080/group/getGroupsByGrade/${gradeId}`);
      setGroups(response.data.groups || []);
    } catch (error) {
      console.error("Failed to fetch groups", error);
    }
  };

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

  useEffect(() => {
    fetchStudenthscs();
  }, [role, schoolId]);

  const fetchStudenthscs = async () => {
    try {
      let response;

      if (role === "superadmin") {
        response = await axios.get("http://localhost:8080/studenthsc/getAllStudenthsc");
      } else {
        if (!schoolId) {
          console.error("School ID is missing");
          return;
        }
        response = await axios.get(
          `http://localhost:8080/studenthsc/getStudenthscsBySchool/${schoolId}`
        );
      }

      const formattedStudenthscs = (response.data.studenthscs || [])
        .map(studenthsc => ({
          ...studenthsc,
          Grade: studenthsc.Grade || { grade: "N/A" }
        }));

      setStudenthscs(formattedStudenthscs);
    } catch (error) {
      console.error("Error fetching Students:", error);
      message.error(error.response?.data?.details || "Failed to fetch students");
    }
  };

  const handleView = async (id) => {
    try {
      const response = await axios.get(`http://localhost:8080/studenthsc/getStudenthscById/${id}`);
      setSelectedApplication(response.data.application);
      setIsModalVisible(true);
    } catch (error) {
      console.error("Failed to fetch application details", error);
      message.error("Failed to fetch application details");
    }
  };

  const handleEdit = async (id) => {
    try {
      const response = await axios.get(`http://localhost:8080/studenthsc/getStudenthscById/${id}`);
      const data = response.data.application;
      setEditFormData(data);
      editForm.setFieldsValue(data);
      calculateTotalAndPercentage();
      setIsEditModalVisible(true);
    } catch (error) {
      message.error("Failed to load application for editing");
    }
  };

  const handleUpdate = async () => {
    try {
      // Ensure total and percentage are recalculated
      calculateTotalAndPercentage();

      // Give the form time to update values
      await new Promise(resolve => setTimeout(resolve, 100));

      const values = await editForm.validateFields();

      await axios.put(`http://localhost:8080/studenthsc/updateStudenthsc/${editFormData.id}`, {
        ...editFormData,
        ...values
      });

      message.success("Updated successfully");
      setIsEditModalVisible(false);
      fetchStudenthscs(); // Refresh list
    } catch (err) {
      message.error(err.response?.data?.error || "Failed to update");
    }
  };



  const formatAge = (age) => {
    if (!age || typeof age !== "object") return "N/A";
    const { years = 0, months = 0, days = 0 } = age;
    return `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}, ${days} day${days !== 1 ? 's' : ''}`;
  };

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div className="container mt-4" style={{ marginLeft: "250px", flex: 1 }}>
        <h2 className="mb-4">Student List for HSC</h2>
        <button
          onClick={() => navigate("/create-studenthsc")}
          className="btn btn-primary mb-3"
        >
          Create HSC Application
        </button>
        <div className="table-responsive">
          <table className="table table-bordered table-striped" style={{ width: '100%' }}>
            <thead className="table-dark">
              <tr>
                <th>ID</th>
                <th>Admission Number</th>
                <th>School</th>
                <th>Academic Year</th>
                <th>Date Of Join</th>
                <th>Name</th>
                <th>Gender</th>
                <th>Grade</th>
                <th>Action</th> {/* You were missing this column header */}
              </tr>
            </thead>
            <tbody>
              {studenthscs.length > 0 ? (
                studenthscs.map((student) => (
                  <tr key={student.id}>
                    <td>{student.id}</td>
                    <td>{student.admissionNumber}</td>
                    <td>{role === "superadmin" ? student.School?.name : user.school?.name}</td>
                    <td>{student.academicYear}</td>
                    <td>{student.dateofjoin}</td>
                    <td>{student.name}</td>
                    <td>{student.gender}</td>
                    <td>{student.Grade?.grade || "N/A"}</td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "inline-flex", gap: "10px" }}>
                        <button
                          onClick={() => handleView(student.id)} // ✅ Fixed "app.id" to "student.id"
                          style={{
                            backgroundColor: "#003366",
                            color: "white",
                            padding: "6px 12px",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer"
                          }}
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEdit(student.id)}
                          style={{
                            backgroundColor: "#ffc107",
                            color: "black",
                            padding: "6px 12px",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer"
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9">No Students found</td> {/* Adjusted colspan to match column count */}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {isModalVisible && selectedApplication && (
        <Modal
          title="Application Details"
          visible={isModalVisible}
          onCancel={() => setIsModalVisible(false)}
          footer={null}
          width={1100}
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
            <Descriptions.Item label="Birthsite Division">
              {selectedApplication.birthdistrict}
            </Descriptions.Item>
            <Descriptions.Item label="Religion">
              {selectedApplication.religion}
            </Descriptions.Item>
            <Descriptions.Item label="Community">
              {selectedApplication.community}
            </Descriptions.Item>
            <Descriptions.Item label="Is the student from scheduled caste/tribe?">
              {selectedApplication.scheduledcasteOrtribecommunity}
            </Descriptions.Item>
            <Descriptions.Item label="Is the student from any backward caste?">
              {selectedApplication.backwardcaste}
            </Descriptions.Item>
            <Descriptions.Item label="Living with whom">
              {selectedApplication.living}
            </Descriptions.Item>
            <Descriptions.Item label="Blood Group">
              {selectedApplication.bloodGroup}
            </Descriptions.Item>
            <Descriptions.Item label="Father's Name">
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
            <Descriptions.Item label="Examination Passed Year">
              {selectedApplication.examYear}
            </Descriptions.Item>
            <Descriptions.Item label="Registration Number">
              {selectedApplication.registrationnumber}
            </Descriptions.Item>
            <Descriptions.Item label="Tamil">
              {selectedApplication.tamil}
            </Descriptions.Item>
            <Descriptions.Item label="English">
              {selectedApplication.english}
            </Descriptions.Item>
            <Descriptions.Item label="Mathematics">
              {selectedApplication.maths}
            </Descriptions.Item>
            <Descriptions.Item label="Science">
              {selectedApplication.science}
            </Descriptions.Item>
            <Descriptions.Item label="Social Science">
              {selectedApplication.social}
            </Descriptions.Item>
            <Descriptions.Item label="Total">
              {selectedApplication.total}
            </Descriptions.Item>
            <Descriptions.Item label="Percentage">
              {selectedApplication.percentage}
            </Descriptions.Item>
            <Descriptions.Item label="First Language Preference">
              {selectedApplication.firstLanguage}
            </Descriptions.Item>
            <Descriptions.Item label="Reason for Discontinuation/Termination">
              {selectedApplication.terminationreason}
            </Descriptions.Item>
            <Descriptions.Item label="Photocopy of TC Submitted">
              {selectedApplication.photocopyofTC}
            </Descriptions.Item>
            <Descriptions.Item label="Preferred Medium of Study">
              {selectedApplication.preferredmedium}
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
        title="Edit HSC Student"
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
              <Form.Item label="Academic Year" name="academicYear" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="EMIS Number" name="emisNum" rules={[
                { required: true },
                { pattern: /^[0-9]{12}$/, message: "12-digit EMIS required" }
              ]}>
                <Input />
              </Form.Item>
              <Form.Item label="Aadhar Number" name="aadharNumber" rules={[
                { required: true },
                { pattern: /^[0-9]{12}$/, message: "12-digit Aadhar required" }
              ]}>
                <Input />
              </Form.Item>
            </>
          )}
          {currentStep === 1 && (
            <>
              <Form.Item label="Name" name="name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="Gender" name="gender" rules={[{ required: true }]}>
                <Radio.Group>
                  <Radio value="Male">Male</Radio>
                  <Radio value="Female">Female</Radio>
                  <Radio value="Others">Others</Radio>
                </Radio.Group>
              </Form.Item>
              <Form.Item label="Grade" name="grade_id" rules={[{ required: true }]}>
                <Select
                  placeholder="Select grade"
                  onChange={(value) => {
                    const selected = grades.find(g => g.id === value);
                    setSelectedGradeName(selected?.grade || '');
                    fetchSections(value);
                    fetchGroups(value);
                  }}
                >
                  {grades
                    .filter(grade => ["XI", "XII"].includes(grade.grade.toUpperCase()))
                    .map(grade => (
                      <Option key={grade.id} value={grade.id}>{grade.grade}</Option>
                    ))}
                </Select>
              </Form.Item>
              {/* <Form.Item label="Section" name="section_id" rules={[{ required: true }]}>
                <Select placeholder="Select Section">
                  {sections.map(section => (
                    <Option key={section.id} value={section.id}>{section.sectionName}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item label="Group" name="group_id" rules={[{ required: true }]}>
                <Select placeholder="Select Group">
                  {groups.map(group => (
                    <Option key={group.id} value={group.id}>{group.groupName}</Option>
                  ))}
                </Select>
              </Form.Item> */}
              <Form.Item label="Date of Birth" name="dob" rules={[{ required: true }]}>
                <Input type="date" onChange={(e) => {
                  const selectedDOB = e.target.value;
                  setDOB(selectedDOB);
                  const newAge = calculateAge(selectedDOB);
                  setAge(newAge);
                  editForm.setFieldValue('dob', selectedDOB);
                }} />
              </Form.Item>

              <Form.Item label="Age">
                <Input value={formatAge(age)} disabled />
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
                label="Birthsite division"
                name="birthdistrict"
                rules={[{ required: true, message: "Please enter birthdistrict!" }]}
              >
                <Input />
              </Form.Item>
              <Form.Item label="Religion" name="religion">
                <Input />
              </Form.Item>
              <Form.Item label="Community" name="community" rules={[{ required: true }]}>
                <Select>
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
              <Form.Item label="Is the student from scheduled caste/ from scheduled tribe community?" name="scheduledcasteOrtribecommunity" rules={[{ required: true }]}>
                <Radio.Group>
                  <Radio value="Yes">Yes</Radio>
                  <Radio value="No" >No</Radio>
                </Radio.Group>
              </Form.Item>
              <Form.Item label="Is the student from any backward caste?" name="backwardcaste" rules={[{ required: true }]}>
                <Radio.Group>
                  <Radio value="Yes">Yes</Radio>
                  <Radio value="No" >No</Radio>
                </Radio.Group>
              </Form.Item>
              <Form.Item label="Is the student a convert from Hinduism to Christianity?" name="tribeTootherreligion" rules={[{ required: true }]}>
                <Radio.Group>
                  <Radio value="Yes">Yes</Radio>
                  <Radio value="No" >No</Radio>
                </Radio.Group>
              </Form.Item>
              <Form.Item label="Living with whom" name="living">
                <Select placeholder="Select">
                  <Select.Option value="Parents">Parents</Select.Option>
                  <Select.Option value="Guardian">Guardian</Select.Option>
                  <Select.Option value="Others">Others</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item
                label="If not living with Parents or Guardian then write current living address"
                name="currentlivingaddress"
              >
                <Input.TextArea
                  placeholder="Enter Your Reason"
                  autoSize={{ minRows: 3, maxRows: 3 }}
                  maxLength={500}
                />
              </Form.Item>
              <Form.Item
                label="Identification Marks"
                name="identificationmarks"
                rules={[{ required: true, message: "Please enter Identification Marks!" }]}
              >
                <Input />
              </Form.Item>
              <Form.Item label="Blood Group" name="bloodGroup" rules={[{ required: true }]}>
                <Select>
                  <Option value="O+ve">O+VE</Option>
                  <Option value="A+ve">A+VE</Option>
                  <Option value="B+ve">B+VE</Option>
                  <Option value="AB+ve">AB+VE</Option>
                  <Option value="O-ve">O-VE</Option>
                  <Option value="A-ve">A-VE</Option>
                  <Option value="B-ve">B-VE</Option>
                  <Option value="AB-ve">AB-VE</Option>
                  <Option value="A1+ve">A1+VE</Option>
                  <Option value="A1B+ve">A1B+VE</Option>
                  <Option value="A2B+ve">A2B+VE</Option>
                  <Option value="A1B-ve">A1B-VE</Option>
                  <Option value="A2B-ve">A2B-VE</Option>
                </Select>
              </Form.Item>
            </>
          )}
          {currentStep === 2 && (
            <>
              <Form.Item label="Father's Name" name="fatherName" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="Mother's Name" name="motherName" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="Father's Occupation" name="fatherOccupation" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="Mother's Occupation" name="motherOccupation" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="Father's Annual Income" name="fatherIncome" rules={[{ required: true }]}>
                <Input maxLength={10} onInput={(e) => e.target.value = e.target.value.replace(/[^0-9]/g, '')} />
              </Form.Item>
              <Form.Item label="Mother's Annual Income" name="motherIncome" rules={[{ required: true }]}>
                <Input maxLength={10} onInput={(e) => e.target.value = e.target.value.replace(/[^0-9]/g, '')} />
              </Form.Item>
              <Form.Item label="Address" name="address" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="Pincode" name="pincode" rules={[{ pattern: /^[0-9]{6}$/, message: "Invalid!" }]}>
                <Input />
              </Form.Item>
              <Form.Item label="Telephone Number" name="telephoneNumber" rules={[{ pattern: /^[0-9]{10}$/, message: "Invalid!" }]}>
                <Input />
              </Form.Item>
              <Form.Item label="Mobile Number" name="mobileNumber" rules={[{ pattern: /^[0-9]{10}$/, message: "Invalid!" }]}>
                <Input />
              </Form.Item>

              <h3>Guardian Information</h3>
              <Form.Item label="Guardian's Name" name="guardianName"> <Input /> </Form.Item>
              <Form.Item label="Guardian's Occupation" name="guardianOccupation"> <Input /> </Form.Item>
              <Form.Item label="Guardian Address" name="guardianAddress"> <Input.TextArea /> </Form.Item>
              <Form.Item label="Guardian Phone Number" name="guardianNumber"> <Input /> </Form.Item>
            </>)}

          {currentStep === 3 && (
            <>
              <Form.Item label="Examination Passed Year" name="examYear" rules={[{ required: true }]}>
                <InputNumber min={1995} max={new Date().getFullYear()} style={{ width: '100%' }} placeholder="Select Year" />
              </Form.Item>
              <Form.Item label="Registration Number" name="registrationnumber">
                <Input maxLength={15} onInput={(e) => e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 15)} />
              </Form.Item>
              <Form.Item label="Tamil" name="tamil" rules={[{ validator: validateMarks }]}>
                <Input
                  maxLength={3}
                  onInput={(e) => {
                    // keep only digits and up to three characters
                    e.target.value = e.target.value.replace(/[^0-9]/g, "").slice(0, 3);
                  }}
                />
              </Form.Item>

              <Form.Item label="English" name="english" rules={[{ validator: validateMarks }]}>
                <Input
                  maxLength={3}
                  onInput={(e) => {
                    e.target.value = e.target.value.replace(/[^0-9]/g, "").slice(0, 3);
                  }}
                />
              </Form.Item>
              <Form.Item label="Mathametics" name="maths" rules={[{ validator: validateMarks }]}>
                <Input
                  maxLength={3}
                  onInput={(e) => {
                    e.target.value = e.target.value.replace(/[^0-9]/g, "").slice(0, 3);
                  }}
                />
              </Form.Item>
              <Form.Item label="Science" name="science" rules={[{ validator: validateMarks }]}>
                <Input
                  maxLength={3}
                  onInput={(e) => {
                    e.target.value = e.target.value.replace(/[^0-9]/g, "").slice(0, 3);
                  }}
                />
              </Form.Item>
              <Form.Item label="Social" name="social" rules={[{ validator: validateMarks }]}>
                <Input
                  maxLength={3}
                  onInput={(e) => {
                    e.target.value = e.target.value.replace(/[^0-9]/g, "").slice(0, 3);
                  }}
                />
              </Form.Item>

              <Form.Item label="Total" name="total">
                <Input readOnly />
              </Form.Item>

              <Form.Item label="Percentage" name="percentage">
                <Input readOnly />
              </Form.Item>
              <Form.Item name="terminationreason" label="Reason for Discontinuation/ Termination">
                <Input.TextArea autoSize={{ minRows: 3, maxRows: 3 }} maxLength={500} placeholder="Enter Your Reason" />
              </Form.Item>
              <Form.Item name="photocopyofTC" label="Is the photocopy of TC submitted?" rules={[{ required: true }]}>
                <Radio.Group>
                  <Radio value="Yes">Yes</Radio>
                  <Radio value="No">No</Radio>
                </Radio.Group>
              </Form.Item>
              <Form.Item label="Previous Medium" name="previousmedium" rules={[{ required: true }]}>
                <Select placeholder="Select">
                  <Option value="Tamil">Tamil</Option>
                  <Option value="English">English</Option>
                </Select>
              </Form.Item>
              <Form.Item label="Preferred Medium of Study" name="preferredmedium" rules={[{ required: true }]}>
                <Select placeholder="Select">
                  <Option value="Tamil">Tamil</Option>
                  <Option value="English">English</Option>
                </Select>
              </Form.Item>
            </>)}
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
  );
};

export default StudentHSCList;