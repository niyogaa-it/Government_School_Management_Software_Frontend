import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Modal, Descriptions, message } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import Sidebar from "./Sidebar";

const SchoolList = () => {
    const [schools, setSchools] = useState([]);
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchSchools();
    }, []);

    const fetchSchools = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/school/getAllSchools`);
            setSchools(response.data.schools || []);
        } catch (error) {
            console.error("Error fetching schools:", error.response?.data || error.message);
            message.error("Failed to fetch schools");
        }
    };

    // ✅ VIEW
    const handleView = (school) => {
        setSelectedSchool(school);
        setIsModalVisible(true);
    };

    // ✅ DELETE
    const handleDelete = async (schoolId) => {
        if (window.confirm("Are you sure you want to delete this school?")) {
            try {
                await axios.delete(`${process.env.REACT_APP_API_URL}/school/deleteSchool/${schoolId}`);
                message.success("School deleted successfully");
                fetchSchools();
            } catch (error) {
                console.error("Error deleting school:", error.response?.data || error.message);
                message.error("Failed to delete school");
            }
        }
    };

    return (
        <div style={{ display: "flex" }}>
            <Sidebar />

            <div className="container mt-4" style={{ marginLeft: "250px", flex: 1 }}>
                <h2 className="mb-4">School List</h2>

                <button
                    className="btn btn-primary mb-3"
                    onClick={() => navigate("/create-school")}
                >
                    Create School
                </button>

                <div className="table-responsive">
                    <table className="table table-bordered table-striped">
                        <thead className="table-dark">
                            <tr>
                                <th>S.No</th>
                                <th>Name</th>
                                <th>Short Code</th>
                                 <th>Phone Number</th>
                                <th>Address</th>
                                <th>City</th>
                                <th style={{ textAlign: "center" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {schools.length > 0 ? (
                                schools.map((school, index) => (
                                    <tr key={school.id}>
                                        <td>{index + 1}</td>
                                        <td>{school.name}</td>
                                        <td>{school.shortcode}</td>
                                        <td>{school.phoneNumber}</td>
                                        <td>{school.address}</td>
                                        <td>{school.city}</td>
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
                                                    title="View School"
                                                    style={{
                                                        fontSize: 18,
                                                        color: "#003366",
                                                        cursor: "pointer",
                                                    }}
                                                    onClick={() => handleView(school)}
                                                />

                                                {/* EDIT */}
                                                <EditOutlined
                                                    title="Edit School"
                                                    style={{
                                                        fontSize: 18,
                                                        color: "#1890ff",
                                                        cursor: "pointer",
                                                    }}
                                                    onClick={() => navigate(`/edit-school/${school.id}`)}
                                                />

                                                {/* DELETE */}
                                                <DeleteOutlined
                                                    title="Delete School"
                                                    style={{
                                                        fontSize: 18,
                                                        color: "#e21216",
                                                        cursor: "pointer",
                                                    }}
                                                    onClick={() => handleDelete(school.id)}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="text-center">
                                        No schools found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ✅ VIEW MODAL */}
                {selectedSchool && (
                    <Modal
                        title="School Details"
                        open={isModalVisible}
                        onCancel={() => setIsModalVisible(false)}
                        footer={null}
                    >
                        <Descriptions bordered column={1}>
                            <Descriptions.Item label="Name">
                                {selectedSchool.name}
                            </Descriptions.Item>

                            <Descriptions.Item label="Short Code">
                                {selectedSchool.shortcode}
                            </Descriptions.Item>

                             <Descriptions.Item label="Phone Number">
                                {selectedSchool.phoneNumber}
                            </Descriptions.Item>

                            <Descriptions.Item label="Address">
                                {selectedSchool.address}
                            </Descriptions.Item>

                            <Descriptions.Item label="City">
                                {selectedSchool.city}
                            </Descriptions.Item>

                            <Descriptions.Item label="State">
                                {selectedSchool.state}
                            </Descriptions.Item>

                            <Descriptions.Item label="Pincode">
                                {selectedSchool.pincode}
                            </Descriptions.Item>
                        </Descriptions>
                    </Modal>
                )}
            </div>
        </div>
    );
};

export default SchoolList;