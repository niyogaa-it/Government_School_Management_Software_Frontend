import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { message } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import Sidebar from "./Sidebar";

const SubjectList = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");

  const fetchSubjects = async () => {
    try {
      let res;

      if (role === "superadmin") {
        res = await axios.get(
          `${process.env.REACT_APP_API_URL}/subject/getAllSubjects`
        );
      } else {
        res = await axios.get(
          `${process.env.REACT_APP_API_URL}/subject/getAllSubjects`
        );
      }

      // Filter active subjects
      const activeSubjects = (res.data.subjects || []).filter(
        (s) => s.status !== 0
      );

      // Sort latest created first
      const sortedSubjects = activeSubjects.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      setSubjects(sortedSubjects);
    } catch (err) {
      message.error("Failed to fetch subjects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

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

  if (loading) return <p>Loading subjects...</p>;

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />

      <div
        className="container mt-4"
        style={{ marginLeft: "250px", flex: 1 }}
      >
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
                <th>Section</th>
                <th>Subject Name</th>
                <th>Short Code</th>
                <th>Action</th>
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

                    <td>{s.Grade?.grade}</td>
                    <td>{s.Section?.sectionName}</td>
                    <td>{s.subjectName}</td>
                    <td>{s.shortCode}</td>

                    <td>
                      <EditOutlined
                        style={{
                          color: "#0e79d1",
                          fontSize: "18px",
                          cursor: "pointer",
                          marginRight: "12px",
                        }}
                        onClick={() =>
                          navigate(`/edit-subject/${s.id}`)
                        }
                        title="Edit Subject"
                      />

                      <DeleteOutlined
                        style={{
                          color: "#e21216",
                          fontSize: "18px",
                          cursor: "pointer",
                        }}
                        onClick={() => handleDelete(s.id)}
                        title="Delete Subject"
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center">
                    No subjects found
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

export default SubjectList;
