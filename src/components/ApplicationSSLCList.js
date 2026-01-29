import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { message, Modal, Descriptions } from "antd";
import Sidebar from "./Sidebar";
import { EyeOutlined, EditOutlined, CheckCircleOutlined, DeleteOutlined } from "@ant-design/icons";

const ApplicationSSLCList = () => {
  const [applicationsslcs, setApplicationsslcs] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const schoolId = user?.school?.id;

  useEffect(() => {
    fetchApplications();
  }, [role, schoolId]);

  const fetchApplications = async () => {
    try {
      let response;

      if (role === "superadmin") {
        response = await axios.get("http://localhost:8080/applicationsslc/getAllApplicationsslc");
      } else {
        if (!schoolId) {
          console.error("School ID is missing");
          return;
        }
        response = await axios.get(
          `http://localhost:8080/applicationsslc/getApplicationsslcsBySchool/${schoolId}`
        );
      }

      const formattedApplicationsslcs = (response.data.applicationsslcs || [])
        .filter(app => app.studentStatus === "Applied")
        .map(applicationsslc => ({
          ...applicationsslc,
          Grade: applicationsslc.Grade || { grade: "N/A" }
        }));

      setApplicationsslcs(formattedApplicationsslcs);
    } catch (error) {
      console.error("Error fetching Application sslcs:", error);
      message.error(error.response?.data?.details || "Failed to fetch Application sslcs");
    }
  };

  const calculateProgress = (application) => {
    const fieldsByStep = [
      // Step 1
      ["academicYear", "school_id", "emisNum", "aadharNumber"],
      // Step 2
      ["name", "gender", "grade_id", "dob", "age", "nationality", "state", "motherTongue", "hometown", "religion", "community"],
      // Step 3
      ["fatherName", "motherName", "fatherOccupation", "motherOccupation", "fatherIncome", "motherIncome", "address", "pincode", "mobileNumber"],
      // Step 4
      ["tceslc", "firstLanguage"],
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
        `http://localhost:8080/applicationsslc/admit/${application.id}`
      );

      // ✅ Show admission number in success message
      const admissionNumber = response.data.admissionNumber;
      message.success(`Admitted successfully. Admission No: ${admissionNumber}`);

      // ✅ Refresh application list to hide the admitted one
      fetchApplications();
    } catch (error) {
      console.error("Admit failed:", error);
      message.error(error.response?.data?.error || "Failed to admit student");
    }
  };

  const handleView = async (id) => {
    try {
      console.log("Viewing Application ID:", id); 
      const response = await axios.get(
        `http://localhost:8080/applicationsslc/getApplicationsslcById/${id}`
      );
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

  const handleDelete = async (id, name) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to remove application of ${name}?`
    );
    if (!confirmDelete) return;

    try {
      await axios.put(
        `http://localhost:8080/applicationsslc/updateStatus/${id}`
      );

      message.success("Application removed successfully");

      // Refresh list → S.No auto reorders
      fetchApplications();
    } catch (error) {
      message.error("Failed to remove application");
    }
  };
  const iconSlotStyle = {
    width: "28px",          // fixed width for each icon
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  };

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div className="container mt-4" style={{ marginLeft: "250px", flex: 1 }}>
        <h2 className="mb-4">Application List for SSLC</h2>
        <button
          onClick={() => navigate("/create-applicationsslc")}
          className="btn btn-primary mb-3"
        >
          Create SSLC Application
        </button>
        <div className="table-responsive">
          <table className="table table-bordered table-striped">
            <thead className="table-dark">
              <tr>
                <th>S.No</th>
                <th>Application No</th>
                <th>School</th>
                <th>Academic Year</th>
                <th>Name</th>
                <th>Gender</th>
                <th>Grade</th>
                <th>Progress</th>
                <th style={{ textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {applicationsslcs.length > 0 ? (
                applicationsslcs.map((app, index) => {
                  const progress = calculateProgress(app);
                  return (
                    <tr key={app.id}>
                      <td>{index + 1}</td>
                      <td>{app.applicationNumber}</td>
                      <td>{role === "superadmin" ? app.School?.name : user.school?.name}</td>
                      <td>{app.academicYear}</td>
                      <td>{app.name}</td>
                      <td>{app.gender}</td>
                      <td>{app.Grade?.grade || "N/A"}</td>
                      <td>
                        <progress value={progress} max="100" style={{
                          width: "100px",
                          accentColor:
                            progress === 100
                              ? "#195304"       // Dark Green
                              : progress >= 80
                                ? "#7de24a"       // Light Green
                                : progress >= 60
                                  ? "#f7de40"       // Yellow
                                  : progress >= 40
                                    ? "#ff9b31"       // Orange
                                    : "#f86b6e"        // Red
                        }} />
                        <span style={{ marginLeft: 10 }}>{progress}%</span>
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>

                          {/* ADMIT SLOT (always reserved) */}
                          <div style={iconSlotStyle}>
                            {progress === 100 && role === "superadmin" && (
                              <CheckCircleOutlined
                                title="Admit Student"
                                style={{ fontSize: 20, color: "#52c41a", cursor: "pointer" }}
                                onClick={() => handleAdmit(app)}
                              />
                            )}
                          </div>

                          {/* VIEW */}
                          <div style={iconSlotStyle}>
                            <EyeOutlined
                              title="View Application"
                              style={{ fontSize: 18, color: "#003366", cursor: "pointer" }}
                              onClick={() => handleView(app.id)}
                            />
                          </div>

                          {/* EDIT */}
                          <div style={iconSlotStyle}>
                            <EditOutlined
                              title="Edit Application"
                              style={{ fontSize: 18, color: "#1890ff", cursor: "pointer" }}
                              onClick={() => navigate(`/edit-applicationsslc/${app.id}`)}
                            />
                          </div>

                          {/* DELETE (superadmin only, but space always reserved) */}
                          <div style={iconSlotStyle}>
                            {role === "superadmin" && (
                              <DeleteOutlined
                                title="Remove Application"
                                style={{ fontSize: 18, color: "#e21216", cursor: "pointer" }}
                                onClick={() => handleDelete(app.id, app.name)}
                              />
                            )}
                          </div>

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
            open={isModalVisible}
            onCancel={() => setIsModalVisible(false)}
            footer={null}
            width={1200}
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

const buttonStyle = {
  marginBottom: "20px",
  padding: "10px",
  backgroundColor: "blue",
  color: "white",
  border: "none",
  cursor: "pointer"
};

const tableStyle = {
  width: "100%",
  textAlign: "left",
  borderCollapse: "collapse"
};

export default ApplicationSSLCList;