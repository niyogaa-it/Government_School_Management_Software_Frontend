import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "./Sidebar";
import { message, Modal, Descriptions } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";

const GradeList = () => {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    try {
      let response;
      if (role === "superadmin") {
        response = await axios.get(`${process.env.REACT_APP_API_URL}/grade/getAllGrades`);
      } else {
        const schoolId = user?.school?.id;
        if (!schoolId) return;
        response = await axios.get(
          `${process.env.REACT_APP_API_URL}/grade/getGradesBySchool/${schoolId}`
        );
      }
      setGrades(response.data.grades || []);
    } catch (error) {
      console.error("Error fetching grades:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (gradeId) => {
    if (window.confirm("Are you sure you want to delete this grade?")) {
      try {
        await axios.delete(
          `${process.env.REACT_APP_API_URL}/grade/deleteGrade/${gradeId}`
        );

        message.success("Grade deleted successfully");
        fetchGrades();
      } catch (error) {
        message.error("Failed to delete grade");
      }
    }
  };

  const handleView = (grade) => {
    setSelectedGrade(grade);
    setIsModalVisible(true);
  };

  if (loading) return <p>Loading grades...</p>;

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div className="container mt-4" style={{ marginLeft: "250px", flex: 1 }}>
        <h2 className="mb-4">Grade List</h2>

        <button
          onClick={() => navigate("/create-grade")}
          className="btn btn-primary mb-3"
        >
          Create Grade
        </button>

        <div className="table-responsive">
          <table className="table table-bordered table-striped">
            <thead className="table-dark">
              <tr>
                <th>S.No</th>
                <th>School</th>
                <th>Grade</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {grades.length > 0 ? (
                grades.map((grade, index) => (
                  <tr key={grade.id}>
                    <td>{index + 1}</td>
                    <td>
                      {role === "superadmin"
                        ? grade.School?.name || "N/A"
                        : user.school?.name || "N/A"}
                    </td>
                    <td>{grade.grade}</td>
                    <td style={{ textAlign: "center" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: "12px",
                        }}
                      >
                        {/* VIEW */}
                        <EyeOutlined
                          title="View Grade"
                          style={{
                            fontSize: 18,
                            color: "#003366",
                            cursor: "pointer",
                          }}
                          onClick={() => handleView(grade)}
                        />

                        {/* EDIT */}
                        <EditOutlined
                          title="Edit Grade"
                          style={{
                            fontSize: 18,
                            color: "#1890ff",
                            cursor: "pointer",
                          }}
                          onClick={() => navigate(`/edit-grade/${grade.id}`)}
                        />

                        {/* DELETE */}
                        <DeleteOutlined
                          title="Delete Grade"
                          style={{
                            fontSize: 18,
                            color: "#e21216",
                            cursor: "pointer",
                          }}
                          onClick={() => handleDelete(grade.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center">
                    No grades found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* VIEW MODAL */}
        {selectedGrade && (
          <Modal
            title="Grade Details"
            open={isModalVisible}
            onCancel={() => setIsModalVisible(false)}
            footer={null}
          >
            <Descriptions bordered column={1}>
              <Descriptions.Item label="School">
                {role === "superadmin"
                  ? selectedGrade.School?.name || "N/A"
                  : user.school?.name || "N/A"}
              </Descriptions.Item>

              <Descriptions.Item label="Grade">
                {selectedGrade.grade}
              </Descriptions.Item>
            </Descriptions>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default GradeList;
