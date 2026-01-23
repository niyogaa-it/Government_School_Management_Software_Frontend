import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "./Sidebar";

const SchoolList = () => {
    const [schools, setSchools] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchSchools();
    }, []);

    const fetchSchools = async () => {
        try {
            const response = await axios.get("http://localhost:8080/school/getAllSchools");
            setSchools(response.data.schools || []);
        } catch (error) {
            console.error("Error fetching schools:", error.response?.data || error.message);
        }
    };

    const handleDelete = async (schoolId) => {
        if (window.confirm("Are you sure you want to delete this school?")) {
            try {
                await axios.delete(`http://localhost:8080/school/deleteSchool/${schoolId}`);
                alert("School deleted successfully");
                fetchSchools(); // Refresh after deletion
            } catch (error) {
                console.error("Error deleting school:", error.response?.data || error.message);
                alert("Failed to delete school");
            }
        }
    };

    return (
        <div style={{ display: "flex" }}>
            <Sidebar />

            <div className="container mt-4" style={{ marginLeft: "250px", flex: 1 }}>
                <h2 className="mb-4">School List</h2>

                {/* Create School Button */}
                <button 
                    className="btn btn-primary mb-3" 
                    onClick={() => navigate("/create-school")}
                >
                    Create School
                </button>

                {/* School Table */}
                <div className="table-responsive">
                    <table className="table table-bordered table-striped">
                        <thead className="table-dark">
                            <tr>
                                <th>S.No</th>
                                <th>Name</th>
                                <th>Short Code</th>
                                <th>Address</th>
                                <th>City</th>
                                <th>State</th>
                                <th>Pincode</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {schools.length > 0 ? (
                                schools.map((school, index) => (
                                    <tr key={school.id}>
                                        <td>{index + 1}</td>
                                        <td>{school.name}</td>
                                        <td>{school.shortcode}</td>
                                        <td>{school.address}</td>
                                        <td>{school.city}</td>
                                        <td>{school.state}</td>
                                        <td>{school.pincode}</td>
                                        <td>
                                            <button
                                                className="btn btn-danger btn-sm"
                                                onClick={() => handleDelete(school.id)}
                                            >
                                                Delete
                                            </button>
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
            </div>
        </div>
    );
};

export default SchoolList;
