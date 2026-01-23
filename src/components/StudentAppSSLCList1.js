import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { message, Modal, Descriptions } from "antd";
import Sidebar from "./Sidebar";

const StudentSSLCList = () => {
  const [studentsslcs, setStudentsslcs] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const schoolId = user?.school?.id;

  useEffect(() => {
    fetchStudentsslcs();
  }, [role, schoolId]);


  const fetchStudentsslcs = async () => {
    try {
      let response;

      if (role === "superadmin") {
        response = await axios.get("http://localhost:8080/studentsslc/getAllStudentsslc");
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
        .map(studentsslc => ({
          ...studentsslc,
          Grade: studentsslc.Grade || { grade: "N/A" }
        }));

      setStudentsslcs(formattedStudentsslcs);
    } catch (error) {
      console.error("Error fetching Students:", error);
      message.error(error.response?.data?.details || "Failed to fetch students");
    }
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

  const formatAge = (age) => {
    if (!age || typeof age !== "object") return "N/A";
    const { years = 0, months = 0, days = 0 } = age;
    return `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}, ${days} day${days !== 1 ? 's' : ''}`;
  };

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
                <th>ID</th>
                <th>Admission Number</th>
                <th>School</th>
                <th>Academic Year</th>
                <th>Date Of Join</th>
                <th>Name</th>
                <th>Gender</th>
                <th>Grade</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {studentsslcs.length > 0 ? (
                studentsslcs.map((student) => (
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
                          onClick={() => handleView(student.id)}
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
                          onClick={() => navigate(`/edit-studentsslc/${student.id}`)}
                          style={{
                            backgroundColor: "#1890ff", // blue
                            color: "white",
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
                  <td colSpan="8">No Students found</td>
                </tr>
              )}
            </tbody>
          </table>
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
              <Descriptions.Item label="Religion">
                {selectedApplication.religion}
              </Descriptions.Item>
              <Descriptions.Item label="Home Town">
                {selectedApplication.fatherName}
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
              <Descriptions.Item label="Identification Marks">
                {selectedApplication.identificationmarks}
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
      </div>
    </div>
  );
};


export default StudentSSLCList;