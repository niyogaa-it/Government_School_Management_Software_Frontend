import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { message, Modal, Descriptions } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import Sidebar from "./Sidebar";

const SectionList = () => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const [selectedSection, setSelectedSection] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleView = (section) => {
    setSelectedSection(section);
    setIsModalVisible(true);
  };

  const fetchSections = async () => {
    try {
      let res;
      if (role === "superadmin") {
        res = await axios.get(`${process.env.REACT_APP_API_URL}/section/getAllSections`);
      } else {
        res = await axios.get(`${process.env.REACT_APP_API_URL}/section/getSectionsBySchool/${user.school.id}`);
      }
      const activeSections = res.data.sections.filter((s) => s.status !== 0);
      setSections(activeSections);
    } catch (err) {
      message.error("Failed to fetch sections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this section?")) {
      try {
        await axios.put(`${process.env.REACT_APP_API_URL}/section/updateStatus/${id}`, { status: 0 });
        message.success("Section deleted successfully");
        fetchSections();
      } catch {
        message.error("Failed to delete section");
      }
    }
  };

  if (loading) return <p>Loading sections...</p>;

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div className="container mt-4" style={{ marginLeft: "250px", flex: 1 }}>
        <h2 className="mb-4">Section List</h2>
        <button onClick={() => navigate("/create-section")} className="btn btn-primary mb-3">
          Create Section
        </button>

        <div className="table-responsive">
          <table className="table table-bordered table-striped">
            <thead className="table-dark">
              <tr>
                <th>S.No</th>
                <th>School</th>
                <th>Grade</th>
                <th>Section Name</th>
                <th>Short Code</th>
                <th style={{ textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sections.length > 0 ? (
                sections.map((s, index) => (
                  <tr key={s.id}>
                    <td>{index + 1}</td>
                    <td>{role === "superadmin" ? s.School?.name : user.school?.name}</td>
                    <td>{s.Grade?.grade}</td>
                    <td>{s.sectionName}</td>
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
                      <EyeOutlined
                        title="View Section"
                        style={{
                          fontSize: 18,
                          color: "#003366",
                          cursor: "pointer",
                        }}
                        onClick={() => handleView(s)}
                      />

                      {/* EDIT */}
                      <EditOutlined
                        title="Edit Section"
                        style={{
                          fontSize: 18,
                          color: "#1890ff",
                          cursor: "pointer",
                        }}
                        onClick={() => navigate(`/edit-section/${s.id}`)}
                      />

                      {/* DELETE */}
                      <DeleteOutlined
                        title="Delete Section"
                        style={{
                          fontSize: 18,
                          color: "#e21216",
                          cursor: "pointer",
                        }}
                        onClick={() => handleDelete(s.id)}
                      />
                    </div>
                  </td>
                  </tr>
            ))
            ) : (
            <tr>
              <td colSpan="6" className="text-center">
                No sections found
              </td>
            </tr>
              )}
          </tbody>
        </table>
      </div>
      {/* ✅ VIEW MODAL */}
{selectedSection && (
  <Modal
    title="Section Details"
    open={isModalVisible}
    onCancel={() => setIsModalVisible(false)}
    footer={null}
  >
    <Descriptions bordered column={1}>
      <Descriptions.Item label="School">
        {role === "superadmin"
          ? selectedSection.School?.name
          : user.school?.name}
      </Descriptions.Item>

      <Descriptions.Item label="Grade">
        {selectedSection.Grade?.grade || "N/A"}
      </Descriptions.Item>

      <Descriptions.Item label="Section Name">
        {selectedSection.sectionName}
      </Descriptions.Item>

      <Descriptions.Item label="Short Code">
        {selectedSection.shortCode}
      </Descriptions.Item>
    </Descriptions>
  </Modal>
)}
    </div>
    </div >
  );
};

export default SectionList;
