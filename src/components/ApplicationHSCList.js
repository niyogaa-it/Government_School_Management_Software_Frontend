import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { message, Modal, Descriptions } from "antd";
import Sidebar from "./Sidebar";

const ApplicationHSCList = () => {
  const [applicationhscs, setApplicationhscs] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const schoolId = user?.school?.id;


  useEffect(() => {
    fetchApplicationhsc();
  }, [role, schoolId]);

  const fetchApplicationhsc = async () => {
    try {
      let response;

      if (role === "superadmin") {
        response = await axios.get("http://localhost:8080/applicationhsc/getAllApplicationhsc");
      } else {
        if (!schoolId) {
          console.error("School ID is missing");
          return;
        }
        response = await axios.get(
          `http://localhost:8080/applicationhsc/getApplicationhscsBySchool/${schoolId}`
        );
      }
      const formattedApplicationhscs = (response.data.applicationhscs || [])
        .filter(app => app.studentStatus === "Applied")
        .map(applicationhsc => ({
          ...applicationhsc,
          Grade: applicationhsc.Grade || { grade: "N/A" }
        }));

      setApplicationhscs(formattedApplicationhscs);
    } catch (error) {
      console.error("Error fetching Application hscs:", error);
      message.error(error.response?.data?.details || "Failed to fetch Application hscs");
    }
  };

  const calculateProgress = (application) => {
    const fieldsByStep = [
      // Step 1
      ["academicYear", "school_id", "emisNum", "aadharNumber"],
      // Step 2
      ["name", "gender", "grade_id", "dob", "age", "nationality", "state", "motherTongue", "community"],
      // Step 3
      ["fatherName", "motherName", "fatherOccupation", "motherOccupation", "fatherIncome", "motherIncome", "address", "pincode", "mobileNumber"],
      // Step 4
      ["photocopyofTC", "previousmedium",],
      // Step 5
      ["bankName", "branchName", "accountNumber", "ifsccode"]
    ];

    let completedSteps = 0;

    for (let step of fieldsByStep) {
      const filled = step.every((field) => application[field]);
      if (filled) completedSteps++;
    }

    return completedSteps * 20; // each step is 20%
  };

  const handleAdmit = async (application) => {
    try {
      const confirm = window.confirm(`Are you sure you want to admit ${application.name}?`);
      if (!confirm) return;

      // ✅ Call backend to admit the student
      const response = await axios.post(
        `http://localhost:8080/applicationhsc/admit/${application.id}`
      );

      // ✅ Show admission number in success message
      const admissionNumber = response.data.admissionNumber;
      message.success(`Admitted successfully. Admission No: ${admissionNumber}`);

      // ✅ Refresh application list to hide the admitted one
      fetchApplicationhsc();
    } catch (error) {
      console.error("Admit failed:", error);
      message.error(error.response?.data?.error || "Failed to admit student");
    }
  };

  const handleView = async (id) => {
    try {
      const response = await axios.get(`http://localhost:8080/applicationhsc/getApplicationhscById/${id}`);
      setSelectedApplication(response.data.application);
      setIsModalVisible(true);
    } catch (error) {
      console.error("Failed to fetch application details", error);
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
        <h2 className="mb-4">Application List for HSC</h2>
        <button
          onClick={() => navigate("/create-applicationhsc")}
          className="btn btn-primary mb-3"
        >
          Create Application
        </button>
        <div className="table-responsive">
          <table className="table table-bordered table-striped">
            <thead className="table-dark">
              <tr>
                <th>ID</th>
                <th>Application Number</th>
                <th>School</th>
                <th>Academic Year</th>
                <th>Name</th>
                <th>Gender</th>
                <th>Grade</th>
                <th>Progress</th> {/* NEW */}
                <th>Action</th> {/* NEW */}
              </tr>
            </thead>
            <tbody>
              {applicationhscs.length > 0 ? (
                applicationhscs.map((app) => {
                  const progress = calculateProgress(app);
                  return (
                    <tr key={app.id}>
                      <td>{app.id}</td>
                      <td>{app.applicationNumber}</td>
                      <td>{role === "superadmin" ? app.School?.name || "N/A" : user.school?.name || "N/A"}</td>
                      <td>{app.academicYear}</td>
                      <td>{app.name}</td>
                      <td>{app.gender}</td>
                      <td>{app.Grade?.grade || "N/A"}</td>
                      <td>
                        <progress value={progress} max="100" style={{
                          width: "100px",
                          accentColor:
                            progress === 100
                              ? "#237804"       // Dark Green
                              : progress >= 80
                                ? "#52c41a"       // Light Green
                                : progress >= 60
                                  ? "#fadb14"       // Yellow
                                  : progress >= 40
                                    ? "#fa8c16"       // Orange
                                    : "#ff4d4f"        // Red
                        }} />
                        <span style={{ marginLeft: 10 }}>{progress}%</span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: "10px" }}>
                          {progress === 100 && role === "superadmin" && (
                            <button
                              onClick={() => handleAdmit(app)}
                              style={{
                                backgroundColor: "#52c41a",
                                color: "white",
                                padding: "6px 12px",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer"
                              }}
                            >
                              Admit
                            </button>
                          )}
                          <button
                            onClick={() => handleView(app.id)}
                            style={{
                              backgroundColor: "#003366", // Dark Blue
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
                            onClick={() => navigate(`/edit-applicationhsc/${app.id}`)}
                            style={{
                              backgroundColor: "#1890ff",
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
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8">No Applications found</td>
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
              <Descriptions.Item label="Application Number">
                {selectedApplication.applicationNumber}
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
              <Descriptions.Item label="Birthsite division">
                {selectedApplication.birthdistrict}
              </Descriptions.Item>
              <Descriptions.Item label="Religion">
                {selectedApplication.religion}
              </Descriptions.Item>
              <Descriptions.Item label="Community">
                {selectedApplication.community}
              </Descriptions.Item>
              <Descriptions.Item label="Is the student from scheduled caste/ from scheduled tribe community?">
                {selectedApplication.scheduledcasteOrtribecommunity}
              </Descriptions.Item>
              <Descriptions.Item label="Is the student from any backward caste?">
                {selectedApplication.backwardcaste}
              </Descriptions.Item>
              <Descriptions.Item label="Is the student a convert from Hinduism to Christianity?">
                {selectedApplication.tribeTootherreligion}
              </Descriptions.Item>
              <Descriptions.Item label="Living with whom">
                {selectedApplication.living}
              </Descriptions.Item>
              <Descriptions.Item label="Is the student for chicken pox? Is scar Available?">
                {selectedApplication.currentlivingaddres}
              </Descriptions.Item>
              <Descriptions.Item label="If not living with Parents or Guardian then write current living address">
                {selectedApplication.identificationmarks}
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
              <Descriptions.Item label="Tamil">
                {selectedApplication.tamil}
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
              <Descriptions.Item label="Reason for Discontinuation/ Termination">
                {selectedApplication.terminationreason}
              </Descriptions.Item>
              <Descriptions.Item label="Is the photocopy of TC submitted? Submit Original copy during admission">
                {selectedApplication.photocopyofTC}
              </Descriptions.Item>
              <Descriptions.Item label="Previous Medium">
                {selectedApplication.preferredmedium}
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
      </div>
    </div>
  );
};

export default ApplicationHSCList;