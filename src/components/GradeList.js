import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "./Sidebar";

const GradeList = () => {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    try {
      let response;
      if (role === "superadmin") {
        response = await axios.get("http://localhost:8080/grade/getAllGrades");
      } else {
        const schoolId = user?.school?.id;
        if (!schoolId) return;
        response = await axios.get(
          `http://localhost:8080/grade/getGradesBySchool/${schoolId}`
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
        await axios.delete(`http://localhost:8080/grade/deleteGrade/${gradeId}`);
        alert("Grade deleted successfully");
        fetchGrades(); // Refresh after delete
      } catch (error) {
        console.error("Error deleting grade:", error);
        alert("Failed to delete grade");
      }
    }
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
                <th>Actions</th>
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
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(grade.id)}
                      >
                        Delete
                      </button>
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
      </div>
    </div>
  );
};

export default GradeList;
