import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "./Sidebar";

const AdminList = () => {
    const [admins, setAdmins] = useState([]);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const user = JSON.parse(localStorage.getItem("user")); // Get logged-in user details
    const role = user?.roleName?.toLowerCase().replace(/\s+/g, "");

    useEffect(() => {
        const fetchAdmins = async () => {
            try {
                let response;
                if (role === "superadmin") {
                    response = await axios.get("http://localhost:8080/admin/getAllAdmins");

                    // Filter out superadmin entries from the response
                    const filteredAdmins = response.data.admins.filter(
                        (admin) => admin.Role?.roleOfUser?.toLowerCase().replace(/\s+/g, "") !== "superadmin"
                    );

                    setAdmins(filteredAdmins);
                } else {
                    response = await axios.get(`http://localhost:8080/admin/getAdminsBySchool/${user.school.id}`);
                    setAdmins(response.data.admins);
                }
            } catch (error) {
                console.error("Failed to fetch admins", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAdmins();
    }, [role, user.school.id]);

const handleDelete = async (adminId) => {
  if (window.confirm("Are you sure you want to delete this admin?")) {
    try {
      await axios.delete(`http://localhost:8080/admin/deleteAdmin/${adminId}`);
      alert("Admin deleted successfully");

      // Remove locally to prevent undefined error
      setAdmins(prev => prev.filter(admin => admin.id !== adminId));
    } catch (error) {
      console.error("Error deleting admin:", error.response?.data || error.message);
      alert("Failed to delete admin");
    }
  }
};


    return (
        <div style={{ display: "flex" }}>
            <Sidebar />

            <div className="container mt-4" style={{ marginLeft: "250px", flex: 1 }}>
                <h2 className="mb-4">Users List</h2>

                {/* Create Admin Button */}
                <button
                    onClick={() => navigate("/create-admin")}
                    className="btn btn-primary mb-3"
                >
                    Create User
                </button>

                {/* Admin Table */}
                <div className="table-responsive">
                    <table className="table table-bordered table-striped">
                        <thead className="table-dark">
                            <tr>
                                <th>S.No</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Mobile</th>
                                <th>Role</th>
                                <th>School</th>
                                <th>Action</th>
                            </tr>
                        </thead>
<tbody>
  {admins.length > 0 ? (
    admins
      .slice()
      .sort((a, b) => a.id - b.id) // optional: sort ascending by ID
      .map((admin, index) => (
        <tr key={admin.id}>
          <td>{index + 1}</td> {/* S.No */}
          <td>{admin.name}</td> {/* Name */}
          <td>{admin.email}</td> {/* Email */}
          <td>{admin.mobileNumber}</td> {/* Mobile */}
          <td>{admin.Role?.roleOfUser || "N/A"}</td> {/* Role */}
          <td>
            {role === "superadmin"
              ? admin.School?.name || "N/A"
              : user.school?.name || "N/A"}
          </td> {/* School */}
          <td>
            <button
              className="btn btn-primary btn-sm me-2"
              onClick={() => navigate(`/edit-admin/${admin.id}`)}
            >
              Edit
            </button>{" "}
            &nbsp;
            <button
              className="btn btn-danger btn-sm"
              onClick={() => handleDelete(admin.id)}
            >
              Delete
            </button>
          </td>                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="text-center">No admins found for this school.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminList;
