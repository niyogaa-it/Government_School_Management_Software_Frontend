import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { message } from "antd"; // ? import message
import { DeleteOutlined } from "@ant-design/icons"; // ? import icon
import Sidebar from "./Sidebar";

const RoleList = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const roleName = user?.roleName?.toLowerCase().replace(/\s+/g, "");
  const schoolId = user?.school?.id;

  useEffect(() => {
    fetchRoles();
  }, [roleName, schoolId]);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      let response;
      if (roleName === "superadmin") {
        response = await axios.get("http://localhost:8080/role/getAllRoles");
        const filteredRoles = response.data.roles.filter(
          (role) => role.roleOfUser?.toLowerCase().replace(/\s+/g, "") !== "superadmin"
        );
        setRoles(filteredRoles);
      } else if (schoolId) {
        response = await axios.get(`http://localhost:8080/role/getRolesBySchool/${schoolId}`);
        setRoles(response.data.roles || []);
      }
    } catch (error) {
      message.error("Failed to fetch roles");
    } finally {
      setLoading(false);
    }
  };

  // ? Updated delete function with Ant Design message
  const handleDelete = async (roleId) => {
    if (window.confirm("Are you sure you want to delete this role?")) {
      try {
        await axios.delete(`http://localhost:8080/role/deleteRole/${roleId}`);
        message.success("Role deleted successfully");         
        fetchRoles(); // Refresh list
      } catch (error) {
        console.error("Error deleting role:", error.response?.data || error.message);
        message.error("Failed to delete role"); 
      }
    }
  };

  if (loading) return <p>Loading roles...</p>;

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div className="container mt-4" style={{ marginLeft: "250px", flex: 1 }}>
        <h2 className="mb-4">Role List</h2>

        <button
          className="btn btn-primary mb-3"
          onClick={() => navigate("/create-role")}
        >
          Create Role
        </button>

        <div className="table-responsive">
          <table className="table table-bordered table-striped">
            <thead className="table-dark">
              <tr>
                <th>S.No</th>
                <th>Role Name</th>
                <th>School</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {roles.length > 0 ? (
                roles.map((role, index) => (
                  <tr key={role.id}>
                    <td>{index + 1}</td>
                    <td>{role.roleOfUser}</td>
                    <td>
                      {roleName === "superadmin"
                        ? role.School?.name || "N/A"
                        : user.school?.name || "N/A"}
                    </td>
                    <td>
                      <DeleteOutlined
                        style={{
                          color: "#e21216ff",
                          fontSize: "18px",
                          cursor: "pointer",
                        }}
                        onClick={() => handleDelete(role.id)}
                        title="Delete Role"
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center">
                    No roles found.
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

export default RoleList;