import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Modal, Button, message } from "antd";
import Sidebar from "./Sidebar";
import { EyeOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";

const GroupList = () => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user"));
    const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");
    const [viewModalVisible, setViewModalVisible] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);

    useEffect(() => {
        fetchGroups();
    }, [role, user?.school?.id]);

    const fetchGroups = async () => {
        try {
            let response;

            if (role === "superadmin") {
                response = await axios.get("http://localhost:8080/group/getAllGroups");
            } else {
                const schoolId = user?.school?.id;
                if (!schoolId) {
                    console.error("School ID is missing.");
                    return;
                }
                response = await axios.get(`http://localhost:8080/group/getGroupsBySchool/${schoolId}`);
            }

            const formattedGroups = response.data.groups?.map(group => ({
                ...group,
                Grade: group.Grade || { grade: "N/A" },
                School: group.School || { name: "N/A" },
            })) || [];

            setGroups(formattedGroups);
        } catch (error) {
            console.error("Error fetching groups:", error);
            message.error(error.response?.data?.details || "Failed to fetch groups");
        } finally {
            setLoading(false);
        }
    };

    const handleView = (group) => {
        setSelectedGroup(group);
        setViewModalVisible(true);
    };

   const handleDelete = async (groupId) => {
  Modal.confirm({
    title: "Are you sure you want to delete this group?",
    okText: "Yes",
    okType: "danger",
    cancelText: "No",
    onOk: async () => {
      try {
        await axios.delete(`http://localhost:8080/group/deleteGroup/${groupId}`);
        message.success("Group deleted successfully");
        fetchGroups();
      } catch (error) {
        message.error(error.response?.data?.error || "Failed to delete group");
      }
    }
  });
};

    return (
        <div style={{ display: "flex" }}>
            <Sidebar />
            <div style={{ marginLeft: "250px", padding: "20px", flex: 1 }}>
                <h2>Group List</h2>
                <button
                    onClick={() => navigate("/create-group")}
                    style={buttonStyle}
                >
                    Create Group
                </button>

                <table border="1" cellPadding="10" style={tableStyle}>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>School</th>
                            <th>Grade</th>
                            <th>Available Groups</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groups.length > 0 ? (
                            groups.map((group, index) => (
                                <tr key={group.id}>
                                    <td>{index + 1}</td>
                                    <td>{role === "superadmin" ? group.School?.name || "N/A" : user.school?.name || "N/A"}</td>
                                    <td>{group.Grade?.grade}</td>
                                    <td>{group.availableGroups}</td>
                                    <td>
                                        <Button icon={<EyeOutlined />} onClick={() => handleView(group)} />
                                        <Button icon={<EditOutlined />} onClick={() => navigate(`/edit-group/${group.id}`)} />
                                        <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(group.id)} />
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4">No groups found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <Modal
                title="Group Details"
                visible={viewModalVisible}
                onCancel={() => setViewModalVisible(false)}
                footer={null}
            >
                {selectedGroup && (
                    <div>
                        <p><strong>School:</strong> {selectedGroup.School?.name || "N/A"}</p>
                        <p><strong>Grade:</strong> {selectedGroup.Grade?.grade || "N/A"}</p>
                        <p><strong>Group Name:</strong> {selectedGroup.availableGroups}</p>
                        <p><strong>Status:</strong> {selectedGroup.isActive ? "Active" : "Inactive"}</p>
                    </div>
                )}
            </Modal>
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

export default GroupList;