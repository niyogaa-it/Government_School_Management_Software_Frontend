import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { message, Modal, Descriptions } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import Sidebar from "./Sidebar";

const SubjectList = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/subject/getAllSubjects`
      );

      const activeSubjects = (res.data.subjects || [])
        .filter((s) => s.status !== 0)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setSubjects(activeSubjects);
    } catch {
      message.error("Failed to fetch subjects");
    } finally {
      setLoading(false);
    }
  };

  // ✅ VIEW
  const handleView = (subject) => {
    setSelectedSubject(subject);
    setIsModalVisible(true);
  };

  // ✅ DELETE
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this subject?")) {
      try {
        await axios.put(
          `${process.env.REACT_APP_API_URL}/subject/updateStatus/${id}`,
          { status: 0 }
        );

        message.success("Subject deleted successfully");
        fetchSubjects();
      } catch {
        message.error("Failed to delete subject");
      }
    }
  };

  const iconSlotStyle = {
    width: "28px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  };

  if (loading) return <p>Loading subjects...</p>;

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />

      <div className="container mt-4" style={{ marginLeft: "250px", flex: 1 }}>
        <h2 className="mb-4">Subject List</h2>

        <button
          onClick={() => navigate("/create-subject")}
          className="btn btn-primary mb-3"
        >
          Create Subject
        </button>

        <div className="table-responsive">
          <table className="table table-bordered table-striped">
            <thead className="table-dark">
              <tr>
                <th>S.No</th>
                <th>School</th>
                <th>Grade</th>
                <th>Subject Name</th>
                <th>Short Code</th>
                <th style={{ textAlign: "center" }}>Action</th>
              </tr>
            </thead>

            <tbody>
              {subjects.length > 0 ? (
                subjects.map((s, index) => (
                  <tr key={s.id}>
                    <td>{index + 1}</td>
                    <td>
                      {role === "superadmin"
                        ? s.School?.name
                        : user.school?.name}
                    </td>
                    <td>{s.Grade?.grade || "N/A"}</td>
                    <td>{s.subjectName}</td>
                    <td>{s.shortCode}</td>

                    <td style={{ textAlign: "center" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: "10px",
                        }}
                      >
                        {/* VIEW */}
                        <div style={iconSlotStyle}>
                          <EyeOutlined
                            title="View Subject"
                            style={{
                              fontSize: 18,
                              color: "#003366",
                              cursor: "pointer",
                            }}
                            onClick={() => handleView(s)}
                          />
                        </div>

                        {/* EDIT */}
                        <div style={iconSlotStyle}>
                          <EditOutlined
                            title="Edit Subject"
                            style={{
                              fontSize: 18,
                              color: "#1890ff",
                              cursor: "pointer",
                            }}
                            onClick={() =>
                              navigate(`/edit-subject/${s.id}`)
                            }
                          />
                        </div>

                        {/* DELETE */}
                        <div style={iconSlotStyle}>
                          <DeleteOutlined
                            title="Delete Subject"
                            style={{
                              fontSize: 18,
                              color: "#e21216",
                              cursor: "pointer",
                            }}
                            onClick={() => handleDelete(s.id)}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center">
                    No subjects found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ✅ VIEW MODAL */}
        {selectedSubject && (
          <Modal
            title="Subject Details"
            open={isModalVisible}
            onCancel={() => setIsModalVisible(false)}
            footer={null}
          >
            <Descriptions bordered column={1}>
              <Descriptions.Item label="School">
                {selectedSubject.School?.name || "N/A"}
              </Descriptions.Item>

              <Descriptions.Item label="Grade">
                {selectedSubject.Grade?.grade || "N/A"}
              </Descriptions.Item>

              <Descriptions.Item label="Subject Name">
                {selectedSubject.subjectName}
              </Descriptions.Item>

              <Descriptions.Item label="Short Code">
                {selectedSubject.shortCode}
              </Descriptions.Item>
            </Descriptions>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default SubjectList;