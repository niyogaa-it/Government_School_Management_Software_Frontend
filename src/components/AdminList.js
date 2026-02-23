import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { message, Modal, Descriptions } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import Sidebar from "./Sidebar";

const AdminList = () => {
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAdmin, setSelectedAdmin] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user"));
    const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");

    const handleView = (admin) => {
        setSelectedAdmin(admin);
        setIsModalVisible(true);
    };

    const fetchAdmins = async () => {
        try {
            let response;

            if (role === "superadmin") {
                response = await axios.get(
                    `${process.env.REACT_APP_API_URL}/admin/getAllAdmins`
                );

                const filteredAdmins = response.data.admins.filter(
                    (admin) =>
                        admin.Role?.roleOfUser
                            ?.toLowerCase()
                            .replace(/\s+/g, "") !== "superadmin"
                );

                setAdmins(filteredAdmins);
            } else {
                response = await axios.get(
                    `${process.env.REACT_APP_API_URL}/admin/getAdminsBySchool/${user.school.id}`
                );
                setAdmins(response.data.admins);
            }
        } catch (error) {
            message.error("Failed to fetch users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdmins();
    }, []);

    const handleDelete = async (adminId) => {
        if (window.confirm("Are you sure you want to delete this user?")) {
            try {
                await axios.delete(
                    `${process.env.REACT_APP_API_URL}/admin/deleteAdmin/${adminId}`
                );
                message.success("User deleted successfully");
                fetchAdmins();
            } catch {
                message.error("Failed to delete user");
            }
        }
    };

    if (loading) return <p>Loading users...</p>;

    return (
        <div style={{ display: "flex" }}>
            <Sidebar />

            <div
                className="container mt-4"
                style={{ marginLeft: "250px", flex: 1 }}
            >
                <h2 className="mb-4">Users List</h2>

                <button
                    onClick={() => navigate("/create-admin")}
                    className="btn btn-primary mb-3"
                >
                    Create User
                </button>

                <div className="table-responsive">
                    <table className="table table-bordered table-striped">
                        <thead className="table-dark">
                            <tr>
                                <th>S.No</th>
                                <th>School</th>
                                <th>Role</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Mobile</th>
                                <th style={{ textAlign: "center" }}>Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {admins.length > 0 ? (
                                admins.map((admin, index) => (
                                    <tr key={admin.id}>
                                        <td>{index + 1}</td>
                                        <td>
                                            {role === "superadmin"
                                                ? admin.School?.name || "N/A"
                                                : user.school?.name || "N/A"}
                                        </td>
                                        <td>{admin.Role?.roleOfUser || "N/A"}</td>
                                        <td>{admin.name}</td>
                                        <td>{admin.email}</td>
                                        <td>{admin.mobileNumber}</td>
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
                                                    title="View User"
                                                    style={{
                                                        fontSize: 18,
                                                        color: "#003366",
                                                        cursor: "pointer",
                                                    }}
                                                    onClick={() => handleView(admin)}
                                                />

                                                {/* EDIT */}
                                                <EditOutlined
                                                    title="Edit User"
                                                    style={{
                                                        fontSize: 18,
                                                        color: "#1890ff",
                                                        cursor: "pointer",
                                                    }}
                                                    onClick={() =>
                                                        navigate(`/edit-admin/${admin.id}`)
                                                    }
                                                />

                                                {/* DELETE */}
                                                {role === "superadmin" && (
                                                    <DeleteOutlined
                                                        title="Delete User"
                                                        style={{
                                                            fontSize: 18,
                                                            color: "#e21216",
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() => handleDelete(admin.id)}
                                                    />
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="text-center">
                                        No users found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ✅ VIEW MODAL */}
                {selectedAdmin && (
                    <Modal
                        title="User Details"
                        open={isModalVisible}
                        onCancel={() => setIsModalVisible(false)}
                        footer={null}
                    >
                        <Descriptions bordered column={1}>
                            <Descriptions.Item label="School">
                                {role === "superadmin"
                                    ? selectedAdmin.School?.name
                                    : user.school?.name}
                            </Descriptions.Item>
                            <Descriptions.Item label="Role">
                                {selectedAdmin.Role?.roleOfUser || "N/A"}
                            </Descriptions.Item>
                            <Descriptions.Item label="Name">
                                {selectedAdmin.name}
                            </Descriptions.Item>

                            <Descriptions.Item label="Email">
                                {selectedAdmin.email}
                            </Descriptions.Item>

                            <Descriptions.Item label="Mobile">
                                {selectedAdmin.mobileNumber}
                            </Descriptions.Item>

                        </Descriptions>
                    </Modal>
                )}
            </div>
        </div>
    );
};

export default AdminList;